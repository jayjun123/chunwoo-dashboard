import React, { useState, useMemo, useEffect } from 'react';
import { Box, Typography, Button, TextField, IconButton, Paper, MenuItem, Checkbox, FormControlLabel, Autocomplete } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import CustomCalendar from '../CustomCalendar';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { collection, doc, query, onSnapshot, addDoc, updateDoc, deleteDoc, writeBatch, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import * as XLSX from 'xlsx';
import { exportCalendarToExcel, exportToExcel, exportScheduleToExcel } from '../../utils/excelUtils';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useNavigate } from 'react-router-dom';
import { subscribeToEstimates } from '../../api/estimates';
import SiteInfoPopup from '../common/SiteInfoPopup';

function isInMonth(site, year, month) {
  if (!site.startDate || !site.endDate) return false;
  const s = new Date(site.startDate);
  const e = new Date(site.endDate);
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  return !(e < first || s > last);
}

// 날짜 포맷 함수 (YYYY-MM-DD → 7월 4일(목) 일정)
function formatKoreanDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const week = ['일', '월', '화', '수', '목', '금', '토'];
  const dayOfWeek = week[date.getDay()];
  return `${month}월 ${day}일(${dayOfWeek}) 일정`;
}

// 견적 데이터를 일정으로 변환하는 함수
function convertEstimateToSchedule(estimate) {
  if (!estimate.submissionDeadline) return null;
  
  // 견적 상태에 따른 체크 상태 결정
  const isChecked = estimate.submissionStatus === '제출완료';
  
  // 타입에 따른 색상과 제목 결정
  let color, title;
  if (estimate.type === '입찰') {
    color = isChecked ? '#22c55e' : '#ef4444'; // 입찰: 체크되면 초록색, 아니면 빨간색
    title = estimate.siteName || estimate.company || '입찰';
  } else {
    color = isChecked ? '#22c55e' : '#f59e42'; // 견적: 체크되면 초록색, 아니면 주황색
    title = estimate.siteName || estimate.company || '견적';
  }
  
  return {
    id: `estimate_${estimate.id}`,
    title: title,
    text: title, // CustomCalendar에서 사용하는 text 필드 추가
    description: `${estimate.requester} - ${estimate.requestContent || (estimate.type === '입찰' ? '입찰요청' : '견적요청')}`,
    date: estimate.submissionDeadline,
    type: estimate.type || '견적',
    color: color,
    siteName: estimate.siteName,
    company: estimate.company,
    requester: estimate.requester,
    submissionStatus: estimate.submissionStatus,
    contractStatus: estimate.contractStatus,
    isEstimate: true, // 견적 데이터임을 표시
    estimateId: estimate.id, // 원본 견적 ID 저장
    checked: isChecked, // 체크 상태 추가
    estimateType: estimate.type || '견적' // 견적/입찰 타입 저장
  };
}

function convertBidToSchedule(schedule) {
  if (!schedule.date) return null;
  
  // 입찰 상태에 따른 체크 상태 결정
  const isChecked = schedule.bidStatus === '입찰완료';
  
  // 입찰 제목 설정
  const title = schedule.siteName || schedule.company || '입찰';
  
  return {
    ...schedule,
    id: `bid_${schedule.id}`, // 입찰 ID에 bid_ 접두사 추가
    title: title,
    text: title, // CustomCalendar에서 사용하는 text 필드 추가
    color: isChecked ? '#22c55e' : '#ef4444', // 체크되면 초록색, 아니면 빨간색
    checked: isChecked, // 체크 상태 추가
    isBid: true // 입찰 데이터임을 표시
  };
}

