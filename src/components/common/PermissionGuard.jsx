import React from 'react';
import { Box, Alert, Typography } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { hasMenuAccess } from '../../utils/menuPermissions';

/**
 * 메뉴 접근 권한을 체크하는 컴포넌트
 * @param {string} menuKey - 메뉴 키
 * @param {React.ReactNode} children - 권한이 있을 때 표시할 컴포넌트
 * @param {React.ReactNode} fallback - 권한이 없을 때 표시할 컴포넌트 (선택사항)
 * @returns {React.ReactNode}
 */
const PermissionGuard = ({ menuKey, children, fallback = null }) => {
  const { currentUser } = useAuth();

  // 권한 체크
  const hasAccess = hasMenuAccess(currentUser, menuKey);

  if (!hasAccess) {
    if (fallback) {
      return fallback;
    }

    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <Typography variant="h6" gutterBottom>
            접근 권한이 없습니다
          </Typography>
          <Typography variant="body2">
            이 페이지에 접근하려면 관리자로부터 권한을 부여받아야 합니다.
          </Typography>
        </Alert>
      </Box>
    );
  }

  return children;
};

export default PermissionGuard;
