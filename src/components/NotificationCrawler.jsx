import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Switch,
  FormControlLabel,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Alert,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Notifications,
  NotificationsActive,
  NotificationsOff,
  Add,
  Delete,
  Edit,
  FilterList,
  Refresh,
  Warning,
  Info,
  CheckCircle
} from '@mui/icons-material';
import { 
  startNotificationCrawling, 
  stopNotificationCrawling,
  crawlerConfig,
  notificationTypes 
} from '../utils/notificationCrawler';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase';

const NotificationCrawler = () => {
  const [isCrawling, setIsCrawling] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [config, setConfig] = useState(crawlerConfig);
  const [filter, setFilter] = useState('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [selectedType, setSelectedType] = useState('kakao');

  // 알림 데이터 로드
  useEffect(() => {
    const q = query(
      collection(db, 'crawledNotifications'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notificationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotifications(notificationsData);
    });

    return () => unsubscribe();
  }, []);

  // 크롤링 시작/중지
  const handleToggleCrawling = () => {
    if (isCrawling) {
      stopNotificationCrawling();
      setIsCrawling(false);
    } else {
      startNotificationCrawling();
      setIsCrawling(true);
    }
  };

  // 키워드 추가
  const handleAddKeyword = () => {
    if (newKeyword.trim()) {
      setConfig(prev => ({
        ...prev,
        [selectedType]: {
          ...prev[selectedType],
          keywords: [...prev[selectedType].keywords, newKeyword.trim()]
        }
      }));
      setNewKeyword('');
      setAddDialogOpen(false);
    }
  };

  // 키워드 삭제
  const handleDeleteKeyword = (type, keyword) => {
    setConfig(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        keywords: prev[type].keywords.filter(k => k !== keyword)
      }
    }));
  };

  // 필터링된 알림
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'high') return notification.priority === 'high';
    if (filter === 'medium') return notification.priority === 'medium';
    if (filter === 'low') return notification.priority === 'low';
    return notification.type === filter;
  });

  // 우선순위별 색상
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  // 타입별 아이콘
  const getTypeIcon = (type) => {
    switch (type) {
      case 'kakao': return '💬';
      case 'whatsapp': return '📱';
      case 'email': return '📧';
      case 'system': return '⚙️';
      case 'bank': return '🏦';
      default: return '📢';
    }
  };

  // 거래 타입별 색상
  const getTransactionColor = (bankData) => {
    if (!bankData) return 'default';
    if (bankData.isIncome) return 'success';
    if (bankData.isExpense) return 'error';
    return 'default';
  };

  // 거래 타입별 아이콘
  const getTransactionIcon = (bankData) => {
    if (!bankData) return '';
    if (bankData.isIncome) return '💰';
    if (bankData.isExpense) return '💸';
    return '💳';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        알림 크롤링 관리
      </Typography>

      {/* 크롤링 상태 카드 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {isCrawling ? (
                <NotificationsActive color="primary" sx={{ mr: 2 }} />
              ) : (
                <NotificationsOff sx={{ mr: 2 }} />
              )}
              <Typography variant="h6">
                알림 크롤링 {isCrawling ? '실행 중' : '중지됨'}
              </Typography>
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={isCrawling}
                  onChange={handleToggleCrawling}
                  color="primary"
                />
              }
              label={isCrawling ? '실행 중' : '중지됨'}
            />
          </Box>
          
          {isCrawling && (
            <Alert severity="info" sx={{ mt: 2 }}>
              알림 크롤링이 실행 중입니다. 새로운 알림이 자동으로 수집됩니다.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* 설정 카드 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            크롤링 설정
          </Typography>
          
          {Object.entries(config).map(([type, settings]) => (
            <Box key={type} sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1" sx={{ mr: 2, minWidth: 100 }}>
                  {getTypeIcon(type)} {type.toUpperCase()}
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.enabled}
                      onChange={(e) => {
                        setConfig(prev => ({
                          ...prev,
                          [type]: { ...prev[type], enabled: e.target.checked }
                        }));
                      }}
                      color="primary"
                    />
                  }
                  label="활성화"
                />
                <Chip 
                  label={settings.priority} 
                  color={getPriorityColor(settings.priority)}
                  size="small"
                  sx={{ ml: 2 }}
                />
              </Box>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {settings.keywords.map((keyword, index) => (
                  <Chip
                    key={index}
                    label={keyword}
                    onDelete={() => handleDeleteKeyword(type, keyword)}
                    size="small"
                  />
                ))}
                <Chip
                  label="+ 추가"
                  onClick={() => {
                    setSelectedType(type);
                    setAddDialogOpen(true);
                  }}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </Box>
            </Box>
          ))}
        </CardContent>
      </Card>

      {/* 대구은행 거래 요약 */}
      {notifications.some(n => n.type === 'bank') && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              🏦 대구은행 거래 요약
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {(() => {
                const bankNotifications = notifications.filter(n => n.type === 'bank' && n.bankData);
                const totalIncome = bankNotifications
                  .filter(n => n.bankData.isIncome)
                  .reduce((sum, n) => sum + n.bankData.amount, 0);
                const totalExpense = bankNotifications
                  .filter(n => n.bankData.isExpense)
                  .reduce((sum, n) => sum + n.bankData.amount, 0);
                const balance = totalIncome - totalExpense;
                
                return (
                  <>
                    <Chip 
                      label={`💰 총 입금: ${totalIncome.toLocaleString()}원`}
                      color="success"
                      variant="outlined"
                    />
                    <Chip 
                      label={`💸 총 출금: ${totalExpense.toLocaleString()}원`}
                      color="error"
                      variant="outlined"
                    />
                    <Chip 
                      label={`📊 잔액: ${balance.toLocaleString()}원`}
                      color={balance >= 0 ? "success" : "error"}
                      variant="filled"
                    />
                  </>
                );
              })()}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* 알림 목록 */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">
              수집된 알림 ({filteredNotifications.length}개)
            </Typography>
            <Box>
              <FormControl size="small" sx={{ minWidth: 120, mr: 2 }}>
                <InputLabel>필터</InputLabel>
                <Select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  label="필터"
                >
                  <MenuItem value="all">전체</MenuItem>
                  <MenuItem value="high">높음</MenuItem>
                  <MenuItem value="medium">보통</MenuItem>
                  <MenuItem value="low">낮음</MenuItem>
                  <MenuItem value="kakao">카카오</MenuItem>
                  <MenuItem value="email">이메일</MenuItem>
                  <MenuItem value="whatsapp">왓츠앱</MenuItem>
                  <MenuItem value="bank">대구은행</MenuItem>
                </Select>
              </FormControl>
              <IconButton onClick={() => window.location.reload()}>
                <Refresh />
              </IconButton>
            </Box>
          </Box>

          <List>
            {filteredNotifications.map((notification, index) => (
              <React.Fragment key={notification.id}>
                <ListItem>
                  <ListItemIcon>
                    {getTypeIcon(notification.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1">
                          {notification.title}
                        </Typography>
                        <Chip 
                          label={notification.priority} 
                          color={getPriorityColor(notification.priority)}
                          size="small"
                        />
                        {notification.bankData && (
                          <Chip 
                            label={`${getTransactionIcon(notification.bankData)} ${notification.bankData.amount.toLocaleString()}원`}
                            color={getTransactionColor(notification.bankData)}
                            size="small"
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {notification.content}
                        </Typography>
                        {notification.bankData && (
                          <Typography variant="body2" color="primary" sx={{ mt: 0.5 }}>
                            {notification.bankData.transactionType === 'deposit' && '💰 입금'}
                            {notification.bankData.transactionType === 'withdrawal' && '💸 출금'}
                            {notification.bankData.transactionType === 'transfer' && '🔄 이체'}
                            {notification.bankData.transactionType === 'payment' && '💳 결제'}
                            {notification.bankData.description && ` - ${notification.bankData.description}`}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          {notification.sender} • {new Date(notification.timestamp?.toDate?.() || notification.timestamp).toLocaleString()}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
                {index < filteredNotifications.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>

          {filteredNotifications.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">
                수집된 알림이 없습니다.
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* 키워드 추가 다이얼로그 */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)}>
        <DialogTitle>키워드 추가</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="새 키워드"
            fullWidth
            variant="outlined"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>취소</Button>
          <Button onClick={handleAddKeyword} variant="contained">추가</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NotificationCrawler;
