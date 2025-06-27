import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
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

const DiscussionRooms = ({ onSelectRoom }) => {
  const [rooms, setRooms] = useState([]);
  const [sites, setSites] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const { currentUser } = useAuth();

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
    if (!window.confirm('정말로 이 토론방을 삭제하시겠습니까?')) return;

    try {
      await deleteDoc(doc(db, 'discussionRooms', roomId));
    } catch (error) {
      console.error('토론방 삭제 중 오류:', error);
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}>
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
            secondaryAction={
              room.createdBy === currentUser?.uid && (
                <IconButton 
                  edge="end" 
                  aria-label="delete"
                  onClick={() => handleDeleteRoom(room.id)}
                >
                  <DeleteIcon />
                </IconButton>
              )
            }
          >
            <ListItemButton onClick={() => onSelectRoom(room)}>
              <ListItemText
                primary={room.name}
                secondary={`현장: ${room.siteName}`}
              />
            </ListItemButton>
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
          <FormControl fullWidth margin="dense">
            <InputLabel>현장 선택</InputLabel>
            <Select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              label="현장 선택"
            >
              {sites.map((site) => (
                <MenuItem key={site.id} value={site.id}>
                  {site.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
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