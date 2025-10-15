import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  useTheme,
  useMediaQuery,
  IconButton,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  TextField,
  Container
} from '@mui/material';
import MobileSidebar from '../components/MobileSidebar';
import {
  ArrowBack as ArrowBackIcon,
  Business as BusinessIcon,
  LocationOn as LocationOnIcon,
  AttachMoney as AttachMoneyIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { formatNumber } from '../utils/formatUtils';
import SiteInfoPopup from '../components/common/SiteInfoPopup';

const CompanyDistribution = () => {
  const theme = useTheme();
  const isMobile = useTheme().breakpoints.down('md');
  const navigate = useNavigate();
  const location = useLocation();
  
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [sortOrder, setSortOrder] = useState('가나다순');
  const [searchTerm, setSearchTerm] = useState('');
  const [siteInfoPopup, setSiteInfoPopup] = useState({ open: false, site: null });

  // 현장 데이터 로드
  useEffect(() => {
    const fetchSites = async () => {
      try {
        setLoading(true);
        const sitesRef = collection(db, 'sites');
        const snapshot = await getDocs(sitesRef);
        const sitesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSites(sitesData);
      } catch (error) {
        console.error('현장 데이터 로드 오류:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSites();
  }, []);

  // 회사별 현장 분포 계산
  const companyDistribution = useMemo(() => {
    const startOfYear = new Date(selectedYear, 0, 1);
    const endOfYear = new Date(selectedYear, 11, 31);
    
    // 선택된 연도의 현장들만 필터링 (공사기간이 24년11월부터 26년1월까지인 경우 26년까지 포함)
    const yearSites = sites.filter(site => {
      if (!site.startDate) return false;
      try {
        const startDate = new Date(site.startDate);
        const endDate = site.endDate ? new Date(site.endDate) : null;
        
        // 시작일이 선택된 연도에 포함되는 경우
        const startsInYear = !isNaN(startDate.getTime()) && startDate >= startOfYear && startDate <= endOfYear;
        
        // 공사기간이 24년11월부터 26년1월까지인 경우 26년까지 계속 포함
        const isExtendedPeriod = false; // 기본값
        if (startDate && endDate) {
          const startYear = startDate.getFullYear();
          const startMonth = startDate.getMonth() + 1;
          const endYear = endDate.getFullYear();
          const endMonth = endDate.getMonth() + 1;
          
          // 24년11월부터 26년1월까지인 경우
          if ((startYear === 2024 && startMonth >= 11) || 
              (startYear === 2025) || 
              (startYear === 2026 && startMonth <= 1)) {
            // 26년까지는 계속 포함
            if (selectedYear <= 2026) {
              return true;
            }
          }
        }
        
        return startsInYear;
      } catch (error) {
        return false;
      }
    });

    // 회사별로 그룹화
    const companyMap = new Map();
    
    yearSites.forEach(site => {
      const companyName = site.companyName || '미지정';
      
      // 미정 현장은 계약금액에 포함하지 않음
      if (site.status === '미정') {
        const contractAmount = 0;
        
        if (!companyMap.has(companyName)) {
          companyMap.set(companyName, {
            companyName,
            sites: [],
            totalContractAmount: 0,
            siteCount: 0,
            statusCounts: { '예정': 0, '진행중': 0, '완료': 0, '미정': 0 }
          });
        }
        
        const company = companyMap.get(companyName);
        company.sites.push({
          id: site.id,
          name: site.name,
          status: site.status,
          startDate: site.startDate,
          endDate: site.endDate,
          contractAmount: contractAmount,
          manager: site.manager
        });
        
        company.totalContractAmount += contractAmount;
        company.siteCount += 1;
        company.statusCounts[site.status] = (company.statusCounts[site.status] || 0) + 1;
      } else {
        // 미정이 아닌 현장은 계약금액 계산 (십의자리, 일의자리가 99면 1원 추가)
        let contractAmount = Number(site.contractAmount) || 0;
        
        // 계약금액의 십의자리와 일의자리가 99면 1원 추가
        const lastTwoDigits = contractAmount % 100;
        if (lastTwoDigits === 99) {
          contractAmount += 1;
        }
        
        if (!companyMap.has(companyName)) {
          companyMap.set(companyName, {
            companyName,
            sites: [],
            totalContractAmount: 0,
            siteCount: 0,
            statusCounts: { '예정': 0, '진행중': 0, '완료': 0, '미정': 0 }
          });
        }
        
        const company = companyMap.get(companyName);
        company.sites.push({
          id: site.id,
          name: site.name,
          status: site.status,
          startDate: site.startDate,
          endDate: site.endDate,
          contractAmount: contractAmount,
          manager: site.manager
        });
        
        company.totalContractAmount += contractAmount;
        company.siteCount += 1;
        company.statusCounts[site.status] = (company.statusCounts[site.status] || 0) + 1;
      }
    });

    // 검색어가 있으면 필터링
  let filteredCompanies = Array.from(companyMap.values());
  
  if (searchTerm.trim()) {
    filteredCompanies = filteredCompanies.filter(company => {
      // 회사명으로 검색
      if (company.companyName.toLowerCase().includes(searchTerm.toLowerCase())) {
        return true;
      }
      // 현장명으로 검색
      return company.sites.some(site => 
        site.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }
  
  // "미지정"은 항상 뒤로
  filteredCompanies = filteredCompanies.sort((a, b) => {
    if (a.companyName === '미지정') return 1;
    if (b.companyName === '미지정') return -1;
    return 0;
  });
  
  // 나머지 회사들을 선택된 정렬 순서에 따라 정렬
  const nonUnassigned = filteredCompanies.filter(c => c.companyName !== '미지정');
  const unassigned = filteredCompanies.filter(c => c.companyName === '미지정');
  
  switch (sortOrder) {
    case '가나다순':
      nonUnassigned.sort((a, b) => a.companyName.localeCompare(b.companyName, 'ko'));
      break;
    case '현장개수순':
      nonUnassigned.sort((a, b) => b.siteCount - a.siteCount);
      break;
    case '금액순':
      nonUnassigned.sort((a, b) => b.totalContractAmount - a.totalContractAmount);
      break;
    default:
      nonUnassigned.sort((a, b) => a.companyName.localeCompare(b.companyName, 'ko'));
  }
  
  return [...nonUnassigned, ...unassigned];
  }, [sites, selectedYear, searchTerm, sortOrder]);

  // 연도 변경 핸들러
  const handleYearChange = (increment) => {
    setSelectedYear(prev => prev + increment);
  };

  // 정렬 순서 변경 핸들러
  const handleSortOrderChange = (event) => {
    setSortOrder(event.target.value);
  };

  // 현장 더블클릭 핸들러 (팝업 열기)
  const handleSiteDoubleClick = (site) => {
    console.log('🔍 현장 더블클릭:', site.name);
    setSiteInfoPopup({ open: true, site });
  };

  // 현장 클릭 핸들러 (아무 이벤트 없음)
  const handleSiteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // 아무 이벤트 없음
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>데이터를 불러오는 중...</Typography>
      </Box>
    );
  }

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
          pt: 5.5,
          pb: 3,
          px: 1,
          ml: 0,
          mr: 0,
          maxWidth: '100%'
        }}
      >
        <Box sx={{ 
          minHeight: '100vh', 
          bgcolor: '#1a1d21', 
          p: isMobile ? 2 : 3,
          borderRadius: 2,
          boxShadow: 3
    }}>
      {/* 헤더 */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        mb: 3,
        flexWrap: 'wrap',
        gap: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton 
            onClick={() => navigate(-1)} 
            sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" sx={{ color: '#fff', fontWeight: 'bold' }}>
            {selectedYear}년도 회사별 현장
          </Typography>
        </Box>
        
        {/* 연도 선택 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => handleYearChange(-1)}
            sx={{ color: '#fff', borderColor: '#fff' }}
          >
            {selectedYear - 1}
          </Button>
          <Typography sx={{ color: '#fff', px: 2, fontWeight: 'bold' }}>
            {selectedYear}
          </Typography>
          <Button
            variant="outlined"
            onClick={() => handleYearChange(1)}
            sx={{ color: '#fff', borderColor: '#fff' }}
          >
            {selectedYear + 1}
          </Button>
        </Box>
      </Box>

             {/* 검색 및 정렬 */}
       <Paper sx={{ 
         p: 2, 
         mb: 3, 
         bgcolor: '#232734', 
         border: '1px solid #444',
         color: '#fff'
       }}>
         <Grid container spacing={2} alignItems="center">
           <Grid item xs={12} sm={6}>
             <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
               <Typography variant="body2" sx={{ color: '#aaa', whiteSpace: 'nowrap' }}>
                 검색:
               </Typography>
               <TextField
                 size="small"
                 placeholder="회사명 또는 현장명으로 검색"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 sx={{
                   flex: 1,
                   '& .MuiOutlinedInput-root': {
                     color: '#fff',
                     '& fieldset': {
                       borderColor: '#444',
                     },
                     '&:hover fieldset': {
                       borderColor: '#666',
                     },
                     '&.Mui-focused fieldset': {
                       borderColor: '#90caf9',
                     },
                   },
                   '& .MuiInputBase-input': {
                     color: '#fff',
                     '&::placeholder': {
                       color: '#888',
                       opacity: 1,
                     },
                   },
                 }}
               />
             </Box>
           </Grid>
           <Grid item xs={12} sm={6}>
             <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }}>
               <Typography variant="body2" sx={{ color: '#aaa', whiteSpace: 'nowrap' }}>
                 정렬:
               </Typography>
               <FormControl size="small" sx={{ minWidth: 120 }}>
                 <Select
                   value={sortOrder}
                   onChange={handleSortOrderChange}
                   sx={{
                     color: '#fff',
                     '& .MuiOutlinedInput-notchedOutline': {
                       borderColor: '#444',
                     },
                     '&:hover .MuiOutlinedInput-notchedOutline': {
                       borderColor: '#666',
                     },
                     '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                       borderColor: '#90caf9',
                     },
                   }}
                 >
                   <MenuItem value="가나다순">가나다순</MenuItem>
                   <MenuItem value="현장개수순">현장개수순</MenuItem>
                   <MenuItem value="금액순">금액순</MenuItem>
                 </Select>
               </FormControl>
             </Box>
           </Grid>
         </Grid>
       </Paper>

       {/* 요약 정보 */}
       <Paper sx={{ 
         p: 2, 
         mb: 3, 
         bgcolor: '#232734', 
         border: '1px solid #444',
         color: '#fff'
       }}>
         <Grid container spacing={2}>
           <Grid item xs={12} sm={4}>
             <Box sx={{ textAlign: 'center' }}>
               <Typography variant="h6" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                 {companyDistribution.length}
               </Typography>
               <Typography variant="body2" sx={{ color: '#aaa' }}>참여 회사</Typography>
             </Box>
           </Grid>
           <Grid item xs={12} sm={4}>
             <Box sx={{ textAlign: 'center' }}>
               <Typography variant="h6" sx={{ color: '#2196f3', fontWeight: 'bold' }}>
                 {companyDistribution.reduce((sum, company) => sum + company.siteCount, 0)}
               </Typography>
               <Typography variant="body2" sx={{ color: '#aaa' }}>총 현장 수</Typography>
             </Box>
           </Grid>
           <Grid item xs={12} sm={4}>
             <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="h6" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
                   {(() => {
                     const totalAmount = companyDistribution.reduce((sum, company) => sum + company.totalContractAmount, 0);
                     // 총 계약금액의 십의자리와 일의자리가 99보다 작으면 100으로 올림
                     const lastTwoDigits = totalAmount % 100;
                     console.log('🔍 총 계약금액:', totalAmount, '마지막 두 자리:', lastTwoDigits);
                     if (lastTwoDigits > 0) {
                       const roundedAmount = totalAmount + (100 - lastTwoDigits);
                       console.log('✅ 올림 처리:', totalAmount, '→', roundedAmount);
                       return formatNumber(roundedAmount, true);
                     }
                     console.log('✅ 100의 배수로 끝남');
                     return formatNumber(totalAmount, true);
                   })()}
                 </Typography>
               <Typography variant="body2" sx={{ color: '#aaa' }}>총 계약금액</Typography>
             </Box>
           </Grid>
         </Grid>
       </Paper>

      {/* 회사별 현장 카드 */}
      <Grid container spacing={3}>
        {companyDistribution.map((company, index) => (
          <Grid item xs={12} md={6} lg={4} key={company.companyName} sx={{ minWidth: '350px' }}>
            <Card sx={{ 
              bgcolor: '#232734', 
              border: '1px solid #444',
              height: '100%',
              '&:hover': {
                borderColor: '#90caf9',
                transform: 'translateY(-2px)',
                transition: 'all 0.2s ease'
              }
            }}>
              <CardContent sx={{ p: 2 }}>
                {/* 회사명 헤더 */}
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1, 
                  mb: 2,
                  pb: 1,
                  borderBottom: '1px solid #444'
                }}>
                  <BusinessIcon sx={{ color: '#90caf9' }} />
                  <Typography variant="h6" sx={{ 
                    color: '#fff', 
                    fontWeight: 'bold',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {company.companyName}
                  </Typography>
                </Box>

                {/* 통계 정보 */}
                <Box sx={{ mb: 2 }}>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'rgba(76, 175, 80, 0.1)', borderRadius: 1 }}>
                        <Typography variant="h6" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                          {company.siteCount}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#aaa' }}>현장 수</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'rgba(33, 150, 243, 0.1)', borderRadius: 1 }}>
                        <Typography variant="h6" sx={{ color: '#2196f3', fontWeight: 'bold' }}>
                          {formatNumber(company.totalContractAmount, true)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#aaa' }}>계약금액</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>

                {/* 상태별 현장 수 */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ color: '#aaa', mb: 1 }}>상태별 현장:</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {Object.entries(company.statusCounts).map(([status, count]) => {
                      if (count === 0) return null;
                      const statusColors = {
                        '예정': '#ff9800',
                        '진행중': '#2196f3',
                        '완료': '#4caf50',
                        '미정': '#757575'
                      };
                      return (
                        <Chip
                          key={status}
                          label={`${status} ${count}`}
                          size="small"
                          sx={{
                            bgcolor: statusColors[status],
                            color: '#fff',
                            fontSize: '0.7rem'
                          }}
                        />
                      );
                    })}
                  </Box>
                </Box>

                                 {/* 현장 목록 */}
                 <Box>
                   <Typography variant="body2" sx={{ color: '#aaa', mb: 1 }}>현장 목록:</Typography>
                   <Box sx={{ 
                     maxHeight: '200px', 
                     overflowY: 'auto',
                     '&::-webkit-scrollbar': {
                       width: '8px'
                     },
                     '&::-webkit-scrollbar-track': {
                       background: '#1a1d21',
                       borderRadius: '4px'
                     },
                     '&::-webkit-scrollbar-thumb': {
                       background: '#444',
                       borderRadius: '4px',
                       '&:hover': {
                         background: '#666'
                       }
                     }
                   }}>
                    {company.sites.map((site) => (
                      <Box
                        key={site.id}
                        sx={{
                          p: 1,
                          mb: 0.5,
                          bgcolor: 'rgba(255,255,255,0.05)',
                          borderRadius: 1,
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: 'rgba(255,255,255,0.1)'
                          }
                        }}
                        onClick={handleSiteClick}
                        onDoubleClick={() => handleSiteDoubleClick(site)}
                        title="더블클릭하여 현장 정보 보기"
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ 
                            color: '#fff', 
                            fontSize: '0.8rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1
                          }}>
                            {site.name}
                          </Typography>
                          <Chip
                            label={site.status}
                            size="small"
                            sx={{
                              bgcolor: site.status === '완료' ? '#4caf50' : 
                                      site.status === '진행중' ? '#2196f3' : 
                                      site.status === '예정' ? '#ff9800' : '#757575',
                              color: '#fff',
                              fontSize: '0.6rem',
                              height: '20px'
                            }}
                          />
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                          <Typography variant="caption" sx={{ color: '#888', fontSize: '0.7rem' }}>
                            {site.manager || '담당자 미지정'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#888', fontSize: '0.7rem' }}>
                            {formatNumber(site.contractAmount, true)}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 데이터가 없는 경우 */}
      {companyDistribution.length === 0 && (
        <Box sx={{ 
          textAlign: 'center', 
          p: 4, 
          color: '#888',
          bgcolor: '#232734',
          borderRadius: 2,
          border: '1px solid #444'
        }}>
          <TimelineIcon sx={{ fontSize: '4rem', mb: 2, opacity: 0.5 }} />
          <Typography variant="h6" sx={{ mb: 1 }}>
            {selectedYear}년도 현장 데이터가 없습니다
          </Typography>
          <Typography variant="body2">
            다른 연도를 선택하거나 현장을 등록해주세요
          </Typography>
        </Box>
      )}

      {/* 현장 정보 팝업 */}
      <SiteInfoPopup
        open={siteInfoPopup.open}
        onClose={() => setSiteInfoPopup({ open: false, site: null })}
        site={siteInfoPopup.site}
      />
        </Box>
      </Container>
    </Box>
  );
};

export default CompanyDistribution;
