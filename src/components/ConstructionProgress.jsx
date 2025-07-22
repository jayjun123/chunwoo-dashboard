import React, { useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { formatContractAmount, formatGisungAmount, formatAdvanceAmount } from '../utils/formatUtils';
ChartJS.register(ArcElement, Tooltip, Legend);

const sampleSites = [
  { name: '현장A', contract: 100000000, progress: 30000000, advance: 10000000 },
  { name: '현장B', contract: 80000000, progress: 50000000, advance: 20000000 },
  { name: '현장C', contract: 120000000, progress: 70000000, advance: 30000000 },
];

export default function ConstructionProgress() {
  const [search, setSearch] = useState('');
  const filtered = sampleSites.filter(site => site.name.includes(search));
  const site = filtered[0] || sampleSites[0];

  const donutData = {
    labels: ['기성금', '잔여금'],
    datasets: [
      {
        data: [site.progress, site.contract - site.progress],
        backgroundColor: ['#43a047', '#232837'],
        borderWidth: 2,
      },
    ],
  };

  return (
    <div style={{ background: '#181c24', borderRadius: 16, padding: 32, maxWidth: 900, margin: '32px auto', color: '#fff', boxShadow: '0 2px 16px rgba(0,0,0,0.12)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <input
          type="text"
          placeholder="현장명 검색"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #333', background: '#232837', color: '#fff', fontSize: 16, minWidth: 180 }}
        />
        <span style={{ fontWeight: 600, fontSize: 20 }}>{site.name}</span>
      </div>
      <div style={{ display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* 데이터 카드 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: '#232837', borderRadius: 10, padding: '16px 24px', minWidth: 180 }}>
            <div style={{ color: '#90caf9', fontSize: 14 }}>계약금액</div>
            <div style={{ fontWeight: 700, fontSize: 20 }}>{formatContractAmount(site.contract)}</div>
          </div>
          <div style={{ background: '#232837', borderRadius: 10, padding: '16px 24px', minWidth: 180 }}>
            <div style={{ color: '#90caf9', fontSize: 14 }}>누적 기성금</div>
            <div style={{ fontWeight: 700, fontSize: 20 }}>{formatGisungAmount(site.progress)}</div>
          </div>
          <div style={{ background: '#232837', borderRadius: 10, padding: '16px 24px', minWidth: 180 }}>
            <div style={{ color: '#90caf9', fontSize: 14 }}>선급금</div>
            <div style={{ fontWeight: 700, fontSize: 20 }}>{formatAdvanceAmount(site.advance)}</div>
          </div>
        </div>
        {/* 도넛형 그래프 */}
        <div style={{ background: '#232837', borderRadius: 16, padding: 24, minWidth: 260, maxWidth: 320, width: '100%' }}>
          <Doughnut data={donutData} options={{ plugins: { legend: { labels: { color: '#fff', font: { size: 16 } } } } }} />
          <div style={{ textAlign: 'center', marginTop: 12, color: '#90caf9', fontWeight: 600 }}>
            계약금 대비 기성금 비율: {Math.round((site.progress / site.contract) * 100)}%
          </div>
        </div>
      </div>
      {/* 상세 테이블 */}
      <div style={{ marginTop: 32 }}>
        <table style={{ width: '100%', background: '#232837', borderRadius: 10, color: '#fff', fontSize: 15, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#181c24', color: '#90caf9' }}>
              <th style={{ padding: 10 }}>현장명</th>
              <th style={{ padding: 10 }}>계약금액</th>
              <th style={{ padding: 10 }}>선급금</th>
              <th style={{ padding: 10 }}>누적기성</th>
              <th style={{ padding: 10 }}>기성비율</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, idx) => (
              <tr key={idx} style={{ borderTop: '1px solid #333' }}>
                <td style={{ padding: 10 }}>{s.name}</td>
                <td style={{ padding: 10 }}>{formatContractAmount(s.contract)}</td>
                <td style={{ padding: 10 }}>{formatAdvanceAmount(s.advance)}</td>
                <td style={{ padding: 10 }}>{formatGisungAmount(s.progress)}</td>
                <td style={{ padding: 10 }}>{Math.round((s.progress / s.contract) * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 