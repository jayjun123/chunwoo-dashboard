import React, { useEffect, useState } from 'react';
import { permissionsAPI } from '../api/database';
import { useTheme } from '../contexts/ThemeContext';
import '../styles/PermissionManagement.css';

const PermissionManagement = () => {
  const { isDarkMode } = useTheme();
  const [permissions, setPermissions] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: {
      siteManagement: { read: false, write: false, delete: false },
      scheduleManagement: { read: false, write: false, delete: false },
      progressManagement: { read: false, write: false, delete: false },
      documentManagement: { read: false, write: false, delete: false },
      userManagement: { read: false, write: false, delete: false }
    }
  });

  // 실시간 권한 데이터 구독
  useEffect(() => {
    const unsubscribe = permissionsAPI.subscribeToPermissions((updatedPermissions) => {
      setPermissions(updatedPermissions);
    });
    return () => unsubscribe();
  }, []);

  // 역할 목록 로드
  useEffect(() => {
    const loadRoles = async () => {
      const rolesList = await permissionsAPI.getRoles();
      setRoles(rolesList);
    };
    loadRoles();
  }, []);

  // 권한 변경 처리
  const handlePermissionChange = (module, action, value) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [module]: {
          ...prev.permissions[module],
          [action]: value
        }
      }
    }));
  };

  // 역할 추가/수정
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedRole) {
        await permissionsAPI.updateRole(selectedRole, formData);
      } else {
        await permissionsAPI.addRole(formData);
      }
      setIsModalOpen(false);
      setSelectedRole('');
      setFormData({
        name: '',
        description: '',
        permissions: {
          siteManagement: { read: false, write: false, delete: false },
          scheduleManagement: { read: false, write: false, delete: false },
          progressManagement: { read: false, write: false, delete: false },
          documentManagement: { read: false, write: false, delete: false },
          userManagement: { read: false, write: false, delete: false }
        }
      });
    } catch (error) {
      console.error('권한 저장 실패:', error);
      alert('권한 저장에 실패했습니다.');
    }
  };

  // 역할 삭제
  const handleDelete = async (roleId) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        await permissionsAPI.deleteRole(roleId);
      } catch (error) {
        console.error('역할 삭제 실패:', error);
        alert('역할 삭제에 실패했습니다.');
      }
    }
  };

  // 모달 열기
  const openModal = (role = null) => {
    if (role) {
      setSelectedRole(role.id);
      setFormData(role);
    } else {
      setSelectedRole('');
      setFormData({
        name: '',
        description: '',
        permissions: {
          siteManagement: { read: false, write: false, delete: false },
          scheduleManagement: { read: false, write: false, delete: false },
          progressManagement: { read: false, write: false, delete: false },
          documentManagement: { read: false, write: false, delete: false },
          userManagement: { read: false, write: false, delete: false }
        }
      });
    }
    setIsModalOpen(true);
  };

  return (
    <div className={`permission-management ${isDarkMode ? 'dark' : 'light'}`}>
      <div className="permission-header">
        <h2>권한관리</h2>
        <button onClick={() => openModal()} className="add-button">
          역할 추가
        </button>
      </div>

      <div className="roles-grid">
        {roles.map((role) => (
          <div key={role.id} className="role-card">
            <div className="role-card-header">
              <h3>{role.name}</h3>
              <div className="role-card-actions">
                <button onClick={() => openModal(role)} className="edit-button">
                  수정
                </button>
                <button onClick={() => handleDelete(role.id)} className="delete-button">
                  삭제
                </button>
              </div>
            </div>
            <div className="role-card-content">
              <p><strong>설명:</strong> {role.description}</p>
              <div className="permissions-list">
                {Object.entries(role.permissions).map(([module, actions]) => (
                  <div key={module} className="permission-module">
                    <h4>{module}</h4>
                    <div className="permission-actions">
                      {Object.entries(actions).map(([action, value]) => (
                        <label key={action} className="permission-action">
                          <input
                            type="checkbox"
                            checked={value}
                            disabled
                          />
                          {action}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{selectedRole ? '역할 수정' : '역할 추가'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>역할명</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>설명</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>권한 설정</label>
                {Object.entries(formData.permissions).map(([module, actions]) => (
                  <div key={module} className="permission-module">
                    <h4>{module}</h4>
                    <div className="permission-actions">
                      {Object.entries(actions).map(([action, value]) => (
                        <label key={action} className="permission-action">
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={(e) => handlePermissionChange(module, action, e.target.checked)}
                          />
                          {action}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="modal-actions">
                <button type="submit" className="save-button">
                  {selectedRole ? '수정' : '추가'}
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

export default PermissionManagement; 