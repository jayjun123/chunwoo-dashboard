import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Paper, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Snackbar, Alert, useMediaQuery, Tabs, Tab, Autocomplete
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { db } from '../firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

const TAB_LABELS = ['안전관리', '안전 점검', '사고/사고예방', '안전 교육', '안전관리비'];

const SafetyPage = () => {
  const [tab, setTab] = useState(0);
  const [data, setData] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    title: '',
    date: '',
    description: '',
    type: 'inspection',
    siteName: '',
    attachment: null,
    preview: '',
    name: '',
    equipment: '',
    isIssued: false,
    receipt: null,
    receiptUrl: '',
    issueDoc: null,
    issueDocUrl: '',
    note: '',
    amount: '',
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const isMobile = useMediaQuery('(max-width:900px)');
  const [siteOptions, setSiteOptions] = useState([]);
  const [search, setSearch] = useState('');

  // 탭별 Firestore 컬렉션 매핑
  const collectionMap = ['sites', 'safety_inspections', 'safety_accidents', 'safety_education', 'safety_costs'];

  useEffect(() => {
    const q = query(collection(db, collectionMap[tab]));
    const unsub = onSnapshot(q, (snapshot) => {
      setData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
    // eslint-disable-next-line
  }, [tab]);

  // 전체 현장명 목록 불러오기
  useEffect(() => {
    const q = query(collection(db, 'sites'));
    const unsub = onSnapshot(q, (snapshot) => {
      setSiteOptions(snapshot.docs.map(doc => doc.data().name));
    });
    return () => unsub();
  }, []);

  const openDialog = (row = null) => {
    if (row) {
      setEditId(row.id);
      setForm({
        title: row.title,
        date: row.date,
        description: row.description,
        type: row.type || collectionMap[tab],
        siteName: row.siteName,
        attachment: row.attachment,
        preview: row.preview,
        name: row.name,
        equipment: row.equipment,
        isIssued: row.isIssued,
        receipt: row.receipt,
        receiptUrl: row.receiptUrl,
        issueDoc: row.issueDoc,
        issueDocUrl: row.issueDocUrl,
        note: row.note,
        amount: row.amount,
      });
    } else {
      setEditId(null);
      setForm({ title: '', date: '', description: '', type: collectionMap[tab], siteName: '', attachment: null, preview: '', name: '', equipment: '', isIssued: false, receipt: null, receiptUrl: '', issueDoc: null, issueDocUrl: '', note: '', amount: '' });
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditId(null);
  };

  const handleSave = async () => {
    if (tab === 1 || tab === 2 || tab === 3) {
      if (!form.title || !form.date) return;
    }
    if (tab === 4) {
      if (!form.siteName || !form.name || !form.date || !form.amount) return;
    }
    let previewUrl = form.preview;
    if (form.attachment) {
      const storageRef = ref(storage, `safety/${Date.now()}_${form.attachment.name}`);
      await uploadBytes(storageRef, form.attachment);
      previewUrl = await getDownloadURL(storageRef);
    }
    let receiptUrl = form.receiptUrl;
    if (form.receipt) {
      const storageRef = ref(storage, `safety/receipt_${Date.now()}_${form.receipt.name}`);
      await uploadBytes(storageRef, form.receipt);
      receiptUrl = await getDownloadURL(storageRef);
    }
    let issueDocUrl = form.issueDocUrl;
    if (form.issueDoc) {
      const storageRef = ref(storage, `safety/issueDoc_${Date.now()}_${form.issueDoc.name}`);
      await uploadBytes(storageRef, form.issueDoc);
      issueDocUrl = await getDownloadURL(storageRef);
    }
    const saveData = {
      ...form,
      preview: previewUrl,
      attachment: form.attachment ? form.attachment.name : '',
      receiptUrl,
      issueDocUrl,
    };
    try {
      if (editId) {
        await updateDoc(doc(db, collectionMap[tab], editId), saveData);
        setSnackbar({ open: true, message: '수정되었습니다.', severity: 'success' });
      } else {
        await addDoc(collection(db, collectionMap[tab]), saveData);
        setSnackbar({ open: true, message: '추가되었습니다.', severity: 'success' });
      }
      closeDialog();
    } catch (e) {
      setSnackbar({ open: true, message: '저장에 실패했습니다.', severity: 'error' });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('정말로 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, collectionMap[tab], id));
        setSnackbar({ open: true, message: '삭제되었습니다.', severity: 'success' });
      } catch (e) {
        setSnackbar({ open: true, message: '삭제에 실패했습니다.', severity: 'error' });
      }
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} variant={isMobile ? 'scrollable' : 'standard'} scrollButtons={isMobile ? 'auto' : false}>
          {TAB_LABELS.map(label => <Tab key={label} label={label} />)}
        </Tabs>
      </Paper>
      <Grid container spacing={2}>
        {tab > 0 && tab < 4 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">{TAB_LABELS[tab]}</Typography>
                <TextField size="small" placeholder="검색: 현장명/제목/비고" value={search} onChange={e => setSearch(e.target.value)} sx={{ mr: 2, width: 260 }} />
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => openDialog()}>
                  추가
                </Button>
              </Box>
              <TableContainer>
                <Table size={isMobile ? 'small' : 'medium'}>
                  <TableHead>
                    <TableRow>
                      <TableCell>현장명</TableCell>
                      <TableCell>제목</TableCell>
                      <TableCell>일자</TableCell>
                      <TableCell>첨부</TableCell>
                      <TableCell>미리보기</TableCell>
                      <TableCell>비고</TableCell>
                      <TableCell>관리</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.filter(row =>
                      (!search ||
                        (row.siteName && row.siteName.includes(search)) ||
                        (row.title && row.title.includes(search)) ||
                        (row.description && row.description.includes(search))
                      )
                    ).map(row => (
                      <TableRow key={row.id}>
                        <TableCell>{row.siteName}</TableCell>
                        <TableCell>{row.title}</TableCell>
                        <TableCell>{row.date}</TableCell>
                        <TableCell>
                          {row.preview ? (
                            <Button size="small" href={row.preview} target="_blank" download={row.attachment || true}>
                              {row.attachment || '다운로드'}
                            </Button>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {row.preview && (row.attachment && row.attachment.match(/\.(jpg|jpeg|png|gif)$/i)) ? (
                            <img src={row.preview} alt="미리보기" style={{ maxWidth: 60, maxHeight: 40 }} />
                          ) : row.preview ? (
                            <a href={row.preview} target="_blank" rel="noopener noreferrer">미리보기</a>
                          ) : '-'}
                        </TableCell>
                        <TableCell>{row.description}</TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => openDialog(row)}><EditIcon /></IconButton>
                          <IconButton size="small" onClick={() => handleDelete(row.id)}><DeleteIcon /></IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        )}
        {tab === 4 && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ mr: 2 }}>안전관리비</Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => openDialog()}>항목 추가</Button>
            </Box>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>현장명</TableCell>
                    <TableCell>이름</TableCell>
                    <TableCell>날짜</TableCell>
                    <TableCell>안전장비</TableCell>
                    <TableCell>분출여부</TableCell>
                    <TableCell>영수증</TableCell>
                    <TableCell>분출대장</TableCell>
                    <TableCell>비고</TableCell>
                    <TableCell>금액</TableCell>
                    <TableCell>관리</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.map(row => (
                    <TableRow key={row.id}>
                      <TableCell>{row.siteName}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.date}</TableCell>
                      <TableCell>{row.equipment}</TableCell>
                      <TableCell>{row.isIssued ? '예' : '아니오'}</TableCell>
                      <TableCell>{row.receiptUrl ? <a href={row.receiptUrl} target="_blank" rel="noopener noreferrer">다운로드</a> : '-'}</TableCell>
                      <TableCell>{row.issueDocUrl ? <a href={row.issueDocUrl} target="_blank" rel="noopener noreferrer">다운로드</a> : '-'}</TableCell>
                      <TableCell>{row.note}</TableCell>
                      <TableCell>{row.amount ? Number(row.amount).toLocaleString() : ''}</TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => openDialog(row)}><EditIcon /></IconButton>
                        <IconButton size="small" onClick={() => handleDelete(row.id)}><DeleteIcon /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Grid>
      {/* 추가/수정 다이얼로그 */}
      <Dialog open={dialogOpen} onClose={closeDialog}>
        <DialogTitle>{editId ? '수정' : '추가'}</DialogTitle>
        <DialogContent>
          {(tab === 1 || tab === 2 || tab === 3) && (
            <>
              <Autocomplete
                options={siteOptions}
                value={form.siteName}
                onChange={(e, newValue) => setForm({ ...form, siteName: newValue })}
                renderInput={(params) => (
                  <TextField {...params} label="현장명" fullWidth sx={{ mb: 1.75 }} />
                )}
              />
              <TextField
                label="제목"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                fullWidth sx={{ mb: 1.75 }}
              />
              <TextField
                label="일자"
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                fullWidth sx={{ mb: 1.75 }}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="비고"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                fullWidth sx={{ mb: 1.75 }}
              />
              <Button
                variant="outlined"
                component="label"
                sx={{ mb: 1.75 }}
              >
                파일 업로드
                <input
                  type="file"
                  hidden
                  onChange={e => setForm({ ...form, attachment: e.target.files[0] })}
                />
              </Button>
              {form.attachment && <Typography sx={{ mb: 1.75 }}>{form.attachment.name}</Typography>}
              <TextField
                label="미리보기"
                value={form.preview}
                onChange={e => setForm({ ...form, preview: e.target.value })}
                fullWidth sx={{ mb: 1.75 }}
              />
            </>
          )}
          {tab === 4 && (
            <>
              <Autocomplete
                options={siteOptions}
                value={form.siteName}
                onChange={(e, newValue) => setForm({ ...form, siteName: newValue })}
                renderInput={(params) => (
                  <TextField {...params} label="현장명" fullWidth sx={{ mb: 1.75 }} />
                )}
              />
              <TextField label="이름" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} fullWidth sx={{ mb: 1.75 }} />
              <TextField label="날짜" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} fullWidth sx={{ mb: 1.75 }} InputLabelProps={{ shrink: true }} />
              <TextField label="안전장비" value={form.equipment} onChange={e => setForm({ ...form, equipment: e.target.value })} fullWidth sx={{ mb: 1.75 }} />
              <TextField label="분출여부" value={form.isIssued ? '예' : '아니오'} onChange={e => setForm({ ...form, isIssued: e.target.value === '예' })} fullWidth sx={{ mb: 1.75 }} />
              <Button variant="outlined" component="label" sx={{ mb: 1.75 }}>
                영수증 사진 업로드
                <input type="file" hidden onChange={e => setForm({ ...form, receipt: e.target.files[0] })} />
              </Button>
              {form.receipt && <Typography sx={{ mb: 1.75 }}>{form.receipt.name}</Typography>}
              <Button variant="outlined" component="label" sx={{ mb: 1.75 }}>
                분출대장 업로드
                <input type="file" hidden onChange={e => setForm({ ...form, issueDoc: e.target.files[0] })} />
              </Button>
              {form.issueDoc && <Typography sx={{ mb: 1.75 }}>{form.issueDoc.name}</Typography>}
              <TextField label="비고" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} fullWidth sx={{ mb: 1.75 }} />
              <TextField label="금액" value={form.amount || ''} onChange={e => setForm({ ...form, amount: e.target.value })} fullWidth sx={{ mb: 1.75 }} />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>취소</Button>
          <Button variant="contained" onClick={handleSave}>{editId ? '수정' : '추가'}</Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default SafetyPage; 