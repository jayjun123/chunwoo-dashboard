import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Tabs,
  Tab,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
} from '@mui/material';
import {
  LocationOn,
  CalendarToday,
  People,
  Description,
  SafetyCheck,
  Assessment,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';

const SiteDetail = () => {
  const { siteId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [site, setSite] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [workers, setWorkers] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [safetyChecks, setSafetyChecks] = useState([]);
  const [progress, setProgress] = useState([]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    loadSiteData();
  }, [siteId]);

  const loadSiteData = async () => {
    try {
      // 현장 기본 정보 로드
      const siteDoc = await getDoc(doc(db, 'sites', siteId));
      if (!siteDoc.exists()) {
        setError('현장을 찾을 수 없습니다.');
        setLoading(false);
        return;
      }
      setSite({ id: siteDoc.id, ...siteDoc.data() });

      // 작업자 목록 로드
      const workersQuery = query(collection(db, 'workers'), where('siteId', '==', siteId));
      const workersSnapshot = await getDocs(workersQuery);
      setWorkers(workersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // 일정 목록 로드
      const schedulesQuery = query(collection(db, 'schedules'), where('siteId', '==', siteId));
      const schedulesSnapshot = await getDocs(schedulesQuery);
      setSchedules(schedulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // 문서 목록 로드
      const documentsQuery = query(collection(db, 'documents'), where('siteId', '==', siteId));
      const documentsSnapshot = await getDocs(documentsQuery);
      setDocuments(documentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // 안전 점검 목록 로드
      const safetyChecksQuery = query(collection(db, 'safetyChecks'), where('siteId', '==', siteId));
      const safetyChecksSnapshot = await getDocs(safetyChecksQuery);
      setSafetyChecks(safetyChecksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // 기성 현황 로드
      const progressQuery = query(collection(db, 'progress'), where('siteId', '==', siteId));
      const progressSnapshot = await getDocs(progressQuery);
      setProgress(progressSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      setLoading(false);
    } catch (error) {
      console.error('현장 데이터 로드 실패:', error);
      setError('현장 데이터를 불러오는데 실패했습니다.');
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'completed':
        return 'primary';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active':
        return '진행중';
      case 'completed':
        return '완료';
      case 'pending':
        return '대기중';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: isMobile ? 0 : 3, m: 0, width: isMobile ? '100vw' : 'auto', maxWidth: isMobile ? '100vw' : 'auto', minWidth: isMobile ? '100vw' : 'auto', boxSizing: 'border-box' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          {site.name}
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/construction/edit/${siteId}`)}
            sx={{ mr: 1 }}
          >
            수정
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => {
              if (window.confirm('정말로 이 현장을 삭제하시겠습니까?')) {
                // 삭제 로직 구현
              }
            }}
          >
            삭제
          </Button>
        </Box>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <LocationOn sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="body1">
                {site.location}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CalendarToday sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="body1">
                {new Date(site.startDate).toLocaleDateString()} ~ {new Date(site.endDate).toLocaleDateString()}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <People sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="body1">
                현장관리자: {site.manager}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body1" sx={{ mb: 2 }}>
              예산: {site.budget.toLocaleString()}원
            </Typography>
            <Chip
              label={getStatusText(site.status)}
              color={getStatusColor(site.status)}
              sx={{ mb: 2 }}
            />
            <Typography variant="body1">
              {site.description}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ width: '100%' }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="작업자" />
          <Tab label="일정" />
          <Tab label="문서" />
          <Tab label="안전점검" />
          <Tab label="기성현황" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {activeTab === 0 && (
            <List>
              {workers.map((worker) => (
                <ListItem key={worker.id}>
                  <ListItemIcon>
                    <People />
                  </ListItemIcon>
                  <ListItemText
                    primary={worker.name}
                    secondary={`${worker.position} - ${worker.phone}`}
                  />
                </ListItem>
              ))}
            </List>
          )}

          {activeTab === 1 && (
            <List>
              {schedules.map((schedule) => (
                <ListItem key={schedule.id}>
                  <ListItemIcon>
                    <CalendarToday />
                  </ListItemIcon>
                  <ListItemText
                    primary={schedule.title}
                    secondary={`${new Date(schedule.startDate).toLocaleDateString()} ~ ${new Date(schedule.endDate).toLocaleDateString()}`}
                  />
                </ListItem>
              ))}
            </List>
          )}

          {activeTab === 2 && (
            <List>
              {documents.map((document) => (
                <ListItem key={document.id}>
                  <ListItemIcon>
                    <Description />
                  </ListItemIcon>
                  <ListItemText
                    primary={document.name}
                    secondary={`${document.type} - ${new Date(document.uploadedAt).toLocaleDateString()}`}
                  />
                </ListItem>
              ))}
            </List>
          )}

          {activeTab === 3 && (
            <List>
              {safetyChecks.map((check) => (
                <ListItem key={check.id}>
                  <ListItemIcon>
                    <SafetyCheck />
                  </ListItemIcon>
                  <ListItemText
                    primary={check.title}
                    secondary={`${check.inspector} - ${new Date(check.date).toLocaleDateString()}`}
                  />
                </ListItem>
              ))}
            </List>
          )}

          {activeTab === 4 && (
            <List>
              {progress.map((item) => (
                <ListItem key={item.id}>
                  <ListItemIcon>
                    <Assessment />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.title}
                    secondary={`${item.percentage}% - ${new Date(item.date).toLocaleDateString()}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default SiteDetail; 