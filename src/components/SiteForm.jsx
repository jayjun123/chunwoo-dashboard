import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import '../styles/SiteForm.css';

const SiteForm = ({ site, onSubmit, onCancel }) => {
  const { isDarkMode } = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    type: '하도급',
    company: '',
    total: '',
    progressStatus: '진행상황',
    progressPercent: 0,
    startDate: '',
    endDate: '',
    manager: '',
    phone: '',
    address: '',
    description: '',
    team: '',
    isFavorite: false
  });
  const [items, setItems] = useState(site?.items || []);
  const [newItem, setNewItem] = useState({ name: '', qty: '', price: '' });
  const [isEditMode, setIsEditMode] = useState(!site);

  useEffect(() => {
    if (site) {
      setFormData(site);
      setItems(site.items || []);
      setIsEditMode(false);
    }
  }, [site]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleItemChange = (e) => {
    const { name, value } = e.target;
    setNewItem(prev => ({ ...prev, [name]: value }));
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newItem.name) return;
    setItems(prev => [...prev, { ...newItem, id: Date.now() }]);
    setNewItem({ name: '', qty: '', price: '' });
  };

  const handleDeleteItem = (id) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...formData, isFavorite: !!formData.isFavorite, items });
  };

  return (
    <div className={`site-form ${isDarkMode ? 'dark' : 'light'}`}>
      <h2>{site ? '현장 수정' : '현장 등록'}</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group full-width" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              name="isFavorite"
              checked={!!formData.isFavorite}
              onChange={e => setFormData(prev => ({ ...prev, isFavorite: e.target.checked }))}
              disabled={!isEditMode}
              style={{ width: 18, height: 18 }}
            />
            <label style={{ fontWeight: 600, color: '#1976d2' }}>주요현장(별표)</label>
          </div>
          <div className="form-group">
            <label>현장명</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              disabled={!isEditMode}
            />
          </div>
          
          <div className="form-group">
            <label>계약구분</label>
            <select name="type" value={formData.type} onChange={handleChange} disabled={!isEditMode}>
              <option value="공사">공사</option>
              <option value="용역">용역</option>
              <option value="기타">기타</option>
            </select>
          </div>

          <div className="form-group">
            <label>회사명</label>
            <input
              type="text"
              name="company"
              value={formData.company}
              onChange={handleChange}
              disabled={!isEditMode}
            />
          </div>

          <div className="form-group">
            <label>계약금액</label>
            <input
              type="number"
              name="total"
              value={formData.total}
              onChange={handleChange}
              required
              disabled={!isEditMode}
            />
          </div>

          <div className="form-group">
            <label>시작일</label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              required
              disabled={!isEditMode}
            />
          </div>

          <div className="form-group">
            <label>종료일</label>
            <input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              required
              disabled={!isEditMode}
            />
          </div>

          <div className="form-group">
            <label>주소</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              disabled={!isEditMode}
            />
          </div>

          <div className="form-group">
            <label>담당자</label>
            <input
              type="text"
              name="manager"
              value={formData.manager}
              onChange={handleChange}
              disabled={!isEditMode}
            />
          </div>

          <div className="form-group">
            <label>시공팀</label>
            <input
              type="text"
              name="team"
              value={formData.team}
              onChange={handleChange}
              disabled={!isEditMode}
            />
          </div>

          <div className="form-group">
            <label>연락처</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              disabled={!isEditMode}
            />
          </div>

          <div className="form-group">
            <label>이메일</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              disabled={!isEditMode}
            />
          </div>

          <div className="form-group full-width">
            <label>설명</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              disabled={!isEditMode}
            />
          </div>

          <div className="form-group">
            <label>진행상태</label>
            <select name="progressStatus" value={formData.progressStatus} onChange={handleChange}>
              <option value="진행상황">진행상황</option>
              <option value="진행중">진행중</option>
              <option value="완료">완료</option>
            </select>
          </div>

          <div className="form-group">
            <label>진행률 (%)</label>
            <input
              type="number"
              name="progressPercent"
              value={formData.progressPercent}
              onChange={handleChange}
              min="0"
              max="100"
              disabled={!isEditMode}
            />
          </div>

          <div className="form-group">
            <label>선급금</label>
            <input
              type="number"
              name="advance"
              value={formData.advance || ''}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>전체기성</label>
            <input
              type="number"
              name="totalProgress"
              value={formData.totalProgress || ''}
              onChange={handleChange}
            />
          </div>

          <div className="form-group full-width">
            <label>세부 항목 리스트</label>
            <table className="item-table">
              <thead>
                <tr>
                  <th>항목명</th>
                  <th>물량</th>
                  <th>단가</th>
                  <th>삭제</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.qty}</td>
                    <td>{item.price}</td>
                    <td><button type="button" onClick={() => handleDeleteItem(item.id)}>삭제</button></td>
                  </tr>
                ))}
                <tr>
                  <td><input name="name" value={newItem.name} onChange={handleItemChange} placeholder="항목명" /></td>
                  <td><input name="qty" value={newItem.qty} onChange={handleItemChange} placeholder="물량" /></td>
                  <td><input name="price" value={newItem.price} onChange={handleItemChange} placeholder="단가" /></td>
                  <td><button type="button" onClick={handleAddItem}>행 추가</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="form-actions">
          {!isEditMode && (
            <button type="button" className="edit-btn" onClick={() => setIsEditMode(true)}>
              수정하기
            </button>
          )}
          {isEditMode && (
            <button type="submit" className="submit-btn">
              저장
            </button>
          )}
          <button type="button" className="cancel-btn" onClick={onCancel}>
            취소
          </button>
          <button type="button" className="progress-btn">
            기성현황
          </button>
        </div>
      </form>
    </div>
  );
};

export default SiteForm; 