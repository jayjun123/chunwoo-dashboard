import React, { useState, useEffect } from 'react';
import { FaPlus, FaSearch, FaFilter, FaExclamationTriangle } from 'react-icons/fa';
import '../../styles/SafetyList.css';

const SafetyList = () => {
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    // 임시 데이터
    const mockInspections = [
      {
        id: 1,
        title: '기초 공사 안전 점검',
        site: '서울 강남 신축 아파트',
        date: '2024-01-15',
        status: '완료',
        inspector: '이영희',
        findings: [
          { id: 1, description: '안전모 미착용자 발견', severity: '높음', status: '해결' },
          { id: 2, description: '안전줄 미설치 구간 발견', severity: '높음', status: '해결' }
        ]
      },
      {
        id: 2,
        title: '구조체 공사 안전 점검',
        site: '서울 강남 신축 아파트',
        date: '2024-03-20',
        status: '진행중',
        inspector: '이영희',
        findings: [
          { id: 1, description: '작업대 미설치 구간 발견', severity: '중간', status: '미해결' },
          { id: 2, description: '안전장비 미착용자 발견', severity: '높음', status: '미해결' }
        ]
      },
      {
        id: 3,
        title: '외장 공사 안전 점검',
        site: '서울 강남 신축 아파트',
        date: '2024-07-01',
        status: '예정',
        inspector: '이영희',
        findings: []
      }
    ];

    setInspections(mockInspections);
    setLoading(false);
  }, []);

  const filteredInspections = inspections.filter(inspection => {
    const matchesSearch = inspection.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         inspection.site.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || inspection.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <div className="loading">로딩 중...</div>;
  }

  return (
    <div className="safety-list">
      <div className="safety-list-header">
        <h1>안전 점검</h1>
        <button className="add-inspection-button">
          <FaPlus /> 새 점검 등록
        </button>
      </div>

      <div className="safety-list-filters">
        <div className="search-box">
          <FaSearch />
          <input
            type="text"
            placeholder="점검명 또는 현장명으로 검색"
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
            <option value="all">전체 점검</option>
            <option value="예정">예정</option>
            <option value="진행중">진행중</option>
            <option value="완료">완료</option>
          </select>
        </div>
      </div>

      <div className="safety-list-grid">
        {filteredInspections.map(inspection => (
          <div key={inspection.id} className="inspection-card">
            <div className="inspection-card-header">
              <h3>{inspection.title}</h3>
              <span className={`status-badge ${inspection.status}`}>{inspection.status}</span>
            </div>
            <div className="inspection-card-body">
              <p><strong>현장:</strong> {inspection.site}</p>
              <p><strong>점검일:</strong> {inspection.date}</p>
              <p><strong>점검자:</strong> {inspection.inspector}</p>
              
              {inspection.findings.length > 0 && (
                <div className="findings-list">
                  <h4>발견된 문제점</h4>
                  {inspection.findings.map(finding => (
                    <div key={finding.id} className="finding-item">
                      <div className="finding-info">
                        <FaExclamationTriangle className={`severity-icon ${finding.severity}`} />
                        <span>{finding.description}</span>
                      </div>
                      <span className={`finding-status ${finding.status}`}>{finding.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="inspection-card-footer">
              <button className="edit-button">수정</button>
              <button className="delete-button">삭제</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SafetyList; 