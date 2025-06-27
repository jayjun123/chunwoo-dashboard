import React, { useEffect, useState } from 'react';
import { documentsAPI, permissionsAPI } from '../api/database';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { FaList, FaSearch, FaPlus, FaFile, FaTag, FaLink } from 'react-icons/fa';
import '../styles/DocumentManagement.css';

const DocumentManagement = () => {
  const { isDarkMode } = useTheme();
  const { currentUser } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
    fileUrl: '',
    tags: [],
    relatedSiteId: '',
    createdBy: '',
    status: 'active'
  });
  const [isListView, setIsListView] = useState(false);
  const [permissions, setPermissions] = useState({ read: false, write: false, delete: false });

  // 권한 정보 불러오기
  useEffect(() => {
    if (!currentUser) return;
    const fetchPermissions = async () => {
      const userPerm = await permissionsAPI.getUserPermissions(currentUser.uid);
      if (userPerm && userPerm.documentManagement) {
        setPermissions(userPerm.documentManagement);
      } else {
        setPermissions({ read: false, write: false, delete: false });
      }
    };
    fetchPermissions();
  }, [currentUser]);

  // 실시간 문서 데이터 구독
  useEffect(() => {
    if (!permissions.read) return;
    const unsubscribe = documentsAPI.subscribeToDocuments((updatedDocuments) => {
      setDocuments(updatedDocuments);
    });
    return () => unsubscribe && unsubscribe();
  }, [permissions.read]);

  // 문서 검색
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  // 문서 필터링
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = !selectedCategory || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // 문서 추가/수정
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedDocument) {
        await documentsAPI.updateDocument(selectedDocument.id, formData);
      } else {
        await documentsAPI.addDocument(formData);
      }
      setIsModalOpen(false);
      setSelectedDocument(null);
      setFormData({
        title: '',
        category: '',
        description: '',
        fileUrl: '',
        tags: [],
        relatedSiteId: '',
        createdBy: '',
        status: 'active'
      });
    } catch (error) {
      console.error('문서 저장 실패:', error);
      alert('문서 저장에 실패했습니다.');
    }
  };

  // 문서 삭제
  const handleDelete = async (documentId) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        await documentsAPI.deleteDocument(documentId);
      } catch (error) {
        console.error('문서 삭제 실패:', error);
        alert('문서 삭제에 실패했습니다.');
      }
    }
  };

  // 모달 열기
  const openModal = (document = null) => {
    if (document) {
      setSelectedDocument(document);
      setFormData(document);
    } else {
      setSelectedDocument(null);
      setFormData({
        title: '',
        category: '',
        description: '',
        fileUrl: '',
        tags: [],
        relatedSiteId: '',
        createdBy: '',
        status: 'active'
      });
    }
    setIsModalOpen(true);
  };

  // 태그 추가
  const handleAddTag = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      e.preventDefault();
      const newTag = e.target.value.trim();
      if (!formData.tags.includes(newTag)) {
        setFormData({
          ...formData,
          tags: [...formData.tags, newTag]
        });
      }
      e.target.value = '';
    }
  };

  // 태그 삭제
  const handleRemoveTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  // 권한 없을 때 안내
  if (!permissions.read) {
    return (
      <div className={`document-management ${isDarkMode ? 'dark' : 'light'}`} style={{textAlign:'center',padding:'60px 0'}}>
        <h2>문서관리</h2>
        <p style={{color:'var(--danger-color)',fontWeight:600}}>이 메뉴를 볼 권한이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className={`document-management ${isDarkMode ? 'dark' : 'light'}`}>
      <div className="document-header">
        <h2>문서관리</h2>
        <div className="document-actions">
          {permissions.write && (
            <button onClick={() => openModal()} className="add-button">
              <FaPlus /> 문서 추가
            </button>
          )}
          <button onClick={() => setIsListView(true)} className="list-button">
            <FaList /> 전체 리스트
          </button>
          <div className="search-container">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="문서 검색..."
              value={searchTerm}
              onChange={handleSearch}
              className="search-input"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="category-select"
          >
            <option value="">전체 카테고리</option>
            <option value="계약서">계약서</option>
            <option value="도면">도면</option>
            <option value="보고서">보고서</option>
            <option value="기타">기타</option>
          </select>
        </div>
      </div>

      {isListView ? (
        <div className="document-list-view">
          <div className="list-header">
            <span>제목</span>
            <span>카테고리</span>
            <span>작성자</span>
            <span>상태</span>
            <span>태그</span>
            <span>관리</span>
          </div>
          {filteredDocuments.map((document) => (
            <div key={document.id} className="list-item">
              <span>{document.title}</span>
              <span>{document.category}</span>
              <span>{document.createdBy}</span>
              <span>{document.status}</span>
              <span className="tags-list">
                {document.tags.map((tag, index) => (
                  <span key={index} className="tag">{tag}</span>
                ))}
              </span>
              <div className="list-actions">
                {permissions.write && (
                  <button onClick={() => openModal(document)} className="edit-button">
                    수정
                  </button>
                )}
                {permissions.delete && (
                  <button onClick={() => handleDelete(document.id)} className="delete-button">
                    삭제
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="document-grid">
          {filteredDocuments.map((document) => (
            <div key={document.id} className="document-card">
              <div className="document-card-header">
                <h3>{document.title}</h3>
                <div className="document-card-actions">
                  {permissions.write && (
                    <button onClick={() => openModal(document)} className="edit-button">
                      수정
                    </button>
                  )}
                  {permissions.delete && (
                    <button onClick={() => handleDelete(document.id)} className="delete-button">
                      삭제
                    </button>
                  )}
                </div>
              </div>
              <div className="document-card-content">
                <p><strong>카테고리:</strong> {document.category}</p>
                <p><strong>설명:</strong> {document.description}</p>
                <p><strong>작성자:</strong> {document.createdBy}</p>
                <p><strong>상태:</strong> {document.status}</p>
                {document.tags.length > 0 && (
                  <div className="document-tags">
                    <FaTag className="tag-icon" />
                    {document.tags.map((tag, index) => (
                      <span key={index} className="tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {document.fileUrl && (
                  <a href={document.fileUrl} target="_blank" rel="noopener noreferrer" className="file-link">
                    <FaLink /> 파일 보기
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{selectedDocument ? '문서 수정' : '문서 추가'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="close-button">
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>제목</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    required
                    disabled={!permissions.write}
                  />
                </div>
                <div className="form-group">
                  <label>카테고리</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    required
                    disabled={!permissions.write}
                  >
                    <option value="">선택하세요</option>
                    <option value="계약서">계약서</option>
                    <option value="도면">도면</option>
                    <option value="보고서">보고서</option>
                    <option value="기타">기타</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>설명</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    disabled={!permissions.write}
                  />
                </div>
                <div className="form-group">
                  <label>작성자</label>
                  <input
                    type="text"
                    value={formData.createdBy}
                    onChange={(e) => setFormData({...formData, createdBy: e.target.value})}
                    required
                    disabled={!permissions.write}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>상태</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    required
                    disabled={!permissions.write}
                  >
                    <option value="active">활성</option>
                    <option value="archived">보관</option>
                    <option value="deleted">삭제</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>파일 URL</label>
                  <input
                    type="text"
                    value={formData.fileUrl}
                    onChange={(e) => setFormData({...formData, fileUrl: e.target.value})}
                    disabled={!permissions.write}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>태그</label>
                  <div className="tags-input">
                    {formData.tags.map((tag, index) => (
                      <span key={index} className="tag">
                        {tag}
                        {permissions.write && (
                          <button type="button" onClick={() => handleRemoveTag(tag)} className="remove-tag">×</button>
                        )}
                      </span>
                    ))}
                    {permissions.write && (
                      <input
                        type="text"
                        placeholder="태그 입력 후 Enter"
                        onKeyDown={handleAddTag}
                        disabled={!permissions.write}
                      />
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-actions">
                <button type="submit" className="save-button" disabled={!permissions.write}>
                  {selectedDocument ? '수정' : '추가'}
                </button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="cancel-button">
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentManagement; 