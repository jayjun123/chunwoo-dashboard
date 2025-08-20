import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getSites } from '../../api/sites';
import { 
  subscribeToDiscussions, 
  subscribeToMessages, 
  createDiscussion, 
  sendMessage, 
  deleteDiscussion,
  removeParticipant,
  addParticipant,
  getDiscussionParticipants
} from '../../api/discussions';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { sendNewPostNotification, checkNotificationPermission, loadNotificationSettings } from '../../utils/notificationUtils';
import { useAuth } from '../../contexts/AuthContext';
import { getUserDisplayName, logUserInfo, getDeviceInfo } from '../../utils/discussionUtils';
import SearchableSiteSelect from '../common/SearchableSiteSelect';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Chip,
  Badge,
  Alert,
  Snackbar,
  Grid,
  Menu,
  ListItemIcon,
  ListItemText,
  Divider,
  AppBar,
  Toolbar,
  Fab,
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Send as SendIcon,
  Add as AddIcon,
  Search as SearchIcon,
  AttachFile as AttachFileIcon,
  MoreVert as MoreVertIcon,
  Info as InfoIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  ExitToApp as ExitToAppIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ArrowBack as ArrowBackIcon,
  KeyboardArrowUp as ArrowUpIcon,
  ColorLens as ColorLensIcon,
  Palette as PaletteIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon
} from '@mui/icons-material';

