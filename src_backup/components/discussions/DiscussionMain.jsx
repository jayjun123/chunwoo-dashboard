import React, { useState } from 'react';
import { Box, Grid, Button, Typography, Dialog, DialogTitle, DialogContent, DialogActions, TextField, useMediaQuery } from '@mui/material';
import DiscussionRoomList from './DiscussionRoomList';
import DiscussionChat from './DiscussionChat';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useTheme } from '@mui/material/styles';

const DiscussionMain = () => {
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newSiteName, setNewSiteName] = useState('');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleCreateRoom = async () => {
    if (!newRoomName.trim() || !newSiteName.trim()) return;
    await addDoc(collection(db, 'discussionRooms'), {
      name: newRoomName.trim(),
      siteName: newSiteName.trim(),
      createdAt: serverTimestamp(),
    });
    setNewRoomName('');
    setNewSiteName('');
    setOpenDialog(false);
  };

  return (
    <Box sx={{ p: isMobile ? 1 : 3, minHeight: '80vh', background: 'linear-gradient(90deg, #181A20 60%, #1976d2 100%)', borderRadius: 4, boxShadow: 6 }}>
      <Grid container spacing={isMobile ? 1 : 3} direction={isMobile ? 'column' : 'row'}>
        <Grid item xs={12} md={4} sx={{ mb: isMobile ? 2 : 0 }}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#fff' }}>대화방 리스트</Typography>
            <Button variant="contained" color="secondary" onClick={() => setOpenDialog(true)} size={isMobile ? 'small' : 'medium'}>+ 대화방 만들기</Button>
          </Box>
          <DiscussionRoomList onSelectRoom={setSelectedRoom} />
        </Grid>
        <Grid item xs={12} md={8}>
          {selectedRoom ? (
            <DiscussionChat roomId={selectedRoom.id} />
          ) : (
            <Box sx={{ height: '100%', minHeight: isMobile ? 200 : 400, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Typography variant="h6">좌측에서 대화방을 선택하세요</Typography>
            </Box>
          )}
        </Grid>
      </Grid>
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>새 대화방 만들기</DialogTitle>
        <DialogContent>
          <TextField label="대화방 이름" fullWidth sx={{ mb: 2 }} value={newRoomName} onChange={e => setNewRoomName(e.target.value)} />
          <TextField label="현장명" fullWidth value={newSiteName} onChange={e => setNewSiteName(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>취소</Button>
          <Button onClick={handleCreateRoom} variant="contained">생성</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DiscussionMain; 