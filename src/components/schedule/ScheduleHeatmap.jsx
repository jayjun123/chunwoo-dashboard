import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Tooltip,
  useTheme,
  useMediaQuery,
  TextField,
  Checkbox,
  FormControlLabel,
  Autocomplete,
  Dialog,
  IconButton,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  CalendarToday as CalendarIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Download as DownloadIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

const ScheduleHeatmap = ({ 
  sites = [], 
  calendarItems = {}, 
  year, 
  month, 
  onYearChange, 
  onMonthChange,
  onTabChange,
  onLogoClick
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [viewMode, setViewMode] = useState('sites'); // 'sites' or 'teams'
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // 기간 설정 상태
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [useCustomPeriod, setUseCustomPeriod] = useState(false);
  const [showPeriodDialog, setShowPeriodDialog] = useState(false);
  
  // 현장 선택 상태
  const [selectedSites, setSelectedSites] = useState([]);

  // 설명에서 명수 추출하는 함수
  const extractManpowerFromDescription = (description) => {
    if (!description) return 0;
    
    // "0명", "1명", "2명" 등의 패턴을 찾아서 숫자 추출
    const matches = description.match(/(\d+)명/g);
    if (matches) {
      return matches.reduce((sum, match) => {
        const num = parseInt(match.replace('명', ''));
        return sum + (isNaN(num) ? 0 : num);
      }, 0);
    }
    
    // "0인", "1인", "2인" 등의 패턴도 찾기
    const matches2 = description.match(/(\d+)인/g);
    if (matches2) {
      return matches2.reduce((sum, match) => {
        const num = parseInt(match.replace('인', ''));
        return sum + (isNaN(num) ? 0 : num);
      }, 0);
    }
    
    return 0;
  };

  // 현재 월의 모든 날짜 생성
  const currentMonth = new Date(year, month);
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // 오늘 날짜 (시간 제거)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // 기간 설정에 따른 날짜 범위 계산
  const getDateRange = () => {
    if (useCustomPeriod && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      return eachDayOfInterval({ start, end });
    }
    return allDays;
  };
  
  const dateRange = getDateRange();

  // 정규화 함수 (공통 사용)
  const normalizeTeamName = (name) => {
    if (!name) return '';
    // 공백 제거
    let normalized = name.trim();
    
    // "[협력]" 접두사 제거
    normalized = normalized.replace(/^\[협력\]/, '');
    
    // "팀"으로 끝나지 않으면 추가
    if (!normalized.endsWith('팀')) {
      normalized = normalized + '팀';
    }
    
    return normalized;
  };


  // 시공팀 데이터 상태
  const [constructionTeams, setConstructionTeams] = useState([]);

  // 시공팀 데이터 로드
  useEffect(() => {
    const loadConstructionTeams = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'constructionTeams'));
        const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setConstructionTeams(teamsData);
      } catch (error) {
        console.error('시공팀 데이터 로드 오류:', error);
      }
    };
    loadConstructionTeams();
  }, []);

  // 시공팀 목록 추출 (팁 이름 포함)
  const teams = useMemo(() => {
    // constructionTeams 데이터를 우선으로 사용하고, 중복 제거
    const teamMap = new Map();
    
    // constructionTeams에서 팀 정보 가져오기 (이것이 정확한 팀 목록)
    constructionTeams.forEach(team => {
      if (team.teamName) {
        // 팀 이름을 정규화하여 키로 사용
        const normalizedName = normalizeTeamName(team.teamName);
        teamMap.set(normalizedName, normalizedName);
      }
    });
    
    // sites에서 추가 팀 정보 수집 (constructionTeams에 없는 경우만)
    sites.forEach(site => {
      const siteTeam = site.team || site.constructionTeam || site.constructionManager;
      if (siteTeam) {
        const normalizedName = normalizeTeamName(siteTeam);
        if (!teamMap.has(normalizedName)) {
          teamMap.set(normalizedName, normalizedName);
        }
      }
    });
    
    const result = Array.from(teamMap.entries()).map(([key, value]) => ({ key, value }));
    
    // 디버깅을 위한 로그
    console.log('=== 시공팀 디버깅 ===');
    console.log('constructionTeams 데이터:', constructionTeams);
    console.log('정규화된 팀 목록:', result);
    console.log('==================');
    
    return result;
  }, [sites, constructionTeams]);

  // 현장별 투입일수 및 공수 계산
  const siteWorkDays = useMemo(() => {
    const workDays = {};
    
    // 항상 모든 현장을 처리 (선택과 무관하게)
    const targetSites = sites;
    
    targetSites.forEach(site => {
      const siteId = site.id;
      const siteName = site.name;
      // 팀 정보 우선순위: team > constructionTeam > constructionManager
      const rawTeam = site.team || site.constructionTeam || site.constructionManager || '미분류';
      
      
      const team = normalizeTeamName(rawTeam);
      
      if (!workDays[siteId]) {
        workDays[siteId] = {
          siteId, // siteId 추가
          siteName,
          team,
          workDays: 0,
          totalManpower: 0, // 총 공수
          dailyWork: {},
          dailyManpower: {} // 일별 공수
        };
      }
      
      // 설정된 기간의 각 날짜별로 현장 투입 여부 및 공수 확인 (오늘까지만)
      dateRange.forEach(day => {
        // 오늘 날짜 이후는 제외
        if (day > today) {
          return;
        }
        
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayItems = calendarItems[dayStr] || [];
        
        // 해당 현장이 해당 날짜에 일정이 있는지 확인
        const workItems = dayItems.filter(item => 
          item.siteId === siteId || 
          item.siteName === siteName ||
          (item.text && item.text.includes(siteName))
        );
        
        if (workItems.length > 0) {
          workDays[siteId].workDays += 1;
          workDays[siteId].dailyWork[dayStr] = true;
          
          // 해당 날짜의 공수 계산 (일정 아이템의 desc 필드에서 추출)
          let dayManpower = 0;
          workItems.forEach(item => {
            const manpower = extractManpowerFromDescription(item.desc || '');
            dayManpower += manpower;
          });
          
          workDays[siteId].dailyManpower[dayStr] = dayManpower;
          workDays[siteId].totalManpower += dayManpower;
        }
      });
    });
    
    return workDays;
  }, [sites, calendarItems, dateRange, selectedSites]);

  // 시공팀별 투입일수 및 공수 계산
  const teamWorkDays = useMemo(() => {
    const teamStats = {};
    
    teams.forEach(team => {
      teamStats[team.key] = {
        teamName: team.key,
        totalWorkDays: 0,
        totalManpower: 0, // 총 공수
        siteCount: 0,
        dailyWork: {},
        dailyManpower: {} // 일별 공수
      };
      
      
      // 해당 팀의 현장들 찾기 (정규화된 이름으로 비교)
      const teamSites = sites.filter(site => {
        const siteTeam = site.team || site.constructionTeam || site.constructionManager;
        if (!siteTeam) return false;
        
        // 정규화된 이름으로 비교
        const normalizedSiteTeam = normalizeTeamName(siteTeam);
        const normalizedTeamKey = normalizeTeamName(team.key);
        
        return normalizedSiteTeam === normalizedTeamKey;
      });
      
      teamStats[team.key].siteCount = teamSites.length;
      
      // 각 현장의 투입일수 및 공수 합산
      teamSites.forEach(site => {
        const siteWorkData = siteWorkDays[site.id];
        if (siteWorkData) {
          teamStats[team.key].totalWorkDays += siteWorkData.workDays;
          teamStats[team.key].totalManpower += siteWorkData.totalManpower;
          
          // 일별 작업 현황 및 공수 합산
          Object.keys(siteWorkData.dailyWork).forEach(day => {
            if (!teamStats[team.key].dailyWork[day]) {
              teamStats[team.key].dailyWork[day] = 0;
              teamStats[team.key].dailyManpower[day] = 0;
            }
            teamStats[team.key].dailyWork[day] += 1;
            teamStats[team.key].dailyManpower[day] += siteWorkData.dailyManpower[day] || 0;
          });
        }
      });
    });
    
    return teamStats;
  }, [teams, sites, siteWorkDays]);

  // 히트맵 데이터 생성 (0일 현장 제외)
  const heatmapData = useMemo(() => {
    if (viewMode === 'sites') {
      // 항상 모든 현장을 표시 (선택과 무관하게)
      let filteredSites = Object.values(siteWorkDays);
      
      // workDays > 0인 현장들만 표시 (기본 필터링)
      filteredSites = filteredSites.filter(site => site.workDays > 0);
      
      // 검색어 필터링
      if (searchTerm.trim()) {
        filteredSites = filteredSites.filter(site => 
          site.siteName.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      return filteredSites.sort((a, b) => b.workDays - a.workDays);
    } else {
      const filteredTeams = selectedTeam === 'all' 
        ? Object.values(teamWorkDays)
        : [teamWorkDays[selectedTeam]].filter(Boolean);
      return filteredTeams
        .filter(team => team.totalWorkDays > 0) // 0일 팀 제외
        .sort((a, b) => b.totalWorkDays - a.totalWorkDays);
    }
  }, [viewMode, siteWorkDays, teamWorkDays, selectedTeam, searchTerm]);

  // 색상 계산 함수
  const getHeatmapColor = (value, maxValue, itemType = '') => {
    if (value === 0) return '#2a2a2a';
    
    // 실측, 회의, 기타 항목은 다른 색상 사용
    if (itemType === '실측') {
      const intensity = Math.min(value / maxValue, 1);
      return `hsl(240, 70%, ${30 + intensity * 40}%)`; // 파란색 계열
    } else if (itemType === '회의') {
      const intensity = Math.min(value / maxValue, 1);
      return `hsl(30, 70%, ${30 + intensity * 40}%)`; // 주황색 계열
    } else if (itemType === '기타') {
      const intensity = Math.min(value / maxValue, 1);
      return `hsl(300, 70%, ${30 + intensity * 40}%)`; // 보라색 계열
    }
    
    // 기본 투입 현황은 초록색에서 빨간색으로
    const intensity = Math.min(value / maxValue, 1);
    const hue = 120 - (intensity * 120);
    return `hsl(${hue}, 70%, 50%)`;
  };

  // 최대값 계산
  const maxValue = useMemo(() => {
    if (viewMode === 'sites') {
      return Math.max(...Object.values(siteWorkDays).map(site => site.workDays), 1);
    } else {
      return Math.max(...Object.values(teamWorkDays).map(team => team.totalWorkDays), 1);
    }
  }, [viewMode, siteWorkDays, teamWorkDays]);

  // isInMonth 함수 (일정관리 페이지와 동일)
  const isInMonth = (site, year, month) => {
    if (!site.startDate || !site.endDate) return false;
    const s = new Date(site.startDate);
    const e = new Date(site.endDate);
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    return !(e < first || s > last);
  };

  // 월별 요약 통계
  const monthlyStats = useMemo(() => {
    // 일정관리 페이지와 동일한 필터링 적용
    const filteredSites = sites.filter(site => isInMonth(site, year, month));
    const totalSites = filteredSites.length;
    
    // 이달의 투입 현장: 해당 월의 날짜 셀 안에 실제로 일정이 있는 현장만 카운트
    const activeSites = Object.values(siteWorkDays).filter(site => site.workDays > 0).length;
    const totalWorkDays = Object.values(siteWorkDays).reduce((sum, site) => sum + site.workDays, 0);
    const totalManpower = Object.values(siteWorkDays).reduce((sum, site) => sum + site.totalManpower, 0);
    const avgWorkDays = activeSites > 0 ? (totalWorkDays / activeSites).toFixed(1) : 0;
    const avgManpower = activeSites > 0 ? (totalManpower / activeSites).toFixed(1) : 0;
    
    return {
      totalSites,
      activeSites,
      totalWorkDays,
      totalManpower,
      avgWorkDays,
      avgManpower
    };
  }, [sites, siteWorkDays, year, month]);

  // 히트맵 엑셀 다운로드 함수 (ExcelJS 사용)
  const handleHeatmapExcelDownload = async () => {
    try {
      // 새 워크북 생성
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('히트맵 분석');
      
      // 제목 생성
      let title = '';
      if (useCustomPeriod && startDate && endDate) {
        const startDateStr = format(new Date(startDate), 'yyyy년MM월dd일');
        const endDateStr = format(new Date(endDate), 'yyyy년MM월dd일');
        title = `천우건업(주) ${startDateStr}부터 ${endDateStr}까지 공수 및 일수`;
      } else {
        const startDateStr = `${year}년${String(month + 1).padStart(2, '0')}월01일`;
        const endDateStr = `${year}년${String(month + 1).padStart(2, '0')}월${String(new Date(year, month + 1, 0).getDate()).padStart(2, '0')}일`;
        title = `천우건업(주) ${startDateStr}부터 ${endDateStr}까지 공수 및 일수`;
      }
      
      // 제목 행 추가
      const titleRow = worksheet.addRow([title]);
      titleRow.height = 30;
      
      // 제목 셀 스타일 설정
      const titleCell = titleRow.getCell(1);
      titleCell.font = { size: 20, bold: true };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.border = {
        top: { style: 'thick' },
        left: { style: 'thick' },
        bottom: { style: 'thick' },
        right: { style: 'thick' }
      };
      
      // 제목 셀 병합 (A1부터 마지막 컬럼까지)
      worksheet.mergeCells(1, 1, 1, 4 + dateRange.length);
      
      // 빈 행 추가
      worksheet.addRow([]);
      
      // 헤더 행 생성
      const headers = ['현장명', '시공팀', '총 투입일수', '총 공수'];
      dateRange.forEach(day => {
        headers.push(format(day, 'MM/dd'));
      });
      
      const headerRow = worksheet.addRow(headers);
      headerRow.height = 25;
      
      // 헤더 셀 스타일 설정
      headerRow.eachCell((cell, colNumber) => {
        cell.font = { size: 12, bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thick' },
          left: { style: 'thick' },
          bottom: { style: 'thick' },
          right: { style: 'thick' }
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0F0F0' }
        };
      });
      
      // 데이터 행 추가
      const dataToExport = selectedSites.length > 0 
        ? heatmapData.filter(item => selectedSites.includes(item.siteId))
        : heatmapData;
        
      dataToExport.forEach(item => {
        const rowData = [];
        
        if (viewMode === 'sites') {
          rowData.push(item.siteName, item.team, item.workDays, item.totalManpower);
        } else {
          const teamInfo = teams.find(t => t.key === item.teamName);
          rowData.push(teamInfo?.value || item.teamName, item.teamName, item.totalWorkDays, item.totalManpower);
        }
        
        // 각 날짜별 데이터 추가
        dateRange.forEach(day => {
          const dayStr = format(day, 'yyyy-MM-dd');
          const hasWork = viewMode === 'sites' 
            ? item.dailyWork[dayStr] || false
            : (item.dailyWork[dayStr] || 0) > 0;
          
          const manpower = viewMode === 'sites' 
            ? (item.dailyManpower[dayStr] || 0)
            : (item.dailyManpower[dayStr] || 0);
          
          if (hasWork) {
            if (manpower > 0) {
              rowData.push(`${manpower}명`);
            } else {
              rowData.push('투입');
            }
          } else {
            rowData.push('');
          }
        });
        
        const dataRow = worksheet.addRow(rowData);
        dataRow.height = 20;
        
        // 데이터 셀 스타일 설정
        dataRow.eachCell((cell, colNumber) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });
      });
      
      // 컬럼 너비 설정
      worksheet.getColumn(1).width = 25; // 현장명
      worksheet.getColumn(2).width = 15; // 시공팀
      worksheet.getColumn(3).width = 12; // 총 투입일수
      worksheet.getColumn(4).width = 12; // 총 공수
      
      // 날짜 컬럼 너비 설정
      for (let i = 5; i <= 4 + dateRange.length; i++) {
        worksheet.getColumn(i).width = 8;
      }
      
      // 파일명 생성
      const fileName = `히트맵분석_${year}년${month + 1}월_${viewMode === 'sites' ? '현장별' : '시공팀별'}`;
      
      // 엑셀 파일 다운로드
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('히트맵 엑셀 다운로드 오류:', error);
      alert('엑셀 다운로드 중 오류가 발생했습니다: ' + error.message);
    }
  };

  return (
    <Box sx={{ p: 3, pb: 6 }}>
      {/* 헤더 */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" sx={{ color: '#fff', fontWeight: 600 }}>
            📊 월별 현장 투입 현황
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              // 일정관리 탭으로 이동 (activeTab을 0으로 설정)
              if (typeof onTabChange === 'function') {
                onTabChange(0);
              }
            }}
            sx={{
              borderColor: '#666',
              color: '#fff',
              '&:hover': { 
                borderColor: '#ff9800',
                bgcolor: 'rgba(255, 152, 0, 0.1)'
              }
            }}
          >
            ← 돌아가기
          </Button>
        </Box>
        
        {/* 기간 설정 및 월별 네비게이션 */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* 기간 설정 토글 */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={useCustomPeriod}
                  onChange={(e) => setUseCustomPeriod(e.target.checked)}
                  sx={{ color: '#ff9800' }}
                />
              }
              label={
                <Typography variant="body2" sx={{ color: '#fff' }}>
                  기간 설정
                </Typography>
              }
            />
            
            {/* 기간 설정 입력 */}
            {useCustomPeriod && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                  type="date"
                  size="small"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: '#fff',
                      '& fieldset': { borderColor: '#666' },
                      '&:hover fieldset': { borderColor: '#ff9800' },
                      '&.Mui-focused fieldset': { borderColor: '#ff9800' }
                    },
                    '& .MuiInputLabel-root': { color: '#ccc' }
                  }}
                />
                <Typography variant="body2" sx={{ color: '#fff' }}>~</Typography>
                <TextField
                  type="date"
                  size="small"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: '#fff',
                      '& fieldset': { borderColor: '#666' },
                      '&:hover fieldset': { borderColor: '#ff9800' },
                      '&.Mui-focused fieldset': { borderColor: '#ff9800' }
                    },
                    '& .MuiInputLabel-root': { color: '#ccc' }
                  }}
                />
              </Box>
            )}
            
            {/* 월별 네비게이션 (기간 설정이 아닐 때만) */}
            {!useCustomPeriod && (
              <>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ArrowBackIcon />}
                  onClick={() => {
                    if (month === 0) {
                      onYearChange(year - 1);
                      onMonthChange(11);
                    } else {
                      onMonthChange(month - 1);
                    }
                  }}
                  sx={{
                    borderColor: '#666',
                    color: '#fff',
                    '&:hover': { borderColor: '#ff9800' }
                  }}
                >
                  이전달
                </Button>
                
                <Typography 
                  variant="h6" 
                  sx={{ 
                    color: '#fff', 
                    minWidth: 120, 
                    textAlign: 'center',
                    cursor: 'pointer',
                    '&:hover': { 
                      color: '#ff9800',
                      textDecoration: 'underline'
                    }
                  }}
                  onClick={() => setShowPeriodDialog(true)}
                >
                  {year}년 {month + 1}월
                </Typography>
                
                <Button
                  variant="outlined"
                  size="small"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => {
                    if (month === 11) {
                      onYearChange(year + 1);
                      onMonthChange(0);
                    } else {
                      onMonthChange(month + 1);
                    }
                  }}
                  sx={{
                    borderColor: '#666',
                    color: '#fff',
                    '&:hover': { borderColor: '#ff9800' }
                  }}
                >
                  다음달
                </Button>
                
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    const now = new Date();
                    onYearChange(now.getFullYear());
                    onMonthChange(now.getMonth());
                  }}
                  sx={{
                    borderColor: '#666',
                    color: '#fff',
                    '&:hover': { borderColor: '#ff9800' }
                  }}
                >
                  이번달
                </Button>
                
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<DownloadIcon />}
                  onClick={handleHeatmapExcelDownload}
                  sx={{
                    borderColor: '#4caf50',
                    color: '#4caf50',
                    '&:hover': { 
                      borderColor: '#45a049',
                      bgcolor: 'rgba(76, 175, 80, 0.1)'
                    }
                  }}
                >
                  엑셀 다운로드
                </Button>
              </>
            )}
          </Box>
          
          {/* 요약 통계 */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ color: '#ccc', fontSize: '1.2rem' }}>
              이달의 현장: <span style={{ color: '#fff', fontWeight: 'bold' }}>{monthlyStats.totalSites}</span>개
            </Typography>
            <Typography variant="body2" sx={{ color: '#ccc', fontSize: '1.2rem' }}>
              이달의 투입 현장: <span style={{ color: '#4caf50', fontWeight: 'bold' }}>{monthlyStats.activeSites}</span>개
            </Typography>
            <Typography variant="body2" sx={{ color: '#ccc', fontSize: '1.2rem' }}>
              총 투입일: <span style={{ color: '#2196f3', fontWeight: 'bold' }}>{monthlyStats.totalWorkDays}</span>일
            </Typography>
            <Typography variant="body2" sx={{ color: '#ccc', fontSize: '1.2rem' }}>
              총 공수: <span style={{ color: '#ff9800', fontWeight: 'bold' }}>{monthlyStats.totalManpower}</span>명
            </Typography>
          </Box>
        </Box>

      </Box>

      {/* 개선된 현장 목록 */}
      <Paper sx={{ p: 3, bgcolor: '#232734', border: '1px solid #333' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6" sx={{ color: '#fff' }}>
              {format(currentMonth, 'yyyy년 M월', { locale: ko })} - {viewMode === 'sites' ? '현장별' : '시공팀별'} 투입 현황
            </Typography>
            
            {/* 전체선택/해제 버튼 */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  // 전체 선택
                  const allSiteIds = heatmapData.map(item => item.siteId).filter(Boolean);
                  setSelectedSites(allSiteIds);
                }}
                sx={{
                  borderColor: '#4caf50',
                  color: '#4caf50',
                  '&:hover': { 
                    borderColor: '#4caf50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)'
                  }
                }}
              >
                전체선택
              </Button>
              
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  // 전체 해제
                  setSelectedSites([]);
                }}
                sx={{
                  borderColor: '#f44336',
                  color: '#f44336',
                  '&:hover': { 
                    borderColor: '#f44336',
                    backgroundColor: 'rgba(244, 67, 54, 0.1)'
                  }
                }}
              >
                전체해제
              </Button>
            </Box>
            
            {/* 검색창 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
              <TextField
                size="small"
                placeholder="현장명 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': {
                      borderColor: '#666',
                    },
                    '&:hover fieldset': {
                      borderColor: '#888',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#4caf50',
                    },
                  },
                  '& .MuiInputBase-input': {
                    color: '#fff',
                    '&::placeholder': {
                      color: '#999',
                      opacity: 1,
                    },
                  },
                }}
                InputProps={{
                  endAdornment: searchTerm && (
                    <IconButton
                      size="small"
                      onClick={() => setSearchTerm('')}
                      sx={{ color: '#999' }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  ),
                }}
              />
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {/* 선택된 현장 개수 표시 */}
            <Typography variant="body2" sx={{ color: '#f44336', fontWeight: 'bold' }}>
              선택된 현장: {selectedSites.length}개
            </Typography>
            
            <Button
              variant="outlined"
              size="small"
              startIcon={<DownloadIcon />}
              onClick={handleHeatmapExcelDownload}
              sx={{
                borderColor: '#666',
                color: '#fff',
                '&:hover': { 
                  borderColor: '#ff9800',
                  bgcolor: 'rgba(255, 152, 0, 0.1)'
                }
              }}
            >
              엑셀 다운로드
            </Button>
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel sx={{ color: '#ccc' }}>보기 모드</InputLabel>
              <Select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value)}
                sx={{
                  color: '#fff',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#666' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#ff9800' }
                }}
              >
                <MenuItem value="sites">현장별</MenuItem>
                <MenuItem value="teams">시공팀별</MenuItem>
              </Select>
            </FormControl>
            
            {viewMode === 'teams' && (
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel sx={{ color: '#ccc' }}>시공팀</InputLabel>
                <Select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  sx={{
                    color: '#fff',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#666' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#ff9800' }
                  }}
                >
                  <MenuItem value="all">전체</MenuItem>
                  {teams.map(team => (
                    <MenuItem key={team.key} value={team.key}>{team.value}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>
        </Box>
        



        {/* 현장 목록을 카드 형태로 표시 */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {heatmapData.map((item, index) => {
            const isSelected = viewMode === 'sites' 
              ? selectedSites.includes(item.siteId)
              : false; // 시공팀별 보기에서는 선택 불가
            
            return (
              <Paper
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (viewMode === 'sites' && item.siteId) {
                    const siteId = item.siteId;
                    if (isSelected) {
                      setSelectedSites(prev => prev.filter(id => id !== siteId));
                    } else {
                      setSelectedSites(prev => [...prev, siteId]);
                    }
                  }
                }}
                sx={{
                  p: 1,
                  bgcolor: '#2a2b32',
                  border: isSelected ? '3px solid #f44336' : '1px solid #444',
                  borderRadius: 1,
                  cursor: viewMode === 'sites' ? 'pointer' : 'default',
                  '&:hover': {
                    bgcolor: '#333',
                    borderColor: isSelected ? '#f44336' : '#666'
                  }
                }}
              >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {/* 현장/팀 정보 */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                  <Box sx={{ minWidth: 180 }}>
                    <Typography 
                      variant="subtitle1" 
                      sx={{ 
                        color: '#fff', 
                        fontWeight: 'bold',
                        fontSize: '1.2rem'
                      }}
                    >
                      {viewMode === 'sites' ? item.siteName : (teams.find(t => t.key === item.teamName)?.value || item.teamName)}
                    </Typography>
                    {viewMode === 'teams' && (
                      <Typography variant="caption" sx={{ color: '#ccc' }}>
                        {item.siteCount}개 현장 담당
                      </Typography>
                    )}
                  </Box>
                  
                  {/* 투입일수 및 공수 표시 */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: viewMode === 'sites' 
                            ? (item.workDays > 0 ? '#4caf50' : '#666')
                            : (item.totalWorkDays > 0 ? '#4caf50' : '#666')
                        }}
                      />
                      <Typography 
                        variant="subtitle2" 
                        sx={{ 
                          color: '#fff', 
                          fontWeight: 'bold',
                          fontSize: '1.2rem'
                        }}
                      >
                        {viewMode === 'sites' ? item.workDays : item.totalWorkDays}일
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PeopleIcon sx={{ color: '#ff9800', fontSize: '1.2rem' }} />
                      <Typography 
                        variant="subtitle2" 
                        sx={{ 
                          color: '#ff9800', 
                          fontWeight: 'bold',
                          fontSize: '1.2rem'
                        }}
                      >
                        {viewMode === 'sites' ? item.totalManpower : item.totalManpower}명
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                
                {/* 히트맵 바와 날짜 (첫 번째 카드에만 날짜 표시) */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 200 }}>
                  {/* 날짜 라벨 (첫 번째 카드에만) */}
                  {index === 0 && (
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      {allDays.map((day, dayIndex) => {
                        const dayOfWeek = day.getDay(); // 0=일요일, 1=월요일, ..., 6=토요일
                        const isSunday = dayOfWeek === 0;
                        const isToday = day.getTime() === today.getTime();
                        
                        return (
                          <Box
                            key={`date-${format(day, 'yyyy-MM-dd')}`}
                            sx={{
                              width: 16,
                              height: 16,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.9rem',
                              fontWeight: 'bold',
                              color: isSunday ? '#ff4444' : '#ccc',
                              textAlign: 'center',
                              lineHeight: 1,
                              border: isToday ? '5px solid #2196f3' : 'none',
                              borderRadius: isToday ? 1 : 0,
                              bgcolor: isToday ? 'rgba(33, 150, 243, 0.1)' : 'transparent'
                            }}
                          >
                            {format(day, 'd')}
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                  
                  {/* 히트맵 바 */}
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    {allDays.map((day, dayIndex) => {
                    const dayStr = format(day, 'yyyy-MM-dd');
                    const hasWork = viewMode === 'sites' 
                      ? item.dailyWork[dayStr] || false
                      : (item.dailyWork[dayStr] || 0) > 0;
                    
                    const manpower = viewMode === 'sites' 
                      ? (item.dailyManpower[dayStr] || 0)
                      : (item.dailyManpower[dayStr] || 0);
                    
                    // 오늘 이후 날짜는 투입 여부만 표시하지 않음 (바는 표시)
                    const isFuture = day > today;
                    const displayHasWork = isFuture ? false : hasWork;
                    const displayManpower = isFuture ? 0 : manpower;
                    
                    // 해당 날짜의 일정 항목 타입 확인
                    const getWorkType = () => {
                      if (isFuture || !displayHasWork) return null;
                      
                      const siteId = item.siteId;
                      const dayItems = calendarItems[dayStr] || [];
                      const siteItems = dayItems.filter(calItem => calItem.siteId === siteId);
                      
                      if (siteItems.length > 0) {
                        const item = siteItems[0]; // 첫 번째 항목의 타입 사용
                        if (item.type === '실측') return '실측';
                        if (item.type === '회의') return '회의';
                        if (item.type === '기타') {
                          // 기타 항목에서 대괄호 내용 추출
                          if (item.description && item.description.includes('[') && item.description.includes(']')) {
                            const match = item.description.match(/\[([^\]]+)\]/);
                            if (match && match[1]) {
                              return match[1]; // 대괄호 안의 내용 반환 (예: 발주)
                            }
                          }
                          return '기타';
                        }
                      }
                      return '투입'; // 기본값
                    };
                    
                    const workType = getWorkType();
                    
                    return (
                      <Tooltip
                        key={dayStr}
                        title={
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {format(day, 'M월 d일')}
                            </Typography>
                            <Typography variant="body2">
                              {isFuture ? '미래' : (displayHasWork ? (workType || '투입') : '미투입')}
                            </Typography>
                            {displayHasWork && displayManpower > 0 && (
                              <Typography variant="body2" sx={{ color: '#ff9800' }}>
                                공수: {displayManpower}명
                              </Typography>
                            )}
                          </Box>
                        }
                        arrow
                      >
                        <Box
                          sx={{
                            width: 16,
                            height: 20,
                            bgcolor: isFuture ? '#444' : (displayHasWork ? 
                              (workType === '실측' ? '#2196f3' : 
                               workType === '회의' ? '#ff9800' : 
                               workType === '기타' ? '#9c27b0' :
                               workType === '발주' ? '#ff5722' :
                               workType === '현설' ? '#795548' :
                               workType === '견적' ? '#607d8b' :
                               workType === '실측/기타' ? '#673ab7' :
                               workType && workType !== '투입' ? '#ff9800' : '#4caf50') : '#2a2a2a'),
                            borderRadius: 1,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': {
                              bgcolor: isFuture ? '#555' : (displayHasWork ? 
                                (workType === '실측' ? '#42a5f5' : 
                                 workType === '회의' ? '#ffb74d' : 
                                 workType === '기타' ? '#ba68c8' :
                                 workType === '발주' ? '#ff7043' :
                                 workType === '현설' ? '#8d6e63' :
                                 workType === '견적' ? '#78909c' :
                                 workType === '실측/기타' ? '#9575cd' :
                                 workType && workType !== '투입' ? '#ffb74d' : '#66bb6a') : '#444'),
                              transform: 'scaleY(1.2)'
                            }
                          }}
                        />
                      </Tooltip>
                    );
                  })}
                  </Box>
                </Box>
              </Box>
            </Paper>
          );
          })}
          
          {heatmapData.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography sx={{ color: '#ccc', fontSize: '1.1rem' }}>
                해당 월에 투입된 현장이 없습니다.
              </Typography>
            </Box>
          )}
        </Box>
        
        {/* 범례 */}
        <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
          <Typography variant="body2" sx={{ color: '#ccc', fontWeight: 'bold' }}>
            범례:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Box sx={{ width: 8, height: 20, bgcolor: '#2a2a2a', borderRadius: 1 }} />
            <Typography variant="caption" sx={{ color: '#ccc' }}>미투입</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Box sx={{ width: 8, height: 20, bgcolor: '#4caf50', borderRadius: 1 }} />
            <Typography variant="caption" sx={{ color: '#ccc' }}>투입</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Box sx={{ width: 8, height: 20, bgcolor: '#2196f3', borderRadius: 1 }} />
            <Typography variant="caption" sx={{ color: '#ccc' }}>실측</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Box sx={{ width: 8, height: 20, bgcolor: '#ff9800', borderRadius: 1 }} />
            <Typography variant="caption" sx={{ color: '#ccc' }}>회의</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Box sx={{ width: 8, height: 20, bgcolor: '#9c27b0', borderRadius: 1 }} />
            <Typography variant="caption" sx={{ color: '#ccc' }}>기타</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Box sx={{ width: 8, height: 20, bgcolor: '#ff5722', borderRadius: 1 }} />
            <Typography variant="caption" sx={{ color: '#ccc' }}>발주</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Box sx={{ width: 8, height: 20, bgcolor: '#795548', borderRadius: 1 }} />
            <Typography variant="caption" sx={{ color: '#ccc' }}>현설</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Box sx={{ width: 8, height: 20, bgcolor: '#607d8b', borderRadius: 1 }} />
            <Typography variant="caption" sx={{ color: '#ccc' }}>견적</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Box sx={{ width: 8, height: 20, bgcolor: '#673ab7', borderRadius: 1 }} />
            <Typography variant="caption" sx={{ color: '#ccc' }}>실측/기타</Typography>
          </Box>
          <Typography variant="caption" sx={{ color: '#999', ml: 2 }}>
            * 마우스를 올리면 해당 날짜의 상세 정보를 확인할 수 있습니다
          </Typography>
        </Box>
      </Paper>

      {/* 기간 설정 다이얼로그 */}
      <Dialog 
        open={showPeriodDialog} 
        onClose={() => setShowPeriodDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: '#fff', bgcolor: '#232b3b' }}>
          기간 설정
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#232b3b', color: '#fff' }}>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="시작일"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  '& fieldset': { borderColor: '#666' },
                  '&:hover fieldset': { borderColor: '#ff9800' },
                  '&.Mui-focused fieldset': { borderColor: '#ff9800' }
                },
                '& .MuiInputLabel-root': { color: '#ccc' }
              }}
            />
            <TextField
              label="종료일"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  '& fieldset': { borderColor: '#666' },
                  '&:hover fieldset': { borderColor: '#ff9800' },
                  '&.Mui-focused fieldset': { borderColor: '#ff9800' }
                },
                '& .MuiInputLabel-root': { color: '#ccc' }
              }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={useCustomPeriod}
                  onChange={(e) => setUseCustomPeriod(e.target.checked)}
                  sx={{ color: '#ff9800' }}
                />
              }
              label="사용자 정의 기간 사용"
              sx={{ color: '#fff' }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#232b3b' }}>
          <Button 
            onClick={() => setShowPeriodDialog(false)}
            sx={{ color: '#ccc' }}
          >
            취소
          </Button>
          <Button 
            onClick={() => {
              setShowPeriodDialog(false);
              // 기간 설정 완료 로직
            }}
            variant="contained"
            sx={{ 
              bgcolor: '#ff9800',
              '&:hover': { bgcolor: '#f57c00' }
            }}
          >
            설정 완료
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ScheduleHeatmap;
