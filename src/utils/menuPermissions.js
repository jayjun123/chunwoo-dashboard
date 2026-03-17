// 메뉴별 권한 관리 유틸리티

// 전체 메뉴 목록과 기본 권한 설정
export const MENU_CONFIG = {
  // 기본 메뉴들
  dashboard: { 
    key: 'dashboard', 
    label: '대시보드', 
    path: '/', 
    icon: 'Dashboard',
    defaultPermissions: { 
      master: { view: true, create: true, edit: true, delete: true, manage: true },
      admin: { view: true, create: true, edit: true, delete: false, manage: false },
      user: { view: true, create: false, edit: false, delete: false, manage: false }
    },
    category: '기본'
  },
  importantSite: { 
    key: 'importantSite', 
    label: '주요현장', 
    path: '/importantsite', 
    icon: 'Star',
    defaultPermissions: { 
      master: { view: true, create: true, edit: true, delete: true, manage: true },
      admin: { view: true, create: true, edit: true, delete: false, manage: false },
      user: { view: true, create: false, edit: false, delete: false, manage: false }
    },
    category: '기본'
  },
  sites: { 
    key: 'sites', 
    label: '현장관리', 
    path: '/sites', 
    icon: 'Construction',
    defaultPermissions: { 
      master: { view: true, create: true, edit: true, delete: true, manage: true },
      admin: { view: true, create: true, edit: true, delete: true, manage: false },
      user: { view: false, create: false, edit: false, delete: false, manage: false }
    },
    category: '관리'
  },
  projectDsh: {
    key: 'projectDsh',
    label: '현장세부내용',
    path: '/project-dsh',
    icon: 'Dashboard',
    defaultPermissions: {
      master: { view: true, create: true, edit: true, delete: true, manage: true },
      admin: { view: true, create: true, edit: true, delete: false, manage: false },
      user: { view: true, create: false, edit: false, delete: false, manage: false }
    },
    category: '관리'
  },
  mapping: { 
    key: 'mapping', 
    label: 'MAP', 
    path: '/mapping', 
    icon: 'Map',
    defaultPermissions: { 
      master: { view: true, create: true, edit: true, delete: true, manage: true },
      admin: { view: true, create: true, edit: true, delete: false, manage: false },
      user: { view: true, create: false, edit: false, delete: false, manage: false }
    },
    category: '기본'
  },
  safety: { 
    key: 'safety', 
    label: '안전관리', 
    path: '/safety', 
    icon: 'Security',
    defaultPermissions: { 
      master: { view: true, create: true, edit: true, delete: true, manage: true },
      admin: { view: true, create: true, edit: true, delete: true, manage: false },
      user: { view: true, create: true, edit: false, delete: false, manage: false }
    },
    category: '관리'
  },
  claims: { 
    key: 'claims', 
    label: '청구예정', 
    path: '/claims', 
    icon: 'AttachMoney',
    defaultPermissions: { 
      master: { view: true, create: true, edit: true, delete: true, manage: true },
      admin: { view: true, create: true, edit: true, delete: true, manage: false },
      user: { view: false, create: false, edit: false, delete: false, manage: false }
    },
    category: '재무'
  },
  estimates: { 
    key: 'estimates', 
    label: '견적요청', 
    path: '/estimates', 
    icon: 'Description',
    defaultPermissions: { master: true, admin: true, user: false },
    category: '재무'
  },
  discussions: { 
    key: 'discussions', 
    label: '토론의견', 
    path: '/discussions', 
    icon: 'Forum',
    defaultPermissions: { master: true, admin: true, user: true },
    category: '기본'
  },
  vendors: { 
    key: 'vendors', 
    label: '거래처현황', 
    path: '/vendors', 
    icon: 'People',
    defaultPermissions: { master: true, admin: true, user: false },
    category: '관리'
  },
  cost: { 
    key: 'cost', 
    label: '기성관리', 
    path: '/cost', 
    icon: 'MonetizationOn',
    defaultPermissions: { master: true, admin: true, user: false },
    category: '재무'
  },
  daemaTeam: { 
    key: 'daemaTeam', 
    label: '시공팀', 
    path: '/daema-team', 
    icon: 'BarChart',
    defaultPermissions: { master: true, admin: true, user: false },
    category: '관리'
  },
  calendar: { 
    key: 'calendar', 
    label: '일정관리', 
    path: '/calendar', 
    icon: 'Event',
    defaultPermissions: { master: true, admin: true, user: true },
    category: '기본'
  },
  vendorManagement: { 
    key: 'vendorManagement', 
    label: '거래처관리', 
    path: '/vendor-management', 
    icon: 'Business',
    defaultPermissions: { master: true, admin: true, user: false },
    category: '관리'
  },
  confidential: { 
    key: 'confidential', 
    label: '대외비', 
    path: '/confidential', 
    icon: 'Lock',
    defaultPermissions: { master: true, admin: false, user: false },
    category: '기타'
  },
  wholeList: { 
    key: 'wholeList', 
    label: '전체 현장 목록', 
    path: '/whole-list', 
    icon: 'List',
    defaultPermissions: { master: true, admin: true, user: false },
    category: '관리'
  },
  gantt: { 
    key: 'gantt', 
    label: '공정표', 
    path: '/gantt', 
    icon: 'Timeline',
    defaultPermissions: { master: true, admin: true, user: true },
    category: '기본'
  },
  notifications: { 
    key: 'notifications', 
    label: '알림', 
    path: '/notifications', 
    icon: 'Notifications',
    defaultPermissions: { master: true, admin: true, user: true },
    category: '기본'
  },
  userManagement: { 
    key: 'userManagement', 
    label: '사용자 관리', 
    path: '/users', 
    icon: 'People',
    defaultPermissions: { master: true, admin: false, user: false },
    category: '관리'
  },
  permissions: { 
    key: 'permissions', 
    label: '권한 관리', 
    path: '/permissions', 
    icon: 'AdminPanelSettings',
    defaultPermissions: { master: true, admin: true, user: false },
    category: '관리'
  },
  materials: { 
    key: 'materials', 
    label: '자재 관리', 
    path: '/materials', 
    icon: 'Inventory',
    defaultPermissions: { master: true, admin: true, user: false },
    category: '관리'
  }
};

