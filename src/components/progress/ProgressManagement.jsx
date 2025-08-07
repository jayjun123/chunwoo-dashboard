import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Divider,
  Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Print as PrintIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';
import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useLoading } from '../common/LoadingProvider';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useRef } from 'react';
import { exportToPDF } from '../../utils/pdfUtils';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const ProgressManagement = () => {
  const { setLoading, setLoadingMessage } = useLoading();
  const [error, setError] = useState('');
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [progressData, setProgressData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [formData, setFormData] = useState({
    siteId: '',
    date: new Date().toISOString().slice(0, 10), // 오늘 날짜로 초기화
    type: '청구',
    category: '일반',
    amount: '',
    description: '',
    isPlanned: false,
  });
  const [extraItems, setExtraItems] = useState([]);
  const [extraInput, setExtraInput] = useState('');
  const longPressTimeout = useRef(null);
  const [selectedExtra, setSelectedExtra] = useState(null);

  // 현장 목록 로드
  useEffect(() => {
    const fetchSites = async () => {
      try {
        const sitesQuery = query(collection(db, 'sites'));
        const snapshot = await getDocs(sitesQuery);
        const sitesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setSites(sitesData);
      } catch (error) {
        console.error('현장 목록 조회 실패:', error);
        setError('현장 목록을 불러오는데 실패했습니다.');
      }
    };
    fetchSites();
  }, []);

  // 선택된 현장의 기성현황 로드 (실시간 구독)
  useEffect(() => {
    if (selectedSite) {
      const progressQuery = query(
        collection(db, 'progress'),
        where('siteId', '==', selectedSite),
        orderBy('date', 'desc')
      );
      
      const unsubscribe = onSnapshot(progressQuery, (snapshot) => {
        const progressData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProgressData(progressData);
      }, (error) => {
        console.error('기성현황 조회 실패:', error);
        setError('기성현황을 불러오는데 실패했습니다.');
      });

      return () => unsubscribe();
    }
  }, [selectedSite]);

  // 기성현황 저장
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    // 필수 필드 검증
    if (!formData.date || !formData.amount || !selectedSite) {
      setError('날짜, 금액, 현장을 모두 입력해주세요.');
      return;
    }
    
    setLoading(true);
    setLoadingMessage('기성현황 저장 중...');
    try {
      const progressRef = collection(db, 'progress');
      await addDoc(progressRef, {
        ...formData,
        siteId: selectedSite,
        createdAt: new Date(),
      });
      setIsModalOpen(false);
      setFormData({
        siteId: '',
        date: new Date().toISOString().slice(0, 10), // 오늘 날짜로 초기화
        type: '청구',
        category: '일반',
        amount: '',
        description: '',
        isPlanned: false,
      });
      setError(''); // 에러 메시지 초기화
      
      // 기성현황 목록 새로고침 (실시간 구독이므로 자동으로 업데이트됨)
      console.log('기성현황 저장 완료');
    } catch (error) {
      console.error('기성현황 저장 실패:', error);
      setError('기성현황 저장에 실패했습니다.');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  // 기성현황 삭제
  const handleDelete = async (id) => {
    if (!window.confirm('정말로 이 기성현황을 삭제하시겠습니까?')) return;
    
    setLoading(true);
    setLoadingMessage('기성현황 삭제 중...');
    try {
      await deleteDoc(doc(db, 'progress', id));
      setProgressData(progressData.filter(item => item.id !== id));
    } catch (error) {
      console.error('기성현황 삭제 실패:', error);
      setError('기성현황 삭제에 실패했습니다.');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  // PDF 출력
  const handlePrint = () => {
    if (!selectedSite) {
      alert('현장을 선택해주세요.');
      return;
    }

    const selectedSiteData = sites.find(site => site.id === selectedSite);
    const filteredData = progressData.filter(item => {
      if (selectedMonth) {
        const itemMonth = item.date.substring(0, 7); // YYYY-MM 형식
        return itemMonth === selectedMonth;
      }
      return true;
    });

    const dataToExport = filteredData.map(item => ({
      '날짜': item.date,
      '유형': item.type,
      '카테고리': item.category,
      '금액': Number(item.amount || 0).toLocaleString(),
      '설명': item.description || '',
      '계획여부': item.isPlanned ? '계획' : '실적'
    }));

    const options = {
      title: `${selectedSiteData?.name || '현장'} 기성현황`,
      fileName: `기성현황_${selectedSiteData?.name || '현장'}`,
      columns: ['날짜', '유형', '카테고리', '금액', '설명', '계획여부']
    };

    const result = exportToPDF(dataToExport, options);
    
    if (result.success) {
      alert('PDF 파일이 다운로드되었습니다.');
    } else {
      alert('PDF 다운로드에 실패했습니다.');
    }
  };

  // 차트 데이터 계산 (계약금, 노무, 경비, 기타 순서)
  const contractAmount = sites.find(site => site.id === selectedSite)?.contractAmount || 0;
  const totalLabor = progressData.filter(item => item.category === '노무비').reduce((sum, item) => sum + Number(item.amount), 0);
  const totalExpense = progressData.filter(item => item.category === '경비').reduce((sum, item) => sum + Number(item.amount), 0);
  const totalEtc = progressData.filter(item => item.category === '기타' || item.category === 'RnD').reduce((sum, item) => sum + Number(item.amount), 0);

  const chartData = [
    { name: '계약금', value: contractAmount },
    { name: '노무', value: totalLabor },
    { name: '경비', value: totalExpense },
    { name: '기타', value: totalEtc },
  ];

  // 통계 데이터 계산
  const stats = {
    totalClaim: progressData
      .filter(item => item.type === '청구')
      .reduce((sum, item) => sum + Number(item.amount), 0),
    totalPayment: progressData
      .filter(item => item.type === '지급')
      .reduce((sum, item) => sum + Number(item.amount), 0),
    remainingAmount: progressData
      .filter(item => item.type === '청구')
      .reduce((sum, item) => sum + Number(item.amount), 0) -
      progressData
      .filter(item => item.type === '지급')
      .reduce((sum, item) => sum + Number(item.amount), 0),
    categoryStats: progressData.reduce((acc, curr) => {
      if (!acc[curr.category]) {
        acc[curr.category] = {
          청구: 0,
          지급: 0,
        };
      }
      acc[curr.category][curr.type] += Number(curr.amount);
      return acc;
    }, {}),
  };

  // 월별 데이터 필터링
  const filteredProgressData = progressData.filter(item => {
    const itemDate = new Date(item.date);
    const selectedDate = new Date(selectedMonth);
    return (
      itemDate.getFullYear() === selectedDate.getFullYear() &&
      itemDate.getMonth() === selectedDate.getMonth()
    );
  });

  // 월별 통계 계산
  const monthlyStats = {
    planned: filteredProgressData
      .filter(item => item.isPlanned)
      .reduce((acc, curr) => {
        if (!acc[curr.type]) {
          acc[curr.type] = 0;
        }
        acc[curr.type] += Number(curr.amount);
        return acc;
      }, {}),
    actual: filteredProgressData
      .filter(item => !item.isPlanned)
      .reduce((acc, curr) => {
        if (!acc[curr.type]) {
          acc[curr.type] = 0;
        }
        acc[curr.type] += Number(curr.amount);
        return acc;
      }, {}),
  };

  // 드래그앤드롭 핸들러
  const onDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(extraItems);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    setExtraItems(items);
  };

  // 추가사항 입력 핸들러
  const handleAddExtra = () => {
    if (extraInput.trim()) {
      setExtraItems([...extraItems, { id: Date.now(), text: extraInput.trim() }]);
      setExtraInput('');
    }
  };
  const handleExtraInputKeyDown = (e) => {
    if (e.key === 'Enter') handleAddExtra();
  };

  // 클릭/더블클릭/길게터치 핸들러
  const handleExtraClick = (id) => {
    setSelectedExtra(selectedExtra === id ? null : id);
  };
  const handleExtraDoubleClick = (item) => {
    alert(`팝업: ${item.text}`);
  };
  const handleExtraTouchStart = (item) => {
    longPressTimeout.current = setTimeout(() => handleExtraDoubleClick(item), 600);
  };
  const handleExtraTouchEnd = () => {
    clearTimeout(longPressTimeout.current);
  };

  // 현장별 누계 기성금 계산
  const getTotalProgressAmount = () => {
    if (!selectedSite || !progressData.length) return 0;
    
    return progressData
      .filter(item => item.type === '청구') // 청구만 누계로 계산
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  };

  return (
    <Box sx={{ p: 3, pt: { xs: '160px', md: 3 } }}>
      <Typography variant="h4" gutterBottom>
        기성현황 관리
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Box sx={{ bgcolor: '#181c24', borderRadius: 3, p: 3, minHeight: 600 }}>
            <Typography variant="h6" sx={{ color: '#2196f3', fontWeight: 700, mb: 2, textAlign: 'left' }}>
              진행중현장 LIST
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="현장명, 회사명, 소장명 검색"
              sx={{ mb: 2 }}
            />
            <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 600, mb: 1, textAlign: 'left' }}>
              추가사항
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="추가사항 입력"
                value={extraInput}
                onChange={e => setExtraInput(e.target.value)}
                onKeyDown={handleExtraInputKeyDown}
              />
              <IconButton color="primary" onClick={handleAddExtra}>
                <AddIcon />
              </IconButton>
            </Box>
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="extraList">
                {(provided) => (
                  <Box 
                    ref={provided.innerRef} 
                    {...provided.droppableProps} 
                    sx={{ 
                      minHeight: 40,
                      maxHeight: '300px',
                      overflowY: 'auto',
                      overflowX: 'hidden'
                    }}
                  >
                    {extraItems.map((item, idx) => (
                      <Draggable key={item.id} draggableId={item.id.toString()} index={idx}>
                        {(provided, snapshot) => (
                          <Box
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            sx={{
                              bgcolor: selectedExtra === item.id ? '#1976d2' : '#23242a',
                              color: '#fff',
                              borderRadius: 2,
                              p: 1.2,
                              mb: 1,
                              cursor: 'pointer',
                              userSelect: 'none',
                              border: selectedExtra === item.id ? '2px solid #2196f3' : '1px solid #333',
                              fontWeight: 500,
                              transition: 'background 0.2s, border 0.2s',
                            }}
                            onClick={() => handleExtraClick(item.id)}
                            onDoubleClick={() => handleExtraDoubleClick(item)}
                            onTouchStart={() => handleExtraTouchStart(item)}
                            onTouchEnd={handleExtraTouchEnd}
                          >
                            {item.text}
                          </Box>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </Box>
                )}
              </Droppable>
            </DragDropContext>
          </Box>
        </Grid>
        <Grid item xs={12} md={9}>
          <Box sx={{ bgcolor: '#23242a', borderRadius: 3, p: 3, minHeight: 600, maxWidth: 'calc(100% - 100px)', width: 'calc(100% - 100px)' }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>현장 선택</InputLabel>
                  <Select
                    value={selectedSite}
                    onChange={(e) => setSelectedSite(e.target.value)}
                    label="현장 선택"
                  >
                    {sites.map((site) => (
                      <MenuItem key={site.id} value={site.id}>
                        {site.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="month"
                  label="월 선택"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={4} sx={{ textAlign: 'right' }}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setIsModalOpen(true)}
                  disabled={!selectedSite}
                  sx={{ mr: 1 }}
                >
                  기성현황 추가
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<PdfIcon />}
                  onClick={handlePrint}
                  disabled={!selectedSite}
                >
                  PDF 출력
                </Button>
              </Grid>
            </Grid>

            {selectedSite && (
              <>
                <Grid container spacing={3} sx={{ mt: 2 }}>
                  <Grid item xs={12} md={4}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          총 청구금액
                        </Typography>
                        <Typography variant="h4" color="primary">
                          {stats.totalClaim.toLocaleString()}원
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          총 지급금액
                        </Typography>
                        <Typography variant="h4" color="secondary">
                          {stats.totalPayment.toLocaleString()}원
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          잔여금액
                        </Typography>
                        <Typography variant="h4" color={stats.remainingAmount >= 0 ? 'success.main' : 'error.main'}>
                          {stats.remainingAmount.toLocaleString()}원
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          {new Date(selectedMonth).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })} 월별 현황
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item sx={{ width: { xs: '100%', md: '50%' } }}>
                            <Paper sx={{ p: 2 }}>
                              <Typography variant="subtitle1" color="primary">
                                예정
                              </Typography>
                              <Typography variant="body2">
                                청구 예정: {monthlyStats.planned.청구?.toLocaleString() || 0}원
                              </Typography>
                              <Typography variant="body2">
                                지급 예정: {monthlyStats.planned.지급?.toLocaleString() || 0}원
                              </Typography>
                              <Typography variant="body2" color={monthlyStats.planned.청구 - monthlyStats.planned.지급 >= 0 ? 'success.main' : 'error.main'}>
                                예상 잔액: {((monthlyStats.planned.청구 || 0) - (monthlyStats.planned.지급 || 0)).toLocaleString()}원
                              </Typography>
                            </Paper>
                          </Grid>
                          <Grid item sx={{ width: { xs: '100%', md: '50%' } }}>
                            <Paper sx={{ p: 2 }}>
                              <Typography variant="subtitle1" color="primary">
                                실적
                              </Typography>
                              <Typography variant="body2">
                                청구 실적: {monthlyStats.actual.청구?.toLocaleString() || 0}원
                              </Typography>
                              <Typography variant="body2">
                                지급 실적: {monthlyStats.actual.지급?.toLocaleString() || 0}원
                              </Typography>
                              <Typography variant="body2" color={monthlyStats.actual.청구 - monthlyStats.actual.지급 >= 0 ? 'success.main' : 'error.main'}>
                                실적 잔액: {((monthlyStats.actual.청구 || 0) - (monthlyStats.actual.지급 || 0)).toLocaleString()}원
                              </Typography>
                            </Paper>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                <Paper sx={{ p: 3, mt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    기성현황 추이
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </Paper>

                <TableContainer component={Paper} sx={{ mt: 3 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>날짜</TableCell>
                        <TableCell>구분</TableCell>
                        <TableCell>카테고리</TableCell>
                        <TableCell>금액</TableCell>
                        <TableCell>설명</TableCell>
                        <TableCell>구분</TableCell>
                        <TableCell>작업</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredProgressData.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                          <TableCell>{item.type}</TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell>{Number(item.amount).toLocaleString()}원</TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>{item.isPlanned ? '예정' : '실적'}</TableCell>
                          <TableCell>
                            <IconButton
                              color="error"
                              onClick={() => handleDelete(item.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </Box>
        </Grid>
      </Grid>

      <Dialog 
        open={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#23242a',
            color: '#fff',
            '& .MuiDialogTitle-root': {
              color: '#fff',
              borderBottom: '1px solid #444',
            },
            '& .MuiDialogContent-root': {
              color: '#fff',
            },
            '& .MuiDialogActions-root': {
              borderTop: '1px solid #444',
            },
          }
        }}
      >
        <DialogTitle>기성현황 추가</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="date"
                  label="날짜"
                  value={formData.date}
                  onChange={(e) => {
                    console.log('날짜 변경:', e.target.value);
                    setFormData({ ...formData, date: e.target.value });
                  }}
                  InputLabelProps={{ shrink: true }}
                  required
                  sx={{
                    '& .MuiInputBase-input': {
                      color: '#fff',
                    },
                    '& .MuiInputLabel-root': {
                      color: '#ccc',
                    },
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: '#555',
                      },
                      '&:hover fieldset': {
                        borderColor: '#888',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#2196f3',
                      },
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <Autocomplete
                  options={['청구', '지급']}
                  value={formData.type}
                  onChange={(event, newValue) => setFormData({ ...formData, type: newValue || '' })}
                  onInputChange={(event, newInputValue) => setFormData({ ...formData, type: newInputValue })}
                  freeSolo
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="구분"
                      placeholder="선택하거나 직접 입력"
                      required
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': { borderColor: '#555' },
                          '&:hover fieldset': { borderColor: '#888' },
                          '&.Mui-focused fieldset': { borderColor: '#2196f3' }
                        },
                        '& .MuiInputLabel-root': { color: '#ccc' },
                        '& .MuiInputBase-input': { color: '#fff' }
                      }}
                    />
                  )}
                  sx={{
                    '& .MuiAutocomplete-popupIndicator': { color: '#ccc' },
                    '& .MuiAutocomplete-clearIndicator': { color: '#ccc' },
                    '& .MuiAutocomplete-option': { color: '#fff' }
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <Autocomplete
                  options={['일반', '자재비', '인건비', '기타']}
                  value={formData.category}
                  onChange={(event, newValue) => setFormData({ ...formData, category: newValue || '' })}
                  onInputChange={(event, newInputValue) => setFormData({ ...formData, category: newInputValue })}
                  freeSolo
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="카테고리"
                      placeholder="선택하거나 직접 입력"
                      required
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': { borderColor: '#555' },
                          '&:hover fieldset': { borderColor: '#888' },
                          '&.Mui-focused fieldset': { borderColor: '#2196f3' }
                        },
                        '& .MuiInputLabel-root': { color: '#ccc' },
                        '& .MuiInputBase-input': { color: '#fff' }
                      }}
                    />
                  )}
                  sx={{
                    '& .MuiAutocomplete-popupIndicator': { color: '#ccc' },
                    '& .MuiAutocomplete-clearIndicator': { color: '#ccc' },
                    '& .MuiAutocomplete-option': { color: '#fff' }
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="number"
                  label="금액"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  sx={{
                    '& .MuiInputBase-input': {
                      color: '#fff',
                    },
                    '& .MuiInputLabel-root': {
                      color: '#ccc',
                    },
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: '#555',
                      },
                      '&:hover fieldset': {
                        borderColor: '#888',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#2196f3',
                      },
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="설명"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  multiline
                  rows={3}
                  sx={{
                    '& .MuiInputBase-input': {
                      color: '#fff',
                    },
                    '& .MuiInputLabel-root': {
                      color: '#ccc',
                    },
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: '#555',
                      },
                      '&:hover fieldset': {
                        borderColor: '#888',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#2196f3',
                      },
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: '#ccc' }}>구분</InputLabel>
                  <Select
                    value={formData.isPlanned ? '예정' : '실적'}
                    onChange={(e) => setFormData({ ...formData, isPlanned: e.target.value === '예정' })}
                    label="구분"
                    required
                    sx={{
                      color: '#fff',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#555',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#888',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#2196f3',
                      },
                      '& .MuiSvgIcon-root': {
                        color: '#ccc',
                      },
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          bgcolor: '#23242a',
                          '& .MuiMenuItem-root': {
                            color: '#fff',
                            '&:hover': {
                              bgcolor: '#333',
                            },
                          },
                        },
                      },
                    }}
                  >
                    <MenuItem value="실적">실적</MenuItem>
                    <MenuItem value="예정">예정</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setIsModalOpen(false)}
            sx={{ color: '#ccc' }}
          >
            취소
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            startIcon={<SaveIcon />}
            sx={{
              bgcolor: '#2196f3',
              '&:hover': {
                bgcolor: '#1976d2',
              },
            }}
          >
            저장
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProgressManagement; 