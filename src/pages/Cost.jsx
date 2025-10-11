import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, 
  Grid, 
  Paper, 
  Typography, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  IconButton, 
  Snackbar, 
  Alert, 
  useMediaQuery, 
  MenuItem,
  InputAdornment,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  Select,
  Checkbox,
  Autocomplete,
  Pagination,
  Stack
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  CloudDownload as CloudDownloadIcon,
  CloudUpload as CloudUploadIcon,
  Search as SearchIcon,
  Sort as SortIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { db } from '../firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, where, orderBy, serverTimestamp, getDocs, writeBatch } from 'firebase/firestore';
import { exportToExcel } from '../utils/excelUtils.jsx';
import ExcelJS from 'exceljs';
import { useAuth } from '../contexts/AuthContext';
import SearchableSiteSelect from '../components/common/SearchableSiteSelect';
import { syncCostToSite } from '../utils/integrationUtils';

// iOS 호환 날짜 파싱 함수
const parseDate = (dateStr) => {
  if (!dateStr) return new Date(0);
  
  // 문자열인 경우 iOS 호환 형식으로 변환
  if (typeof dateStr === 'string') {
    // YYYY-MM-DD 형식인 경우
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return new Date(dateStr + 'T12:00:00');
    }
    // YYYY-MM 형식인 경우 (월까지만 있는 경우)
    if (dateStr.match(/^\d{4}-\d{2}$/)) {
      return new Date(dateStr + '-01T12:00:00');
    }
    // YYYY.MM 형식인 경우
    if (dateStr.match(/^\d{4}\.\d{2}$/)) {
      const [year, month] = dateStr.split('.');
      return new Date(`${year}-${month}-01T12:00:00`);
    }
    // 다른 형식인 경우 그대로 파싱
    return new Date(dateStr);
  }
  
  // Firestore Timestamp인 경우
  if (dateStr.toDate) {
    return dateStr.toDate();
  }
  
  // Date 객체인 경우
  if (dateStr instanceof Date) {
    return dateStr;
  }
  
  return new Date(dateStr);
};

