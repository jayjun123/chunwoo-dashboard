import React, { useState, useEffect } from 'react';
import { Box, Grid, Button, Typography, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Autocomplete, useMediaQuery } from '@mui/material';
import DiscussionRoomList from './DiscussionRoomList';
import DiscussionChat from './DiscussionChat';
import { collection, addDoc, serverTimestamp, onSnapshot, query, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useTheme } from '@mui/material/styles';
import { useParams, useNavigate } from 'react-router-dom';

const DiscussionMain = () => {
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newSiteName, setNewSiteName] = useState('');
  const [siteOptions, setSiteOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { roomId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    // 현장 목록 실시간으로 가져오기
    const q = query(collection(db, 'sites'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSiteOptions(snapshot.docs.map(doc => doc.data().name));
    });
    return () => unsubscribe();
  }, []);

  // URL 파라미터에서 roomId가 있으면 해당 채팅방 자동 선택
  useEffect(() => {
    if (roomId) {
      const fetchRoom = async () => {
        try {
          setLoading(true);
          const roomDoc = await getDoc(doc(db, 'discussions', roomId));
          if (roomDoc.exists()) {
            setSelectedRoom({ id: roomDoc.id, ...roomDoc.data() });
          } else {
            // 채팅방이 존재하지 않으면 목록으로 이동
            navigate('/discussions');
          }
        } catch (error) {
          console.error('채팅방 로딩 오류:', error);
          navigate('/discussions');
        } finally {
          setLoading(false);
        }
      };
      fetchRoom();
    } else {
      setLoading(false);
    }
  }, [roomId, navigate]);

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
    <Box sx={
      isMobile
        ? {
            bgcolor: '#181a20',
            position: 'fixed',
            top: '15px',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
            height: 'calc(100vh - 60px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }
        : {
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
          }
    }>
      {isMobile ? (
        // 모바일 레이아웃
        selectedRoom ? (
          <DiscussionChat 
            roomId={selectedRoom.id} 
            roomName={selectedRoom.name} 
            onBack={() => navigate('/discussions')}
          />
        ) : (
          <DiscussionRoomList onSelectRoom={(room) => {
            if (isMobile) {
              navigate(`/discussions/chat/${room.id}`);
            } else {
              setSelectedRoom(room);
            }
          }} />
        )
      ) : (
        // 데스크톱 레이아웃
        <Box sx={{ p: 3, minHeight: '80vh', background: 'linear-gradient(90deg, #181A20 60%, #1976d2 100%)', borderRadius: 4, boxShadow: 6 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#fff' }}>대화방 리스트</Typography>
                <Button variant="contained" color="secondary" onClick={() => setOpenDialog(true)}>+ 대화방 만들기</Button>
              </Box>
              <DiscussionRoomList onSelectRoom={setSelectedRoom} />
            </Grid>
            <Grid item xs={12} md={8}>
              {selectedRoom ? (
                <DiscussionChat roomId={selectedRoom.id} />
              ) : (
                <Box sx={{ height: '100%', minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <Typography variant="h6">좌측에서 대화방을 선택하세요</Typography>
                </Box>
              )}
            </Grid>
          </Grid>
        </Box>
      )}
      
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>새 대화방 만들기</DialogTitle>
        <DialogContent>
          <TextField label="대화방 이름" fullWidth sx={{ mb: 2, mt: 1 }} value={newRoomName} onChange={e => setNewRoomName(e.target.value)} />
          <Autocomplete
            options={siteOptions}
            value={newSiteName}
            onChange={(event, newValue) => {
              setNewSiteName(newValue || '');
            }}
            renderInput={(params) => <TextField {...params} label="현장명" fullWidth />}
          />
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