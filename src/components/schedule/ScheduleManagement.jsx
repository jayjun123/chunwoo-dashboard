import React, { useState, useEffect } from 'react';
import { Box, Drawer, IconButton, useMediaQuery, useTheme, ToggleButtonGroup, ToggleButton, Tooltip } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CalendarViewWeekIcon from '@mui/icons-material/ViewWeek';
import CalendarViewDayIcon from '@mui/icons-material/ViewDay';
import SiteList from '../SiteList';
import Calendar from '../Calendar';
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const ScheduleManagement = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [sites, setSites] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState(null);
  const [viewMode, setViewMode] = useState('month');

  useEffect(() => {
    fetchSites();
    fetchSchedules();
  }, []);

  const fetchSites = async () => {
    try {
      const q = query(collection(db, 'sites'), orderBy('name', 'asc'));
      const snapshot = await getDocs(q);
      setSites(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('현장 목록 조회 실패:', error);
    }
  };

  const fetchSchedules = async () => {
    try {
      const q = query(collection(db, 'events'), orderBy('start', 'asc'));
      const snapshot = await getDocs(q);
      setSchedules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('일정 목록 조회 실패:', error);
    }
  };

  const handleSiteClick = (site) => {
    setSelectedSite(site);
    if (isMobile) setDrawerOpen(false);
  };

  const handleSiteEdit = async (site) => {
    try {
      const siteRef = doc(db, 'sites', site.id);
      const { id, ...updateData } = site;
      await updateDoc(siteRef, {
        ...updateData,
        updatedAt: new Date().toISOString()
      });
      fetchSites();
    } catch (error) {
      console.error('현장 수정 실패:', error);
    }
  };

  const handleSiteDelete = async (siteId) => {
    if (!window.confirm('정말로 이 현장을 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'sites', siteId));
      fetchSites();
    } catch (error) {
      console.error('현장 삭제 실패:', error);
    }
  };

  const handleAddSchedule = async (data) => {
    try {
      await addDoc(collection(db, 'events'), {
        ...data,
        createdAt: new Date().toISOString()
      });
      fetchSchedules();
    } catch (error) {
      console.error('일정 추가 실패:', error);
    }
  };

  const handleEditSchedule = async (id, data) => {
    try {
      const scheduleRef = doc(db, 'events', id);
      await updateDoc(scheduleRef, {
        ...data,
        updatedAt: new Date().toISOString()
      });
      fetchSchedules();
    } catch (error) {
      console.error('일정 수정 실패:', error);
    }
  };

  const handleDeleteSchedule = async (id) => {
    if (!window.confirm('정말로 이 일정을 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'events', id));
      fetchSchedules();
    } catch (error) {
      console.error('일정 삭제 실패:', error);
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100%', minHeight: 600, width: '100vw', maxWidth: '100vw', margin: 0 }}>
      {/* 좌측 현장리스트: PC 고정, 모바일 Drawer */}
      {isMobile ? (
        <>
          <IconButton 
            onClick={() => setDrawerOpen(true)} 
            sx={{ 
              position: 'fixed', 
              top: 16, 
              left: 16, 
              zIndex: (theme) => theme.zIndex.appBar + 1,
              bgcolor: 'background.paper',
              boxShadow: 1,
              '&:hover': {
                bgcolor: 'action.hover'
              }
            }}
          >
            <MenuIcon />
          </IconButton>
          <Drawer 
            anchor="left" 
            open={drawerOpen} 
            onClose={() => setDrawerOpen(false)}
            PaperProps={{
              sx: {
                width: { xs: '100%', sm: 320 },
                maxWidth: 400,
                zIndex: (theme) => theme.zIndex.appBar
              }
            }}
          >
            <Box sx={{ p: 2 }}>
              <SiteList
                sites={sites}
                onSiteClick={handleSiteClick}
                onSiteEdit={handleSiteEdit}
                onSiteDelete={handleSiteDelete}
              />
            </Box>
          </Drawer>
        </>
      ) : (
        <Box 
          sx={{ 
            width: 100,
            minWidth: 100,
            maxWidth: 100,
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            pt: 4,
            pl: 0,
            pr: 2,
            overflow: 'auto'
          }}
        >
          <SiteList
            sites={sites}
            onSiteClick={handleSiteClick}
            onSiteEdit={handleSiteEdit}
            onSiteDelete={handleSiteDelete}
          />
        </Box>
      )}

      {/* 우측 달력 */}
      <Box 
        sx={{ 
          flex: 1,
          pt: 4,
          pl: 0,
          pr: 0,
          minWidth: 0,
          bgcolor: 'background.default',
          maxWidth: '100%',
          width: '100%',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 2, pr: 2 }}>
          <ToggleButtonGroup value={viewMode} exclusive onChange={(e, v) => v && setViewMode(v)} size="small">
            <Tooltip title="3일 보기"><ToggleButton value="3days"><CalendarViewDayIcon /></ToggleButton></Tooltip>
            <Tooltip title="7일 보기"><ToggleButton value="week"><CalendarViewWeekIcon /></ToggleButton></Tooltip>
            <Tooltip title="월간 보기"><ToggleButton value="month">월</ToggleButton></Tooltip>
          </ToggleButtonGroup>
        </Box>
        <Calendar
          style={{ width: '100%', maxWidth: '100%' }}
          sites={sites}
          schedules={selectedSite ? schedules.filter(s => s.siteId === selectedSite.id) : schedules}
          onAddSchedule={handleAddSchedule}
          onEditSchedule={handleEditSchedule}
          onDeleteSchedule={handleDeleteSchedule}
          viewMode={viewMode}
        />
      </Box>
    </Box>
  );
};

export default ScheduleManagement; 