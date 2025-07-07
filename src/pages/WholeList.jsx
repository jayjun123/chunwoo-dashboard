import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  Select,
  MenuItem,
  Chip,
  Alert,
  Snackbar,
  Tooltip,
  Checkbox,
  FormControlLabel,
  TableSortLabel
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Add as AddIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { exportToExcel } from '../utils/exportUtils';

const STATUS_OPTIONS = ['계획', '진행중', '완료', '미정'];
const CONTRACT_TYPE_OPTIONS = ['하도급계약', '납품계약', '일반계약', '계약없음', '원도급'];

// 정렬 함수
const sortData = (data, orderBy, order) => {
  return data.sort((a, b) => {
    let aValue = a[orderBy];
    let bValue = b[orderBy];

    // 날짜 필드 처리
    if (orderBy === 'createdAt' || orderBy === 'updatedAt') {
      aValue = aValue ? aValue.seconds : 0;
      bValue = bValue ? bValue.seconds : 0;
    }
    
    // 숫자 필드 처리 (계약금액, 선급금, 누계기성)
    if (orderBy === 'contractAmount' || orderBy === 'advance' || orderBy === 'totalProgress') {
      aValue = parseFloat(aValue) || 0;
      bValue = parseFloat(bValue) || 0;
    }

    // 문자열 필드 처리
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (order === 'desc') {
      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
    } else {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    }
  });
};

