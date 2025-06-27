import React, { useEffect, useState, useMemo } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  TextField, 
  Grid, 
  InputAdornment, 
  IconButton, 
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Alert,
  Snackbar
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CommentIcon from '@mui/icons-material/Comment';
import AddCommentIcon from '@mui/icons-material/AddComment';
import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import LinearProgress from '@mui/material/LinearProgress';
import { useAuth } from '../contexts/AuthContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function isInMonth(site, year, month) {
  if (!site.startDate || !site.endDate) return false;
  const s = new Date(site.startDate);
  const e = new Date(site.endDate);
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  return !(e < first || s > last);
}

export default function ImportantSite() {
  const [sites, setSites] = useState([]);
  const [search, setSearch] = useState('');
  const [remarks, setRemarks] = useState({}); // { siteId: remark }
  const [editingProgress, setEditingProgress] = useState({}); // { siteId: true/false }
  const [progressInput, setProgressInput] = useState({}); // { siteId: 값 }
  const [comments, setComments] = useState({}); // { siteId: [comments] }
  const [commentDialog, setCommentDialog] = useState({ open: false, siteId: null });
  const [newComment, setNewComment] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const { currentUser } = useAuth();
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  useEffect(() => {
    const fetchSites = async () => {
      const snapshot = await getDocs(collection(db, 'sites'));
      setSites(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchSites();
  }, []);

  // 댓글 가져오기
  useEffect(() => {
    const fetchComments = async () => {
      try {
        const commentsSnapshot = await getDocs(collection(db, 'siteComments'));
        const commentsData = {};
        commentsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (!commentsData[data.siteId]) {
            commentsData[data.siteId] = [];
          }
          commentsData[data.siteId].push({ id: doc.id, ...data });
        });
        setComments(commentsData);
      } catch (error) {
        console.error('댓글 로딩 실패:', error);
      }
    };
    fetchComments();
  }, []);

  // 공사기간이 현재 월에 포함된 현장만
  const filteredSites = useMemo(() =>
    sites.filter(site => isInMonth(site, year, month) &&
      (site.name?.includes(search) || site.manager?.includes(search) || site.address?.includes(search) || !search)
    ), [sites, year, month, search]);

  const handleRemarkChange = (id, value) => {
    setRemarks(prev => ({ ...prev, [id]: value }));
  };

  // 댓글 추가
  const handleAddComment = async () => {
    if (!newComment.trim() || !commentDialog.siteId) return;
    
    try {
      await addDoc(collection(db, 'siteComments'), {
        siteId: commentDialog.siteId,
        content: newComment,
        userName: currentUser?.displayName || currentUser?.email || '사용자',
        userId: currentUser?.uid || 'anonymous',
        timestamp: serverTimestamp()
      });
      
      setNewComment('');
      setCommentDialog({ open: false, siteId: null });
      setSnackbar({ open: true, message: '댓글이 추가되었습니다.', severity: 'success' });
      
      // 댓글 목록 새로고침
      const commentsSnapshot = await getDocs(collection(db, 'siteComments'));
      const commentsData = {};
      commentsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (!commentsData[data.siteId]) {
          commentsData[data.siteId] = [];
        }
        commentsData[data.siteId].push({ id: doc.id, ...data });
      });
      setComments(commentsData);
    } catch (error) {
      console.error('댓글 추가 실패:', error);
      setSnackbar({ open: true, message: '댓글 추가에 실패했습니다.', severity: 'error' });
    }
  };

  // 차트 데이터 생성 함수
  const getChartData = (site) => {
    const contract = Number(site.contractAmount) || 0;
    const progress = Number(site.progressAmount) || 0; // 기성금액
    const expense = Number(site.expense) || 0;
    const labor = Number(site.labor) || 0;
    const etc = Number(site.etc) || 0;
    return {
      labels: ['계약금', '기성', '지출', '노무', '기타'],
      datasets: [
        {
          label: '금액(만원)',
          data: [contract, progress, expense, labor, etc],
          backgroundColor: [
            '#1976d2', // 계약금 - 파랑
            '#43e97b', // 기성 - 연두
            '#ef5350', // 지출 - 빨강
            '#ffd600', // 노무 - 노랑
            '#a084e8'  // 기타 - 보라
          ],
          borderRadius: 8,
          barPercentage: 0.7,
          categoryPercentage: 0.6
        }
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
      title: { display: false }
    },
    scales: {
      x: {
        grid: { color: '#333' },
        ticks: { color: '#bbb', font: { weight: 700 } }
      },
      y: {
        grid: { color: '#222' },
        ticks: { color: '#bbb', font: { weight: 700 } }
      }
    }
  };

  const handleSaveProgress = async (site) => {
    const contract = Number(site.contractAmount) || 0;
    let percent = progressInput[site.id];
    // 빈값 또는 NaN 방지
    if (percent === '' || isNaN(percent)) percent = 0;
    const newTotalProgress = contract * (percent / 100);

    try {
      // Firestore 업데이트
      await updateDoc(doc(db, 'sites', site.id), { totalProgress: newTotalProgress });
      // Firestore에서 최신 데이터 다시 불러오기(권장)
      const snapshot = await getDocs(collection(db, 'sites'));
      setSites(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      // 입력모드 해제 및 입력값 초기화
      setEditingProgress(prev => ({ ...prev, [site.id]: false }));
      setProgressInput(prev => ({ ...prev, [site.id]: undefined }));
      setSnackbar({ open: true, message: '진행률이 저장되었습니다.', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: '저장에 실패했습니다.', severity: 'error' });
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: '#101624', p: { xs: 1, md: 4 } }}>
      {/* 상단 검색창 */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <TextField
          size="small"
          placeholder="현장명, 소장, 주소 검색"
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton>
                  <SearchIcon />
                </IconButton>
              </InputAdornment>
            )
          }}
          sx={{ width: 320, bgcolor: '#232b3b', borderRadius: 2, input: { color: '#fff' } }}
        />
      </Box>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          {/* 카드+차트+비고 한 줄 배치 */}
          <div style={{ width: '100%' }}>
            {filteredSites.length === 0 && (
              <Typography sx={{ color: '#bbb', mt: 4 }}>해당 월에 포함된 현장이 없습니다.</Typography>
            )}
            {filteredSites.map(site => (
              <Paper key={site.id} sx={{ mb: 4, borderRadius: 4, boxShadow: 6, bgcolor: '#181f2e', color: '#fff', display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'stretch', minHeight: 220, p: 0, overflow: 'hidden' }}>
                {/* 카드 */}
                <Box sx={{ flex: 2, minWidth: 260, p: 3, display: 'flex', flexDirection: 'column', gap: 1, borderRight: { md: '2px solid #232b3b' }, justifyContent: 'flex-start', alignItems: 'flex-start' }}>
                  <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, color: '#90caf9', textAlign: 'left', width: '100%' }}>{site.name}</Typography>
                  <Typography sx={{ fontSize: 16, color: '#43e97b', fontWeight: 700, textAlign: 'left', width: '100%' }}>계약구분: {site.contractType}</Typography>
                  <Typography sx={{ fontSize: 15, textAlign: 'left', width: '100%' }}>주소: {site.address}</Typography>
                  <Typography sx={{ fontSize: 15, textAlign: 'left', width: '100%' }}>공사기간: {site.startDate} ~ {site.endDate}</Typography>
                  <Typography sx={{ fontSize: 15, textAlign: 'left', width: '100%' }}>소장: {site.manager}</Typography>
                  <Typography sx={{ fontSize: 15, textAlign: 'left', width: '100%' }}>계약금: {site.contractAmount}</Typography>
                  <Typography sx={{ fontSize: 15, textAlign: 'left', width: '100%' }}>시공팀: {site.team}</Typography>
                  
                  {/* 댓글 개수 표시 */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <CommentIcon sx={{ color: '#ffd600', fontSize: 20 }} />
                    <Typography sx={{ color: '#ffd600', fontSize: 14 }}>
                      {comments[site.id]?.length || 0}개의 의견
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button variant="contained" color="primary" sx={{ borderRadius: 2, fontWeight: 700 }} onClick={() => window.open(`/progress?siteId=${site.id}`)}>기성관리</Button>
                    <Button variant="contained" color="success" sx={{ borderRadius: 2, fontWeight: 700 }} onClick={() => window.open(`/safety?siteId=${site.id}`)}>안전관리</Button>
                    <Button variant="contained" color="secondary" sx={{ borderRadius: 2, fontWeight: 700 }} onClick={() => window.open(`/discussions?siteId=${site.id}`)}>토론</Button>
                    <Button 
                      variant="outlined" 
                      color="warning" 
                      sx={{ borderRadius: 2, fontWeight: 700, borderColor: '#ffd600', color: '#ffd600' }}
                      startIcon={<AddCommentIcon />}
                      onClick={() => setCommentDialog({ open: true, siteId: site.id })}
                    >
                      의견남기기
                    </Button>
                  </Box>
                </Box>
                {/* 차트+진행률 */}
                <Box sx={{ flex: 1.8, minWidth: 270, maxWidth: 420, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', bgcolor: '#151b28', borderRight: { md: '2px solid #232b3b' }, p: 2, height: '350px' }}>
                  {/* 공사진행률 가로 차트 */}
                  <Box sx={{ width: '90%', mb: 2 }}>
                    <Typography sx={{ color: '#43e97b', fontWeight: 700, fontSize: 15, mb: 0.5 }}>공사진행률</Typography>
                    {(() => {
                      const contract = Number(site.contractAmount) || 0;
                      const percent = editingProgress[site.id]
                        ? (progressInput[site.id] ?? 0)
                        : (contract > 0 ? Math.round((Number(site.totalProgress) / contract) * 100) : 0);
                      return (
                        <LinearProgress
                          variant="determinate"
                          value={percent}
                          sx={{ height: 18, borderRadius: 6, bgcolor: '#232b3b', '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #43e97b 0%, #38f9d7 100%)' } }}
                        />
                      );
                    })()}
                  </Box>
                  {/* 진행률 바(숫자 입력) */}
                  {(() => {
                    const contract = Number(site.contractAmount) || 0;
                    const isEditing = editingProgress[site.id];
                    const percent = isEditing
                      ? (progressInput[site.id] ?? 0)
                      : (contract > 0 ? Math.round((Number(site.totalProgress) / contract) * 100) : 0);
                    return (
                      <Box sx={{ width: '90%', mb: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
                        {isEditing ? (
                          <>
                            <TextField
                              type="number"
                              size="small"
                              autoFocus
                              inputProps={{ min: 0, max: 100, style: { color: '#43e97b', fontWeight: 700, fontSize: 15, textAlign: 'center' } }}
                              value={progressInput[site.id] ?? percent}
                              onChange={e => {
                                let v = e.target.value;
                                if (v === '') v = '';
                                else v = Math.max(0, Math.min(100, Number(v)));
                                setProgressInput(prev => ({ ...prev, [site.id]: v }));
                              }}
                              sx={{ width: 90, bgcolor: '#232b3b', borderRadius: 1, mr: 1 }}
                            />
                            <Button
                              variant="contained"
                              color="primary"
                              size="small"
                              sx={{ minWidth: 60, fontWeight: 700, borderRadius: 2, bgcolor: '#43e97b', color: '#222', '&:hover': { bgcolor: '#38f9d7' } }}
                              onClick={() => handleSaveProgress(site)}
                            >저장</Button>
                          </>
                        ) : (
                          <Typography
                            sx={{ color: '#43e97b', fontWeight: 700, fontSize: 15, mb: 0.5, cursor: 'pointer', userSelect: 'none' }}
                            onDoubleClick={() => {
                              setEditingProgress(prev => ({ ...prev, [site.id]: true }));
                              setProgressInput(prev => ({ ...prev, [site.id]: percent }));
                            }}
                          >
                            {`공사 진행률: ${percent}%`}
                          </Typography>
                        )}
                      </Box>
                    );
                  })()}
                  {/* 차트 */}
                  <Box sx={{ width: '100%', height: '300px', mt: '50px' }}>
                    <Bar
                      data={getChartData(site)}
                      options={{
                        ...chartOptions,
                        maintainAspectRatio: false,
                      }}
                      style={{ height: '100%' }}
                    />
                  </Box>
                </Box>
                {/* 비고 입력란 */}
                <Box sx={{ flex: 1.2, minWidth: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', bgcolor: '#232b3b', p: 3 }}>
                  <Typography sx={{ color: '#ffd600', fontWeight: 700, fontSize: 18, mb: 1 }}>비고</Typography>
                  <TextField
                    multiline
                    minRows={10}
                    fullWidth
                    placeholder="비고를 입력하세요"
                    value={remarks[site.id] || ''}
                    onChange={e => handleRemarkChange(site.id, e.target.value)}
                    sx={{ bgcolor: '#1a2236', borderRadius: 2, input: { color: '#fff' }, textarea: { color: '#fff' } }}
                  />
                </Box>
              </Paper>
            ))}
          </div>
        </Grid>
      </Grid>

      {/* 댓글 추가 다이얼로그 */}
      <Dialog 
        open={commentDialog.open} 
        onClose={() => setCommentDialog({ open: false, siteId: null })}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { bgcolor: '#232b3b', color: '#fff' }
        }}
      >
        <DialogTitle>현장 의견 남기기</DialogTitle>
        <DialogContent>
          <TextField
            multiline
            rows={4}
            fullWidth
            placeholder="현장에 대한 의견을 입력하세요"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            sx={{ 
              mt: 2,
              bgcolor: '#1a2236', 
              borderRadius: 2, 
              textarea: { color: '#fff' },
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: '#444' },
                '&:hover fieldset': { borderColor: '#666' },
                '&.Mui-focused fieldset': { borderColor: '#ffd600' }
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setCommentDialog({ open: false, siteId: null })}
            sx={{ color: '#bbb' }}
          >
            취소
          </Button>
          <Button 
            onClick={handleAddComment}
            variant="contained"
            sx={{ 
              bgcolor: '#ffd600', 
              color: '#222',
              '&:hover': { bgcolor: '#ffed4e' }
            }}
          >
            의견 추가
          </Button>
        </DialogActions>
      </Dialog>

      {/* 알림 스낵바 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 