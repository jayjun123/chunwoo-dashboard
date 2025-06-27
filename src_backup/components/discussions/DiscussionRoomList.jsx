import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, Button, Grid, IconButton, Tooltip, Badge, Dialog, DialogTitle, DialogContent, DialogActions, TextField, InputAdornment, Select, MenuItem } from '@mui/material';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableViewIcon from '@mui/icons-material/TableView';
import ChatIcon from '@mui/icons-material/Chat';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import SearchIcon from '@mui/icons-material/Search';
import { useAuth } from '../../contexts/AuthContext';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

const DiscussionRoomList = ({ onSelectRoom }) => {
  const [rooms, setRooms] = useState([]);
  const [messages, setMessages] = useState({});
  const [editDialog, setEditDialog] = useState(false);
  const [editRoom, setEditRoom] = useState(null);
  const [editName, setEditName] = useState('');
  const [editSite, setEditSite] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [selectedRoomForPassword, setSelectedRoomForPassword] = useState(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.grade === '마스터' || currentUser?.grade === '관리자';

  useEffect(() => {
    const q = query(collection(db, 'discussionRooms'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const roomList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRooms(roomList);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribes = rooms.map(room => {
      const q = query(collection(db, 'discussions'), orderBy('createdAt', 'desc'));
      return onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.filter(doc => doc.data().roomId === room.id).map(doc => doc.data());
        setMessages(prev => ({ ...prev, [room.id]: msgs }));
      });
    });
    return () => unsubscribes.forEach(unsub => unsub());
  }, [rooms]);

  // 검색/정렬 적용
  const filteredRooms = rooms
    .filter(room => room.name.toLowerCase().includes(search.toLowerCase()) || room.siteName.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'recent') return b.createdAt?.seconds - a.createdAt?.seconds;
      if (sort === 'count') return (messages[b.id]?.length || 0) - (messages[a.id]?.length || 0);
      return 0;
    });

  const handleDelete = async (roomId) => {
    if (!window.confirm('정말로 이 대화방을 삭제하시겠습니까?')) return;
    await deleteDoc(doc(db, 'discussionRooms', roomId));
    // discussions 컬렉션에서 해당 roomId 메시지 삭제는 별도 구현 필요
  };

  const handleEdit = (room) => {
    setEditRoom(room);
    setEditName(room.name);
    setEditSite(room.siteName);
    setEditPassword(room.password || '');
    setEditDialog(true);
  };

  const handleEditSave = async () => {
    if (!editRoom) return;
    await updateDoc(doc(db, 'discussionRooms', editRoom.id), {
      name: editName,
      siteName: editSite,
      password: editPassword
    });
    setEditDialog(false);
    setEditRoom(null);
  };

  const handlePasswordEnter = (room) => {
    setSelectedRoomForPassword(room);
    setPasswordInput('');
    setPasswordDialog(true);
  };

  const handlePasswordCheck = () => {
    if (selectedRoomForPassword.password === passwordInput) {
      onSelectRoom(selectedRoomForPassword);
      setPasswordDialog(false);
    } else {
      alert('비밀번호가 틀렸습니다.');
    }
  };

  // PDF 내보내기
  const handleExportPDF = (room) => {
    const msgs = messages[room.id] || [];
    const doc = new jsPDF();
    doc.text(`${room.name} (${room.siteName}) 대화방`, 10, 10);
    msgs.forEach((msg, idx) => {
      doc.text(`${msg.author || '익명'}: ${msg.content || ''} ${msg.fileName ? `[파일: ${msg.fileName}]` : ''}`, 10, 20 + idx * 10);
    });
    doc.save(`${room.name}_채팅내역.pdf`);
  };

  // 엑셀 내보내기
  const handleExportExcel = (room) => {
    const msgs = messages[room.id] || [];
    const data = msgs.map(msg => ({
      작성자: msg.author || '익명',
      내용: msg.content || '',
      파일: msg.fileName || '',
      날짜: msg.createdAt?.toDate?.().toLocaleString?.() || ''
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '채팅내역');
    XLSX.writeFile(wb, `${room.name}_채팅내역.xlsx`);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 2, alignItems: 'center' }}>
        <TextField
          placeholder="대화방/현장명 검색"
          value={search}
          onChange={e => setSearch(e.target.value)}
          size="small"
          sx={{ minWidth: 180, background: '#232634', borderRadius: 2, color: '#fff' }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#90caf9' }} />
              </InputAdornment>
            )
          }}
        />
        <Select value={sort} onChange={e => setSort(e.target.value)} size="small" sx={{ minWidth: 120, background: '#232634', color: '#fff', borderRadius: 2 }}>
          <MenuItem value="recent">최신순</MenuItem>
          <MenuItem value="count">글 많은순</MenuItem>
        </Select>
      </Box>
      <Grid container spacing={2}>
        {filteredRooms.map(room => {
          const roomMsgs = messages[room.id] || [];
          const lastMsg = roomMsgs[0]?.content || '';
          const hasPassword = !!room.password;
          return (
            <Grid item xs={12} sm={6} md={12} key={room.id}>
              <Card sx={{ borderRadius: 3, boxShadow: 4, background: 'linear-gradient(90deg, #232634 60%, #1976d2 100%)', color: '#fff', cursor: 'pointer', transition: '0.2s', '&:hover': { boxShadow: 8, background: 'linear-gradient(90deg, #1976d2 60%, #232634 100%)', transform: 'scale(1.03)' } }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box onClick={() => hasPassword ? handlePasswordEnter(room) : onSelectRoom(room)}>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>{room.name}</Typography>
                      <Typography variant="body2" sx={{ color: '#90caf9' }}>현장: {room.siteName}</Typography>
                      <Typography variant="body2" sx={{ mt: 1, color: '#b0b0b0' }}>글 수: {roomMsgs.length}</Typography>
                      <Typography variant="body2" sx={{ color: '#b0b0b0' }}>최근: {lastMsg.length > 20 ? lastMsg.slice(0, 20) + '...' : lastMsg}</Typography>
                      {hasPassword ? <LockIcon fontSize="small" sx={{ color: '#ffb300', ml: 1 }} /> : <LockOpenIcon fontSize="small" sx={{ color: '#90caf9', ml: 1 }} />}
                    </Box>
                    <Box>
                      <Tooltip title="PDF로 내보내기"><IconButton color="inherit" onClick={() => handleExportPDF(room)}><PictureAsPdfIcon /></IconButton></Tooltip>
                      <Tooltip title="엑셀로 내보내기"><IconButton color="inherit" onClick={() => handleExportExcel(room)}><TableViewIcon /></IconButton></Tooltip>
                      {isAdmin && (
                        <>
                          <Tooltip title="수정"><IconButton color="inherit" onClick={() => handleEdit(room)}><EditIcon /></IconButton></Tooltip>
                          <Tooltip title="삭제"><IconButton color="error" onClick={() => handleDelete(room.id)}><DeleteIcon /></IconButton></Tooltip>
                        </>
                      )}
                      <Tooltip title="채팅 입장"><IconButton color="primary" onClick={() => hasPassword ? handlePasswordEnter(room) : onSelectRoom(room)}><ChatIcon /></IconButton></Tooltip>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
      {/* 대화방 수정 다이얼로그 */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)}>
        <DialogTitle>대화방 수정</DialogTitle>
        <DialogContent>
          <TextField label="대화방 이름" fullWidth sx={{ mb: 2 }} value={editName} onChange={e => setEditName(e.target.value)} />
          <TextField label="현장명" fullWidth sx={{ mb: 2 }} value={editSite} onChange={e => setEditSite(e.target.value)} />
          {isAdmin && (
            <TextField label="비밀번호(선택)" fullWidth value={editPassword} onChange={e => setEditPassword(e.target.value)} type="password" />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>취소</Button>
          <Button onClick={handleEditSave} variant="contained">저장</Button>
        </DialogActions>
      </Dialog>
      {/* 비밀번호 입력 다이얼로그 */}
      <Dialog open={passwordDialog} onClose={() => setPasswordDialog(false)}>
        <DialogTitle>비밀번호 입력</DialogTitle>
        <DialogContent>
          <TextField label="비밀번호" fullWidth value={passwordInput} onChange={e => setPasswordInput(e.target.value)} type="password" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialog(false)}>취소</Button>
          <Button onClick={handlePasswordCheck} variant="contained">입장</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DiscussionRoomList; 