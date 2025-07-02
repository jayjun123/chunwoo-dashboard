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
  Search as SearchIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp, where } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
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
  const [newRoomData, setNewRoomData] = useState({ name: '', siteId: '', password: '', permissions: {} });
  const [searchTerm, setSearchTerm] = useState('');
  const [editingMessage, setEditingMessage] = useState(null);
  const [searchParams] = useSearchParams();
  const [filteredSiteId, setFilteredSiteId] = useState(null);
  const [filteredSiteName, setFilteredSiteName] = useState('');
  const [searchText, setSearchText] = useState("");
  const [searchJump, setSearchJump] = useState("");
  const messageRefs = useRef({});
  const [replyTo, setReplyTo] = useState(null);
  const [message, setMessage] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const { currentUser } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery('(max-width:600px)');

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

  // 키보드 이벤트 감지 (모바일)
  useEffect(() => {
    if (!isMobile) return;

    const handleResize = () => {
      const viewportHeight = window.innerHeight;
      const windowHeight = window.outerHeight;
      const keyboardVisible = viewportHeight < windowHeight * 0.8;
      setKeyboardVisible(keyboardVisible);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [isMobile]);

  // 메시지 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !fileToUpload) || !currentUser || !selectedRoom) return;
    
    // 쓰기 권한 체크
    if (!canWriteRoom(selectedRoom)) {
      setError("이 채팅방에 메시지를 보낼 권한이 없습니다.");
      return;
    }

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
      lastMessage: '대화방이 생성되었습니다.',
      permissions: newRoomData.permissions || {}
    });

    setIsCreateRoomOpen(false);
    setNewRoomData({ name: '', siteId: '', password: '', permissions: {} });
  };

  const handleDeleteRoom = async (e, roomId) => {
    e.stopPropagation();
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;
    
    if (!canAdminRoom(room)) {
      alert('채팅방을 삭제할 권한이 없습니다.');
      return;
    }
    
    if (!window.confirm('정말로 이 대화방을 삭제하시겠습니까?')) return;
    await deleteDoc(doc(db, 'discussions', roomId));
    if (selectedRoom?.id === roomId) setSelectedRoom(null);
  };

  const handleDeleteMessage = async (messageId) => {
    if (!selectedRoom) return;
    
    const message = messages.find(m => m.id === messageId);
    if (!message) return;
    
    // 메시지 작성자이거나 관리 권한이 있어야 삭제 가능
    if (message.userId !== currentUser?.uid && !canAdminRoom(selectedRoom)) {
      alert('메시지를 삭제할 권한이 없습니다.');
      return;
    }
    
    if (!window.confirm('메시지를 삭제하시겠습니까?')) return;
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
    if (currentUser.uid === message.userId) return true; // 본인 메시지는 수정/삭제 가능
    if (currentUser.role === 'admin' || currentUser.role === 'master') return true;
    if (selectedRoom && canAdminRoom(selectedRoom)) return true; // 채팅방 관리자
    return false;
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

  // 권한 체크 함수들
  const canReadRoom = (room) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin' || currentUser.role === 'master') return true;
    if (!room.permissions) return true; // 권한 설정이 없으면 모든 사용자 접근 가능
    return room.permissions[currentUser.uid] === 'read' || 
           room.permissions[currentUser.uid] === 'write' || 
           room.permissions[currentUser.uid] === 'admin';
  };

  const canWriteRoom = (room) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin' || currentUser.role === 'master') return true;
    if (!room.permissions) return true; // 권한 설정이 없으면 모든 사용자 접근 가능
    return room.permissions[currentUser.uid] === 'write' || 
           room.permissions[currentUser.uid] === 'admin';
  };

  const canAdminRoom = (room) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin' || currentUser.role === 'master') return true;
    if (!room.permissions) return false;
    return room.permissions[currentUser.uid] === 'admin';
  };

  const canCreateRoom = () => {
    if (!currentUser) return false;
    return currentUser.role === 'admin' || currentUser.role === 'master' || currentUser.role === 'manager';
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
  if (error) return <Box sx={{ p: 2 }}><Alert severity="error" onClose={() => setError(null)}>{error}</Alert></Box>;

  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchTerm.toLowerCase()) && canReadRoom(room)
  );

  return (
    <Box sx={{ height: 'calc(100vh - 65px - 51px)', display: 'flex', flexDirection: 'column', position: 'fixed', top: '65px', left: 0, right: 0, bottom: '51px', overflow: 'hidden', overflowX: 'hidden', zIndex: 1000, bgcolor: '#1a1d21', p: isMobile ? 0 : undefined, m: 0, width: isMobile ? '100vw' : '100%', maxWidth: isMobile ? '100vw' : '100%', minWidth: isMobile ? '100vw' : '0', boxSizing: 'border-box' }}>
      {/* 헤더 */}
      <Box sx={{ 
        p: { xs: 1, md: 2 }, 
        borderBottom: 1, 
        borderColor: 'divider',
        bgcolor: 'background.paper',
        width: '100%'
      }}>
        {(!isMobile || !selectedRoom) && (
          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
            토론의견
          </Typography>
        )}
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          {(!isMobile || !selectedRoom) && (
            <Typography variant="body2" color="text.secondary">
              프로젝트 관련 의견을 나누는 공간입니다.
            </Typography>
          )}
        </Box>
      </Box>

      {/* 메인 컨텐츠 */}
      <Box sx={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        width: '100%'
      }}>
        {/* 채팅방 목록: 모바일은 selectedRoom 없을 때만, PC는 항상 */}
        {(!selectedRoom || !isMobile) && (
          <Box sx={{
            width: { xs: '100%', md: 300 },
            borderRight: { xs: 0, md: 1 },
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.paper',
            p: 0,
            m: 0,
            minWidth: 0,
            minHeight: 0,
          }}>
            <Box sx={{ 
              p: { xs: 1, md: 2 }, 
              borderBottom: 1, 
              borderColor: 'divider',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <Typography variant="h6">채팅방</Typography>
              {canCreateRoom() && (
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => setIsCreateRoomOpen(true)}
                  startIcon={<AddIcon />}
                >
                  새방
                </Button>
              )}
            </Box>
            
            <Box sx={{ 
              flex: 1, 
              overflowY: 'auto',
              p: { xs: 0, md: 1 }
            }}>
              {filteredRooms.map((room) => {
                const canWrite = canWriteRoom(room);
                const canAdmin = canAdminRoom(room);
                
                return (
                  <Box
                    key={room.id}
                    onClick={() => setSelectedRoom(room)}
                    sx={{
                      p: { xs: 1, md: 1.5 },
                      cursor: 'pointer',
                      borderBottom: 1,
                      borderColor: 'divider',
                      bgcolor: selectedRoom?.id === room.id ? 'action.selected' : 'transparent',
                      '&:hover': {
                        bgcolor: 'action.hover'
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                          {room.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {room.lastMessage || '메시지가 없습니다.'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                        {!canWrite && (
                          <Chip 
                            label="읽기전용" 
                            size="small" 
                            color="warning" 
                            variant="outlined"
                            sx={{ fontSize: '0.6rem', height: 20 }}
                          />
                        )}
                        {canAdmin && (
                          <Chip 
                            label="관리자" 
                            size="small" 
                            color="error" 
                            variant="outlined"
                            sx={{ fontSize: '0.6rem', height: 20 }}
                          />
                        )}
                        {room.password && (
                          <Chip 
                            icon={<LockIcon />} 
                            label="잠금" 
                            size="small" 
                            color="secondary" 
                            variant="outlined"
                            sx={{ fontSize: '0.6rem', height: 20 }}
                          />
                        )}
                      </Box>
                    </Box>
                    {canAdmin && (
                      <IconButton
                        size="small"
                        onClick={(e) => handleDeleteRoom(e, room.id)}
                        sx={{ 
                          position: 'absolute', 
                          top: 4, 
                          right: 4,
                          opacity: 0.7,
                          '&:hover': { opacity: 1 }
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}
        {/* 채팅방: 모바일은 selectedRoom 있을 때만, PC는 항상 */}
        {isMobile && selectedRoom && (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100vw', p: 0, m: 0, minWidth: 0, minHeight: 0 }}>
            {/* 채팅방 헤더 */}
            <Box sx={{ 
              p: { xs: 1, md: 2 }, 
              borderBottom: 1, 
              borderColor: 'divider',
              bgcolor: 'background.paper',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'sticky',
              top: 0,
              zIndex: 1200
            }}>
              <Typography 
                variant="h6"
                noWrap
                sx={{
                  flex: 1,
                  fontSize: 'clamp(1rem, 4vw, 1.2rem)',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textAlign: 'left',
                  pr: 1
                }}
              >
                {selectedRoom.name}
              </Typography>
              <IconButton onClick={() => setSelectedRoom(null)}>
                <CloseIcon />
              </IconButton>
            </Box>

            {/* 메시지 영역 */}
            <Box sx={{ 
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              pb: '110px' // 입력창+하단바 높이만큼 패딩
            }}>
              <Box 
                sx={{ 
                  flex: 1,
                  overflowY: 'auto', 
                  p: { xs: 1, md: 2 },
                  minHeight: 0,
                  maxHeight: isMobile 
                    ? keyboardVisible 
                      ? 'calc(100vh - 200px)' 
                      : 'calc(100vh - 300px)'
                    : 'calc(100vh - 350px)'
                }}
              >
                {messages.map((msg, index) => {
                  const isMe = msg.userId === currentUser?.uid;
                  const canModify = canEditOrDelete(msg);
                  
                  return (
                    <Box 
                      key={msg.id} 
                      ref={el => messageRefs.current[msg.id] = el}
                      sx={{ 
                        mb: 2, 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: isMe ? 'flex-end' : 'flex-start'
                      }}
                    >
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        mb: 0.5,
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
                <div ref={messagesEndRef} />
              </Box>
            </Box>

            {/* 입력칸 - 하단바 위에 고정 */}
            <Box sx={{ 
              p: { xs: 1, md: 2 }, 
              borderTop: 1, 
              borderColor: 'divider',
              bgcolor: 'background.paper',
              width: '100vw',
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: '46px',
              zIndex: 2000
            }}>
              {/* 첨부파일 미리보기 */}
              {fileToUpload && (
                <Box sx={{ 
                  mb: 1, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  p: 1,
                  bgcolor: 'grey.50',
                  borderRadius: 1,
                  border: 1,
                  borderColor: 'grey.200'
                }}>
                  {fileToUpload.type.startsWith('image/') ? (
                    <img
                      src={URL.createObjectURL(fileToUpload)}
                      alt={fileToUpload.name}
                      style={{ 
                        width: 48, 
                        height: 48, 
                        objectFit: 'cover', 
                        borderRadius: 4 
                      }}
                    />
                  ) : (
                    <DescriptionIcon sx={{ fontSize: 48, color: 'grey.500' }} />
                  )}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: 'bold',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {fileToUpload.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {(fileToUpload.size / 1024 / 1024).toFixed(2)} MB
                    </Typography>
                  </Box>
                  {uploading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={20} />
                      <Typography variant="caption" color="primary">
                        업로드중...
                      </Typography>
                    </Box>
                  ) : (
                    <IconButton 
                      size="small" 
                      onClick={() => setFileToUpload(null)}
                      sx={{ color: 'grey.500' }}
                    >
                      <CancelIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              )}
              
              <Box sx={{ 
                display: 'flex', 
                gap: 1,
                alignItems: 'flex-end',
                width: '100%'
              }}>
                <TextField
                  fullWidth
                  multiline
                  maxRows={4}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={canWriteRoom(selectedRoom) ? "메시지를 입력하세요..." : "읽기 전용 채팅방입니다"}
                  variant="outlined"
                  size="small"
                  disabled={!canWriteRoom(selectedRoom)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2
                    }
                  }}
                />
                <IconButton
                  component="label"
                  sx={{ ml: 0, height: 48 }}
                  disabled={uploading || !canWriteRoom(selectedRoom)}
                >
                  <AttachFileIcon />
                  <input type="file" hidden onChange={handleFileSelect} />
                </IconButton>
                <IconButton
                  onClick={handleSendMessage}
                  disabled={(!newMessage.trim() && !fileToUpload) || uploading || !canWriteRoom(selectedRoom)}
                  color="primary"
                  sx={{ 
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'primary.dark'
                    },
                    '&.Mui-disabled': {
                      bgcolor: 'grey.300',
                      color: 'grey.500'
                    }
                  }}
                >
                  <SendIcon />
                </IconButton>
              </Box>
            </Box>
          </Box>
        )}
        {!isMobile && selectedRoom && (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', p: 0, m: 0, minWidth: 0, minHeight: 0 }}>
            {/* 채팅방 헤더 */}
            <Box sx={{ 
              p: { xs: 1, md: 2 }, 
              borderBottom: 1, 
              borderColor: 'divider',
              bgcolor: 'background.paper',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <Typography variant="h6">{selectedRoom.name}</Typography>
              <IconButton onClick={() => setSelectedRoom(null)}>
                <CloseIcon />
              </IconButton>
            </Box>

            {/* 메시지 영역 */}
            <Box sx={{ 
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              width: '100%'
            }}>
              <Box 
                sx={{ 
                  flex: 1,
                  overflowY: 'auto', 
                  p: { xs: 1, md: 2 },
                  minHeight: 0,
                  maxHeight: isMobile 
                    ? keyboardVisible 
                      ? 'calc(100vh - 200px)' 
                      : 'calc(100vh - 300px)'
                    : 'calc(100vh - 350px)'
                }}
              >
                {messages.map((msg, index) => {
                  const isMe = msg.userId === currentUser?.uid;
                  const canModify = canEditOrDelete(msg);
                  
                  return (
                    <Box 
                      key={msg.id} 
                      ref={el => messageRefs.current[msg.id] = el}
                      sx={{ 
                        mb: 2, 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: isMe ? 'flex-end' : 'flex-start'
                      }}
                    >
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        mb: 0.5,
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
                <div ref={messagesEndRef} />
              </Box>

              {/* 입력칸 */}
              <Box sx={{ 
                p: { xs: 1, md: 2 }, 
                borderTop: 1, 
                borderColor: 'divider',
                bgcolor: 'background.paper',
                width: '100%',
                position: 'sticky',
                bottom: 0
              }}>
                {/* 첨부파일 미리보기 */}
                {fileToUpload && (
                  <Box sx={{ 
                    mb: 1, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    p: 1,
                    bgcolor: 'grey.50',
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'grey.200'
                  }}>
                    {fileToUpload.type.startsWith('image/') ? (
                      <img
                        src={URL.createObjectURL(fileToUpload)}
                        alt={fileToUpload.name}
                        style={{ 
                          width: 48, 
                          height: 48, 
                          objectFit: 'cover', 
                          borderRadius: 4 
                        }}
                      />
                    ) : (
                      <DescriptionIcon sx={{ fontSize: 48, color: 'grey.500' }} />
                    )}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: 'bold',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {fileToUpload.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {(fileToUpload.size / 1024 / 1024).toFixed(2)} MB
                      </Typography>
                    </Box>
                    {uploading ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={20} />
                        <Typography variant="caption" color="primary">
                          업로드중...
                        </Typography>
                      </Box>
                    ) : (
                      <IconButton 
                        size="small" 
                        onClick={() => setFileToUpload(null)}
                        sx={{ color: 'grey.500' }}
                      >
                        <CancelIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                )}
                
                <Box sx={{ 
                  display: 'flex', 
                  gap: 1,
                  alignItems: 'flex-end',
                  width: '100%'
                }}>
                  <TextField
                    fullWidth
                    multiline
                    maxRows={4}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={canWriteRoom(selectedRoom) ? "메시지를 입력하세요..." : "읽기 전용 채팅방입니다"}
                    variant="outlined"
                    size="small"
                    disabled={!canWriteRoom(selectedRoom)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2
                      }
                    }}
                  />
                  <IconButton
                    component="label"
                    sx={{ ml: 0, height: 48 }}
                    disabled={uploading || !canWriteRoom(selectedRoom)}
                  >
                    <AttachFileIcon />
                    <input type="file" hidden onChange={handleFileSelect} />
                  </IconButton>
                  <IconButton
                    onClick={handleSendMessage}
                    disabled={(!newMessage.trim() && !fileToUpload) || uploading || !canWriteRoom(selectedRoom)}
                    color="primary"
                    sx={{ 
                      bgcolor: 'primary.main',
                      color: 'white',
                      '&:hover': {
                        bgcolor: 'primary.dark'
                      },
                      '&.Mui-disabled': {
                        bgcolor: 'grey.300',
                        color: 'grey.500'
                      }
                    }}
                  >
                    <SendIcon />
                  </IconButton>
                </Box>
              </Box>
            </Box>
          </Box>
        )}
      </Box>
      
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
          
          {/* 권한 설정 섹션 */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              기본 권한 설정
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              채팅방 생성 후 사용자별 권한을 추가로 설정할 수 있습니다.
            </Typography>
            <FormControl component="fieldset">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={newRoomData.permissions.publicRead !== false}
                    onChange={(e) => setNewRoomData({
                      ...newRoomData,
                      permissions: {
                        ...newRoomData.permissions,
                        publicRead: e.target.checked
                      }
                    })}
                  />
                }
                label="모든 사용자 읽기 허용"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={newRoomData.permissions.publicWrite !== false}
                    onChange={(e) => setNewRoomData({
                      ...newRoomData,
                      permissions: {
                        ...newRoomData.permissions,
                        publicWrite: e.target.checked
                      }
                    })}
                  />
                }
                label="모든 사용자 쓰기 허용"
              />
            </FormControl>
          </Box>
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