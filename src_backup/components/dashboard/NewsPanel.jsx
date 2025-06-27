import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Card, CardContent, Link, CircularProgress, Button, IconButton, Tooltip, Fade } from '@mui/material';
import { Refresh as RefreshIcon, OpenInNew as OpenInNewIcon } from '@mui/icons-material';
import { getNewsFromFirestore, searchConstructionNews, saveNewsToFirestore } from '../../services/newsService';

const NewsPanel = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchAndSaveNews = useCallback(async () => {
    try {
      setRefreshing(true);
      const naverNews = await searchConstructionNews();
      await saveNewsToFirestore(naverNews);
      setNews(naverNews);
      setError('');
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
        const firestoreNews = await getNewsFromFirestore();
        if (!firestoreNews || firestoreNews.length === 0) {
          await fetchAndSaveNews();
        } else {
          setNews(firestoreNews);
        }
      } catch (err) {
        setError('뉴스를 불러오지 못했습니다.');
        console.error('뉴스 로딩 실패:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
    
    // 1시간마다 뉴스 갱신
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
      <Box sx={{ p: 2, color: 'error.main', textAlign: 'center' }}>
        <Typography>{error}</Typography>
        <Button 
          variant="outlined" 
          onClick={fetchAndSaveNews}
          sx={{ mt: 1 }}
        >
          다시 시도
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          건설/유리공사 뉴스
        </Typography>
        <Tooltip title="뉴스 새로고침" arrow>
          <IconButton 
            onClick={fetchAndSaveNews}
            disabled={refreshing}
            sx={{ 
              transition: 'transform 0.2s',
              '&:hover': { transform: 'rotate(180deg)' }
            }}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>
      
      {news.map((item, index) => (
        <Fade in={true} timeout={500} key={item.link}>
          <Card 
            sx={{ 
              mb: 2, 
              bgcolor: '#23242a', 
              color: '#fff',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
              }
            }}
          >
            <CardContent>
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
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                    {item.title.replace(/<[^>]*>/g, '')}
                  </Typography>
                </Link>
                <Tooltip title="새 창에서 열기" arrow>
                  <IconButton
                    size="small"
                    component="a"
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ color: '#fff' }}
                  >
                    <OpenInNewIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Typography variant="body2" sx={{ color: '#aaa', mb: 1 }}>
                {item.description.replace(/<[^>]*>/g, '')}
              </Typography>
              <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>
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
      ))}
    </Box>
  );
};

export default NewsPanel; 