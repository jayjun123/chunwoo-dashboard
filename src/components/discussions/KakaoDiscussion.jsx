import React, { useState, useEffect, useRef } from 'react';
import { getSites } from '../../api/sites';
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
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  AppBar,
  Toolbar,
  InputAdornment,
  Divider,
  Chip,
  Badge,
  Fab,
  SwipeableDrawer,
  Alert,
  Snackbar,
  Grid,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Send as SendIcon,
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  AttachFile as AttachFileIcon,
  Image as ImageIcon,
  Close as CloseIcon,
  MoreVert as MoreVertIcon,
  KeyboardArrowUp as ArrowUpIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Reply as ReplyIcon
} from '@mui/icons-material';
import FileUpload from './FileUpload';

const KakaoDiscussion = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // 상태 관리
  const [discussions, setDiscussions] = useState([]);
  const [selectedDiscussion, setSelectedDiscussion] = useState(null);
  const [messages, setMessages] = useState({});
  const [newMessage, setNewMessage] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [newDiscussion, setNewDiscussion] = useState({
    title: '',
    subtitle: '',
    siteName: '',
    password: '',
    category: '',
    priority: 'normal',
    files: []
  });
  const [sites, setSites] = useState([]);
  const [sitesLoading, setSitesLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // 샘플 데이터 - 카카오톡 스타일 채팅방
  const sampleDiscussions = [
    {
      id: 1,
      title: '현장 안전 관리',
      lastMessage: '개인보호구 착용률 향상 방안에 대해 논의해주세요.',
      lastMessageTime: '오후 2:30',
      unreadCount: 3,
      participants: 8,
      category: '안전',
      priority: 'high',
      avatar: '안',
      color: '#FF6B6B'
    },
    {
      id: 2,
      title: '공사 일정 조정',
      lastMessage: '다음 주 콘크리트 타설 일정 조정 건의',
      lastMessageTime: '오후 1:15',
      unreadCount: 1,
      participants: 5,
      category: '일정',
      priority: 'medium',
      avatar: '일',
      color: '#4ECDC4'
    },
    {
      id: 3,
      title: '자재 관리 시스템',
      lastMessage: 'QR코드 활용한 자재 추적 시스템 도입 제안',
      lastMessageTime: '오전 11:45',
      unreadCount: 0,
      participants: 12,
      category: '자재',
      priority: 'normal',
      avatar: '자',
      color: '#45B7D1'
    },
    {
      id: 4,
      title: '품질 관리 개선',
      lastMessage: '콘크리트 강도 테스트 프로세스 개선안',
      lastMessageTime: '어제',
      unreadCount: 5,
      participants: 6,
      category: '품질',
      priority: 'high',
      avatar: '품',
      color: '#96CEB4'
    }
  ];

  const sampleMessages = {
    1: [
      {
        id: 1,
        content: '현재 현장의 안전 관리 시스템을 개선하기 위한 의견을 수렴하고자 합니다.',
        author: '김현장',
        authorAvatar: '김',
        timestamp: '오후 2:00',
        type: 'text',
        isMyMessage: false
      },
      {
        id: 2,
        content: '개인보호구 착용률 향상을 위해서는 매일 아침 점검 시간을 확보하는 것이 좋겠습니다.',
        author: '최안전',
        authorAvatar: '최',
        timestamp: '오후 2:15',
        type: 'text',
        isMyMessage: false
      },
      {
        id: 3,
        content: '안전교육은 실습 위주로 진행하고, 정기적인 평가를 통해 효과를 측정해야 합니다.',
        author: '정교육',
        authorAvatar: '정',
        timestamp: '오후 2:30',
        type: 'text',
        isMyMessage: false
      }
    ],
    2: [
      {
        id: 1,
        content: '다음 주 예정된 콘크리트 타설 작업 일정을 기상 상황을 고려하여 조정하는 것이 어떨까요?',
        author: '박감독',
        authorAvatar: '박',
        timestamp: '오후 1:00',
        type: 'text',
        isMyMessage: false
      },
      {
        id: 2,
        content: '기상청 예보를 참고하여 일정을 조정하는 것이 현명한 판단입니다.',
        author: '한기상',
        authorAvatar: '한',
        timestamp: '오후 1:15',
        type: 'text',
        isMyMessage: false
      }
    ],
    3: [
      {
        id: 1,
        content: '현재 자재 관리 시스템에서 재고 확인과 발주 프로세스를 개선할 수 있는 방안을 제안합니다.',
        author: '이자재',
        authorAvatar: '이',
        timestamp: '오전 11:30',
        type: 'text',
        isMyMessage: false
      },
      {
        id: 2,
        content: 'QR코드를 활용한 자재 추적 시스템을 도입하면 효율성이 크게 향상될 것 같습니다.',
        author: '디지털',
        authorAvatar: '디',
        timestamp: '오전 11:45',
        type: 'text',
        isMyMessage: false
      }
    ]
  };

  useEffect(() => {
    setDiscussions(sampleDiscussions);
    setMessages(sampleMessages);
  }, []);

  // 스크롤 이벤트 리스너
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.pageYOffset > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 메시지 전송
  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedDiscussion) return;

    const message = {
      id: Date.now(),
      content: newMessage,
      author: '나',
      authorAvatar: '나',
      timestamp: new Date().toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }),
      type: 'text',
      isMyMessage: true
    };

    const updatedMessages = {
      ...messages,
      [selectedDiscussion.id]: [...(messages[selectedDiscussion.id] || []), message]
    };

    setMessages(updatedMessages);
    setNewMessage('');

    // 마지막 메시지 업데이트
    setDiscussions(discussions.map(d => 
      d.id === selectedDiscussion.id 
        ? { 
            ...d, 
            lastMessage: newMessage,
            lastMessageTime: message.timestamp,
            unreadCount: 0
          }
        : d
    ));

    // 스크롤을 맨 아래로
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // 새 토론 생성
  const handleCreateDiscussion = () => {
    if (!newDiscussion.title.trim()) {
      setSnackbar({
        open: true,
        message: '토론 제목을 입력해주세요.',
        severity: 'warning'
      });
      return;
    }

    const discussion = {
      id: Date.now(),
      title: newDiscussion.title,
      lastMessage: '새로운 토론이 시작되었습니다.',
      lastMessageTime: new Date().toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }),
      unreadCount: 0,
      participants: 1,
      category: newDiscussion.category,
      priority: newDiscussion.priority,
      avatar: newDiscussion.title.charAt(0),
      color: `hsl(${Math.random() * 360}, 70%, 60%)`
    };

    setDiscussions([discussion, ...discussions]);
    setNewDiscussion({
      title: '',
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
  };

  const handleFilesChange = (files) => {
    setNewDiscussion({ ...newDiscussion, files });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  return (
    <Box sx={{ 
      backgroundColor: '#F2F3F5', 
      minHeight: '100vh',
      color: '#1A1A1A',
      display: { xs: 'block', md: 'flex' }, // 모바일에서는 세로, PC에서는 가로
      height: { xs: '100vh', md: 'calc(100vh - 120px)' }, // PC에서는 헤더와 하단바 높이 제외
      mt: { xs: 0, md: '60px' }, // PC에서는 헤더 높이만큼 여백
      mb: { xs: 0, md: '60px' }  // PC에서는 하단바 높이만큼 여백
    }}>
      {/* 왼쪽 채팅방 목록 */}
      <Box sx={{ 
        width: { xs: '100%', md: '400px' },
        height: { xs: 'auto', md: '100%' },
        borderRight: { xs: 'none', md: '1px solid #E5E5E5' },
        backgroundColor: 'white',
        display: { xs: selectedDiscussion ? 'none' : 'block', md: 'block' }
      }}>
        {/* 헤더 */}
        <AppBar 
          position={isMobile ? 'sticky' : 'static'} 
          sx={{ backgroundColor: '#FEE500', color: '#1A1A1A' }}
        >
          <Toolbar>
            <Typography variant="h6" sx={{ flex: 1, fontWeight: 'bold' }}>
              토론의견
            </Typography>
            <IconButton 
              onClick={() => setFilterDrawerOpen(true)}
              sx={{ color: '#1A1A1A' }}
            >
              <FilterIcon />
            </IconButton>
            <IconButton 
              onClick={() => setIsCreateDialogOpen(true)}
              sx={{ color: '#1A1A1A' }}
            >
              <AddIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        {/* 검색바 */}
        <Box sx={{ p: 2, backgroundColor: '#FEE500' }}>
          <TextField
            fullWidth
            placeholder="토론 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: '#666', mr: 1 }} />,
              sx: { 
                backgroundColor: 'white',
                borderRadius: 2,
                '& fieldset': { border: 'none' }
              }
            }}
          />
        </Box>

        {/* 채팅방 목록 */}
        <Box sx={{ 
          p: 1, 
          height: { xs: 'auto', md: 'calc(100% - 140px)' },
          overflowY: 'auto'
        }}>
          {filteredDiscussions.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', backgroundColor: 'white', m: 2 }}>
              <Typography variant="h6" sx={{ color: '#666', mb: 1 }}>
                토론이 없습니다
              </Typography>
              <Typography variant="body2" sx={{ color: '#999' }}>
                첫 번째 토론을 시작해보세요!
              </Typography>
            </Paper>
          ) : (
            filteredDiscussions.map((discussion) => (
              <Card 
                key={discussion.id} 
                sx={{ 
                  mb: 1, 
                  backgroundColor: selectedDiscussion?.id === discussion.id ? '#F8F9FA' : 'white',
                  borderRadius: 0,
                  borderBottom: '1px solid #E5E5E5',
                  boxShadow: 'none',
                  '&:hover': { backgroundColor: '#F8F9FA' },
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
                        <Typography variant="h6" sx={{ fontSize: '16px', fontWeight: 'bold' }}>
                          {discussion.title}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#999', fontSize: '12px' }}>
                          {discussion.lastMessageTime}
                        </Typography>
                      </Box>
                      
                      <Typography variant="body2" sx={{ color: '#666', fontSize: '14px', mb: 0.5 }}>
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

      {/* 오른쪽 채팅 화면 */}
      {selectedDiscussion ? (
                 /* 채팅 화면 */
         <Box sx={{ 
           height: { xs: '100vh', md: '100%' }, 
           display: 'flex', 
           flexDirection: 'column',
           backgroundColor: '#F2F3F5',
           flex: 1
         }}>
           {/* 채팅 헤더 */}
           <AppBar 
             position="fixed" 
             sx={{ 
               backgroundColor: '#FEE500', 
               color: '#1A1A1A',
               top: 0,
               zIndex: 1000
             }}
           >
             <Toolbar sx={{ minHeight: '56px !important' }}>
               <IconButton 
                 onClick={() => setSelectedDiscussion(null)}
                 sx={{ color: '#1A1A1A', mr: 1 }}
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
                 <Typography variant="h6" sx={{ fontSize: '16px', fontWeight: 'bold', color: '#1A1A1A' }}>
                   {selectedDiscussion.title}
                 </Typography>
                 <Typography variant="body2" sx={{ color: '#666', fontSize: '12px' }}>
                   참여자 {selectedDiscussion.participants}명
                 </Typography>
               </Box>
               <IconButton sx={{ color: '#1A1A1A' }}>
                 <MoreVertIcon />
               </IconButton>
             </Toolbar>
           </AppBar>

           {/* 메시지 영역 */}
           <Box sx={{ 
             flex: 1, 
             overflowY: 'auto', 
             backgroundColor: '#F2F3F5',
             p: 1,
             mt: '56px', // 헤더 높이만큼 여백
             mb: '80px'  // 입력창 높이만큼 여백
           }}>
             {messages[selectedDiscussion.id]?.map((message) => (
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
                     {message.authorAvatar}
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

           {/* 메시지 입력 영역 */}
           <Box sx={{ 
             position: { xs: 'fixed', md: 'static' },
             bottom: { xs: 0, md: 'auto' },
             left: { xs: 0, md: 'auto' },
             right: { xs: 0, md: 'auto' },
             backgroundColor: 'white', 
             borderTop: '1px solid #E5E5E5',
             zIndex: { xs: 1000, md: 1 },
             height: '80px',
             display: 'flex',
             alignItems: 'center',
             px: 2,
             py: 1
           }}>
             <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
               <IconButton sx={{ color: '#666', flexShrink: 0 }}>
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
                     backgroundColor: '#F2F3F5',
                     borderRadius: 3,
                     '& fieldset': { border: 'none' },
                     '& input': {
                       color: '#1A1A1A',
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
                   color: newMessage.trim() ? '#FEE500' : '#CCC',
                   backgroundColor: newMessage.trim() ? '#1A1A1A' : '#F2F3F5',
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
          sx: { backgroundColor: '#F2F3F5' }
        }}
      >
        <AppBar position="sticky" sx={{ backgroundColor: '#FEE500', color: '#1A1A1A' }}>
          <Toolbar>
            <IconButton 
              onClick={() => setIsCreateDialogOpen(false)}
              sx={{ color: '#1A1A1A', mr: 2 }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" sx={{ flex: 1 }}>
              새 토론 만들기
            </Typography>
            <Button 
              onClick={handleCreateDiscussion}
              variant="contained"
              sx={{
                backgroundColor: '#1A1A1A',
                color: '#FEE500',
                '&:hover': { backgroundColor: '#333' }
              }}
            >
              만들기
            </Button>
          </Toolbar>
        </AppBar>
        
        <Box sx={{ p: 2 }}>
          <TextField
            fullWidth
            label="토론 제목"
            value={newDiscussion.title}
            onChange={(e) => setNewDiscussion({...newDiscussion, title: e.target.value})}
            sx={{ mb: 2 }}
            InputProps={{ sx: { backgroundColor: 'white' } }}
          />
          
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>카테고리</InputLabel>
                <Select
                  value={newDiscussion.category}
                  onChange={(e) => setNewDiscussion({...newDiscussion, category: e.target.value})}
                  sx={{ backgroundColor: 'white' }}
                >
                  {categories.map(cat => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>우선순위</InputLabel>
                <Select
                  value={newDiscussion.priority}
                  onChange={(e) => setNewDiscussion({...newDiscussion, priority: e.target.value})}
                  sx={{ backgroundColor: 'white' }}
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
            backgroundColor: '#FEE500',
            color: '#1A1A1A',
            '&:hover': { backgroundColor: '#FFD700' }
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

export default KakaoDiscussion; 