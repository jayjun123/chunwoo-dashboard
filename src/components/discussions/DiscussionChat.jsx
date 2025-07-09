import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, TextField, Button, Paper, Avatar, CircularProgress, IconButton, InputAdornment, Dialog, DialogContent, useMediaQuery, Menu, MenuItem, Checkbox } from '@mui/material';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { Send as SendIcon, AttachFile as AttachFileIcon, Image as ImageIcon, Download as DownloadIcon, Close as CloseIcon, MoreVert as MoreVertIcon, Delete as DeleteIcon, PictureAsPdf as PdfIcon, Description as ExcelIcon, Edit as EditIcon, Save as SaveIcon, Cancel as CancelIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '../../contexts/AuthContext';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { NanumGothic } from '../../assets/fonts/NanumGothic';
import { exportToExcel, exportChatToPDF } from '../../utils/exportUtils';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { InputBase } from '@mui/material';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import { Keyboard } from '@capacitor/keyboard';

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
  const [roomName, setRoomName] = useState('채팅방');
  const navigate = useNavigate();
  const [editingMessage, setEditingMessage] = useState(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const inputRef = useRef();
  const [scrolled, setScrolled] = useState(false);
  const [isComposing, setIsComposing] = useState(false);

  useEffect(() => {
    if (!roomId) return;
    setLoading(true);
    
    // 올바른 메시지 컬렉션 경로 사용
    const messagesQuery = query(
      collection(db, `discussions/${roomId}/messages`),
      orderBy('timestamp', 'asc')
    );
    
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log('메시지 업데이트:', msgs.length, '개 메시지');
      setMessages(msgs);
      setLoading(false);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, (error) => {
      console.error('메시지 로딩 오류:', error);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    const fetchRoom = async () => {
      try {
        const docRef = doc(db, 'discussions', roomId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setRoomName(docSnap.data().name || '채팅방');
        }
      } catch (e) {
        console.error('방 정보 로딩 오류:', e);
      }
    };
    fetchRoom();
  }, [roomId]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ 
          behavior: 'auto',
          block: 'end'
        });
      }, 100);
    }
  }, [messages, roomId]);

  useEffect(() => {
    Keyboard.addListener('keyboardWillShow', (info) => {
      setKeyboardHeight(info.keyboardHeight);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 200);
    });
    Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardHeight(0);
    });
    return () => {
      Keyboard.removeAllListeners();
    };
  }, []);

  const handleFocus = () => {
    if (!scrolled) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        setScrolled(true);
      }, 300);
    }
  };

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
            const storageRef = ref(storage, `discussion_attachments/${roomId}/${Date.now()}_${file.name}`);
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
      
      // 메시지 저장 - 올바른 컬렉션 경로 사용
      console.log('메시지 저장 시작...');
      const messageData = {
        text: newMessage,
        userId: currentUser?.uid || 'anonymous',
        userName: currentUser?.displayName || '익명',
        timestamp: serverTimestamp(),
      };
      
      if (uploadedFiles.length > 0) {
        messageData.attachment = uploadedFiles[0]; // 단일 첨부파일로 저장
      }
      
      console.log('저장할 메시지 데이터:', messageData);
      await addDoc(collection(db, `discussions/${roomId}/messages`), messageData);
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
    console.log('파일 선택됨:', selected.map(f => ({ name: f.name, type: f.type, size: f.size })));
    setFiles(selected);
    
    const previews = selected.map(f => f.type.startsWith('image/') ? URL.createObjectURL(f) : '');
    console.log('미리보기 생성:', previews);
    setPreviews(previews);
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

  const handleDeleteMessage = async (message) => {
    if (!message) return;
    if (!window.confirm('이 메시지를 삭제하시겠습니까?')) {
      handleMessageMenuClose && handleMessageMenuClose();
      return;
    }
    try {
      await deleteDoc(doc(db, `discussions/${roomId}/messages`, message.id));
      if (message.attachment) {
        try {
          const fileRef = ref(storage, message.attachment.url);
          await deleteObject(fileRef);
        } catch (error) {
          console.error('파일 삭제 중 오류:', error);
        }
      }
      handleMessageMenuClose && handleMessageMenuClose();
    } catch (error) {
      console.error('메시지 삭제 중 오류:', error);
      alert('메시지 삭제 중 오류가 발생했습니다.');
    }
  };

  const canDeleteMessage = (message) => {
    return currentUser?.uid === message.userId || 
           currentUser?.role === 'admin' || 
           currentUser?.role === 'master';
  };

  const handleExportExcel = () => {
    const dataToExport = messages.map(msg => ({
      '작성 시간': msg.timestamp?.toDate?.().toLocaleString() || '',
      '작성자': msg.userName || '익명',
      '내용': msg.text || '',
      '첨부파일': msg.attachment?.name || ''
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
      name: roomName,
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

  const handleUpdateMessage = () => {
    // Implementation of handleUpdateMessage
  };

  return (
    <Box sx={{
      height: '100vh', width: '100vw', maxWidth: '100vw', minWidth: '100vw',
      display: 'flex', flexDirection: 'column', background: '#232634',
      position: 'fixed', top: 0, left: 0, zIndex: 2000
    }}>
      {/* 상단 바 */}
      <Box sx={{
        height: 56, minHeight: 56, background: '#1976d2', color: '#fff',
        display: 'flex', alignItems: 'center', px: 2, boxShadow: 2
      }}>
        <IconButton onClick={() => navigate('/discussions')} sx={{ color: '#fff', mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" sx={{ fontWeight: 700, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{roomName}</Typography>
      </Box>
      {/* 메시지 영역 */}
      <Box sx={{
        flex: 1,
        overflowY: 'auto',
        px: 1, py: 2,
        background: '#232323',
        display: 'flex', flexDirection: 'column',
        position: 'absolute',
        top: 56, // 상단바 높이
        bottom: isMobile ? 60 : 60, // 입력창 높이에 딱 맞게 조정 (불필요한 여백 최소화)
        left: 0, right: 0,
        height: 'auto',
      }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%"><CircularProgress /></Box>
        ) : (
          messages.map((msg, idx) => {
            const isMe = currentUser?.uid === msg.userId;
            const currentDate = msg.timestamp?.toDate?.() || new Date();
            const prevDate = idx > 0 ? messages[idx - 1].timestamp?.toDate?.() || new Date() : null;
            const showDateDivider = !prevDate || 
              currentDate.getDate() !== prevDate.getDate() ||
              currentDate.getMonth() !== prevDate.getMonth() ||
              currentDate.getFullYear() !== prevDate.getFullYear();
            return (
              <Box key={msg.id}>
                {showDateDivider && (
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    my: 2,
                    px: 1
                  }}>
                    <Box sx={{
                      bgcolor: 'rgba(255,255,255,0.08)',
                      color: '#fff',
                      px: 2,
                      py: 0.5,
                      borderRadius: 2,
                      fontSize: '0.75rem',
                      fontWeight: 500
                    }}>
                      {currentDate.getMonth() + 1}월 {currentDate.getDate()}일 ({['일','월','화','수','목','금','토'][currentDate.getDay()]})
                    </Box>
                  </Box>
                )}
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', mb: isMobile ? 0.6 : 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography sx={{ color: '#1976d2', fontSize: isMobile ? '0.8rem' : 14, fontWeight: 900, mb: isMobile ? 0.2 : 0.5, mr: 1 }}>
                      {msg.userName || '익명'}
                    </Typography>
                  </Box>
                  <Box sx={{
                    bgcolor: isMe ? '#FFF066' : '#232323',
                    color: isMe ? '#222' : '#fff',
                    borderRadius: isMobile ? 3 : 4,
                    px: isMobile ? 0.8 : 1.4, py: isMobile ? 0.8 : 0.9,
                    minWidth: isMobile ? 28 : 36,
                    maxWidth: isMobile ? '90vw' : '80vw',
                    fontSize: isMobile ? '0.85rem' : '1rem',
                    position: 'relative',
                    boxShadow: isMe ? 2 : 1,
                    fontFamily: 'NanumGothic, Malgun Gothic, Apple SD Gothic Neo, sans-serif',
                    mb: isMobile ? 0.1 : 0.2,
                    wordBreak: 'break-word',
                    display: 'inline-block',
                  }}>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', fontSize: isMobile ? '0.85rem' : '1rem', p: 0 }}>{msg.text}</Typography>
                    {msg.attachment && (
                      <Box mt={isMobile ? 0.5 : 1}>
                        {msg.attachment.type.startsWith('image/') ? (
                          <Box sx={{ position: 'relative', display: 'inline-block', borderRadius: isMobile ? 3 : 2, overflow: 'hidden', boxShadow: 1 }}>
                            <a href={msg.attachment.url} target="_blank" rel="noopener noreferrer">
                              <img 
                                src={msg.attachment.url} 
                                alt={msg.attachment.name} 
                                style={{ maxWidth: isMobile ? '120px' : '180px', maxHeight: isMobile ? '120px' : '180px', borderRadius: isMobile ? '6px' : '8px', cursor: 'pointer', display: 'block' }} 
                              />
                            </a>
                          </Box>
                        ) : (
                          <Button 
                            variant="outlined" 
                            startIcon={<ExcelIcon />} 
                            href={msg.attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ textTransform: 'none', fontSize: isMobile ? '0.6rem' : '0.7rem', borderRadius: isMobile ? 1 : 2, minHeight: isMobile ? 20 : undefined, height: isMobile ? 20 : undefined, px: isMobile ? 0.5 : 1 }}
                            size="small"
                          >
                            {msg.attachment.name}
                          </Button>
                        )}
                      </Box>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: isMe ? 'flex-end' : 'flex-start', mt: isMobile ? 0.2 : 0.5, mb: isMobile ? 0.6 : 1 }}>
                    <Typography sx={{ color: '#aaa', fontSize: isMobile ? '0.7rem' : 11, ml: isMe ? 1 : 0, mr: isMe ? 0 : 1 }}>
                      {msg.timestamp ? (msg.timestamp.toDate ? msg.timestamp.toDate() : new Date(msg.timestamp)).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}
                    </Typography>
                    {isMe && !editingMessage && (
                      <>
                        <IconButton size="small" sx={{ p: isMobile ? 0.2 : 0.5 }} onClick={() => setEditingMessage(msg)}><EditIcon sx={{ fontSize: isMobile ? 13 : 16, color: '#444' }}/></IconButton>
                        <IconButton size="small" sx={{ p: isMobile ? 0.2 : 0.5 }} onClick={() => handleDeleteMessage(msg)}><DeleteIcon sx={{ fontSize: isMobile ? 13 : 16, color: '#444' }}/></IconButton>
                      </>
                    )}
                    {isMe && editingMessage && editingMessage.id === msg.id && (
                      <>
                        <IconButton size="small" sx={{ p: isMobile ? 0.2 : 0.5 }} onClick={handleUpdateMessage}><SaveIcon sx={{ fontSize: isMobile ? 13 : 16, color: '#444' }}/></IconButton>
                        <IconButton size="small" sx={{ p: isMobile ? 0.2 : 0.5 }} onClick={() => setEditingMessage(null)}><CancelIcon sx={{ fontSize: isMobile ? 13 : 16, color: '#444' }}/></IconButton>
                      </>
                    )}
                  </Box>
                </Box>
              </Box>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </Box>
      {/* 파일 미리보기 영역 */}
      {files.length > 0 && (
        <Box sx={{
          p: isMobile ? 0.2 : 0.5,
          background: '#fff',
          borderRadius: 1,
          border: '1px solid #ddd',
          boxShadow: 1,
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: isMobile ? 48 : 80,
          zIndex: 1200,
          mx: 0,
          width: '100vw',
          maxWidth: '100vw',
          minHeight: isMobile ? 28 : 36,
        }}>
          <Typography variant="subtitle2" sx={{ mb: isMobile ? 0.2 : 1, fontWeight: 'bold', fontSize: isMobile ? '0.75rem' : '1rem' }}>
            📎 선택된 파일 ({files.length}개)
          </Typography>
          <Box sx={{ display: 'flex', gap: isMobile ? 0.2 : 1, flexWrap: 'wrap' }}>
            {files.map((file, idx) => (
              <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.2, p: isMobile ? 0.1 : 0.5, background: '#f5f5f5', borderRadius: 1 }}>
                {file.type.startsWith('image/') && (
                  <img src={previews[idx]} alt={file.name} style={{ width: isMobile ? 20 : 48, height: isMobile ? 20 : 48, objectFit: 'cover', borderRadius: 4, marginRight: 2 }} />
                )}
                <Typography variant="caption" sx={{ fontSize: isMobile ? '0.6rem' : '0.85rem' }}>{file.name}</Typography>
                <IconButton size="small" sx={{ p: isMobile ? 0.2 : 0.5 }} onClick={() => {
                  setFiles(files.filter((_, i) => i !== idx));
                  setPreviews(previews.filter((_, i) => i !== idx));
                }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Box>
        </Box>
      )}
      {/* 입력창 */}
      <Box sx={{ 
        px: isMobile ? 0.5 : 2, 
        py: 0, 
        bgcolor: '#232634', 
        borderTop: '1px solid #333', 
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1200,
        width: '100vw',
        maxWidth: '100vw',
        minHeight: isMobile ? 48 : 48,
        height: isMobile ? 48 : undefined,
        display: 'flex',
        alignItems: 'center',
      }}>
        {!isMobile && (
          <Typography variant="caption" sx={{ color: '#aaa', mb: 0.5 }}>
            현재 사용자: {currentUser?.displayName || currentUser?.email || '익명'}
          </Typography>
        )}
        <form onSubmit={handleSend} style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 1 : 8, minHeight: isMobile ? 36 : 48, width: '100%' }}>
          {/* 첨부파일 버튼 */}
          <IconButton
            component="label"
            sx={{ 
              color: '#1976d2', 
              bgcolor: 'rgba(25, 118, 210, 0.1)',
              '&:hover': { bgcolor: 'rgba(25, 118, 210, 0.2)' },
              p: isMobile ? 0.2 : 1,
              fontSize: isMobile ? 14 : 24,
              minWidth: isMobile ? 20 : 40,
              minHeight: isMobile ? 20 : 40
            }}
          >
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              style={{ display: 'none' }}
              accept="image/*,.pdf,.xlsx,.xls,.doc,.docx"
            />
            <AttachFileIcon sx={{ fontSize: isMobile ? 16 : 24 }} />
          </IconButton>
          <TextField
            inputRef={inputRef}
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onFocus={handleFocus}
            placeholder="메시지를 입력하세요"
            fullWidth
            size="small"
            sx={{ 
              bgcolor: '#181a20', 
              borderRadius: 2, 
              flex: 1,
              fontSize: isMobile ? '0.8rem' : '1rem',
              minHeight: isMobile ? 28 : 40,
              maxHeight: isMobile ? 28 : 40,
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'rgba(255,255,255,0.3)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(255,255,255,0.5)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#1976d2',
                },
                fontSize: isMobile ? '0.8rem' : '1rem',
                minHeight: isMobile ? 28 : 40,
                maxHeight: isMobile ? 28 : 40,
                padding: isMobile ? '0 4px' : '6px 12px',
              },
              '& .MuiInputBase-input': {
                color: '#fff',
                fontSize: isMobile ? '0.8rem' : '1rem',
                padding: isMobile ? '4px 2px' : '10px 8px',
                minHeight: isMobile ? 20 : 32,
                maxHeight: isMobile ? 20 : 32,
              }
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton type="submit" color="primary" disabled={!newMessage.trim() && files.length === 0} sx={{ p: isMobile ? 0.2 : 1 }}>
                    <SendIcon sx={{ fontSize: isMobile ? 16 : 24 }} />
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </form>
      </Box>
      {/* 이미지 모달 */}
      <Dialog open={imageModal.open} onClose={() => setImageModal({ open: false, url: '' })} maxWidth="md">
        <DialogContent sx={{ p: 0, background: '#111' }}>
          <IconButton onClick={() => setImageModal({ open: false, url: '' })} sx={{ position: 'absolute', top: 8, right: 8, color: '#fff', zIndex: 2 }}><CloseIcon /></IconButton>
          <img src={imageModal.url} alt="확대보기" style={{ maxWidth: '90vw', maxHeight: '80vh', display: 'block', margin: '0 auto' }} />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default DiscussionChat; 