import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Box, Typography, TextField, Button, Paper, Avatar, CircularProgress, Grid } from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import DiscussionRooms from './DiscussionRooms';

const Discussions = () => {
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();
  const messagesEndRef = useRef(null);
  const [error, setError] = useState(null);

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

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !selectedRoom) return;

    try {
      await addDoc(collection(db, 'discussions'), {
        roomId: selectedRoom.id,
        siteId: selectedRoom.siteId,
        content: newMessage.trim(),
        author: currentUser.displayName || '익명',
        authorId: currentUser.uid,
        createdAt: serverTimestamp()
      });
      setNewMessage('');
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
    <Grid container spacing={2} sx={{ height: '100%' }}>
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
                backgroundColor: 'background.paper'
              }}
            >
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="메시지를 입력하세요..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  size="small"
                />
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={!newMessage.trim()}
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
  );
};

export default Discussions; 