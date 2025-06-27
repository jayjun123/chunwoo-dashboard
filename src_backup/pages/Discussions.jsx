import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  Chip,
  useTheme,
  useMediaQuery,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Drawer,
  Tabs,
  Tab,
  FormControlLabel,
  Switch
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ThumbUp as ThumbUpIcon,
  Comment as CommentIcon,
  Photo as PhotoIcon,
  AttachFile as AttachFileIcon,
  Send as SendIcon,
  Close as CloseIcon,
  Image as ImageIcon,
  Description as DescriptionIcon,
  Search as SearchIcon,
  VisibilityOff as VisibilityOffIcon,
  Visibility as VisibilityIcon,
  Bookmark as BookmarkIcon,
  BookmarkBorder as BookmarkBorderIcon,
  Notifications as NotificationsIcon,
  NotificationsOff as NotificationsOffIcon,
  Reply as ReplyIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import DiscussionRooms from '../components/discussions/DiscussionRooms';

const Discussions = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [discussions, setDiscussions] = useState([]);
  const [sites, setSites] = useState([]);
  const [siteSearch, setSiteSearch] = useState('');
  const [selectedSite, setSelectedSite] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const messagesEndRef = useRef(null);
  const [fileInputRef, setFileInputRef] = useRef(null);
  const [roomDialogOpen, setRoomDialogOpen] = useState(false);
  const [roomSiteSearch, setRoomSiteSearch] = useState('');
  const [roomSite, setRoomSite] = useState(null);
  const [roomPassword, setRoomPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [compareNotes, setCompareNotes] = useState({});
  const [activeTab, setActiveTab] = useState(0);
  const currentUserId = 'my-user-id'; // 실제 로그인 사용자 ID로 대체 필요
  const [pendingMessages, setPendingMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOptions, setFilterOptions] = useState({
    dateRange: 'all', // all, today, week, month
    author: 'all',
    hasAttachment: false
  });
  const [sortOrder, setSortOrder] = useState('desc'); // asc, desc
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [bookmarkedMessages, setBookmarkedMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isNotificationEnabled, setIsNotificationEnabled] = useState(true);
  const [replyTo, setReplyTo] = useState(null);

  useEffect(() => {
    fetchDiscussions();
    fetchSites();
  }, []);

  useEffect(() => {
    if (!selectedSite) {
      setMessages([]);
      setPendingMessages([]);
      return;
    }
    const q = query(
      collection(db, 'discussions'),
      where('siteId', '==', selectedSite.id),
      orderBy('timestamp', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const firestoreMsgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // pendingMessages 중 Firestore에 이미 반영된 메시지(내용, 첨부, userId, content 등으로 판별) 제거
      setPendingMessages((prev) => prev.filter(pmsg => !firestoreMsgs.some(fmsg =>
        fmsg.userId === pmsg.userId &&
        fmsg.content === pmsg.content &&
        (!fmsg.attachments || JSON.stringify(fmsg.attachments) === JSON.stringify(pmsg.attachments))
      )));
      setMessages(firestoreMsgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsubscribe();
  }, [selectedSite]);

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

  const handleSend = async () => {
    if (!message.trim() && attachments.length === 0) return;
    let uploadedFiles = [];
    if (attachments.length > 0) {
      uploadedFiles = await Promise.all(
        attachments.map(async (file) => {
          const storageRef = ref(storage, `discussions/${selectedSite.id}/${Date.now()}_${file.name}`);
          await uploadBytes(storageRef, file);
          return await getDownloadURL(storageRef);
        })
      );
    }

    // optimistic update: 임시 메시지 추가
    const tempId = 'temp-' + Date.now();
    const tempMsg = {
      id: tempId,
      siteId: selectedSite.id,
      content: message,
      attachments: uploadedFiles,
      timestamp: { toDate: () => new Date() },
      userName: '사용자',
      userId: currentUserId,
      _pending: true,
      parentId: replyTo?.id || null,
      replyTo: replyTo ? {
        id: replyTo.id,
        userName: replyTo.userName,
        content: replyTo.content
      } : null
    };
    setPendingMessages((prev) => [...prev, tempMsg]);
    setMessage('');
    setAttachments([]);
    setReplyTo(null);

    await addDoc(collection(db, 'discussions'), {
      siteId: selectedSite.id,
      content: message,
      attachments: uploadedFiles,
      timestamp: serverTimestamp(),
      userName: '사용자',
      userId: currentUserId,
      parentId: replyTo?.id || null,
      replyTo: replyTo ? {
        id: replyTo.id,
        userName: replyTo.userName,
        content: replyTo.content
      } : null
    });
  };

  const handleEdit = async (id) => {
    await updateDoc(doc(db, 'discussions', id), { content: editContent });
    setEditingId(null);
    setEditContent('');
  };

  const handleDelete = async (id) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      await deleteDoc(doc(db, 'discussions', id));
    }
  };

  const handleFileSelect = (e) => {
    setAttachments(Array.from(e.target.files));
  };

  const handleCompareNoteChange = (siteId, value) => {
    setCompareNotes(prev => ({ ...prev, [siteId]: value }));
  };

  const handleCreateRoom = async () => {
    if (!roomSite) return;
    await addDoc(collection(db, 'discussions'), {
      siteId: roomSite.id,
      content: `대화방이 생성되었습니다${roomPassword ? ' (비밀번호 설정됨)' : ''}`,
      password: roomPassword,
      timestamp: serverTimestamp(),
      userName: '시스템',
    });
    setRoomDialogOpen(false);
    setRoomSite(null);
    setRoomPassword('');
    setRoomSiteSearch('');
  };

  const roomSiteOptions = sites.filter(site => site.name.toLowerCase().includes(roomSiteSearch.toLowerCase()));

  const getMessageCount = (siteId) => discussions.filter(m => m.siteId === siteId).length;

  const filteredSites = sites.filter(site => site.name.toLowerCase().includes(siteSearch.toLowerCase()));

  const filteredMessages = React.useMemo(() => {
    let result = [...messages, ...pendingMessages.filter(p => p.siteId === selectedSite?.id)]
      .filter(m => m.siteId === selectedSite?.id);

    // 검색어 필터링
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(msg => 
        msg.content.toLowerCase().includes(query) ||
        msg.userName.toLowerCase().includes(query)
      );
    }

    // 날짜 필터링
    if (filterOptions.dateRange !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      result = result.filter(msg => {
        const msgDate = msg.timestamp?.toDate?.() || new Date(msg.timestamp);
        switch (filterOptions.dateRange) {
          case 'today':
            return msgDate >= today;
          case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return msgDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return msgDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    // 작성자 필터링
    if (filterOptions.author !== 'all') {
      result = result.filter(msg => msg.userId === filterOptions.author);
    }

    // 첨부파일 필터링
    if (filterOptions.hasAttachment) {
      result = result.filter(msg => msg.attachments?.length > 0);
    }

    // 스레드 구조화
    const threadMap = new Map();
    const rootMessages = [];

    // 먼저 모든 메시지를 Map에 추가
    result.forEach(msg => {
      threadMap.set(msg.id, { ...msg, replies: [] });
    });

    // 스레드 구조화
    result.forEach(msg => {
      if (msg.parentId) {
        const parent = threadMap.get(msg.parentId);
        if (parent) {
          parent.replies.push(threadMap.get(msg.id));
        }
      } else {
        rootMessages.push(threadMap.get(msg.id));
      }
    });

    // 정렬
    const sortMessages = (msgs) => {
      msgs.sort((a, b) => {
        const dateA = a.timestamp?.toDate?.() || new Date(a.timestamp);
        const dateB = b.timestamp?.toDate?.() || new Date(b.timestamp);
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      });
      msgs.forEach(msg => {
        if (msg.replies.length > 0) {
          sortMessages(msg.replies);
        }
      });
    };

    sortMessages(rootMessages);
    return rootMessages;
  }, [messages, pendingMessages, selectedSite, searchQuery, filterOptions, sortOrder]);

  // 북마크 토글 핸들러
  const handleBookmarkToggle = async (messageId) => {
    if (bookmarkedMessages.includes(messageId)) {
      setBookmarkedMessages(prev => prev.filter(id => id !== messageId));
    } else {
      setBookmarkedMessages(prev => [...prev, messageId]);
    }
  };

  // 알림 토글 핸들러
  const handleNotificationToggle = () => {
    setIsNotificationEnabled(prev => !prev);
    if (!isNotificationEnabled) {
      // 알림 권한 요청
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          // 알림 설정 저장
          localStorage.setItem('notificationsEnabled', 'true');
        }
      });
    } else {
      localStorage.setItem('notificationsEnabled', 'false');
    }
  };

  // 새 메시지 알림 핸들러
  useEffect(() => {
    if (!isNotificationEnabled) return;

    const lastMessageId = messages[messages.length - 1]?.id;
    if (lastMessageId && !notifications.includes(lastMessageId)) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.userId !== currentUserId) {
        new Notification('새 메시지', {
          body: `${lastMessage.userName}: ${lastMessage.content}`,
          icon: '/logo192.png'
        });
        setNotifications(prev => [...prev, lastMessageId]);
      }
    }
  }, [messages, isNotificationEnabled]);

  // 알림 설정 초기화
  useEffect(() => {
    const notificationsEnabled = localStorage.getItem('notificationsEnabled') === 'true';
    setIsNotificationEnabled(notificationsEnabled);
  }, []);

  const renderMessage = (msg, isMine, showDate, index, array) => {
    return (
      <React.Fragment key={msg.id}>
        {showDate && (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            my: 2,
            opacity: 0.7
          }}>
            <Typography variant="caption" sx={{ 
              bgcolor: 'rgba(255,255,255,0.1)', 
              px: 2, 
              py: 0.5, 
              borderRadius: 1,
              color: '#fff'
            }}>
              {msg.timestamp?.toDate?.()?.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long'
              }) || new Date().toLocaleDateString('ko-KR')}
            </Typography>
          </Box>
        )}
        <Box
          className={`message-item${isMine ? ' mine' : ''}`}
          sx={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: isMine ? 'flex-end' : 'flex-start',
            alignItems: 'flex-start',
            mb: 1.5,
            position: 'relative',
            pl: msg.parentId ? 4 : 0
          }}
        >
          {!isMine && (
            <Avatar 
              sx={{ 
                width: 32, 
                height: 32, 
                mr: 1, 
                mt: 0.5,
                bgcolor: msg.userName === '시스템' ? 'grey.500' : 'primary.main'
              }}
            >
              {msg.userName?.[0] || '?'}
            </Avatar>
          )}
          <Box
            className="message-bubble"
            sx={{
              maxWidth: '70%',
              width: 'fit-content',
              background: isMine ? '#3b82f6' : '#31344a',
              color: '#fff',
              borderRadius: 3,
              px: 2,
              py: 1.5,
              display: 'flex',
              flexDirection: 'column',
              wordBreak: 'break-word',
              whiteSpace: 'pre-line',
              overflowWrap: 'break-word',
              opacity: msg._pending ? 0.5 : 1,
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}
          >
            {msg.replyTo && (
              <Box sx={{ 
                mb: 1, 
                p: 1, 
                bgcolor: 'rgba(0,0,0,0.2)', 
                borderRadius: 1,
                fontSize: '0.875rem'
              }}>
                <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>
                  {msg.replyTo.userName}님에게 답글
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
                  {msg.replyTo.content}
                </Typography>
              </Box>
            )}
            {!isMine && (
              <Typography 
                className="user-id" 
                sx={{ 
                  fontWeight: 700, 
                  mb: 0.5,
                  fontSize: '0.875rem',
                  color: isMine ? '#fff' : '#b0b8c1'
                }}
              >
                {msg.userName}
              </Typography>
            )}
            <Typography 
              className="msg-content" 
              sx={{ 
                flex: 1,
                fontSize: '0.9375rem',
                lineHeight: 1.5
              }}
            >
              {msg.content}
            </Typography>
            {msg.attachments && msg.attachments.length > 0 && (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 0.5, 
                mt: 1,
                borderTop: '1px solid rgba(255,255,255,0.1)',
                pt: 1
              }}>
                {msg.attachments.map((url, idx) => {
                  const isImage = url.match(/\.(jpeg|jpg|png|gif|bmp|webp)$/i);
                  return isImage ? (
                    <a 
                      href={url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      key={idx} 
                      style={{ 
                        display: 'inline-block', 
                        maxWidth: 200,
                        borderRadius: 4,
                        overflow: 'hidden'
                      }}
                    >
                      <img 
                        src={url} 
                        alt="첨부이미지" 
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: 150, 
                          objectFit: 'cover'
                        }} 
                      />
                    </a>
                  ) : (
                    <a 
                      href={url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      key={idx} 
                      download 
                      style={{ 
                        color: '#fff', 
                        textDecoration: 'none',
                        fontSize: '0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <AttachFileIcon sx={{ fontSize: 16 }} />
                      파일 다운로드
                    </a>
                  );
                })}
              </Box>
            )}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              mt: 0.5
            }}>
              <Typography 
                className="msg-time" 
                sx={{ 
                  fontSize: '0.75rem', 
                  color: 'rgba(255,255,255,0.6)'
                }}
              >
                {msg.timestamp?.toDate?.()?.toLocaleTimeString('ko-KR', {
                  hour: '2-digit',
                  minute: '2-digit'
                }) || new Date().toLocaleTimeString('ko-KR')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <IconButton
                  size="small"
                  onClick={() => setReplyTo(msg)}
                  sx={{ 
                    color: 'rgba(255,255,255,0.6)',
                    '&:hover': { color: 'primary.main' }
                  }}
                >
                  <ReplyIcon sx={{ fontSize: 16 }} />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => handleBookmarkToggle(msg.id)}
                  sx={{ 
                    color: bookmarkedMessages.includes(msg.id) ? 'primary.main' : 'rgba(255,255,255,0.6)',
                    '&:hover': { color: 'primary.main' }
                  }}
                >
                  {bookmarkedMessages.includes(msg.id) ? 
                    <BookmarkIcon sx={{ fontSize: 16 }} /> : 
                    <BookmarkBorderIcon sx={{ fontSize: 16 }} />
                  }
                </IconButton>
              </Box>
            </Box>
          </Box>
          {isMine && !msg._pending && (
            <Box sx={{ 
              position: 'absolute',
              right: -40,
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              gap: 0.5,
              opacity: 0,
              transition: 'opacity 0.2s',
              '.message-item:hover &': {
                opacity: 1
              }
            }}>
              <IconButton 
                size="small" 
                onClick={() => { setEditingId(msg.id); setEditContent(msg.content); }}
                sx={{ 
                  bgcolor: 'rgba(25,118,210,0.1)',
                  '&:hover': { bgcolor: 'rgba(25,118,210,0.2)' }
                }}
              >
                <EditIcon sx={{ fontSize: 16 }} />
              </IconButton>
              <IconButton 
                size="small" 
                onClick={() => handleDelete(msg.id)}
                sx={{ 
                  bgcolor: 'rgba(239,68,68,0.1)',
                  '&:hover': { bgcolor: 'rgba(239,68,68,0.2)' }
                }}
              >
                <DeleteIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          )}
        </Box>
        {msg.replies && msg.replies.length > 0 && (
          <Box sx={{ pl: 4 }}>
            {msg.replies.map(reply => renderMessage(reply, reply.userId === currentUserId, false))}
          </Box>
        )}
      </React.Fragment>
    );
  };

  return (
    <Box className="discussions-container" sx={{ display: 'flex', flexDirection: 'row', height: '100vh', background: '#232734' }}>
      {/* 왼쪽: 현장/대화방 리스트, 검색, 추가, 비교 입력 */}
      <Box className="site-list-section" sx={{ width: 300, minWidth: 240, maxWidth: 340, borderRight: '2px solid #2d2f36', p: 0, bgcolor: '#232734', display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <Box className="search-box" sx={{ p: '32px 16px 8px 16px', display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            placeholder="대화방 검색"
            value={siteSearch}
            onChange={e => setSiteSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
            sx={{ flex: 1 }}
          />
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setRoomDialogOpen(true)} sx={{ borderRadius: 2, fontWeight: 700, minWidth: 120, height: 40 }}>
            대화 추가하기
          </Button>
        </Box>
        <List className="site-list" sx={{ flex: 1, overflowY: 'auto', p: '0 8px 0 8px' }}>
          {filteredSites.map(site => (
            <ListItem
              key={site.id}
              className={`site-item${selectedSite?.id === site.id ? ' selected' : ''}`}
              onClick={() => setSelectedSite(site)}
              sx={{ mb: 1, borderRadius: 2, cursor: 'pointer', alignItems: 'flex-start' }}
            >
              <Box sx={{ width: '100%' }}>
                <Typography className="site-name">{site.name}</Typography>
                <Typography className="message-count">글 수: {getMessageCount(site.id)}</Typography>
                <TextField
                  size="small"
                  placeholder="비교:"
                  value={compareNotes[site.id] || ''}
                  onChange={e => handleCompareNoteChange(site.id, e.target.value)}
                  sx={{ mt: 1 }}
                />
              </Box>
            </ListItem>
          ))}
        </List>
      </Box>

      {/* 오른쪽: 대화방(메시지/입력/수정/삭제/첨부 등) */}
      <Box className="discussion-section" sx={{ flex: 1, minWidth: 0, p: '40px 48px 0 48px', bgcolor: '#232734', display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <Box className="discussion-header" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">{selectedSite?.name || '대화방'}</Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <IconButton 
              onClick={handleNotificationToggle}
              sx={{ 
                color: isNotificationEnabled ? 'primary.main' : 'rgba(255,255,255,0.7)',
                '&:hover': { color: 'primary.main' }
              }}
            >
              {isNotificationEnabled ? <NotificationsIcon /> : <NotificationsOffIcon />}
            </IconButton>
            <IconButton 
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              sx={{ 
                color: isSearchOpen ? 'primary.main' : 'rgba(255,255,255,0.7)',
                '&:hover': { color: 'primary.main' }
              }}
            >
              <SearchIcon />
            </IconButton>
            <TextField
              select
              size="small"
              value={selectedSite?.id || ''}
              onChange={e => setSelectedSite(sites.find(s => s.id === e.target.value))}
              sx={{ minWidth: 140 }}
            >
              <option value="" disabled>현장 선택</option>
              {sites.map(site => (
                <option key={site.id} value={site.id}>{site.name}</option>
              ))}
            </TextField>
            <Button variant="contained">전체리스트</Button>
          </Box>
        </Box>

        {isSearchOpen && (
          <Box sx={{ 
            mb: 3, 
            p: 2, 
            bgcolor: 'rgba(255,255,255,0.05)', 
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 2
          }}>
            <TextField
              fullWidth
              size="small"
              placeholder="메시지 검색..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'rgba(255,255,255,0.5)' }} />
                  </InputAdornment>
                ),
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchQuery('')}>
                      <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </InputAdornment>
                )
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(0,0,0,0.2)',
                  color: '#fff',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' }
                }
              }}
            />
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>기간</InputLabel>
                <Select
                  value={filterOptions.dateRange}
                  onChange={e => setFilterOptions(prev => ({ ...prev, dateRange: e.target.value }))}
                  label="기간"
                  sx={{
                    bgcolor: 'rgba(0,0,0,0.2)',
                    color: '#fff',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' }
                  }}
                >
                  <MenuItem value="all">전체</MenuItem>
                  <MenuItem value="today">오늘</MenuItem>
                  <MenuItem value="week">최근 1주일</MenuItem>
                  <MenuItem value="month">최근 1개월</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>정렬</InputLabel>
                <Select
                  value={sortOrder}
                  onChange={e => setSortOrder(e.target.value)}
                  label="정렬"
                  sx={{
                    bgcolor: 'rgba(0,0,0,0.2)',
                    color: '#fff',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' }
                  }}
                >
                  <MenuItem value="desc">최신순</MenuItem>
                  <MenuItem value="asc">과거순</MenuItem>
                </Select>
              </FormControl>
              <FormControlLabel
                control={
                  <Switch
                    checked={filterOptions.hasAttachment}
                    onChange={e => setFilterOptions(prev => ({ ...prev, hasAttachment: e.target.checked }))}
                    color="primary"
                  />
                }
                label="첨부파일만"
                sx={{ color: 'rgba(255,255,255,0.7)' }}
              />
            </Box>
          </Box>
        )}

        <Box className="messages-container" sx={{ flex: 1, overflowY: 'auto', mb: 2, p: 2 }}>
          {selectedSite && filteredMessages.map((msg, index, array) => {
            const isMine = msg.userId === currentUserId;
            const showDate = index === 0 || 
              (array[index - 1] && 
               new Date(msg.timestamp?.toDate?.() || msg.timestamp).toDateString() !== 
               new Date(array[index - 1].timestamp?.toDate?.() || array[index - 1].timestamp).toDateString());
            
            return renderMessage(msg, isMine, showDate, index, array);
          })}
          <div ref={messagesEndRef} />
        </Box>

        {/* 답글 입력 UI */}
        {replyTo && (
          <Box sx={{ 
            p: 1.5, 
            bgcolor: 'rgba(255,255,255,0.05)', 
            borderRadius: 2,
            mb: 2
          }}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              mb: 1
            }}>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                {replyTo.userName}님에게 답글 작성 중
              </Typography>
              <IconButton 
                size="small" 
                onClick={() => setReplyTo(null)}
                sx={{ color: 'rgba(255,255,255,0.7)' }}
              >
                <CloseIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
            <TextField
              fullWidth
              multiline
              maxRows={3}
              size="small"
              placeholder="답글을 입력하세요..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                  setReplyTo(null);
                }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(0,0,0,0.2)',
                  color: '#fff',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' }
                }
              }}
            />
          </Box>
        )}

        <Box 
          className="message-input-container" 
          sx={{ 
            position: 'relative',
            mt: 'auto',
            p: 2,
            borderTop: '1px solid rgba(255,255,255,0.1)',
            bgcolor: 'rgba(0,0,0,0.2)',
            backdropFilter: 'blur(10px)'
          }}
        >
          {attachments.length > 0 && (
            <Box sx={{ 
              display: 'flex', 
              gap: 1, 
              mb: 1.5,
              flexWrap: 'wrap'
            }}>
              {attachments.map((file, index) => (
                <Chip
                  key={index}
                  label={file.name}
                  onDelete={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    '& .MuiChip-deleteIcon': {
                      color: 'rgba(255,255,255,0.7)',
                      '&:hover': { color: '#fff' }
                    }
                  }}
                />
              ))}
            </Box>
          )}
          <Box sx={{ 
            display: 'flex', 
            gap: 1, 
            alignItems: 'flex-end',
            position: 'relative'
          }}>
            <TextField
              fullWidth
              multiline
              maxRows={4}
              size="small"
              placeholder="메시지를 입력하세요..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(255,255,255,0.05)',
                  borderRadius: 2,
                  color: '#fff',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.08)'
                  },
                  '&.Mui-focused': {
                    bgcolor: 'rgba(255,255,255,0.1)'
                  },
                  '& fieldset': {
                    borderColor: 'rgba(255,255,255,0.1)'
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255,255,255,0.2)'
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'primary.main'
                  }
                },
                '& .MuiInputBase-input': {
                  fontSize: '0.9375rem',
                  lineHeight: 1.5,
                  padding: '10px 14px'
                }
              }}
            />
            <Box sx={{ 
              display: 'flex', 
              gap: 0.5,
              height: 40
            }}>
              <IconButton
                onClick={() => fileInputRef.current.click()}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.05)',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.1)'
                  }
                }}
              >
                <AttachFileIcon sx={{ color: 'rgba(255,255,255,0.7)' }} />
              </IconButton>
              <Button
                variant="contained"
                onClick={handleSend}
                disabled={!message.trim() && attachments.length === 0}
                sx={{
                  minWidth: 80,
                  height: 40,
                  borderRadius: 2,
                  bgcolor: 'primary.main',
                  '&:hover': {
                    bgcolor: 'primary.dark'
                  },
                  '&.Mui-disabled': {
                    bgcolor: 'rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.3)'
                  }
                }}
              >
                전송
              </Button>
            </Box>
            <input
              type="file"
              multiple
              hidden
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
            />
          </Box>
          <Typography 
            variant="caption" 
            sx={{ 
              display: 'block',
              mt: 1,
              color: 'rgba(255,255,255,0.5)',
              textAlign: 'center'
            }}
          >
            Enter로 전송, Shift + Enter로 줄바꿈
          </Typography>
        </Box>
      </Box>

      {/* 대화방 생성 다이얼로그 */}
      <Dialog open={roomDialogOpen} onClose={() => setRoomDialogOpen(false)}>
        <DialogTitle>대화방 추가하기</DialogTitle>
        <DialogContent>
          <TextField
            label="현장명 검색"
            value={roomSiteSearch}
            onChange={e => setRoomSiteSearch(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
            autoComplete="off"
          />
          <List sx={{ maxHeight: 180, overflowY: 'auto', mb: 2 }}>
            {roomSiteOptions.map(site => (
              <ListItem button key={site.id} selected={roomSite?.id === site.id} onClick={() => setRoomSite(site)}>
                <ListItemText primary={site.name} />
              </ListItem>
            ))}
          </List>
          <TextField
            label="비밀번호 (선택)"
            type={showPassword ? 'text' : 'password'}
            value={roomPassword}
            onChange={e => setRoomPassword(e.target.value)}
            fullWidth
            autoComplete="off"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(v => !v)}>
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoomDialogOpen(false)}>취소</Button>
          <Button onClick={handleCreateRoom} variant="contained" disabled={!roomSite}>생성</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Discussions; 