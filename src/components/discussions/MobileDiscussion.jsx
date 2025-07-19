import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Chip,
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
  Alert,
  Snackbar,
  Fab,
  SwipeableDrawer,
  AppBar,
  Toolbar,
  InputAdornment,
  Divider
} from '@mui/material';
import {
  Send as SendIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Reply as ReplyIcon,
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  ArrowBack as ArrowBackIcon,
  KeyboardArrowUp as ArrowUpIcon,
  AttachFile as AttachFileIcon,
  Close as CloseIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import FileUpload from './FileUpload';

const MobileDiscussion = () => {
  // 상태 관리
  const [discussions, setDiscussions] = useState([]);
  const [newDiscussion, setNewDiscussion] = useState({
    title: '',
    content: '',
    category: '',
    priority: 'normal',
    files: []
  });
  const [replies, setReplies] = useState({});
  const [newReply, setNewReply] = useState('');
  const [selectedDiscussion, setSelectedDiscussion] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isReplyDialogOpen, setIsReplyDialogOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('latest');
  const [searchTerm, setSearchTerm] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // 샘플 데이터 (기존과 동일)
  const sampleDiscussions = [
    {
      id: 1,
      title: '현장 안전 관리 개선 방안',
      content: '현재 현장의 안전 관리 시스템을 개선하기 위한 의견을 수렴하고자 합니다. 특히 개인보호구 착용률 향상 방안과 안전교육 강화 방안에 대해 논의해주세요.',
      author: '김현장',
      authorAvatar: '김',
      category: '안전',
      priority: 'high',
      createdAt: '2024-01-15T10:30:00',
      likes: 12,
      dislikes: 2,
      replies: 8,
      status: 'active',
      tags: ['안전관리', '개인보호구', '교육']
    },
    {
      id: 2,
      title: '공사 일정 조정 건의',
      content: '다음 주 예정된 콘크리트 타설 작업 일정을 기상 상황을 고려하여 조정하는 것이 어떨까요? 장마철을 대비한 일정 재검토가 필요합니다.',
      author: '박감독',
      authorAvatar: '박',
      category: '일정',
      priority: 'medium',
      createdAt: '2024-01-14T15:20:00',
      likes: 8,
      dislikes: 1,
      replies: 5,
      status: 'active',
      tags: ['일정관리', '기상', '콘크리트']
    },
    {
      id: 3,
      title: '자재 관리 시스템 개선',
      content: '현재 자재 관리 시스템에서 재고 확인과 발주 프로세스를 개선할 수 있는 방안을 제안합니다. 디지털화를 통한 효율성 향상을 목표로 합니다.',
      author: '이자재',
      authorAvatar: '이',
      category: '자재',
      priority: 'normal',
      createdAt: '2024-01-13T09:15:00',
      likes: 15,
      dislikes: 0,
      replies: 12,
      status: 'active',
      tags: ['자재관리', '디지털화', '효율성']
    }
  ];

  const sampleReplies = {
    1: [
      {
        id: 1,
        content: '개인보호구 착용률 향상을 위해서는 매일 아침 점검 시간을 확보하는 것이 좋겠습니다.',
        author: '최안전',
        authorAvatar: '최',
        createdAt: '2024-01-15T11:00:00',
        likes: 5,
        dislikes: 0
      },
      {
        id: 2,
        content: '안전교육은 실습 위주로 진행하고, 정기적인 평가를 통해 효과를 측정해야 합니다.',
        author: '정교육',
        authorAvatar: '정',
        createdAt: '2024-01-15T11:30:00',
        likes: 7,
        dislikes: 1
      }
    ],
    2: [
      {
        id: 1,
        content: '기상청 예보를 참고하여 일정을 조정하는 것이 현명한 판단입니다.',
        author: '한기상',
        authorAvatar: '한',
        createdAt: '2024-01-14T16:00:00',
        likes: 4,
        dislikes: 0
      }
    ],
    3: [
      {
        id: 1,
        content: 'QR코드를 활용한 자재 추적 시스템을 도입하면 효율성이 크게 향상될 것 같습니다.',
        author: '디지털',
        authorAvatar: '디',
        createdAt: '2024-01-13T10:00:00',
        likes: 8,
        dislikes: 0
      }
    ]
  };

  useEffect(() => {
    setDiscussions(sampleDiscussions);
    setReplies(sampleReplies);
  }, []);

  // 스크롤 이벤트 리스너
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.pageYOffset > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 카테고리 옵션
  const categories = ['전체', '안전', '일정', '자재', '품질', '환경', '기타'];
  const priorities = [
    { value: 'low', label: '낮음', color: 'success' },
    { value: 'normal', label: '보통', color: 'primary' },
    { value: 'high', label: '높음', color: 'warning' },
    { value: 'urgent', label: '긴급', color: 'error' }
  ];

  // 유틸리티 함수들
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return '오늘';
    } else if (diffDays === 2) {
      return '어제';
    } else if (diffDays <= 7) {
      return `${diffDays - 1}일 전`;
    } else {
      return date.toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const getPriorityColor = (priority) => {
    const priorityObj = priorities.find(p => p.value === priority);
    return priorityObj ? priorityObj.color : 'primary';
  };

  const getPriorityLabel = (priority) => {
    const priorityObj = priorities.find(p => p.value === priority);
    return priorityObj ? priorityObj.label : '보통';
  };

  // 이벤트 핸들러들
  const handleNewDiscussion = () => {
    if (!newDiscussion.title.trim() || !newDiscussion.content.trim()) {
      setSnackbar({
        open: true,
        message: '제목과 내용을 입력해주세요.',
        severity: 'warning'
      });
      return;
    }

    const discussion = {
      id: Date.now(),
      ...newDiscussion,
      author: '현재사용자',
      authorAvatar: '현',
      createdAt: new Date().toISOString(),
      likes: 0,
      dislikes: 0,
      replies: 0,
      status: 'active',
      tags: []
    };

    setDiscussions([discussion, ...discussions]);
    setNewDiscussion({
      title: '',
      content: '',
      category: '',
      priority: 'normal',
      files: []
    });
    setIsDialogOpen(false);
    setSnackbar({
      open: true,
      message: '새로운 토론이 등록되었습니다.',
      severity: 'success'
    });
  };

  const handleReply = (discussionId) => {
    if (!newReply.trim()) {
      setSnackbar({
        open: true,
        message: '댓글 내용을 입력해주세요.',
        severity: 'warning'
      });
      return;
    }

    const reply = {
      id: Date.now(),
      content: newReply,
      author: '현재사용자',
      authorAvatar: '현',
      createdAt: new Date().toISOString(),
      likes: 0,
      dislikes: 0
    };

    const updatedReplies = {
      ...replies,
      [discussionId]: [...(replies[discussionId] || []), reply]
    };

    setReplies(updatedReplies);
    setNewReply('');
    setIsReplyDialogOpen(false);

    setDiscussions(discussions.map(d => 
      d.id === discussionId 
        ? { ...d, replies: d.replies + 1 }
        : d
    ));

    setSnackbar({
      open: true,
      message: '댓글이 등록되었습니다.',
      severity: 'success'
    });
  };

  const handleLike = (discussionId, type) => {
    setDiscussions(discussions.map(d => {
      if (d.id === discussionId) {
        return {
          ...d,
          likes: type === 'like' ? d.likes + 1 : d.likes,
          dislikes: type === 'dislike' ? d.dislikes + 1 : d.dislikes
        };
      }
      return d;
    }));
  };

  const handleReplyLike = (discussionId, replyId, type) => {
    const updatedReplies = {
      ...replies,
      [discussionId]: replies[discussionId].map(r => {
        if (r.id === replyId) {
          return {
            ...r,
            likes: type === 'like' ? r.likes + 1 : r.likes,
            dislikes: type === 'dislike' ? r.dislikes + 1 : r.dislikes
          };
        }
        return r;
      })
    };
    setReplies(updatedReplies);
  };

  const handleFilesChange = (files) => {
    setNewDiscussion({ ...newDiscussion, files });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 필터링 및 정렬
  const filteredDiscussions = discussions
    .filter(d => {
      if (filter !== 'all' && d.category !== filter) return false;
      if (searchTerm && !d.title.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !d.content.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'latest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'mostLiked':
          return b.likes - a.likes;
        case 'mostReplied':
          return b.replies - a.replies;
        default:
          return 0;
      }
    });

  return (
    <Box sx={{ 
      backgroundColor: '#181a20', 
      minHeight: '100vh',
      color: 'white',
      pb: 8 // FAB을 위한 여백
    }}>
      {/* 모바일 헤더 */}
      <AppBar position="sticky" sx={{ backgroundColor: '#2d3748' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ color: '#90caf9', flex: 1 }}>
            💬 토론의견
          </Typography>
          <IconButton 
            onClick={() => setFilterDrawerOpen(true)}
            sx={{ color: '#90caf9' }}
          >
            <FilterIcon />
          </IconButton>
          <IconButton 
            onClick={() => setIsDialogOpen(true)}
            sx={{ color: '#90caf9' }}
          >
            <AddIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* 검색바 */}
      <Box sx={{ p: 2, backgroundColor: '#2d3748' }}>
        <TextField
          fullWidth
          placeholder="토론 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ color: '#90caf9', mr: 1 }} />,
            sx: { color: 'white' }
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              '& fieldset': { borderColor: '#4a5568' },
              '&:hover fieldset': { borderColor: '#90caf9' },
              '&.Mui-focused fieldset': { borderColor: '#90caf9' }
            }
          }}
        />
      </Box>

      {/* 토론 목록 */}
      <Box sx={{ p: 2 }}>
        {filteredDiscussions.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', backgroundColor: '#2d3748' }}>
            <Typography variant="h6" sx={{ color: '#90caf9', mb: 1 }}>
              토론이 없습니다
            </Typography>
            <Typography variant="body2" sx={{ color: '#ccc' }}>
              첫 번째 토론을 시작해보세요!
            </Typography>
          </Paper>
        ) : (
          filteredDiscussions.map((discussion) => (
            <Card key={discussion.id} sx={{ 
              mb: 2, 
              backgroundColor: '#2d3748',
              border: '1px solid #4a5568',
              borderRadius: 2
            }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ color: '#90caf9', mb: 1, fontSize: '1rem' }}>
                  {discussion.title}
                </Typography>
                <Typography variant="body2" sx={{ color: '#ccc', mb: 2, fontSize: '0.875rem' }}>
                  {discussion.content.length > 100 
                    ? `${discussion.content.substring(0, 100)}...` 
                    : discussion.content
                  }
                </Typography>
                
                {/* 태그 */}
                <Box sx={{ mb: 2, flexWrap: 'wrap', display: 'flex' }}>
                  {discussion.tags.slice(0, 2).map((tag, index) => (
                    <Chip
                      key={index}
                      label={tag}
                      size="small"
                      sx={{ 
                        mr: 1, 
                        mb: 1,
                        backgroundColor: '#4a5568',
                        color: '#90caf9',
                        fontSize: '0.75rem'
                      }}
                    />
                  ))}
                  {discussion.tags.length > 2 && (
                    <Chip
                      label={`+${discussion.tags.length - 2}`}
                      size="small"
                      sx={{ 
                        backgroundColor: '#4a5568',
                        color: '#90caf9',
                        fontSize: '0.75rem'
                      }}
                    />
                  )}
                </Box>

                {/* 메타 정보 */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  <Avatar sx={{ width: 24, height: 24, fontSize: '12px' }}>
                    {discussion.authorAvatar}
                  </Avatar>
                  <Typography variant="body2" sx={{ color: '#ccc', fontSize: '0.75rem' }}>
                    {discussion.author}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#888', fontSize: '0.75rem' }}>
                    {formatDate(discussion.createdAt)}
                  </Typography>
                  <Chip
                    label={discussion.category}
                    size="small"
                    sx={{ backgroundColor: '#4a5568', color: '#90caf9', fontSize: '0.75rem' }}
                  />
                  <Chip
                    label={getPriorityLabel(discussion.priority)}
                    size="small"
                    color={getPriorityColor(discussion.priority)}
                    sx={{ fontSize: '0.75rem' }}
                  />
                </Box>

                {/* 액션 버튼 */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Button
                    size="small"
                    startIcon={<ThumbUpIcon />}
                    onClick={() => handleLike(discussion.id, 'like')}
                    sx={{ color: '#90caf9', minWidth: 'auto', fontSize: '0.75rem' }}
                  >
                    {discussion.likes}
                  </Button>
                  <Button
                    size="small"
                    startIcon={<ThumbDownIcon />}
                    onClick={() => handleLike(discussion.id, 'dislike')}
                    sx={{ color: '#90caf9', minWidth: 'auto', fontSize: '0.75rem' }}
                  >
                    {discussion.dislikes}
                  </Button>
                  <Button
                    size="small"
                    startIcon={<ReplyIcon />}
                    onClick={() => {
                      setSelectedDiscussion(discussion);
                      setIsReplyDialogOpen(true);
                    }}
                    sx={{ color: '#90caf9', minWidth: 'auto', fontSize: '0.75rem' }}
                  >
                    {discussion.replies}
                  </Button>
                </Box>

                {/* 댓글 미리보기 */}
                {replies[discussion.id] && replies[discussion.id].length > 0 && (
                  <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #4a5568' }}>
                    <Typography variant="body2" sx={{ color: '#90caf9', mb: 1, fontSize: '0.75rem' }}>
                      최근 댓글
                    </Typography>
                    {replies[discussion.id].slice(0, 1).map((reply) => (
                      <Box key={reply.id} sx={{ pl: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 16, height: 16, fontSize: '8px' }}>
                            {reply.authorAvatar}
                          </Avatar>
                          <Typography variant="body2" sx={{ color: '#ccc', fontWeight: 'bold', fontSize: '0.75rem' }}>
                            {reply.author}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#888', fontSize: '0.625rem' }}>
                            {formatDate(reply.createdAt)}
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ color: '#ccc', ml: 2, fontSize: '0.75rem' }}>
                          {reply.content.length > 50 
                            ? `${reply.content.substring(0, 50)}...` 
                            : reply.content
                          }
                        </Typography>
                      </Box>
                    ))}
                    {replies[discussion.id].length > 1 && (
                      <Typography variant="body2" sx={{ color: '#90caf9', ml: 2, cursor: 'pointer', fontSize: '0.75rem' }}>
                        댓글 {replies[discussion.id].length - 1}개 더 보기
                      </Typography>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </Box>

      {/* 필터/정렬 드로어 */}
      <SwipeableDrawer
        anchor="right"
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        PaperProps={{
          sx: { backgroundColor: '#2d3748', width: '80%' }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ color: '#90caf9', mb: 2 }}>
            필터 및 정렬
          </Typography>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel sx={{ color: '#90caf9' }}>카테고리</InputLabel>
            <Select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              sx={{ color: 'white' }}
            >
              {categories.map(cat => (
                <MenuItem key={cat} value={cat === '전체' ? 'all' : cat}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel sx={{ color: '#90caf9' }}>정렬</InputLabel>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              sx={{ color: 'white' }}
            >
              <MenuItem value="latest">최신순</MenuItem>
              <MenuItem value="oldest">오래된순</MenuItem>
              <MenuItem value="mostLiked">좋아요순</MenuItem>
              <MenuItem value="mostReplied">댓글순</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </SwipeableDrawer>

      {/* 새 토론 다이얼로그 */}
      <Dialog 
        open={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)}
        fullScreen
        PaperProps={{
          sx: { backgroundColor: '#2d3748' }
        }}
      >
        <AppBar position="sticky" sx={{ backgroundColor: '#2d3748' }}>
          <Toolbar>
            <IconButton 
              onClick={() => setIsDialogOpen(false)}
              sx={{ color: '#90caf9', mr: 2 }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" sx={{ color: '#90caf9', flex: 1 }}>
              새 토론 작성
            </Typography>
            <Button 
              onClick={handleNewDiscussion}
              variant="contained"
              sx={{
                backgroundColor: '#90caf9',
                color: '#1a202c',
                '&:hover': { backgroundColor: '#64b5f6' }
              }}
            >
              등록
            </Button>
          </Toolbar>
        </AppBar>
        
        <Box sx={{ p: 2 }}>
          <TextField
            fullWidth
            label="제목"
            value={newDiscussion.title}
            onChange={(e) => setNewDiscussion({...newDiscussion, title: e.target.value})}
            sx={{ mb: 2 }}
            InputProps={{ sx: { color: 'white' } }}
            InputLabelProps={{ sx: { color: '#90caf9' } }}
          />
          <TextField
            fullWidth
            label="내용"
            multiline
            rows={6}
            value={newDiscussion.content}
            onChange={(e) => setNewDiscussion({...newDiscussion, content: e.target.value})}
            sx={{ mb: 2 }}
            InputProps={{ sx: { color: 'white' } }}
            InputLabelProps={{ sx: { color: '#90caf9' } }}
          />
          
          {/* 파일 업로드 */}
          <FileUpload onFilesChange={handleFilesChange} maxFiles={3} maxFileSize={5} />
          
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: '#90caf9' }}>카테고리</InputLabel>
                <Select
                  value={newDiscussion.category}
                  onChange={(e) => setNewDiscussion({...newDiscussion, category: e.target.value})}
                  sx={{ color: 'white' }}
                >
                  {categories.slice(1).map(cat => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: '#90caf9' }}>우선순위</InputLabel>
                <Select
                  value={newDiscussion.priority}
                  onChange={(e) => setNewDiscussion({...newDiscussion, priority: e.target.value})}
                  sx={{ color: 'white' }}
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

      {/* 댓글 다이얼로그 */}
      <Dialog 
        open={isReplyDialogOpen} 
        onClose={() => setIsReplyDialogOpen(false)}
        fullScreen
        PaperProps={{
          sx: { backgroundColor: '#2d3748' }
        }}
      >
        <AppBar position="sticky" sx={{ backgroundColor: '#2d3748' }}>
          <Toolbar>
            <IconButton 
              onClick={() => setIsReplyDialogOpen(false)}
              sx={{ color: '#90caf9', mr: 2 }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" sx={{ color: '#90caf9', flex: 1 }}>
              댓글 작성
            </Typography>
            <Button 
              onClick={() => handleReply(selectedDiscussion?.id)}
              variant="contained"
              sx={{
                backgroundColor: '#90caf9',
                color: '#1a202c',
                '&:hover': { backgroundColor: '#64b5f6' }
              }}
            >
              등록
            </Button>
          </Toolbar>
        </AppBar>
        
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ color: '#90caf9', mb: 2 }}>
            {selectedDiscussion?.title}
          </Typography>
          
          <TextField
            fullWidth
            label="댓글 내용"
            multiline
            rows={4}
            value={newReply}
            onChange={(e) => setNewReply(e.target.value)}
            sx={{ mb: 3 }}
            InputProps={{ sx: { color: 'white' } }}
            InputLabelProps={{ sx: { color: '#90caf9' } }}
          />
          
          {/* 기존 댓글 목록 */}
          {selectedDiscussion && replies[selectedDiscussion.id] && (
            <Box>
              <Typography variant="h6" sx={{ color: '#90caf9', mb: 2 }}>
                기존 댓글 ({replies[selectedDiscussion.id].length}개)
              </Typography>
              <List>
                {replies[selectedDiscussion.id].map((reply) => (
                  <ListItem key={reply.id} sx={{ px: 0, py: 1 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ width: 32, height: 32 }}>
                        {reply.authorAvatar}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ color: '#90caf9', fontWeight: 'bold' }}>
                            {reply.author}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#888', fontSize: '12px' }}>
                            {formatDate(reply.createdAt)}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" sx={{ color: '#ccc', mb: 1 }}>
                            {reply.content}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              size="small"
                              startIcon={<ThumbUpIcon />}
                              onClick={() => handleReplyLike(selectedDiscussion.id, reply.id, 'like')}
                              sx={{ color: '#90caf9', minWidth: 'auto', fontSize: '0.75rem' }}
                            >
                              {reply.likes}
                            </Button>
                            <Button
                              size="small"
                              startIcon={<ThumbDownIcon />}
                              onClick={() => handleReplyLike(selectedDiscussion.id, reply.id, 'dislike')}
                              sx={{ color: '#90caf9', minWidth: 'auto', fontSize: '0.75rem' }}
                            >
                              {reply.dislikes}
                            </Button>
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
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
            backgroundColor: '#90caf9',
            color: '#1a202c',
            '&:hover': { backgroundColor: '#64b5f6' }
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

export default MobileDiscussion; 