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
} from '@mui/material';
import {
  Description as DescriptionIcon,
  Folder as FolderIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

const Documents = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [documents, setDocuments] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
    file: null,
  });

  // 임시 데이터
  useEffect(() => {
    setDocuments([
      {
        id: 1,
        title: '공사계획서',
        category: '계획서',
        description: '2024년 1분기 공사계획서',
        uploadDate: '2024-03-15',
        fileSize: '2.5MB',
      },
      {
        id: 2,
        title: '안전관리계획서',
        category: '안전',
        description: '현장 안전관리계획서',
        uploadDate: '2024-03-14',
        fileSize: '1.8MB',
      },
      {
        id: 3,
        title: '공사일지',
        category: '일지',
        description: '3월 15일 공사일지',
        uploadDate: '2024-03-15',
        fileSize: '0.5MB',
      },
    ]);
  }, []);

  const handleOpen = (doc = null) => {
    if (doc) {
      setSelectedDoc(doc);
      setFormData({
        title: doc.title,
        category: doc.category,
        description: doc.description,
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
  };

  const handleSubmit = () => {
    if (selectedDoc) {
      // 수정
      setDocuments(documents.map(doc =>
        doc.id === selectedDoc.id ? { ...doc, ...formData } : doc
      ));
    } else {
      // 추가
      setDocuments([...documents, {
        id: Date.now(),
        uploadDate: format(new Date(), 'yyyy-MM-dd'),
        fileSize: '0MB',
        ...formData,
      }]);
    }
    handleClose();
  };

  const handleDelete = (id) => {
    setDocuments(documents.filter(doc => doc.id !== id));
  };

  const categories = ['계획서', '안전', '일지', '계약서', '기타'];

  return (
    <Box sx={{ flex: 1, minHeight: 0, minWidth: 0, p: 0, m: 0, bgcolor: 'background.default' }}>
      <Box sx={{ p: isMobile ? 2 : 3 }}>
        <Typography variant="h4" gutterBottom>
          문서 관리
        </Typography>

        {/* 문서 통계 */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  총 문서 수
                </Typography>
                <Typography variant="h4">
                  {documents.length}개
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  최근 업로드
                </Typography>
                <Typography variant="h4">
                  {documents.length > 0
                    ? format(new Date(documents[0].uploadDate), 'MM/dd')
                    : '-'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  총 용량
                </Typography>
                <Typography variant="h4">
                  {documents.reduce((sum, doc) => {
                    const size = parseFloat(doc.fileSize);
                    return sum + (isNaN(size) ? 0 : size);
                  }, 0).toFixed(1)}MB
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* 문서 목록 */}
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">문서 목록</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpen()}
            >
              문서 추가
            </Button>
          </Box>
          <List>
            {documents.map((doc) => (
              <ListItem
                key={doc.id}
                secondaryAction={
                  <Box>
                    <IconButton edge="end" onClick={() => handleOpen(doc)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton edge="end" onClick={() => handleDelete(doc.id)}>
                      <DeleteIcon />
                    </IconButton>
                    <IconButton edge="end">
                      <DownloadIcon />
                    </IconButton>
                  </Box>
                }
              >
                <ListItemIcon>
                  <DescriptionIcon />
                </ListItemIcon>
                <ListItemText
                  primary={doc.title}
                  secondary={
                    <>
                      <Typography component="span" variant="body2" color="textPrimary">
                        {doc.category}
                      </Typography>
                      {' — '}
                      {doc.description}
                      {' • '}
                      {format(new Date(doc.uploadDate), 'yyyy-MM-dd')}
                      {' • '}
                      {doc.fileSize}
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Paper>

        {/* 문서 추가/수정 다이얼로그 */}
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
          <DialogTitle>
            {selectedDoc ? '문서 수정' : '문서 추가'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
              <TextField
                label="제목"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
              <TextField
                select
                label="분류"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
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
              />
              <Button
                variant="outlined"
                component="label"
                startIcon={<FolderIcon />}
              >
                파일 선택
                <input
                  type="file"
                  hidden
                  onChange={(e) => setFormData({ ...formData, file: e.target.files[0] })}
                />
              </Button>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>취소</Button>
            <Button onClick={handleSubmit} variant="contained">
              {selectedDoc ? '수정' : '추가'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default Documents; 