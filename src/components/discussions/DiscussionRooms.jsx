import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, getDocs, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import Autocomplete from '@mui/material/Autocomplete';
import Checkbox from '@mui/material/Checkbox';

const DiscussionRooms = ({ onSelectRoom, currentUser, isMobile }) => {
  const [rooms, setRooms] = useState([]);
  const [sites, setSites] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [lastAuthors, setLastAuthors] = useState({});
  const [selectedRoomIds, setSelectedRoomIds] = useState([]);

  // 현장 목록 가져오기
  useEffect(() => {
    const q = query(collection(db, 'sites'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const siteList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSites(siteList);
    });

    return () => unsubscribe();
  }, []);

  // 토론방 목록 가져오기
  useEffect(() => {
    const q = query(
      collection(db, 'discussionRooms'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const roomList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRooms(roomList);
    });

    return () => unsubscribe();
  }, []);

  // 각 대화방별 최근 메시지 작성자 쿼리
  useEffect(() => {
    if (!rooms.length) return;
    const unsubscribes = rooms.map(room => {
      const q = query(collection(db, 'discussions'), where('roomId', '==', room.id), orderBy('createdAt', 'desc'), limit(1));
      return onSnapshot(q, (snapshot) => {
        const msg = snapshot.docs[0]?.data();
        setLastAuthors(prev => ({ ...prev, [room.id]: msg?.author || '-' }));
      });
    });
    return () => unsubscribes.forEach(unsub => unsub());
  }, [rooms]);

  const handleCreateRoom = async () => {
    if (!newRoomName.trim() || !selectedSiteId) return;

    try {
      const selectedSite = sites.find(site => site.id === selectedSiteId);
      await addDoc(collection(db, 'discussionRooms'), {
        name: newRoomName.trim(),
        siteId: selectedSiteId,
        siteName: selectedSite.name,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp()
      });

      setNewRoomName('');
      setSelectedSiteId('');
      setOpenDialog(false);
    } catch (error) {
      console.error('토론방 생성 중 오류:', error);
    }
  };

  const handleDeleteRoom = async (roomId) => {
    const isAuthorized = currentUser?.role === 'master' || currentUser?.role === 'admin';

    console.log(`%c[삭제 프로세스 시작] Room ID: ${roomId}`, 'color: blue; font-weight: bold;');
    console.log(`- 권한 확인: ${isAuthorized} (Role: ${currentUser?.role})`);

    if (!isAuthorized) {
      alert('삭제 권한이 없습니다 (master, admin만 가능).');
      console.log('%c[삭제 프로세스 중단] 권한 부족', 'color: red;');
      return;
    }

    if (!window.confirm('정말로 이 토론방을 삭제하시겠습니까? 관련된 모든 메시지도 함께 삭제됩니다.')) {
      console.log('%c[삭제 프로세스 중단] 사용자가 취소함', 'color: orange;');
      return;
    }

    console.log('%c[삭제 작업 진행]', 'color: green;');
    try {
      // 1단계: 하위 메시지 쿼리
      console.log('  1. 하위 메시지 쿼리 시작...');
      const messagesQuery = query(collection(db, 'discussions'), where('roomId', '==', roomId));
      const messagesSnapshot = await getDocs(messagesQuery);
      console.log(`  - 쿼리 완료. ${messagesSnapshot.docs.length}개의 메시지를 찾았습니다.`);

      // 2단계: 하위 메시지 삭제
      if (!messagesSnapshot.empty) {
        console.log('  2. 하위 메시지 삭제 시작...');
        const deletePromises = messagesSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        console.log('  - 모든 하위 메시지 삭제 완료.');
      } else {
        console.log('  2. 삭제할 하위 메시지가 없습니다.');
      }
      
      // 3단계: 대화방 문서 삭제
      console.log('  3. 대화방 문서 삭제 시작...');
      await deleteDoc(doc(db, 'discussionRooms', roomId));
      console.log('  - 대화방 문서 삭제 완료.');

      alert('대화방과 관련 메시지가 성공적으로 삭제되었습니다.');
      console.log('%c[삭제 프로세스 성공]', 'color: green; font-weight: bold;');
      
    } catch (error) {
      console.error('%c[삭제 프로세스 중 오류 발생]', 'color: red; font-weight: bold;', error);
      alert(`삭제 중 오류가 발생했습니다. 개발자 콘솔을 확인해주세요.\n\n에러: ${error.message}`);
    }
  };

  return (
    <Box sx={{ width: isMobile ? '100vw' : '100%', maxWidth: isMobile ? '100vw' : '360px', bgcolor: 'background.paper', p: isMobile ? 0 : 2, m: 0, minWidth: isMobile ? '100vw' : 0, boxSizing: 'border-box' }}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">토론방 목록</Typography>
        <Tooltip title="새 토론방 만들기">
          <IconButton onClick={() => setOpenDialog(true)} color="primary">
            <AddIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <List>
        {rooms.map((room) => (
          <ListItem
            key={room.id}
            disablePadding
            sx={{ alignItems: 'center' }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <Checkbox
                edge="start"
                checked={selectedRoomIds.includes(room.id)}
                onChange={(_, checked) => {
                  setSelectedRoomIds(prev =>
                    checked ? [...prev, room.id] : prev.filter(id => id !== room.id)
                  );
                }}
                sx={{ ml: 1, mr: 1 }}
              />
              <ListItemButton onClick={() => onSelectRoom(room)} sx={{ flex: 1 }}>
                <ListItemText
                  primary={room.name}
                  secondary={
                    <>
                      <span>현장: {room.siteName}</span><br/>
                      <span style={{ color: '#90caf9' }}>최근 작성자: {lastAuthors[room.id] || '-'}</span>
                    </>
                  }
                />
              </ListItemButton>
              {(currentUser?.role === 'master' || currentUser?.role === 'admin') && (
                <IconButton 
                  edge="end" 
                  aria-label="delete"
                  onClick={() => handleDeleteRoom(room.id)}
                >
                  <DeleteIcon />
                </IconButton>
              )}
            </Box>
          </ListItem>
        ))}
      </List>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>새 토론방 만들기</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="토론방 이름"
            fullWidth
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
          />
          <Autocomplete
            options={sites}
            getOptionLabel={option => option.name || ''}
            value={sites.find(site => site.id === selectedSiteId) || null}
            onChange={(e, newValue) => setSelectedSiteId(newValue ? newValue.id : '')}
            renderInput={params => (
              <TextField {...params} label="현장 검색" margin="dense" fullWidth />
            )}
            sx={{ mt: 2 }}
            isOptionEqualToValue={(option, value) => option.id === value.id}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>취소</Button>
          <Button onClick={handleCreateRoom} variant="contained">
            만들기
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DiscussionRooms; 