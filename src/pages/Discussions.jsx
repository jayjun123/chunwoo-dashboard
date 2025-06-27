import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, IconButton, Button, Dialog, DialogTitle, 
  DialogContent, DialogActions, TextField, Chip, useTheme, useMediaQuery, 
  InputAdornment, CircularProgress, Alert, MenuItem, FormControl, InputLabel, 
  Select, FormControlLabel, Checkbox, List, ListItem, ListItemText, ListItemAvatar, Avatar, Tooltip, ListItemButton
} from '@mui/material';
import {
  Add as AddIcon,
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  Description as DescriptionIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  Comment as CommentIcon,
  Lock as LockIcon,
  PictureAsPdf as PictureAsPdfIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { NanumGothic } from '../assets/fonts/NanumGothic.js';
import { exportToExcel, exportChatToPDF } from '../utils/exportUtils';
import { useSearchParams } from 'react-router-dom';

const Discussions = () => {
  const [rooms, setRooms] = useState([]);
  const [messages, setMessages] = useState([]);
  const [sites, setSites] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [fileToUpload, setFileToUpload] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [newRoomData, setNewRoomData] = useState({ name: '', siteId: '', password: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [editingMessage, setEditingMessage] = useState(null);
  const [searchParams] = useSearchParams();
  const [filteredSiteId, setFilteredSiteId] = useState(null);
  const [filteredSiteName, setFilteredSiteName] = useState('');
  const [searchText, setSearchText] = useState("");
  const [searchJump, setSearchJump] = useState("");
  const messageRefs = useRef({});

  const { currentUser } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const fileInputRef = React.useRef(null);

  const formatDate = (date) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d);
  };
  
  const formatTime = (date) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return new Intl.DateTimeFormat('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  };

  useEffect(() => {
    setLoading(true);
    const sitesQuery = query(collection(db, 'sites'), orderBy('name'));
    const sitesUnsubscribe = onSnapshot(sitesQuery, (snapshot) => {
      setSites(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const roomsQuery = query(collection(db, 'discussions'), orderBy('lastActivity', 'desc'));
    const roomsUnsubscribe = onSnapshot(roomsQuery, (snapshot) => {
      setRooms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, () => setLoading(false));

    return () => {
      sitesUnsubscribe();
      roomsUnsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!selectedRoom) {
      setMessages([]);
      return;
    }
    const messagesQuery = query(
      collection(db, `discussions/${selectedRoom.id}/messages`),
      orderBy('timestamp', 'asc')
    );
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [selectedRoom]);

  useEffect(() => {
    const siteId = searchParams.get('siteId');
    if (siteId && sites.length > 0) {
      setFilteredSiteId(siteId);
      const site = sites.find(s => s.id === siteId);
      if (site) {
        setFilteredSiteName(site.name);
      }
    }
  }, [searchParams, sites]);

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !fileToUpload) || !currentUser || !selectedRoom) return;

    setUploading(true);

    let attachmentData = null;

    if (fileToUpload) {
      const storage = getStorage();
      const storageRef = ref(storage, `discussion_attachments/${selectedRoom.id}/${Date.now()}_${fileToUpload.name}`);
      const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

      try {
        await uploadTask;
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        attachmentData = {
          url: downloadURL,
          name: fileToUpload.name,
          type: fileToUpload.type,
        };
      } catch (e) {
        console.error("File upload error:", e);
        setError("파일 업로드 중 오류가 발생했습니다.");
        setUploading(false);
        return;
      }
    }

    await addDoc(collection(db, `discussions/${selectedRoom.id}/messages`), {
      text: newMessage.trim(),
      userId: currentUser.uid,
      userName: currentUser.name || currentUser.displayName || '익명',
      timestamp: serverTimestamp(),
      attachment: attachmentData,
    });
    
    let lastMessageText = newMessage.trim();
    if (attachmentData) {
      lastMessageText = `[${attachmentData.name}]`;
      if (newMessage.trim()) {
        lastMessageText = `${newMessage.trim()} ${lastMessageText}`;
      }
    }

    await updateDoc(doc(db, 'discussions', selectedRoom.id), {
      lastActivity: serverTimestamp(),
      lastMessage: lastMessageText.substring(0, 30),
      lastAuthor: currentUser.name || currentUser.displayName || '익명',
    });

    setNewMessage('');
    setFileToUpload(null);
    setUploading(false);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileToUpload(file);
    }
  };

  const handleCreateRoom = async () => {
    if (!newRoomData.siteId) return;
    const site = sites.find(s => s.id === newRoomData.siteId);
    if (!site) return;

    await addDoc(collection(db, 'discussions'), {
      name: site.name,
      siteId: newRoomData.siteId,
      siteName: site.name,
      password: newRoomData.password,
      supervisor: '',
      createdBy: currentUser.uid,
      createdAt: new Date(),
      lastActivity: new Date(),
      lastMessage: '대화방이 생성되었습니다.'
    });

    setIsCreateRoomOpen(false);
    setNewRoomData({ name: '', siteId: '', password: '' });
  };

  const handleDeleteRoom = async (e, roomId) => {
    e.stopPropagation();
    if (!window.confirm('정말로 이 대화방을 삭제하시겠습니까?')) return;
    await deleteDoc(doc(db, 'discussions', roomId));
    if (selectedRoom?.id === roomId) setSelectedRoom(null);
  };

  const handleDeleteMessage = async (messageId) => {
    if (!selectedRoom || !window.confirm('메시지를 삭제하시겠습니까?')) return;
    await deleteDoc(doc(db, `discussions/${selectedRoom.id}/messages`, messageId));
  };
  
  const handleUpdateMessage = async () => {
    if (!selectedRoom || !editingMessage) return;
    const messageRef = doc(db, `discussions/${selectedRoom.id}/messages`, editingMessage.id);
    await updateDoc(messageRef, {
      text: editingMessage.text,
    });
    setEditingMessage(null);
  };
  
  const canEditOrDelete = (message) => {
    if (!currentUser) return false;
    return currentUser.uid === message.userId || currentUser.role === 'admin' || currentUser.role === 'master';
  };

  const handleExcelExport = () => {
    if (!selectedRoom || messages.length === 0) {
      alert('내보낼 대화 내용이 없습니다.');
      return;
    }

    const dataToExport = messages.map(msg => {
      const ts = msg.timestamp ? msg.timestamp.toDate() : new Date();
      const formattedTs = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}-${String(ts.getDate()).padStart(2, '0')} ${String(ts.getHours()).padStart(2, '0')}:${String(ts.getMinutes()).padStart(2, '0')}:${String(ts.getSeconds()).padStart(2, '0')}`;
      return {
        '작성자': msg.userName,
        '내용': msg.text,
        '시간': formattedTs,
      };
    });

    // 컬럼 너비 설정 (한글 텍스트 고려)
    const columnWidths = [
      { wch: 15 }, // 작성자
      { wch: 50 }, // 내용
      { wch: 20 }, // 시간
    ];

    const result = exportToExcel(dataToExport, '대화 내용', `${selectedRoom.name}_대화기록`, { columnWidths });
    
    if (result.success) {
      alert('엑셀 파일이 다운로드되었습니다.');
    } else {
      alert('엑셀 다운로드에 실패했습니다.');
    }
  };

  const handlePdfExport = () => {
    if (!selectedRoom || messages.length === 0) {
      alert('내보낼 대화 내용이 없습니다.');
      return;
    }
    
    const roomInfo = {
      name: selectedRoom.name,
      siteName: selectedRoom.siteName,
      createdAt: selectedRoom.createdAt?.toDate?.().toLocaleDateString() || '날짜 없음',
      password: selectedRoom.password ? '있음' : '없음'
    };

    const result = exportChatToPDF(messages, roomInfo);
    
    if (result.success) {
      alert('PDF 파일이 다운로드되었습니다.');
    } else {
      alert('PDF 다운로드에 실패했습니다.');
    }
  };

  // 검색 후 이동 함수
  const handleSearchJump = useCallback(() => {
    if (!searchJump.trim()) return;
    const lower = searchJump.toLowerCase();
    const found = messages.find(msg => msg.text && msg.text.toLowerCase().includes(lower));
    if (found && messageRefs.current[found.id]) {
      messageRefs.current[found.id].scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      alert('검색어를 포함한 메시지가 없습니다.');
    }
  }, [searchJump, messages]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
  if (error) return <Box sx={{ p: 2 }}><Alert severity="error" onClose={() => setError(null)}>{error}</Alert></Box>;

  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box sx={{ 
      display: 'flex', 
      height: '100%',
      p: 1, 
      gap: 1,
      position: isMobile ? 'relative' : 'static',
      left: isMobile ? '-30px' : 'auto',
      width: isMobile ? '100vw' : '100%'
    }}>
      <Paper 
        sx={{ 
          minWidth: isMobile ? '100%' : '250px',
          width: isMobile ? '100%' : '25%',
          maxWidth: isMobile ? '100%' : '350px',
          display: isMobile && selectedRoom ? 'none' : 'flex', 
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <Box sx={{ p: isMobile ? 1 : 2, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: isMobile ? 1 : 2 }}>
            <Typography variant="h6" sx={{ fontSize: isMobile ? '1rem' : 'inherit' }}>대화방</Typography>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />} 
              onClick={() => setIsCreateRoomOpen(true)} 
              size={isMobile ? 'small' : 'small'}
              sx={{ fontSize: isMobile ? '0.7rem' : 'inherit' }}
            >
              새 대화방
            </Button>
          </Box>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="대화방 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size={isMobile ? 'small' : 'medium'}
          />
        </Box>
        <List sx={{ overflowY: 'auto', flex: 1, p: isMobile ? 1 : 2, pt: 0 }}>
          {filteredRooms.map(room => (
            <ListItem disablePadding key={room.id}>
              <ListItemButton
                selected={selectedRoom?.id === room.id}
                onClick={() => setSelectedRoom(room)}
                sx={{ mb: isMobile ? 0.5 : 1, borderRadius: 1.5 }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: room.password ? 'secondary.main' : 'primary.main', width: isMobile ? 32 : 40, height: isMobile ? 32 : 40 }}>
                    {room.password ? <LockIcon sx={{ fontSize: isMobile ? '1rem' : 'inherit' }} /> : room.siteName?.charAt(0)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={room.name}
                  secondary={`최근 작성자: ${room.lastAuthor || '-'}`}
                  primaryTypographyProps={{ 
                    fontWeight: 'bold',
                    fontSize: isMobile ? '0.8rem' : 'inherit'
                  }}
                  secondaryTypographyProps={{
                    fontSize: isMobile ? '0.7rem' : 'inherit'
                  }}
                />
                <IconButton edge="end" onClick={(e) => handleDeleteRoom(e, room.id)} size={isMobile ? 'small' : 'medium'}>
                  <DeleteIcon sx={{ fontSize: isMobile ? '1rem' : 'inherit' }} />
                </IconButton>
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Paper>
      
      <Paper sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%', 
        overflow: 'hidden',
        display: isMobile && !selectedRoom ? 'none' : 'flex'
      }}>
        {selectedRoom ? (
          <>
            <Box sx={{ p: isMobile ? 1 : 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              {isMobile && (
                <IconButton onClick={() => setSelectedRoom(null)} sx={{ mr: 1 }}>
                  <ArrowBackIcon />
                </IconButton>
              )}
              <Box>
                <Typography variant="h6" sx={{ fontSize: isMobile ? '1rem' : 'inherit' }}>{selectedRoom.name}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: isMobile ? '0.7rem' : 'inherit' }}>
                  {selectedRoom.siteName}
                </Typography>
              </Box>
              <Box sx={{ flexGrow: 1 }} />
              {isMobile && (
                <Button 
                  variant="outlined" 
                  size="small"
                  onClick={() => setSelectedRoom(null)}
                  sx={{ fontSize: '0.7rem' }}
                >
                  목록으로
                </Button>
              )}
              {!isMobile && (
                <>
                  <Tooltip title="대화 내용 PDF로 내보내기">
                    <IconButton onClick={handlePdfExport}><PictureAsPdfIcon /></IconButton>
                  </Tooltip>
                  <Tooltip title="대화 내용 Excel로 내보내기">
                    <IconButton onClick={handleExcelExport}><DescriptionIcon /></IconButton>
                  </Tooltip>
                </>
              )}
              <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
                <TextField
                  variant="outlined"
                  size="small"
                  placeholder="채팅 내용 검색"
                  value={searchJump}
                  onChange={e => setSearchJump(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSearchJump(); }}
                  sx={{ width: isMobile ? 100 : 200, height: 40 }}
                  InputProps={{
                    sx: {
                      height: 40,
                      padding: 0,
                      fontSize: '0.95rem',
                      display: 'flex',
                      alignItems: 'center',
                    }
                  }}
                />
                <Button variant="contained" size="small" onClick={handleSearchJump} sx={{ ml: 1, height: 40, minWidth: 56 }}>검색</Button>
              </Box>
            </Box>

            <Box 
              sx={{ 
                flex: 1,
                overflowY: 'auto', 
                p: isMobile ? 1 : 2,
                minHeight: 0,
                maxHeight: isMobile ? 'calc(100vh - 300px)' : 'calc(100vh - 350px)'
              }}
            >
              {messages
                .map(msg => {
                  const isMe = currentUser && msg.userId === currentUser.uid;
                  const canModify = canEditOrDelete(msg);

                  return (
                    <Box 
                      key={msg.id}
                      ref={el => messageRefs.current[msg.id] = el}
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isMe ? 'flex-end' : 'flex-start',
                        mb: isMobile ? 1 : 2,
                      }}
                    >
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        mb: 0.5, 
                        flexDirection: 'row',
                        gap: 1
                      }}>
                        <Typography variant="caption" sx={{ fontSize: isMobile ? '0.6rem' : 'inherit' }}>
                          {formatTime(msg.timestamp)}
                        </Typography>
                        <Typography variant="caption" sx={{ fontSize: isMobile ? '0.6rem' : 'inherit' }}>
                          {msg.userName}
                        </Typography>
                        {canModify && (
                          <Box sx={{ 
                            display: 'flex', 
                            gap: 0.5,
                            opacity: 0.7,
                            '&:hover': { opacity: 1 }
                          }}>
                            {editingMessage && editingMessage.id === msg.id ? (
                              <>
                                <IconButton size={isMobile ? 'small' : 'small'} onClick={handleUpdateMessage} sx={{ bgcolor: 'background.paper' }}>
                                  <SaveIcon fontSize={isMobile ? 'small' : 'small'}/>
                                </IconButton>
                                <IconButton size={isMobile ? 'small' : 'small'} onClick={() => setEditingMessage(null)} sx={{ bgcolor: 'background.paper' }}>
                                  <CancelIcon fontSize={isMobile ? 'small' : 'small'}/>
                                </IconButton>
                              </>
                            ) : (
                              <>
                                <IconButton size={isMobile ? 'small' : 'small'} onClick={() => setEditingMessage(msg)} sx={{ bgcolor: 'background.paper' }}>
                                  <EditIcon fontSize={isMobile ? 'small' : 'small'}/>
                                </IconButton>
                                <IconButton size={isMobile ? 'small' : 'small'} onClick={() => {
                                  if (window.confirm('이 메시지를 삭제하시겠습니까?')) {
                                    handleDeleteMessage(msg.id);
                                  }
                                }} sx={{ bgcolor: 'background.paper' }}>
                                  <DeleteIcon fontSize={isMobile ? 'small' : 'small'}/>
                                </IconButton>
                              </>
                            )}
                          </Box>
                        )}
                      </Box>
                      
                      <Paper 
                        variant="outlined"
                        sx={{
                          p: isMobile ? 1 : 1.5,
                          maxWidth: '80%',
                          bgcolor: isMe ? 'primary.light' : 'background.paper',
                          display: 'flex',
                          flexDirection: 'column',
                          position: 'relative'
                        }}
                      >
                        {editingMessage && editingMessage.id === msg.id ? (
                          <TextField
                            fullWidth
                            value={editingMessage.text}
                            onChange={(e) => setEditingMessage({ ...editingMessage, text: e.target.value })}
                            variant="standard"
                            size={isMobile ? 'small' : 'medium'}
                          />
                        ) : (
                          <>
                            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', fontSize: isMobile ? '0.8rem' : 'inherit' }}>{msg.text}</Typography>
                            {msg.attachment && (
                              <Box mt={1}>
                                {msg.attachment.type.startsWith('image/') ? (
                                  <a href={msg.attachment.url} target="_blank" rel="noopener noreferrer">
                                    <img 
                                      src={msg.attachment.url} 
                                      alt={msg.attachment.name} 
                                      style={{ 
                                        maxWidth: isMobile ? '150px' : '200px', 
                                        maxHeight: isMobile ? '150px' : '200px', 
                                        borderRadius: '4px', 
                                        cursor: 'pointer' 
                                      }} 
                                    />
                                  </a>
                                ) : (
                                  <Button 
                                    variant="outlined" 
                                    startIcon={<DescriptionIcon />} 
                                    href={msg.attachment.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    sx={{ 
                                      textTransform: 'none',
                                      fontSize: isMobile ? '0.7rem' : 'inherit'
                                    }}
                                    size={isMobile ? 'small' : 'medium'}
                                  >
                                    {msg.attachment.name}
                                  </Button>
                                )}
                              </Box>
                            )}
                          </>
                        )}
                      </Paper>
                    </Box>
                  );
                })}
            </Box>

            <Box sx={{ p: isMobile ? 0.5 : 1, borderTop: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <IconButton onClick={() => fileInputRef.current.click()} disabled={uploading} size={isMobile ? 'small' : 'medium'}>
                  <AttachFileIcon sx={{ fontSize: isMobile ? '1.2rem' : 'inherit' }} />
                </IconButton>
                <TextField
                  fullWidth
                  variant="outlined"
                  size={isMobile ? 'small' : 'small'}
                  placeholder="메시지를 입력하세요"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (handleSendMessage(), e.preventDefault())}
                  disabled={uploading}
                  sx={{ 
                    '& .MuiInputBase-input': {
                      fontSize: isMobile ? '0.8rem' : 'inherit'
                    }
                  }}
                />
                <IconButton color="primary" onClick={handleSendMessage} disabled={uploading} size={isMobile ? 'small' : 'medium'}>
                  {uploading ? <CircularProgress size={isMobile ? 20 : 24} /> : <SendIcon sx={{ fontSize: isMobile ? '1.2rem' : 'inherit' }} />}
                </IconButton>
              </Box>
              {fileToUpload && (
                <Box mt={1}>
                  <Chip
                    icon={<DescriptionIcon />}
                    label={fileToUpload.name}
                    onDelete={() => setFileToUpload(null)}
                    size={isMobile ? 'small' : 'small'}
                    sx={{ fontSize: isMobile ? '0.7rem' : 'inherit' }}
                  />
                </Box>
              )}
            </Box>
          </>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', color: 'text.secondary' }}>
            <CommentIcon sx={{ fontSize: 60, mb: 2, opacity: 0.5 }} />
            <Typography variant="h5" sx={{ mb: 1 }}>대화방을 선택하세요</Typography>
            <Typography variant="body1">왼쪽에서 대화방을 선택하여 시작하세요</Typography>
          </Box>
        )}
      </Paper>
      
      <Dialog open={isCreateRoomOpen} onClose={() => setIsCreateRoomOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>새 대화방 만들기</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>현장 선택</InputLabel>
             <Select
              value={newRoomData.siteId}
              onChange={(e) => {
                const siteId = e.target.value;
                setNewRoomData({ ...newRoomData, siteId });
              }}
              label="현장 선택"
            >
              {sites.map(site => <MenuItem key={site.id} value={site.id}>{site.name}</MenuItem>)}
            </Select>
          </FormControl>
           <FormControlLabel
            control={
              <Checkbox
                checked={!!newRoomData.password}
                onChange={(e) => setNewRoomData({ ...newRoomData, password: e.target.checked ? 'private' : '' })}
              />
            }
            label="비밀번호 설정 (잠금)"
            sx={{ mt: 2, display: 'block' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCreateRoomOpen(false)}>취소</Button>
           <Button 
            onClick={handleCreateRoom} 
            variant="contained" 
            disabled={!newRoomData.siteId}
          >
            만들기
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Discussions; 