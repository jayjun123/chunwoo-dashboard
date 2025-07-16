import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, IconButton, Button, Dialog, DialogTitle, 
  DialogContent, DialogActions, TextField, Chip, useTheme, useMediaQuery, 
  InputAdornment, CircularProgress, Alert, MenuItem, FormControl, InputLabel, 
  Select, FormControlLabel, Checkbox, List, ListItem, ListItemText, ListItemAvatar, Avatar, Tooltip, ListItemButton
} from '@mui/material';
import {
  Add as AddIcon,
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  Description as DescriptionIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  Comment as CommentIcon,
  Lock as LockIcon,
  PictureAsPdf as PictureAsPdfIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp, where, getDocs } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { NanumGothic } from '../assets/fonts/NanumGothic.js';
import { exportToExcel, exportChatToPDF } from '../utils/exportUtils';
import { useSearchParams, useNavigate } from 'react-router-dom';

const Discussions = () => {
  const [rooms, setRooms] = useState([]);
  const [messages, setMessages] = useState([]);
  const [sites, setSites] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [fileToUpload, setFileToUpload] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadTask, setUploadTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [newRoomData, setNewRoomData] = useState({ name: '', siteId: '', password: '', passwordInput: '', permissions: {} });
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [selectedRoomForPassword, setSelectedRoomForPassword] = useState(null);
  
  // 권한 타입 정의
  const permissionTypes = [
    { value: 'admin', label: '관리자', color: 'error' },
    { value: 'general', label: '일반회원', color: 'primary' },
    { value: 'teamA', label: '대마팀A', color: 'success' },
    { value: 'teamB', label: '대마팀B', color: 'warning' },
    { value: 'teamC', label: '대마팀C', color: 'info' },
    { value: 'teamD', label: '대마팀D', color: 'secondary' }
  ];
  const [searchTerm, setSearchTerm] = useState('');
  const [editingMessage, setEditingMessage] = useState(null);
  const [searchParams] = useSearchParams();
  const [filteredSiteId, setFilteredSiteId] = useState(null);
  const [filteredSiteName, setFilteredSiteName] = useState('');
  const [searchText, setSearchText] = useState("");
  const [searchJump, setSearchJump] = useState("");
  const messageRefs = useRef({});
  const [replyTo, setReplyTo] = useState(null);
  const [message, setMessage] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [selectedRoomIds, setSelectedRoomIds] = useState([]);

  const { currentUser } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery('(max-width:600px)');
  const navigate = useNavigate();

  const formatDate = (date) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d);
  };
  
  const formatTime = (date) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return new Intl.DateTimeFormat('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  };

  useEffect(() => {
    setLoading(true);
    const sitesQuery = query(collection(db, 'sites'), orderBy('name'));
    const sitesUnsubscribe = onSnapshot(sitesQuery, (snapshot) => {
      setSites(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const roomsQuery = query(collection(db, 'discussions'), orderBy('lastActivity', 'desc'));
    const roomsUnsubscribe = onSnapshot(roomsQuery, (snapshot) => {
      setRooms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, () => setLoading(false));

    return () => {
      sitesUnsubscribe();
      roomsUnsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!selectedRoom) {
      setMessages([]);
      return;
    }
    const messagesQuery = query(
      collection(db, `discussions/${selectedRoom.id}/messages`),
      orderBy('timestamp', 'asc')
    );
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log('메시지 로딩:', {
        roomId: selectedRoom.id,
        messageCount: messagesData.length,
        messages: messagesData.map(m => ({ id: m.id, text: m.text, userName: m.userName, timestamp: m.timestamp }))
      });
      setMessages(messagesData);
    }, (error) => {
      console.error('메시지 로딩 오류:', error);
    });
    return () => unsubscribe();
  }, [selectedRoom]);

  // 메시지 저장 후 강제 새로고침을 위한 useEffect
  useEffect(() => {
    if (messages.length > 0) {
      console.log('메시지 상태 업데이트됨:', messages.length, '개');
    }
  }, [messages]);

  useEffect(() => {
    const siteId = searchParams.get('siteId');
    if (siteId && sites.length > 0) {
      setFilteredSiteId(siteId);
      const site = sites.find(s => s.id === siteId);
      if (site) {
        setFilteredSiteName(site.name);
      }
    }
  }, [searchParams, sites]);

  // 키보드 이벤트 감지 (모바일) - 개선된 버전
  useEffect(() => {
    if (!isMobile) return;

    const handleResize = () => {
      const visualViewport = window.visualViewport;
      if (visualViewport) {
        const keyboardHeight = window.innerHeight - visualViewport.height;
        const isKeyboardVisible = keyboardHeight > 150;
        setKeyboardVisible(isKeyboardVisible);
        
        // 키보드가 올라오면 입력창 위치 조정 및 스크롤
        if (isKeyboardVisible) {
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ 
              behavior: 'smooth',
              block: 'end'
            });
          }, 300);
        }
      } else {
        // visualViewport가 지원되지 않는 경우 기존 방식 사용
        const viewportHeight = window.innerHeight;
        const windowHeight = window.outerHeight;
        const keyboardVisible = viewportHeight < windowHeight * 0.8;
        setKeyboardVisible(keyboardVisible);
        
        if (keyboardVisible) {
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ 
              behavior: 'smooth',
              block: 'end'
            });
          }, 300);
        }
      }
    };

    const handleFocus = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        // 입력창에 포커스가 갈 때 키보드가 올라올 것으로 예상하고 미리 조정
        setTimeout(() => {
          e.target.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }, 300);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    } else {
      window.addEventListener('resize', handleResize);
    }
    
    window.addEventListener('orientationchange', handleResize);
    document.addEventListener('focusin', handleFocus);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      } else {
        window.removeEventListener('resize', handleResize);
      }
      window.removeEventListener('orientationchange', handleResize);
      document.removeEventListener('focusin', handleFocus);
    };
  }, [isMobile]);

  // 메시지 자동 스크롤 (카카오톡처럼 마지막 메시지가 보이도록)
  useEffect(() => {
    console.log('자동 스크롤 실행, 메시지 개수:', messages.length);
    if (messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ 
          behavior: 'auto',
          block: 'end'
        });
      }, 100);
    }
  }, [messages, selectedRoom]);

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !fileToUpload) || !currentUser || !selectedRoom) return;
    
    // 쓰기 권한 체크
    if (!canWriteRoom(selectedRoom)) {
      setError("이 채팅방에 메시지를 보낼 권한이 없습니다.");
      return;
    }

    setUploading(true);

    let attachmentData = null;

    if (fileToUpload) {
      try {
        const storage = getStorage();
        const storageRef = ref(storage, `discussion_attachments/${selectedRoom.id}/${Date.now()}_${fileToUpload.name}`);
        const newUploadTask = uploadBytesResumable(storageRef, fileToUpload);
        setUploadTask(newUploadTask);

        // 업로드 진행 상황 모니터링
        newUploadTask.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
            console.log('Upload progress: ' + progress + '%');
          },
          (error) => {
            console.error("Upload error:", error);
            setError("파일 업로드 중 오류가 발생했습니다: " + error.message);
            setUploading(false);
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(newUploadTask.snapshot.ref);
              attachmentData = {
                url: downloadURL,
                name: fileToUpload.name,
                type: fileToUpload.type,
              };
              console.log('파일 업로드 완료:', attachmentData);
              
              // 파일 업로드 완료 후 메시지 저장
              await saveMessage(attachmentData);
            } catch (e) {
              console.error("Download URL error:", e);
              setError("파일 다운로드 URL 생성 중 오류가 발생했습니다.");
              setUploading(false);
              return;
            }
          }
        );

        // 업로드 완료 대기
        await newUploadTask;
        setUploadTask(null);
        setUploadProgress(0);
      } catch (e) {
        console.error("File upload error:", e);
        setError("파일 업로드 중 오류가 발생했습니다: " + e.message);
        setUploading(false);
        return;
      }
    } else {
      // 파일이 없는 경우 바로 메시지 저장
      await saveMessage(null);
    }
  };

  const saveMessage = async (attachmentData) => {
    console.log('메시지 저장 시작:', {
      roomId: selectedRoom.id,
      text: newMessage.trim(),
      userId: currentUser.uid,
      userName: currentUser.name || currentUser.displayName || '익명',
      attachment: attachmentData
    });

    try {
      const messageData = {
        text: newMessage.trim(),
        userId: currentUser.uid,
        userName: currentUser.name || currentUser.displayName || '익명',
        timestamp: serverTimestamp(),
      };
      
      if (attachmentData) {
        messageData.attachment = attachmentData;
      }
      
      const messageRef = await addDoc(collection(db, `discussions/${selectedRoom.id}/messages`), messageData);
      console.log('메시지 저장 성공:', messageRef.id, '첨부파일:', attachmentData);
    } catch (error) {
      console.error('메시지 저장 실패:', error);
      setError("메시지 저장 중 오류가 발생했습니다: " + error.message);
      setUploading(false);
      return;
    }
    
    let lastMessageText = newMessage.trim();
    if (attachmentData) {
      lastMessageText = `[${attachmentData.name}]`;
      if (newMessage.trim()) {
        lastMessageText = `${newMessage.trim()} ${lastMessageText}`;
      }
    }

    await updateDoc(doc(db, 'discussions', selectedRoom.id), {
      lastActivity: serverTimestamp(),
      lastMessage: lastMessageText.substring(0, 30),
      lastAuthor: currentUser.name || currentUser.displayName || '익명',
    });

    setNewMessage('');
    setFileToUpload(null);
    setUploading(false);
    
    // 메시지 저장 후 강제로 메시지 목록 새로고침
    console.log('메시지 저장 완료, 목록 새로고침 시도');
    setTimeout(() => {
      console.log('현재 메시지 개수:', messages.length);
    }, 1000);
  };

  const handleUploadCancel = () => {
    if (uploadTask) {
      uploadTask.cancel();
      setUploadTask(null);
    }
    setUploading(false);
    setUploadProgress(0);
    setFileToUpload(null);
    setError(null);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // 파일 크기 제한 (10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        setError("파일 크기는 10MB를 초과할 수 없습니다.");
        return;
      }

      // 허용된 파일 타입 검증
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/acad',
        'image/vnd.dwg',
        'application/dwg',
        'application/x-sketchup',
        'application/skp',
        'model/skp'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        setError("지원하지 않는 파일 형식입니다. 이미지, PDF, 텍스트, Word 문서, Excel 파일, DWG 파일, SketchUp 파일만 업로드 가능합니다.");
        return;
      }

      setFileToUpload(file);
      setError(null); // 이전 오류 메시지 클리어
    }
  };

  const handleCreateRoom = async () => {
    if (!newRoomData.siteId) return;
    const site = sites.find(s => s.id === newRoomData.siteId);
    if (!site) return;

    await addDoc(collection(db, 'discussions'), {
      name: site.name,
      siteId: newRoomData.siteId,
      siteName: site.name,
      password: newRoomData.password,
      supervisor: '',
      createdBy: currentUser.uid,
      createdAt: new Date(),
      lastActivity: new Date(),
      lastMessage: '대화방이 생성되었습니다.',
      permissions: newRoomData.permissions || {}
    });

    setIsCreateRoomOpen(false);
    setNewRoomData({ name: '', siteId: '', password: '', passwordInput: '', permissions: {} });
  };

  const handlePasswordSubmit = () => {
    if (!selectedRoomForPassword) return;
    
    if (passwordInput === selectedRoomForPassword.password) {
      setSelectedRoom(selectedRoomForPassword);
      setIsPasswordDialogOpen(false);
      setPasswordInput('');
      setSelectedRoomForPassword(null);
    } else {
      alert('비밀번호가 올바르지 않습니다.');
      setPasswordInput('');
    }
  };

  const handleRoomClick = (room) => {
    if (room.password && room.password !== '') {
      // 비밀번호가 설정된 방인 경우
      setSelectedRoomForPassword(room);
      setIsPasswordDialogOpen(true);
      setPasswordInput('');
    } else {
      // 비밀번호가 없는 방인 경우 바로 입장
      setSelectedRoom(room);
    }
  };

  const handleDeleteRoom = async (e, roomId) => {
    e.stopPropagation();
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;
    
    if (!canAdminRoom(room)) {
      alert('채팅방을 삭제할 권한이 없습니다.');
      return;
    }
    
    if (!window.confirm('정말로 이 대화방을 삭제하시겠습니까?')) return;
    await deleteDoc(doc(db, 'discussions', roomId));
    if (selectedRoom?.id === roomId) setSelectedRoom(null);
  };

  const handleDeleteMessage = async (messageId) => {
    if (!selectedRoom) return;
    
    const message = messages.find(m => m.id === messageId);
    if (!message) return;
    
    // 메시지 작성자이거나 관리 권한이 있어야 삭제 가능
    if (message.userId !== currentUser?.uid && !canAdminRoom(selectedRoom)) {
      alert('메시지를 삭제할 권한이 없습니다.');
      return;
    }
    
    if (!window.confirm('메시지를 삭제하시겠습니까?')) return;
    await deleteDoc(doc(db, `discussions/${selectedRoom.id}/messages`, messageId));
  };
  
  const handleUpdateMessage = async () => {
    if (!selectedRoom || !editingMessage) return;
    const messageRef = doc(db, `discussions/${selectedRoom.id}/messages`, editingMessage.id);
    await updateDoc(messageRef, {
      text: editingMessage.text,
    });
    setEditingMessage(null);
  };
  
  const canEditOrDelete = (message) => {
    if (!currentUser) return false;
    if (currentUser.uid === message.userId) return true; // 본인 메시지는 수정/삭제 가능
    if (currentUser.role === 'admin' || currentUser.role === 'master') return true;
    if (selectedRoom && canAdminRoom(selectedRoom)) return true; // 채팅방 관리자
    return false;
  };

  const handleExcelExport = () => {
    if (!selectedRoom || messages.length === 0) {
      alert('내보낼 대화 내용이 없습니다.');
      return;
    }

    const dataToExport = messages.map(msg => {
      const ts = msg.timestamp ? msg.timestamp.toDate() : new Date();
      const formattedTs = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}-${String(ts.getDate()).padStart(2, '0')} ${String(ts.getHours()).padStart(2, '0')}:${String(ts.getMinutes()).padStart(2, '0')}:${String(ts.getSeconds()).padStart(2, '0')}`;
      return {
        '작성자': msg.userName,
        '내용': msg.text,
        '시간': formattedTs,
      };
    });

    // 컬럼 너비 설정 (한글 텍스트 고려)
    const columnWidths = [
      { wch: 15 }, // 작성자
      { wch: 50 }, // 내용
      { wch: 20 }, // 시간
    ];

    const result = exportToExcel(dataToExport, '대화 내용', `${selectedRoom.name}_대화기록`, { columnWidths });
    
    if (result.success) {
      alert('엑셀 파일이 다운로드되었습니다.');
    } else {
      alert('엑셀 다운로드에 실패했습니다.');
    }
  };

  const handlePdfExport = () => {
    if (!selectedRoom || messages.length === 0) {
      alert('내보낼 대화 내용이 없습니다.');
      return;
    }
    
    const roomInfo = {
      name: selectedRoom.name,
      siteName: selectedRoom.siteName,
      createdAt: selectedRoom.createdAt?.toDate?.().toLocaleDateString() || '날짜 없음',
      password: selectedRoom.password ? '있음' : '없음'
    };

    const result = exportChatToPDF(messages, roomInfo);
    
    if (result.success) {
      alert('PDF 파일이 다운로드되었습니다.');
    } else {
      alert('PDF 다운로드에 실패했습니다.');
    }
  };

  // 검색 후 이동 함수
  const handleSearchJump = useCallback(() => {
    if (!searchJump.trim()) return;
    const lower = searchJump.toLowerCase();
    const found = messages.find(msg => msg.text && msg.text.toLowerCase().includes(lower));
    if (found && messageRefs.current[found.id]) {
      messageRefs.current[found.id].scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      alert('검색어를 포함한 메시지가 없습니다.');
    }
  }, [searchJump, messages]);

  // 권한 체크 함수들
  const canReadRoom = (room) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin' || currentUser.role === 'master') return true;
    if (!room.permissions) return true; // 권한 설정이 없으면 모든 사용자 접근 가능
    
    // 기존 사용자별 권한 체크
    if (room.permissions[currentUser.uid] === 'read' || 
        room.permissions[currentUser.uid] === 'write' || 
        room.permissions[currentUser.uid] === 'admin') {
      return true;
    }
    
    // 권한 타입별 체크
    for (const permission of permissionTypes) {
      if (room.permissions[`${permission.value}Read`] !== false) return true;
    }
    
    // 공개 권한 체크
    if (room.permissions.publicRead !== false) return true;
    
    return false;
  };

  const canWriteRoom = (room) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin' || currentUser.role === 'master') return true;
    if (!room.permissions) return true; // 권한 설정이 없으면 모든 사용자 접근 가능
    
    // 기존 사용자별 권한 체크
    if (room.permissions[currentUser.uid] === 'write' || 
        room.permissions[currentUser.uid] === 'admin') {
      return true;
    }
    
    // 권한 타입별 체크
    for (const permission of permissionTypes) {
      if (room.permissions[`${permission.value}Write`] !== false) return true;
    }
    
    // 공개 권한 체크
    if (room.permissions.publicWrite !== false) return true;
    
    return false;
  };

  const canAdminRoom = (room) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin' || currentUser.role === 'master') return true;
    if (!room.permissions) return false;
    return room.permissions[currentUser.uid] === 'admin';
  };

  const canCreateRoom = () => {
    if (!currentUser) return false;
    return currentUser.role === 'admin' || currentUser.role === 'master' || currentUser.role === 'manager';
  };

  // 엑셀 내보내기 함수
  const handleExportSelectedRoomsToExcel = async () => {
    if (selectedRoomIds.length === 0) {
      alert('엑셀로 내보낼 방을 먼저 선택하세요.');
      return;
    }
    for (const roomId of selectedRoomIds) {
      const room = rooms.find(r => r.id === roomId);
      if (!room) continue;
      // 메시지 불러오기
      const messagesQuery = query(collection(db, `discussions/${roomId}/messages`), orderBy('timestamp', 'asc'));
      const snapshot = await getDocs(messagesQuery);
      const messagesData = snapshot.docs.map(doc => doc.data());
      if (!messagesData.length) {
        alert(`${room.name} 방에 내보낼 메시지가 없습니다.`);
        continue;
      }
      // 엑셀 데이터 포맷
      const excelData = messagesData.map(msg => {
        let content = msg.text || '';
        if (msg.attachment) {
          if (msg.attachment.type && msg.attachment.type.startsWith('image/')) {
            content = `[이미지] ${msg.attachment.name}`;
          } else {
            content = `[파일] ${msg.attachment.name}`;
          }
          // 텍스트와 파일이 모두 있으면 텍스트 + [파일] 형태로
          if (msg.text && msg.attachment) {
            if (msg.attachment.type && msg.attachment.type.startsWith('image/')) {
              content = `${msg.text} [이미지] ${msg.attachment.name}`;
            } else {
              content = `${msg.text} [파일] ${msg.attachment.name}`;
            }
          }
        }
        return {
          '작성자': msg.userName || '익명',
          '내용': content,
          '시간': msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleString() : ''
        };
      });
      exportToExcel(excelData, '대화기록', `${room.name}_대화기록`);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
  if (error) return <Box sx={{ p: 2 }}><Alert severity="error" onClose={() => setError(null)}>{error}</Alert></Box>;

  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchTerm.toLowerCase()) && canReadRoom(room)
  );

  return (
    <Box sx={{ height: 'calc(100vh - 65px - 51px)', display: 'flex', flexDirection: 'column', position: 'fixed', top: isMobile ? '32px' : '65px', left: 0, right: 0, bottom: isMobile ? '51px' : '51px', overflow: 'hidden', overflowX: 'hidden', zIndex: 1000, bgcolor: '#1a1d21', p: 0, m: 0, width: isMobile ? '100vw' : '100%', maxWidth: isMobile ? '100vw' : '100%', minWidth: isMobile ? '100vw' : '0', boxSizing: 'border-box' }}>
      {/* 헤더 */}
      <Box sx={{ 
        p: { xs: 0, md: 2 }, 
        borderBottom: 1, 
        borderColor: 'divider',
        bgcolor: 'background.paper',
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography variant="h6">토론의견</Typography>
        {!isMobile && (
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            size="small"
            onClick={handleExportSelectedRoomsToExcel}
            sx={{ ml: 2 }}
          >
            엑셀 내보내기
          </Button>
        )}
      </Box>

      {/* 메인 컨텐츠 */}
      <Box sx={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        width: '100%'
      }}>
        {/* 채팅방 목록: 모바일은 selectedRoom 없을 때만, PC는 항상 */}
        {(!selectedRoom || !isMobile) && (
          <Box sx={{
            width: { xs: '100%', md: 350 },
            borderRight: { xs: 0, md: 1 },
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.paper',
            p: 0,
            m: 0,
            minWidth: 0,
            minHeight: 0,
          }}>
            <Box sx={{ 
              p: { xs: 0, md: 2 }, 
              borderBottom: 1, 
              borderColor: 'divider',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <Typography variant="h6">채팅방</Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {isMobile && (
                  <TextField
                    size="small"
                    placeholder="검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{ 
                      width: '120px',
                      '& .MuiOutlinedInput-root': {
                        height: '32px',
                        fontSize: '0.875rem'
                      }
                    }}
                  />
                )}
                {canCreateRoom() && (
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => setIsCreateRoomOpen(true)}
                    startIcon={<AddIcon />}
                  >
                    새방
                  </Button>
                )}
              </Box>
            </Box>
            
            <Box sx={{ 
              flex: 1, 
              overflowY: 'auto',
              p: 0
            }}>
              {filteredRooms.map((room) => {
                const canWrite = canWriteRoom(room);
                const canAdmin = canAdminRoom(room);
                
                return (
                  <Box
                    key={room.id}
                    onClick={() => {
                      if (isMobile) {
                        navigate(`/chat/${room.id}`);
                      } else {
                        handleRoomClick(room);
                      }
                    }}
                    sx={{
                      p: { xs: 0.5, md: 1.5 },
                      minHeight: '80px', // 높이를 40px 늘림 (기본 40px + 추가 40px)
                      cursor: 'pointer',
                      borderBottom: 1,
                      borderColor: 'divider',
                      bgcolor: selectedRoom?.id === room.id ? 'action.selected' : 'transparent',
                      '&:hover': {
                        bgcolor: 'action.hover'
                      },
                      display: 'flex',
                      alignItems: 'center',
                      position: 'relative'
                    }}
                  >
                    <Checkbox
                      checked={selectedRoomIds.includes(room.id)}
                      onChange={e => {
                        e.stopPropagation();
                        setSelectedRoomIds(prev =>
                          e.target.checked ? [...prev, room.id] : prev.filter(id => id !== room.id)
                        );
                      }}
                      sx={{ mr: 1 }}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                        {room.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {room.lastAuthor && room.lastActivity ?
                          `[마지막 작성자 : ${room.lastAuthor} ${formatDate(room.lastActivity)} ${formatTime(room.lastActivity)}]`
                          : '메시지가 없습니다.'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                      {!canWrite && (
                        <Chip 
                          label="읽기전용" 
                          size="small" 
                          color="warning" 
                          variant="outlined"
                          sx={{ fontSize: '0.6rem', height: 20 }}
                        />
                      )}
                      {canAdmin && (
                        <Chip 
                          label="관리자" 
                          size="small" 
                          color="error" 
                          variant="outlined"
                          sx={{ fontSize: '0.6rem', height: 20 }}
                        />
                      )}
                      {room.password && (
                        <Chip 
                          icon={<LockIcon />} 
                          label="잠금" 
                          size="small" 
                          color="secondary" 
                          variant="outlined"
                          sx={{ fontSize: '0.6rem', height: 20 }}
                        />
                      )}
                    </Box>
                    {canAdmin && (
                      <IconButton
                        size="small"
                        onClick={e => { e.stopPropagation(); handleDeleteRoom(e, room.id); }}
                        sx={{ 
                          position: 'absolute', 
                          top: 4, 
                          right: 4,
                          opacity: 0.7,
                          '&:hover': { opacity: 1 }
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}
        {/* 채팅방: 모바일은 selectedRoom 있을 때만, PC는 항상 */}
        {isMobile && selectedRoom && (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100vw', p: 0, m: 0, minWidth: 0, minHeight: 0 }}>
            {/* 채팅방 헤더 */}
            <Box sx={{ 
              p: { xs: 1, md: 2 }, 
              borderBottom: 1, 
              borderColor: 'divider',
              bgcolor: 'background.paper',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'sticky',
              top: { xs: '-24px', md: 0 }, // 모바일에서만 24px 위로 올림
              zIndex: 1200,
              transform: { xs: 'translateY(-24px)', md: 'none' } // 모바일에서 확실히 24px 위로 올림
            }}>
              <Typography 
                variant="h6"
                noWrap
                sx={{
                  flex: 1,
                  fontSize: 'clamp(1rem, 4vw, 1.2rem)',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textAlign: 'left',
                  pr: 1
                }}
              >
                {selectedRoom.name}
              </Typography>
              <IconButton onClick={() => setSelectedRoom(null)}>
                <CloseIcon />
              </IconButton>
            </Box>

            {/* 메시지 영역 */}
            <Box sx={{ 
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              pb: keyboardVisible ? '160px' : '110px', // 키보드 상태에 따라 패딩 조정
              transition: 'padding-bottom 0.3s ease-in-out'
            }}>
              <Box 
                sx={{ 
                  flex: 1,
                  overflowY: 'auto', 
                  p: { xs: 1, md: 2 },
                  minHeight: 0,
                  maxHeight: isMobile 
                    ? keyboardVisible 
                      ? 'calc(100vh - 250px)' 
                      : 'calc(100vh - 300px)'
                    : 'calc(100vh - 350px)',
                  transition: 'max-height 0.3s ease-in-out'
                }}
              >
                {messages.map((msg, index) => {
                  const isMe = msg.userId === currentUser?.uid;
                  const canModify = canEditOrDelete(msg);
                  // 날짜 구분선 추가 (카카오톡 스타일)
                  const currentDate = msg.timestamp?.toDate?.() || new Date();
                  const prevDate = index > 0 ? messages[index - 1].timestamp?.toDate?.() || new Date() : null;
                  const showDateDivider = !prevDate || 
                    currentDate.getDate() !== prevDate.getDate() ||
                    currentDate.getMonth() !== prevDate.getMonth() ||
                    currentDate.getFullYear() !== prevDate.getFullYear();
                  return (
                    <Box key={msg.id}>
                      {showDateDivider && (
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'center', 
                          my: 2,
                          px: 1
                        }}>
                          <Box sx={{
                            bgcolor: 'rgba(0,0,0,0.1)',
                            color: 'text.secondary',
                            px: 2,
                            py: 0.5,
                            borderRadius: 2,
                            fontSize: '0.75rem',
                            fontWeight: 500
                          }}>
                            {new Intl.DateTimeFormat('ko-KR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              weekday: 'long'
                            }).format(currentDate)}
                          </Box>
                        </Box>
                      )}
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', mb: 1.5 }}>
                        {/* 이름(닉네임) 표시 */}
                        <Typography sx={{ color: '#1976d2', fontSize: 14, fontWeight: 900, mb: 0.5 }}>
                          {msg.userName || '익명'}
                        </Typography>
                        {/* 메시지 버블과 시간/버튼을 감싸는 컨테이너 */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                          {/* 메시지 버블 */}
                          <Box sx={{
                            bgcolor: isMe ? '#FFF9C4' : '#222',
                            color: isMe ? '#222' : '#fff',
                            borderRadius: 3,
                            px: 2, py: 1,
                            maxWidth: '400px', // PC에서는 최대 너비 제한
                            fontSize: 14,
                            position: 'relative',
                            boxShadow: isMe ? 3 : 1,
                            fontFamily: 'NanumGothic, Malgun Gothic, Apple SD Gothic Neo, sans-serif',
                            display: 'inline-block', // 내용에 맞게 크기 조정
                            wordWrap: 'break-word',
                            whiteSpace: 'pre-wrap'
                          }}>
                            {editingMessage && editingMessage.id === msg.id ? (
                              <TextField
                                fullWidth
                                value={editingMessage.text}
                                onChange={(e) => setEditingMessage({ ...editingMessage, text: e.target.value })}
                                variant="standard"
                                size="small"
                              />
                            ) : (
                              <>
                                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', lineHeight: 1.4 }}>{msg.text}</Typography>
                                {msg.attachment && (
                                  <Box mt={1}>
                                    {msg.attachment.type.startsWith('image/') ? (
                                      <Box sx={{ position: 'relative', display: 'inline-block', borderRadius: 2, overflow: 'hidden', boxShadow: 1 }}>
                                        <a href={msg.attachment.url} target="_blank" rel="noopener noreferrer">
                                          <img 
                                            src={msg.attachment.url} 
                                            alt={msg.attachment.name} 
                                            style={{ maxWidth: '180px', maxHeight: '180px', borderRadius: '8px', cursor: 'pointer', display: 'block' }} 
                                          />
                                        </a>
                                      </Box>
                                    ) : (
                                      <Button 
                                        variant="outlined" 
                                        startIcon={<DescriptionIcon />} 
                                        href={msg.attachment.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        sx={{ textTransform: 'none', fontSize: '0.7rem', borderRadius: 2 }}
                                        size="small"
                                      >
                                        {msg.attachment.name}
                                      </Button>
                                    )}
                                  </Box>
                                )}
                              </>
                            )}
                          </Box>
                          {/* 시간, 수정/삭제 버튼 - 박스 밖에 배치 */}
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: isMe ? 'flex-end' : 'flex-start', 
                            mt: 0.5,
                            gap: 0.5
                          }}>
                            <Typography sx={{ color: '#aaa', fontSize: 10 }}>
                              {formatTime(msg.timestamp)}
                            </Typography>
                            {isMe && !editingMessage && (
                              <>
                                <IconButton size="small" onClick={() => setEditingMessage(msg)} sx={{ p: 0.5 }}>
                                  <EditIcon sx={{ fontSize: 14, color: '#666' }}/>
                                </IconButton>
                                <IconButton size="small" onClick={() => { if(window.confirm('이 메시지를 삭제하시겠습니까?')) handleDeleteMessage(msg.id); }} sx={{ p: 0.5 }}>
                                  <DeleteIcon sx={{ fontSize: 14, color: '#666' }}/>
                                </IconButton>
                              </>
                            )}
                            {isMe && editingMessage && editingMessage.id === msg.id && (
                              <>
                                <IconButton size="small" onClick={handleUpdateMessage} sx={{ p: 0.5 }}>
                                  <SaveIcon sx={{ fontSize: 14, color: '#666' }}/>
                                </IconButton>
                                <IconButton size="small" onClick={() => setEditingMessage(null)} sx={{ p: 0.5 }}>
                                  <CancelIcon sx={{ fontSize: 14, color: '#666' }}/>
                                </IconButton>
                              </>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  );
                })}
                <div ref={messagesEndRef} />
              </Box>
            </Box>

            {/* 입력칸 - 키보드 반응형 (카카오톡 스타일) */}
            <Box sx={{ 
              p: { xs: 1, md: 2 }, 
              borderTop: 1, 
              borderColor: 'divider',
              bgcolor: 'background.paper',
              width: '100vw',
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: keyboardVisible ? '0px' : '46px', // 키보드가 올라오면 하단바 위로 올라감
              zIndex: 2000,
              transition: 'all 0.3s ease-in-out',
              transform: keyboardVisible ? 'translateY(0)' : 'translateY(0)',
              // 모바일에서 키보드가 올라올 때 입력창이 키보드 위에 위치하도록 조정
              ...(isMobile && keyboardVisible && {
                bottom: '0px',
                position: 'fixed',
                zIndex: 3000
              })
            }}>
              {/* 첨부파일 미리보기 (카카오톡 스타일) */}
              {fileToUpload && (
                <Box sx={{ 
                  mb: 1, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  p: 1.5,
                  bgcolor: 'grey.50',
                  borderRadius: 2,
                  border: 1,
                  borderColor: 'grey.200',
                  position: 'relative'
                }}>
                  {fileToUpload.type.startsWith('image/') ? (
                    <Box sx={{ position: 'relative' }}>
                      <img
                        src={URL.createObjectURL(fileToUpload)}
                        alt={fileToUpload.name}
                        style={{ 
                          width: 60, 
                          height: 60, 
                          objectFit: 'cover', 
                          borderRadius: 8,
                          border: '2px solid #e0e0e0'
                        }}
                      />
                      <Box sx={{
                        position: 'absolute',
                        top: -4,
                        right: -4,
                        bgcolor: 'rgba(0,0,0,0.7)',
                        borderRadius: '50%',
                        width: 20,
                        height: 20,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}>
                        <CancelIcon 
                          sx={{ 
                            fontSize: 14, 
                            color: 'white' 
                          }} 
                          onClick={() => setFileToUpload(null)}
                        />
                      </Box>
                    </Box>
                  ) : (
                    <Box sx={{ position: 'relative' }}>
                      <Box sx={{
                        width: 60,
                        height: 60,
                        bgcolor: 'grey.200',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid #e0e0e0'
                      }}>
                        <DescriptionIcon sx={{ fontSize: 32, color: 'grey.500' }} />
                      </Box>
                      <Box sx={{
                        position: 'absolute',
                        top: -4,
                        right: -4,
                        bgcolor: 'rgba(0,0,0,0.7)',
                        borderRadius: '50%',
                        width: 20,
                        height: 20,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}>
                        <CancelIcon 
                          sx={{ 
                            fontSize: 14, 
                            color: 'white' 
                          }} 
                          onClick={() => setFileToUpload(null)}
                        />
                      </Box>
                    </Box>
                  )}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: 'bold',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: '0.9rem'
                      }}
                    >
                      {fileToUpload.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      {(fileToUpload.size / 1024 / 1024).toFixed(2)} MB
                    </Typography>
                  </Box>
                  {uploading && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={16} />
                      <Typography variant="caption" color="primary" sx={{ fontSize: '0.75rem' }}>
                        {Math.round(uploadProgress)}%
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={handleUploadCancel}
                        startIcon={<CancelIcon />}
                        sx={{ fontSize: '0.7rem', height: 28 }}
                      >
                        취소
                      </Button>
                    </Box>
                  )}
                </Box>
              )}
              
              <Box sx={{ 
                display: 'flex', 
                gap: 1,
                alignItems: 'flex-end',
                width: '100%'
              }}>
                <TextField
                  fullWidth
                  multiline
                  maxRows={4}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={canWriteRoom(selectedRoom) ? "메시지를 입력하세요..." : "읽기 전용 채팅방입니다"}
                  variant="outlined"
                  size="small"
                  disabled={!canWriteRoom(selectedRoom)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  onFocus={(e) => {
                    if (isMobile) {
                      // 모바일에서 입력창에 포커스가 갈 때 키보드가 올라올 것으로 예상하고 미리 조정
                      setTimeout(() => {
                        e.target.scrollIntoView({ 
                          behavior: 'smooth', 
                          block: 'center' 
                        });
                      }, 300);
                    }
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2
                    },
                    // 모바일에서 키보드가 올라올 때 입력창이 키보드 위에 위치하도록 조정
                    ...(isMobile && {
                      '& .MuiInputBase-root': {
                        fontSize: '16px', // iOS에서 줌 방지
                      }
                    })
                  }}
                />
                <IconButton
                  component="label"
                  sx={{ ml: 0, height: 48 }}
                  disabled={uploading || !canWriteRoom(selectedRoom)}
                >
                  <AttachFileIcon />
                  <input type="file" hidden onChange={handleFileSelect} />
                </IconButton>
                <IconButton
                  onClick={handleSendMessage}
                  disabled={(!newMessage.trim() && !fileToUpload) || uploading || !canWriteRoom(selectedRoom)}
                  color="primary"
                  sx={{ 
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'primary.dark'
                    },
                    '&.Mui-disabled': {
                      bgcolor: 'grey.300',
                      color: 'grey.500'
                    }
                  }}
                >
                  <SendIcon />
                </IconButton>
              </Box>
            </Box>
          </Box>
        )}
        {selectedRoom && (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', p: 0, m: 0, minWidth: 0, minHeight: 0 }}>
            {/* 채팅방 헤더 */}
            <Box sx={{ 
              p: { xs: 1, md: 2 }, 
              borderBottom: 1, 
              borderColor: 'divider',
              bgcolor: 'background.paper',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <Typography variant="h6">{selectedRoom.name}</Typography>
              <IconButton onClick={() => setSelectedRoom(null)}>
                <CloseIcon />
              </IconButton>
            </Box>

            {/* 메시지 영역 */}
            <Box sx={{ 
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              width: '100%'
            }}>
              <Box 
                sx={{ 
                  flex: 1,
                  overflowY: 'auto', 
                  p: { xs: 1, md: 2 },
                  minHeight: 0,
                  maxHeight: isMobile 
                    ? keyboardVisible 
                      ? 'calc(100vh - 200px)' 
                      : 'calc(100vh - 300px)'
                    : 'calc(100vh - 400px)'
                }}
              >
                {messages.map((msg, index) => {
                  const isMe = msg.userId === currentUser?.uid;
                  const canModify = canEditOrDelete(msg);
                  // 날짜 구분선 추가 (카카오톡 스타일)
                  const currentDate = msg.timestamp?.toDate?.() || new Date();
                  const prevDate = index > 0 ? messages[index - 1].timestamp?.toDate?.() || new Date() : null;
                  const showDateDivider = !prevDate || 
                    currentDate.getDate() !== prevDate.getDate() ||
                    currentDate.getMonth() !== prevDate.getMonth() ||
                    currentDate.getFullYear() !== prevDate.getFullYear();
                  return (
                    <Box key={msg.id}>
                      {showDateDivider && (
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'center', 
                          my: 2,
                          px: 1
                        }}>
                          <Box sx={{
                            bgcolor: 'rgba(0,0,0,0.1)',
                            color: 'text.secondary',
                            px: 2,
                            py: 0.5,
                            borderRadius: 2,
                            fontSize: '0.75rem',
                            fontWeight: 500
                          }}>
                            {new Intl.DateTimeFormat('ko-KR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              weekday: 'long'
                            }).format(currentDate)}
                          </Box>
                        </Box>
                      )}
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', mb: 1.5 }}>
                        {/* 이름(닉네임) 표시 */}
                        <Typography sx={{ color: '#1976d2', fontSize: 14, fontWeight: 900, mb: 0.5 }}>
                          {msg.userName || '익명'}
                        </Typography>
                        {/* 메시지 버블과 시간/버튼을 감싸는 컨테이너 */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                          {/* 메시지 버블 */}
                          <Box sx={{
                            bgcolor: isMe ? '#FFF9C4' : '#222',
                            color: isMe ? '#222' : '#fff',
                            borderRadius: 3,
                            px: 2, py: 1,
                            maxWidth: '400px', // PC에서는 최대 너비 제한
                            fontSize: 14,
                            position: 'relative',
                            boxShadow: isMe ? 3 : 1,
                            fontFamily: 'NanumGothic, Malgun Gothic, Apple SD Gothic Neo, sans-serif',
                            display: 'inline-block', // 내용에 맞게 크기 조정
                            wordWrap: 'break-word',
                            whiteSpace: 'pre-wrap'
                          }}>
                            {editingMessage && editingMessage.id === msg.id ? (
                              <TextField
                                fullWidth
                                value={editingMessage.text}
                                onChange={(e) => setEditingMessage({ ...editingMessage, text: e.target.value })}
                                variant="standard"
                                size="small"
                              />
                            ) : (
                              <>
                                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', lineHeight: 1.4 }}>{msg.text}</Typography>
                                {msg.attachment && (
                                  <Box mt={1}>
                                    {msg.attachment.type.startsWith('image/') ? (
                                      <Box sx={{ position: 'relative', display: 'inline-block', borderRadius: 2, overflow: 'hidden', boxShadow: 1 }}>
                                        <a href={msg.attachment.url} target="_blank" rel="noopener noreferrer">
                                          <img 
                                            src={msg.attachment.url} 
                                            alt={msg.attachment.name} 
                                            style={{ maxWidth: '180px', maxHeight: '180px', borderRadius: '8px', cursor: 'pointer', display: 'block' }} 
                                          />
                                        </a>
                                      </Box>
                                    ) : (
                                      <Button 
                                        variant="outlined" 
                                        startIcon={<DescriptionIcon />} 
                                        href={msg.attachment.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        sx={{ textTransform: 'none', fontSize: '0.7rem', borderRadius: 2 }}
                                        size="small"
                                      >
                                        {msg.attachment.name}
                                      </Button>
                                    )}
                                  </Box>
                                )}
                              </>
                            )}
                          </Box>
                          {/* 시간, 수정/삭제 버튼 - 박스 밖에 배치 */}
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: isMe ? 'flex-end' : 'flex-start', 
                            mt: 0.5,
                            gap: 0.5
                          }}>
                            <Typography sx={{ color: '#aaa', fontSize: 10 }}>
                              {formatTime(msg.timestamp)}
                            </Typography>
                            {isMe && !editingMessage && (
                              <>
                                <IconButton size="small" onClick={() => setEditingMessage(msg)} sx={{ p: 0.5 }}>
                                  <EditIcon sx={{ fontSize: 14, color: '#666' }}/>
                                </IconButton>
                                <IconButton size="small" onClick={() => { if(window.confirm('이 메시지를 삭제하시겠습니까?')) handleDeleteMessage(msg.id); }} sx={{ p: 0.5 }}>
                                  <DeleteIcon sx={{ fontSize: 14, color: '#666' }}/>
                                </IconButton>
                              </>
                            )}
                            {isMe && editingMessage && editingMessage.id === msg.id && (
                              <>
                                <IconButton size="small" onClick={handleUpdateMessage} sx={{ p: 0.5 }}>
                                  <SaveIcon sx={{ fontSize: 14, color: '#666' }}/>
                                </IconButton>
                                <IconButton size="small" onClick={() => setEditingMessage(null)} sx={{ p: 0.5 }}>
                                  <CancelIcon sx={{ fontSize: 14, color: '#666' }}/>
                                </IconButton>
                              </>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  );
                })}
                <div ref={messagesEndRef} />
              </Box>

              {/* 입력칸 */}
              <Box sx={{ 
                p: { xs: 1, md: 2 }, 
                borderTop: 1, 
                borderColor: 'divider',
                bgcolor: 'background.paper',
                width: '100%',
                position: 'sticky',
                bottom: 0,
                mt: 'auto',
                pt: 3
              }}>
                {/* 첨부파일 미리보기 (카카오톡 스타일) */}
                {fileToUpload && (
                  <Box sx={{ 
                    mb: 1, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    p: 1.5,
                    bgcolor: 'grey.50',
                    borderRadius: 2,
                    border: 1,
                    borderColor: 'grey.200',
                    position: 'relative'
                  }}>
                    {fileToUpload.type.startsWith('image/') ? (
                      <Box sx={{ position: 'relative' }}>
                        <img
                          src={URL.createObjectURL(fileToUpload)}
                          alt={fileToUpload.name}
                          style={{ 
                            width: 60, 
                            height: 60, 
                            objectFit: 'cover', 
                            borderRadius: 8,
                            border: '2px solid #e0e0e0'
                          }}
                        />
                        <Box sx={{
                          position: 'absolute',
                          top: -4,
                          right: -4,
                          bgcolor: 'rgba(0,0,0,0.7)',
                          borderRadius: '50%',
                          width: 20,
                          height: 20,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}>
                          <CancelIcon 
                            sx={{ 
                              fontSize: 14, 
                              color: 'white' 
                            }} 
                            onClick={() => setFileToUpload(null)}
                          />
                        </Box>
                      </Box>
                    ) : (
                      <Box sx={{ position: 'relative' }}>
                        <Box sx={{
                          width: 60,
                          height: 60,
                          bgcolor: 'grey.200',
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '2px solid #e0e0e0'
                        }}>
                          <DescriptionIcon sx={{ fontSize: 32, color: 'grey.500' }} />
                        </Box>
                        <Box sx={{
                          position: 'absolute',
                          top: -4,
                          right: -4,
                          bgcolor: 'rgba(0,0,0,0.7)',
                          borderRadius: '50%',
                          width: 20,
                          height: 20,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}>
                          <CancelIcon 
                            sx={{ 
                              fontSize: 14, 
                              color: 'white' 
                            }} 
                            onClick={() => setFileToUpload(null)}
                          />
                        </Box>
                      </Box>
                    )}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: 'bold',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: '0.9rem'
                        }}
                      >
                        {fileToUpload.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        {(fileToUpload.size / 1024 / 1024).toFixed(2)} MB
                      </Typography>
                    </Box>
                    {uploading && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={16} />
                        <Typography variant="caption" color="primary" sx={{ fontSize: '0.75rem' }}>
                          {Math.round(uploadProgress)}%
                        </Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={handleUploadCancel}
                          startIcon={<CancelIcon />}
                          sx={{ fontSize: '0.7rem', height: 28 }}
                        >
                          취소
                        </Button>
                      </Box>
                    )}
                  </Box>
                )}
                
                <Box sx={{ 
                  display: 'flex', 
                  gap: 1,
                  alignItems: 'flex-end',
                  width: '100%'
                }}>
                  <TextField
                    fullWidth
                    multiline
                    maxRows={4}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={canWriteRoom(selectedRoom) ? "메시지를 입력하세요..." : "읽기 전용 채팅방입니다"}
                    variant="outlined"
                    size="small"
                    disabled={!canWriteRoom(selectedRoom)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2
                      }
                    }}
                  />
                  <IconButton
                    component="label"
                    sx={{ ml: 0, height: 48 }}
                    disabled={uploading || !canWriteRoom(selectedRoom)}
                  >
                    <AttachFileIcon />
                    <input type="file" hidden onChange={handleFileSelect} />
                  </IconButton>
                  <IconButton
                    onClick={handleSendMessage}
                    disabled={(!newMessage.trim() && !fileToUpload) || uploading || !canWriteRoom(selectedRoom)}
                    color="primary"
                    sx={{ 
                      bgcolor: 'primary.main',
                      color: 'white',
                      '&:hover': {
                        bgcolor: 'primary.dark'
                      },
                      '&.Mui-disabled': {
                        bgcolor: 'grey.300',
                        color: 'grey.500'
                      }
                    }}
                  >
                    <SendIcon />
                  </IconButton>
                </Box>
              </Box>
            </Box>
          </Box>
        )}
      </Box>
      
      <Dialog open={isCreateRoomOpen} onClose={() => setIsCreateRoomOpen(false)} maxWidth="sm" fullWidth disableRestoreFocus={false} disableEnforceFocus={false} hideBackdrop={false}>
        <DialogTitle>새 대화방 만들기</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>현장 선택</InputLabel>
             <Select
              value={newRoomData.siteId}
              onChange={(e) => {
                const siteId = e.target.value;
                setNewRoomData({ ...newRoomData, siteId });
              }}
              label="현장 선택"
            >
              {sites.map(site => <MenuItem key={site.id} value={site.id}>{site.name}</MenuItem>)}
            </Select>
          </FormControl>
           <FormControlLabel
            control={
              <Checkbox
                checked={!!newRoomData.password}
                onChange={(e) => setNewRoomData({ ...newRoomData, password: e.target.checked ? 'private' : '' })}
              />
            }
            label="비밀번호 설정 (잠금)"
            sx={{ mt: 2, display: 'block' }}
          />
          
          {/* 권한 설정 섹션 */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              기본 권한 설정
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              채팅방 생성 후 사용자별 권한을 추가로 설정할 수 있습니다.
            </Typography>
            
            {/* 권한 타입별 설정 */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                권한별 접근 설정
              </Typography>
              {permissionTypes.map((permission) => (
                <Box key={permission.value} sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <Chip 
                      label={permission.label} 
                      size="small" 
                      color={permission.color} 
                      variant="outlined"
                      sx={{ mr: 1 }}
                    />
                  </Typography>
                  <FormControl component="fieldset" size="small">
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={newRoomData.permissions[`${permission.value}Read`] !== false}
                          onChange={(e) => setNewRoomData({
                            ...newRoomData,
                            permissions: {
                              ...newRoomData.permissions,
                              [`${permission.value}Read`]: e.target.checked
                            }
                          })}
                        />
                      }
                      label="읽기 허용"
                      sx={{ mr: 2 }}
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={newRoomData.permissions[`${permission.value}Write`] !== false}
                          onChange={(e) => setNewRoomData({
                            ...newRoomData,
                            permissions: {
                              ...newRoomData.permissions,
                              [`${permission.value}Write`]: e.target.checked
                            }
                          })}
                        />
                      }
                      label="쓰기 허용"
                    />
                  </FormControl>
                </Box>
              ))}
            </Box>
            
            <FormControl component="fieldset">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={newRoomData.permissions.publicRead !== false}
                    onChange={(e) => setNewRoomData({
                      ...newRoomData,
                      permissions: {
                        ...newRoomData.permissions,
                        publicRead: e.target.checked
                      }
                    })}
                  />
                }
                label="모든 사용자 읽기 허용"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={newRoomData.permissions.publicWrite !== false}
                    onChange={(e) => setNewRoomData({
                      ...newRoomData,
                      permissions: {
                        ...newRoomData.permissions,
                        publicWrite: e.target.checked
                      }
                    })}
                  />
                }
                label="모든 사용자 쓰기 허용"
              />
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCreateRoomOpen(false)}>취소</Button>
           <Button 
            onClick={handleCreateRoom} 
            variant="contained" 
            disabled={!newRoomData.siteId}
          >
            만들기
          </Button>
        </DialogActions>
      </Dialog>

      {/* 비밀번호 확인 다이얼로그 */}
      <Dialog open={isPasswordDialogOpen} onClose={() => setIsPasswordDialogOpen(false)} maxWidth="sm" fullWidth disableRestoreFocus={false} disableEnforceFocus={false} hideBackdrop={false}>
        <DialogTitle>비밀번호 입력</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            "{selectedRoomForPassword?.name}" 채팅방에 입장하려면 비밀번호를 입력하세요.
          </Typography>
          <TextField
            fullWidth
            label="비밀번호"
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="비밀번호를 입력하세요"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handlePasswordSubmit();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsPasswordDialogOpen(false)}>취소</Button>
          <Button onClick={handlePasswordSubmit} variant="contained">
            입장
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Discussions; 