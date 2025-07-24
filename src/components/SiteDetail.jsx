import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import '../styles/SiteDetail.css';

const SiteDetail = ({ site, onClose, onEdit, onUpdate }) => {
  const { isDarkMode } = useTheme();
  const [isUpdating, setIsUpdating] = useState(false);
  const [progressStatus, setProgressStatus] = useState(site.progressStatus || '진행중');
  const [estimateStatus, setEstimateStatus] = useState(site.estimateStatus || '미제출');
  const [estimateNote, setEstimateNote] = useState(site.estimateNote || '');
  const [relatedEstimates, setRelatedEstimates] = useState([]);
  const [loadingEstimates, setLoadingEstimates] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  // 견적 상태 옵션
  const estimateStatusOptions = [
    { value: '제출', label: '제출' },
    { value: '미제출', label: '미제출' },
    { value: '예정', label: '예정' },
    { value: '미정', label: '미정' },
    { value: '입찰', label: '입찰' },
    { value: '현설', label: '현설' },
    { value: '기타', label: '기타' }
  ];

  // 견적 데이터 로드 및 상태 자동 분류
  useEffect(() => {
    const loadRelatedEstimates = async () => {
      if (!site.name) return;
      
      setLoadingEstimates(true);
      try {
        // 현장명이 같은 견적 데이터 조회 (정확한 매칭)
        const estimatesQuery = query(
          collection(db, 'estimates'),
          where('siteName', '==', site.name)
        );
        
        const snapshot = await getDocs(estimatesQuery);
        const estimates = [];
        
        snapshot.forEach((doc) => {
          try {
            const data = doc.data();
            estimates.push({
              id: doc.id,
              ...data
            });
          } catch (docError) {
            console.warn('견적 문서 데이터 읽기 실패:', doc.id, docError);
          }
        });
        
        // 정확한 매칭이 없으면 부분 매칭 시도
        if (estimates.length === 0) {
          try {
            const allEstimatesQuery = query(collection(db, 'estimates'));
            const allSnapshot = await getDocs(allEstimatesQuery);
            
            allSnapshot.forEach((doc) => {
              try {
                const estimateData = doc.data();
                // 현장명이 포함되어 있는지 확인
                if (estimateData.siteName && 
                    (estimateData.siteName.includes(site.name) || 
                     site.name.includes(estimateData.siteName))) {
                  estimates.push({
                    id: doc.id,
                    ...estimateData
                  });
                }
              } catch (docError) {
                console.warn('견적 문서 데이터 읽기 실패:', doc.id, docError);
              }
            });
          } catch (partialMatchError) {
            console.warn('부분 매칭 조회 실패:', partialMatchError);
          }
        }
        
        setRelatedEstimates(estimates);
        
        // 견적 데이터가 있으면 자동으로 상태 분류
        if (estimates.length > 0) {
          const latestEstimate = estimates[0]; // 가장 최근 견적
          
          // 수주 유무에 따라 상태 결정
          if (latestEstimate.contractStatus === '수주') {
            setEstimateStatus('예정');
          } else if (latestEstimate.contractStatus === '미수주') {
            setEstimateStatus('미정');
          } else if (latestEstimate.contractStatus === '미수주확정') {
            setEstimateStatus('미정');
          } else {
            // 수주 유무가 없으면 제출 상태로 분류
            setEstimateStatus('제출');
          }
          
          console.log('견적 상태 자동 분류:', {
            siteName: site.name,
            contractStatus: latestEstimate.contractStatus,
            estimatedStatus: latestEstimate.contractStatus === '수주' ? '예정' : 
                           latestEstimate.contractStatus === '미수주' ? '미정' : '제출'
          });
        } else {
          // 견적 데이터가 없으면 기본값
          setEstimateStatus('미제출');
          console.log('견적 데이터 없음 - 기본값 설정:', site.name);
        }
        
      } catch (error) {
        console.error('견적 데이터 로드 실패:', error);
        // 오류 발생 시 기본값 설정
        setEstimateStatus('미제출');
        setRelatedEstimates([]);
      } finally {
        setLoadingEstimates(false);
      }
    };

    loadRelatedEstimates();
  }, [site.name]);

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

  const getEstimateStatusColor = (status) => {
    if (!status) return '#757575';
    
    switch (status) {
      case '제출':
        return '#43a047';
      case '미제출':
        return '#f44336';
      case '예정':
        return '#2e7d32';
      case '미정':
        return '#d32f2f';
      case '입찰':
        return '#ff9800';
      case '현설':
        return '#2196f3';
      case '기타':
        return '#9c27b0';
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

  const handleEstimateStatusChange = async (newStatus) => {
    if (newStatus === estimateStatus) return;
    
    setIsUpdating(true);
    try {
      if (!site.id) {
        throw new Error('현장 ID가 없습니다.');
      }
      
      const siteRef = doc(db, 'sites', site.id);
      await updateDoc(siteRef, {
        estimateStatus: newStatus,
        estimateNote: estimateNote,
        updatedAt: new Date()
      });
      
      setEstimateStatus(newStatus);
      
      // 부모 컴포넌트에 업데이트 알림
      if (onUpdate) {
        onUpdate({ ...site, estimateStatus: newStatus, estimateNote: estimateNote });
      }
      
      console.log('견적 상태 업데이트 완료:', newStatus);
    } catch (error) {
      console.error('견적 상태 업데이트 실패:', error);
      alert('견적 상태 업데이트에 실패했습니다. 다시 시도해주세요.');
      // 원래 값으로 되돌리기
      setEstimateStatus(site.estimateStatus || '미제출');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEstimateNoteChange = async (newNote) => {
    setEstimateNote(newNote);
    setSavingNote(true);
    
    // 디바운스 처리 (1초 후 저장)
    const timeoutId = setTimeout(async () => {
      try {
        if (!site.id) {
          throw new Error('현장 ID가 없습니다.');
        }
        
        const siteRef = doc(db, 'sites', site.id);
        await updateDoc(siteRef, {
          estimateStatus: estimateStatus,
          estimateNote: newNote,
          updatedAt: new Date()
        });
        
        // 부모 컴포넌트에 업데이트 알림
        if (onUpdate) {
          onUpdate({ ...site, estimateStatus: estimateStatus, estimateNote: newNote });
        }
        
        console.log('견적 메모 업데이트 완료:', newNote);
      } catch (error) {
        console.error('견적 메모 업데이트 실패:', error);
        // 오류 발생 시 사용자에게 알림
        alert('견적 메모 저장에 실패했습니다. 다시 시도해주세요.');
        // 원래 값으로 되돌리기
        setEstimateNote(site.estimateNote || '');
      } finally {
        setSavingNote(false);
      }
    }, 1000);
    
    return () => clearTimeout(timeoutId);
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

          {/* 견적 정보 섹션 추가 */}
          <div className="detail-section">
            <h3>견적 정보</h3>
            <div className="detail-item">
              <label>견적 상태</label>
              <div className="status-selector">
                <select
                  value={estimateStatus}
                  onChange={(e) => handleEstimateStatusChange(e.target.value)}
                  disabled={isUpdating}
                  style={{
                    backgroundColor: getEstimateStatusColor(estimateStatus),
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
                  {estimateStatusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {isUpdating && (
                  <span style={{ marginLeft: '8px', fontSize: '12px', color: '#666' }}>
                    업데이트 중...
                  </span>
                )}
              </div>
            </div>
            <div className="detail-item">
              <label>견적 메모</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={estimateNote}
                  onChange={(e) => handleEstimateNoteChange(e.target.value)}
                  placeholder="기타 사항을 입력하세요"
                  style={{
                    width: '100%',
                    padding: '4px 8px',
                    paddingRight: savingNote ? '60px' : '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
                {savingNote && (
                  <span style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '11px',
                    color: '#666',
                    fontStyle: 'italic'
                  }}>
                    저장 중...
                  </span>
                )}
              </div>
            </div>
            <div className="detail-item">
              <label>연관 견적</label>
              <div className="related-estimates-info">
                {loadingEstimates ? (
                  <span>견적 데이터 로딩 중...</span>
                ) : relatedEstimates.length > 0 ? (
                  <div>
                    <span>연관 견적 {relatedEstimates.length}건</span>
                    <br />
                    <span>최근 견적: {formatDate(relatedEstimates[0].receptionDate)}</span>
                    <br />
                    <span>수주상태: {relatedEstimates[0].contractStatus || '미설정'}</span>
                    {relatedEstimates.length > 1 && (
                      <div style={{ marginTop: '4px' }}>
                        <span style={{ fontSize: '11px', color: '#999' }}>
                          기타 견적: {relatedEstimates.slice(1).map(e => 
                            `${e.siteName} (${e.contractStatus || '미설정'})`
                          ).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <span>연관 견적 없음</span>
                )}
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