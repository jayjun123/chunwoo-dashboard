import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, IconButton, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import {
  getScheduleTypeBadge,
  stripDuplicateScheduleBadgePrefix,
} from '../../utils/scheduleCategoryColors';
import { getHolidayInfo } from '../../utils/koreanHolidays';
import { fetchMonthDailyWeather } from '../../utils/siteWeather';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const PREVIEW_COUNT = 2;

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function todayStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
}

function getItemTitle(item) {
  const raw = String(item?.siteName || item?.text || '').trim();
  return stripDuplicateScheduleBadgePrefix(item?.type, raw);
}

function getCardStyle(item) {
  const t = String(item?.type || '');
  if (t.includes('실측')) {
    return { bgcolor: '#e8c547', color: '#1a1a1a', badgeColor: '#3d7a2a' };
  }
  if (t.includes('입찰') && !t.includes('전자')) {
    return { bgcolor: '#eab308', color: '#1a1a1a', badgeColor: '#166534' };
  }
  if (t.includes('견적')) {
    return { bgcolor: '#6d5ae6', color: '#fff', badgeColor: '#ddd6fe' };
  }
  if (t.includes('회의')) {
    return { bgcolor: '#243044', color: '#fff', badgeColor: '#5eead4' };
  }
  return { bgcolor: '#243044', color: '#fff', badgeColor: null };
}

