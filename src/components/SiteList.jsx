import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import '../styles/SiteList.css';

const STATUS_COLORS = {
  '진행중': '#4caf50',
  '예정': '#2196f3',
  '완료': '#9c27b0',
  '미정': '#ff9800'
};

const SiteList = ({ sites, onSiteClick, onSiteEdit, onSiteDelete, showAddInput = true }) => {
  const { isDarkMode } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filteredSites, setFilteredSites] = useState(sites);
  const [addItem, setAddItem] = useState('');
  const [addList, setAddList] = useState([]);
  const [customColors, setCustomColors] = useState({});

  useEffect(() => {
    let result = [...sites];

    // 현재 달에 하루라도 포함되는 현장만 필터링
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const isInMonth = (site) => {
      if (!site.startDate || !site.endDate) return false;
      const s = new Date(site.startDate);
      const e = new Date(site.endDate);
      const first = new Date(year, month, 1);
      const last = new Date(year, month + 1, 0);
      return !(e < first || s > last);
    };
    result = result.filter(isInMonth).filter(site => {
      const term = searchTerm.toLowerCase();
      return (
        site.name?.toLowerCase().includes(term) ||
        site.company?.toLowerCase().includes(term) ||
        site.manager?.toLowerCase().includes(term)
      );
    });

    // 상태 필터링
    if (statusFilter !== 'all') {
      result = result.filter(site => site.progressStatus === statusFilter);
    }

    // 정렬
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'startDate':
          comparison = new Date(a.startDate) - new Date(b.startDate);
          break;
        case 'endDate':
          comparison = new Date(a.endDate) - new Date(b.endDate);
          break;
        case 'total':
          comparison = (a.total || 0) - (b.total || 0);
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredSites(result);
  }, [sites, searchTerm, statusFilter, sortBy, sortOrder]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getStatusColor = (status) => {
    return customColors[status] || STATUS_COLORS[status] || '#4caf50';
  };

  const handleColorChange = (status, color) => {
    setCustomColors(prev => ({
      ...prev,
      [status]: color
    }));
  };

  // 추가사항 입력 핸들러
  const handleAddItem = () => {
    if (!addItem.trim()) return;
    setAddList([...addList, addItem.trim()]);
    setAddItem('');
  };
  const handleAddKeyDown = (e) => {
    if (e.key === 'Enter') handleAddItem();
  };
  // 드래그앤드롭 (간단 구현)
  const handleDragStart = (e, idx) => {
    e.dataTransfer.setData('text/plain', idx);
  };
  const handleDrop = (e, idx) => {
    const fromIdx = Number(e.dataTransfer.getData('text/plain'));
    if (fromIdx === idx) return;
    const newList = [...addList];
    const [moved] = newList.splice(fromIdx, 1);
    newList.splice(idx, 0, moved);
    setAddList(newList);
  };
  const handleDragOver = (e) => e.preventDefault();
  const handleDeleteItem = (idx) => {
    setAddList(addList.filter((_, i) => i !== idx));
  };

  return (
    <div className={`site-list ${isDarkMode ? 'dark' : 'light'}`} style={{ display: 'flex', flexDirection: 'column', width: 'auto', maxWidth: '100%', minWidth: 0, padding: 0, margin: 0, boxSizing: 'border-box' }}>
      {/* 상단 제목/소제목 */}
      <div style={{ marginBottom: 8, textAlign: 'left', padding: 0 }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 4 }}>공사현황</div>
        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#90caf9', marginBottom: 4 }}>진행중 현장 LIST</div>
        {/* 검색창 */}
        <div style={{ marginBottom: 4 }}>
          <input
            type="text"
            placeholder="현장명, 회사명, 소장명 검색"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '90%', minWidth: 0, maxWidth: '100%', padding: 4, borderRadius: 4, border: '1px solid #ccc', background: '#232734', color: '#fff', fontSize: '0.9rem' }}
          />
        </div>
        {/* 색상 설정 */}
        <div style={{ marginBottom: 4, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.keys(STATUS_COLORS).map(status => (
            <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: '0.8rem', color: '#fff' }}>{status}:</span>
              <input
                type="color"
                value={getStatusColor(status)}
                onChange={(e) => handleColorChange(status, e.target.value)}
                style={{ width: 24, height: 24, padding: 0, border: 'none', borderRadius: 4 }}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="site-list-table" style={{ padding: 0, margin: 0 }}>
        <table style={{ width: 'auto', minWidth: 0, maxWidth: '100%' }}>
          <tbody>
            {filteredSites.map((site) => (
              <tr key={site.id}>
                <td 
                  className="site-name" 
                  onClick={() => onSiteClick(site)} 
                  style={{ 
                    cursor: 'pointer', 
                    padding: '4px 8px', 
                    fontSize: '0.95rem', 
                    color: '#fff', 
                    background: getStatusColor(site.status || '진행중'),
                    border: 'none', 
                    textAlign: 'left',
                    borderRadius: 4,
                    marginBottom: 4
                  }}
                >
                  {site.name?.slice(0, 12) || ''} ({site.status || '진행중'})
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* 리스트 아래 추가사항 입력칸 */}
      {showAddInput && (
        <div style={{ marginTop: 8, textAlign: 'left', padding: 0 }}>
          <div style={{ fontWeight: 600, marginBottom: 4, color: '#fff', fontSize: '0.95rem', textAlign: 'left' }}>추가사항</div>
          <div style={{ display: 'flex', gap: 4 }}>
            <input
              type="text"
              placeholder="추가사항 입력"
              value={addItem}
              onChange={e => setAddItem(e.target.value)}
              onKeyDown={handleAddKeyDown}
              style={{ width: '90%', minWidth: 0, maxWidth: '100%', padding: 4, borderRadius: 4, border: '1px solid #ccc', background: '#232734', color: '#fff', fontSize: '0.9rem' }}
            />
            <button
              style={{ background: '#3578ff', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 700, fontSize: '1rem', minWidth: 28, minHeight: 28, cursor: 'pointer', padding: 0 }}
              onClick={handleAddItem}
            >+
            </button>
          </div>
          {/* 추가사항 리스트 (드래그앤드롭) */}
          <div style={{ marginTop: 4 }}>
            {addList.map((item, idx) => (
              <div
                key={idx}
                draggable
                onDragStart={e => handleDragStart(e, idx)}
                onDrop={e => handleDrop(e, idx)}
                onDragOver={handleDragOver}
                style={{
                  background: '#232734',
                  color: '#fff',
                  borderRadius: 4,
                  padding: '4px 6px',
                  marginBottom: 4,
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'grab',
                  border: '1px solid #3578ff',
                  gap: 4,
                  fontSize: '0.9rem'
                }}
              >
                <span style={{ flex: 1, textAlign: 'left' }}>{item}</span>
                <button onClick={() => handleDeleteItem(idx)} style={{ background: 'none', color: '#ff5252', border: 'none', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', padding: 0 }}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SiteList; 