const scrollFocus = (ref) => () => {
  setTimeout(() => {
    ref?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 300);
};

const WholeList = () => {
  const [sites, setSites] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState(false);
  const [selectedSite, setSelectedSite] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [uploadDialog, setUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [sortBy, setSortBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  const navigate = useNavigate();

  // Firebase에서 데이터 실시간 가져오기
  useEffect(() => {
    const q = query(collection(db, 'sites'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const sitesData = [];
      querySnapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() };
        
        // 기존 상태값을 새로운 옵션에 맞게 마이그레이션
        if (data.status === '진행') {
          data.status = '진행중';
        } else if (data.status === '예정') {
          data.status = '계획';
        }
        
        sitesData.push(data);
      });
      setSites(sitesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 정렬 처리
  const handleRequestSort = (property) => {
    const isAsc = sortBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setSortBy(property);
  };

  // 정렬된 데이터
  const sortedSites = sortData([...sites], sortBy, order);

  // 페이지 변경
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // 페이지당 행 수 변경
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // 편집 다이얼로그 열기
  const handleEdit = (site) => {
    setSelectedSite(site);
    setEditDialog(true);
  };

  // 편집 다이얼로그 닫기
  const handleCloseEdit = () => {
    setEditDialog(false);
    setSelectedSite(null);
  };

  // 데이터 저장
  const handleSave = async (formData) => {
    try {
      if (selectedSite) {
        // 수정
        await updateDoc(doc(db, 'sites', selectedSite.id), {
          ...formData,
          updatedAt: new Date()
        });
        setSnackbar({ open: true, message: '현장 정보가 수정되었습니다.', severity: 'success' });
      } else {
        // 추가
        await addDoc(collection(db, 'sites'), {
          ...formData,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        setSnackbar({ open: true, message: '새 현장이 추가되었습니다.', severity: 'success' });
      }
      handleCloseEdit();
    } catch (error) {
      setSnackbar({ open: true, message: '오류가 발생했습니다: ' + error.message, severity: 'error' });
    }
  };

  // 데이터 삭제
  const handleDelete = async (siteId) => {
    if (window.confirm('정말로 이 현장을 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'sites', siteId));
        setSnackbar({ open: true, message: '현장이 삭제되었습니다.', severity: 'success' });
      } catch (error) {
        setSnackbar({ open: true, message: '삭제 중 오류가 발생했습니다: ' + error.message, severity: 'error' });
      }
    }
  };

  // 엑셀 다운로드
  const handleExportExcel = () => {
    console.log('엑셀 내보내기 시작');
    console.log('sites 데이터:', sites);
    console.log('sites 길이:', sites.length);
    
    // 데이터가 비어있는지 확인
    if (!sites || sites.length === 0) {
      alert('내보낼 데이터가 없습니다. 데이터를 먼저 로드해주세요.');
      return;
    }

    // 헤더 행 추가
    const headers = [
      '현장명', '진행상황', '계약구분', '계약금액', '선급금', '누계기성', 
      '주소', '착공일', '준공예정일', '회사명', '소장', '연락처', 
      '시공팀', '기타사항', '차수', '하도급지킴이', '주요현장'
    ];

    const exportData = sites.map(site => {
      console.log('처리 중인 site:', site);
      return {
        현장명: site.name || '',
        진행상황: site.status || '',
        계약구분: site.contractType || '',
        계약금액: site.contractAmount || '',
        선급금: site.advance || '',
        누계기성: site.totalProgress || '',
        주소: site.address || '',
        착공일: site.startDate || '',
        준공예정일: site.endDate || '',
        회사명: site.companyName || '',
        소장: site.manager || '',
        연락처: site.phone || '',
        시공팀: site.team || '',
        기타사항: site.desc || '',
        차수: site.installment || '',
        하도급지킴이: site.subcontractGuardian ? 'Y' : 'N',
        주요현장: site.isFavorite ? 'Y' : 'N'
      };
    });

    console.log('변환된 exportData:', exportData);
    console.log('exportData 길이:', exportData.length);

    // 컬럼 너비 자동 조정 (한글 텍스트 고려)
    const columnWidths = [
      { wch: 20 }, // 현장명
      { wch: 10 }, // 진행상황
      { wch: 12 }, // 계약구분
      { wch: 15 }, // 계약금액
      { wch: 12 }, // 선급금
      { wch: 12 }, // 누계기성
      { wch: 30 }, // 주소
      { wch: 12 }, // 착공일
      { wch: 12 }, // 준공예정일
      { wch: 20 }, // 회사명
      { wch: 10 }, // 소장
      { wch: 15 }, // 연락처
      { wch: 15 }, // 시공팀
      { wch: 20 }, // 기타사항
      { wch: 8 },  // 차수
      { wch: 12 }, // 하도급지킴이
      { wch: 10 }  // 주요현장
    ];

    const result = exportToExcel(exportData, '현장목록', '현장목록', { columnWidths });
    
    console.log('exportToExcel 결과:', result);
    
    if (result.success) {
      alert('엑셀 파일이 다운로드되었습니다.');
    } else {
      alert('엑셀 다운로드에 실패했습니다: ' + (result.error || '알 수 없는 오류'));
    }
  };

  // 엑셀 업로드
  const handleFileSelect = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUploadExcel = async () => {
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        let successCount = 0;
        let updateCount = 0;
        let errorCount = 0;

        // 데이터 변환 및 Firebase에 저장
        for (const row of jsonData) {
          try {
            const siteData = {
              name: row['현장명'] || '',
              status: row['진행상황'] || '',
              contractType: row['계약구분'] || '',
              contractAmount: row['계약금액'] || '',
              advance: row['선급금'] || '',
              totalProgress: row['누계기성'] || '',
              address: row['주소'] || '',
              startDate: row['착공일'] || '',
              endDate: row['준공예정일'] || '',
              companyName: row['회사명'] || '',
              manager: row['소장'] || '',
              phone: row['연락처'] || '',
              team: row['시공팀'] || '',
              desc: row['기타사항'] || '',
              installment: row['차수'] || '',
              subcontractGuardian: row['하도급지킴이'] === 'Y',
              isFavorite: row['주요현장'] === 'Y',
              updatedAt: new Date()
            };

            // 현장명으로 기존 데이터 검색
            const existingSite = sites.find(site => site.name === siteData.name);
            
            if (existingSite) {
              // 기존 데이터 업데이트
              await updateDoc(doc(db, 'sites', existingSite.id), siteData);
              updateCount++;
            } else {
              // 새 데이터 추가
              await addDoc(collection(db, 'sites'), {
                ...siteData,
                createdAt: new Date()
              });
              successCount++;
            }
          } catch (error) {
            console.error('데이터 처리 중 오류:', error);
            errorCount++;
          }
        }

        const message = `업로드 완료: ${successCount}개 추가, ${updateCount}개 수정${errorCount > 0 ? `, ${errorCount}개 오류` : ''}`;
        setSnackbar({ 
          open: true, 
          message: message, 
          severity: errorCount > 0 ? 'warning' : 'success' 
        });
        setUploadDialog(false);
        setSelectedFile(null);
      } catch (error) {
        setSnackbar({ open: true, message: '업로드 중 오류가 발생했습니다: ' + error.message, severity: 'error' });
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  // 현장 상세 페이지로 이동
  const handleViewDetail = (siteId) => {
    window.location.href = `/sites/${siteId}`;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography>데이터를 불러오는 중...</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        margin: 0,
        padding: 0,
        boxSizing: 'border-box',
        mt: '90px'
      }}
    >
      {/* 헤더 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/sites')}
            sx={{ fontWeight: 600 }}
          >
            돌아가기
          </Button>
          <Typography variant="h4" component="h1">
            전체 현장 목록
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => setUploadDialog(true)}
          >
            엑셀 업로드
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportExcel}
          >
            엑셀 다운로드
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setEditDialog(true)}
          >
            새 현장 추가
          </Button>
        </Box>
      </Box>

      {/* 데이터 테이블 */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  <TableSortLabel
                    active={sortBy === 'isFavorite'}
                    direction={sortBy === 'isFavorite' ? order : 'asc'}
                    onClick={() => handleRequestSort('isFavorite')}
                  >
                    주요
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  <TableSortLabel
                    active={sortBy === 'name'}
                    direction={sortBy === 'name' ? order : 'asc'}
                    onClick={() => handleRequestSort('name')}
                  >
                    현장명
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  <TableSortLabel
                    active={sortBy === 'status'}
                    direction={sortBy === 'status' ? order : 'asc'}
                    onClick={() => handleRequestSort('status')}
                  >
                    진행상황
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  <TableSortLabel
                    active={sortBy === 'contractType'}
                    direction={sortBy === 'contractType' ? order : 'asc'}
                    onClick={() => handleRequestSort('contractType')}
                  >
                    계약구분
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  <TableSortLabel
                    active={sortBy === 'contractAmount'}
                    direction={sortBy === 'contractAmount' ? order : 'asc'}
                    onClick={() => handleRequestSort('contractAmount')}
                  >
                    계약금액
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  <TableSortLabel
                    active={sortBy === 'advance'}
                    direction={sortBy === 'advance' ? order : 'asc'}
                    onClick={() => handleRequestSort('advance')}
                  >
                    선급금
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  <TableSortLabel
                    active={sortBy === 'totalProgress'}
                    direction={sortBy === 'totalProgress' ? order : 'asc'}
                    onClick={() => handleRequestSort('totalProgress')}
                  >
                    누계기성
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  <TableSortLabel
                    active={sortBy === 'address'}
                    direction={sortBy === 'address' ? order : 'asc'}
                    onClick={() => handleRequestSort('address')}
                  >
                    주소
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  <TableSortLabel
                    active={sortBy === 'startDate'}
                    direction={sortBy === 'startDate' ? order : 'asc'}
                    onClick={() => handleRequestSort('startDate')}
                  >
                    착공일
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  <TableSortLabel
                    active={sortBy === 'endDate'}
                    direction={sortBy === 'endDate' ? order : 'asc'}
                    onClick={() => handleRequestSort('endDate')}
                  >
                    준공예정일
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  <TableSortLabel
                    active={sortBy === 'companyName'}
                    direction={sortBy === 'companyName' ? order : 'asc'}
                    onClick={() => handleRequestSort('companyName')}
                  >
                    회사명
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  <TableSortLabel
                    active={sortBy === 'manager'}
                    direction={sortBy === 'manager' ? order : 'asc'}
                    onClick={() => handleRequestSort('manager')}
                  >
                    소장
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  <TableSortLabel
                    active={sortBy === 'phone'}
                    direction={sortBy === 'phone' ? order : 'asc'}
                    onClick={() => handleRequestSort('phone')}
                  >
                    연락처
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  <TableSortLabel
                    active={sortBy === 'team'}
                    direction={sortBy === 'team' ? order : 'asc'}
                    onClick={() => handleRequestSort('team')}
                  >
                    시공팀
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  <TableSortLabel
                    active={sortBy === 'installment'}
                    direction={sortBy === 'installment' ? order : 'asc'}
                    onClick={() => handleRequestSort('installment')}
                  >
                    차수
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  <TableSortLabel
                    active={sortBy === 'subcontractGuardian'}
                    direction={sortBy === 'subcontractGuardian' ? order : 'asc'}
                    onClick={() => handleRequestSort('subcontractGuardian')}
                  >
                    하도급지킴이
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600 }}>작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedSites
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((site) => (
                  <TableRow key={site.id} hover>
                    <TableCell>
                      {site.isFavorite ? (
                        <StarIcon sx={{ color: 'gold' }} />
                      ) : (
                        <StarBorderIcon />
                      )}
                    </TableCell>
                    <TableCell>{site.name}</TableCell>
                    <TableCell>
                      <Chip
                        label={site.status}
                        color={
                          site.status === '완료' ? 'success' :
                          site.status === '진행중' ? 'primary' :
                          site.status === '중단' ? 'error' : 'default'
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{site.contractType}</TableCell>
                    <TableCell>{site.contractAmount}</TableCell>
                    <TableCell>{site.advance}</TableCell>
                    <TableCell>{site.totalProgress}</TableCell>
                    <TableCell>{site.address}</TableCell>
                    <TableCell>{site.startDate}</TableCell>
                    <TableCell>{site.endDate}</TableCell>
                    <TableCell>{site.companyName}</TableCell>
                    <TableCell>{site.manager}</TableCell>
                    <TableCell>{site.phone}</TableCell>
                    <TableCell>{site.team}</TableCell>
                    <TableCell>{site.installment}</TableCell>
                    <TableCell>
                      {site.subcontractGuardian ? (
                        <Chip label="Y" color="primary" size="small" />
                      ) : (
                        <Chip label="N" color="default" size="small" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="상세보기">
                          <IconButton size="small" onClick={() => handleViewDetail(site.id)}>
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="수정">
                          <IconButton size="small" onClick={() => handleEdit(site)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="삭제">
                          <IconButton size="small" onClick={() => handleDelete(site.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={sortedSites.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="페이지당 행 수:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
        />
      </Paper>

      {/* 편집 다이얼로그 */}
      <EditDialog
        open={editDialog}
        site={selectedSite}
        onClose={handleCloseEdit}
        onSave={handleSave}
      />

      {/* 엑셀 업로드 다이얼로그 */}
      <Dialog open={uploadDialog} onClose={() => setUploadDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>엑셀 파일 업로드</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            • 기존 현장명과 동일한 경우 데이터가 업데이트됩니다.<br/>
            • 새로운 현장명의 경우 새 현장으로 추가됩니다.<br/>
            • 하도급지킴이와 주요현장은 'Y' 또는 'N'으로 입력하세요.<br/>
            • 날짜는 YYYY-MM-DD 형식으로 입력하세요.
          </Typography>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            style={{ marginTop: 16 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialog(false)}>취소</Button>
          <Button 
            onClick={handleUploadExcel} 
            variant="contained"
            disabled={!selectedFile}
          >
            업로드
          </Button>
        </DialogActions>
      </Dialog>

      {/* 스낵바 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// 편집 다이얼로그 컴포넌트
const EditDialog = ({ open, site, onClose, onSave }) => {
  const [form, setForm] = useState({
    name: '',
    status: '',
    contractType: '',
    contractAmount: '',
    advance: '',
    totalProgress: '',
    address: '',
    startDate: '',
    endDate: '',
    companyName: '',
    manager: '',
    phone: '',
    team: '',
    desc: '',
    installment: '',
    subcontractGuardian: false,
    isFavorite: false
  });

  const inputRef1 = useRef();
  const inputRef2 = useRef();
  const inputRef3 = useRef();
  const inputRef4 = useRef();
  const inputRef5 = useRef();
  const inputRef6 = useRef();
  const inputRef7 = useRef();
  const inputRef8 = useRef();
  const inputRef9 = useRef();
  const inputRef10 = useRef();
  const inputRef11 = useRef();
  const inputRef12 = useRef();
  const inputRef13 = useRef();
  const inputRef14 = useRef();
  const inputRef15 = useRef();
  const inputRef16 = useRef();
  const inputRef17 = useRef();
  const inputRef18 = useRef();
  const inputRef19 = useRef();
  const inputRef20 = useRef();

  useEffect(() => {
    if (site) {
      setForm(site);
    } else {
      setForm({
        name: '',
        status: '',
        contractType: '',
        contractAmount: '',
        advance: '',
        totalProgress: '',
        address: '',
        startDate: '',
        endDate: '',
        companyName: '',
        manager: '',
        phone: '',
        team: '',
        desc: '',
        installment: '',
        subcontractGuardian: false,
        isFavorite: false
      });
    }
  }, [site]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = () => {
    onSave(form);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{site ? '현장 정보 수정' : '새 현장 추가'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              name="name"
              label="현장명"
              value={form.name}
              onChange={handleChange}
              fullWidth
              required
              inputRef={inputRef1}
              onFocus={scrollFocus(inputRef1)}
            />
            <FormControl fullWidth>
              <Select name="status" value={form.status} onChange={handleChange}>
                {STATUS_OPTIONS.map(opt => (
                  <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl fullWidth>
              <Select name="contractType" value={form.contractType} onChange={handleChange}>
                {CONTRACT_TYPE_OPTIONS.map(opt => (
                  <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              name="installment"
              label="차수"
              value={form.installment}
              onChange={handleChange}
              fullWidth
              inputRef={inputRef2}
              onFocus={scrollFocus(inputRef2)}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              name="contractAmount"
              label="계약금액"
              value={form.contractAmount}
              onChange={handleChange}
              fullWidth
              inputRef={inputRef3}
              onFocus={scrollFocus(inputRef3)}
            />
            <TextField
              name="advance"
              label="선급금"
              value={form.advance}
              onChange={handleChange}
              fullWidth
              inputRef={inputRef4}
              onFocus={scrollFocus(inputRef4)}
            />
            <TextField
              name="totalProgress"
              label="누계기성"
              value={form.totalProgress}
              onChange={handleChange}
              fullWidth
              inputRef={inputRef5}
              onFocus={scrollFocus(inputRef5)}
            />
          </Box>

          <TextField
            name="address"
            label="주소"
            value={form.address}
            onChange={handleChange}
            fullWidth
            inputRef={inputRef6}
            onFocus={scrollFocus(inputRef6)}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              name="startDate"
              label="착공일"
              type="date"
              value={form.startDate}
              onChange={handleChange}
              fullWidth
              InputLabelProps={{ shrink: true }}
              inputRef={inputRef7}
              onFocus={scrollFocus(inputRef7)}
            />
            <TextField
              name="endDate"
              label="준공예정일"
              type="date"
              value={form.endDate}
              onChange={handleChange}
              fullWidth
              InputLabelProps={{ shrink: true }}
              inputRef={inputRef8}
              onFocus={scrollFocus(inputRef8)}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              name="companyName"
              label="회사명"
              value={form.companyName}
              onChange={handleChange}
              fullWidth
              inputRef={inputRef9}
              onFocus={scrollFocus(inputRef9)}
            />
            <TextField
              name="manager"
              label="소장"
              value={form.manager}
              onChange={handleChange}
              fullWidth
              inputRef={inputRef10}
              onFocus={scrollFocus(inputRef10)}
            />
            <TextField
              name="phone"
              label="연락처"
              value={form.phone}
              onChange={handleChange}
              fullWidth
              inputRef={inputRef11}
              onFocus={scrollFocus(inputRef11)}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              name="team"
              label="시공팀"
              value={form.team}
              onChange={handleChange}
              fullWidth
              inputRef={inputRef12}
              onFocus={scrollFocus(inputRef12)}
            />
            <TextField
              name="desc"
              label="기타사항"
              value={form.desc}
              onChange={handleChange}
              fullWidth
              multiline
              rows={2}
              inputRef={inputRef13}
              onFocus={scrollFocus(inputRef13)}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  name="subcontractGuardian"
                  checked={form.subcontractGuardian}
                  onChange={handleChange}
                />
              }
              label="하도급지킴이"
            />
            <FormControlLabel
              control={
                <Checkbox
                  name="isFavorite"
                  checked={form.isFavorite}
                  onChange={handleChange}
                />
              }
              label="주요현장"
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>취소</Button>
        <Button onClick={handleSubmit} variant="contained">
          저장
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WholeList; 