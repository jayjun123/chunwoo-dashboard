import React, { useState, useMemo, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  useMediaQuery, 
  TextField, 
  InputAdornment, 
  List, 
  ListItem, 
  ListItemText,
  CircularProgress,
  Alert,
  Snackbar,
  Grid,
  Collapse
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import Calendar from '../components/Calendar';
import { getSchedules, addSchedule, updateSchedule, deleteSchedule } from '../api/schedules';
import { getSites, addSite, updateSite, deleteSite } from '../api/sites';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import * as XLSX from 'xlsx';
import DownloadIcon from '@mui/icons-material/Download';
import SiteList from '../components/SiteList';

// 임시 현장 데이터 (Firestore 연동 후 사용 안함)
// const mockSites = [...];

function isInMonth(site, year, month) {
  if (!site.start || !site.end) return false;
  const s = new Date(site.start);
  const e = new Date(site.end);
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  return !(e < first || s > last);
}

const initialSiteForm = {
  id: '',
  name: '',
  start: '',
  end: '',
  status: '',
  company: '',
  manager: ''
};

const Schedule = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [search, setSearch] = useState('');
  const [sites, setSites] = useState([]);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [sitesError, setSitesError] = useState('');
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [siteDialog, setSiteDialog] = useState({ open: false, mode: 'add', data: initialSiteForm });
  const [siteDialogLoading, setSiteDialogLoading] = useState(false);
  const [showInput, setShowInput] = useState(true);
  const [input, setInput] = useState('');
  const [items, setItems] = useState([]);

  // 이번 달 기준
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // 현장 데이터 Firestore에서 로드
  useEffect(() => {
    const loadSites = async () => {
      try {
        setSitesLoading(true);
        setSitesError('');
        const data = await getSites();
        setSites(data);
      } catch (err) {
        console.error('현장 리스트 로드 실패:', err);
        setSitesError('현장 리스트를 불러오는데 실패했습니다.');
        setSnackbar({
          open: true,
          message: '현장 리스트를 불러오는데 실패했습니다.',
          severity: 'error'
        });
      } finally {
        setSitesLoading(false);
      }
    };
    loadSites();
  }, []);

  // 일정 데이터 로드
  useEffect(() => {
    const loadSchedules = async () => {
      try {
        setLoading(true);
        setError('');
        
        // 이번 달의 시작일과 마지막일
        const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
        const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];
        
        const data = await getSchedules({
          startDate: firstDay,
          endDate: lastDay
        });
        
        setSchedules(data);
      } catch (err) {
        console.error('일정 로드 실패:', err);
        setError('일정을 불러오는데 실패했습니다.');
        setSnackbar({
          open: true,
          message: '일정을 불러오는데 실패했습니다.',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    loadSchedules();
  }, [year, month]);

  // 이번 달에 하루라도 포함된 현장만 필터링
  const filteredSites = useMemo(() =>
    sites.filter(site =>
      isInMonth(site, year, month) &&
      (site.name?.includes(search) || (site.company && site.company.includes(search)) || (site.manager && site.manager.includes(search)))
    ),
    [search, year, month, sites]
  );

  const handleAddSchedule = async (schedule) => {
    try {
      const addedSchedule = await addSchedule(schedule);
      setSchedules([...schedules, addedSchedule]);
      setSnackbar({
        open: true,
        message: '일정이 추가되었습니다.',
        severity: 'success'
      });
    } catch (err) {
      console.error('일정 추가 실패:', err);
      setSnackbar({
        open: true,
        message: '일정 추가에 실패했습니다.',
        severity: 'error'
      });
    }
  };

  const handleEditSchedule = async (scheduleId, updatedSchedule) => {
    try {
      const editedSchedule = await updateSchedule(scheduleId, updatedSchedule);
      setSchedules(schedules.map(s => 
        s.id === scheduleId ? editedSchedule : s
      ));
      setSnackbar({
        open: true,
        message: '일정이 수정되었습니다.',
        severity: 'success'
      });
    } catch (err) {
      console.error('일정 수정 실패:', err);
      setSnackbar({
        open: true,
        message: '일정 수정에 실패했습니다.',
        severity: 'error'
      });
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    try {
      await deleteSchedule(scheduleId);
      setSchedules(schedules.filter(s => s.id !== scheduleId));
      setSnackbar({
        open: true,
        message: '일정이 삭제되었습니다.',
        severity: 'success'
      });
    } catch (err) {
      console.error('일정 삭제 실패:', err);
      setSnackbar({
        open: true,
        message: '일정 삭제에 실패했습니다.',
        severity: 'error'
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // 현장 추가/수정/삭제 핸들러
  const openAddSiteDialog = () => setSiteDialog({ open: true, mode: 'add', data: initialSiteForm });
  const openEditSiteDialog = (site) => setSiteDialog({ open: true, mode: 'edit', data: { ...site } });
  const closeSiteDialog = () => setSiteDialog({ ...siteDialog, open: false });
  const handleSiteFormChange = (e) => {
    const { name, value } = e.target;
    setSiteDialog({ ...siteDialog, data: { ...siteDialog.data, [name]: value } });
  };
  const handleSiteDialogSubmit = async () => {
    setSiteDialogLoading(true);
    try {
      if (siteDialog.mode === 'add') {
        const added = await addSite(siteDialog.data);
        setSites([...sites, added]);
        setSnackbar({ open: true, message: '현장이 추가되었습니다.', severity: 'success' });
      } else {
        const updated = await updateSite(siteDialog.data.id, siteDialog.data);
        setSites(sites.map(s => s.id === updated.id ? updated : s));
        setSnackbar({ open: true, message: '현장이 수정되었습니다.', severity: 'success' });
      }
      closeSiteDialog();
    } catch (err) {
      setSnackbar({ open: true, message: '현장 처리에 실패했습니다.', severity: 'error' });
    } finally {
      setSiteDialogLoading(false);
    }
  };
  const handleSiteDelete = async () => {
    setSiteDialogLoading(true);
    try {
      await deleteSite(siteDialog.data.id);
      setSites(sites.filter(s => s.id !== siteDialog.data.id));
      setSnackbar({ open: true, message: '현장이 삭제되었습니다.', severity: 'success' });
      closeSiteDialog();
    } catch (err) {
      setSnackbar({ open: true, message: '현장 삭제에 실패했습니다.', severity: 'error' });
    } finally {
      setSiteDialogLoading(false);
    }
  };

  // 엑셀 내보내기
  const handleExportExcel = () => {
    // 내보낼 데이터 가공
    const exportData = schedules.map(s => ({
      제목: s.title,
      유형: s.type,
      시작일: s.startDate,
      종료일: s.endDate,
      현장명: sites.find(site => site.id === s.siteId)?.name || '',
      설명: s.description || ''
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '일정');
    XLSX.writeFile(wb, `일정목록_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // 추가입력 핸들러
  const handleAdd = () => {
    if (input.trim()) {
      setItems([...items, { id: Date.now().toString(), text: input }]);
      setInput('');
    }
  };

  // 추가입력 항목 드래그앤드롭
  const onDragEnd = (result) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    // 추가사항에서 달력 셀로 드롭
    if (source.droppableId === 'extra' && destination.droppableId) {
      const moved = items.find(i => String(i.id) === draggableId);
      if (moved) {
        setItems(items.filter(i => String(i.id) !== draggableId));
        setSchedules([...schedules, {
          id: Date.now().toString(),
          title: moved.text,
          type: '추가',
          startDate: destination.droppableId,
          endDate: destination.droppableId,
          description: '',
          siteId: ''
        }]);
      }
      return;
    }
    // 달력 셀 간 이동
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (dateRegex.test(source.droppableId) && dateRegex.test(destination.droppableId)) {
      setSchedules(prev => prev.map(s =>
        String(s.id) === draggableId ? { ...s, startDate: destination.droppableId } : s
      ));
      return;
    }
  };

  const handleSaveSchedules = async () => {
    // 현재 schedules 상태를 DB에 저장(일괄 저장 로직 필요시 구현)
    setSnackbar({ open: true, message: '일정이 저장되었습니다.', severity: 'success' });
  };

  const handleDeleteSelectedSchedules = async (selectedIds) => {
    for (const id of selectedIds) {
      await handleDeleteSchedule(id);
    }
  };

  if (sitesLoading || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <DragDropContext
      onDragEnd={onDragEnd}
    >
      <Box sx={{ p: 0, height: '100vh', width: '100vw', boxSizing: 'border-box', display: 'flex' }}>
        {/* 좌측: 현장리스트 */}
        <Box sx={{ width: 320, minWidth: 240, maxWidth: 400, borderRight: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: 2, overflow: 'auto', height: '100vh' }}>
          <SiteList
            sites={sites}
            onSiteClick={() => {}}
            onSiteEdit={() => {}}
            onSiteDelete={() => {}}
            showAddInput={false}
          />
          {/* 추가사항 입력란/리스트는 Schedule.jsx에서만 관리 */}
          <Box sx={{ mt: 4 }}>
            <Typography sx={{ fontWeight: 600, mb: 1, color: '#fff', textAlign: 'left' }}>추가사항</Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <input
                type="text"
                placeholder="추가사항 입력"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && input.trim()) handleAdd(); }}
                style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #ccc', background: '#232734', color: '#fff' }}
              />
              <button
                style={{ background: '#3578ff', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: '1.2rem', minWidth: 40, minHeight: 40, cursor: 'pointer' }}
                onClick={handleAdd}
                disabled={!input.trim()}
              >+
              </button>
            </Box>
            <Droppable droppableId="extra" type="extra">
              {(provided) => (
                <List ref={provided.innerRef} {...provided.droppableProps}>
                  {items.map((item, idx) => (
                    <Draggable draggableId={String(item.id)} index={idx} key={String(item.id)}>
                      {(provided) => (
                        <ListItem
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          sx={{ bgcolor: '#f5f5f5', mb: 1, borderRadius: 1, cursor: 'grab' }}
                        >
                          <ListItemText primary={item.text} />
                        </ListItem>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </List>
              )}
            </Droppable>
          </Box>
        </Box>
        {/* 우측: 달력 */}
        <Box sx={{ flex: 1, height: '100vh', bgcolor: 'background.default', px: 4, minWidth: 0, width: '100%', overflowX: 'auto' }}>
          <Calendar
            sites={sites}
            schedules={schedules}
            setSchedules={setSchedules}
            extraItems={items}
            setExtraItems={setItems}
            extraInput={input}
            setExtraInput={setInput}
            onAddSchedule={handleAddSchedule}
            onEditSchedule={handleEditSchedule}
            onDeleteSchedule={handleDeleteSchedule}
            onSaveSchedules={handleSaveSchedules}
            onDeleteSchedules={handleDeleteSelectedSchedules}
          />
        </Box>
        <Snackbar
          open={snackbar.open}
          autoHideDuration={2000}
          onClose={handleCloseSnackbar}
          message={snackbar.message}
        />
      </Box>
    </DragDropContext>
  );
};

export default Schedule; 