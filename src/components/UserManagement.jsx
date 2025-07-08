import React, { useState, useEffect } from 'react';
import { FaUserPlus, FaUserEdit, FaUserMinus, FaSearch, FaFilter } from 'react-icons/fa';
import './UserManagement.css';

const UserManagement = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'user',
    team: '',
    status: 'active'
  });
  const [permissions, setPermissions] = useState({});
  const [editingRoleId, setEditingRoleId] = useState(null);
  
  // 현재 로그인한 사용자 정보 (실제로는 AuthContext에서 가져와야 함)
  const [currentUser, setCurrentUser] = useState({
    id: 1,
    name: '김철수',
    email: 'kim@example.com',
    role: 'admin',
    team: '관리팀'
  });

  const ROLES = ['master', 'admin', 'user', '대마팀', '보류'];
  const MENUS = [
    { key: 'schedule', label: '일정관리' },
    { key: 'sites', label: '현장관리' },
    { key: 'progress', label: '기성관리' },
    { key: 'safety', label: '안전관리' },
    { key: 'discussions', label: '토론의견' },
    { key: 'reports', label: '보고서' },
    { key: 'documents', label: '문서관리' }
  ];
  const PERMS = ['read', 'write', 'delete', 'save'];

  useEffect(() => {
    // 임시 데이터 로딩
    setTimeout(() => {
      setUsers([
        {
          id: 1,
          name: '김철수',
          email: 'kim@example.com',
          role: 'admin',
          team: '관리팀',
          status: 'active',
          lastLogin: '2024-03-15 14:30'
        },
        {
          id: 2,
          name: '이영희',
          email: 'lee@example.com',
          role: '대마팀',
          team: '현장관리팀',
          status: 'active',
          lastLogin: '2024-03-15 13:45'
        },
        {
          id: 3,
          name: '박지민',
          email: 'park@example.com',
          role: 'user',
          team: '시공팀',
          status: 'inactive',
          lastLogin: '2024-03-14 16:20'
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  // 현재 사용자의 권한에 따라 볼 수 있는 사용자 목록 필터링
  const getVisibleUsers = (allUsers) => {
    if (currentUser.role === 'master' || currentUser.role === 'admin') {
      return allUsers; // 마스터와 관리자는 전체 목록 볼 수 있음
    } else {
      // 일반회원과 대마팀은 자신의 정보만 볼 수 있음
      return allUsers.filter(user => user.id === currentUser.id);
    }
  };

  // 현재 사용자가 수정/삭제할 수 있는지 확인
  const canEditUser = (user) => {
    if (currentUser.role === 'master') return true;
    if (currentUser.role === 'admin') return user.role !== 'master';
    return user.id === currentUser.id; // 자신의 정보만 수정 가능
  };

  // 현재 사용자가 새 사용자를 추가할 수 있는지 확인
  const canAddUser = () => {
    return currentUser.role === 'master' || currentUser.role === 'admin';
  };

  // 역할 변경 권한 확인
  const canChangeRole = (user) => {
    if (currentUser.role === 'master') return true;
    if (currentUser.role === 'admin') return user.role !== 'master';
    return false; // 일반회원과 대마팀은 역할 변경 불가
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleRoleFilter = (e) => {
    setSelectedRole(e.target.value);
  };

  const handleAddUser = () => {
    if (!canAddUser()) {
      alert('사용자 추가 권한이 없습니다.');
      return;
    }
    setEditingUser(null);
    setNewUser({
      name: '',
      email: '',
      role: 'user',
      team: '',
      status: 'active'
    });
    setShowModal(true);
  };

  const handleEditUser = (user) => {
    if (!canEditUser(user)) {
      alert('이 사용자를 수정할 권한이 없습니다.');
      return;
    }
    setEditingUser(user);
    setNewUser({ ...user });
    setShowModal(true);
  };

  const handleDeleteUser = (userId) => {
    const userToDelete = users.find(u => u.id === userId);
    if (!canEditUser(userToDelete)) {
      alert('이 사용자를 삭제할 권한이 없습니다.');
      return;
    }
    if (window.confirm('정말로 이 사용자를 삭제하시겠습니까?')) {
      setUsers(users.filter(user => user.id !== userId));
    }
  };

  const handleSaveUser = () => {
    if (editingUser) {
      setUsers(users.map(user => 
        user.id === editingUser.id ? { ...newUser, id: user.id } : user
      ));
    } else {
      setUsers([...users, { ...newUser, id: users.length + 1 }]);
    }
    setShowModal(false);
  };

  const handlePermChange = (userId, menu, perm) => {
    setPermissions(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [menu]: {
          ...((prev[userId] && prev[userId][menu]) || {}),
          [perm]: !(prev[userId] && prev[userId][menu] && prev[userId][menu][perm])
        }
      }
    }));
  };

  const handleRoleClick = (user) => {
    if (!canChangeRole(user)) {
      alert('역할을 변경할 권한이 없습니다.');
      return;
    }
    setEditingRoleId(user.id);
  };

  const handleRoleChange = (userId, newRole) => {
    setUsers(users.map(user => {
      if (user.id === userId) {
        // 역할에 따라 grade 기본값 설정 (직책은 별도로 설정 가능)
        let newGrade = user.grade || '사원';
        if (newRole === 'master') {
          newGrade = '마스터';
        } else if (newRole === 'admin') {
          newGrade = '관리자';
        } else if (newRole === 'team') {
          newGrade = '팀원'; // 기본값, 필요시 팀장, 대리 등으로 수정 가능
        } else if (newRole === 'user') {
          newGrade = '사원';
        } else if (newRole === 'pending') {
          newGrade = '보류';
        }
        
        return { ...user, role: newRole, grade: newGrade };
      }
      return user;
    }));
    setEditingRoleId(null);
  };

  const getRoleDisplayName = (role) => {
    const roleMap = {
      'master': '마스터',
      'admin': '관리자',
      'user': '일반회원',
      '대마팀': '대마팀',
      '보류': '보류'
    };
    return roleMap[role] || role;
  };

  const visibleUsers = getVisibleUsers(users);
  const filteredUsers = visibleUsers.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.team.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="user-management-loading">
        <div className="loading-spinner"></div>
        <p>데이터를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="user-management-container">
      <div className="user-management-header">
        <h2>사용자 관리</h2>
        {canAddUser() && (
          <button className="add-user-button" onClick={handleAddUser}>
            <FaUserPlus /> 사용자 추가
          </button>
        )}
      </div>

      <div className="user-management-filters">
        <div className="search-box">
          <FaSearch />
          <input
            type="text"
            placeholder="이름, 이메일, 팀으로 검색..."
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
        {(currentUser.role === 'master' || currentUser.role === 'admin') && (
          <div className="role-filter">
            <FaFilter />
            <select value={selectedRole} onChange={handleRoleFilter}>
              <option value="all">모든 역할</option>
              <option value="master">마스터</option>
              <option value="admin">관리자</option>
              <option value="user">일반회원</option>
              <option value="대마팀">대마팀</option>
              <option value="보류">보류</option>
            </select>
          </div>
        )}
      </div>

      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>이름</th>
              <th>이메일</th>
              <th>역할</th>
              <th>팀</th>
              <th>상태</th>
              <th>최근 로그인</th>
              <th>작업</th>
              {(currentUser.role === 'master' || currentUser.role === 'admin') && MENUS.map(menu => (
                <th key={menu.key}>{menu.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  {editingRoleId === user.id ? (
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      onBlur={() => setEditingRoleId(null)}
                      autoFocus
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        fontSize: '14px',
                        backgroundColor: '#fff',
                        color: '#333'
                      }}
                    >
                      <option value="master">마스터</option>
                      <option value="admin">관리자</option>
                      <option value="user">일반회원</option>
                      <option value="대마팀">대마팀</option>
                      <option value="보류">보류</option>
                    </select>
                  ) : (
                    <span 
                      className={`role-badge ${user.role} ${canChangeRole(user) ? 'clickable' : ''}`}
                      onClick={() => handleRoleClick(user)}
                      style={{ cursor: canChangeRole(user) ? 'pointer' : 'default' }}
                    >
                      {getRoleDisplayName(user.role)}
                    </span>
                  )}
                </td>
                <td>{user.team}</td>
                <td><span className={`status-badge ${user.status}`}>{user.status === 'active' ? '활성' : '비활성'}</span></td>
                <td>{user.lastLogin}</td>
                <td>
                  <div className="action-buttons">
                    {canEditUser(user) && (
                      <button className="edit-button" onClick={() => handleEditUser(user)}><FaUserEdit /></button>
                    )}
                    {canEditUser(user) && (
                      <button className="delete-button" onClick={() => handleDeleteUser(user.id)}><FaUserMinus /></button>
                    )}
                  </div>
                </td>
                {(currentUser.role === 'master' || currentUser.role === 'admin') && MENUS.map(menu => (
                  <td key={menu.key}>
                    {PERMS.map(perm => (
                      <label key={perm} style={{ marginRight: 4 }}>
                        <input
                          type="checkbox"
                          checked={user.role === 'master' ? true : (permissions[user.id]?.[menu.key]?.[perm] || false)}
                          disabled={user.role === 'master'}
                          onChange={() => handlePermChange(user.id, menu.key, perm)}
                        />
                        {perm[0].toUpperCase()}
                      </label>
                    ))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>{editingUser ? '사용자 수정' : '새 사용자 추가'}</h3>
            <div className="form-group">
              <label>이름</label>
              <input
                type="text"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>이메일</label>
              <input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>역할</label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                disabled={currentUser.role !== 'master' && currentUser.role !== 'admin'}
              >
                <option value="master">마스터</option>
                <option value="admin">관리자</option>
                <option value="user">일반회원</option>
                <option value="대마팀">대마팀</option>
                <option value="보류">보류</option>
              </select>
            </div>
            <div className="form-group">
              <label>팀</label>
              <input
                type="text"
                value={newUser.team}
                onChange={(e) => setNewUser({ ...newUser, team: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>상태</label>
              <select
                value={newUser.status}
                onChange={(e) => setNewUser({ ...newUser, status: e.target.value })}
              >
                <option value="active">활성</option>
                <option value="inactive">비활성</option>
              </select>
            </div>
            <div className="modal-actions">
              <button className="save-button" onClick={handleSaveUser}>
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

export default UserManagement; 