import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Alert,
  IconButton,
  TablePagination,
  InputAdornment,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider,
  Container
} from '@mui/material';
import MobileSidebar from '../components/MobileSidebar';
import {
  Business as BusinessIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  ArrowBack as ArrowBackIcon,
  FileDownload as FileDownloadIcon,
  TrendingUp as TrendingUpIcon,
  BarChart as BarChartIcon
} from '@mui/icons-material';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase';
import { subMonths, format, startOfMonth, endOfMonth, eachMonthOfInterval, startOfYear, endOfYear } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Chart.js 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const EstimateAnalysis = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  
  const [estimates, setEstimates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 기간 설정 (기본 현재 년도 1월~12월)
  const [startDate, setStartDate] = useState(() => {
    const currentYear = new Date().getFullYear();
    return new Date(currentYear, 0, 1); // 1월 1일
  });
  const [endDate, setEndDate] = useState(() => {
    const currentYear = new Date().getFullYear();
    return new Date(currentYear, 11, 31); // 12월 31일
  });
  
  // 페이지네이션
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // 검색 및 정렬
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('total'); // total, company, requester, winRate
  const [sortOrder, setSortOrder] = useState('desc'); // asc, desc
  
  // 확장된 행 상태
  const [expandedRow, setExpandedRow] = useState(null);
  
  // 탭 상태 (기본값을 트렌드분석으로 변경)
  const [activeTab, setActiveTab] = useState(0);
  
  // 수주 현장 모달 상태
  const [winModalOpen, setWinModalOpen] = useState(false);
  const [selectedMonthData, setSelectedMonthData] = useState(null);
  
  // 회사별현황 탭용 월별 네비게이션 상태
  const [companyTabYear, setCompanyTabYear] = useState(new Date().getFullYear());
  const [companyTabMonth, setCompanyTabMonth] = useState(new Date().getMonth() + 1);
  
  // 기간 설정 상태 (회사별 현황용)
  const [companyStartDate, setCompanyStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1); // 이번 달 1일
  });
  const [companyEndDate, setCompanyEndDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0); // 이번 달 마지막 날
  });
  
  // 회사 필터 상태
  const [selectedCompany, setSelectedCompany] = useState('');
  const [companyList, setCompanyList] = useState([]);
  
  // 회사 목록 로드
  const loadCompanyList = async () => {
    try {
      const estimatesQuery = query(collection(db, 'estimates'), orderBy('company', 'asc'));
      const snapshot = await getDocs(estimatesQuery);
      
      const companies = [...new Set(snapshot.docs
        .map(doc => doc.data().company)
        .filter(company => company && company.trim() !== '')
      )].sort();
      
      setCompanyList(companies);
    } catch (error) {
      console.error('회사 목록 로드 실패:', error);
    }
  };

  // 데이터 로드
  const loadEstimates = async () => {
    try {
      setLoading(true);
      const estimatesQuery = query(
        collection(db, 'estimates'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(estimatesQuery);
      const estimatesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEstimates(estimatesData);
    } catch (err) {
      console.error('견적 데이터 로드 실패:', err);
      setError('견적 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEstimates();
    loadCompanyList();
  }, []);

  // 기간 필터링된 견적 데이터 (제출 날짜 기준)
  const filteredEstimates = useMemo(() => {
    console.log('=== 날짜 필터링 디버깅 ===');
    console.log('전체 견적 수:', estimates.length);
    console.log('시작 날짜:', startDate);
    console.log('종료 날짜:', endDate);
    
    const filtered = estimates.filter(estimate => {
      // 제출 날짜 기준으로 필터링 (createdAt 사용)
      const submissionDate = estimate.createdAt;
      if (!submissionDate) {
        console.log('날짜 없는 견적:', estimate.id);
        return false;
      }
      
      const date = submissionDate.toDate ? submissionDate.toDate() : new Date(submissionDate);
      const isInRange = date >= startDate && date <= endDate;
      
      if (!isInRange) {
        console.log('날짜 범위 밖 견적:', {
          id: estimate.id,
          date: date,
          company: estimate.company,
          siteName: estimate.siteName
        });
      }
      
      return isInRange;
    });
    
    console.log('필터링된 견적 수:', filtered.length);
    return filtered;
  }, [estimates, startDate, endDate]);

  // 회사별 통계 계산 (회사명으로만 그룹화)
  const companyStats = useMemo(() => {
    const stats = {};
    
    filteredEstimates.forEach(estimate => {
      const company = estimate.company || '미분류';
      const requester = estimate.requester || '미분류';
      
      if (!stats[company]) {
        stats[company] = {
          company,
          requesters: new Set(), // 의뢰자 목록을 Set으로 관리
          total: 0,
          won: 0,
          pending: 0, // 제출전
          hold: 0,    // 보류
          totalAmount: 0,
          wonAmount: 0,
          estimates: [] // 상세 견적 목록
        };
      }
      
      // 의뢰자 추가
      stats[company].requesters.add(requester);
      
      stats[company].total += 1;
      stats[company].totalAmount += estimate.contractAmount || 0;
      stats[company].estimates.push(estimate);
      
      if (estimate.contractStatus === '수주') {
        stats[company].won += 1;
        stats[company].wonAmount += estimate.contractAmount || 0;
      } else if (estimate.submissionStatus === '제출대기') {
        stats[company].pending += 1; // 제출전
      } else if (estimate.submissionStatus === '보류') {
        stats[company].hold += 1; // 보류
      }
    });
    
    // Set을 배열로 변환하고 정렬
    Object.keys(stats).forEach(company => {
      const stat = stats[company];
      stat.requesters = Array.from(stat.requesters).sort();
      stat.winRate = stat.total > 0 ? (stat.won / stat.total * 100).toFixed(1) : 0;
      stat.amountWinRate = stat.totalAmount > 0 ? (stat.wonAmount / stat.totalAmount * 100).toFixed(1) : 0;
    });
    
    return stats;
  }, [filteredEstimates]);

  // 회사별현황 탭용 기간 필터링된 데이터
  const companyTabFilteredEstimates = useMemo(() => {
    if (!estimates.length) return [];
    
    return estimates.filter(estimate => {
      const estimateDate = estimate.createdAt?.toDate ? estimate.createdAt.toDate() : new Date(estimate.createdAt);
      const isInDateRange = estimateDate >= companyStartDate && estimateDate <= companyEndDate;
      
      // 회사 필터 적용
      const matchesCompany = !selectedCompany || estimate.company === selectedCompany;
      
      // 검색어 필터 적용 (의뢰자명)
      const matchesSearch = !searchTerm || 
        (estimate.requester && estimate.requester.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return isInDateRange && matchesCompany && matchesSearch;
    });
  }, [estimates, companyStartDate, companyEndDate, selectedCompany, searchTerm]);

  // 회사별현황 탭용 통계
  const companyTabStats = useMemo(() => {
    const stats = {};
    
    companyTabFilteredEstimates.forEach(estimate => {
      const company = estimate.company || '미분류';
      const requester = estimate.requester || '미분류';
      
      if (!stats[company]) {
        stats[company] = {
          company,
          total: 0,
          won: 0,
          pending: 0,
          hold: 0,
          totalAmount: 0,
          wonAmount: 0,
          requesters: new Set(),
          estimates: [] // 상세 견적 목록
        };
      }
      
      // 의뢰자 추가
      stats[company].requesters.add(requester);
      
      stats[company].total += 1;
      stats[company].totalAmount += estimate.contractAmount || 0;
      stats[company].estimates.push(estimate);
      
      if (estimate.contractStatus === '수주') {
        stats[company].won += 1;
        stats[company].wonAmount += estimate.contractAmount || 0;
      } else if (estimate.submissionStatus === '제출대기') {
        stats[company].pending += 1; // 제출전
      } else if (estimate.submissionStatus === '보류') {
        stats[company].hold += 1; // 보류
      }
    });
    
    // Set을 배열로 변환하고 정렬
    Object.keys(stats).forEach(company => {
      const stat = stats[company];
      stat.requesters = Array.from(stat.requesters).sort();
      stat.winRate = stat.total > 0 ? (stat.won / stat.total * 100).toFixed(1) : 0;
      stat.amountWinRate = stat.totalAmount > 0 ? (stat.wonAmount / stat.totalAmount * 100).toFixed(1) : 0;
    });
    
    return stats;
  }, [companyTabFilteredEstimates]);

  // 회사별현황 탭용 전체 통계
  const companyTabTotalStats = useMemo(() => {
    const total = companyTabFilteredEstimates.length;
    const won = companyTabFilteredEstimates.filter(e => e.contractStatus === '수주').length;
    const pending = companyTabFilteredEstimates.filter(e => e.submissionStatus === '제출대기').length;
    const hold = companyTabFilteredEstimates.filter(e => e.submissionStatus === '보류').length;
    
    const totalAmount = companyTabFilteredEstimates.reduce((sum, e) => sum + (e.contractAmount || 0), 0);
    const wonAmount = companyTabFilteredEstimates
      .filter(e => e.contractStatus === '수주')
      .reduce((sum, e) => sum + (e.contractAmount || 0), 0);
    
    return {
      total,
      won,
      pending,
      hold,
      totalAmount,
      wonAmount,
      winRate: total > 0 ? (won / total * 100).toFixed(1) : 0,
      amountWinRate: totalAmount > 0 ? (wonAmount / totalAmount * 100).toFixed(1) : 0
    };
  }, [companyTabFilteredEstimates]);

  // 전체 통계
  const totalStats = useMemo(() => {
    const total = filteredEstimates.length;
    const won = filteredEstimates.filter(e => e.contractStatus === '수주').length;
    const pending = filteredEstimates.filter(e => e.submissionStatus === '제출대기').length;
    const hold = filteredEstimates.filter(e => e.submissionStatus === '보류').length;
    
    const totalAmount = filteredEstimates.reduce((sum, e) => sum + (e.contractAmount || 0), 0);
    const wonAmount = filteredEstimates
      .filter(e => e.contractStatus === '수주')
      .reduce((sum, e) => sum + (e.contractAmount || 0), 0);
    
    return {
      total,
      won,
      pending,
      hold,
      totalAmount,
      wonAmount,
      winRate: total > 0 ? (won / total * 100).toFixed(1) : 0,
      amountWinRate: totalAmount > 0 ? (wonAmount / totalAmount * 100).toFixed(1) : 0
    };
  }, [filteredEstimates]);

  // 월별 트렌드 데이터 생성 (1년 기준 1월~12월)
  const monthlyTrendData = useMemo(() => {
    const year = startDate.getFullYear();
    const months = [];
    
    // 1월부터 12월까지 생성
    for (let month = 0; month < 12; month++) {
      const monthDate = new Date(year, month, 1);
      months.push(monthDate);
    }

    const monthlyStats = months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthEstimates = filteredEstimates.filter(estimate => {
        const estimateDate = estimate.createdAt?.toDate ? estimate.createdAt.toDate() : new Date(estimate.createdAt);
        return estimateDate >= monthStart && estimateDate <= monthEnd;
      });

      const total = monthEstimates.length;
      const won = monthEstimates.filter(e => e.contractStatus === '수주').length;
      const totalAmount = monthEstimates.reduce((sum, e) => sum + (e.contractAmount || 0), 0);
      const wonAmount = monthEstimates
        .filter(e => e.contractStatus === '수주')
        .reduce((sum, e) => sum + (e.contractAmount || 0), 0);

      // 수주한 현장 정보만 추출
      const wonEstimates = monthEstimates.filter(e => e.contractStatus === '수주');

      return {
        month: format(month, 'yyyy-MM', { locale: ko }),
        monthLabel: format(month, 'M월', { locale: ko }),
        total,
        won,
        totalAmount,
        wonAmount,
        winRate: total > 0 ? (won / total * 100) : 0,
        amountWinRate: totalAmount > 0 ? (wonAmount / totalAmount * 100) : 0,
        wonEstimates: wonEstimates // 수주한 현장만 별도로 저장
      };
    });

    return monthlyStats;
  }, [filteredEstimates, startDate]);


  // 차트 옵션
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#fff'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#666',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#fff'
        },
        grid: {
          color: '#444'
        }
      },
      y: {
        ticks: {
          color: '#fff'
        },
        grid: {
          color: '#444'
        }
      }
    },
    onClick: (event, elements) => {
      if (elements.length > 0) {
        const elementIndex = elements[0].index;
        const monthData = monthlyTrendData[elementIndex];
        if (monthData && monthData.wonEstimates && monthData.wonEstimates.length > 0) {
          setSelectedMonthData(monthData);
          setWinModalOpen(true);
        }
      }
    }
  };

  // 월별 수주 건수 트렌드 차트 데이터
  const winCountChartData = {
    labels: monthlyTrendData.map(d => d.monthLabel),
    datasets: [
      {
        label: '수주 건수',
        data: monthlyTrendData.map(d => d.won),
        borderColor: '#4caf50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  // 월별 견적 수량 추이 차트 데이터
  const quantityChartData = {
    labels: monthlyTrendData.map(d => d.monthLabel),
    datasets: [
      {
        label: '총 견적 수',
        data: monthlyTrendData.map(d => d.total),
        backgroundColor: 'rgba(33, 150, 243, 0.8)',
        borderColor: '#2196f3',
        borderWidth: 1
      },
      {
        label: '수주 건수',
        data: monthlyTrendData.map(d => d.won),
        backgroundColor: 'rgba(76, 175, 80, 0.8)',
        borderColor: '#4caf50',
        borderWidth: 1
      }
    ]
  };

  // 검색 및 정렬된 회사별 데이터
  const sortedCompanyStats = useMemo(() => {
    let data = Object.entries(companyStats)
      .map(([company, stats]) => ({ company, ...stats }))
      .filter(item => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        return (
          item.company.toLowerCase().includes(searchLower) ||
          item.requesters.some(requester => requester.toLowerCase().includes(searchLower))
        );
      })
      .sort((a, b) => {
        let aValue, bValue;
        
        switch (sortBy) {
          case 'company':
            aValue = a.company;
            bValue = b.company;
            break;
          case 'requester':
            aValue = a.requesters.join(', ');
            bValue = b.requesters.join(', ');
            break;
          case 'won':
            aValue = a.won;
            bValue = b.won;
            break;
          case 'pending':
            aValue = a.pending;
            bValue = b.pending;
            break;
          case 'hold':
            aValue = a.hold;
            bValue = b.hold;
            break;
          case 'winRate':
            aValue = parseFloat(a.winRate);
            bValue = parseFloat(b.winRate);
            break;
          case 'total':
          default:
            aValue = a.total;
            bValue = b.total;
            break;
        }
        
        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
    
    return data;
  }, [companyStats, searchTerm, sortBy, sortOrder]);

  // 페이지네이션된 데이터
  const paginatedStats = useMemo(() => {
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return sortedCompanyStats.slice(start, end);
  }, [sortedCompanyStats, page, rowsPerPage]);

  // 정렬 핸들러
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(0); // 정렬 시 첫 페이지로 이동
  };

  // 행 확장/축소 핸들러
  const handleRowToggle = (key) => {
    setExpandedRow(expandedRow === key ? null : key);
  };

  const formatCurrency = (amount) => {
    if (!amount) return '0원';
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  const formatDate = (date) => {
    return format(date, 'yyyy-MM-dd', { locale: ko });
  };

  // 엑셀 다운로드 함수 (차트 포함)
  const handleExcelDownload = async () => {
    try {
      console.log('엑셀 다운로드 시작...');
      
      // 데이터 확인
      if (!sortedCompanyStats || sortedCompanyStats.length === 0) {
        alert('다운로드할 데이터가 없습니다.');
        return;
      }
      
      const workbook = new ExcelJS.Workbook();
      
      // 1. 데이터 시트 생성
      const dataSheet = workbook.addWorksheet('견적정리분석');
      
      // 제목 행 추가 (A1:H1 병합)
      dataSheet.mergeCells('A1:H1');
      const titleCell = dataSheet.getCell('A1');
      titleCell.value = `천우건업(주) 견적 현황[${format(companyStartDate, 'yyyy년MM월dd일')}~${format(companyEndDate, 'yyyy년MM월dd일')}]`;
      titleCell.font = { size: 20, bold: true };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      
      // 헤더 설정 (2행)
      const headerRow = dataSheet.getRow(2);
      headerRow.values = ['회사명', '의뢰자', '총 견적', '수주', '제출전', '보류', '수주율(%)', '비고'];
      
      // 컬럼 너비 설정
      dataSheet.columns = [
        { width: 20 }, // 회사명
        { width: 30 }, // 의뢰자
        { width: 12 }, // 총 견적
        { width: 12 }, // 수주
        { width: 12 }, // 제출전
        { width: 12 }, // 보류
        { width: 15 }, // 수주율(%)
        { width: 20 }  // 비고
      ];
      
      // 데이터 추가 (현재 필터링된 데이터 사용)
      const filteredStats = Object.values(companyTabStats);
      filteredStats.forEach((stat, index) => {
        const row = dataSheet.getRow(index + 3); // 3행부터 시작
        row.values = [
          stat.company || '',
          Array.isArray(stat.requesters) ? stat.requesters.join(', ') : '',
          stat.total || 0,
          stat.won || 0,
          stat.pending || 0,
          stat.hold || 0,
          stat.winRate || 0,
          '' // 비고 컬럼
        ];
      });
      
      // 헤더 스타일링 (2행)
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
      
      // 데이터 행 스타일링 및 테두리 추가
      for (let i = 2; i <= filteredStats.length + 2; i++) {
        const row = dataSheet.getRow(i);
        row.eachCell((cell) => {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          if (cell.col >= 3 && cell.col <= 6) { // 숫자 컬럼들
            cell.numFmt = '0';
          } else if (cell.col === 7) { // 수주율 컬럼
            cell.numFmt = '0.0';
          }
          
          // 테두리 추가
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          };
        });
      }
      
      // 2. 요약 시트 생성
      const summarySheet = workbook.addWorksheet('요약분석');
      
      // 요약 데이터 추가
      summarySheet.getCell('A1').value = '항목';
      summarySheet.getCell('B1').value = '값';
      
      const summaryData = [
        ['분석 기간', `${format(companyStartDate, 'yyyy-MM-dd')} ~ ${format(companyEndDate, 'yyyy-MM-dd')}`],
        ['선택된 회사', selectedCompany || '전체 회사'],
        ['총 회사 수', filteredStats.length],
        ['총 견적 수', filteredStats.reduce((sum, stat) => sum + (stat.total || 0), 0)],
        ['총 수주 수', filteredStats.reduce((sum, stat) => sum + (stat.won || 0), 0)],
        ['평균 수주율', filteredStats.length > 0 ? 
          (filteredStats.reduce((sum, stat) => sum + parseFloat(stat.winRate || 0), 0) / filteredStats.length).toFixed(1) + '%' : '0%'
        ]
      ];
      
      summaryData.forEach((row, index) => {
        summarySheet.getCell(`A${index + 2}`).value = row[0];
        summarySheet.getCell(`B${index + 2}`).value = row[1];
      });
      
      // 헤더 스타일링
      summarySheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
      
      // 파일 다운로드
      console.log('엑셀 파일 생성 중...');
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      const periodText = `${format(companyStartDate, 'yyyyMMdd')}_${format(companyEndDate, 'yyyyMMdd')}`;
      const companyText = selectedCompany ? `_${selectedCompany.replace(/[^a-zA-Z0-9가-힣]/g, '_')}` : '';
      link.setAttribute('download', `견적정리분석_${periodText}${companyText}.xlsx`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // 메모리 정리
      URL.revokeObjectURL(url);
      
      console.log('엑셀 다운로드 완료');
      alert('엑셀 파일이 다운로드되었습니다.');
    } catch (error) {
      console.error('엑셀 다운로드 실패:', error);
      alert(`엑셀 다운로드에 실패했습니다: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh',
      bgcolor: 'background.default',
      position: 'relative',
      pt: isMobile ? 5.5 : 5.5
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
          p: isMobile ? 2 : 3,
          bgcolor: '#1a1a1a', 
          minHeight: 'calc(100vh - 50px)',
          borderRadius: 2,
          boxShadow: 3,
          color: '#fff',
          // 스마트폰에서만 적용
          '@media (max-width: 767px)': {
            bgcolor: '#f5f5f5',
            color: '#333',
            p: 2
      }
    }}>
      {/* 스마트폰 전용 안내 메시지 */}
      <Box sx={{
        display: 'none',
        // 스마트폰에서만 표시
        '@media (max-width: 767px)': {
          display: 'block',
          bgcolor: 'white',
          borderRadius: '12px',
          p: 3,
          mb: 3,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          border: '2px solid #ff9800'
        }
      }}>
        <Typography variant="h6" sx={{ 
          color: '#ff9800', 
          fontWeight: 'bold', 
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          📊 복잡한 분석 기능
        </Typography>
        <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
          이 페이지는 복잡한 차트와 분석 기능을 포함하고 있어 스마트폰에서 사용하기 어렵습니다.
        </Typography>
        <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
          더 나은 사용 경험을 위해 웹 브라우저나 태블릿에서 이용해 주세요.
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate('/estimates')}
          sx={{
            bgcolor: '#2E7D32',
            '&:hover': { bgcolor: '#1B5E20' }
          }}
        >
          견적 관리로 돌아가기
        </Button>
      </Box>

      {/* 헤더 */}
      <Box sx={{ 
        mb: 4,
        // 스마트폰에서 숨김
        '@media (max-width: 767px)': {
          display: 'none'
        }
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <IconButton
            onClick={() => navigate('/estimates')}
            sx={{ 
              color: '#fff',
              backgroundColor: '#333',
              '&:hover': { backgroundColor: '#444' }
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" sx={{ color: '#fff', fontWeight: 600 }}>
            📊 견적 정리 분석
          </Typography>
        </Box>
        
        {/* 탭 메뉴 */}
        <Paper sx={{ bgcolor: '#232734', border: '1px solid #333', mb: 1 }}>
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            sx={{
              '& .MuiTab-root': {
                color: '#ccc',
                '&.Mui-selected': {
                  color: '#ff9800'
                }
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#ff9800'
              }
            }}
          >
            <Tab 
              icon={<TrendingUpIcon />} 
              label="트렌드 분석" 
              iconPosition="start"
            />
            <Tab 
              icon={<BarChartIcon />} 
              label="회사별 현황" 
              iconPosition="start"
            />
          </Tabs>
        </Paper>
        
        {/* 회사별현황 탭용 컨트롤 */}
        {activeTab === 1 && (
          <Paper sx={{ p: 2, bgcolor: '#232734', border: '1px solid #333', mb: 1 }}>
            <Grid container spacing={2} alignItems="center">
              {/* 기간 설정 */}
              <Grid item xs={12} md={4}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ color: '#ccc', minWidth: 60 }}>
                    기간:
                  </Typography>
                  <TextField
                    type="date"
                    value={format(companyStartDate, 'yyyy-MM-dd')}
                    onChange={(e) => setCompanyStartDate(new Date(e.target.value))}
                    size="small"
                    InputProps={{
                      sx: {
                        color: '#fff',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#666'
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#ff9800'
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#ff9800'
                        }
                      }
                    }}
                    sx={{ width: 150 }}
                  />
                  <Typography variant="body2" sx={{ color: '#ccc' }}>~</Typography>
                  <TextField
                    type="date"
                    value={format(companyEndDate, 'yyyy-MM-dd')}
                    onChange={(e) => setCompanyEndDate(new Date(e.target.value))}
                    size="small"
                    InputProps={{
                      sx: {
                        color: '#fff',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#666'
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#ff9800'
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#ff9800'
                        }
                      }
                    }}
                    sx={{ width: 150 }}
                  />
                </Box>
              </Grid>
              
              {/* 회사 필터 */}
              <Grid item xs={12} md={3}>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel sx={{ color: '#ccc' }}>회사 선택</InputLabel>
                  <Select
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value)}
                    sx={{
                      color: '#fff',
                      minWidth: 150,
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#666'
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#ff9800'
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#ff9800'
                      },
                      '& .MuiSvgIcon-root': {
                        color: '#ccc'
                      }
                    }}
                  >
                    <MenuItem value="">
                      <em>전체 회사</em>
                    </MenuItem>
                    {companyList.map((company) => (
                      <MenuItem key={company} value={company}>
                        {company}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              {/* 검색창 */}
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  placeholder="의뢰자명 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: '#666' }} />
                      </InputAdornment>
                    ),
                    endAdornment: searchTerm && (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setSearchTerm('')}
                          sx={{ color: '#666' }}
                        >
                          <CloseIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                    sx: {
                      backgroundColor: '#333',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#666'
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#ff9800'
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#ff9800'
                      },
                      '& .MuiInputBase-input': {
                        color: '#fff'
                      }
                    }
                  }}
                />
              </Grid>
              
              {/* 통계 정보 */}
              <Grid item xs={12} md={2}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ color: '#ccc' }}>총 견적:</Typography>
                    <Typography variant="body2" sx={{ color: '#fff', fontWeight: 'bold' }}>
                      {companyTabTotalStats.total}개
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ color: '#ccc' }}>수주:</Typography>
                    <Typography variant="body2" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                      {companyTabTotalStats.won}개 ({companyTabTotalStats.winRate}%)
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        )}
      </Box>


      {/* 탭별 콘텐츠 */}
      {activeTab === 1 && (
        /* 회사별 통계 테이블 */
        <Paper sx={{ bgcolor: '#232734', border: '1px solid #333' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
              회사별 견적 현황
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={handleExcelDownload}
              startIcon={<FileDownloadIcon />}
              sx={{
                borderColor: '#666',
                color: '#fff',
                '&:hover': { borderColor: '#ff9800' }
              }}
            >
              엑셀 다운로드
            </Button>
          </Box>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#1a1a1a' }}>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold', fontSize: '1rem' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    회사명
                    <IconButton size="small" onClick={() => handleSort('company')}>
                      {sortBy === 'company' && sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ color: '#ff9800' }} /> : <ArrowDownwardIcon sx={{ color: '#666' }} />}
                    </IconButton>
                  </Box>
                </TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold', fontSize: '1rem' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    의뢰자
                    <IconButton size="small" onClick={() => handleSort('requester')}>
                      {sortBy === 'requester' && sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ color: '#ff9800' }} /> : <ArrowDownwardIcon sx={{ color: '#666' }} />}
                    </IconButton>
                  </Box>
                </TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold', textAlign: 'center', fontSize: '1rem' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    총 견적
                    <IconButton size="small" onClick={() => handleSort('total')}>
                      {sortBy === 'total' && sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ color: '#ff9800' }} /> : <ArrowDownwardIcon sx={{ color: '#666' }} />}
                    </IconButton>
                  </Box>
                </TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold', textAlign: 'center', fontSize: '1rem' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    수주
                    <IconButton size="small" onClick={() => handleSort('won')}>
                      {sortBy === 'won' && sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ color: '#ff9800' }} /> : <ArrowDownwardIcon sx={{ color: '#666' }} />}
                    </IconButton>
                  </Box>
                </TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold', textAlign: 'center', fontSize: '1rem' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    제출전
                    <IconButton size="small" onClick={() => handleSort('pending')}>
                      {sortBy === 'pending' && sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ color: '#ff9800' }} /> : <ArrowDownwardIcon sx={{ color: '#666' }} />}
                    </IconButton>
                  </Box>
                </TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold', textAlign: 'center', fontSize: '1rem' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    보류
                    <IconButton size="small" onClick={() => handleSort('hold')}>
                      {sortBy === 'hold' && sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ color: '#ff9800' }} /> : <ArrowDownwardIcon sx={{ color: '#666' }} />}
                    </IconButton>
                  </Box>
                </TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold', textAlign: 'center', fontSize: '1rem' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    수주율
                    <IconButton size="small" onClick={() => handleSort('winRate')}>
                      {sortBy === 'winRate' && sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ color: '#ff9800' }} /> : <ArrowDownwardIcon sx={{ color: '#666' }} />}
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.values(companyTabStats)
                .filter(stat => 
                  !searchTerm || 
                  stat.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  stat.requesters.some(requester => requester.toLowerCase().includes(searchTerm.toLowerCase()))
                )
                .sort((a, b) => {
                  if (sortBy === 'company') {
                    return sortOrder === 'asc' ? a.company.localeCompare(b.company) : b.company.localeCompare(a.company);
                  } else if (sortBy === 'requester') {
                    const aRequesters = a.requesters.join(', ');
                    const bRequesters = b.requesters.join(', ');
                    return sortOrder === 'asc' ? aRequesters.localeCompare(bRequesters) : bRequesters.localeCompare(aRequesters);
                  } else {
                    const aValue = a[sortBy];
                    const bValue = b[sortBy];
                    return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
                  }
                })
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map(({ company, requesters, total, won, pending, hold, winRate, estimates }) => (
                <React.Fragment key={company}>
                  <TableRow 
                    sx={{ 
                      '&:hover': { bgcolor: '#2a2a2a' },
                      cursor: 'pointer',
                      '& .MuiTableCell-root': { 
                        py: 1
                      }
                    }}
                    onClick={() => handleRowToggle(company)}
                  >
                    <TableCell sx={{ color: '#fff', fontWeight: 500 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <BusinessIcon sx={{ color: '#ff9800', mr: 1, fontSize: '1.2rem' }} />
                        <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '1rem' }}>{company}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 500 }}>
                      <Typography variant="body2" sx={{ fontSize: '1rem' }}>
                        {requesters.join(', ')}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ color: '#fff', textAlign: 'center', fontWeight: 'bold' }}>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          color: '#fff',
                          fontWeight: 'bold',
                          fontSize: '1.2rem'
                        }}
                      >
                        {total}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ color: '#4caf50', textAlign: 'center', fontWeight: 'bold' }}>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          color: won === 0 ? '#fff' : '#4caf50',
                          fontWeight: 'bold',
                          fontSize: '1.2rem'
                        }}
                      >
                        {won}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ color: '#ff9800', textAlign: 'center', fontWeight: 'bold' }}>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          color: pending === 0 ? '#fff' : '#ff9800',
                          fontWeight: 'bold',
                          fontSize: '1.2rem'
                        }}
                      >
                        {pending}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ color: '#f44336', textAlign: 'center', fontWeight: 'bold' }}>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          color: hold === 0 ? '#fff' : '#f44336',
                          fontWeight: 'bold',
                          fontSize: '1.2rem'
                        }}
                      >
                        {hold}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ color: '#fff', textAlign: 'center', fontWeight: 'bold' }}>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          color: (() => {
                            const rate = parseFloat(winRate);
                            if (rate >= 0.1 && rate < 10) return '#fff';      // 0.1~9.9%: 흰색
                            if (rate >= 10 && rate < 30) return '#ffeb3b';     // 10~29.9%: 노란색
                            if (rate >= 30 && rate < 50) return '#2196f3';     // 30~49.9%: 파란색
                            if (rate >= 50 && rate < 70) return '#4caf50';     // 50~69.9%: 초록색
                            if (rate >= 70 && rate < 90) return '#8d6e63';     // 70~89.9%: 갈색
                            if (rate >= 90 && rate <= 100) return '#f44336';   // 90~100%: 빨간색
                            return '#fff'; // 기본값
                          })(),
                          fontWeight: 'bold',
                          fontSize: '1.2rem'
                        }}
                      >
                        {winRate}%
                      </Typography>
                    </TableCell>
                  </TableRow>
                  
                  {/* 확장된 행 - 견적 상세 목록 */}
                  {expandedRow === company && (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ p: 0, bgcolor: '#1a1a1a' }}>
                        <Box sx={{ p: 1.5 }}>
                          {/* 수주된 견적 리스트 */}
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" sx={{ color: '#4caf50', mb: 1, fontWeight: 'bold', fontSize: '0.875rem' }}>
                              ✅ 수주 ({won}개)
                            </Typography>
                            <Box sx={{ 
                              display: 'flex', 
                              gap: 0.5, 
                              overflowX: 'auto',
                              pb: 0.5,
                              '&::-webkit-scrollbar': { display: 'none' },
                              scrollbarWidth: 'none',
                              msOverflowStyle: 'none'
                            }}>
                              {estimates
                                .filter(est => est.contractStatus === '수주')
                                .map((estimate, index) => (
                                  <Box key={index} sx={{ 
                                    p: 1, 
                                    minWidth: 160,
                                    bgcolor: '#2a2a2a', 
                                    borderRadius: 0.5,
                                    border: '1px solid #4caf50',
                                    flexShrink: 0
                                  }}>
                            <Typography variant="body2" sx={{ color: '#fff', fontWeight: 'bold', fontSize: '1rem', mb: 0.25 }}>
                              {estimate.siteName || '미입력'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#ccc', fontSize: '0.9rem' }}>
                              {estimate.createdAt ? format(estimate.createdAt.toDate(), 'yyyy-MM-dd') : '미입력'} | {estimate.requester || '미입력'}
                            </Typography>
                                  </Box>
                                ))}
                            </Box>
                          </Box>
                          
                          {/* 미수주 견적 리스트 */}
                          <Box>
                            <Typography variant="subtitle2" sx={{ color: '#ff9800', mb: 1, fontWeight: 'bold', fontSize: '0.875rem' }}>
                              ⏳ 미수주 ({pending + hold}개)
                            </Typography>
                            <Box sx={{ 
                              display: 'flex', 
                              gap: 0.5, 
                              overflowX: 'auto',
                              pb: 0.5,
                              '&::-webkit-scrollbar': { display: 'none' },
                              scrollbarWidth: 'none',
                              msOverflowStyle: 'none'
                            }}>
                              {estimates
                                .filter(est => est.contractStatus !== '수주')
                                .map((estimate, index) => (
                                  <Box key={index} sx={{ 
                                    p: 1, 
                                    minWidth: 160,
                                    bgcolor: '#2a2a2a', 
                                    borderRadius: 0.5,
                                    border: `1px solid ${estimate.submissionStatus === '보류' ? '#ff9800' : '#f44336'}`,
                                    flexShrink: 0
                                  }}>
                            <Typography variant="body2" sx={{ color: '#fff', fontWeight: 'bold', fontSize: '1rem', mb: 0.25 }}>
                              {estimate.siteName || '미입력'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#ccc', fontSize: '0.9rem', display: 'block', mb: 0.25 }}>
                              {estimate.createdAt ? format(estimate.createdAt.toDate(), 'yyyy-MM-dd') : '미입력'} | {estimate.requester || '미입력'}
                            </Typography>
                            <Typography variant="caption" sx={{ 
                              color: estimate.submissionStatus === '보류' ? '#ff9800' : '#f44336',
                              fontWeight: 'bold',
                              fontSize: '0.8rem'
                            }}>
                              {estimate.submissionStatus === '보류' ? '보류' : (estimate.contractStatus === '미수주' ? '' : (estimate.contractStatus || '미입력'))}
                            </Typography>
                                  </Box>
                                ))}
                            </Box>
                          </Box>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* 페이지네이션 */}
        <TablePagination
          component="div"
          count={Object.values(companyTabStats).filter(stat => 
            !searchTerm || 
            stat.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
            stat.requesters.some(requester => requester.toLowerCase().includes(searchTerm.toLowerCase()))
          ).length}
          page={page}
          onPageChange={(event, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
          sx={{
            color: '#fff',
            '& .MuiTablePagination-root': { color: '#fff' },
            '& .MuiTablePagination-selectLabel': { color: '#fff' },
            '& .MuiTablePagination-displayedRows': { color: '#fff' },
            '& .MuiTablePagination-select': { color: '#fff' },
            '& .MuiIconButton-root': { color: '#fff' }
          }}
        />
      </Paper>
      )}

      {activeTab === 0 && (
        /* 트렌드 분석 차트 */
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: -2.5 }}>
          {/* 년도 네비게이션 */}
          <Paper sx={{ p: 2, bgcolor: '#232734', border: '1px solid #333' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                📊 {startDate.getFullYear()}년 트렌드 분석
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    const newYear = startDate.getFullYear() - 1;
                    setStartDate(new Date(newYear, 0, 1));
                    setEndDate(new Date(newYear, 11, 31));
                  }}
                  sx={{
                    borderColor: '#666',
                    color: '#fff',
                    '&:hover': { borderColor: '#ff9800' }
                  }}
                >
                  ← 이전년도
                </Button>
                <Typography variant="body1" sx={{ color: '#fff', fontWeight: 'bold', minWidth: 80, textAlign: 'center' }}>
                  {startDate.getFullYear()}년
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    const newYear = startDate.getFullYear() + 1;
                    setStartDate(new Date(newYear, 0, 1));
                    setEndDate(new Date(newYear, 11, 31));
                  }}
                  sx={{
                    borderColor: '#666',
                    color: '#fff',
                    '&:hover': { borderColor: '#ff9800' }
                  }}
                >
                  다음년도 →
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    const currentYear = new Date().getFullYear();
                    setStartDate(new Date(currentYear, 0, 1));
                    setEndDate(new Date(currentYear, 11, 31));
                  }}
                  sx={{
                    borderColor: '#4caf50',
                    color: '#4caf50',
                    '&:hover': { borderColor: '#66bb6a' }
                  }}
                >
                  올해
                </Button>
              </Box>
            </Box>
          </Paper>

          {/* 월별 수주 건수 트렌드 */}
          <Paper sx={{ p: 3, bgcolor: '#232734', border: '1px solid #333' }}>
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600, mb: 2 }}>
              📈 월별 수주 건수 트렌드
            </Typography>
            <Box sx={{ height: 300 }}>
              <Line data={winCountChartData} options={chartOptions} />
            </Box>
          </Paper>

          {/* 월별 견적 수량 추이 */}
          <Paper sx={{ p: 3, bgcolor: '#232734', border: '1px solid #333' }}>
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600, mb: 2 }}>
              📊 월별 견적 수량 추이
            </Typography>
            <Box sx={{ height: 300 }}>
              <Bar data={quantityChartData} options={chartOptions} />
            </Box>
          </Paper>

        </Box>
      )}

      {/* 수주 현장 상세 모달 */}
      <Dialog 
        open={winModalOpen} 
        onClose={() => setWinModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#1a1a1a',
            color: '#fff',
            border: '1px solid #333'
          }
        }}
      >
        <DialogTitle sx={{ 
          color: '#fff', 
          borderBottom: '1px solid #333',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <TrendingUpIcon sx={{ color: '#4caf50' }} />
          {selectedMonthData?.monthLabel} 수주 현장 상세
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {selectedMonthData && (
            <Box sx={{ p: 3 }}>
              <Box sx={{ mb: 3, p: 2, bgcolor: '#2a2a2a', borderRadius: 1 }}>
                <Typography variant="h6" sx={{ color: '#4caf50', mb: 1 }}>
                  📊 {selectedMonthData.monthLabel} 수주 현황
                </Typography>
                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  <Chip 
                    label={`총 견적: ${selectedMonthData.total}개`} 
                    color="primary" 
                    variant="outlined"
                  />
                  <Chip 
                    label={`수주: ${selectedMonthData.won}개`} 
                    color="success" 
                    variant="outlined"
                  />
                  <Chip 
                    label={`수주율: ${selectedMonthData.winRate.toFixed(1)}%`} 
                    color="info" 
                    variant="outlined"
                  />
                  <Chip 
                    label={`수주금액: ${selectedMonthData.wonAmount.toLocaleString()}원`} 
                    color="warning" 
                    variant="outlined"
                  />
                </Box>
              </Box>
              
              <Typography variant="h6" sx={{ color: '#fff', mb: 2 }}>
                🏗️ 수주한 현장 목록
              </Typography>
              
              {selectedMonthData.wonEstimates && selectedMonthData.wonEstimates.length > 0 ? (
                <List sx={{ bgcolor: '#2a2a2a', borderRadius: 1 }}>
                  {selectedMonthData.wonEstimates.map((estimate, index) => (
                    <React.Fragment key={estimate.id || index}>
                      <ListItem sx={{ py: 2 }}>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <BusinessIcon sx={{ color: '#ff9800', fontSize: '1.2rem' }} />
                              <Typography variant="h6" sx={{ color: '#fff' }}>
                                {estimate.siteName || '현장명 없음'}
                              </Typography>
                            </Box>
                          }
                          secondary={
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography variant="body2" sx={{ color: '#ccc' }}>
                                  <strong>회사:</strong> {estimate.company || '회사명 없음'}
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#ccc' }}>
                                  <strong>의뢰자:</strong> {estimate.requester || '의뢰자 없음'}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography variant="body2" sx={{ color: '#4caf50' }}>
                                  <strong>수주금액:</strong> {estimate.contractAmount?.toLocaleString() || 0}원
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#2196f3' }}>
                                  <strong>수주일:</strong> {estimate.createdAt?.toDate ? 
                                    format(estimate.createdAt.toDate(), 'yyyy-MM-dd') : 
                                    '날짜 없음'
                                  }
                                </Typography>
                              </Box>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < selectedMonthData.wonEstimates.length - 1 && <Divider sx={{ bgcolor: '#444' }} />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography sx={{ color: '#ccc' }}>
                    해당 월에 수주한 현장이 없습니다.
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #333' }}>
          <Button 
            onClick={() => setWinModalOpen(false)}
            variant="outlined"
            sx={{ color: '#fff', borderColor: '#666' }}
          >
            닫기
          </Button>
        </DialogActions>
      </Dialog>
        </Box>
      </Container>
    </Box>
  );
};

export default EstimateAnalysis;
