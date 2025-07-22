import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  Description as DescriptionIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  Folder as FolderIcon,
} from '@mui/icons-material';
import { collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../firebase';

const DocumentManagement = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [documents, setDocuments] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    file: null,
    tags: '',
  });

  const categories = [
    { value: 'contract', label: '계약서' },
    { value: 'permit', label: '허가서' },
    { value: 'report', label: '보고서' },
    { value: 'drawing', label: '도면' },
    { value: 'photo', label: '사진' },
    { value: 'other', label: '기타' },
  ];

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const documentsQuery = query(
        collection(db, 'documents'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(documentsQuery);
      const documentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setDocuments(documentsData);
    } catch (error) {
      console.error('문서 목록 조회 실패:', error);
      setError('문서 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (document = null) => {
    if (document) {
      setSelectedDocument(document);
      setFormData({
        title: document.title,
        description: document.description,
        category: document.category,
        file: null,
        tags: document.tags.join(', '),
      });
    } else {
      setSelectedDocument(null);
      setFormData({
        title: '',
        description: '',
        category: '',
        file: null,
        tags: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedDocument(null);
    setFormData({
      title: '',
      description: '',
      category: '',
      file: null,
      tags: '',
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        file,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let fileUrl = selectedDocument?.fileUrl;

      if (formData.file) {
        // 새 파일 업로드
        const storageRef = ref(storage, `documents/${formData.file.name}`);
        await uploadBytes(storageRef, formData.file, {
          customMetadata: {
            userId: currentUser.uid,
            uploadedAt: new Date().toISOString(),
            type: 'document'
          }
        });
        fileUrl = await getDownloadURL(storageRef);

        // 기존 파일 삭제
        if (selectedDocument?.fileUrl) {
          const oldFileRef = ref(storage, selectedDocument.fileUrl);
          await deleteObject(oldFileRef);
        }
      }

      const documentData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        fileUrl,
        fileName: formData.file ? formData.file.name : selectedDocument?.fileName,
        fileType: formData.file ? formData.file.type : selectedDocument?.fileType,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        updatedAt: new Date().toISOString(),
      };

      if (selectedDocument) {
        // 문서 수정
        await updateDoc(doc(db, 'documents', selectedDocument.id), documentData);
      } else {
        // 새 문서 추가
        documentData.createdAt = new Date().toISOString();
        await addDoc(collection(db, 'documents'), documentData);
      }

      handleCloseDialog();
      fetchDocuments();
    } catch (error) {
      console.error('문서 저장 실패:', error);
      setError('문서 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (document) => {
    if (!window.confirm('정말로 이 문서를 삭제하시겠습니까?')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 파일 삭제
      if (document.fileUrl) {
        const fileRef = ref(storage, document.fileUrl);
        await deleteObject(fileRef);
      }

      // 문서 정보 삭제
      await deleteDoc(doc(db, 'documents', document.id));
      fetchDocuments();
    } catch (error) {
      console.error('문서 삭제 실패:', error);
      setError('문서 삭제에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (document) => {
    try {
      const response = await fetch(document.fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = document.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('문서 다운로드 실패:', error);
      setError('문서 다운로드에 실패했습니다.');
    }
  };

  const getFileIcon = (fileType) => {
    if (fileType?.includes('pdf')) {
      return <PdfIcon color="error" />;
    } else if (fileType?.includes('image')) {
      return <ImageIcon color="primary" />;
    } else {
      return <DescriptionIcon />;
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          문서 관리
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          새 문서 등록
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            placeholder="문서 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            select
            label="카테고리"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <MenuItem value="all">전체</MenuItem>
            {categories.map((category) => (
              <MenuItem key={category.value} value={category.value}>
                {category.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>문서명</TableCell>
              <TableCell>카테고리</TableCell>
              <TableCell>설명</TableCell>
              <TableCell>태그</TableCell>
              <TableCell>등록일</TableCell>
              <TableCell>관리</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredDocuments.map((document) => (
              <TableRow key={document.id}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getFileIcon(document.fileType)}
                    {document.title}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={categories.find(cat => cat.value === document.category)?.label}
                    size="small"
                  />
                </TableCell>
                <TableCell>{document.description}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {document.tags.map((tag, index) => (
                      <Chip
                        key={index}
                        label={tag}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </TableCell>
                <TableCell>
                  {new Date(document.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Tooltip title="다운로드">
                    <IconButton
                      size="small"
                      onClick={() => handleDownload(document)}
                    >
                      <DownloadIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="수정">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(document)}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="삭제">
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(document)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {filteredDocuments.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  등록된 문서가 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedDocument ? '문서 수정' : '새 문서 등록'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="문서명"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  select
                  label="카테고리"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                >
                  {categories.map((category) => (
                    <MenuItem key={category.value} value={category.value}>
                      {category.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="설명"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  multiline
                  rows={3}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="태그"
                  name="tags"
                  value={formData.tags}
                  onChange={handleInputChange}
                  placeholder="쉼표로 구분하여 입력"
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  component="label"
                  fullWidth
                >
                  파일 선택
                  <input
                    type="file"
                    hidden
                    onChange={handleFileChange}
                  />
                </Button>
                {formData.file && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    선택된 파일: {formData.file.name}
                  </Typography>
                )}
                {selectedDocument?.fileName && !formData.file && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    현재 파일: {selectedDocument.fileName}
                  </Typography>
                )}
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>
              취소
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : '저장'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default DocumentManagement; 