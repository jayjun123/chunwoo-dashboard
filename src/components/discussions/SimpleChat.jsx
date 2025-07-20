import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Avatar,
  IconButton
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';

const SimpleChat = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      content: '안녕하세요! 간단한 채팅 테스트입니다.',
      author: '시스템',
      isMyMessage: false,
      timestamp: '오후 2:00'
    },
    {
      id: 2,
      content: '이 메시지가 보이나요?',
      author: '테스트',
      isMyMessage: false,
      timestamp: '오후 2:01'
    }
  ]);
  
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message = {
      id: Date.now(),
      content: newMessage,
      author: '나',
      isMyMessage: true,
      timestamp: new Date().toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // 스크롤을 맨 아래로
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#F2F3F5',
      p: 2
    }}>
      {/* 헤더 */}
      <Box sx={{ 
        backgroundColor: '#FEE500', 
        p: 2, 
        borderRadius: 2, 
        mb: 2,
        textAlign: 'center'
      }}>
        <Typography variant="h6" sx={{ color: '#1A1A1A', fontWeight: 'bold' }}>
          🚀 간단한 채팅 테스트
        </Typography>
        <Typography variant="body2" sx={{ color: '#666' }}>
          메시지 개수: {messages.length}개
        </Typography>
      </Box>

      {/* 메시지 영역 */}
      <Box sx={{ 
        flex: 1, 
        overflowY: 'auto', 
        backgroundColor: '#F2F3F5',
        p: 1,
        mb: 2,
        border: '2px solid #FEE500',
        borderRadius: 2
      }}>
        {messages.map((message) => (
          <Box 
            key={message.id} 
            sx={{ 
              display: 'flex', 
              justifyContent: message.isMyMessage ? 'flex-end' : 'flex-start',
              mb: 2
            }}
          >
            {!message.isMyMessage && (
              <Avatar 
                sx={{ 
                  width: 32, 
                  height: 32, 
                  mr: 1,
                  backgroundColor: '#FEE500',
                  color: '#1A1A1A',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}
              >
                {message.author.charAt(0)}
              </Avatar>
            )}
            
            <Box sx={{ maxWidth: '70%' }}>
              {!message.isMyMessage && (
                <Typography variant="caption" sx={{ color: '#666', ml: 1, mb: 0.5, display: 'block', fontSize: '11px' }}>
                  {message.author}
                </Typography>
              )}
              
              <Paper sx={{
                p: 1.5,
                backgroundColor: message.isMyMessage ? '#FEE500' : 'white',
                borderRadius: message.isMyMessage ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                wordBreak: 'break-word',
                maxWidth: '100%'
              }}>
                <Typography variant="body2" sx={{ 
                  fontSize: '14px',
                  color: message.isMyMessage ? '#1A1A1A' : '#1A1A1A',
                  lineHeight: 1.4
                }}>
                  {message.content}
                </Typography>
              </Paper>
              
              <Typography variant="caption" sx={{ 
                color: '#999', 
                ml: 1, 
                mt: 0.5, 
                display: 'block',
                textAlign: message.isMyMessage ? 'right' : 'left',
                fontSize: '11px'
              }}>
                {message.timestamp}
              </Typography>
            </Box>
          </Box>
        ))}
        <div ref={messagesEndRef} />
      </Box>

      {/* 입력 영역 */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        backgroundColor: 'white',
        p: 2,
        borderRadius: 2,
        border: '2px solid #FEE500'
      }}>
        <TextField
          fullWidth
          placeholder="메시지를 입력하세요..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          InputProps={{
            sx: { 
              backgroundColor: '#F8F9FA',
              borderRadius: 2,
              '& fieldset': { border: 'none' }
            }
          }}
        />
        <IconButton 
          onClick={handleSendMessage}
          disabled={!newMessage.trim()}
          sx={{ 
            color: newMessage.trim() ? '#1A1A1A' : '#CCC',
            backgroundColor: newMessage.trim() ? '#FEE500' : '#F8F9FA',
            '&:hover': {
              backgroundColor: newMessage.trim() ? '#FFD700' : '#F8F9FA'
            }
          }}
        >
          <SendIcon />
        </IconButton>
      </Box>
    </Box>
  );
};

export default SimpleChat; 