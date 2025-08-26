import React, { useState } from 'react';
import { useSites } from '../contexts/SiteContext';
import { useTheme } from '../contexts/ThemeContext';

function ConstructionList() {
  const { sites, deleteSites } = useSites();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);

  const bgColor = isDark ? '#181c23' : '#f5f6fa';
  const cardColor = isDark ? '#232733' : '#fff';
  const textColor = isDark ? '#fff' : '#222';
  const borderColor = isDark ? '#333' : '#ddd';
  const tableHeadBg = isDark ? '#232733' : '#e9ecef';
  const tableRowHover = isDark ? '#4cafef33' : '#e3f2fd';
  const inputBg = isDark ? '#232733' : '#fff';

  // 검색 필터링
  const filtered = sites.filter(site =>
    site.name.includes(search) ||
    site.manager.includes(search) ||
    site.address.includes(search)
  );

  // 최신순 정렬 (createdAt 또는 id 기준)
  const sortedSites = [...filtered].sort((a, b) => {
    // createdAt이 있으면 createdAt 기준으로 정렬
    if (a.createdAt && b.createdAt) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
    // createdAt이 없으면 id 기준으로 정렬 (Firebase ID는 시간순으로 생성됨)
    return b.id.localeCompare(a.id);
  });

  const handleSelect = id => {
    setSelected(sel => sel.includes(id) ? sel.filter(s => s !== id) : [...sel, id]);
  };
  const handleSelectAll = () => {
    if (selected.length === sortedSites.length) setSelected([]);
    else setSelected(sortedSites.map(s => s.id));
  };
  const handleDeleteSelected = () => {
    if (selected.length > 0) {
      deleteSites(selected);
      setSelected([]);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 0 0 0', minHeight: '80vh', fontFamily: 'Pretendard, sans-serif', background: bgColor }}>
      <div style={{ background: cardColor, borderRadius: 16, padding: 32, marginTop: 40, boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.10)' : '0 2px 12px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ color: textColor, fontWeight: 700, fontSize: 20, margin: 0 }}>전체 현장 리스트 (데이터베이스 1번)</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ background: '#4cafef', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 18px', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>양식 다운로드</button>
            <button style={{ background: '#4cafef', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 18px', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>업로드</button>
            <button style={{ background: '#4caf50', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 18px', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>선택 내보내기</button>
            <button onClick={handleDeleteSelected} style={{ background: '#ffb74d', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 18px', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>선택 삭제</button>
            <button style={{ background: '#888', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 18px', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>돌아가기</button>
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <input
            type="text"
            placeholder="현장명, 담당자, 시공팀 검색"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 320, padding: 10, borderRadius: 6, border: `1px solid ${borderColor}`, background: inputBg, color: textColor, fontSize: 15 }}
          />
        </div>
        <table style={{ width: '100%', background: bgColor, color: textColor, borderRadius: 8 }}>
          <thead>
            <tr style={{ background: tableHeadBg }}>
              <th style={{ padding: 8 }}><input type="checkbox" checked={selected.length === sortedSites.length && sortedSites.length > 0} onChange={handleSelectAll} /></th>
              <th style={{ padding: 8, fontWeight: 700, fontSize: 15 }}>현장명</th>
              <th style={{ padding: 8, fontWeight: 700, fontSize: 15 }}>상태</th>
              <th style={{ padding: 8, fontWeight: 700, fontSize: 15 }}>착공일</th>
              <th style={{ padding: 8, fontWeight: 700, fontSize: 15 }}>준공예정일</th>
              <th style={{ padding: 8, fontWeight: 700, fontSize: 15 }}>계약구분</th>
              <th style={{ padding: 8, fontWeight: 700, fontSize: 15 }}>계약금액</th>
              <th style={{ padding: 8, fontWeight: 700, fontSize: 15 }}>주소</th>
              <th style={{ padding: 8, fontWeight: 700, fontSize: 15 }}>담당자(소장)</th>
              <th style={{ padding: 8, fontWeight: 700, fontSize: 15 }}>연락처</th>
              <th style={{ padding: 8, fontWeight: 700, fontSize: 15 }}>내용</th>
            </tr>
          </thead>
          <tbody>
            {sortedSites.map(site => (
              <tr key={site.id} style={{ borderBottom: `1px solid ${borderColor}`, background: selected.includes(site.id) ? tableRowHover : undefined }}>
                <td style={{ padding: 8 }}><input type="checkbox" checked={selected.includes(site.id)} onChange={() => handleSelect(site.id)} /></td>
                <td style={{ padding: 8 }}>{site.name}</td>
                <td style={{ padding: 8 }}>{site.status}</td>
                <td style={{ padding: 8 }}>{site.start}</td>
                <td style={{ padding: 8 }}>{site.end}</td>
                <td style={{ padding: 8 }}>{site.type}</td>
                <td style={{ padding: 8 }}>{site.contract.toLocaleString()}</td>
                <td style={{ padding: 8 }}>{site.address}</td>
                <td style={{ padding: 8 }}>{site.manager}</td>
                <td style={{ padding: 8 }}>{site.contact}</td>
                <td style={{ padding: 8 }}>{site.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ConstructionList; 