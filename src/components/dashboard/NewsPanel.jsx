import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Card, CardContent, Link, CircularProgress, Button, IconButton, Tooltip, Fade, Grid, ToggleButton, useMediaQuery } from '@mui/material';
import { Refresh as RefreshIcon, OpenInNew as OpenInNewIcon, Bookmark as BookmarkIcon, BookmarkBorder as BookmarkBorderIcon, List as ListIcon } from '@mui/icons-material';

import { useNavigate } from 'react-router-dom';

const NewsPanel = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width:768px)');

  // 즐겨찾기 로컬스토리지 관리
  const loadFavorites = () => {
    try {
      const saved = localStorage.getItem('news_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('즐겨찾기 로드 실패:', error);
      return [];
    }
  };

  const saveFavorites = (favoritesList) => {
    try {
      localStorage.setItem('news_favorites', JSON.stringify(favoritesList));
      // localStorage 변경 이벤트 발생
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'news_favorites',
        newValue: JSON.stringify(favoritesList)
      }));
    } catch (error) {
      console.error('즐겨찾기 저장 실패:', error);
    }
  };

  const toggleFavorite = (item) => {
    const newFavorites = favorites.some(fav => fav.link === item.link)
      ? favorites.filter(fav => fav.link !== item.link)
      : [...favorites, item];
    setFavorites(newFavorites);
    saveFavorites(newFavorites);
  };

  const isFavorite = (item) => {
    return favorites.some(fav => fav.link === item.link);
  };

  useEffect(() => {
    setFavorites(loadFavorites());
  }, []);

  const fetchAndSaveNews = useCallback(async () => {
    try {
      setRefreshing(true);
      // 뉴스 기능 비활성화
      setNews([]);
      setError('뉴스 기능이 비활성화되었습니다.');
    } catch (err) {
      console.error('뉴스 갱신 실패:', err);
      setError('뉴스 기능이 비활성화되었습니다.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      setError('');
      try {
        // 뉴스 기능 비활성화
        setNews([]);
        setError('뉴스 기능이 비활성화되었습니다.');
      } catch (err) {
        console.error('뉴스 로딩 실패:', err);
        setError('뉴스 기능이 비활성화되었습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
    
    // 1시간마다 뉴스 갱신 (하지만 로컬 스토리지는 하루에 한 번만)
    const interval = setInterval(fetchAndSaveNews, 3600000);
    return () => clearInterval(interval);
  }, [fetchAndSaveNews]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAndSaveNews().finally(() => setRefreshing(false));
  };

  const handleNewsClick = (item) => {
    window.open(item.link, '_blank', 'noopener,noreferrer');
  };

  const handleFavoriteToggle = (item) => {
    if (favorites.some(fav => fav.title === item.title)) {
      setFavorites(favorites.filter(fav => fav.title !== item.title));
    } else {
      setFavorites([...favorites, item]);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
        <Button
          variant="outlined"
          onClick={fetchAndSaveNews}
          disabled={refreshing}
          startIcon={refreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
        >
          다시 시도
        </Button>
      </Box>
    );
  }

  // 표시할 뉴스 데이터 결정
  const displayNews = showFavorites ? favorites : news;
  const leftNews = isMobile ? displayNews : displayNews.slice(0, 5);
  const rightNews = isMobile ? [] : displayNews.slice(5, 10);

  return (
    <Box sx={{
      height: { xs: 'calc(100vh - 60px - 44px)', md: '100%' },
      width: { xs: '100%', md: '1300px' },
      maxWidth: { xs: '100%', md: '1300px' },
      margin: 0,
      marginTop: { xs: '20px', md: '50px' },
      padding: 0,
      overflow: 'auto',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      justifyContent: 'flex-start',
    }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 0.5, 
        width: '100%', 
        px: { xs: 1, md: 2 },
        mt: { xs: '30px', md: 0 } // 모바일에서 30px 아래로 이동
      }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#fff' }}>
          건설NEWS {showFavorites && '(즐겨찾기)'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="새로고침">
            <IconButton 
              onClick={handleRefresh} 
              disabled={refreshing}
              sx={{ color: '#fff' }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="뉴스 즐겨찾기 화면으로 이동">
            <IconButton 
              onClick={() => navigate('/news-favorites')}
              sx={{ color: '#fff' }}
            >
              <BookmarkIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      <Box sx={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        gap: { xs: 1, md: 2 }, 
        width: '100%', 
        height: 'calc(100vh - 80px)',
        overflow: 'hidden',
        px: { xs: 0, md: 0 }
      }}>
        {/* 모바일에서는 단일 컬럼, 데스크톱에서는 왼쪽 컬럼 */}
        <Box sx={{ 
          flex: 1, 
          overflowY: 'auto',
          width: { xs: '100%', md: '650px' },
          minWidth: { xs: '100%', md: '650px' },
          px: { xs: 1, md: 1 }
        }}>
          {leftNews.map((item, index) => (
            <Fade in={true} timeout={500 + index * 100} key={item.id || index}>
              <Card 
                sx={{ 
                  mb: 1, 
                  cursor: 'pointer',
                  '&:hover': { 
                    transform: 'translateY(-2px)', 
                    boxShadow: 3,
                    transition: 'all 0.3s ease'
                  }
                }}
                onClick={() => handleNewsClick(item)}
              >
                <CardContent sx={{ p: { xs: 1.5, md: 2.5 } }}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: 'bold', 
                      mb: 1,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      lineHeight: 1.4
                    }}
                  >
                    {item.title}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ 
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      mb: 1
                    }}
                  >
                    {item.description}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(item.pubDate).toLocaleString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Typography>
                    <IconButton 
                      size="small" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFavoriteToggle(item);
                      }}
                      sx={{ 
                        color: favorites.some(fav => fav.title === item.title) ? '#ffd700' : 'grey.400',
                        p: 0.5
                      }}
                    >
                      {favorites.some(fav => fav.title === item.title) ? 
                        <BookmarkIcon sx={{ fontSize: 16 }} /> : 
                        <BookmarkBorderIcon sx={{ fontSize: 16 }} />
                      }
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Fade>
          ))}
        </Box>

        {/* 데스크톱에서만 오른쪽 컬럼 표시 */}
        {!isMobile && (
          <Box sx={{ 
            flex: 1, 
            overflowY: 'auto',
            width: { xs: '100%', md: '650px' },
            minWidth: { xs: '100%', md: '650px' },
            px: 1
          }}>
            {rightNews.map((item, index) => (
              <Fade in={true} timeout={500 + index * 100} key={item.id || index}>
                <Card 
                  sx={{ 
                    mb: 1, 
                    cursor: 'pointer',
                    '&:hover': { 
                      transform: 'translateY(-2px)', 
                      boxShadow: 3,
                      transition: 'all 0.3s ease'
                    }
                  }}
                  onClick={() => handleNewsClick(item)}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: 'bold', 
                        mb: 1,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.4
                      }}
                    >
                      {item.title}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      sx={{ 
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        mb: 1
                      }}
                    >
                      {item.description}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(item.pubDate).toLocaleString('ko-KR', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Typography>
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFavoriteToggle(item);
                        }}
                        sx={{ 
                          color: favorites.some(fav => fav.title === item.title) ? '#ffd700' : 'grey.400',
                          p: 0.5
                        }}
                      >
                        {favorites.some(fav => fav.title === item.title) ? 
                          <BookmarkIcon sx={{ fontSize: 16 }} /> : 
                          <BookmarkBorderIcon sx={{ fontSize: 16 }} />
                        }
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              </Fade>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default NewsPanel; 