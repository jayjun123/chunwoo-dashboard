import React, { useState, useMemo, useEffect } from 'react';
import { Box, Typography, Button, TextField, IconButton, Paper, MenuItem, Checkbox, FormControlLabel, Autocomplete, Tabs, Tab, InputAdornment } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon, EditNote as EditNoteIcon, CalendarToday as CalendarIcon, BarChart as BarChartIcon, Clear as ClearIcon } from '@mui/icons-material';
import CustomCalendar from '../CustomCalendar';
import ScheduleHeatmap from './ScheduleHeatmap';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { collection, doc, query, onSnapshot, addDoc, updateDoc, deleteDoc, writeBatch, where, getDocs, setDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import * as XLSX from 'xlsx';
import { exportCalendarToExcel, exportToExcel, exportScheduleToExcel } from '../../utils/excelUtils.jsx';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useNavigate, useLocation } from 'react-router-dom';
import { subscribeToEstimates } from '../../api/estimates';
import SiteInfoPopup from '../common/SiteInfoPopup';

// CSS 애니메이션을 위한 스타일
const pulseAnimation = `
  @keyframes pulse {
    0% {
      box-shadow: 0 0 4px rgba(255, 215, 0, 0.6);
    }
    50% {
      box-shadow: 0 0 8px rgba(255, 215, 0, 0.8);
    }
    100% {
      box-shadow: 0 0 4px rgba(255, 215, 0, 0.6);
    }
  }
`;

