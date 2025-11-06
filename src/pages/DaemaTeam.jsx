import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Container
} from '@mui/material';
import MobileSidebar from '../components/MobileSidebar';
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
  AttachMoney as AttachMoney
} from '@mui/icons-material';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { formatNumber } from '../utils/formatUtils';
import ExcelJS from 'exceljs';

const ConstructionTeam = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  
  // 상태 관리
  const [teams, setTeams] = useState([]);
  const [sites, setSites] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [draggedTeam, setDraggedTeam] = useState(null);
  const [openSiteDialog, setOpenSiteDialog] = useState(false);
  const [selectedTeamForSite, setSelectedTeamForSite] = useState(null);
  const [siteType, setSiteType] = useState('진행중');
  const [siteSearchTerm, setSiteSearchTerm] = useState('');
  
  // 폼 데이터
  const [formData, setFormData] = useState({
    teamName: '',
    managerName: '',
    memberCount: '',
    phone: '',
    email: '',
    currentSites: [],
    otherCompanySites: '',
    ownSites: '',
    notes: '',
    status: 'active'
  });

  // 날짜 기반 상태 판별 함수
  const parseDate = (value) => {
    if (!value) return null;
    try {
      if (value.toDate) return value.toDate(); // Firestore Timestamp
      return new Date(value);
    } catch (e) {
      return null;
    }
  };

  const isOngoingSite = (site) => {
    const today = new Date();
    const start = parseDate(site.startDate || site.startedAt || site.start || site.start_date);
    const end = parseDate(site.endDate || site.completedAt || site.end || site.end_date);
    if (!start) return false;
    if (isNaN(start.getTime())) return false;
    if (end && isNaN(end.getTime())) return false;
    return start <= today && (!end || end >= today);
  };

  const isScheduledSite = (site) => {
    const today = new Date();
    const start = parseDate(site.startDate || site.startedAt || site.start || site.start_date);
    if (!start || isNaN(start.getTime())) return false;
    return start > today;
  };

  // 데이터 로드
  useEffect(() => {
    loadTeams();
    loadSites();
  }, []);

  // 현장 데이터를 기반으로 팀원 목록 생성
  useEffect(() => {
    if (sites.length > 0) {
      generateTeamMembersFromSites();
    }
  }, [sites]);

  const generateTeamMembersFromSites = () => {
    // 현장의 team 필드에서 팀원 정보 추출
    const teamMembers = {};
    
    sites.forEach(site => {
      if (site.team) {
        // team 필드가 문자열인 경우 (예: "오태훈, 김철수, 이영희")
        if (typeof site.team === 'string') {
          const members = site.team.split(',').map(name => name.trim()).filter(name => name);
          members.forEach(memberName => {
            if (!teamMembers[memberName]) {
              teamMembers[memberName] = {
                name: memberName,
                sites: [],
                role: '시공팀원'
              };
            }
            teamMembers[memberName].sites.push(site.name);
          });
        }
        // team 필드가 배열인 경우
        else if (Array.isArray(site.team)) {
          site.team.forEach(member => {
            const memberName = typeof member === 'string' ? member : member.name;
            if (memberName) {
              if (!teamMembers[memberName]) {
                teamMembers[memberName] = {
                  name: memberName,
                  sites: [],
                  role: '시공팀원'
                };
              }
              teamMembers[memberName].sites.push(site.name);
            }
          });
        }
      }
    });

    console.log('현장 데이터에서 추출한 팀원 목록:', teamMembers);
    
    // 기존 팀 데이터와 병합하여 업데이트
    setTeams(prevTeams => {
      const updatedTeams = prevTeams.map(team => {
        // 해당 팀과 연결된 현장들 찾기
        const linkedSites = sites.filter(site => {
          const siteTeamName = (site.team || '').replace(/팀$/, '');
          const teamNameWithoutTeam = team.teamName.replace(/팀$/, '');
          return siteTeamName === teamNameWithoutTeam || site.manager === team.managerName;
        });
        
        // 해당 현장들에 속한 팀원들 찾기
        const teamMembersList = Object.values(teamMembers).filter(member => 
          member.sites.some(siteName => linkedSites.some(site => site.name === siteName))
        );
        
        return {
          ...team,
          members: teamMembersList
        };
      });
      
      console.log('업데이트된 팀 데이터:', updatedTeams);
      return updatedTeams;
    });
  };

  const loadTeams = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'constructionTeams'));
      const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // 순서 정보에 따라 정렬 (order 필드가 없는 경우를 위해 기본값 설정)
      const sortedTeams = teamsData.sort((a, b) => {
        const orderA = a.order !== undefined ? a.order : 999; // order가 없으면 맨 뒤로
        const orderB = b.order !== undefined ? b.order : 999;
        return orderA - orderB;
      });
      
      setTeams(sortedTeams);
      console.log('시공팀 데이터 로드됨 (순서 적용):', sortedTeams.map(team => ({ name: team.teamName, order: team.order })));
    } catch (error) {
      console.error('시공팀 데이터 로드 오류:', error);
    }
  };

  const loadSites = async () => {
    try {
      // 모든 현장 데이터 가져오기 (시공팀 정보 확인용)
      const snapshot = await getDocs(collection(db, 'sites'));
      const sitesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSites(sitesData);
      
      console.log('현장 데이터:', sitesData);
      console.log('진행중 현장:', sitesData.filter(site => site.status === '진행중'));
      console.log('예정 현장:', sitesData.filter(site => site.status === '예정'));
      
      // 모든 현장의 상태값 확인
      const allStatuses = [...new Set(sitesData.map(site => site.status))];
      console.log('모든 현장 상태값들:', allStatuses);
      
      // 각 상태별 현장 개수
      allStatuses.forEach(status => {
        const count = sitesData.filter(site => site.status === status).length;
        console.log(`${status} 현장: ${count}개`);
      });
      
      // 시공팀 정보가 있는 현장들 확인
      const sitesWithTeam = sitesData.filter(site => site.team);
      console.log('시공팀 정보가 있는 현장들:', sitesWithTeam);
      
      // 특정 현장들 확인
      const specificSites = sitesData.filter(site => 
        site.name.includes('중리동') || site.name.includes('옥송') || site.name.includes('경로당') || site.name.includes('상록공원')
      );
      console.log('특정 현장들:', specificSites);
    } catch (error) {
      console.error('현장 데이터 로드 오류:', error);
    }
  };

  const handleOpenDialog = (team = null) => {
    setEditingTeam(team);
    if (team) {
      setFormData(team);
    } else {
      setFormData({
        teamName: '',
        managerName: '',
        memberCount: '',
        phone: '',
        email: '',
        currentSites: [],
        otherCompanySites: '',
        ownSites: '',
        notes: '',
        status: 'active'
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTeam(null);
    setFormData({
      teamName: '',
      managerName: '',
      memberCount: '',
      phone: '',
      email: '',
      currentSites: [],
      otherCompanySites: '',
      ownSites: '',
      notes: '',
      status: 'active'
    });
  };

  const handleSave = async () => {
    try {
      if (editingTeam) {
        await updateDoc(doc(db, 'constructionTeams', editingTeam.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
      } else {
        // 새 팀 추가 시 순서를 맨 뒤로 설정
        const maxOrder = teams.length > 0 ? Math.max(...teams.map(team => team.order || 0)) : -1;
        await addDoc(collection(db, 'constructionTeams'), {
          ...formData,
          order: maxOrder + 1,
          createdAt: serverTimestamp()
        });
      }

      // 현장 데이터도 업데이트
      await updateSiteConstructionTeam(formData);

      setSnackbar({
        open: true,
        message: `${editingTeam ? '수정' : '추가'}되었습니다.`,
        severity: 'success'
      });
      handleCloseDialog();
      loadTeams();
    } catch (error) {
      console.error('저장 오류:', error);
      setSnackbar({
        open: true,
        message: '저장 중 오류가 발생했습니다.',
        severity: 'error'
      });
    }
  };

  const updateSiteConstructionTeam = async (teamData) => {
    try {
      // 현재 진행 현장들을 찾아서 시공팀 정보 업데이트
      const sitesToUpdate = sites.filter(site => 
        teamData.currentSites.some(currentSite => 
          site.name === currentSite || site.id === currentSite
        )
      );

      for (const site of sitesToUpdate) {
        await updateDoc(doc(db, 'sites', site.id), {
          constructionTeam: teamData.teamName,
          constructionManager: teamData.managerName,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('현장 시공팀 업데이트 오류:', error);
    }
  };

  // 엑셀 다운로드 함수 (ExcelJS 사용)
  const handleExcelDownload = async () => {
    try {
      // 상태 표기 정규화 함수
      const normalizeStatus = (status) => {
        if (!status) return '';
        const statusStr = String(status).trim();
        
        // 원본이 "진행"이면 "진행", "진행중"이면 "진행중"으로 그대로 유지
        if (statusStr === '진행') return '진행';
        if (statusStr === '진행중') return '진행중';
        
        // 다른 진행 관련 상태들을 정규화
        if (statusStr === '공사중' || statusStr === '시공중' || statusStr === 'ongoing') {
          return '진행중';
        }
        if (statusStr === 'active') {
          return '진행';
        }
        
        // 예정 관련 상태들
        if (statusStr === '예정' || statusStr === 'scheduled') {
          return '예정';
        }
        
        // 그 외는 원본 그대로 반환
        return statusStr;
      };

      // 팀별 현장 데이터 정리
      const teamSiteData = teams.map(team => {
        // 해당 팀이 담당하는 현장들 찾기 (진행중/예정만 포함)
        const teamSites = sites.filter(site => {
          const siteTeamName = (site.team || '').replace(/팀$/, '');
          const teamNameWithoutTeam = team.teamName.replace(/팀$/, '');
          const isTeamMatch = siteTeamName === teamNameWithoutTeam || site.manager === team.managerName;
          
          // 진행중/예정 상태만 필터링
          const isOngoing = site.status === '진행중' || 
                           site.status === '진행' || 
                           site.status === '공사중' ||
                           site.status === '시공중' ||
                           site.status === 'active' ||
                           site.status === 'ongoing';
          const isScheduled = site.status === '예정' || site.status === 'scheduled';
          
          return isTeamMatch && (isOngoing || isScheduled);
        });

        // 현장 정보 정리 (상태 표기 정규화)
        const siteDetails = teamSites.map(site => ({
          현장명: site.name || '',
          현장상태: normalizeStatus(site.status),
          계약금액: site.contractAmount ? formatNumber(site.contractAmount, true) : '',
          시작일: site.startDate || '',
          완료예정일: site.endDate || '',
          주소: site.address || '',
          소장: site.manager || '',
          연락처: site.phone || ''
        }));

        return {
          팀명: team.teamName || '',
          소장: team.managerName || '',
          인원수: team.memberCount ? team.memberCount + '명' : '',
          연락처: team.phone || '',
          이메일: team.email || '',
          팀상태: getStatusText(team.status) || '',
          담당현장수: teamSites.length + '개',
          타업체현장: team.otherCompanySites || '',
          자기현장: team.ownSites || '',
          기타사항: team.notes || '',
          현장상세정보: siteDetails
        };
      });

      // ExcelJS 워크북 생성
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('시공팀현장관리');

      // 컬럼 설정
      worksheet.columns = [
        { header: '팀명', key: '팀명', width: 12 },
        { header: '소장', key: '소장', width: 10 },
        { header: '인원수', key: '인원수', width: 8 },
        { header: '팀연락처', key: '팀연락처', width: 15 },
        { header: '이메일', key: '이메일', width: 20 },
        { header: '팀상태', key: '팀상태', width: 8 },
        { header: '담당현장수', key: '담당현장수', width: 10 },
        { header: '기타사항', key: '기타사항', width: 20 },
        { header: '현장명', key: '현장명', width: 25 },
        { header: '현장상태', key: '현장상태', width: 10 },
        { header: '계약금액', key: '계약금액', width: 15 },
        { header: '시작일', key: '시작일', width: 12 },
        { header: '완료예정일', key: '완료예정일', width: 12 },
        { header: '주소', key: '주소', width: 30 },
        { header: '현장소장', key: '현장소장', width: 10 },
        { header: '현장연락처', key: '현장연락처', width: 15 }
      ];

      // 헤더 행 스타일 적용
      const headerRow = worksheet.getRow(1);
      headerRow.height = 25;
      headerRow.font = { name: '맑은 고딕', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4CAF50' }
      };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
      
      // 헤더 셀에 테두리 적용
      worksheet.columns.forEach((column, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF2E7D32' } },
          bottom: { style: 'thin', color: { argb: 'FF2E7D32' } },
          left: { style: 'thin', color: { argb: 'FF2E7D32' } },
          right: { style: 'thin', color: { argb: 'FF2E7D32' } }
        };
      });
      
      // 데이터 행 추가
      let currentRow = 2;
      teamSiteData.forEach(team => {
        team.현장상세정보.forEach((site, index) => {
          // 각 팀의 첫 번째 행에만 팀 정보 표시, 나머지는 빈칸
          const isFirstRow = index === 0;
          
          const row = worksheet.addRow({
            '팀명': isFirstRow ? team.팀명 : '',
            '소장': isFirstRow ? team.소장 : '',
            '인원수': isFirstRow ? team.인원수 : '',
            '팀연락처': isFirstRow ? team.연락처 : '',
            '이메일': isFirstRow ? team.이메일 : '',
            '팀상태': isFirstRow ? team.팀상태 : '',
            '담당현장수': isFirstRow ? team.담당현장수 : '',
            '기타사항': isFirstRow ? team.기타사항 : '',
            '현장명': site.현장명,
            '현장상태': site.현장상태,
            '계약금액': site.계약금액,
            '시작일': site.시작일,
            '완료예정일': site.완료예정일,
            '주소': site.주소,
            '현장소장': site.소장,
            '현장연락처': site.연락처
          });
          
          // 행 높이 설정
          row.height = 20;
          
          // 모든 셀에 스타일 적용
          row.eachCell((cell, colNumber) => {
            cell.font = { name: '맑은 고딕', size: 11 };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
              bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
              left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
              right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
            };
            cell.alignment = { horizontal: 'left', vertical: 'center' };
          });
          
          currentRow++;
        });
      });

      // 파일명 생성 (현재 날짜 포함)
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const fileName = `시공팀현장관리_${dateStr}.xlsx`;

      // 엑셀 파일 다운로드
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);

      setSnackbar({
        open: true,
        message: '시공팀 현장 데이터가 엑셀로 다운로드되었습니다.',
        severity: 'success'
      });

      console.log('✅ 엑셀 다운로드 완료:', fileName);

    } catch (error) {
      console.error('엑셀 다운로드 오류:', error);
      setSnackbar({
        open: true,
        message: '엑셀 다운로드 중 오류가 발생했습니다.',
        severity: 'error'
      });
    }
  };

  const handleDelete = async (teamId) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'constructionTeams', teamId));
        setSnackbar({
          open: true,
          message: '삭제되었습니다.',
          severity: 'success'
        });
        loadTeams();
      } catch (error) {
        console.error('삭제 오류:', error);
        setSnackbar({
          open: true,
          message: '삭제 중 오류가 발생했습니다.',
          severity: 'error'
        });
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return '활성';
      case 'inactive': return '비활성';
      case 'pending': return '대기';
      default: return '알 수 없음';
    }
  };

  const getCurrentSitesCount = (team) => {
    return team.currentSites ? team.currentSites.length : 0;
  };

  // 드래그 앤 드롭 핸들러
  const handleDragStart = (e, team) => {
    setDraggedTeam(team);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetTeam) => {
    e.preventDefault();
    if (!draggedTeam || draggedTeam.id === targetTeam.id) {
      setDraggedTeam(null);
      return;
    }

    try {
      // 팀 순서 변경
      const draggedIndex = teams.findIndex(team => team.id === draggedTeam.id);
      const targetIndex = teams.findIndex(team => team.id === targetTeam.id);
      
      const newTeams = [...teams];
      const [draggedItem] = newTeams.splice(draggedIndex, 1);
      newTeams.splice(targetIndex, 0, draggedItem);

      // 순서 필드 추가하여 업데이트
      const updatePromises = newTeams.map((team, index) => {
        // order 필드가 변경된 경우에만 업데이트
        if (team.order !== index) {
          return updateDoc(doc(db, 'constructionTeams', team.id), {
            order: index,
            updatedAt: serverTimestamp()
          });
        }
        return Promise.resolve(); // 변경사항이 없으면 Promise.resolve() 반환
      });

      await Promise.all(updatePromises);
      
      // 로컬 상태도 순서 정보와 함께 업데이트
      const updatedTeams = newTeams.map((team, index) => ({
        ...team,
        order: index
      }));
      
      setTeams(updatedTeams);
      setSnackbar({
        open: true,
        message: '팀 순서가 변경되었습니다.',
        severity: 'success'
      });
    } catch (error) {
      console.error('순서 변경 오류:', error);
      setSnackbar({
        open: true,
        message: '순서 변경 중 오류가 발생했습니다.',
        severity: 'error'
      });
    }
    
    setDraggedTeam(null);
  };

  // 현장 추가 다이얼로그 열기
  const handleOpenSiteDialog = (team, type) => {
    setSelectedTeamForSite(team);
    setSiteType(type);
    setOpenSiteDialog(true);
    
    console.log('현장 선택 다이얼로그 열림:', {
      team: team.teamName,
      type: type,
      currentSites: team.currentSites,
      scheduledSites: team.scheduledSites
    });
  };

  // 현장 추가 다이얼로그 닫기
  const handleCloseSiteDialog = () => {
    setOpenSiteDialog(false);
    setSelectedTeamForSite(null);
    setSiteType('진행중');
    setSiteSearchTerm('');
  };

  // 현장 추가 처리
  const handleAddSite = async (selectedSite) => {
    if (!selectedTeamForSite || !selectedSite) return;

    try {
      // 시공팀의 현장 목록에 현장 추가 (중복 방지)
      if (siteType === '진행중') {
        const currentSites = selectedTeamForSite.currentSites || [];
        // 중복 체크
        if (!currentSites.includes(selectedSite.name)) {
          const updatedCurrentSites = [...currentSites, selectedSite.name];
          
          await updateDoc(doc(db, 'constructionTeams', selectedTeamForSite.id), {
            currentSites: updatedCurrentSites,
            updatedAt: serverTimestamp()
          });
        }
      } else if (siteType === '예정') {
        const scheduledSites = selectedTeamForSite.scheduledSites || [];
        // 중복 체크
        if (!scheduledSites.includes(selectedSite.name)) {
          const updatedScheduledSites = [...scheduledSites, selectedSite.name];
          
          await updateDoc(doc(db, 'constructionTeams', selectedTeamForSite.id), {
            scheduledSites: updatedScheduledSites,
            updatedAt: serverTimestamp()
          });
        }
      }

      // 현장 데이터의 비고칸에도 시공팀 정보 추가
      const currentNotes = selectedSite.notes || '';
      const teamInfo = `[시공팀: ${selectedTeamForSite.teamName}]`;
      
      // 이미 해당 시공팀 정보가 있는지 확인
      if (!currentNotes.includes(teamInfo)) {
        const updatedNotes = currentNotes ? `${currentNotes}\n${teamInfo}` : teamInfo;
        
        await updateDoc(doc(db, 'sites', selectedSite.id), {
          notes: updatedNotes,
          updatedAt: serverTimestamp()
        });
        
        console.log('현장 비고 업데이트:', {
          siteName: selectedSite.name,
          teamName: selectedTeamForSite.teamName,
          originalNotes: currentNotes,
          updatedNotes: updatedNotes
        });
      }

      // 중복 체크 결과에 따른 메시지
      const isDuplicate = (siteType === '진행중' && (selectedTeamForSite.currentSites || []).includes(selectedSite.name)) ||
                         (siteType === '예정' && (selectedTeamForSite.scheduledSites || []).includes(selectedSite.name));
      
      setSnackbar({
        open: true,
        message: isDuplicate ? 
          `${selectedSite.name}은(는) 이미 ${selectedTeamForSite.teamName}에 있습니다.` :
          `${selectedSite.name}이(가) ${selectedTeamForSite.teamName}에 추가되었습니다.`,
        severity: isDuplicate ? 'warning' : 'success'
      });

      handleCloseSiteDialog();
      loadTeams();
      loadSites();
    } catch (error) {
      console.error('현장 추가 오류:', error);
      setSnackbar({
        open: true,
        message: '현장 추가 중 오류가 발생했습니다.',
        severity: 'error'
      });
    }
  };

  // 직접 추가한 현장 삭제
  const handleRemoveSite = async (team, siteName, siteType) => {
    if (!window.confirm(`${siteName}을(를) ${team.teamName}에서 제거하시겠습니까?`)) {
      return;
    }

    try {
      if (siteType === '진행중') {
        const updatedCurrentSites = (team.currentSites || []).filter(name => name !== siteName);
        await updateDoc(doc(db, 'constructionTeams', team.id), {
          currentSites: updatedCurrentSites,
          updatedAt: serverTimestamp()
        });
      } else if (siteType === '예정') {
        const updatedScheduledSites = (team.scheduledSites || []).filter(name => name !== siteName);
        await updateDoc(doc(db, 'constructionTeams', team.id), {
          scheduledSites: updatedScheduledSites,
          updatedAt: serverTimestamp()
        });
      }

      setSnackbar({
        open: true,
        message: `${siteName}이(가) ${team.teamName}에서 제거되었습니다.`,
        severity: 'success'
      });

      loadTeams();
    } catch (error) {
      console.error('현장 제거 오류:', error);
      setSnackbar({
        open: true,
        message: '현장 제거 중 오류가 발생했습니다.',
        severity: 'error'
      });
    }
  };

  return (
    <Box sx={{ 
      height: '100vh',
      bgcolor: 'background.default',
      position: 'relative',
      pt: isMobile ? 5.5 : 5.5,
      overflow: 'hidden'
    }}>
      {/* 모바일 사이드바 */}
      <MobileSidebar />
      
      {/* 메인 콘텐츠 */}
      <Container 
        maxWidth={false} 
        sx={{ 
          pt: isMobile ? 2 : 3,
          pb: 3,
          px: isMobile ? 1 : 3,
          ml: isMobile ? 0 : 'auto',
          mr: isMobile ? 0 : 'auto',
          maxWidth: isMobile ? '100%' : 'none'
        }}
      >
        <Box sx={{ 
          p: isMobile ? 2 : 3, 
          pb: isMobile ? 4 : 6,
          bgcolor: '#0f1419', 
          height: 'calc(100vh - 120px)',
          color: '#fff',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          touchAction: 'pan-y',
          borderRadius: 2,
          boxShadow: 3,
          // 스크롤바 숨기기
          '&::-webkit-scrollbar': {
            display: 'none'
          },
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}>
      {/* 헤더 */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h4" sx={{ 
            fontWeight: 'bold', 
            color: '#f59e42',
            mb: 1
          }}>
            시공팀 관리 <span style={{ fontSize: '0.7em', color: '#10b981' }}>(실시간 반영)</span>
          </Typography>
          <Typography variant="body1" sx={{ color: '#bbb' }}>
            시공팀 정보와 현장 배정을 관리하세요
          </Typography>
        </Box>
        <Button
          variant="outlined"
          onClick={() => navigate('/team-settlement')}
          sx={{
            color: '#fff',
            borderColor: '#4caf50',
            px: 3,
            py: 1.5,
            fontSize: '1.2rem',
            fontWeight: 'bold',
            borderRadius: 2,
            '&:hover': {
              backgroundColor: 'rgba(76, 175, 80, 0.1)',
              borderColor: '#4caf50'
            },
            transition: 'all 0.3s ease'
          }}
        >
          월별 시공팀 정산
        </Button>
      </Box>

      {/* 통계 카드 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ bgcolor: '#1a1d21', border: '1px solid #333' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <EngineeringIcon sx={{ color: '#f59e42', mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" sx={{ color: '#fff', fontWeight: 'bold' }}>
                    {teams.length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#bbb' }}>
                    총 시공팀
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ bgcolor: '#1a1d21', border: '1px solid #333' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PersonIcon sx={{ color: '#3b82f6', mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" sx={{ color: '#fff', fontWeight: 'bold' }}>
                    {teams.reduce((sum, team) => sum + (Number(team.memberCount) || 0), 0)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#bbb' }}>
                    총 인원수
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ bgcolor: '#1a1d21', border: '1px solid #333' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <WorkIcon sx={{ color: '#10b981', mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" sx={{ color: '#fff', fontWeight: 'bold' }}>
                    {sites.filter(site => {
                      // 진행중 상태 판별 (더 포괄적으로)
                      const isOngoing = site.status === '진행중' || 
                                       site.status === '진행' || 
                                       site.status === '공사중' ||
                                       site.status === '시공중' ||
                                       site.status === 'active' ||
                                       site.status === 'ongoing' ||
                                       (site.status && !['완료', '종료', '완료됨', '종료됨', 'completed', 'finished', '예정', 'scheduled'].includes(site.status));
                      
                      // 공사기간 체크 (착공일이 속한 달까지는 표시)
                      const today = new Date();
                      const startDate = parseDate(site.startDate || site.startedAt || site.start || site.start_date);
                      const endDate = parseDate(site.endDate || site.completedAt || site.end || site.end_date);
                      
                      // 착공일이 속한 달 계산
                      const startMonth = startDate ? new Date(startDate.getFullYear(), startDate.getMonth(), 1) : null;
                      const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                      
                      // 착공일이 속한 달이 현재 달과 같거나 미래이면 표시
                      const isWithinStartMonth = !startMonth || startMonth <= currentMonth;
                      
                      // 완료일이 지났더라도 착공일이 속한 달이 현재 달과 같거나 미래이면 표시
                      const isWithinPeriod = !endDate || endDate >= today || isWithinStartMonth;
                      
                      return isOngoing && isWithinPeriod;
                    }).length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#bbb' }}>
                    진행 현장
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ bgcolor: '#1a1d21', border: '1px solid #333' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUpIcon sx={{ color: '#f59e42', mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" sx={{ color: '#fff', fontWeight: 'bold' }}>
                    {teams.filter(team => team.status === 'active').length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#bbb' }}>
                    활성 팀
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 시공팀 목록 헤더 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ color: '#f59e42' }}>
          시공팀 목록 ({teams.length}개)
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<CloudDownloadIcon />}
            onClick={handleExcelDownload}
            sx={{ 
              borderColor: '#10b981', 
              color: '#10b981',
              '&:hover': { 
                borderColor: '#059669',
                bgcolor: 'rgba(16, 185, 129, 0.1)'
              }
            }}
          >
            엑셀 다운로드
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ bgcolor: '#f59e42', '&:hover': { bgcolor: '#d97706' } }}
          >
            시공팀 추가
          </Button>
        </Box>
      </Box>

      {/* 시공팀 카드 목록 */}
      <Grid container spacing={3} sx={{
        pb: 4, // 하단 여백 추가
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
        touchAction: 'pan-y', // 세로 스크롤만 허용
        // 스크롤바 숨기기
        '&::-webkit-scrollbar': {
          display: 'none'
        },
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}>
        {teams.map((team) => (
          <Grid item xs={12} md={6} key={team.id}>
            <Card 
              draggable
              onDragStart={(e) => handleDragStart(e, team)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, team)}
              sx={{ 
                bgcolor: '#1a1d21', 
                border: '1px solid #333',
                cursor: 'move',
                '&:hover': { borderColor: '#f59e42' },
                '&:active': { 
                  transform: 'scale(0.98)',
                  transition: 'transform 0.1s ease-in-out'
                }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ color: '#fff', mb: 1 }}>
                      {team.teamName}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <PersonIcon sx={{ color: '#3b82f6', mr: 1, fontSize: 16 }} />
                      <Typography variant="body2" sx={{ color: '#bbb' }}>
                        소장: {team.managerName}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <GroupIcon sx={{ color: '#10b981', mr: 1, fontSize: 16 }} />
                      <Typography variant="body2" sx={{ color: '#bbb' }}>
                        인원: {team.memberCount}명
                      </Typography>
                    </Box>
                  </Box>
                  <Box>
                    <Chip 
                      label={getStatusText(team.status)} 
                      color={getStatusColor(team.status)}
                      size="small"
                      sx={{ mb: 1 }}
                    />
                    <Box>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(team)}
                        sx={{ color: '#3b82f6' }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(team.id)}
                        sx={{ color: '#ef4444' }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </Box>

                <Divider sx={{ my: 2, bgcolor: '#333' }} />


                {/* 진행 현장 */}
                <Box sx={{ mb: 2 }}>
                  {/* 진행중인 현장 */}
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" sx={{ color: '#43e97b', fontWeight: 'bold' }}>
                        진행 현장 ({(() => {
                          // 현장관리에서 연결된 현장들
                          const linkedSites = sites.filter(site => {
                            const siteTeamName = (site.team || '').replace(/팀$/, '');
                            const teamNameWithoutTeam = team.teamName.replace(/팀$/, '');
                            
                            // 진행중 상태 판별 (더 포괄적으로)
                            const isOngoing = site.status === '진행중' || 
                                             site.status === '진행' || 
                                             site.status === '공사중' ||
                                             site.status === '시공중' ||
                                             site.status === 'active' ||
                                             site.status === 'ongoing' ||
                                             (site.status && !['완료', '종료', '완료됨', '종료됨', 'completed', 'finished', '예정', 'scheduled'].includes(site.status));
                            
                            // 공사기간 체크 (착공일이 속한 달까지는 표시)
                            const today = new Date();
                            const startDate = parseDate(site.startDate || site.startedAt || site.start || site.start_date);
                            const endDate = parseDate(site.endDate || site.completedAt || site.end || site.end_date);
                            
                            // 착공일이 속한 달 계산
                            const startMonth = startDate ? new Date(startDate.getFullYear(), startDate.getMonth(), 1) : null;
                            const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                            
                            // 착공일이 속한 달이 현재 달과 같거나 미래이면 표시
                            const isWithinStartMonth = !startMonth || startMonth <= currentMonth;
                            
                            // 완료일이 지났더라도 착공일이 속한 달이 현재 달과 같거나 미래이면 표시
                            const isWithinPeriod = !endDate || endDate >= today || isWithinStartMonth;
                            
                            const isMatched = isOngoing && isWithinPeriod && 
                              (siteTeamName === teamNameWithoutTeam || site.manager === team.managerName);
                            
                            // 디버깅 로그
                            if (team.teamName === '오태훈팀') {
                              console.log('오태훈팀 현장 매칭 확인:', {
                                siteName: site.name,
                                siteStatus: site.status,
                                siteTeam: site.team,
                                siteTeamName,
                                teamNameWithoutTeam,
                                siteManager: site.manager,
                                teamManager: team.managerName,
                                isOngoing,
                                startDate: startDate,
                                endDate: endDate,
                                startMonth: startMonth,
                                currentMonth: currentMonth,
                                isWithinStartMonth,
                                isWithinPeriod,
                                isMatched
                              });
                            }
                            
                            return isMatched;
                          });
                          
                          // 직접 추가한 현장들
                          const directSites = team.currentSites || [];
                          
                          // 중복 제거하여 총 개수 계산
                          const allSiteNames = new Set([
                            ...linkedSites.map(site => site.name),
                            ...directSites
                          ]);
                          
                          console.log('오태훈팀 진행현장 계산:', {
                            linkedSites: linkedSites.map(s => s.name),
                            directSites,
                            allSiteNames: Array.from(allSiteNames),
                            totalCount: allSiteNames.size
                          });
                          
                          return allSiteNames.size;
                        })()}개)
                      </Typography>
                      <Tooltip title="진행 현장 추가">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenSiteDialog(team, '진행중')}
                          sx={{ 
                            color: '#43e97b',
                            '&:hover': { bgcolor: 'rgba(67, 233, 123, 0.1)' }
                          }}
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    {(() => {
                      // 현장관리에서 연결된 현장들
                      const linkedSites = sites.filter(site => {
                        const siteTeamName = (site.team || '').replace(/팀$/, '');
                        const teamNameWithoutTeam = team.teamName.replace(/팀$/, '');
                        
                        // 진행중 상태 판별 (더 포괄적으로)
                        const isOngoing = site.status === '진행중' || 
                                         site.status === '진행' || 
                                         site.status === '공사중' ||
                                         site.status === '시공중' ||
                                         site.status === 'active' ||
                                         site.status === 'ongoing' ||
                                         (site.status && !['완료', '종료', '완료됨', '종료됨', 'completed', 'finished', '예정', 'scheduled'].includes(site.status));
                        
                        // 공사기간 체크 (착공일이 속한 달까지는 표시)
                        const today = new Date();
                        const startDate = parseDate(site.startDate || site.startedAt || site.start || site.start_date);
                        const endDate = parseDate(site.endDate || site.completedAt || site.end || site.end_date);
                        
                        // 착공일이 속한 달 계산
                        const startMonth = startDate ? new Date(startDate.getFullYear(), startDate.getMonth(), 1) : null;
                        const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                        
                        // 착공일이 속한 달이 현재 달과 같거나 미래이면 표시
                        const isWithinStartMonth = !startMonth || startMonth <= currentMonth;
                        
                        // 완료일이 지났더라도 착공일이 속한 달이 현재 달과 같거나 미래이면 표시
                        const isWithinPeriod = !endDate || endDate >= today || isWithinStartMonth;
                        
                        return isOngoing && isWithinPeriod && 
                          (siteTeamName === teamNameWithoutTeam || site.manager === team.managerName);
                      });
                      
                      // 직접 추가한 현장들
                      const directSites = team.currentSites || [];
                      
                      return linkedSites.length > 0 || directSites.length > 0;
                    })() ? (
                      <List sx={{ 
                        p: 0,
                        '& .MuiListItem-root': {
                          py: 0.5,
                          px: 1,
                          borderRadius: 1,
                          '&:hover': {
                            bgcolor: '#374151'
                          }
                        }
                      }}>
                        {(() => {
                          // 현장관리에서 연결된 현장들
                          const linkedSites = sites.filter(site => {
                            const siteTeamName = (site.team || '').replace(/팀$/, '');
                            const teamNameWithoutTeam = team.teamName.replace(/팀$/, '');
                            
                            // 진행중 상태 판별 (더 포괄적으로)
                            const isOngoing = site.status === '진행중' || 
                                             site.status === '진행' || 
                                             site.status === '공사중' ||
                                             site.status === '시공중' ||
                                             site.status === 'active' ||
                                             site.status === 'ongoing' ||
                                             (site.status && !['완료', '종료', '완료됨', '종료됨', 'completed', 'finished', '예정', 'scheduled'].includes(site.status));
                            
                            // 공사기간 체크 (착공일이 속한 달까지는 표시)
                            const today = new Date();
                            const startDate = parseDate(site.startDate || site.startedAt || site.start || site.start_date);
                            const endDate = parseDate(site.endDate || site.completedAt || site.end || site.end_date);
                            
                            // 착공일이 속한 달 계산
                            const startMonth = startDate ? new Date(startDate.getFullYear(), startDate.getMonth(), 1) : null;
                            const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                            
                            // 착공일이 속한 달이 현재 달과 같거나 미래이면 표시
                            const isWithinStartMonth = !startMonth || startMonth <= currentMonth;
                            
                            // 완료일이 지났더라도 착공일이 속한 달이 현재 달과 같거나 미래이면 표시
                            const isWithinPeriod = !endDate || endDate >= today || isWithinStartMonth;
                            
                            return isOngoing && isWithinPeriod && 
                              (siteTeamName === teamNameWithoutTeam || site.manager === team.managerName);
                          });
                          
                          // 직접 추가한 현장들
                          const directSites = team.currentSites || [];
                          
                          return [
                            // 기존 연동 현장들
                            ...linkedSites.map(site => (
                              <Tooltip key={site.id} title="더블클릭하여 현장관리 페이지로 이동" placement="top">
                                <ListItem 
                                  disableGutters
                                  sx={{ 
                                    cursor: 'pointer',
                                    '&:hover': {
                                      bgcolor: '#374151'
                                    }
                                  }}
                                  onDoubleClick={() => {
                                    navigate('/sites', { 
                                      state: { 
                                        selectedSiteId: site.id,
                                        selectedSiteName: site.name
                                      }
                                    });
                                  }}
                                >
                                  <Typography sx={{ 
                                    color: '#fff',
                                    fontSize: '0.875rem'
                                  }}>
                                    {site.name}
                                  </Typography>
                                </ListItem>
                              </Tooltip>
                            )),
                            // 직접 추가한 현장들 (현장관리에서 연결되지 않은 현장만)
                            ...directSites.filter(siteName => {
                              // 현장관리에서 이미 연결된 현장은 제외
                              const site = sites.find(s => s.name === siteName);
                              const isLinkedByTeam = site?.team === team.teamName || site?.team === team.teamName.replace(/팀$/, '');
                              const isLinkedByManager = site?.manager === team.managerName;
                              
                              // 디버깅: 현장 배정 방식 확인
                              if (siteName.includes('중리') || siteName.includes('경로당')) {
                                console.log('현장 배정 디버그:', {
                                  siteName: siteName,
                                  teamName: team.teamName,
                                  siteTeam: site?.team,
                                  siteManager: site?.manager,
                                  isDirectlyAdded: directSites.includes(siteName),
                                  isLinkedByTeam: isLinkedByTeam,
                                  isLinkedByManager: isLinkedByManager,
                                  shouldShowDeleteButton: !isLinkedByTeam && !isLinkedByManager
                                });
                              }
                              
                              return !isLinkedByTeam && !isLinkedByManager;
                            }).map((siteName, index) => {
                              const site = sites.find(s => s.name === siteName);
                              return (
                                <Tooltip key={`direct-${index}`} title="더블클릭하여 현장관리 페이지로 이동" placement="top">
                                  <ListItem 
                                    disableGutters
                                    sx={{ 
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      '&:hover': {
                                        bgcolor: '#374151'
                                      }
                                    }}
                                    onDoubleClick={() => {
                                      if (site) {
                                        navigate('/sites', { 
                                          state: { 
                                            selectedSiteId: site.id,
                                            selectedSiteName: site.name
                                          }
                                        });
                                      }
                                    }}
                                  >
                                    <Typography sx={{ 
                                      color: '#fff',
                                      fontSize: '0.875rem',
                                      flex: 1
                                    }}>
                                      {siteName}
                                    </Typography>
                                    <IconButton
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveSite(team, siteName, '진행중');
                                      }}
                                      sx={{ 
                                        color: '#ef4444',
                                        ml: 1,
                                        '&:hover': { 
                                          bgcolor: 'rgba(239, 68, 68, 0.1)' 
                                        }
                                      }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </ListItem>
                                </Tooltip>
                              );
                            })
                          ];
                        })()}
                      </List>
                    ) : (
                      <Typography variant="body2" sx={{ color: '#666', fontStyle: 'italic' }}>
                        진행 현장 없음
                      </Typography>
                    )}
                  </Box>

                  {/* 예정 현장 */}
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" sx={{ color: '#f59e42', fontWeight: 'bold' }}>
                        예정 현장 ({(() => {
                          // 현장관리에서 연결된 현장들
                          const linkedSites = sites.filter(site => {
                            const siteTeamName = (site.team || '').replace(/팀$/, '');
                            const teamNameWithoutTeam = team.teamName.replace(/팀$/, '');
                            return site.status === '예정' && 
                              (siteTeamName === teamNameWithoutTeam || site.manager === team.managerName);
                          });
                          
                          // 직접 추가한 현장들
                          const directSites = team.scheduledSites || [];
                          
                          // 중복 제거하여 총 개수 계산
                          const allSiteNames = new Set([
                            ...linkedSites.map(site => site.name),
                            ...directSites
                          ]);
                          
                          return allSiteNames.size;
                        })()}개)
                      </Typography>
                      <Tooltip title="예정 현장 추가">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenSiteDialog(team, '예정')}
                          sx={{ 
                            color: '#f59e42',
                            '&:hover': { bgcolor: 'rgba(245, 158, 66, 0.1)' }
                          }}
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    {(() => {
                      // 현장관리에서 연결된 현장들
                      const linkedSites = sites.filter(site => {
                        const siteTeamName = (site.team || '').replace(/팀$/, '');
                        const teamNameWithoutTeam = team.teamName.replace(/팀$/, '');
                        return site.status === '예정' && 
                          (siteTeamName === teamNameWithoutTeam || site.manager === team.managerName);
                      });
                      
                      // 직접 추가한 현장들
                      const directSites = team.scheduledSites || [];
                      
                      return linkedSites.length > 0 || directSites.length > 0;
                    })() ? (
                      <List sx={{ 
                        p: 0,
                        '& .MuiListItem-root': {
                          py: 0.5,
                          px: 1,
                          borderRadius: 1,
                          '&:hover': {
                            bgcolor: '#374151'
                          }
                        }
                      }}>
                        {(() => {
                          // 현장관리에서 연결된 현장들
                          const linkedSites = sites.filter(site => {
                            const siteTeamName = (site.team || '').replace(/팀$/, '');
                            const teamNameWithoutTeam = team.teamName.replace(/팀$/, '');
                            return site.status === '예정' && 
                              (siteTeamName === teamNameWithoutTeam || site.manager === team.managerName);
                          });
                          
                          // 직접 추가한 현장들
                          const directSites = team.scheduledSites || [];
                          
                          return [
                            // 기존 연동 현장들
                            ...linkedSites.map(site => (
                              <Tooltip key={site.id} title="더블클릭하여 현장관리 페이지로 이동" placement="top">
                                <ListItem 
                                  disableGutters
                                  sx={{ 
                                    cursor: 'pointer',
                                    '&:hover': {
                                      bgcolor: '#374151'
                                    }
                                  }}
                                  onDoubleClick={() => {
                                    navigate('/sites', { 
                                      state: { 
                                        selectedSiteId: site.id,
                                        selectedSiteName: site.name
                                      }
                                    });
                                  }}
                                >
                                  <Typography sx={{ 
                                    color: '#fff',
                                    fontSize: '0.875rem'
                                  }}>
                                    {site.name}
                                  </Typography>
                                </ListItem>
                              </Tooltip>
                            )),
                            // 직접 추가한 현장들 (현장관리에서 연결되지 않은 현장만)
                            ...directSites.filter(siteName => {
                              // 현장관리에서 이미 연결된 현장은 제외
                              const site = sites.find(s => s.name === siteName);
                              const isLinkedByTeam = site?.team === team.teamName || site?.team === team.teamName.replace(/팀$/, '');
                              const isLinkedByManager = site?.manager === team.managerName;
                              
                              return !isLinkedByTeam && !isLinkedByManager;
                            }).map((siteName, index) => {
                              const site = sites.find(s => s.name === siteName);
                              return (
                                <Tooltip key={`direct-${index}`} title="더블클릭하여 현장관리 페이지로 이동" placement="top">
                                  <ListItem 
                                    disableGutters
                                    sx={{ 
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      '&:hover': {
                                        bgcolor: '#374151'
                                      }
                                    }}
                                    onDoubleClick={() => {
                                      if (site) {
                                        navigate('/sites', { 
                                          state: { 
                                            selectedSiteId: site.id,
                                            selectedSiteName: site.name
                                          }
                                        });
                                      }
                                    }}
                                  >
                                    <Typography sx={{ 
                                      color: '#fff',
                                      fontSize: '0.875rem',
                                      flex: 1
                                    }}>
                                      {siteName}
                                    </Typography>
                                    <IconButton
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveSite(team, siteName, '예정');
                                      }}
                                      sx={{ 
                                        color: '#ef4444',
                                        ml: 1,
                                        '&:hover': { 
                                          bgcolor: 'rgba(239, 68, 68, 0.1)' 
                                        }
                                      }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </ListItem>
                                </Tooltip>
                              );
                            })
                          ];
                        })()}
                      </List>
                    ) : (
                      <Typography variant="body2" sx={{ color: '#666', fontStyle: 'italic' }}>
                        예정 현장 없음
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* 연락처 정보 */}
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    <PhoneIcon sx={{ color: '#3b82f6', mr: 1, fontSize: 14 }} />
                    <Typography variant="body2" sx={{ color: '#bbb' }}>
                      {team.phone || '연락처 없음'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <EmailIcon sx={{ color: '#3b82f6', mr: 1, fontSize: 14 }} />
                    <Typography variant="body2" sx={{ color: '#bbb' }}>
                      {team.email || '이메일 없음'}
                    </Typography>
                  </Box>
                </Box>

                {/* 기타 정보 */}
                {(team.otherCompanySites || team.ownSites || team.notes) && (
                  <Box sx={{ mt: 2 }}>
                    {team.otherCompanySites && (
                      <Typography variant="body2" sx={{ color: '#bbb', mb: 0.5 }}>
                        타업체 현장: {team.otherCompanySites}
                      </Typography>
                    )}
                    {team.ownSites && (
                      <Typography variant="body2" sx={{ color: '#bbb', mb: 0.5 }}>
                        자기 현장: {team.ownSites}
                      </Typography>
                    )}
                    {team.notes && (
                      <Typography variant="body2" sx={{ color: '#bbb', fontStyle: 'italic' }}>
                        기타: {team.notes}
                      </Typography>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 다이얼로그 */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1a1d21', color: '#fff' }}>
          {editingTeam ? '시공팀 수정' : '시공팀 추가'}
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#1a1d21', color: '#fff' }}>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="시공팀명"
                  value={formData.teamName}
                  onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                  sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: '#fff' } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="소장님 이름"
                  value={formData.managerName}
                  onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
                  sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: '#fff' } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="시공팀 인원"
                  type="number"
                  value={formData.memberCount}
                  onChange={(e) => setFormData({ ...formData, memberCount: e.target.value })}
                  sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: '#fff' } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel sx={{ color: '#bbb' }}>상태</InputLabel>
                  <Select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    sx={{ color: '#fff' }}
                  >
                    <MenuItem value="active">활성</MenuItem>
                    <MenuItem value="inactive">비활성</MenuItem>
                    <MenuItem value="pending">대기</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="연락처"
                  value={formData.phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, ''); // 숫자만 허용
                    let formattedValue = value;
                    
                    // 11자리 (000-0000-0000) 또는 10자리 (000-000-0000) 포맷팅
                    if (value.length <= 3) {
                      formattedValue = value;
                    } else if (value.length <= 7) {
                      formattedValue = `${value.slice(0, 3)}-${value.slice(3)}`;
                    } else if (value.length <= 11) {
                      if (value.length <= 10) {
                        // 10자리: 000-000-0000
                        formattedValue = `${value.slice(0, 3)}-${value.slice(3, 6)}-${value.slice(6)}`;
                      } else {
                        // 11자리: 000-0000-0000
                        formattedValue = `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7)}`;
                      }
                    }
                    
                    setFormData({ ...formData, phone: formattedValue });
                  }}
                  placeholder="010-1234-5678 또는 02-123-4567"
                  sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: '#fff' } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="이메일"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: '#fff' } }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel sx={{ color: '#bbb' }}>현재 진행 현장</InputLabel>
                  <Select
                    multiple
                    value={formData.currentSites}
                    onChange={(e) => setFormData({ ...formData, currentSites: e.target.value })}
                    sx={{ color: '#fff' }}
                  >
                    {sites
                      .filter(site => {
                        // 같은 팀에 이미 등록된 현장은 제외 (중복 방지)
                        const isAlreadyAssigned = (formData.currentSites || []).includes(site.name);
                        return !isAlreadyAssigned;
                      })
                      .map((site) => (
                        <MenuItem key={site.id} value={site.name}>
                          {site.name}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="타업체 현장"
                  value={formData.otherCompanySites}
                  onChange={(e) => setFormData({ ...formData, otherCompanySites: e.target.value })}
                  sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: '#fff' } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="자기 현장"
                  value={formData.ownSites}
                  onChange={(e) => setFormData({ ...formData, ownSites: e.target.value })}
                  sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: '#fff' } }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="기타사항"
                  multiline
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: '#fff' } }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#1a1d21' }}>
          <Button onClick={handleCloseDialog} sx={{ color: '#bbb' }}>
            취소
          </Button>
          <Button onClick={handleSave} variant="contained" sx={{ bgcolor: '#f59e42' }}>
            저장
          </Button>
        </DialogActions>
      </Dialog>

      {/* 현장 선택 다이얼로그 */}
      <Dialog open={openSiteDialog} onClose={handleCloseSiteDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1a1d21', color: '#fff' }}>
          {siteType} 현장 추가 - {selectedTeamForSite?.teamName}
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#1a1d21', color: '#fff' }}>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ color: '#bbb', mb: 2 }}>
              {selectedTeamForSite?.teamName}에 추가할 {siteType} 현장을 선택하세요.
            </Typography>
            
            {/* 검색 입력창 */}
            <TextField
              fullWidth
              placeholder="현장명으로 검색..."
              value={siteSearchTerm}
              onChange={(e) => setSiteSearchTerm(e.target.value)}
              sx={{ 
                mb: 2,
                '& .MuiOutlinedInput-root': { 
                  color: '#fff',
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#666' },
                  '&.Mui-focused fieldset': { borderColor: '#f59e42' }
                },
                '& .MuiInputLabel-root': { color: '#bbb' },
                '& .MuiInputBase-input::placeholder': { color: '#666' }
              }}
            />
            
            <List sx={{ 
              maxHeight: 400, 
              overflow: 'auto',
              // 스크롤바 숨기기
              '&::-webkit-scrollbar': {
                display: 'none'
              },
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              '& .MuiListItem-root': {
                border: '1px solid #333',
                borderRadius: 1,
                mb: 1,
                '&:hover': {
                  bgcolor: '#374151'
                }
              }
            }}>
              {(() => {
                const filteredSites = sites.filter(site => {
                  const matchesStatus = site.status === siteType;
                  
                  // 검색어가 없으면 모든 현장 표시, 있으면 검색 조건 확인
                  const searchTerm = siteSearchTerm ? siteSearchTerm.trim().toLowerCase() : '';
                  const siteName = site.name ? site.name.toLowerCase() : '';
                  const siteAddress = site.address ? site.address.toLowerCase() : '';
                  
                  const matchesSearch = !searchTerm || 
                    siteName.includes(searchTerm) ||
                    siteAddress.includes(searchTerm);
                  
                  // 디버깅: 검색 로직 상세 확인
                  if (siteSearchTerm && (site.name.includes('중리동') || site.name.includes('옥송'))) {
                    console.log('검색 로직 디버그:', {
                      originalSiteName: site.name,
                      siteName: siteName,
                      originalSearchTerm: siteSearchTerm,
                      searchTerm: searchTerm,
                      nameMatch: siteName.includes(searchTerm),
                      addressMatch: siteAddress.includes(searchTerm),
                      finalMatch: matchesSearch
                    });
                  }
                  
                  // 같은 팀에 이미 등록된 현장만 제외 (다른 팀끼리는 중복 가능)
                  const isAlreadyAssignedToThisTeam = siteType === '진행중' 
                    ? (selectedTeamForSite?.currentSites || []).includes(site.name)
                    : (selectedTeamForSite?.scheduledSites || []).includes(site.name);
                  
                  // 디버깅: 중복 체크 로직 확인
                  if (siteSearchTerm && (site.name.includes('중리동') || site.name.includes('옥송'))) {
                    console.log('중복 체크 디버그:', {
                      siteName: site.name,
                      teamName: selectedTeamForSite?.teamName,
                      currentSites: selectedTeamForSite?.currentSites,
                      scheduledSites: selectedTeamForSite?.scheduledSites,
                      siteType: siteType,
                      isAlreadyAssignedToThisTeam: isAlreadyAssignedToThisTeam
                    });
                  }
                  
                  const result = matchesStatus && matchesSearch && !isAlreadyAssignedToThisTeam;
                  
                  // 디버깅 로그
                  if (siteSearchTerm && (site.name.includes('중리동') || site.name.includes('옥송'))) {
                    console.log('현장 필터링 최종 디버그:', {
                      siteName: site.name,
                      siteStatus: site.status,
                      siteType: siteType,
                      matchesStatus,
                      matchesSearch,
                      isAlreadyAssignedToThisTeam,
                      result,
                      searchTerm: siteSearchTerm,
                      finalResult: result
                    });
                  }
                  
                  return result;
                });
                
                console.log('필터링된 현장 목록:', {
                  totalSites: sites.length,
                  filteredSites: filteredSites.length,
                  siteType: siteType,
                  searchTerm: siteSearchTerm,
                  filteredSiteNames: filteredSites.map(s => s.name)
                });
                
                return filteredSites;
              })()
                .map((site) => (
                  <ListItem
                    key={site.id}
                    onClick={() => handleAddSite(site)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: siteType === '진행중' ? '#43e97b' : '#f59e42' }}>
                        <LocationIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={site.name}
                      secondary={
                        <Box>
                          <Typography variant="body2" sx={{ color: '#bbb' }}>
                            주소: {site.address || '주소 없음'}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#bbb' }}>
                            계약금액: {site.contractAmount ? formatNumber(site.contractAmount, true) : '미정'}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
            </List>
            {(() => {
              const filteredSites = sites.filter(site => {
                const matchesStatus = site.status === siteType;
                
                // 검색어가 없으면 모든 현장 표시, 있으면 검색 조건 확인
                const searchTerm = siteSearchTerm ? siteSearchTerm.trim().toLowerCase() : '';
                const siteName = site.name ? site.name.toLowerCase() : '';
                const siteAddress = site.address ? site.address.toLowerCase() : '';
                
                const matchesSearch = !searchTerm || 
                  siteName.includes(searchTerm) ||
                  siteAddress.includes(searchTerm);
                
                // 같은 팀에 이미 등록된 현장만 제외 (다른 팀끼리는 중복 가능)
                const isAlreadyAssignedToThisTeam = siteType === '진행중' 
                  ? (selectedTeamForSite?.currentSites || []).includes(site.name)
                  : (selectedTeamForSite?.scheduledSites || []).includes(site.name);
                
                return matchesStatus && matchesSearch && !isAlreadyAssignedToThisTeam;
              });
              
              return filteredSites.length === 0;
            })() && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" sx={{ color: '#666' }}>
                  {siteSearchTerm ? '검색 결과가 없습니다.' : `${siteType} 현장이 없습니다.`}
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#1a1d21' }}>
          <Button onClick={handleCloseSiteDialog} sx={{ color: '#bbb' }}>
            취소
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
      </Container>
    </Box>
  );
};

export default ConstructionTeam; 