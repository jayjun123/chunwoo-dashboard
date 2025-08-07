import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Grid,
  Chip,
  Divider,
  Card,
  CardContent,
  useMediaQuery,
  useTheme,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import {
  Close as CloseIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';

const SiteInfoPopup = ({ open, onClose, site }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const [gisungRate, setGisungRate] = useState(0);
  const [gisungCount, setGisungCount] = useState(0);

  // 현장명 카드 더블클릭 핸들러 - 현장관리 페이지에서 해당 현장 선택
  const handleSiteNameDoubleClick = () => {
    if (site && site.id) {
      onClose(); // 팝업 닫기
      // 현장관리 페이지로 이동하면서 해당 현장 선택
      navigate('/sites', { 
        state: { 
          selectedSiteId: site.id,
          selectedSiteName: site.name
        }
      });
    }
  };

  // 계약정보 카드 더블클릭 핸들러 - 기성관리 페이지로 이동
  const handleContractInfoDoubleClick = () => {
    if (site && site.id) {
      onClose(); // 팝업 닫기
      // 기성관리 페이지로 이동하면서 해당 현장 선택
      navigate('/progress', { 
        state: { 
          selectedSiteId: site.id,
          viewMode: 'site' // 기성현황 현장별 뷰로 설정
        }
      });
    }
  };

  // 기성률 및 차수 계산
  useEffect(() => {
    const calculateGisungData = async () => {
      if (!site || !site.id) return;
      
      try {
        // 해당 현장의 기성 데이터 가져오기
        const gisungQuery = query(
          collection(db, 'gisung'),
          where('siteId', '==', site.id)
        );
        const gisungSnapshot = await getDocs(gisungQuery);
        const gisungData = gisungSnapshot.docs.map(doc => doc.data());
        
        // 총 기성금액 계산
        const totalGisungAmount = gisungData.reduce((sum, item) => sum + Number(item.gisungAmount || 0), 0);
        
        // 기성률 계산: 총기성금액 / 총계약금액 * 100
        const contractAmount = Number(site.contractAmount) || 0;
        const rate = contractAmount > 0 ? Math.round((totalGisungAmount / contractAmount) * 100) : 0;
        
        // 차수 계산: 기성 데이터 개수
        const count = gisungData.length;
        
        setGisungRate(rate);
        setGisungCount(count);
      } catch (error) {
        console.error('기성 데이터 계산 오류:', error);
        setGisungRate(0);
        setGisungCount(0);
      }
    };

    if (open && site) {
      calculateGisungData();
    }
  }, [open, site]);

  if (!site) return null;

  const getStatusColor = (status) => {
    switch (status) {
      case '진행중':
        return '#22c55e';
      case '완료':
        return '#3b82f6';
      case '예정':
        return '#f59e42';
      case '중단':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getContractTypeColor = (type) => {
    switch (type) {
      case '직영':
        return '#8b5cf6';
      case '하도급':
        return '#06b6d4';
      default:
        return '#6b7280';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  const formatProgress = (progress) => {
    if (!progress) return '-';
    return `${progress}%`;
  };

  // 모바일에서는 팝업을 표시하지 않음
  if (isMobile) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#1a1a1a',
          color: '#fff',
          borderRadius: 3,
          maxHeight: '90vh',
          zIndex: 9999
        }
      }}
      sx={{
        zIndex: 9999,
        '& .MuiDialog-paper': {
          zIndex: 9999
        }
      }}
    >
      <DialogTitle sx={{ 
        bgcolor: '#232b3b', 
        color: '#90caf9',
        fontWeight: 700,
        fontSize: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '2px solid #333',
        py: 1.5
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <BusinessIcon sx={{ fontSize: '2rem' }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            현장 상세 정보
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          sx={{ 
            color: '#90caf9',
            '&:hover': { bgcolor: '#2c3446' }
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ 
        p: 3, 
        bgcolor: '#1a1a1a',
        overflowY: 'auto',
        maxHeight: 'calc(90vh - 120px)'
      }}>
        <Grid container spacing={2}>
          {/* 현장 기본 정보 */}
          <Grid size={{ xs: 12 }}>
            <Card 
              sx={{ 
                bgcolor: '#232b3b', 
                border: '1px solid #333',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  bgcolor: '#2c3446',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
                }
              }}
              onDoubleClick={handleSiteNameDoubleClick}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                  <Typography variant="h5" sx={{ 
                    color: '#90caf9', 
                    fontWeight: 700,
                    fontSize: '1.8rem'
                  }}>
                    {site.name}
                  </Typography>
                  <Chip
                    label={site.status || '미정'}
                    sx={{
                      bgcolor: getStatusColor(site.status),
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: '0.9rem'
                    }}
                    onClick={() => {}} // 명시적으로 빈 함수 추가
                  />
                  <Chip
                    label={site.contractType || '미정'}
                    sx={{
                      bgcolor: getContractTypeColor(site.contractType),
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: '0.9rem'
                    }}
                    onClick={() => {}} // 명시적으로 빈 함수 추가
                  />
                </Box>

                <Grid container spacing={2}>
                  {/* 소장 정보 */}
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <PersonIcon sx={{ color: '#90caf9', fontSize: '1.2rem' }} />
                      <Typography sx={{ color: '#bbb', fontSize: '0.9rem' }}>소장</Typography>
                    </Box>
                    <Typography sx={{ color: '#fff', fontWeight: 600 }}>
                      {site.manager || '-'}
                    </Typography>
                  </Grid>

                  {/* 연락처 */}
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <PhoneIcon sx={{ color: '#90caf9', fontSize: '1.2rem' }} />
                      <Typography sx={{ color: '#bbb', fontSize: '0.9rem' }}>연락처</Typography>
                    </Box>
                    <Typography sx={{ color: '#fff', fontWeight: 600 }}>
                      {site.phone || '-'}
                    </Typography>
                  </Grid>

                  {/* 주소 */}
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <LocationIcon sx={{ color: '#90caf9', fontSize: '1.2rem' }} />
                      <Typography sx={{ color: '#bbb', fontSize: '0.9rem' }}>주소</Typography>
                    </Box>
                    <Typography sx={{ color: '#fff', fontWeight: 600 }}>
                      {site.address || '-'}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>



          {/* 일정 및 계약 정보 */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ bgcolor: '#232b3b', border: '1px solid #333', height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <CalendarIcon sx={{ color: '#3b82f6', fontSize: '1.5rem' }} />
                  <Typography variant="h6" sx={{ color: '#3b82f6', fontWeight: 700 }}>
                    일정 정보
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography sx={{ color: '#bbb', fontSize: '0.9rem' }}>착공일</Typography>
                    </Box>
                    <Typography sx={{ color: '#22c55e', fontWeight: 600 }}>
                      {formatDate(site.startDate)}
                    </Typography>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography sx={{ color: '#bbb', fontSize: '0.9rem' }}>준공일</Typography>
                    </Box>
                    <Typography sx={{ color: '#ef4444', fontWeight: 600 }}>
                      {formatDate(site.endDate)}
                    </Typography>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography sx={{ color: '#bbb', fontSize: '0.9rem' }}>회사명</Typography>
                    </Box>
                    <Typography sx={{ color: '#fff', fontWeight: 600 }}>
                      {site.companyName || '-'}
                    </Typography>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography sx={{ color: '#bbb', fontSize: '0.9rem' }}>시공팀</Typography>
                    </Box>
                    <Typography sx={{ color: '#fff', fontWeight: 600 }}>
                      {site.team || '-'}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* 계약 정보 */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card 
              sx={{ 
                bgcolor: '#232b3b', 
                border: '1px solid #333', 
                height: '100%',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  bgcolor: '#2c3446',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
                }
              }}
              onDoubleClick={handleContractInfoDoubleClick}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <MoneyIcon sx={{ color: '#22c55e', fontSize: '1.5rem' }} />
                  <Typography variant="h6" sx={{ color: '#22c55e', fontWeight: 700 }}>
                    계약 정보
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography sx={{ color: '#bbb', fontSize: '0.9rem' }}>계약금액</Typography>
                    </Box>
                    <Typography sx={{ color: '#22c55e', fontWeight: 700, fontSize: '1.1rem' }}>
                      {formatCurrency(site.contractAmount)}
                    </Typography>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography sx={{ color: '#bbb', fontSize: '0.9rem' }}>선급금</Typography>
                    </Box>
                    <Typography sx={{ color: '#f59e42', fontWeight: 600 }}>
                      {formatCurrency(site.advance)}
                    </Typography>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography sx={{ color: '#bbb', fontSize: '0.9rem' }}>차수</Typography>
                    </Box>
                    <Typography sx={{ color: '#fff', fontWeight: 600 }}>
                      {gisungCount > 0 ? `${gisungCount}차` : '-'}
                    </Typography>
                  </Grid>

                  <Grid xs={12} md={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography sx={{ color: '#bbb', fontSize: '0.9rem' }}>기성률</Typography>
                    </Box>
                    <Typography sx={{ color: '#3b82f6', fontWeight: 700 }}>
                      {gisungRate}%
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* 비고 및 물량내역 */}
          <Grid xs={12}>
            <Card sx={{ bgcolor: '#232b3b', border: '1px solid #333' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <AssignmentIcon sx={{ color: '#6b7280', fontSize: '1.5rem' }} />
                  <Typography variant="h6" sx={{ color: '#6b7280', fontWeight: 700 }}>
                    비고 및 물량내역
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid xs={12} md={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography sx={{ color: '#bbb', fontSize: '0.9rem' }}>비고</Typography>
                    </Box>
                    <Typography sx={{ 
                      color: '#fff', 
                      fontWeight: 600,
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap'
                    }}>
                      {site.note || '-'}
                    </Typography>
                  </Grid>
                  <Grid xs={12} md={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography sx={{ color: '#bbb', fontSize: '0.9rem' }}>물량내역</Typography>
                    </Box>
                    <Typography sx={{ 
                      color: '#fff', 
                      fontWeight: 600,
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap'
                    }}>
                      {Array.isArray(site.items)
                        ? site.items.length > 0
                          ? site.items.map((item, idx) =>
                              typeof item === 'object'
                                ? `${item.name || ''} / ${item.specification || ''} / ${item.unit || ''} / ${item.quantity || ''} / ${item.price || ''} / ${item.amount || ''}`
                                : String(item)
                            ).join('\n')
                          : '-'
                        : typeof site.items === 'object' && site.items !== null
                          ? JSON.stringify(site.items)
                          : site.items || '-'}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>



          {/* 추가 정보 */}
          {site.desc && (
            <Grid xs={12}>
              <Card sx={{ bgcolor: '#232b3b', border: '1px solid #333' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <DescriptionIcon sx={{ color: '#a855f7', fontSize: '1.5rem' }} />
                    <Typography variant="h6" sx={{ color: '#a855f7', fontWeight: 700 }}>
                      상세 설명
                    </Typography>
                  </Box>
                  <Typography sx={{ 
                    color: '#fff', 
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {site.desc}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </DialogContent>
    </Dialog>
  );
};

export default SiteInfoPopup; 