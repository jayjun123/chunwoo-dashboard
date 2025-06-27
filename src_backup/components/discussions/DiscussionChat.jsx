import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, TextField, Button, Paper, Avatar, CircularProgress, IconButton, InputAdornment, Dialog, DialogContent, useMediaQuery } from '@mui/material';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { Send as SendIcon, AttachFile as AttachFileIcon, Image as ImageIcon, Download as DownloadIcon, Close as CloseIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

const DiscussionChat = ({ roomId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imageModal, setImageModal] = useState({ open: false, url: '' });
  const messagesEndRef = useRef(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
    let uploadedFiles = [];
    for (const file of files) {
      const storageRef = ref(storage, `discussions/${roomId}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      uploadedFiles.push({ url, name: file.name, type: file.type });
    }
    await addDoc(collection(db, 'discussions'), {
      roomId,
      content: newMessage,
      files: uploadedFiles,
      createdAt: serverTimestamp(),
      author: '익명', // 실제 로그인 사용자 정보로 대체 가능
    });
    setNewMessage('');
    setFiles([]);
    setPreviews([]);
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    setFiles(selected);
    setPreviews(selected.map(f => f.type.startsWith('image/') ? URL.createObjectURL(f) : ''));
  };

  const handleImageClick = (url) => {
    setImageModal({ open: true, url });
  };

  return (
    <Box sx={{ p: isMobile ? 1 : 2, height: '100%', display: 'flex', flexDirection: 'column', background: 'linear-gradient(90deg, #232634 60%, #1976d2 100%)', borderRadius: 3, boxShadow: 4 }}>
      <Box sx={{ flex: 1, overflowY: 'auto', mb: 2, pr: isMobile ? 0 : 2 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%"><CircularProgress /></Box>
        ) : (
          messages.map((msg, idx) => {
            const isMine = false; // 실제 로그인 사용자와 비교해 true/false
            return (
              <Box key={msg.id} sx={{ mb: 2, display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', width: '100%' }}>
                <Paper
                  sx={{
                    p: isMobile ? 1 : 2,
                    borderRadius: 3,
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
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Avatar sx={{ width: 28, height: 28, mr: 1, bgcolor: isMine ? '#1976d2' : '#90caf9', color: '#fff', fontWeight: 700 }}>{msg.author?.[0] || 'U'}</Avatar>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{msg.author || '익명'}</Typography>
                    <Typography variant="caption" sx={{ ml: 1, color: isMine ? '#fff' : '#888' }}>{msg.createdAt?.toDate?.().toLocaleString?.() || ''}</Typography>
                  </Box>
                  <Typography variant="body1" sx={{ mb: 1, wordBreak: 'break-all' }}>{msg.content}</Typography>
                  {msg.files && msg.files.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                      {msg.files.map((f, idx) => f.type.startsWith('image/') ? (
                        <img key={idx} src={f.url} alt={f.name} style={{ maxWidth: 80, borderRadius: 8, cursor: 'pointer', boxShadow: '0 2px 8px #1976d233' }} onClick={() => handleImageClick(f.url)} />
                      ) : (
                        <Button key={idx} href={f.url} target="_blank" startIcon={<DownloadIcon />}>{f.name}</Button>
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
      <Box component="form" onSubmit={handleSend} sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', mt: 2, flexDirection: isMobile ? 'column' : 'row', background: '#fff', borderRadius: 3, boxShadow: 2, p: isMobile ? 1 : 2 }}>
        <TextField
          fullWidth
          multiline
          minRows={isMobile ? 2 : 3}
          maxRows={isMobile ? 6 : 8}
          variant="outlined"
          placeholder="메시지 입력 또는 파일 첨부"
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          sx={{ background: '#f5f7fa', borderRadius: 2, fontSize: isMobile ? '1rem' : '1.1rem' }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton component="label">
                  <AttachFileIcon />
                  <input type="file" hidden multiple onChange={handleFileChange} />
                </IconButton>
              </InputAdornment>
            )
          }}
        />
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          {previews.map((url, idx) => url && <img key={idx} src={url} alt="미리보기" style={{ maxWidth: 60, borderRadius: 8, marginRight: 8, marginBottom: 4, boxShadow: '0 2px 8px #1976d233' }} />)}
        </Box>
        <Button type="submit" variant="contained" color="primary" size={isMobile ? 'medium' : 'large'} endIcon={<SendIcon />} sx={{ height: isMobile ? 48 : 56, fontWeight: 700, fontSize: isMobile ? '1rem' : '1.1rem', borderRadius: 2, minWidth: 100 }}>전송</Button>
      </Box>
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