export default function MobileAgendaCalendar({
  year,
  month,
  calendarItems = {},
  onPrevMonth,
  onNextMonth,
  onGoToday,
  onAdd,
  onItemPress,
  onShowMore,
}) {
  const listRef = useRef(null);
  const [weatherMap, setWeatherMap] = useState({});
  const [expandedDates, setExpandedDates] = useState({});
  const [confirmDate, setConfirmDate] = useState(null);
  const today = todayStr();

  const days = useMemo(() => {
    const last = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: last }, (_, i) => {
      const day = i + 1;
      const date = new Date(year, month, day);
      const dateStr = toDateStr(year, month, day);
      const holidayInfo = getHolidayInfo(dateStr, year);
      return {
        day,
        dateStr,
        weekday: WEEKDAYS[date.getDay()],
        dayIndex: date.getDay(),
        isHoliday: Boolean(holidayInfo?.isHoliday),
        isToday: dateStr === today,
        items: calendarItems[dateStr] || [],
      };
    });
  }, [year, month, calendarItems, today]);

  useEffect(() => {
    let cancelled = false;
    fetchMonthDailyWeather(year, month).then((map) => {
      if (!cancelled) setWeatherMap(map || {});
    });
    return () => {
      cancelled = true;
    };
  }, [year, month]);

  useEffect(() => {
    const node = listRef.current?.querySelector('[data-today="true"]');
    if (node) {
      node.scrollIntoView({ block: 'start', behavior: 'auto' });
    }
  }, [year, month, days.length]);

  const dateColor = (row) => {
    if (row.isHoliday || row.dayIndex === 0) return '#ef4444';
    if (row.dayIndex === 6) return '#60a5fa';
    return '#fff';
  };

  return (
    <Box
      sx={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#0f1419',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1,
          pt: 0.5,
          pb: 0.25,
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
          <IconButton onClick={onPrevMonth} sx={{ color: '#fff', p: 0.5 }}>
            <ChevronLeftIcon />
          </IconButton>
          <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1.25rem', letterSpacing: 0.2 }}>
            {year}년 {String(month + 1).padStart(2, '0')}월
          </Typography>
          <IconButton onClick={onNextMonth} sx={{ color: '#fff', p: 0.5 }}>
            <ChevronRightIcon />
          </IconButton>
        </Box>
        <Box
          onClick={onGoToday}
          sx={{
            bgcolor: '#1f2937',
            color: '#e5e7eb',
            borderRadius: 999,
            px: 1.5,
            py: 0.5,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            mr: 1,
          }}
        >
          오늘
        </Box>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          px: 1.5,
          pb: 1,
          flexShrink: 0,
        }}
      >
        {WEEKDAYS.map((d, i) => (
          <Typography
            key={d}
            sx={{
              textAlign: 'center',
              fontWeight: 800,
              fontSize: 15,
              color: i === 0 ? '#ef4444' : i === 6 ? '#60a5fa' : '#fff',
            }}
          >
            {d}
          </Typography>
        ))}
      </Box>

      <Box
        ref={listRef}
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          px: 1.25,
          pb: 2,
          WebkitOverflowScrolling: 'touch',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {days.map((row) => {
          const weather = weatherMap[row.dateStr];
          const itemWeather = row.items.find((it) => it.weather && it.weather !== '없음')?.weather;
          const icon = weather?.icon || itemWeather || '';
          const expanded = row.isToday || Boolean(expandedDates[row.dateStr]);
          const visible = expanded ? row.items : row.items.slice(0, PREVIEW_COUNT);
          const hiddenCount = row.isToday ? 0 : Math.max(0, row.items.length - PREVIEW_COUNT);

          return (
            <Box
              key={row.dateStr}
              data-today={row.isToday ? 'true' : undefined}
              sx={{
                display: 'flex',
                gap: 1.25,
                py: 1.5,
                px: 1,
                mb: 1,
                borderRadius: '14px',
                border: row.isToday ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.88)',
                bgcolor: row.isToday ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.03)',
                boxSizing: 'border-box',
              }}
            >
              <Box
                onClick={() => setConfirmDate(row.dateStr)}
                sx={{
                  width: 72,
                  flexShrink: 0,
                  cursor: 'pointer',
                }}
              >
                <Typography
                  sx={{
                    fontSize: 28,
                    fontWeight: 800,
                    lineHeight: 1,
                    color: dateColor(row),
                  }}
                >
                  {row.day}
                </Typography>
                <Typography sx={{ fontSize: 13, color: dateColor(row), mt: 0.2, fontWeight: 600 }}>
                  {row.weekday}
                </Typography>
                {(icon || weather?.tmax != null) && (
                  <Box sx={{ mt: 0.6 }}>
                    {icon && <Box sx={{ fontSize: 22, lineHeight: 1 }}>{icon}</Box>}
                    {weather?.tmax != null && weather?.tmin != null && (
                      <Typography sx={{ fontSize: 12, color: '#9ca3af', mt: 0.25 }}>
                        {weather.tmax}°/{weather.tmin}°
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>

              <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.7 }}>
                {visible.map((item) => {
                  const badge = getScheduleTypeBadge(item.type);
                  const style = getCardStyle(item);
                  const badgeColor = style.badgeColor || badge?.color || '#fff';
                  return (
                    <Box
                      key={item.id}
                      onClick={() => onItemPress && onItemPress(row.dateStr, item)}
                      sx={{
                        bgcolor: style.bgcolor,
                        color: style.color,
                        borderRadius: 2,
                        px: 1.25,
                        py: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                        cursor: 'pointer',
                      }}
                    >
                      {badge && (
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: 0.5,
                            bgcolor: badgeColor,
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <Typography
                        sx={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: badgeColor,
                          flexShrink: 0,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {badge?.label || ''}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: style.color,
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {getItemTitle(item)}
                      </Typography>
                    </Box>
                  );
                })}
                {!expanded && hiddenCount > 0 && (
                  <Typography
                    onClick={() => {
                      setExpandedDates((prev) => ({ ...prev, [row.dateStr]: true }));
                    }}
                    sx={{
                      color: '#9ca3af',
                      fontSize: 12,
                      fontWeight: 600,
                      pl: 0.5,
                      cursor: 'pointer',
                    }}
                  >
                    +{hiddenCount} 더보기
                  </Typography>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>

      {confirmDate && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            bgcolor: 'rgba(0,0,0,0.55)',
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            px: 3,
          }}
        >
          <Box sx={{ bgcolor: '#1f2937', borderRadius: 3, p: 2.5, width: '100%', maxWidth: 320 }}>
            <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 17, mb: 1 }}>
              일정을 추가할까요?
            </Typography>
            <Typography sx={{ color: '#9ca3af', fontSize: 13, mb: 2 }}>
              {confirmDate}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => setConfirmDate(null)}
                sx={{ minHeight: 44, borderColor: '#6b7280', color: '#fff' }}
              >
                아니요
              </Button>
              <Button
                fullWidth
                variant="contained"
                onClick={() => {
                  const dateStr = confirmDate;
                  setConfirmDate(null);
                  if (onAdd) onAdd(dateStr);
                }}
                sx={{ minHeight: 44, bgcolor: '#2563eb' }}
              >
                예
              </Button>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}
