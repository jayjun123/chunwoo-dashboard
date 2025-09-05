import React, { useState, useEffect } from 'react';
import {
  Box,
  Alert,
  AlertTitle,
  IconButton,
  Collapse,
  Typography,
  Button,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  Close as CloseIcon,
  Security as SecurityIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { 
  getSecurityLogs, 
  SECURITY_LOG_TYPES, 
  SECURITY_LEVELS 
} from '../utils/securityUtils';

const SecurityAlert = ({ onViewDetails }) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  // 보안 알림 로드
  const loadSecurityAlerts = async () => {
    try {
      setLoading(true);
      
      // 최근 1시간 내의 높은 위험도 로그 조회
      const recentLogs = await getSecurityLogs({
        level: SECURITY_LEVELS.HIGH,
        limitCount: 10
      });

      // 최근 1시간 내의 심각한 로그 조회
      const criticalLogs = await getSecurityLogs({
        level: SECURITY_LEVELS.CRITICAL,
        limitCount: 10
      });

      // 최근 1시간 내의 의심스러운 활동 조회
      const suspiciousLogs = await getSecurityLogs({
        type: SECURITY_LOG_TYPES.SUSPICIOUS_ACTIVITY,
        limitCount: 10
      });

      // 최근 1시간 내의 DDoS 시도 조회
      const ddosLogs = await getSecurityLogs({
        type: SECURITY_LOG_TYPES.DDOS_ATTEMPT,
        limitCount: 10
      });

      // 알림 목록 구성
      const alertList = [];

      // 심각한 위험 알림
      if (criticalLogs.length > 0) {
        alertList.push({
          id: 'critical',
          type: 'error',
          title: '심각한 보안 위협 감지',
          message: `${criticalLogs.length}개의 심각한 보안 이벤트가 발생했습니다.`,
          count: criticalLogs.length,
          logs: criticalLogs,
          icon: <ErrorIcon />,
          color: 'error'
        });
      }

      // 높은 위험 알림
      if (recentLogs.length > 0) {
        alertList.push({
          id: 'high',
          type: 'warning',
          title: '높은 보안 위험 감지',
          message: `${recentLogs.length}개의 높은 위험 보안 이벤트가 발생했습니다.`,
          count: recentLogs.length,
          logs: recentLogs,
          icon: <WarningIcon />,
          color: 'warning'
        });
      }

      // 의심스러운 활동 알림
      if (suspiciousLogs.length > 0) {
        alertList.push({
          id: 'suspicious',
          type: 'warning',
          title: '의심스러운 활동 감지',
          message: `${suspiciousLogs.length}개의 의심스러운 활동이 감지되었습니다.`,
          count: suspiciousLogs.length,
          logs: suspiciousLogs,
          icon: <SecurityIcon />,
          color: 'warning'
        });
      }

      // DDoS 공격 시도 알림
      if (ddosLogs.length > 0) {
        alertList.push({
          id: 'ddos',
          type: 'error',
          title: 'DDoS 공격 시도 감지',
          message: `${ddosLogs.length}개의 DDoS 공격 시도가 감지되었습니다.`,
          count: ddosLogs.length,
          logs: ddosLogs,
          icon: <ErrorIcon />,
          color: 'error'
        });
      }

      setAlerts(alertList);
    } catch (error) {
      console.error('보안 알림 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSecurityAlerts();
    
    // 5분마다 보안 알림 새로고침
    const interval = setInterval(loadSecurityAlerts, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // 알림 닫기
  const handleCloseAlert = (alertId) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  // 모든 알림 닫기
  const handleCloseAll = () => {
    setAlerts([]);
  };

  // 알림 접기/펼치기
  const handleToggleExpanded = () => {
    setExpanded(!expanded);
  };

  // 상세 보기
  const handleViewDetails = (alert) => {
    if (onViewDetails) {
      onViewDetails(alert);
    }
  };

  if (alerts.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mb: 2 }}>
      <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SecurityIcon color="error" />
            <Typography variant="h6" color="error">
              보안 알림
            </Typography>
            <Chip 
              label={alerts.length} 
              color="error" 
              size="small" 
              sx={{ ml: 1 }}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton
              size="small"
              onClick={loadSecurityAlerts}
              disabled={loading}
            >
              <RefreshIcon />
            </IconButton>
            <IconButton
              size="small"
              onClick={handleToggleExpanded}
            >
              {expanded ? <CloseIcon /> : <VisibilityIcon />}
            </IconButton>
          </Box>
        </Box>

        <Collapse in={expanded}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {alerts.map((alert) => (
              <Alert
                key={alert.id}
                severity={alert.type}
                action={
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      onClick={() => handleViewDetails(alert)}
                      sx={{ color: 'inherit' }}
                    >
                      상세보기
                    </Button>
                    <IconButton
                      size="small"
                      onClick={() => handleCloseAlert(alert.id)}
                      sx={{ color: 'inherit' }}
                    >
                      <CloseIcon />
                    </IconButton>
                  </Box>
                }
                icon={alert.icon}
                sx={{ 
                  '& .MuiAlert-message': { 
                    width: '100%' 
                  } 
                }}
              >
                <AlertTitle>{alert.title}</AlertTitle>
                <Typography variant="body2">
                  {alert.message}
                </Typography>
                
                {/* 최근 로그 미리보기 */}
                {alert.logs && alert.logs.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="textSecondary">
                      최근 활동:
                    </Typography>
                    <List dense sx={{ py: 0 }}>
                      {alert.logs.slice(0, 3).map((log, index) => (
                        <ListItem key={log.id} sx={{ py: 0, px: 0 }}>
                          <ListItemIcon sx={{ minWidth: 24 }}>
                            {alert.icon}
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Typography variant="caption">
                                {log.timestamp?.toDate ? 
                                  log.timestamp.toDate().toLocaleTimeString() : 
                                  new Date(log.createdAt).toLocaleTimeString()
                                } - {log.email || log.ipAddress || '알 수 없음'}
                              </Typography>
                            }
                            secondary={
                              <Typography variant="caption" color="textSecondary">
                                {log.details?.message || log.type}
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </Alert>
            ))}
            
            {alerts.length > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Button
                  size="small"
                  onClick={handleCloseAll}
                  color="inherit"
                >
                  모든 알림 닫기
                </Button>
              </Box>
            )}
          </Box>
        </Collapse>
      </Paper>
    </Box>
  );
};

export default SecurityAlert;

