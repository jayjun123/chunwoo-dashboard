import React, { useState } from 'react';

function ConstructionDetail() {
  // 더미 데이터
  const [site, setSite] = useState({
    name: '현장A',
    type: '하도급',
    status: '진행중',
    contract: 50000000,
    advance: 0,
    start: '2025-05-05',
    end: '2025-06-05',
    address: '대구 달서구',
    desc: '',
    manager: '',
    contact: '',
    items: [
      { id: 1, name: '24톤트럭', qty: 800, price: 63000 }
    ]
  });
  const [newItem, setNewItem] = useState({ name: '', qty: '', price: '' });

  const handleChange = e => {
    setSite({ ...site, [e.target.name]: e.target.value });
  };
  const handleItemChange = e => {
    setNewItem({ ...newItem, [e.target.name]: e.target.value });
  };
  const handleAddItem = () => {
    if (!newItem.name) return;
    setSite({
      ...site,
      items: [...site.items, { ...newItem, id: Date.now() }]
    });
    setNewItem({ name: '', qty: '', price: '' });
  };
  const handleDeleteItem = id => {
    setSite({ ...site, items: site.items.filter(i => i.id !== id) });
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '40px 32px 0 32px', minHeight: '80vh', fontFamily: 'Pretendard, sans-serif', background: '#181c23' }}>
      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', marginTop: 40 }}>
        {/* 왼쪽: 현장 목록 */}
        <div style={{ flex: '0 0 20%', minWidth: 220, maxWidth: 280 }}>
          <div style={{ background: '#232733', padding: 20, borderRadius: 10 }}>
            <h2 style={{ color: '#fff', marginBottom: 16, fontWeight: 700, fontSize: 18 }}>현장 목록</h2>
            <div style={{ color: '#fff', marginBottom: 8, padding: '8px 0', borderRadius: 6, background: '#181c23', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>현장A</div>
            <div style={{ color: '#fff', marginBottom: 8, padding: '8px 0', borderRadius: 6, background: '#181c23', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>현장B</div>
            <div style={{ color: '#fff', marginBottom: 8, padding: '8px 0', borderRadius: 6, background: '#181c23', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>현장C</div>
            <button style={{ width: '100%', marginTop: 12, background: '#4cafef', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 0', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>+ 새 현장</button>
          </div>
        </div>
        {/* 오른쪽: 상세 정보 */}
        <div style={{ flex: '1 1 80%', minWidth: 400, background: '#232733', borderRadius: 12, padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.10)' }}>
          <div style={{ width: '100%', maxWidth: 700 }}>
            <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 22, marginBottom: 24 }}>현장 상세 정보</h2>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ color: '#aaa', fontSize: 14 }}>현장명</label>
                <input name="name" value={site.name} onChange={handleChange} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #333', background: '#181c23', color: '#fff', fontSize: 15, marginBottom: 8 }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ color: '#aaa', fontSize: 14 }}>계약구분</label>
                <select name="type" value={site.type} onChange={handleChange} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #333', background: '#181c23', color: '#fff', fontSize: 15, marginBottom: 8 }}>
                  <option value="하도급">하도급</option>
                  <option value="직영">직영</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ color: '#aaa', fontSize: 14 }}>현장상황</label>
                <select name="status" value={site.status} onChange={handleChange} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #333', background: '#181c23', color: '#fff', fontSize: 15, marginBottom: 8 }}>
                  <option value="진행중">진행중</option>
                  <option value="완료">완료</option>
                  <option value="보류">보류</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ color: '#aaa', fontSize: 14 }}>계약금액</label>
                <input name="contract" value={site.contract} onChange={handleChange} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #333', background: '#181c23', color: '#fff', fontSize: 15, marginBottom: 8 }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ color: '#aaa', fontSize: 14 }}>선급금</label>
                <input name="advance" value={site.advance} onChange={handleChange} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #333', background: '#181c23', color: '#fff', fontSize: 15, marginBottom: 8 }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ color: '#aaa', fontSize: 14 }}>착공일</label>
                <input name="start" type="date" value={site.start} onChange={handleChange} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #333', background: '#181c23', color: '#fff', fontSize: 15, marginBottom: 8 }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ color: '#aaa', fontSize: 14 }}>준공예정일</label>
                <input name="end" type="date" value={site.end} onChange={handleChange} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #333', background: '#181c23', color: '#fff', fontSize: 15, marginBottom: 8 }} />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#aaa', fontSize: 14 }}>현장 주소</label>
              <input name="address" value={site.address} onChange={handleChange} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #333', background: '#181c23', color: '#fff', fontSize: 15, marginBottom: 8 }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#aaa', fontSize: 14 }}>현장 설명</label>
              <textarea name="desc" value={site.desc} onChange={handleChange} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #333', background: '#181c23', color: '#fff', fontSize: 15, minHeight: 60, marginBottom: 8 }} />
            </div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ color: '#aaa', fontSize: 14 }}>담당자(소장)</label>
                <input name="manager" value={site.manager} onChange={handleChange} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #333', background: '#181c23', color: '#fff', fontSize: 15, marginBottom: 8 }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ color: '#aaa', fontSize: 14 }}>연락처</label>
                <input name="contact" value={site.contact} onChange={handleChange} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #333', background: '#181c23', color: '#fff', fontSize: 15, marginBottom: 8 }} />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#aaa', fontSize: 14 }}>내용</label>
              <table style={{ width: '100%', background: '#181c23', color: '#fff', borderRadius: 8, marginBottom: 8 }}>
                <thead>
                  <tr style={{ background: '#232733' }}>
                    <th style={{ padding: 8, fontWeight: 700, fontSize: 15 }}>항목</th>
                    <th style={{ padding: 8, fontWeight: 700, fontSize: 15 }}>물량</th>
                    <th style={{ padding: 8, fontWeight: 700, fontSize: 15 }}>단가</th>
                    <th style={{ padding: 8 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {site.items.map(i => (
                    <tr key={i.id}>
                      <td style={{ padding: 8 }}>{i.name}</td>
                      <td style={{ padding: 8 }}>{i.qty}</td>
                      <td style={{ padding: 8 }}>{i.price}</td>
                      <td style={{ padding: 8 }}><button onClick={() => handleDeleteItem(i.id)} style={{ background: '#ff4d4d', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>삭제</button></td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ padding: 8 }}><input name="name" value={newItem.name} onChange={handleItemChange} style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid #333', background: '#232733', color: '#fff', fontSize: 14 }} /></td>
                    <td style={{ padding: 8 }}><input name="qty" value={newItem.qty} onChange={handleItemChange} style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid #333', background: '#232733', color: '#fff', fontSize: 14 }} /></td>
                    <td style={{ padding: 8 }}><input name="price" value={newItem.price} onChange={handleItemChange} style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid #333', background: '#232733', color: '#fff', fontSize: 14 }} /></td>
                    <td style={{ padding: 8 }}><button onClick={handleAddItem} style={{ background: '#4cafef', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>+ 행 추가</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'flex-end' }}>
              <button style={{ background: '#4caf50', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 28px', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>저장하기</button>
              <button style={{ background: '#4cafef', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 28px', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>기성현황</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConstructionDetail; 