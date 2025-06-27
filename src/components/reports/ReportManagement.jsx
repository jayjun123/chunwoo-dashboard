import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  MenuItem,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Download as DownloadIcon,
  PictureAsPdf as PdfIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  Timeline as TimelineIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
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
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const ReportManagement = () => {
  const { setLoading, setLoadingMessage } = useLoading();
  const [error, setError] = useState('');
  const [reports, setReports] = useState([]);
  const [selectedTab, setSelectedTab] = useState(0);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });
  const [reportType, setReportType] = useState('daily');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    type: 'daily',
    content: '',
    date: '',
  });

  // 보고서 목록 로드
  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      setLoadingMessage('보고서 데이터를 불러오는 중...');
      try {
        const reportsQuery = query(
          collection(db, 'reports'),
          where('type', '==', reportType),
          orderBy('date', 'desc')
        );
        const snapshot = await getDocs(reportsQuery);
        const reportsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setReports(reportsData);
      } catch (error) {
        console.error('보고서 조회 실패:', error);
        setError('보고서를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
        setLoadingMessage('');
      }
    };
    fetchReports();
  }, [reportType]);

  // 보고서 저장
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoadingMessage('보고서 저장 중...');
    try {
      const reportsRef = collection(db, 'reports');
      await addDoc(reportsRef, {
        ...formData,
        createdAt: new Date(),
      });
      setIsModalOpen(false);
      setFormData({
        title: '',
        type: 'daily',
        content: '',
        date: '',
      });
      // 보고서 목록 새로고침
      const reportsQuery = query(
        collection(db, 'reports'),
        where('type', '==', reportType),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(reportsQuery);
      const reportsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setReports(reportsData);
    } catch (error) {
      console.error('보고서 저장 실패:', error);
      setError('보고서 저장에 실패했습니다.');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  // 보고서 삭제
  const handleDelete = async (id) => {
    if (!window.confirm('정말로 이 보고서를 삭제하시겠습니까?')) return;
    
    setLoading(true);
    setLoadingMessage('보고서 삭제 중...');
    try {
      await deleteDoc(doc(db, 'reports', id));
      setReports(reports.filter(item => item.id !== id));
    } catch (error) {
      console.error('보고서 삭제 실패:', error);
      setError('보고서 삭제에 실패했습니다.');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  // PDF 출력
  const handlePrint = (report) => {
    // PDF 생성 및 출력 로직
    window.print();
  };

  // 차트 데이터 계산
  const chartData = reports.reduce((acc, curr) => {
    const date = new Date(curr.date).toLocaleDateString();
    const existingData = acc.find(item => item.date === date);
    
    if (existingData) {
      existingData.count += 1;
    } else {
      acc.push({
        date,
        count: 1,
      });
    }
    return acc;
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          보고서 관리
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIsModalOpen(true)}
        >
          새 보고서 작성
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel>보고서 유형</InputLabel>
            <Select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              label="보고서 유형"
            >
              <MenuItem value="daily">일일 보고서</MenuItem>
              <MenuItem value="weekly">주간 보고서</MenuItem>
              <MenuItem value="monthly">월간 보고서</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            type="date"
            label="시작일"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            type="date"
            label="종료일"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
      </Grid>

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={selectedTab}
          onChange={(e, newValue) => setSelectedTab(newValue)}
          variant="fullWidth"
        >
          <Tab icon={<BarChartIcon />} label="보고서 현황" />
          <Tab icon={<PieChartIcon />} label="유형별 분석" />
          <Tab icon={<TimelineIcon />} label="추이 분석" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {selectedTab === 0 && (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#8884d8" name="보고서 수" />
              </BarChart>
            </ResponsiveContainer>
          )}

          {selectedTab === 1 && (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: '일일', value: reports.filter(r => r.type === 'daily').length },
                    { name: '주간', value: reports.filter(r => r.type === 'weekly').length },
                    { name: '월간', value: reports.filter(r => r.type === 'monthly').length },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}

          {selectedTab === 2 && (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#8884d8" name="보고서 수" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Box>
      </Paper>

      <TableContainer component={Paper} sx={{ mt: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>제목</TableCell>
              <TableCell>유형</TableCell>
              <TableCell>작성일</TableCell>
              <TableCell>작업</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reports.map((report) => (
              <TableRow key={report.id}>
                <TableCell>{report.title}</TableCell>
                <TableCell>
                  {report.type === 'daily' ? '일일' :
                   report.type === 'weekly' ? '주간' : '월간'}
                </TableCell>
                <TableCell>{new Date(report.date).toLocaleDateString()}</TableCell>
                <TableCell>
                  <IconButton
                    color="primary"
                    onClick={() => handlePrint(report)}
                  >
                    <PdfIcon />
                  </IconButton>
                  <IconButton
                    color="error"
                    onClick={() => handleDelete(report.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>새 보고서 작성</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="제목"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>보고서 유형</InputLabel>
                  <Select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    label="보고서 유형"
                    required
                  >
                    <MenuItem value="daily">일일 보고서</MenuItem>
                    <MenuItem value="weekly">주간 보고서</MenuItem>
                    <MenuItem value="monthly">월간 보고서</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="date"
                  label="작성일"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="내용"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  multiline
                  rows={10}
                  required
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsModalOpen(false)}>
            취소
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            startIcon={<SaveIcon />}
          >
            저장
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReportManagement; 