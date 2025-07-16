import React from 'react';
export default function ProgressReport() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 24, marginBottom: 32 }}>
      <div style={{ background: '#232733', borderRadius: 16, padding: 24, color: '#fff', height: 260 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>기성금액 추이 (차트 자리)</div>
        <div style={{ height: 120, background: '#181b22', borderRadius: 8, margin: '18px 0' }} />
        <div>총 기성: <b>₩ 32,690,000</b></div>
      </div>
      <div style={{ background: '#232733', borderRadius: 16, padding: 24, color: '#fff', height: 260 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>진행률 (도넛차트 자리)</div>
        <div style={{ height: 120, background: '#181b22', borderRadius: '50%', margin: '18px auto', width: 120 }} />
        <div>진행률: <b>78%</b></div>
      </div>
      <div style={{ background: '#232733', borderRadius: 16, padding: 24, color: '#fff', height: 260 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>현장별 기성 (막대차트 자리)</div>
        <div style={{ height: 120, background: '#181b22', borderRadius: 8, margin: '18px 0' }} />
        <div>현장 수: <b>12</b></div>
      </div>
      <div style={{ gridColumn: '1/4', background: '#232733', borderRadius: 16, padding: 24, color: '#fff', marginTop: 24 }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>기성 상세 내역 (표 자리)</div>
        <div style={{ background: '#181b22', borderRadius: 8, minHeight: 80, padding: 16 }}>표/리스트 영역</div>
      </div>
    </div>
  );
} 