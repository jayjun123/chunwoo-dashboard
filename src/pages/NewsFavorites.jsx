import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Grid,
  Fade,
  Alert,
  Snackbar,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Bookmark as BookmarkIcon,
  BookmarkBorder as BookmarkBorderIcon,
  OpenInNew as OpenInNewIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import useMediaQuery from '@mui/material/useMediaQuery';

const NewsFavorites = () => {
  const [favorites, setFavorites] = useState([]);
  const [filteredFavorites, setFilteredFavorites] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [filterCategory, setFilterCategory] = useState('all');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width:600px)');

  // 즐겨찾기 로드
  const loadFavorites = () => {
    try {
  
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('즐겨찾기 로드 실패:', error);
      return [];
    }
  };

  // 즐겨찾기 저장
  const saveFavorites = (favoritesList) => {
    try {

      window.dispatchEvent(new StorageEvent('storage', {
        key: 'news_favorites',
        newValue: JSON.stringify(favoritesList)
      }));
    } catch (error) {
      console.error('즐겨찾기 저장 실패:', error);
    }
  };

  // 즐겨찾기 제거
  const removeFavorite = (itemToRemove) => {
    const newFavorites = favorites.filter(item => item.link !== itemToRemove.link);
    setFavorites(newFavorites);
    saveFavorites(newFavorites);
    setSnackbar({ open: true, message: '즐겨찾기에서 제거되었습니다.', severity: 'info' });
  };

  // 즐겨찾기 전체 삭제
  const clearAllFavorites = () => {
    setFavorites([]);
    saveFavorites([]);
    setSnackbar({ open: true, message: '모든 즐겨찾기가 삭제되었습니다.', severity: 'warning' });
  };

  // 카테고리 분류
  const getCategory = (item) => {
    const title = item.title.toLowerCase();
    const description = (item.description || '').toLowerCase();
    const content = title + ' ' + description;
    
    if (content.includes('대구') || content.includes('경북')) {
      return '지역';
    } else if (content.includes('건설')) {
      return '건설';
    } else if (content.includes('유리공사')) {
      return '유리공사';
    }
    return '기타';
  };

  // 필터링 및 정렬
  useEffect(() => {
    let filtered = favorites;

    // 검색 필터
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // 카테고리 필터
    if (filterCategory !== 'all') {
      filtered = filtered.filter(item => getCategory(item) === filterCategory);
    }

    // 정렬
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.pubDate) - new Date(a.pubDate);
        case 'title':
          return a.title.localeCompare(b.title);
        case 'category':
          return getCategory(a).localeCompare(getCategory(b));
        default:
          return 0;
      }
    });

    setFilteredFavorites(filtered);
  }, [favorites, searchTerm, sortBy, filterCategory]);

  // 초기 로드
  useEffect(() => {
    setFavorites(loadFavorites());
  }, []);

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + F: 검색창 포커스
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder="뉴스 검색... (Ctrl+F)"]');
        if (searchInput) {
          searchInput.focus();
        }
      }
      // Escape: 검색어 초기화
      if (e.key === 'Escape') {
        setSearchTerm('');
        setFilterCategory('all');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const categories = ['all', '지역', '건설', '유리공사', '기타'];

  return (
    <Box sx={{ 
      p: 3, 
      pt: { xs: 1, md: 3 },
              mt: isMobile ? '0px' : '90px',
      minHeight: '100vh', 
      color: { xs: '#fff', md: '#333' }
    }}>
      {/* 헤더 */}
      <Box sx={{ mb: 3, mt: { xs: 0, md: 0 }, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1, color: { xs: '#fff', md: '#333' } }}>
            뉴스 즐겨찾기
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Typography variant="body1" sx={{ opacity: 0.8, color: { xs: '#fff', md: '#666' } }}>
              저장 뉴스 {favorites.length}개
            </Typography>
            {favorites.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                {categories.slice(1).map(cat => {
                  const count = favorites.filter(item => getCategory(item) === cat).length;
                  return count > 0 ? (
                    <Chip 
                      key={cat}
                      label={`${cat} ${count}개`}
                      size="small"
                      sx={{ 
                        bgcolor: cat === '지역' ? '#4caf50' : 
                                cat === '건설' ? '#2196f3' : 
                                cat === '유리공사' ? '#ff9800' : '#9e9e9e',
                        color: '#fff',
                        fontSize: '0.7rem'
                      }} 
                    />
                  ) : null;
                })}
              </Box>
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/')}
            sx={{ 
              color: { xs: '#fff', md: '#333' }, 
              borderColor: { xs: '#fff', md: '#333' },
              '&:hover': {
                borderColor: { xs: '#fff', md: '#333' },
                backgroundColor: { xs: 'rgba(255,255,255,0.1)', md: 'transparent' }
              }
            }}
          >
            메인화면
          </Button>
          {favorites.length > 0 && (
            <Button
              variant="outlined"
              color="error"
              onClick={() => setDeleteDialog({ open: true, item: null })}
              sx={{ 
                borderColor: '#ff6b6b',
                display: { xs: 'none', sm: 'inline-flex' } // 모바일에서 숨김
              }}
            >
              전체 삭제
            </Button>
          )}
        </Box>
      </Box>

      {/* 검색 및 필터 */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={8} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="뉴스 검색... (Ctrl+F)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: { xs: '#fff', md: '#666' }, mr: 1 }} />,
                endAdornment: searchTerm && (
                  <IconButton size="small" onClick={() => setSearchTerm('')}>
                    <ClearIcon sx={{ color: { xs: '#fff', md: '#666' } }} />
                  </IconButton>
                )
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: { xs: '#fff', md: '#333' },
                  '& fieldset': { 
                    borderColor: { xs: 'rgba(255,255,255,0.3)', md: 'rgba(0,0,0,0.3)' } 
                  },
                  '&:hover fieldset': { 
                    borderColor: { xs: 'rgba(255,255,255,0.5)', md: 'rgba(0,0,0,0.5)' } 
                  },
                  '&.Mui-focused fieldset': { 
                    borderColor: { xs: '#fff', md: '#333' } 
                  }
                },
                '& .MuiInputBase-input::placeholder': {
                  color: { xs: 'rgba(255,255,255,0.7)', md: 'rgba(0,0,0,0.7)' }
                }
              }}
            />
          </Grid>
          <Grid container spacing={2}>
            <Grid>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: { xs: '#fff', md: '#666' } }}>카테고리</InputLabel>
                <Select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  label="카테고리"
                  sx={{
                    color: { xs: '#fff', md: '#333' },
                    '& .MuiOutlinedInput-notchedOutline': { 
                      borderColor: { xs: 'rgba(255,255,255,0.3)', md: 'rgba(0,0,0,0.3)' } 
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': { 
                      borderColor: { xs: 'rgba(255,255,255,0.5)', md: 'rgba(0,0,0,0.5)' } 
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { 
                      borderColor: { xs: '#fff', md: '#333' } 
                    }
                  }}
                >
                  {categories.map(cat => (
                    <MenuItem key={cat} value={cat}>
                      {cat === 'all' ? '전체' : cat}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: { xs: '#fff', md: '#666' } }}>정렬</InputLabel>
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  label="정렬"
                  sx={{
                    color: { xs: '#fff', md: '#333' },
                    '& .MuiOutlinedInput-notchedOutline': { 
                      borderColor: { xs: 'rgba(255,255,255,0.3)', md: 'rgba(0,0,0,0.3)' } 
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': { 
                      borderColor: { xs: 'rgba(255,255,255,0.5)', md: 'rgba(0,0,0,0.5)' } 
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { 
                      borderColor: { xs: '#fff', md: '#333' } 
                    }
                  }}
                >
                  <MenuItem value="date">날짜순</MenuItem>
                  <MenuItem value="title">제목순</MenuItem>
                  <MenuItem value="category">카테고리순</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid>
              <Typography variant="body2" sx={{ 
                textAlign: 'center', 
                opacity: 0.8,
                color: { xs: '#fff', md: '#333' },
                display: { xs: 'none', md: 'block' } // 모바일에서 숨김
              }}>
                {filteredFavorites.length}개 표시
              </Typography>
            </Grid>
          </Grid>
        </Grid>
      </Box>

      {/* 즐겨찾기 목록 */}
      {filteredFavorites.length === 0 ? (
        <Box sx={{ 
          textAlign: 'center', 
          py: 8,
          background: { xs: 'rgba(255,255,255,0.1)', md: 'rgba(0,0,0,0.05)' },
          borderRadius: 2
        }}>
          <BookmarkBorderIcon sx={{ fontSize: 64, opacity: 0.5, mb: 2, color: { xs: '#fff', md: '#666' } }} />
          <Typography variant="h6" sx={{ mb: 1, color: { xs: '#fff', md: '#333' } }}>
            {searchTerm || filterCategory !== 'all' ? '검색 결과가 없습니다' : '저장된 즐겨찾기가 없습니다'}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.7, mb: 2, color: { xs: '#fff', md: '#666' } }}>
            {searchTerm || filterCategory !== 'all' 
              ? '다른 검색어나 필터를 시도해보세요' 
              : '대시보드에서 관심 있는 뉴스에 즐겨찾기를 추가해보세요'
            }
          </Typography>
          {!searchTerm && filterCategory === 'all' && (
            <Button
              variant="outlined"
              onClick={() => navigate('/')}
              sx={{ 
                color: { xs: '#fff', md: '#333' }, 
                borderColor: { xs: '#fff', md: '#333' },
                '&:hover': { 
                  borderColor: { xs: '#FFD600', md: '#333' }, 
                  color: { xs: '#FFD600', md: '#333' } 
                }
              }}
            >
              메인화면으로 이동
            </Button>
          )}
        </Box>
      ) : (
        <Grid container spacing={2}>
          {filteredFavorites.map((item, index) => (
            <Grid key={item.link}>
              <Fade in={true} timeout={300 + index * 100}>
                <Card sx={{ 
                  bgcolor: { xs: 'rgba(255,255,255,0.1)', md: 'rgba(255,255,255,0.05)' }, 
                  backdropFilter: 'blur(10px)',
                  border: { xs: '1px solid rgba(255,255,255,0.2)', md: '1px solid rgba(0,0,0,0.1)' },
                  transition: 'all 0.3s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: { xs: '0 8px 25px rgba(0,0,0,0.3)', md: '0 8px 25px rgba(0,0,0,0.1)' },
                    borderColor: { xs: 'rgba(255,255,255,0.4)', md: 'rgba(0,0,0,0.2)' }
                  }
                }}>
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Chip 
                        label={getCategory(item)} 
                        size="small" 
                        sx={{ 
                          bgcolor: getCategory(item) === '지역' ? '#4caf50' : 
                                  getCategory(item) === '건설' ? '#2196f3' : 
                                  getCategory(item) === '유리공사' ? '#ff9800' : '#9e9e9e',
                          color: '#fff',
                          fontSize: '0.7rem'
                        }} 
                      />
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="새 창에서 열기" arrow>
                          <IconButton
                            size="small"
                            component="a"
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ color: { xs: '#fff', md: '#666' }, p: 0.5 }}
                          >
                            <OpenInNewIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="즐겨찾기 제거" arrow>
                          <IconButton
                            size="small"
                            onClick={() => setDeleteDialog({ open: true, item })}
                            sx={{ color: '#ff6b6b', p: 0.5 }}
                          >
                            <DeleteIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                    
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        fontWeight: 'bold', 
                        mb: 1, 
                        lineHeight: 1.3,
                        cursor: 'pointer',
                        color: { xs: '#fff', md: '#333' },
                        '&:hover': { color: { xs: '#90caf9', md: '#1976d2' } }
                      }}
                      onClick={() => window.open(item.link, '_blank')}
                    >
                      {item.title.replace(/<[^>]+>/g, '')}
                    </Typography>
                    
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: { xs: 'rgba(255,255,255,0.8)', md: 'rgba(0,0,0,0.7)' }, 
                        mb: 1,
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {item.description.replace(/<[^>]+>/g, '')}
                    </Typography>
                    
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: { xs: 'rgba(255,255,255,0.6)', md: 'rgba(0,0,0,0.5)' },
                        display: 'block'
                      }}
                    >
                      {new Date(item.pubDate).toLocaleString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Typography>
                  </CardContent>
                </Card>
              </Fade>
            </Grid>
          ))}
        </Grid>
      )}

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, item: null })}>
        <DialogTitle>
          {deleteDialog.item ? '즐겨찾기 제거' : '모든 즐겨찾기 삭제'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {deleteDialog.item 
              ? `"${deleteDialog.item.title}"을(를) 즐겨찾기에서 제거하시겠습니까?`
              : '모든 즐겨찾기를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.'
            }
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, item: null })}>
            취소
          </Button>
          <Button 
            onClick={() => {
              if (deleteDialog.item) {
                removeFavorite(deleteDialog.item);
              } else {
                clearAllFavorites();
              }
              setDeleteDialog({ open: false, item: null });
            }} 
            color="error"
            variant="contained"
          >
            {deleteDialog.item ? '제거' : '삭제'}
          </Button>
        </DialogActions>
      </Dialog>

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
    </Box>
  );
};

export default NewsFavorites; 