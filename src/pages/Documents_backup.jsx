import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  useTheme,
  useMediaQuery,
  Snackbar,
  Alert,
  LinearProgress,
  Chip,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Description as DescriptionIcon,
  Folder as FolderIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  CloudUpload as CloudUploadIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  orderBy, 
  query,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const Documents = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { currentUser } = useAuth();
  
  const [documents, setDocuments] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [open, setOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
    file: null,
  });
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewFileUrl, setPreviewFileUrl] = useState(null);
  
  // 탭 관련 상태
  const [currentTab, setCurrentTab] = useState(0);
  
  // 보고서 다운로드 관련 상태
  const [reportType, setReportType] = useState('');
  const [reportPeriod, setReportPeriod] = useState('');
  const [reportData, setReportData] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);

  // 문서 목록 로드
  useEffect(() => {
    loadDocuments();
  }, []);

  // 검색어에 따른 문서 필터링
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredDocuments(documents);
    } else {
      const filtered = documents.filter(doc => 
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredDocuments(filtered);
    }
  }, [documents, searchTerm]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'documents'), orderBy('uploadDate', 'desc'));
      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // 샘플 문서 필터링 (제목에 '샘플' 또는 'Sample'이 포함된 문서 제외)
      const filteredDocs = docs.filter(doc => {
        const title = doc.title || '';
        const isSample = title.toLowerCase().includes('샘플') || 
                        title.toLowerCase().includes('sample') ||
                        title.toLowerCase().includes('예시') ||
                        title.toLowerCase().includes('example');
        return !isSample;
      });
      
      setDocuments(filteredDocs);
    } catch (error) {
      console.error('문서 로드 실패:', error);
      setSnackbar({ open: true, message: '문서 목록을 불러오는데 실패했습니다.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (doc = null) => {
    if (doc) {
      setSelectedDoc(doc);
      setFormData({
        title: doc.title || '',
        category: doc.category || '',
        description: doc.description || '',
        file: null,
      });
    } else {
      setSelectedDoc(null);
      setFormData({
        title: '',
        category: '',
        description: '',
        file: null,
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedDoc(null);
    setFormData({
      title: '',
      category: '',
      description: '',
      file: null,
    });
    // 미리보기 URL 정리
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (previewFileUrl) {
      URL.revokeObjectURL(previewFileUrl);
      setPreviewFileUrl(null);
    }
    setPreviewFile(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // 파일 크기 제한 (50MB)
      if (file.size > 50 * 1024 * 1024) {
        setSnackbar({ open: true, message: '파일 크기는 50MB 이하여야 합니다.', severity: 'error' });
        return;
      }
      setFormData({ ...formData, file });
    }
  };

  const handlePreviewFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // 파일 크기 제한 (50MB)
      if (file.size > 50 * 1024 * 1024) {
        setSnackbar({ open: true, message: '파일 크기는 50MB 이하여야 합니다.', severity: 'error' });
        return;
      }
      setPreviewFile(file);
      
      // 미리보기 URL 생성
      const url = URL.createObjectURL(file);
      setPreviewFileUrl(url);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 탭 변경 핸들러
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  // 보고서 데이터 생성
  const generateReportData = () => {
    const now = new Date();
    const reportTypes = {
      'monthly': '월간 보고서',
      'quarterly': '분기 보고서',
      'yearly': '연간 보고서',
      'custom': '사용자 정의 보고서'
    };

    const reportData = documents.map(doc => ({
      id: doc.id,
      title: doc.title,
      category: doc.category,
      uploadDate: doc.uploadDate,
      fileSize: doc.fileSize,
      uploader: doc.uploader || 'Unknown'
    }));

    return {
      type: reportTypes[reportType] || '보고서',
      period: reportPeriod,
      generatedAt: now.toLocaleString('ko-KR'),
      totalDocuments: reportData.length,
      data: reportData
    };
  };

  // 보고서 다운로드 핸들러
  const handleReportDownload = async () => {
    if (!reportType) {
      setSnackbar({ open: true, message: '보고서 유형을 선택해주세요.', severity: 'error' });
      return;
    }

    try {
      setReportLoading(true);
      const reportData = generateReportData();
      
      // CSV 형태로 다운로드
      const csvContent = generateCSV(reportData);
      downloadCSV(csvContent, `문서_보고서_${new Date().toISOString().split('T')[0]}.csv`);
      
      setSnackbar({ open: true, message: '보고서가 다운로드되었습니다.', severity: 'success' });
    } catch (error) {
      console.error('보고서 다운로드 실패:', error);
      setSnackbar({ open: true, message: '보고서 다운로드에 실패했습니다.', severity: 'error' });
    } finally {
      setReportLoading(false);
    }
  };

  // CSV 생성
  const generateCSV = (reportData) => {
    const headers = ['문서명', '카테고리', '업로드일', '파일크기', '업로더'];
    const csvRows = [headers.join(',')];
    
    reportData.data.forEach(doc => {
      const row = [
        `"${doc.title}"`,
        `"${doc.category}"`,
        `"${doc.uploadDate}"`,
        `"${doc.fileSize}"`,
        `"${doc.uploader}"`
      ];
      csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
  };

  // CSV 다운로드
  const downloadCSV = (csvContent, filename) => {
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      setSnackbar({ open: true, message: '제목을 입력해주세요.', severity: 'error' });
      return;
    }

    if (!selectedDoc && !formData.file) {
      setSnackbar({ open: true, message: '파일을 선택해주세요.', severity: 'error' });
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      let fileUrl = selectedDoc?.fileUrl;
      let fileName = selectedDoc?.fileName;
      let fileSize = selectedDoc?.fileSize;
      let previewFileUrl = selectedDoc?.previewFileUrl;

      // 새 파일 업로드
      if (formData.file) {
        setUploadProgress(10);
        
        const timestamp = Date.now();
        const fileNameWithTimestamp = `${timestamp}_${formData.file.name}`;
        const storageRef = ref(storage, `documents/${fileNameWithTimestamp}`);
        
        const metadata = {
          customMetadata: {
            uploadedBy: currentUser?.uid || 'anonymous',
            uploadedAt: new Date().toISOString(),
            originalName: formData.file.name,
            type: 'document'
          }
        };

        setUploadProgress(30);
        const snapshot = await uploadBytes(storageRef, formData.file, metadata);
        setUploadProgress(70);
        
        fileUrl = await getDownloadURL(snapshot.ref);
        fileName = formData.file.name;
        fileSize = formatFileSize(formData.file.size);
        
        setUploadProgress(90);

        // 기존 파일 삭제 (수정 시)
        if (selectedDoc?.fileUrl) {
          try {
            const oldFileRef = ref(storage, selectedDoc.fileUrl);
            await deleteObject(oldFileRef);
          } catch (error) {
            console.warn('기존 파일 삭제 실패:', error);
          }
        }
      }

      // 미리보기 파일 업로드
      if (previewFile) {
        const timestamp = Date.now();
        const previewFileNameWithTimestamp = `${timestamp}_preview_${previewFile.name}`;
        const previewStorageRef = ref(storage, `documents/${previewFileNameWithTimestamp}`);
        
        const previewMetadata = {
          customMetadata: {
            uploadedBy: currentUser?.uid || 'anonymous',
            uploadedAt: new Date().toISOString(),
            originalName: previewFile.name,
            type: 'preview'
          }
        };

        const previewSnapshot = await uploadBytes(previewStorageRef, previewFile, previewMetadata);
        previewFileUrl = await getDownloadURL(previewSnapshot.ref);

        // 기존 미리보기 파일 삭제 (수정 시)
        if (selectedDoc?.previewFileUrl) {
          try {
            const oldPreviewFileRef = ref(storage, selectedDoc.previewFileUrl);
            await deleteObject(oldPreviewFileRef);
          } catch (error) {
            console.warn('기존 미리보기 파일 삭제 실패:', error);
          }
        }
      }

      const documentData = {
        title: formData.title.trim(),
        category: formData.category,
        description: formData.description.trim(),
        fileUrl,
        fileName,
        fileSize,
        previewFileUrl,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser?.uid || 'anonymous',
      };

      if (selectedDoc) {
        // 문서 수정
        await updateDoc(doc(db, 'documents', selectedDoc.id), documentData);
        setSnackbar({ open: true, message: '문서가 수정되었습니다.', severity: 'success' });
      } else {
        // 새 문서 추가
        documentData.uploadDate = serverTimestamp();
        documentData.uploadedBy = currentUser?.uid || 'anonymous';
        await addDoc(collection(db, 'documents'), documentData);
        setSnackbar({ open: true, message: '문서가 업로드되었습니다.', severity: 'success' });
      }

      setUploadProgress(100);
      // 미리보기 URL 정리
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      handleClose();
      loadDocuments();
    } catch (error) {
      console.error('문서 저장 실패:', error);
      setSnackbar({ open: true, message: '문서 저장에 실패했습니다.', severity: 'error' });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (doc) => {
    try {
      // Storage에서 파일 삭제
      if (doc.fileUrl) {
        const fileRef = ref(storage, doc.fileUrl);
        await deleteObject(fileRef);
      }

      // Firestore에서 문서 삭제
      await deleteDoc(doc(db, 'documents', doc.id));
      
      setSnackbar({ open: true, message: '문서가 삭제되었습니다.', severity: 'success' });
      loadDocuments();
    } catch (error) {
      console.error('문서 삭제 실패:', error);
      setSnackbar({ open: true, message: '문서 삭제에 실패했습니다.', severity: 'error' });
    }
  };

  const handleDownload = async (doc) => {
    try {
      if (doc.fileUrl) {
        const response = await fetch(doc.fileUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.fileName || 'document';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('다운로드 실패:', error);
      setSnackbar({ open: true, message: '다운로드에 실패했습니다.', severity: 'error' });
    }
  };

  const handlePreview = (doc) => {
    setPreviewDoc(doc);
  };

  const getFileIcon = (fileName) => {
    if (!fileName) return <DescriptionIcon />;
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return <DescriptionIcon sx={{ color: '#f44336' }} />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <DescriptionIcon sx={{ color: '#4caf50' }} />;
      case 'doc':
      case 'docx':
        return <DescriptionIcon sx={{ color: '#2196f3' }} />;
      case 'xls':
      case 'xlsx':
        return <DescriptionIcon sx={{ color: '#4caf50' }} />;
      default:
        return <DescriptionIcon sx={{ color: '#90caf9' }} />;
    }
  };

  const renderPreview = () => {
    if (!previewDoc) {
      return (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%',
          color: '#ccc',
          textAlign: 'center',
          p: 3
        }}>
          <Box>
            <DescriptionIcon sx={{ fontSize: 64, color: '#666', mb: 2 }} />
            <Typography variant="h6" sx={{ color: '#ccc' }}>
              문서를 선택하면 미리보기가 표시됩니다
            </Typography>
            <Typography variant="body2" sx={{ color: '#888', mt: 1 }}>
              왼쪽 목록에서 문서를 클릭하세요
            </Typography>
          </Box>
        </Box>
      );
    }

    // 미리보기 파일이 있으면 미리보기 파일을 사용, 없으면 원본 파일 사용
    const displayUrl = previewDoc.previewFileUrl || previewDoc.fileUrl;
    const isImage = previewDoc.fileName && /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(previewDoc.fileName);
    const isPdf = previewDoc.fileName && previewDoc.fileName.toLowerCase().endsWith('.pdf');

    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* 미리보기 영역만 표시 */}
        <Box sx={{ flex: 1, overflow: 'auto', bgcolor: '#1a1a1a', borderRadius: '8px' }}>
          {previewDoc.previewFileUrl ? (
            // 미리보기 파일이 있는 경우
            <Box sx={{ 
              textAlign: 'center', 
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 2
            }}>
              <img
                src={previewDoc.previewFileUrl}
                alt={previewDoc.title}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
                }}
              />
            </Box>
          ) : isImage ? (
            // 미리보기 파일이 없고 원본이 이미지인 경우
            <Box sx={{ 
              textAlign: 'center', 
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 2
            }}>
              <img
                src={previewDoc.fileUrl}
                alt={previewDoc.title}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
                }}
              />
            </Box>
          ) : isPdf ? (
            // PDF 파일인 경우
            <Box sx={{ height: '100%' }}>
              <iframe
                src={previewDoc.fileUrl}
                width="100%"
                height="100%"
                style={{ border: 'none', borderRadius: '8px' }}
                title={previewDoc.title}
              />
            </Box>
          ) : (
            // 미리보기를 지원하지 않는 파일 형식
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '100%',
              flexDirection: 'column',
              gap: 2,
              p: 3
            }}>
              {getFileIcon(previewDoc.fileName)}
              <Typography variant="h6" sx={{ color: '#ccc' }}>
                미리보기를 지원하지 않는 파일 형식입니다
              </Typography>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={() => handleDownload(previewDoc)}
                sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#45a049' } }}
              >
                다운로드
              </Button>
            </Box>
          )}
        </Box>
      </Box>
    );
  };

  const categories = ['안전', '일지', '계약서', '기타'];

  return (
    <Box sx={{ 
      height: 'calc(100vh - 65px - 51px)',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: '65px',
      left: 0,
      right: 0,
      bottom: '51px',
      overflow: 'hidden',
      overflowX: 'hidden',
      zIndex: 1000,
      bgcolor: '#1a1d21',
      color: 'white'
    }}>
      {/* 헤더 - 제목과 탭 */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        p: 2, 
        borderBottom: 1, 
        borderColor: 'divider', 
        bgcolor: '#232b3b' 
      }}>
        <Typography variant="h5" sx={{ color: '#90caf9', fontWeight: 'bold' }}>
          📁 문서 관리
        </Typography>
        
        <Tabs 
          value={currentTab} 
          onChange={handleTabChange}
          sx={{
            minHeight: 'auto',
            '& .MuiTab-root': {
              color: '#90caf9',
              minHeight: '32px',
              padding: '4px 12px',
              fontSize: '0.875rem',
              textTransform: 'none',
              '&.Mui-selected': {
                color: '#4caf50'
              }
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#4caf50',
              height: '2px'
            }
          }}
        >
          <Tab label="문서 관리" />
          <Tab label="보고서 다운로드" />
        </Tabs>
      </Box>
      {/* 탭 내용 */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {currentTab === 0 && (
          // 문서 관리 탭
          isMobile ? (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '100%', 
              flexDirection: 'column',
              p: 3,
              textAlign: 'center'
            }}>
              <Typography variant="h4" sx={{ mb: 3, color: '#90caf9' }}>
                📱 모바일 제한 안내
              </Typography>
              <Box sx={{ 
                p: 3, 
                bgcolor: '#232b3b', 
                borderRadius: 2, 
                border: '1px solid #90caf9',
                maxWidth: '400px'
              }}>
                <Typography variant="body1" sx={{ color: '#90caf9', fontWeight: 'bold', mb: 2 }}>
                  문서관리 기능
                </Typography>
                <Typography variant="body2" sx={{ color: '#bbb', lineHeight: 1.6, mb: 2 }}>
                  문서 업로드, 다운로드, 관리 기능이 모바일에서 제한됩니다.
                </Typography>
                <Typography variant="body2" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
                  PC로 접속하여 이용해 주세요.
                </Typography>
              </Box>
            </Box>
          ) : (
            // PC 문서 관리 내용
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {/* 문서 관리 UI */}
              <Box sx={{ p: 2, borderBottom: '1px solid #444' }}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setOpen(true)}
                    sx={{ 
                      bgcolor: '#4caf50', 
                      '&:hover': { bgcolor: '#45a049' },
                      color: 'white'
                    }}
                  >
                    새 문서 추가
                  </Button>
                </Box>
                
                {/* 검색 */}
                <TextField
                  fullWidth
                  placeholder="문서 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& fieldset': { borderColor: '#444' },
                      '&:hover fieldset': { borderColor: '#90caf9' },
                      '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                    },
                    '& .MuiInputBase-input::placeholder': { color: '#bbb' }
                  }}
                />
              </Box>

              {/* 문서 목록 */}
              <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                    <LinearProgress sx={{ width: '100%' }} />
                  </Box>
                ) : filteredDocuments.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="h6" sx={{ color: '#bbb', mb: 2 }}>
                      등록된 문서가 없습니다
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#666' }}>
                      새 문서를 추가해보세요
                    </Typography>
                  </Box>
                ) : (
                  <Grid container spacing={2}>
                    {filteredDocuments.map((doc) => (
                      <Grid item xs={12} sm={6} md={4} key={doc.id}>
                        <Card sx={{ 
                          bgcolor: '#232b3b', 
                          border: '1px solid #444',
                          '&:hover': { borderColor: '#4caf50' }
                        }}>
                          <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <DescriptionIcon sx={{ color: '#4caf50', mr: 1 }} />
                              <Typography variant="h6" sx={{ color: 'white', flex: 1 }}>
                                {doc.title}
                              </Typography>
                            </Box>
                            <Typography variant="body2" sx={{ color: '#bbb', mb: 1 }}>
                              {doc.category}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#666' }}>
                              {doc.uploadDate}
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                              <IconButton 
                                size="small" 
                                onClick={() => handlePreview(doc)}
                                sx={{ color: '#90caf9' }}
                              >
                                <DescriptionIcon />
                              </IconButton>
                              <IconButton 
                                size="small" 
                                onClick={() => handleDownload(doc)}
                                sx={{ color: '#4caf50' }}
                              >
                                <DownloadIcon />
                              </IconButton>
                              <IconButton 
                                size="small" 
                                onClick={() => handleEdit(doc)}
                                sx={{ color: '#ff9800' }}
                              >
                                <EditIcon />
                              </IconButton>
                              <IconButton 
                                size="small" 
                                onClick={() => handleDelete(doc.id)}
                                sx={{ color: '#f44336' }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            </Box>
          )
        )}

        {currentTab === 1 && (
          // 보고서 다운로드 탭
          <Box sx={{ height: '100%', p: 3 }}>
            <Typography variant="h5" sx={{ color: '#90caf9', fontWeight: 'bold', mb: 3 }}>
              📊 보고서 다운로드
            </Typography>
            
            <Paper sx={{ p: 3, bgcolor: '#232b3b', border: '1px solid #444' }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel sx={{ color: '#90caf9' }}>보고서 유형</InputLabel>
                    <Select
                      value={reportType}
                      onChange={(e) => setReportType(e.target.value)}
                      sx={{
                        color: 'white',
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#90caf9' },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#4caf50' }
                      }}
                    >
                      <MenuItem value="monthly">월간 보고서</MenuItem>
                      <MenuItem value="quarterly">분기 보고서</MenuItem>
                      <MenuItem value="yearly">연간 보고서</MenuItem>
                      <MenuItem value="custom">사용자 정의 보고서</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="보고서 기간"
                    value={reportPeriod}
                    onChange={(e) => setReportPeriod(e.target.value)}
                    placeholder="예: 2024년 1월"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        color: 'white',
                        '& fieldset': { borderColor: '#444' },
                        '&:hover fieldset': { borderColor: '#90caf9' },
                        '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                      },
                      '& .MuiInputLabel-root': { color: '#90caf9' }
                    }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    onClick={handleReportDownload}
                    disabled={reportLoading || !reportType}
                    startIcon={<DownloadIcon />}
                    sx={{ 
                      bgcolor: '#4caf50', 
                      '&:hover': { bgcolor: '#45a049' },
                      color: 'white',
                      minWidth: '200px'
                    }}
                  >
                    {reportLoading ? '생성 중...' : '보고서 다운로드'}
                  </Button>
                </Grid>
              </Grid>
              
              {/* 보고서 미리보기 */}
              {reportData.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" sx={{ color: '#90caf9', mb: 2 }}>
                    보고서 미리보기
                  </Typography>
                  <TableContainer component={Paper} sx={{ bgcolor: '#1a1d21' }}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ color: '#90caf9', fontWeight: 'bold' }}>문서명</TableCell>
                          <TableCell sx={{ color: '#90caf9', fontWeight: 'bold' }}>카테고리</TableCell>
                          <TableCell sx={{ color: '#90caf9', fontWeight: 'bold' }}>업로드일</TableCell>
                          <TableCell sx={{ color: '#90caf9', fontWeight: 'bold' }}>파일크기</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {reportData.slice(0, 5).map((doc, index) => (
                          <TableRow key={index}>
                            <TableCell sx={{ color: 'white' }}>{doc.title}</TableCell>
                            <TableCell sx={{ color: 'white' }}>{doc.category}</TableCell>
                            <TableCell sx={{ color: 'white' }}>{doc.uploadDate}</TableCell>
                            <TableCell sx={{ color: 'white' }}>{doc.fileSize}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  {reportData.length > 5 && (
                    <Typography variant="caption" sx={{ color: '#666', mt: 1, display: 'block' }}>
                      ... 외 {reportData.length - 5}개 문서
                    </Typography>
                  )}
                </Box>
              )}
            </Paper>
          </Box>
        )}
      </Box>
          <Grid container spacing={2} sx={{ mb: 2, px: 2 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ bgcolor: '#2d3748', color: 'white' }}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    총 문서 수
                  </Typography>
                  <Typography variant="h4" sx={{ color: '#90caf9' }}>
                    {documents.length}개
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ bgcolor: '#2d3748', color: 'white' }}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    최근 업로드
                  </Typography>
                  <Typography variant="h4" sx={{ color: '#4caf50' }}>
                    {documents.length > 0
                      ? format(documents[0].uploadDate?.toDate?.() || new Date(documents[0].uploadDate), 'yyyy.MM.dd')
                      : '-'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* 업로드 진행률 */}
          {uploading && (
            <Box sx={{ px: 2, mb: 2 }}>
              <LinearProgress 
                variant="determinate" 
                value={uploadProgress} 
                sx={{ 
                  height: 8, 
                  borderRadius: 4,
                  backgroundColor: '#444',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: '#4caf50'
                  }
                }} 
              />
              <Typography variant="body2" sx={{ color: '#ccc', mt: 1, textAlign: 'center' }}>
                업로드 중... {uploadProgress}%
              </Typography>
            </Box>
          )}

          {/* 2단 레이아웃 */}
          <Box sx={{ display: 'flex', gap: 2, height: 'calc(100% - 200px)', px: 2 }}>
            {/* 왼쪽 패널: 문서 목록 */}
            <Box sx={{ width: '50%' }}>
              <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#2d3748' }}>
                <Box sx={{ p: 2, borderBottom: 1, borderColor: '#444' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ color: 'white' }}>문서 목록</Typography>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => handleOpen()}
                      size="small"
                      sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#45a049' } }}
                    >
                      문서 추가
                    </Button>
                  </Box>
                  <TextField
                    placeholder="문서 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    size="small"
                    fullWidth
                    sx={{
                      '& .MuiInputBase-root': { 
                        bgcolor: '#444',
                        color: 'white',
                        '&:hover': { bgcolor: '#555' },
                        '&.Mui-focused': { bgcolor: '#555' }
                      },
                      '& .MuiInputBase-input': { 
                        color: 'white',
                        '&::placeholder': { color: '#ccc', opacity: 1 }
                      },
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#666',
                        '&:hover': { borderColor: '#888' },
                        '&.Mui-focused': { borderColor: '#90caf9' }
                      }
                    }}
                  />
                </Box>
                <List sx={{ 
                  flex: 1, 
                  overflow: 'auto',
                  '&::-webkit-scrollbar': {
                    display: 'none !important',
                    width: '0 !important',
                    height: '0 !important'
                  },
                  '&::-webkit-scrollbar-thumb': {
                    display: 'none !important'
                  },
                  '&::-webkit-scrollbar-track': {
                    display: 'none !important'
                  },
                  '&::-webkit-scrollbar-corner': {
                    display: 'none !important'
                  },
                  '-ms-overflow-style': 'none !important',
                  'scrollbar-width': 'none !important',
                  'scrollbar-color': 'transparent transparent !important',
                  'overflow-y': 'scroll !important',
                  'scrollbar-gutter': 'stable'
                }}>
                  {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                      <Typography sx={{ color: '#ccc' }}>로딩 중...</Typography>
                    </Box>
                  ) : filteredDocuments.length === 0 ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                      <Typography sx={{ color: '#ccc' }}>
                        {searchTerm ? '검색 결과가 없습니다.' : '업로드된 문서가 없습니다.'}
                      </Typography>
                    </Box>
                  ) : (
                    filteredDocuments.map((doc) => (
                      <ListItem
                        key={doc.id}
                        onClick={() => handlePreview(doc)}
                        sx={{ 
                          borderBottom: '1px solid #444',
                          cursor: 'pointer',
                          bgcolor: previewDoc?.id === doc.id ? '#4caf50' : 'transparent',
                          '&:hover': { 
                            bgcolor: previewDoc?.id === doc.id ? '#45a049' : '#444' 
                          }
                        }}
                      >
                        <ListItemIcon>
                          {getFileIcon(doc.fileName)}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Typography sx={{ 
                                color: previewDoc?.id === doc.id ? 'white' : 'white', 
                                fontWeight: 'bold',
                                flex: 1
                              }}>
                                {doc.title}
                              </Typography>
                              <Chip 
                                label={doc.category} 
                                size="small" 
                                sx={{ 
                                  bgcolor: previewDoc?.id === doc.id ? '#2e7d32' : '#4caf50', 
                                  color: 'white', 
                                  fontSize: '0.7rem',
                                  height: '20px'
                                }} 
                              />
                            </Box>
                          }
                          secondary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" sx={{ 
                                color: previewDoc?.id === doc.id ? '#e8f5e8' : '#ccc',
                                flex: 1,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {doc.description}
                              </Typography>
                              <Typography variant="caption" sx={{ 
                                color: previewDoc?.id === doc.id ? '#c8e6c9' : '#888',
                                whiteSpace: 'nowrap'
                              }}>
                                {format(doc.uploadDate?.toDate?.() || new Date(doc.uploadDate), 'MM/dd')}
                                {' • '}
                                {doc.fileSize}
                              </Typography>
                            </Box>
                          }
                        />
                        <Box onClick={(e) => e.stopPropagation()}>
                          <IconButton 
                            edge="end" 
                            onClick={() => handleDownload(doc)} 
                            size="small"
                            sx={{ color: previewDoc?.id === doc.id ? '#e8f5e8' : '#4caf50' }}
                          >
                            <DownloadIcon />
                          </IconButton>
                          <IconButton 
                            edge="end" 
                            onClick={() => handleOpen(doc)} 
                            size="small"
                            sx={{ color: previewDoc?.id === doc.id ? '#e8f5e8' : '#90caf9' }}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton 
                            edge="end" 
                            onClick={() => handleDelete(doc)} 
                            size="small"
                            sx={{ color: previewDoc?.id === doc.id ? '#ffcdd2' : '#f44336' }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </ListItem>
                    ))
                  )}
                </List>
              </Paper>
            </Box>

            {/* 오른쪽 패널: 문서 미리보기 */}
            <Box sx={{ width: '50%' }}>
              <Paper sx={{ height: '100%', p: 2, bgcolor: '#2d3748' }}>
                <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>문서 미리보기</Typography>
                {renderPreview()}
              </Paper>
            </Box>
          </Box>

          {/* 문서 추가/수정 다이얼로그 */}
          <Dialog 
            open={open} 
            onClose={handleClose} 
            maxWidth="sm" 
            fullWidth
            PaperProps={{
              sx: { 
                bgcolor: '#2d3748', 
                color: 'white',
                '& .MuiDialogTitle-root': { color: 'white' }
              }
            }}
          >
            <DialogTitle>
              {selectedDoc ? '문서 수정' : '문서 추가'}
            </DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                <TextField
                  label="제목"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  sx={{
                    '& .MuiInputBase-root': { bgcolor: '#444' },
                    '& .MuiInputLabel-root': { color: '#ccc' },
                    '& .MuiInputBase-input': { color: 'white' }
                  }}
                />
                <TextField
                  select
                  label="분류"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  sx={{
                    '& .MuiInputBase-root': { bgcolor: '#444' },
                    '& .MuiInputLabel-root': { color: '#ccc' },
                    '& .MuiInputBase-input': { color: 'white' }
                  }}
                >
                  {categories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="설명"
                  multiline
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  sx={{
                    '& .MuiInputBase-root': { bgcolor: '#444' },
                    '& .MuiInputLabel-root': { color: '#ccc' },
                    '& .MuiInputBase-input': { color: 'white' }
                  }}
                />
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<CloudUploadIcon />}
                  sx={{ 
                    borderColor: '#90caf9', 
                    color: '#90caf9',
                    '&:hover': { borderColor: '#64b5f6' }
                  }}
                >
                  {formData.file ? formData.file.name : '파일 선택'}
                  <input
                    type="file"
                    hidden
                    onChange={handleFileChange}
                  />
                </Button>
                {formData.file && (
                  <Typography variant="body2" sx={{ color: '#4caf50' }}>
                    선택된 파일: {formData.file.name} ({formatFileSize(formData.file.size)})
                  </Typography>
                )}
                
                {/* 미리보기 파일 업로드 */}
                <Box sx={{ mt: 2, p: 2, border: '1px solid #444', borderRadius: '8px' }}>
                  <Typography variant="subtitle2" sx={{ color: '#90caf9', mb: 1 }}>
                    미리보기 파일 (선택사항)
                  </Typography>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<CloudUploadIcon />}
                    size="small"
                    sx={{ 
                      borderColor: '#4caf50', 
                      color: '#4caf50',
                      '&:hover': { borderColor: '#45a049' }
                    }}
                  >
                    {previewFile ? previewFile.name : '미리보기 파일 선택'}
                    <input
                      type="file"
                      hidden
                      onChange={handlePreviewFileChange}
                    />
                  </Button>
                  {previewFile && (
                    <Typography variant="body2" sx={{ color: '#4caf50', mt: 1 }}>
                      미리보기 파일: {previewFile.name} ({formatFileSize(previewFile.size)})
                    </Typography>
                  )}
                </Box>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose} sx={{ color: '#ccc' }}>
                취소
              </Button>
              <Button 
                onClick={handleSubmit} 
                variant="contained" 
                disabled={uploading}
                sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#45a049' } }}
              >
                {uploading ? '업로드 중...' : (selectedDoc ? '수정' : '추가')}
              </Button>
            </DialogActions>
          </Dialog>

          {/* 스낵바 */}
          <Snackbar
            open={snackbar.open}
            autoHideDuration={6000}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
          >
            <Alert 
              onClose={() => setSnackbar({ ...snackbar, open: false })} 
              severity={snackbar.severity}
            >
              {snackbar.message}
            </Alert>
          </Snackbar>
        </>
      )}
    </Box>
  );
};

export default Documents; 