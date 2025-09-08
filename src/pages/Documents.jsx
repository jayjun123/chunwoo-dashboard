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
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
    file: null,
  });

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

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

      const documentData = {
        title: formData.title.trim(),
        category: formData.category,
        description: formData.description.trim(),
        fileUrl,
        fileName,
        fileSize,
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
      {isMobile ? (
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
        <>
          <Typography variant="h4" gutterBottom sx={{ color: '#90caf9', fontWeight: 'bold', p: 2 }}>
            📄 문서 관리
          </Typography>

          {/* 문서 통계 */}
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
                        sx={{ 
                          borderBottom: '1px solid #444',
                          '&:hover': { bgcolor: '#444' }
                        }}
                      >
                        <ListItemIcon>
                          <DescriptionIcon sx={{ color: '#90caf9' }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography sx={{ color: 'white', fontWeight: 'bold' }}>
                              {doc.title}
                            </Typography>
                          }
                          secondary={
                            <Box sx={{ mt: 1 }}>
                              <Chip 
                                label={doc.category} 
                                size="small" 
                                sx={{ 
                                  bgcolor: '#4caf50', 
                                  color: 'white', 
                                  mr: 1,
                                  fontSize: '0.7rem'
                                }} 
                              />
                              <Typography variant="body2" sx={{ color: '#ccc', mt: 1 }}>
                                {doc.description}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#888' }}>
                                {format(doc.uploadDate?.toDate?.() || new Date(doc.uploadDate), 'yyyy.MM.dd HH:mm')}
                                {' • '}
                                {doc.fileSize}
                              </Typography>
                            </Box>
                          }
                        />
                        <Box>
                          <IconButton 
                            edge="end" 
                            onClick={() => handleDownload(doc)} 
                            size="small"
                            sx={{ color: '#4caf50' }}
                          >
                            <DownloadIcon />
                          </IconButton>
                          <IconButton 
                            edge="end" 
                            onClick={() => handleOpen(doc)} 
                            size="small"
                            sx={{ color: '#90caf9' }}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton 
                            edge="end" 
                            onClick={() => handleDelete(doc)} 
                            size="small"
                            sx={{ color: '#f44336' }}
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

            {/* 오른쪽 패널: 문서 상세 정보 */}
            <Box sx={{ width: '50%' }}>
              <Paper sx={{ height: '100%', p: 2, bgcolor: '#2d3748' }}>
                <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>문서 상세 정보</Typography>
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 2,
                  height: 'calc(100% - 60px)',
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
                  <Card sx={{ bgcolor: '#444' }}>
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom sx={{ color: 'white' }}>문서 분류별 통계</Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {categories.map(category => {
                          const count = documents.filter(doc => doc.category === category).length;
                          return (
                            <Box key={category} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2" sx={{ color: '#ccc' }}>{category}</Typography>
                              <Typography variant="body2" fontWeight="bold" sx={{ color: '#90caf9' }}>{count}개</Typography>
                            </Box>
                          );
                        })}
                      </Box>
                    </CardContent>
                  </Card>
                  
                  <Card sx={{ bgcolor: '#444' }}>
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom sx={{ color: 'white' }}>최근 업로드된 문서</Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {documents.slice(0, 5).map(doc => (
                          <Box key={doc.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" sx={{ flex: 1, color: '#ccc' }}>{doc.title}</Typography>
                            <Typography variant="caption" sx={{ color: '#888' }}>
                              {format(doc.uploadDate?.toDate?.() || new Date(doc.uploadDate), 'MM/dd')}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Box>
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