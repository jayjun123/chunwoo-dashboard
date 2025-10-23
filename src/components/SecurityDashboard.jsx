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
  Chip,
  Avatar,
  useTheme,
  useMediaQuery,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Tabs,
  Tab,
  Divider,
  Switch,
  FormControlLabel,
  Tooltip,
  Badge,
  Autocomplete,
  CircularProgress,
  LinearProgress,
  Pagination,
  TablePagination
} from '@mui/material';
import {
  Security as SecurityIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  PersonAdd as PersonAddIcon,
  Warning as WarningIcon,
  Block as BlockIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  Timeline as TimelineIcon,
  Computer as ComputerIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  getSecurityLogs, 
  getSecurityStats, 
  getLoginAttemptsByIP, 
  getLoginAttemptsByUser,
  SECURITY_LOG_TYPES,
  SECURITY_LEVELS 
} from '../utils/securityUtils';

const SecurityDashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // 상태 관리
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [securityLogs, setSecurityLogs] = useState([]);
  const [securityStats, setSecurityStats] = useState({});
  const [filters, setFilters] = useState({
    type: '',
    level: '',
    email: '',
    ipAddress: '',
    startDate: '',
    endDate: ''
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const [logDetailOpen, setLogDetailOpen] = useState(false);
  const [timeWindow, setTimeWindow] = useState(24); // 시간
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(8);

  // 보안 로그 타입별 색상
  const getLogTypeColor = (type) => {
    switch (type) {
      case SECURITY_LOG_TYPES.LOGIN_SUCCESS:
        return 'success';
      case SECURITY_LOG_TYPES.LOGIN_FAILED:
        return 'warning';
      case SECURITY_LOG_TYPES.LOGOUT:
        return 'info';
      case SECURITY_LOG_TYPES.REGISTER:
        return 'primary';
      case SECURITY_LOG_TYPES.SUSPICIOUS_ACTIVITY:
        return 'error';
      case SECURITY_LOG_TYPES.DDOS_ATTEMPT:
        return 'error';
      case SECURITY_LOG_TYPES.UNAUTHORIZED_ACCESS:
        return 'error';
      default:
        return 'default';
    }
  };

  // 보안 레벨별 색상
  const getLevelColor = (level) => {
    switch (level) {
      case SECURITY_LEVELS.LOW:
        return 'success';
      case SECURITY_LEVELS.MEDIUM:
        return 'warning';
      case SECURITY_LEVELS.HIGH:
        return 'error';
      case SECURITY_LEVELS.CRITICAL:
        return 'error';
      default:
        return 'default';
    }
  };

  // 로그 타입 한글 변환
  const getLogTypeLabel = (type) => {
    switch (type) {
      case SECURITY_LOG_TYPES.LOGIN_SUCCESS:
        return '로그인 성공';
      case SECURITY_LOG_TYPES.LOGIN_FAILED:
        return '로그인 실패';
      case SECURITY_LOG_TYPES.LOGOUT:
        return '로그아웃';
      case SECURITY_LOG_TYPES.REGISTER:
        return '회원가입';
      case SECURITY_LOG_TYPES.SUSPICIOUS_ACTIVITY:
        return '의심스러운 활동';
      case SECURITY_LOG_TYPES.DDOS_ATTEMPT:
        return 'DDoS 공격 시도';
      case SECURITY_LOG_TYPES.UNAUTHORIZED_ACCESS:
        return '무단 접근 시도';
      default:
        return type;
    }
  };

  // 보안 레벨 한글 변환
  const getLevelLabel = (level) => {
    switch (level) {
      case SECURITY_LEVELS.LOW:
        return '낮음';
      case SECURITY_LEVELS.MEDIUM:
        return '보통';
      case SECURITY_LEVELS.HIGH:
        return '높음';
      case SECURITY_LEVELS.CRITICAL:
        return '심각';
      default:
        return level;
    }
  };

  // 데이터 로드
  const loadSecurityData = async () => {
    try {
      setLoading(true);
      
      // 보안 통계 로드
      const stats = await getSecurityStats(timeWindow);
      setSecurityStats(stats);
      
      // 보안 로그 로드
      const logs = await getSecurityLogs({
        ...filters,
        limitCount: 100
      });
      setSecurityLogs(logs);
      
    } catch (error) {
      console.error('보안 데이터 로드 실패:', error);
      setError('보안 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSecurityData();
  }, [timeWindow, filters]);

  // 필터 변경 핸들러
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 페이지네이션 핸들러
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // 로그 상세 보기
  const handleLogDetail = (log) => {
    setSelectedLog(log);
    setLogDetailOpen(true);
  };

  // 시간 윈도우 변경
  const handleTimeWindowChange = (event) => {
    setTimeWindow(event.target.value);
  };

  // 로그 내보내기 (CSV)
  const handleExportLogs = () => {
    const csvContent = [
      ['시간', '타입', '사용자', '이메일', 'IP 주소', '브라우저', '레벨', '상세내용'].join(','),
      ...securityLogs.map(log => [
        log.timestamp?.toDate ? format(log.timestamp.toDate(), 'yyyy-MM-dd HH:mm:ss') : log.createdAt,
        getLogTypeLabel(log.type),
        log.userId || '',
        log.email || '',
        log.ipAddress || '',
        log.browser || '',
        getLevelLabel(log.level),
        `"${log.details?.message || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `security_logs_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>보안 데이터를 불러오는 중...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: isMobile ? 2 : 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        보안 모니터링 대시보드
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* 보안 통계 카드 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <LoginIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">로그인 성공</Typography>
              </Box>
              <Typography variant="h4" color="success.main">
                {securityStats.loginSuccess || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                최근 {timeWindow}시간
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <WarningIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6">로그인 실패</Typography>
              </Box>
              <Typography variant="h4" color="warning.main">
                {securityStats.loginFailed || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                최근 {timeWindow}시간
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <BlockIcon color="error" sx={{ mr: 1 }} />
                <Typography variant="h6">의심스러운 활동</Typography>
              </Box>
              <Typography variant="h4" color="error.main">
                {securityStats.suspiciousActivity || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                최근 {timeWindow}시간
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ComputerIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">고유 IP</Typography>
              </Box>
              <Typography variant="h4" color="info.main">
                {securityStats.uniqueIPs || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                최근 {timeWindow}시간
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 필터 및 컨트롤 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>시간 범위</InputLabel>
              <Select
                value={timeWindow}
                onChange={handleTimeWindowChange}
                label="시간 범위"
              >
                <MenuItem value={1}>1시간</MenuItem>
                <MenuItem value={6}>6시간</MenuItem>
                <MenuItem value={24}>24시간</MenuItem>
                <MenuItem value={72}>3일</MenuItem>
                <MenuItem value={168}>1주일</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>로그 타입</InputLabel>
              <Select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                label="로그 타입"
              >
                <MenuItem value="">전체</MenuItem>
                <MenuItem value={SECURITY_LOG_TYPES.LOGIN_SUCCESS}>로그인 성공</MenuItem>
                <MenuItem value={SECURITY_LOG_TYPES.LOGIN_FAILED}>로그인 실패</MenuItem>
                <MenuItem value={SECURITY_LOG_TYPES.LOGOUT}>로그아웃</MenuItem>
                <MenuItem value={SECURITY_LOG_TYPES.REGISTER}>회원가입</MenuItem>
                <MenuItem value={SECURITY_LOG_TYPES.SUSPICIOUS_ACTIVITY}>의심스러운 활동</MenuItem>
                <MenuItem value={SECURITY_LOG_TYPES.DDOS_ATTEMPT}>DDoS 공격</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>심각도</InputLabel>
              <Select
                value={filters.level}
                onChange={(e) => handleFilterChange('level', e.target.value)}
                label="심각도"
              >
                <MenuItem value="">전체</MenuItem>
                <MenuItem value={SECURITY_LEVELS.LOW}>낮음</MenuItem>
                <MenuItem value={SECURITY_LEVELS.MEDIUM}>보통</MenuItem>
                <MenuItem value={SECURITY_LEVELS.HIGH}>높음</MenuItem>
                <MenuItem value={SECURITY_LEVELS.CRITICAL}>심각</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              label="이메일 검색"
              value={filters.email}
              onChange={(e) => handleFilterChange('email', e.target.value)}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              label="IP 주소 검색"
              value={filters.ipAddress}
              onChange={(e) => handleFilterChange('ipAddress', e.target.value)}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadSecurityData}
                size="small"
              >
                새로고침
              </Button>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleExportLogs}
                size="small"
              >
                내보내기
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* 보안 로그 테이블 */}
      <Paper>
        <TableContainer 
          sx={{ 
            maxHeight: 400,
            '&::-webkit-scrollbar': {
              display: 'none'
            },
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ py: 1, fontSize: '0.75rem' }}>시간</TableCell>
                <TableCell sx={{ py: 1, fontSize: '0.75rem' }}>타입</TableCell>
                <TableCell sx={{ py: 1, fontSize: '0.75rem' }}>사용자</TableCell>
                <TableCell sx={{ py: 1, fontSize: '0.75rem' }}>IP 주소</TableCell>
                <TableCell sx={{ py: 1, fontSize: '0.75rem' }}>브라우저</TableCell>
                <TableCell sx={{ py: 1, fontSize: '0.75rem' }}>심각도</TableCell>
                <TableCell sx={{ py: 1, fontSize: '0.75rem' }}>상세내용</TableCell>
                <TableCell sx={{ py: 1, fontSize: '0.75rem' }}>작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {securityLogs
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((log) => (
                <TableRow key={log.id} hover sx={{ '& .MuiTableCell-root': { py: 0.5 } }}>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                      {log.timestamp?.toDate ? 
                        format(log.timestamp.toDate(), 'MM-dd HH:mm:ss') : 
                        format(new Date(log.createdAt), 'MM-dd HH:mm:ss')
                      }
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getLogTypeLabel(log.type)}
                      color={getLogTypeColor(log.type)}
                      size="small"
                      sx={{ height: 20, fontSize: '0.65rem' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="caption" fontWeight="bold" sx={{ fontSize: '0.7rem' }}>
                        {log.email || '알 수 없음'}
                      </Typography>
                      {log.userId && (
                        <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.6rem' }}>
                          {log.userId.substring(0, 8)}...
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <LocationIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary', fontSize: '0.7rem' }} />
                      <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                        {log.ipAddress || '알 수 없음'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                      {log.browser || '알 수 없음'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getLevelLabel(log.level)}
                      color={getLevelColor(log.level)}
                      size="small"
                      variant={log.level === SECURITY_LEVELS.CRITICAL ? 'filled' : 'outlined'}
                      sx={{ height: 20, fontSize: '0.65rem' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" noWrap sx={{ maxWidth: 150, fontSize: '0.7rem' }}>
                      {log.details?.message || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title="상세 보기">
                      <IconButton
                        size="small"
                        onClick={() => handleLogDetail(log)}
                        sx={{ p: 0.5 }}
                      >
                        <VisibilityIcon sx={{ fontSize: '0.8rem' }} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* 페이지네이션 */}
        <TablePagination
          rowsPerPageOptions={[8, 16, 24]}
          component="div"
          count={securityLogs.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="페이지당 행 수:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
          sx={{
            '& .MuiTablePagination-toolbar': {
              minHeight: 40,
              fontSize: '0.75rem'
            },
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
              fontSize: '0.75rem'
            }
          }}
        />
      </Paper>

      {/* 로그 상세 다이얼로그 */}
      <Dialog
        open={logDetailOpen}
        onClose={() => setLogDetailOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          보안 로그 상세 정보
        </DialogTitle>
        <DialogContent>
          {selectedLog && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    시간
                  </Typography>
                  <Typography variant="body1">
                    {selectedLog.timestamp?.toDate ? 
                      format(selectedLog.timestamp.toDate(), 'yyyy-MM-dd HH:mm:ss') : 
                      selectedLog.createdAt
                    }
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    타입
                  </Typography>
                  <Chip
                    label={getLogTypeLabel(selectedLog.type)}
                    color={getLogTypeColor(selectedLog.type)}
                    size="small"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    사용자 ID
                  </Typography>
                  <Typography variant="body1">
                    {selectedLog.userId || '알 수 없음'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    이메일
                  </Typography>
                  <Typography variant="body1">
                    {selectedLog.email || '알 수 없음'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    IP 주소
                  </Typography>
                  <Typography variant="body1">
                    {selectedLog.ipAddress || '알 수 없음'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    브라우저
                  </Typography>
                  <Typography variant="body1">
                    {selectedLog.browser || '알 수 없음'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    플랫폼
                  </Typography>
                  <Typography variant="body1">
                    {selectedLog.platform || '알 수 없음'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    언어
                  </Typography>
                  <Typography variant="body1">
                    {selectedLog.language || '알 수 없음'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">
                    상세 내용
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </Paper>
                </Grid>
                
                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary">
                      메타데이터
                    </Typography>
                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>
                        {JSON.stringify(selectedLog.metadata, null, 2)}
                      </pre>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogDetailOpen(false)}>
            닫기
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SecurityDashboard;




