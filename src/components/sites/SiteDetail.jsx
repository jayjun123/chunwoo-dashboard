import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaEdit, FaTrash, FaCalendarAlt, FaUsers, FaHardHat, FaBoxes } from 'react-icons/fa';
import '../../styles/SiteDetail.css';

const SiteDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    // 임시 데이터
    const mockSite = {
      id: parseInt(id),
      name: '서울 강남 신축 아파트',
      location: '서울시 강남구',
      status: '진행중',
      progress: 65,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      manager: '김철수',
      budget: '500억원',
      description: '강남 지역의 새로운 랜드마크가 될 40층 규모의 고급 아파트 단지 건설 프로젝트입니다.',
      team: [
        { id: 1, name: '김철수', role: '현장장', phone: '010-1234-5678' },
        { id: 2, name: '이영희', role: '안전관리자', phone: '010-2345-6789' },
        { id: 3, name: '박지민', role: '자재관리자', phone: '010-3456-7890' }
      ],
      milestones: [
        { id: 1, title: '기초 공사 완료', date: '2024-02-15', status: '완료' },
        { id: 2, title: '구조체 공사 완료', date: '2024-06-30', status: '진행중' },
        { id: 3, title: '외장 공사 완료', date: '2024-09-30', status: '예정' },
        { id: 4, title: '내장 공사 완료', date: '2024-11-30', status: '예정' }
      ]
    };

    setSite(mockSite);
    setLoading(false);
  }, [id]);

  if (loading) {
    return <div className="loading">로딩 중...</div>;
  }

  if (!site) {
    return <div className="error">현장 정보를 찾을 수 없습니다.</div>;
  }

  return (
    <div className="site-detail">
      <div className="site-detail-header">
        <button className="back-button" onClick={() => navigate('/sites')}>
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

      <div className="site-detail-content">
        <div className="site-info">
          <h1>{site.name}</h1>
          <div className="site-status">
            <span className={`status-badge ${site.status}`}>{site.status}</span>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${site.progress}%` }}
              />
            </div>
            <span className="progress-text">{site.progress}%</span>
          </div>
          <p className="site-description">{site.description}</p>
        </div>

        <div className="site-tabs">
          <button 
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <FaCalendarAlt /> 개요
          </button>
          <button 
            className={`tab-button ${activeTab === 'team' ? 'active' : ''}`}
            onClick={() => setActiveTab('team')}
          >
            <FaUsers /> 팀원
          </button>
          <button 
            className={`tab-button ${activeTab === 'safety' ? 'active' : ''}`}
            onClick={() => setActiveTab('safety')}
          >
            <FaHardHat /> 안전
          </button>
          <button 
            className={`tab-button ${activeTab === 'materials' ? 'active' : ''}`}
            onClick={() => setActiveTab('materials')}
          >
            <FaBoxes /> 자재
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'overview' && (
            <div className="overview-tab">
              <div className="info-grid">
                <div className="info-item">
                  <h3>위치</h3>
                  <p>{site.location}</p>
                </div>
                <div className="info-item">
                  <h3>현장장</h3>
                  <p>{site.manager}</p>
                </div>
                <div className="info-item">
                  <h3>기간</h3>
                  <p>{site.startDate} ~ {site.endDate}</p>
                </div>
                <div className="info-item">
                  <h3>예산</h3>
                  <p>{site.budget}</p>
                </div>
              </div>

              <div className="milestones">
                <h2>주요 마일스톤</h2>
                <div className="milestone-list">
                  {site.milestones.map(milestone => (
                    <div key={milestone.id} className="milestone-item">
                      <div className="milestone-info">
                        <h4>{milestone.title}</h4>
                        <p>{milestone.date}</p>
                      </div>
                      <span className={`milestone-status ${milestone.status}`}>
                        {milestone.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'team' && (
            <div className="team-tab">
              <div className="team-list">
                {site.team.map(member => (
                  <div key={member.id} className="team-member">
                    <div className="member-info">
                      <h3>{member.name}</h3>
                      <p className="member-role">{member.role}</p>
                      <p className="member-phone">{member.phone}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'safety' && (
            <div className="safety-tab">
              <p>안전 관리 탭 내용이 여기에 표시됩니다.</p>
            </div>
          )}

          {activeTab === 'materials' && (
            <div className="materials-tab">
              <p>자재 관리 탭 내용이 여기에 표시됩니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SiteDetail; 