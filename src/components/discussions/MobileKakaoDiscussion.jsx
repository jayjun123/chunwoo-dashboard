import React, { useState, useEffect, useRef } from 'react';
import { getSites } from '../../api/sites';
import { 
  subscribeToDiscussions, 
  subscribeToMessages, 
  createDiscussion, 
  sendMessage, 
  deleteDiscussion,
  removeParticipant
} from '../../api/discussions';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Chip,
  Badge,
  Alert,
  Snackbar,
  Grid,
  Menu,
  ListItemIcon,
  ListItemText,
  Divider,
  AppBar,
  Toolbar,
  Fab
} from '@mui/material';
import {
  Send as SendIcon,
  Add as AddIcon,
  Search as SearchIcon,
  AttachFile as AttachFileIcon,
  MoreVert as MoreVertIcon,
  Info as InfoIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  ExitToApp as ExitToAppIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ArrowBack as ArrowBackIcon,
  KeyboardArrowUp as ArrowUpIcon
} from '@mui/icons-material';

const MobileKakaoDiscussion = () => {
  // 상태 관리
  const [discussions, setDiscussions] = useState([]);
  const [selectedDiscussion, setSelectedDiscussion] = useState(null);
  const [messages, setMessages] = useState({});
  const [newMessage, setNewMessage] = useState('');
  const [newDiscussion, setNewDiscussion] = useState({
    title: '',
    subtitle: '',
    siteName: '',
    password: '',
    category: '',
    priority: 'normal',
    files: []
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
  const [isParticipantsDialogOpen, setIsParticipantsDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDiscussion, setEditingDiscussion] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [sites, setSites] = useState([]);
  const [sitesLoading, setSitesLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const messagesEndRef = useRef(null);

  // 실시간 데이터 구독
  useEffect(() => {
    // 현장 데이터 로드
    const fetchSites = async () => {
      try {
        setSitesLoading(true);
        const sitesData = await getSites();
        setSites(sitesData);
      } catch (error) {
        console.error('현장 데이터 로드 실패:', error);
        setSnackbar({
          open: true,
          message: '현장 데이터를 불러오는데 실패했습니다.',
          severity: 'error'
        });
      } finally {
        setSitesLoading(false);
      }
    };

    fetchSites();

    // 실시간 토론 목록 구독
    const unsubscribeDiscussions = subscribeToDiscussions((discussions) => {
      setDiscussions(discussions);
    });

    return () => {
      unsubscribeDiscussions();
    };
  }, []);

  // 선택된 토론의 메시지 실시간 구독
  useEffect(() => {
    if (!selectedDiscussion) return;

    const unsubscribeMessages = subscribeToMessages(selectedDiscussion.id, (messages) => {
      setMessages(prev => ({
        ...prev,
        [selectedDiscussion.id]: messages
      }));
      
      // 스크롤을 맨 아래로
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => {
      unsubscribeMessages();
    };
  }, [selectedDiscussion]);

  // 스크롤 이벤트 리스너
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.pageYOffset > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 키보드 높이 감지
  useEffect(() => {
    const handleResize = () => {
      const visualViewport = window.visualViewport;
      if (visualViewport) {
        const keyboardHeight = window.innerHeight - visualViewport.height;
        setKeyboardHeight(keyboardHeight);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      return () => window.visualViewport.removeEventListener('resize', handleResize);
    }
  }, []);

  // 메시지 전송
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedDiscussion) return;

    try {
      const messageData = {
        content: newMessage,
        author: '나',
        authorId: 'current-user',
        type: 'text'
      };

      await sendMessage(selectedDiscussion.id, messageData);
      setNewMessage('');
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      setSnackbar({
        open: true,
        message: '메시지 전송에 실패했습니다.',
        severity: 'error'
      });
    }
  };

  // 새 토론 생성
  const handleCreateDiscussion = async () => {
    if (!newDiscussion.subtitle.trim()) {
      setSnackbar({
        open: true,
        message: '부제목을 입력해주세요.',
        severity: 'warning'
      });
      return;
    }

    if (!newDiscussion.siteName.trim()) {
      setSnackbar({
        open: true,
        message: '현장명을 선택해주세요.',
        severity: 'warning'
      });
      return;
    }

    try {
      const discussionData = {
        title: newDiscussion.subtitle, // 부제목을 제목으로 사용
        subtitle: newDiscussion.subtitle,
        siteName: newDiscussion.siteName,
        password: newDiscussion.password,
        category: newDiscussion.category,
        priority: newDiscussion.priority,
        createdBy: 'current-user',
        avatar: newDiscussion.subtitle.charAt(0),
        color: `hsl(${Math.random() * 360}, 70%, 60%)`
      };

      await createDiscussion(discussionData);
      
      setNewDiscussion({
        title: '',
        subtitle: '',
        siteName: '',
        password: '',
        category: '',
        priority: 'normal',
        files: []
      });
      setIsCreateDialogOpen(false);
      setSnackbar({
        open: true,
        message: '새로운 토론이 생성되었습니다.',
        severity: 'success'
      });
    } catch (error) {
      console.error('토론 생성 실패:', error);
      setSnackbar({
        open: true,
        message: '토론 생성에 실패했습니다.',
        severity: 'error'
      });
    }
  };

  // 필터링
  const filteredDiscussions = discussions.filter(d => 
    d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 카테고리 옵션
  const categories = ['안전', '일정', '자재', '품질', '환경', '기타'];
  const priorities = [
    { value: 'low', label: '낮음', color: 'success' },
    { value: 'normal', label: '보통', color: 'primary' },
    { value: 'high', label: '높음', color: 'warning' },
    { value: 'urgent', label: '긴급', color: 'error' }
  ];

  // 메뉴 핸들러
  const handleMenuOpen = (event) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleMenuAction = (action) => {
    handleMenuClose();
    switch (action) {
      case 'info':
        setIsInfoDialogOpen(true);
        break;
      case 'participants':
        setIsParticipantsDialogOpen(true);
        break;
      case 'settings':
        setIsSettingsDialogOpen(true);
        break;
      case 'edit':
        setEditingDiscussion(selectedDiscussion);
        setIsEditDialogOpen(true);
        break;
      case 'export':
        handleExportMessages();
        break;
      case 'leave':
        handleLeaveDiscussion();
        break;
      case 'delete':
        handleDeleteDiscussion();
        break;
      default:
        break;
    }
  };

  // 메시지 내보내기
  const handleExportMessages = () => {
    if (!selectedDiscussion) return;
    
    const messagesToExport = messages[selectedDiscussion.id] || [];
    const exportData = {
      discussion: selectedDiscussion,
      messages: messagesToExport,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedDiscussion.title}_메시지_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setSnackbar({
      open: true,
      message: '메시지가 성공적으로 내보내졌습니다.',
      severity: 'success'
    });
  };

  // 채팅방 나가기
  const handleLeaveDiscussion = async () => {
    if (!selectedDiscussion) return;
    
    try {
      await removeParticipant(selectedDiscussion.id);
      setSelectedDiscussion(null);
      
      setSnackbar({
        open: true,
        message: '채팅방을 나갔습니다.',
        severity: 'info'
      });
    } catch (error) {
      console.error('채팅방 나가기 실패:', error);
      setSnackbar({
        open: true,
        message: '채팅방 나가기에 실패했습니다.',
        severity: 'error'
      });
    }
  };

  // 채팅방 삭제
  const handleDeleteDiscussion = async () => {
    if (!selectedDiscussion) return;
    
    try {
      await deleteDiscussion(selectedDiscussion.id);
      setSelectedDiscussion(null);
      
      setSnackbar({
        open: true,
        message: '채팅방이 삭제되었습니다.',
        severity: 'warning'
      });
    } catch (error) {
      console.error('채팅방 삭제 실패:', error);
      setSnackbar({
        open: true,
        message: '채팅방 삭제에 실패했습니다.',
        severity: 'error'
      });
    }
  };

  // 채팅방 수정
  const handleEditDiscussion = async () => {
    if (!editingDiscussion) return;
    
    if (!editingDiscussion.subtitle.trim()) {
      setSnackbar({
        open: true,
        message: '부제목을 입력해주세요.',
        severity: 'warning'
      });
      return;
    }

    try {
      const updateData = {
        title: editingDiscussion.subtitle,
        subtitle: editingDiscussion.subtitle,
        password: editingDiscussion.password,
        category: editingDiscussion.category,
        priority: editingDiscussion.priority,
        updatedAt: new Date()
      };

      await updateDiscussion(editingDiscussion.id, updateData);
      
      setIsEditDialogOpen(false);
      setEditingDiscussion(null);
      setSnackbar({
        open: true,
        message: '채팅방이 수정되었습니다.',
        severity: 'success'
      });
    } catch (error) {
      console.error('채팅방 수정 실패:', error);
      setSnackbar({
        open: true,
        message: '채팅방 수정에 실패했습니다.',
        severity: 'error'
      });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Box sx={{ 
      backgroundColor: '#000000', 
      height: 'calc(100vh - 90px)', // 헤더(56px) + 하단바(34px) 제외 - 화면 키움
      color: '#FFFFFF',
      position: 'relative',
      mt: '26px' // 헤더 높이만큼 위로 여백 - 30px 위로 이동
    }}>
              {/* 채팅방 목록 화면 */}
        {!selectedDiscussion ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            height: '100%'
          }}>
                  {/* 헤더 */}
        <AppBar position="static" sx={{ backgroundColor: '#000000', color: '#FFFFFF' }}>
          <Toolbar>
            <Typography variant="h6" sx={{ flex: 1, fontWeight: 'bold', fontSize: '20px' }}>
              토론의견
            </Typography>
            <IconButton 
              onClick={() => setIsCreateDialogOpen(true)}
              sx={{ color: '#FFFFFF', mr: 1 }}
            >
              <AddIcon />
            </IconButton>
            <IconButton sx={{ color: '#FFFFFF' }}>
              <SearchIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        {/* 검색바 */}
        <Box sx={{ p: 2, backgroundColor: '#000000' }}>
                      <TextField
            fullWidth
            placeholder="토론 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: '#666', mr: 1 }} />,
              sx: { 
                backgroundColor: '#333333',
                borderRadius: 2,
                '& fieldset': { border: 'none' },
                '& input': {
                  color: '#FFFFFF',
                  '&::placeholder': {
                    color: '#999',
                    opacity: 1
                  }
                }
              }
            }}
          />
          </Box>

          {/* 채팅방 목록 */}
          <Box sx={{ 
            p: 1,
            height: 'calc(100vh - 200px)', // 실제 높이를 키움
            overflowY: 'auto',
            pb: 10 // 하단바 높이(38px) + 더 큰 여백
          }}>
                      {filteredDiscussions.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', backgroundColor: '#2D2D2D', m: 2 }}>
              <Typography variant="h6" sx={{ color: '#FFFFFF', mb: 1 }}>
                토론이 없습니다
              </Typography>
              <Typography variant="body2" sx={{ color: '#CCCCCC' }}>
                첫 번째 토론을 시작해보세요!
              </Typography>
            </Paper>
          ) : (
              filteredDiscussions.map((discussion) => (
                <Card 
                  key={discussion.id} 
                  sx={{ 
                    mb: 1, 
                    backgroundColor: selectedDiscussion?.id === discussion.id ? '#444444' : '#2D2D2D',
                    borderRadius: 0,
                    borderBottom: '1px solid #444444',
                    boxShadow: 'none',
                    '&:hover': { backgroundColor: '#444444' },
                    cursor: 'pointer'
                  }}
                  onClick={() => setSelectedDiscussion(discussion)}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Badge
                        badgeContent={discussion.unreadCount}
                        color="error"
                        invisible={discussion.unreadCount === 0}
                      >
                        <Avatar 
                          sx={{ 
                            width: 50, 
                            height: 50, 
                            backgroundColor: discussion.color,
                            fontSize: '18px',
                            fontWeight: 'bold'
                          }}
                        >
                          {discussion.avatar}
                        </Avatar>
                      </Badge>
                      
                      <Box sx={{ ml: 2, flex: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                          <Box>
                            <Typography variant="h6" sx={{ fontSize: '16px', fontWeight: 'bold', color: '#FFFFFF' }}>
                              {discussion.siteName}
                            </Typography>
                            {discussion.subtitle && (
                              <Typography variant="body2" sx={{ color: '#999', fontSize: '12px' }}>
                                {discussion.subtitle}
                              </Typography>
                            )}
                          </Box>
                          <Typography variant="body2" sx={{ color: '#999', fontSize: '12px' }}>
                            {discussion.lastMessageTime?.toDate ? 
                              discussion.lastMessageTime.toDate().toLocaleTimeString('ko-KR', { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                hour12: true 
                              }) : 
                              discussion.lastMessageTime || ''
                            }
                          </Typography>
                        </Box>
                        
                        <Typography variant="body2" sx={{ color: '#CCCCCC', fontSize: '14px', mb: 0.5 }}>
                          {discussion.lastMessage}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={discussion.category}
                            size="small"
                            sx={{ 
                              backgroundColor: discussion.color,
                              color: 'white',
                              fontSize: '10px',
                              height: '20px'
                            }}
                          />
                          <Typography variant="caption" sx={{ color: '#999' }}>
                            참여자 {discussion.participants}명
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))
            )}
          </Box>
          </Box>
        ) : (
        /* 채팅 화면 */
        <Box sx={{ 
          height: 'calc(100vh - 90px)', // 헤더 + 하단바 제외 - 화면 키움
          display: 'flex', 
          flexDirection: 'column',
          backgroundColor: '#1A1A1A',
          mt: '26px' // 헤더 높이만큼 위로 여백 - 30px 위로 이동
        }}>
          {/* 채팅 헤더 */}
          <AppBar 
            position="static" 
            sx={{ 
              backgroundColor: '#333333', 
              color: '#FFFFFF'
            }}
          >
            <Toolbar sx={{ minHeight: '56px !important' }}>
              <IconButton 
                onClick={() => setSelectedDiscussion(null)}
                sx={{ color: '#FFFFFF', mr: 1 }}
              >
                <ArrowBackIcon />
              </IconButton>
              <Avatar 
                sx={{ 
                  width: 36, 
                  height: 36, 
                  backgroundColor: selectedDiscussion.color,
                  fontSize: '14px',
                  fontWeight: 'bold',
                  mr: 1
                }}
              >
                {selectedDiscussion.avatar}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontSize: '16px', fontWeight: 'bold', color: '#FFFFFF' }}>
                  {selectedDiscussion.siteName}
                </Typography>
                <Typography variant="body2" sx={{ color: '#CCCCCC', fontSize: '12px' }}>
                  {selectedDiscussion.subtitle && `${selectedDiscussion.subtitle} • `}참여자 {selectedDiscussion.participants}명
                </Typography>
              </Box>
              <IconButton 
                onClick={handleMenuOpen}
                sx={{ color: '#FFFFFF' }}
              >
                <MoreVertIcon />
              </IconButton>
            </Toolbar>
          </AppBar>

          {/* 메시지 영역 */}
          <Box sx={{ 
            flex: 1, 
            overflowY: 'auto', 
            backgroundColor: '#1A1A1A',
            p: 2,
            pb: keyboardHeight > 0 ? `${keyboardHeight + 60}px` : '60px', // 키보드 높이에 따라 하단 패딩 조정
            margin: 0 // 마진 제거로 딱 붙게
          }}>
            {messages[selectedDiscussion.id]?.map((message) => {
              const isMyMessage = message.authorId === 'current-user';
              const timestamp = message.timestamp?.toDate ? 
                message.timestamp.toDate().toLocaleTimeString('ko-KR', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: true 
                }) : 
                message.timestamp || '';

              return (
                <Box 
                  key={message.id} 
                  sx={{ 
                    display: 'flex', 
                    justifyContent: isMyMessage ? 'flex-end' : 'flex-start',
                    mb: 2
                  }}
                >
                  {!isMyMessage && (
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
                      {message.author?.charAt(0) || '사'}
                    </Avatar>
                  )}
                  
                  <Box sx={{ maxWidth: '70%' }}>
                    {!isMyMessage && (
                      <Typography variant="caption" sx={{ color: '#CCCCCC', ml: 1, mb: 0.5, display: 'block', fontSize: '11px' }}>
                        {message.author}
                      </Typography>
                    )}
                    
                    <Paper sx={{
                      p: 1.5,
                      backgroundColor: isMyMessage ? '#4CAF50' : '#333333',
                      borderRadius: isMyMessage ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                      wordBreak: 'break-word',
                      maxWidth: '100%'
                    }}>
                      <Typography variant="body2" sx={{ 
                        fontSize: '14px',
                        color: '#FFFFFF',
                        lineHeight: 1.4
                      }}>
                        {message.content}
                      </Typography>
                    </Paper>
                    
                    <Typography variant="caption" sx={{ 
                      color: '#CCCCCC', 
                      ml: 1, 
                      mt: 0.5, 
                      display: 'block',
                      textAlign: isMyMessage ? 'right' : 'left',
                      fontSize: '11px'
                    }}>
                      {timestamp}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
            <div ref={messagesEndRef} />
          </Box>

          {/* 메시지 입력 영역 */}
          <Box sx={{ 
            backgroundColor: '#2D2D2D', 
            borderTop: '1px solid #444444',
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            px: 2,
            py: 0.5,
            position: 'fixed',
            bottom: keyboardHeight > 0 ? `${keyboardHeight}px` : 0, // 키보드에 딱 붙어서 위치
            left: 0,
            right: 0,
            zIndex: 1000,
            margin: 0 // 마진 제거로 딱 붙게
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <IconButton sx={{ color: '#CCCCCC', flexShrink: 0 }}>
                <AttachFileIcon />
              </IconButton>
              <TextField
                fullWidth
                placeholder="메시지를 입력하세요..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                InputProps={{
                  sx: { 
                    backgroundColor: '#444444',
                    borderRadius: 3,
                    '& fieldset': { border: 'none' },
                    '& input': {
                      color: '#FFFFFF',
                      fontSize: '14px',
                      '&::placeholder': {
                        color: '#999',
                        opacity: 1
                      }
                    }
                  }
                }}
              />
              <IconButton 
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                sx={{ 
                  color: '#FFFFFF',
                  backgroundColor: newMessage.trim() ? '#4CAF50' : '#666666',
                  flexShrink: 0,
                  width: 40,
                  height: 40
                }}
              >
                <SendIcon />
              </IconButton>
            </Box>
          </Box>
        </Box>
      )}

      {/* 새 토론 생성 다이얼로그 */}
      <Dialog 
        open={isCreateDialogOpen} 
        onClose={() => setIsCreateDialogOpen(false)}
        fullScreen
        PaperProps={{
          sx: { backgroundColor: '#1A1A1A' }
        }}
      >
        <AppBar position="sticky" sx={{ backgroundColor: '#333333', color: '#FFFFFF' }}>
          <Toolbar>
            <IconButton 
              onClick={() => setIsCreateDialogOpen(false)}
              sx={{ color: '#FFFFFF', mr: 2 }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" sx={{ flex: 1 }}>
              새 토론 만들기
            </Typography>
          </Toolbar>
        </AppBar>
        
        <Box sx={{ p: 2, pb: 8 }}>
          {/* 현장명 검색 */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel sx={{ color: '#CCCCCC' }}>현장명 *</InputLabel>
            <Select
              value={newDiscussion.siteName}
              onChange={(e) => setNewDiscussion({...newDiscussion, siteName: e.target.value})}
              disabled={sitesLoading}
              sx={{ 
                backgroundColor: '#444444',
                '& .MuiSelect-select': {
                  color: '#FFFFFF'
                }
              }}
            >
              {sitesLoading ? (
                <MenuItem disabled>현장 데이터 로딩 중...</MenuItem>
              ) : sites.length === 0 ? (
                <MenuItem disabled>등록된 현장이 없습니다</MenuItem>
              ) : (
                sites.map(site => (
                  <MenuItem key={site.id} value={site.name}>
                    {site.name}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          {/* 부제목 */}
          <TextField
            fullWidth
            label="부제목 *"
            value={newDiscussion.subtitle}
            onChange={(e) => setNewDiscussion({...newDiscussion, subtitle: e.target.value})}
            sx={{ mb: 2 }}
            InputProps={{ 
              sx: { 
                backgroundColor: '#444444',
                '& input': {
                  color: '#FFFFFF'
                },
                '& label': {
                  color: '#CCCCCC'
                }
              } 
            }}
          />

          {/* 비밀번호 (선택사항) */}
          <TextField
            fullWidth
            label="비밀번호 (선택사항)"
            type="password"
            value={newDiscussion.password}
            onChange={(e) => setNewDiscussion({...newDiscussion, password: e.target.value})}
            sx={{ mb: 2 }}
            InputProps={{ 
              sx: { 
                backgroundColor: '#444444',
                '& input': {
                  color: '#FFFFFF'
                },
                '& label': {
                  color: '#CCCCCC'
                }
              } 
            }}
          />
          
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: '#CCCCCC' }}>카테고리</InputLabel>
                <Select
                  value={newDiscussion.category}
                  onChange={(e) => setNewDiscussion({...newDiscussion, category: e.target.value})}
                  sx={{ 
                    backgroundColor: '#444444',
                    '& .MuiSelect-select': {
                      color: '#FFFFFF'
                    }
                  }}
                >
                  {categories.map(cat => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: '#CCCCCC' }}>우선순위</InputLabel>
                <Select
                  value={newDiscussion.priority}
                  onChange={(e) => setNewDiscussion({...newDiscussion, priority: e.target.value})}
                  sx={{ 
                    backgroundColor: '#444444',
                    '& .MuiSelect-select': {
                      color: '#FFFFFF'
                    }
                  }}
                >
                  {priorities.map(priority => (
                    <MenuItem key={priority.value} value={priority.value}>
                      {priority.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>
        
        {/* 하단 고정 버튼 영역 */}
        <Box sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#1A1A1A',
          borderTop: '1px solid #444444',
          p: 2,
          zIndex: 1000
        }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              onClick={() => setIsCreateDialogOpen(false)}
              variant="outlined"
              fullWidth
              sx={{
                borderColor: '#666666',
                color: '#FFFFFF',
                '&:hover': {
                  borderColor: '#888888',
                  backgroundColor: 'rgba(255,255,255,0.1)'
                }
              }}
            >
              취소
            </Button>
            <Button 
              onClick={handleCreateDiscussion}
              variant="contained"
              fullWidth
              sx={{
                backgroundColor: '#4CAF50',
                color: '#FFFFFF',
                '&:hover': { backgroundColor: '#45A049' }
              }}
            >
              만들기
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* 채팅방 메뉴 */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            backgroundColor: '#2D2D2D',
            color: '#FFFFFF',
            minWidth: 200
          }
        }}
      >
        <MenuItem onClick={() => handleMenuAction('info')}>
          <ListItemIcon>
            <InfoIcon sx={{ color: '#4CAF50' }} />
          </ListItemIcon>
          <ListItemText>채팅방 정보</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('participants')}>
          <ListItemIcon>
            <PeopleIcon sx={{ color: '#4CAF50' }} />
          </ListItemIcon>
          <ListItemText>참여자 목록</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('settings')}>
          <ListItemIcon>
            <SettingsIcon sx={{ color: '#4CAF50' }} />
          </ListItemIcon>
          <ListItemText>채팅방 설정</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('edit')}>
          <ListItemIcon>
            <EditIcon sx={{ color: '#4CAF50' }} />
          </ListItemIcon>
          <ListItemText>채팅방 수정</ListItemText>
        </MenuItem>
        <Divider sx={{ backgroundColor: '#444444' }} />
        <MenuItem onClick={() => handleMenuAction('export')}>
          <ListItemIcon>
            <DownloadIcon sx={{ color: '#4CAF50' }} />
          </ListItemIcon>
          <ListItemText>메시지 내보내기</ListItemText>
        </MenuItem>
        <Divider sx={{ backgroundColor: '#444444' }} />
        <MenuItem onClick={() => handleMenuAction('leave')}>
          <ListItemIcon>
            <ExitToAppIcon sx={{ color: '#FF9800' }} />
          </ListItemIcon>
          <ListItemText>채팅방 나가기</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('delete')}>
          <ListItemIcon>
            <DeleteIcon sx={{ color: '#F44336' }} />
          </ListItemIcon>
          <ListItemText>채팅방 삭제</ListItemText>
        </MenuItem>
      </Menu>

      {/* 채팅방 정보 다이얼로그 */}
      <Dialog 
        open={isInfoDialogOpen} 
        onClose={() => setIsInfoDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { backgroundColor: '#1A1A1A' }
        }}
      >
        <DialogTitle sx={{ backgroundColor: '#333333', color: '#FFFFFF' }}>
          채팅방 정보
        </DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          {selectedDiscussion && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar 
                  sx={{ 
                    width: 60, 
                    height: 60, 
                    backgroundColor: selectedDiscussion.color,
                    fontSize: '24px',
                    fontWeight: 'bold',
                    mr: 2
                  }}
                >
                  {selectedDiscussion.avatar}
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ color: '#FFFFFF', mb: 1 }}>
                    {selectedDiscussion.siteName}
                  </Typography>
                  {selectedDiscussion.subtitle && (
                    <Typography variant="body2" sx={{ color: '#CCCCCC', mb: 1 }}>
                      {selectedDiscussion.subtitle}
                    </Typography>
                  )}
                  <Chip
                    label={selectedDiscussion.category}
                    size="small"
                    sx={{ 
                      backgroundColor: selectedDiscussion.color,
                      color: 'white',
                      fontSize: '12px'
                    }}
                  />
                </Box>
              </Box>
              <Typography variant="body2" sx={{ color: '#CCCCCC', mb: 1 }}>
                참여자: {selectedDiscussion.participants}명
              </Typography>
              <Typography variant="body2" sx={{ color: '#CCCCCC', mb: 1 }}>
                마지막 메시지: {selectedDiscussion.lastMessageTime}
              </Typography>
              <Typography variant="body2" sx={{ color: '#CCCCCC' }}>
                메시지 수: {messages[selectedDiscussion.id]?.length || 0}개
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsInfoDialogOpen(false)}>
            닫기
          </Button>
        </DialogActions>
      </Dialog>

      {/* 참여자 목록 다이얼로그 */}
      <Dialog 
        open={isParticipantsDialogOpen} 
        onClose={() => setIsParticipantsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { backgroundColor: '#1A1A1A' }
        }}
      >
        <DialogTitle sx={{ backgroundColor: '#333333', color: '#FFFFFF' }}>
          참여자 목록
        </DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          {selectedDiscussion && (
            <Box>
              <Typography variant="body2" sx={{ color: '#CCCCCC', mb: 2 }}>
                총 {selectedDiscussion.participants}명이 참여 중입니다.
              </Typography>
              {/* 샘플 참여자 목록 */}
              {['김현장', '최안전', '박감독', '이자재', '정품질'].map((name, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1, p: 1, backgroundColor: '#2D2D2D', borderRadius: 1 }}>
                  <Avatar 
                    sx={{ 
                      width: 32, 
                      height: 32, 
                      backgroundColor: `hsl(${index * 60}, 70%, 60%)`,
                      fontSize: '12px',
                      mr: 2
                    }}
                  >
                    {name.charAt(0)}
                  </Avatar>
                  <Typography variant="body2" sx={{ color: '#FFFFFF' }}>
                    {name}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsParticipantsDialogOpen(false)}>
            닫기
          </Button>
        </DialogActions>
      </Dialog>

      {/* 채팅방 설정 다이얼로그 */}
      <Dialog 
        open={isSettingsDialogOpen} 
        onClose={() => setIsSettingsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { backgroundColor: '#1A1A1A' }
        }}
      >
        <DialogTitle sx={{ backgroundColor: '#333333', color: '#FFFFFF' }}>
          채팅방 설정
        </DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          {selectedDiscussion && (
            <Box>
              <Typography variant="h6" sx={{ color: '#FFFFFF', mb: 2 }}>
                {selectedDiscussion.siteName}
              </Typography>
              {selectedDiscussion.subtitle && (
                <Typography variant="body2" sx={{ color: '#CCCCCC', mb: 2 }}>
                  {selectedDiscussion.subtitle}
                </Typography>
              )}
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel sx={{ color: '#CCCCCC' }}>알림 설정</InputLabel>
                <Select
                  defaultValue="all"
                  sx={{ 
                    backgroundColor: '#444444',
                    '& .MuiSelect-select': {
                      color: '#FFFFFF'
                    }
                  }}
                >
                  <MenuItem value="all">모든 메시지</MenuItem>
                  <MenuItem value="mentions">멘션만</MenuItem>
                  <MenuItem value="none">알림 끄기</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel sx={{ color: '#CCCCCC' }}>메시지 표시</InputLabel>
                <Select
                  defaultValue="all"
                  sx={{ 
                    backgroundColor: '#444444',
                    '& .MuiSelect-select': {
                      color: '#FFFFFF'
                    }
                  }}
                >
                  <MenuItem value="all">모든 메시지</MenuItem>
                  <MenuItem value="text">텍스트만</MenuItem>
                  <MenuItem value="files">파일만</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsSettingsDialogOpen(false)}>
            취소
          </Button>
          <Button 
            variant="contained"
            onClick={() => setIsSettingsDialogOpen(false)}
            sx={{
              backgroundColor: '#4CAF50',
              color: '#FFFFFF',
              '&:hover': { backgroundColor: '#45A049' }
            }}
          >
            저장
          </Button>
        </DialogActions>
      </Dialog>

      {/* 채팅방 수정 다이얼로그 */}
      <Dialog 
        open={isEditDialogOpen} 
        onClose={() => setIsEditDialogOpen(false)}
        fullScreen
        PaperProps={{
          sx: { backgroundColor: '#1A1A1A' }
        }}
      >
        <AppBar position="sticky" sx={{ backgroundColor: '#333333', color: '#FFFFFF' }}>
          <Toolbar>
            <IconButton 
              onClick={() => setIsEditDialogOpen(false)}
              sx={{ color: '#FFFFFF', mr: 2 }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" sx={{ flex: 1 }}>
              채팅방 수정
            </Typography>
            <Button 
              onClick={handleEditDiscussion}
              variant="contained"
              sx={{
                backgroundColor: '#4CAF50',
                color: '#FFFFFF',
                '&:hover': { backgroundColor: '#45A049' }
              }}
            >
              수정
            </Button>
          </Toolbar>
        </AppBar>
        
        <Box sx={{ p: 2 }}>
          {editingDiscussion && (
            <>
              {/* 현장명 (읽기 전용) */}
              <TextField
                fullWidth
                label="현장명"
                value={editingDiscussion.siteName}
                disabled
                sx={{ mb: 2 }}
                InputProps={{ 
                  sx: { 
                    backgroundColor: '#444444',
                    '& input': {
                      color: '#CCCCCC'
                    },
                    '& label': {
                      color: '#CCCCCC'
                    }
                  } 
                }}
              />

              {/* 부제목 */}
              <TextField
                fullWidth
                label="부제목 *"
                value={editingDiscussion.subtitle}
                onChange={(e) => setEditingDiscussion({...editingDiscussion, subtitle: e.target.value})}
                sx={{ mb: 2 }}
                InputProps={{ 
                  sx: { 
                    backgroundColor: '#444444',
                    '& input': {
                      color: '#FFFFFF'
                    },
                    '& label': {
                      color: '#CCCCCC'
                    }
                  } 
                }}
              />

              {/* 비밀번호 */}
              <TextField
                fullWidth
                label="비밀번호"
                type="password"
                value={editingDiscussion.password}
                onChange={(e) => setEditingDiscussion({...editingDiscussion, password: e.target.value})}
                sx={{ mb: 2 }}
                InputProps={{ 
                  sx: { 
                    backgroundColor: '#444444',
                    '& input': {
                      color: '#FFFFFF'
                    },
                    '& label': {
                      color: '#CCCCCC'
                    }
                  } 
                }}
              />
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel sx={{ color: '#CCCCCC' }}>카테고리</InputLabel>
                    <Select
                      value={editingDiscussion.category}
                      onChange={(e) => setEditingDiscussion({...editingDiscussion, category: e.target.value})}
                      sx={{ 
                        backgroundColor: '#444444',
                        '& .MuiSelect-select': {
                          color: '#FFFFFF'
                        }
                      }}
                    >
                      {categories.map(cat => (
                        <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel sx={{ color: '#CCCCCC' }}>우선순위</InputLabel>
                    <Select
                      value={editingDiscussion.priority}
                      onChange={(e) => setEditingDiscussion({...editingDiscussion, priority: e.target.value})}
                      sx={{ 
                        backgroundColor: '#444444',
                        '& .MuiSelect-select': {
                          color: '#FFFFFF'
                        }
                      }}
                    >
                      {priorities.map(priority => (
                        <MenuItem key={priority.value} value={priority.value}>
                          {priority.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </>
          )}
        </Box>
      </Dialog>

      {/* 스크롤 탑 FAB */}
      {showScrollTop && (
        <Fab
          color="primary"
          aria-label="scroll to top"
          onClick={scrollToTop}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            backgroundColor: '#4CAF50',
            color: '#FFFFFF',
            '&:hover': { backgroundColor: '#45A049' }
          }}
        >
          <ArrowUpIcon />
        </Fab>
      )}

      {/* 스낵바 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MobileKakaoDiscussion; 