import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Grid, Paper, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Snackbar, Alert, useMediaQuery, Tabs, Tab, Autocomplete, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, CloudDownload as CloudDownloadIcon } from '@mui/icons-material';
import { db, storage } from '../firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as XLSX from 'xlsx';
import SafetyOverviewCards from '../components/safety/SafetyOverviewCards';
import { exportToExcel } from '../utils/exportUtils';
import { useSearchParams, useNavigate } from 'react-router-dom';


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
    isIssued: '아니요',
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
      // 기존 데이터의 isIssued 값을 문자열로 변환
      let isIssuedValue = '아니요';
      if (row.isIssued === true || row.isIssued === 'true' || row.isIssued === '예') {
        isIssuedValue = '예';
      } else if (row.isIssued === '일부분출') {
        isIssuedValue = '일부분출';
      }
      
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
        isIssued: isIssuedValue,
        receipt: row.receipt,
        receiptUrl: row.receiptUrl,
        issueDoc: row.issueDoc,
        issueDocUrl: row.issueDocUrl,
        note: row.note,
        amount: row.amount,
      });
    } else {
      setEditId(null);
      setForm({ title: '', date: '', description: '', type: collectionMap[tab], siteName: '', attachment: null, preview: '', name: '', equipment: '', isIssued: '아니요', receipt: null, receiptUrl: '', issueDoc: null, issueDocUrl: '', note: '', amount: '' });
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
    console.log('=== 안전관리비 저장 시작 ===');
    console.log('현재 탭:', tab);
    console.log('폼 데이터:', form);
    console.log('편집 ID:', editId);
    
    if (tab === 1 || tab === 2 || tab === 3) {
      if (!form.title || !form.date) {
        console.log('필수 필드 누락 (탭 1-3)');
        return;
      }
    }
    if (tab === 4) {
      console.log('안전관리비 필드 검증:');
      console.log('- siteName:', form.siteName);
      console.log('- name:', form.name);
      console.log('- date:', form.date);
      console.log('- amount:', form.amount);
      console.log('- isIssued:', form.isIssued);
      
      if (!form.siteName || !form.name || !form.date || !form.amount) {
        console.log('필수 필드 누락 (안전관리비)');
        setSnackbar({ open: true, message: '필수 필드를 모두 입력해주세요.', severity: 'warning' });
        return;
      }
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
    // 안전한 데이터 정리 함수
    const cleanValue = (value) => {
      if (value === undefined || value === null) {
        return '';
      }
      if (typeof value === 'object' && !(value instanceof Date)) {
        // File 객체나 기타 객체는 문자열로 변환하거나 제거
        return '';
      }
      return value;
    };

    // 안전관리비 전용 데이터 구조
    let saveData;
    
    if (tab === 4) { // 안전관리비 탭
      saveData = {
        siteName: cleanValue(form.siteName),
        name: cleanValue(form.name),
        date: cleanValue(form.date),
        equipment: cleanValue(form.equipment),
        isIssued: cleanValue(form.isIssued) || '아니요',
        note: cleanValue(form.note),
        amount: cleanValue(form.amount),
        preview: previewUrl || '',
        attachment: form.attachment ? form.attachment.name : '',
        receiptUrl: receiptUrl || '',
        issueDocUrl: issueDocUrl || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } else {
      // 기타 탭들
      saveData = {
        title: cleanValue(form.title),
        date: cleanValue(form.date),
        description: cleanValue(form.description),
        type: cleanValue(form.type) || collectionMap[tab],
        siteName: cleanValue(form.siteName),
        attachment: form.attachment ? form.attachment.name : '',
        preview: previewUrl || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    // 최종 검증: undefined나 null 값이 남아있는지 확인
    Object.keys(saveData).forEach(key => {
      if (saveData[key] === undefined || saveData[key] === null) {
        saveData[key] = '';
      }
    });
    
    console.log('저장할 데이터:', saveData);
    console.log('컬렉션:', collectionMap[tab]);
    
    try {
      // Firestore 저장 전 최종 데이터 검증
      console.log('Firestore 저장 전 데이터 검증:');
      for (const [key, value] of Object.entries(saveData)) {
        if (value === undefined) {
          console.error(`${key} 필드에 undefined 값이 있습니다!`);
          saveData[key] = '';
        }
        if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
          console.error(`${key} 필드에 객체가 있습니다:`, value);
          saveData[key] = '';
        }
      }
      
      if (editId) {
        console.log('수정 모드 - 문서 ID:', editId);
        // 수정 시에는 updatedAt만 업데이트
        const updateData = { ...saveData };
        delete updateData.createdAt;
        updateData.updatedAt = new Date().toISOString();
        
        await updateDoc(doc(db, collectionMap[tab], editId), updateData);
        console.log('수정 성공');
        setSnackbar({ open: true, message: '수정되었습니다.', severity: 'success' });
      } else {
        console.log('추가 모드');
        await addDoc(collection(db, collectionMap[tab]), saveData);
        console.log('추가 성공');
        setSnackbar({ open: true, message: '추가되었습니다.', severity: 'success' });
      }
      
      if (collectionMap[tab] === 'safety_costs') {
        console.log('안전관리비 현장 업데이트 시작');
        await updateSiteSafetyCost(saveData.siteName);
        console.log('안전관리비 현장 업데이트 완료');
      }
      
      closeDialog();
    } catch (e) {
      console.error('=== 저장 실패 상세 분석 ===');
      console.error('오류 객체:', e);
      console.error('오류 메시지:', e.message);
      console.error('오류 코드:', e.code);
      console.error('저장하려던 데이터:', saveData);
      console.error('컬렉션:', collectionMap[tab]);
      
      let errorMessage = '저장에 실패했습니다.';
      if (e.message.includes('invalid data')) {
        errorMessage = '잘못된 데이터 형식입니다. 모든 필드를 다시 확인해주세요.';
      } else if (e.message.includes('undefined')) {
        errorMessage = '일부 필드에 정의되지 않은 값이 있습니다.';
      }
      
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
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
        '분출여부': row.isIssued || '아니요',
        '첨부파일': row.preview || '',
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
      { wch: 15 }, // 제목/이름
      { wch: 12 }, // 일자/날짜
      { wch: 15 }, // 안전장비
      { wch: 10 }, // 분출여부
      { wch: 30 }, // 첨부파일 (미리보기 URL)
      { wch: 20 }, // 비고
      { wch: 12 }, // 금액
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
        <Grid item xs={12}>
          <SafetyOverviewCards />
        </Grid>
      );
    }

    // 모바일에서도 테이블 형태로 표시 (PC와 동일)
    
    const tableHeaders = {
      1: isMobile ? ['현장명', '제목', '일자'] : ['현장명', '제목', '일자', '첨부', '미리보기', '비고', '관리'], // 안전 점검
      2: isMobile ? ['현장명', '제목', '일자'] : ['현장명', '제목', '일자', '첨부', '미리보기', '비고', '관리'], // 사고/사고예방
      3: isMobile ? ['현장명', '제목', '일자'] : ['현장명', '제목', '일자', '첨부', '미리보기', '비고', '관리'], // 안전 교육
      4: ['현장명', '이름', '날짜', '안전장비', '분출여부', '첨부파일', '영수증', '분출대장', '비고', '금액', '관리'] // 안전관리비
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
            {!isMobile && (
              <>
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
              </>
            )}
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
              {row.isIssued || '아니요'}
            </TableCell>
            <TableCell sx={{ 
              fontSize: isMobile ? '0.6rem' : 'inherit', 
              padding: isMobile ? '4px 2px' : 'auto',
              width: 'auto',
              minWidth: 0,
              maxWidth: '100%'
            }}>
              {row.preview ? (
                <img 
                  src={row.preview} 
                  alt="첨부파일" 
                  style={{ 
                    maxWidth: isMobile ? 40 : 60, 
                    maxHeight: isMobile ? 30 : 40, 
                    cursor: 'pointer'
                  }} 
                  onClick={() => window.open(row.preview, '_blank')}
                />
              ) : '-'}
            </TableCell>
            <TableCell sx={{ 
              fontSize: isMobile ? '0.6rem' : 'inherit', 
              padding: isMobile ? '4px 2px' : 'auto',
              width: 'auto',
              minWidth: 0,
              maxWidth: '100%'
            }}>
              {row.receiptUrl ? (
                <img 
                  src={row.receiptUrl} 
                  alt="영수증" 
                  style={{ 
                    maxWidth: isMobile ? 40 : 60, 
                    maxHeight: isMobile ? 30 : 40, 
                    cursor: 'pointer'
                  }} 
                  onClick={() => window.open(row.receiptUrl, '_blank')}
                />
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
                <img 
                  src={row.issueDocUrl} 
                  alt="분출대장" 
                  style={{ 
                    maxWidth: isMobile ? 40 : 60, 
                    maxHeight: isMobile ? 30 : 40, 
                    cursor: 'pointer'
                  }} 
                  onClick={() => window.open(row.issueDocUrl, '_blank')}
                />
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
      <Grid item xs={12} sx={{
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
              {(!isMobile || (tab !== 1 && tab !== 2 && tab !== 3)) && (
                <Button 
                  variant="outlined" 
                  startIcon={<CloudDownloadIcon />} 
                  onClick={handleExcelExport}
                  sx={{
                    ...(isMobile && {
                      fontSize: '0.7rem',
                      padding: '4px 8px',
                      minWidth: 'auto'
                    })
                  }}
                >
                  {isMobile ? '엑셀' : '엑셀 다운로드'}
                </Button>
              )}
            </Box>
          </Box>
          <TableContainer sx={{ 
            width: '100%', 
            maxWidth: '100%', 
            minWidth: 0, 
            overflowX: 'auto',
            ...(isMobile && {
              maxHeight: '60vh',
              overflowY: 'auto',
              overflowX: 'hidden' // 모바일에서 가로 스크롤 숨김
            }),
            '& .MuiTable-root': {
              width: '100%',
              minWidth: isMobile ? 'auto' : 0, // 모바일에서 최소 너비 자동
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
    <Box sx={{ 
      p: isMobile ? 0 : 3,
      mt: isMobile ? '30px' : 8,
      position: isMobile ? 'relative' : 'relative',
      top: isMobile ? 'auto' : 'auto',
      left: isMobile ? 'auto' : 'auto',
      right: isMobile ? 'auto' : 'auto',
      bottom: isMobile ? 'auto' : 'auto',
      width: isMobile ? '100%' : '100%',
      height: isMobile ? 'auto' : 'auto',
      overflow: 'auto',
      overflowX: 'hidden',
      zIndex: isMobile ? 'auto' : 'auto',
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
              display: 'flex', // 모바일에서도 탭 표시
              width: '100%',
              '& .MuiTab-root': {
                color: '#fff',
                fontWeight: 700,
                fontSize: isMobile ? '0.8rem' : '1rem',
                px: isMobile ? 1 : 3,
                py: isMobile ? 1 : 1.5,
                borderRadius: 2,
                minHeight: isMobile ? 40 : 48,
                minWidth: isMobile ? 80 : 120,
                flex: 1,
                '&.Mui-selected': {
                  color: '#90caf9',
                  bgcolor: '#181c24',
                  fontWeight: 900,
                },
              },
              '& .MuiTabs-flexContainer': {
                gap: isMobile ? 1 : 2,
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
          height: isMobile ? 'auto' : 'calc(100vh - 120px)',
          overflowY: isMobile ? 'auto' : 'hidden',
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
          disableRestoreFocus={false}
          disableEnforceFocus={false}
          hideBackdrop={false}
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
                <FormControl 
                  fullWidth 
                  margin="dense"
                  sx={{
                    ...(isMobile && {
                      '& .MuiInputBase-root': {
                        height: '40px'
                      }
                    })
                  }}
                >
                  <InputLabel>분출여부</InputLabel>
                  <Select
                    value={form.isIssued}
                    onChange={e => setForm(prev => ({ ...prev, isIssued: e.target.value }))}
                    label="분출여부"
                  >
                    <MenuItem value="아니요">아니요</MenuItem>
                    <MenuItem value="예">예</MenuItem>
                    <MenuItem value="일부분출">일부분출</MenuItem>
                  </Select>
                </FormControl>
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
                <TextField 
                  margin="dense" 
                  label="비고" 
                  fullWidth 
                  multiline
                  rows={2}
                  value={form.note} 
                  onChange={e => setForm(prev => ({ ...prev, note: e.target.value }))}
                  sx={{
                    ...(isMobile && {
                      '& .MuiInputBase-root': {
                        minHeight: '60px'
                      }
                    })
                  }}
                />
                <Box sx={{ mt: 1, mb: 1 }}>
                  <Button 
                    variant="outlined" 
                    component="label" 
                    sx={{ 
                      mr: 1,
                      ...(isMobile && {
                        height: '40px',
                        fontSize: '0.9rem'
                      })
                    }}
                  >
                    첨부파일 선택
                    <input 
                      type="file" 
                      hidden 
                      onChange={e => setForm(prev => ({ ...prev, attachment: e.target.files[0] }))} 
                    />
                  </Button>
                  {form.attachment && (
                    <Typography variant="body2" sx={{ mt: 1, color: '#4caf50' }}>
                      선택된 파일: {form.attachment.name}
                    </Typography>
                  )}
                </Box>
                <TextField 
                  margin="dense" 
                  label="미리보기 URL" 
                  fullWidth 
                  value={form.preview || ''} 
                  onChange={e => setForm(prev => ({ ...prev, preview: e.target.value }))}
                  placeholder="첨부파일의 미리보기 URL을 입력하세요"
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
  );
};

export default SafetyPage; 