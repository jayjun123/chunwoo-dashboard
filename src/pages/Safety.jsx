import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Grid, Paper, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Snackbar, Alert, useMediaQuery, Tabs, Tab, Autocomplete
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, CloudDownload as CloudDownloadIcon } from '@mui/icons-material';
import { db, storage } from '../firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as XLSX from 'xlsx';
import SafetyOverviewCards from '../components/safety/SafetyOverviewCards';
import { exportToExcel } from '../utils/exportUtils';
import { useSearchParams, useNavigate } from 'react-router-dom';
import MobileLayout from '../components/common/MobileLayout';

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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [filteredSiteId, setFilteredSiteId] = useState(null);
  const [filteredSiteName, setFilteredSiteName] = useState('');

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

  // URL 파라미터에서 siteId 읽기
  useEffect(() => {
    const siteId = searchParams.get('siteId');
    if (siteId && siteOptions.length > 0) {
      setFilteredSiteId(siteId);
      // siteOptions는 현장명 배열이므로, siteId로 현장명 찾기 필요
      // siteOptions에 id가 없으면, sites 컬렉션에서 id로 name을 찾아야 함
      // 간단히 siteOptions에 id가 있다면 아래처럼, 없다면 별도 쿼리 필요
    }
  }, [searchParams, siteOptions]);

  // 데이터 필터링
  const filteredData = React.useMemo(() => {
    if (filteredSiteId && data && data.length > 0) {
      const site = data.find(s => s.id === filteredSiteId);
      if (site) {
        setFilteredSiteName(site.siteName);
        return data.filter(row => row.siteName === site.siteName);
      }
    }
    return data;
  }, [filteredSiteId, data]);

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

  const updateSiteSafetyCost = async (siteName) => {
    if (!siteName) return;
    try {
      const siteQuery = query(collection(db, 'sites'), where('name', '==', siteName));
      const siteSnapshot = await getDocs(siteQuery);
      if (siteSnapshot.empty) {
        console.error("업데이트할 현장을 찾을 수 없습니다:", siteName);
        return;
      }
      const siteDoc = siteSnapshot.docs[0];

      const safetyCostQuery = query(collection(db, 'safety_costs'), where('siteName', '==', siteName));
      const safetyCostSnapshot = await getDocs(safetyCostQuery);
      const totalSafetyCost = safetyCostSnapshot.docs.reduce((sum, doc) => sum + (Number(doc.data().amount) || 0), 0);

      await updateDoc(doc(db, 'sites', siteDoc.id), {
        safetyCost: totalSafetyCost
      });
      console.log(`'${siteName}' 현장의 안전관리비가 ${totalSafetyCost}으로 업데이트되었습니다.`);
    } catch (e) {
      console.error("현장 안전관리비 업데이트 실패:", e);
    }
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
      if (collectionMap[tab] === 'safety_costs') {
        await updateSiteSafetyCost(saveData.siteName);
      }
      closeDialog();
    } catch (e) {
      setSnackbar({ open: true, message: '저장에 실패했습니다.', severity: 'error' });
    }
  };

  const handleDelete = async (item) => {
    if (window.confirm('정말로 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, collectionMap[tab], item.id));
        if (collectionMap[tab] === 'safety_costs') {
          await updateSiteSafetyCost(item.siteName);
        }
        setSnackbar({ open: true, message: '삭제되었습니다.', severity: 'success' });
      } catch (e) {
        setSnackbar({ open: true, message: '삭제에 실패했습니다.', severity: 'error' });
      }
    }
  };

  const handleExcelExport = () => {
    const fileName = `${TAB_LABELS[tab]}_${new Date().toISOString().split('T')[0]}`;
    let dataToExport = [];

    if (tab >= 1 && tab <= 3) {
      dataToExport = data.map(row => ({
        '현장명': row.siteName,
        '제목': row.title,
        '일자': row.date,
        '첨부파일': row.attachment,
        '비고': row.description,
      }));
    } else if (tab === 4) {
      dataToExport = data.map(row => ({
        '현장명': row.siteName,
        '이름': row.name,
        '날짜': row.date,
        '안전장비': row.equipment,
        '분출여부': row.isIssued ? 'Y' : 'N',
        '비고': row.note,
        '금액': row.amount,
      }));
    }

    if (dataToExport.length === 0) {
      setSnackbar({ open: true, message: '엑셀로 내보낼 데이터가 없습니다.', severity: 'warning' });
      return;
    }

    // 컬럼 너비 설정 (한글 텍스트 고려)
    const columnWidths = [
      { wch: 20 }, // 현장명
      { wch: 25 }, // 제목/이름
      { wch: 15 }, // 일자/날짜
      { wch: 20 }, // 첨부파일/안전장비
      { wch: 10 }, // 분출여부
      { wch: 25 }, // 비고
      { wch: 15 }, // 금액
    ];

    const result = exportToExcel(dataToExport, TAB_LABELS[tab], fileName, { columnWidths });
    
    if (result.success) {
      setSnackbar({ open: true, message: '엑셀 파일이 다운로드되었습니다.', severity: 'success' });
    } else {
      setSnackbar({ open: true, message: '엑셀 다운로드에 실패했습니다.', severity: 'error' });
    }
  };

  const renderContent = () => {
    const currentLabel = TAB_LABELS[tab];
    
    if (tab === 0) {
      return (
        <Grid>
          <SafetyOverviewCards />
        </Grid>
      );
    }

    // 모바일에서는 카드 형태로 표시
    if (isMobile) {
      return (
        <Grid container spacing={2} sx={{ p: 1 }}>
          {filteredData.map((row) => (
            <Grid item xs={12} key={row.id}>
              <Paper
                sx={{
                  p: 2,
                  bgcolor: '#232b3b',
                  borderRadius: 2,
                  border: '1px solid #333',
                  '&:hover': {
                    bgcolor: '#2a3441',
                    borderColor: '#90caf9'
                  }
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant="h6" sx={{ color: '#fff', fontSize: '1rem', fontWeight: 600 }}>
                    {tab === 4 ? row.name : row.title}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        // 각 탭에 맞는 상세 페이지로 이동
                        const routes = {
                          1: '/safety-inspections', // 안전 점검
                          2: '/safety-accidents',   // 사고/사고예방
                          3: '/safety-education',  // 안전 교육
                          4: '/safety-costs'       // 안전관리비
                        };
                        navigate(routes[tab]);
                      }}
                      sx={{
                        color: '#90caf9',
                        borderColor: '#90caf9',
                        fontSize: '0.7rem',
                        px: 1,
                        py: 0.5,
                        '&:hover': {
                          bgcolor: '#90caf9',
                          color: '#000'
                        }
                      }}
                    >
                      상세보기
                    </Button>
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography sx={{ color: '#ccc', fontSize: '0.8rem' }}>
                    현장: {row.siteName}
                  </Typography>
                  <Typography sx={{ color: '#ccc', fontSize: '0.8rem' }}>
                    날짜: {row.date}
                  </Typography>
                  {tab === 4 && (
                    <>
                      <Typography sx={{ color: '#ccc', fontSize: '0.8rem' }}>
                        안전장비: {row.equipment}
                      </Typography>
                      <Typography sx={{ color: '#ccc', fontSize: '0.8rem' }}>
                        금액: {row.amount ? Number(row.amount).toLocaleString() : '-'}
                      </Typography>
                    </>
                  )}
                  {row.description && (
                    <Typography sx={{ color: '#ccc', fontSize: '0.8rem' }}>
                      비고: {row.description}
                    </Typography>
                  )}
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      );
    }
    
    const tableHeaders = {
      1: ['현장명', '제목', '일자', '첨부', '미리보기', '비고', '관리'], // 안전 점검
      2: ['현장명', '제목', '일자', '첨부', '미리보기', '비고', '관리'], // 사고/사고예방
      3: ['현장명', '제목', '일자', '첨부', '미리보기', '비고', '관리'], // 안전 교육
      4: ['현장명', '이름', '날짜', '안전장비', '분출여부', '영수증', '분출대장', '비고', '금액', '관리'] // 안전관리비
    };

    const renderRow = (row) => {
      if (tab >= 1 && tab <= 3) {
        return (
          <TableRow key={row.id}>
            <TableCell sx={{ 
              fontSize: isMobile ? '0.6rem' : 'inherit', 
              padding: isMobile ? '4px 2px' : 'auto',
              width: 'auto',
              minWidth: 0,
              maxWidth: '100%'
            }}>
              {row.siteName}
            </TableCell>
            <TableCell sx={{ 
              fontSize: isMobile ? '0.6rem' : 'inherit', 
              padding: isMobile ? '4px 2px' : 'auto',
              width: 'auto',
              minWidth: 0,
              maxWidth: '100%'
            }}>
              {row.title}
            </TableCell>
            <TableCell sx={{ 
              fontSize: isMobile ? '0.7rem' : 'inherit', 
              padding: isMobile ? '8px 4px' : 'auto',
              width: 'auto',
              minWidth: 0,
              maxWidth: '100%'
            }}>
              {row.date}
            </TableCell>
            <TableCell sx={{ 
              fontSize: isMobile ? '0.6rem' : 'inherit', 
              padding: isMobile ? '4px 2px' : 'auto',
              width: 'auto',
              minWidth: 0,
              maxWidth: '100%'
            }}>
              {row.preview ? (
                <Button 
                  size={isMobile ? 'small' : 'small'} 
                  href={row.preview} 
                  target="_blank" 
                  download={row.attachment || ''}
                  sx={{ fontSize: isMobile ? '0.6rem' : 'inherit' }}
                >
                  {row.attachment || '다운로드'}
                </Button>
              ) : '-'}
            </TableCell>
            <TableCell sx={{ 
              fontSize: isMobile ? '0.6rem' : 'inherit', 
              padding: isMobile ? '4px 2px' : 'auto',
              width: 'auto',
              minWidth: 0,
              maxWidth: '100%'
            }}>
              {row.preview && (row.attachment && row.attachment.match(/\.(jpg|jpeg|png|gif)$/i)) ? (
                <img src={row.preview} alt="미리보기" style={{ maxWidth: isMobile ? 40 : 60, maxHeight: isMobile ? 30 : 40 }} />
              ) : row.preview ? (
                <a href={row.preview} target="_blank" rel="noopener noreferrer" style={{ fontSize: isMobile ? '0.6rem' : 'inherit' }}>
                  미리보기
                </a>
              ) : '-'}
            </TableCell>
            <TableCell sx={{ 
              fontSize: isMobile ? '0.6rem' : 'inherit', 
              padding: isMobile ? '4px 2px' : 'auto',
              width: 'auto',
              minWidth: 0,
              maxWidth: '100%'
            }}>
              {row.description}
            </TableCell>
            <TableCell sx={{ 
              fontSize: isMobile ? '0.6rem' : 'inherit', 
              padding: isMobile ? '4px 2px' : 'auto',
              width: 'auto',
              minWidth: 0,
              maxWidth: '100%'
            }}>
              <IconButton size={isMobile ? 'small' : 'small'} onClick={() => openDialog(row)}>
                <EditIcon sx={{ fontSize: isMobile ? '1rem' : 'inherit' }} />
              </IconButton>
              <IconButton size={isMobile ? 'small' : 'small'} onClick={() => handleDelete(row)}>
                <DeleteIcon sx={{ fontSize: isMobile ? '1rem' : 'inherit' }} />
              </IconButton>
            </TableCell>
          </TableRow>
        );
      }
      if (tab === 4) {
        return (
          <TableRow key={row.id}>
            <TableCell sx={{ 
              fontSize: isMobile ? '0.6rem' : 'inherit', 
              padding: isMobile ? '4px 2px' : 'auto',
              width: 'auto',
              minWidth: 0,
              maxWidth: '100%'
            }}>
              {row.siteName}
            </TableCell>
            <TableCell sx={{ 
              fontSize: isMobile ? '0.6rem' : 'inherit', 
              padding: isMobile ? '4px 2px' : 'auto',
              width: 'auto',
              minWidth: 0,
              maxWidth: '100%'
            }}>
              {row.name}
            </TableCell>
            <TableCell sx={{ 
              fontSize: isMobile ? '0.7rem' : 'inherit', 
              padding: isMobile ? '8px 4px' : 'auto',
              width: 'auto',
              minWidth: 0,
              maxWidth: '100%'
            }}>
              {row.date}
            </TableCell>
            <TableCell sx={{ 
              fontSize: isMobile ? '0.6rem' : 'inherit', 
              padding: isMobile ? '4px 2px' : 'auto',
              width: 'auto',
              minWidth: 0,
              maxWidth: '100%'
            }}>
              {row.equipment}
            </TableCell>
            <TableCell sx={{ 
              fontSize: isMobile ? '0.6rem' : 'inherit', 
              padding: isMobile ? '4px 2px' : 'auto',
              width: 'auto',
              minWidth: 0,
              maxWidth: '100%'
            }}>
              {row.isIssued ? '예' : '아니오'}
            </TableCell>
            <TableCell sx={{ 
              fontSize: isMobile ? '0.6rem' : 'inherit', 
              padding: isMobile ? '4px 2px' : 'auto',
              width: 'auto',
              minWidth: 0,
              maxWidth: '100%'
            }}>
              {row.receiptUrl ? (
                <a href={row.receiptUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: isMobile ? '0.6rem' : 'inherit' }}>
                  다운로드
                </a>
              ) : '-'}
            </TableCell>
            <TableCell sx={{ 
              fontSize: isMobile ? '0.6rem' : 'inherit', 
              padding: isMobile ? '4px 2px' : 'auto',
              width: 'auto',
              minWidth: 0,
              maxWidth: '100%'
            }}>
              {row.issueDocUrl ? (
                <a href={row.issueDocUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: isMobile ? '0.6rem' : 'inherit' }}>
                  다운로드
                </a>
              ) : '-'}
            </TableCell>
            <TableCell sx={{ 
              fontSize: isMobile ? '0.6rem' : 'inherit', 
              padding: isMobile ? '4px 2px' : 'auto',
              width: 'auto',
              minWidth: 0,
              maxWidth: '100%'
            }}>
              {row.note}
            </TableCell>
            <TableCell sx={{ 
              fontSize: isMobile ? '0.6rem' : 'inherit', 
              padding: isMobile ? '4px 2px' : 'auto',
              width: 'auto',
              minWidth: 0,
              maxWidth: '100%'
            }}>
              {row.amount ? Number(row.amount).toLocaleString() : ''}
            </TableCell>
            <TableCell sx={{ 
              fontSize: isMobile ? '0.6rem' : 'inherit', 
              padding: isMobile ? '4px 2px' : 'auto',
              width: 'auto',
              minWidth: 0,
              maxWidth: '100%'
            }}>
              <IconButton size={isMobile ? 'small' : 'small'} onClick={() => openDialog(row)}>
                <EditIcon sx={{ fontSize: isMobile ? '1rem' : 'inherit' }} />
              </IconButton>
              <IconButton size={isMobile ? 'small' : 'small'} onClick={() => handleDelete(row)}>
                <DeleteIcon sx={{ fontSize: isMobile ? '1rem' : 'inherit' }} />
              </IconButton>
            </TableCell>
          </TableRow>
        );
      }
      return null;
    };
    
    return (
      <Grid sx={{
        width: '100%',
        maxWidth: '100%',
        minWidth: 0
      }}>
        <Paper sx={{ 
          p: isMobile ? 1 : 2,
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          overflow: 'hidden'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: isMobile ? 1 : 2, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 1 : 0 }}>
            <Typography variant="h6" sx={{ mr: isMobile ? 0 : 2, flexShrink: 0, fontSize: isMobile ? '1rem' : 'inherit' }}>
              {currentLabel}
            </Typography>
                        <TextField 
              size="small"
              placeholder="검색..." 
              value={search ?? ''} 
              onChange={e => setSearch(e.target.value)} 
              sx={{ 
                width: isMobile ? '100%' : { xs: 150, sm: 200, md: 260 },
                fontSize: isMobile ? '0.7rem' : 'inherit'
              }}
            />
            <Box sx={{ flexGrow: isMobile ? 0 : 1 }} />
            <Box sx={{ display: 'flex', gap: 1, width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-end' }}>
              <Button 
                variant="contained" 
                startIcon={<AddIcon />} 
                onClick={() => openDialog()}
                size={isMobile ? 'small' : 'medium'}
                sx={{ fontSize: isMobile ? '0.6rem' : 'inherit' }}
              >
                추가
              </Button>
              {!isMobile && (
                <Button variant="outlined" startIcon={<CloudDownloadIcon />} onClick={handleExcelExport}>
                  엑셀 다운로드
                </Button>
              )}
            </Box>
          </Box>
          <TableContainer sx={{ 
            width: '100%', 
            maxWidth: '100%', 
            minWidth: 0, 
            overflowX: 'auto',
            '& .MuiTable-root': {
              width: '100%',
              minWidth: 0,
              maxWidth: '100%'
            }
          }}>
            <Table size={isMobile ? 'small' : 'medium'} sx={{ 
              width: '100%', 
              minWidth: 0,
              maxWidth: '100%',
              tableLayout: 'auto',
              '& .MuiTableCell-root': {
                padding: isMobile ? '4px 2px' : 'auto'
              }
            }}>
                          <TableHead>
              <TableRow>
                {tableHeaders[tab].map(header => (
                  <TableCell 
                    key={header}
                    sx={{ 
                      fontSize: isMobile ? '0.6rem' : 'inherit',
                      padding: isMobile ? '4px 2px' : 'auto',
                      width: 'auto',
                      minWidth: 0,
                      maxWidth: '100%'
                    }}
                  >
                    {header}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
              <TableBody>
                {filteredData.filter(row => {
                  if (!search) return true;
                  const searchTerm = search.toLowerCase();
                  return Object.values(row).some(value => 
                    String(value).toLowerCase().includes(searchTerm)
                  );
                }).map(row => renderRow(row))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Grid>
    );
  };

  const scrollFocus = (ref) => () => {
    setTimeout(() => {
      ref?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  };

  const inputRef1 = useRef();

  return (
    <MobileLayout>
      <Box sx={{ 
        p: 0,
        position: 'fixed',
        top: isMobile ? '54px' : '65px',
        left: isMobile ? '20px' : 0,
        right: isMobile ? '20px' : 0,
        bottom: '51px',
        width: isMobile ? 'calc(100% - 40px)' : '100%',
        height: isMobile ? 'calc(100vh - 54px - 51px)' : 'calc(100vh - 65px - 51px)',
        overflow: 'auto',
        overflowX: 'hidden',
        zIndex: 1000,
        padding: isMobile ? '0px' : '16px',
        bgcolor: '#1a1d21'
      }}>
        <Paper sx={{ 
          mb: 2,
          marginBottom: '16px',
          borderRadius: '12px',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backgroundColor: '#1a1d21'
        }}>
          <Tabs
            value={tab}
            onChange={(e, v) => setTab(v)}
            sx={{
              mb: 2,
              bgcolor: '#232b3b',
              borderRadius: 2,
              boxShadow: 2,
              display: isMobile ? 'none' : 'flex',
              width: '100%',
              '& .MuiTab-root': {
                color: '#fff',
                fontWeight: 700,
                fontSize: '1rem',
                px: 3,
                py: 1.5,
                borderRadius: 2,
                minHeight: 48,
                              minWidth: 120,
                flex: 1,
                '&.Mui-selected': {
                  color: '#90caf9',
                  bgcolor: '#181c24',
                  fontWeight: 900,
                },
              },
              '& .MuiTabs-flexContainer': {
                gap: 2,
                width: '100%',
                justifyContent: 'space-between',
              },
            }}
          >
            {TAB_LABELS.map((label, index) => (
              <Tab
                key={label}
                label={label}
                sx={{
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '1rem',
                  px: 3,
                  py: 1.5,
                  borderRadius: 2,
                  minHeight: 48,
                  minWidth: 120,
                  '&.Mui-selected': {
                    color: '#90caf9',
                    bgcolor: '#181c24',
                    fontWeight: 900,
                  },
                }}
              />
            ))}
          </Tabs>
        </Paper>
        <Grid container spacing={2} sx={{
          height: 'calc(100vh - 120px)',
          overflowY: 'hidden',
          overflowX: 'hidden',
          width: '100%',
          maxWidth: '100%'
        }}>
          {renderContent()}
        </Grid>
        {/* 추가/수정 다이얼로그 */}
        <Dialog 
          open={dialogOpen} 
          onClose={closeDialog} 
          fullWidth 
          maxWidth="sm"
          sx={{
            ...(isMobile && {
              '& .MuiDialog-paper': {
                margin: '16px',
                width: 'calc(100% - 32px)',
                maxWidth: 'none'
              }
            })
          }}
        >
          <DialogTitle sx={{
            ...(isMobile && {
              fontSize: '1.1rem',
              padding: '16px 20px'
            })
          }}>
            {editId ? '수정' : '추가'}
          </DialogTitle>
          <DialogContent sx={{
            ...(isMobile && {
              padding: '16px 20px'
            })
          }}>
            <Autocomplete
              options={siteOptions}
              value={form.siteName}
              onChange={(event, newValue) => {
                setForm(prev => ({ ...prev, siteName: newValue || '' }));
              }}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label="현장명" 
                  margin="dense" 
                  fullWidth 
                  sx={{
                    ...(isMobile && {
                      '& .MuiInputBase-root': {
                        height: '40px'
                      }
                    })
                  }}
                />
              )}
            />
            {tab === 4 && (
              <>
                <TextField 
                  margin="dense" 
                  label="이름" 
                  fullWidth 
                  value={form.name} 
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  sx={{
                    ...(isMobile && {
                      '& .MuiInputBase-root': {
                        height: '40px'
                      }
                    })
                  }}
                />
                <TextField 
                  margin="dense" 
                  label="안전장비" 
                  fullWidth 
                  value={form.equipment} 
                  onChange={e => setForm(prev => ({ ...prev, equipment: e.target.value }))}
                  sx={{
                    ...(isMobile && {
                      '& .MuiInputBase-root': {
                        height: '40px'
                      }
                    })
                  }}
                />
                <TextField 
                  margin="dense" 
                  label="금액" 
                  fullWidth 
                  value={form.amount} 
                  onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))}
                  sx={{
                    ...(isMobile && {
                      '& .MuiInputBase-root': {
                        height: '40px'
                      }
                    })
                  }}
                />
              </>
            )}
            <TextField 
              margin="dense" 
              label="제목" 
              fullWidth 
              value={form.title} 
              onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
              sx={{
                ...(isMobile && {
                  '& .MuiInputBase-root': {
                    height: '40px'
                  }
                })
              }}
            />
            <TextField 
              margin="dense" 
              type="date" 
              fullWidth 
              value={form.date} 
              onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))} 
              InputLabelProps={{ shrink: true }}
              sx={{
                ...(isMobile && {
                  '& .MuiInputBase-root': {
                    height: '40px'
                  }
                })
              }}
            />
            <TextField 
              margin="dense" 
              label="비고" 
              fullWidth 
              multiline 
              rows={3} 
              value={form.description} 
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              sx={{
                ...(isMobile && {
                  '& .MuiInputBase-root': {
                    minHeight: '80px'
                  }
                })
              }}
            />
            <Box sx={{
              ...(isMobile && {
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                marginTop: '16px'
              })
            }}>
              <Button 
                variant="contained" 
                component="label" 
                sx={{ 
                  mt: 1,
                  ...(isMobile && {
                    height: '40px',
                    fontSize: '0.9rem'
                  })
                }}
              >
                파일 첨부
                <input type="file" hidden onChange={e => setForm(prev => ({ ...prev, attachment: e.target.files[0] }))} />
              </Button>
              {form.attachment && (
                <Typography variant="body2" sx={{ 
                  mt: 1,
                  ...(isMobile && {
                    fontSize: '0.8rem',
                    wordBreak: 'break-all'
                  })
                }}>
                  {form.attachment.name}
                </Typography>
              )}
              {tab === 4 && (
                <Box sx={{
                  ...(isMobile && {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  })
                }}>
                  <Button 
                    variant="contained" 
                    component="label" 
                    sx={{ 
                      mt: 1, 
                      ml: isMobile ? 0 : 1,
                      ...(isMobile && {
                        height: '40px',
                        fontSize: '0.9rem',
                        marginLeft: 0
                      })
                    }}
                  >
                    영수증 첨부 
                    <input type="file" hidden onChange={e => setForm(prev => ({ ...prev, receipt: e.target.files[0] }))} />
                  </Button>
                  <Button 
                    variant="contained" 
                    component="label" 
                    sx={{ 
                      mt: 1, 
                      ml: isMobile ? 0 : 1,
                      ...(isMobile && {
                        height: '40px',
                        fontSize: '0.9rem',
                        marginLeft: 0
                      })
                    }}
                  >
                    분출대장 첨부 
                    <input type="file" hidden onChange={e => setForm(prev => ({ ...prev, issueDoc: e.target.files[0] }))} />
                  </Button>
                </Box>
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{
            ...(isMobile && {
              padding: '16px 20px',
              justifyContent: 'space-between'
            })
          }}>
            <Button 
              onClick={closeDialog}
              sx={{
                ...(isMobile && {
                  fontSize: '0.9rem',
                  padding: '8px 16px'
                })
              }}
            >
              취소
            </Button>
            <Button 
              onClick={handleSave}
              sx={{
                ...(isMobile && {
                  fontSize: '0.9rem',
                  padding: '8px 16px'
                })
              }}
            >
              저장
            </Button>
          </DialogActions>
        </Dialog>
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{
            ...(isMobile && {
              bottom: '16px',
              left: '16px',
              right: '16px'
            })
          }}
        >
          <Alert 
            severity={snackbar.severity} 
            sx={{ 
              width: '100%',
              ...(isMobile && {
                fontSize: '0.9rem'
              })
            }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
        {filteredSiteId && filteredSiteName && (
          <Alert 
            severity="info" 
            sx={{ 
              mb: 2, 
              bgcolor: '#232b3b', 
              color: '#90caf9', 
              border: '1px solid #90caf9',
              ...(isMobile && {
                marginBottom: '16px',
                borderRadius: '12px',
                padding: '16px'
              })
            }}
          >
            <Typography variant="body1" sx={{ 
              fontWeight: 600,
              ...(isMobile && {
                fontSize: '1rem',
                lineHeight: 1.4
              })
            }}>
              📍 {filteredSiteName} 현장의 안전관리 데이터를 확인하고 있습니다.
            </Typography>
            {filteredData.length === 0 && (
              <Typography variant="body2" sx={{ 
                mt: 1, 
                color: '#ff9800',
                ...(isMobile && {
                  fontSize: '0.9rem',
                  lineHeight: 1.4
                })
              }}>
                이 현장에 대한 안전관리 자료가 없습니다. "자료 등록" 버튼을 클릭하여 안전관리 자료를 등록해주세요.
              </Typography>
            )}
          </Alert>
        )}
      </Box>
    </MobileLayout>
  );
};

export default SafetyPage; 