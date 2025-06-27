import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaFilter, FaBox } from 'react-icons/fa';
import './Materials.css';

const Materials = () => {
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [newMaterial, setNewMaterial] = useState({
    name: '',
    category: 'concrete',
    unit: 'kg',
    quantity: '',
    minQuantity: '',
    location: '',
    supplier: '',
    lastOrdered: '',
    nextOrderDate: '',
    notes: ''
  });

  useEffect(() => {
    // 임시 데이터 로딩
    setTimeout(() => {
      setMaterials([
        {
          id: 1,
          name: '일반 포틀랜드 시멘트',
          category: 'concrete',
          unit: 'kg',
          quantity: 5000,
          minQuantity: 1000,
          location: '창고 A-1',
          supplier: '삼성시멘트',
          lastOrdered: '2024-03-15',
          nextOrderDate: '2024-04-15',
          notes: '월 1회 정기 발주'
        },
        {
          id: 2,
          name: '철근 (D13)',
          category: 'steel',
          unit: 'ton',
          quantity: 20,
          minQuantity: 5,
          location: '야적장 B-2',
          supplier: '포스코',
          lastOrdered: '2024-03-10',
          nextOrderDate: '2024-04-10',
          notes: '2주 단위 재고 확인'
        },
        {
          id: 3,
          name: '합성수지 페인트',
          category: 'paint',
          unit: 'L',
          quantity: 200,
          minQuantity: 50,
          location: '창고 C-3',
          supplier: 'KCC',
          lastOrdered: '2024-03-20',
          nextOrderDate: '2024-04-20',
          notes: '색상: 화이트'
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleCategoryFilter = (e) => {
    setSelectedCategory(e.target.value);
  };

  const handleAddMaterial = () => {
    setEditingMaterial(null);
    setNewMaterial({
      name: '',
      category: 'concrete',
      unit: 'kg',
      quantity: '',
      minQuantity: '',
      location: '',
      supplier: '',
      lastOrdered: '',
      nextOrderDate: '',
      notes: ''
    });
    setShowModal(true);
  };

  const handleEditMaterial = (material) => {
    setEditingMaterial(material);
    setNewMaterial({ ...material });
    setShowModal(true);
  };

  const handleDeleteMaterial = (materialId) => {
    if (window.confirm('정말로 이 자재를 삭제하시겠습니까?')) {
      setMaterials(materials.filter(material => material.id !== materialId));
    }
  };

  const handleSaveMaterial = () => {
    if (editingMaterial) {
      setMaterials(materials.map(material => 
        material.id === editingMaterial.id ? { ...newMaterial, id: material.id } : material
      ));
    } else {
      setMaterials([...materials, { ...newMaterial, id: materials.length + 1 }]);
    }
    setShowModal(false);
  };

  const getCategoryLabel = (category) => {
    switch (category) {
      case 'concrete': return '콘크리트';
      case 'steel': return '철근';
      case 'paint': return '페인트';
      case 'wood': return '목재';
      case 'tile': return '타일';
      default: return category;
    }
  };

  const getUnitLabel = (unit) => {
    switch (unit) {
      case 'kg': return 'kg';
      case 'ton': return '톤';
      case 'L': return 'L';
      case 'm': return 'm';
      case 'm2': return 'm²';
      case 'm3': return 'm³';
      default: return unit;
    }
  };

  const filteredMaterials = materials.filter(material => {
    const matchesSearch = material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || material.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="materials-loading">
        <div className="loading-spinner"></div>
        <p>데이터를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="materials-container">
      <div className="materials-header">
        <h2>자재 관리</h2>
        <button className="add-material-button" onClick={handleAddMaterial}>
          <FaPlus /> 자재 추가
        </button>
      </div>

      <div className="materials-filters">
        <div className="search-box">
          <FaSearch />
          <input
            type="text"
            placeholder="자재명, 위치, 공급업체로 검색..."
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
        <div className="category-filter">
          <FaFilter />
          <select value={selectedCategory} onChange={handleCategoryFilter}>
            <option value="all">모든 카테고리</option>
            <option value="concrete">콘크리트</option>
            <option value="steel">철근</option>
            <option value="paint">페인트</option>
            <option value="wood">목재</option>
            <option value="tile">타일</option>
          </select>
        </div>
      </div>

      <div className="materials-table">
        <table>
          <thead>
            <tr>
              <th>자재명</th>
              <th>카테고리</th>
              <th>수량</th>
              <th>최소수량</th>
              <th>위치</th>
              <th>공급업체</th>
              <th>최근발주일</th>
              <th>다음발주일</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody>
            {filteredMaterials.map(material => (
              <tr key={material.id}>
                <td>{material.name}</td>
                <td>
                  <span className={`category-badge ${material.category}`}>
                    {getCategoryLabel(material.category)}
                  </span>
                </td>
                <td>
                  {material.quantity} {getUnitLabel(material.unit)}
                </td>
                <td>
                  {material.minQuantity} {getUnitLabel(material.unit)}
                </td>
                <td>{material.location}</td>
                <td>{material.supplier}</td>
                <td>{material.lastOrdered}</td>
                <td>{material.nextOrderDate}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="edit-button"
                      onClick={() => handleEditMaterial(material)}
                    >
                      <FaEdit />
                    </button>
                    <button
                      className="delete-button"
                      onClick={() => handleDeleteMaterial(material.id)}
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
            <h3>{editingMaterial ? '자재 수정' : '새 자재 추가'}</h3>
            <div className="form-group">
              <label>자재명</label>
              <input
                type="text"
                value={newMaterial.name}
                onChange={(e) => setNewMaterial({ ...newMaterial, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>카테고리</label>
              <select
                value={newMaterial.category}
                onChange={(e) => setNewMaterial({ ...newMaterial, category: e.target.value })}
              >
                <option value="concrete">콘크리트</option>
                <option value="steel">철근</option>
                <option value="paint">페인트</option>
                <option value="wood">목재</option>
                <option value="tile">타일</option>
              </select>
            </div>
            <div className="form-group">
              <label>단위</label>
              <select
                value={newMaterial.unit}
                onChange={(e) => setNewMaterial({ ...newMaterial, unit: e.target.value })}
              >
                <option value="kg">kg</option>
                <option value="ton">톤</option>
                <option value="L">L</option>
                <option value="m">m</option>
                <option value="m2">m²</option>
                <option value="m3">m³</option>
              </select>
            </div>
            <div className="form-group">
              <label>수량</label>
              <input
                type="number"
                value={newMaterial.quantity}
                onChange={(e) => setNewMaterial({ ...newMaterial, quantity: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>최소수량</label>
              <input
                type="number"
                value={newMaterial.minQuantity}
                onChange={(e) => setNewMaterial({ ...newMaterial, minQuantity: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>위치</label>
              <input
                type="text"
                value={newMaterial.location}
                onChange={(e) => setNewMaterial({ ...newMaterial, location: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>공급업체</label>
              <input
                type="text"
                value={newMaterial.supplier}
                onChange={(e) => setNewMaterial({ ...newMaterial, supplier: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>최근발주일</label>
              <input
                type="date"
                value={newMaterial.lastOrdered}
                onChange={(e) => setNewMaterial({ ...newMaterial, lastOrdered: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>다음발주일</label>
              <input
                type="date"
                value={newMaterial.nextOrderDate}
                onChange={(e) => setNewMaterial({ ...newMaterial, nextOrderDate: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>비고</label>
              <textarea
                value={newMaterial.notes}
                onChange={(e) => setNewMaterial({ ...newMaterial, notes: e.target.value })}
                rows="3"
              />
            </div>
            <div className="modal-actions">
              <button className="save-button" onClick={handleSaveMaterial}>
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

export default Materials; 