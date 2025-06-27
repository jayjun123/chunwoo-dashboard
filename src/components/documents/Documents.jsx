import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Description as DescriptionIcon,
  Folder as FolderIcon,
  InsertDriveFile as FileIcon
} from '@mui/icons-material';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';

const Documents = () => {
  const [documents, setDocuments] = useState([]);
  const [sites, setSites] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    siteId: '',
    type: '일반문서',
    category: '기술문서',
    version: '1.0',
    status: '작성중',
    author: '',
    uploadDate: '',
    fileUrl: '',
    description: '',
    tags: ''
  });

  useEffect(() => {
    fetchDocuments();
    fetchSites();
  }, []);

  const fetchDocuments = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'documents'));
      const documentList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDocuments(documentList);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const fetchSites = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'sites'));
      const siteList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSites(siteList);
    } catch (error) {
      console.error('Error fetching sites:', error);
    }
  };

  const handleOpen = (document = null) => {
    if (document) {
      setEditingDocument(document);
      setFormData(document);
    } else {
      setEditingDocument(null);
      setFormData({
        title: '',
        siteId: '',
        type: '일반문서',
        category: '기술문서',
        version: '1.0',
        status: '작성중',
        author: '',
        uploadDate: '',
        fileUrl: '',
        description: '',
        tags: ''
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingDocument(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDocument) {
        await updateDoc(doc(db, 'documents', editingDocument.id), formData);
      } else {
        await addDoc(collection(db, 'documents'), formData);
      }
      handleClose();
      fetchDocuments();
    } catch (error) {
      console.error('Error saving document:', error);
    }
  };

  const handleDelete = async (documentId) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'documents', documentId));
        fetchDocuments();
      } catch (error) {
        console.error('Error deleting document:', error);
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case '승인':
        return 'success';
      case '검토중':
        return 'primary';
      case '작성중':
        return 'info';
      case '반려':
        return 'error';
      default:
        return 'default';
    }
  };

  const getSiteName = (siteId) => {
    const site = sites.find(s => s.id === siteId);
    return site ? site.name : '미지정';
  };

  const getDocumentIcon = (type) => {
    switch (type) {
      case '폴더':
        return <FolderIcon />;
      case '일반문서':
      case '계약서':
      case '도면':
      case '사진':
        return <FileIcon />;
      default:
        return <DescriptionIcon />;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">문서 관리</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          문서 등록
        </Button>
      </Box>

      <Grid container spacing={3}>
        {documents.map((document) => (
          <Grid item xs={12} md={6} lg={4} key={document.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {getDocumentIcon(document.type)}
                    <Typography variant="h6" sx={{ ml: 1 }}>
                      {document.title}
                    </Typography>
                  </Box>
                  <Box>
                    <IconButton size="small" onClick={() => handleOpen(document)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(document.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
                <Typography color="textSecondary" gutterBottom>
                  현장: {getSiteName(document.siteId)}
                </Typography>
                <Box sx={{ mb: 1 }}>
                  <Chip
                    label={document.status}
                    color={getStatusColor(document.status)}
                    size="small"
                    sx={{ mr: 1 }}
                  />
                  <Chip
                    label={document.category}
                    size="small"
                  />
                </Box>
                <Typography variant="body2" color="textSecondary">
                  작성자: {document.author}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  버전: {document.version}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  등록일: {document.uploadDate}
                </Typography>
                {document.tags && (
                  <Box sx={{ mt: 1 }}>
                    {document.tags.split(',').map((tag, index) => (
                      <Chip
                        key={index}
                        label={tag.trim()}
                        size="small"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingDocument ? '문서 수정' : '새 문서 등록'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="제목"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              margin="normal"
              required
            />
            <FormControl fullWidth margin="normal" required>
              <InputLabel>현장</InputLabel>
              <Select
                value={formData.siteId}
                onChange={(e) => setFormData({ ...formData, siteId: e.target.value })}
                label="현장"
              >
                {sites.map((site) => (
                  <MenuItem key={site.id} value={site.id}>
                    {site.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal" required>
              <InputLabel>유형</InputLabel>
              <Select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                label="유형"
              >
                <MenuItem value="일반문서">일반문서</MenuItem>
                <MenuItem value="계약서">계약서</MenuItem>
                <MenuItem value="도면">도면</MenuItem>
                <MenuItem value="사진">사진</MenuItem>
                <MenuItem value="폴더">폴더</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal" required>
              <InputLabel>분류</InputLabel>
              <Select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                label="분류"
              >
                <MenuItem value="기술문서">기술문서</MenuItem>
                <MenuItem value="관리문서">관리문서</MenuItem>
                <MenuItem value="계약문서">계약문서</MenuItem>
                <MenuItem value="도면">도면</MenuItem>
                <MenuItem value="사진">사진</MenuItem>
                <MenuItem value="기타">기타</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="버전"
              value={formData.version}
              onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              margin="normal"
              required
            />
            <FormControl fullWidth margin="normal" required>
              <InputLabel>상태</InputLabel>
              <Select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                label="상태"
              >
                <MenuItem value="작성중">작성중</MenuItem>
                <MenuItem value="검토중">검토중</MenuItem>
                <MenuItem value="승인">승인</MenuItem>
                <MenuItem value="반려">반려</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="작성자"
              value={formData.author}
              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="등록일"
              type="datetime-local"
              value={formData.uploadDate}
              onChange={(e) => setFormData({ ...formData, uploadDate: e.target.value })}
              margin="normal"
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="파일 URL"
              value={formData.fileUrl}
              onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
              margin="normal"
              placeholder="파일 링크 또는 경로"
            />
            <TextField
              fullWidth
              label="태그"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              margin="normal"
              placeholder="쉼표로 구분하여 입력"
            />
            <TextField
              fullWidth
              label="설명"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              margin="normal"
              multiline
              rows={4}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>취소</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingDocument ? '수정' : '등록'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Documents; 