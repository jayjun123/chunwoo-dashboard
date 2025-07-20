import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  Avatar,
  Paper,
  Card,
  CardContent,
  IconButton
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';

const SimpleDiscussion = () => {
  console.log('🔥 SimpleDiscussion 컴포넌트 로드됨');
  
  const [selectedDiscussion, setSelectedDiscussion] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  const discussions = [
    { id: 1, title: '안전 관리 토론', color: '#FF6B6B' },
    { id: 2, title: '일정 관리 토론', color: '#4ECDC4' },
    { id: 3, title: '자재 관리 토론', color: '#45B7D1' }
  ];

  const handleDiscussionSelect = (discussion) => {
    console.log('토론 선택:', discussion.title);
    
    const sampleMessages = [
      {
        id: 1,
        content: '안녕하세요! 토론의견에 오신 것을 환영합니다.',
        author: '시스템',
        isMyMessage: false,
        timestamp: '오후 2:00'
      },
      {
        id: 2,
        content: '현재 현장의 안전 관리 시스템을 개선하기 위한 의견을 수렴하고자 합니다.',
        author: '김현장',
        isMyMessage: false,
        timestamp: '오후 2:15'
      },
      {
        id: 3,
        content: '개인보호구 착용률 향상을 위해서는 매일 아침 점검 시간을 확보하는 것이 좋겠습니다.',
        author: '최안전',
        isMyMessage: false,
        timestamp: '오후 2:30'
      }
    ];

    setSelectedDiscussion(discussion);
    setMessages(sampleMessages);
    
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = () => {
    if (!inputText.trim() || !selectedDiscussion) return;

    const newMessage = {
      id: Date.now(),
      content: inputText,
      author: '나',
      isMyMessage: true,
      timestamp: new Date().toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })
    };

    console.log('메시지 전송:', newMessage);
    setMessages(prev => [...prev, newMessage]);
    setInputText('');

    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 헤더 */}
      <Box sx={{ 
        p: 2, 
        backgroundColor: '#FEE500', 
        borderBottom: '1px solid #E0E0E0'
      }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1A1A1A' }}>
          토론의견
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* 토론 목록 */}
        <Box sx={{ 
          width: 300, 
          borderRight: '1px solid #E0E0E0',
          backgroundColor: '#F8F9FA',
          overflow: 'auto'
        }}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              토론 목록
            </Typography>
            {discussions.map((discussion) => (
              <Card 
                key={discussion.id}
                sx={{ 
                  mb: 1, 
                  cursor: 'pointer',
                  backgroundColor: selectedDiscussion?.id === discussion.id ? '#E3F2FD' : 'white',
                  '&:hover': { backgroundColor: '#F5F5F5' }
                }}
                onClick={() => handleDiscussionSelect(discussion)}
              >
                <CardContent sx={{ py: 1.5, px: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                    {discussion.title}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>

        {/* 채팅 영역 */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedDiscussion ? (
            <>
              {/* 메시지 영역 */}
              <Box sx={{ 
                flex: 1, 
                p: 2, 
                overflow: 'auto',
                backgroundColor: '#F5F5F5'
              }}>
                {/* 디버깅 정보 */}
                <Box sx={{ 
                  backgroundColor: '#FFF3CD', 
                  border: '1px solid #FFEAA7', 
                  borderRadius: '4px', 
                  p: 1, 
                  mb: 2,
                  fontSize: '12px'
                }}>
                  <strong>디버깅:</strong> 메시지 {messages.length}개, 
                  토론: {selectedDiscussion.title}
                </Box>

                {/* 메시지 목록 */}
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
                          backgroundColor: selectedDiscussion.color,
                          fontSize: '12px',
                          color: 'white'
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
                          color: message.isMyMessage ? '#1A1A1A' : '#333',
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
                p: 2, 
                backgroundColor: 'white',
                borderTop: '1px solid #E0E0E0',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="메시지를 입력하세요..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '20px',
                      backgroundColor: '#F5F5F5'
                    }
                  }}
                />
                <IconButton 
                  onClick={handleSendMessage}
                  disabled={!inputText.trim()}
                  sx={{ 
                    backgroundColor: '#FEE500',
                    color: '#1A1A1A',
                    '&:hover': { backgroundColor: '#FFD700' },
                    '&:disabled': { backgroundColor: '#E0E0E0', color: '#999' }
                  }}
                >
                  <SendIcon />
                </IconButton>
              </Box>
            </>
          ) : (
            <Box sx={{ 
              flex: 1, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              backgroundColor: '#F5F5F5'
            }}>
              <Typography variant="h6" sx={{ color: '#666' }}>
                왼쪽에서 토론을 선택하세요
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default SimpleDiscussion; 