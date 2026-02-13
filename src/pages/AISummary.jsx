import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
  Paper
} from '@mui/material';
import { AttachFile as AttachFileIcon, Refresh as RefreshIcon, Star as StarIcon, Delete as DeleteIcon, Send as SendIcon, Search as SearchIcon, Settings as SettingsIcon, Add as AddIcon, Edit as EditIcon, NavigateBefore as NavigateBeforeIcon, NavigateNext as NavigateNextIcon, ArrowUpward as ArrowUpwardIcon, ArrowDownward as ArrowDownwardIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import MobileSidebar from '../components/MobileSidebar';
import { fetchMailSummaries } from '../api/aiSummary';
import { TextField, InputAdornment } from '@mui/material';

const normalizeMailItem = (item = {}) => {
  const attachments = item.attachments || item.files || item.file_list || [];
  const normalizedAttachments = Array.isArray(attachments)
    ? attachments.map((file) => {
      if (typeof file === 'string') {
        return { name: file };
      }
      return {
        name: file.name || file.fileName || file.filename || '첨부파일',
        type: file.type || file.mimeType || file.extension || ''
      };
    })
    : [];

  return {
    id: item.id || item.mailId || item.messageId || null,
    subject: item.subject || item.title || '제목 없음',
    senderName: item.sender_name || item.senderName || item.fromName || item.sender || '',
    senderEmail: item.sender_email || item.senderEmail || item.fromEmail || item.from || '',
    companyName: item.company_name || item.companyName || item.company || item.vendor || '',
    receivedAt: item.received_at || item.receivedAt || item.createdAt || item.created_at || null,
    summary: item.summary || item.aiSummary || item.ai_summary || '',
    isImportant: Boolean(
      item.importance === 'high' || 
      (item.isImportant ?? item.important ?? item.is_important) ||
      (item.priority === 'high')
    ),
    attachments: normalizedAttachments
  };
};

const formatDateTime = (value) => {
  if (!value) return '수신 시간 정보 없음';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '수신 시간 정보 없음';
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const AISummary = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const [mails, setMails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedMail, setSelectedMail] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMails, setSelectedMails] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('receivedAt'); // 기본 정렬: 수신 시간
  const [sortDirection, setSortDirection] = useState('desc'); // 기본 정렬 방향: 내림차순
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [excludeKeywords, setExcludeKeywords] = useState(() => {
    // localStorage에서 제외 키워드 로드
    const saved = localStorage.getItem('aiSummary_excludeKeywords');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    // 기본 제외 키워드
    return [
      '친구 추천',
      '단어',
      '광고',
      '건설공제조합',
      '밴드',
      '새로운 사진',
      '댓글',
      '고지서',
      '민원',
      '덤플라워',
      '코레일',
      '카리오프렉틱',
      '카이로프랙틱',
      '보험',
      '납부서',
      '생일',
      '인류애',
      'EXON',
      'ECON',
      '팔로워',
      '뉴스'
    ];
  });
  const [excludeDialogOpen, setExcludeDialogOpen] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');

  const loadMails = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const data = await fetchMailSummaries();
      const list = Array.isArray(data) ? data : [];
      setMails(list.map(normalizeMailItem));
    } catch (error) {
      console.error('메일 요약 로드 실패:', error);
      setErrorMessage(error?.message || '메일 요약 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMails();
  }, []);

  useEffect(() => {
    const handleFocus = () => {
      loadMails();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadMails();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // 제외 키워드 변경 시 localStorage에 저장
  useEffect(() => {
    localStorage.setItem('aiSummary_excludeKeywords', JSON.stringify(excludeKeywords));
  }, [excludeKeywords]);

  const filteredAndSortedMails = useMemo(() => {
    let filtered = [...mails];
    
    // 제외 키워드 필터링
    filtered = filtered.filter(mail => {
      const subject = (mail.subject || '').toLowerCase();
      const summary = (mail.summary || '').toLowerCase();
      const combinedText = `${subject} ${summary}`.toLowerCase();
      
      // 제외 키워드가 포함되어 있으면 제외
      return !excludeKeywords.some(keyword => 
        combinedText.includes(keyword.toLowerCase())
      );
    });
    
    // 검색어로 필터링
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(mail => {
        const subject = (mail.subject || '').toLowerCase();
        const senderName = (mail.senderName || '').toLowerCase();
        const senderEmail = (mail.senderEmail || '').toLowerCase();
        const companyName = (mail.companyName || '').toLowerCase();
        const summary = (mail.summary || '').toLowerCase();
        
        return (
          subject.includes(searchLower) ||
          senderName.includes(searchLower) ||
          senderEmail.includes(searchLower) ||
          companyName.includes(searchLower) ||
          summary.includes(searchLower)
        );
      });
    }
    
    // 정렬
    filtered.sort((a, b) => {
      // 중요 메일 우선 정렬 (항상 적용)
      if (a.isImportant !== b.isImportant) {
        return a.isImportant ? -1 : 1;
      }
      
      // 선택한 필드로 정렬
      let aValue, bValue;
      
      switch (sortField) {
        case 'subject':
          aValue = (a.subject || '').toLowerCase();
          bValue = (b.subject || '').toLowerCase();
          break;
        case 'senderName':
          aValue = (a.senderName || a.senderEmail || '').toLowerCase();
          bValue = (b.senderName || b.senderEmail || '').toLowerCase();
          break;
        case 'senderEmail':
          aValue = (a.senderEmail || '').toLowerCase();
          bValue = (b.senderEmail || '').toLowerCase();
          break;
        case 'receivedAt':
          aValue = a.receivedAt ? new Date(a.receivedAt).getTime() : 0;
          bValue = b.receivedAt ? new Date(b.receivedAt).getTime() : 0;
          break;
        case 'attachments':
          aValue = a.attachments ? a.attachments.length : 0;
          bValue = b.attachments ? b.attachments.length : 0;
          break;
        default:
          aValue = a.receivedAt ? new Date(a.receivedAt).getTime() : 0;
          bValue = b.receivedAt ? new Date(b.receivedAt).getTime() : 0;
      }
      
      // 숫자 비교
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      // 문자열 비교
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    return filtered;
  }, [mails, searchTerm, excludeKeywords, sortField, sortDirection]);

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredAndSortedMails.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMails = filteredAndSortedMails.slice(startIndex, endIndex);

  // 검색어, 필터, 정렬 변경 시 첫 페이지로 이동
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, excludeKeywords, sortField, sortDirection]);

  // 정렬 핸들러
  const handleSort = (field) => {
    if (sortField === field) {
      // 같은 필드 클릭 시 정렬 방향 토글
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // 다른 필드 클릭 시 해당 필드로 정렬 (기본 내림차순)
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // 페이지 변경 함수
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  // 페이지 번호 배열 생성
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  const handleAddExcludeKeyword = () => {
    if (newKeyword.trim() && !excludeKeywords.includes(newKeyword.trim())) {
      setExcludeKeywords([...excludeKeywords, newKeyword.trim()]);
      setNewKeyword('');
    }
  };

  const handleDeleteExcludeKeyword = (keyword) => {
    setExcludeKeywords(excludeKeywords.filter(k => k !== keyword));
  };

  const handleUpdateExcludeKeyword = (oldKeyword, newKeywordValue) => {
    if (newKeywordValue.trim() && !excludeKeywords.includes(newKeywordValue.trim())) {
      setExcludeKeywords(excludeKeywords.map(k => k === oldKeyword ? newKeywordValue.trim() : k));
    }
  };

  const handleOpenSummary = (mail) => {
    setSelectedMail(mail);
    setDialogOpen(true);
  };

  const handleCloseSummary = () => {
    setDialogOpen(false);
    setSelectedMail(null);
  };

  const handleToggleSelect = (mailId) => {
    setSelectedMails(prev => {
      const newSet = new Set(prev);
      if (newSet.has(mailId)) {
        newSet.delete(mailId);
      } else {
        newSet.add(mailId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const currentPageMailIds = paginatedMails.map(mail => mail.id);
    const allSelected = currentPageMailIds.every(id => selectedMails.has(id));
    
    if (allSelected) {
      // 현재 페이지의 모든 항목 선택 해제
      setSelectedMails(prev => {
        const newSet = new Set(prev);
        currentPageMailIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    } else {
      // 현재 페이지의 모든 항목 선택
      setSelectedMails(prev => {
        const newSet = new Set(prev);
        currentPageMailIds.forEach(id => newSet.add(id));
        return newSet;
      });
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedMails.size === 0) return;
    
    if (!window.confirm(`선택한 ${selectedMails.size}개의 메일을 삭제하시겠습니까?`)) {
      return;
    }

    // TODO: API에 삭제 요청 추가
    setMails(prev => prev.filter(mail => !selectedMails.has(mail.id)));
    setSelectedMails(new Set());
  };

  const handleApplyToEstimates = () => {
    if (selectedMails.size === 0) {
      alert('견적 페이지에 적용할 메일을 선택해주세요.');
      return;
    }

    const selectedMailData = filteredAndSortedMails.filter(mail => selectedMails.has(mail.id));
    
    // 견적 페이지로 이동하면서 데이터 전달
    navigate('/estimates', {
      state: {
        mailData: selectedMailData,
        fromAISummary: true
      }
    });
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pt: '30px' }}>
      <MobileSidebar />
      <Container
        maxWidth={false}
        sx={{
          pt: 2,
          pb: 4,
          px: 1,
          ml: 0,
          mr: 0,
          maxWidth: '100%'
        }}
      >
        <Box
          sx={{
            p: isMobile ? 2 : 3,
            borderRadius: 2,
            boxShadow: 3,
            bgcolor: 'background.paper'
          }}
        >
          <Box
            sx={{
              mb: 3,
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              justifyContent: 'space-between',
              alignItems: isMobile ? 'flex-start' : 'center',
              gap: 2
            }}
          >
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                AI 메일 요약
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                수신 메일 {mails.length}건
                {searchTerm && ` (검색 결과: ${filteredAndSortedMails.length}건)`}
                {filteredAndSortedMails.length > 0 && ` - ${startIndex + 1}-${Math.min(endIndex, filteredAndSortedMails.length)} / ${filteredAndSortedMails.length}`}
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadMails}
              disabled={loading}
              sx={{ alignSelf: isMobile ? 'stretch' : 'auto' }}
            >
              새로고침
            </Button>
          </Box>

          <Box sx={{ mb: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              placeholder="제목, 보낸 사람, 메일 주소, 회사명, 내용으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                flex: 8,
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'background.default',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                  '&.Mui-focused fieldset': { borderColor: 'primary.main' }
                },
                '& .MuiInputBase-input': { color: 'text.primary' }
              }}
            />
            <Button
              variant="outlined"
              startIcon={<SettingsIcon />}
              onClick={() => setExcludeDialogOpen(true)}
              sx={{ whiteSpace: 'nowrap', flex: 2 }}
            >
              제외단어 목록 ({excludeKeywords.length})
            </Button>
          </Box>

          {errorMessage && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {errorMessage}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
              <CircularProgress />
            </Box>
          ) : paginatedMails.length === 0 ? (
            <Box
              sx={{
                textAlign: 'center',
                py: 10,
                borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.04)'
              }}
            >
              <Typography variant="h6" sx={{ mb: 1 }}>
                {searchTerm ? '검색 결과가 없습니다.' : '표시할 메일이 없습니다.'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {searchTerm ? '다른 검색어로 시도해보세요.' : 'NAS API에서 요약 데이터를 확인해주세요.'}
              </Typography>
            </Box>
          ) : (
            <Box>
              <Box sx={{ mb: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
                <Checkbox
                  checked={paginatedMails.length > 0 && paginatedMails.every(mail => selectedMails.has(mail.id))}
                  indeterminate={paginatedMails.some(mail => selectedMails.has(mail.id)) && !paginatedMails.every(mail => selectedMails.has(mail.id))}
                  onChange={handleSelectAll}
                  sx={{ color: 'text.secondary' }}
                />
                <Typography variant="body2" sx={{ color: 'text.secondary', mr: 'auto' }}>
                  현재 페이지 선택 ({selectedMails.size}개 선택됨)
                </Typography>
                {selectedMails.size > 0 && (
                  <>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<DeleteIcon />}
                      onClick={handleDeleteSelected}
                    >
                      삭제 ({selectedMails.size})
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      startIcon={<SendIcon />}
                      onClick={handleApplyToEstimates}
                    >
                      견적 페이지에 적용 ({selectedMails.size})
                    </Button>
                  </>
                )}
              </Box>
              <TableContainer 
                component={Paper} 
                sx={{ 
                  overflow: 'auto',
                  bgcolor: 'background.paper',
                  '& .MuiTable-root': { bgcolor: 'transparent' },
                  '&::-webkit-scrollbar': {
                    display: 'none'
                  },
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
                style={{ height: '600px', maxHeight: '600px', minHeight: '600px' }}
              >
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox" sx={{ bgcolor: 'background.paper', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
                        <Checkbox
                          checked={paginatedMails.length > 0 && paginatedMails.every(mail => selectedMails.has(mail.id))}
                          indeterminate={paginatedMails.some(mail => selectedMails.has(mail.id)) && !paginatedMails.every(mail => selectedMails.has(mail.id))}
                          onChange={handleSelectAll}
                        />
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          bgcolor: 'background.paper', 
                          borderBottom: '1px solid rgba(255,255,255,0.12)', 
                          color: 'text.primary', 
                          fontWeight: 600,
                          cursor: 'pointer',
                          userSelect: 'none',
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' }
                        }}
                        onClick={() => handleSort('subject')}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          제목
                          {sortField === 'subject' && (
                            sortDirection === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 16 }} /> : <ArrowDownwardIcon sx={{ fontSize: 16 }} />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          bgcolor: 'background.paper', 
                          borderBottom: '1px solid rgba(255,255,255,0.12)', 
                          color: 'text.primary', 
                          fontWeight: 600,
                          cursor: 'pointer',
                          userSelect: 'none',
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' }
                        }}
                        onClick={() => handleSort('senderName')}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          보낸 사람
                          {sortField === 'senderName' && (
                            sortDirection === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 16 }} /> : <ArrowDownwardIcon sx={{ fontSize: 16 }} />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          bgcolor: 'background.paper', 
                          borderBottom: '1px solid rgba(255,255,255,0.12)', 
                          color: 'text.primary', 
                          fontWeight: 600,
                          cursor: 'pointer',
                          userSelect: 'none',
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' }
                        }}
                        onClick={() => handleSort('receivedAt')}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          수신 시간
                          {sortField === 'receivedAt' && (
                            sortDirection === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 16 }} /> : <ArrowDownwardIcon sx={{ fontSize: 16 }} />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          bgcolor: 'background.paper', 
                          borderBottom: '1px solid rgba(255,255,255,0.12)', 
                          color: 'text.primary', 
                          fontWeight: 600,
                          cursor: 'pointer',
                          userSelect: 'none',
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' }
                        }}
                        align="center"
                        onClick={() => handleSort('attachments')}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                          첨부
                          {sortField === 'attachments' && (
                            sortDirection === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 16 }} /> : <ArrowDownwardIcon sx={{ fontSize: 16 }} />
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedMails.map((mail, index) => (
                      <TableRow
                        key={mail.id || `${mail.senderEmail}-${mail.receivedAt}-${index}`}
                        hover
                        onClick={() => handleOpenSummary(mail)}
                        sx={{
                          cursor: 'pointer',
                          bgcolor: mail.isImportant ? 'rgba(244,67,54,0.08)' : 'transparent',
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
                          borderLeft: mail.isImportant ? '3px solid rgba(244,67,54,0.6)' : 'none'
                        }}
                      >
                        <TableCell 
                          padding="checkbox"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={selectedMails.has(mail.id)}
                            onChange={() => handleToggleSelect(mail.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                        <TableCell sx={{ color: 'text.primary', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {mail.isImportant && <StarIcon sx={{ color: 'error.main', fontSize: 16 }} />}
                            <Typography variant="body2" noWrap>
                              {mail.subject}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <Typography variant="body2" noWrap title={`${mail.senderName || '보낸 사람 미상'}${mail.senderEmail ? ` <${mail.senderEmail}>` : ''}${mail.companyName ? ` (${mail.companyName})` : ''}`}>
                            {mail.senderName || '보낸 사람 미상'}
                            {mail.senderEmail && ` <${mail.senderEmail}>`}
                            {mail.companyName && ` (${mail.companyName})`}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                          {formatDateTime(mail.receivedAt)}
                        </TableCell>
                        <TableCell align="center" sx={{ color: 'text.secondary' }}>
                          {mail.attachments.length > 0 && (
                            <Chip
                              icon={<AttachFileIcon sx={{ fontSize: 14 }} />}
                              label={mail.attachments.length}
                              size="small"
                              sx={{ height: 24, fontSize: '0.7rem' }}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  mt: 2, 
                  pt: 2,
                  borderTop: '1px solid rgba(255,255,255,0.12)'
                }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {startIndex + 1}-{Math.min(endIndex, filteredAndSortedMails.length)} / {filteredAndSortedMails.length}개
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {/* 첫 페이지 버튼 */}
                    <IconButton
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage === 1}
                      size="small"
                      sx={{ color: 'text.secondary' }}
                    >
                      <NavigateBeforeIcon />
                      <NavigateBeforeIcon sx={{ ml: -1 }} />
                    </IconButton>
                    
                    {/* 이전 페이지 버튼 */}
                    <IconButton
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      size="small"
                      sx={{ color: 'text.secondary' }}
                    >
                      <NavigateBeforeIcon />
                    </IconButton>
                    
                    {/* 페이지 번호들 */}
                    {getPageNumbers().map((pageNum) => (
                      <Button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        variant={currentPage === pageNum ? 'contained' : 'outlined'}
                        size="small"
                        sx={{
                          minWidth: 36,
                          height: 36,
                          color: currentPage === pageNum ? '#fff' : 'text.secondary',
                          bgcolor: currentPage === pageNum ? 'primary.main' : 'transparent',
                          '&:hover': {
                            bgcolor: currentPage === pageNum ? 'primary.dark' : 'rgba(255,255,255,0.08)'
                          }
                        }}
                      >
                        {pageNum}
                      </Button>
                    ))}
                    
                    {/* 다음 페이지 버튼 */}
                    <IconButton
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      size="small"
                      sx={{ color: 'text.secondary' }}
                    >
                      <NavigateNextIcon />
                    </IconButton>
                    
                    {/* 마지막 페이지 버튼 */}
                    <IconButton
                      onClick={() => handlePageChange(totalPages)}
                      disabled={currentPage === totalPages}
                      size="small"
                      sx={{ color: 'text.secondary' }}
                    >
                      <NavigateNextIcon />
                      <NavigateNextIcon sx={{ ml: -1 }} />
                    </IconButton>
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Container>

      <Dialog open={dialogOpen} onClose={handleCloseSummary} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          {selectedMail?.subject || '메일 요약'}
        </DialogTitle>
        <DialogContent dividers>
          {selectedMail && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {selectedMail.senderName || '보낸 사람 미상'}
                  {selectedMail.senderEmail ? ` · ${selectedMail.senderEmail}` : ''}
                  {selectedMail.companyName ? ` · ${selectedMail.companyName}` : ''}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {formatDateTime(selectedMail.receivedAt)}
                </Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  AI 요약
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                  {selectedMail.summary || '요약 데이터가 없습니다.'}
                </Typography>
              </Box>

              {selectedMail.attachments.length > 0 && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      첨부파일
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {selectedMail.attachments.map((file, idx) => (
                        <Chip
                          key={`${file.name}-${idx}`}
                          label={file.type ? `${file.name} (${file.type})` : file.name}
                          size="small"
                          sx={{ mb: 1 }}
                        />
                      ))}
                    </Stack>
                  </Box>
                </>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSummary}>닫기</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={excludeDialogOpen} onClose={() => setExcludeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          제외 단어 목록 관리
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                placeholder="새 제외 단어 입력..."
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddExcludeKeyword();
                  }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                    '&.Mui-focused fieldset': { borderColor: 'primary.main' }
                  },
                  '& .MuiInputBase-input': { color: 'text.primary' }
                }}
              />
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddExcludeKeyword}
                disabled={!newKeyword.trim() || excludeKeywords.includes(newKeyword.trim())}
              >
                추가
              </Button>
            </Box>
            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              {excludeKeywords.length === 0 ? (
                <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 2 }}>
                  제외 단어가 없습니다.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {excludeKeywords.map((keyword, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        p: 1,
                        borderRadius: 1,
                        bgcolor: 'rgba(255,255,255,0.05)',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' }
                      }}
                    >
                      <Chip
                        label={keyword}
                        sx={{ flex: 1, justifyContent: 'flex-start' }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => {
                          const newValue = prompt('수정할 단어를 입력하세요:', keyword);
                          if (newValue !== null) {
                            handleUpdateExcludeKeyword(keyword, newValue);
                          }
                        }}
                        sx={{ color: 'primary.main' }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteExcludeKeyword(keyword)}
                        sx={{ color: 'error.main' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExcludeDialogOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AISummary;
