import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Box, Typography, TextField, Button, Paper, Avatar, CircularProgress, Grid, IconButton, Dialog, DialogContent } from '@mui/material';
import { Send as SendIcon, AttachFile as AttachFileIcon, Download as DownloadIcon, Close as CloseIcon } from '@mui/icons-material';
import DiscussionRooms from './DiscussionRooms';
import './ChatInput.css';
import { Keyboard } from '@capacitor/keyboard';

const Discussions = () => {
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();
  const messagesEndRef = useRef(null);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [files, setFiles] = useState([]);
  const [imageModal, setImageModal] = useState({ open: false, url: '' });
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const inputRef = useRef();
  const [scrolled, setScrolled] = useState(false);

  // 메시지 스크롤 자동화
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!selectedRoom) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // 실시간 메시지 구독
    const q = query(
      collection(db, 'discussions'),
      where('roomId', '==', selectedRoom.id),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const newMessages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMessages(newMessages);
        setLoading(false);
        // 새 메시지가 있을 때만 스크롤
        if (newMessages.length > messages.length) {
          setTimeout(scrollToBottom, 100);
        }
      },
      (error) => {
        console.error('메시지 로딩 중 오류:', error);
        setError('메시지를 불러오는 중 오류가 발생했습니다.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [selectedRoom]);

  useEffect(() => {
    Keyboard.addListener('keyboardWillShow', (info) => {
      setKeyboardHeight(info.keyboardHeight);
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
        inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setScrolled(true);
      }, 300);
    }
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    setFiles(selected);
  };

  const handleImageClick = (url) => {
    setImageModal({ open: true, url });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && files.length === 0) || !currentUser || !selectedRoom) return;

    try {
      let uploadedFiles = [];
      
      // 파일 업로드
      if (files.length > 0) {
        for (const file of files) {
          try {
            const storageRef = ref(storage, `discussions/${selectedRoom.id}/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            uploadedFiles.push({ url, name: file.name, type: file.type });
          } catch (fileError) {
            console.error('파일 업로드 실패:', file.name, fileError);
          }
        }
      }

      await addDoc(collection(db, 'discussions'), {
        roomId: selectedRoom.id,
        siteId: selectedRoom.siteId,
        content: newMessage.trim(),
        files: uploadedFiles,
        author: currentUser.displayName || '익명',
        authorId: currentUser.uid,
        createdAt: serverTimestamp()
      });
      setNewMessage('');
      setFiles([]);
    } catch (error) {
      console.error('메시지 전송 중 오류:', error);
      setError('메시지 전송 중 오류가 발생했습니다.');
    }
  };

  const handleSelectRoom = (room) => {
    setSelectedRoom(room);
    setMessages([]);
  };

  return (
    <>
      <Grid container spacing={2} sx={{ height: '100%', p: isMobile ? 0 : 2, m: 0, width: isMobile ? '100vw' : '100%', maxWidth: isMobile ? '100vw' : '100%', minWidth: isMobile ? '100vw' : '0', boxSizing: 'border-box' }}>
        <Grid item xs={3}>
          <DiscussionRooms 
            onSelectRoom={handleSelectRoom} 
            currentUser={currentUser} 
          />
        </Grid>
        <Grid item xs={9}>
          {!selectedRoom ? (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
              <Typography variant="h6" color="text.secondary">
                왼쪽에서 토론방을 선택하세요
              </Typography>
            </Box>
          ) : (
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6">{selectedRoom.name}</Typography>
                <Typography variant="subtitle2" color="text.secondary">
                  현장: {selectedRoom.siteName}
                </Typography>
              </Box>

              <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                {loading ? (
                  <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                    <CircularProgress />
                  </Box>
                ) : error ? (
                  <Box p={2}>
                    <Typography color="error">{error}</Typography>
                  </Box>
                ) : (
                  messages.map((message) => (
                    <Box
                      key={message.id}
                      sx={{
                        display: 'flex',
                        justifyContent: message.authorId === currentUser?.uid ? 'flex-end' : 'flex-start',
                        mb: 2
                      }}
                    >
                      <Paper
                        sx={{
                          p: 2,
                          maxWidth: '70%',
                          backgroundColor: message.authorId === currentUser?.uid ? 'primary.light' : 'grey.100'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Avatar sx={{ width: 24, height: 24, mr: 1 }}>
                            {message.author[0]}
                          </Avatar>
                          <Typography variant="subtitle2">{message.author}</Typography>
                        </Box>
                        <Typography>{message.content}</Typography>
                        
                        {/* 파일 표시 */}
                        {message.files && message.files.length > 0 && (
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                            {message.files.map((file, idx) => (
                              file.type.startsWith('image/') ? (
                                <img 
                                  key={idx} 
                                  src={file.url} 
                                  alt={file.name} 
                                  style={{ 
                                    maxWidth: 100, 
                                    maxHeight: 100, 
                                    borderRadius: 4, 
                                    cursor: 'pointer',
                                    border: '1px solid #ddd'
                                  }} 
                                  onClick={() => handleImageClick(file.url)}
                                />
                              ) : (
                                <Button
                                  key={idx}
                                  href={file.url}
                                  target="_blank"
                                  startIcon={<DownloadIcon />}
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontSize: '0.75rem' }}
                                >
                                  {file.name}
                                </Button>
                              )
                            ))}
                          </Box>
                        )}
                        
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                          {message.createdAt?.toDate().toLocaleString()}
                        </Typography>
                      </Paper>
                    </Box>
                  ))
                )}
                <div ref={messagesEndRef} />
              </Box>

              <Box
                component="form"
                onSubmit={handleSendMessage}
                sx={{
                  p: 2,
                  borderTop: 1,
                  borderColor: 'divider',
                  backgroundColor: 'background.paper',
                  position: 'fixed',
                  left: 0,
                  right: 0,
                  bottom: keyboardHeight,
                  zIndex: 1000,
                  boxShadow: '0 -2px 8px rgba(0,0,0,0.08)'
                }}
              >
                {/* 선택된 파일 표시 */}
                {files.length > 0 && (
                  <Box sx={{ mb: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {files.map((file, idx) => (
                      <Box key={idx} sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 0.5, 
                        p: 0.5, 
                        bgcolor: 'grey.100', 
                        borderRadius: 1,
                        fontSize: '0.75rem'
                      }}>
                        <Typography variant="caption">{file.name}</Typography>
                        <IconButton 
                          size="small" 
                          onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                )}
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    inputRef={inputRef}
                    onFocus={handleFocus}
                    fullWidth
                    variant="outlined"
                    placeholder="메시지를 입력하세요..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    size="small"
                  />
                  <Button
                    variant="outlined"
                    component="label"
                    size="small"
                    startIcon={<AttachFileIcon />}
                  >
                    첨부
                    <input type="file" hidden multiple onChange={handleFileChange} />
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={!newMessage.trim() && files.length === 0}
                    endIcon={<SendIcon />}
                  >
                    전송
                  </Button>
                </Box>
              </Box>
            </Box>
          )}
        </Grid>
      </Grid>
      
      {/* 이미지 모달 */}
      <Dialog 
        open={imageModal.open} 
        onClose={() => setImageModal({ open: false, url: '' })}
        maxWidth="md"
        fullWidth
      >
        <DialogContent sx={{ p: 0, background: '#000' }}>
          <IconButton 
            onClick={() => setImageModal({ open: false, url: '' })} 
            sx={{ 
              position: 'absolute', 
              top: 8, 
              right: 8, 
              color: '#fff', 
              zIndex: 2 
            }}
          >
            <CloseIcon />
          </IconButton>
          <img 
            src={imageModal.url} 
            alt="확대보기" 
            style={{ 
              maxWidth: '100%', 
              maxHeight: '80vh', 
              display: 'block', 
              margin: '0 auto' 
            }} 
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Discussions; 