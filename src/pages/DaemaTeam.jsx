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
  LinearProgress
} from '@mui/material';
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
  CloudDownload as CloudDownloadIcon
} from '@mui/icons-material';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { formatNumber } from '../utils/formatUtils';
import * as XLSX from 'xlsx';

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

  // 데이터 로드
  useEffect(() => {
    loadTeams();
    loadSites();
  }, []);

  const loadTeams = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'constructionTeams'));
      const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTeams(teamsData);
    } catch (error) {
      console.error('시공팀 데이터 로드 오류:', error);
    }
  };

  const loadSites = async () => {
    try {
      // 진행중 또는 예정인 현장 가져오기
      const q = query(
        collection(db, 'sites'),
        where('status', 'in', ['진행중', '예정'])
      );
      const snapshot = await getDocs(q);
      const sitesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSites(sitesData);
      
      console.log('현장 데이터:', sitesData);
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
        await addDoc(collection(db, 'constructionTeams'), {
          ...formData,
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

  // 엑셀 다운로드 함수
  const handleExcelDownload = () => {
    try {
      // 팀별 현장 데이터 정리
      const teamSiteData = teams.map(team => {
        // 해당 팀이 담당하는 현장들 찾기
        const teamSites = sites.filter(site => {
          const siteTeamName = (site.team || '').replace(/팀$/, '');
          const teamNameWithoutTeam = team.teamName.replace(/팀$/, '');
          return siteTeamName === teamNameWithoutTeam || site.manager === team.managerName;
        });

        // 현장 정보 정리
        const siteDetails = teamSites.map(site => ({
          현장명: site.name || '',
          현장상태: site.status || '',
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

      // 모든 데이터를 하나의 시트에 통합 (이미지 레이아웃에 맞춤)
      const allData = [];
      
      // 날짜 정보 (1행)
      const currentDate = new Date().toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      });
      allData.push({ '작성일': currentDate });
      
      // 통계 데이터를 상단에 배치 (2-7행)
      const totalTeams = teams.length;
      const activeTeams = teams.filter(team => team.status === 'active').length;
      const totalSites = sites.filter(site => site.status === '진행중').length;
      const totalMembers = teams.reduce((sum, team) => sum + (Number(team.memberCount) || 0), 0);
      const avgSitesPerTeam = totalSites > 0 ? (totalSites / totalTeams).toFixed(1) : '0';
      const avgMembersPerTeam = totalTeams > 0 ? (totalMembers / totalTeams).toFixed(1) : '0';

      // 통계 정보를 한 행에 배치
      allData.push({
        '총 시공팀': totalTeams + '개',
        '활성 팀 수': activeTeams + '개', 
        '총 진행 현': totalSites + '개',
        '총 인원 수': totalMembers + '명',
        '팀당 현장 평균': avgSitesPerTeam + '개',
        '팀당 인원 평균': avgMembersPerTeam + '명'
      });
      
      // 빈 행 추가
      allData.push({});
      
      // 현장별 통합 데이터 (팀 정보 + 현장 정보를 한 행에, G-P 중복 제거)
      teamSiteData.forEach(team => {
        let previousValues = {}; // 이전 행의 G-P 값들을 저장
        
        team.현장상세정보.forEach((site, index) => {
          // G-P 컬럼 값들 (기타사항부터 연락처까지)
          const currentValues = {
            기타사항: team.기타사항,
            현장명: site.현장명,
            현장상태: site.현장상태,
            계약금액: site.계약금액,
            시작일: site.시작일,
            완료예정일: site.완료예정일,
            주소: site.주소,
            현장소장: site.소장,
            연락처: site.연락처
          };
          
          // 중복 체크 및 처리
          const processedValues = {};
          Object.keys(currentValues).forEach(key => {
            if (index === 0) {
              // 첫 번째 행은 항상 표시
              processedValues[key] = currentValues[key];
            } else {
              // 이전 행과 같은 값이면 빈 값으로 처리
              processedValues[key] = (currentValues[key] === previousValues[key]) ? '' : currentValues[key];
            }
          });
          
          // 처리된 값을 이전 값으로 저장 (원본 값이 아닌)
          previousValues = { ...processedValues };
          
          allData.push({
            '팀명': team.팀명,
            '소장': team.소장,
            '인원수': team.인원수,
            '팀연락처': team.연락처,
            '이메일': team.이메일,
            '팀상태': team.팀상태,
            '담당현장수': team.담당현장수,
            '타업체현장': team.타업체현장,
            '자기현장': team.자기현장,
            '기타사항': processedValues.기타사항,
            '현장명': processedValues.현장명,
            '현장상태': processedValues.현장상태,
            '계약금액': processedValues.계약금액,
            '시작일': processedValues.시작일,
            '완료예정일': processedValues.완료예정일,
            '주소': processedValues.주소,
            '현장소장': processedValues.현장소장,
            '현장연락처': processedValues.연락처
          });
        });
      });

      // 하나의 워크시트 생성
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(allData);
      
      // 제목 셀들에 스타일 적용 (굵게, 큰 글씨)
      const titleCells = [
        'A1' // 작성일
      ];
      
      // 워크시트에 스타일 적용
      if (!ws['!rows']) ws['!rows'] = [];
      if (!ws['!cols']) ws['!cols'] = [];
      
      // 제목 행들의 높이와 스타일 설정
      titleCells.forEach(cellRef => {
        if (ws[cellRef]) {
          ws[cellRef].s = {
            font: { bold: true, sz: 14 },
            alignment: { horizontal: 'left', vertical: 'center' }
          };
        }
      });
      
      // 일반 데이터 행들의 스타일 설정
      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
          if (ws[cellRef] && !titleCells.includes(cellRef)) {
            ws[cellRef].s = {
              font: { sz: 11 },
              alignment: { horizontal: 'left', vertical: 'center' }
            };
          }
        }
      }
      
      XLSX.utils.book_append_sheet(wb, ws, '시공팀현장관리');

      // 파일명 생성 (현재 날짜 포함)
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const fileName = `시공팀현장관리_${dateStr}.xlsx`;

      // 엑셀 파일 다운로드
      XLSX.writeFile(wb, fileName);

      setSnackbar({
        open: true,
        message: '시공팀 현장 데이터가 엑셀로 다운로드되었습니다.',
        severity: 'success'
      });

      console.log('✅ 엑셀 다운로드 완료:', fileName);
      console.log('📊 다운로드된 데이터:', {
        팀수: totalTeams,
        현장수: totalSites,
        인원수: totalMembers
      });

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

  return (
    <Box sx={{ 
      p: isMobile ? 2 : 3, 
      pt: isMobile ? 10 : 11,
      pb: isMobile ? 4 : 6, // 하단 여백 추가
      bgcolor: '#0f1419', 
      minHeight: '100vh',
      color: '#fff',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
      overscrollBehavior: 'contain',
      height: '100%',
      touchAction: 'pan-y', // 세로 스크롤만 허용
      // 스크롤바 숨기기
      '&::-webkit-scrollbar': {
        display: 'none'
      },
      scrollbarWidth: 'none',
      msOverflowStyle: 'none'
    }}>
      {/* 헤더 */}
      <Box sx={{ mb: 4 }}>
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

      {/* 통계 카드 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
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
        <Grid item xs={12} sm={6} md={3}>
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
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#1a1d21', border: '1px solid #333' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <WorkIcon sx={{ color: '#10b981', mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" sx={{ color: '#fff', fontWeight: 'bold' }}>
                    {teams.reduce((sum, team) => {
                      const teamSitesCount = sites.filter(site => {
                        const siteTeamName = (site.team || '').replace(/팀$/, '');
                        const teamNameWithoutTeam = team.teamName.replace(/팀$/, '');
                        return site.status === '진행중' && 
                          (siteTeamName === teamNameWithoutTeam || site.manager === team.managerName);
                      }).length;
                      return sum + teamSitesCount;
                    }, 0)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#bbb' }}>
                    진행 현장
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
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
            <Card sx={{ 
              bgcolor: '#1a1d21', 
              border: '1px solid #333',
              '&:hover': { borderColor: '#f59e42' }
            }}>
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
                    <Typography variant="body2" sx={{ color: '#43e97b', mb: 1, fontWeight: 'bold' }}>
                      진행 현장 ({sites.filter(site => {
                        const siteTeamName = (site.team || '').replace(/팀$/, '');
                        const teamNameWithoutTeam = team.teamName.replace(/팀$/, '');
                        return site.status === '진행중' && 
                          (siteTeamName === teamNameWithoutTeam || site.manager === team.managerName);
                      }).length}개)
                    </Typography>
                    {sites.filter(site => {
                      const siteTeamName = (site.team || '').replace(/팀$/, '');
                      const teamNameWithoutTeam = team.teamName.replace(/팀$/, '');
                      return site.status === '진행중' && 
                        (siteTeamName === teamNameWithoutTeam || site.manager === team.managerName);
                    }).length > 0 ? (
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
                        {sites.filter(site => {
                          const siteTeamName = (site.team || '').replace(/팀$/, '');
                          const teamNameWithoutTeam = team.teamName.replace(/팀$/, '');
                          return site.status === '진행중' && 
                            (siteTeamName === teamNameWithoutTeam || site.manager === team.managerName);
                        }).map((site, index) => (
                          <Tooltip title="더블클릭하여 현장관리 페이지로 이동" placement="top">
                            <ListItem 
                              key={site.id} 
                              disableGutters
                              sx={{ 
                                cursor: 'pointer',
                                '&:hover': {
                                  bgcolor: '#374151'
                                }
                              }}
                              onDoubleClick={() => {
                                // 현장관리 페이지로 이동하면서 해당 현장 선택
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
                        ))}
                      </List>
                    ) : (
                      <Typography variant="body2" sx={{ color: '#666', fontStyle: 'italic' }}>
                        진행 현장 없음
                      </Typography>
                    )}
                  </Box>

                  {/* 예정 현장 */}
                  <Box>
                    <Typography variant="body2" sx={{ color: '#f59e42', mb: 1, fontWeight: 'bold' }}>
                      예정 현장 ({sites.filter(site => {
                        const siteTeamName = (site.team || '').replace(/팀$/, '');
                        const teamNameWithoutTeam = team.teamName.replace(/팀$/, '');
                        return site.status === '예정' && 
                          (siteTeamName === teamNameWithoutTeam || site.manager === team.managerName);
                      }).length}개)
                    </Typography>
                    {sites.filter(site => {
                      const siteTeamName = (site.team || '').replace(/팀$/, '');
                      const teamNameWithoutTeam = team.teamName.replace(/팀$/, '');
                      return site.status === '예정' && 
                        (siteTeamName === teamNameWithoutTeam || site.manager === team.managerName);
                    }).length > 0 ? (
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
                        {sites.filter(site => {
                          const siteTeamName = (site.team || '').replace(/팀$/, '');
                          const teamNameWithoutTeam = team.teamName.replace(/팀$/, '');
                          return site.status === '예정' && 
                            (siteTeamName === teamNameWithoutTeam || site.manager === team.managerName);
                        }).map((site, index) => (
                          <Tooltip title="더블클릭하여 현장관리 페이지로 이동" placement="top">
                            <ListItem 
                              key={site.id} 
                              disableGutters
                              sx={{ 
                                cursor: 'pointer',
                                '&:hover': {
                                  bgcolor: '#374151'
                                }
                              }}
                              onDoubleClick={() => {
                                // 현장관리 페이지로 이동하면서 해당 현장 선택
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
                        ))}
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
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="시공팀명"
                  value={formData.teamName}
                  onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                  sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: '#fff' } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="소장님 이름"
                  value={formData.managerName}
                  onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
                  sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: '#fff' } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="시공팀 인원"
                  type="number"
                  value={formData.memberCount}
                  onChange={(e) => setFormData({ ...formData, memberCount: e.target.value })}
                  sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: '#fff' } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
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
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="연락처"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: '#fff' } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
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
                    {sites.map((site) => (
                      <MenuItem key={site.id} value={site.name}>
                        {site.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="타업체 현장"
                  value={formData.otherCompanySites}
                  onChange={(e) => setFormData({ ...formData, otherCompanySites: e.target.value })}
                  sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: '#fff' } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
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

export default ConstructionTeam; 