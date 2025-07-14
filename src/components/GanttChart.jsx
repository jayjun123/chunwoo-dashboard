import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Chip,
  Alert,
  Tooltip,
  LinearProgress,
  Divider,
  useTheme
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Print as PrintIcon,
  PictureAsPdf as PdfIcon,
  Timeline as TimelineIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Today as TodayIcon
} from '@mui/icons-material';
import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useLoading } from './common/LoadingProvider';
import { exportToPDF } from '../utils/exportUtils';
import '../styles/GanttChart.css';

const GanttChart = () => {
  const theme = useTheme();
  const { setLoading, setLoadingMessage } = useLoading();
  const [error, setError] = useState('');
  const [sites, setSites] = useState([]);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [currentDate] = useState(new Date());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedSites, setSelectedSites] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [useYearMode, setUseYearMode] = useState(true); // 연도 모드 사용 여부
  const chartContainerRef = useRef(null);
  // 오늘 날짜가 속한 분기 계산
  const getCurrentQuarter = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // 분기별 시작월 계산 (0, 3, 6, 9)
    const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
    const quarterEndMonth = quarterStartMonth + 2;
    
    return {
      startDate: new Date(currentYear, quarterStartMonth, 1).toISOString().slice(0, 10),
      endDate: new Date(currentYear, quarterEndMonth + 1, 0).toISOString().slice(0, 10) // 해당 월의 마지막 날
    };
  };

  const [dateRange, setDateRange] = useState(getCurrentQuarter());
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    status: '진행중',
    manager: '',
    address: ''
  });
  const [siteColors, setSiteColors] = useState({});

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
        console.log('🔥 공정표 - 현장 데이터 로드:', sitesData);
        setSites(sitesData);
        
        // 저장된 색상 정보 로드
        const savedColors = {};
        sitesData.forEach(site => {
          if (site.customColor) {
            savedColors[site.id] = site.customColor;
          }
        });
        setSiteColors(savedColors);
      } catch (error) {
        console.error('현장 목록 조회 실패:', error);
        setError('현장 목록을 불러오는데 실패했습니다.');
      }
    };
    fetchSites();
  }, []);

  // 선택된 연도의 전체 날짜 범위 계산
  const dateRangeObj = useMemo(() => {
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    return { start, end };
  }, [dateRange]);

  // 날짜 배열 생성 (설정된 기간에 따라)
  const dateArray = useMemo(() => {
    const dates = [];
    const current = new Date(dateRangeObj.start);
    
    while (current <= dateRangeObj.end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  }, [dateRangeObj]);

  // 오늘 날짜 인덱스 계산
  const todayIndex = useMemo(() => {
    const today = new Date();
    return dateArray.findIndex(date => 
      date.getDate() === today.getDate() && 
      date.getMonth() === today.getMonth() && 
      date.getFullYear() === today.getFullYear()
    );
  }, [dateArray]);

  // 현장별 공사기간 처리
  const siteSchedules = useMemo(() => {
    const grouped = {};
    
    // 선택된 현장만 필터링 (선택된 현장이 없으면 모든 현장 표시)
    const filteredSites = selectedSites.length > 0 ? 
      sites.filter(site => selectedSites.includes(site.id)) : sites;
    
    filteredSites.forEach(site => {
      // 현장의 공사기간 처리
      let startDate, endDate;
      
      if (site.startDate) {
        if (site.startDate.toDate) {
          startDate = site.startDate.toDate();
        } else if (site.startDate instanceof Date) {
          startDate = site.startDate;
        } else {
          // 문자열 날짜 처리 (YYYY.MM.DD 또는 YYYY-MM-DD)
          const dateStr = site.startDate.replace(/\./g, '-');
          startDate = new Date(dateStr + 'T12:00:00');
        }
      }
      
      if (site.endDate) {
        if (site.endDate.toDate) {
          endDate = site.endDate.toDate();
        } else if (site.endDate instanceof Date) {
          endDate = site.endDate;
        } else {
          // 문자열 날짜 처리 (YYYY.MM.DD 또는 YYYY-MM-DD)
          const dateStr = site.endDate.replace(/\./g, '-');
          endDate = new Date(dateStr + 'T12:00:00');
        }
      }
      
      // 공사기간이 설정된 현장만 처리
      if (startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        // 선택된 기간과 겹치는지 확인
        const hasOverlap = (startDate <= dateRangeObj.end && endDate >= dateRangeObj.start);
        
        if (hasOverlap) {
          // 기간 경계 처리: 이전 기간에서 시작된 현장은 시작일을 설정된 시작일로 조정
          const displayStartDate = startDate < dateRangeObj.start ? 
            new Date(dateRangeObj.start) : startDate;
          // 다음 기간으로 넘어가는 현장은 종료일을 설정된 종료일로 조정
          const displayEndDate = endDate > dateRangeObj.end ? 
            new Date(dateRangeObj.end) : endDate;
          
          grouped[site.id] = {
            site,
            schedule: {
              id: site.id,
              text: site.name,
              desc: site.address || '',
              startDate: displayStartDate,
              endDate: displayEndDate,
              status: site.status || '진행중',
              progress: 0, // 진행률은 별도 계산 필요
              siteId: site.id,
              siteName: site.name
            }
          };
        }
      }
    });

    console.log('🔥 공정표 - 처리된 현장 데이터:', grouped);
    return grouped;
  }, [sites, dateRangeObj, selectedSites]);

  // 현장의 위치와 너비 계산 (기간 경계 고려)
  const getSitePosition = (schedule) => {
    const startIndex = Math.floor((schedule.startDate - dateRangeObj.start) / (1000 * 60 * 60 * 24));
    const endIndex = Math.floor((schedule.endDate - dateRangeObj.start) / (1000 * 60 * 60 * 24));
    const duration = Math.max(1, endIndex - startIndex + 1);
    
    console.log('🔥 위치 계산:', {
      siteName: schedule.text,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      dateRangeStart: dateRangeObj.start,
      startIndex,
      endIndex,
      duration,
      left: startIndex * (40 * zoomLevel),
      width: duration * (40 * zoomLevel)
    });
    
    return {
      left: Math.max(0, startIndex * (40 * zoomLevel)),
      width: Math.max(40 * zoomLevel, duration * (40 * zoomLevel)),
      startIndex,
      duration
    };
  };

  // 상태별 색상
  const getStatusColor = (status) => {
    switch (status) {
      case '완료': return theme.palette.success.main;
      case '진행중': return theme.palette.primary.main;
      case '지연': return theme.palette.error.main;
      case '예정': return theme.palette.info.main;
      case '계획': return theme.palette.warning.main;
      default: return theme.palette.grey[500];
    }
  };

  // 현장별 색상 (사용자 정의 색상 우선, 없으면 상태별 색상)
  const getSiteColor = (siteId, status) => {
    const site = sites.find(s => s.id === siteId);
    return site?.customColor || siteColors[siteId] || getStatusColor(status);
  };

  // 색상 변경
  const handleColorChange = async (siteId) => {
    const colors = [
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.success.main,
      theme.palette.error.main,
      theme.palette.warning.main,
      theme.palette.info.main,
      '#9c27b0', // 보라색
      '#ff9800', // 주황색
      '#795548', // 갈색
      '#607d8b'  // 청회색
    ];
    
    const site = sites.find(s => s.id === siteId);
    const currentColor = siteColors[siteId] || getStatusColor(site?.status || '진행중');
    const currentIndex = colors.indexOf(currentColor);
    const nextIndex = (currentIndex + 1) % colors.length;
    const newColor = colors[nextIndex];
    
    try {
      // Firebase에 색상 저장
      await updateDoc(doc(db, 'sites', siteId), {
        customColor: newColor,
        updatedAt: new Date()
      });
      
      // 로컬 상태 업데이트
      setSiteColors(prev => ({
        ...prev,
        [siteId]: newColor
      }));
    } catch (error) {
      console.error('색상 저장 실패:', error);
      setError('색상 저장에 실패했습니다.');
    }
  };

  // 진행률에 따른 색상
  const getProgressColor = (progress) => {
    if (progress >= 80) return theme.palette.success.main;
    if (progress >= 50) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  // 오늘 날짜로 스크롤하는 함수
  const scrollToToday = () => {
    if (chartContainerRef.current) {
      const todayPosition = todayIndex * (40 * zoomLevel);
      const containerWidth = chartContainerRef.current.clientWidth;
      const scrollPosition = todayPosition - (containerWidth / 2);
      chartContainerRef.current.scrollLeft = Math.max(0, scrollPosition);
    }
  };

  // 컴포넌트 마운트 시 오늘 날짜로 스크롤
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToToday();
    }, 100);
    return () => clearTimeout(timer);
  }, [zoomLevel, dateRange]);

  // 줌 레벨 조정
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
  };

  // 연도 변경 시 기간도 함께 변경
  const handleYearChange = (newYear) => {
    setSelectedYear(newYear);
    setUseYearMode(true);
    // 선택된 연도의 현재 분기로 설정
    const today = new Date();
    const currentMonth = today.getMonth();
    const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
    const quarterEndMonth = quarterStartMonth + 2;
    
    setDateRange({
      startDate: new Date(newYear, quarterStartMonth, 1).toISOString().slice(0, 10),
      endDate: new Date(newYear, quarterEndMonth + 1, 0).toISOString().slice(0, 10)
    });
  };

  // 기간 변경
  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
    setUseYearMode(false); // 기간을 수동으로 설정하면 연도 모드 해제
  };

  // 현장 선택 변경
  const handleSiteSelection = (siteId) => {
    setSelectedSites(prev => {
      if (prev.includes(siteId)) {
        return prev.filter(id => id !== siteId);
      } else {
        return [...prev, siteId];
      }
    });
  };

  // 모든 현장 선택/해제
  const handleSelectAllSites = () => {
    if (selectedSites.length === sites.length) {
      setSelectedSites([]);
    } else {
      setSelectedSites(sites.map(site => site.id));
    }
  };

  // 공사기간 계산
  const getConstructionPeriod = (site) => {
    if (!site.startDate || !site.endDate) return '공사기간 미정';
    
    let startDate, endDate;
    
    if (site.startDate.toDate) {
      startDate = site.startDate.toDate();
    } else if (site.startDate instanceof Date) {
      startDate = site.startDate;
    } else {
      // 문자열 날짜 처리 (YYYY.MM.DD 또는 YYYY-MM-DD)
      const dateStr = site.startDate.replace(/\./g, '-');
      startDate = new Date(dateStr + 'T12:00:00');
    }
    
    if (site.endDate.toDate) {
      endDate = site.endDate.toDate();
    } else if (site.endDate instanceof Date) {
      endDate = site.endDate;
    } else {
      // 문자열 날짜 처리 (YYYY.MM.DD 또는 YYYY-MM-DD)
      const dateStr = site.endDate.replace(/\./g, '-');
      endDate = new Date(dateStr + 'T12:00:00');
    }
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return '공사기간 미정';
    }
    
    return `${startDate.toLocaleDateString('ko-KR')} ~ ${endDate.toLocaleDateString('ko-KR')}`;
  };

  // 현장 저장
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoadingMessage('현장 정보 저장 중...');
    try {
      const siteData = {
        ...formData,
        startDate: new Date(formData.startDate + 'T12:00:00'),
        endDate: new Date(formData.endDate + 'T12:00:00'),
        updatedAt: new Date()
      };

      if (editingSite) {
        await updateDoc(doc(db, 'sites', editingSite.id), siteData);
      } else {
        await addDoc(collection(db, 'sites'), {
          ...siteData,
          createdAt: new Date()
        });
      }
      
      setIsModalOpen(false);
      setEditingSite(null);
      setFormData({
        name: '',
        startDate: '',
        endDate: '',
        status: '진행중',
        manager: '',
        address: ''
      });
    } catch (error) {
      console.error('현장 저장 실패:', error);
      setError('현장 저장에 실패했습니다.');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  // 현장 삭제
  const handleDelete = async (siteId) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'sites', siteId));
      } catch (error) {
        console.error('현장 삭제 실패:', error);
        setError('현장 삭제에 실패했습니다.');
      }
    }
  };

  // 현장 편집 모달 열기
  const handleEdit = (site) => {
    setEditingSite(site);
    
    // 날짜 형식 변환
    let startDateStr = '';
    let endDateStr = '';
    
    if (site.startDate) {
      if (site.startDate.toDate) {
        startDateStr = site.startDate.toDate().toISOString().slice(0, 10);
      } else if (site.startDate instanceof Date) {
        startDateStr = site.startDate.toISOString().slice(0, 10);
      } else {
        // 문자열 날짜를 YYYY-MM-DD 형식으로 변환
        startDateStr = site.startDate.replace(/\./g, '-');
      }
    }
    
    if (site.endDate) {
      if (site.endDate.toDate) {
        endDateStr = site.endDate.toDate().toISOString().slice(0, 10);
      } else if (site.endDate instanceof Date) {
        endDateStr = site.endDate.toISOString().slice(0, 10);
      } else {
        // 문자열 날짜를 YYYY-MM-DD 형식으로 변환
        endDateStr = site.endDate.replace(/\./g, '-');
      }
    }
    
    setFormData({
      name: site.name || '',
      startDate: startDateStr,
      endDate: endDateStr,
      status: site.status || '진행중',
      manager: site.manager || '',
      address: site.address || ''
    });
    setIsModalOpen(true);
  };

  // 새 현장 모달 열기
  const handleAdd = () => {
    setEditingSite(null);
    setFormData({
      name: '',
      startDate: currentDate.toISOString().slice(0, 10),
      endDate: currentDate.toISOString().slice(0, 10),
      status: '진행중',
      manager: '',
      address: ''
    });
    setIsModalOpen(true);
  };

  return (
    <Box sx={{ p: 3, mt: 5.75 }}>
                    <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TimelineIcon color="primary" />
        현장 현황표 {useYearMode ? 
          `(${selectedYear}년 ${Math.floor(new Date().getMonth() / 3) + 1}분기)` : 
          `(${dateRange.startDate} ~ ${dateRange.endDate})`
        }
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* 컨트롤 패널 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h6">
                현장별 진행 상황 ({Object.keys(siteSchedules).length}개 현장)
              </Typography>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>연도</InputLabel>
                <Select
                  value={selectedYear}
                  onChange={(e) => handleYearChange(e.target.value)}
                  label="연도"
                  sx={{ 
                    '& .MuiSelect-select': { 
                      color: useYearMode ? 'primary.main' : 'text.secondary',
                      fontWeight: useYearMode ? 'bold' : 'normal'
                    }
                  }}
                >
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                    <MenuItem key={year} value={year}>{year}년</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>현장 선택</InputLabel>
                <Select
                  multiple
                  value={selectedSites}
                  onChange={(e) => setSelectedSites(e.target.value)}
                  label="현장 선택"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.length === 0 && <Typography variant="body2">모든 현장</Typography>}
                      {selected.length > 0 && selected.length <= 2 && selected.map((siteId) => {
                        const site = sites.find(s => s.id === siteId);
                        return <Chip key={siteId} label={site?.name} size="small" />;
                      })}
                      {selected.length > 2 && (
                        <Chip label={`${selected.length}개 현장`} size="small" />
                      )}
                    </Box>
                  )}
                >
                  <MenuItem onClick={handleSelectAllSites}>
                    <Typography variant="body2" fontWeight="bold">
                      {selectedSites.length === sites.length ? '전체 해제' : '전체 선택'}
                    </Typography>
                  </MenuItem>
                  <Divider />
                  {sites.map((site) => (
                    <MenuItem key={site.id} value={site.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2">{site.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          ({getConstructionPeriod(site)})
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                size="small"
                label="시작일"
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ 
                  minWidth: 140,
                  '& .MuiInputBase-input': { 
                    color: !useYearMode ? 'primary.main' : 'text.secondary',
                    fontWeight: !useYearMode ? 'bold' : 'normal'
                  }
                }}
              />
              <Typography variant="body2" color={!useYearMode ? 'primary.main' : 'text.secondary'} fontWeight={!useYearMode ? 'bold' : 'normal'}>
                ~
              </Typography>
              <TextField
                size="small"
                label="종료일"
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ 
                  minWidth: 140,
                  '& .MuiInputBase-input': { 
                    color: !useYearMode ? 'primary.main' : 'text.secondary',
                    fontWeight: !useYearMode ? 'bold' : 'normal'
                  }
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="오늘 날짜로 이동">
                <IconButton onClick={scrollToToday} size="small">
                  <TodayIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="축소">
                <IconButton onClick={handleZoomOut} size="small">
                  <ZoomOutIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="확대">
                <IconButton onClick={handleZoomIn} size="small">
                  <ZoomInIcon />
                </IconButton>
              </Tooltip>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAdd}
              >
                현장 추가
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* 공정표 차트 */}
      <Paper sx={{ p: 3, overflow: 'auto', mt: 2.5, maxHeight: '70vh' }} ref={chartContainerRef} className="gantt-timeline">
        <Box sx={{ 
          position: 'relative', 
          minHeight: 600,
          minWidth: dateArray.length * (40 * zoomLevel) + 200, // 현장명 열 너비 추가
          border: 1,
          borderColor: 'divider',
          borderRadius: 1
        }}>
          {/* 날짜 헤더 */}
          <Box sx={{ 
            position: 'sticky', 
            top: 0, 
            backgroundColor: 'background.paper',
            borderBottom: 1,
            borderColor: 'divider',
            zIndex: 10,
            mt: 5
          }}>
            <Grid container sx={{ minWidth: dateArray.length * (40 * zoomLevel) + 200 }}>
              {/* 현장명 열 */}
              <Grid item xs={2} sx={{ 
                borderRight: 1, 
                borderColor: 'divider',
                backgroundColor: 'grey.50',
                p: 2,
                position: 'sticky',
                left: 0,
                zIndex: 15
              }}>
              </Grid>
              
              {/* 날짜 열들 */}
              <Grid item xs={10} sx={{ display: 'flex' }}>
                {dateArray.map((date, index) => (
                  <Box
                    key={index}
                    sx={{
                      width: 40 * zoomLevel,
                      minWidth: 40 * zoomLevel,
                      borderRight: 1,
                      borderColor: 'divider',
                      p: 0.5,
                      textAlign: 'center',
                      backgroundColor: date.getDay() === 0 ? 'primary.dark' : 'background.paper',
                      position: 'relative'
                    }}
                  >
                    <Typography variant="body2" display="block" color={date.getDay() === 0 ? 'error.main' : 'white'} fontWeight="bold" sx={{ pt: 2.5 }}>
                      {date.getDate()}
                    </Typography>
                    <Typography variant="body2" color={date.getDay() === 0 ? 'error.main' : 'white'} sx={{ pt: 0.5 }}>
                      {date.toLocaleDateString('ko-KR', { weekday: 'short' })}
                    </Typography>
                    
                    {/* 월 표시 */}
                    {date.getDate() === 1 && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: -30,
                          left: 0,
                          width: 120 * zoomLevel,
                          textAlign: 'center',
                          zIndex: 5
                        }}
                      >
                        <Typography 
                          variant="h5" 
                          sx={{ 
                            backgroundColor: 'white',
                            color: 'black',
                            px: 2,
                            py: 1,
                            borderRadius: 2,
                            fontWeight: 'bold',
                            fontSize: '1.2rem',
                            border: 1,
                            borderColor: 'primary.main'
                          }}
                        >
                          {date.getMonth() + 1}월
                        </Typography>
                      </Box>
                    )}
                    
                    {/* 월 구분선 */}
                    {date.getDate() === 1 && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '2px',
                          backgroundColor: 'primary.main',
                          opacity: 0.7
                        }}
                      />
                    )}
                    
                    {/* 오늘 날짜 표시 */}
                    {index === todayIndex && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          border: 2,
                          borderColor: 'error.main',
                          backgroundColor: 'error.main',
                          opacity: 0.2,
                          pointerEvents: 'none'
                        }}
                      />
                    )}
                  </Box>
                ))}
              </Grid>
            </Grid>
          </Box>

          {/* 현장별 공사기간 행들 */}
          <Box sx={{ minWidth: dateArray.length * (40 * zoomLevel) + 200, mt: 3 }}>
            {Object.entries(siteSchedules).map(([siteId, { site, schedule }]) => (
              <Grid 
                key={siteId} 
                container 
                sx={{ 
                  borderBottom: 1, 
                  borderColor: 'divider',
                  minHeight: 60,
                  '&:hover': { backgroundColor: 'action.hover' }
                }}
              >
                {/* 현장명 열 */}
                <Grid item xs={2} sx={{ 
                  borderRight: 1, 
                  borderColor: 'divider',
                  p: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  position: 'sticky',
                  left: 0,
                  backgroundColor: 'white',
                  zIndex: 10
                }}>
                  <Typography variant="body2" fontWeight="bold" noWrap color="black">
                    {site.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {getConstructionPeriod(site)}
                  </Typography>
                </Grid>
                
                                  {/* 공사기간 차트 영역 */}
                  <Grid item xs={10} sx={{ position: 'relative', minHeight: 60 }}>
                    {schedule && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          left: getSitePosition(schedule).left,
                          width: getSitePosition(schedule).width,
                          height: 20,
                          backgroundColor: getSiteColor(site.id, schedule.status),
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: 1,
                          '&:hover': {
                            boxShadow: 3,
                            transform: 'translateY(-50%) scale(1.02)'
                          },
                          transition: 'all 0.2s ease-in-out'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleColorChange(site.id);
                        }}
                        onDoubleClick={() => handleEdit(site)}
                      >
                        {/* 현장명 */}
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: 'white', 
                            fontWeight: 'bold',
                            textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                            fontSize: '0.6rem',
                            textAlign: 'center',
                            px: 0.5,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {schedule.text}
                        </Typography>
                      </Box>
                    )}
                  </Grid>
              </Grid>
            ))}
          </Box>

          {/* 사용법 안내 */}
          <Box sx={{ 
            position: 'sticky', 
            bottom: 0, 
            backgroundColor: 'background.paper',
            borderTop: 1,
            borderColor: 'divider',
            p: 2,
            mt: 2
          }}>
            <Typography variant="caption" color="text.secondary">
              💡 클릭: 색상 변경 | 더블클릭: 현장 편집
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* 현장 추가/편집 모달 */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingSite ? '현장 편집' : '새 현장 추가'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="현장명"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="착공일"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="준공예정일"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>상태</InputLabel>
                  <Select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    label="상태"
                  >
                    <MenuItem value="예정">예정</MenuItem>
                    <MenuItem value="진행중">진행중</MenuItem>
                    <MenuItem value="완료">완료</MenuItem>
                    <MenuItem value="지연">지연</MenuItem>
                    <MenuItem value="계획">계획</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="현장장"
                  value={formData.manager}
                  onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="주소"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsModalOpen(false)}>취소</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingSite ? '수정' : '추가'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* CSS 애니메이션 */}
      <style>
        {`
          @keyframes pulse {
            0% { transform: translateY(-50%) scale(1); }
            50% { transform: translateY(-50%) scale(1.2); }
            100% { transform: translateY(-50%) scale(1); }
          }
          
          /* 지정된 div 요소 숨기기 */
          .MuiGrid-root.MuiGrid-direction-xs-row.css-1fbyy2u-MuiGrid-root {
            display: none !important;
          }
        `}
      </style>
    </Box>
  );
};

export default GanttChart; 