// 사용자 역할별 기본 권한
export const DEFAULT_ROLE_PERMISSIONS = {
  master: {
    // 마스터는 모든 메뉴 접근 가능
    access: Object.keys(MENU_CONFIG).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {})
  },
  admin: {
    // 관리자는 대부분 메뉴 접근 가능 (대외비, 사용자관리, 권한관리 제외)
    access: Object.keys(MENU_CONFIG).reduce((acc, key) => {
      const menu = MENU_CONFIG[key];
      acc[key] = menu.defaultPermissions.admin;
      return acc;
    }, {})
  },
  user: {
    // 일반 사용자는 기본 메뉴만 접근 가능
    access: Object.keys(MENU_CONFIG).reduce((acc, key) => {
      const menu = MENU_CONFIG[key];
      acc[key] = menu.defaultPermissions.user;
      return acc;
    }, {})
  }
};

/**
 * 사용자가 특정 메뉴에 접근할 수 있는지 확인
 * @param {Object} user - 사용자 정보
 * @param {string} menuKey - 메뉴 키
 * @param {Object} customPermissions - 사용자별 커스텀 권한 (선택사항)
 * @returns {boolean} 접근 가능 여부
 */
export const hasMenuAccess = (user, menuKey, customPermissions = null) => {
  if (!user || !menuKey) return false;
  
  // 마스터는 모든 메뉴 접근 가능
  if (user.grade === '마스터' || user.role === 'master') {
    return true;
  }
  
  // 관리자는 기본적으로 모든 메뉴 접근 가능하지만, 권한이 명시적으로 false로 설정된 경우 차단
  if (user.grade === '관리자' || user.role === 'admin') {
    // 사용자별 권한이 명시적으로 설정된 경우 확인
    if (user.permissions && user.permissions[menuKey] !== undefined) {
      return user.permissions[menuKey].access !== false;
    }
    return true; // 기본적으로 관리자는 모든 메뉴 접근 가능
  }
  
  // 일반 사용자는 명시적으로 권한이 부여된 경우만 접근 가능
  if (user.permissions && user.permissions[menuKey] !== undefined) {
    return user.permissions[menuKey].access === true;
  }
  
  // 권한이 명시적으로 설정되지 않은 경우 접근 불가
  return false;
};

/**
 * 사용자가 접근 가능한 메뉴 목록 반환
 * @param {Object} user - 사용자 정보
 * @param {Object} customPermissions - 사용자별 커스텀 권한 (선택사항)
 * @returns {Array} 접근 가능한 메뉴 목록
 */
export const getAccessibleMenus = (user, customPermissions = null) => {
  if (!user) return [];
  
  return Object.values(MENU_CONFIG).filter(menu => 
    hasMenuAccess(user, menu.key, customPermissions)
  );
};

/**
 * 카테고리별로 메뉴를 그룹화하여 반환
 * @param {Object} user - 사용자 정보
 * @param {Object} customPermissions - 사용자별 커스텀 권한 (선택사항)
 * @returns {Object} 카테고리별 메뉴 그룹
 */
export const getMenusByCategory = (user, customPermissions = null) => {
  const accessibleMenus = getAccessibleMenus(user, customPermissions);
  
  return accessibleMenus.reduce((groups, menu) => {
    const category = menu.category || '기타';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(menu);
    return groups;
  }, {});
};

/**
 * 메뉴 권한을 업데이트하는 함수
 * @param {string} userId - 사용자 ID
 * @param {string} menuKey - 메뉴 키
 * @param {boolean} hasAccess - 접근 권한 여부
 * @returns {Object} 업데이트할 권한 객체
 */
export const updateMenuPermission = (userId, menuKey, hasAccess) => {
  return {
    [`permissions.${menuKey}`]: hasAccess
  };
};

/**
 * 사용자 권한을 일괄 업데이트하는 함수
 * @param {Object} permissions - 메뉴별 권한 객체
 * @returns {Object} 업데이트할 권한 객체
 */
export const updateUserPermissions = (permissions) => {
  const updateData = {};
  Object.keys(permissions).forEach(menuKey => {
    updateData[`permissions.${menuKey}`] = permissions[menuKey];
  });
  return updateData;
};
