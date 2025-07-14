import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Chip,
  Box,
  Typography,
  Slider,
  Grid,
  IconButton,
  Tooltip,
  Alert
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  Notifications as NotificationsIcon,
  Repeat as RepeatIcon,
  Category as CategoryIcon,
  PriorityHigh as PriorityIcon,
  ColorLens as ColorIcon
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ko } from 'date-fns/locale';

const AdvancedScheduleForm = ({ open, onClose, onSave, initialData = null }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: new Date(),
    endDate: new Date(Date.now() + 60 * 60 * 1000), // 1시간 후
    category: '일반',
    priority: '보통',
    color: '#1976d2',
    isAllDay: false,
    repeat: {
      enabled: false,
      type: 'daily',
      interval: 1,
      endDate: null,
      daysOfWeek: []
    },
    notifications: {
      enabled: true,
      before: 15, // 분
      email: false,
      push: true
    },
    location: '',
    attendees: [],
    notes: ''
  });

  const [errors, setErrors] = useState({});

  // 카테고리 옵션
  const categories = [
    { value: '일반', label: '일반', color: '#1976d2' },
    { value: '회의', label: '회의', color: '#dc004e' },
    { value: '점검', label: '점검', color: '#ff9800' },
    { value: '교육', label: '교육', color: '#4caf50' },
    { value: '보고', label: '보고', color: '#9c27b0' },
    { value: '긴급', label: '긴급', color: '#f44336' }
  ];

  // 우선순위 옵션
  const priorities = [
    { value: '낮음', label: '낮음', color: '#4caf50' },
    { value: '보통', label: '보통', color: '#ff9800' },
    { value: '높음', label: '높음', color: '#f44336' },
    { value: '긴급', label: '긴급', color: '#9c27b0' }
  ];

  // 반복 옵션
  const repeatTypes = [
    { value: 'daily', label: '매일' },
    { value: 'weekly', label: '매주' },
    { value: 'monthly', label: '매월' },
    { value: 'yearly', label: '매년' },
    { value: 'custom', label: '사용자 정의' }
  ];

  // 요일 옵션
  const daysOfWeek = [
    { value: 0, label: '일' },
    { value: 1, label: '월' },
    { value: 2, label: '화' },
    { value: 3, label: '수' },
    { value: 4, label: '목' },
    { value: 5, label: '금' },
    { value: 6, label: '토' }
  ];

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  // 폼 데이터 변경 핸들러
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // 에러 제거
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  // 중첩된 필드 변경 핸들러
  const handleNestedChange = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value
      }
    }));
  };

  // 유효성 검사
  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = '제목을 입력해주세요';
    }

    if (formData.startDate >= formData.endDate) {
      newErrors.endDate = '종료 시간은 시작 시간보다 늦어야 합니다';
    }

    if (formData.repeat.enabled && formData.repeat.type === 'custom' && formData.repeat.daysOfWeek.length === 0) {
      newErrors.repeat = '요일을 선택해주세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 저장 핸들러
  const handleSave = () => {
    if (!validateForm()) return;

    const scheduleData = {
      ...formData,
      id: initialData?.id || Date.now().toString(),
      createdAt: initialData?.createdAt || new Date(),
      updatedAt: new Date()
    };

    onSave(scheduleData);
    onClose();
  };

  // 반복 요일 토글
  const toggleDayOfWeek = (day) => {
    const currentDays = formData.repeat.daysOfWeek;
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];
    
    handleNestedChange('repeat', 'daysOfWeek', newDays);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ScheduleIcon />
          {initialData ? '일정 수정' : '새 일정 추가'}
        </Box>
      </DialogTitle>

      <DialogContent>
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ko}>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* 기본 정보 */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>기본 정보</Typography>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="일정 제목"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                error={!!errors.title}
                helperText={errors.title}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="설명"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                multiline
                rows={3}
              />
            </Grid>

            {/* 날짜 및 시간 */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>날짜 및 시간</Typography>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isAllDay}
                    onChange={(e) => handleChange('isAllDay', e.target.checked)}
                  />
                }
                label="종일"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <DateTimePicker
                label="시작 시간"
                value={formData.startDate}
                onChange={(date) => handleChange('startDate', date)}
                disabled={formData.isAllDay}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true
                  }
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <DateTimePicker
                label="종료 시간"
                value={formData.endDate}
                onChange={(date) => handleChange('endDate', date)}
                disabled={formData.isAllDay}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                    error: !!errors.endDate,
                    helperText: errors.endDate
                  }
                }}
              />
            </Grid>

            {/* 카테고리 및 우선순위 */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>분류</Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>카테고리</InputLabel>
                <Select
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  label="카테고리"
                >
                  {categories.map(cat => (
                    <MenuItem key={cat.value} value={cat.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: cat.color
                          }}
                        />
                        {cat.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>우선순위</InputLabel>
                <Select
                  value={formData.priority}
                  onChange={(e) => handleChange('priority', e.target.value)}
                  label="우선순위"
                >
                  {priorities.map(priority => (
                    <MenuItem key={priority.value} value={priority.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: priority.color
                          }}
                        />
                        {priority.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* 반복 설정 */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                <RepeatIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                반복 설정
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.repeat.enabled}
                    onChange={(e) => handleNestedChange('repeat', 'enabled', e.target.checked)}
                  />
                }
                label="반복 일정"
              />
            </Grid>

            {formData.repeat.enabled && (
              <>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>반복 유형</InputLabel>
                    <Select
                      value={formData.repeat.type}
                      onChange={(e) => handleNestedChange('repeat', 'type', e.target.value)}
                      label="반복 유형"
                    >
                      {repeatTypes.map(type => (
                        <MenuItem key={type.value} value={type.value}>
                          {type.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="간격"
                    value={formData.repeat.interval}
                    onChange={(e) => handleNestedChange('repeat', 'interval', parseInt(e.target.value))}
                    inputProps={{ min: 1, max: 99 }}
                  />
                </Grid>

                {formData.repeat.type === 'custom' && (
                  <Grid item xs={12}>
                    <Typography variant="body2" gutterBottom>반복 요일</Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {daysOfWeek.map(day => (
                        <Chip
                          key={day.value}
                          label={day.label}
                          onClick={() => toggleDayOfWeek(day.value)}
                          color={formData.repeat.daysOfWeek.includes(day.value) ? 'primary' : 'default'}
                          variant={formData.repeat.daysOfWeek.includes(day.value) ? 'filled' : 'outlined'}
                        />
                      ))}
                    </Box>
                    {errors.repeat && (
                      <Alert severity="error" sx={{ mt: 1 }}>{errors.repeat}</Alert>
                    )}
                  </Grid>
                )}
              </>
            )}

            {/* 알림 설정 */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                <NotificationsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                알림 설정
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.notifications.enabled}
                    onChange={(e) => handleNestedChange('notifications', 'enabled', e.target.checked)}
                  />
                }
                label="알림 사용"
              />
            </Grid>

            {formData.notifications.enabled && (
              <>
                <Grid item xs={12} md={6}>
                  <Typography gutterBottom>알림 시간</Typography>
                  <Slider
                    value={formData.notifications.before}
                    onChange={(e, value) => handleNestedChange('notifications', 'before', value)}
                    min={0}
                    max={1440}
                    step={15}
                    marks={[
                      { value: 0, label: '정시' },
                      { value: 15, label: '15분' },
                      { value: 60, label: '1시간' },
                      { value: 1440, label: '1일' }
                    ]}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${value}분 전`}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.notifications.push}
                        onChange={(e) => handleNestedChange('notifications', 'push', e.target.checked)}
                      />
                    }
                    label="푸시 알림"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.notifications.email}
                        onChange={(e) => handleNestedChange('notifications', 'email', e.target.checked)}
                      />
                    }
                    label="이메일 알림"
                  />
                </Grid>
              </>
            )}

            {/* 추가 정보 */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>추가 정보</Typography>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="장소"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="참석자 (쉼표로 구분)"
                value={formData.attendees.join(', ')}
                onChange={(e) => handleChange('attendees', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                placeholder="홍길동, 김철수, 이영희"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="메모"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </LocalizationProvider>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>취소</Button>
        <Button onClick={handleSave} variant="contained">
          {initialData ? '수정' : '저장'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdvancedScheduleForm; 