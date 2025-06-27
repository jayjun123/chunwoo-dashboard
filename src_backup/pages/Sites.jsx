import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Tabs, Tab, Button, TextField, Checkbox, Grid, List, ListItem, ListItemButton, ListItemText, Chip, Divider, MenuItem, Select, InputLabel, FormControl, IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { Add as AddIcon, Star as StarIcon, StarBorder as StarBorderIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';

const CONTRACT_TYPE_OPTIONS = ['하도급', '납품계약', '일반', '없음'];
const STATUS_OPTIONS = ['진행', '예정', '완료', '보류'];
const initialForm = { name: '', contractType: '하도급', status: '진행', contractAmount: '', advance: '', totalProgress: '', startDate: '', endDate: '', address: '', desc: '', manager: '', phone: '', items: [], isFavorite: false };

const Sites = () => {
  const [sites, setSites] = useState([]);
  const [statusTab, setStatusTab] = useState('진행');
  const [selectedSite, setSelectedSite] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { fetchSites(); }, []);
  const fetchSites = async () => {
    const snapshot = await getDocs(collection(db, 'sites'));
    setSites(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };
  const filteredSites = sites.filter(site => site.status === statusTab && (site.name?.includes(searchTerm) || site.manager?.includes(searchTerm)));
  const handleSelectSite = (site) => { setSelectedSite(site); setForm(site); setEditMode(false); };
  const handleNewSite = () => { setSelectedSite(null); setForm({ ...initialForm, status: statusTab }); setEditMode(true); };
  const handleChange = (e) => { const { name, value } = e.target; setForm(prev => ({ ...prev, [name]: value })); };
  const handleFavorite = async (checked) => { if (!selectedSite) return; await updateDoc(doc(db, 'sites', selectedSite.id), { isFavorite: checked }); setSites(sites => sites.map(site => site.id === selectedSite.id ? { ...site, isFavorite: checked } : site)); setForm(prev => ({ ...prev, isFavorite: checked })); };
  const handleSave = async () => {
    if (editMode || !selectedSite) {
      await addDoc(collection(db, 'sites'), form);
    } else {
      await updateDoc(doc(db, 'sites', selectedSite.id), form);
    }
    fetchSites();
    setEditMode(false);
    setSelectedSite(null);
    setForm(initialForm);
  };
  const handleDelete = async () => {
    if (selectedSite) {
      await deleteDoc(doc(db, 'sites', selectedSite.id));
      setSelectedSite(null);
      setForm(initialForm);
      fetchSites();
    }
  };
  const handleGisung = () => {
    if (selectedSite) {
      navigate(`/progress?siteId=${selectedSite.id}`);
    }
  };

  const handleOpen = (site = null) => {
    if (site) {
      setSelectedSite(site);
      setForm(site);
    } else {
      setSelectedSite(null);
      setForm(initialForm);
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedSite(null);
  };

  const handleSubmit = async () => {
    if (selectedSite) {
      await updateDoc(doc(db, 'sites', selectedSite.id), form);
    } else {
      await addDoc(collection(db, 'sites'), form);
    }
    fetchSites();
    handleClose();
  };

  return (
    <Grid container sx={{ height: '100vh', width: '100vw', flexWrap: 'nowrap', bgcolor: '#23252b' }}>
      {/* 좌측: 상태별 탭+검색+현장리스트 */}
      <Grid item md={3} xs={12} sx={{ minWidth: 260, maxWidth: 320, borderRight: '2px solid #2d2f36', height: '100vh', p: 0, bgcolor: '#292b32' }}>
        <Box sx={{ p: '32px 16px 16px 16px', height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Tabs
            value={statusTab}
            onChange={(e, v) => setStatusTab(v)}
            variant="fullWidth"
            sx={{
              mb: 2,
              minHeight: 36,
              '.MuiTab-root': {
                color: '#bbb',
                fontWeight: 600,
                fontSize: 15,
                minWidth: 0,
                px: 1.2,
                mx: 0.2,
                minHeight: 36,
              },
              '.Mui-selected': { color: '#fff' },
              '.MuiTabs-flexContainer': { gap: 0 }
            }}
          >
            {STATUS_OPTIONS.map(opt => <Tab key={opt} label={opt} value={opt} />)}
          </Tabs>
          <TextField size="small" placeholder="현장명, 담당자 검색" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} sx={{ mb: 2, bgcolor: '#23252b', input: { color: '#fff' }, borderRadius: 2 }} />
          <List sx={{ p: 0, flex: 1, overflowY: 'auto', gap: 1 }}>
            {filteredSites.map((site) => (
              <ListItem key={site.id} disablePadding sx={{ mb: 1 }}>
                <ListItemButton selected={selectedSite?.id === site.id} onClick={() => handleSelectSite(site)} sx={{ borderRadius: 2, px: 2, py: 1.2, bgcolor: selectedSite?.id === site.id ? '#31333a' : 'transparent', '&:hover': { bgcolor: '#31333a' } }}>
                  <ListItemText primary={<Typography sx={{ fontWeight: 600, color: '#fff', fontSize: 17 }}>{site.name}</Typography>} secondary={<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}><Typography variant="body2" color="#aaa" sx={{ fontSize: 14 }}>{site.manager}</Typography><Chip label={site.status} size="small" sx={{ ml: 1, fontSize: 13, bgcolor: '#23252b', color: '#90caf9', fontWeight: 600 }} /></Box>} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Grid>
      {/* 우측: 상세/입력 + +새현장 등록 버튼 */}
      <Grid item md={9} xs={12} sx={{ height: '100vh', overflowY: 'auto', p: 0, bgcolor: '#23252b' }}>
        <Box sx={{ p: '40px 48px 0 48px', minHeight: '100vh', bgcolor: '#23252b' }}>
          {/* 새현장 등록 버튼 우측 상단 고정 */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 2 }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()} sx={{ borderRadius: 2, textTransform: 'none', minWidth: 160, fontWeight: 700, fontSize: 18, bgcolor: '#1976d2', boxShadow: 'none', px: 3, py: 1.2 }}>새현장 등록</Button>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <Box sx={{ maxWidth: 1080, width: '100%', mx: 'auto', bgcolor: '#23252b', borderRadius: 3, p: '36px 40px 32px 40px', boxShadow: 4, border: '1.5px solid #2d2f36' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                <Typography sx={{ fontWeight: 800, color: '#fff', fontSize: 28, letterSpacing: '-1px', textAlign: 'left', flex: 1 }}>현장 상세 정보</Typography>
                <IconButton onClick={() => handleFavorite(!form.isFavorite)}>
                  {form.isFavorite ? <StarIcon sx={{ color: '#ffd600' }} /> : <StarBorderIcon sx={{ color: '#bbb' }} />}
                </IconButton>
              </Box>
              <Box sx={{ p: 3, bgcolor: '#23252b', borderRadius: 2, mb: 2 }}>
                <Box sx={{ maxWidth: 1080, mx: 'auto', width: '100%' }}>
                  {/* 1행: flexbox */}
                  <Box sx={{ display: 'flex', gap: 2, mb: '13px' }}>
                    <TextField label="현장명" name="name" value={form.name} onChange={handleChange} fullWidth sx={{ flex: 2, bgcolor: '#23252b', input: { color: '#fff', fontWeight: 700, fontSize: 16 }, label: { color: '#bbb', fontSize: 15 } }} />
                    <FormControl fullWidth sx={{ flex: 1, bgcolor: '#23252b', label: { color: '#bbb', fontSize: 15 } }}>
                      <InputLabel>계약구분</InputLabel>
                      <Select label="계약구분" name="contractType" value={form.contractType} onChange={handleChange} sx={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{CONTRACT_TYPE_OPTIONS.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}</Select>
                    </FormControl>
                    <FormControl fullWidth sx={{ flex: 1, bgcolor: '#23252b', label: { color: '#bbb', fontSize: 15 } }}>
                      <InputLabel>진행</InputLabel>
                      <Select label="진행" name="status" value={form.status} onChange={async (e) => { const value = e.target.value; setForm(prev => ({ ...prev, status: value })); if (selectedSite) { await updateDoc(doc(db, 'sites', selectedSite.id), { status: value }); fetchSites(); } }} sx={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{STATUS_OPTIONS.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}</Select>
                    </FormControl>
                  </Box>
                  {/* 2행: flexbox */}
                  <Box sx={{ display: 'flex', gap: 2, mb: '13px' }}>
                    <TextField label="현장 주소" name="address" value={form.address} onChange={handleChange} fullWidth sx={{ flex: 2, bgcolor: '#23252b', input: { color: '#fff', fontSize: 15 }, label: { color: '#bbb', fontSize: 15 } }} />
                    <TextField label="착공일" name="startDate" type="date" value={form.startDate} onChange={handleChange} fullWidth InputLabelProps={{ shrink: true }} inputProps={{ pattern: '\d{4}-\d{2}-\d{2}' }} sx={{ flex: 1, bgcolor: '#23252b', input: { color: '#fff', fontSize: 15 }, label: { color: '#bbb', fontSize: 15 } }} />
                    <TextField label="준공예정일" name="endDate" type="date" value={form.endDate} onChange={handleChange} fullWidth InputLabelProps={{ shrink: true }} inputProps={{ pattern: '\d{4}-\d{2}-\d{2}' }} sx={{ flex: 1, bgcolor: '#23252b', input: { color: '#fff', fontSize: 15 }, label: { color: '#bbb', fontSize: 15 } }} />
                  </Box>
                  {/* 3행 */}
                  <Grid container spacing={2} sx={{ mb: '13px' }}>
                    <Grid item xs={12} md={4}>
                      <TextField label="담당자(소장)" name="manager" value={form.manager} onChange={handleChange} fullWidth sx={{ bgcolor: '#23252b', input: { color: '#fff', fontSize: 15 }, label: { color: '#bbb', fontSize: 15 } }} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField label="연락처" name="phone" value={form.phone} onChange={handleChange} fullWidth sx={{ bgcolor: '#23252b', input: { color: '#fff', fontSize: 15 }, label: { color: '#bbb', fontSize: 15 } }} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField label="현장 설명" name="desc" value={form.desc} onChange={handleChange} fullWidth sx={{ bgcolor: '#23252b', input: { color: '#fff', fontSize: 15 }, label: { color: '#bbb', fontSize: 15 } }} />
                    </Grid>
                  </Grid>
                  {/* 4행 */}
                  <Grid container spacing={2} sx={{ mb: '13px' }}>
                    <Grid item xs={12} md={4}>
                      <TextField label="계약금액" name="contractAmount" value={form.contractAmount} onChange={handleChange} fullWidth sx={{ bgcolor: '#23252b', input: { color: '#fff', fontSize: 15 }, label: { color: '#bbb', fontSize: 15 } }} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField label="선급금" name="advance" value={form.advance} onChange={handleChange} fullWidth sx={{ bgcolor: '#23252b', input: { color: '#fff', fontSize: 15 }, label: { color: '#bbb', fontSize: 15 } }} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField label="전체기성" name="totalProgress" value={form.totalProgress} onChange={handleChange} fullWidth sx={{ bgcolor: '#23252b', input: { color: '#fff', fontSize: 15 }, label: { color: '#bbb', fontSize: 15 } }} />
                    </Grid>
                  </Grid>
                  {/* 5행 */}
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField label="시공팀" name="team" value={form.team || ''} onChange={handleChange} fullWidth sx={{ bgcolor: '#23252b', input: { color: '#fff', fontSize: 15 }, label: { color: '#bbb', fontSize: 15 } }} />
                    </Grid>
                  </Grid>
                </Box>
              </Box>
              <Divider sx={{ my: 4, borderColor: '#444' }} />
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: '#fff', fontSize: 22, textAlign: 'left' }}>내용</Typography>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <Typography sx={{ width: 120, color: '#bbb', fontWeight: 600, fontSize: 16 }}>항목</Typography>
                  <Typography sx={{ width: 80, color: '#bbb', fontWeight: 600, fontSize: 16 }}>물량</Typography>
                  <Typography sx={{ width: 120, color: '#bbb', fontWeight: 600, fontSize: 16 }}>단가</Typography>
                </Box>
                {(form.items || []).map((item, idx) => (
                  <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <TextField value={item.name} onChange={e => { const v = e.target.value; setForm(prev => ({ ...prev, items: prev.items.map((it, i) => i === idx ? { ...it, name: v } : it) })); }} sx={{ width: 120, bgcolor: '#23252b', input: { color: '#fff', fontSize: 16 } }} size="medium" />
                    <TextField value={item.qty} onChange={e => { const v = e.target.value; setForm(prev => ({ ...prev, items: prev.items.map((it, i) => i === idx ? { ...it, qty: v } : it) })); }} sx={{ width: 80, bgcolor: '#23252b', input: { color: '#fff', fontSize: 16 } }} size="medium" />
                    <TextField value={item.price} onChange={e => { const v = e.target.value; setForm(prev => ({ ...prev, items: prev.items.map((it, i) => i === idx ? { ...it, price: v } : it) })); }} sx={{ width: 120, bgcolor: '#23252b', input: { color: '#fff', fontSize: 16 } }} size="medium" />
                    <Button color="error" size="medium" sx={{ minWidth: 36, ml: 1, fontSize: 14 }} onClick={() => setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }))}>삭제</Button>
                  </Box>
                ))}
                <Button variant="outlined" size="medium" sx={{ color: '#90caf9', borderColor: '#90caf9', mt: 1, fontWeight: 600, fontSize: 16 }} onClick={() => setForm(prev => ({ ...prev, items: [...(prev.items || []), { name: '', qty: '', price: '' }] }))}>+ 행 추가</Button>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, mt: 4, justifyContent: 'flex-end' }}>
                <Button variant="contained" color="primary" sx={{ minWidth: 140, fontWeight: 700, fontSize: 18 }} onClick={handleSubmit}>{selectedSite ? '수정하기' : '저장하기'}</Button>
                <Button variant="outlined" color="error" sx={{ minWidth: 120, fontWeight: 700, fontSize: 18 }} onClick={handleDelete} disabled={!selectedSite}>삭제</Button>
                <Button variant="contained" color="success" disabled={!selectedSite} sx={{ minWidth: 140, fontWeight: 700, fontSize: 18 }} onClick={handleGisung}>기성현황</Button>
              </Box>
            </Box>
          </Box>
        </Box>
      </Grid>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedSite ? '현장 정보 수정' : '새 현장 추가'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="현장명"
              value={form.name}
              onChange={handleChange}
              fullWidth
              required
            />
            <TextField
              label="현장 주소"
              value={form.address}
              onChange={handleChange}
              fullWidth
              required
            />
            <TextField
              label="착공일"
              type="date"
              value={form.startDate}
              onChange={handleChange}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="준공예정일"
              type="date"
              value={form.endDate}
              onChange={handleChange}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="상태"
              value={form.status}
              onChange={handleChange}
              fullWidth
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>취소</Button>
          <Button onClick={handleSubmit} variant="contained">
            저장
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default Sites; 