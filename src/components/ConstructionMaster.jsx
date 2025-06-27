import React, { useState } from 'react';
import { useSites } from '../contexts/SiteContext';
import { useTheme } from '../contexts/ThemeContext';

const statusList = ['진행중', '예정', '완료', '미정'];

function ConstructionMaster() {
  const { sites } = useSites();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [status, setStatus] = useState('진행중');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  // 스타일 변수
  const bgColor = isDark ? '#181c23' : '#f5f6fa';
  const cardColor = isDark ? '#232733' : '#fff';
  const textColor = isDark ? '#fff' : '#222';
  const borderColor = isDark ? '#333' : '#ddd';
  const tableHeadBg = isDark ? '#232733' : '#e9ecef';
  const tableRowHover = isDark ? '#4cafef33' : '#e3f2fd';
  const inputBg = isDark ? '#232733' : '#fff';

  const filtered = sites.filter(site =>
    site.status === status &&
    (site.name.includes(search) || site.company.includes(search) || site.team.includes(search))
  );
  const selectedSite = sites.find(s => s.id === selectedId) || filtered[0];

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '40px 32px 0 32px', minHeight: '80vh', fontFamily: 'Pretendard, sans-serif', background: bgColor }}>
      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', marginTop: 40 }}>
        {/* 왼쪽: 상태별 버튼/검색/테이블 */}
        <div style={{ flex: '0 0 28%', minWidth: 260, maxWidth: 340 }}>
          <div style={{ background: cardColor, padding: 20, borderRadius: 10, color: textColor }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {statusList.map(s => (
                <button key={s} onClick={() => setStatus(s)} style={{ background: status === s ? '#4cafef' : cardColor, color: textColor, border: `1px solid #4cafef`, borderRadius: 6, padding: '7px 14px', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>{s}</button>
              ))}
            </div>
            <input
              type="text"
              placeholder="현장명/회사/시공팀 검색"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', marginBottom: 16, padding: 10, borderRadius: 6, border: `1px solid ${borderColor}`, background: inputBg, color: textColor, fontSize: 15 }}
            />
            <table style={{ width: '100%', background: bgColor, color: textColor, borderRadius: 8 }}>
              <thead>
                <tr style={{ background: tableHeadBg }}>
                  <th style={{ padding: 8, fontWeight: 700, fontSize: 15 }}>현장명</th>
                  <th style={{ padding: 8, fontWeight: 700, fontSize: 15 }}>회사</th>
                  <th style={{ padding: 8, fontWeight: 700, fontSize: 15 }}>시공팀</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(site => (
                  <tr key={site.id} style={{ borderBottom: `1px solid ${borderColor}`, cursor: 'pointer', background: selectedId === site.id ? tableRowHover : undefined }} onClick={() => setSelectedId(site.id)}>
                    <td style={{ padding: 8 }}>{site.name}</td>
                    <td style={{ padding: 8 }}>{site.company}</td>
                    <td style={{ padding: 8 }}>{site.team}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {/* 오른쪽: 세부내역 */}
        <div style={{ flex: '1 1 72%', minWidth: 400, background: cardColor, borderRadius: 12, padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.10)' : '0 2px 12px rgba(0,0,0,0.04)', position: 'relative', color: textColor }}>
          <button style={{ position: 'absolute', top: 32, right: 32, background: '#4cafef', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>전체 리스트</button>
          {selectedSite ? (
            <div style={{ width: '100%', maxWidth: 700 }}>
              <h2 style={{ color: textColor, fontWeight: 700, fontSize: 22, marginBottom: 24 }}>현장 상세 정보</h2>
              <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ color: '#aaa', fontSize: 14 }}>현장명</label>
                  <input value={selectedSite.name} readOnly style={{ width: '100%', padding: 8, borderRadius: 6, border: `1px solid ${borderColor}`, background: inputBg, color: textColor, fontSize: 15, marginBottom: 8 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ color: '#aaa', fontSize: 14 }}>회사</label>
                  <input value={selectedSite.company} readOnly style={{ width: '100%', padding: 8, borderRadius: 6, border: `1px solid ${borderColor}`, background: inputBg, color: textColor, fontSize: 15, marginBottom: 8 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ color: '#aaa', fontSize: 14 }}>시공팀</label>
                  <input value={selectedSite.team} readOnly style={{ width: '100%', padding: 8, borderRadius: 6, border: `1px solid ${borderColor}`, background: inputBg, color: textColor, fontSize: 15, marginBottom: 8 }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ color: '#aaa', fontSize: 14 }}>상태</label>
                  <input value={selectedSite.status} readOnly style={{ width: '100%', padding: 8, borderRadius: 6, border: `1px solid ${borderColor}`, background: inputBg, color: textColor, fontSize: 15, marginBottom: 8 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ color: '#aaa', fontSize: 14 }}>계약구분</label>
                  <input value={selectedSite.type} readOnly style={{ width: '100%', padding: 8, borderRadius: 6, border: `1px solid ${borderColor}`, background: inputBg, color: textColor, fontSize: 15, marginBottom: 8 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ color: '#aaa', fontSize: 14 }}>계약금액</label>
                  <input value={selectedSite.contract.toLocaleString()} readOnly style={{ width: '100%', padding: 8, borderRadius: 6, border: `1px solid ${borderColor}`, background: inputBg, color: textColor, fontSize: 15, marginBottom: 8 }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ color: '#aaa', fontSize: 14 }}>착공일</label>
                  <input value={selectedSite.start} readOnly style={{ width: '100%', padding: 8, borderRadius: 6, border: `1px solid ${borderColor}`, background: inputBg, color: textColor, fontSize: 15, marginBottom: 8 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ color: '#aaa', fontSize: 14 }}>준공예정일</label>
                  <input value={selectedSite.end} readOnly style={{ width: '100%', padding: 8, borderRadius: 6, border: `1px solid ${borderColor}`, background: inputBg, color: textColor, fontSize: 15, marginBottom: 8 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ color: '#aaa', fontSize: 14 }}>주소</label>
                  <input value={selectedSite.address} readOnly style={{ width: '100%', padding: 8, borderRadius: 6, border: `1px solid ${borderColor}`, background: inputBg, color: textColor, fontSize: 15, marginBottom: 8 }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ color: '#aaa', fontSize: 14 }}>담당자(소장)</label>
                  <input value={selectedSite.manager} readOnly style={{ width: '100%', padding: 8, borderRadius: 6, border: `1px solid ${borderColor}`, background: inputBg, color: textColor, fontSize: 15, marginBottom: 8 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ color: '#aaa', fontSize: 14 }}>연락처</label>
                  <input value={selectedSite.contact} readOnly style={{ width: '100%', padding: 8, borderRadius: 6, border: `1px solid ${borderColor}`, background: inputBg, color: textColor, fontSize: 15, marginBottom: 8 }} />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: '#aaa', fontSize: 14 }}>내용</label>
                <textarea value={selectedSite.desc} readOnly style={{ width: '100%', padding: 8, borderRadius: 6, border: `1px solid ${borderColor}`, background: isDark ? '#232733' : '#f8f9fa', color: textColor, fontSize: 15, minHeight: 60, marginBottom: 8 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 32 }}>
                <button style={{ background: '#4cafef', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 28px', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>기성현황</button>
              </div>
            </div>
          ) : (
            <div style={{ color: '#aaa', fontSize: 18, marginTop: 80 }}>현장을 선택하세요.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ConstructionMaster; 