import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Reply as ReplyIcon
} from '@mui/icons-material';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const Discussions = () => {
  const [discussions, setDiscussions] = useState([]);
  const [sites, setSites] = useState([]);
  const [open, setOpen] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [editingDiscussion, setEditingDiscussion] = useState(null);
  const [selectedDiscussion, setSelectedDiscussion] = useState(null);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    siteId: '',
    category: '일반',
    content: '',
    author: '',
    date: '',
    status: '진행중',
    priority: '보통',
    tags: ''
  });
  const [replyData, setReplyData] = useState({
    content: '',
    author: '',
    date: ''
  });
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchSites();
  }, []);

  useEffect(() => {
    if (!selectedSiteId) return;
    // 현장별 discussions 실시간 연동
    const q = query(
      collection(db, 'discussions'),
      where('siteId', '==', selectedSiteId),
      orderBy('date', 'desc')
    );
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const discussionList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDiscussions(discussionList);
    });
    return () => unsubscribe();
  }, [selectedSiteId]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [discussions]);

  const fetchDiscussions = async () => {
    try {
      const q = query(
        collection(db, 'discussions'),
        orderBy('date', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const discussionList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDiscussions(discussionList);
    } catch (error) {
      console.error('Error fetching discussions:', error);
    }
  };

  const fetchSites = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'sites'));
      const siteList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSites(siteList);
    } catch (error) {
      console.error('Error fetching sites:', error);
    }
  };

  const handleOpen = (discussion = null) => {
    if (discussion) {
      setEditingDiscussion(discussion);
      setFormData(discussion);
    } else {
      setEditingDiscussion(null);
      setFormData({
        title: '',
        siteId: '',
        category: '일반',
        content: '',
        author: '',
        date: '',
        status: '진행중',
        priority: '보통',
        tags: ''
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingDiscussion(null);
  };

  const handleReplyOpen = (discussion) => {
    setSelectedDiscussion(discussion);
    setReplyData({
      content: '',
      author: '',
      date: new Date().toISOString()
    });
    setReplyOpen(true);
  };

  const handleReplyClose = () => {
    setReplyOpen(false);
    setSelectedDiscussion(null);
  };

  const handleSiteChange = (e) => {
    setSelectedSiteId(e.target.value);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSiteId || !formData.content.trim()) return;
    try {
      await addDoc(collection(db, 'discussions'), {
        ...formData,
        siteId: selectedSiteId,
        date: new Date().toISOString(),
        author: formData.author || '익명',
      });
      setFormData({
        title: '',
        siteId: '',
        category: '일반',
        content: '',
        author: '',
        date: '',
        status: '진행중',
        priority: '보통',
        tags: ''
      });
      setOpen(false);
    } catch (error) {
      console.error('Error saving discussion:', error);
    }
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyData.content.trim()) return;
    try {
      const replies = selectedDiscussion.replies || [];
      const newReply = {
        ...replyData,
        date: new Date().toISOString(),
        author: replyData.author || '익명',
      };
      await updateDoc(doc(db, 'discussions', selectedDiscussion.id), {
        replies: [...replies, newReply]
      });
      handleReplyClose();
    } catch (error) {
      console.error('Error saving reply:', error);
    }
  };

  const handleDelete = async (discussionId) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'discussions', discussionId));
        fetchDiscussions();
      } catch (error) {
        console.error('Error deleting discussion:', error);
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case '완료':
        return 'success';
      case '진행중':
        return 'primary';
      case '보류':
        return 'warning';
      case '취소':
        return 'error';
      default:
        return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case '높음':
        return 'error';
      case '보통':
        return 'warning';
      case '낮음':
        return 'success';
      default:
        return 'default';
    }
  };

  const getSiteName = (siteId) => {
    const site = sites.find(s => s.id === siteId);
    return site ? site.name : '미지정';
  };

  return (
    <Box sx={{ p: 3, position: 'relative', minHeight: 600 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">토론/의견</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          새 토론
        </Button>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ mr: 2 }}>현장 선택</Typography>
        <select value={selectedSiteId} onChange={handleSiteChange} style={{ fontSize: 16, padding: '4px 8px' }}>
          <option value="">현장 선택</option>
          {sites.map(site => (
            <option key={site.id} value={site.id}>{site.name}</option>
          ))}
        </select>
      </Box>

      <Grid container spacing={3} sx={{ pb: 20 }}>
        {discussions.map((discussion, idx) => (
          <Grid item xs={12} key={discussion.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Typography variant="h6" gutterBottom>
                    {discussion.title}
                  </Typography>
                  <Box>
                    <IconButton size="small" onClick={() => handleOpen(discussion)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(discussion.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
                <Typography color="textSecondary" gutterBottom>
                  현장: {getSiteName(discussion.siteId)}
                </Typography>
                <Box sx={{ mb: 1 }}>
                  <Chip
                    label={discussion.status}
                    color={getStatusColor(discussion.status)}
                    size="small"
                    sx={{ mr: 1 }}
                  />
                  <Chip
                    label={discussion.priority}
                    color={getPriorityColor(discussion.priority)}
                    size="small"
                    sx={{ mr: 1 }}
                  />
                  <Chip
                    label={discussion.category}
                    size="small"
                  />
                </Box>
                <Typography variant="body2" color="textSecondary">
                  작성자: {discussion.author}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  작성일: {discussion.date}
                </Typography>
                <Typography variant="body1" sx={{ mt: 2, mb: 2 }}>
                  {discussion.content}
                </Typography>
                {discussion.tags && (
                  <Box sx={{ mb: 2 }}>
                    {discussion.tags.split(',').map((tag, index) => (
                      <Chip
                        key={index}
                        label={tag.trim()}
                        size="small"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                  </Box>
                )}
                <Button
                  startIcon={<ReplyIcon />}
                  onClick={() => handleReplyOpen(discussion)}
                  sx={{ mb: 2 }}
                >
                  답글 작성
                </Button>
                {discussion.replies && discussion.replies.length > 0 && (
                  <List>
                    {discussion.replies.map((reply, index) => (
                      <React.Fragment key={index}>
                        <ListItem alignItems="flex-start">
                          <ListItemAvatar>
                            <Avatar>{reply.author[0]}</Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={reply.author}
                            secondary={
                              <>
                                <Typography
                                  component="span"
                                  variant="body2"
                                  color="text.primary"
                                >
                                  {reply.date}
                                </Typography>
                                <Typography variant="body2">
                                  {reply.content}
                                </Typography>
                              </>
                            }
                          />
                        </ListItem>
                        {index < discussion.replies.length - 1 && <Divider variant="inset" component="li" />}
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
            {idx === discussions.length - 1 && <div ref={messagesEndRef} />}
          </Grid>
        ))}
      </Grid>

      <Box sx={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 40,
        background: 'rgba(24,26,32,0.95)',
        zIndex: 1200,
        p: 2,
        display: 'flex',
        gap: 1,
        alignItems: 'center',
        boxShadow: 3,
        maxWidth: 600,
        margin: '0 auto',
        borderRadius: 2
      }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', width: '100%', gap: 8 }}>
          <input
            name="author"
            value={formData.author}
            onChange={handleInputChange}
            placeholder="작성자"
            style={{ width: 100, padding: 6, borderRadius: 4, border: '1px solid #444' }}
            required
          />
          <input
            name="content"
            value={formData.content}
            onChange={handleInputChange}
            placeholder="메시지를 입력하세요"
            style={{ flex: 1, padding: 6, borderRadius: 4, border: '1px solid #444' }}
            required
          />
          <Button type="submit" variant="contained">전송</Button>
        </form>
      </Box>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingDiscussion ? '토론 수정' : '새 토론 작성'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="제목"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              margin="normal"
              required
            />
            <FormControl fullWidth margin="normal" required>
              <InputLabel>현장</InputLabel>
              <Select
                value={formData.siteId}
                onChange={(e) => setFormData({ ...formData, siteId: e.target.value })}
                label="현장"
              >
                {sites.map((site) => (
                  <MenuItem key={site.id} value={site.id}>
                    {site.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal" required>
              <InputLabel>분류</InputLabel>
              <Select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                label="분류"
              >
                <MenuItem value="일반">일반</MenuItem>
                <MenuItem value="기술">기술</MenuItem>
                <MenuItem value="안전">안전</MenuItem>
                <MenuItem value="일정">일정</MenuItem>
                <MenuItem value="기타">기타</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal" required>
              <InputLabel>우선순위</InputLabel>
              <Select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                label="우선순위"
              >
                <MenuItem value="높음">높음</MenuItem>
                <MenuItem value="보통">보통</MenuItem>
                <MenuItem value="낮음">낮음</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal" required>
              <InputLabel>상태</InputLabel>
              <Select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                label="상태"
              >
                <MenuItem value="진행중">진행중</MenuItem>
                <MenuItem value="완료">완료</MenuItem>
                <MenuItem value="보류">보류</MenuItem>
                <MenuItem value="취소">취소</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="작성자"
              value={formData.author}
              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="작성일"
              type="datetime-local"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              margin="normal"
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="태그"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              margin="normal"
              placeholder="쉼표로 구분하여 입력"
            />
            <TextField
              fullWidth
              label="내용"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              margin="normal"
              multiline
              rows={4}
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>취소</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingDiscussion ? '수정' : '작성'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={replyOpen} onClose={handleReplyClose} maxWidth="sm" fullWidth>
        <DialogTitle>답글 작성</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleReplySubmit} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="작성자"
              value={replyData.author}
              onChange={(e) => setReplyData({ ...replyData, author: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="내용"
              value={replyData.content}
              onChange={(e) => setReplyData({ ...replyData, content: e.target.value })}
              margin="normal"
              multiline
              rows={4}
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleReplyClose}>취소</Button>
          <Button onClick={handleReplySubmit} variant="contained">
            작성
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Discussions; 