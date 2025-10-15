import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  CircularProgress,
  Divider,
  Container
} from '@mui/material';
import MobileSidebar from '../components/MobileSidebar';
import {
  CheckCircle,
  Error,
  Warning,
  ExpandMore,
  Refresh,
  Speed,
  Sync,
  Security,
  Build
} from '@mui/icons-material';
import DatabaseStatusMonitor from '../components/common/DatabaseStatusMonitor';
import {
  diagnoseDatabaseConnection,
  testDatabasePerformance,
  checkDataSyncStatus,
  getDatabaseOptimizationRecommendations,
  getDatabaseStatusSummary
} from '../utils/databaseUtils';

const DatabaseManagement = () => {
  const [diagnosisResults, setDiagnosisResults] = useState(null);
  const [performanceResults, setPerformanceResults] = useState(null);
  const [syncResults, setSyncResults] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [statusSummary, setStatusSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDatabaseStatus();
  }, []);

  const loadDatabaseStatus = async () => {
    setLoading(true);
    try {
      // 상태 요약 로드
      setStatusSummary(getDatabaseStatusSummary());
      
      // 권장사항 로드
      setRecommendations(getDatabaseOptimizationRecommendations());
      
      // 진단 결과 로드
      const diagnosis = await diagnoseDatabaseConnection();
      setDiagnosisResults(diagnosis);
      
      // 성능 테스트
      const performance = await testDatabasePerformance();
      setPerformanceResults(performance);
      
      // 동기화 상태 확인
      const sync = await checkDataSyncStatus();
      setSyncResults(sync);
      
    } catch (error) {
      console.error('데이터베이스 상태 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
      case 'excellent':
        return 'success';
      case 'warning':
      case 'good':
        return 'warning';
      case 'error':
      case 'poor':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
      case 'excellent':
        return <CheckCircle />;
      case 'warning':
      case 'good':
        return <Warning />;
      case 'error':
      case 'poor':
        return <Error />;
      default:
        return <Warning />;
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      bgcolor: 'background.default',
      position: 'relative'
    }}>
      {/* 모바일 사이드바 */}
      <MobileSidebar />
      
      {/* 메인 콘텐츠 */}
      <Container 
        maxWidth={false} 
        sx={{ 
          pt: 2,
          pb: 3,
          px: 1,
          ml: 0,
          mr: 0,
          maxWidth: '100%'
        }}
      >
        <Box sx={{ 
          p: 3,
          borderRadius: 2,
          boxShadow: 3,
          bgcolor: 'background.paper'
        }}>
      <Typography variant="h4" gutterBottom>
        데이터베이스 연동 관리
      </Typography>

      {/* 실시간 상태 모니터 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          실시간 연결 상태
        </Typography>
        <DatabaseStatusMonitor />
      </Paper>

      {/* 상태 요약 */}
      {statusSummary && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            연결 상태 요약
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Chip
                icon={getStatusIcon(statusSummary.connected ? 'success' : 'error')}
                label={statusSummary.status}
                color={getStatusColor(statusSummary.connected ? 'success' : 'error')}
                sx={{ mb: 1 }}
              />
              <Typography variant="body2" color="text.secondary">
                {statusSummary.message}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2">
                마지막 연결: {statusSummary.lastConnected ? 
                  new Date(statusSummary.lastConnected).toLocaleString() : '없음'}
              </Typography>
              <Typography variant="body2">
                오류 횟수: {statusSummary.errorCount}회
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* 진단 결과 */}
      {diagnosisResults && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              데이터베이스 진단 결과
            </Typography>
            <Button
              startIcon={<Refresh />}
              onClick={loadDatabaseStatus}
              disabled={loading}
            >
              새로고침
            </Button>
          </Box>
          
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress />
            </Box>
          )}

          <Chip
            icon={getStatusIcon(diagnosisResults.overall)}
            label={`전체 상태: ${diagnosisResults.overall}`}
            color={getStatusColor(diagnosisResults.overall)}
            sx={{ mb: 2 }}
          />

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>상세 진단 결과</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List dense>
                {Object.entries(diagnosisResults.details).map(([key, detail]) => (
                  <ListItem key={key}>
                    <ListItemIcon>
                      {getStatusIcon(detail.status)}
                    </ListItemIcon>
                    <ListItemText
                      primary={key}
                      secondary={detail.message}
                    />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>

          {diagnosisResults.recommendations.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                권장사항:
              </Typography>
              <List dense>
                {diagnosisResults.recommendations.map((rec, index) => (
                  <ListItem key={index}>
                    <ListItemText primary={rec} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </Paper>
      )}

      {/* 성능 테스트 결과 */}
      {performanceResults && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            성능 테스트 결과
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Speed sx={{ mr: 1 }} />
                    <Typography variant="subtitle1">읽기 성능</Typography>
                  </Box>
                  <Chip
                    label={performanceResults.readPerformance.message}
                    color={getStatusColor(performanceResults.readPerformance.status)}
                    size="small"
                  />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Build sx={{ mr: 1 }} />
                    <Typography variant="subtitle1">쓰기 성능</Typography>
                  </Box>
                  <Chip
                    label={performanceResults.writePerformance.message}
                    color={getStatusColor(performanceResults.writePerformance.status)}
                    size="small"
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* 동기화 상태 */}
      {syncResults && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            실시간 동기화 상태
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Sync sx={{ mr: 1 }} />
            <Typography variant="subtitle1">구독 상태</Typography>
          </Box>
          {Object.entries(syncResults.syncStatus).map(([key, status]) => (
            <Chip
              key={key}
              label={status.message}
              color={getStatusColor(status.status)}
              size="small"
              sx={{ mr: 1, mb: 1 }}
            />
          ))}
        </Paper>
      )}

      {/* 개선 권장사항 */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          개선 권장사항
        </Typography>
        <Grid container spacing={2}>
          {recommendations.map((category, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    {category.category === '성능' && <Speed sx={{ mr: 1 }} />}
                    {category.category === '안정성' && <Security sx={{ mr: 1 }} />}
                    {category.category === '보안' && <Security sx={{ mr: 1 }} />}
                    {category.category === '유지보수' && <Build sx={{ mr: 1 }} />}
                    <Typography variant="subtitle1">{category.category}</Typography>
                  </Box>
                  <List dense>
                    {category.items.map((item, itemIndex) => (
                      <ListItem key={itemIndex} sx={{ py: 0.5 }}>
                        <ListItemText primary={item} />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>
        </Box>
      </Container>
    </Box>
  );
};

export default DatabaseManagement; 