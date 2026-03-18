import React from 'react';
import { ListItem, Box, Typography, Chip } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import { formatDateRange, calculateProgress } from '../../utils/siteUtils';

/**
 * 현장 목록 한 줄 (좌측 패널 리스트 아이템).
 * 데이터·디자인 변경 없이 분리만 함.
 */
export default function SiteListItem({ site, selectedSite, paymentStatusMap, isMobile, onSelect }) {
  const progress = calculateProgress(site);
  const dateRange = formatDateRange(site.startDate, site.endDate);

  const isHiddenCompleted = site.status === '완료' && site.endDate && (() => {
    try {
      const today = new Date();
      const sixtyDaysAgo = new Date(today.getTime() - (60 * 24 * 60 * 60 * 1000));
      const endDate = new Date(site.endDate);
      return !isNaN(endDate.getTime()) && endDate < sixtyDaysAgo;
    } catch (error) {
      return false;
    }
  })();

  const paymentStatus = paymentStatusMap[site.name];
  const isUnpaid = site.status === '완료' && site.endDate && (() => {
    try {
      const today = new Date();
      const sixtyDaysAgo = new Date(today.getTime() - (60 * 24 * 60 * 60 * 1000));
      const endDate = new Date(site.endDate);
      const isOver60Days = !isNaN(endDate.getTime()) && endDate < sixtyDaysAgo;
      return isOver60Days && paymentStatus && !paymentStatus.isFullyPaid;
    } catch (error) {
      return false;
    }
  })();

  const handleClick = () => onSelect(site);
  const handleTouch = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleTouchEnd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(site);
  };

  return (
    <ListItem
      selected={selectedSite?.id === site.id}
      onClick={handleClick}
      onTouchStart={handleTouch}
      onTouchEnd={handleTouchEnd}
      sx={{
        position: 'relative',
        mb: isMobile ? 0.25 : 0.5,
        borderRadius: 1,
        py: isMobile ? 0.25 : 0.5,
        border: '1px solid',
        borderColor: selectedSite?.id === site.id ? '#90caf9' :
          isUnpaid ? '#f44336' :
          isHiddenCompleted ? '#ff9800' : '#333',
        bgcolor: selectedSite?.id === site.id ? '#1e3a5f' :
          isUnpaid ? 'rgba(244, 67, 54, 0.1)' :
          isHiddenCompleted ? 'rgba(255, 152, 0, 0.1)' : 'transparent',
        '&:hover': {
          bgcolor: selectedSite?.id === site.id ? '#1e3a5f' :
            isUnpaid ? 'rgba(244, 67, 54, 0.2)' :
            isHiddenCompleted ? 'rgba(255, 152, 0, 0.2)' : '#2a2d35',
          borderColor: '#90caf9'
        }
      }}
    >
      <Box sx={{ width: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1, overflow: 'hidden' }}>
            {site.isFavorite && (
              <StarIcon sx={{ color: '#FFD700', fontSize: isMobile ? '0.9rem' : '1rem', flexShrink: 0 }} />
            )}
            <Typography
              sx={{
                fontSize: isMobile ? '0.8rem' : 'inherit',
                fontWeight: selectedSite?.id === site.id ? 'bold' : 'normal',
                color: selectedSite?.id === site.id ? '#90caf9' :
                  isUnpaid ? '#f44336' : '#fff',
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {site.name}
            </Typography>
            {isUnpaid && (
              <Box sx={{ width: '8px', height: '8px', borderRadius: '50%', bgcolor: '#f44336', flexShrink: 0, mr: 0.5 }} title="입금처리 미완료 현장" />
            )}
            {isHiddenCompleted && (
              <Box sx={{ width: '8px', height: '8px', borderRadius: '50%', bgcolor: '#ff9800', flexShrink: 0 }} title="준공일이 60일 이상 지난 완료 현장" />
            )}
          </Box>
          {dateRange && (
            <Typography sx={{ fontSize: isMobile ? '0.65rem' : '0.7rem', color: selectedSite?.id === site.id ? '#90caf9' : '#888', ml: 1, whiteSpace: 'nowrap' }}>
              {dateRange}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontSize: isMobile ? '0.7rem' : 'inherit', color: selectedSite?.id === site.id ? '#90caf9' : '#aaa' }}>
              {site.status}
            </Typography>
            {site.contractType && (
              <Chip
                label={site.contractType === '원도급' || site.contractType === '원도급계약' ? '원도급' : site.contractType}
                size="small"
                sx={{
                  backgroundColor:
                    site.contractType === '하도급계약' ? '#2196F3' :
                    site.contractType === '납품계약' ? '#FF9800' :
                    (site.contractType === '원도급' || site.contractType === '원도급계약') ? '#4CAF50' : '#9E9E9E',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '0.65rem',
                  height: '18px',
                  minWidth: 'auto',
                  px: 0.5,
                  borderRadius: '4px'
                }}
                title={`계약 유형: ${site.contractType}`}
              />
            )}
            {site.items && site.items.length > 0 && (
              <Chip
                label={site.items.length > 20 ? 'L' : 'N'}
                size="small"
                sx={{
                  backgroundColor: site.items.length > 20 ? '#ff9800' : '#4caf50',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '0.6rem',
                  height: '18px',
                  minWidth: 'auto',
                  px: 0.5
                }}
                title={`${site.items.length > 20 ? 'LONG' : 'NEW'} 템플릿 (${site.items.length}개) - 견적서/납품계약서 다운로드 시 자동 선택`}
              />
            )}
            {paymentStatusMap[site.name]?.isFullyPaid && (
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10,
                  backgroundColor: 'transparent',
                  border: '3px solid #f44336',
                  borderRadius: '6px',
                  padding: '4px 12px',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  color: '#f44336',
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap'
                }}
              >
                정산완료
              </Box>
            )}
          </Box>

          {progress !== null && (
            <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
              <Box sx={{
                width: isMobile ? '40px' : '50px',
                height: isMobile ? '6px' : '8px',
                bgcolor: '#333',
                borderRadius: '4px',
                overflow: 'hidden',
                mr: 0.5
              }}>
                <Box sx={{
                  width: `${progress}%`,
                  height: '100%',
                  bgcolor: progress >= 100 ? '#f44336' : progress > 80 ? '#ff9800' : '#4caf50',
                  transition: 'width 0.3s ease'
                }} />
              </Box>
              <Typography sx={{ fontSize: isMobile ? '0.7rem' : '0.8rem', color: selectedSite?.id === site.id ? '#90caf9' : '#888', minWidth: '25px' }}>
                {Math.round(progress)}%
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </ListItem>
  );
}
