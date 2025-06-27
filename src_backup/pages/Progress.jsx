import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  LinearProgress,
  Chip,
  useTheme,
  useMediaQuery,
  MenuItem,
  Checkbox,
  ListItemText,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Timeline as TimelineIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  CloudDownload as CloudDownloadIcon,
} from '@mui/icons-material';
import { format, addMonths, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { PieChart, Pie, Cell } from 'recharts';
import GisungList from '../components/GisungList';
import GisungStatusTable from '../components/GisungStatusTable';
import GisungStatusPage from '../components/GisungStatusPage';
import * as XLSX from 'xlsx';
import Cost from './Cost';

const Progress = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [progressList, setProgressList] = useState([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    contractAmount: '',
    payments: [{ label: '1차 기성', amount: '' }],
  });
  const [tab, setTab] = useState('chart');
  const [statusView, setStatusView] = useState('month'); // 'month' or 'site'
  // 월 상태 관리
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  // 월 이동 함수
  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));
  const handleThisMonth = () => setCurrentMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  // 월 텍스트
  const monthText = `${currentMonth.getFullYear()}년 ${String(currentMonth.getMonth() + 1).padStart(2, '0')}월`;
  const [sites, setSites] = useState([]);
  // 현장별 검색 상태 추가
  const [selectedSites, setSelectedSites] = useState([]);

  useEffect(() => {
    fetchProgress();
    fetchSites();
  }, []);

  const fetchProgress = async () => {
    try {
      const q = query(collection(db, 'progress'), orderBy('name'));
      const snapshot = await getDocs(q);
      setProgressList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSites = async () => {
    const snapshot = await getDocs(collection(db, 'sites'));
    setSites(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const handleOpen = (item = null) => {
    if (item) {
      setSelected(item);
      setFormData({
        name: item.name,
        contractAmount: item.contractAmount,
        payments: item.payments || [{ label: '1차 기성', amount: '' }],
      });
    } else {
      setSelected(null);
      setFormData({
        name: '',
        contractAmount: '',
        payments: [{ label: '1차 기성', amount: '' }],
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelected(null);
  };

  const handleChangePayment = (idx, key, value) => {
    setFormData(prev => ({
      ...prev,
      payments: prev.payments.map((p, i) => i === idx ? { ...p, [key]: value } : p)
    }));
  };

  const handleAddPayment = () => {
    setFormData(prev => ({
      ...prev,
      payments: [...prev.payments, { label: `${prev.payments.length + 1}차 기성`, amount: '' }]
    }));
  };

  const handleRemovePayment = (idx) => {
    setFormData(prev => ({
      ...prev,
      payments: prev.payments.filter((_, i) => i !== idx)
    }));
  };

  const handleSubmit = async () => {
    try {
      if (selected) {
        await updateDoc(doc(db, 'progress', selected.id), formData);
      } else {
        await addDoc(collection(db, 'progress'), formData);
      }
      handleClose();
      fetchProgress();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'progress', id));
        fetchProgress();
      } catch (e) {
        console.error(e);
      }
    }
  };

  // 계산
  const getTotalPayment = (payments) => {
    return payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  };

  // 전체 진행률 계산
  const totalProgress = Math.round(
    progressList.reduce((sum, item) => sum + getTotalPayment(item.payments || []), 0) / (progressList.length || 1)
  );
  // 도넛 차트 데이터
  const donutData = [
    { name: '진행', value: totalProgress },
    { name: '잔여', value: 100 - totalProgress }
  ];
  const COLORS = ['#1976d2', '#232733'];

  // 엑셀 다운로드 함수 구현
  const handleExcelDownload = () => {
    // 차트 데이터 준비
    const chartData = progressList
      .filter(row => selectedSites.length === 0 || selectedSites.includes(row.name))
      .map(row => {
        const contract = parseFloat(row.contractAmount) || 0;
        const totalPayment = getTotalPayment(row.payments || []);
        return {
          '현장명': row.name,
          '계약금액': contract,
          ...Object.fromEntries((row.payments || []).map((p, i) => [p.label, parseFloat(p.amount) || 0])),
          '잔액': contract - totalPayment,
          '진행률': `${Math.round((totalPayment / contract) * 100)}%`
        };
      });

    // 워크북 생성
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(chartData);
    XLSX.utils.book_append_sheet(wb, ws, '기성현황');

    // 파일 저장
    XLSX.writeFile(wb, `기성현황_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // 현장별 검색 UI 개선
  const SiteSearch = () => (
    <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
      <TextField
        select
        label="현장 검색"
        SelectProps={{
          multiple: true,
          renderValue: (selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selected.map((value) => (
                <Chip key={value} label={value} size="small" />
              ))}
            </Box>
          )
        }}
        value={selectedSites}
        onChange={e => setSelectedSites(e.target.value)}
        sx={{ minWidth: 300 }}
      >
        {sites.map(site => (
          <MenuItem key={site.id} value={site.name}>
            <Checkbox checked={selectedSites.includes(site.name)} />
            <ListItemText primary={site.name} />
          </MenuItem>
        ))}
      </TextField>
      <Button 
        variant="contained" 
        onClick={handleExcelDownload}
        startIcon={<CloudDownloadIcon />}
      >
        엑셀로 저장
      </Button>
    </Box>
  );

  return (
    <Box sx={{ p: isMobile ? 2 : 3, width: '100vw', maxWidth: '100vw', ml: 'calc(-50vw + 50%)', mr: 'calc(-50vw + 50%)' }}>
      {/* 대분류: 월별/현장별 */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <Button variant={statusView === 'month' ? 'contained' : 'outlined'} onClick={() => setStatusView('month')}>월별</Button>
        <Button variant={statusView === 'site' ? 'contained' : 'outlined'} onClick={() => setStatusView('site')}>현장별</Button>
        <Box sx={{ flex: 1 }} />
        {statusView === 'month' && (
          <>
            <Button size="small" onClick={handlePrevMonth}>이전달</Button>
            <Button size="small" onClick={handleThisMonth}>이번달</Button>
            <Button size="small" onClick={handleNextMonth}>다음달</Button>
            <Typography sx={{ ml: 2, fontWeight: 700 }}>{monthText}</Typography>
          </>
        )}
      </Box>
      {/* 소분류: 기성관리/기성현황/지출 */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <Button variant={tab === 'chart' ? 'contained' : 'outlined'} onClick={() => setTab('chart')}>기성관리</Button>
        <Button variant={tab === 'gisung' ? 'contained' : 'outlined'} onClick={() => setTab('gisung')}>기성현황</Button>
        <Button variant={tab === 'cost' ? 'contained' : 'outlined'} onClick={() => setTab('cost')}>지출</Button>
      </Box>
      {/* 월별/현장별 + 소분류 연동 분기 */}
      {statusView === 'month' && tab === 'chart' && (
        // 월별+기성관리 차트/데이터
        <Grid container spacing={2} alignItems="stretch" sx={{ mb: 3, width: '100vw', maxWidth: '100vw', margin: 0 }}>
          {/* 왼쪽: 카드 세로배치, 가로폭 넓게 */}
          <Grid item xs={12} md={4}>
            <Grid container spacing={2} direction="column" sx={{ height: '100%' }}>
              <Grid item>
                <Card sx={{ minWidth: 220, mb: 2, background: '#232733' }}>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      전체 진행률
                    </Typography>
                    <Typography variant="h4">
                      {totalProgress}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={totalProgress}
                      sx={{ mt: 1 }}
                    />
                  </CardContent>
                </Card>
              </Grid>
              <Grid item>
                <Card sx={{ minWidth: 220, mb: 2, background: '#232733' }}>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      완료된 작업
                    </Typography>
                    <Typography variant="h4">
                      {progressList.filter(item => getTotalPayment(item.payments || []) === parseFloat(item.contractAmount)).length}개
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item>
                <Card sx={{ minWidth: 220, background: '#232733' }}>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      진행중인 작업
                    </Typography>
                    <Typography variant="h4">
                      {progressList.filter(item => getTotalPayment(item.payments || []) < parseFloat(item.contractAmount)).length}개
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
          {/* 오른쪽: 차트, 가로로 꽉차게 */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>{monthText} 기성 및 지출 현황</Typography>
              <ResponsiveContainer width="100%" height={320} minWidth={400} minHeight={200}>
                <BarChart
                  data={progressList.map(row => {
                    const contract = parseFloat(row.contractAmount) || 0;
                    return {
                      name: row.name,
                      ...Object.fromEntries((row.payments || []).map((p, i) => [p.label, parseFloat(p.amount) || 0])),
                      잔액: contract - getTotalPayment(row.payments || []),
                    };
                  })}
                  margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                >
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {progressList[0]?.payments?.map((p, idx) => (
                    <Bar key={p.label} dataKey={p.label} stackId="a" fill={['#1976d2', '#90caf9', '#64b5f6', '#42a5f5', '#2196f3'][idx % 5]}>
                      <LabelList dataKey={p.label} position="top" formatter={v => v ? v.toLocaleString() + '원' : ''} />
                    </Bar>
                  ))}
                  <Bar dataKey="잔액" stackId="a" fill="#e0e0e0">
                    <LabelList dataKey="잔액" position="top" formatter={v => v ? v.toLocaleString() + '원' : ''} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}
      {statusView === 'site' && tab === 'chart' && (
        // 현장별+기성관리 차트/데이터(선택된 현장만)
        <Grid container spacing={2} alignItems="stretch" sx={{ mb: 3, width: '100vw', maxWidth: '100vw', margin: 0 }}>
          {/* 왼쪽: 카드 세로배치, 가로폭 넓게 */}
          <Grid item xs={12} md={4}>
            <Grid container spacing={2} direction="column" sx={{ height: '100%' }}>
              <Grid item>
                <Card sx={{ minWidth: 220, mb: 2, background: '#232733' }}>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      전체 진행률
                    </Typography>
                    <Typography variant="h4">
                      {totalProgress}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={totalProgress}
                      sx={{ mt: 1 }}
                    />
                  </CardContent>
                </Card>
              </Grid>
              <Grid item>
                <Card sx={{ minWidth: 220, mb: 2, background: '#232733' }}>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      완료된 작업
                    </Typography>
                    <Typography variant="h4">
                      {progressList.filter(item => getTotalPayment(item.payments || []) === parseFloat(item.contractAmount)).length}개
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item>
                <Card sx={{ minWidth: 220, background: '#232733' }}>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      진행중인 작업
                    </Typography>
                    <Typography variant="h4">
                      {progressList.filter(item => getTotalPayment(item.payments || []) < parseFloat(item.contractAmount)).length}개
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
          {/* 오른쪽: 차트, 가로로 꽉차게 */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>현장별 기성/지출 현황</Typography>
              <ResponsiveContainer width="100%" height={320} minWidth={400} minHeight={200}>
                <BarChart
                  data={progressList.filter(row => selectedSites.length === 0 || selectedSites.includes(row.name)).map(row => {
                    const contract = parseFloat(row.contractAmount) || 0;
                    return {
                      name: row.name,
                      ...Object.fromEntries((row.payments || []).map((p, i) => [p.label, parseFloat(p.amount) || 0])),
                      잔액: contract - getTotalPayment(row.payments || []),
                    };
                  })}
                  margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                >
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {progressList[0]?.payments?.map((p, idx) => (
                    <Bar key={p.label} dataKey={p.label} stackId="a" fill={['#1976d2', '#90caf9', '#64b5f6', '#42a5f5', '#2196f3'][idx % 5]}>
                      <LabelList dataKey={p.label} position="top" formatter={v => v ? v.toLocaleString() + '원' : ''} />
                    </Bar>
                  ))}
                  <Bar dataKey="잔액" stackId="a" fill="#e0e0e0">
                    <LabelList dataKey="잔액" position="top" formatter={v => v ? v.toLocaleString() + '원' : ''} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}
      {statusView === 'month' && tab === 'gisung' && (
        <GisungStatusPage 
          viewType="month" 
          currentMonth={currentMonth}
          monthText={monthText}
        />
      )}
      {statusView === 'site' && tab === 'gisung' && (
        <GisungStatusPage 
          viewType="site" 
          selectedSites={selectedSites}
        />
      )}
      {statusView === 'month' && tab === 'cost' && (
        <Cost 
          viewType="month"
          currentMonth={currentMonth}
          monthText={monthText}
        />
      )}
      {statusView === 'site' && tab === 'cost' && (
        <Cost 
          viewType="site"
          selectedSites={selectedSites}
        />
      )}

      {/* 등록/수정 다이얼로그 */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{selected ? '기성 수정' : '기성 등록'}</DialogTitle>
        <DialogContent>
          {/* 현장명(공사명) 오토컴플릿/드롭다운: 현장관리 데이터 연동 */}
          <TextField
            select
            label="공사명"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            fullWidth
            sx={{ mb: 2 }}
          >
            {sites.map(site => (
              <MenuItem key={site.id} value={site.name}>{site.name}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="계약금액"
            value={formData.contractAmount}
            onChange={e => setFormData({ ...formData, contractAmount: e.target.value.replace(/[^0-9]/g, '') })}
            fullWidth
            sx={{ mb: 2 }}
          />
          {formData.payments.map((p, idx) => (
            <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                label={p.label}
                value={p.amount}
                onChange={e => handleChangePayment(idx, 'amount', e.target.value.replace(/[^0-9]/g, ''))}
                fullWidth
              />
              <IconButton onClick={() => handleRemovePayment(idx)} disabled={formData.payments.length === 1}>
                <DeleteIcon />
              </IconButton>
            </Box>
          ))}
          <Button onClick={handleAddPayment} startIcon={<AddIcon />} sx={{ mt: 1 }}>
            차수 추가
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>취소</Button>
          <Button onClick={handleSubmit} variant="contained">저장</Button>
        </DialogActions>
      </Dialog>

      {/* 현장별 검색 추가 */}
      {statusView === 'site' && (
        <SiteSearch />
      )}
    </Box>
  );
};

export default Progress; 