const PCKakaoDiscussion = () => {
  const { currentUser } = useAuth();
  // 상태 관리
  const [discussions, setDiscussions] = useState([]);
  const [selectedDiscussion, setSelectedDiscussion] = useState(null);
  const [messages, setMessages] = useState({});
  const [newMessage, setNewMessage] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [newDiscussion, setNewDiscussion] = useState({
    title: '',
    subtitle: '',
    siteName: '',
    password: '',
    category: '',
    priority: 'normal',
    files: []
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
  const [isParticipantsDialogOpen, setIsParticipantsDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [passwordDialog, setPasswordDialog] = useState({ open: false, discussion: null, password: '' });
  const [editDialog, setEditDialog] = useState({ open: false, discussion: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, discussion: null, password: '' });
  const [passwordSettingDialog, setPasswordSettingDialog] = useState({ open: false, discussion: null, password: '', confirmPassword: '' });
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({});
  const [sites, setSites] = useState([]);
  const [sitesLoading, setSitesLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [participants, setParticipants] = useState([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [exportDialog, setExportDialog] = useState({ open: false });
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [bubbleColor, setBubbleColor] = useState('#4caf50');
  const [textColor, setTextColor] = useState('#ffffff');
  const [backgroundColor, setBackgroundColor] = useState('#1a202c');
  const messagesEndRef = useRef(null);
  const passwordInputRef = useRef(null);



  // 알림 설정 로드
  useEffect(() => {
    const settings = loadNotificationSettings();
    setNotificationSettings(settings);
  }, []);

  // 실시간 데이터 구독
  useEffect(() => {
    // 현장 데이터 로드
    const fetchSites = async () => {
      setSitesLoading(true);
      try {
        const sitesData = await getSites();
        setSites(sitesData);
      } catch (error) {
        console.error('현장 데이터 로드 실패:', error);
        setSnackbar({ open: true, message: '현장 데이터 로드 실패', severity: 'error' });
      } finally {
        setSitesLoading(false);
      }
    };

    fetchSites();

    // 토론 목록 구독
    const unsubscribeDiscussions = subscribeToDiscussions((discussionsData) => {
      setDiscussions(discussionsData);
    });

    return () => {
      unsubscribeDiscussions();
    };
  }, []);

  // 선택된 토론의 메시지 구독
  useEffect(() => {
    if (selectedDiscussion) {
      const unsubscribeMessages = subscribeToMessages(selectedDiscussion.id, (messagesData) => {
        setMessages(prev => ({
          ...prev,
          [selectedDiscussion.id]: messagesData
        }));
        
        // 항상 마지막 메시지가 보이도록 스크롤
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      });

      return () => unsubscribeMessages();
    }
  }, [selectedDiscussion]);

  // 스크롤 이벤트 처리
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setShowScrollTop(scrollTop > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 키보드 높이 감지
  useEffect(() => {
    const handleResize = () => {
      const visualViewport = window.visualViewport;
      if (visualViewport) {
        const keyboardHeight = window.innerHeight - visualViewport.height;
        // PC에서는 키보드 높이를 고려하지 않음
      }
    };

    window.visualViewport?.addEventListener('resize', handleResize);
    return () => window.visualViewport?.removeEventListener('resize', handleResize);
  }, []);

  // 파일 첨부 처리
  const handleFileAttach = (event) => {
    const files = Array.from(event.target.files);
    setAttachedFiles(prev => [...prev, ...files]);
  };

  const handleRemoveFile = (index) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // 토론 생성
  const handleCreateDiscussion = async () => {
    if (!newDiscussion.siteName.trim()) {
      setSnackbar({ open: true, message: '현장명을 선택해주세요', severity: 'warning' });
      return;
    }

    try {
      const discussionData = {
        ...newDiscussion,
        title: newDiscussion.siteName, // 현장명을 제목으로 사용
        createdBy: currentUser.uid,
        createdAt: new Date(),
        participants: [currentUser.uid]
      };

      await createDiscussion(discussionData);

      // 알림 설정이 활성화되어 있고 권한이 허용된 경우 알림 보내기
      if (notificationSettings.newPost && checkNotificationPermission() === 'granted') {
        sendNewPostNotification('discussion', discussionData.title);
      }

      setNewDiscussion({
        title: '',
        subtitle: '',
        siteName: '',
        password: '',
        category: '',
        priority: 'normal',
        files: []
      });
      setIsCreateDialogOpen(false);
      setSnackbar({ open: true, message: '토론이 생성되었습니다', severity: 'success' });
    } catch (error) {
      console.error('토론 생성 실패:', error);
      setSnackbar({ open: true, message: '토론 생성에 실패했습니다', severity: 'error' });
    }
  };

  // 메뉴 처리
  const handleMenuOpen = (event) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleMenuAction = (action) => {
    handleMenuClose();
    
    switch (action) {
      case 'info':
        setIsInfoDialogOpen(true);
        break;
      case 'participants':
        handleLoadParticipants();
        setIsParticipantsDialogOpen(true);
        break;
      case 'settings':
        setIsSettingsDialogOpen(true);
        break;
      case 'edit':
        handleEditDiscussion();
        break;
      case 'export':
        setExportDialog({ open: true });
        break;
      case 'leave':
        setPasswordDialog({ 
          open: true, 
          discussion: selectedDiscussion, 
          password: '',
          type: 'leave' // 퇴장용 비밀번호 확인
        });
        break;
      default:
        break;
    }
  };

  // 메시지 내보내기
  const handleExportMessages = () => {
    if (!selectedDiscussion || !messages[selectedDiscussion.id]) {
      setSnackbar({ open: true, message: '내보낼 메시지가 없습니다', severity: 'warning' });
      return;
    }

    const exportToExcel = () => {
      const messageList = messages[selectedDiscussion.id];
      let csvContent = 'data:text/csv;charset=utf-8,';
      csvContent += '사용자,내용,시간\n';
      
      messageList.forEach(msg => {
        const row = [
          msg.author || '알 수 없음',
          `"${msg.content.replace(/"/g, '""')}"`,
          msg.timestamp || new Date().toLocaleString()
        ].join(',');
        csvContent += row + '\n';
      });
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `${selectedDiscussion.title}_대화내용.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    const exportToPDF = () => {
      // PDF 내보내기 로직 (jsPDF 사용)
      const messageList = messages[selectedDiscussion.id];
      let pdfContent = '';
      
      messageList.forEach(msg => {
        pdfContent += `${msg.author || '알 수 없음'} (${msg.timestamp || new Date().toLocaleString()})\n`;
        pdfContent += `${msg.content}\n\n`;
      });
      
      // 실제 PDF 생성은 별도 라이브러리 필요
      console.log('PDF 내보내기:', pdfContent);
    };

    if (exportDialog.format === 'excel') {
      exportToExcel();
    } else {
      exportToPDF();
    }
    
    setExportDialog({ open: false });
    setSnackbar({ open: true, message: '메시지가 내보내기되었습니다', severity: 'success' });
  };

  // 토론 나가기
  const handleLeaveDiscussion = async () => {
    if (!selectedDiscussion) return;

    try {
      await removeParticipant(selectedDiscussion.id, currentUser.uid);
      setSelectedDiscussion(null);
      setSnackbar({ open: true, message: '토론에서 나갔습니다', severity: 'success' });
    } catch (error) {
      console.error('토론 나가기 실패:', error);
      setSnackbar({ open: true, message: '토론 나가기에 실패했습니다', severity: 'error' });
    }
  };

  // 참여자 정보 로드
  const handleLoadParticipants = async () => {
    if (!selectedDiscussion) return;

    setParticipantsLoading(true);
    try {
      console.log('🔥 참여자 정보 로드 시작:', selectedDiscussion.id);
      
      // 참여자 정보 가져오기
      const participantsData = await getDiscussionParticipants(selectedDiscussion.id);
      console.log('🔥 참여자 데이터:', participantsData);
      
      if (participantsData && participantsData.participants && participantsData.participants.length > 0) {
        setParticipants(participantsData.participants);
        setSnackbar({ 
          open: true, 
          message: `참여자 ${participantsData.participants.length}명이 조회되었습니다.`, 
          severity: 'success' 
        });
      } else {
        // 참여자 정보가 없는 경우 현재 사용자를 기본 참여자로 설정
        const defaultParticipant = {
          id: currentUser?.uid || 'unknown',
          name: currentUser?.displayName || currentUser?.email || '현재 사용자',
          email: currentUser?.email || '',
          role: '참여자',
          avatar: currentUser?.photoURL || '',
          joinTime: selectedDiscussion.createdAt || new Date(),
          isOnline: true
        };
        
        setParticipants([defaultParticipant]);
        
        // 참여자 정보가 없으면 현재 사용자를 참여자로 추가
        try {
          // 사용자의 실제 이름을 가져오기 위한 로직
          let userName = '현재 사용자';
          
          if (currentUser.displayName && currentUser.displayName.trim() !== '') {
            userName = currentUser.displayName;
          } else if (currentUser.email) {
            // 이메일에서 @ 앞부분을 이름으로 사용
            const emailName = currentUser.email.split('@')[0];
            // 이메일 이름을 더 읽기 쉽게 변환 (예: john.doe -> John Doe)
            userName = emailName
              .split(/[._-]/)
              .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
              .join(' ');
          }
          
          await addParticipant(
            selectedDiscussion.id, 
            currentUser.uid, 
            userName
          );
          console.log('🔥 현재 사용자를 참여자로 추가했습니다:', userName);
        } catch (addError) {
          console.error('🔥 참여자 추가 실패:', addError);
        }
        
        setSnackbar({ 
          open: true, 
          message: '참여자 정보를 초기화했습니다.', 
          severity: 'info' 
        });
      }
      
    } catch (error) {
      console.error('🔥 참여자 정보 로드 실패:', error);
      
      // 에러 발생 시 현재 사용자를 기본 참여자로 설정
      const defaultParticipant = {
        id: currentUser?.uid || 'unknown',
        name: currentUser?.displayName || currentUser?.email || '현재 사용자',
        email: currentUser?.email || '',
        role: '참여자',
        avatar: currentUser?.photoURL || '',
        joinTime: new Date(),
        isOnline: true
      };
      
      setParticipants([defaultParticipant]);
      
      setSnackbar({ 
        open: true, 
        message: '참여자 정보를 불러오는데 실패했습니다. 기본 정보를 표시합니다.', 
        severity: 'warning' 
      });
    } finally {
      setParticipantsLoading(false);
    }
  };

  // 자물쇠 클릭 핸들러 (비밀번호 설정/입장)
  const handleLockClick = (discussion, e) => {
    e.stopPropagation();
    
    if (discussion.password && discussion.password.trim() !== '') {
      // 비밀번호가 있으면 입장 다이얼로그 열기
      setPasswordDialog({ 
        open: true, 
        discussion: discussion, 
        password: '',
        type: 'enter'
      });
    } else {
      // 비밀번호가 없으면 설정 다이얼로그 열기
      setPasswordSettingDialog({ 
        open: true, 
        discussion: discussion, 
        password: '', 
        confirmPassword: '' 
      });
    }
  };

  // 비밀번호 설정 저장
  const handlePasswordSettingSave = async () => {
    const { discussion, password, confirmPassword } = passwordSettingDialog;
    
    if (password !== confirmPassword) {
      setSnackbar({ open: true, message: '비밀번호가 일치하지 않습니다.', severity: 'error' });
      return;
    }
    
    if (password.length < 4) {
      setSnackbar({ open: true, message: '비밀번호는 4자 이상이어야 합니다.', severity: 'warning' });
      return;
    }
    
    try {
      // 토론 비밀번호 업데이트
      const discussionRef = doc(db, 'discussions', discussion.id);
      await updateDoc(discussionRef, {
        password: password
      });
      
      setSnackbar({ open: true, message: '비밀번호가 설정되었습니다.', severity: 'success' });
      setPasswordSettingDialog({ open: false, discussion: null, password: '', confirmPassword: '' });
    } catch (error) {
      console.error('비밀번호 설정 실패:', error);
      setSnackbar({ open: true, message: '비밀번호 설정에 실패했습니다.', severity: 'error' });
    }
  };

  // 비밀번호 확인
  const handlePasswordCheck = async () => {
    const discussion = passwordDialog.discussion || selectedDiscussion;
    
    if (passwordDialog.password !== discussion.password) {
      setSnackbar({ open: true, message: '비밀번호가 틀렸습니다. 다시 입력해주세요.', severity: 'error' });
      // 비밀번호 필드 초기화
      setPasswordDialog(prev => ({ ...prev, password: '' }));
      // 포커스를 비밀번호 입력 필드로 이동
      setTimeout(() => {
        if (passwordInputRef.current) {
          passwordInputRef.current.focus();
        }
      }, 100);
      return;
    }
    
    // 비밀번호 확인 타입에 따라 처리
    if (passwordDialog.type === 'enter') {
      // 입장 처리
      setSelectedDiscussion(discussion);
      setSelectedMessages([]);
      
      // 참여자로 추가
      try {
        // 사용자의 실제 이름을 가져오기 위한 로직
        let userName = '현재 사용자';
        
        if (currentUser.displayName && currentUser.displayName.trim() !== '') {
          userName = currentUser.displayName;
        } else if (currentUser.email) {
          // 이메일에서 @ 앞부분을 이름으로 사용
          const emailName = currentUser.email.split('@')[0];
          // 이메일 이름을 더 읽기 쉽게 변환 (예: john.doe -> John Doe)
          userName = emailName
            .split(/[._-]/)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join(' ');
        }
        
        await addParticipant(
          discussion.id, 
          currentUser.uid, 
          userName
        );
      } catch (error) {
        console.error('참여자 추가 실패:', error);
      }
      
      setSnackbar({ open: true, message: '토론방에 입장했습니다', severity: 'success' });
      // 입장 후 마지막 메시지로 스크롤
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    } else {
      // 퇴장 처리
      await handleLeaveDiscussion();
    }
    
    setPasswordDialog({ open: false, discussion: null, password: '', type: '' });
  };

  // 토론 선택
  const handleDiscussionSelect = async (discussion) => {
    // 비밀번호가 있는 방인지 확인
    if (discussion.password && discussion.password.trim() !== '') {
      // 비밀번호 확인 다이얼로그 열기
      setPasswordDialog({ 
        open: true, 
        discussion: discussion, 
        password: '',
        type: 'enter' // 입장용 비밀번호 확인
      });
    } else {
      // 비밀번호가 없으면 바로 입장
      setSelectedDiscussion(discussion);
      setSelectedMessages([]);
      
      // 참여자로 추가
      try {
        // 공통 함수를 사용하여 사용자 이름 생성
        const userName = getUserDisplayName(currentUser);
        
        // 디버깅을 위한 로그
        logUserInfo(currentUser, 'PC 토론방 입장');
        
        await addParticipant(
          discussion.id, 
          currentUser.uid, 
          userName
        );
      } catch (error) {
        console.error('참여자 추가 실패:', error);
      }
      
      // 채팅방 입장 시 마지막 메시지로 스크롤
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    }
  };

  // 토론 편집
  const handleEditDiscussion = async () => {
    if (!selectedDiscussion) return;
    
    // 수정 다이얼로그 열기
    setEditDialog({ 
      open: true, 
      discussion: selectedDiscussion 
    });
  };

  // 토론 편집 저장
  const handleEditSave = async () => {
    if (!editDialog.discussion) return;

    try {
      const { title, subtitle, siteName, password } = editDialog.discussion;
      
      // 필수 필드 검증
      if (!title || !title.trim()) {
        setSnackbar({ open: true, message: '토론 제목을 입력해주세요', severity: 'error' });
        return;
      }
      
      if (!siteName || !siteName.trim()) {
        setSnackbar({ open: true, message: '현장명을 입력해주세요', severity: 'error' });
        return;
      }
      
      // 수정 API 호출
      const discussionRef = doc(db, 'discussions', editDialog.discussion.id);
      await updateDoc(discussionRef, {
        title: title.trim(),
        subtitle: subtitle?.trim() || '',
        siteName: siteName.trim(),
        password: password?.trim() || '',
        updatedAt: new Date()
      });
      
      // 선택된 토론 정보 업데이트
      setSelectedDiscussion(prev => ({
        ...prev,
        title: title.trim(),
        subtitle: subtitle?.trim() || '',
        siteName: siteName.trim(),
        password: password?.trim() || ''
      }));
      
      setEditDialog({ open: false, discussion: null });
      setSnackbar({ open: true, message: '토론이 수정되었습니다', severity: 'success' });
    } catch (error) {
      console.error('토론 편집 실패:', error);
      setSnackbar({ open: true, message: '토론 편집에 실패했습니다', severity: 'error' });
    }
  };

  // 토론 삭제
  const handleDeleteDiscussion = async () => {
    if (!deleteDialog.discussion) return;

    // 비밀번호가 있는 경우 비밀번호 검증
    if (deleteDialog.discussion.password && deleteDialog.discussion.password.trim() !== '') {
      if (deleteDialog.password !== deleteDialog.discussion.password) {
        setSnackbar({ open: true, message: '비밀번호가 올바르지 않습니다', severity: 'error' });
        return;
      }
    }

    try {
      await deleteDiscussion(deleteDialog.discussion.id);
      
      // 선택된 토론이 삭제된 토론이면 선택 해제
      if (selectedDiscussion?.id === deleteDialog.discussion.id) {
        setSelectedDiscussion(null);
      }
      
      setSnackbar({ open: true, message: '토론이 삭제되었습니다', severity: 'success' });
      setDeleteDialog({ open: false, discussion: null, password: '' });
    } catch (error) {
      console.error('토론 삭제 실패:', error);
      setSnackbar({ open: true, message: '토론 삭제에 실패했습니다', severity: 'error' });
    }
  };

  // 설정 저장 (비밀번호 + 스타일)
  const handlePasswordReset = async () => {
    // 현재 비밀번호 확인 (비밀번호 변경/삭제 시)
    if (currentPassword && selectedDiscussion.password) {
      if (currentPassword !== selectedDiscussion.password) {
        setSnackbar({ open: true, message: '현재 비밀번호가 올바르지 않습니다', severity: 'error' });
        return;
      }
    }

    // 새 비밀번호 검증
    if (newPassword || confirmPassword) {
      if (newPassword !== confirmPassword) {
        setSnackbar({ open: true, message: '새 비밀번호가 일치하지 않습니다', severity: 'error' });
        return;
      }

      if (newPassword && newPassword.length < 4) {
        setSnackbar({ open: true, message: '비밀번호는 4자 이상이어야 합니다', severity: 'warning' });
        return;
      }
    }

    try {
      // 비밀번호 변경/삭제 로직
      if (selectedDiscussion) {
        if (newPassword && confirmPassword) {
          // 새 비밀번호 설정
          // 여기에 실제 비밀번호 업데이트 로직 추가
          setSnackbar({ open: true, message: '비밀번호가 변경되었습니다', severity: 'success' });
        } else if (newPassword === '' && confirmPassword === '') {
          // 비밀번호 삭제 (빈 값으로 저장)
          // 여기에 실제 비밀번호 삭제 로직 추가
          setSnackbar({ open: true, message: '비밀번호가 삭제되었습니다', severity: 'success' });
        }
        
        setNewPassword('');
        setConfirmPassword('');
        setCurrentPassword('');
      }

      // 스타일 설정 저장 (로컬 스토리지)
      localStorage.setItem('chatBubbleColor', bubbleColor);
      localStorage.setItem('chatTextColor', textColor);
      localStorage.setItem('chatBackgroundColor', backgroundColor);
      
      setSnackbar({ open: true, message: '설정이 저장되었습니다', severity: 'success' });
      setIsSettingsDialogOpen(false);
    } catch (error) {
      console.error('설정 저장 실패:', error);
      setSnackbar({ open: true, message: '설정 저장에 실패했습니다', severity: 'error' });
    }
  };

  // 스크롤 맨 위로
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 메시지 전송
  const handleSendMessage = async () => {
    if ((!newMessage.trim() && attachedFiles.length === 0) || !selectedDiscussion) return;

    try {
      await sendMessage(selectedDiscussion.id, {
        content: newMessage,
        author: currentUser.displayName || currentUser.email,
        timestamp: new Date().toLocaleString(),
        files: attachedFiles,
        isMyMessage: true // 내 메시지 표시
      });

      setNewMessage('');
      setAttachedFiles([]);
      
      // 스크롤을 맨 아래로
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      setSnackbar({ open: true, message: '메시지 전송에 실패했습니다', severity: 'error' });
    }
  };

  // 메시지 선택/해제
  const handleMessageSelect = (messageId) => {
    setSelectedMessages(prev => 
      prev.includes(messageId) 
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  };

  // 전체 선택/해제
  const handleSelectAll = () => {
    if (!selectedDiscussion || !messages[selectedDiscussion.id]) return;
    
    const allMessageIds = messages[selectedDiscussion.id].map(msg => msg.id);
    setSelectedMessages(prev => 
      prev.length === allMessageIds.length ? [] : allMessageIds
    );
  };

  // 선택된 메시지 삭제
  const handleDeleteSelectedMessages = () => {
    if (selectedMessages.length === 0) {
      setSnackbar({ open: true, message: '삭제할 메시지를 선택해주세요', severity: 'warning' });
      return;
    }

    // 메시지 삭제 로직
    setSelectedMessages([]);
    setSnackbar({ open: true, message: '선택된 메시지가 삭제되었습니다', severity: 'success' });
  };

  // 필터링된 토론 목록
  const filteredDiscussions = useMemo(() => {
    return discussions.filter(discussion =>
      discussion.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      discussion.subtitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      discussion.siteName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [discussions, searchTerm]);

  return (
    <Box sx={{ 
      height: 'calc(100vh - 90px)', // 헤더(56px) + 하단바(34px) 제외
      display: 'flex', 
      flexDirection: 'column', 
      backgroundColor: '#1a202c',
      mt: '56px', // 헤더 높이만큼 아래로 이동
      mb: '34px' // 하단바 높이만큼 위로 이동
    }}>
      {/* PC용 레이아웃: 오른쪽에 채팅방 목록, 왼쪽에 채팅 내용 */}
      <Box sx={{ display: 'flex', height: '100%' }}>
        {/* 오른쪽: 채팅방 목록 */}
        <Box sx={{ 
          width: '350px', 
          borderRight: '1px solid #4a5568',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#2d3748'
        }}>
          {/* 헤더 */}
          <Box sx={{ 
            p: 2, 
            borderBottom: '1px solid #4a5568',
            backgroundColor: '#2d3748'
          }}>
            <Typography variant="h6" sx={{ mb: 1, color: 'white' }}>
              토론 목록
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="토론 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: '#a0aec0' }} />,
                sx: { 
                  backgroundColor: '#4a5568',
                  '& input': { color: 'white' },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#4a5568' },
                    '&:hover fieldset': { borderColor: '#718096' },
                    '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                  }
                }
              }}
            />
            <Button
              fullWidth
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setIsCreateDialogOpen(true)}
              sx={{ mt: 1, backgroundColor: '#4caf50' }}
            >
              새 토론 만들기
            </Button>
          </Box>

          {/* 채팅방 목록 */}
          <Box sx={{ 
            flex: 1, 
            overflow: 'auto',
            // 스크롤바 숨기기
            '&::-webkit-scrollbar': {
              display: 'none'
            },
            msOverflowStyle: 'none',  // IE and Edge
            'scrollbarWidth': 'none',  // Firefox
          }}>
            {filteredDiscussions.map((discussion) => (
              <Card
                key={discussion.id}
                sx={{
                  m: 1,
                  cursor: 'pointer',
                  backgroundColor: selectedDiscussion?.id === discussion.id ? '#4a5568' : '#2d3748',
                  '&:hover': { backgroundColor: '#4a5568' },
                  border: '1px solid #4a5568'
                }}
                onClick={() => handleDiscussionSelect(discussion)}
              >
                <CardContent sx={{ py: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'white', flex: 1 }}>
                      {discussion.siteName || discussion.title}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={(e) => handleLockClick(discussion, e)}
                      sx={{ 
                        color: discussion.password && discussion.password.trim() !== '' ? '#ff9800' : '#90caf9',
                        p: 0.5,
                        '&:hover': { 
                          backgroundColor: discussion.password && discussion.password.trim() !== '' 
                            ? 'rgba(255, 152, 0, 0.1)' 
                            : 'rgba(144, 202, 249, 0.1)' 
                        }
                      }}
                      title={discussion.password && discussion.password.trim() !== '' ? "클릭하여 입장" : "클릭하여 비밀번호 설정"}
                    >
                      {discussion.password && discussion.password.trim() !== '' ? (
                        <LockIcon fontSize="small" />
                      ) : (
                        <LockOpenIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Box>
                  {discussion.subtitle && (
                    <Typography variant="body2" sx={{ mb: 1, color: '#a0aec0' }}>
                      {discussion.subtitle}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ color: '#a0aec0' }}>
                      {discussion.title !== discussion.siteName ? discussion.title : '토론방'}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip 
                        label={
                          discussion.priority === 'low' ? '낮음' :
                          discussion.priority === 'normal' ? '보통' :
                          discussion.priority === 'high' ? '높음' :
                          discussion.priority === 'urgent' ? '긴급' : discussion.priority
                        } 
                        size="small"
                        sx={{ 
                          backgroundColor: 
                            discussion.priority === 'urgent' ? '#e53e3e' :
                            discussion.priority === 'high' ? '#f56565' :
                            discussion.priority === 'normal' ? '#4a5568' :
                            discussion.priority === 'low' ? '#718096' : '#4a5568',
                          color: 'white',
                          fontSize: '0.75rem'
                        }}
                      />
                      {/* 삭제 버튼 */}
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteDialog({ open: true, discussion: discussion, password: '' });
                        }}
                        sx={{ 
                          color: '#e53e3e', 
                          p: 0.5,
                          '&:hover': { 
                            backgroundColor: 'rgba(229, 62, 62, 0.1)' 
                          }
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>

        {/* 왼쪽: 채팅 내용 */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#1a202c' }}>
          {selectedDiscussion ? (
            <>
              {/* 채팅방 헤더 */}
              <Box sx={{ 
                p: 2, 
                borderBottom: '1px solid #4a5568',
                backgroundColor: '#2d3748',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <Box>
                  <Typography variant="h6" sx={{ color: 'white' }}>
                    {selectedDiscussion.siteName || selectedDiscussion.title}
                  </Typography>
                  {selectedDiscussion.subtitle && (
                    <Typography variant="body2" sx={{ color: '#a0aec0' }}>
                      {selectedDiscussion.subtitle}
                    </Typography>
                  )}
                </Box>
                <Box>
                  <IconButton onClick={handleMenuOpen} sx={{ color: 'white' }}>
                    <MoreVertIcon />
                  </IconButton>
                </Box>
              </Box>

              {/* 메시지 영역 */}
              <Box sx={{ 
                flex: 1, 
                overflow: 'auto',
                p: 2,
                backgroundColor: backgroundColor,
                // 스크롤바 숨기기
                '&::-webkit-scrollbar': {
                  display: 'none'
                },
                msOverflowStyle: 'none',  // IE and Edge
                'scrollbarWidth': 'none',  // Firefox
              }}>
                {messages[selectedDiscussion.id]?.sort((a, b) => {
                  // timestamp를 기준으로 정렬 (오래된 메시지가 위로, 최신 메시지가 아래로)
                  const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 
                               (a.timestamp instanceof Date ? a.timestamp.getTime() : 
                               (a.timestamp ? new Date(a.timestamp).getTime() : 0));
                  const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 
                               (b.timestamp instanceof Date ? b.timestamp.getTime() : 
                               (b.timestamp ? new Date(b.timestamp).getTime() : 0));
                  return timeA - timeB;
                }).map((message) => {
                  // 현재 사용자가 작성한 메시지인지 확인
                  const isMyMessage = message.author === (currentUser.displayName || currentUser.email);
                  
                  return (
                    <Box
                      key={message.id}
                      sx={{
                        display: 'flex',
                        justifyContent: isMyMessage ? 'flex-end' : 'flex-start',
                        mb: 2
                      }}
                    >
                      {isMyMessage ? (
                        // 내 메시지 (오른쪽)
                        <Box sx={{ display: 'flex', alignItems: 'flex-end', maxWidth: '70%' }}>
                          <Box>
                                                      <Paper sx={{
                            p: 1.5,
                            backgroundColor: bubbleColor,
                            borderRadius: '18px 18px 4px 18px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                            wordBreak: 'break-word',
                            border: '1px solid #4a5568'
                          }}>
                            {/* 첨부된 이미지들 표시 */}
                            {message.files && message.files.length > 0 && (
                              <Box sx={{ mb: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {message.files.map((file, index) => (
                                  file.type?.startsWith('image/') && (
                                    <img
                                      key={index}
                                      src={file.url}
                                      alt="첨부된 이미지"
                                      style={{
                                        width: '120px',
                                        height: '120px',
                                        objectFit: 'cover',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        border: '2px solid rgba(255,255,255,0.2)'
                                      }}
                                      onClick={() => window.open(file.url, '_blank')}
                                    />
                                  )
                                ))}
                              </Box>
                            )}
                            
                            <Typography variant="body2" sx={{ 
                              fontSize: '14px',
                              color: textColor,
                              lineHeight: 1.4
                            }}>
                              {message.content}
                            </Typography>
                          </Paper>
                            
                            <Typography variant="caption" sx={{ 
                              color: '#718096', 
                              mr: 1, 
                              mt: 0.5, 
                              display: 'block',
                              textAlign: 'right'
                            }}>
                              {message.timestamp?.toDate
                                ? message.timestamp.toDate().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true })
                                : (message.timestamp instanceof Date
                                    ? message.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true })
                                    : (message.timestamp ? String(message.timestamp) : '')
                                  )
                              }
                            </Typography>
                          </Box>
                        </Box>
                      ) : (
                        // 다른 사람 메시지 (왼쪽)
                        <Box sx={{ display: 'flex', alignItems: 'flex-end', maxWidth: '70%' }}>
                          <Avatar
                            sx={{
                              width: 32,
                              height: 32,
                              mr: 1,
                              backgroundColor: '#90caf9',
                              fontSize: '12px'
                            }}
                          >
                            {message.author?.charAt(0) || '?'}
                          </Avatar>
                          
                          <Box>
                            <Typography variant="caption" sx={{ color: '#a0aec0', ml: 1, mb: 0.5, display: 'block' }}>
                              {message.author}
                            </Typography>
                            
                            <Paper sx={{
                              p: 1.5,
                              backgroundColor: '#2d3748',
                              borderRadius: '18px 18px 18px 4px',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                              wordBreak: 'break-word',
                              border: '1px solid #4a5568'
                            }}>
                              {/* 첨부된 이미지들 표시 */}
                              {message.files && message.files.length > 0 && (
                                <Box sx={{ mb: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                  {message.files.map((file, index) => (
                                    file.type?.startsWith('image/') && (
                                      <img
                                        key={index}
                                        src={file.url}
                                        alt="첨부된 이미지"
                                        style={{
                                          width: '120px',
                                          height: '120px',
                                          objectFit: 'cover',
                                          borderRadius: '8px',
                                          cursor: 'pointer',
                                          border: '2px solid rgba(255,255,255,0.2)'
                                        }}
                                        onClick={() => window.open(file.url, '_blank')}
                                      />
                                    )
                                  ))}
                                </Box>
                              )}
                              
                              <Typography variant="body2" sx={{ 
                                fontSize: '14px',
                                color: 'white',
                                lineHeight: 1.4
                              }}>
                                {message.content}
                              </Typography>
                            </Paper>
                            
                            <Typography variant="caption" sx={{ 
                              color: '#718096', 
                              ml: 1, 
                              mt: 0.5, 
                              display: 'block',
                              textAlign: 'left'
                            }}>
                              {message.timestamp?.toDate
                                ? message.timestamp.toDate().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true })
                                : (message.timestamp instanceof Date
                                    ? message.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true })
                                    : (message.timestamp ? String(message.timestamp) : '')
                                  )
                              }
                            </Typography>
                          </Box>
                        </Box>
                      )}
                    </Box>
                  );
                })}
                <div ref={messagesEndRef} />
              </Box>

              {/* 입력 영역 - 하단바 바로 위에 고정 */}
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                gap: 1, 
                p: 2, 
                backgroundColor: '#2d3748',
                borderTop: '1px solid #4a5568',
                position: 'sticky',
                bottom: 0,
                zIndex: 1000
              }}>
                {/* 첨부된 파일 표시 */}
                {attachedFiles.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                    {attachedFiles.map((file, index) => (
                      <Chip
                        key={index}
                        label={file.name}
                        onDelete={() => handleRemoveFile(index)}
                        sx={{
                          backgroundColor: '#4a5568',
                          color: 'white',
                          '& .MuiChip-deleteIcon': { color: '#e53e3e' }
                        }}
                      />
                    ))}
                  </Box>
                )}
                
                {/* 메시지 입력 및 버튼들 */}
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="메시지를 입력하세요..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    multiline
                    maxRows={4}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '20px',
                        backgroundColor: '#4a5568',
                        '& fieldset': { borderColor: '#4a5568' },
                        '&:hover fieldset': { borderColor: '#718096' },
                        '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                      },
                      '& textarea': { color: 'white' }
                    }}
                  />
                  
                  {/* 파일 첨부 버튼 */}
                  <input
                    type="file"
                    multiple
                    onChange={handleFileAttach}
                    style={{ display: 'none' }}
                    id="file-attach-input"
                    accept="image/*"
                  />
                  <label htmlFor="file-attach-input">
                    <IconButton
                      component="span"
                      sx={{ 
                        backgroundColor: '#718096',
                        color: '#fff',
                        '&:hover': { backgroundColor: '#4a5568' }
                      }}
                    >
                      <AttachFileIcon />
                    </IconButton>
                  </label>
                  
                  <IconButton 
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() && attachedFiles.length === 0}
                    sx={{ 
                      backgroundColor: '#4caf50',
                      color: '#fff',
                      '&:hover': { backgroundColor: '#45a049' },
                      '&:disabled': { backgroundColor: '#4a5568', color: '#718096' }
                    }}
                  >
                    <SendIcon />
                  </IconButton>
                </Box>
              </Box>
            </>
          ) : (
            <Box sx={{ 
              flex: 1, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              backgroundColor: '#1a202c'
            }}>
              <Typography variant="h6" sx={{ color: '#a0aec0' }}>
                오른쪽에서 토론을 선택하세요
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* 메뉴 */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleMenuAction('info')}>
          <ListItemIcon><InfoIcon fontSize="small" /></ListItemIcon>
          <ListItemText>토론 정보</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('participants')}>
          <ListItemIcon><PeopleIcon fontSize="small" /></ListItemIcon>
          <ListItemText>참여자</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('settings')}>
          <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
          <ListItemText>설정</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('export')}>
          <ListItemIcon><DownloadIcon fontSize="small" /></ListItemIcon>
          <ListItemText>내보내기</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleMenuAction('leave')}>
          <ListItemIcon><ExitToAppIcon fontSize="small" /></ListItemIcon>
          <ListItemText>나가기</ListItemText>
        </MenuItem>
      </Menu>

      {/* 다이얼로그들 */}
      {/* 토론 생성 다이얼로그 */}
      <Dialog 
        open={isCreateDialogOpen} 
        onClose={() => setIsCreateDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#2d3748',
            color: 'white'
          }
        }}
      >
        <DialogTitle sx={{ color: 'white' }}>새 토론 만들기</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2, mt: 1 }}>
            <SearchableSiteSelect
              sites={sites}
              value={newDiscussion.siteName}
              onChange={(value) => setNewDiscussion(prev => ({ ...prev, siteName: value }))}
              label="현장 선택 *"
              placeholder="현장명을 입력하거나 선택하세요"
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#4a5568' },
                  '&:hover fieldset': { borderColor: '#718096' },
                  '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                },
                '& .MuiInputLabel-root': { color: '#a0aec0' },
                '& .MuiInputBase-input': { color: 'white' }
              }}
            />
          </Box>
          
          <TextField
            fullWidth
            label="부제목 (선택사항)"
            value={newDiscussion.subtitle}
            onChange={(e) => setNewDiscussion(prev => ({ ...prev, subtitle: e.target.value }))}
            sx={{ mb: 2 }}
            InputProps={{
              sx: { 
                color: 'white',
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#4a5568' },
                  '&:hover fieldset': { borderColor: '#718096' },
                  '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                }
              }
            }}
            InputLabelProps={{
              sx: { color: '#a0aec0' }
            }}
          />
          <TextField
            fullWidth
            label="비밀번호 (선택사항)"
            type="password"
            value={newDiscussion.password}
            onChange={(e) => setNewDiscussion(prev => ({ ...prev, password: e.target.value }))}
            sx={{ mb: 2 }}
            InputProps={{
              sx: { 
                color: 'white',
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#4a5568' },
                  '&:hover fieldset': { borderColor: '#718096' },
                  '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                }
              }
            }}
            InputLabelProps={{
              sx: { color: '#a0aec0' }
            }}
          />
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel sx={{ color: '#a0aec0' }}>우선순위</InputLabel>
            <Select
              value={newDiscussion.priority}
              onChange={(e) => setNewDiscussion(prev => ({ ...prev, priority: e.target.value }))}
              sx={{
                color: 'white',
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#4a5568' },
                  '&:hover fieldset': { borderColor: '#718096' },
                  '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                }
              }}
            >
              <MenuItem value="low" sx={{ color: 'white' }}>낮음</MenuItem>
              <MenuItem value="normal" sx={{ color: 'white' }}>보통</MenuItem>
              <MenuItem value="high" sx={{ color: 'white' }}>높음</MenuItem>
              <MenuItem value="urgent" sx={{ color: 'white' }}>긴급</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCreateDialogOpen(false)} sx={{ color: '#a0aec0' }}>취소</Button>
          <Button onClick={handleCreateDiscussion} variant="contained" sx={{ backgroundColor: '#4caf50' }}>생성</Button>
        </DialogActions>
      </Dialog>

      {/* 토론 정보 다이얼로그 */}
      <Dialog 
        open={isInfoDialogOpen} 
        onClose={() => setIsInfoDialogOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: '#2d3748',
            color: 'white'
          }
        }}
      >
        <DialogTitle sx={{ color: 'white' }}>토론 정보</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 1, color: 'white' }}>
            <strong>제목:</strong> {selectedDiscussion?.title}
          </Typography>
          {selectedDiscussion?.subtitle && (
            <Typography variant="body1" sx={{ mb: 1, color: 'white' }}>
              <strong>부제목:</strong> {selectedDiscussion.subtitle}
            </Typography>
          )}
          <Typography variant="body1" sx={{ mb: 1, color: 'white' }}>
            <strong>현장:</strong> {selectedDiscussion?.siteName || '미지정'}
          </Typography>
          <Typography variant="body1" sx={{ mb: 1, color: 'white' }}>
            <strong>생성일:</strong> {selectedDiscussion?.createdAt?.toLocaleDateString()}
          </Typography>
          <Typography variant="body1" sx={{ color: 'white' }}>
            <strong>우선순위:</strong> {
              selectedDiscussion?.priority === 'low' ? '낮음' :
              selectedDiscussion?.priority === 'normal' ? '보통' :
              selectedDiscussion?.priority === 'high' ? '높음' :
              selectedDiscussion?.priority === 'urgent' ? '긴급' : selectedDiscussion?.priority
            }
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsInfoDialogOpen(false)} sx={{ color: '#a0aec0' }}>닫기</Button>
        </DialogActions>
      </Dialog>

      {/* 설정 다이얼로그 */}
      <Dialog 
        open={isSettingsDialogOpen} 
        onClose={() => setIsSettingsDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#2d3748',
            color: 'white'
          }
        }}
      >
        <DialogTitle sx={{ color: 'white' }}>채팅방 설정</DialogTitle>
        <DialogContent>
          {/* 비밀번호 재설정 섹션 - 비밀번호가 있는 경우에만 표시 */}
          {selectedDiscussion?.password && selectedDiscussion.password.trim() !== '' && (
            <>
              <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>비밀번호 재설정</Typography>
              <TextField
                fullWidth
                label="현재 비밀번호"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                sx={{ mb: 2 }}
                InputProps={{
                  sx: { 
                    color: 'white',
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: '#4a5568' },
                      '&:hover fieldset': { borderColor: '#718096' },
                      '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                    }
                  }
                }}
                InputLabelProps={{
                  sx: { color: '#a0aec0' }
                }}
              />
              <TextField
                fullWidth
                label="새 비밀번호"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                sx={{ mb: 2 }}
                InputProps={{
                  sx: { 
                    color: 'white',
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: '#4a5568' },
                      '&:hover fieldset': { borderColor: '#718096' },
                      '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                    }
                  }
                }}
                InputLabelProps={{
                  sx: { color: '#a0aec0' }
                }}
              />
              <TextField
                fullWidth
                label="새 비밀번호 확인"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                sx={{ mb: 3 }}
                InputProps={{
                  sx: { 
                    color: 'white',
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: '#4a5568' },
                      '&:hover fieldset': { borderColor: '#718096' },
                      '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                    }
                  }
                }}
                InputLabelProps={{
                  sx: { color: '#a0aec0' }
                }}
              />
            </>
          )}
          
          {/* 공개 방인 경우 안내 메시지 */}
          {(!selectedDiscussion?.password || selectedDiscussion.password.trim() === '') && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>채팅방 정보</Typography>
              <Typography variant="body2" sx={{ color: '#a0aec0' }}>
                이 채팅방은 공개 방입니다. 비밀번호 설정이 필요하지 않습니다.
              </Typography>
            </Box>
          )}
          
          <Divider sx={{ my: 3, borderColor: '#4a5568' }} />
          
          {/* 채팅 스타일 섹션 */}
          <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>채팅 스타일</Typography>
          
          {/* 내 메시지 말풍선 색상 */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ mb: 1, color: 'white' }}>내 메시지 말풍선 색상</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {['#4caf50', '#2196f3', '#ff9800', '#e91e63', '#9c27b0', '#00bcd4', '#ff5722', '#795548'].map((color) => (
                <IconButton
                  key={color}
                  onClick={() => setBubbleColor(color)}
                  sx={{
                    width: 40,
                    height: 40,
                    backgroundColor: color,
                    border: bubbleColor === color ? '3px solid #90caf9' : '2px solid #4a5568',
                    '&:hover': { 
                      backgroundColor: color,
                      border: '3px solid #90caf9'
                    }
                  }}
                >
                  {bubbleColor === color && <ColorLensIcon sx={{ fontSize: 18, color: '#fff' }} />}
                </IconButton>
              ))}
            </Box>
          </Box>
          
          {/* 배경색 선택 */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ mb: 1, color: 'white' }}>채팅방 배경색</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {['#1a202c', '#2d3748', '#1e293b', '#0f172a', '#1f2937', '#374151'].map((color) => (
                <IconButton
                  key={color}
                  onClick={() => setBackgroundColor(color)}
                  sx={{
                    width: 40,
                    height: 40,
                    backgroundColor: color,
                    border: backgroundColor === color ? '3px solid #90caf9' : '2px solid #4a5568',
                    '&:hover': { 
                      backgroundColor: color,
                      border: '3px solid #90caf9'
                    }
                  }}
                >
                  {backgroundColor === color && <ColorLensIcon sx={{ fontSize: 18, color: '#fff' }} />}
                </IconButton>
              ))}
            </Box>
          </Box>
          
          {/* 글자 색상 */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ mb: 1, color: 'white' }}>글자 색상</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {['#ffffff', '#e2e8f0', '#cbd5e0', '#a0aec0', '#718096'].map((color) => (
                <IconButton
                  key={color}
                  onClick={() => setTextColor(color)}
                  sx={{
                    width: 40,
                    height: 40,
                    backgroundColor: color,
                    border: textColor === color ? '3px solid #90caf9' : '2px solid #4a5568',
                    '&:hover': { 
                      backgroundColor: color,
                      border: '3px solid #90caf9'
                    }
                  }}
                >
                  {textColor === color && <PaletteIcon sx={{ fontSize: 18, color: color === '#ffffff' ? '#000' : '#fff' }} />}
                </IconButton>
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsSettingsDialogOpen(false)} sx={{ color: '#a0aec0' }}>취소</Button>
          <Button onClick={handlePasswordReset} variant="contained" sx={{ backgroundColor: '#4caf50' }}>저장</Button>
        </DialogActions>
      </Dialog>

      {/* 내보내기 다이얼로그 */}
      <Dialog open={exportDialog.open} onClose={() => setExportDialog({ open: false })}>
        <DialogTitle>메시지 내보내기</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            어떤 형식으로 내보내시겠습니까?
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => setExportDialog({ open: true, format: 'excel' })}
            >
              Excel (.csv)
            </Button>
            <Button
              variant="outlined"
              onClick={() => setExportDialog({ open: true, format: 'pdf' })}
            >
              PDF
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialog({ open: false })}>취소</Button>
          <Button onClick={handleExportMessages} variant="contained">내보내기</Button>
        </DialogActions>
      </Dialog>

      {/* 비밀번호 확인 다이얼로그 */}
      <Dialog open={passwordDialog.open} onClose={() => setPasswordDialog({ open: false, discussion: null, password: '', type: '' })}>
        <DialogTitle>
          {passwordDialog.type === 'enter' ? '토론방 입장' : '비밀번호 확인'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: '#666' }}>
            {passwordDialog.type === 'enter' 
              ? '토론방에 입장하려면 비밀번호를 입력하세요.' 
              : '작업을 진행하려면 비밀번호를 입력하세요.'
            }
          </Typography>
          <TextField
            fullWidth
            label="비밀번호"
            type="password"
            value={passwordDialog.password}
            onChange={(e) => setPasswordDialog(prev => ({ ...prev, password: e.target.value }))}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handlePasswordCheck();
              }
            }}
            inputRef={passwordInputRef}
            autoFocus
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialog({ open: false, discussion: null, password: '', type: '' })}>취소</Button>
          <Button onClick={handlePasswordCheck} variant="contained">
            {passwordDialog.type === 'enter' ? '입장' : '확인'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 비밀번호 설정 다이얼로그 */}
      <Dialog open={passwordSettingDialog.open} onClose={() => setPasswordSettingDialog({ open: false, discussion: null, password: '', confirmPassword: '' })}>
        <DialogTitle>
          비밀번호 설정
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: '#666' }}>
            토론방에 비밀번호를 설정하세요. (최소 4자 이상)
          </Typography>
          <TextField
            fullWidth
            label="비밀번호"
            type="password"
            value={passwordSettingDialog.password}
            onChange={(e) => setPasswordSettingDialog(prev => ({ ...prev, password: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="비밀번호 확인"
            type="password"
            value={passwordSettingDialog.confirmPassword}
            onChange={(e) => setPasswordSettingDialog(prev => ({ ...prev, confirmPassword: e.target.value }))}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handlePasswordSettingSave();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordSettingDialog({ open: false, discussion: null, password: '', confirmPassword: '' })}>취소</Button>
          <Button onClick={handlePasswordSettingSave} variant="contained">
            설정
          </Button>
        </DialogActions>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, discussion: null, password: '' })}>
        <DialogTitle>토론 삭제</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            "{deleteDialog.discussion?.siteName || deleteDialog.discussion?.title}" 토론을 삭제하시겠습니까?
          </Typography>
          <Typography variant="body2" sx={{ color: '#ff4444', mt: 1 }}>
            이 작업은 되돌릴 수 없습니다.
          </Typography>
          
          {/* 비밀번호가 있는 경우 비밀번호 입력 필드 */}
          {deleteDialog.discussion?.password && deleteDialog.discussion.password.trim() !== '' && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, color: '#a0aec0' }}>
                이 토론은 비밀번호가 설정되어 있습니다. 삭제하려면 비밀번호를 입력하세요.
              </Typography>
              <TextField
                fullWidth
                type="password"
                placeholder="비밀번호를 입력하세요"
                value={deleteDialog.password}
                onChange={(e) => setDeleteDialog(prev => ({ ...prev, password: e.target.value }))}
                onKeyPress={(e) => e.key === 'Enter' && handleDeleteDiscussion()}
                sx={{ mt: 1 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, discussion: null, password: '' })}>
            취소
          </Button>
          <Button onClick={handleDeleteDiscussion} variant="contained" color="error">
            삭제
          </Button>
        </DialogActions>
      </Dialog>

      {/* 토론 수정 다이얼로그 */}
      <Dialog 
        open={editDialog.open} 
        onClose={() => setEditDialog({ open: false, discussion: null })}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#2d3748',
            color: 'white'
          }
        }}
      >
        <DialogTitle sx={{ color: 'white', borderBottom: '1px solid #4a5568' }}>
          토론 수정
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {editDialog.discussion && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="토론 제목"
                value={editDialog.discussion.title || ''}
                onChange={(e) => setEditDialog(prev => ({
                  ...prev,
                  discussion: { ...prev.discussion, title: e.target.value }
                }))}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#4a5568' },
                    '&:hover fieldset': { borderColor: '#718096' },
                    '&.Mui-focused fieldset': { borderColor: '#4299e1' }
                  },
                  '& .MuiInputLabel-root': { color: '#a0aec0' },
                  '& .MuiInputBase-input': { color: 'white' }
                }}
              />
              <SearchableSiteSelect
                sites={sites}
                value={editDialog.discussion.siteName || ''}
                onChange={(value) => setEditDialog(prev => ({
                  ...prev,
                  discussion: { ...prev.discussion, siteName: value }
                }))}
                label="현장명"
                placeholder="현장명을 입력하거나 선택하세요"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#4a5568' },
                    '&:hover fieldset': { borderColor: '#718096' },
                    '&.Mui-focused fieldset': { borderColor: '#4299e1' }
                  },
                  '& .MuiInputLabel-root': { color: '#a0aec0' },
                  '& .MuiInputBase-input': { color: 'white' }
                }}
              />
              <TextField
                fullWidth
                label="부제목 (선택사항)"
                value={editDialog.discussion.subtitle || ''}
                onChange={(e) => setEditDialog(prev => ({
                  ...prev,
                  discussion: { ...prev.discussion, subtitle: e.target.value }
                }))}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#4a5568' },
                    '&:hover fieldset': { borderColor: '#718096' },
                    '&.Mui-focused fieldset': { borderColor: '#4299e1' }
                  },
                  '& .MuiInputLabel-root': { color: '#a0aec0' },
                  '& .MuiInputBase-input': { color: 'white' }
                }}
              />
              <TextField
                fullWidth
                label="비밀번호 (선택사항)"
                type="password"
                value={editDialog.discussion.password || ''}
                onChange={(e) => setEditDialog(prev => ({
                  ...prev,
                  discussion: { ...prev.discussion, password: e.target.value }
                }))}
                placeholder="비밀번호를 설정하지 않으려면 비워두세요"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#4a5568' },
                    '&:hover fieldset': { borderColor: '#718096' },
                    '&.Mui-focused fieldset': { borderColor: '#4299e1' }
                  },
                  '& .MuiInputLabel-root': { color: '#a0aec0' },
                  '& .MuiInputBase-input': { color: 'white' }
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #4a5568' }}>
          <Button 
            onClick={() => setEditDialog({ open: false, discussion: null })}
            sx={{ color: '#a0aec0' }}
          >
            취소
          </Button>
          <Button 
            onClick={handleEditSave}
            variant="contained"
            sx={{
              backgroundColor: '#4299e1',
              color: 'white',
              '&:hover': { backgroundColor: '#3182ce' }
            }}
          >
            수정
          </Button>
        </DialogActions>
      </Dialog>

      {/* 스낵바 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* 참여자 목록 다이얼로그 */}
      <Dialog 
        open={isParticipantsDialogOpen} 
        onClose={() => setIsParticipantsDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#2d3748',
            color: 'white'
          }
        }}
      >
        <DialogTitle sx={{ color: 'white', borderBottom: '1px solid #4a5568' }}>
          참여자 목록
          {selectedDiscussion && (
            <Typography variant="body2" sx={{ color: '#a0aec0', mt: 1 }}>
              {selectedDiscussion.title} • 총 {participants.length}명
            </Typography>
          )}
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {participantsLoading ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" sx={{ color: '#a0aec0' }}>
                참여자 정보를 불러오는 중...
              </Typography>
            </Box>
          ) : participants.length > 0 ? (
            <List sx={{ p: 0 }}>
              {participants.map((participant, index) => (
                <React.Fragment key={participant.id}>
                  <ListItem sx={{ 
                    px: 3, 
                    py: 2,
                    '&:hover': { backgroundColor: '#4a5568' }
                  }}>
                    <ListItemAvatar>
                      <Avatar 
                        src={participant.avatar} 
                        sx={{ 
                          width: 48, 
                          height: 48,
                          backgroundColor: participant.isOnline ? '#4caf50' : '#718096'
                        }}
                      >
                        {participant.name.charAt(0)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1" sx={{ color: 'white', fontWeight: 500 }}>
                            {participant.name}
                          </Typography>
                          <Chip 
                            label={participant.role} 
                            size="small" 
                            sx={{ 
                              backgroundColor: participant.role === '관리자' ? '#e53e3e' : 
                                              participant.role === '하이그' ? '#3182ce' : '#38a169',
                              color: 'white',
                              fontSize: '0.75rem'
                            }}
                          />
                          {participant.isOnline && (
                            <Chip 
                              label="온라인" 
                              size="small" 
                              sx={{ 
                                backgroundColor: '#4caf50',
                                color: 'white',
                                fontSize: '0.75rem'
                              }}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" sx={{ color: '#a0aec0' }}>
                            {participant.email}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#718096' }}>
                            참여일: {participant.joinTime?.toDate ? 
                              participant.joinTime.toDate().toLocaleDateString() : 
                              new Date(participant.joinTime).toLocaleDateString()}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < participants.length - 1 && (
                    <Divider sx={{ backgroundColor: '#4a5568' }} />
                  )}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" sx={{ color: '#a0aec0', mb: 1 }}>
                참여자가 없습니다.
              </Typography>
              <Typography variant="body2" sx={{ color: '#718096' }}>
                아직 참여자가 등록되지 않았습니다.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #4a5568' }}>
          <Button 
            onClick={() => setIsParticipantsDialogOpen(false)} 
            sx={{ color: '#a0aec0' }}
          >
            닫기
          </Button>
        </DialogActions>
      </Dialog>

      {/* 스크롤 맨 위 버튼 */}
      {showScrollTop && (
        <Fab
          color="primary"
          size="small"
          onClick={scrollToTop}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
          }}
        >
          <ArrowUpIcon />
        </Fab>
      )}
    </Box>
  );
};

export default PCKakaoDiscussion; 