import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Card, CardContent, Link, CircularProgress, Button, IconButton, Tooltip, Fade, Grid, ToggleButton } from '@mui/material';
import { Refresh as RefreshIcon, OpenInNew as OpenInNewIcon, Bookmark as BookmarkIcon, BookmarkBorder as BookmarkBorderIcon, List as ListIcon } from '@mui/icons-material';
import { getNews, saveNewsToFirestore } from '../../services/newsService';
import { useNavigate } from 'react-router-dom';

const NewsPanel = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const navigate = useNavigate();

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
      const naverNews = await getNews(true); // 강제 새로고침
      if (naverNews.length > 0) {
        await saveNewsToFirestore(naverNews);
        setNews(naverNews);
        setError('');
      } else {
        setError('뉴스를 불러오지 못했습니다.');
      }
    } catch (err) {
      setError('뉴스를 불러오지 못했습니다.');
      console.error('뉴스 갱신 실패:', err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      setError('');
      try {
        // 로컬 스토리지 우선, 없으면 새로 검색
        const newsData = await getNews(false);
        console.log('뉴스 데이터 로드 결과:', newsData);
        
        if (newsData && newsData.length > 0) {
          console.log('뉴스 데이터 설정:', newsData.length, '개');
          setNews(newsData);
        } else {
          // 뉴스 데이터가 없으면 더미 데이터 사용
          console.log('뉴스 데이터가 없어서 더미 데이터를 사용합니다.');
          const dummyNews = [
            {
              id: 1,
              title: '건설업계, 친환경 건축물 인증 확대 추진',
              description: '정부가 친환경 건축물 인증을 확대하여 건설업계의 친환경 전환이 가속화될 것으로 예상됩니다.',
              link: 'https://www.news1.kr/articles/5034567',
              pubDate: new Date().toISOString()
            },
            {
              id: 2,
              title: '유리공사 기술 발전, 에너지 효율성 향상',
              description: '최신 유리공사 기술이 건물의 에너지 효율성을 크게 향상시키는 것으로 나타났습니다.',
              link: 'https://www.news1.kr/articles/5034568',
              pubDate: new Date(Date.now() - 3600000).toISOString()
            },
            {
              id: 3,
              title: '건설현장 안전관리 강화, 사고율 감소',
              description: '디지털 기술을 활용한 건설현장 안전관리로 사고율이 지속적으로 감소하고 있습니다.',
              link: 'https://www.news1.kr/articles/5034569',
              pubDate: new Date(Date.now() - 7200000).toISOString()
            },
            {
              id: 4,
              title: '스마트 건설기술 도입 확산',
              description: 'BIM, IoT 등 스마트 건설기술이 건설업계에 빠르게 확산되고 있습니다.',
              link: 'https://www.news1.kr/articles/5034570',
              pubDate: new Date(Date.now() - 10800000).toISOString()
            },
            {
              id: 5,
              title: '건설자재 가격 안정화 기대',
              description: '원자재 가격 안정화로 건설자재 가격이 안정세를 보일 것으로 전망됩니다.',
              link: 'https://www.news1.kr/articles/5034571',
              pubDate: new Date(Date.now() - 14400000).toISOString()
            }
          ];
          console.log('더미 뉴스 데이터 설정:', dummyNews.length, '개');
          setNews(dummyNews);
        }
      } catch (err) {
        console.error('뉴스 로딩 실패:', err);
        // 에러 시에도 더미 데이터 표시
        const dummyNews = [
          {
            id: 1,
            title: '건설업계, 친환경 건축물 인증 확대 추진',
            description: '정부가 친환경 건축물 인증을 확대하여 건설업계의 친환경 전환이 가속화될 것으로 예상됩니다.',
            link: 'https://www.news1.kr/articles/5034567',
            pubDate: new Date().toISOString()
          },
          {
            id: 2,
            title: '유리공사 기술 발전, 에너지 효율성 향상',
            description: '최신 유리공사 기술이 건물의 에너지 효율성을 크게 향상시키는 것으로 나타났습니다.',
            link: 'https://www.news1.kr/articles/5034568',
            pubDate: new Date(Date.now() - 3600000).toISOString()
          },
          {
            id: 3,
            title: '건설현장 안전관리 강화, 사고율 감소',
            description: '디지털 기술을 활용한 건설현장 안전관리로 사고율이 지속적으로 감소하고 있습니다.',
            link: 'https://www.news1.kr/articles/5034569',
            pubDate: new Date(Date.now() - 7200000).toISOString()
          }
        ];
        console.log('에러 시 더미 뉴스 데이터 설정:', dummyNews.length, '개');
        setNews(dummyNews);
        setError('뉴스를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
    
    // 1시간마다 뉴스 갱신 (하지만 로컬 스토리지는 하루에 한 번만)
    const interval = setInterval(fetchAndSaveNews, 3600000);
    return () => clearInterval(interval);
  }, [fetchAndSaveNews]);

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
  const leftNews = displayNews.slice(0, 5);
  const rightNews = displayNews.slice(5, 10);

  return (
    <Box sx={{ 
      p: 0.5, 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      justifyContent: 'flex-start',
      width: '100%',
      height: '100vh',
      overflow: 'hidden'
    }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 0.5, 
        width: '100%', 
        maxWidth: 1200 
      }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#fff' }}>
          건설NEWS {showFavorites && '(즐겨찾기)'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <ToggleButton
            value="favorites"
            selected={showFavorites}
            onChange={() => setShowFavorites(!showFavorites)}
            size="small"
            sx={{ 
              color: '#fff', 
              borderColor: '#fff',
              '&.Mui-selected': { 
                bgcolor: '#FFD600', 
                color: '#000',
                '&:hover': { bgcolor: '#FFD600' }
              }
            }}
          >
            <BookmarkIcon sx={{ fontSize: 16 }} />
          </ToggleButton>
          <Tooltip title="즐겨찾기 관리" arrow>
            <IconButton
              onClick={() => navigate('/news-favorites')}
              sx={{ color: '#fff' }}
            >
              <ListIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="뉴스 새로고침" arrow>
            <IconButton
              onClick={fetchAndSaveNews}
              disabled={refreshing}
              sx={{ color: '#fff' }}
            >
              {refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Box sx={{ 
        width: '100%', 
        maxWidth: 1200,
        display: 'flex',
        gap: 2,
        overflow: 'hidden',
        height: 'calc(100vh - 80px)'
      }}>
        {/* 왼쪽 컬럼 */}
        <Box sx={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          overflowY: 'auto'
        }}>
          {leftNews.map((item, index) => (
            <Fade in={true} timeout={500} key={item.id || index}>
              <Card 
                sx={{ 
                  bgcolor: '#23242a', 
                  color: '#fff',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  minHeight: 80,
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: '0 3px 6px rgba(0,0,0,0.2)'
                  }
                }}
              >
                <CardContent sx={{ py: 0.5, px: 1.5, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Link
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        color: '#fff',
                        textDecoration: 'none',
                        flex: 1,
                        '&:hover': { color: '#90caf9' }
                      }}
                    >
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: '500',
                          lineHeight: 1.2,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontSize: '1.1rem',
                          minHeight: '2.4em',
                          textAlign: 'left'
                        }}
                      >
                        {item.title.replace(/<[^>]*>/g, '')}
                      </Typography>
                    </Link>
                    <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                      <Tooltip title={isFavorite(item) ? "즐겨찾기 해제" : "즐겨찾기 추가"} arrow>
                        <IconButton
                          size="small"
                          onClick={() => toggleFavorite(item)}
                          sx={{ color: isFavorite(item) ? '#FFD600' : '#fff', p: 0.5 }}
                        >
                          {isFavorite(item) ? <BookmarkIcon sx={{ fontSize: '0.9rem' }} /> : <BookmarkBorderIcon sx={{ fontSize: '0.9rem' }} />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="새 창에서 열기" arrow>
                        <IconButton
                          size="small"
                          component="a"
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ color: '#fff', p: 0.5 }}
                        >
                          <OpenInNewIcon sx={{ fontSize: '0.9rem' }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: '#666', 
                      display: 'block',
                      mt: 0.25,
                      fontSize: '0.65rem',
                      alignSelf: 'flex-end'
                    }}
                  >
                    {new Date(item.pubDate).toLocaleString('ko-KR', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Typography>
                </CardContent>
              </Card>
            </Fade>
          ))}
        </Box>

        {/* 오른쪽 컬럼 */}
        <Box sx={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          overflowY: 'auto'
        }}>
          {rightNews.map((item, index) => (
            <Fade in={true} timeout={500} key={item.id || (index + 5)}>
              <Card 
                sx={{ 
                  bgcolor: '#23242a', 
                  color: '#fff',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  minHeight: 80,
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: '0 3px 6px rgba(0,0,0,0.2)'
                  }
                }}
              >
                <CardContent sx={{ py: 0.5, px: 1.5, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Link
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        color: '#fff',
                        textDecoration: 'none',
                        flex: 1,
                        '&:hover': { color: '#90caf9' }
                      }}
                    >
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: '500',
                          lineHeight: 1.2,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontSize: '1.1rem',
                          minHeight: '2.4em',
                          textAlign: 'left'
                        }}
                      >
                        {item.title.replace(/<[^>]*>/g, '')}
                      </Typography>
                    </Link>
                    <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                      <Tooltip title={isFavorite(item) ? "즐겨찾기 해제" : "즐겨찾기 추가"} arrow>
                        <IconButton
                          size="small"
                          onClick={() => toggleFavorite(item)}
                          sx={{ color: isFavorite(item) ? '#FFD600' : '#fff', p: 0.5 }}
                        >
                          {isFavorite(item) ? <BookmarkIcon sx={{ fontSize: '0.9rem' }} /> : <BookmarkBorderIcon sx={{ fontSize: '0.9rem' }} />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="새 창에서 열기" arrow>
                        <IconButton
                          size="small"
                          component="a"
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ color: '#fff', p: 0.5 }}
                        >
                          <OpenInNewIcon sx={{ fontSize: '0.9rem' }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: '#666', 
                      display: 'block',
                      mt: 0.25,
                      fontSize: '0.65rem',
                      alignSelf: 'flex-end'
                    }}
                  >
                    {new Date(item.pubDate).toLocaleString('ko-KR', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Typography>
                </CardContent>
              </Card>
            </Fade>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default NewsPanel; 