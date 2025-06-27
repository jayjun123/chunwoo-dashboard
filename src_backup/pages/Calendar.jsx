import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Grid, Paper, Typography, Button, Drawer, List, ListItem, ListItemText, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, useMediaQuery
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Menu as MenuIcon } from '@mui/icons-material';
import { db } from '../firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';

const CalendarPage = () => {
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);
  const [events, setEvents] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [eventDialog, setEventDialog] = useState(false);
  const [eventData, setEventData] = useState({ title: '', start: '', end: '', siteId: '' });
  const [editEventId, setEditEventId] = useState(null);
  const isMobile = useMediaQuery('(max-width:900px)');
  const calendarRef = useRef();

  // 현장 목록 실시간 구독
  useEffect(() => {
    const q = query(collection(db, 'sites'));
    const unsub = onSnapshot(q, (snapshot) => {
      const siteList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSites(siteList);
      if (!selectedSite && siteList.length > 0) setSelectedSite(siteList[0].id);
    });
    return () => unsub();
  }, []);

  // 일정 실시간 구독
  useEffect(() => {
    if (!selectedSite) return;
    const q = query(collection(db, 'schedules'));
    const unsub = onSnapshot(q, (snapshot) => {
      const eventList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(ev => ev.siteId === selectedSite);
      setEvents(eventList);
    });
    return () => unsub();
  }, [selectedSite]);

  // 일정 추가/수정 다이얼로그 열기
  const openEventDialog = (info = null) => {
    if (info) {
      setEventData({
        title: info.event.title,
        start: info.event.startStr,
        end: info.event.endStr,
        siteId: selectedSite
      });
      setEditEventId(info.event.id);
    } else {
      setEventData({ title: '', start: '', end: '', siteId: selectedSite });
      setEditEventId(null);
    }
    setEventDialog(true);
  };

  // 일정 저장
  const handleEventSave = async () => {
    if (!eventData.title || !eventData.start) return;
    if (editEventId) {
      await updateDoc(doc(db, 'schedules', editEventId), eventData);
    } else {
      await addDoc(collection(db, 'schedules'), eventData);
    }
    setEventDialog(false);
  };

  // 일정 삭제
  const handleEventDelete = async () => {
    if (editEventId) {
      await deleteDoc(doc(db, 'schedules', editEventId));
      setEventDialog(false);
    }
  };

  // 드래그앤드롭 일정 이동
  const handleEventDrop = async (info) => {
    await updateDoc(doc(db, 'schedules', info.event.id), {
      start: info.event.startStr,
      end: info.event.endStr
    });
  };

  // 달력 날짜 클릭 시 일정 추가
  const handleDateClick = (arg) => {
    setEventData({ title: '', start: arg.dateStr, end: arg.dateStr, siteId: selectedSite });
    setEditEventId(null);
    setEventDialog(true);
  };

  // 현장 선택
  const handleSiteSelect = (siteId) => {
    setSelectedSite(siteId);
    if (isMobile) setDrawerOpen(false);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={2}>
        {/* 좌측 현장 리스트 */}
        <Grid item xs={12} md={3}>
          {isMobile ? (
            <>
              <Button startIcon={<MenuIcon />} onClick={() => setDrawerOpen(true)} fullWidth sx={{ mb: 2 }}>
                현장 목록
              </Button>
              <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
                <Box sx={{ width: 250, p: 2 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>현장 목록</Typography>
                  <List>
                    {sites.map(site => (
                      <ListItem button key={site.id} selected={site.id === selectedSite} onClick={() => handleSiteSelect(site.id)}>
                        <ListItemText primary={site.name} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </Drawer>
            </>
          ) : (
            <Paper sx={{ height: '100%', p: 2, pl: '30px', boxSizing: 'border-box' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>현장 목록</Typography>
              <List>
                {sites.map(site => (
                  <ListItem button key={site.id} selected={site.id === selectedSite} onClick={() => handleSiteSelect(site.id)}>
                    <ListItemText primary={site.name} />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}
        </Grid>
        {/* 우측 달력 */}
        <Grid item xs={12} md={9}>
          <Paper sx={{ p: 0, width: '100%', maxWidth: 'none', boxSizing: 'border-box', ml: '-15px' }}>
            <Box sx={{ pl: '45px', pr: '30px', pt: 2, pb: 2, width: '100%', boxSizing: 'border-box' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">일정 관리</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => openEventDialog()}>
                  일정 추가
                </Button>
              </Box>
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
                events={events}
                editable
                droppable
                eventDrop={handleEventDrop}
                dateClick={handleDateClick}
                eventClick={openEventDialog}
                height={isMobile ? 'auto' : 600}
                locale="ko"
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>
      {/* 일정 추가/수정 다이얼로그 */}
      <Dialog open={eventDialog} onClose={() => setEventDialog(false)}>
        <DialogTitle>{editEventId ? '일정 수정' : '일정 추가'}</DialogTitle>
        <DialogContent>
          <TextField
            label="일정명"
            value={eventData.title}
            onChange={e => setEventData({ ...eventData, title: e.target.value })}
            fullWidth sx={{ mb: 2 }}
          />
          <TextField
            label="시작일"
            type="date"
            value={eventData.start?.slice(0, 10) || ''}
            onChange={e => setEventData({ ...eventData, start: e.target.value })}
            fullWidth sx={{ mb: 2 }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="종료일"
            type="date"
            value={eventData.end?.slice(0, 10) || ''}
            onChange={e => setEventData({ ...eventData, end: e.target.value })}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          {editEventId && (
            <Button color="error" onClick={handleEventDelete} startIcon={<DeleteIcon />}>삭제</Button>
          )}
          <Button onClick={() => setEventDialog(false)}>취소</Button>
          <Button variant="contained" onClick={handleEventSave}>{editEventId ? '수정' : '추가'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CalendarPage; 