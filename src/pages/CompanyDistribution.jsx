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
  Timeline as TimelineIcon,
  CloudDownload as CloudDownloadIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { formatNumber } from '../utils/formatUtils';
import SiteInfoPopup from '../components/common/SiteInfoPopup';
import ExcelJS from 'exceljs';

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

  // 날짜 파싱 (Firestore Timestamp 또는 ISO 문자열 지원)
  const parseSiteDate = (value) => {
    if (value == null || value === '') return null;
    try {
      if (typeof value?.toDate === 'function') return value.toDate();
      const d = new Date(value);
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  };

  // 선택 연도에 해당하는 계약금액 비율 계산 (공사기간 비율로 나눔)
  const getProportionalContractAmount = (site, startOfYear, endOfYear) => {
    const startDate = parseSiteDate(site.startDate);
    const endDate = parseSiteDate(site.endDate);
    if (!startDate) return 0;
    const periodEnd = endDate || new Date(Math.max(new Date().getTime(), endOfYear.getTime()));
    const periodStart = startDate;
    const totalMs = periodEnd.getTime() - periodStart.getTime();
    const totalDays = Math.max(1, totalMs / (24 * 60 * 60 * 1000));
    const overlapStart = new Date(Math.max(periodStart.getTime(), startOfYear.getTime()));
    const overlapEnd = new Date(Math.min(periodEnd.getTime(), endOfYear.getTime()));
    const overlapMs = Math.max(0, overlapEnd.getTime() - overlapStart.getTime());
    const overlapDays = overlapMs / (24 * 60 * 60 * 1000);
    const ratio = totalDays > 0 ? Math.min(1, overlapDays / totalDays) : 0;
    const fullAmount = Number(site.contractAmount) || 0;
    const lastTwo = fullAmount % 100;
    const adjustedFull = lastTwo === 99 ? fullAmount + 1 : fullAmount;
    return Math.round(adjustedFull * ratio);
  };

  // 회사명 정규화: "(주)"와 "㈜" 등을 같은 키로 묶기 위함
  const normalizeCompanyKey = (name) => {
    if (!name || name === '미지정') return name || '미지정';
    const s = String(name).trim();
    return s.replace(/\(주\)/g, '㈜').replace(/\s+/g, '');
  };
  // 표시용 회사명 통일 (㈜ → (주)로 통일해 한 카드에 하나의 이름으로 표시)
  const normalizeCompanyDisplayName = (name) => {
    if (!name || name === '미지정') return name || '미지정';
    return String(name).trim().replace(/㈜/g, '(주)');
  };

  // 회사별 현장 분포 계산
  const companyDistribution = useMemo(() => {
    const startOfYear = new Date(selectedYear, 0, 1, 0, 0, 0);
    const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59);

    // 선택된 연도와 공사기간이 하루라도 겹치는 현장만 포함
    const yearSites = sites.filter(site => {
      const startDate = parseSiteDate(site.startDate);
      if (!startDate) return false;
      const endDate = parseSiteDate(site.endDate);
      if (startDate > endOfYear) return false;
      if (!endDate) return startDate <= endOfYear;
      if (endDate < startOfYear) return false;
      return true;
    });

    // 회사별로 그룹화 (정규화된 회사명 키 사용, 표시명은 통일)
    const companyMap = new Map();

    yearSites.forEach(site => {
      const rawCompanyName = site.companyName || '미지정';
      const companyKey = normalizeCompanyKey(rawCompanyName);

      // 미정 현장은 계약금액에 포함하지 않음
      if (site.status === '미정') {
        if (!companyMap.has(companyKey)) {
          companyMap.set(companyKey, {
            companyName: normalizeCompanyDisplayName(rawCompanyName),
            sites: [],
            totalContractAmount: 0,
            siteCount: 0,
            statusCounts: { '예정': 0, '진행중': 0, '완료': 0, '미정': 0 }
          });
        }
        const company = companyMap.get(companyKey);
        company.sites.push({
          id: site.id,
          name: site.name,
          status: site.status,
          startDate: site.startDate,
          endDate: site.endDate,
          contractAmount: 0,
          manager: site.manager
        });
        company.siteCount += 1;
        company.statusCounts[site.status] = (company.statusCounts[site.status] || 0) + 1;
        return;
      }

      // 해당 연도 공사기간 비율로 나눈 계약금액
      const proportionalAmount = getProportionalContractAmount(site, startOfYear, endOfYear);

      if (!companyMap.has(companyKey)) {
        companyMap.set(companyKey, {
          companyName: normalizeCompanyDisplayName(rawCompanyName),
          sites: [],
          totalContractAmount: 0,
          siteCount: 0,
          statusCounts: { '예정': 0, '진행중': 0, '완료': 0, '미정': 0 }
        });
      }
      const company = companyMap.get(companyKey);
      company.sites.push({
        id: site.id,
        name: site.name,
        status: site.status,
        startDate: site.startDate,
        endDate: site.endDate,
        contractAmount: proportionalAmount,
        manager: site.manager
      });
      company.totalContractAmount += proportionalAmount;
      company.siteCount += 1;
      company.statusCounts[site.status] = (company.statusCounts[site.status] || 0) + 1;
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

  // 엑셀 다운로드 (다른 페이지와 동일한 디자인 스타일)
  const handleExcelDownload = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = '천우 건설현장관리시스템';
      const sheet = workbook.addWorksheet(`${selectedYear}년도 회사별 현장`, { views: [{ state: 'frozen', ySplit: 5 }] });

      // 제목 행
      const titleRow = sheet.addRow([`천우건업(주) 회사별 현장 현황 - ${selectedYear}년`]);
      titleRow.font = { size: 16, bold: true, color: { argb: 'FF2E7D32' } };
      titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.mergeCells('A1:G1');

      sheet.addRow([]);

      const dateRow = sheet.addRow([`작성일: ${new Date().toLocaleDateString('ko-KR')}`]);
      dateRow.font = { size: 12, color: { argb: 'FF666666' } };
      dateRow.alignment = { horizontal: 'right' };
      sheet.mergeCells('A3:G3');

      sheet.addRow([]);

      // 헤더 행 (5행, 녹색은 A~G열만) 순서: 현장명 회사명 소장명 계약금액 착공일 준공일 상태
      const headers = ['현장명', '회사명', '소장명', '계약금액', '착공일', '준공일', '상태'];
      const headerRow = sheet.addRow(headers);
      headerRow.font = { size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
      const greenFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E7D32' } };
      const thinBlack = { style: 'thin', color: { argb: 'FF000000' } };
      for (let c = 1; c <= 7; c++) {
        headerRow.getCell(c).fill = greenFill;
        headerRow.getCell(c).border = { top: thinBlack, left: thinBlack, bottom: thinBlack, right: thinBlack };
      }

      // 컬럼 너비 (현장명 회사명 소장명 계약금액 착공일 준공일 상태)
      sheet.columns = [
        { width: 28 },
        { width: 22 },
        { width: 14 },
        { width: 16 },
        { width: 12 },
        { width: 12 },
        { width: 10 },
      ];

      let dataRowIndex = 5;
      companyDistribution.forEach(company => {
        company.sites.forEach((site, idx) => {
          const startStr = site.startDate ? (typeof site.startDate?.toDate === 'function' ? site.startDate.toDate().toLocaleDateString('ko-KR') : new Date(site.startDate).toLocaleDateString('ko-KR')) : '';
          const endStr = site.endDate ? (typeof site.endDate?.toDate === 'function' ? site.endDate.toDate().toLocaleDateString('ko-KR') : new Date(site.endDate).toLocaleDateString('ko-KR')) : '';
          const contractAmount = Number(site.contractAmount) || 0;
          const companyNameVal = idx === 0 ? company.companyName : '';
          const rowValues = [
            site.name || '',
            companyNameVal,
            site.manager || '',
            contractAmount,
            startStr,
            endStr,
            site.status || '',
          ];
          const row = sheet.addRow(rowValues);
          dataRowIndex++;

          const thinGray = { style: 'thin', color: { argb: 'FFCCCCCC' } };
          const hasData = (v) => v !== '' && v !== null && v !== undefined && String(v).trim() !== '';

          // 데이터 행 스타일
          row.font = { size: 11 };
          row.alignment = { horizontal: 'center', vertical: 'middle' };
          for (let c = 1; c <= 7; c++) {
            const val = rowValues[c - 1];
            const isFilled = c === 4 ? (typeof val === 'number' && !Number.isNaN(val)) : hasData(val);
            if (isFilled) {
              row.getCell(c).border = { top: thinGray, left: thinGray, bottom: thinGray, right: thinGray };
            }
          }
          row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };   // 현장명
          row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };   // 회사명
          row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };   // 소장명
          row.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };  // 계약금액

          // 계약금액 숫자 포맷
          row.getCell(4).numFmt = '#,##0';

          // 상태 셀 색상 (7열)
          const statusCell = row.getCell(7);
          const status = (site.status || '').trim();
          if (status === '예정') statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } };
          else if (status === '진행') statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E5F5' } };
          else if (status === '완료') statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E8' } };
          else if (status === '미정') statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3E0' } };
        });
      });

      // 데이터가 있으면 A5:G 영역을 엑셀 표(테이블)로 추가 (실패해도 다운로드는 진행)
      const lastDataRow = dataRowIndex - 1;
      if (lastDataRow >= 5) {
        try {
          sheet.addTable({
            name: 'CompanySiteTable',
            ref: `A5:G${lastDataRow}`,
            headerRow: true,
            style: {
              theme: 'TableStyleMedium9',
              showRowStripes: true,
              showColumnStripes: false
            },
            columns: [
              { name: '현장명', filterButton: true },
              { name: '회사명', filterButton: true },
              { name: '소장명', filterButton: true },
              { name: '계약금액', filterButton: true },
              { name: '착공일', filterButton: true },
              { name: '준공일', filterButton: true },
              { name: '상태', filterButton: true }
            ]
          });
        } catch (tableErr) {
          console.warn('엑셀 표 추가 생략:', tableErr);
        }
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedYear}년도_회사별현장.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('엑셀 다운로드 오류:', err);
      alert('엑셀 다운로드에 실패했습니다. 다시 시도해 주세요.');
    }
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
      height: '100%',
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
      overflowX: 'hidden',
      bgcolor: 'background.default',
      position: 'relative',
      boxSizing: 'border-box',
      '&::-webkit-scrollbar': { display: 'none' },
      scrollbarWidth: 'none',
      msOverflowStyle: 'none'
    }}>
      {/* 모바일 사이드바 */}
      <MobileSidebar />
      
      {/* 메인 콘텐츠 - 보이는 영역에 맞추고 스크롤 */}
      <Container 
        maxWidth={false} 
        sx={{ 
          flex: 1,
          minHeight: 0,
          pt: 5.5,
          pb: 3,
          px: 1,
          ml: 0,
          mr: 0,
          maxWidth: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <Box sx={{ 
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          bgcolor: '#1a1d21', 
          p: isMobile ? 2 : 3,
          borderRadius: 2,
          boxShadow: 3,
          '&::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
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
        
        {/* 연도 선택 + 엑셀 다운로드 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
          <Button
            variant="outlined"
            startIcon={<CloudDownloadIcon />}
            onClick={handleExcelDownload}
            sx={{
              color: '#10b981',
              borderColor: '#10b981',
              '&:hover': { borderColor: '#059669', bgcolor: 'rgba(16, 185, 129, 0.1)' },
            }}
          >
            엑셀 다운로드
          </Button>
        </Box>
      </Box>

      {/* 참여회사 · 총현장수 · 총계약금액 | 검색 · 정렬 (한 라인) */}
      <Paper sx={{ 
        p: 2, 
        mb: 3, 
        bgcolor: '#232734', 
        border: '1px solid #444',
        color: '#fff',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2
      }}>
        {/* 앞쪽: 참여회사, 총현장수, 총계약금액 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
            <Typography variant="h6" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
              {companyDistribution.length}
            </Typography>
            <Typography variant="body2" sx={{ color: '#aaa' }}>참여회사</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
            <Typography variant="h6" sx={{ color: '#2196f3', fontWeight: 'bold' }}>
              {companyDistribution.reduce((sum, company) => sum + company.siteCount, 0)}
            </Typography>
            <Typography variant="body2" sx={{ color: '#aaa' }}>총현장수</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
            <Typography variant="h6" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
              {(() => {
                const totalAmount = companyDistribution.reduce((sum, company) => sum + company.totalContractAmount, 0);
                const lastTwoDigits = totalAmount % 100;
                if (lastTwoDigits > 0) {
                  const roundedAmount = totalAmount + (100 - lastTwoDigits);
                  return formatNumber(roundedAmount, true);
                }
                return formatNumber(totalAmount, true);
              })()}
            </Typography>
            <Typography variant="body2" sx={{ color: '#aaa' }}>총계약금액</Typography>
          </Box>
        </Box>
        {/* 뒤쪽: 검색, 정렬 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="회사명 또는 현장명 검색"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{
              minWidth: 180,
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                '& fieldset': { borderColor: '#444' },
                '&:hover fieldset': { borderColor: '#666' },
                '&.Mui-focused fieldset': { borderColor: '#90caf9' },
              },
              '& .MuiInputBase-input': {
                color: '#fff',
                '&::placeholder': { color: '#888', opacity: 1 },
              },
            }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ color: '#aaa', whiteSpace: 'nowrap' }}>정렬</Typography>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={sortOrder}
                onChange={handleSortOrderChange}
                sx={{
                  color: '#fff',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#666' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#90caf9' },
                }}
              >
                <MenuItem value="가나다순">가나다순</MenuItem>
                <MenuItem value="현장개수순">현장개수순</MenuItem>
                <MenuItem value="금액순">금액순</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Paper>

      {/* 회사별 현장 카드 - CSS Grid로 한 줄 5개·폭 동일, 현장 목록 많으면 스크롤 */}
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          alignItems: 'stretch',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(5, minmax(0, 1fr))'
          }
        }}
      >
        {companyDistribution.map((company, index) => (
          <Card
            key={company.companyName}
            sx={{ 
              width: '100%',
              minWidth: 0,
              maxWidth: '100%',
              minHeight: 420,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              bgcolor: '#232734', 
              border: '1px solid #444',
              '&:hover': {
                borderColor: '#90caf9',
                transform: 'translateY(-2px)',
                transition: 'all 0.2s ease'
              }
            }}>
              <CardContent sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                {/* 회사명 헤더 */}
                <Box sx={{ 
                  flexShrink: 0,
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
                <Box sx={{ mb: 2, flexShrink: 0 }}>
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
                <Box sx={{ mb: 2, flexShrink: 0 }}>
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

                {/* 현장 목록 - 남는 영역 채우고 많으면 스크롤 */}
                <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="body2" sx={{ color: '#aaa', mb: 1, flexShrink: 0 }}>현장 목록:</Typography>
                  <Box sx={{ 
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    '&::-webkit-scrollbar': {
                      width: '6px'
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
        ))}
      </Box>

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
