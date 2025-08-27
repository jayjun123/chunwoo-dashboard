import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaPlus, FaSearch, FaFilter } from 'react-icons/fa';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../firebase';
import '../../styles/SiteList.css';

const SiteList = () => {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [gisungMap, setGisungMap] = useState({}); // siteId별 누계기성값

  const isMobile = window.innerWidth <= 600;

  useEffect(() => {
    const fetchSitesAndGisung = async () => {
      try {
        // 1. 사이트 목록 불러오기
        const sitesQuery = query(
          collection(db, 'sites'),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(sitesQuery);
        const sitesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setSites(sitesData);

        // 2. 모든 siteId에 대해 gisung 합산값과 선급금 포함하여 누계기성값 계산
        const gisungQuery = query(collection(db, 'gisung'));
        const gisungSnap = await getDocs(gisungQuery);
        // siteId별로 누계기성값 합산 (선급금 포함)
        const map = {};
        gisungSnap.forEach(doc => {
          const data = doc.data();
          const siteId = data.siteId;
          const amount = Number(data.gisungAmount || data.currentGisung || 0);
          if (!map[siteId]) map[siteId] = 0;
          map[siteId] += amount;
        });
        
        // 현장별 선급금을 누계기성값에 추가
        sitesData.forEach(site => {
          const advanceAmount = Number(site.advance || 0);
          if (advanceAmount > 0 && map[site.id]) {
            map[site.id] += advanceAmount;
            console.log(`💰 현장 "${site.name}"에 선급금 ${advanceAmount.toLocaleString()}원 추가`);
          }
        });
        
        setGisungMap(map);
      } catch (error) {
        console.error('현장/기성 데이터 조회 실패:', error);
        setSites([]);
        setGisungMap({});
      } finally {
        setLoading(false);
      }
    };
    fetchSitesAndGisung();
  }, []);

  const filteredSites = sites.filter(site => {
    const matchesSearch = site.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         site.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || site.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // 누계기성값(금액) 표시 함수: gisungMap에서 siteId로 조회
  const getCumulativeAmount = (site) => {
    const sum = gisungMap[site.id] || 0;
    return sum > 0 ? sum.toLocaleString() : '0';
  };

  if (loading) {
    return <div className="loading">로딩 중...</div>;
  }

  return (
    <div className="site-list" style={isMobile ? { marginLeft: '4px', marginTop: '200px' } : {}}>
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
              <p><strong>예산:</strong> {site.budget || site.contractAmount?.toLocaleString()}</p>
              <p><strong>누계기성값:</strong> {getCumulativeAmount(site)}원 (선급금 포함)</p>
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