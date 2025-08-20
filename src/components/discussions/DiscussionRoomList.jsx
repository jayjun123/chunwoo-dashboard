import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, Button, Grid, IconButton, Tooltip, Badge, Dialog, DialogTitle, DialogContent, DialogActions, TextField, InputAdornment, Select, MenuItem } from '@mui/material';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc, where, getDocs } from 'firebase/firestore';
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
import { exportToExcel } from '../../utils/excelUtils';
import { exportChatToPDF } from '../../utils/pdfUtils';

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
  // 권한 체크를 더 유연하게 설정
  const isAdmin = currentUser?.role === 'master' || currentUser?.role === 'admin' || currentUser?.grade === 'master' || currentUser?.grade === 'admin';
  const canManageRooms = isAdmin || currentUser?.role === 'manager' || currentUser?.grade === 'manager';

  // 디버깅을 위한 로그
  console.log('DiscussionRoomList - 현재 사용자 정보:', currentUser);
  console.log('DiscussionRoomList - 사용자 role:', currentUser?.role);
  console.log('DiscussionRoomList - 사용자 grade:', currentUser?.grade);
  console.log('DiscussionRoomList - isAdmin:', isAdmin);

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
    // 권한 체크 강화
    console.log('삭제 시도 - 현재 사용자:', currentUser);
    console.log('삭제 시도 - 사용자 role:', currentUser?.role);
    console.log('삭제 시도 - 사용자 grade:', currentUser?.grade);
    console.log('삭제 시도 - isAdmin:', isAdmin);
    console.log('삭제 시도 - canManageRooms:', canManageRooms);
    
    // 권한 체크를 더 유연하게 설정
    if (!canManageRooms) {
      alert('관리자, 마스터, 매니저만 대화방을 삭제할 수 있습니다.');
      console.log('권한 부족으로 삭제 실패');
      return;
    }

    console.log('삭제 버튼 클릭됨, roomId:', roomId);
    console.log('현재 사용자 권한:', currentUser?.role);
    
    if (!window.confirm('정말로 이 대화방을 삭제하시겠습니까?\n관련된 모든 메시지도 함께 삭제됩니다.')) {
      console.log('사용자가 삭제를 취소함');
      return;
    }
    
    try {
      console.log('삭제 시작:', roomId);
      
      // 1. 관련된 모든 메시지 먼저 삭제
      const messagesQuery = query(collection(db, 'discussions'), where('roomId', '==', roomId));
      const messagesSnapshot = await getDocs(messagesQuery);
      
      console.log(`삭제할 메시지 수: ${messagesSnapshot.docs.length}개`);
      
      if (messagesSnapshot.docs.length > 0) {
        const deletePromises = messagesSnapshot.docs.map(doc => {
          console.log('메시지 삭제 중:', doc.id);
          return deleteDoc(doc.ref);
        });
        await Promise.all(deletePromises);
        console.log('메시지 삭제 완료');
      }
      
      // 2. 대화방 삭제
      console.log('대화방 삭제 중:', roomId);
      await deleteDoc(doc(db, 'discussionRooms', roomId));
      console.log('대화방 삭제 완료');
      
      // 3. 로컬 상태 강제 업데이트
      console.log('로컬 상태 업데이트 중...');
      setRooms(prevRooms => {
        const newRooms = prevRooms.filter(room => room.id !== roomId);
        console.log('업데이트된 대화방 수:', newRooms.length);
        return newRooms;
      });
      
      setMessages(prevMessages => {
        const newMessages = { ...prevMessages };
        delete newMessages[roomId];
        console.log('메시지 상태에서 제거됨:', roomId);
        return newMessages;
      });
      
      console.log('삭제 완료!');
      alert(`대화방과 관련 메시지 ${messagesSnapshot.docs.length}개가 성공적으로 삭제되었습니다.`);
      
    } catch (error) {
      console.error('대화방 삭제 중 오류 발생:', error);
      console.error('오류 상세:', error.code, error.message);
      alert(`삭제 중 오류가 발생했습니다: ${error.message}`);
    }
  };

  const handleEdit = (room) => {
    // 권한 체크
    if (!canManageRooms) {
      alert('관리자, 마스터, 매니저만 대화방을 수정할 수 있습니다.');
      return;
    }
    
    setEditRoom(room);
    setEditName(room.name);
    setEditSite(room.siteName);
    setEditPassword(room.password || '');
    setEditDialog(true);
  };

  const handleEditSave = async () => {
    if (!editRoom) return;
    
    // 권한 체크
    if (!canManageRooms) {
      alert('관리자, 마스터, 매니저만 대화방을 수정할 수 있습니다.');
      return;
    }
    
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
    try {
      console.log('PDF 내보내기 시작:', room.name);
      const msgs = messages[room.id] || [];
      
      const roomInfo = {
        name: room.name,
        siteName: room.siteName,
        createdAt: room.createdAt?.toDate?.().toLocaleDateString() || '날짜 없음',
        password: room.password ? '있음' : '없음'
      };

      const result = exportChatToPDF(msgs, roomInfo);
      
      if (result.success) {
        console.log('PDF 내보내기 완료');
        alert('PDF 파일이 성공적으로 다운로드되었습니다.');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('PDF 내보내기 중 오류:', error);
      alert(`PDF 내보내기 중 오류가 발생했습니다: ${error.message}`);
    }
  };

  // 엑셀 내보내기
  const handleExportExcel = (room) => {
    try {
      console.log('엑셀 내보내기 시작:', room.name);
      const msgs = messages[room.id] || [];
      const data = msgs.map((msg, idx) => ({
        '번호': idx + 1,
        '작성자': msg.author || '익명',
        '내용': msg.content || '',
        '첨부파일': msg.files?.map(f => f.name).join(', ') || '',
        '작성일시': msg.createdAt?.toDate?.().toLocaleString() || '',
        '파일URL': msg.files?.map(f => f.url).join(', ') || ''
      }));
      
      // 대화방 정보 시트
      const roomInfo = [
        { '항목': '대화방명', '값': room.name },
        { '항목': '현장명', '값': room.siteName },
        { '항목': '총 메시지 수', '값': msgs.length },
        { '항목': '생성일', '값': room.createdAt?.toDate?.().toLocaleDateString() || '날짜 없음' },
        { '항목': '비밀번호', '값': room.password ? '있음' : '없음' }
      ];
      
      const wb = XLSX.utils.book_new();
      
      // 대화방 정보 시트
      const wsInfo = XLSX.utils.json_to_sheet(roomInfo);
      XLSX.utils.book_append_sheet(wb, wsInfo, '대화방정보');
      
      // 채팅 내역 시트
      const wsChat = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, wsChat, '채팅내역');
      
      // 컬럼 너비 조정 (한글 텍스트 고려)
      const columnWidths = [
        { wch: 8 },  // 번호
        { wch: 15 }, // 작성자
        { wch: 50 }, // 내용
        { wch: 20 }, // 첨부파일
        { wch: 20 }, // 작성일시
        { wch: 30 }, // 파일URL
      ];
      
      wsChat['!cols'] = columnWidths;
      
      XLSX.writeFile(wb, `${room.name}_${room.siteName}_채팅내역.xlsx`);
      console.log('엑셀 내보내기 완료');
      alert('엑셀 파일이 성공적으로 다운로드되었습니다.');
    } catch (error) {
      console.error('엑셀 내보내기 중 오류:', error);
      alert(`엑셀 내보내기 중 오류가 발생했습니다: ${error.message}`);
    }
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
          const lastAuthor = roomMsgs[0]?.author || '';
          const hasPassword = !!room.password;
          return (
            <Grid item xs={12} sm={6} md={12} key={room.id}>
              <Card sx={{ borderRadius: 3, boxShadow: 4, background: 'linear-gradient(90deg, #232634 60%, #1976d2 100%)', color: '#fff', cursor: 'pointer', transition: '0.2s', '&:hover': { boxShadow: 8, background: 'linear-gradient(90deg, #1976d2 60%, #232634 100%)', transform: 'scale(1.03)' } }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box onClick={() => hasPassword ? handlePasswordEnter(room) : onSelectRoom(room)} sx={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>{room.name}</Typography>
                        <Typography variant="body2" sx={{ color: '#90caf9' }}>현장: {room.siteName}</Typography>
                        <Typography variant="body2" sx={{ mt: 1, color: '#b0b0b0' }}>글 수: {roomMsgs.length}</Typography>
                        <Typography variant="body2" sx={{ color: '#b0b0b0' }}>최근 작성자: {lastAuthor || '-'}</Typography>
                        {hasPassword ? <LockIcon fontSize="small" sx={{ color: '#ffb300', ml: 1 }} /> : <LockOpenIcon fontSize="small" sx={{ color: '#90caf9', ml: 1 }} />}
                      </Box>
                    </Box>
                    <Box>
                      <Tooltip title="PDF로 내보내기"><IconButton color="inherit" onClick={() => handleExportPDF(room)}><PictureAsPdfIcon /></IconButton></Tooltip>
                      <Tooltip title="엑셀로 내보내기"><IconButton color="inherit" onClick={() => handleExportExcel(room)}><TableViewIcon /></IconButton></Tooltip>
                      {/* 수정 버튼 - 관리자와 매니저만 */}
                      {canManageRooms && (
                        <Tooltip title="수정"><IconButton color="inherit" onClick={() => handleEdit(room)}><EditIcon /></IconButton></Tooltip>
                      )}
                      {/* 삭제 버튼 - 모든 사용자에게 표시 (권한 체크는 함수 내에서) */}
                      <Tooltip title="삭제"><IconButton color="error" onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(room.id);
                      }}><DeleteIcon /></IconButton></Tooltip>
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
          <TextField label="비밀번호(선택)" fullWidth value={editPassword} onChange={e => setEditPassword(e.target.value)} type="password" placeholder="비밀번호를 설정하거나 비워두면 비밀번호 없음" />
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