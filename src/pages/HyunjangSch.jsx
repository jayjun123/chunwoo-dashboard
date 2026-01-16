import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  TextField,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  LinearProgress,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  List,
  ListItem,
  ListItemText,
  Slider,
  InputAdornment,
  Snackbar,
  Alert,
  Tooltip
} from '@mui/material';
import {
  ArrowBack,
  Add,
  LocationOn,
  Business,
  Person,
  Phone,
  ArrowUpward,
  PhotoCamera,
  Edit,
  Delete
} from '@mui/icons-material';
import { doc, getDoc, updateDoc, collection, query, getDocs, where } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const HyunjangSch = () => {
  const { siteId, groupId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isGroupMode = Boolean(groupId);
  
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allSites, setAllSites] = useState([]);
  const [groupData, setGroupData] = useState(null);
  const [groupItems, setGroupItems] = useState([]);
  const [groupSiteSelect, setGroupSiteSelect] = useState('');
  const [groupCustomInput, setGroupCustomInput] = useState({ name: '', note: '' });
  const [groupItemsDialogOpen, setGroupItemsDialogOpen] = useState(false);
  const [groupDates, setGroupDates] = useState({ start: '', end: '' });
  const [groupAddDialog, setGroupAddDialog] = useState({ open: false, mode: 'site' });
  
  // 현장 정보 상태
  const [address, setAddress] = useState('');
  const [company, setCompany] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  
  // 시공팀 선택 상태
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [teamOptions, setTeamOptions] = useState([]);
  const [teamLabels, setTeamLabels] = useState({}); // 시공팀 라벨 상태 (예: {0: '시공팀1', 1: '시공팀2'})
  const [editingTeamLabel, setEditingTeamLabel] = useState(null); // 편집 중인 시공팀 인덱스
  const [editLabelValue, setEditLabelValue] = useState('');
  const longPressTimerRef = useRef(null);
  
  // 전체 진행율 상태
  const [overallProgress, setOverallProgress] = useState(100);
  const [progressBars, setProgressBars] = useState([]);
  
  // 간트 차트 상태
  const [ganttItems, setGanttItems] = useState([
    { id: 1, label: '입력칸', checked: false, bars: [] }
  ]);
  
  // 날짜 범위 상태 (간트 차트용)
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null,
    daysDiff: 0,
    dates: []
  });
  
  // 사진 상태
  const [photos, setPhotos] = useState([
    { id: 1, url: null, label: '사진 추가' },
    { id: 2, url: null, label: '사진 추가' },
    { id: 3, url: null, label: '사진 추가' }
  ]);
  
  // 메모 상태
  const [memo, setMemo] = useState('');
  
  // 진행율 막대 편집 다이얼로그
  const [editProgressDialog, setEditProgressDialog] = useState({ open: false, index: null });
  const [editProgressData, setEditProgressData] = useState({ value: 0, color: '#43e97b' });
  
  // 간트 바 편집 다이얼로그
  const [editGanttDialog, setEditGanttDialog] = useState({ open: false, itemId: null, barIndex: null });
  const [editGanttData, setEditGanttData] = useState({ start: 0, end: 10, color: '#f59e0b', label: '' });
  const [ganttDragState, setGanttDragState] = useState({ 
    isDragging: false, 
    isResizing: false, 
    resizeType: null, 
    startX: 0, 
    itemId: null, 
    barIndex: null,
    startValue: 0,
    endValue: 0
  });
  
  // Snackbar 상태
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // 자동 저장을 위한 ref
  const saveTimeoutRef = useRef(null);

  // 시공팀 데이터 로드
  useEffect(() => {
    const loadConstructionTeams = async () => {
      try {
        const teamsSnapshot = await getDocs(collection(db, 'constructionTeams'));
        const teams = teamsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        // teamName으로 정렬
        const sortedTeams = teams.sort((a, b) => {
          const orderA = a.order !== undefined ? a.order : 999;
          const orderB = b.order !== undefined ? b.order : 999;
          return orderA - orderB;
        });
        const teamNames = sortedTeams.map(team => team.teamName || team.name || '');
        setTeamOptions(teamNames.filter(name => name));
        
        // 기본값으로 첫 번째 팀 설정
        if (teamNames.length > 0 && selectedTeams.length === 0) {
          setSelectedTeams([teamNames[0]]);
          // 기본 라벨 설정
          setTeamLabels({ 0: '시공팀1' });
        }
          } catch (error) {
        console.error('시공팀 데이터 로드 실패:', error);
      }
    };
    loadConstructionTeams();
  }, []);

  // 주요현장 목록 로드 (그룹 모드에서는 전체 현장 로드)
  useEffect(() => {
    const loadImportantSites = async () => {
      try {
        if (isGroupMode) {
          const sitesQuery = query(collection(db, 'sites'), orderBy('name', 'asc'));
          const sitesSnapshot = await getDocs(sitesQuery);
          const sites = sitesSnapshot.docs
            .map(doc => ({
              id: doc.id,
              ...doc.data()
            }))
            .filter(site => site.status !== '완료');
          setAllSites(sites);
          return;
        }

        const sitesQuery = query(
          collection(db, 'sites'),
          where('isFavorite', '==', true)
        );
        const sitesSnapshot = await getDocs(sitesQuery);
        const sites = sitesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAllSites(sites);
      } catch (error) {
        console.error('주요현장 목록 로드 실패:', error);
        // isFavorite 필드가 없는 경우를 대비해 전체 현장 로드 후 필터링
        try {
          const allSitesQuery = query(collection(db, 'sites'));
          const allSitesSnapshot = await getDocs(allSitesQuery);
          const allSites = allSitesSnapshot.docs
            .map(doc => ({
              id: doc.id,
              ...doc.data()
            }))
            .filter(site => site.status !== '완료');
          if (isGroupMode) {
            setAllSites(allSites);
          } else {
            // 클라이언트에서 주요현장만 필터링
            const importantSites = allSites.filter(site => site.isFavorite === true);
            setAllSites(importantSites);
          }
        } catch (fallbackError) {
          console.error('전체 현장 목록 로드 실패:', fallbackError);
        }
      }
    };
    loadImportantSites();
  }, [isGroupMode]);

  useEffect(() => {
    const loadGroupData = async () => {
      if (!isGroupMode || !groupId) return;
      try {
        setLoading(true);
        const groupDoc = await getDoc(doc(db, 'site_groups', groupId));
        if (!groupDoc.exists()) {
          setSnackbar({ open: true, message: '그룹 정보를 찾을 수 없습니다.', severity: 'error' });
          setGroupData(null);
          setGroupItems([]);
          setSite({ id: 'no-group', name: '그룹을 찾을 수 없습니다' });
          return;
        }
        const group = { id: groupDoc.id, ...groupDoc.data() };
        setGroupData(group);
        setGroupItems(Array.isArray(group.items) ? group.items : []);
        setSite({ id: group.id, name: group.title || '그룹 진행 요약' });
        setAddress('');
        setCompany('');
        setContactPerson('');
        applyHyunjangSchData(group.hyunjangSchData);
        setGroupDates({
          start: group.hyunjangSchData?.groupStartDate || '',
          end: group.hyunjangSchData?.groupEndDate || ''
        });
        if (group.hyunjangSchData?.groupStartDate && group.hyunjangSchData?.groupEndDate) {
          setDateRangeFromCustom(
            group.hyunjangSchData.groupStartDate,
            group.hyunjangSchData.groupEndDate
          );
        }
      } catch (error) {
        console.error('그룹 정보 로드 실패:', error);
        setSnackbar({ open: true, message: '그룹 정보를 불러오지 못했습니다.', severity: 'error' });
      } finally {
        setLoading(false);
      }
    };
    loadGroupData();
  }, [groupId, isGroupMode]);

  // 현장 정보 로드
  useEffect(() => {
    const loadSiteData = async () => {
      try {
        if (isGroupMode) {
          return;
        }
        setLoading(true);
        let foundSite = null;

        if (siteId && siteId !== 'undefined' && siteId !== 'null') {
          try {
            const siteDoc = await getDoc(doc(db, 'sites', siteId));
            if (siteDoc.exists()) {
              const siteData = { id: siteDoc.id, ...siteDoc.data() };
              // 주요현장인지 확인
              if (siteData.isFavorite === true) {
                foundSite = siteData;
              } else {
                setSnackbar({
                  open: true,
                  message: '이 페이지는 주요현장만 사용할 수 있습니다.',
                  severity: 'warning'
                });
              }
            }
          } catch (error) {
            console.log('siteId로 조회 실패:', error);
          }
        }

        // 현장이 있으면 정보 업데이트
        if (foundSite) {
          updateSiteInfo(foundSite);
        } else {
          setSite({
            id: 'no-site',
            name: '주요현장을 선택해주세요'
          });
        }

        // 날짜 범위 설정 (착공일부터 준공일까지)
        if (foundSite) {
          updateDateRange(foundSite);
        } else {
          // 기본 날짜 범위
          const defaultStart = new Date();
          defaultStart.setMonth(defaultStart.getMonth() - 1);
          const defaultEnd = new Date();
          defaultEnd.setMonth(defaultEnd.getMonth() + 6);
          const daysDiff = Math.ceil((defaultEnd - defaultStart) / (1000 * 60 * 60 * 24));
          const dates = [];
          const interval = Math.max(1, Math.floor(daysDiff / 20));
          
          for (let i = 0; i <= daysDiff; i += interval) {
            const date = new Date(defaultStart);
            date.setDate(date.getDate() + i);
            dates.push(date);
          }
          if (dates[dates.length - 1] < defaultEnd) {
            dates.push(defaultEnd);
          }

          setDateRange({
            startDate: defaultStart,
            endDate: defaultEnd,
            daysDiff,
            dates
          });
        }
      } catch (error) {
        console.error('현장 정보 로드 실패:', error);
        setSite({
          id: 'error-site',
          name: '데이터 로드 실패'
        });
      } finally {
        setLoading(false);
      }
    };

    loadSiteData();
  }, [siteId, isGroupMode]);

  useEffect(() => {
    if (!isGroupMode) return;
    if (groupDates.start && groupDates.end) {
      setDateRangeFromCustom(groupDates.start, groupDates.end);
    }
  }, [groupDates, isGroupMode]);

  function applyHyunjangSchData(data) {
    if (data?.selectedTeams) {
      setSelectedTeams(data.selectedTeams);
      if (data.teamLabels) {
        setTeamLabels(data.teamLabels);
      } else {
        const defaultLabels = {};
        data.selectedTeams.forEach((_, index) => {
          defaultLabels[index] = `시공팀${index + 1}`;
        });
        setTeamLabels(defaultLabels);
      }
    }
    if (data?.overallProgress !== undefined) setOverallProgress(data.overallProgress);
    if (data?.progressBars) setProgressBars(data.progressBars);
    if (data?.ganttItems) setGanttItems(data.ganttItems);
    if (data?.memo !== undefined) setMemo(data.memo);
    
    const defaultPhotos = [
      { id: 1, url: null, label: '사진 추가', storagePath: null },
      { id: 2, url: null, label: '사진 추가', storagePath: null },
      { id: 3, url: null, label: '사진 추가', storagePath: null }
    ];
    
    if (data?.photos && Array.isArray(data.photos) && data.photos.length > 0) {
      data.photos.forEach((photo, index) => {
        if (defaultPhotos[index]) {
          defaultPhotos[index] = {
            id: index + 1,
            url: photo.url || null,
            label: photo.label || '사진 추가',
            storagePath: photo.storagePath || null
          };
        }
      });
    }
    setPhotos(defaultPhotos);
  }

  // 현장 정보 업데이트 함수
  const updateSiteInfo = (foundSite) => {
    setSite(foundSite);
    setAddress(foundSite.address || '');
    setCompany(foundSite.companyName || foundSite.company || '');
    setContactPerson(foundSite.manager || '');
    setPhone(foundSite.phone || '');
    applyHyunjangSchData(foundSite.hyunjangSchData);
  };

  const siteMap = useMemo(() => new Map(allSites.map(s => [s.id, s])), [allSites]);

  const updateGroupItems = async (items) => {
    if (!groupId) return;
    try {
      await updateDoc(doc(db, 'site_groups', groupId), {
        items,
        updatedAt: new Date()
      });
      setGroupItems(items);
      setGroupData(prev => prev ? { ...prev, items } : prev);
    } catch (error) {
      console.error('그룹 항목 업데이트 실패:', error);
      setSnackbar({ open: true, message: '그룹 항목 업데이트 실패', severity: 'error' });
    }
  };

  const handleAddGroupSite = () => {
    if (!groupSiteSelect) return;
    const nextItems = [...groupItems, { type: 'site', siteId: groupSiteSelect }];
    updateGroupItems(nextItems);
    setGroupSiteSelect('');
  };

  const handleAddGroupCustom = () => {
    if (!groupCustomInput.name.trim()) return;
    const nextItems = [
      ...groupItems,
      { type: 'custom', name: groupCustomInput.name.trim(), note: groupCustomInput.note.trim() }
    ];
    updateGroupItems(nextItems);
    setGroupCustomInput({ name: '', note: '' });
  };

  const handleRemoveGroupItem = (index) => {
    const nextItems = groupItems.filter((_, idx) => idx !== index);
    updateGroupItems(nextItems);
  };

  const renderGroupItemLabel = (item) => {
    if (item.type === 'site') {
      return siteMap.get(item.siteId)?.name || '현장';
    }
    return item.name || '임의 입력';
  };

  const renderGroupItemTooltip = (item) => {
    if (item.type !== 'site') return '';
    const siteInfo = siteMap.get(item.siteId);
    if (!siteInfo) return '';
    const lines = [
      siteInfo.address ? `주소: ${siteInfo.address}` : null,
      siteInfo.companyName || siteInfo.company ? `회사명: ${siteInfo.companyName || siteInfo.company}` : null,
      siteInfo.manager ? `현장소장: ${siteInfo.manager}` : null
    ].filter(Boolean);
    return lines.join('\n');
  };

  // 날짜 범위 업데이트 함수
  const updateDateRange = (foundSite) => {
          let startDate = null;
          let endDate = null;

          // 시작일 처리
          if (foundSite.startDate) {
            if (foundSite.startDate.toDate) {
              startDate = foundSite.startDate.toDate();
            } else if (foundSite.startDate instanceof Date) {
              startDate = foundSite.startDate;
            } else if (typeof foundSite.startDate === 'string') {
              startDate = new Date(foundSite.startDate);
            }
          }

          // 종료일 처리
          if (foundSite.endDate) {
            if (foundSite.endDate.toDate) {
              endDate = foundSite.endDate.toDate();
            } else if (foundSite.endDate instanceof Date) {
              endDate = foundSite.endDate;
            } else if (typeof foundSite.endDate === 'string') {
              endDate = new Date(foundSite.endDate);
            }
          }

          // 기본값 설정 (날짜가 없을 경우)
          if (!startDate) {
            startDate = new Date();
            startDate.setMonth(startDate.getMonth() - 1);
          }
          if (!endDate) {
            endDate = new Date();
            endDate.setMonth(endDate.getMonth() + 6);
          }

          // 날짜가 유효한지 확인
          if (isNaN(startDate.getTime())) {
            startDate = new Date();
            startDate.setMonth(startDate.getMonth() - 1);
          }
          if (isNaN(endDate.getTime())) {
            endDate = new Date();
            endDate.setMonth(endDate.getMonth() + 6);
          }

          // 종료일이 시작일보다 이전이면 조정
          if (endDate < startDate) {
            endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + 6);
          }

          const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
          const dates = [];
          
          // 날짜 간격 계산 (10개 구간으로 나누기)
          const interval = Math.max(1, Math.floor(daysDiff / 10)); // 10개 구간
          
          for (let i = 0; i <= daysDiff; i += interval) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            dates.push(date);
          }
          
          // 마지막 날짜가 포함되도록
          if (dates[dates.length - 1] < endDate) {
            dates.push(endDate);
          }

          setDateRange({
            startDate,
            endDate,
            daysDiff,
            dates
          });
  };

  const teamColors = [
    '#43e97b',
    '#f59e0b',
    '#60a5fa',
    '#a78bfa',
    '#f43f5e',
    '#22c55e',
    '#14b8a6',
    '#eab308',
    '#38bdf8',
    '#f97316'
  ];

  const truncateLabel = (value, maxLength = 8) => {
    if (!value) return '';
    return value.length > maxLength ? value.slice(0, maxLength) : value;
  };

  useEffect(() => {
    if (!isGroupMode) return;
    setGanttItems(prev => {
      const nonGroupItems = prev.filter(item => !item.isGroupItem);
      const maxId = nonGroupItems.reduce((max, item) => Math.max(max, item.id || 0), 0);
      let nextId = maxId + 1;

      const groupMapped = groupItems.map(item => {
        const key = item.type === 'site'
          ? `site:${item.siteId}`
          : `custom:${item.name || ''}:${item.note || ''}`;
        const existing = prev.find(p => p.groupKey === key);
        const label = truncateLabel(renderGroupItemLabel(item), 8);
        if (existing) {
          return { ...existing, label, groupKey: key, isGroupItem: true };
        }
        const newItem = { id: nextId++, label, checked: false, bars: [], groupKey: key, isGroupItem: true };
        return newItem;
      });

      return [...groupMapped, ...nonGroupItems];
    });
  }, [groupItems, isGroupMode]);

  const setDateRangeFromCustom = (startDate, endDate) => {
    if (!startDate || !endDate) return;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;

    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (daysDiff <= 0) return;
    const dates = [];
    const interval = Math.max(1, Math.floor(daysDiff / 20));
    for (let i = 0; i <= daysDiff; i += interval) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    if (dates[dates.length - 1] < end) {
      dates.push(end);
    }
    setDateRange({
      startDate: start,
      endDate: end,
      daysDiff,
      dates
    });
  };

  // 시공팀 추가
  const handleAddTeam = () => {
    if (teamOptions.length > 0) {
      const availableTeam = teamOptions.find(team => !selectedTeams.includes(team));
      if (availableTeam) {
        const newIndex = selectedTeams.length;
        setSelectedTeams([...selectedTeams, availableTeam]);
        setTeamLabels({ ...teamLabels, [newIndex]: `시공팀${newIndex + 1}` });
      }
    }
  };

  // 시공팀 제거
  const handleRemoveTeam = (team) => {
    const index = selectedTeams.indexOf(team);
    const newTeams = selectedTeams.filter(t => t !== team);
    setSelectedTeams(newTeams);
    // 라벨 재정렬
    const newLabels = {};
    newTeams.forEach((_, i) => {
      if (i < index) {
        newLabels[i] = teamLabels[i] || `시공팀${i + 1}`;
      } else {
        newLabels[i] = teamLabels[i + 1] || `시공팀${i + 1}`;
      }
    });
    setTeamLabels(newLabels);
  };

  // 시공팀 변경
  const handleTeamChange = (index, newTeam) => {
    if (newTeam === '__DELETE__') {
      // 삭제 옵션 선택 시
      handleRemoveTeam(selectedTeams[index]);
    } else {
      const updated = [...selectedTeams];
      updated[index] = newTeam;
      setSelectedTeams(updated);
    }
  };

  // 시공팀 라벨 변경
  const handleTeamLabelChange = (index, newLabel) => {
    setTeamLabels({ ...teamLabels, [index]: newLabel });
  };

  // 진행율 막대 편집
  const handleEditProgress = (index) => {
    setEditProgressData({
      value: progressBars[index].value,
      color: progressBars[index].color
    });
    setEditProgressDialog({ open: true, index });
  };

  // 진행율 막대 저장
  const handleSaveProgress = () => {
    if (editProgressDialog.index !== null) {
      const updated = [...progressBars];
      updated[editProgressDialog.index] = {
        ...updated[editProgressDialog.index],
        value: editProgressData.value,
        color: editProgressData.color
      };
      setProgressBars(updated);
    }
    setEditProgressDialog({ open: false, index: null });
  };

  // 진행율 막대 추가
  const handleAddProgressBar = () => {
    const newBar = {
      id: Date.now(),
      label: `진행 ${progressBars.length + 1}`,
      value: 0,
      color: '#43e97b',
      position: 0
    };
    setProgressBars([...progressBars, newBar]);
  };

  // 진행율 막대 제거
  const handleRemoveProgressBar = (id) => {
    setProgressBars(progressBars.filter(bar => bar.id !== id));
  };

  // 간트 아이템 라벨 변경
  const handleGanttLabelChange = (id, newLabel) => {
    setGanttItems(ganttItems.map(item => 
      item.id === id ? { ...item, label: newLabel } : item
    ));
  };

  // 간트 바 편집 (모달 열기)
  const handleEditGanttBar = (itemId, barIndex) => {
    const item = ganttItems.find(i => i.id === itemId);
    if (item && item.bars[barIndex]) {
      setEditGanttData({ ...item.bars[barIndex] });
      setEditGanttDialog({ open: true, itemId, barIndex });
    }
  };

  // 간트 차트에서 드래그 시작
  const handleGanttBarDragStart = (e, itemId, barIndex) => {
    e.preventDefault();
    e.stopPropagation();
    const item = ganttItems.find(i => i.id === itemId);
    if (item && item.bars[barIndex]) {
      const bar = item.bars[barIndex];
      setGanttDragState({
        isDragging: true,
        isResizing: false,
        resizeType: null,
        startX: e.clientX,
        itemId,
        barIndex,
        startValue: bar.start,
        endValue: bar.end
      });
    }
  };

  // 간트 차트에서 리사이즈 시작
  const handleGanttBarResizeStart = (e, itemId, barIndex, type) => {
    e.preventDefault();
    e.stopPropagation();
    const item = ganttItems.find(i => i.id === itemId);
    if (item && item.bars[barIndex]) {
      const bar = item.bars[barIndex];
      setGanttDragState({
        isDragging: false,
        isResizing: true,
        resizeType: type,
        startX: e.clientX,
        itemId,
        barIndex,
        startValue: bar.start,
        endValue: bar.end
      });
    }
  };

  // 간트 차트에서 드래그/리사이즈 중
  const handleGanttBarDragMove = (e) => {
    if (!ganttDragState.isDragging && !ganttDragState.isResizing) return;
    if (!ganttDragState.itemId || ganttDragState.barIndex === null) return;

    const container = document.querySelector('[data-gantt-container]');
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const deltaX = e.clientX - ganttDragState.startX;
    const containerWidth = rect.width - 150; // 입력칸 너비 제외
    const daysPerPixel = (dateRange.daysDiff || 100) / containerWidth;
    const deltaDays = Math.round(deltaX * daysPerPixel);

    setGanttItems(ganttItems.map(item => {
      if (item.id === ganttDragState.itemId) {
        const updatedBars = [...item.bars];
        const bar = updatedBars[ganttDragState.barIndex];
        
        if (ganttDragState.isDragging) {
          const newStart = Math.max(0, Math.min(dateRange.daysDiff || 100, ganttDragState.startValue + deltaDays));
          const width = ganttDragState.endValue - ganttDragState.startValue;
          const newEnd = Math.min(dateRange.daysDiff || 100, newStart + width);
          updatedBars[ganttDragState.barIndex] = { ...bar, start: newStart, end: newEnd };
        } else if (ganttDragState.isResizing) {
          if (ganttDragState.resizeType === 'start') {
            const newStart = Math.max(0, Math.min(bar.end - 1, ganttDragState.startValue + deltaDays));
            updatedBars[ganttDragState.barIndex] = { ...bar, start: newStart };
          } else if (ganttDragState.resizeType === 'end') {
            const newEnd = Math.max(bar.start + 1, Math.min(dateRange.daysDiff || 100, ganttDragState.endValue + deltaDays));
            updatedBars[ganttDragState.barIndex] = { ...bar, end: newEnd };
          }
        }
        
        return { ...item, bars: updatedBars };
      }
      return item;
    }));
  };

  // 간트 차트에서 드래그/리사이즈 종료
  const handleGanttBarDragEnd = () => {
    setGanttDragState({ 
      isDragging: false, 
      isResizing: false, 
      resizeType: null, 
      startX: 0, 
      itemId: null, 
      barIndex: null,
      startValue: 0,
      endValue: 0
    });
  };

  // 간트 차트 마우스 이벤트 리스너 등록
  useEffect(() => {
    if (ganttDragState.isDragging || ganttDragState.isResizing) {
      const handleMouseMove = (e) => handleGanttBarDragMove(e);
      const handleMouseUp = () => handleGanttBarDragEnd();
      const handleTouchMove = (e) => {
        if (e.touches.length > 0) {
          handleGanttBarDragMove({ clientX: e.touches[0].clientX });
        }
      };
      const handleTouchEnd = () => handleGanttBarDragEnd();
      
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [ganttDragState, dateRange.daysDiff, ganttItems]);

  // 간트 바 저장
  const handleSaveGanttBar = () => {
    if (editGanttDialog.itemId !== null && editGanttDialog.barIndex !== null) {
      setGanttItems(ganttItems.map(item => {
        if (item.id === editGanttDialog.itemId) {
          const updatedBars = [...item.bars];
          updatedBars[editGanttDialog.barIndex] = { ...editGanttData };
          return { ...item, bars: updatedBars };
        }
        return item;
      }));
    }
    setEditGanttDialog({ open: false, itemId: null, barIndex: null });
  };

  // 간트 바 추가
  const handleAddGanttBar = (itemId) => {
    setGanttItems(ganttItems.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          bars: [...item.bars, { start: 0, end: 10, color: '#f59e0b', label: '' }]
        };
      }
      return item;
    }));
  };

  // 간트 바 제거
  const handleRemoveGanttBar = (itemId, barIndex) => {
    setGanttItems(ganttItems.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          bars: item.bars.filter((_, i) => i !== barIndex)
        };
      }
      return item;
    }));
  };

  // 간트 아이템 추가
  const handleAddGanttItem = () => {
    const newId = Math.max(...ganttItems.map(item => item.id), 0) + 1;
    setGanttItems([...ganttItems, { id: newId, label: '입력칸', checked: false, bars: [] }]);
  };

  // 간트 아이템 제거
  const handleRemoveGanttItem = (itemId) => {
    if (ganttItems.length > 1) {
      setGanttItems(ganttItems.filter(item => item.id !== itemId));
    }
  };

  // 체크된 간트 아이템들 일괄 삭제
  const handleDeleteCheckedGanttItems = () => {
    const checkedItems = ganttItems.filter(item => item.checked);
    if (checkedItems.length === 0) {
      setSnackbar({ open: true, message: '삭제할 항목을 선택해주세요', severity: 'warning' });
      return;
    }
    
    if (ganttItems.length - checkedItems.length < 1) {
      setSnackbar({ open: true, message: '최소 하나의 항목은 남아있어야 합니다', severity: 'warning' });
      return;
    }
    
    setGanttItems(ganttItems.filter(item => !item.checked));
    setSnackbar({ open: true, message: `${checkedItems.length}개 항목이 삭제되었습니다`, severity: 'success' });
  };

  // 현장 선택 핸들러
  const handleSiteChange = (selectedSiteId) => {
    if (isGroupMode) return;
    if (selectedSiteId && selectedSiteId !== 'no-site') {
      const selectedSite = allSites.find(s => s.id === selectedSiteId);
      if (selectedSite) {
        updateSiteInfo(selectedSite);
        updateDateRange(selectedSite);
        // URL 업데이트
        navigate(`/hyunjangsch/${selectedSiteId}`, { replace: true });
      }
    }
  };

  // 사진 업로드
  const handlePhotoUpload = async (photoId, event) => {
    const file = event.target.files[0];
    if (!file || !site || site.id === 'no-site' || site.id === 'error-site') {
      event.target.value = '';
      return;
    }

    try {
      // 기존 사진이 있으면 Storage에서 삭제
      const currentPhoto = photos.find(p => p.id === photoId);
      if (currentPhoto && currentPhoto.storagePath) {
        try {
          const storage = getStorage();
          const oldRef = storageRef(storage, currentPhoto.storagePath);
          await deleteObject(oldRef);
        } catch (error) {
          console.warn('기존 사진 삭제 실패 (무시):', error);
        }
      }

      // Firebase Storage에 업로드
      const storage = getStorage();
      const fileName = `${site.id}_photo${photoId}_${Date.now()}_${file.name}`;
      const sRef = storageRef(storage, `hyunjangSch/${site.id}/${fileName}`);
      
      await uploadBytes(sRef, file, {
        customMetadata: {
          userId: currentUser?.uid || '',
          uploadedAt: new Date().toISOString(),
          photoId: photoId.toString(),
          siteId: site.id
        }
      });

      // 다운로드 URL 가져오기
      const downloadURL = await getDownloadURL(sRef);

      // 상태 업데이트
      const updatedPhotos = photos.map(photo => 
        photo.id === photoId ? { 
          ...photo, 
          url: downloadURL,
          storagePath: `hyunjangSch/${site.id}/${fileName}`
        } : photo
      );
      setPhotos(updatedPhotos);

      // 즉시 Firebase에 저장
      try {
        const targetCollection = isGroupMode ? 'site_groups' : 'sites';
        const targetId = isGroupMode ? groupId : site.id;
        if (targetId) {
          await updateDoc(doc(db, targetCollection, targetId), {
            hyunjangSchData: {
              selectedTeams,
              teamLabels,
              overallProgress,
              progressBars,
              ganttItems,
              photos: updatedPhotos.map(photo => ({
                url: photo.url,
                label: photo.label,
                storagePath: photo.storagePath
              })),
              memo,
              groupStartDate: isGroupMode ? groupDates.start : undefined,
              groupEndDate: isGroupMode ? groupDates.end : undefined,
              updatedAt: new Date()
            }
          });
        }
        console.log('사진 저장 완료');
      } catch (saveError) {
        console.error('사진 저장 실패:', saveError);
        setSnackbar({ open: true, message: '사진 저장에 실패했습니다.', severity: 'error' });
      }
    } catch (error) {
      console.error('사진 업로드 실패:', error);
      setSnackbar({ open: true, message: '사진 업로드에 실패했습니다.', severity: 'error' });
    }

    // 같은 파일을 다시 선택할 수 있도록 input 값 초기화
    event.target.value = '';
  };

  // 데이터 저장
  const handleSave = async () => {
    if (!site || site.id === 'no-site' || site.id === 'error-site') return;
    
    try {
      const targetCollection = isGroupMode ? 'site_groups' : 'sites';
      const targetId = isGroupMode ? groupId : site.id;
      if (!targetId) return;

      const updatePayload = {
        hyunjangSchData: {
          selectedTeams,
          overallProgress,
          progressBars,
          ganttItems,
          memo,
          groupStartDate: isGroupMode ? groupDates.start : undefined,
          groupEndDate: isGroupMode ? groupDates.end : undefined,
          updatedAt: new Date()
        }
      };

      if (!isGroupMode) {
        updatePayload.address = address;
        updatePayload.companyName = company;
        updatePayload.manager = contactPerson;
        updatePayload.phone = phone;
      }

      await updateDoc(doc(db, targetCollection, targetId), updatePayload);
      setSnackbar({ open: true, message: '저장되었습니다.', severity: 'success' });
    } catch (error) {
      console.error('저장 실패:', error);
      setSnackbar({ open: true, message: '저장에 실패했습니다.', severity: 'error' });
    }
  };

  // 자동 저장 (간트바, 진행율 변경 시)
  useEffect(() => {
    if (!site || site.id === 'no-site' || site.id === 'error-site' || loading) return;
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const targetCollection = isGroupMode ? 'site_groups' : 'sites';
        const targetId = isGroupMode ? groupId : site.id;
        if (!targetId) return;
        await updateDoc(doc(db, targetCollection, targetId), {
          hyunjangSchData: {
            selectedTeams,
            teamLabels,
            overallProgress,
            progressBars,
            ganttItems,
            photos: photos.map(photo => ({
              url: photo.url,
              label: photo.label,
              storagePath: photo.storagePath
            })),
            memo,
            groupStartDate: isGroupMode ? groupDates.start : undefined,
            groupEndDate: isGroupMode ? groupDates.end : undefined,
            updatedAt: new Date()
          }
        });
      } catch (error) {
        console.error('자동 저장 실패:', error);
      }
    }, 1000); // 1초 후 저장
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [selectedTeams, teamLabels, overallProgress, progressBars, ganttItems, photos, memo, site, loading, isGroupMode, groupId, groupDates]);

  if (loading) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        bgcolor: '#181A20',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <CircularProgress sx={{ color: '#43e97b' }} />
      </Box>
    );
  }

    return (
      <Box sx={{ 
        minHeight: '100vh', 
        bgcolor: '#181A20',
      color: 'white',
      p: 3,
      pt: 'calc(3rem + 20px)'
    }}>
      {/* 헤더 */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
          <IconButton onClick={() => navigate('/sites')} sx={{ color: 'white' }}>
            <ArrowBack />
          </IconButton>
          {!isGroupMode && (
            <FormControl size="small" sx={{ minWidth: 250 }}>
              <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>현장 선택</InputLabel>
              <Select
                value={site?.id || 'no-site'}
                onChange={(e) => handleSiteChange(e.target.value)}
                label="현장 선택"
                sx={{ 
                  color: 'white',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255,255,255,0.3)'
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255,255,255,0.5)'
                  },
                  '& .MuiSvgIcon-root': {
                    color: 'white'
                  }
                }}
              >
                <MenuItem value="no-site">
                  <em>주요현장을 선택해주세요</em>
                </MenuItem>
                {allSites.length > 0 ? allSites.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name || '이름 없음'}
                  </MenuItem>
                )) : (
                  <MenuItem disabled>
                    주요현장이 없습니다
                  </MenuItem>
                )}
              </Select>
            </FormControl>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#3b82f6' }}>
              {isGroupMode ? (groupData?.title || '그룹 진행 요약') : '진행 요약'}
            </Typography>
            {isGroupMode && (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', marginLeft: 'auto' }}>
                <TextField
                  type="date"
                  label="시작일"
                  size="small"
                  value={groupDates.start}
                  onChange={(e) => setGroupDates(prev => ({ ...prev, start: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  sx={{ '& .MuiInputBase-input': { color: '#fff' }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' } }}
                />
                <TextField
                  type="date"
                  label="종료일"
                  size="small"
                  value={groupDates.end}
                  onChange={(e) => setGroupDates(prev => ({ ...prev, end: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  sx={{ '& .MuiInputBase-input': { color: '#fff' }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' } }}
                />
              </Box>
            )}
          </Box>
      </Box>
      </Box>

      {/* 첫 번째 줄: 주소정보박스, 시공팀박스 */}
      <Grid container spacing={2} sx={{ mb: '5px', mt: '-10px', display: 'flex', alignItems: 'stretch', flexWrap: 'nowrap' }}>
        {/* 주소정보박스 */}
        <Grid item sx={{ 
          display: 'flex', 
          flex: '0 0 30%',
          maxWidth: '30%'
        }}>
          <Paper sx={{ 
            p: 2, 
            bgcolor: '#23242a',
            width: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {isGroupMode ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flex: 1 }}>
                <Typography sx={{ color: '#fff', fontWeight: 700 }}>
                  현장 선택 및 그룹 관리
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    variant="outlined"
                    onClick={() => setGroupAddDialog({ open: true, mode: 'site' })}
                    sx={{ color: '#90caf9', borderColor: '#90caf9' }}
                  >
                    현장 추가
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => setGroupAddDialog({ open: true, mode: 'custom' })}
                    sx={{ color: '#90caf9', borderColor: '#90caf9' }}
                  >
                    임의 항목 추가
                  </Button>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {groupItems.length === 0 ? (
                    <Typography sx={{ color: '#bbb' }}>추가된 항목이 없습니다.</Typography>
                  ) : (
                    <>
                      {(() => {
                        const firstItem = groupItems[0];
                        const label = renderGroupItemLabel(firstItem);
                        const tooltip = renderGroupItemTooltip(firstItem);
                        const content = (
                          <Chip
                            label={label}
                            onDoubleClick={() => setGroupItemsDialogOpen(true)}
                            sx={{ bgcolor: '#39475c', color: '#fff', cursor: 'pointer' }}
                          />
                        );
                        return (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            {tooltip ? (
                              <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{tooltip}</span>}>
                                {content}
                              </Tooltip>
                            ) : (
                              content
                            )}
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => setGroupItemsDialogOpen(true)}
                              sx={{ color: '#90caf9', borderColor: '#90caf9' }}
                            >
                              현장 목록
                            </Button>
                          </Box>
                        );
                      })()}
                      <Typography sx={{ color: '#aaa', fontSize: '0.8rem' }}>
                        총 {groupItems.length}개 현장 (더블클릭 또는 버튼으로 목록 보기)
                      </Typography>
                    </>
                  )}
                </Box>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, justifyContent: 'space-between', flex: 1 }}>
                {/* 주소 */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocationOn sx={{ color: '#43e97b', fontSize: 20 }} />
                  <TextField
                    id="address-input"
                    name="address"
                    label="주소"
                    fullWidth
                    size="small"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    autoComplete="street-address"
                    sx={{
                      '& .MuiInputBase-input': { color: 'white' },
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' }
                      },
                      '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' }
                    }}
                  />
                </Box>
                
                {/* 회사 */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Business sx={{ color: '#43e97b', fontSize: 20 }} />
                  <TextField
                    id="company-input"
                    name="company"
                    label="회사명"
                    fullWidth
                    size="small"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    autoComplete="organization"
                    sx={{
                      '& .MuiInputBase-input': { color: 'white' },
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' }
                      },
                      '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' }
                    }}
                  />
                </Box>
                
                {/* 연락처 담당자 */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Person sx={{ color: '#43e97b', fontSize: 20 }} />
                  <TextField
                    id="contact-person-input"
                    name="contactPerson"
                    label="현장소장"
                    fullWidth
                    size="small"
                    placeholder="현장소장"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    autoComplete="name"
                    sx={{
                      '& .MuiInputBase-input': { color: 'white' },
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' }
                      },
                      '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' }
                    }}
                  />
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>

      <Dialog
        open={groupItemsDialogOpen}
        onClose={() => setGroupItemsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        sx={{
          zIndex: 2600,
          '& .MuiDialog-container': {
            zIndex: 2600
          }
        }}
        PaperProps={{
          sx: {
            bgcolor: '#1a1d21',
            zIndex: 2601
          }
        }}
        BackdropProps={{
          sx: {
            zIndex: 2599,
            backgroundColor: 'rgba(0,0,0,0.6)'
          }
        }}
      >
        <DialogTitle sx={{ bgcolor: '#1a1d21', color: '#fff' }}>그룹 현장 목록</DialogTitle>
        <DialogContent sx={{ bgcolor: '#1a1d21' }}>
          {groupItems.length === 0 ? (
            <Typography sx={{ color: '#bbb' }}>추가된 항목이 없습니다.</Typography>
          ) : (
            <List>
              {groupItems.map((item, index) => {
                const label = renderGroupItemLabel(item);
                const tooltip = renderGroupItemTooltip(item);
                return (
                  <ListItem
                    key={`group-dialog-item-${index}`}
                    secondaryAction={
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveGroupItem(index)}
                        sx={{ color: '#f44336' }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    }
                  >
                    {tooltip ? (
                      <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{tooltip}</span>}>
                        <ListItemText primary={`${index + 1}. ${label}`} sx={{ color: '#fff' }} />
                      </Tooltip>
                    ) : (
                      <ListItemText primary={`${index + 1}. ${label}`} sx={{ color: '#fff' }} />
                    )}
                  </ListItem>
                );
              })}
            </List>
          )}
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#1a1d21' }}>
          <Button onClick={() => setGroupItemsDialogOpen(false)} sx={{ color: '#ccc' }}>
            닫기
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={groupAddDialog.open}
        onClose={() => setGroupAddDialog({ open: false, mode: 'site' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#1a1d21', color: '#fff' }}>
          {groupAddDialog.mode === 'site' ? '현장 추가' : '임의 항목 추가'}
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#1a1d21' }}>
          {groupAddDialog.mode === 'site' ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <FormControl fullWidth size="small">
                <Select
                  value={groupSiteSelect}
                  onChange={(e) => setGroupSiteSelect(e.target.value)}
                  displayEmpty
                  sx={{ color: '#fff', bgcolor: '#232b3b' }}
                >
                  <MenuItem value="">
                    <em>현장 선택</em>
                  </MenuItem>
                  {allSites.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.name || '이름 없음'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="임의 현장명"
                size="small"
                value={groupCustomInput.name}
                onChange={(e) => setGroupCustomInput(prev => ({ ...prev, name: e.target.value }))}
                sx={{ '& .MuiInputBase-input': { color: '#fff' }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' } }}
              />
              <TextField
                label="메모 (선택)"
                size="small"
                value={groupCustomInput.note}
                onChange={(e) => setGroupCustomInput(prev => ({ ...prev, note: e.target.value }))}
                sx={{ '& .MuiInputBase-input': { color: '#fff' }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' } }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#1a1d21' }}>
          <Button onClick={() => setGroupAddDialog({ open: false, mode: 'site' })} sx={{ color: '#ccc' }}>
            취소
          </Button>
          {groupAddDialog.mode === 'site' ? (
            <Button
              onClick={() => {
                handleAddGroupSite();
                setGroupAddDialog({ open: false, mode: 'site' });
              }}
              variant="contained"
              sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#45a049' } }}
            >
              추가
            </Button>
          ) : (
            <Button
              onClick={() => {
                handleAddGroupCustom();
                setGroupAddDialog({ open: false, mode: 'custom' });
              }}
              variant="contained"
              sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#45a049' } }}
            >
              추가
            </Button>
          )}
        </DialogActions>
      </Dialog>

        {/* 시공팀박스 */}
        <Grid item sx={{ 
          display: 'flex', 
          flex: '0 0 70%',
          maxWidth: '70%'
        }}>
          <Paper sx={{ 
            p: 2, 
            bgcolor: '#23242a',
            width: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* 시공팀 선택 */}
            <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'nowrap', alignItems: 'center' }}>
              {selectedTeams.map((team, index) => {
                const isEditingLabel = editingTeamLabel === index;
                const currentLabel = teamLabels[index] || `시공팀${index + 1}`;
                
                const handleLabelDoubleClick = () => {
                  setEditingTeamLabel(index);
                  setEditLabelValue(currentLabel);
                };
                
                const handleLabelLongPress = () => {
                  setEditingTeamLabel(index);
                  setEditLabelValue(currentLabel);
                };
                
                const handleLabelTouchStart = (e) => {
                  longPressTimerRef.current = setTimeout(() => {
                    handleLabelLongPress();
                  }, 500);
                };
                
                const handleLabelTouchEnd = () => {
                  if (longPressTimerRef.current) {
                    clearTimeout(longPressTimerRef.current);
                  }
                };
                
                const handleLabelBlur = () => {
                  if (editLabelValue.trim()) {
                    handleTeamLabelChange(index, editLabelValue.trim());
                  }
                  setEditingTeamLabel(null);
                };
                
                const handleLabelKeyDown = (e) => {
                  if (e.key === 'Enter') {
                    handleLabelBlur();
                  } else if (e.key === 'Escape') {
                    setEditingTeamLabel(null);
                    setEditLabelValue(currentLabel);
                  }
                };
                
                return (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {isEditingLabel ? (
                      <TextField
                        value={editLabelValue}
                        onChange={(e) => setEditLabelValue(e.target.value)}
                        onBlur={handleLabelBlur}
                        onKeyDown={handleLabelKeyDown}
                        onFocus={(e) => {
                          e.target.select();
                        }}
                        autoFocus
                        size="small"
                        sx={{
                          width: 80,
                          '& .MuiInputBase-input': { 
                            color: 'white', 
                            fontSize: '0.875rem',
                            py: 0.5
                          },
                          '& .MuiOutlinedInput-root': {
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' }
                          }
                        }}
                      />
                    ) : (
                      <Typography
                        onDoubleClick={handleLabelDoubleClick}
                        onTouchStart={handleLabelTouchStart}
                        onTouchEnd={handleLabelTouchEnd}
                        sx={{
                          fontSize: '0.875rem',
                          color: 'rgba(255,255,255,0.9)',
                          fontWeight: 500,
                          cursor: 'pointer',
                          userSelect: 'none',
                          WebkitTapHighlightColor: 'transparent',
                          touchAction: 'manipulation',
                          minWidth: 60,
                          '&:hover': {
                            color: 'white'
                          }
                        }}
                      >
                        {currentLabel}
                      </Typography>
                    )}
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                      <Select
                        id={`team-select-${index}`}
                        name={`team-${index}`}
                        value={team}
                        onChange={(e) => handleTeamChange(index, e.target.value)}
                        sx={{
                          color: 'white',
                          bgcolor: teamColors[index % teamColors.length],
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'transparent'
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(255,255,255,0.3)'
                          },
                          '& .MuiSvgIcon-root': {
                            color: 'white'
                          }
                        }}
                      >
                        {teamOptions.map(option => (
                          <MenuItem key={option} value={option}>{option}</MenuItem>
                        ))}
                        <MenuItem value="__DELETE__" sx={{ color: '#f44336' }}>
                          삭제
                        </MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                );
              })}
              {teamOptions.length > 0 && teamOptions.some(team => !selectedTeams.includes(team)) && (
                <Button
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={handleAddTeam}
                  sx={{
                    color: 'white',
                    borderColor: 'rgba(255,255,255,0.3)',
                    '&:hover': { borderColor: 'rgba(255,255,255,0.5)' },
                    flexShrink: 0
                  }}
                >
                  추가
                </Button>
              )}
            </Box>

            {/* 전체 진행율 */}
              <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', fontWeight: 500 }}>
                  전체 진행율
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    id="overall-progress-input"
                    name="overallProgress"
                    label="진행율"
                    type="number"
                            size="small"
                    value={overallProgress}
                    onChange={(e) => setOverallProgress(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                    inputProps={{ min: 0, max: 100 }}
                    autoComplete="off"
                    sx={{
                      width: 80,
                      '& .MuiInputBase-input': { color: 'white', textAlign: 'center' },
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' }
                      },
                      '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' }
                    }}
                  />
                  <Typography variant="body2">%</Typography>
                </Box>
              </Box>
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: 24,
                  bgcolor: 'rgba(255,255,255,0.1)',
                  borderRadius: 1,
                  cursor: 'pointer',
                  userSelect: 'none',
                  touchAction: 'none'
                }}
                onMouseDown={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
                  setOverallProgress(Math.round(percent));
                  
                  const handleMouseMove = (moveEvent) => {
                    const newX = moveEvent.clientX - rect.left;
                    const newPercent = Math.max(0, Math.min(100, (newX / rect.width) * 100));
                    setOverallProgress(Math.round(newPercent));
                  };
                  
                  const handleMouseUp = () => {
                    window.removeEventListener('mousemove', handleMouseMove);
                    window.removeEventListener('mouseup', handleMouseUp);
                  };
                  
                  window.addEventListener('mousemove', handleMouseMove);
                  window.addEventListener('mouseup', handleMouseUp);
                }}
                onTouchStart={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const touch = e.touches[0];
                  const x = touch.clientX - rect.left;
                  const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
                  setOverallProgress(Math.round(percent));
                  
                  const handleTouchMove = (moveEvent) => {
                    const newTouch = moveEvent.touches[0];
                    const newX = newTouch.clientX - rect.left;
                    const newPercent = Math.max(0, Math.min(100, (newX / rect.width) * 100));
                    setOverallProgress(Math.round(newPercent));
                  };
                  
                  const handleTouchEnd = () => {
                    window.removeEventListener('touchmove', handleTouchMove);
                    window.removeEventListener('touchend', handleTouchEnd);
                  };
                  
                  window.addEventListener('touchmove', handleTouchMove);
                  window.addEventListener('touchend', handleTouchEnd);
                }}
              >
                <LinearProgress 
                  variant="determinate" 
                  value={overallProgress}
                  sx={{
                    height: 24,
                    borderRadius: 1,
                    bgcolor: 'transparent',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: '#43e97b',
                      borderRadius: 1
                    }
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: `${overallProgress}%`,
                    transform: 'translate(-50%, -50%)',
                    width: 16,
                    height: 16,
                    bgcolor: '#43e97b',
                    borderRadius: '50%',
                    border: '2px solid white',
                    cursor: 'grab',
                    '&:active': {
                      cursor: 'grabbing'
                    }
                  }}
                />
                          </Box>
              {/* 진행 단계 텍스트 (비율: 0:1:1:7:1:0) */}
              <Box sx={{ position: 'relative', width: '100%', mt: 1, height: 20 }}>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'rgba(255,255,255,0.7)', 
                    fontSize: '0.7rem',
                    position: 'absolute',
                    left: '0%',
                    transform: 'translateX(0%)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  착공
                            </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'rgba(255,255,255,0.7)', 
                    fontSize: '0.7rem',
                    position: 'absolute',
                    left: '10%',
                    transform: 'translateX(-50%)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  자재승인
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'rgba(255,255,255,0.7)', 
                    fontSize: '0.7rem',
                    position: 'absolute',
                    left: '20%',
                    transform: 'translateX(-50%)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  자재발주
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'rgba(255,255,255,0.7)', 
                    fontSize: '0.7rem',
                    position: 'absolute',
                    left: '40%',
                    transform: 'translateX(-50%)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  시공
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'rgba(255,255,255,0.7)', 
                    fontSize: '0.7rem',
                    position: 'absolute',
                    left: '90%',
                    transform: 'translateX(-50%)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  보수
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'rgba(255,255,255,0.7)', 
                    fontSize: '0.7rem',
                    position: 'absolute',
                    left: '100%',
                    transform: 'translateX(-100%)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  준공
                              </Typography>
                            </Box>
              </Box>
            </Paper>
        </Grid>
          </Grid>

      {/* 둘째 줄: 간트차트 박스 */}
      <Grid container spacing={2} sx={{ mb: '5px', display: 'flex', alignItems: 'stretch' }}>
        <Grid item xs={12} sx={{ width: '100%', display: 'flex' }}>
            <Paper sx={{ 
              p: 3, 
              bgcolor: '#23242a',
            width: 'calc(100% + 16px)',
            ml: '-3px',
            mr: '-13px',
            overflowX: 'auto'
          }}>
            <Box sx={{ width: '100%', minWidth: '100%' }}>
              {/* 날짜 헤더 */}
              <Box sx={{ display: 'flex', mb: 1, width: '100%', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', gap: 1, width: 150, flexShrink: 0, pl: 1 }}>
                  <Typography
                    onClick={handleAddGanttItem}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      handleAddGanttItem();
                    }}
                    sx={{
                      fontSize: '0.75rem',
                      color: 'rgba(255,255,255,0.7)',
                      cursor: 'pointer',
                      userSelect: 'none',
                      WebkitTapHighlightColor: 'transparent',
                      touchAction: 'manipulation',
                      '&:hover': {
                        color: 'rgba(255,255,255,0.9)'
                      },
                      '&:active': {
                        color: 'rgba(255,255,255,1)'
                      }
                    }}
                  >
                    입력칸 추가
              </Typography>
                  {ganttItems.some(item => item.checked) && (
                    <Typography
                      onClick={handleDeleteCheckedGanttItems}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        handleDeleteCheckedGanttItems();
                      }}
                      sx={{
                        fontSize: '0.75rem',
                        color: '#f44336',
                        cursor: 'pointer',
                        userSelect: 'none',
                        WebkitTapHighlightColor: 'transparent',
                        touchAction: 'manipulation',
                        '&:hover': {
                          color: '#ff6b6b'
                        },
                        '&:active': {
                          color: '#d32f2f'
                        }
                      }}
                    >
                      삭제
                </Typography>
                  )}
              </Box>
                <Box sx={{ display: 'flex', flex: 1, pl: '10px' }}>
                  {dateRange.dates.length > 0 ? dateRange.dates.map((date, index) => {
                    const dateStr = date.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }).replace(/\./g, '/');
                    const widthPercent = 100 / dateRange.dates.length;
                    
                    return (
                      <Box
                        key={index}
                        sx={{
                          flex: `1 1 ${widthPercent}%`,
                          textAlign: 'center',
                          fontSize: '1rem',
                          color: 'rgba(255,255,255,0.7)',
                          minWidth: 0
                        }}
                      >
                        {dateStr}
                      </Box>
                    );
                  }) : (
                    <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
                      날짜 정보가 없습니다.
                        </Typography>
                  )}
                      </Box>
                    </Box>
              
              {/* 간트 차트 행들 */}
              <Box sx={{ width: '100%' }}>
                {ganttItems.map((item) => (
                  <Box 
                    key={item.id} 
                    sx={{ 
                      display: 'flex', 
                      mb: 0.3, 
                      alignItems: 'center', 
                      width: '100%',
                      cursor: 'default'
                    }}
                  >
                    {/* 왼쪽: 체크박스와 입력칸 */}
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 0.5, 
                        width: 180, 
                        flexShrink: 0,
                        cursor: 'default'
                      }}
                    >
                      <Box
                        onClick={(e) => {
                          e.stopPropagation();
                          setGanttItems(ganttItems.map(i => 
                            i.id === item.id ? { ...i, checked: !i.checked } : i
                          ));
                        }}
                        onTouchStart={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setGanttItems(ganttItems.map(i => 
                            i.id === item.id ? { ...i, checked: !i.checked } : i
                          ));
                        }}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          cursor: 'pointer',
                          userSelect: 'none',
                          WebkitTapHighlightColor: 'transparent',
                          touchAction: 'manipulation',
                          position: 'relative',
                          '&:hover': {
                            opacity: 0.8
                          }
                        }}
                      >
                        <Checkbox
                          id={`gantt-checkbox-${item.id}`}
                          name={`ganttCheckbox-${item.id}`}
                          checked={item.checked}
                          onChange={(e) => {
                            e.stopPropagation();
                            setGanttItems(ganttItems.map(i => 
                              i.id === item.id ? { ...i, checked: e.target.checked } : i
                            ));
                          }}
                          sx={{ 
                            color: 'white', 
                            p: 0.25,
                            cursor: 'pointer',
                            pointerEvents: 'auto',
                            '&:hover': {
                              bgcolor: 'rgba(255,255,255,0.1)'
                            }
                          }}
                          aria-label={`${item.label} 선택`}
                        />
                        <Typography
                          sx={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            fontSize: '0.6rem',
                            color: 'rgba(255,255,255,0.85)',
                            pointerEvents: 'none'
                          }}
                        >
                          {ganttItems.findIndex(i => i.id === item.id) + 1}
                        </Typography>
                      </Box>
                      <TextField
                        id={`gantt-item-label-${item.id}`}
                        name={`ganttItemLabel-${item.id}`}
                        size="small"
                        value={item.label}
                        onChange={(e) => {
                          if (!item.isGroupItem) {
                            handleGanttLabelChange(item.id, e.target.value);
                          }
                        }}
                        onFocus={(e) => {
                          if (!item.isGroupItem) {
                            e.target.select();
                          }
                        }}
                        autoComplete="off"
                        variant="standard"
                        inputProps={{ readOnly: Boolean(item.isGroupItem) }}
                        sx={{
                          flex: 1,
                          minWidth: 120,
                          '& .MuiInputBase-input': { 
                            color: 'white', 
                            fontSize: '1rem', 
                            py: 0.3,
                            px: 0.5,
                            cursor: item.isGroupItem ? 'default' : 'text'
                          },
                          '& .MuiInput-underline:before': {
                            borderBottom: 'none'
                          },
                          '& .MuiInput-underline:hover:before': {
                            borderBottom: 'none'
                          },
                          '& .MuiInput-underline:after': {
                            borderBottom: 'none'
                          }
                        }}
                      />
                    </Box>

                    {/* 오른쪽: 간트 바들 */}
                    <Box 
                      data-gantt-container
                      sx={{ 
                        flex: 1, 
                        position: 'relative', 
                        height: 28,
                        display: 'flex',
                        gap: 0.5,
                        alignItems: 'center',
                        width: 'calc(100% - 180px)',
                        minWidth: 0,
                        pl: '10px'
                      }}
                    >
                      {item.bars.map((bar, barIndex) => {
                        const startPercent = dateRange.daysDiff > 0 ? (bar.start / dateRange.daysDiff) * 100 : 0;
                        const widthPercent = dateRange.daysDiff > 0 ? ((bar.end - bar.start) / dateRange.daysDiff) * 100 : 0;
                        const isDragging = ganttDragState.isDragging && ganttDragState.itemId === item.id && ganttDragState.barIndex === barIndex;
                        const isResizing = ganttDragState.isResizing && ganttDragState.itemId === item.id && ganttDragState.barIndex === barIndex;
                        
                        return (
                          <Box
                            key={barIndex}
                            onMouseDown={(e) => {
                              // 리사이즈 핸들을 클릭한 경우가 아니면 드래그 시작
                              if (e.target === e.currentTarget || !e.target.closest('[data-resize-handle]')) {
                                handleGanttBarDragStart(e, item.id, barIndex);
                              }
                            }}
                            onTouchStart={(e) => {
                              if (e.touches.length > 0) {
                                handleGanttBarDragStart({ clientX: e.touches[0].clientX }, item.id, barIndex);
                              }
                            }}
                            onDoubleClick={() => handleEditGanttBar(item.id, barIndex)}
                            sx={{
                              position: 'absolute',
                              left: `${startPercent}%`,
                              width: `${widthPercent}%`,
                              height: 22,
                              bgcolor: bar.color,
                              borderRadius: 0.5,
                              cursor: isDragging ? 'grabbing' : 'grab',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              userSelect: 'none',
                              touchAction: 'none',
                              overflow: 'hidden',
                              '&:hover': {
                                opacity: 0.9
                              }
                            }}
                          >
                            {bar.label && (
                              <Typography
                                variant="caption"
                                sx={{
                                  color: 'white',
                                  fontSize: '0.7rem',
                                  fontWeight: 500,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  px: 0.5,
                                  zIndex: 1,
                                  pointerEvents: 'none'
                                }}
                              >
                                {bar.label}
                            </Typography>
                            )}
                            {/* 시작점 리사이즈 핸들 */}
                            <Box
                              data-resize-handle
                              onMouseDown={(e) => handleGanttBarResizeStart(e, item.id, barIndex, 'start')}
                              onTouchStart={(e) => {
                                e.preventDefault();
                                if (e.touches.length > 0) {
                                  handleGanttBarResizeStart({ clientX: e.touches[0].clientX }, item.id, barIndex, 'start');
                                }
                              }}
                              sx={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                width: 6,
                                height: '100%',
                                cursor: 'ew-resize',
                                bgcolor: 'rgba(255,255,255,0.3)',
                                borderRadius: '4px 0 0 4px',
                                zIndex: 10,
                                '&:hover': {
                                  bgcolor: 'rgba(255,255,255,0.5)',
                                  width: 8
                                }
                              }}
                            />
                            {/* 종료점 리사이즈 핸들 */}
                            <Box
                              data-resize-handle
                              onMouseDown={(e) => handleGanttBarResizeStart(e, item.id, barIndex, 'end')}
                              onTouchStart={(e) => {
                                e.preventDefault();
                                if (e.touches.length > 0) {
                                  handleGanttBarResizeStart({ clientX: e.touches[0].clientX }, item.id, barIndex, 'end');
                                }
                              }}
                              sx={{
                                position: 'absolute',
                                right: 0,
                                top: 0,
                                width: 6,
                                height: '100%',
                                cursor: 'ew-resize',
                                bgcolor: 'rgba(255,255,255,0.3)',
                                borderRadius: '0 4px 4px 0',
                                zIndex: 10,
                                '&:hover': {
                                  bgcolor: 'rgba(255,255,255,0.5)',
                                  width: 8
                                }
                              }}
                            />
                          </Box>
                        );
                      })}
                      <Button
                        size="small"
                        onClick={() => handleAddGanttBar(item.id)}
                        sx={{ 
                          color: 'white',
                          position: 'absolute',
                          left: '0px',
                          ml: '-10px',
                          minWidth: 'auto',
                          px: 1,
                          border: 'none',
                          '&:hover': {
                            border: 'none'
                          }
                        }}
                      >
                        +
                      </Button>
                    </Box>
                  </Box>
                ))}
              </Box>
              </Box>
            </Paper>
        </Grid>
          </Grid>

      {/* 셋째 줄: 사진박스, 메모박스 */}
      <Grid container spacing={2} sx={{ display: 'flex', alignItems: 'stretch', flexWrap: 'nowrap' }}>
        {/* 사진박스 */}
        <Grid item sx={{ display: 'flex', flex: '0 0 50%', maxWidth: '50%' }}>
            <Paper sx={{ 
              p: 3, 
              bgcolor: '#23242a',
            width: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Box sx={{ display: 'flex', gap: 2, flex: 1, alignItems: 'stretch' }}>
              {photos.map((photo) => (
                <Box
                  key={photo.id}
                  sx={{
                    flex: 1,
                    bgcolor: 'rgba(255,255,255,0.1)',
                    borderRadius: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: 0
                  }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    id={`photo-${photo.id}`}
                    onChange={(e) => handlePhotoUpload(photo.id, e)}
                  />
                  <label htmlFor={`photo-${photo.id}`} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    {photo.url ? (
                      <Box
                        component="img"
                        src={photo.url}
                        alt={photo.label}
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <>
                        <PhotoCamera sx={{ fontSize: 40, color: 'rgba(255,255,255,0.5)', mb: 1 }} />
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                          {photo.label}
                </Typography>
                      </>
                    )}
                  </label>
              </Box>
              ))}
            </Box>
            </Paper>
          </Grid>

        {/* 메모박스 */}
        <Grid item sx={{ display: 'flex', flex: '0 0 50%', maxWidth: '50%' }}>
            <Paper sx={{ 
              p: 3, 
              bgcolor: '#23242a',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            zIndex: 1
            }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              메모
              </Typography>
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <TextField
                id="memo-input"
                name="memo"
                label="메모"
                fullWidth
                multiline
                rows={8}
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="메모를 입력하세요..."
                autoComplete="off"
                      sx={{
                  flex: 1,
                  '& .MuiInputBase-input': { color: 'white' },
                  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                  '& .MuiOutlinedInput-root': {
                    zIndex: 1,
                    height: '100%',
                    '& textarea': {
                      height: '100% !important'
                    },
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' }
                  }
                }}
              />
            </Box>
            </Paper>
        </Grid>
          </Grid>

      {/* 진행율 막대 편집 다이얼로그 */}
      <Dialog
        open={editProgressDialog.open}
        onClose={() => setEditProgressDialog({ open: false, index: null })}
        PaperProps={{
          sx: { bgcolor: '#23242a', color: 'white' }
        }}
      >
        <DialogTitle>진행율 막대 편집</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 300, pt: 2 }}>
            <Box>
              <Typography gutterBottom>진행율: {editProgressData.value}%</Typography>
              <Slider
                value={editProgressData.value}
                onChange={(e, value) => setEditProgressData({ ...editProgressData, value })}
                min={0}
                max={100}
                sx={{ color: editProgressData.color }}
              />
            </Box>
            <Box>
              <Typography gutterBottom>색상</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {['#43e97b', '#f59e0b', '#60a5fa', '#ef4444', '#a855f7'].map(color => (
                  <Box
                    key={color}
                    onClick={() => setEditProgressData({ ...editProgressData, color })}
                      sx={{
                      width: 40,
                      height: 40,
                      bgcolor: color,
                      borderRadius: 1,
                      cursor: 'pointer',
                      border: editProgressData.color === color ? '2px solid white' : 'none'
                    }}
                  />
                ))}
              </Box>
              <TextField
                fullWidth
                size="small"
                value={editProgressData.color}
                onChange={(e) => setEditProgressData({ ...editProgressData, color: e.target.value })}
                placeholder="#43e97b"
                sx={{ mt: 1, '& .MuiInputBase-input': { color: 'white' } }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditProgressDialog({ open: false, index: null })} sx={{ color: 'white' }}>
            취소
          </Button>
          <Button onClick={handleSaveProgress} sx={{ color: '#43e97b' }}>
            저장
          </Button>
        </DialogActions>
      </Dialog>

      {/* 간트 바 편집 다이얼로그 */}
      <Dialog
        open={editGanttDialog.open}
        onClose={() => setEditGanttDialog({ open: false, itemId: null, barIndex: null })}
        PaperProps={{
          sx: { 
              bgcolor: '#23242a',
            color: 'white', 
            minWidth: 650,
            zIndex: 9999,
            position: 'relative'
          }
        }}
        sx={{
          zIndex: 9999,
          '& .MuiBackdrop-root': {
            zIndex: 9998
          }
        }}
      >
        <DialogTitle>간트 바 편집</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 600, pt: 2 }}>
            {/* 간트 바 미리보기 */}
            <Box>
              <Typography gutterBottom sx={{ mb: 2 }}>
                시작일: {editGanttData.start}일 / 종료일: {editGanttData.end}일 / 기간: {editGanttData.end - editGanttData.start}일
                </Typography>
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: 40,
                        bgcolor: 'rgba(255,255,255,0.1)',
                  borderRadius: 1,
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}
              >
                {/* 간트 바 미리보기 */}
                <Box
                  sx={{
                    position: 'absolute',
                    left: `${(editGanttData.start / (dateRange.daysDiff || 100)) * 100}%`,
                    width: `${((editGanttData.end - editGanttData.start) / (dateRange.daysDiff || 100)) * 100}%`,
                    height: 30,
                    top: 5,
                    bgcolor: editGanttData.color,
                    borderRadius: 0.5,
                        display: 'flex',
                        alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                  }}
                >
                  {editGanttData.label && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'white',
                        fontSize: '0.7rem',
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        px: 0.5
                      }}
                    >
                      {editGanttData.label}
                      </Typography>
                  )}
              </Box>
              </Box>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', mt: 1, display: 'block' }}>
                • 간트 차트에서 직접 드래그하여 이동하거나 양쪽 끝을 드래그하여 크기 조절 가능
                    </Typography>
                  </Box>
            <Box>
              <Typography gutterBottom id="gantt-start-label">시작일: {editGanttData.start}일</Typography>
              <Slider
                id="gantt-start-slider"
                name="ganttStart"
                aria-labelledby="gantt-start-label"
                value={editGanttData.start}
                onChange={(e, value) => setEditGanttData({ ...editGanttData, start: value })}
                min={0}
                max={dateRange.daysDiff || 100}
                sx={{ color: editGanttData.color }}
              />
            </Box>
            <Box>
              <Typography gutterBottom id="gantt-end-label">종료일: {editGanttData.end}일</Typography>
              <Slider
                id="gantt-end-slider"
                name="ganttEnd"
                aria-labelledby="gantt-end-label"
                value={editGanttData.end}
                onChange={(e, value) => setEditGanttData({ ...editGanttData, end: value })}
                min={editGanttData.start}
                max={dateRange.daysDiff || 100}
                sx={{ color: editGanttData.color }}
              />
            </Box>
            <Box>
              <Typography gutterBottom>색상</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {['#f59e0b', '#43e97b', '#60a5fa', '#ef4444', '#a855f7', '#10b981', '#f97316', '#8b5cf6', '#ec4899', '#06b6d4'].map(color => (
                  <Box
                    key={color}
                    onClick={() => setEditGanttData({ ...editGanttData, color })}
                    sx={{
                      width: 40,
                      height: 40,
                      bgcolor: color,
                      borderRadius: 1,
                      cursor: 'pointer',
                      border: editGanttData.color === color ? '2px solid white' : 'none'
                    }}
                  />
                ))}
              </Box>
              <TextField
                id="gantt-color-input"
                name="ganttColor"
                label="색상 코드"
                fullWidth
                size="small"
                value={editGanttData.color}
                onChange={(e) => setEditGanttData({ ...editGanttData, color: e.target.value })}
                placeholder="#f59e0b"
                autoComplete="off"
                sx={{ 
                  mt: 1, 
                  '& .MuiInputBase-input': { color: 'white' },
                  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' }
                }}
              />
            </Box>
            <Box>
              <Typography gutterBottom>텍스트</Typography>
              <TextField
                id="gantt-label-input"
                name="ganttLabel"
                label="간트바 텍스트"
                fullWidth
                size="small"
                value={editGanttData.label || ''}
                onChange={(e) => setEditGanttData({ ...editGanttData, label: e.target.value })}
                placeholder="간트바에 표시할 텍스트를 입력하세요"
                autoComplete="off"
                sx={{ 
                  '& .MuiInputBase-input': { color: 'white' },
                  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' }
                }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              if (editGanttDialog.itemId !== null && editGanttDialog.barIndex !== null) {
                handleRemoveGanttBar(editGanttDialog.itemId, editGanttDialog.barIndex);
                setEditGanttDialog({ open: false, itemId: null, barIndex: null });
              }
            }} 
            sx={{ color: '#f44336' }}
            startIcon={<Delete />}
          >
            삭제
          </Button>
          <Button onClick={() => setEditGanttDialog({ open: false, itemId: null, barIndex: null })} sx={{ color: 'white' }}>
            취소
          </Button>
          <Button onClick={handleSaveGanttBar} sx={{ color: '#43e97b' }}>
            저장
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
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

export default HyunjangSch;
