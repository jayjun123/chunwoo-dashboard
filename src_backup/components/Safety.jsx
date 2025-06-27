import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaFilter, FaExclamationTriangle } from 'react-icons/fa';
import './Safety.css';

const Safety = () => {
  const [loading, setLoading] = useState(true);
  const [safetyItems, setSafetyItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState({
    title: '',
    site: '',
    category: 'equipment',
    priority: 'medium',
    status: 'pending',
    description: '',
    reportedBy: '',
    assignedTo: '',
    dueDate: ''
  });

  useEffect(() => {
    // 임시 데이터 로딩
    setTimeout(() => {
      setSafetyItems([
        {
          id: 1,
          title: '안전모 미착용',
          site: '서울역 신축공사',
          category: 'ppe',
          priority: 'high',
          status: 'pending',
          description: '현장 내 안전모 미착용 작업자 발견',
          reportedBy: '김철수',
          assignedTo: '이영희',
          dueDate: '2024-03-25'
        },
        {
          id: 2,
          title: '크레인 점검 필요',
          site: '강남 아파트 리모델링',
          category: 'equipment',
          priority: 'medium',
          status: 'in_progress',
          description: '크레인 와이어 마모 상태 점검 필요',
          reportedBy: '박지민',
          assignedTo: '최준호',
          dueDate: '2024-03-28'
        },
        {
          id: 3,
          title: '비계 설치 불안정',
          site: '서울역 신축공사',
          category: 'scaffolding',
          priority: 'high',
          status: 'completed',
          description: '비계 설치 상태 점검 및 보완 완료',
          reportedBy: '이영희',
          assignedTo: '김철수',
          dueDate: '2024-03-20'
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleStatusFilter = (e) => {
    setSelectedStatus(e.target.value);
  };

  const handleAddItem = () => {
    setEditingItem(null);
    setNewItem({
      title: '',
      site: '',
      category: 'equipment',
      priority: 'medium',
      status: 'pending',
      description: '',
      reportedBy: '',
      assignedTo: '',
      dueDate: ''
    });
    setShowModal(true);
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setNewItem({ ...item });
    setShowModal(true);
  };

  const handleDeleteItem = (itemId) => {
    if (window.confirm('정말로 이 안전 항목을 삭제하시겠습니까?')) {
      setSafetyItems(safetyItems.filter(item => item.id !== itemId));
    }
  };

  const handleSaveItem = () => {
    if (editingItem) {
      setSafetyItems(safetyItems.map(item => 
        item.id === editingItem.id ? { ...newItem, id: item.id } : item
      ));
    } else {
      setSafetyItems([...safetyItems, { ...newItem, id: safetyItems.length + 1 }]);
    }
    setShowModal(false);
  };

  const getCategoryLabel = (category) => {
    switch (category) {
      case 'ppe': return '보호구';
      case 'equipment': return '장비';
      case 'scaffolding': return '비계';
      case 'electrical': return '전기';
      case 'chemical': return '화학물질';
      default: return category;
    }
  };

  const filteredItems = safetyItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.site.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="safety-loading">
        <div className="loading-spinner"></div>
        <p>데이터를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="safety-container">
      <div className="safety-header">
        <h2>안전 관리</h2>
        <button className="add-safety-button" onClick={handleAddItem}>
          <FaPlus /> 안전 항목 추가
        </button>
      </div>

      <div className="safety-filters">
        <div className="search-box">
          <FaSearch />
          <input
            type="text"
            placeholder="제목, 현장, 설명으로 검색..."
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
        <div className="status-filter">
          <FaFilter />
          <select value={selectedStatus} onChange={handleStatusFilter}>
            <option value="all">모든 상태</option>
            <option value="pending">대기중</option>
            <option value="in_progress">진행중</option>
            <option value="completed">완료</option>
          </select>
        </div>
      </div>

      <div className="safety-table">
        <table>
          <thead>
            <tr>
              <th>제목</th>
              <th>현장</th>
              <th>카테고리</th>
              <th>우선순위</th>
              <th>상태</th>
              <th>보고자</th>
              <th>담당자</th>
              <th>기한</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(item => (
              <tr key={item.id}>
                <td>{item.title}</td>
                <td>{item.site}</td>
                <td>
                  <span className={`category-badge ${item.category}`}>
                    {getCategoryLabel(item.category)}
                  </span>
                </td>
                <td>
                  <span className={`priority-badge ${item.priority}`}>
                    {item.priority === 'high' ? '높음' :
                     item.priority === 'medium' ? '중간' : '낮음'}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${item.status}`}>
                    {item.status === 'pending' ? '대기중' :
                     item.status === 'in_progress' ? '진행중' : '완료'}
                  </span>
                </td>
                <td>{item.reportedBy}</td>
                <td>{item.assignedTo}</td>
                <td>{item.dueDate}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="edit-button"
                      onClick={() => handleEditItem(item)}
                    >
                      <FaEdit />
                    </button>
                    <button
                      className="delete-button"
                      onClick={() => handleDeleteItem(item.id)}
                    >
                      <FaTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>{editingItem ? '안전 항목 수정' : '새 안전 항목 추가'}</h3>
            <div className="form-group">
              <label>제목</label>
              <input
                type="text"
                value={newItem.title}
                onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>현장</label>
              <input
                type="text"
                value={newItem.site}
                onChange={(e) => setNewItem({ ...newItem, site: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>카테고리</label>
              <select
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
              >
                <option value="ppe">보호구</option>
                <option value="equipment">장비</option>
                <option value="scaffolding">비계</option>
                <option value="electrical">전기</option>
                <option value="chemical">화학물질</option>
              </select>
            </div>
            <div className="form-group">
              <label>우선순위</label>
              <select
                value={newItem.priority}
                onChange={(e) => setNewItem({ ...newItem, priority: e.target.value })}
              >
                <option value="high">높음</option>
                <option value="medium">중간</option>
                <option value="low">낮음</option>
              </select>
            </div>
            <div className="form-group">
              <label>상태</label>
              <select
                value={newItem.status}
                onChange={(e) => setNewItem({ ...newItem, status: e.target.value })}
              >
                <option value="pending">대기중</option>
                <option value="in_progress">진행중</option>
                <option value="completed">완료</option>
              </select>
            </div>
            <div className="form-group">
              <label>설명</label>
              <textarea
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                rows="3"
              />
            </div>
            <div className="form-group">
              <label>보고자</label>
              <input
                type="text"
                value={newItem.reportedBy}
                onChange={(e) => setNewItem({ ...newItem, reportedBy: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>담당자</label>
              <input
                type="text"
                value={newItem.assignedTo}
                onChange={(e) => setNewItem({ ...newItem, assignedTo: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>기한</label>
              <input
                type="date"
                value={newItem.dueDate}
                onChange={(e) => setNewItem({ ...newItem, dueDate: e.target.value })}
              />
            </div>
            <div className="modal-actions">
              <button className="save-button" onClick={handleSaveItem}>
                저장
              </button>
              <button className="cancel-button" onClick={() => setShowModal(false)}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Safety; 