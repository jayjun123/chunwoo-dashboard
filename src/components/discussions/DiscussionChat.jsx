import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, TextField, Button, Paper, Avatar, CircularProgress, IconButton, InputAdornment, Dialog, DialogContent, useMediaQuery, Menu, MenuItem } from '@mui/material';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { Send as SendIcon, AttachFile as AttachFileIcon, Image as ImageIcon, Download as DownloadIcon, Close as CloseIcon, MoreVert as MoreVertIcon, Delete as DeleteIcon, PictureAsPdf as PdfIcon, Description as ExcelIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '../../contexts/AuthContext';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { NanumGothic } from '../../assets/fonts/NanumGothic';
import { exportToExcel, exportChatToPDF } from '../../utils/exportUtils';

const DiscussionChat = ({ roomId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imageModal, setImageModal] = useState({ open: false, url: '' });
  const [messageMenu, setMessageMenu] = useState({ open: false, anchorEl: null, message: null });
  const messagesEndRef = useRef(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!roomId) return;
    setLoading(true);
    const q = query(collection(db, 'discussions'), where('roomId', '==', roomId), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setLoading(false);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsubscribe();
  }, [roomId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && files.length === 0) return;
    
    try {
      console.log('메시지 전송 시작:', { newMessage, filesCount: files.length });
      let uploadedFiles = [];
      
      // 파일 업로드
      if (files.length > 0) {
        console.log('파일 업로드 시작...');
        for (const file of files) {
          console.log('업로드 중인 파일:', file.name, file.size, file.type);
          try {
            const storageRef = ref(storage, `discussions/${roomId}/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            uploadedFiles.push({ url, name: file.name, type: file.type });
            console.log('파일 업로드 성공:', file.name);
          } catch (fileError) {
            console.error('파일 업로드 실패:', file.name, fileError);
            // 파일 업로드 실패해도 계속 진행
          }
        }
      }
      
      // 메시지 저장
      console.log('메시지 저장 시작...');
      await addDoc(collection(db, 'discussions'), {
        roomId,
        content: newMessage,
        files: uploadedFiles,
        createdAt: serverTimestamp(),
        author: currentUser?.displayName || currentUser?.email || '익명',
        authorId: currentUser?.uid || 'anonymous',
        authorEmail: currentUser?.email || ''
      });
      
      console.log('메시지 저장 성공!');
      setNewMessage('');
      setFiles([]);
      setPreviews([]);
    } catch (error) {
      console.error('메시지 전송 중 오류:', error);
      alert('메시지 전송 중 오류가 발생했습니다: ' + error.message);
    }
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    setFiles(selected);
    setPreviews(selected.map(f => f.type.startsWith('image/') ? URL.createObjectURL(f) : ''));
  };

  const handleImageClick = (url) => {
    setImageModal({ open: true, url });
  };

  const handleMessageMenuOpen = (event, message) => {
    setMessageMenu({ open: true, anchorEl: event.currentTarget, message });
  };

  const handleMessageMenuClose = () => {
    setMessageMenu({ open: false, anchorEl: null, message: null });
  };

  const handleDeleteMessage = async () => {
    const message = messageMenu.message;
    if (!message) return;
    
    if (!window.confirm('이 메시지를 삭제하시겠습니까?')) {
      handleMessageMenuClose();
      return;
    }
    
    try {
      // 메시지 삭제
      await deleteDoc(doc(db, 'discussions', message.id));
      
      // 첨부 파일 삭제
      if (message.files && message.files.length > 0) {
        const deleteFilePromises = message.files.map(async (file) => {
          try {
            const fileRef = ref(storage, file.url);
            await deleteObject(fileRef);
          } catch (error) {
            console.error('파일 삭제 중 오류:', error);
          }
        });
        await Promise.all(deleteFilePromises);
      }
      
      handleMessageMenuClose();
    } catch (error) {
      console.error('메시지 삭제 중 오류:', error);
      alert('메시지 삭제 중 오류가 발생했습니다.');
    }
  };

  const canDeleteMessage = (message) => {
    return currentUser?.uid === message.authorId || 
           currentUser?.grade === '마스터' || 
           currentUser?.grade === '관리자';
  };

  const handleExportExcel = () => {
    const dataToExport = messages.map(msg => ({
      '작성 시간': msg.createdAt?.toDate?.().toLocaleString() || '',
      '작성자': msg.author || '익명',
      '내용': msg.content || '',
      '첨부파일': msg.files?.map(f => f.name).join(', ') || ''
    }));

    // 컬럼 너비 설정 (한글 텍스트 고려)
    const columnWidths = [
      { wch: 20 }, // 작성 시간
      { wch: 15 }, // 작성자
      { wch: 50 }, // 내용
      { wch: 20 }, // 첨부파일
    ];

    const result = exportToExcel(dataToExport, '대화내용', `discussion_${roomId}`, { columnWidths });
    
    if (result.success) {
      alert('엑셀 파일이 다운로드되었습니다.');
    } else {
      alert('엑셀 다운로드에 실패했습니다.');
    }
  };

  const handleExportPDF = () => {
    const roomInfo = {
      name: `대화방 ${roomId}`,
      siteName: '현장 정보 없음',
      createdAt: new Date().toLocaleDateString(),
      password: '없음'
    };

    const result = exportChatToPDF(messages, roomInfo);
    
    if (result.success) {
      alert('PDF 파일이 다운로드되었습니다.');
    } else {
      alert('PDF 다운로드에 실패했습니다.');
    }
  };

  return (
    <Box sx={{ p: isMobile ? 0 : 1, m: 0, width: isMobile ? '100vw' : 'auto', maxWidth: isMobile ? '100vw' : 'auto', minWidth: isMobile ? '100vw' : 'auto', boxSizing: 'border-box', height: '100%', display: 'flex', flexDirection: 'column', background: 'linear-gradient(90deg, #232634 60%, #1976d2 100%)', borderRadius: 3, boxShadow: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 0.8, mb: 1, p: 0.8, borderBottom: '1px solid #444', mt: isMobile ? '15px' : 0 }}>
        <Button startIcon={<ExcelIcon />} onClick={handleExportExcel} variant="outlined" size="small" sx={{color: '#fff', borderColor: '#fff', fontSize: '0.8rem'}}>Excel</Button>
        <Button startIcon={<PdfIcon />} onClick={handleExportPDF} variant="outlined" size="small" sx={{color: '#fff', borderColor: '#fff', fontSize: '0.8rem'}}>PDF</Button>
      </Box>
      <Box sx={{ 
        flex: 1, 
        overflowY: 'auto', 
        mb: 1.5, 
        pr: isMobile ? 0 : 1.5,
        pb: isMobile ? '110px' : 0 // 입력창+하단바 높이만큼 패딩
      }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%"><CircularProgress /></Box>
        ) : (
          messages.map((msg, idx) => {
            const isMine = currentUser?.uid === msg.authorId;
            return (
              <Box key={msg.id} sx={{ mb: 1.5, display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', width: '100%' }}>
                <Paper
                  sx={{
                    p: isMobile ? 1 : 1.5,
                    borderRadius: 2,
                    background: isMine ? 'linear-gradient(90deg, #1976d2 60%, #232634 100%)' : '#fff',
                    color: isMine ? '#fff' : '#232634',
                    minWidth: 120,
                    maxWidth: isMobile ? '90vw' : 400,
                    boxShadow: isMine ? 6 : 2,
                    transition: 'box-shadow 0.2s',
                    mb: 0.5,
                    position: 'relative',
                    animation: 'fadeIn 0.4s',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.8, justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ width: 24, height: 24, mr: 0.8, bgcolor: isMine ? '#1976d2' : '#90caf9', color: '#fff', fontWeight: 700, fontSize: '0.8rem' }}>
                        {msg.author?.[0] || 'U'}
                      </Avatar>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{msg.author || '익명'}</Typography>
                      <Typography variant="caption" sx={{ ml: 0.8, color: isMine ? '#fff' : '#888', fontSize: '0.7rem' }}>
                        {msg.createdAt?.toDate?.().toLocaleString() || ''}
                      </Typography>
                    </Box>
                    {canDeleteMessage(msg) && (
                      <IconButton
                        size="small"
                        onClick={(e) => handleMessageMenuOpen(e, msg)}
                        sx={{
                          color: isMine ? '#fff' : '#666',
                          p: 0.3,
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          zIndex: 2,
                          background: 'rgba(255,255,255,0.7)',
                          '&:hover': { background: 'rgba(25, 118, 210, 0.15)' }
                        }}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                  <Typography variant="body1" sx={{ mb: 0.8, wordBreak: 'break-all', fontSize: '0.85rem', lineHeight: 1.4 }}>{msg.content}</Typography>
                  {msg.files && msg.files.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap', mb: 0.8 }}>
                      {msg.files.map((f, idx) => f.type.startsWith('image/') ? (
                        <img key={idx} src={f.url} alt={f.name} style={{ maxWidth: 60, borderRadius: 6, cursor: 'pointer', boxShadow: '0 2px 8px #1976d233' }} onClick={() => handleImageClick(f.url)} />
                      ) : (
                        <Button key={idx} href={f.url} target="_blank" startIcon={<DownloadIcon />} size="small" sx={{ fontSize: '0.8rem' }}>
                          {f.name}
                        </Button>
                      ))}
                    </Box>
                  )}
                </Paper>
              </Box>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </Box>
      <Box component="form" onSubmit={handleSend} sx={{ 
        display: 'flex', 
        gap: 1, 
        alignItems: 'center', 
        mt: 0, 
        mb: isMobile ? 0 : 0, 
        p: 0, 
        flexDirection: 'row', 
        background: '#fff', 
        borderRadius: 2, 
        boxShadow: 2,
        position: isMobile ? 'fixed' : 'static',
        bottom: isMobile ? '46px' : 'auto', // 하단바 위에 고정
        left: isMobile ? 0 : 'auto',
        right: isMobile ? 0 : 'auto',
        zIndex: isMobile ? 1000 : 'auto',
        width: isMobile ? '100%' : 'auto'
      }}>
        <TextField
          fullWidth
          multiline
          minRows={2}
          maxRows={4}
          variant="outlined"
          placeholder="메시지를 입력하세요..."
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          sx={{ background: '#f5f7fa', borderRadius: 1.5, fontSize: '1rem', m: 0 }}
        />
        <Button
          variant="outlined"
          component="label"
          sx={{ minWidth: 56, fontWeight: 700, fontSize: '1rem', borderRadius: 1.5, ml: 0, height: 48 }}
        >
          첨부
          <input type="file" hidden multiple onChange={handleFileChange} />
        </Button>
        <Button type="submit" variant="contained" color="primary" size="large" endIcon={<SendIcon />} sx={{ height: 48, fontWeight: 700, fontSize: '1rem', borderRadius: 1.5, minWidth: 56, ml: 0 }}>
          전송
        </Button>
      </Box>
      
      {/* 이미지 모달 */}
      <Dialog open={imageModal.open} onClose={() => setImageModal({ open: false, url: '' })} maxWidth="md">
        <DialogContent sx={{ p: 0, background: '#111' }}>
          <IconButton onClick={() => setImageModal({ open: false, url: '' })} sx={{ position: 'absolute', top: 8, right: 8, color: '#fff', zIndex: 2 }}><CloseIcon /></IconButton>
          <img src={imageModal.url} alt="확대보기" style={{ maxWidth: '90vw', maxHeight: '80vh', display: 'block', margin: '0 auto' }} />
        </DialogContent>
      </Dialog>
      
      {/* 메시지 메뉴 */}
      <Menu
        anchorEl={messageMenu.anchorEl}
        open={messageMenu.open}
        onClose={handleMessageMenuClose}
      >
        <MenuItem onClick={handleDeleteMessage} sx={{ color: '#f44336' }}>
          <DeleteIcon sx={{ mr: 1 }} />
          삭제
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default DiscussionChat; 