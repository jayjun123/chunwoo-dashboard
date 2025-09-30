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
  FormControlLabel,
  TextField,
  Button
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

// 숫자에 천단위 쉼표를 추가하는 함수
const formatNumberWithCommas = (text) => {
  if (!text || typeof text !== 'string') return text;
  
  // 숫자 패턴을 찾아서 천단위 쉼표 추가
  return text.replace(/\b(\d{1,3})(?=(\d{3})+(?!\d))/g, '$1,');
};

const SiteInfoPopup = ({ open, onClose, site }) => {
  console.log('🎭 SiteInfoPopup 렌더링:', { open, site: site?.name });
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const [gisungRate, setGisungRate] = useState(0);
  const [gisungCount, setGisungCount] = useState(0);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 현장명 더블클릭 핸들러 - 편집 모드로 전환 (원래 기능 복원)
  const handleSiteNameDoubleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (site && site.name) {
      setIsEditingName(true);
      setEditedName(site.name);
    }
  };

  // 현장명 클릭 핸들러 - 현장관리 페이지로 이동
  const handleSiteNameClick = (e) => {
    console.log('🚀 클릭 이벤트 발생!', e);
    e.preventDefault();
    e.stopPropagation();
    console.log('🔍 현장명 클릭됨:', site?.name, site?.id);
    if (site && site.id) {
      console.log('✅ 현장관리 페이지로 이동:', site.name);
      onClose(); // 팝업 닫기
      // 현장관리 페이지로 이동하면서 해당 현장 선택
      navigate('/sites', { 
        state: { 
          selectedSiteId: site.id,
          selectedSiteName: site.name,
          autoSelectSite: true
        }
      });
    } else {
      console.log('❌ site 정보가 없음:', site);
    }
  };

  // 현장명 편집 취소
  const handleCancelEdit = () => {
    setIsEditingName(false);
    setEditedName('');
  };

  // 현장명 저장
  const handleSaveName = async () => {
    if (!editedName.trim() || editedName.trim() === site.name) {
      handleCancelEdit();
      return;
    }

    setIsSaving(true);
    try {
      const siteRef = doc(db, 'sites', site.id);
      await updateDoc(siteRef, {
        name: editedName.trim()
      });
      
      // 성공 시 편집 모드 종료
      setIsEditingName(false);
      setEditedName('');
      
      // 부모 컴포넌트에 변경사항 알림 (필요한 경우)
      if (onClose) {
        // 잠시 후 팝업 닫기 (저장 완료 표시)
        setTimeout(() => {
          onClose();
        }, 500);
      }
    } catch (error) {
      console.error('현장명 저장 실패:', error);
      alert('현장명 저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  // Enter 키로 저장, Escape 키로 취소
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveName();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  // 계약정보 카드 더블클릭 핸들러 - 기성관리 페이지로 이동
  const handleContractInfoDoubleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (site && site.id) {
      onClose(); // 팝업 닫기
      // 기성관리 페이지로 이동하면서 해당 현장 선택
      // 현장별 기성현황 탭에 자동으로 해당 현장이 선택되도록 설정
      navigate(`/progress?siteId=${site.id}&viewMode=site&autoSelect=true`, {
        state: {
          fromSiteInfo: true,
          selectedSiteId: site.id,
          selectedSiteName: site.name,
          autoSelectSite: true
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
        
        // 총 기성금액 계산 (청구완료된 것만)
        const totalGisungAmount = gisungData
          .filter(item => item.claimStatus === '청구완료')
          .reduce((sum, item) => sum + Number(item.gisungAmount || 0), 0);
        
        // 기성률 계산: (총기성금액 + 선급금) / 총계약금액 * 100
        const contractAmount = Number(site.contractAmount) || 0;
        const advanceAmount = Number(site.advance || 0); // 선급금
        const totalProgressAmount = totalGisungAmount + advanceAmount;
        const rate = contractAmount > 0 ? Math.round((totalProgressAmount / contractAmount) * 100) : 0;
        
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
    // 무조건 정수로 반올림하여 표시
    const roundedAmount = Math.round(Number(amount));
    return new Intl.NumberFormat('ko-KR').format(roundedAmount) + '원';
  };

  const formatProgress = (progress) => {
    if (!progress) return '-';
    return `${progress}%`;
  };

  // 모바일에서는 팝업을 표시하지 않음 (주석 처리하여 모바일에서도 작동하도록 함)
  // if (isMobile) {
  //   return null;
  // }

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
        maxHeight: 'calc(90vh - 120px)',
        '&::-webkit-scrollbar': {
          width: '8px'
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: '#2d3748',
          borderRadius: '4px'
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: '#4a5568',
          borderRadius: '4px',
          '&:hover': {
            backgroundColor: '#718096'
          }
        }
      }}>
        <Grid container spacing={2}>
          {/* 현장 기본 정보 */}
          <Grid size={{ xs: 12 }}>
            <Card 
              sx={{ 
                bgcolor: '#232b3b', 
                border: '1px solid #333',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  bgcolor: '#2c3446',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
                }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                  {isEditingName ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TextField
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        autoFocus
                        size="small"
                        sx={{
                          '& .MuiInputBase-input': {
                            color: '#90caf9',
                            fontWeight: 700,
                            fontSize: '1.8rem',
                            padding: '8px 12px'
                          },
                          '& .MuiOutlinedInput-root': {
                            '& fieldset': {
                              borderColor: '#90caf9'
                            },
                            '&:hover fieldset': {
                              borderColor: '#90caf9'
                            },
                            '&.Mui-focused fieldset': {
                              borderColor: '#90caf9'
                            }
                          }
                        }}
                      />
                      <Button
                        onClick={handleSaveName}
                        disabled={isSaving}
                        size="small"
                        sx={{ 
                          color: '#22c55e',
                          minWidth: 'auto',
                          px: 1
                        }}
                      >
                        {isSaving ? '저장중...' : '저장'}
                      </Button>
                      <Button
                        onClick={handleCancelEdit}
                        size="small"
                        sx={{ 
                          color: '#ef4444',
                          minWidth: 'auto',
                          px: 1
                        }}
                      >
                        취소
                      </Button>
                    </Box>
                  ) : (
                    <Typography 
                      variant="h5" 
                      sx={{ 
                        color: '#90caf9', 
                        fontWeight: 700,
                        fontSize: '1.8rem',
                        cursor: 'pointer',
                        '&:hover': {
                          textDecoration: 'underline',
                          color: '#64b5f6'
                        }
                      }}
                      onClick={handleSiteNameClick}
                      onDoubleClick={handleSiteNameDoubleClick}
                      title="클릭: 현장관리로 이동, 더블클릭: 현장명 편집"
                    >
                      {site.name}
                    </Typography>
                  )}
                  <Chip
                    label={site.status || '미정'}
                    sx={{
                      bgcolor: getStatusColor(site.status),
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      '&:hover': {
                        opacity: 0.8,
                        transform: 'scale(1.05)'
                      }
                    }}
                    onClick={handleSiteNameClick}
                    title="클릭하여 현장관리로 이동"
                  />
                  <Chip
                    label={site.contractType || '미정'}
                    sx={{
                      bgcolor: getContractTypeColor(site.contractType),
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      '&:hover': {
                        opacity: 0.8,
                        transform: 'scale(1.05)'
                      }
                    }}
                    onClick={handleSiteNameClick}
                    title="클릭하여 현장관리로 이동"
                  />
                </Box>

                <Grid container spacing={2}>
                  {/* 소장 정보 */}
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <PersonIcon sx={{ color: '#90caf9', fontSize: '1.2rem' }} />
                      <Typography sx={{ color: '#bbb', fontSize: '0.9rem' }}>소장</Typography>
                    </Box>
                    <Typography 
                      sx={{ 
                        color: '#fff', 
                        fontWeight: 600,
                        cursor: 'pointer',
                        '&:hover': {
                          textDecoration: 'underline',
                          color: '#64b5f6'
                        }
                      }}
                      onClick={handleSiteNameClick}
                      title="클릭하여 현장관리로 이동"
                    >
                      {site.manager || '-'}
                    </Typography>
                  </Grid>

                  {/* 연락처 */}
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <PhoneIcon sx={{ color: '#90caf9', fontSize: '1.2rem' }} />
                      <Typography sx={{ color: '#bbb', fontSize: '0.9rem' }}>연락처</Typography>
                    </Box>
                    <Typography 
                      sx={{ 
                        color: '#fff', 
                        fontWeight: 600,
                        cursor: 'pointer',
                        '&:hover': {
                          textDecoration: 'underline',
                          color: '#64b5f6'
                        }
                      }}
                      onClick={handleSiteNameClick}
                      title="클릭하여 현장관리로 이동"
                    >
                      {site.phone || '-'}
                    </Typography>
                  </Grid>

                  {/* 주소 */}
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <LocationIcon sx={{ color: '#90caf9', fontSize: '1.2rem' }} />
                      <Typography sx={{ color: '#bbb', fontSize: '0.9rem' }}>주소</Typography>
                    </Box>
                    <Typography 
                      sx={{ 
                        color: '#fff', 
                        fontWeight: 600,
                        cursor: 'pointer',
                        '&:hover': {
                          textDecoration: 'underline',
                          color: '#64b5f6'
                        }
                      }}
                      onClick={handleSiteNameClick}
                      title="클릭하여 현장관리로 이동"
                    >
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
                      {formatNumberWithCommas(site.note || '-')}
                    </Typography>
                  </Grid>
                  <Grid xs={12} md={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography sx={{ color: '#bbb', fontSize: '0.9rem' }}>물량내역</Typography>
                    </Box>
                    <Box sx={{
                      bgcolor: '#1b2130',
                      border: '1px solid #2e3445',
                      borderRadius: 1,
                      overflow: 'hidden'
                    }}>
                      {/* Header */}
                      <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: '1.2fr 1fr 0.8fr 0.8fr',
                        gap: 0,
                        bgcolor: '#222938',
                        borderBottom: '1px solid #2e3445'
                      }}>
                        <Typography sx={{ color: '#9fb0c9', fontSize: '0.8rem', fontWeight: 700, p: 1, textAlign: 'center' }}>항목</Typography>
                        <Typography sx={{ color: '#9fb0c9', fontSize: '0.8rem', fontWeight: 700, p: 1, borderLeft: '1px solid #2e3445', textAlign: 'center' }}>규격</Typography>
                        <Typography sx={{ color: '#9fb0c9', fontSize: '0.8rem', fontWeight: 700, p: 1, borderLeft: '1px solid #2e3445', textAlign: 'center' }}>단위</Typography>
                        <Typography sx={{ color: '#9fb0c9', fontSize: '0.8rem', fontWeight: 700, p: 1, borderLeft: '1px solid #2e3445', textAlign: 'center' }}>물량</Typography>
                      </Box>
                      {/* Rows */}
                      <Box sx={{
                        maxHeight: 220,
                        overflowY: 'auto',
                        '&::-webkit-scrollbar': {
                          width: '6px'
                        },
                        '&::-webkit-scrollbar-track': {
                          backgroundColor: '#1b2130',
                          borderRadius: '3px'
                        },
                        '&::-webkit-scrollbar-thumb': {
                          backgroundColor: '#4a5568',
                          borderRadius: '3px',
                          '&:hover': {
                            backgroundColor: '#718096'
                          }
                        }
                      }}>
                        {Array.isArray(site.items) && site.items.length > 0 ? (
                          site.items
                            .filter((raw) => {
                              const item = typeof raw === 'object' ? raw : {};
                              const hasName = (item.name || '').toString().trim() !== '';
                              const hasSpec = (item.specification || '').toString().trim() !== '';
                              const hasUnit = (item.unit || '').toString().trim() !== '';
                              const hasQty = Number(item.quantity || item.qty || 0) > 0;

                              // 제외 키워드 필터: NEGO, 단수정리, 총공사계, 부가세, 계약금액
                              const blocked = ['nego', '단수정리', '총공사계', '부가세', '계약금액'];
                              const nameLower = (item.name || '').toString().toLowerCase();
                              const specLower = (item.specification || '').toString().toLowerCase();
                              const isBlocked = blocked.some(k => nameLower.includes(k) || specLower.includes(k));

                              if (isBlocked) return false;
                              return hasName || hasSpec || hasUnit || hasQty;
                            })
                            .map((raw, idx) => {
                              const item = typeof raw === 'object' ? raw : {};
                              const name = (item.name || '').toString() || '-';
                              const spec = (item.specification || '').toString() || '-';
                              const unit = (item.unit || '').toString() || '-';
                              const qtyVal = item.quantity ?? item.qty ?? '';
                              const qty = qtyVal === '' || qtyVal === null ? '-' : 
                                typeof qtyVal === 'number' ? Math.round(qtyVal).toLocaleString() : 
                                !isNaN(Number(qtyVal)) ? Math.round(Number(qtyVal)).toLocaleString() : qtyVal;
                              return (
                                <Box key={idx} sx={{
                                  display: 'grid',
                                  gridTemplateColumns: '1.2fr 1fr 0.8fr 0.8fr',
                                  borderBottom: '1px solid #2e3445',
                                  '&:last-of-type': { borderBottom: 'none' }
                                }}>
                                  <Typography sx={{ color: '#e5e7eb', fontSize: '0.85rem', p: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</Typography>
                                  <Typography sx={{ color: '#c7cfdd', fontSize: '0.85rem', p: 1, borderLeft: '1px solid #2e3445', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{spec}</Typography>
                                  <Typography sx={{ color: '#c7cfdd', fontSize: '0.85rem', p: 1, borderLeft: '1px solid #2e3445', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{unit}</Typography>
                                  <Typography sx={{ color: '#e5e7eb', fontSize: '0.85rem', p: 1, borderLeft: '1px solid #2e3445', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{qty}</Typography>
                                </Box>
                              );
                            })
                        ) : (
                          <Box sx={{ p: 2 }}>
                            <Typography sx={{ color: '#8b95a7', fontSize: '0.85rem' }}>-</Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>
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