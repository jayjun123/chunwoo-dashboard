import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  IconButton,
  Input,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  Description as DescriptionIcon,
  Folder as FolderIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';

const Documents = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [documents, setDocuments] = useState([]);
  const [sites, setSites] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSite, setSelectedSite] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    siteId: '',
    category: '',
    description: '',
    file: null,
    version: '1.0',
    isPublic: false,
  });

  const categories = [
    '계약서',
    '도면',
    '시방서',
    '안전관리계획서',
    '시공계획서',
    '일일작업일지',
    '기타',
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // 현장 목록 로드
      const sitesSnapshot = await getDocs(collection(db, 'sites'));
      setSites(sitesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // 문서 목록 로드
      const documentsQuery = query(
        collection(db, 'documents'),
        orderBy('createdAt', 'desc')
      );
      const documentsSnapshot = await getDocs(documentsQuery);
      setDocuments(documentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
      setError('데이터를 불러오는데 실패했습니다.');
      setLoading(false);
    }
  };

  const handleOpenDialog = (doc = null) => {
    if (doc) {
      setSelectedDoc(doc);
      setFormData({
        title: doc.title,
        siteId: doc.siteId,
        category: doc.category,
        description: doc.description,
        version: doc.version,
        isPublic: doc.isPublic,
        file: null,
      });
    } else {
      setSelectedDoc(null);
      setFormData({
        title: '',
        siteId: '',
        category: '',
        description: '',
        version: '1.0',
        isPublic: false,
        file: null,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedDoc(null);
    setFormData({
      title: '',
      siteId: '',
      category: '',
      description: '',
      version: '1.0',
      isPublic: false,
      file: null,
    });
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        file,
        title: file.name,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      let fileUrl = selectedDoc?.fileUrl;

      if (formData.file) {
        const fileRef = ref(storage, `documents/${Date.now()}_${formData.file.name}`);
        await uploadBytes(fileRef, formData.file);
        fileUrl = await getDownloadURL(fileRef);

        if (selectedDoc?.fileUrl) {
          const oldFileRef = ref(storage, selectedDoc.fileUrl);
          await deleteObject(oldFileRef);
        }
      }

      const documentData = {
        ...formData,
        fileUrl,
        updatedAt: new Date().toISOString(),
      };

      if (selectedDoc) {
        await updateDoc(doc(db, 'documents', selectedDoc.id), documentData);
      } else {
        documentData.createdAt = new Date().toISOString();
        await addDoc(collection(db, 'documents'), documentData);
      }

      handleCloseDialog();
      loadData();
    } catch (error) {
      console.error('문서 저장 실패:', error);
      setError('문서를 저장하는데 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (document) => {
    if (window.confirm('정말로 이 문서를 삭제하시겠습니까?')) {
      try {
        if (document.fileUrl) {
          const fileRef = ref(storage, document.fileUrl);
          await deleteObject(fileRef);
        }
        await deleteDoc(doc(db, 'documents', document.id));
        loadData();
      } catch (error) {
        console.error('문서 삭제 실패:', error);
        setError('문서를 삭제하는데 실패했습니다.');
      }
    }
  };

  const handleDownload = async (document) => {
    try {
      const response = await fetch(document.fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = document.title;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('문서 다운로드 실패:', error);
      setError('문서를 다운로드하는데 실패했습니다.');
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSite = selectedSite === 'all' || doc.siteId === selectedSite;
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    return matchesSearch && matchesSite && matchesCategory;
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
        <Typography variant="h4" component="h1">
          문서관리
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          문서 업로드
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="문서 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>현장</InputLabel>
              <Select
                value={selectedSite}
                onChange={(e) => setSelectedSite(e.target.value)}
                label="현장"
              >
                <MenuItem value="all">전체 현장</MenuItem>
                {sites.map((site) => (
                  <MenuItem key={site.id} value={site.id}>
                    {site.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>분류</InputLabel>
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                label="분류"
              >
                <MenuItem value="all">전체 분류</MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        {filteredDocuments.map((document) => (
          <Grid item xs={12} md={6} lg={4} key={document.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" noWrap>
                    {document.title}
                  </Typography>
                  <Chip
                    label={document.category}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  현장: {sites.find(site => site.id === document.siteId)?.name || '미지정'}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  버전: {document.version}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  업로드: {new Date(document.createdAt).toLocaleDateString()}
                </Typography>
                <Typography variant="body2" sx={{ mt: 2 }}>
                  {document.description}
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  startIcon={<DownloadIcon />}
                  onClick={() => handleDownload(document)}
                >
                  다운로드
                </Button>
                <Button
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => handleOpenDialog(document)}
                >
                  수정
                </Button>
                <Button
                  size="small"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => handleDelete(document)}
                >
                  삭제
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedDoc ? '문서 수정' : '새 문서 업로드'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="제목"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>현장</InputLabel>
                  <Select
                    name="siteId"
                    value={formData.siteId}
                    onChange={handleInputChange}
                    label="현장"
                  >
                    {sites.map((site) => (
                      <MenuItem key={site.id} value={site.id}>
                        {site.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>분류</InputLabel>
                  <Select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    label="분류"
                  >
                    {categories.map((category) => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="버전"
                  name="version"
                  value={formData.version}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="설명"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  multiline
                  rows={4}
                />
              </Grid>
              <Grid item xs={12}>
                <Input
                  type="file"
                  onChange={handleFileChange}
                  fullWidth
                  sx={{ mt: 2 }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>취소</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={uploading}
          >
            {uploading ? '업로드 중...' : (selectedDoc ? '수정' : '업로드')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Documents; 