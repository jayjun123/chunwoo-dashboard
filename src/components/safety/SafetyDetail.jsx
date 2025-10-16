import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaEdit, FaTrash, FaExclamationTriangle, FaCheck, FaTimes } from 'react-icons/fa';
import { useMediaQuery } from '@mui/material';
import '../../styles/SafetyDetail.css';

const SafetyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(true);
  const isSmallScreen = useMediaQuery('(max-width:1499px)');

  useEffect(() => {
    // 임시 데이터
    const mockInspection = {
      id: 1,
      title: '기초 공사 안전 점검',
      site: '서울 강남 신축 아파트',
      date: '2024-01-15',
      status: '완료',
      inspector: '이영희',
      findings: [
        {
          id: 1,
          description: '안전모 미착용자 발견',
          severity: '높음',
          status: '해결',
          location: '1층 기초 공사 현장',
          action: '안전모 착용 지시 및 안전교육 실시',
          resolvedDate: '2024-01-15'
        },
        {
          id: 2,
          description: '안전줄 미설치 구간 발견',
          severity: '높음',
          status: '해결',
          location: '지하 1층 기초 공사 현장',
          action: '안전줄 설치 및 작업 중지',
          resolvedDate: '2024-01-15'
        }
      ],
      attachments: [
        {
          id: 1,
          name: '안전 점검 보고서.pdf',
          type: 'pdf',
          size: '2.5MB',
          uploadDate: '2024-01-15'
        },
        {
          id: 2,
          name: '현장 사진.jpg',
          type: 'image',
          size: '1.8MB',
          uploadDate: '2024-01-15'
        }
      ],
      comments: [
        {
          id: 1,
          author: '김철수',
          content: '안전모 착용 관련 안전교육 자료 첨부했습니다.',
          date: '2024-01-15 14:30'
        },
        {
          id: 2,
          author: '이영희',
          content: '안전줄 설치 완료 확인했습니다.',
          date: '2024-01-15 15:45'
        }
      ]
    };

    setInspection(mockInspection);
    setLoading(false);
  }, [id]);

  if (loading) {
    return <div className="loading">로딩 중...</div>;
  }

  if (!inspection) {
    return <div className="error">점검 정보를 찾을 수 없습니다.</div>;
  }

  return (
    <div className="safety-detail">
      <div className="safety-detail-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <FaArrowLeft /> 목록으로
        </button>
        <div className="header-actions">
          <button className="edit-button">
            <FaEdit /> 수정
          </button>
          <button className="delete-button">
            <FaTrash /> 삭제
          </button>
        </div>
      </div>

      <div className="safety-detail-content">
        <div className="inspection-info">
          <h1>{inspection.title}</h1>
          <div className="info-grid">
            <div className="info-item">
              <label>현장</label>
              <span>{inspection.site}</span>
            </div>
            <div className="info-item">
              <label>점검일</label>
              <span>{inspection.date}</span>
            </div>
            <div className="info-item">
              <label>점검자</label>
              <span>{inspection.inspector}</span>
            </div>
            <div className="info-item">
              <label>상태</label>
              <span className={`status-badge ${inspection.status}`}>{inspection.status}</span>
            </div>
          </div>
        </div>

        <div className="findings-section">
          <h2>발견된 문제점</h2>
          <div className="findings-list">
            {inspection.findings.map(finding => (
              <div key={finding.id} className="finding-card">
                <div className="finding-header">
                  <div className="finding-title">
                    <FaExclamationTriangle className={`severity-icon ${finding.severity}`} />
                    <h3>{finding.description}</h3>
                  </div>
                  <span className={`status-badge ${finding.status}`}>
                    {finding.status === '해결' ? <FaCheck /> : <FaTimes />}
                    {finding.status}
                  </span>
                </div>
                <div className="finding-details">
                  <div className="detail-item">
                    <label>위치</label>
                    <span>{finding.location}</span>
                  </div>
                  <div className="detail-item">
                    <label>조치사항</label>
                    <span>{finding.action}</span>
                  </div>
                  {finding.resolvedDate && (
                    <div className="detail-item">
                      <label>해결일</label>
                      <span>{finding.resolvedDate}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="attachments-section">
          <h2>첨부파일</h2>
          <div className="attachments-list">
            {inspection.attachments.map(file => (
              <div key={file.id} className="attachment-item">
                <span className="file-name">{file.name}</span>
                <span className="file-info">
                  {file.type.toUpperCase()} • {file.size}
                </span>
                <button className="download-button">{isSmallScreen ? '다운' : '다운로드'}</button>
              </div>
            ))}
          </div>
        </div>

        <div className="comments-section">
          <h2>코멘트</h2>
          <div className="comments-list">
            {inspection.comments.map(comment => (
              <div key={comment.id} className="comment-item">
                <div className="comment-header">
                  <span className="comment-author">{comment.author}</span>
                  <span className="comment-date">{comment.date}</span>
                </div>
                <p className="comment-content">{comment.content}</p>
              </div>
            ))}
          </div>
          <div className="comment-form">
            <textarea placeholder="코멘트를 입력하세요..." />
            <button className="submit-button">등록</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SafetyDetail; 