import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getSites } from '../../api/sites';
import { 
  subscribeToDiscussions, 
  subscribeToMessages, 
  createDiscussion, 
  sendMessage, 
  deleteDiscussion,
  removeParticipant
} from '../../api/discussions';
import { useAuth } from '../../contexts/AuthContext';
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
  Fab
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
  KeyboardArrowUp as ArrowUpIcon
} from '@mui/icons-material';

const MobileKakaoDiscussion = () => {
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
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [sites, setSites] = useState([]);
  const [sitesLoading, setSitesLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [exportDialog, setExportDialog] = useState({ open: false });
  const messagesEndRef = useRef(null);
  const passwordInputRef = useRef(null);

  // 실시간 데이터 구독
  useEffect(() => {
    // 현장 데이터 로드
    const fetchSites = async () => {
      try {
        setSitesLoading(true);
        const sitesData = await getSites({});
        setSites(sitesData);
      } catch (error) {
        console.error('현장 데이터 로드 실패:', error);
        setSnackbar({
          open: true,
          message: '현장 데이터를 불러오는데 실패했습니다.',
          severity: 'error'
        });
      } finally {
        setSitesLoading(false);
      }
    };

    fetchSites();

    // 실시간 토론 목록 구독
    let unsubscribeDiscussions;
    try {
      unsubscribeDiscussions = subscribeToDiscussions((discussions) => {
        setDiscussions(discussions);
      });
    } catch (error) {
      console.error('토론 목록 구독 설정 실패:', error);
      setSnackbar({
        open: true,
        message: '실시간 연결에 실패했습니다.',
        severity: 'error'
      });
    }

    return () => {
      if (unsubscribeDiscussions && typeof unsubscribeDiscussions === 'function') {
        try {
          unsubscribeDiscussions();
        } catch (error) {
          console.error('토론 목록 구독 해제 실패:', error);
        }
      }
    };
  }, []);

  // 선택된 토론의 메시지 실시간 구독
  useEffect(() => {
    if (!selectedDiscussion) return;

    let unsubscribeMessages;
    try {
      unsubscribeMessages = subscribeToMessages(selectedDiscussion.id, (messages) => {
        setMessages(prev => {
          // 임시 메시지들은 유지하고 실제 메시지만 업데이트
          const currentMessages = prev[selectedDiscussion.id] || [];
          const tempMessages = currentMessages.filter(msg => msg.isPending);
          const realMessages = messages.filter(msg => !msg.isPending);
          
          return {
            ...prev,
            [selectedDiscussion.id]: [...tempMessages, ...realMessages]
          };
        });
        
        // 스크롤을 맨 아래로 (조건부로 실행)
        setTimeout(() => {
          const messagesContainer = document.querySelector('[data-messages-container]');
          if (messagesContainer) {
            const isAtBottom = messagesContainer.scrollTop + messagesContainer.clientHeight >= messagesContainer.scrollHeight - 50;
            const currentMessages = messages[selectedDiscussion.id] || [];
            const hasNewMessages = messages.length > currentMessages.length;
            
            // 스크롤이 맨 아래에 있고 새 메시지가 있는 경우에만 스크롤
            if (isAtBottom && hasNewMessages) {
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }
          }
        }, 200);
      });
    } catch (error) {
      console.error('메시지 구독 설정 실패:', error);
      setSnackbar({
        open: true,
        message: '메시지 실시간 연결에 실패했습니다.',
        severity: 'error'
      });
    }

    return () => {
      if (unsubscribeMessages && typeof unsubscribeMessages === 'function') {
        try {
          unsubscribeMessages();
        } catch (error) {
          console.error('메시지 구독 해제 실패:', error);
        }
      }
    };
  }, [selectedDiscussion]);

  // 스크롤 이벤트 리스너
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.pageYOffset > 300);
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
        setKeyboardHeight(keyboardHeight);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      return () => window.visualViewport.removeEventListener('resize', handleResize);
    }
  }, []);

  // 채팅방 선택 시 하단바 숨김 처리
  useEffect(() => {
    if (selectedDiscussion) {
      // 하단바 숨김
      const bottomBar = document.querySelector('[data-bottom-bar]');
      if (bottomBar) {
        bottomBar.style.display = 'none';
      }
      
      // body에 클래스 추가로 하단바 숨김
      document.body.classList.add('hide-bottom-bar');
    } else {
      // 하단바 표시
      const bottomBar = document.querySelector('[data-bottom-bar]');
      if (bottomBar) {
        bottomBar.style.display = 'block';
      }
      
      // body에서 클래스 제거
      document.body.classList.remove('hide-bottom-bar');
    }

    // 컴포넌트 언마운트 시 하단바 복원
    return () => {
      const bottomBar = document.querySelector('[data-bottom-bar]');
      if (bottomBar) {
        bottomBar.style.display = 'block';
      }
      document.body.classList.remove('hide-bottom-bar');
    };
  }, [selectedDiscussion]);

  // 첨부파일 처리
  const handleFileAttach = (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      setAttachedFiles(prev => [...prev, ...files]);
    }
  };

  // 첨부파일 제거
  const handleRemoveFile = (index) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // 메시지 전송 (메모이제이션)
  const handleSendMessage = useCallback(async () => {
    if ((!newMessage.trim() && attachedFiles.length === 0) || !selectedDiscussion) return;

    const messageContent = newMessage.trim();
    const filesToSend = [...attachedFiles];
    
    // 즉시 UI 업데이트 (Optimistic Update)
    const tempMessageId = `temp_${Date.now()}`;
    const tempMessage = {
      id: tempMessageId,
      content: messageContent,
      author: currentUser?.displayName || currentUser?.name || '익명',
      authorId: currentUser?.uid || 'anonymous',
      type: filesToSend.length > 0 ? 'file' : 'text',
      files: filesToSend,
      timestamp: new Date(),
      isPending: true
    };

    // 로컬 상태에 임시 메시지 추가
    setMessages(prev => ({
      ...prev,
      [selectedDiscussion.id]: [...(prev[selectedDiscussion.id] || []), tempMessage]
    }));
    
    // 입력창 초기화
    setNewMessage('');
    setAttachedFiles([]);

    try {
      const messageData = {
        content: messageContent,
        author: currentUser?.displayName || currentUser?.name || '익명',
        authorId: currentUser?.uid || 'anonymous',
        type: filesToSend.length > 0 ? 'file' : 'text',
        files: filesToSend
      };

      // 메시지 전송
      const messageId = await sendMessage(selectedDiscussion.id, messageData);
      
      console.log('🔥 모바일 메시지 전송 성공:', messageId);
      
      // 성공 시 임시 메시지 제거 (실시간 구독에서 실제 메시지가 올 것)
      setMessages(prev => ({
        ...prev,
        [selectedDiscussion.id]: (prev[selectedDiscussion.id] || []).filter(msg => msg.id !== tempMessageId)
      }));
      
    } catch (error) {
      console.error('🔥 모바일 메시지 전송 실패:', error);
      
      // 실패 시 임시 메시지 제거하고 입력창에 다시 넣기
      setMessages(prev => ({
        ...prev,
        [selectedDiscussion.id]: (prev[selectedDiscussion.id] || []).filter(msg => msg.id !== tempMessageId)
      }));
      setNewMessage(messageContent);
      setAttachedFiles(filesToSend);
      
      setSnackbar({
        open: true,
        message: '메시지 전송에 실패했습니다.',
        severity: 'error'
      });
    }
  }, [newMessage, attachedFiles, selectedDiscussion]);

  // 새 토론 생성
  const handleCreateDiscussion = async () => {
    if (!newDiscussion.siteName.trim()) {
      setSnackbar({
        open: true,
        message: '현장명을 선택해주세요.',
        severity: 'warning'
      });
      return;
    }

    try {
      const discussionData = {
        title: newDiscussion.subtitle || newDiscussion.siteName, // 부제목이 없으면 현장명 사용
        subtitle: newDiscussion.subtitle || '',
        siteName: newDiscussion.siteName,
        password: newDiscussion.password,
        category: newDiscussion.category,
        priority: newDiscussion.priority,
        createdBy: currentUser?.uid || 'anonymous',
        authorName: currentUser?.displayName || currentUser?.name || '익명',
        avatar: (newDiscussion.subtitle || newDiscussion.siteName).charAt(0),
        color: `hsl(${Math.random() * 360}, 70%, 60%)`
      };

      await createDiscussion(discussionData);
      
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
      setSnackbar({
        open: true,
        message: '새로운 토론이 생성되었습니다.',
        severity: 'success'
      });
    } catch (error) {
      console.error('토론 생성 실패:', error);
      setSnackbar({
        open: true,
        message: '토론 생성에 실패했습니다.',
        severity: 'error'
      });
    }
  };

  // 카테고리 옵션
  const categories = ['안전', '일정', '자재', '품질', '환경', '기타'];
  const priorities = [
    { value: 'low', label: '낮음', color: 'success' },
    { value: 'normal', label: '보통', color: 'primary' },
    { value: 'high', label: '높음', color: 'warning' },
    { value: 'urgent', label: '긴급', color: 'error' }
  ];

  // 메뉴 핸들러
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
        setIsParticipantsDialogOpen(true);
        break;
      case 'settings':
        setIsSettingsDialogOpen(true);
        break;
      case 'export':
        handleExportMessages();
        break;
      case 'leave':
        // 비밀번호가 있는 경우 비밀번호 확인 후 퇴장
        if (selectedDiscussion.password && selectedDiscussion.password.trim() !== '') {
          setPasswordDialog({ 
            open: true, 
            discussion: selectedDiscussion, 
            password: '',
            type: 'leave' // 퇴장용 비밀번호 확인
          });
        } else {
          handleLeaveDiscussion();
        }
        break;
      case 'delete':
        // 삭제 다이얼로그 열기
        setDeleteDialog({ open: true, discussion: selectedDiscussion });
        break;
      default:
        break;
    }
  };

  // 메시지 내보내기
  const handleExportMessages = () => {
    if (!selectedDiscussion) return;
    
    const messagesList = messages[selectedDiscussion.id] || [];
    if (messagesList.length === 0) {
      setSnackbar({
        open: true,
        message: '내보낼 메시지가 없습니다.',
        severity: 'warning'
      });
      return;
    }
    
    // 대화 형식으로 데이터 준비
    const chatData = messagesList.map(msg => ({
      timestamp: msg.timestamp ? new Date(msg.timestamp.seconds * 1000).toLocaleString('ko-KR') : '',
      username: msg.author || '익명',
      content: msg.content || '',
      fileName: msg.fileName || ''
    }));
    
    // 엑셀 내보내기
    const exportToExcel = () => {
      const csvContent = [
        ['시간', '사용자', '내용', '첨부파일'],
        ...chatData.map(msg => [
          msg.timestamp,
          msg.username,
          msg.content,
          msg.fileName
        ])
      ].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
      
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${selectedDiscussion.siteName}_채팅내역.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
    
    // PDF 내보내기
    const exportToPDF = () => {
      const { jsPDF } = require('jspdf');
      const doc = new jsPDF();
      
      // 제목
      doc.setFontSize(16);
      doc.text(`${selectedDiscussion.siteName} 채팅방 대화내역`, 20, 20);
      
      // 대화 내용
      doc.setFontSize(10);
      let yPosition = 40;
      
      chatData.forEach((msg, index) => {
        const timeText = `${msg.timestamp}`;
        const userText = `${msg.username}:`;
        const contentText = msg.content;
        const fileText = msg.fileName ? `[첨부파일: ${msg.fileName}]` : '';
        
        // 시간
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(timeText, 20, yPosition);
        yPosition += 5;
        
        // 사용자명
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'bold');
        doc.text(userText, 20, yPosition);
        yPosition += 5;
        
        // 메시지 내용
        doc.setFont(undefined, 'normal');
        const lines = doc.splitTextToSize(contentText, 170);
        lines.forEach(line => {
          doc.text(line, 20, yPosition);
          yPosition += 5;
        });
        
        // 첨부파일
        if (fileText) {
          doc.setTextColor(0, 0, 255);
          doc.text(fileText, 20, yPosition);
          yPosition += 5;
          doc.setTextColor(0, 0, 0);
        }
        
        yPosition += 3;
        
        // 페이지 나누기
        if (yPosition > 280) {
          doc.addPage();
          yPosition = 20;
        }
      });
      
      doc.save(`${selectedDiscussion.siteName}_채팅내역.pdf`);
    };
    
    // 내보내기 옵션 다이얼로그 표시
    setExportDialog({
      open: true,
      onExcel: () => {
        exportToExcel();
        setExportDialog({ open: false });
        setSnackbar({
          open: true,
          message: '메시지가 엑셀 파일로 내보내졌습니다.',
          severity: 'success'
        });
      },
      onPDF: () => {
        exportToPDF();
        setExportDialog({ open: false });
        setSnackbar({
          open: true,
          message: '메시지가 PDF 파일로 내보내졌습니다.',
          severity: 'success'
        });
      }
    });
  };

  // 채팅방 나가기
  const handleLeaveDiscussion = async () => {
    if (!selectedDiscussion) return;
    
    try {
      await removeParticipant(selectedDiscussion.id);
      setSelectedDiscussion(null);
      
      setSnackbar({
        open: true,
        message: '채팅방을 나갔습니다.',
        severity: 'info'
      });
    } catch (error) {
      console.error('채팅방 나가기 실패:', error);
      setSnackbar({
        open: true,
        message: '채팅방 나가기에 실패했습니다.',
        severity: 'error'
      });
    }
  };

  // 중요도 색상 매핑 (메모이제이션)
  const getPriorityColor = useCallback((priority) => {
    switch (priority) {
      case 'urgent': return '#ff4444'; // 빨간색 (긴급)
      case 'important': return '#ff8800'; // 주황색 (중요)
      case 'normal': return '#44ff44'; // 초록색 (보통)
      case 'low': return '#4488ff'; // 파란색 (여유)
      case 'planned': return '#8844ff'; // 보라색 (예정)
      default: return '#44ff44';
    }
  }, []);

  // 필터링된 토론 목록 (메모이제이션)
  const filteredDiscussions = useMemo(() => {
    return discussions.filter(discussion => {
      const matchesSearch = !searchTerm || 
        discussion.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        discussion.subtitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        discussion.siteName?.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    });
  }, [discussions, searchTerm]);

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
      setSnackbar({ open: true, message: '토론방에 입장했습니다', severity: 'success' });
    } else {
      // 퇴장 처리
      await handleLeaveDiscussion();
    }
    
    setPasswordDialog({ open: false, discussion: null, password: '', type: '' });
  };

  // 채팅방 선택
  const handleDiscussionSelect = (discussion) => {
    // 비밀번호가 있고, 비어있지 않은 경우에만 비밀번호 체크
    if (discussion.password && discussion.password.trim() !== '' && discussion.password !== null && discussion.password !== undefined) {
      setPasswordDialog({ 
        open: true, 
        discussion: discussion, 
        password: '',
        type: 'enter' // 입장용 비밀번호 확인
      });
    } else {
      setSelectedDiscussion(discussion);
    }
  };

  // 채팅방 수정
  const handleEditDiscussion = async () => {
    try {
      // 수정 로직 구현
      setEditDialog({ open: false, discussion: null });
      setSnackbar({
        open: true,
        message: '채팅방이 수정되었습니다.',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: '채팅방 수정에 실패했습니다.',
        severity: 'error'
      });
    }
  };

  // 채팅방 삭제
  const handleDeleteDiscussion = async () => {
    try {
      if (!deleteDialog.discussion) return;
      
      // 비밀번호가 있는 경우 비밀번호 검증
      if (deleteDialog.discussion.password && deleteDialog.discussion.password.trim() !== '') {
        if (deleteDialog.password !== deleteDialog.discussion.password) {
          setSnackbar({
            open: true,
            message: '비밀번호가 올바르지 않습니다.',
            severity: 'error'
          });
          return;
        }
      }
      
      // 실제 삭제 API 호출
      await deleteDiscussion(deleteDialog.discussion.id);
      
      // 선택된 토론이 삭제된 토론이면 선택 해제
      if (selectedDiscussion?.id === deleteDialog.discussion.id) {
        setSelectedDiscussion(null);
      }
      
      setDeleteDialog({ open: false, discussion: null, password: '' });
      setSnackbar({
        open: true,
        message: '채팅방이 삭제되었습니다.',
        severity: 'success'
      });
    } catch (error) {
      console.error('채팅방 삭제 실패:', error);
      setSnackbar({
        open: true,
        message: '채팅방 삭제에 실패했습니다.',
        severity: 'error'
      });
    }
  };

  // 비밀번호 재설정
  const handlePasswordReset = async () => {
    try {
      if (!selectedDiscussion) return;
      
      // 현재 비밀번호 확인 (비밀번호 변경/삭제 시)
      if (currentPassword && selectedDiscussion.password) {
        if (currentPassword !== selectedDiscussion.password) {
          setSnackbar({
            open: true,
            message: '현재 비밀번호가 올바르지 않습니다.',
            severity: 'error'
          });
          return;
        }
      }
      
      // 새 비밀번호 검증
      if (newPassword || confirmPassword) {
        if (newPassword !== confirmPassword) {
          setSnackbar({
            open: true,
            message: '새 비밀번호가 일치하지 않습니다.',
            severity: 'error'
          });
          return;
        }

        if (newPassword && newPassword.length < 4) {
          setSnackbar({
            open: true,
            message: '비밀번호는 4자 이상이어야 합니다.',
            severity: 'error'
          });
          return;
        }
      }
      
      // 비밀번호 변경/삭제 로직
      if (newPassword && confirmPassword) {
        // 새 비밀번호 설정
        // 여기에 실제 비밀번호 업데이트 로직 추가
        setSnackbar({
          open: true,
          message: '비밀번호가 변경되었습니다.',
          severity: 'success'
        });
      } else if (newPassword === '' && confirmPassword === '') {
        // 비밀번호 삭제 (빈 값으로 저장)
        // 여기에 실제 비밀번호 삭제 로직 추가
        setSnackbar({
          open: true,
          message: '비밀번호가 삭제되었습니다.',
          severity: 'success'
        });
      }
      
      // 상태 초기화
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
    } catch (error) {
      console.error('비밀번호 재설정 실패:', error);
      setSnackbar({
        open: true,
        message: '비밀번호 재설정에 실패했습니다.',
        severity: 'error'
      });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Box sx={{ 
      backgroundColor: '#000000', 
      height: 'calc(100vh - 90px)', // 헤더(56px) + 하단바(34px) 제외 - 화면 키움
      color: '#FFFFFF',
      position: 'relative',
      mt: '26px' // 헤더 높이만큼 위로 여백 - 30px 위로 이동
    }}>
              {/* 채팅방 목록 화면 */}
        {!selectedDiscussion ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            height: '100%'
          }}>
                  {/* 헤더 */}
        <AppBar position="static" sx={{ backgroundColor: '#000000', color: '#FFFFFF' }}>
          <Toolbar>
            <Typography variant="h6" sx={{ flex: 1, fontWeight: 'bold', fontSize: '20px' }}>
              토론의견
            </Typography>
            <IconButton 
              onClick={() => setIsCreateDialogOpen(true)}
              sx={{ color: '#FFFFFF', mr: 1 }}
            >
              <AddIcon />
            </IconButton>
            <IconButton sx={{ color: '#FFFFFF' }}>
              <SearchIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        {/* 검색바 */}
        <Box sx={{ p: 2, backgroundColor: '#000000' }}>
                      <TextField
            fullWidth
            placeholder="토론 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: '#666', mr: 1 }} />,
              sx: { 
                backgroundColor: '#333333',
                borderRadius: 2,
                '& fieldset': { border: 'none' },
                '& input': {
                  color: '#FFFFFF',
                  '&::placeholder': {
                    color: '#999',
                    opacity: 1
                  }
                }
              }
            }}
          />
          </Box>

          {/* 채팅방 목록 */}
          <Box sx={{ 
            p: 1,
            height: 'calc(100vh - 200px)', // 실제 높이를 키움
            overflowY: 'auto',
            pb: 10 // 하단바 높이(38px) + 더 큰 여백
          }}>
            {filteredDiscussions.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center', backgroundColor: '#2D2D2D', m: 2 }}>
                <Typography variant="h6" sx={{ color: '#FFFFFF', mb: 1 }}>
                  토론이 없습니다
                </Typography>
                <Typography variant="body2" sx={{ color: '#CCCCCC' }}>
                  첫 번째 토론을 시작해보세요!
                </Typography>
              </Paper>
            ) : (
              filteredDiscussions.map((discussion) => (
                <Card 
                  key={discussion.id} 
                  sx={{ 
                    mb: 1, 
                    backgroundColor: selectedDiscussion?.id === discussion.id ? '#444444' : '#2D2D2D',
                    borderRadius: 0,
                    borderBottom: '1px solid #444444',
                    boxShadow: 'none',
                    '&:hover': { backgroundColor: '#444444' },
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                  onClick={() => handleDiscussionSelect(discussion)}
                >
                  {/* 중요도 표시 (왼쪽 세로막대) */}
                  <Box sx={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '4px',
                    backgroundColor: getPriorityColor(discussion.priority)
                  }} />
                  
                  <CardContent sx={{ p: 2, pl: 3, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <Box sx={{ flex: 1 }}>
                        {/* 현장명 */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="h6" sx={{ 
                            fontSize: '16px', 
                            fontWeight: 'bold',
                            color: '#FFFFFF'
                          }}>
                            {discussion.siteName || discussion.title}
                          </Typography>
                          {discussion.password && discussion.password.trim() !== '' && (
                            <Typography sx={{ 
                              color: '#ff9800',
                              fontSize: '14px',
                              fontWeight: 'bold'
                            }}>
                              🔒
                            </Typography>
                          )}
                        </Box>
                        
                        {/* 부제목 (선택사항) */}
                        {discussion.subtitle && (
                          <Typography variant="body2" sx={{ 
                            color: '#CCCCCC', 
                            fontSize: '14px',
                            mb: 0.5
                          }}>
                            {discussion.subtitle}
                          </Typography>
                        )}
                        
                        {/* 마지막 작성자와 시간 */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="body2" sx={{ 
                            color: '#999', 
                            fontSize: '12px'
                          }}>
                            {discussion.lastAuthor || '작성자 없음'}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#999', fontSize: '12px' }}>
                            {discussion.lastMessageTime?.toDate
                              ? discussion.lastMessageTime.toDate().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true })
                              : (discussion.lastMessageTime instanceof Date
                                  ? discussion.lastMessageTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true })
                                  : (discussion.lastMessageTime ? String(discussion.lastMessageTime) : '')
                                )
                          }
                          </Typography>
                        </Box>
                        
                        {/* 비밀번호 유무 표시 */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {discussion.password && discussion.password.trim() !== '' && (
                            <Chip
                              label="🔒 보호됨"
                              size="small"
                              sx={{ 
                                backgroundColor: '#ff9800',
                                color: 'white',
                                fontSize: '10px',
                                height: '18px',
                                fontWeight: 'bold'
                              }}
                            />
                          )}
                          <Chip
                            label={discussion.category || '일반'}
                            size="small"
                            sx={{ 
                              backgroundColor: discussion.color || '#666',
                              color: 'white',
                              fontSize: '10px',
                              height: '18px'
                            }}
                          />
                        </Box>
                      </Box>
                      
                      {/* 수정/삭제 버튼 */}
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditDialog({ open: true, discussion });
                          }}
                          sx={{ 
                            color: '#999',
                            '&:hover': { color: '#fff' }
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteDialog({ open: true, discussion });
                          }}
                          sx={{ 
                            color: '#999',
                            '&:hover': { color: '#ff4444' }
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))
            )}
          </Box>
          </Box>
        ) : (
        /* 채팅 화면 */
        <Box sx={{ 
          height: 'calc(100vh - 90px)', // 헤더 + 하단바 제외 - 화면 키움
          display: 'flex', 
          flexDirection: 'column',
          backgroundColor: '#1A1A1A',
          mt: '26px' // 헤더 높이만큼 위로 여백 - 30px 위로 이동
        }}>
          {/* 채팅 헤더 */}
          <AppBar 
            position="static" 
            sx={{ 
              backgroundColor: '#333333', 
              color: '#FFFFFF'
            }}
          >
            <Toolbar sx={{ minHeight: '56px !important' }}>
              <IconButton 
                onClick={() => setSelectedDiscussion(null)}
                sx={{ color: '#FFFFFF', mr: 1 }}
              >
                <ArrowBackIcon />
              </IconButton>
              <Avatar 
                sx={{ 
                  width: 36, 
                  height: 36, 
                  backgroundColor: selectedDiscussion.color,
                  fontSize: '14px',
                  fontWeight: 'bold',
                  mr: 1
                }}
              >
                {selectedDiscussion.avatar}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontSize: '16px', fontWeight: 'bold', color: '#FFFFFF' }}>
                  {selectedDiscussion.siteName}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ 
                    width: 5, 
                    height: 5, 
                    borderRadius: '50%', 
                    backgroundColor: '#4CAF50',
                    animation: 'pulse 2s infinite'
                  }} />
                  <Typography variant="body2" sx={{ color: '#4CAF50', fontSize: '10px' }}>
                    실시간
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#CCCCCC', fontSize: '11px' }}>
                    • {selectedDiscussion.subtitle && `${selectedDiscussion.subtitle} • `}참여자 {selectedDiscussion.participants}명
                  </Typography>
                </Box>
              </Box>
              <IconButton 
                onClick={handleMenuOpen}
                sx={{ color: '#FFFFFF' }}
              >
                <MoreVertIcon />
              </IconButton>
            </Toolbar>
          </AppBar>

          {/* 메시지 영역 */}
          <Box 
            data-messages-container
            sx={{ 
            flex: 1, 
            overflowY: 'auto', 
            backgroundColor: '#1A1A1A',
            p: 2,
            pb: keyboardHeight > 0 ? `${keyboardHeight + 80}px` : '80px', // 입력칸 높이(60px) + 여백(20px) 추가
            margin: 0 // 마진 제거로 딱 붙게
          }}>
            {messages[selectedDiscussion.id]?.map((message) => {
              const isMyMessage = message.authorId === currentUser?.uid;
              const timestamp = message.timestamp?.toDate 
                ? message.timestamp.toDate().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true })
                : (message.timestamp instanceof Date
                    ? message.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true })
                    : (message.timestamp ? String(message.timestamp) : '')
                  );

              return (
                <Box 
                  key={message.id} 
                  sx={{ 
                    display: 'flex', 
                    justifyContent: isMyMessage ? 'flex-end' : 'flex-start',
                    mb: 2,
                    opacity: message.isPending ? 0.7 : 1
                  }}
                >
                  {!isMyMessage && (
                    <Avatar 
                      sx={{ 
                        width: 32, 
                        height: 32, 
                        mr: 1,
                        backgroundColor: selectedDiscussion.color,
                        fontSize: '12px',
                        color: 'white'
                      }}
                    >
                      {message.author?.charAt(0) || '사'}
                    </Avatar>
                  )}
                  
                  <Box sx={{ maxWidth: '70%' }}>
                    {!isMyMessage && (
                      <Typography variant="caption" sx={{ color: '#CCCCCC', ml: 1, mb: 0.5, display: 'block', fontSize: '11px' }}>
                        {message.author}
                      </Typography>
                    )}
                    
                    <Paper sx={{
                      p: 1.5,
                      backgroundColor: isMyMessage ? '#4CAF50' : '#333333',
                      borderRadius: isMyMessage ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                      wordBreak: 'break-word',
                      maxWidth: '100%',
                      border: message.isPending ? '1px dashed #90caf9' : 'none'
                    }}>
                      {/* 텍스트 메시지 */}
                      {message.content && (
                        <Typography variant="body2" sx={{ 
                          fontSize: '14px',
                          color: '#FFFFFF',
                          lineHeight: 1.4,
                          mb: message.files && message.files.length > 0 ? 1 : 0
                        }}>
                          {message.content}
                          {message.isPending && (
                            <span style={{ marginLeft: '8px', fontSize: '12px', color: '#90caf9' }}>
                              전송 중...
                            </span>
                          )}
                        </Typography>
                      )}
                      
                      {/* 첨부파일 */}
                      {message.files && message.files.length > 0 && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {message.files.map((file, index) => (
                            <Box
                              key={index}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                p: 1,
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                borderRadius: 1,
                                cursor: 'pointer',
                                '&:hover': {
                                  backgroundColor: 'rgba(255,255,255,0.2)'
                                }
                              }}
                              onClick={() => window.open(file.url, '_blank')}
                            >
                              <AttachFileIcon sx={{ fontSize: 16, color: '#90CAF9' }} />
                              <Typography variant="caption" sx={{ 
                                color: '#FFFFFF',
                                flex: 1,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {file.name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#CCC' }}>
                                {(file.size / 1024).toFixed(1)}KB
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Paper>
                    
                    <Typography variant="caption" sx={{ 
                      color: '#CCCCCC', 
                      ml: 1, 
                      mt: 0.5, 
                      display: 'block',
                      textAlign: isMyMessage ? 'right' : 'left',
                      fontSize: '11px'
                    }}>
                      {timestamp}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
            <div ref={messagesEndRef} />
          </Box>

          {/* 메시지 입력 영역 */}
          <Box sx={{ 
            backgroundColor: '#2D2D2D', 
            borderTop: '1px solid #444444',
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            px: 2,
            py: 0.5,
            position: 'fixed',
            bottom: keyboardHeight > 0 ? `${keyboardHeight}px` : 0, // 키보드에 딱 붙어서 위치
            left: 0,
            right: 0,
            zIndex: 1000,
            margin: 0 // 마진 제거로 딱 붙게
          }}>
            {/* 첨부파일 표시 영역 */}
            {attachedFiles.length > 0 && (
              <Box sx={{ 
                position: 'absolute', 
                bottom: '60px', 
                left: 0, 
                right: 0, 
                backgroundColor: '#2D2D2D',
                borderTop: '1px solid #444444',
                p: 1,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
                maxHeight: '100px',
                overflowY: 'auto'
              }}>
                {attachedFiles.map((file, index) => (
                  <Chip
                    key={index}
                    label={file.name}
                    onDelete={() => handleRemoveFile(index)}
                    size="small"
                    sx={{
                      backgroundColor: '#444444',
                      color: '#FFFFFF',
                      '& .MuiChip-deleteIcon': {
                        color: '#FF6B6B'
                      }
                    }}
                  />
                ))}
              </Box>
            )}
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <input
                type="file"
                multiple
                onChange={handleFileAttach}
                style={{ display: 'none' }}
                id="mobile-file-attach"
              />
              <label htmlFor="mobile-file-attach">
                <IconButton 
                  component="span"
                  sx={{ color: '#CCCCCC', flexShrink: 0 }}
                >
                  <AttachFileIcon />
                </IconButton>
              </label>
              <TextField
                fullWidth
                placeholder="메시지를 입력하세요..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                InputProps={{
                  sx: { 
                    backgroundColor: '#444444',
                    borderRadius: 3,
                    '& fieldset': { border: 'none' },
                    '& input': {
                      color: '#FFFFFF',
                      fontSize: '14px',
                      '&::placeholder': {
                        color: '#999',
                        opacity: 1
                      }
                    }
                  }
                }}
              />
              <IconButton 
                onClick={handleSendMessage}
                disabled={!newMessage.trim() && attachedFiles.length === 0}
                sx={{ 
                  color: '#FFFFFF',
                  backgroundColor: (newMessage.trim() || attachedFiles.length > 0) ? '#4CAF50' : '#666666',
                  flexShrink: 0,
                  width: 40,
                  height: 40
                }}
              >
                <SendIcon />
              </IconButton>
            </Box>
          </Box>
        </Box>
      )}

      {/* 새 토론 생성 다이얼로그 */}
      <Dialog 
        open={isCreateDialogOpen} 
        onClose={() => setIsCreateDialogOpen(false)}
        fullScreen
        PaperProps={{
          sx: { backgroundColor: '#1A1A1A' }
        }}
      >
        <AppBar position="sticky" sx={{ backgroundColor: '#333333', color: '#FFFFFF' }}>
          <Toolbar>
            <IconButton 
              onClick={() => setIsCreateDialogOpen(false)}
              sx={{ color: '#FFFFFF', mr: 2 }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" sx={{ flex: 1 }}>
              새 토론 만들기
            </Typography>
          </Toolbar>
        </AppBar>
        
        <Box sx={{ p: 2, pb: 8 }}>
          {/* 현장명 검색 */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel sx={{ color: '#CCCCCC' }}>현장명 *</InputLabel>
            <Select
              value={newDiscussion.siteName}
              onChange={(e) => setNewDiscussion({...newDiscussion, siteName: e.target.value})}
              disabled={sitesLoading}
              sx={{ 
                backgroundColor: '#444444',
                '& .MuiSelect-select': {
                  color: '#FFFFFF'
                }
              }}
            >
              {sitesLoading ? (
                <MenuItem disabled>현장 데이터 로딩 중...</MenuItem>
              ) : sites.length === 0 ? (
                <MenuItem disabled>등록된 현장이 없습니다</MenuItem>
              ) : (
                sites.map(site => (
                  <MenuItem key={site.id} value={site.name}>
                    {site.name}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          {/* 부제목 */}
          <TextField
            fullWidth
            label="부제목 (선택사항)"
            value={newDiscussion.subtitle}
            onChange={(e) => setNewDiscussion({...newDiscussion, subtitle: e.target.value})}
            sx={{ mb: 2 }}
            InputProps={{ 
              sx: { 
                backgroundColor: '#444444',
                '& input': {
                  color: '#FFFFFF'
                },
                '& label': {
                  color: '#CCCCCC'
                }
              } 
            }}
          />

          {/* 비밀번호 (선택사항) */}
          <TextField
            fullWidth
            label="비밀번호 (선택사항)"
            type="password"
            value={newDiscussion.password}
            onChange={(e) => setNewDiscussion({...newDiscussion, password: e.target.value})}
            sx={{ mb: 2 }}
            InputProps={{ 
              sx: { 
                backgroundColor: '#444444',
                '& input': {
                  color: '#FFFFFF'
                },
                '& label': {
                  color: '#CCCCCC'
                }
              } 
            }}
          />
          
          <Grid container spacing={2}>
            <Grid item size={8}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: '#CCCCCC' }}>카테고리</InputLabel>
                <Select
                  value={newDiscussion.category}
                  onChange={(e) => setNewDiscussion({...newDiscussion, category: e.target.value})}
                  sx={{ 
                    backgroundColor: '#444444',
                    '& .MuiSelect-select': {
                      color: '#FFFFFF'
                    }
                  }}
                >
                  {categories.map(cat => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item size={4}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: '#CCCCCC' }}>우선순위</InputLabel>
                <Select
                  value={newDiscussion.priority}
                  onChange={(e) => setNewDiscussion({...newDiscussion, priority: e.target.value})}
                  sx={{ 
                    backgroundColor: '#444444',
                    '& .MuiSelect-select': {
                      color: '#FFFFFF'
                    }
                  }}
                >
                  {priorities.map(priority => (
                    <MenuItem key={priority.value} value={priority.value}>
                      {priority.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>
        
        {/* 하단 고정 버튼 영역 */}
        <Box sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#1A1A1A',
          borderTop: '1px solid #444444',
          p: 2,
          zIndex: 1000
        }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              onClick={() => setIsCreateDialogOpen(false)}
              variant="outlined"
              fullWidth
              sx={{
                borderColor: '#666666',
                color: '#FFFFFF',
                '&:hover': {
                  borderColor: '#888888',
                  backgroundColor: 'rgba(255,255,255,0.1)'
                }
              }}
            >
              취소
            </Button>
            <Button 
              onClick={handleCreateDiscussion}
              variant="contained"
              fullWidth
              sx={{
                backgroundColor: '#4CAF50',
                color: '#FFFFFF',
                '&:hover': { backgroundColor: '#45A049' }
              }}
            >
              만들기
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* 채팅방 메뉴 */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            backgroundColor: '#2D2D2D',
            color: '#FFFFFF',
            minWidth: 200
          }
        }}
      >
        <MenuItem onClick={() => handleMenuAction('info')}>
          <ListItemIcon>
            <InfoIcon sx={{ color: '#4CAF50' }} />
          </ListItemIcon>
          <ListItemText>채팅방 정보</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('participants')}>
          <ListItemIcon>
            <PeopleIcon sx={{ color: '#4CAF50' }} />
          </ListItemIcon>
          <ListItemText>참여자 목록</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('settings')}>
          <ListItemIcon>
            <SettingsIcon sx={{ color: '#4CAF50' }} />
          </ListItemIcon>
          <ListItemText>채팅방 설정</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('edit')}>
          <ListItemIcon>
            <EditIcon sx={{ color: '#4CAF50' }} />
          </ListItemIcon>
          <ListItemText>채팅방 수정</ListItemText>
        </MenuItem>
        <Divider sx={{ backgroundColor: '#444444' }} />
        <MenuItem onClick={() => handleMenuAction('export')}>
          <ListItemIcon>
            <DownloadIcon sx={{ color: '#4CAF50' }} />
          </ListItemIcon>
          <ListItemText>메시지 내보내기</ListItemText>
        </MenuItem>
        <Divider sx={{ backgroundColor: '#444444' }} />
        <MenuItem onClick={() => handleMenuAction('leave')}>
          <ListItemIcon>
            <ExitToAppIcon sx={{ color: '#FF9800' }} />
          </ListItemIcon>
          <ListItemText>채팅방 나가기</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('delete')}>
          <ListItemIcon>
            <DeleteIcon sx={{ color: '#F44336' }} />
          </ListItemIcon>
          <ListItemText>채팅방 삭제</ListItemText>
        </MenuItem>
      </Menu>

      {/* 채팅방 정보 다이얼로그 */}
      <Dialog 
        open={isInfoDialogOpen} 
        onClose={() => setIsInfoDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { backgroundColor: '#1A1A1A' }
        }}
      >
        <DialogTitle sx={{ backgroundColor: '#333333', color: '#FFFFFF' }}>
          채팅방 정보
        </DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          {selectedDiscussion && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar 
                  sx={{ 
                    width: 60, 
                    height: 60, 
                    backgroundColor: selectedDiscussion.color,
                    fontSize: '24px',
                    fontWeight: 'bold',
                    mr: 2
                  }}
                >
                  {selectedDiscussion.avatar}
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ color: '#FFFFFF', mb: 1 }}>
                    {selectedDiscussion.siteName}
                  </Typography>
                  {selectedDiscussion.subtitle && (
                    <Typography variant="body2" sx={{ color: '#CCCCCC', mb: 1 }}>
                      {selectedDiscussion.subtitle}
                    </Typography>
                  )}
                  <Chip
                    label={selectedDiscussion.category}
                    size="small"
                    sx={{ 
                      backgroundColor: selectedDiscussion.color,
                      color: 'white',
                      fontSize: '12px'
                    }}
                  />
                </Box>
              </Box>
              <Typography variant="body2" sx={{ color: '#CCCCCC', mb: 1 }}>
                참여자: {selectedDiscussion.participants}명
              </Typography>
              <Typography variant="body2" sx={{ color: '#CCCCCC', mb: 1 }}>
                마지막 메시지: {selectedDiscussion.lastMessageTime}
              </Typography>
              <Typography variant="body2" sx={{ color: '#CCCCCC', mb: 2 }}>
                생성일: {selectedDiscussion.createdAt ? new Date(selectedDiscussion.createdAt.seconds * 1000).toLocaleDateString('ko-KR') : '알 수 없음'}
              </Typography>
              
              {/* 비밀번호 설정 섹션 */}
              <Divider sx={{ backgroundColor: '#444444', my: 2 }} />
              <Typography variant="h6" sx={{ color: '#FFFFFF', mb: 2 }}>
                비밀번호 설정
              </Typography>
              <TextField
                fullWidth
                label="현재 비밀번호"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                sx={{ mb: 2 }}
                InputProps={{
                  sx: { 
                    backgroundColor: '#444444',
                    color: '#FFFFFF',
                    '& fieldset': { borderColor: '#666666' }
                  }
                }}
                InputLabelProps={{
                  sx: { color: '#CCCCCC' }
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
                    backgroundColor: '#444444',
                    color: '#FFFFFF',
                    '& fieldset': { borderColor: '#666666' }
                  }
                }}
                InputLabelProps={{
                  sx: { color: '#CCCCCC' }
                }}
              />
              <TextField
                fullWidth
                label="새 비밀번호 확인"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                sx={{ mb: 2 }}
                InputProps={{
                  sx: { 
                    backgroundColor: '#444444',
                    color: '#FFFFFF',
                    '& fieldset': { borderColor: '#666666' }
                  }
                }}
                InputLabelProps={{
                  sx: { color: '#CCCCCC' }
                }}
              />
              <Button
                fullWidth
                variant="contained"
                onClick={handlePasswordReset}
                sx={{
                  backgroundColor: '#4CAF50',
                  color: '#FFFFFF',
                  '&:hover': { backgroundColor: '#45A049' }
                }}
              >
                비밀번호 재설정
              </Button>
              <Typography variant="body2" sx={{ color: '#CCCCCC', mt: 2 }}>
                메시지 수: {messages[selectedDiscussion.id]?.length || 0}개
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsInfoDialogOpen(false)}>
            닫기
          </Button>
        </DialogActions>
      </Dialog>

      {/* 참여자 목록 다이얼로그 */}
      <Dialog 
        open={isParticipantsDialogOpen} 
        onClose={() => setIsParticipantsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { backgroundColor: '#1A1A1A' }
        }}
      >
        <DialogTitle sx={{ backgroundColor: '#333333', color: '#FFFFFF' }}>
          참여자 목록
        </DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          {selectedDiscussion && (
            <Box>
              <Typography variant="body2" sx={{ color: '#CCCCCC', mb: 2 }}>
                참여자 목록이 비어있습니다.
              </Typography>
              <Typography variant="body2" sx={{ color: '#999999', fontStyle: 'italic' }}>
                실제 참여자 데이터는 추후 구현 예정입니다.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsParticipantsDialogOpen(false)}>
            닫기
          </Button>
        </DialogActions>
      </Dialog>

      {/* 채팅방 설정 다이얼로그 */}
      <Dialog 
        open={isSettingsDialogOpen} 
        onClose={() => setIsSettingsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { backgroundColor: '#1A1A1A' }
        }}
      >
        <DialogTitle sx={{ backgroundColor: '#333333', color: '#FFFFFF' }}>
          채팅방 설정
        </DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          {selectedDiscussion && (
            <Box>
              <Typography variant="h6" sx={{ color: '#FFFFFF', mb: 2 }}>
                {selectedDiscussion.siteName}
              </Typography>
              {selectedDiscussion.subtitle && (
                <Typography variant="body2" sx={{ color: '#CCCCCC', mb: 2 }}>
                  {selectedDiscussion.subtitle}
                </Typography>
              )}
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel sx={{ color: '#CCCCCC' }}>알림 설정</InputLabel>
                <Select
                  defaultValue="all"
                  sx={{ 
                    backgroundColor: '#444444',
                    '& .MuiSelect-select': {
                      color: '#FFFFFF'
                    }
                  }}
                >
                  <MenuItem value="all">모든 메시지</MenuItem>
                  <MenuItem value="mentions">멘션만</MenuItem>
                  <MenuItem value="none">알림 끄기</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel sx={{ color: '#CCCCCC' }}>메시지 표시</InputLabel>
                <Select
                  defaultValue="all"
                  sx={{ 
                    backgroundColor: '#444444',
                    '& .MuiSelect-select': {
                      color: '#FFFFFF'
                    }
                  }}
                >
                  <MenuItem value="all">모든 메시지</MenuItem>
                  <MenuItem value="text">텍스트만</MenuItem>
                  <MenuItem value="files">파일만</MenuItem>
                </Select>
              </FormControl>
              
              {/* 말풍선 색상 설정 */}
              <Typography variant="h6" sx={{ color: '#FFFFFF', mb: 2, mt: 3 }}>
                말풍선 커스터마이징
              </Typography>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel sx={{ color: '#CCCCCC' }}>내 말풍선 색상</InputLabel>
                <Select
                  defaultValue="#4CAF50"
                  sx={{ 
                    backgroundColor: '#444444',
                    '& .MuiSelect-select': {
                      color: '#FFFFFF'
                    }
                  }}
                >
                  <MenuItem value="#4CAF50">초록색</MenuItem>
                  <MenuItem value="#2196F3">파란색</MenuItem>
                  <MenuItem value="#FF9800">주황색</MenuItem>
                  <MenuItem value="#9C27B0">보라색</MenuItem>
                  <MenuItem value="#F44336">빨간색</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel sx={{ color: '#CCCCCC' }}>상대방 말풍선 색상</InputLabel>
                <Select
                  defaultValue="#666666"
                  sx={{ 
                    backgroundColor: '#444444',
                    '& .MuiSelect-select': {
                      color: '#FFFFFF'
                    }
                  }}
                >
                  <MenuItem value="#666666">회색</MenuItem>
                  <MenuItem value="#E3F2FD">연한 파란색</MenuItem>
                  <MenuItem value="#FFF3E0">연한 주황색</MenuItem>
                  <MenuItem value="#F3E5F5">연한 보라색</MenuItem>
                  <MenuItem value="#FFEBEE">연한 빨간색</MenuItem>
                </Select>
              </FormControl>
              
              {/* 글자색 설정 */}
              <Typography variant="h6" sx={{ color: '#FFFFFF', mb: 2, mt: 3 }}>
                글자색 설정
              </Typography>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel sx={{ color: '#CCCCCC' }}>내 메시지 글자색</InputLabel>
                <Select
                  defaultValue="#FFFFFF"
                  sx={{ 
                    backgroundColor: '#444444',
                    '& .MuiSelect-select': {
                      color: '#FFFFFF'
                    }
                  }}
                >
                  <MenuItem value="#FFFFFF">흰색</MenuItem>
                  <MenuItem value="#000000">검은색</MenuItem>
                  <MenuItem value="#FFD700">금색</MenuItem>
                  <MenuItem value="#00FFFF">청록색</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel sx={{ color: '#CCCCCC' }}>상대방 메시지 글자색</InputLabel>
                <Select
                  defaultValue="#FFFFFF"
                  sx={{ 
                    backgroundColor: '#444444',
                    '& .MuiSelect-select': {
                      color: '#FFFFFF'
                    }
                  }}
                >
                  <MenuItem value="#FFFFFF">흰색</MenuItem>
                  <MenuItem value="#000000">검은색</MenuItem>
                  <MenuItem value="#CCCCCC">회색</MenuItem>
                  <MenuItem value="#E0E0E0">연한 회색</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsSettingsDialogOpen(false)}>
            취소
          </Button>
          <Button 
            variant="contained"
            onClick={() => setIsSettingsDialogOpen(false)}
            sx={{
              backgroundColor: '#4CAF50',
              color: '#FFFFFF',
              '&:hover': { backgroundColor: '#45A049' }
            }}
          >
            저장
          </Button>
        </DialogActions>
      </Dialog>

      {/* 수정 다이얼로그 */}
      <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, discussion: null })} maxWidth="sm" fullWidth>
        <DialogTitle>채팅방 수정</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="현장명"
            value={editDialog.discussion?.siteName || ''}
            onChange={(e) => setEditDialog(prev => ({
              ...prev,
              discussion: { ...prev.discussion, siteName: e.target.value }
            }))}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="부제목 (선택사항)"
            value={editDialog.discussion?.subtitle || ''}
            onChange={(e) => setEditDialog(prev => ({
              ...prev,
              discussion: { ...prev.discussion, subtitle: e.target.value }
            }))}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="비밀번호 (선택사항)"
            type="password"
            value={editDialog.discussion?.password || ''}
            onChange={(e) => setEditDialog(prev => ({
              ...prev,
              discussion: { ...prev.discussion, password: e.target.value }
            }))}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>중요도</InputLabel>
            <Select
              value={editDialog.discussion?.priority || 'normal'}
              onChange={(e) => setEditDialog(prev => ({
                ...prev,
                discussion: { ...prev.discussion, priority: e.target.value }
              }))}
            >
              <MenuItem value="urgent">긴급 (빨간색)</MenuItem>
              <MenuItem value="important">중요 (주황색)</MenuItem>
              <MenuItem value="normal">보통 (초록색)</MenuItem>
              <MenuItem value="low">여유 (파란색)</MenuItem>
              <MenuItem value="planned">예정 (보라색)</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, discussion: null })}>
            취소
          </Button>
          <Button onClick={handleEditDiscussion} variant="contained">
            수정
          </Button>
        </DialogActions>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, discussion: null, password: '' })}>
        <DialogTitle>채팅방 삭제</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            "{deleteDialog.discussion?.siteName || deleteDialog.discussion?.title}" 채팅방을 삭제하시겠습니까?
          </Typography>
          <Typography variant="body2" sx={{ color: '#ff4444', mt: 1 }}>
            이 작업은 되돌릴 수 없습니다.
          </Typography>
          
          {/* 비밀번호가 있는 경우 비밀번호 입력 필드 */}
          {deleteDialog.discussion?.password && deleteDialog.discussion.password.trim() !== '' && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, color: '#CCCCCC' }}>
                이 채팅방은 비밀번호가 설정되어 있습니다. 삭제하려면 비밀번호를 입력하세요.
              </Typography>
              <TextField
                fullWidth
                type="password"
                placeholder="비밀번호를 입력하세요"
                value={deleteDialog.password}
                onChange={(e) => setDeleteDialog(prev => ({ ...prev, password: e.target.value }))}
                onKeyPress={(e) => e.key === 'Enter' && handleDeleteDiscussion()}
                InputProps={{
                  sx: { 
                    backgroundColor: '#444444',
                    '& input': {
                      color: '#FFFFFF'
                    }
                  }
                }}
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

      {/* 비밀번호 확인 다이얼로그 */}
      <Dialog open={passwordDialog.open} onClose={() => setPasswordDialog({ open: false, discussion: null, password: '', type: '' })}>
        <DialogTitle>
          {passwordDialog.type === 'enter' ? '토론방 입장' : '비밀번호 확인'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: '#666' }}>
            {passwordDialog.type === 'enter' 
              ? `"${passwordDialog.discussion?.siteName || passwordDialog.discussion?.title}" 토론방에 입장하려면 비밀번호를 입력하세요.`
              : '작업을 진행하려면 비밀번호를 입력하세요.'
            }
          </Typography>
          <TextField
            fullWidth
            type="password"
            placeholder="비밀번호를 입력하세요"
            value={passwordDialog.password}
            onChange={(e) => setPasswordDialog(prev => ({ ...prev, password: e.target.value }))}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handlePasswordCheck();
              }
            }}
            inputRef={passwordInputRef}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialog({ open: false, discussion: null, password: '', type: '' })}>
            취소
          </Button>
          <Button onClick={handlePasswordCheck} variant="contained">
            {passwordDialog.type === 'enter' ? '입장' : '확인'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 메시지 내보내기 다이얼로그 */}
      <Dialog 
        open={exportDialog.open} 
        onClose={() => setExportDialog({ open: false })}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { backgroundColor: '#1A1A1A' }
        }}
      >
        <DialogTitle sx={{ backgroundColor: '#333333', color: '#FFFFFF' }}>
          메시지 내보내기
        </DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          <Typography variant="body2" sx={{ color: '#CCCCCC', mb: 3 }}>
            채팅방 메시지를 어떤 형식으로 내보내시겠습니까?
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
            <Button
              fullWidth
              variant="contained"
              onClick={exportDialog.onExcel}
              sx={{
                backgroundColor: '#4CAF50',
                color: '#FFFFFF',
                py: 1.5,
                '&:hover': { backgroundColor: '#45A049' }
              }}
            >
              📊 엑셀 파일로 내보내기 (CSV)
            </Button>
            <Button
              fullWidth
              variant="contained"
              onClick={exportDialog.onPDF}
              sx={{
                backgroundColor: '#F44336',
                color: '#FFFFFF',
                py: 1.5,
                '&:hover': { backgroundColor: '#D32F2F' }
              }}
            >
              📄 PDF 파일로 내보내기
            </Button>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setExportDialog({ open: false })}
            sx={{ color: '#CCCCCC' }}
          >
            취소
          </Button>
        </DialogActions>
      </Dialog>

      {/* 스크롤 탑 FAB */}
      {showScrollTop && (
        <Fab
          color="primary"
          aria-label="scroll to top"
          onClick={scrollToTop}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            backgroundColor: '#4CAF50',
            color: '#FFFFFF',
            '&:hover': { backgroundColor: '#45A049' }
          }}
        >
          <ArrowUpIcon />
        </Fab>
      )}

      {/* 스낵바 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
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
      
      {/* 실시간 연결 상태 애니메이션 */}
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        `}
      </style>
    </Box>
  );
};

export default MobileKakaoDiscussion; 