// 스타일을 head에 추가
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = pulseAnimation;
  document.head.appendChild(style);
}

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
  
  // 제출완료 상태인 견적은 일정에서 제외
  if (estimate.submissionStatus === '제출완료') {
    console.log('🔍 제출완료 견적 제외:', estimate.siteName || estimate.company);
    return null;
  }
  
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
  onOpenIdeaPad,
  onCheckSchedule,
  onDeleteSelectedSchedules,
  initialTab = 0
}) => {

  const isMobile = useMediaQuery('(max-width:600px)');
  const authUser = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [viewMode, setViewMode] = useState(propViewMode);
  const [calendarItems, setCalendarItems] = useState({});
  const [popupTitle, setPopupTitle] = useState('');
  const [popupDesc, setPopupDesc] = useState('');
  const [popupType, setPopupType] = useState('');
  const [popupSiteName, setPopupSiteName] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [editPopup, setEditPopup] = useState({ open: false, item: null, date: null });
  const [sites, setSites] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [checkedItems, setCheckedItems] = useState({});
  const colorChoices = ['transparent', '#3b82f6', '#22c55e', '#f59e42', '#ef4444', '#a855f7', '#eab308'];
  const [selectedColor, setSelectedColor] = useState(colorChoices[0]);
  const [selectedWeather, setSelectedWeather] = useState('☀️');
  
  
  // 탭 상태 (location.state에서 initialTab 가져오기)
  const [activeTab, setActiveTab] = useState(location.state?.initialTab ?? initialTab);
  
  // location.state가 변경될 때 activeTab 업데이트
  useEffect(() => {
    console.log('📍 ScheduleManagement useEffect 실행:', {
      locationState: location.state,
      initialTab: location.state?.initialTab,
      currentActiveTab: activeTab
    });
    
    if (location.state?.initialTab !== undefined) {
      console.log('🔄 activeTab 변경:', location.state.initialTab);
      setActiveTab(location.state.initialTab);
    }
  }, [location.state?.initialTab]);

  // 로고 클릭 감지를 위한 추가 useEffect
  useEffect(() => {
    const handleLogoClick = () => {
      if (location.pathname === '/schedule') {
        setActiveTab(0);
      }
    };

    // 로고 클릭 이벤트 리스너 추가
    window.addEventListener('logoClick', handleLogoClick);
    
    return () => {
      window.removeEventListener('logoClick', handleLogoClick);
    };
  }, []);

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
  const [copiedItem, setCopiedItem] = useState(null); // 복사된 항목 상태
  
  // 저장된 아이디어 데이터 상태
  const [savedIdeas, setSavedIdeas] = useState([]);
  
  // 저장된 아이디어 팝업 상태
  const [savedIdeasPopup, setSavedIdeasPopup] = useState({ open: false, site: null, ideas: [] });

  useEffect(() => {
    console.log('🔍 ScheduleManagement: 사이트 데이터 로딩 시작');
    console.log('🔍 현재 사용자:', authUser.currentUser);
    
    // props로 전달받은 sites가 있으면 사용, 없으면 기존 로직 사용
    if (propSites && propSites.length > 0) {
      console.log('🔍 props로 전달받은 사이트 사용:', propSites.length);
      // props로 받은 sites에도 아이디어 정보 확인
      checkSitesWithIdeas(propSites).then(updatedPropSites => {
        setSites(updatedPropSites);
      });
      return;
    }
    
    const q = query(collection(db, 'sites'));
    let unsubscribe = null;
    
    try {
      unsubscribe = onSnapshot(q, (snapshot) => {
        try {
          const sitesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          console.log('🔍 사이트 데이터 로드됨:', sitesData.length, '개');
          
          // 아이디어 정보 확인 및 추가
          checkSitesWithIdeas(sitesData).then(updatedSitesData => {
            // 이전 상태와 비교하여 실제로 변경되었을 때만 업데이트
            setSites(prev => {
              const prevStr = JSON.stringify(prev);
              const newStr = JSON.stringify(updatedSitesData);
              if (prevStr === newStr) {
                return prev; // 변경사항이 없으면 이전 상태 반환
              }
              return updatedSitesData;
            });
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

  // 아이디어가 저장된 현장 확인
  const checkSitesWithIdeas = async (sites) => {
    try {
      const ideasQuery = query(collection(db, 'notepad_drawings'));
      const ideasSnapshot = await getDocs(ideasQuery);
      const sitesWithIdeas = new Set();
      
      console.log('🔍 ScheduleManagement: 모든 저장된 아이디어 확인 중...');
      
      ideasSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('🔍 ScheduleManagement: 저장된 아이디어 데이터:', {
          id: doc.id,
          siteName: data.siteName,
          displayName: data.displayName,
          isAutoSave: data.isAutoSave
        });
        
        if (data.siteName && !data.isAutoSave) {
          sitesWithIdeas.add(data.siteName);
        }
      });
      
      console.log('🔍 ScheduleManagement: 아이디어가 저장된 현장들:', Array.from(sitesWithIdeas));
      console.log('🔍 ScheduleManagement: 현재 현장 목록:', sites.map(site => site.name));
      
      // 현장 목록에 아이디어 표시 정보 추가
      const updatedSites = sites.map(site => {
        // 정확한 일치 확인
        let hasIdeas = sitesWithIdeas.has(site.name);
        
        // 정확한 일치만 허용 (부분 일치 제거)
        // if (!hasIdeas) {
        //   for (const savedSiteName of sitesWithIdeas) {
        //     // 더 엄격한 부분 일치: 현장명의 주요 부분이 일치하는지 확인
        //     const siteNameWords = site.name.split(' ').filter(word => word.length > 2);
        //     const savedNameWords = savedSiteName.split(' ').filter(word => word.length > 2);
        //     
        //     // 주요 단어들이 일치하는지 확인
        //     const hasCommonWords = siteNameWords.some(word => 
        //       savedNameWords.some(savedWord => 
        //         word.includes(savedWord) || savedWord.includes(word)
        //       )
        //     );
        //     
        //     if (hasCommonWords) {
        //       hasIdeas = true;
        //       console.log(`🔍 ScheduleManagement: 부분 일치 발견: "${site.name}" <-> "${savedSiteName}"`);
        //       break;
        //     }
        //   }
        // }
        
        console.log(`🔍 ScheduleManagement: 현장 "${site.name}" 아이디어 여부:`, hasIdeas);
        return {
          ...site,
          hasIdeas: hasIdeas
        };
      });
      
      return updatedSites;
    } catch (error) {
      console.error('ScheduleManagement: 아이디어 저장 현장 확인 실패:', error);
      return sites; // 오류 시 원본 반환
    }
  };

  // 저장된 아이디어 표시 핸들러
  const handleShowSavedIdeas = async (site) => {
    try {
      console.log('🔍 저장된 아이디어 표시:', site.name);
      
      // 모든 저장된 아이디어에서 해당 현장과 매칭되는 것들 찾기
      const allIdeasQuery = query(collection(db, 'notepad_drawings'));
      const allIdeasSnapshot = await getDocs(allIdeasQuery);
      const ideas = [];
      
      console.log('🔍 모든 저장된 아이디어:', allIdeasSnapshot.docs.map(doc => ({
        id: doc.id,
        siteName: doc.data().siteName,
        displayName: doc.data().displayName,
        isAutoSave: doc.data().isAutoSave
      })));
      
      allIdeasSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.isAutoSave) return; // 자동저장 제외
        
        // 정확한 일치만 확인
        let matches = data.siteName === site.name;
        
        console.log('🔍 아이디어 데이터 확인:', {
          id: doc.id,
          siteName: data.siteName,
          currentSite: site.name,
          isAutoSave: data.isAutoSave,
          exactMatch: data.siteName === site.name,
          partialMatch: matches
        });
        
        if (matches) {
          ideas.push({
            id: doc.id,
            ...data
          });
        }
      });
      
      console.log('🔍 조회된 아이디어:', ideas);
      
      if (ideas.length > 0) {
        // 아이디어 목록을 표시하는 팝업 또는 다이얼로그
        setSavedIdeasPopup({
          open: true,
          site: site,
          ideas: ideas
        });
      } else {
        alert(`저장된 아이디어가 없습니다.\n현장명: "${site.name}"`);
      }
    } catch (error) {
      console.error('저장된 아이디어 조회 실패:', error);
      alert('저장된 아이디어를 불러오는데 실패했습니다.');
    }
  };

  // 저장된 아이디어 삭제 핸들러
  const handleDeleteIdea = async (ideaId, ideaName) => {
    try {
      const confirmDelete = window.confirm(`"${ideaName}" 아이디어를 삭제하시겠습니까?\n\n삭제된 아이디어는 복구할 수 없습니다.`);
      
      if (!confirmDelete) return;
      
      console.log('🗑️ 아이디어 삭제 시작:', ideaId);
      
      // Firestore에서 문서 삭제
      await deleteDoc(doc(db, 'notepad_drawings', ideaId));
      
      console.log('🗑️ 아이디어 삭제 완료:', ideaId);
      
      // 팝업의 아이디어 목록에서 삭제된 아이디어 제거
      const updatedIdeas = savedIdeasPopup.ideas.filter(idea => idea.id !== ideaId);
      setSavedIdeasPopup(prev => ({
        ...prev,
        ideas: updatedIdeas
      }));
      
      // 아이디어가 모두 삭제되었으면 팝업 닫기
      if (updatedIdeas.length === 0) {
        setSavedIdeasPopup({ open: false, site: null, ideas: [] });
      }
      
      // 현장 목록의 hasIdeas 상태 업데이트
      const updatedSites = await checkSitesWithIdeas(sites);
      if (updatedSites) {
        setSites(updatedSites);
      }
      
      alert('아이디어가 성공적으로 삭제되었습니다.');
      
    } catch (error) {
      console.error('아이디어 삭제 실패:', error);
      alert('아이디어 삭제에 실패했습니다. 다시 시도해주세요.');
    }
  };

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

  // 저장된 아이디어 데이터 로딩
  useEffect(() => {
    console.log('🔍 ScheduleManagement: 저장된 아이디어 데이터 로딩 시작');
    
    const q = query(
      collection(db, 'notepad_drawings'),
      where('isAutoSave', '!=', true) // 자동저장 제외
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ideas = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        ideas.push({
          id: doc.id,
          siteName: data.siteName,
          siteId: data.siteId,
          timestamp: data.timestamp,
          displayName: data.displayName
        });
      });
      
      console.log('🔍 저장된 아이디어 데이터:', ideas.length, '개');
      console.log('🔍 저장된 아이디어 상세:', ideas);
      setSavedIdeas(ideas);
    }, (error) => {
      console.error('🔍 저장된 아이디어 데이터 로딩 실패:', error);
    });

    return () => unsubscribe();
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
    // sites가 undefined이거나 배열이 아닌 경우 빈 배열 반환
    if (!sites || !Array.isArray(sites)) {
      return [];
    }
    
    const monthFiltered = sites.filter(site => isInMonth(site, year, month));
    let searchFiltered = monthFiltered;
    
    if (siteSearchTerm) {
      searchFiltered = monthFiltered.filter(site => 
        site.name && site.name.toLowerCase().includes(siteSearchTerm.toLowerCase())
      );
    }
    
    // 정렬 로직: 1순위 - 진행중인 현장 (공기 많이 남은 순), 2순위 - 예정현장, 3순위 - 완료현장, 4순위 - 가나다순
    return searchFiltered.sort((a, b) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // 현장 상태 분류 - status 필드 우선, 없으면 날짜로 판단
      const getSiteStatus = (site) => {
        // status 필드가 있으면 그것을 사용
        if (site.status) {
          if (site.status === '진행중') return 'ongoing';
          if (site.status === '예정') return 'scheduled';
          if (site.status === '완료') return 'completed';
        }
        
        // status 필드가 없으면 날짜로 판단
        if (!site.startDate || !site.endDate) return 'scheduled'; // 예정현장
        
        const startDate = new Date(site.startDate);
        const endDate = new Date(site.endDate);
        
        if (startDate > today) return 'scheduled'; // 예정현장
        if (endDate < today) return 'completed'; // 완료현장
        return 'ongoing'; // 진행중인 현장
      };
      
      const aStatus = getSiteStatus(a);
      const bStatus = getSiteStatus(b);
      
      // 1순위: 현장 상태 (진행중 → 예정 → 완료)
      const statusOrder = { 'ongoing': 1, 'scheduled': 2, 'completed': 3 };
      if (aStatus !== bStatus) {
        return statusOrder[aStatus] - statusOrder[bStatus];
      }
      
      // 2순위: 진행중인 현장의 경우 공기 많이 남은 순 (늦은 종료일)
      if (aStatus === 'ongoing' && bStatus === 'ongoing') {
        const aEndDate = new Date(a.endDate);
        const bEndDate = new Date(b.endDate);
        return bEndDate - aEndDate; // 늦은 날짜가 위로
      }
      
      // 3순위: 예정현장의 경우 시작일 순
      if (aStatus === 'scheduled' && bStatus === 'scheduled') {
        const aStartDate = new Date(a.startDate);
        const bStartDate = new Date(b.startDate);
        return aStartDate - bStartDate; // 빠른 날짜가 위로
      }
      
      // 4순위: 가나다순 정렬
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

    // 웹(PC)에서만 날짜셀 간 드래그앤드롭 허용
    const isWeb = window.innerWidth >= 768; // 태블릿/데스크톱 크기
    const isDateToDate = source.droppableId.startsWith('20') && destination.droppableId.startsWith('20');
    
    if (!isWeb && isDateToDate) {
      // 모바일에서는 날짜셀 간 드래그앤드롭 불가
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
    // 통일된 모달 사용
    setShowListPopup(true);
    setListPopupDate(dateStr);
    setEditPopup({ open: true, item: null, date: dateStr });
    // 새 일정 추가를 위한 상태 초기화
    setPopupTitle('');
    setPopupType('');
    setPopupDesc('');
    setPopupSiteName('');
    setSelectedTypes([]);
  };

  const handleClosePopup = () => {
    // 통일된 모달 닫기
    setShowListPopup(false);
    setListPopupDate('');
    setEditPopup({ open: false, item: null, date: null });
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
    const koreanDate = new Date(listPopupDate + 'T12:00:00'); // 정오로 설정하여 시간대 차이 방지
    
    const scheduleData = {
      text: popupTitle || popupSiteName,
      type: selectedTypes.join(', '),
      desc: popupDesc,
      date: koreanDate,
      userId: user.uid,
      color: selectedColor,
      weather: selectedWeather,
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
      // 모달 닫기 및 입력 필드 초기화
      setEditPopup({ open: false, item: null, date: null });
      setPopupTitle('');
      setPopupDesc('');
      setPopupSiteName('');
      setSelectedTypes([]);
      setSelectedColor(colorChoices[0]);
      setSelectedWeather('☀️');
      
      // 모바일에서 일정 추가 후 선택된 날짜의 일정 목록 새로고침
      if (isMobile && selectedDate && selectedDate === listPopupDate && onDateClick) {
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
    console.log('더블클릭된 항목:', item);
    console.log('항목 ID:', item?.id);
    console.log('isEstimate:', item?.isEstimate);
    console.log('ID가 estimate_로 시작하는가:', item?.id?.startsWith('estimate_'));
    
    // 견적 일정인 경우 견적 페이지로 이동하여 해당 견적 띄우기
    if (item && (item.isEstimate || item.id.startsWith('estimate_'))) {
      const estimateId = item.id.replace('estimate_', '');
      console.log('견적 더블클릭 - 견적 ID:', estimateId);
      navigate('/estimates', { 
        state: { 
          selectedEstimateId: estimateId,
          fromSchedule: true 
        } 
      });
      return;
    }
    
    // 견적 일정이 아닌 경우 날짜셀 더블클릭 모달 열기 (통일된 모달)
    setShowListPopup(true);
    setListPopupDate(date);
    setEditPopup({ open: true, item, date }); // 편집할 항목 정보도 저장
  };

  let touchTimer;
  const handleItemTouchStart = (date, item) => {
    touchTimer = setTimeout(() => {
      handleItemDoubleClick(date, item);
    }, 600);
  };

  const handleItemTouchEnd = () => clearTimeout(touchTimer);

  // 붙여넣기 핸들러
  const handlePasteItem = async (targetDate) => {
    if (!copiedItem) return;
    
    const user = authUser.currentUser;
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    console.log('붙여넣기 핸들러 호출됨, 대상 날짜:', targetDate);
    
    try {
      const newItem = {
        text: copiedItem.text || '',
        type: copiedItem.type || '기타',
        desc: copiedItem.desc || '',
        siteId: copiedItem.siteId || '',
        date: new Date(targetDate + 'T12:00:00'),
        userId: user.uid,
        color: copiedItem.color === 'transparent' ? colorChoices[0] : (copiedItem.color || colorChoices[0]),
        siteName: copiedItem.siteName || '',
        selectedTypes: copiedItem.selectedTypes || [copiedItem.type || '기타'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // undefined 값 제거
      Object.keys(newItem).forEach(key => {
        if (newItem[key] === undefined) {
          delete newItem[key];
        }
      });
      
      console.log('붙여넣을 항목:', newItem);
      
      if (onAddSchedule) {
        await onAddSchedule(newItem);
      } else {
        await addDoc(collection(db, 'schedules'), newItem);
      }
      console.log('항목 붙여넣기 완료:', targetDate);
    } catch (error) {
      console.error('항목 붙여넣기 실패:', error);
      alert('항목 붙여넣기에 실패했습니다.');
    }
  };



  // 키보드 이벤트 핸들러 (ESC, 복사/붙여넣기)
  useEffect(() => {
    const handleKeyDown = (event) => {
      // 입력 필드에서 발생한 이벤트는 무시
      const target = event.target;
      const isInputField = target.tagName === 'INPUT' || 
                          target.tagName === 'TEXTAREA' || 
                          target.contentEditable === 'true' ||
                          target.closest('[contenteditable="true"]') ||
                          target.closest('input') ||
                          target.closest('textarea');
      
      if (isInputField) {
        return; // 입력 필드에서는 일정 복사/붙여넣기 기능 비활성화
      }
      
      // ESC 키: 선택된 항목들 해제
      if (event.key === 'Escape') {
        setSelectedItems([]);
      }
      
      // Ctrl+C: 복사
      if (event.ctrlKey && event.key === 'c') {
        event.preventDefault();
        console.log('Ctrl+C 감지됨');
        if (selectedItems && selectedItems.length > 0) {
          // 선택된 항목 중 첫 번째 항목을 복사 (덮어쓰기 허용)
          const selectedItem = selectedItems[0];
          const item = calendarItems[selectedItem.date]?.find(item => item.id === selectedItem.id);
          if (item) {
            // 기존 복사된 항목이 있어도 새로운 항목으로 덮어쓰기
            setCopiedItem({...item}); // 객체 복사로 독립적인 복사본 생성
            console.log('항목 복사됨 (덮어쓰기):', item);
            alert(`현장 "${item.siteName || item.text}"이(가) 복사되었습니다!`);
          } else {
            console.log('복사할 항목을 찾을 수 없음');
          }
        } else {
          console.log('선택된 항목이 없음');
        }
      }
      
      // Ctrl+V: 붙여넣기
      if (event.ctrlKey && event.key === 'v') {
        event.preventDefault();
        console.log('Ctrl+V 감지됨');
        console.log('현재 선택된 날짜:', selectedDate);
        console.log('복사된 항목:', copiedItem);
        
        if (copiedItem) {
          // selectedDate가 없거나 오늘 날짜인 경우 사용자에게 날짜 선택 요청
          if (!selectedDate || selectedDate === new Date().toISOString().slice(0, 10)) {
            const targetDate = prompt('붙여넣을 날짜를 입력하세요 (YYYY-MM-DD 형식):', selectedDate || new Date().toISOString().slice(0, 10));
            if (targetDate && targetDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
              console.log('사용자 입력 날짜로 붙여넣기 시도:', targetDate);
              handlePasteItem(targetDate);
            } else if (targetDate) {
              alert('올바른 날짜 형식(YYYY-MM-DD)을 입력해주세요.');
            }
          } else {
            console.log('선택된 날짜로 붙여넣기 시도:', selectedDate);
            handlePasteItem(selectedDate);
          }
        } else {
          console.log('복사된 항목이 없음');
          alert('복사된 항목이 없습니다. Ctrl+C로 항목을 복사하세요.');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedItems, calendarItems, copiedItem, selectedDate]);

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
        color: editPopup.item.color,
        weather: editPopup.item.weather,
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


  const handleExcel = async (filteredCalendarItems = null, customPeriod = null) => {
    // PC에서만 엑셀 다운로드 가능
    if (isMobile) {
      alert('PC에서만 엑셀 다운로드가 가능합니다.');
      return;
    }
    
    try {
      // 현장 데이터 로드 (시공팀 정보 매칭용)
      const sitesSnapshot = await getDocs(collection(db, 'sites'));
      const sitesData = sitesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // 현장 ID를 키로 하는 맵 생성
      const sitesMap = {};
      sitesData.forEach(site => {
        sitesMap[site.id] = site;
      });
      
      // 의뢰자 데이터 로드 (견적 일정용)
      const requestersSnapshot = await getDocs(collection(db, 'requesters'));
      const requestersData = requestersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // 의뢰자 이름을 키로 하는 맵 생성
      const requestersMap = {};
      requestersData.forEach(requester => {
        requestersMap[requester.name] = requester;
      });
      
      console.log('🏗️ 현장 데이터 로드 완료:', sitesData.length, '개');
      console.log('👤 의뢰자 데이터 로드 완료:', requestersData.length, '개');
      
      // 사용할 데이터 결정: 필터링된 데이터가 있으면 사용, 없으면 현재 월 데이터 사용
      const dataToUse = filteredCalendarItems || calendarItems;
      const isCustomPeriod = customPeriod && customPeriod.startDate && customPeriod.endDate;
      const selectedSite = customPeriod && customPeriod.selectedSite;
      
      console.log('📅 엑셀 다운로드 데이터:', {
        isCustomPeriod,
        customPeriod,
        selectedSite: selectedSite?.name || '전체',
        dataKeys: Object.keys(dataToUse).length,
        originalKeys: Object.keys(calendarItems).length
      });
      
      // 월별 데이터 정리
      const monthlyData = [];
      
      // 사용할 날짜 목록 생성
      let datesToProcess = [];
      
      if (isCustomPeriod) {
        // 사용자 정의 기간인 경우: 필터링된 데이터의 키 사용
        datesToProcess = Object.keys(dataToUse).sort();
        console.log('📅 사용자 정의 기간 날짜들:', datesToProcess);
      } else {
        // 현재 월의 모든 날짜를 생성 (1일부터 마지막 날까지)
        const getLastDayOfMonth = (year, month) => {
          return new Date(year, month + 1, 0);
        };
        
        const lastDay = getLastDayOfMonth(year, month);
        
        for (let day = 1; day <= lastDay.getDate(); day++) {
          const currentDate = new Date(year, month, day);
          const yearStr = currentDate.getFullYear();
          const monthStr = String(currentDate.getMonth() + 1).padStart(2, '0');
          const dayStr = String(currentDate.getDate()).padStart(2, '0');
          const dateStr = `${yearStr}-${monthStr}-${dayStr}`;
          datesToProcess.push(dateStr);
        }
        
        console.log('📅 현재 월의 모든 날짜:', datesToProcess);
      }
      
      // 각 날짜별로 데이터 생성
      datesToProcess.forEach(dateStr => {
        const items = dataToUse[dateStr] || [];
      
      if (items.length === 0) {
        // 일정이 없는 날짜는 빈 행으로 추가
        monthlyData.push({
          일자: dateStr,
          분류: '',
          현장명: '',
          설명: '',
          E열: '',
          체크박스유무: ''
        });
      } else {
        // 일정이 있는 날짜는 각 항목별로 추가
        items.forEach((item, index) => {
          // 같은 날짜인 경우 첫 번째 항목에만 날짜 표시
          const displayDate = index === 0 ? dateStr : '';
          
          // E열 정보: 분류에 따라 다르게 설정
          let eColumnInfo = '';
          const itemType = item.type || '현장';
          
          if (itemType === '현장') {
            // 현장인 경우: 시공팀 정보
            if (item.siteId && sitesMap[item.siteId]) {
              const site = sitesMap[item.siteId];
              eColumnInfo = site.team || site.constructionTeam || site.constructionManager || '';
              
              // 디버깅: 명성내부인테리어 현장 확인
              if (site.name && site.name.includes('명성')) {
                console.log('명성내부인테리어 현장 시공팀 정보:', {
                  siteName: site.name,
                  siteId: site.id,
                  team: site.team,
                  constructionTeam: site.constructionTeam,
                  constructionManager: site.constructionManager,
                  eColumnInfo: eColumnInfo
                });
              }
            } else {
              // siteId가 없는 경우 기존 방식 사용 (현장명은 제외)
              eColumnInfo = item.team || item.constructionTeam || '';
            }
          } else if (itemType === '견적' || itemType === '입찰') {
            // 견적/입찰인 경우: 의뢰자 정보
            // 견적/입찰 일정의 text에서 의뢰자 이름 추출 시도
            const text = item.text || '';
            if (text) {
              // text에서 의뢰자 이름을 찾아서 requestersMap에서 조회
              const requester = requestersMap[text];
              if (requester) {
                // 의뢰자 이름과 회사명을 함께 표시
                if (requester.company) {
                  eColumnInfo = `${requester.fullName || requester.name} (${requester.company})`;
                } else {
                  eColumnInfo = requester.fullName || requester.name || text;
                }
              } else {
                // requestersMap에서 찾지 못한 경우 text 그대로 사용
                eColumnInfo = text;
              }
            }
          }
          
          monthlyData.push({
            일자: displayDate,
            분류: itemType,
            현장명: item.text || '',
            설명: item.desc || '',
            E열: eColumnInfo,
            날씨: item.weather || '☀️',
            체크박스유무: checkedItems[`${dateStr}-${item.id}`] ? '체크' : '미체크'
          });
        });
      }
    });
    
      // 파일명 설정: 사용자 정의 기간이면 기간 정보 포함, 아니면 월 정보 포함
      let fileName;
      if (isCustomPeriod) {
        const startDateStr = customPeriod.startDate.replace(/-/g, '.');
        const endDateStr = customPeriod.endDate.replace(/-/g, '.');
        fileName = `일정관리_${startDateStr}_${endDateStr}`;
        if (selectedSite) {
          fileName += `_${selectedSite.name}`;
        }
      } else {
        const monthStr = `${year}년 ${month + 1}월`;
        fileName = `일정관리_${monthStr}`;
        if (selectedSite) {
          fileName += `_${selectedSite.name}`;
        }
      }
      
      console.log('📄 엑셀 파일명:', fileName);
      
      // 새로운 스타일링이 적용된 함수 사용
      await exportScheduleToExcel(monthlyData, fileName, year, month);
      
    } catch (error) {
      console.error('엑셀 다운로드 오류:', error);
      alert('엑셀 다운로드 중 오류가 발생했습니다: ' + error.message);
    }
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



  // 날짜 숫자(일) 더블클릭 시 일정 추가 모달 열기
  const handleDateCellDoubleClick = (dateStr) => {
    setShowListPopup(true);
    setListPopupDate(dateStr);
    // 편집 모드로 시작 (새 일정 추가 모드)
    setEditPopup({ open: true, item: null, date: dateStr });
  };
  const handleCloseListPopup = () => { 
    setShowListPopup(false); 
    setListPopupDate(''); 
    setEditPopup({ open: false, item: null, date: null }); // 편집 상태도 초기화
  };

  // ESC 키로 카운트 모달 닫기
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && showListPopup) {
        handleCloseListPopup();
      }
    };

    if (showListPopup) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showListPopup]);
  
  // 현장 더블클릭 핸들러
  const handleSiteDoubleClick = (site) => {
    console.log('🚀 handleSiteDoubleClick 호출됨:', site);
    setSiteInfoPopup({ open: true, site });
    console.log('✅ SiteInfoPopup 상태 업데이트:', { open: true, site });
  };
  
  // 현장 정보 팝업 닫기
  const handleCloseSiteInfoPopup = () => {
    setSiteInfoPopup({ open: false, site: null });
  };

  // 현장명 더블클릭 시 현장관리페이지로 이동
  const handleSiteNameDoubleClick = (siteName) => {
    if (!siteName) return;
    
    // sites 배열에서 해당 현장명을 가진 현장 찾기
    const site = sites.find(s => s.name === siteName);
    
    if (site) {
      // 현장관리페이지로 이동하면서 해당 현장 선택
      navigate('/sites', { 
        state: { 
          selectedSiteId: site.id,
          selectedSiteName: site.name
        }
      });
    } else {
      // 현장을 찾을 수 없는 경우 알림
      alert(`현장 "${siteName}"을 찾을 수 없습니다.`);
    }
  };

  return (
    <Box sx={{ 
      p: 0, 
      height: isMobile ? 'calc(100vh - 100px)' : 'calc(100vh - 4px)',
      width: '100%',
      mx: 0,
      px: 0,
      margin: 0,
      padding: 0,
      position: 'fixed',
      top: isMobile ? '50px' : '60px',
      left: 0,
      right: 0,
      bottom: isMobile ? '50px' : '160px',
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

      {/* 탭별 콘텐츠 */}
      {activeTab === 0 && (
        /* 일정 관리 탭 */
        <DragDropContext 
          onDragStart={(result) => {
            // 길게 터치하지 않은 경우 드래그 취소
            const itemKey = result.draggableId;
            // CustomCalendar에서 전달받은 터치 상태 확인
            const touchState = window.touchStates?.[itemKey];
            if (!touchState || !touchState.isLongPress) {
              console.log('길게 터치하지 않아 드래그 취소:', itemKey);
              return false; // 드래그 취소
            }
          }}
          onDragEnd={onDragEnd}
        >
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
            height: isMobile ? 'calc(100vh - 100px)' : 'calc(100vh - 120px)',
            maxHeight: { xs: 'calc(100vh - 100px)', md: 'calc(100vh - 120px)' },
            position: { xs: 'static', md: 'static' },
            transform: { xs: 'none', md: 'none' },
            mt: { xs: 0, md: '15px' },
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
              {/* 탭 메뉴 - 컴팩트 */}
              <Paper sx={{ bgcolor: '#232734', border: '1px solid #333', borderRadius: 0, mb: 1, py: 0 }}>
                <Tabs
                  value={activeTab}
                  onChange={(e, newValue) => setActiveTab(newValue)}
                  sx={{
                    minHeight: '40px',
                    '& .MuiTab-root': {
                      color: '#ccc',
                      minHeight: '40px',
                      padding: '6px 12px',
                      fontSize: '0.875rem',
                      '&.Mui-selected': {
                        color: '#ff9800'
                      }
                    },
                    '& .MuiTabs-indicator': {
                      backgroundColor: '#ff9800',
                      height: '2px'
                    }
                  }}
                >
                  <Tab 
                    icon={<CalendarIcon sx={{ fontSize: '1.1rem' }} />} 
                    label="일정 관리" 
                    iconPosition="start"
                  />
                  <Tab 
                    icon={<BarChartIcon sx={{ fontSize: '1.1rem' }} />} 
                    label="히트맵 분석" 
                    iconPosition="start"
                  />
                </Tabs>
              </Paper>
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
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
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
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
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
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setSiteSearchTerm('')}
                        sx={{
                          color: siteSearchTerm ? '#ccc' : '#666',
                          '&:hover': {
                            color: '#fff',
                            backgroundColor: 'rgba(255, 255, 255, 0.1)'
                          },
                          padding: '4px',
                          opacity: siteSearchTerm ? 1 : 0.5
                        }}
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              
              {/* 복사된 현장 표시 영역 */}
              {copiedItem && (
                <Box sx={{
                  mt: 1,
                  p: 1,
                  bgcolor: 'rgba(255, 152, 0, 0.1)',
                  border: '1px solid rgba(255, 152, 0, 0.3)',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
                      📋 복사됨:
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#fff', fontWeight: 500 }}>
                      {copiedItem.siteName || copiedItem.text}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => setCopiedItem(null)}
                    sx={{
                      color: '#ff9800',
                      '&:hover': {
                        color: '#fff',
                        backgroundColor: 'rgba(255, 152, 0, 0.2)'
                      },
                      padding: '2px'
                    }}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}
            </Box>
            <Droppable droppableId="siteList" isDropDisabled={false}>
              {(provided, snapshot) => (
                <Box ref={provided.innerRef} {...provided.droppableProps} sx={{
                  flex: 1, 
                  overflowY: isMobile ? 'hidden' : 'auto', // 스크롤은 되지만 스크롤바는 숨김
                  p: isMobile ? 0.5 : 1,
                  bgcolor: snapshot.isDraggingOver ? '#2a2b32' : '#23242a',
                  maxHeight: isMobile ? 'calc(100vh - 200px)' : 'none',
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
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                                {/* 저장된 아이디어 표시 */}
                                {site.hasIdeas && (
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleShowSavedIdeas(site);
                                    }}
                                    sx={{
                                      color: '#FFD700',
                                      p: 0.5,
                                      '&:hover': {
                                        backgroundColor: 'rgba(255, 215, 0, 0.1)'
                                      }
                                    }}
                                  >
                                    <EditNoteIcon sx={{ fontSize: 16 }} />
                                  </IconButton>
                                )}
                              </Box>
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
              onDateNumberClick={handleDateCellDoubleClick}
              onCountClick={handleShowListPopup}
              onCellDoubleClick={() => {}} // 셀 더블클릭 시 아무것도 하지 않음
              onCheckItem={handleCheckItem}
              checkedItems={checkedItems}
              selectedItems={selectedItems}
              onDeleteSelected={handleDeleteSelected}
              sites={filteredSites}
              selectedDate={selectedDate}
              copiedItem={copiedItem}
              onExcel={handleExcel}
              onAddSchedule={onAddSchedule}
              onSiteNameDoubleClick={handleSiteNameDoubleClick}
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
      )}

      {activeTab === 1 && (
        /* 히트맵 분석 탭 */
        <Box sx={{ pb: 6 }}>
          <ScheduleHeatmap
            sites={sites}
            calendarItems={calendarItems}
            year={year}
            month={month}
            onYearChange={setYear}
            onMonthChange={setMonth}
            onTabChange={setActiveTab}
            onLogoClick={() => setActiveTab(0)}
          />
        </Box>
      )}
      
      {/* 현장 정보 팝업 */}
      <SiteInfoPopup
        open={siteInfoPopup.open}
        onClose={handleCloseSiteInfoPopup}
        site={siteInfoPopup.site}
      />
      
      
      
      {/* 일정 목록 팝업 */}
      {showListPopup && (
        <Box
          onClick={e => { e.stopPropagation(); handleCloseListPopup(); }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              handleCloseListPopup();
            }
          }}
          tabIndex={0}
          sx={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', bgcolor: 'rgba(0,0,0,0.7)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Box onClick={e => e.stopPropagation()} sx={{ width: 600, height: 'auto', bgcolor: '#2d2d2d', borderRadius: 2, p: 3, boxShadow: 8, position: 'relative', zIndex: 3100 }}>
            <IconButton onClick={e => { e.stopPropagation(); handleCloseListPopup(); }} sx={{ position: 'absolute', top: 8, right: 8, color: 'text.primary' }}>X</IconButton>
            <Typography variant="h5" sx={{ color: 'text.primary', mb: 3, fontWeight: 'bold' }}>
              {editPopup.open && editPopup.item ? '일정 수정' : 
               editPopup.open && !editPopup.item ? `${listPopupDate} 일정 추가` : 
               `${listPopupDate} 일정 목록`}
            </Typography>
            
            {/* 편집 모드일 때 편집 폼 표시 */}
            {editPopup.open ? (
              <>
                <TextField 
                  label="제목" 
                  value={editPopup.item ? (editPopup.item.text || '') : popupTitle} 
                  onChange={(e) => {
                    if (editPopup.item) {
                      setEditPopup({ ...editPopup, item: { ...editPopup.item, text: e.target.value } });
                    } else {
                      setPopupTitle(e.target.value);
                    }
                  }} 
                  fullWidth 
                  sx={{ mb: 3 }} 
                  autoFocus 
                  variant="outlined"
                  size="medium"
                />
                
                {/* 새 일정 추가 모드일 때만 현장명 검색 표시 */}
                {!editPopup.item && (
                  <Autocomplete
                    options={sites.map(site => site.name).filter(Boolean)}
                    value={popupSiteName || ''}
                    onInputChange={(_, v) => setPopupSiteName(v)}
                    renderInput={(params) => <TextField {...params} label="현장명 검색" />}
                    freeSolo
                    sx={{ mb: 2 }}
                  />
                )}
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'medium' }}>분류 선택</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                    <FormControlLabel
                      control={<Checkbox 
                        checked={editPopup.item ? editPopup.item.type === '현장' : selectedTypes.includes('현장')} 
                        onChange={() => editPopup.item ? handleEditTypeChange('현장') : handleTypeChange('현장')} 
                      />}
                      label="현장"
                    />
                    <FormControlLabel
                      control={<Checkbox 
                        checked={editPopup.item ? editPopup.item.type === '회의' : selectedTypes.includes('회의')} 
                        onChange={() => editPopup.item ? handleEditTypeChange('회의') : handleTypeChange('회의')} 
                      />}
                      label="회의"
                    />
                    <FormControlLabel
                      control={<Checkbox 
                        checked={editPopup.item ? editPopup.item.type === '전자입찰' : selectedTypes.includes('전자입찰')} 
                        onChange={() => editPopup.item ? handleEditTypeChange('전자입찰') : handleTypeChange('전자입찰')} 
                      />}
                      label="전자입찰"
                    />
                    <FormControlLabel
                      control={<Checkbox 
                        checked={editPopup.item ? editPopup.item.type === '현설' : selectedTypes.includes('현설')} 
                        onChange={() => editPopup.item ? handleEditTypeChange('현설') : handleTypeChange('현설')} 
                      />}
                      label="현설"
                    />
                    <FormControlLabel
                      control={<Checkbox 
                        checked={editPopup.item ? editPopup.item.type === '실측' : selectedTypes.includes('실측')} 
                        onChange={() => editPopup.item ? handleEditTypeChange('실측') : handleTypeChange('실측')} 
                      />}
                      label="실측"
                    />
                    <FormControlLabel
                      control={<Checkbox 
                        checked={editPopup.item ? editPopup.item.type === '기타' : selectedTypes.includes('기타')} 
                        onChange={() => editPopup.item ? handleEditTypeChange('기타') : handleTypeChange('기타')} 
                      />}
                      label="기타"
                    />
                  </Box>
                </Box>
                
                {/* 색상 선택과 날씨 선택 */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2 }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'medium' }}>색상 선택</Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                  {colorChoices.map(color => (
                    <Box
                      key={color}
                      onClick={() => {
                        if (editPopup.item) {
                          setEditPopup({ ...editPopup, item: { ...editPopup.item, color } });
                        } else {
                          setSelectedColor(color);
                        }
                      }}
                      sx={{
                        width: 24, height: 24, borderRadius: '50%',
                        bgcolor: color === 'transparent' ? 'transparent' : color,
                        cursor: 'pointer',
                        border: (editPopup.item ? editPopup.item.color === color : selectedColor === color) ? '3px solid #fff' : '2px solid #888',
                        boxShadow: (editPopup.item ? editPopup.item.color === color : selectedColor === color) ? '0 0 0 2px #1976d2' : 'none',
                        transition: 'all 0.15s',
                        position: 'relative',
                        ...(color === 'transparent' && {
                          '&::after': {
                            content: '"없음"',
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            fontSize: '0.6rem',
                            color: '#666',
                            fontWeight: 'bold'
                          }
                        })
                      }}
                    />
                  ))}
                    </Box>
                  </Box>
                  
                  {/* 날씨 선택 - 현장, 현설, 실측, 기타만 표시 */}
                  {(() => {
                    const currentType = editPopup.item ? editPopup.item.type : selectedTypes[0];
                    // 일정 추가 모달에서는 분류 선택 없이도 날씨 표시, 편집 모달에서는 특정 분류만
                    const showWeather = editPopup.item ? 
                      (currentType === '현장' || currentType === '현설' || currentType === '실측' || currentType === '기타') :
                      true; // 일정 추가 모달에서는 항상 표시
                    
                    if (!showWeather) return null;
                    
                    return (
                      <Box>
                        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'medium' }}>날씨 선택</Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {['☀️', '☔', '⛄', '🌀', '없음'].map((weather, index) => (
                            <Box
                              key={index}
                              onClick={() => {
                                if (editPopup.item) {
                                  setEditPopup({ ...editPopup, item: { ...editPopup.item, weather } });
                                } else {
                                  setSelectedWeather(weather);
                                }
                              }}
                              sx={{
                                width: 32, height: 32, borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer',
                                border: (editPopup.item ? (editPopup.item.weather || '☀️') === weather : selectedWeather === weather) ? '2px solid #1976d2' : '2px solid #ccc',
                                backgroundColor: weather === '없음' ? '#666' : ((editPopup.item ? (editPopup.item.weather || '☀️') === weather : selectedWeather === weather) ? 'rgba(25, 118, 210, 0.1)' : 'transparent'),
                                transition: 'all 0.15s',
                                fontSize: '1.2rem'
                              }}
                            >
                              {weather === '없음' ? '' : weather}
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    );
                  })()}
                </Box>
                
                
                <TextField 
                  label="설명" 
                  value={editPopup.item ? (editPopup.item.desc || '') : popupDesc} 
                  onChange={(e) => {
                    if (editPopup.item) {
                      setEditPopup({ ...editPopup, item: { ...editPopup.item, desc: e.target.value } });
                    } else {
                      setPopupDesc(e.target.value);
                    }
                  }} 
                  fullWidth 
                  multiline 
                  rows={4} 
                  sx={{ mb: 3 }} 
                  variant="outlined"
                  size="medium"
                />
                
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
                  <Button 
                    variant="outlined" 
                    onClick={() => setEditPopup({ open: false, item: null, date: null })} 
                    sx={{ minWidth: 80 }}
                  >
                    취소
                  </Button>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={editPopup.item ? handleEditSave : handleAddSchedule} 
                    sx={{ minWidth: 80 }}
                    disabled={editPopup.item ? 
                      (!editPopup.item?.text?.trim() && !editPopup.item?.siteName?.trim()) :
                      ((!popupTitle.trim() && !popupSiteName.trim()) || selectedTypes.length === 0)
                    }
                  >
                    {editPopup.item ? '저장' : '추가'}
                  </Button>
                </Box>
              </>
            ) : (
              <>
              </>
            )}
            
            {/* 편집 모드가 아닐 때만 일정 목록 표시 */}
            {!editPopup.open && (
              <>
                {(calendarItems[listPopupDate] && calendarItems[listPopupDate].length > 0) ? (
              calendarItems[listPopupDate].map(item => {
                // 타입에 따른 태그 매핑
                const getTypeTag = (type) => {
                  if (!type) return '';
                  const typeStr = type.toString().toLowerCase();
                  if (typeStr.includes('현장')) return '[현장]';
                  if (typeStr.includes('실측')) return '[실측]';
                  if (typeStr.includes('기타')) return '[기타]';
                  if (typeStr.includes('회의')) return '[회의]';
                  if (typeStr.includes('현설')) return '[현설]';
                  if (typeStr.includes('입찰')) return '[입찰]';
                  if (typeStr.includes('견적')) return '[견적]';
                  return `[${type}]`;
                };

                const typeTag = getTypeTag(item.type);
                
                return (
                  <Paper 
                    key={item.id} 
                    sx={{ 
                      mb: 1, 
                      p: 1, 
                      bgcolor: 'background.default',
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'background.paper',
                        boxShadow: 2
                      }
                    }}
                    onClick={() => {
                      // 편집할 항목 설정
                      setEditPopup({ open: true, item, date: listPopupDate });
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      {typeTag && (
                        <Typography 
                          sx={{ 
                            fontWeight: 600, 
                            color: 'primary.main',
                            fontSize: '0.75rem',
                            bgcolor: 'primary.light',
                            color: 'primary.contrastText',
                            px: 1,
                            py: 0.25,
                            borderRadius: 1,
                            minWidth: 'fit-content'
                          }}
                        >
                          {typeTag}
                        </Typography>
                      )}
                      <Typography sx={{ fontWeight: 600, flex: 1 }}>
                        {item.text}
                      </Typography>
                    </Box>
                    {item.desc && (
                      <Typography variant="body2" color="text.secondary">
                        {item.desc}
                      </Typography>
                    )}
                  </Paper>
                );
              })
                ) : (
                  <Typography color="text.secondary">일정이 없습니다.</Typography>
                )}
              </>
            )}
          </Box>
        </Box>
      )}
      
      {/* 저장된 아이디어 팝업 */}
      {savedIdeasPopup.open && (
        <Box
          onClick={(e) => {
            e.stopPropagation();
            setSavedIdeasPopup({ open: false, site: null, ideas: [] });
          }}
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            bgcolor: 'rgba(0,0,0,0.4)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Box
            onClick={(e) => e.stopPropagation()}
            sx={{
              minWidth: 500,
              maxWidth: 800,
              maxHeight: '80vh',
              bgcolor: '#2a2b32',
              borderRadius: 3,
              p: 3,
              boxShadow: 5,
              position: 'relative',
              zIndex: 3100,
              overflow: 'auto'
            }}
          >
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                setSavedIdeasPopup({ open: false, site: null, ideas: [] });
              }}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                color: '#fff'
              }}
            >
              ✕
            </IconButton>
            
            <Typography variant="h6" sx={{ color: '#fff', mb: 2 }}>
              📝 {savedIdeasPopup.site?.name} - 저장된 아이디어
            </Typography>
            
            {savedIdeasPopup.ideas.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {savedIdeasPopup.ideas.map((idea, index) => (
                  <Paper
                    key={idea.id}
                    sx={{
                      p: 2,
                      bgcolor: '#333',
                      border: '1px solid #555',
                      borderRadius: 2,
                      position: 'relative',
                      '&:hover': {
                        bgcolor: '#444'
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box
                        component="img"
                        src={idea.url}
                        alt={idea.displayName}
                        sx={{
                          width: 80,
                          height: 60,
                          objectFit: 'cover',
                          borderRadius: 1,
                          border: '1px solid #666',
                          cursor: 'pointer'
                        }}
                        onClick={() => {
                          // 아이디어패드에서 해당 아이디어 열기
                          setSavedIdeasPopup({ open: false, site: null, ideas: [] });
                          // 아이디어패드 열기 (부모 컴포넌트에 전달)
                          if (onOpenIdeaPad) {
                            onOpenIdeaPad(idea.siteId, idea.siteName, idea.id);
                          }
                        }}
                      />
                      <Box sx={{ flex: 1, cursor: 'pointer' }}
                        onClick={() => {
                          // 아이디어패드에서 해당 아이디어 열기
                          setSavedIdeasPopup({ open: false, site: null, ideas: [] });
                          // 아이디어패드 열기 (부모 컴포넌트에 전달)
                          if (onOpenIdeaPad) {
                            onOpenIdeaPad(idea.siteId, idea.siteName, idea.id);
                          }
                        }}
                      >
                        <Typography variant="subtitle1" sx={{ color: '#fff', mb: 0.5 }}>
                          {idea.displayName || `${savedIdeasPopup.site?.name} - 아이디어 ${index + 1}`}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#bbb' }}>
                          {idea.timestamp ? new Date(idea.timestamp.seconds * 1000).toLocaleString('ko-KR') : '날짜 정보 없음'}
                        </Typography>
                      </Box>
                      
                      {/* 삭제 버튼 */}
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteIdea(idea.id, idea.displayName || `${savedIdeasPopup.site?.name} - 아이디어 ${index + 1}`);
                        }}
                        sx={{
                          color: '#ff6b6b',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 107, 107, 0.1)',
                            color: '#ff5252'
                          }
                        }}
                        title="아이디어 삭제"
                      >
                        🗑️
                      </IconButton>
                    </Box>
                  </Paper>
                ))}
              </Box>
            ) : (
              <Typography sx={{ color: '#bbb', textAlign: 'center', py: 4 }}>
                저장된 아이디어가 없습니다.
              </Typography>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ScheduleManagement; 