const Cost = ({ viewType, currentMonth, monthText, selectedSites, filteredData }) => {
  const { currentUser } = useAuth();
  const [costs, setCosts] = useState([]);
  const [sites, setSites] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('asc');
  const [isNewlyAdded, setIsNewlyAdded] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [form, setForm] = useState({
    site: '',
    itemType: '',
    date: '',
    totalValue: '',
    paymentType: '',
    description: '',
    sequence: '',
    subMaterialDetail: '기타', // 부자재 세부내용 (기타를 기본값으로)
    quantity: '', // 부자재 물량 (현장별 정산페이지용)
    taxDetail: '기타', // 세금 세부내용 (기타를 기본값으로)
    healthInsurance: [], // 건강보험 관련 데이터 [{name: '', amount: ''}]
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const isMobile = useMediaQuery('(max-width:900px)');

  // 실시간 지출 데이터 리스너
  useEffect(() => {
    // 실시간 리스너 설정 (항상 설정)
    const unsubscribe = onSnapshot(collection(db, 'costs'), (snapshot) => {
      const costsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log('실시간 데이터 업데이트:', costsData.length, '개');
      console.log('업데이트된 데이터 샘플:', costsData.slice(0, 2).map(cost => ({
        id: cost.id,
        site: cost.site,
        itemType: cost.itemType,
        paymentType: cost.paymentType,
        totalValue: cost.totalValue
      })));
      setCosts(costsData);
    }, (error) => {
      console.error('지출 데이터 실시간 리스너 오류:', error);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchSites = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'sites'));
        setSites(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error('현장명 목록 조회 실패:', error);
        setSites([]);
      }
    };
    fetchSites();
  }, []);

  // 검색이나 필터 조건이 변경될 때 첫 페이지로 이동
  useEffect(() => {
    setCurrentPage(1);
  }, [search, viewType, selectedSites, sortField, sortDirection]);

  // 검색 및 정렬된 데이터
  const filteredAndSortedCosts = useMemo(() => {
    let filtered = costs.filter(cost =>
      cost.site?.toLowerCase().includes(search.toLowerCase()) ||
      cost.itemType?.toLowerCase().includes(search.toLowerCase()) ||
      cost.paymentType?.toLowerCase().includes(search.toLowerCase()) ||
      cost.description?.toLowerCase().includes(search.toLowerCase())
    );

    // 월별 뷰에서는 선택된 월의 데이터만 표시
    if (viewType === 'month') {
      console.log('월별 뷰 - 선택된 월 필터링:', currentMonth);
      // 월별 필터링 적용
      if (currentMonth && typeof currentMonth === 'string' && currentMonth.includes('-')) {
        const [year, month] = currentMonth.split('-');
        filtered = filtered.filter(cost => {
          if (!cost.date) return false;
          const costDate = new Date(cost.date);
          return costDate.getFullYear() === parseInt(year) && 
                 (costDate.getMonth() + 1) === parseInt(month);
        });
        console.log('월별 필터링 결과:', filtered.length, '개');
      }
    } else if (viewType === 'site') {
      console.log('지출 현장별 필터링 적용:', selectedSites);
      
      // 현장이 선택되지 않은 경우 빈 배열 반환
      if (!selectedSites || selectedSites.length === 0) {
        console.log('현장 미선택 - 지출 데이터 없음');
        return [];
      }
      
      // 전체선택인지 확인
      const isAllSelected = selectedSites.some(site => {
        if (typeof site === 'string') {
          return site === '전체선택' || site === 'all';
        }
        if (site && typeof site === 'object') {
          return site.name === '전체선택' || site.id === 'all';
        }
        return false;
      });
      
      if (isAllSelected) {
        console.log('전체선택 - 모든 지출 데이터 표시');
        // 전체선택이 있으면 모든 데이터 표시 (기본 검색 필터만 적용)
      } else {
        // 특정 현장이 선택된 경우 해당 현장만 필터링
        console.log('특정 현장 선택됨 - 지출 필터링 적용');
        filtered = filtered.filter(cost => {
          const isSelected = selectedSites.some(selectedSite => {
            // 문자열인 경우 (현장명)
            if (typeof selectedSite === 'string') {
              return cost.site === selectedSite || cost.siteId === selectedSite;
            }
            // 객체인 경우 (현장 객체)
            if (selectedSite && typeof selectedSite === 'object') {
              return cost.site === selectedSite.name || cost.siteId === selectedSite.id;
            }
            return false;
          });
          
          console.log('지출 데이터 체크:', {
            costSite: cost.site,
            costSiteId: cost.siteId,
            selectedSites: selectedSites,
            isSelected: isSelected
          });
          return isSelected;
        });
        console.log('필터링된 지출 결과:', filtered.length, '개');
      }
    }

    // 클라이언트 사이드 정렬
    console.log('정렬 실행:', { sortField, sortDirection, filteredLength: filtered.length });
    filtered.sort((a, b) => {
      // 새로 추가된 항목이 있을 때만 createdAt으로 최신순 정렬
      if (isNewlyAdded) {
        const aCreatedAt = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt)) : new Date(0);
        const bCreatedAt = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt)) : new Date(0);
        
        // createdAt이 있으면 최신순으로 정렬 (내림차순)
        if (aCreatedAt.getTime() !== bCreatedAt.getTime()) {
          return bCreatedAt.getTime() - aCreatedAt.getTime();
        }
      }
      
      // 기존 정렬 로직 적용
      let aValue, bValue;
      
      if (sortField === 'totalValue') {
        aValue = Number(a.totalValue) || 0;
        bValue = Number(b.totalValue) || 0;
      } else if (sortField === 'date') {
        aValue = parseDate(a.date || 0);
        bValue = parseDate(b.date || 0);
      } else if (sortField === 'itemType') {
        aValue = String(a.itemType || '').toLowerCase();
        bValue = String(b.itemType || '').toLowerCase();
      } else if (sortField === 'sequence') {
        // 차수 문자열 정렬 (예: "2차-5" > "2차-1" > "1차")
        const getSequenceValue = (sequenceStr) => {
          if (!sequenceStr) return { base: 0, sub: 0 };
          const str = sequenceStr.toString();
          
          // 세분화된 차수 패턴 확인 (예: "2차-5")
          const subMatch = str.match(/(\d+)차-(\d+)/);
          if (subMatch) {
            return { base: Number(subMatch[1]), sub: Number(subMatch[2]) };
          }
          
          // 기본 차수 패턴 확인 (예: "2차")
          const baseMatch = str.match(/(\d+)차/);
          if (baseMatch) {
            return { base: Number(baseMatch[1]), sub: 0 };
          }
          
          return { base: 0, sub: 0 };
        };
        
        const aSeq = getSequenceValue(a.sequence);
        const bSeq = getSequenceValue(b.sequence);
        
        console.log('🔍 차수 정렬 비교:', {
          a: { sequence: a.sequence, parsed: aSeq },
          b: { sequence: b.sequence, parsed: bSeq }
        });
        
        // 먼저 기본 차수로 비교, 같으면 세분화 차수로 비교
        if (aSeq.base !== bSeq.base) {
          aValue = aSeq.base;
          bValue = bSeq.base;
        } else {
          // 같은 기본 차수일 때: 세분화된 차수가 있으면 위에, 없으면 아래에
          if (aSeq.sub > 0 && bSeq.sub > 0) {
            // 둘 다 세분화된 차수: 큰 숫자가 위에 (내림차순)
            aValue = bSeq.sub; // 내림차순을 위해 순서 바꿈
            bValue = aSeq.sub;
          } else if (aSeq.sub > 0 && bSeq.sub === 0) {
            // a는 세분화, b는 기본: a가 위에
            aValue = 0; // 세분화된 차수가 위에
            bValue = 1;
          } else if (aSeq.sub === 0 && bSeq.sub > 0) {
            // a는 기본, b는 세분화: b가 위에
            aValue = 1;
            bValue = 0; // 세분화된 차수가 위에
          } else {
            // 둘 다 기본 차수: 기본 차수로 비교
            aValue = aSeq.sub;
            bValue = bSeq.sub;
          }
        }
      } else {
        aValue = String(a[sortField] || '').toLowerCase();
        bValue = String(b[sortField] || '').toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    console.log('정렬 완료:', filtered.slice(0, 3).map(item => ({ itemType: item.itemType, sequence: item.sequence })));
    console.log('필터링된 데이터 개수:', filtered.length);

    return filtered;
  }, [costs, search, sortField, sortDirection, viewType, selectedSites, currentMonth, isNewlyAdded]);

  // 통계 데이터
  const stats = useMemo(() => {
    const filtered = filteredData || filteredAndSortedCosts;
    
    // 현장별 탭에서 현장이 선택되지 않은 경우 0으로 표시
    if (viewType === 'site' && (!selectedSites || selectedSites.length === 0)) {
      return { 
        totalValue: 0,
        totalCount: 0,
        siteCount: 0,
        itemTypeBreakdown: {}
      };
    }
    
    const totalValue = filtered.reduce((sum, cost) => {
      const baseAmount = Number(cost.totalValue || 0);
      const healthInsuranceTotal = cost.healthInsurance ? 
        cost.healthInsurance.reduce((total, item) => total + (Number(item.amount) || 0), 0) : 0;
      return sum + baseAmount + healthInsuranceTotal;
    }, 0);
    const totalCount = filtered.length;
    
    // 관련 현장 수 계산
    const uniqueSites = new Set(filtered.map(cost => cost.site).filter(Boolean));
    const siteCount = uniqueSites.size;
    
    // 항목별 분류 계산
    const itemTypeBreakdown = {};
    const detailedBreakdown = {
      '노무비': 0,
      '부자재비': 0,
      '장비비': 0,
      '경비': 0,
      '기타': 0
    };
    
    filtered.forEach(cost => {
      const itemType = cost.itemType || '기타';
      if (!itemTypeBreakdown[itemType]) {
        itemTypeBreakdown[itemType] = 0;
      }
      itemTypeBreakdown[itemType]++;
      
      // 상세 분류
      if (itemType === '노무비') detailedBreakdown['노무비']++;
      else if (itemType === '부자재비') detailedBreakdown['부자재비']++;
      else if (itemType === '장비비') detailedBreakdown['장비비']++;
      else if (itemType === '경비') detailedBreakdown['경비']++;
      else detailedBreakdown['기타']++;
    });
    
    return { 
      totalValue, 
      totalCount, 
      siteCount, 
      itemTypeBreakdown,
      detailedBreakdown
    };
  }, [filteredData, filteredAndSortedCosts, selectedSites, viewType, costs]);

  // 체크박스 관련 함수들
  const handleSelectAll = (event) => {
    if (event.target.checked) {
      // 현재 페이지의 모든 항목 선택
      setSelectedItems(prev => [...new Set([...prev, ...currentData.map(item => item.id)])]);
    } else {
      // 현재 페이지의 모든 항목 선택 해제
      const currentPageIds = currentData.map(item => item.id);
      setSelectedItems(prev => prev.filter(id => !currentPageIds.includes(id)));
    }
  };

  const handleSelectItem = (itemId) => {
    setSelectedItems(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) {
      setSnackbar({ open: true, message: '삭제할 항목을 선택해주세요.', severity: 'warning' });
      return;
    }

    if (window.confirm(`선택된 ${selectedItems.length}개 항목을 삭제하시겠습니까?`)) {
      try {
        const selectedItemsCopy = [...selectedItems];
        setSelectedItems([]);
        
        const deletePromises = selectedItemsCopy.map(id => deleteDoc(doc(db, 'costs', id)));
        await Promise.all(deletePromises);
        
        setSnackbar({ open: true, message: `${selectedItemsCopy.length}개 항목이 삭제되었습니다.`, severity: 'success' });
      } catch (error) {
        console.error('일괄 삭제 실패:', error);
        setSnackbar({ open: true, message: '삭제에 실패했습니다.', severity: 'error' });
      }
    }
  };

  const handleExcelDownload = async () => {
    try {
      // ExcelJS 동적 import
      const ExcelJS = await import('exceljs');
      
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('지출현황');

      // 선택된 월 기준으로 제목 생성
      let reportTitle;
      if (currentMonth && typeof currentMonth === 'string' && currentMonth.includes('-')) {
        // currentMonth가 "2025-09" 형식일 때 "2025년 09월" 형식으로 변환
        const [year, month] = currentMonth.split('-');
        reportTitle = `${year}년 ${month}월 지출현황 보고서`;
      } else {
        reportTitle = `지출현황 보고서 (${new Date().toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })})`;
      }

      // 제목 행
      worksheet.mergeCells('A1:J1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = reportTitle;
      titleCell.font = { name: '맑은 고딕', size: 16, bold: true };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE3F2FD' }
      };

      // 헤더 행
      const headers = ['순번', '현장명', '항목', '차수', '사용날짜', '금액', '결제방식', '비고', '건강보험명단', '건강보험금액'];
      const headerRow = worksheet.addRow(headers);
      
      // 헤더 스타일링
      headerRow.eachCell((cell, colNumber) => {
        cell.font = { name: '맑은 고딕', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1976D2' }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });

      // 데이터 행 추가 (사용날짜순으로 정렬)
      let totalAmount = 0;
      const siteCount = new Set();
      const itemTypeCount = {};

      // 사용날짜순으로 정렬
      const sortedCosts = [...filteredAndSortedCosts].sort((a, b) => {
        const dateA = new Date(a.date || '1900-01-01');
        const dateB = new Date(b.date || '1900-01-01');
        return dateA - dateB;
      });

      sortedCosts.forEach((cost, index) => {
        // 건강보험 관련 데이터 처리
        const healthInsuranceNames = cost.healthInsurance ? 
          cost.healthInsurance.map(item => item.name).filter(name => name).join(', ') : '';
        const healthInsuranceAmounts = cost.healthInsurance ? 
          cost.healthInsurance.map(item => item.amount).filter(amount => amount).join(', ') : '';

        // 총 금액 계산 (기본 금액 + 건강보험 금액)
        const baseAmount = Number(cost.totalValue || 0);
        const healthInsuranceTotal = cost.healthInsurance ? 
          cost.healthInsurance.reduce((total, item) => total + (Number(item.amount) || 0), 0) : 0;
        const rowTotalAmount = baseAmount + healthInsuranceTotal;

        const row = worksheet.addRow([
          index + 1, // 순번
          cost.site || '-', // 현장명
          cost.itemType || '-', // 항목
          cost.sequence || '-', // 차수
          cost.date || '-', // 사용날짜
          rowTotalAmount, // 총 금액 (기본 금액 + 건강보험 금액)
          cost.paymentType || '-', // 결제방식
          cost.description || '-', // 비고
          healthInsuranceNames, // 건강보험명단
          healthInsuranceAmounts // 건강보험금액
        ]);

        // 데이터 행 스타일링
        row.eachCell((cell, colNumber) => {
          cell.font = { name: '맑은 고딕', size: 10 };
          cell.alignment = { 
            horizontal: colNumber === 1 || colNumber === 3 || colNumber === 6 ? 'center' : 'left',
            vertical: 'middle'
          };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
          };

          // 금액 컬럼은 숫자 형식으로
          if (colNumber === 6) {
            cell.numFmt = '#,##0';
            const baseAmount = Number(cost.totalValue || 0);
            const healthInsuranceTotal = cost.healthInsurance ? 
              cost.healthInsurance.reduce((total, item) => total + (Number(item.amount) || 0), 0) : 0;
            totalAmount += baseAmount + healthInsuranceTotal;
          }

          // 시공팀 정산 데이터는 다른 색상으로 표시
          if (cost.source === 'teamSettlement') {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFF3E0' }
            };
          }
        });

        // 통계 데이터 수집
        if (cost.site) siteCount.add(cost.site);
        if (cost.itemType) {
          itemTypeCount[cost.itemType] = (itemTypeCount[cost.itemType] || 0) + 1;
        }
      });

      // 컬럼 너비 설정
      worksheet.columns = [
        { width: 8 },  // 순번
        { width: 25 }, // 현장명
        { width: 12 }, // 항목
        { width: 10 }, // 차수
        { width: 15 }, // 사용날짜
        { width: 15 }, // 금액
        { width: 12 }, // 결제방식
        { width: 30 }  // 비고
      ];

      // 요약 섹션 추가
      const summaryStartRow = sortedCosts.length + 4;
      
      // 요약 제목
      worksheet.mergeCells(`A${summaryStartRow}:H${summaryStartRow}`);
      const summaryTitleCell = worksheet.getCell(`A${summaryStartRow}`);
      summaryTitleCell.value = '■ 요약 정보';
      summaryTitleCell.font = { name: '맑은 고딕', size: 14, bold: true };
      summaryTitleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF3E5F5' }
      };
      summaryTitleCell.alignment = { horizontal: 'left', vertical: 'middle' };

      // 요약 데이터
      const summaryData = [
        ['총 지출 건수', `${sortedCosts.length}건`],
        ['총 지출 금액', `${totalAmount.toLocaleString()}원`],
        ['관련 현장 수', `${siteCount.size}개 현장`],
        ['', ''],
        ['항목별 현황', ''],
        ...Object.entries(itemTypeCount).map(([item, count]) => [`  - ${item}`, `${count}건`])
      ];

      summaryData.forEach(([label, value], index) => {
        const row = worksheet.addRow([label, value, '', '', '', '', '', '']);
        const rowNum = summaryStartRow + 1 + index;
        
        if (label.startsWith('  -')) {
          // 항목별 현황은 들여쓰기
          row.getCell(1).font = { name: '맑은 고딕', size: 10 };
          row.getCell(2).font = { name: '맑은 고딕', size: 10 };
        } else if (label === '항목별 현황') {
          // 항목별 현황 제목
          row.getCell(1).font = { name: '맑은 고딕', size: 11, bold: true };
          row.getCell(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE8F5E8' }
          };
        } else if (label !== '') {
          // 주요 요약 정보
          row.getCell(1).font = { name: '맑은 고딕', size: 11, bold: true };
          row.getCell(2).font = { name: '맑은 고딕', size: 11, bold: true };
          row.getCell(2).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE3F2FD' }
          };
        }
      });

      // 파일 다운로드
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `지출현황_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);

      setSnackbar({ open: true, message: '엑셀 파일이 다운로드되었습니다.', severity: 'success' });
    } catch (error) {
      console.error('엑셀 다운로드 실패:', error);
      setSnackbar({ open: true, message: '엑셀 다운로드에 실패했습니다.', severity: 'error' });
    }
  };

  const openDialog = (cost = null) => {
    if (cost) {
      setEditId(cost.id);
      setForm({
        site: cost.site || '',
        itemType: cost.itemType || '',
        date: cost.date || '',
        totalValue: cost.totalValue || '',
        paymentType: cost.paymentType || '',
        description: cost.description || '',
        sequence: cost.sequence || '',
        subMaterialDetail: cost.subMaterialDetail || '기타', // 부자재 세부내용 로드
        quantity: cost.quantity || '', // 부자재 물량 로드
        taxDetail: cost.taxDetail || '기타', // 세금 세부내용 로드
        healthInsurance: cost.healthInsurance || [], // 건강보험 관련 데이터 로드
      });
    } else {
      setEditId(null);
      
      // 현장이 하나만 선택되어 있으면 자동으로 설정
      let autoSelectedSite = '';
      if (selectedSites && selectedSites.length === 1) {
        const selectedSite = selectedSites[0];
        if (typeof selectedSite === 'string' && selectedSite !== '전체선택') {
          autoSelectedSite = selectedSite;
        } else if (selectedSite && typeof selectedSite === 'object' && selectedSite.name && selectedSite.name !== '전체선택') {
          autoSelectedSite = selectedSite.name;
        }
      }
      
      setForm({
        site: autoSelectedSite,
        itemType: '',
        date: '',
        totalValue: '',
        paymentType: '',
        description: '',
        sequence: '',
        subMaterialDetail: '기타', // 부자재 세부내용 초기화
        quantity: '', // 부자재 물량 초기화
        taxDetail: '기타', // 세금 세부내용 초기화
        healthInsurance: [], // 건강보험 관련 데이터 초기화
      });
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditId(null);
    setForm({
      site: '',
      itemType: '',
      date: '',
      totalValue: '',
      paymentType: '',
      description: '',
      sequence: '',
      subMaterialDetail: '기타', // 부자재 세부내용 초기화
      quantity: '', // 부자재 물량 초기화
    });
  };

  const handleSave = async () => {
    if (!form.site || !form.itemType) {
      setSnackbar({ open: true, message: '필수 항목을 입력해주세요.', severity: 'error' });
      return;
    }

    try {
      // 새 지출인 경우 차수 자동 설정
      let finalForm = { ...form };
      if (!editId) {
        // 차수가 비어있거나 1차인 경우에만 다시 계산
        if (!form.sequence || form.sequence === '1차') {
          console.log('저장 시 차수 계산:', { site: form.site, itemType: form.itemType, date: form.date, subMaterialDetail: form.subMaterialDetail, taxDetail: form.taxDetail });
          finalForm.sequence = calculateNextSequence(form.site, form.itemType, form.date, form.subMaterialDetail, form.taxDetail);
          console.log('저장 시 설정된 차수:', finalForm.sequence);
        } else {
          console.log('저장 시 기존 차수 유지:', form.sequence);
        }
      }

      const costData = {
        ...finalForm,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid
      };

      if (editId) {
        await updateDoc(doc(db, 'costs', editId), costData);
        setSnackbar({ open: true, message: '지출 항목이 수정되었습니다.', severity: 'success' });
      } else {
        await addDoc(collection(db, 'costs'), {
          ...costData,
          createdAt: serverTimestamp(),
          createdBy: currentUser.uid
        });
        
        setSnackbar({ open: true, message: '지출 항목이 추가되었습니다.', severity: 'success' });
      }

      // 지출 → 현장관리 연동 (에러 무시)
      try {
        await syncCostToSite(form.site);
      } catch (syncError) {
        console.error('현장관리 연동 실패:', syncError);
        // 연동 실패해도 지출 저장은 성공으로 처리
      }
      
      // 새로 추가/수정된 항목이 맨 위에 표시되도록 설정
      setIsNewlyAdded(true);
      
      // 5초 후에 다시 날짜별 정렬로 되돌림
      setTimeout(() => {
        setIsNewlyAdded(false);
      }, 5000);
      
      // 다이얼로그 즉시 닫기
      setDialogOpen(false);
      setEditId(null);
      setForm({
        site: '',
        itemType: '',
        date: '',
        totalValue: '',
        paymentType: '',
        description: '',
        sequence: '',
        subMaterialDetail: '기타', // 부자재 세부내용 초기화
        quantity: '', // 부자재 물량 초기화
        taxDetail: '기타', // 세금 세부내용 초기화
        healthInsurance: [], // 건강보험 관련 데이터 초기화
      });
    } catch (error) {
      console.error('지출 항목 저장 실패:', error);
      setSnackbar({ open: true, message: '저장에 실패했습니다.', severity: 'error' });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('정말로 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'costs', id));
        setSnackbar({ open: true, message: '삭제되었습니다.', severity: 'success' });
      } catch (error) {
        console.error('지출 항목 삭제 실패:', error);
        setSnackbar({ open: true, message: '삭제에 실패했습니다.', severity: 'error' });
      }
    }
  };

  // 차수 수정 함수
  const handleFixSequence = async () => {
    try {
      // 시공팀 정산으로 전송된 모든 노무비 데이터 조회
      const existingCostsQuery = query(
        collection(db, 'costs'),
        where('source', '==', 'teamSettlement'),
        where('itemType', '==', '노무비')
      );
      const existingCostsSnapshot = await getDocs(existingCostsQuery);
      
      if (existingCostsSnapshot.empty) {
        setSnackbar({
          open: true,
          message: '수정할 데이터가 없습니다.',
          severity: 'info'
        });
        return;
      }

      const existingCosts = existingCostsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log('기존 전송된 데이터:', existingCosts);
      console.log('총 데이터 개수:', existingCosts.length);

      // 현장별로 그룹화
      const siteGroups = {};
      existingCosts.forEach(cost => {
        if (cost.site && cost.site.trim() !== '') {
          if (!siteGroups[cost.site]) {
            siteGroups[cost.site] = [];
          }
          siteGroups[cost.site].push(cost);
        }
      });

      console.log('현장별 그룹화 결과:', siteGroups);
      console.log('현장 개수:', Object.keys(siteGroups).length);

      if (Object.keys(siteGroups).length === 0) {
        setSnackbar({
          open: true,
          message: '유효한 현장 데이터가 없습니다.',
          severity: 'warning'
        });
        return;
      }

      const batch = writeBatch(db);
      let updateCount = 0;

      // 각 현장별로 차수 수정
      for (const [siteName, costs] of Object.entries(siteGroups)) {
        console.log(`\n=== 현장 처리 시작: ${siteName} ===`);
        console.log(`현장 데이터 개수: ${costs.length}`);
        
        try {
          // 해당 현장의 모든 노무비 데이터 조회 (시공팀 정산 제외)
          const allCostsQuery = query(
            collection(db, 'costs'),
            where('site', '==', siteName),
            where('itemType', '==', '노무비')
          );
          const allCostsSnapshot = await getDocs(allCostsQuery);
          const allCosts = allCostsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

          console.log(`현장 ${siteName}의 모든 노무비 데이터:`, allCosts.length);

          // 시공팀 정산 데이터를 제외한 기존 차수들 확인
          const nonTeamSettlementCosts = allCosts.filter(cost => cost.source !== 'teamSettlement');
          console.log(`시공팀 정산 제외한 데이터:`, nonTeamSettlementCosts.length);
          
          const existingSequences = nonTeamSettlementCosts
            .map(cost => cost.sequence)
            .filter(seq => seq && typeof seq === 'string' && seq.includes('차'))
            .map(seq => {
              const match = seq.match(/(\d+)차/);
              return match ? parseInt(match[1]) : 0;
            })
            .filter(num => num > 0);

          console.log(`기존 차수들:`, existingSequences);
          const maxSequence = existingSequences.length > 0 ? Math.max(...existingSequences) : 0;
          let currentSequence = maxSequence;

          // 시공팀 정산 데이터들을 올바른 차수로 업데이트
          console.log(`현장 ${siteName} 처리 시작 - 최대 차수: ${maxSequence}, 데이터 개수: ${costs.length}`);
          
          for (let index = 0; index < costs.length; index++) {
            const cost = costs[index];
            currentSequence++;
            const newSequence = `${currentSequence}차`;
            
            console.log(`데이터 ${index + 1}: 기존 차수="${cost.sequence}", 새 차수="${newSequence}"`);
            
            // 시공팀 정산 데이터는 항상 차수를 다시 정리 (강제 업데이트)
            const costRef = doc(db, 'costs', cost.id);
            batch.update(costRef, { sequence: newSequence });
            updateCount++;
            console.log(`✅ 업데이트: 현장 ${siteName}: ${cost.sequence || '없음'} → ${newSequence}`);
          }
        } catch (siteError) {
          console.error(`현장 ${siteName} 처리 중 오류:`, siteError);
          console.error(`오류 상세:`, siteError.message);
          console.error(`오류 스택:`, siteError.stack);
          // 개별 현장 오류는 무시하고 계속 진행
        }
        
        console.log(`=== 현장 처리 완료: ${siteName} ===\n`);
      }

      console.log(`\n=== 차수 수정 완료 ===`);
      console.log(`총 업데이트 개수: ${updateCount}`);
      
      if (updateCount > 0) {
        console.log('Firebase batch commit 시작...');
        await batch.commit();
        console.log('Firebase batch commit 완료!');
        setSnackbar({
          open: true,
          message: `${updateCount}개 데이터의 차수가 수정되었습니다.`,
          severity: 'success'
        });
      } else {
        console.log('업데이트할 데이터가 없습니다.');
        setSnackbar({
          open: true,
          message: '수정할 차수가 없습니다.',
          severity: 'info'
        });
      }

    } catch (error) {
      console.error('차수 수정 오류:', error);
      setSnackbar({
        open: true,
        message: `차수 수정 중 오류가 발생했습니다: ${error.message}`,
        severity: 'error'
      });
    }
  };

  // 전체 삭제 함수
  const handleDeleteAll = async () => {
    if (currentData.length === 0) {
      setSnackbar({ open: true, message: '삭제할 데이터가 없습니다.', severity: 'warning' });
      return;
    }

    const confirmMessage = `정말로 모든 지출 데이터(${currentData.length}개)를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`;
    if (window.confirm(confirmMessage)) {
      try {
        const allIds = currentData.map(cost => cost.id);
        setSelectedItems([]);
        
        // Firebase에서 일괄 삭제
        const deletePromises = allIds.map(id => deleteDoc(doc(db, 'costs', id)));
        await Promise.all(deletePromises);
        
        setSnackbar({ open: true, message: `모든 지출 데이터(${allIds.length}개)가 삭제되었습니다.`, severity: 'success' });
      } catch (error) {
        console.error('전체 삭제 실패:', error);
        setSnackbar({ open: true, message: '전체 삭제에 실패했습니다.', severity: 'error' });
      }
    }
  };

  // 건강보험 데이터 추가 함수
  const addHealthInsuranceItem = () => {
    setForm(prev => ({
      ...prev,
      healthInsurance: [...prev.healthInsurance, { name: '', amount: '' }]
    }));
  };

  // 건강보험 데이터 삭제 함수
  const removeHealthInsuranceItem = (index) => {
    setForm(prev => ({
      ...prev,
      healthInsurance: prev.healthInsurance.filter((_, i) => i !== index)
    }));
  };

  // 건강보험 데이터 업데이트 함수
  const updateHealthInsuranceItem = (index, field, value) => {
    setForm(prev => ({
      ...prev,
      healthInsurance: prev.healthInsurance.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  // 건강보험 금액 합산 함수
  const calculateHealthInsuranceTotal = () => {
    if (!form.healthInsurance || form.healthInsurance.length === 0) return 0;
    return form.healthInsurance.reduce((total, item) => {
      return total + (Number(item.amount) || 0);
    }, 0);
  };

  // 차수 계산 함수 (새 지출 등록용)
  const calculateNextSequence = (siteName, itemType, selectedDate = null, subMaterialDetail = null, taxDetail = null) => {
    if (!siteName || !itemType) return '';
    
    console.log('🔍 차수 계산 시작:', { siteName, itemType, selectedDate, subMaterialDetail, taxDetail });
    
    // 해당 현장과 항목의 기존 지출 데이터 필터링 (부자재와 세금은 세부항목도 고려)
    const existingCosts = costs.filter(cost => {
      if (cost.site !== siteName || cost.itemType !== itemType) return false;
      
      // 부자재인 경우 세부항목도 일치해야 함
      if (itemType === '부자재' && subMaterialDetail) {
        return cost.subMaterialDetail === subMaterialDetail;
      }
      
      // 세금인 경우 세부항목도 일치해야 함
      if (itemType === '세금' && taxDetail) {
        return cost.taxDetail === taxDetail;
      }
      
      return true;
    });
    
    console.log('📊 기존 지출 데이터 개수:', existingCosts.length);
    console.log('📊 기존 지출 데이터:', existingCosts.map(c => ({ 
      id: c.id, 
      sequence: c.sequence, 
      date: c.date, 
      site: c.site, 
      itemType: c.itemType,
      subMaterialDetail: c.subMaterialDetail
    })));
    
    if (existingCosts.length === 0) {
      console.log('✅ 기존 데이터 없음, 1차 반환');
      return '1차';
    }
    
    // 사용날짜 순으로 정렬
    const sortedCosts = existingCosts.sort((a, b) => {
      const dateA = parseDate(a.date || 0);
      const dateB = parseDate(b.date || 0);
      return dateA - dateB;
    });
    
    console.log('📅 날짜순 정렬된 데이터:', sortedCosts.map(c => ({ 
      sequence: c.sequence, 
      date: c.date,
      subMaterialDetail: c.subMaterialDetail
    })));
    
    // 선택된 날짜가 있으면 해당 날짜 기준으로 차수 계산
    if (selectedDate) {
      const selectedDateObj = parseDate(selectedDate);
      console.log('📅 선택된 날짜:', selectedDateObj);
      
      // 선택된 날짜 이전 데이터 기준으로 기본 차수 계산
      const previousCosts = sortedCosts.filter(cost => {
        const costDate = parseDate(cost.date || 0);
        const isBefore = costDate < selectedDateObj;
        console.log(`📅 ${cost.sequence} (${cost.date}) < ${selectedDate}? ${isBefore}`);
        return isBefore;
      });
      
      console.log('📊 선택 날짜 이전 데이터 개수:', previousCosts.length);
      console.log('📊 선택 날짜 이전 데이터:', previousCosts.map(c => ({ 
        sequence: c.sequence, 
        date: c.date 
      })));
      
      // 이전 항목들 중 가장 큰 차수 찾기
      let maxSequence = 0;
      previousCosts.forEach(cost => {
        const match = (cost.sequence || '').match(/(\d+)차/);
        if (match) {
          const sequenceNum = parseInt(match[1]);
          if (sequenceNum > maxSequence) {
            maxSequence = sequenceNum;
          }
        }
      });
      
      // 기본 차수 계산
      const baseSequence = maxSequence + 1;
      
      // 같은 날짜의 데이터 필터링
      const sameDateCosts = sortedCosts.filter(cost => {
        const costDate = parseDate(cost.date || 0);
        return costDate.toDateString() === selectedDateObj.toDateString();
      });
      
      console.log('📅 같은 날짜 데이터:', sameDateCosts.map(c => ({ 
        sequence: c.sequence, 
        date: c.date,
        subMaterialDetail: c.subMaterialDetail
      })));
      
      if (sameDateCosts.length > 0) {
        // 같은 날짜에 데이터가 있으면 세분화된 차수 계산
        const lastSameDateCost = sameDateCosts[sameDateCosts.length - 1];
        const lastSequence = lastSameDateCost.sequence || '';
        
        console.log('🔍 마지막 같은 날짜 데이터의 sequence:', lastSequence);
        
        // 기존 차수에서 -숫자 패턴 확인
        const subMatch = lastSequence.match(/(\d+)차-(\d+)/);
        if (subMatch) {
          const baseSequenceFromMatch = parseInt(subMatch[1]);
          const subNumber = parseInt(subMatch[2]) + 1;
          const nextSequence = `${baseSequenceFromMatch}차-${subNumber}`;
          console.log('🔢 같은 날짜 세분화 차수 (기존 세분화 있음):', nextSequence);
          return nextSequence;
        } else {
          // 기존 차수에 -1 추가
          const baseMatch = lastSequence.match(/(\d+)차/);
          if (baseMatch) {
            const baseSequenceFromMatch = parseInt(baseMatch[1]);
            const nextSequence = `${baseSequenceFromMatch}차-1`;
            console.log('🔢 같은 날짜 첫 세분화 차수 (기존 세분화 없음):', nextSequence);
            return nextSequence;
          } else {
            // 차수 패턴이 없으면 기본 차수에 -1 추가
            const nextSequence = `${baseSequence}차-1`;
            console.log('🔢 차수 패턴 없음, 기본 차수에 -1 추가:', nextSequence);
            return nextSequence;
          }
        }
      }
      
      // 같은 날짜에 데이터가 없으면 기본 차수 반환
      const nextSequence = `${baseSequence}차`;
      console.log('🔢 기본 차수:', nextSequence);
      return nextSequence;
    }
    
    // 날짜가 선택되지 않은 경우 기존 로직
    const lastSequence = sortedCosts[sortedCosts.length - 1].sequence || '';
    console.log('🔍 마지막 항목의 sequence 값:', lastSequence);
    console.log('🔍 마지막 항목 전체 데이터:', sortedCosts[sortedCosts.length - 1]);
    
    const match = lastSequence.match(/(\d+)차/);
    
    if (match) {
      const nextNumber = parseInt(match[1]) + 1;
      const nextSequence = `${nextNumber}차`;
      console.log('🔢 마지막 차수:', lastSequence, '다음 차수:', nextSequence);
      return nextSequence;
    }
    
    // 차수 패턴이 없으면 데이터 개수로 계산
    console.log('⚠️ 차수 패턴 없음, 데이터 개수로 계산');
    console.log('🔍 모든 항목의 sequence 값들:', sortedCosts.map(c => ({ 
      id: c.id, 
      sequence: c.sequence, 
      date: c.date 
    })));
    
    // 기존 데이터 개수 + 1로 차수 계산
    const nextSequence = `${sortedCosts.length + 1}차`;
    console.log('🔢 데이터 개수 기반 차수 계산:', `${sortedCosts.length}개 → ${nextSequence}`);
    return nextSequence;
  };

  // 차수 계산 함수 (테이블 표시용)
  const calculateSequence = (cost) => {
    if (!cost || !cost.site || !cost.itemType) return '1차';
    
    // 저장된 차수가 있으면 그대로 사용
    if (cost.sequence) {
      return cost.sequence;
    }
    
    // 차수가 없으면 사용날짜 순서로 계산
    const siteItemCosts = costs.filter(item => 
      item.site === cost.site && item.itemType === cost.itemType
    );
    
    const sortedList = siteItemCosts
      .filter(item => item.date) // 사용날짜가 있는 항목만
      .sort((a, b) => {
        const dateA = parseDate(a.date);
        const dateB = parseDate(b.date);
        return dateA - dateB;
      });
    
    const currentIndex = sortedList.findIndex(item => 
      item.id === cost.id
    );
    
    if (currentIndex === -1) return '1차';
    return `${currentIndex + 1}차`;
  };

  // 차수 정리 함수 (기존 데이터의 차수를 올바르게 재정렬)
  const fixSequences = async () => {
    try {
      console.log('🔧 차수 정리 시작...');
      console.log('📊 전체 지출 데이터 개수:', costs.length);
      
      // 현장별, 항목별로 그룹화
      const groupedCosts = {};
      costs.forEach(cost => {
        const key = `${cost.site}_${cost.itemType}`;
        if (!groupedCosts[key]) {
          groupedCosts[key] = [];
        }
        groupedCosts[key].push(cost);
      });

      console.log('📊 그룹화된 데이터:', Object.keys(groupedCosts).map(key => ({
        group: key,
        count: groupedCosts[key].length
      })));

      // 각 그룹별로 차수 재정렬
      for (const [key, groupCosts] of Object.entries(groupedCosts)) {
        const [siteName, itemType] = key.split('_');
        console.log(`🔧 ${siteName} - ${itemType} 차수 정리 시작 (${groupCosts.length}개)`);
        
        // 사용날짜 순서로 정렬
        const sortedCosts = groupCosts
          .filter(cost => cost.date)
          .sort((a, b) => {
            const dateA = parseDate(a.date);
            const dateB = parseDate(b.date);
            return dateA - dateB;
          });

        console.log(`📅 ${siteName} - ${itemType} 날짜순 정렬 결과:`, sortedCosts.map(c => ({
          id: c.id,
          date: c.date,
          currentSequence: c.sequence
        })));

        // 차수 재할당
        for (let i = 0; i < sortedCosts.length; i++) {
          const cost = sortedCosts[i];
          const newSequence = `${i + 1}차`;
          
          if (cost.sequence !== newSequence) {
            console.log(`🔄 ${cost.id}: ${cost.sequence} → ${newSequence}`);
            await updateDoc(doc(db, 'costs', cost.id), {
              sequence: newSequence,
              updatedAt: serverTimestamp()
            });
            
            // 로컬 상태 업데이트
            setCosts(prev => prev.map(c => 
              c.id === cost.id 
                ? { ...c, sequence: newSequence, updatedAt: new Date() }
                : c
            ));
          } else {
            console.log(`✅ ${cost.id}: ${cost.sequence} (변경 없음)`);
          }
        }
      }

      setSnackbar({
        open: true,
        message: '차수가 성공적으로 정리되었습니다.',
        severity: 'success'
      });
      
      console.log('✅ 차수 정리 완료');
    } catch (error) {
      console.error('차수 정리 중 오류:', error);
      setSnackbar({
        open: true,
        message: '차수 정리 중 오류가 발생했습니다.',
        severity: 'error'
      });
    }
  };

  const handleSort = (field) => {
    console.log('정렬 클릭:', { field, currentSortField: sortField, currentDirection: sortDirection });
    if (sortField === field) {
      const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      console.log('정렬 방향 변경:', newDirection);
      setSortDirection(newDirection);
    } else {
      console.log('정렬 필드 변경:', field);
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const StatCard = ({ title, value, color }) => (
    <Grid xs={6} sm={6} md={3}>
      <Card sx={{ 
        p: 2, 
        height: '100%', 
        bgcolor: '#181f2e', 
        color: '#fff',
        border: '1px solid #232b3b'
      }}>
        <Typography 
          variant="subtitle2" 
          sx={{ 
            color: '#bbb', 
            mb: 1,
            fontSize: '0.9rem',
            lineHeight: 1.2
          }}
        >
          {title}
        </Typography>
        <Typography 
          variant="h6" 
          color={color || '#43e97b'} 
          sx={{ 
            fontWeight: 'bold',
            fontSize: isMobile ? '0.8rem' : '0.9rem',
            lineHeight: 1.2
          }}
        >
          {Number(value || 0).toLocaleString()}{title === '건수' ? '건' : '원'}
        </Typography>
      </Card>
    </Grid>
  );

  // 요약 정보 컴포넌트
  const SummaryInfo = () => (
    <Card sx={{ 
      bgcolor: '#181f2e', 
      border: '1px solid #2a3441',
      borderRadius: 2,
      p: 2,
      mb: 2
    }}>
      <Typography variant="h6" sx={{ 
        color: '#fff', 
        fontWeight: 'bold', 
        mb: 1.5,
        fontSize: '1rem'
      }}>
        요약 정보
      </Typography>
      
      <Grid container spacing={1.5}>
        {/* 총 지출 건수 */}
        <Grid item xs={12} md={4}>
          <Box sx={{ 
            p: 1.5, 
            bgcolor: '#1e2a3a', 
            borderRadius: 1,
            border: '1px solid #2a3441'
          }}>
            <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 0.5, fontSize: '0.85rem' }}>
              총 지출 건수
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h5" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                {stats.totalCount}건
              </Typography>
              {/* 세부 분류 */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {Object.entries(stats.detailedBreakdown || {})
                  .filter(([, count]) => count > 0)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 2)
                  .map(([item, count]) => (
                    <Typography key={item} variant="caption" sx={{ 
                      color: '#888', 
                      fontSize: '0.75rem',
                      whiteSpace: 'nowrap'
                    }}>
                      {item}: {count}건
                    </Typography>
                  ))}
              </Box>
            </Box>
          </Box>
        </Grid>

        {/* 총 지출 금액 */}
        <Grid item xs={12} md={4}>
          <Box sx={{ 
            p: 1.5, 
            bgcolor: '#1e2a3a', 
            borderRadius: 1,
            border: '1px solid #2a3441'
          }}>
            <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 0.5, fontSize: '0.85rem' }}>
              총 지출 금액
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h5" sx={{ color: '#ef5350', fontWeight: 'bold' }}>
                {Number(stats.totalValue || 0).toLocaleString()}원
              </Typography>
              {/* 세부 분류 */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {Object.entries(stats.detailedBreakdown || {})
                  .filter(([, count]) => count > 0)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 2)
                  .map(([item, count]) => (
                    <Typography key={item} variant="caption" sx={{ 
                      color: '#888', 
                      fontSize: '0.75rem',
                      whiteSpace: 'nowrap'
                    }}>
                      {item}: {count}건
                    </Typography>
                  ))}
              </Box>
            </Box>
          </Box>
        </Grid>

        {/* 관련 현장 수 */}
        <Grid item xs={12} md={4}>
          <Box sx={{ 
            p: 1.5, 
            bgcolor: '#1e2a3a', 
            borderRadius: 1,
            border: '1px solid #2a3441'
          }}>
            <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 0.5, fontSize: '0.85rem' }}>
              관련 현장 수
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h5" sx={{ color: '#a084e8', fontWeight: 'bold' }}>
                {stats.siteCount}개 현장
              </Typography>
              {/* 세부 분류 */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {Object.entries(stats.detailedBreakdown || {})
                  .filter(([, count]) => count > 0)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 2)
                  .map(([item, count]) => (
                    <Typography key={item} variant="caption" sx={{ 
                      color: '#888', 
                      fontSize: '0.75rem',
                      whiteSpace: 'nowrap'
                    }}>
                      {item}: {count}건
                    </Typography>
                  ))}
              </Box>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Card>
  );

  // 필터 적용 (상위 컴포넌트에서 전달받은 filteredData 사용)
  const filtered = filteredData || filteredAndSortedCosts;

  // 페이지네이션 계산
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filtered.slice(startIndex, endIndex);
  
  console.log('현재 페이지 데이터:', currentData.length, '개');
  console.log('현재 페이지 데이터 샘플:', currentData.slice(0, 1).map(cost => ({
    id: cost.id,
    site: cost.site,
    itemType: cost.itemType,
    paymentType: cost.paymentType
  })));

  // 페이지 변경 함수
  const handlePageChange = (event, newPage) => {
    setCurrentPage(newPage);
  };

  // 페이지당 항목 수 변경 함수
  const handleItemsPerPageChange = (event) => {
    setItemsPerPage(parseInt(event.target.value));
    setCurrentPage(1); // 페이지당 항목 수가 변경되면 첫 페이지로 이동
  };

  return (
    <Box sx={{ 
      width: isMobile ? '100%' : 'calc(100% - 20px)', 
      maxWidth: isMobile ? '100%' : 'calc(100% - 20px)', 
      mx: isMobile ? 0 : '10px',
      p: 0,
      overflow: 'hidden',
      mt: isMobile ? '0px' : '40px'
    }}>

      
      {/* 요약 정보 */}
      <SummaryInfo />
      
      <Paper sx={{ 
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden', 
        mt: 3, 
        p: 0,
        boxSizing: 'border-box'
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          mb: 2, 
          position: 'relative',
          width: '100%',
          maxWidth: '100%',
          px: { xs: 1, md: 2 },
          boxSizing: 'border-box'
        }}>
          {/* 왼쪽: 지출현황 제목과 검색칸 */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 2
          }}>
            <Typography variant="h6" sx={{ 
              display: isMobile ? 'none' : 'block',
            }}>지출현황</Typography>
            
            {/* 검색 입력칸 */}
            <TextField
              size="small"
              placeholder="항목, 금액, 비고 검색"
              value={search}
              onChange={e => setSearch(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton 
                      size="small" 
                      onClick={() => setSearch('')}
                      sx={{ mr: 0.5 }}
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )
              }}
              sx={{ 
                width: 250, 
                bgcolor: '#232b3b', 
                borderRadius: 2, 
                input: { color: '#fff' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: '#444',
                  },
                  '&:hover fieldset': {
                    borderColor: '#666',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#1976d2',
                  },
                },
              }} 
            />
          </Box>

          {/* 오른쪽: 버튼들 */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1
          }}>
            <Button variant="contained" color="success" startIcon={<AddIcon />} sx={{ 
              display: isMobile ? 'none' : 'flex',
              minHeight: '44px',
              height: '44px'
            }} onClick={() => openDialog()}>새 지출</Button>
            <Button variant="contained" color="primary" startIcon={<CloudDownloadIcon />} sx={{ 
              display: isMobile ? 'none' : 'flex',
              minHeight: '44px',
              height: '44px'
            }} onClick={handleExcelDownload}>엑셀 다운로드</Button>
            <Button variant="contained" color="primary" startIcon={<CloudUploadIcon />} sx={{ 
              display: isMobile ? 'none' : 'flex',
              minHeight: '44px',
              height: '44px'
            }}>엑셀 업로드</Button>
          </Box>

        </Box>
        <TableContainer sx={{ 
          width: '100%',
          maxWidth: '100%',
          overflowX: 'auto',
          px: { xs: 1, md: 2 },
          boxSizing: 'border-box',
          '& .MuiTable-root': {
            width: '100%',
            minWidth: '100%',
            maxWidth: '100%'
          }
        }}>
          <Table size={isMobile ? 'small' : 'medium'} sx={{ 
            width: '100%',
            minWidth: '100%',
            maxWidth: '100%',
            tableLayout: 'auto'
          }}>
            <TableHead>
              <TableRow sx={{ bgcolor: '#232b3b' }}>
                <TableCell padding="checkbox" sx={{ 
                  display: isMobile ? 'none' : 'table-cell',
                  width: 'auto',
                  minWidth: 0,
                  maxWidth: '100%',
                  py: 0.5
                }}>
                  <Checkbox
                    indeterminate={currentData.some(item => selectedItems.includes(item.id)) && !currentData.every(item => selectedItems.includes(item.id))}
                    checked={currentData.length > 0 && currentData.every(item => selectedItems.includes(item.id))}
                    onChange={handleSelectAll}
                    sx={{ color: '#fff' }}
                  />
                </TableCell>
                <TableCell sx={{ 
                  color: '#fff', 
                  fontWeight: 700, 
                  ml: isMobile ? '-8px' : 0,
                  width: 'auto',
                  minWidth: 0,
                  maxWidth: '100%',
                  py: 0.5
                }}>현장명</TableCell>
                <TableCell sx={{ 
                  color: '#fff', 
                  fontWeight: 700, 
                  ml: isMobile ? '-8px' : 0,
                  width: 'auto',
                  minWidth: 0,
                  maxWidth: '100%',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: '#2a3441' },
                  py: 0.5
                }} onClick={() => handleSort('itemType')}>
                  항목
                  {sortField === 'itemType' && (
                    <span style={{ marginLeft: '4px', fontSize: '0.8rem' }}>
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </TableCell>
                <TableCell sx={{ 
                  color: '#fff', 
                  fontWeight: 700, 
                  display: isMobile ? 'none' : 'table-cell',
                  width: 'auto',
                  minWidth: 0,
                  maxWidth: '100%',
                  fontSize: isMobile ? '0.7rem' : '0.95rem',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: '#2a3441' },
                  py: 0.5
                }} onClick={() => handleSort('sequence')}>
                  차수
                  {sortField === 'sequence' && (
                    <span style={{ marginLeft: '4px', fontSize: '0.8rem' }}>
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </TableCell>
                <TableCell sx={{ 
                  color: '#fff', 
                  fontWeight: 700, 
                  display: isMobile ? 'none' : 'table-cell',
                  width: 'auto',
                  minWidth: 0,
                  maxWidth: '100%',
                  fontSize: isMobile ? '0.7rem' : '0.95rem',
                  py: 0.5
                }}>사용날짜</TableCell>
                <TableCell sx={{ 
                  color: '#fff', 
                  fontWeight: 700, 
                  ml: isMobile ? '-8px' : 0,
                  width: 'auto',
                  minWidth: 0,
                  maxWidth: '100%',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: '#2a3441' },
                  py: 0.5
                }} onClick={() => handleSort('totalValue')}>
                  금액
                  {sortField === 'totalValue' && (
                    <span style={{ marginLeft: '4px', fontSize: '0.8rem' }}>
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </TableCell>
                <TableCell sx={{ 
                  color: '#fff', 
                  fontWeight: 700, 
                  display: isMobile ? 'none' : 'table-cell',
                  width: 'auto',
                  minWidth: 0,
                  maxWidth: '100%',
                  py: 0.5
                }}>결제</TableCell>
                <TableCell sx={{ 
                  color: '#fff', 
                  fontWeight: 700, 
                  display: isMobile ? 'none' : 'table-cell',
                  width: '200px',
                  minWidth: '150px',
                  maxWidth: '250px',
                  py: 0.5
                }}>비고</TableCell>

                <TableCell sx={{ 
                  color: '#fff', 
                  fontWeight: 700, 
                  display: isMobile ? 'none' : 'table-cell',
                  width: 'auto',
                  minWidth: 0,
                  maxWidth: '100%',
                  py: 0.5
                }}>관리</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {viewType === 'site' && (!selectedSites || selectedSites.length === 0) ? (
                <TableRow>
                  <TableCell colSpan={isMobile ? 3 : 8} sx={{ 
                    textAlign: 'center', 
                    color: '#bbb', 
                    py: 4, 
                    ml: isMobile ? '-8px' : 0,
                    width: 'auto',
                    minWidth: 0,
                    maxWidth: '100%'
                  }}>
                    현장을 선택해주세요
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isMobile ? 3 : 8} sx={{ 
                    textAlign: 'center', 
                    color: '#bbb', 
                    py: 4, 
                    ml: isMobile ? '-8px' : 0,
                    width: 'auto',
                    minWidth: 0,
                    maxWidth: '100%'
                  }}>
                    {viewType === 'site' && (!selectedSites || selectedSites.length === 0) 
                      ? '현장을 선택하거나 전체선택을 눌러주세요' 
                      : viewType === 'site' && selectedSites.length > 0
                      ? '선택된 현장의 지출 데이터가 없습니다'
                      : search ? '검색 결과가 없습니다.' : '지출 데이터가 없습니다.'}
                  </TableCell>
                </TableRow>
              ) : (
                currentData.map(cost => (
                  <TableRow 
                    key={cost.id} 
                    sx={{ 
                      '&:hover': { bgcolor: '#232b3b' },
                      borderBottom: '1px solid #333'
                    }}
                  >
                    <TableCell padding="checkbox" sx={{ 
                      display: isMobile ? 'none' : 'table-cell',
                      width: 'auto',
                      minWidth: 0,
                      maxWidth: '100%',
                      py: 0.5
                    }}>
                      <Checkbox
                        checked={selectedItems.includes(cost.id)}
                        onChange={() => handleSelectItem(cost.id)}
                        sx={{ color: '#90caf9' }}
                      />
                    </TableCell>
                    <TableCell sx={{ 
                      color: '#fff',
                      width: 'auto',
                      minWidth: 0,
                      maxWidth: '100%',
                      py: 0.5
                    }}>{cost.site || '-'}</TableCell>
                    <TableCell sx={{
                      width: 'auto',
                      minWidth: 0,
                      maxWidth: '100%',
                      py: 0.5
                    }}>
                      <Chip 
                        label={(() => {
                          if (cost.itemType === '세금' && cost.taxDetail && ['건강', '연금', '고용', '산재'].includes(cost.taxDetail)) {
                            return `${cost.itemType}(${cost.taxDetail})`;
                          }
                          return cost.itemType || '-';
                        })()} 
                        size="small" 
                        sx={{ 
                          bgcolor: cost.itemType === '노무비' ? '#ffd600' : 
                                  cost.itemType === '경비' ? '#ef5350' : 
                                  cost.itemType === 'RnD' ? '#43e97b' : 
                                  cost.itemType === '자재비' ? '#2196f3' :
                                  cost.itemType === '부자재' ? '#9c27b0' :
                                  cost.itemType === '지게차' ? '#ff9800' : 
                                  cost.itemType === '곤도라' ? '#ff9800' :
                                  cost.itemType === '월세' ? '#ffffff' :
                                  cost.itemType === '세금' ? '#ff5722' : '#a084e8',
                          color: cost.itemType === '월세' || cost.itemType === '지게차' || cost.itemType === '곤도라' ? '#000' : '#000',
                          fontWeight: 700
                        }} 
                      />
                    </TableCell>
                    <TableCell sx={{ 
                      color: '#fff', 
                      display: isMobile ? 'none' : 'table-cell',
                      width: 'auto',
                      minWidth: 0,
                      maxWidth: '100%',
                      fontSize: isMobile ? '0.7rem' : '0.95rem',
                      py: 0.5
                    }}>{calculateSequence(cost)}</TableCell>
                    <TableCell sx={{ 
                      color: '#fff', 
                      display: isMobile ? 'none' : 'table-cell',
                      width: 'auto',
                      minWidth: 0,
                      maxWidth: '100%',
                      fontSize: isMobile ? '0.7rem' : '0.95rem',
                      py: 0.5
                    }}>{(() => {
                      try {
                        if (!cost.date) return '-';
                        const date = parseDate(cost.date);
                        return isNaN(date.getTime()) ? cost.date : date.toLocaleDateString();
                      } catch (e) {
                        return cost.date || '-';
                      }
                    })()}</TableCell>
                    <TableCell sx={{ 
                      color: '#ef5350', 
                      fontWeight: 700,
                      width: 'auto',
                      minWidth: 0,
                      maxWidth: '100%',
                      py: 0.5
                    }}>
                      {(() => {
                        const baseAmount = Number(cost.totalValue || 0);
                        const healthInsuranceTotal = cost.healthInsurance ? 
                          cost.healthInsurance.reduce((total, item) => total + (Number(item.amount) || 0), 0) : 0;
                        const totalAmount = baseAmount + healthInsuranceTotal;
                        return totalAmount.toLocaleString();
                      })()}원
                    </TableCell>
                    <TableCell sx={{ 
                      display: isMobile ? 'none' : 'table-cell',
                      width: 'auto',
                      minWidth: 0,
                      maxWidth: '100%',
                      py: 0.5
                    }}>
                      <Chip 
                        label={cost.paymentType || '-'} 
                        size="small" 
                        variant="outlined"
                        sx={{ 
                          borderColor: '#555',
                          color: '#fff'
                        }} 
                      />
                    </TableCell>
                    <TableCell sx={{ 
                      color: '#bbb', 
                      display: isMobile ? 'none' : 'table-cell',
                      width: '200px',
                      minWidth: '150px',
                      maxWidth: '250px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      py: 0.5
                    }}>{cost.description || '-'}</TableCell>

                    <TableCell sx={{ 
                      display: isMobile ? 'none' : 'table-cell',
                      width: 'auto',
                      minWidth: 0,
                      maxWidth: '100%',
                      py: 0.5
                    }}>
                      <IconButton 
                        size="small" 
                        onClick={() => openDialog(cost)}
                        sx={{ color: '#90caf9' }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => handleDelete(cost.id)}
                        sx={{ color: '#ef5350' }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* 페이지네이션 */}
        {filtered.length > 0 && (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            p: 2, 
            borderTop: '1px solid #333' 
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" sx={{ color: '#bbb' }}>
                페이지당 항목 수:
              </Typography>
              <Select
                value={itemsPerPage}
                onChange={handleItemsPerPageChange}
                size="small"
                sx={{
                  color: '#fff',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#555' },
                  '& .MuiSvgIcon-root': { color: '#fff' },
                  minWidth: 70
                }}
              >
                <MenuItem value={5}>5</MenuItem>
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={20}>20</MenuItem>
                <MenuItem value={50}>50</MenuItem>
              </Select>
              <Typography variant="body2" sx={{ color: '#bbb' }}>
                {startIndex + 1}-{Math.min(endIndex, filtered.length)} / {filtered.length}개
              </Typography>
            </Box>
            
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={handlePageChange}
              color="primary"
              sx={{
                '& .MuiPaginationItem-root': {
                  color: '#fff',
                  borderColor: '#555',
                  '&:hover': {
                    backgroundColor: '#333'
                  },
                  '&.Mui-selected': {
                    backgroundColor: '#1976d2',
                    color: '#fff'
                  }
                }
              }}
            />
          </Box>
        )}
      </Paper>

      {/* 항목 추가/수정 다이얼로그 */}
      <Dialog 
        open={dialogOpen} 
        onClose={closeDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#181f2e',
            color: '#fff',
            borderRadius: 4,
            minHeight: '480px'
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: '#232b3b', 
          color: '#90caf9',
          fontWeight: 700,
          fontSize: '1.3rem',
          py: 2,
          textAlign: 'center'
        }}>
          지출 항목
        </DialogTitle>
        <DialogContent sx={{ pt: 4, pb: 2, mt: 6 }}>
          <Box display="flex" flexDirection="column" alignItems="center" gap={3}>
            {/* 1줄: 현장명(검색/드롭다운) + 항목(드롭다운) */}
            <Box display="flex" width="100%" justifyContent="center" gap={2}>
              <Box sx={{ flex: 1, minWidth: 140 }}>
                <SearchableSiteSelect
                  sites={sites}
                  value={form.site ?? ''}
                  onChange={(newValue) => {
                    console.log('현장명 변경:', newValue);
                    setForm({ ...form, site: newValue });
                    // 현장명이 변경되면 차수 자동 업데이트
                    if (newValue && form.itemType && !editId) {
                      console.log('차수 계산 호출:', { site: newValue, itemType: form.itemType, date: form.date, subMaterialDetail: form.subMaterialDetail, taxDetail: form.taxDetail });
                      const nextSequence = calculateNextSequence(newValue, form.itemType, form.date, form.subMaterialDetail, form.taxDetail);
                      console.log('계산된 차수:', nextSequence);
                      setForm(prev => ({ ...prev, sequence: nextSequence }));
                    }
                  }}
                  label="현장명"
                  placeholder="현장명을 검색하세요"
                  size="medium"
                  isMobile={isMobile}
                  sx={{ width: '100%' }}
                />
              </Box>
              <Autocomplete
                options={['자재비', '부자재', '노무비', '경비', '스카이', '크레인', '곤도라', '지게차', '운임비', '월세', '카드', '세금', '기타']}
                value={form.itemType ?? ''}
                onChange={(event, newValue) => {
                  console.log('항목 변경:', newValue);
                  setForm({ ...form, itemType: newValue || '' });
                  // 항목이 변경되면 차수 자동 업데이트
                  if (newValue && form.site && !editId) {
                    console.log('차수 계산 호출:', { site: form.site, itemType: newValue, date: form.date, subMaterialDetail: form.subMaterialDetail, taxDetail: form.taxDetail });
                    const nextSequence = calculateNextSequence(form.site, newValue, form.date, form.subMaterialDetail, form.taxDetail);
                    console.log('계산된 차수:', nextSequence);
                    setForm(prev => ({ ...prev, sequence: nextSequence }));
                  }
                }}
                onInputChange={(event, newInputValue) => setForm({ ...form, itemType: newInputValue })}
                freeSolo
                ListboxProps={{
                  style: {
                    maxHeight: '200px',
                    '&::-webkit-scrollbar': {
                      display: 'none'
                    },
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="항목"
                    placeholder="선택하거나 직접 입력"
                    size="medium"
                    sx={{
                      flex: 1,
                      minWidth: 140,
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: '#333' },
                        '&:hover fieldset': { borderColor: '#555' },
                        '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                      },
                      '& .MuiInputLabel-root': { color: '#bbb', fontSize: '1rem' },
                      '& .MuiInputBase-input': { color: '#fff', fontSize: '1rem', py: 1.5 }
                    }}
                  />
                )}
                sx={{
                  flex: 1,
                  minWidth: 140,
                  '& .MuiAutocomplete-popupIndicator': { color: '#fff' },
                  '& .MuiAutocomplete-clearIndicator': { color: '#fff' },
                  '& .MuiAutocomplete-option': { color: '#fff' },
                  '& .MuiAutocomplete-listbox': {
                    '&::-webkit-scrollbar': { display: 'none' },
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    maxHeight: '200px'
                  }
                }}
              />
            </Box>
            
            {/* 부자재 세부내용 드롭다운 + 물량 입력칸 (부자재 선택 시에만 표시) */}
            {form.itemType === '부자재' && (
              <Box display="flex" width="100%" justifyContent="center" gap={2}>
                <Autocomplete
                  options={['웨더실란트', '일반실란트', '구조용실란트', '노턴테이프', '기타']}
                  value={form.subMaterialDetail || '기타'}
                  onChange={(event, newValue) => {
                    setForm({ ...form, subMaterialDetail: newValue || '기타' });
                    // 부자재 세부내용이 변경되면 차수 자동 업데이트
                    if (form.site && form.itemType === '부자재' && form.date && !editId) {
                      console.log('차수 계산 호출 (세부내용 변경):', { site: form.site, itemType: form.itemType, date: form.date, subMaterialDetail: newValue, taxDetail: form.taxDetail });
                      const nextSequence = calculateNextSequence(form.site, form.itemType, form.date, newValue, form.taxDetail);
                      console.log('계산된 차수:', nextSequence);
                      setForm(prev => ({ ...prev, sequence: nextSequence }));
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="세부내용"
                      placeholder="세부내용을 선택하세요"
                      size="medium"
                      sx={{
                        flex: 1,
                        minWidth: 140,
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': { borderColor: '#333' },
                          '&:hover fieldset': { borderColor: '#555' },
                          '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                        },
                        '& .MuiInputLabel-root': { color: '#bbb', fontSize: '1rem' },
                        '& .MuiInputBase-input': { color: '#fff', fontSize: '1rem', py: 1.5 }
                      }}
                    />
                  )}
                  sx={{
                    flex: 1,
                    minWidth: 140,
                    '& .MuiAutocomplete-popupIndicator': { color: '#fff' },
                    '& .MuiAutocomplete-clearIndicator': { color: '#fff' },
                    '& .MuiAutocomplete-option': { color: '#fff' },
                    '& .MuiAutocomplete-listbox': {
                      '&::-webkit-scrollbar': { display: 'none' },
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none',
                      maxHeight: '200px'
                    }
                  }}
                />
                <TextField
                  label="물량"
                  value={form.quantity || ''}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  placeholder="물량을 입력하세요"
                  size="medium"
                  sx={{
                    flex: 1,
                    minWidth: 140,
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: '#333' },
                      '&:hover fieldset': { borderColor: '#555' },
                      '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                    },
                    '& .MuiInputLabel-root': { color: '#bbb', fontSize: '1rem' },
                    '& .MuiInputBase-input': { color: '#fff', fontSize: '1rem', py: 1.5 }
                  }}
                />
              </Box>
            )}
            
            {/* 세금 세부내용 드롭다운 (세금 선택 시에만 표시) */}
            {form.itemType === '세금' && (
              <Box display="flex" width="100%" justifyContent="center" gap={2}>
                <Autocomplete
                  options={['국세', '지방세', '건강', '연금', '고용', '산재', '법인세', '기타']}
                  value={form.taxDetail || '기타'}
                  onChange={(event, newValue) => {
                    setForm({ ...form, taxDetail: newValue || '기타' });
                    // 세금 세부내용이 변경되면 차수 자동 업데이트
                    if (form.site && form.itemType === '세금' && form.date && !editId) {
                      console.log('차수 계산 호출 (세부내용 변경):', { site: form.site, itemType: form.itemType, date: form.date, subMaterialDetail: form.subMaterialDetail, taxDetail: newValue });
                      const nextSequence = calculateNextSequence(form.site, form.itemType, form.date, form.subMaterialDetail, newValue);
                      console.log('계산된 차수:', nextSequence);
                      setForm(prev => ({ ...prev, sequence: nextSequence }));
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="세금 세부내용"
                      placeholder="세금 세부내용을 선택하세요"
                      size="medium"
                      sx={{
                        flex: 1,
                        minWidth: 140,
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': { borderColor: '#333' },
                          '&:hover fieldset': { borderColor: '#555' },
                          '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                        },
                        '& .MuiInputLabel-root': { color: '#bbb', fontSize: '1rem' },
                        '& .MuiInputBase-input': { color: '#fff', fontSize: '1rem', py: 1.5 }
                      }}
                    />
                  )}
                  ListboxProps={{
                    style: {
                      maxHeight: '200px',
                      '&::-webkit-scrollbar': {
                        display: 'none'
                      },
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none'
                    }
                  }}
                />
              </Box>
            )}
            
            {/* 건강보험 관련 입력칸 (건강, 연금, 고용, 산재 선택 시에만 표시) */}
            {form.itemType === '세금' && ['건강', '연금', '고용', '산재'].includes(form.taxDetail) && (
              <Box display="flex" flexDirection="column" width="100%" gap={2}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography sx={{ color: '#bbb', fontSize: '1rem', fontWeight: 'bold' }}>
                    {form.taxDetail} 관련 데이터
                  </Typography>
                  <Button
                    onClick={addHealthInsuranceItem}
                    variant="outlined"
                    size="small"
                    sx={{
                      color: '#90caf9',
                      borderColor: '#90caf9',
                      '&:hover': {
                        borderColor: '#90caf9',
                        backgroundColor: 'rgba(144, 202, 249, 0.1)'
                      }
                    }}
                  >
                    + 추가
                  </Button>
                </Box>
                
                {form.healthInsurance.map((item, index) => (
                  <Box key={index} display="flex" width="100%" justifyContent="center" gap={2} alignItems="center">
                    <TextField
                      label="이름"
                      value={item.name}
                      onChange={(e) => updateHealthInsuranceItem(index, 'name', e.target.value)}
                      placeholder="이름을 입력하세요"
                      size="medium"
                      sx={{
                        flex: 1,
                        minWidth: 140,
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': { borderColor: '#333' },
                          '&:hover fieldset': { borderColor: '#555' },
                          '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                        },
                        '& .MuiInputLabel-root': { color: '#bbb', fontSize: '1rem' },
                        '& .MuiInputBase-input': { color: '#fff', fontSize: '1rem', py: 1.5 }
                      }}
                    />
                    <TextField
                      label="금액"
                      value={item.amount ? Math.ceil(Number(item.amount)).toLocaleString() : ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        updateHealthInsuranceItem(index, 'amount', value);
                      }}
                      placeholder="금액을 입력하세요"
                      size="medium"
                      sx={{
                        flex: 1,
                        minWidth: 140,
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': { borderColor: '#333' },
                          '&:hover fieldset': { borderColor: '#555' },
                          '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                        },
                        '& .MuiInputLabel-root': { color: '#bbb', fontSize: '1rem' },
                        '& .MuiInputBase-input': { color: '#fff', fontSize: '1rem', py: 1.5 }
                      }}
                    />
                    <IconButton
                      onClick={() => removeHealthInsuranceItem(index)}
                      sx={{
                        color: '#ff6b6b',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 107, 107, 0.1)'
                        }
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}
            
            {/* 2줄: 차수 + 사용날짜 */}
            <Box display="flex" width="100%" justifyContent="center" gap={2}>
              <TextField
                label="차수"
                value={form.sequence ?? ''}
                onChange={e => setForm({ ...form, sequence: e.target.value })}
                placeholder="자동으로 설정됩니다"
                size="medium"
                sx={{
                  flex: 1,
                  minWidth: 140,
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#333' },
                    '&:hover fieldset': { borderColor: '#555' },
                    '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                  },
                  '& .MuiInputLabel-root': { color: '#bbb', fontSize: '1rem' },
                  '& .MuiInputBase-input': { color: '#fff', fontSize: '1rem', py: 1.5 }
                }}
              />
              <TextField
                label="사용날짜"
                type="date"
                value={form.date ?? ''}
                onChange={e => {
                  console.log('날짜 변경:', e.target.value);
                  setForm({ ...form, date: e.target.value });
                  // 날짜가 변경되면 차수 자동 업데이트
                  if (e.target.value && form.site && form.itemType && !editId) {
                    console.log('차수 계산 호출:', { site: form.site, itemType: form.itemType, date: e.target.value, subMaterialDetail: form.subMaterialDetail, taxDetail: form.taxDetail });
                    const nextSequence = calculateNextSequence(form.site, form.itemType, e.target.value, form.subMaterialDetail, form.taxDetail);
                    console.log('계산된 차수:', nextSequence);
                    setForm(prev => ({ ...prev, sequence: nextSequence }));
                  }
                }}
                size="medium"
                sx={{
                  flex: 1,
                  minWidth: 140,
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#333' },
                    '&:hover fieldset': { borderColor: '#555' },
                    '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                  },
                  '& .MuiInputLabel-root': { color: '#bbb', fontSize: '1rem' },
                  '& .MuiInputBase-input': { color: '#fff', fontSize: '1rem', py: 1.5 }
                }}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
            {/* 3줄: 결제방법 + 금액 */}
            <Box display="flex" width="100%" justifyContent="center" gap={2}>
              <Autocomplete
                options={['카드', '세금계산서', '세금', '영수증', '노무자료', '기타']}
                value={form.paymentType ?? ''}
                onChange={(event, newValue) => setForm({ ...form, paymentType: newValue || '' })}
                onInputChange={(event, newInputValue) => setForm({ ...form, paymentType: newInputValue })}
                freeSolo
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="결제방법"
                    placeholder="선택하거나 직접 입력"
                    size="medium"
                    sx={{
                      flex: 1,
                      minWidth: 140,
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: '#333' },
                        '&:hover fieldset': { borderColor: '#555' },
                        '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                      },
                      '& .MuiInputLabel-root': { color: '#bbb', fontSize: '1rem' },
                      '& .MuiInputBase-input': { color: '#fff', fontSize: '1rem', py: 1.5 }
                    }}
                  />
                )}
                sx={{
                  flex: 1,
                  minWidth: 140,
                  '& .MuiAutocomplete-popupIndicator': { color: '#fff' },
                  '& .MuiAutocomplete-clearIndicator': { color: '#fff' },
                  '& .MuiAutocomplete-option': { color: '#fff' }
                }}
              />
              <TextField
                label="금액"
                value={(() => {
                  const baseAmount = Number(form.totalValue) || 0;
                  const healthInsuranceTotal = calculateHealthInsuranceTotal();
                  const totalAmount = baseAmount + healthInsuranceTotal;
                  return totalAmount > 0 ? totalAmount.toLocaleString() : '';
                })()}
                onChange={e => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  setForm({ ...form, totalValue: value });
                }}
                placeholder="금액을 입력하세요"
                size="medium"
                sx={{
                  flex: 1,
                  minWidth: 140,
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#333' },
                    '&:hover fieldset': { borderColor: '#555' },
                    '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                  },
                  '& .MuiInputLabel-root': { color: '#bbb', fontSize: '1rem' },
                  '& .MuiInputBase-input': { color: '#fff', fontSize: '1rem', py: 1.5 }
                }}
              />
            </Box>
            {/* 4줄: 비고 */}
            <Box display="flex" width="100%" justifyContent="center">
              <TextField
                label="비고"
                value={form.description ?? ''}
                onChange={e => setForm({ ...form, description: e.target.value })}
                fullWidth
                multiline
                rows={3}
                size="medium"
                sx={{
                  maxWidth: 400,
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#333' },
                    '&:hover fieldset': { borderColor: '#555' },
                    '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                  },
                  '& .MuiInputLabel-root': { color: '#bbb', fontSize: '1rem' },
                  '& .MuiInputBase-input': { color: '#fff', fontSize: '1rem' }
                }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#232b3b', p: 3, justifyContent: 'center' }}>
          <Button 
            onClick={closeDialog}
            sx={{ color: '#bbb', fontSize: '1rem', px: 3, py: 1 }}
          >
            취소
          </Button>
          <Button 
            onClick={handleSave} 
            variant="contained"
            sx={{ 
              bgcolor: '#2e7d32',
              fontSize: '1rem',
              px: 3,
              py: 1,
              '&:hover': { bgcolor: '#1b5e20' }
            }}
          >
            저장
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ 
          top: '50px !important',
          '& .MuiSnackbar-root': {
            top: '50px !important'
          }
        }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Cost; 