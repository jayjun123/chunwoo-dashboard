import React, { useState } from 'react';
import StatusReport from './StatusReport';
import DiscussionReport from './DiscussionReport';
import VendorReport from './VendorReport';
import ProgressReport from './ProgressReport';
import "../../styles/Reports.css";

const tabList = [
  { key: 'status', label: '현황보고서' },
  { key: 'discussion', label: '협의보고서' },
  { key: 'vendor', label: '거래처현황보고서' },
  { key: 'progress', label: '기성현황보고서' },
];

export default function Reports() {
  const [tab, setTab] = useState('status');
  return (
    <div className="report-root" style={{ background: '#fff', minHeight: '100vh', padding: 0 }}>
      <div className="report-tabs" style={{ display: 'flex', gap: 8, borderBottom: '2px solid #eee', background: '#fff', padding: '0 32px' }}>
        {tabList.map(t => (
          <button key={t.key} className={tab === t.key ? 'active' : ''} style={{ background: tab === t.key ? '#222' : '#eee', color: tab === t.key ? '#fff' : '#222', border: 'none', borderRadius: '8px 8px 0 0', padding: '8px 24px', fontWeight: 700, fontSize: 17, cursor: 'pointer' }} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>
      <div className="report-content" style={{ background: '#181b22', minHeight: 600, borderRadius: 18, margin: '0 32px 32px 32px', padding: 32 }}>
        {tab === 'status' && <StatusReport />}
        {tab === 'discussion' && <DiscussionReport />}
        {tab === 'vendor' && <VendorReport />}
        {tab === 'progress' && <ProgressReport />}
      </div>
    </div>
  );
} 