const ScheduleManagement = ({ 
  sites: propSites = [], 
  schedules: propSchedules = [], 
  onAddSchedule, 
  onEditSchedule, 
  onDeleteSchedule,
  viewMode: propViewMode = 'month',
  onDateClick,
  selectedSchedules,
  checkedSchedules,
  onCheckSchedule,
  onDeleteSelectedSchedules
}) => {

  const isMobile = useMediaQuery('(max-width:600px)');
  const authUser = useAuth();
  const navigate = useNavigate();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [viewMode, setViewMode] = useState(propViewMode);
  const [calendarItems, setCalendarItems] = useState({});
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupDate, setPopupDate] = useState('');
  const [popupTitle, setPopupTitle] = useState('');
  const [popupDesc, setPopupDesc] = useState('');
  const [popupType, setPopupType] = useState('');
  const [popupSiteName, setPopupSiteName] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [editPopup, setEditPopup] = useState({ open: false, item: null, date: null });
  const [sites, setSites] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [checkedItems, setCheckedItems] = useState({});
  const colorChoices = ['#3b82f6', '#22c55e', '#f59e42', '#ef4444', '#a855f7', '#eab308'];
  const [selectedColor, setSelectedColor] = useState(colorChoices[0]);
  const [showListPopup, setShowListPopup] = useState(false);
  const [listPopupDate, setListPopupDate] = useState('');
  const [editSchedule, setEditSchedule] = useState({ open: false, schedule: null });
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [siteSearchTerm, setSiteSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [estimates, setEstimates] = useState([]);
  
  // 현장 정보 팝업 상태
  const [siteInfoPopup, setSiteInfoPopup] = useState({ open: false, site: null });

  useEffect(() => {
    console.log('🔍 ScheduleManagement: 사이트 데이터 로딩 시작');
    console.log('🔍 현재 사용자:', authUser.currentUser);
    
    // props로 전달받은 sites가 있으면 사용, 없으면 기존 로직 사용
    if (propSites && propSites.length > 0) {
      console.log('🔍 props로 전달받은 사이트 사용:', propSites.length);
      setSites(propSites);
      return;
    }
    
    const q = query(collection(db, 'sites'));
    let unsubscribe = null;
    
    try {
      unsubscribe = onSnapshot(q, (snapshot) => {
        try {
          const sitesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          console.log('🔍 사이트 데이터 로드됨:', sitesData.length, '개');
          
          // 이전 상태와 비교하여 실제로 변경되었을 때만 업데이트
          setSites(prev => {
            const prevStr = JSON.stringify(prev);
            const newStr = JSON.stringify(sitesData);
            if (prevStr === newStr) {
              return prev; // 변경사항이 없으면 이전 상태 반환
            }
            return sitesData;
          });
        } catch (error) {
          console.error('사이트 데이터 처리 오류:', error);
          setSites([]);
        }
      }, (error) => {
        console.error('사이트 구독 오류:', error);
        setSites([]);
      });
    } catch (error) {
      console.error('사이트 구독 설정 오류:', error);
      setSites([]);
    }
    
    return () => {
      try {
        if (unsubscribe && typeof unsubscribe === 'function') {
          unsubscribe();
        }
      } catch (error) {
        console.error('사이트 구독 해제 오류:', error);
      }
    };
  }, [propSites?.length || 0]); // propSites.length만 의존성으로 사용 (기본값 0)

  // 견적 데이터 구독
  useEffect(() => {
    console.log('🔍 ScheduleManagement: 견적 데이터 로딩 시작');
    
    const unsubscribe = subscribeToEstimates((estimatesData) => {
      console.log('🔍 견적 데이터 로드됨:', estimatesData.length, '개');
      console.log('🔍 견적 데이터 전체:', estimatesData);
      
      // 견적 데이터의 구조 확인
      if (estimatesData.length > 0) {
        console.log('🔍 견적 데이터 샘플:', estimatesData[0]);
        console.log('🔍 견적 데이터 필드 확인:', {
          id: estimatesData[0].id,
          siteName: estimatesData[0].siteName,
          company: estimatesData[0].company,
          submissionDeadline: estimatesData[0].submissionDeadline,
          requester: estimatesData[0].requester,
          requestContent: estimatesData[0].requestContent,
          type: estimatesData[0].type,
          submissionStatus: estimatesData[0].submissionStatus,
          updatedAt: estimatesData[0].updatedAt
        });
        
        // 타입별 분류 확인
        const estimates = estimatesData.filter(e => e.type !== '입찰');
        const bids = estimatesData.filter(e => e.type === '입찰');
        console.log('🔍 타입별 분류:', {
          전체: estimatesData.length,
          견적: estimates.length,
          입찰: bids.length
        });
      }
      
      setEstimates(estimatesData);
    });

    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        console.log('🔍 ScheduleManagement: 견적 데이터 구독 해제');
        unsubscribe();
      }
    };
  }, []);

  // 인증 상태와 로딩 상태를 모두 고려한 일정 데이터 로딩
  useEffect(() => {
    const user = authUser.currentUser;
    const authLoading = authUser.loading;
    
    console.log('🔍 ScheduleManagement: 일정 데이터 로딩 시작');
    console.log('🔍 현재 사용자:', user);
    console.log('🔍 인증 로딩 상태:', authLoading);
    
    // 로딩 중이거나 사용자가 없으면 데이터 초기화
    if (authLoading || !user) {
      console.log('🔍 사용자가 로그인하지 않음 또는 로딩 중 - 일정 데이터 초기화');
      setCalendarItems({});
      setCheckedItems({});
      setLoading(false);
      return;
    }

    console.log('🔍 일정 데이터 구독 시작 - 사용자:', user.uid);

    const schedulesQuery = query(collection(db, 'schedules'));
    let unsubscribe = null;
    let checksUnsubscribe = null;
    
    try {
      unsubscribe = onSnapshot(schedulesQuery, async (snapshot) => {
        try {
          const schedulesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          console.log('🔍 PC 일정 데이터 로드 완료:', schedulesData.length, '개');
          
          // 날짜별로 일정을 그룹화하고 입력순서대로 정렬
          const newCalendarItems = {};
          
          // 기존 일정 데이터 처리
          schedulesData.forEach(schedule => {
            if (!schedule.date) {
              console.log('날짜가 없는 일정:', schedule);
              return;
            }
            
            let dateStr;
            if (schedule.date.toDate) {
              // Firestore Timestamp인 경우
              const date = schedule.date.toDate();
              dateStr = date.toISOString().slice(0, 10);
            } else if (schedule.date instanceof Date) {
              // JavaScript Date인 경우
              dateStr = schedule.date.toISOString().slice(0, 10);
            } else {
              // 문자열인 경우
              dateStr = schedule.date;
            }
            
            // 입찰 항목 변환
            if (schedule.type === '입찰') {
              const bidSchedule = convertBidToSchedule(schedule);
              if (bidSchedule) {
                if (!newCalendarItems[dateStr]) {
                  newCalendarItems[dateStr] = [];
                }
                newCalendarItems[dateStr].push(bidSchedule);
              }
            } else {
              if (!newCalendarItems[dateStr]) {
                newCalendarItems[dateStr] = [];
              }
              newCalendarItems[dateStr].push(schedule);
            }
          });
          
          // 견적 데이터를 일정으로 변환하여 추가
          console.log('🔍 견적 데이터 변환 시작, 개수:', estimates.length);
          estimates.forEach(estimate => {
            console.log('🔍 견적 변환 중:', estimate);
            const schedule = convertEstimateToSchedule(estimate);
            if (schedule) {
              console.log('🔍 변환된 일정:', schedule);
              let dateStr;
              if (schedule.date.toDate) {
                // Firestore Timestamp인 경우
                const date = schedule.date.toDate();
                dateStr = date.toISOString().slice(0, 10);
              } else if (schedule.date instanceof Date) {
                // JavaScript Date인 경우
                dateStr = schedule.date.toISOString().slice(0, 10);
              } else {
                // 문자열인 경우
                dateStr = schedule.date;
              }
              
              console.log('🔍 견적 일정 날짜:', dateStr);
              if (!newCalendarItems[dateStr]) {
                newCalendarItems[dateStr] = [];
              }
              newCalendarItems[dateStr].push(schedule);
              console.log('🔍 견적 일정 추가됨:', schedule.title, '날짜:', dateStr);
            } else {
              console.log('🔍 견적 변환 실패:', estimate);
            }
          });
          
          // 각 날짜별로 입력순서대로 정렬 (createdAt 기준)
          Object.keys(newCalendarItems).forEach(dateStr => {
            newCalendarItems[dateStr].sort((a, b) => {
              const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 
                           a.createdAt?.getTime ? a.createdAt.getTime() : 
                           new Date(a.createdAt).getTime();
              const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 
                           b.createdAt?.getTime ? b.createdAt.getTime() : 
                           new Date(b.createdAt).getTime();
              return aTime - bTime; // 오름차순 (먼저 입력된 것이 위에)
            });
          });
          
          console.log('PC 달력 아이템 업데이트 완료:', Object.keys(newCalendarItems).length, '개 날짜');
          setCalendarItems(newCalendarItems);
          setLoading(false);
        } catch (error) {
          console.error('일정 데이터 처리 오류:', error);
          setCalendarItems({});
          setLoading(false);
        }
      }, (error) => {
        console.error('일정 구독 오류:', error);
        setCalendarItems({});
        setLoading(false);
      });

      // 체크 상태 실시간 구독
      const checksQuery = query(
        collection(db, 'scheduleChecks'),
        where('userId', '==', user.uid)
      );
      
      checksUnsubscribe = onSnapshot(checksQuery, (checksSnapshot) => {
        try {
          const newCheckedItems = {};
          
          checksSnapshot.docs.forEach(doc => {
            const checkData = doc.data();
            if (checkData.date && checkData.scheduleId) {
              const key = `${checkData.date}-${checkData.scheduleId}`;
              newCheckedItems[key] = checkData.checked;
            }
          });
          
          setCheckedItems(newCheckedItems);
          console.log('PC 체크 상태 실시간 업데이트:', Object.keys(newCheckedItems).length, '개 항목');
        } catch (error) {
          console.error('체크 상태 처리 오류:', error);
        }
      }, (error) => {
        console.error('체크 상태 구독 오류:', error);
      });
    } catch (error) {
      console.error('구독 설정 오류:', error);
      setCalendarItems({});
      setCheckedItems({});
      setLoading(false);
    }
    
    return () => {
      try {
        if (unsubscribe && typeof unsubscribe === 'function') {
          unsubscribe();
        }
        if (checksUnsubscribe && typeof checksUnsubscribe === 'function') {
          checksUnsubscribe();
        }
      } catch (error) {
        console.error('구독 해제 오류:', error);
      }
    };
  }, [authUser.currentUser, authUser.loading, estimates]); // 견적 데이터도 의존성에 추가

  const filteredSites = useMemo(() => {
    const monthFiltered = sites.filter(site => isInMonth(site, year, month));
    let searchFiltered = monthFiltered;
    
    if (siteSearchTerm) {
      searchFiltered = monthFiltered.filter(site => 
        site.name && site.name.toLowerCase().includes(siteSearchTerm.toLowerCase())
      );
    }
    
    // 정렬 로직: 1순위 - 상태별 정렬 (진행중 → 예정 → 완료), 2순위 - 가나다순
    return searchFiltered.sort((a, b) => {
      // 상태별 우선순위 정의
      const statusPriority = {
        '진행중': 1,
        '예정': 2,
        '완료': 3
      };
      
      // 1순위: 상태별 정렬
      const aStatus = a.status || '';
      const bStatus = b.status || '';
      const aPriority = statusPriority[aStatus] || 999; // 상태가 없으면 맨 뒤로
      const bPriority = statusPriority[bStatus] || 999;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // 2순위: 가나다순 정렬
      const aName = a.name || '';
      const bName = b.name || '';
      return aName.localeCompare(bName, 'ko');
    });
  }, [sites, year, month, siteSearchTerm]);

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    const user = authUser.currentUser;
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (source.droppableId === 'siteList' && destination.droppableId.startsWith('20')) {
      const site = filteredSites[source.index];
      if (!site) return;
      const itemsOnDate = calendarItems[destination.droppableId] || [];
      const isDuplicate = itemsOnDate.some(item => item.text === site.name && item.siteId === site.id);
      if (isDuplicate) {
        alert('같은 날짜에 같은 현장명과 제목으로 이미 등록된 일정이 있습니다.');
        return;
      }
      const newItem = {
        text: site.name,
        type: '현장', // 무조건 현장으로 설정
        desc: '', // 설명을 빈 문자열로 설정 (자동 생성 방지)
        siteId: site.id,
        date: new Date(destination.droppableId + 'T12:00:00'), // Date 객체로 변환
        userId: user.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
        siteName: site.name,
      };
      try {
        if (onAddSchedule) {
          // 부모 컴포넌트에서 전달받은 함수 사용
          await onAddSchedule(newItem);
        } else {
          // 기존 로직 사용
          await addDoc(collection(db, 'schedules'), newItem);
        }
      } catch (error) {
        alert('일정 추가에 실패했습니다.');
      }
    } else if (source.droppableId !== destination.droppableId) {
      // 드래그앤드롭으로 날짜 이동 시 중복 체크
      const movedItem = (calendarItems[source.droppableId] || [])[source.index];
      const itemsOnDate = calendarItems[destination.droppableId] || [];
      const isDuplicate = itemsOnDate.some(item => item.text === movedItem.text && item.siteId === movedItem.siteId);
      if (isDuplicate) {
        alert('같은 날짜에 같은 현장명과 제목으로 이미 등록된 일정이 있습니다.');
        return;
      }
      // 실시간 구독으로 인해 Optimistic-UI 제거 - Firestore 업데이트만 수행

      try {
        const itemId = draggableId.split('-').pop();
        const docRef = doc(db, 'schedules', itemId);
        await updateDoc(docRef, {
          date: new Date(destination.droppableId + 'T12:00:00'), // Date 객체로 변환
          updatedAt: new Date()
        });
      } catch (error) {
        console.error('Failed to update schedule date', error);
        // 에러 발생 시 원래 상태로 복구 (UI 복잡성으로 인해 생략, 필요시 추가)
        alert('일정 이동에 실패했습니다.');
      }
    } else {
      // 같은 날짜 내에서 순서 변경 - Firestore에서는 순서를 관리하지 않으므로 DB 업데이트 불필요
      // 실시간 구독으로 인해 UI 업데이트도 제거
    }
  };

  const handleOpenPopup = (dateStr) => {
    if (!dateStr) return;
    if (isMobile) {
      // 모바일에서는 CustomCalendar의 팝업을 사용
      return;
    }
    setPopupOpen(true);
    setPopupDate(dateStr);
    setPopupTitle('');
    setPopupType('');
    setPopupDesc('');
  };

  const handleClosePopup = () => {
    setPopupOpen(false);
    setPopupTitle('');
    setPopupDesc('');
    setPopupSiteName('');
    setSelectedTypes([]);
  };

  const handleAddSchedule = async () => {
    if ((!popupTitle.trim() && !popupSiteName.trim()) || selectedTypes.length === 0) return;
    const user = authUser.currentUser;
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }
    
    // 한국 시간대로 날짜 생성 (시간대 문제 해결)
    const koreanDate = new Date(popupDate + 'T12:00:00'); // 정오로 설정하여 시간대 차이 방지
    
    const scheduleData = {
      text: popupTitle || popupSiteName,
      type: selectedTypes.join(', '),
      desc: popupDesc,
      date: koreanDate,
      userId: user.uid,
      color: selectedColor,
      siteName: popupSiteName,
      createdAt: new Date()
    };
    
    try {
      if (onAddSchedule) {
        // 부모 컴포넌트에서 전달받은 함수 사용
        await onAddSchedule(scheduleData);
      } else {
        // 기존 로직 사용
        await addDoc(collection(db, 'schedules'), scheduleData);
      }
      setPopupOpen(false);
      setPopupTitle('');
      setPopupDesc('');
      setPopupSiteName('');
      setSelectedTypes([]);
      
      // 모바일에서 일정 추가 후 선택된 날짜의 일정 목록 새로고침
      if (isMobile && selectedDate && selectedDate === popupDate && onDateClick) {
        onDateClick(selectedDate);
      }
    } catch (error) {
      console.error('일정 추가 실패:', error);
    }
  };

  const handleItemClick = (date, id) => {
    const items = calendarItems[date] || [];
    const item = items.find(item => item.id === id);
    
    // 견적 일정인 경우 클릭으로는 이동하지 않음 (더블클릭으로만 이동)
    if (item && item.isEstimate) {
      return;
    }
    
    // 견적 일정이 아닌 경우에만 선택 상태 토글 (삭제용)
    if (!item || !item.isEstimate) {
      setSelectedItems(prev => {
        const exists = prev.find(sel => sel.date === date && sel.id === id && sel.type !== 'site');
        if (exists) {
          return prev.filter(sel => !(sel.date === date && sel.id === id && sel.type !== 'site'));
        }
        return [...prev, { date, id, type: 'schedule' }];
      });
    }
  };

  const handleItemDoubleClick = (date, item) => {
    // 견적 일정인 경우 견적 페이지로 이동
    if (item && item.isEstimate) {
      navigate('/estimates');
      return;
    }
    
    // 견적 일정이 아닌 경우 편집 팝업 열기
    setEditPopup({ open: true, item, date });
  };

  let touchTimer;
  const handleItemTouchStart = (date, item) => {
    touchTimer = setTimeout(() => {
      handleItemDoubleClick(date, item);
    }, 600);
  };

  const handleItemTouchEnd = () => clearTimeout(touchTimer);

  // ESC 키를 눌렀을 때 선택된 항목들을 모두 해제
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSelectedItems([]);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleDeleteSelected = async () => {
    if (selectedItems.length === 0) return;
    
    // 견적 일정이 선택되었는지 확인
    const hasEstimateItems = selectedItems.some(item => {
      const items = calendarItems[item.date] || [];
      const scheduleItem = items.find(schedule => schedule.id === item.id);
      return scheduleItem && scheduleItem.isEstimate;
    });
    
    if (hasEstimateItems) {
      alert('견적 일정은 견적 페이지에서 관리해주세요.');
      return;
    }
    
    const siteItems = selectedItems.filter(item => item.type === 'site');
    const scheduleItems = selectedItems.filter(item => item.type !== 'site');
    
    let confirmMessage = '';
    if (siteItems.length > 0 && scheduleItems.length > 0) {
      confirmMessage = `선택된 현장 ${siteItems.length}개와 일정 ${scheduleItems.length}개를 삭제하시겠습니까?`;
    } else if (siteItems.length > 0) {
      confirmMessage = `선택된 현장 ${siteItems.length}개를 삭제하시겠습니까?`;
    } else if (scheduleItems.length > 0) {
      confirmMessage = `선택된 일정 ${scheduleItems.length}개를 삭제하시겠습니까?`;
    }
    
    if (!window.confirm(confirmMessage)) return;
    
    try {
      const batch = writeBatch(db);
      
      // 일정 삭제
      scheduleItems.forEach(item => {
        // 입찰 일정인 경우 원본 ID로 삭제
        let scheduleId = item.id;
        if (item.id.startsWith('bid_')) {
          scheduleId = item.id.replace('bid_', '');
        }
        const docRef = doc(db, 'schedules', scheduleId);
        batch.delete(docRef);
      });
      
      // 현장 삭제
      siteItems.forEach(item => {
        const docRef = doc(db, 'sites', item.id);
        batch.delete(docRef);
      });
      
      await batch.commit();
      setSelectedItems([]);
      
      if (onDeleteSelectedSchedules) {
        onDeleteSelectedSchedules(selectedItems);
      }
    } catch (error) {
      console.error('삭제 실패:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  // 일정 설명 필드 정리 함수
  const cleanupScheduleDescriptions = async () => {
    try {
      console.log('🧹 일정 설명 필드 정리 시작...');
      
      // schedules 컬렉션에서 모든 일정 데이터 가져오기
      const schedulesSnapshot = await getDocs(collection(db, 'schedules'));
      const schedules = schedulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      console.log(`📊 총 ${schedules.length}개 일정 발견`);
      
      let updatedCount = 0;
      let skippedCount = 0;
      
      for (const schedule of schedules) {
        console.log(`🔍 일정 처리 중: ${schedule.text} (${schedule.id})`);
        
        // 설명 필드가 있고, 현장명과 동일하거나 자동 생성된 패턴인지 확인
        if (schedule.desc) {
          const desc = schedule.desc.toString().trim();
          const text = schedule.text.toString().trim();
          
          // 자동 생성된 설명 패턴들
          const autoGeneratedPatterns = [
            text, // 현장명과 동일
            `${text} - 진행중`,
            `${text} - 진행`,
            `${text} - 예정`,
            `${text} - 완료`,
            `${text} - 미정`,
            text.replace(/\s+/g, ''), // 공백 제거된 현장명
            text.split(' ')[0], // 현장명의 첫 번째 단어
          ];
          
          const isAutoGenerated = autoGeneratedPatterns.some(pattern => 
            desc === pattern || desc.includes(pattern)
          );
          
          if (isAutoGenerated) {
            try {
              // 설명 필드 제거
              await updateDoc(doc(db, 'schedules', schedule.id), {
                desc: '',
                updatedAt: new Date()
              });
              
              console.log(`  ✅ 자동 생성된 설명 제거: "${desc}"`);
              updatedCount++;
              
            } catch (error) {
              console.error(`  ❌ 설명 제거 실패: ${schedule.text}`, error);
            }
          } else {
            console.log(`  ⏭️ 수동 입력된 설명 유지: "${desc}"`);
            skippedCount++;
          }
        } else {
          console.log(`  ⏭️ 설명 필드 없음`);
          skippedCount++;
        }
      }
      
      console.log('🎉 일정 설명 필드 정리 완료!');
      console.log(`📊 결과:`);
      console.log(`  - 자동 생성된 설명 제거: ${updatedCount}개`);
      console.log(`  - 수동 입력된 설명 유지: ${skippedCount}개`);
      console.log(`  - 총 처리된 일정: ${updatedCount + skippedCount}개`);
      
      alert(`일정 설명 필드 정리 완료!\n- 자동 생성된 설명 제거: ${updatedCount}개\n- 수동 입력된 설명 유지: ${skippedCount}개`);
      
      return {
        success: true,
        updatedCount,
        skippedCount,
        totalCount: schedules.length
      };
      
    } catch (error) {
      console.error('❌ 일정 설명 필드 정리 실패:', error);
      alert('일정 설명 필드 정리 중 오류가 발생했습니다: ' + error.message);
      throw error;
    }
  };

  // 전역 함수로 등록 (브라우저 콘솔에서 실행 가능)
  useEffect(() => {
    window.cleanupScheduleDescriptions = cleanupScheduleDescriptions;
    console.log('🧹 cleanupScheduleDescriptions 함수가 전역에 등록되었습니다.');
    console.log('사용법: cleanupScheduleDescriptions()');
  }, []);

  const handleDeleteItem = async (date, itemId) => {
    const items = calendarItems[date] || [];
    const item = items.find(item => item.id === itemId);
    
    // 견적 일정은 삭제 불가
    if (item && item.isEstimate) {
      alert('견적 일정은 견적 페이지에서 관리해주세요.');
      return;
    }
    
    if (!window.confirm('이 일정을 삭제하시겠습니까?')) return;
    
    try {
      // 입찰 일정인 경우 원본 ID로 삭제
      let scheduleId = itemId;
      if (itemId.startsWith('bid_')) {
        scheduleId = itemId.replace('bid_', '');
      }
      
      if (onDeleteSchedule) {
        await onDeleteSchedule(scheduleId);
      } else {
        await deleteDoc(doc(db, 'schedules', scheduleId));
      }
    } catch (error) {
      console.error('일정 삭제 실패:', error);
      alert('일정 삭제에 실패했습니다.');
    }
  };

  const handleEditSave = async () => {
    if (!editPopup.item || (!editPopup.item.text?.trim() && !editPopup.item.siteName?.trim())) return;
    
    try {
      const updateData = {
        text: editPopup.item.text,
        type: editPopup.item.type,
        desc: editPopup.item.desc,
        updatedAt: new Date()
      };
      
      if (onEditSchedule) {
        await onEditSchedule(editPopup.item.id, updateData);
      } else {
        await updateDoc(doc(db, 'schedules', editPopup.item.id), updateData);
      }
      
      setEditPopup({ open: false, item: null, date: null });
    } catch (error) {
      console.error('일정 수정 실패:', error);
      alert('일정 수정에 실패했습니다.');
    }
  };

  const handleTypeChange = (type) => {
    if (selectedTypes.includes(type)) {
      setSelectedTypes(selectedTypes.filter(t => t !== type));
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  };

  const handleEditTypeChange = (type) => {
    if (!editPopup.item) return;
    setEditPopup(prev => ({
      ...prev,
      item: { ...prev.item, type }
    }));
  };

  const handleExcel = () => {
    // PC에서만 엑셀 다운로드 가능
    if (isMobile) {
      alert('PC에서만 엑셀 다운로드가 가능합니다.');
      return;
    }
    
    // 현재 월의 첫날과 마지막날 계산
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // 월별 데이터 정리
    const monthlyData = [];
    let currentDate = null;
    let currentDateStr = '';
    
    // 날짜별로 정렬된 데이터 생성
    const sortedEntries = Object.entries(calendarItems)
      .filter(([date]) => {
        const itemDate = new Date(date);
        return itemDate >= firstDay && itemDate <= lastDay;
      })
      .sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB));
    
    sortedEntries.forEach(([date, items]) => {
      items.forEach((item, index) => {
        const dateStr = date;
        
        // 같은 날짜인 경우 첫 번째 항목에만 날짜 표시
        if (dateStr !== currentDateStr) {
          currentDateStr = dateStr;
          currentDate = dateStr;
        } else {
          currentDate = ''; // 같은 날짜의 두 번째 항목부터는 빈 문자열
        }
        
        monthlyData.push({
          일자: currentDate,
          분류: item.type || '현장',
          현장명: item.text || '',
          설명: item.desc || '',
          체크박스유무: checkedItems[`${date}-${item.id}`] ? '체크' : '미체크'
        });
      });
    });
    
    // 파일명에 월 정보 포함
    const monthStr = `${year}년 ${month + 1}월`;
    const fileName = `일정관리_${monthStr}`;
    
    // 새로운 스타일링이 적용된 함수 사용
    exportScheduleToExcel(monthlyData, fileName);
  };

  const handleCheckItem = async (date, id, checked) => {
    const user = authUser.currentUser;
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    const checkKey = `${date}-${id}`;
    console.log('PC 체크박스 변경 시작:', { date, id, checked, checkKey });
    
    try {
      // 즉시 로컬 상태 업데이트 (Optimistic Update)
      setCheckedItems(prev => {
        const newState = {
          ...prev,
          [checkKey]: checked
        };
        console.log('PC 로컬 상태 업데이트:', newState);
        return newState;
      });

      // 견적 항목인지 확인하고 견적 상태 업데이트
      if (id.startsWith('estimate_')) {
        const estimateId = id.replace('estimate_', '');
        console.log('견적 항목 체크 - 견적 ID:', estimateId, '체크 상태:', checked);
        
        // 견적 상태 업데이트
        const estimateRef = doc(db, 'estimates', estimateId);
        await updateDoc(estimateRef, {
          submissionStatus: checked ? '제출완료' : '제출대기',
          updatedAt: new Date()
        });
        console.log('견적 상태 업데이트 완료:', estimateId, checked ? '제출완료' : '제출대기');
      }
      
      // 입찰 항목인지 확인하고 입찰 상태 업데이트
      if (id.startsWith('bid_')) {
        const bidId = id.replace('bid_', '');
        console.log('입찰 항목 체크 - 입찰 ID:', bidId, '체크 상태:', checked);
        
        // 입찰 상태 업데이트
        const scheduleRef = doc(db, 'schedules', bidId);
        await updateDoc(scheduleRef, {
          bidStatus: checked ? '입찰완료' : '입찰대기',
          updatedAt: new Date()
        });
        console.log('입찰 상태 업데이트 완료:', bidId, checked ? '입찰완료' : '입찰대기');
      }

      // 일반 일정 항목인지 확인하고 completed 상태 업데이트
      if (!id.startsWith('estimate_') && !id.startsWith('bid_')) {
        console.log('일반 일정 항목 체크 - 일정 ID:', id, '체크 상태:', checked);
        
        // 일정 상태 업데이트
        const scheduleRef = doc(db, 'schedules', id);
        await updateDoc(scheduleRef, {
          completed: checked,
          updatedAt: new Date()
        });
        console.log('일정 상태 업데이트 완료:', id, checked ? '완료' : '미완료');
      }

      // Firestore에 체크 상태 저장
      const checkData = {
        scheduleId: id,
        date: date,
        checked: checked,
        userId: user.uid,
        updatedAt: new Date()
      };

      console.log('PC Firestore 저장 데이터:', checkData);

      // 기존 체크 데이터가 있는지 확인
      const existingCheckQuery = query(
        collection(db, 'scheduleChecks'),
        where('scheduleId', '==', id),
        where('date', '==', date),
        where('userId', '==', user.uid)
      );
      
      const existingCheckSnapshot = await getDocs(existingCheckQuery);
      console.log('PC 기존 체크 데이터 조회 결과:', existingCheckSnapshot.docs.length);
      
      if (existingCheckSnapshot.docs.length > 0) {
        // 기존 데이터 업데이트
        const existingDoc = existingCheckSnapshot.docs[0];
        await updateDoc(doc(db, 'scheduleChecks', existingDoc.id), {
          checked: checked,
          updatedAt: new Date()
        });
        console.log('PC 체크 상태 업데이트 완료:', checkKey, checked);
      } else {
        // 새 데이터 추가
        const newDocRef = await addDoc(collection(db, 'scheduleChecks'), checkData);
        console.log('PC 체크 상태 추가 완료:', checkKey, checked, '문서 ID:', newDocRef.id);
      }
    } catch (error) {
      console.error('PC 체크 상태 저장 실패:', error);
      console.error('PC 에러 상세:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      
      // 실패 시 로컬 상태 롤백
      setCheckedItems(prev => {
        const newState = {
          ...prev,
          [checkKey]: !checked
        };
        console.log('PC 실패로 인한 상태 롤백:', newState);
        return newState;
      });
      
      // 사용자에게 알림 (개발 중에는 상세 정보 포함)
      if (process.env.NODE_ENV === 'development') {
        alert(`PC 체크 상태 저장에 실패했습니다.\n에러: ${error.message}\n코드: ${error.code}`);
      } else {
        alert('체크 상태 저장에 실패했습니다. 잠시 후 다시 시도해주세요.');
      }
    }
  };

  const handleDateClick = (dateStr) => {
    setSelectedDate(dateStr);
    if (onDateClick) {
      onDateClick(dateStr);
    }
  };

  const handleViewModeChange = (event, newViewMode) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
    }
  };

  const handleShowListPopup = (dateStr) => { 
    setShowListPopup(true); 
    setListPopupDate(dateStr); 
  };
  const handleCloseListPopup = () => { setShowListPopup(false); setListPopupDate(''); };
  
  // 현장 더블클릭 핸들러
  const handleSiteDoubleClick = (site) => {
    setSiteInfoPopup({ open: true, site });
  };
  
  // 현장 정보 팝업 닫기
  const handleCloseSiteInfoPopup = () => {
    setSiteInfoPopup({ open: false, site: null });
  };

  return (
    <Box sx={{ 
      p: 0, 
      height: isMobile ? 'calc(100vh - 120px)' : 'calc(100vh - 4px)', // PC에서 4px로 고정
      width: '100%',
      mx: 0,
      px: 0,
      margin: 0,
      padding: 0,
      position: 'fixed',
      top: isMobile ? '60px' : '60px', // PC에서 60px로 변경
      left: 0,
      right: 0,
      bottom: '160px', // 화면 크기 160px 줄임 (100px + 60px)
      overflow: isMobile ? 'hidden' : 'auto',
      bgcolor: '#23242a',
      zIndex: 1
    }}>
      {loading && (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '200px',
          color: 'white',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000
        }}>
          <Typography>일정을 불러오는 중...</Typography>
        </Box>
      )}


      <DragDropContext onDragEnd={onDragEnd}>
                  <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column-reverse', md: 'row' }, 
            gap: isMobile ? 0 : 2, 
            height: '100%',
            width: '100%',
            mx: 0,
            px: 0,
            overflow: isMobile ? 'hidden' : 'auto',
            bgcolor: '#23242a',
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
          {/* 왼쪽 편 레이아웃 - 진행중현장리스트 */}
          <Box sx={{
            width: { xs: '100%', md: 280 },
            border: '1px solid #444', 
            borderRadius: 2, 
            display: 'flex',
            flexDirection: 'column', 
            height: 'calc(100vh - 120px)',
            maxHeight: { xs: '290px', md: 'calc(100vh - 120px)' }, // 하단바 고려하여 높이 조정
            position: { xs: 'static', md: 'static' },
            transform: { xs: 'none', md: 'none' },
            mt: { xs: 0, md: '15px' }, // PC에서만 위쪽 여백 15px 추가
            overflow: isMobile ? 'hidden' : 'visible',
            bgcolor: '#23242a'
          }}>
            <Box sx={{ 
              p: 2, 
              borderBottom: '1px solid', 
              borderColor: 'divider', 
              position: { xs: 'static', md: 'static' }, 
              transform: { xs: 'none', md: 'none' }, 
              display: { xs: 'none', md: 'block' },
              bgcolor: '#23242a',
              color: '#fff'
            }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                mb: 1
              }}>
                <Box>
                  <Typography variant="h6" sx={{ 
                    fontWeight: 600, 
                    display: { xs: 'none', md: 'block' },
                    color: '#fff',
                    mb: 0.5
                  }}>이달의 현장 ({filteredSites.length})</Typography>
                  <Typography variant="caption" sx={{ 
                    color: '#bbb', 
                    fontSize: '0.7rem',
                    display: { xs: 'none', md: 'block' }
                  }}>
                    더블클릭하여 현장 정보 확인
                  </Typography>
                </Box>
                
                {/* 견적/청구 버튼 - 오른쪽에 컴팩트하게 */}
                <Box sx={{ 
                  display: { xs: 'none', md: 'flex' },
                  gap: 0.5
                }}>
                  <Button
                    variant="outlined"
                    size="small"
                    sx={{
                      borderColor: '#3b82f6',
                      color: '#3b82f6',
                      fontSize: '0.9rem',
                      py: 0.1,
                      px: 0.8,
                      minWidth: 'auto',
                      height: 20,
                      '&:hover': {
                        borderColor: '#2563eb',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)'
                      }
                    }}
                    onClick={() => {
                      console.log('견적 버튼 클릭');
                      navigate('/estimates');
                    }}
                  >
                    견적
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    sx={{
                      borderColor: '#ef4444',
                      color: '#ef4444',
                      fontSize: '0.9rem',
                      py: 0.1,
                      px: 0.8,
                      minWidth: 'auto',
                      height: 20,
                      '&:hover': {
                        borderColor: '#dc2626',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)'
                      }
                    }}
                    onClick={() => {
                      console.log('청구 버튼 클릭');
                      navigate('/claims');
                    }}
                  >
                    청구
                  </Button>
                </Box>
              </Box>
              <TextField
                size="small"
                placeholder="현장명 검색"
                value={siteSearchTerm}
                sx={{ 
                  width: '100%',
                  '& .MuiOutlinedInput-root': {
                    fontSize: '0.875rem',
                    '& fieldset': {
                      borderColor: '#444'
                    },
                    '&:hover fieldset': {
                      borderColor: '#666'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#1976d2'
                    }
                  },
                  '& .MuiInputBase-input': {
                    color: '#fff'
                  },
                  '& .MuiInputLabel-root': {
                    color: '#ccc'
                  }
                }}
                onChange={(e) => {
                  setSiteSearchTerm(e.target.value);
                }}
              />
            </Box>
            <Droppable droppableId="siteList">
              {(provided, snapshot) => (
                <Box ref={provided.innerRef} {...provided.droppableProps} sx={{
                  flex: 1, 
                  overflowY: isMobile ? 'hidden' : 'auto', // 스크롤은 되지만 스크롤바는 숨김
                  p: isMobile ? 0.5 : 1,
                  bgcolor: snapshot.isDraggingOver ? '#2a2b32' : '#23242a',
                  maxHeight: isMobile ? '220px' : 'none', // 모바일에서 20px 키움 (200px → 220px)
                  position: { xs: 'static', md: 'static' },
                  transform: { xs: 'none', md: 'none' },
                  scrollbarWidth: 'none', // Firefox에서 스크롤바 숨기기
                  msOverflowStyle: 'none', // IE/Edge에서 스크롤바 숨기기
                  '&::-webkit-scrollbar': {
                    display: 'none', // Webkit 브라우저에서 스크롤바 숨기기
                  },
                  '&::-webkit-scrollbar-track': {
                    display: 'none',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    display: 'none',
                  },
                }}>
                  {filteredSites.length > 0 ? (
                    filteredSites.map((site, index) => (
                      !isMobile && (
                        <Draggable key={site.id} draggableId={site.id} index={index}>
                          {(provided) => (
                            <Paper 
                              ref={provided.innerRef} 
                              {...provided.draggableProps} 
                              {...provided.dragHandleProps}
                              onDoubleClick={() => handleSiteDoubleClick(site)}
                              sx={{ 
                                mb: 1, 
                                p: 1.5, 
                                bgcolor: '#2a2b32',
                                color: '#fff',
                                borderRadius: 2,
                                cursor: 'grab',
                                border: '1px solid #444',
                                transition: 'all 0.2s',
                                '&:hover': {
                                  bgcolor: '#333'
                                }
                              }}
                            >
                              <Typography sx={{ 
                                fontWeight: 400,
                                color: (() => {
                                  // 상태별 색상 적용 (왼쪽 리스트에서만)
                                  switch (site.status) {
                                    case '예정':
                                      return '#ef4444'; // 빨간색
                                    case '완료':
                                      return '#22c55e'; // 초록색
                                    default:
                                      return '#fff'; // 기본 흰색
                                  }
                                })()
                              }}>
                                {site.name.slice(0, 10)}
                                {site.status ? ` (${site.status})` : ''}
                              </Typography>
                            </Paper>
                          )}
                        </Draggable>
                      )
                    ))
                  ) : (
                    <Typography sx={{ p: 2, textAlign: 'center', color: '#ccc' }}>
                      이번 달 현장이 없습니다.
                    </Typography>
                  )}
                  {provided.placeholder}
                </Box>
              )}
            </Droppable>
          </Box>
          
          {/* 우측 달력 영역 */}
          <Box sx={{ 
            flex: 1, 
            height: '100%',
            width: '100%',
            px: isMobile ? 0 : undefined,
            overflow: isMobile ? 'hidden' : 'visible'
          }}>
            <CustomCalendar
              year={year}
              month={month}
              onPrevMonth={() => {
                if (month === 0) {
                  setYear(y => y - 1);
                  setMonth(11);
                } else {
                  setMonth(m => m - 1);
                }
              }}
              onNextMonth={() => {
                if (month === 11) {
                  setYear(y => y + 1);
                  setMonth(0);
                } else {
                  setMonth(m => m + 1);
                }
              }}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              calendarItems={calendarItems}
              onItemClick={handleItemClick}
              onItemDoubleClick={handleItemDoubleClick}
              onItemTouchStart={handleItemTouchStart}
              onItemTouchEnd={handleItemTouchEnd}
              onDateClick={handleDateClick}
              onOpenPopup={handleOpenPopup}
              onDateNumberClick={handleOpenPopup}
              onCountClick={handleShowListPopup}
              onCheckItem={handleCheckItem}
              checkedItems={checkedItems}
              selectedItems={selectedItems}
              onDeleteSelected={handleDeleteSelected}
              sites={filteredSites}
              selectedDate={selectedDate}
              onExcel={handleExcel}
              onAddSchedule={onAddSchedule}
            />
            {console.log('🔍 CustomCalendar에 전달되는 props:', {
              year,
              month,
              viewMode,
              calendarItemsCount: Object.keys(calendarItems).length,
              sitesCount: filteredSites.length,
              selectedDate
            })}
          </Box>
        </Box>
      </DragDropContext>
      
      {/* 현장 정보 팝업 */}
      <SiteInfoPopup
        open={siteInfoPopup.open}
        onClose={handleCloseSiteInfoPopup}
        site={siteInfoPopup.site}
      />
      
      {/* 일정 추가 팝업 */}
      {popupOpen && (
        <Box
          onClick={e => { e.stopPropagation(); handleClosePopup(); }}
          sx={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', bgcolor: 'rgba(0,0,0,0.4)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Box onClick={e => e.stopPropagation()} sx={{ minWidth: 340, bgcolor: 'background.paper', borderRadius: 3, p: 3, boxShadow: 5, position: 'relative', zIndex: 3100 }}>
            <IconButton onClick={e => { e.stopPropagation(); handleClosePopup(); }} sx={{ position: 'absolute', top: 8, right: 8, color: 'text.primary' }}>X</IconButton>
            <Typography variant="h6" sx={{ color: 'text.primary', mb: 2 }}>{popupDate} 일정</Typography>
            <TextField label="제목" value={popupTitle} onChange={e => setPopupTitle(e.target.value)} fullWidth sx={{ mb: 2 }} autoFocus />
            {/* 현장명 검색 선택 */}
            <Autocomplete
              options={sites.map(site => site.name).filter(Boolean)}
              value={popupSiteName || ''}
              onInputChange={(_, v) => setPopupSiteName(v)}
              renderInput={(params) => <TextField {...params} label="현장명 검색" />}
              freeSolo
              sx={{ mb: 2 }}
            />
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>분류 선택</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                <FormControlLabel
                  control={<Checkbox checked={selectedTypes.includes('현장')} onChange={() => handleTypeChange('현장')} />}
                  label="현장"
                />
                <FormControlLabel
                  control={<Checkbox checked={selectedTypes.includes('회의')} onChange={() => handleTypeChange('회의')} />}
                  label="회의"
                />
                <FormControlLabel
                  control={<Checkbox checked={selectedTypes.includes('전자입찰')} onChange={() => handleTypeChange('전자입찰')} />}
                  label="전자입찰"
                />
                <FormControlLabel
                  control={<Checkbox checked={selectedTypes.includes('현설')} onChange={() => handleTypeChange('현설')} />}
                  label="현설"
                />
                <FormControlLabel
                  control={<Checkbox checked={selectedTypes.includes('실측')} onChange={() => handleTypeChange('실측')} />}
                  label="실측"
                />
                <FormControlLabel
                  control={<Checkbox checked={selectedTypes.includes('기타')} onChange={() => handleTypeChange('기타')} />}
                  label="기타"
                />
              </Box>
            </Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>색상 선택</Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              {colorChoices.map(color => (
                <Box
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  sx={{
                    width: 24, height: 24, borderRadius: '50%',
                    bgcolor: color, cursor: 'pointer',
                    border: selectedColor === color ? '3px solid #fff' : '2px solid #888',
                    boxShadow: selectedColor === color ? '0 0 0 2px #1976d2' : 'none',
                    transition: 'all 0.15s'
                  }}
                />
              ))}
            </Box>
            <TextField 
              label="설명" 
              value={popupDesc} 
              onChange={e => setPopupDesc(e.target.value)} 
              fullWidth 
              multiline 
              rows={3} 
              sx={{ mb: 2 }} 
            />
            <Button variant="contained" color="primary" onClick={handleAddSchedule} fullWidth disabled={(!popupTitle.trim() && !popupSiteName.trim()) || selectedTypes.length === 0}>추가</Button>
          </Box>
        </Box>
      )}
      
      {/* 일정 수정 팝업 */}
      {editPopup.open && (
        <Box
          onClick={e => { e.stopPropagation(); setEditPopup({ ...editPopup, open: false }); }}
          sx={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', bgcolor: 'rgba(0,0,0,0.4)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Box onClick={e => e.stopPropagation()} sx={{ minWidth: 340, bgcolor: 'background.paper', borderRadius: 3, p: 3, boxShadow: 5, position: 'relative', zIndex: 3100 }}>
            <IconButton onClick={e => { e.stopPropagation(); setEditPopup({ ...editPopup, open: false }); }} sx={{ position: 'absolute', top: 8, right: 8, color: 'text.primary' }}>X</IconButton>
            <Typography variant="h6" sx={{ color: 'text.primary', mb: 2 }}>일정 수정</Typography>
            <TextField label="제목" value={editPopup.item?.text} onChange={(e) => setEditPopup({ ...editPopup, item: { ...editPopup.item, text: e.target.value } })} fullWidth sx={{ mb: 2 }} autoFocus />
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>분류 선택</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                <FormControlLabel
                  control={<Checkbox checked={editPopup.item?.type === '현장'} onChange={() => handleEditTypeChange('현장')} />}
                  label="현장"
                />
                <FormControlLabel
                  control={<Checkbox checked={editPopup.item?.type === '회의'} onChange={() => handleEditTypeChange('회의')} />}
                  label="회의"
                />
                <FormControlLabel
                  control={<Checkbox checked={editPopup.item?.type === '전자입찰'} onChange={() => handleEditTypeChange('전자입찰')} />}
                  label="전자입찰"
                />
                <FormControlLabel
                  control={<Checkbox checked={editPopup.item?.type === '현설'} onChange={() => handleEditTypeChange('현설')} />}
                  label="현설"
                />
                <FormControlLabel
                  control={<Checkbox checked={editPopup.item?.type === '실측'} onChange={() => handleEditTypeChange('실측')} />}
                  label="실측"
                />
                <FormControlLabel
                  control={<Checkbox checked={editPopup.item?.type === '기타'} onChange={() => handleEditTypeChange('기타')} />}
                  label="기타"
                />
              </Box>
            </Box>
            <TextField 
              label="설명" 
              value={editPopup.item?.desc || ''} 
              onChange={(e) => setEditPopup({ ...editPopup, item: { ...editPopup.item, desc: e.target.value } })} 
              fullWidth 
              multiline 
              rows={3} 
              sx={{ mb: 2 }} 
            />
            <Button variant="contained" color="primary" onClick={handleEditSave} fullWidth disabled={(!editPopup.item?.text?.trim() && !editPopup.item?.siteName?.trim())}>수정</Button>
          </Box>
        </Box>
      )}
      
      {/* 일정 목록 팝업 */}
      {showListPopup && (
        <Box
          onClick={e => { e.stopPropagation(); handleCloseListPopup(); }}
          sx={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', bgcolor: 'rgba(0,0,0,0.4)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Box onClick={e => e.stopPropagation()} sx={{ minWidth: 340, bgcolor: 'background.paper', borderRadius: 3, p: 3, boxShadow: 5, position: 'relative', zIndex: 3100 }}>
            <IconButton onClick={e => { e.stopPropagation(); handleCloseListPopup(); }} sx={{ position: 'absolute', top: 8, right: 8, color: 'text.primary' }}>X</IconButton>
            <Typography variant="h6" sx={{ color: 'text.primary', mb: 2 }}>{listPopupDate} 일정 목록</Typography>
            {(calendarItems[listPopupDate] && calendarItems[listPopupDate].length > 0) ? (
              calendarItems[listPopupDate].map(item => (
                <Paper key={item.id} sx={{ mb: 1, p: 1, bgcolor: 'background.default' }}>
                  <Typography sx={{ fontWeight: 600 }}>{item.text}</Typography>
                  <Typography variant="body2" color="text.secondary">{item.desc}</Typography>
                </Paper>
              ))
            ) : (
              <Typography color="text.secondary">일정이 없습니다.</Typography>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ScheduleManagement; 