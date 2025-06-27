import React, { useEffect, useState } from 'react';
import '../styles/NewsList.css';
import { getNews } from '../services/newsService';

export default function NewsList() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [popup, setPopup] = useState(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        const newsData = await getNews(false); // 로컬 스토리지 우선
        if (newsData && newsData.length > 0) {
          setNews(newsData);
        } else {
          setError('뉴스를 불러오는데 실패했습니다.');
        }
      } catch (err) {
        setError('뉴스를 불러오는데 실패했습니다.');
        console.error('뉴스 로딩 실패:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  const handlePopupClose = () => setPopup(null);
  const handleOverlayClick = e => {
    if (e.target.className === 'news-popup-overlay') handlePopupClose();
  };

  return (
    <div className="news-list-main">
      <h2 className="news-title">건설NEWS</h2>
      {loading && <div className="news-loading">로딩 중...</div>}
      {error && <div className="news-error">{error}</div>}
      <ul className="news-headline-list">
        {news.map((item, idx) => (
          <li key={idx} className="news-headline-item">
            <button 
              className="news-headline-btn" 
              onClick={() => setPopup(item)}
              style={{
                textAlign: 'left',
                padding: '12px 16px',
                border: 'none',
                background: 'transparent',
                color: '#fff',
                cursor: 'pointer',
                width: '100%',
                fontSize: '14px',
                lineHeight: '1.4',
                fontWeight: '500',
                borderBottom: '1px solid #333',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#2a2a2a'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              {item.title.replace(/<[^>]+>/g, '')}
            </button>
          </li>
        ))}
      </ul>
      {popup && (
        <div className="news-popup-overlay" onClick={handleOverlayClick}>
          <div className="news-popup">
            <button className="news-popup-close" onClick={handlePopupClose}>×</button>
            <h3>{popup.title.replace(/<[^>]+>/g, '')}</h3>
            <div className="news-popup-content">{popup.description.replace(/<[^>]+>/g, '')}</div>
            {popup.link && <a href={popup.link} target="_blank" rel="noopener noreferrer" className="news-popup-link">원문 보기</a>}
          </div>
        </div>
      )}
    </div>
  );
} 