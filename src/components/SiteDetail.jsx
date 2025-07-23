import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import '../styles/SiteDetail.css';

const SiteDetail = ({ site, onClose, onEdit, onUpdate }) => {
  const { isDarkMode } = useTheme();
  const [isUpdating, setIsUpdating] = useState(false);
  const [progressStatus, setProgressStatus] = useState(site.progressStatus || '진행중');

  if (!site) return null;

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case '진행중':
        return '#1976d2';
      case '진행상황':
        return '#ffa000';
      case '완료':
        return '#43a047';
      default:
        return '#757575';
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (newStatus === progressStatus) return;
    
    setIsUpdating(true);
    try {
      const siteRef = doc(db, 'sites', site.id);
      await updateDoc(siteRef, {
        progressStatus: newStatus,
        updatedAt: new Date()
      });
      
      setProgressStatus(newStatus);
      
      // 부모 컴포넌트에 업데이트 알림
      if (onUpdate) {
        onUpdate({ ...site, progressStatus: newStatus });
      }
      
      console.log('진행상황 업데이트 완료:', newStatus);
    } catch (error) {
      console.error('진행상황 업데이트 실패:', error);
      alert('진행상황 업데이트에 실패했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className={`site-detail ${isDarkMode ? 'dark' : 'light'}`}>
      <div className="site-detail-header">
        <h2>{site.name}</h2>
        <div className="header-actions">
          <button className="edit-btn" onClick={() => onEdit(site)}>
            수정
          </button>
          <button className="close-btn" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>

      <div className="site-detail-content">
        <div className="detail-grid">
          <div className="detail-section">
            <h3>기본 정보</h3>
            <div className="detail-item">
              <label>계약구분</label>
              <span>{site.type || '-'}</span>
            </div>
            <div className="detail-item">
              <label>회사명</label>
              <span>{site.company || '-'}</span>
            </div>
            <div className="detail-item">
              <label>계약금액</label>
              <span>{formatCurrency(site.total)}</span>
            </div>
            <div className="detail-item">
              <label>진행상태</label>
              <div className="status-selector">
                <select
                  value={progressStatus}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={isUpdating}
                  style={{
                    backgroundColor: getStatusColor(progressStatus),
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: isUpdating ? 'not-allowed' : 'pointer',
                    opacity: isUpdating ? 0.7 : 1
                  }}
                >
                  <option value="진행중">진행중</option>
                  <option value="진행상황">진행상황</option>
                  <option value="완료">완료</option>
                  <option value="중단">중단</option>
                </select>
                {isUpdating && (
                  <span style={{ marginLeft: '8px', fontSize: '12px', color: '#666' }}>
                    업데이트 중...
                  </span>
                )}
              </div>
            </div>
            <div className="detail-item">
              <label>진행률</label>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${site.progressPercent || 0}%` }}
                />
                <span className="progress-text">{site.progressPercent || 0}%</span>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h3>일정 정보</h3>
            <div className="detail-item">
              <label>시작일</label>
              <span>{formatDate(site.startDate)}</span>
            </div>
            <div className="detail-item">
              <label>종료일</label>
              <span>{formatDate(site.endDate)}</span>
            </div>
            <div className="detail-item">
              <label>공사기간</label>
              <span>
                {site.startDate && site.endDate
                  ? `${Math.ceil(
                      (new Date(site.endDate) - new Date(site.startDate)) /
                        (1000 * 60 * 60 * 24)
                    )}일`
                  : '-'}
              </span>
            </div>
          </div>

          <div className="detail-section">
            <h3>담당자 정보</h3>
            <div className="detail-item">
              <label>담당자</label>
              <span>{site.manager || '-'}</span>
            </div>
            <div className="detail-item">
              <label>시공팀</label>
              <span>{site.team || '-'}</span>
            </div>
            <div className="detail-item">
              <label>연락처</label>
              <span>{site.phone || '-'}</span>
            </div>
            <div className="detail-item">
              <label>이메일</label>
              <span>{site.email || '-'}</span>
            </div>
          </div>

          <div className="detail-section full-width">
            <h3>주소</h3>
            <div className="detail-item">
              <span>{site.address || '-'}</span>
            </div>
          </div>

          <div className="detail-section full-width">
            <h3>설명</h3>
            <div className="detail-item">
              <span className="description">{site.description || '-'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SiteDetail; 