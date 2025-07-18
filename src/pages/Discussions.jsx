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
  Close as CloseIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp, where, getDocs } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { NanumGothic } from '../assets/fonts/NanumGothic.js';
import { exportToExcel, exportChatToPDF } from '../utils/exportUtils';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DiscussionChat from '../components/discussions/DiscussionChat';

const Discussions = () => {
  const [rooms, setRooms] = useState([]);
  const [sites, setSites] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [newRoomData, setNewRoomData] = useState({ name: '', siteId: '', password: '', passwordInput: '', permissions: {} });
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [selectedRoomForPassword, setSelectedRoomForPassword] = useState(null);
  
  // 권한 타입 정의
  const permissionTypes = [
    { value: 'admin', label: '관리자', color: 'error' },
    { value: 'general', label: '일반회원', color: 'primary' },
    { value: 'teamA', label: '대마팀A', color: 'success' },
    { value: 'teamB', label: '대마팀B', color: 'warning' },
    { value: 'teamC', label: '대마팀C', color: 'info' },
    { value: 'teamD', label: '대마팀D', color: 'secondary' }
  ];
  const [searchTerm, setSearchTerm] = useState('');
  const [searchParams] = useSearchParams();
  const [filteredSiteId, setFilteredSiteId] = useState(null);
  const [filteredSiteName, setFilteredSiteName] = useState('');
  const [selectedRoomIds, setSelectedRoomIds] = useState([]);

  const { currentUser } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery('(max-width:600px)');
  const navigate = useNavigate();

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
    const siteId = searchParams.get('siteId');
    if (siteId && sites.length > 0) {
      setFilteredSiteId(siteId);
      const site = sites.find(s => s.id === siteId);
      if (site) {
        setFilteredSiteName(site.name);
      }
    }
  }, [searchParams, sites]);

  const handleCreateRoom = async () => {
    if (!newRoomData.name.trim() || !newRoomData.siteId) {
      alert('방 이름과 현장을 선택해주세요.');
      return;
    }

    try {
      const roomData = {
        name: newRoomData.name.trim(),
        siteId: newRoomData.siteId,
        siteName: sites.find(s => s.id === newRoomData.siteId)?.name || '',
        password: newRoomData.password || null,
        permissions: newRoomData.permissions,
        createdAt: serverTimestamp(),
        lastActivity: serverTimestamp(),
        createdBy: currentUser?.uid || 'anonymous',
        createdByName: currentUser?.displayName || currentUser?.email || '익명'
      };

      await addDoc(collection(db, 'discussions'), roomData);
      setNewRoomData({ name: '', siteId: '', password: '', passwordInput: '', permissions: {} });
      setIsCreateRoomOpen(false);
    } catch (error) {
      console.error('방 생성 오류:', error);
      alert('방 생성 중 오류가 발생했습니다.');
    }
  };

  const handlePasswordSubmit = () => {
    if (passwordInput === selectedRoomForPassword.password) {
      if (isMobile) {
        navigate(`/discussions/chat/${selectedRoomForPassword.id}`);
      } else {
        setSelectedRoom(selectedRoomForPassword);
      }
      setIsPasswordDialogOpen(false);
      setPasswordInput('');
      setSelectedRoomForPassword(null);
    } else {
      alert('비밀번호가 올바르지 않습니다.');
    }
  };

  const handleRoomClick = (room, event) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (room.password) {
      setSelectedRoomForPassword(room);
      setIsPasswordDialogOpen(true);
    } else {
      if (isMobile) {
        navigate(`/discussions/chat/${room.id}`);
      } else {
        setSelectedRoom(room);
      }
    }
  };

  const handleDeleteRoom = async (e, roomId) => {
    e.stopPropagation();
    if (window.confirm('이 채팅방을 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'discussions', roomId));
      } catch (error) {
        console.error('방 삭제 오류:', error);
        alert('방 삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const handleExcelExport = () => {
    if (selectedRoomIds.length === 0) {
      alert('엑셀로 내보낼 방을 먼저 선택하세요.');
      return;
    }
    // 엑셀 내보내기 로직
  };

  const handlePdfExport = () => {
    if (selectedRoomIds.length === 0) {
      alert('PDF로 내보낼 방을 먼저 선택하세요.');
      return;
    }
    // PDF 내보내기 로직
  };

  const canReadRoom = (room) => {
    if (!currentUser) return false;
    if (!room.permissions || Object.keys(room.permissions).length === 0) return true;
    
    const userRole = currentUser.role || 'general';
    const userOrg = currentUser.organization;
    
    // 관리자는 모든 방에 접근 가능
    if (userRole === 'admin') return true;
    
    // 방의 권한 설정 확인
    return room.permissions[userRole] || room.permissions[userOrg] || false;
  };

  const canWriteRoom = (room) => {
    if (!currentUser) return false;
    if (!room.permissions || Object.keys(room.permissions).length === 0) return true;
    
    const userRole = currentUser.role || 'general';
    const userOrg = currentUser.organization;
    
    // 관리자는 모든 방에 쓰기 가능
    if (userRole === 'admin') return true;
    
    // 방의 권한 설정 확인
    return room.permissions[userRole] || room.permissions[userOrg] || false;
  };

  const canAdminRoom = (room) => {
    if (!currentUser) return false;
    const userRole = currentUser.role || 'general';
    return userRole === 'admin' || room.createdBy === currentUser.uid;
  };

  const canCreateRoom = () => {
    if (!currentUser) return false;
    const userRole = currentUser.role || 'general';
    return userRole === 'admin' || userRole === 'general';
  };

  const handleExportSelectedRoomsToExcel = async () => {
    if (selectedRoomIds.length === 0) {
      alert('엑셀로 내보낼 방을 먼저 선택하세요.');
      return;
    }
    for (const roomId of selectedRoomIds) {
      const room = rooms.find(r => r.id === roomId);
      if (!room) continue;
      // 메시지 불러오기
      const messagesQuery = query(collection(db, `discussions/${roomId}/messages`), orderBy('timestamp', 'asc'));
      const snapshot = await getDocs(messagesQuery);
      const messagesData = snapshot.docs.map(doc => doc.data());
      if (!messagesData.length) {
        alert(`${room.name} 방에 내보낼 메시지가 없습니다.`);
        continue;
      }
      // 엑셀 데이터 포맷
      const excelData = messagesData.map(msg => {
        let content = msg.text || '';
        if (msg.attachment) {
          if (msg.attachment.type && msg.attachment.type.startsWith('image/')) {
            content = `[이미지] ${msg.attachment.name}`;
          } else {
            content = `[파일] ${msg.attachment.name}`;
          }
          // 텍스트와 파일이 모두 있으면 텍스트 + [파일] 형태로
          if (msg.text && msg.attachment) {
            if (msg.attachment.type && msg.attachment.type.startsWith('image/')) {
              content = `${msg.text} [이미지] ${msg.attachment.name}`;
            } else {
              content = `${msg.text} [파일] ${msg.attachment.name}`;
            }
          }
        }
        return {
          '작성자': msg.userName || '익명',
          '내용': content,
          '시간': msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleString() : ''
        };
      });
      exportToExcel(excelData, '대화기록', `${room.name}_대화기록`);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
  if (error) return <Box sx={{ p: 2 }}><Alert severity="error" onClose={() => setError(null)}>{error}</Alert></Box>;

  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchTerm.toLowerCase()) && canReadRoom(room)
  );

  return (
    <Box sx={{ height: 'calc(100vh - 65px - 51px)', display: 'flex', flexDirection: 'column', position: 'fixed', top: isMobile ? '62px' : '65px', left: 0, right: 0, bottom: isMobile ? '51px' : '51px', overflow: 'hidden', overflowX: 'hidden', zIndex: 1000, bgcolor: '#1a1d21', p: 0, m: 0, width: isMobile ? '100vw' : '100%', maxWidth: isMobile ? '100vw' : '100%', minWidth: isMobile ? '100vw' : '0', boxSizing: 'border-box' }}>
      {/* 헤더 */}
      <Box sx={{ 
        p: { xs: 0, md: 2 }, 
        borderBottom: 1, 
        borderColor: 'divider',
        bgcolor: 'background.paper',
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography variant="h6">토론의견</Typography>
        {!isMobile && (
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            size="small"
            onClick={handleExportSelectedRoomsToExcel}
            sx={{ ml: 2 }}
          >
            엑셀 내보내기
          </Button>
        )}
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
            width: { xs: selectedRoom ? 0 : '100%', md: 350 },
            borderRight: { xs: 0, md: 1 },
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.paper',
            p: 0,
            m: 0,
            minWidth: 0,
            minHeight: 0,
            overflow: 'hidden',
          }}>
            <Box sx={{ 
              p: { xs: 0, md: 2 }, 
              borderBottom: 1, 
              borderColor: 'divider',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <Typography variant="h6">채팅방</Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {isMobile && (
                  <TextField
                    size="small"
                    placeholder="검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{ 
                      width: '120px',
                      '& .MuiOutlinedInput-root': {
                        height: '32px',
                        fontSize: '0.875rem'
                      }
                    }}
                  />
                )}
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
            </Box>
            
            <Box sx={{ 
              flex: 1, 
              overflowY: 'auto',
              p: 0
            }}>
              {filteredRooms.map((room) => {
                const canWrite = canWriteRoom(room);
                const canAdmin = canAdminRoom(room);
                
                return (
                  <Box
                    key={room.id}
                    onClick={(event) => {
                      handleRoomClick(room, event);
                    }}
                    sx={{
                      p: { xs: 0.5, md: 1.5 },
                      minHeight: '80px',
                      cursor: 'pointer',
                      borderBottom: 1,
                      borderColor: 'divider',
                      bgcolor: selectedRoom?.id === room.id ? 'action.selected' : 'transparent',
                      '&:hover': {
                        bgcolor: 'action.hover'
                      },
                      display: 'flex',
                      alignItems: 'center',
                      position: 'relative'
                    }}
                  >
                    <Checkbox
                      checked={selectedRoomIds.includes(room.id)}
                      onChange={e => {
                        e.stopPropagation();
                        setSelectedRoomIds(prev =>
                          e.target.checked ? [...prev, room.id] : prev.filter(id => id !== room.id)
                        );
                      }}
                      sx={{ mr: 1 }}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                        {room.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {room.lastAuthor && room.lastActivity ?
                          `[마지막 작성자 : ${room.lastAuthor} ${formatDate(room.lastActivity)} ${formatTime(room.lastActivity)}]`
                          : '메시지가 없습니다.'}
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
                    {canAdmin && (
                      <IconButton
                        size="small"
                        onClick={e => { e.stopPropagation(); handleDeleteRoom(e, room.id); }}
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
        
        {/* 채팅방: PC만 사용 (모바일은 별도 라우트로 이동) */}
        {selectedRoom && !isMobile && (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', p: 0, m: 0, minWidth: 0, minHeight: 0 }}>
            {/* PC용 채팅방 UI (기존 방식) */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* 채팅방 헤더 */}
              <Box sx={{ 
                p: 2, 
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
              {/* PC용 메시지 영역 */}
              <Box sx={{ 
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                width: '100%'
              }}>
                <DiscussionChat roomId={selectedRoom.id} />
              </Box>
            </Box>
          </Box>
        )}
      </Box>
      
      {/* 새 방 만들기 다이얼로그 */}
      <Dialog open={isCreateRoomOpen} onClose={() => setIsCreateRoomOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>새 채팅방 만들기</DialogTitle>
        <DialogContent>
          <TextField
            label="방 이름"
            fullWidth
            value={newRoomData.name}
            onChange={(e) => setNewRoomData({ ...newRoomData, name: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>현장 선택</InputLabel>
            <Select
              value={newRoomData.siteId}
              onChange={(e) => setNewRoomData({ ...newRoomData, siteId: e.target.value })}
              label="현장 선택"
            >
              {sites.map((site) => (
                <MenuItem key={site.id} value={site.id}>
                  {site.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="비밀번호 (선택사항)"
            type="password"
            fullWidth
            value={newRoomData.password}
            onChange={(e) => setNewRoomData({ ...newRoomData, password: e.target.value })}
            sx={{ mb: 2 }}
          />
          <Typography variant="subtitle2" sx={{ mb: 1 }}>권한 설정</Typography>
          {permissionTypes.map((type) => (
            <FormControlLabel
              key={type.value}
              control={
                <Checkbox
                  checked={newRoomData.permissions[type.value] || false}
                  onChange={(e) => setNewRoomData({
                    ...newRoomData,
                    permissions: {
                      ...newRoomData.permissions,
                      [type.value]: e.target.checked
                    }
                  })}
                />
              }
              label={type.label}
            />
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCreateRoomOpen(false)}>취소</Button>
          <Button onClick={handleCreateRoom} variant="contained">생성</Button>
        </DialogActions>
      </Dialog>

      {/* 비밀번호 입력 다이얼로그 */}
      <Dialog open={isPasswordDialogOpen} onClose={() => setIsPasswordDialogOpen(false)}>
        <DialogTitle>비밀번호 입력</DialogTitle>
        <DialogContent>
          <TextField
            label="비밀번호"
            type="password"
            fullWidth
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handlePasswordSubmit();
              }
            }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsPasswordDialogOpen(false)}>취소</Button>
          <Button onClick={handlePasswordSubmit} variant="contained">입력</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Discussions; 