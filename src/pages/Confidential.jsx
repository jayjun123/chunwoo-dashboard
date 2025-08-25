import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  useTheme,
  useMediaQuery,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Badge,
  Tooltip,
  LinearProgress,
  FormControlLabel,
  Checkbox,
  Popover
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ko } from 'date-fns/locale';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  Group as GroupIcon,
  Business as BusinessIcon,
  Assignment as AssignmentIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  Engineering as EngineeringIcon,
  CloudDownload as CloudDownloadIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  CalendarToday as CalendarIcon,
  Gavel as GavelIcon
} from '@mui/icons-material';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { formatNumber } from '../utils/formatUtils';
import * as XLSX from 'xlsx';

const Confidential = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { currentUser } = useAuth();
  
  // 인증 상태
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  
  // 데이터 상태
  const [confidentialData, setConfidentialData] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // 폼 데이터
  const [formData, setFormData] = useState({
    company: '',
    manager: '',
    site: '',
    amount: '',
    completionDate: null,
    status: '미해결',
    lawsuitStatus: '미접수',
    lawsuitNumber: '',
    progressHistory: [],
    note: ''
  });

  // 현황 입력 관련 상태
  const [progressDate, setProgressDate] = useState(null);
  const [progressContent, setProgressContent] = useState('');
  const [datePickerAnchor, setDatePickerAnchor] = useState(null);

  // 비밀번호 확인
  const handlePasswordSubmit = () => {
    if (password === 'chunwoo8sth@') {
      setIsAuthenticated(true);
      setAuthError('');
      loadData();
    } else {
      setAuthError('비밀번호가 올바르지 않습니다.');
    }
  };

  // 권한 확인 (마스터만 수정 가능)
  const isMaster = currentUser?.email === 'fire8803@naver.com';

  // 데이터 로드
  const loadData = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'confidential'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setConfidentialData(data);
    } catch (error) {
      console.error('대외비 데이터 로드 오류:', error);
      setSnackbar({ open: true, message: '데이터 로드 중 오류가 발생했습니다.', severity: 'error' });
    }
  };

  // 다이얼로그 열기
  const handleOpenDialog = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        company: item.company || '',
        manager: item.manager || '',
        site: item.site || '',
        amount: item.amount || '',
        completionDate: item.completionDate ? new Date(item.completionDate) : null,
        status: item.status || '미해결',
        lawsuitStatus: item.lawsuitStatus || '미접수',
        lawsuitNumber: item.lawsuitNumber || '',
        progressHistory: item.progressHistory || [],
        note: item.note || ''
      });
    } else {
      setEditingItem(null);
      setFormData({
        company: '',
        manager: '',
        site: '',
        amount: '',
        completionDate: null,
        status: '미해결',
        lawsuitStatus: '미접수',
        lawsuitNumber: '',
        progressHistory: [],
        note: ''
      });
    }
    setOpenDialog(true);
  };

  // 다이얼로그 닫기
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingItem(null);
    setFormData({
      company: '',
      manager: '',
      site: '',
      amount: '',
      completionDate: null,
      status: '미해결',
      lawsuitStatus: '미접수',
      lawsuitNumber: '',
      progressHistory: [],
      note: ''
    });
    setProgressDate(null);
    setProgressContent('');
  };

  // 저장
  const handleSave = async () => {
    try {
      if (editingItem) {
        // 수정 권한 확인
        if (!isMaster) {
          setSnackbar({ open: true, message: '마스터만 수정할 수 있습니다.', severity: 'error' });
          return;
        }
        await updateDoc(doc(db, 'confidential', editingItem.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
        setSnackbar({ open: true, message: '수정되었습니다.', severity: 'success' });
      } else {
        await addDoc(collection(db, 'confidential'), {
          ...formData,
          createdAt: serverTimestamp(),
          createdBy: currentUser?.email || 'unknown'
        });
        setSnackbar({ open: true, message: '등록되었습니다.', severity: 'success' });
      }
      handleCloseDialog();
      loadData();
    } catch (error) {
      console.error('저장 오류:', error);
      setSnackbar({ open: true, message: '저장 중 오류가 발생했습니다.', severity: 'error' });
    }
  };

  // 삭제
  const handleDelete = async (id) => {
    if (!isMaster) {
      setSnackbar({ open: true, message: '마스터만 삭제할 수 있습니다.', severity: 'error' });
      return;
    }
    
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'confidential', id));
        setSnackbar({ open: true, message: '삭제되었습니다.', severity: 'success' });
        loadData();
      } catch (error) {
        console.error('삭제 오류:', error);
        setSnackbar({ open: true, message: '삭제 중 오류가 발생했습니다.', severity: 'error' });
      }
    }
  };

  // 엑셀 다운로드
  const handleDownload = () => {
    const data = confidentialData.map((item, index) => ({
      'NO.': index + 1,
      '회사': item.company || '',
      '담당자': item.manager || '',
      '현장': item.site || '',
      '금액': item.amount ? formatNumber(item.amount, true) : '',
      '공사완료일자': item.completionDate ? new Date(item.completionDate).toLocaleDateString() : '',
      '고소장접수여부': item.lawsuitStatus || '미접수',
      '고소장번호': item.lawsuitNumber || '',
      '비고': item.note || '',
      '상태': item.status || '미해결'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '악성미수금확인');
    XLSX.writeFile(wb, `악성미수금확인_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // 상태별 색상
  const getStatusColor = (status) => {
    switch (status) {
      case '해결': return 'success';
      case '진행중': return 'warning';
      case '미해결': return 'error';
      default: return 'default';
    }
  };

  // 금액 포맷팅
  const formatAmount = (amount) => {
    if (!amount) return '0원';
    return formatNumber(amount, true);
  };

  // 고소장 접수여부 색상
  const getLawsuitStatusColor = (status) => {
    switch (status) {
      case '접수완료': return 'success';
      case '진행중': return 'warning';
      case '미접수': return 'error';
      default: return 'default';
    }
  };

  // 상태 토글 핸들러
  const handleStatusToggle = async (id, currentStatus) => {
    if (!isMaster) {
      setSnackbar({ open: true, message: '마스터만 상태를 변경할 수 있습니다.', severity: 'error' });
      return;
    }
    
    const newStatus = currentStatus === '미해결' ? '해결' : '미해결';
    
    try {
      await updateDoc(doc(db, 'confidential', id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      setSnackbar({ open: true, message: `상태가 ${newStatus}로 변경되었습니다.`, severity: 'success' });
      loadData();
    } catch (error) {
      console.error('상태 변경 오류:', error);
      setSnackbar({ open: true, message: '상태 변경 중 오류가 발생했습니다.', severity: 'error' });
    }
  };

  // 현황 추가 핸들러
  const handleAddProgress = () => {
    if (!progressDate || !progressContent.trim()) {
      setSnackbar({ open: true, message: '날짜와 내용을 모두 입력해주세요.', severity: 'warning' });
      return;
    }

    const newProgress = {
      date: progressDate.toISOString(),
      content: progressContent.trim()
    };

    setFormData(prev => ({
      ...prev,
      progressHistory: [...prev.progressHistory, newProgress].sort((a, b) => new Date(a.date) - new Date(b.date))
    }));

    setProgressDate(null);
    setProgressContent('');
    setSnackbar({ open: true, message: '현황이 추가되었습니다.', severity: 'success' });
  };

  // 현황 삭제 핸들러
  const handleDeleteProgress = (index) => {
    setFormData(prev => ({
      ...prev,
      progressHistory: prev.progressHistory.filter((_, i) => i !== index)
    }));
    setSnackbar({ open: true, message: '현황이 삭제되었습니다.', severity: 'success' });
  };

  // 날짜 포맷팅
  const formatDate = (date) => {
    if (!date) return '';
    
    try {
      // Firestore Timestamp 객체인 경우
      if (date && typeof date === 'object' && date.toDate) {
        return date.toDate().toLocaleDateString('ko-KR');
      }
      
      // 문자열이나 숫자인 경우
      const dateObj = new Date(date);
      
      // Invalid Date 체크
      if (isNaN(dateObj.getTime())) {
        console.warn('Invalid date:', date);
        return '';
      }
      
      return dateObj.toLocaleDateString('ko-KR');
    } catch (error) {
      console.error('날짜 포맷팅 오류:', error, '원본 데이터:', date);
      return '';
    }
  };

  // 인증되지 않은 경우 비밀번호 입력 화면
  if (!isAuthenticated) {
    return (
      <Box sx={{ 
        p: 3, 
        marginTop: '64px', 
        pb: '60px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 'calc(100vh - 124px)'
      }}>
        <Paper sx={{ p: 4, maxWidth: 400, width: '100%' }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <LockIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" sx={{ mb: 1 }}>
              대외비 접근
            </Typography>
            <Typography variant="body2" color="text.secondary">
              비밀번호를 입력하여 악성미수금확인 페이지에 접근하세요
            </Typography>
          </Box>
          
          <TextField
            fullWidth
            type={showPassword ? 'text' : 'password'}
            label="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
            error={!!authError}
            helperText={authError}
            sx={{ mb: 2 }}
            InputProps={{
              endAdornment: (
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                >
                  {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </IconButton>
              )
            }}
          />
          
          <Button
            fullWidth
            variant="contained"
            onClick={handlePasswordSubmit}
            sx={{ mb: 2 }}
          >
            접근
          </Button>
          
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block' }}>
            * 이 페이지는 대외비 자료입니다. 무단 복사 및 유출을 금지합니다.
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, marginTop: '64px', pb: '60px', position: 'relative' }}>
      {/* 워터마크 */}
      <Box sx={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1,
        opacity: 0.3,
        pointerEvents: 'none',
        width: '400px',
        height: '300px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Box sx={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent'
        }}>
          {/* 대외비 텍스트 워터마크 */}
          <Typography 
            variant="h1" 
            sx={{ 
              color: 'red', 
              fontWeight: 'bold',
              fontSize: '4rem',
              textShadow: '3px 3px 6px rgba(0,0,0,0.7)',
              textAlign: 'center',
              lineHeight: 1.2,
              transform: 'rotate(-15deg)',
              opacity: 0.8,
              marginBottom: '20px'
            }}
          >
            대외비
          </Typography>
          <Typography 
            variant="h2" 
            sx={{ 
              color: 'red', 
              fontWeight: 'bold',
              fontSize: '1.5rem',
              textShadow: '2px 2px 4px rgba(0,0,0,0.7)',
              textAlign: 'center',
              transform: 'rotate(-15deg)',
              opacity: 0.8
            }}
          >
            SECRET ISSUE
          </Typography>
        </Box>
      </Box>
             {/* 헤더 */}
       <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
         <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
           <GavelIcon sx={{ fontSize: 40, color: 'error.main' }} />
           <Box>
             <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
               악성미수금확인
             </Typography>
             <Typography variant="body2" color="text.secondary">
               대외비 자료
             </Typography>
           </Box>
         </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<CloudDownloadIcon />}
            onClick={handleDownload}
            sx={{ mr: 1 }}
          >
            엑셀 다운로드
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            새로 등록
          </Button>
        </Box>
      </Box>

      {/* 카드 그리드 */}
      <Grid container spacing={2}>
        {confidentialData.map((item) => (
          <Grid item xs={12} sm={6} md={4} key={item.id}>
            <Card sx={{ 
              height: '100%',
              minWidth: 320,
              display: 'flex',
              flexDirection: 'column',
              '&:hover': {
                boxShadow: 4,
                transform: 'translateY(-2px)',
                transition: 'all 0.2s ease-in-out'
              }
            }}>
              <CardContent sx={{ flexGrow: 1, p: 2 }}>
                {/* 헤더 */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                      {item.company}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.manager}
                    </Typography>
                  </Box>
                  <Chip
                    label={item.status}
                    color={getStatusColor(item.status)}
                    size="small"
                    sx={{ fontSize: '0.7rem', cursor: 'pointer' }}
                    onClick={() => handleStatusToggle(item.id, item.status)}
                  />
                </Box>

                {/* 현장 정보 */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    <LocationIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                    {item.site}
                  </Typography>
                  <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    <TrendingUpIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                    {formatAmount(item.amount)}
                  </Typography>
                                     <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                     <AssignmentIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                     {item.completionDate ? formatDate(item.completionDate) : '미정'}
                   </Typography>
                 </Box>

                 {/* 현황 및 내용 */}
                 <Box sx={{ mb: 2 }}>
                   <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                     현황: {item.progressHistory?.length || 0}건
                   </Typography>
                   <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                     <Typography variant="caption" sx={{ mr: 0.5, color: 'text.secondary' }}>
                       고소장접수
                     </Typography>
                     <Chip
                       label={item.lawsuitStatus || '미접수'}
                       color={getLawsuitStatusColor(item.lawsuitStatus)}
                       size="small"
                       sx={{ fontSize: '0.6rem', height: '20px' }}
                     />
                   </Typography>
                   {item.lawsuitNumber && (
                     <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'text.secondary', mb: 0.5 }}>
                       번호: {item.lawsuitNumber}
                     </Typography>
                   )}
                   <Typography variant="body2" color="text.secondary" sx={{ 
                     overflow: 'hidden',
                     textOverflow: 'ellipsis',
                     display: '-webkit-box',
                     WebkitLineClamp: 2,
                     WebkitBoxOrient: 'vertical'
                   }}>
                     {item.note}
                   </Typography>
                 </Box>

                {/* 액션 버튼 */}
                <Box sx={{ display: 'flex', gap: 1, mt: 'auto', justifyContent: 'flex-end' }}>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(item)}
                    disabled={!isMaster}
                    sx={{ color: 'primary.main' }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(item.id)}
                    disabled={!isMaster}
                    sx={{ color: 'error.main' }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 데이터가 없을 때 */}
      {confidentialData.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            등록된 데이터가 없습니다
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            첫 번째 데이터 등록
          </Button>
        </Box>
      )}

      {/* 등록/수정 다이얼로그 */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingItem ? '악성미수금확인 수정' : '악성미수금확인 등록'}
        </DialogTitle>
                 <DialogContent>
           <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ko}>
             <Grid container spacing={2} sx={{ mt: 1 }}>
               <Grid item xs={12} sm={6}>
                 <TextField
                   fullWidth
                   label="회사"
                   value={formData.company}
                   onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                   sx={{ mb: 2 }}
                 />
               </Grid>
               <Grid item xs={12} sm={6}>
                 <TextField
                   fullWidth
                   label="담당자"
                   value={formData.manager}
                   onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                   sx={{ mb: 2 }}
                 />
               </Grid>
               <Grid item xs={12} sm={6}>
                 <TextField
                   fullWidth
                   label="현장"
                   value={formData.site}
                   onChange={(e) => setFormData({ ...formData, site: e.target.value })}
                   sx={{ mb: 2 }}
                 />
               </Grid>
               <Grid item xs={12} sm={6}>
                 <TextField
                   fullWidth
                   label="금액"
                   value={formData.amount}
                   onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                   sx={{ mb: 2 }}
                 />
               </Grid>
               <Grid item xs={12} sm={6}>
                 <DatePicker
                   label="공사완료 일자"
                   value={formData.completionDate}
                   onChange={(newValue) => setFormData({ ...formData, completionDate: newValue })}
                   slotProps={{ textField: { fullWidth: true, sx: { mb: 2 } } }}
                 />
               </Grid>
               <Grid item xs={12} sm={6}>
                 <FormControl fullWidth>
                   <InputLabel>고소장 접수여부</InputLabel>
                   <Select
                     value={formData.lawsuitStatus}
                     onChange={(e) => setFormData({ ...formData, lawsuitStatus: e.target.value })}
                     label="고소장 접수여부"
                   >
                     <MenuItem value="미접수">미접수</MenuItem>
                     <MenuItem value="진행중">진행중</MenuItem>
                     <MenuItem value="접수완료">접수완료</MenuItem>
                   </Select>
                 </FormControl>
               </Grid>
               {formData.lawsuitStatus === '진행중' && (
                 <Grid item xs={12} sm={6}>
                   <TextField
                     fullWidth
                     label="고소장 번호"
                     value={formData.lawsuitNumber}
                     onChange={(e) => setFormData({ ...formData, lawsuitNumber: e.target.value })}
                     sx={{ mb: 2 }}
                   />
                 </Grid>
               )}
               <Grid item xs={12} sm={6}>
                 <FormControl fullWidth>
                   <InputLabel>상태</InputLabel>
                   <Select
                     value={formData.status}
                     onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                     label="상태"
                   >
                     <MenuItem value="미해결">미해결</MenuItem>
                     <MenuItem value="진행중">진행중</MenuItem>
                     <MenuItem value="해결">해결</MenuItem>
                   </Select>
                 </FormControl>
               </Grid>

               {/* 현황 입력 섹션 */}
               <Grid item xs={12}>
                 <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1, p: 2, mb: 2 }}>
                   <Typography variant="h6" sx={{ mb: 2 }}>
                     현황 입력
                   </Typography>
                   <Grid container spacing={2} sx={{ mb: 2 }}>
                     <Grid item xs={12} sm={4}>
                       <DatePicker
                         label="날짜"
                         value={progressDate}
                         onChange={(newValue) => setProgressDate(newValue)}
                         slotProps={{ textField: { fullWidth: true } }}
                       />
                     </Grid>
                     <Grid item xs={12} sm={6}>
                       <TextField
                         fullWidth
                         label="내용"
                         value={progressContent}
                         onChange={(e) => setProgressContent(e.target.value)}
                         placeholder="현황 내용을 입력하세요"
                       />
                     </Grid>
                     <Grid item xs={12} sm={2}>
                       <Button
                         fullWidth
                         variant="contained"
                         onClick={handleAddProgress}
                         sx={{ height: '56px' }}
                       >
                         추가
                       </Button>
                     </Grid>
                   </Grid>

                   {/* 현황 목록 */}
                   {formData.progressHistory.length > 0 && (
                     <Box>
                       <Typography variant="subtitle2" sx={{ mb: 1 }}>
                         등록된 현황 ({formData.progressHistory.length}건)
                       </Typography>
                       <List dense>
                         {formData.progressHistory.map((progress, index) => (
                           <ListItem key={index} sx={{ border: '1px solid #f0f0f0', borderRadius: 1, mb: 1 }}>
                             <ListItemText
                               primary={progress.content}
                               secondary={formatDate(progress.date)}
                             />
                             <IconButton
                               size="small"
                               onClick={() => handleDeleteProgress(index)}
                               sx={{ color: 'error.main' }}
                             >
                               <DeleteIcon fontSize="small" />
                             </IconButton>
                           </ListItem>
                         ))}
                       </List>
                     </Box>
                   )}
                 </Box>
               </Grid>

               <Grid item xs={12}>
                 <TextField
                   fullWidth
                   label="비고"
                   value={formData.note}
                   onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                   multiline
                   rows={4}
                   sx={{ mb: 2 }}
                 />
               </Grid>
             </Grid>
           </LocalizationProvider>
         </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>취소</Button>
          <Button onClick={handleSave} variant="contained">
            {editingItem ? '수정' : '등록'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 스낵바 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
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
};

export default Confidential;
