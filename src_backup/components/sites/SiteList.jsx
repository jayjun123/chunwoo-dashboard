import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaPlus, FaSearch, FaFilter } from 'react-icons/fa';
import '../../styles/SiteList.css';

const SiteList = () => {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    // 임시 데이터
    const mockSites = [
      {
        id: 1,
        name: '서울 강남 신축 아파트',
        location: '서울시 강남구',
        status: '진행중',
        progress: 65,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        manager: '김철수',
        budget: '500억원'
      },
      {
        id: 2,
        name: '부산 해운대 호텔 리모델링',
        location: '부산시 해운대구',
        status: '계획중',
        progress: 0,
        startDate: '2024-03-01',
        endDate: '2025-02-28',
        manager: '이영희',
        budget: '300억원'
      },
      {
        id: 3,
        name: '인천 송도 상업시설',
        location: '인천시 연수구',
        status: '완료',
        progress: 100,
        startDate: '2023-06-01',
        endDate: '2024-01-31',
        manager: '박지민',
        budget: '200억원'
      }
    ];

    setSites(mockSites);
    setLoading(false);
  }, []);

  const filteredSites = sites.filter(site => {
    const matchesSearch = site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         site.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || site.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <div className="loading">로딩 중...</div>;
  }

  return (
    <div className="site-list">
      <div className="site-list-header">
        <h1>현장 목록</h1>
        <Link to="/sites/new" className="add-site-button">
          <FaPlus /> 새 현장 등록
        </Link>
      </div>

      <div className="site-list-filters">
        <div className="search-box">
          <FaSearch />
          <input
            type="text"
            placeholder="현장명 또는 위치로 검색"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-box">
          <FaFilter />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">전체 현장</option>
            <option value="계획중">계획중</option>
            <option value="진행중">진행중</option>
            <option value="완료">완료</option>
          </select>
        </div>
      </div>

      <div className="site-list-grid">
        {filteredSites.map(site => (
          <div key={site.id} className="site-card">
            <div className="site-card-header">
              <h3>{site.name}</h3>
              <span className={`status-badge ${site.status}`}>{site.status}</span>
            </div>
            <div className="site-card-body">
              <p><strong>위치:</strong> {site.location}</p>
              <p><strong>현장장:</strong> {site.manager}</p>
              <p><strong>기간:</strong> {site.startDate} ~ {site.endDate}</p>
              <p><strong>예산:</strong> {site.budget}</p>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${site.progress}%` }}
                />
              </div>
              <span className="progress-text">{site.progress}%</span>
            </div>
            <div className="site-card-footer">
              <button className="edit-btn">수정</button>
              <button className="delete-btn">삭제</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SiteList; 