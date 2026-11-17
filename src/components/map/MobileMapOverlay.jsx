import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

const FILTERS = ['전체', '진행', '예정', '완료'];
const MAP_TYPES = ['일반지도', '위성지도', '지형도'];

const LEGEND = [
  { label: '진행', color: '#ef4444' },
  { label: '예정', color: '#22c55e' },
  { label: '완료', color: '#3b82f6' },
  { label: '미정', color: '#eab308' },
];

export default function MobileMapOverlay({
  year,
  years,
  onYearChange,
  counts,
  activeTab,
  onTabChange,
  mapType,
  onMapTypeChange,
  onZoomIn,
  onZoomOut,
}) {
  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        zIndex: 12,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        p: 1.25,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', pointerEvents: 'auto' }}>
        <Box
          component="label"
          sx={{
            display: 'flex',
            alignItems: 'center',
            bgcolor: 'rgba(15, 23, 42, 0.88)',
            border: '1px solid rgba(148,163,184,0.25)',
            borderRadius: '10px',
            px: 1,
            height: 32,
            position: 'relative',
          }}
        >
          <Typography sx={{ color: '#fff', fontSize: 13, fontWeight: 700, pr: 1.5 }}>
            {year}년
          </Typography>
          <KeyboardArrowDownIcon sx={{ color: '#94a3b8', fontSize: 18, position: 'absolute', right: 4 }} />
          <Box
            component="select"
            value={year}
            onChange={(e) => onYearChange(Number(e.target.value))}
            sx={{
              position: 'absolute',
              inset: 0,
              opacity: 0,
              cursor: 'pointer',
              width: '100%',
            }}
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}년</option>
            ))}
          </Box>
        </Box>

        {FILTERS.map((tab) => {
          const selected = activeTab === tab;
          return (
            <Box
              key={tab}
              onClick={() => onTabChange(tab)}
              sx={{
                height: 32,
                px: 1.25,
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                cursor: 'pointer',
                bgcolor: selected ? '#3b82f6' : 'rgba(15, 23, 42, 0.78)',
                border: selected ? 'none' : '1px solid rgba(148,163,184,0.22)',
                color: '#fff',
                fontSize: 12,
                fontWeight: selected ? 800 : 600,
                whiteSpace: 'nowrap',
              }}
            >
              {tab}
              <Box component="span" sx={{ opacity: selected ? 1 : 0.85, fontWeight: 800 }}>
                {counts[tab] ?? 0}
              </Box>
            </Box>
          );
        })}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1, pointerEvents: 'auto' }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 0.5,
            width: 168,
          }}
        >
          {MAP_TYPES.map((type) => {
            const selected = mapType === type;
            return (
              <Box
                key={type}
                onClick={() => onMapTypeChange(type)}
                sx={{
                  gridColumn: type === '지형도' ? '2' : 'auto',
                  height: 28,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 700,
                  color: selected ? '#fff' : '#cbd5e1',
                  bgcolor: selected ? '#2563eb' : 'rgba(15, 23, 42, 0.82)',
                  border: selected ? 'none' : '1px solid rgba(148,163,184,0.25)',
                }}
              >
                {type}
              </Box>
            );
          })}
        </Box>
      </Box>

      <Box sx={{ flex: 1 }} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Box
          sx={{
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 1.1,
            px: 0.5,
            pb: 0.5,
          }}
        >
          {LEGEND.map((item) => (
            <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.45 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: item.color, boxShadow: `0 0 6px ${item.color}` }} />
              <Typography sx={{ color: '#e2e8f0', fontSize: 11, fontWeight: 600 }}>{item.label}</Typography>
            </Box>
          ))}
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, pointerEvents: 'auto', pb: 0.5 }}>
          <IconButton
            onClick={onZoomIn}
            sx={{
              width: 40,
              height: 40,
              bgcolor: 'rgba(15, 23, 42, 0.88)',
              border: '1px solid rgba(148,163,184,0.28)',
              color: '#fff',
              '&:hover': { bgcolor: 'rgba(30, 41, 59, 0.95)' },
            }}
          >
            <AddIcon />
          </IconButton>
          <IconButton
            onClick={onZoomOut}
            sx={{
              width: 40,
              height: 40,
              bgcolor: 'rgba(15, 23, 42, 0.88)',
              border: '1px solid rgba(148,163,184,0.28)',
              color: '#fff',
              '&:hover': { bgcolor: 'rgba(30, 41, 59, 0.95)' },
            }}
          >
            <RemoveIcon />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
}
