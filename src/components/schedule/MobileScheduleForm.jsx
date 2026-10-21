import React from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';

const TYPE_OPTIONS = ['현장', '회의', '전자입찰', '하자', '현설', '샘플', '실측', '기타'];
const WEATHER_OPTIONS = ['☀️', '☔', '⛄', '🌀', '없음'];

export default function MobileScheduleForm({
  dateStr,
  isEdit,
  sites = [],
  title,
  onTitleChange,
  siteName,
  onSiteNameChange,
  selectedTypes = [],
  onToggleType,
  colorChoices = [],
  selectedColor,
  onColorChange,
  weather,
  onWeatherChange,
  weatherLoading,
  desc,
  onDescChange,
  onBack,
  onCancel,
  onSave,
  canSave,
}) {
  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      bgcolor: '#1f2937',
      color: '#fff',
      '& fieldset': { borderColor: '#374151' },
      '&:hover fieldset': { borderColor: '#6b7280' },
    },
    '& .MuiInputLabel-root': { color: '#9ca3af' },
    '& .MuiInputBase-input': { color: '#fff' },
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 'calc(48px + env(safe-area-inset-top, 0px))',
        left: 0,
        right: 0,
        bottom: 'calc(38px + env(safe-area-inset-bottom, 0px))',
        bgcolor: '#0f1419',
        zIndex: 4000,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', px: 0.5, py: 0.5, borderBottom: '1px solid #1f2937', flexShrink: 0 }}>
        <IconButton onClick={onBack} sx={{ color: '#fff' }} aria-label="뒤로">
          <ArrowBackIosNewIcon fontSize="small" />
        </IconButton>
        <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>
          {isEdit ? '일정 수정' : `${dateStr || ''} 일정 추가`}
        </Typography>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 1.5, py: 1.5, WebkitOverflowScrolling: 'touch' }}>
        <TextField
          label="제목"
          value={title || ''}
          onChange={(e) => onTitleChange(e.target.value)}
          fullWidth
          sx={{ ...fieldSx, mb: 1.5 }}
        />

        {!isEdit && (
          <Autocomplete
            options={(sites || []).map((s) => s.name).filter(Boolean)}
            value={siteName || ''}
            onChange={(_, v) => onSiteNameChange(typeof v === 'string' ? v : (v || ''))}
            onInputChange={(_, v, reason) => {
              if (reason === 'input' || reason === 'clear') onSiteNameChange(v || '');
            }}
            freeSolo
            renderInput={(params) => (
              <TextField {...params} label="현장명 검색" sx={fieldSx} />
            )}
            sx={{ mb: 1.5 }}
          />
        )}

        <Typography sx={{ color: '#e5e7eb', fontWeight: 700, mb: 0.75, fontSize: 14 }}>분류 선택</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.25, mb: 1.5 }}>
          {TYPE_OPTIONS.map((type) => (
            <FormControlLabel
              key={type}
              control={
                <Checkbox
                  checked={selectedTypes.includes(type)}
                  onChange={() => onToggleType(type)}
                  sx={{ color: '#9ca3af', '&.Mui-checked': { color: '#3b82f6' } }}
                />
              }
              label={type}
              sx={{ color: '#fff', m: 0, '& .MuiFormControlLabel-label': { fontSize: 14 } }}
            />
          ))}
        </Box>

        <Typography sx={{ color: '#e5e7eb', fontWeight: 700, mb: 0.75, fontSize: 14 }}>색상 선택</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
          {colorChoices.map((color) => (
            <Box
              key={color}
              onClick={() => onColorChange(color)}
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                bgcolor: color === 'transparent' ? '#374151' : color,
                border: selectedColor === color ? '3px solid #fff' : '2px solid #4b5563',
                boxShadow: selectedColor === color ? '0 0 0 2px #3b82f6' : 'none',
              }}
            />
          ))}
        </Box>

        <Typography sx={{ color: '#e5e7eb', fontWeight: 700, mb: 0.75, fontSize: 14 }}>
          날씨 선택{weatherLoading ? ' (불러오는 중…)' : ''}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
          {WEATHER_OPTIONS.map((w) => (
            <Box
              key={w}
              onClick={() => onWeatherChange(w)}
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                bgcolor: weather === w ? 'rgba(59,130,246,0.25)' : '#1f2937',
                border: weather === w ? '2px solid #3b82f6' : '2px solid #374151',
              }}
            >
              {w === '없음' ? '×' : w}
            </Box>
          ))}
        </Box>

        <TextField
          label="설명"
          value={desc || ''}
          onChange={(e) => onDescChange(e.target.value)}
          fullWidth
          multiline
          minRows={3}
          sx={fieldSx}
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 1, p: 1.5, borderTop: '1px solid #1f2937', flexShrink: 0 }}>
        <Button
          fullWidth
          variant="outlined"
          onClick={onCancel}
          sx={{ minHeight: 48, borderColor: '#6b7280', color: '#fff' }}
        >
          취소
        </Button>
        <Button
          fullWidth
          variant="contained"
          onClick={onSave}
          disabled={!canSave}
          sx={{ minHeight: 48, bgcolor: '#2563eb', '&:hover': { bgcolor: '#1d4ed8' } }}
        >
          저장
        </Button>
      </Box>
    </Box>
  );
}
