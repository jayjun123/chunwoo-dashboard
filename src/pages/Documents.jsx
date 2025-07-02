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
    setDocuments([]);
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
      bgcolor: '#1a1d21'
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
          <Typography variant="h4" gutterBottom>
            문서 관리
          </Typography>

          {/* 문서 통계 */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid>
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
            <Grid>
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
            <Grid>
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

          {/* 2단 레이아웃 */}
          <Box sx={{ display: 'flex', gap: 2, height: 'calc(100% - 140px)' }}>
            {/* 왼쪽 패널: 문서 목록 */}
            <Box sx={{ width: '50%' }}>
              <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
                  <Typography variant="h6">문서 목록</Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpen()}
                    size="small"
                  >
                    문서 추가
                  </Button>
                </Box>
                <List sx={{ flex: 1, overflow: 'auto' }}>
                  {documents.map((doc) => (
                    <ListItem
                      key={doc.id}
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
                      <Box>
                        <IconButton edge="end" onClick={() => handleOpen(doc)} size="small">
                          <EditIcon />
                        </IconButton>
                        <IconButton edge="end" onClick={() => handleDelete(doc.id)} size="small">
                          <DeleteIcon />
                        </IconButton>
                        <IconButton edge="end" size="small">
                          <DownloadIcon />
                        </IconButton>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Box>

            {/* 오른쪽 패널: 문서 상세 정보 */}
            <Box sx={{ width: '50%' }}>
              <Paper sx={{ height: '100%', p: 2 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>문서 상세 정보</Typography>
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 2,
                  height: 'calc(100% - 60px)',
                  overflow: 'auto'
                }}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>문서 분류별 통계</Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {categories.map(category => {
                          const count = documents.filter(doc => doc.category === category).length;
                          return (
                            <Box key={category} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2">{category}</Typography>
                              <Typography variant="body2" fontWeight="bold">{count}개</Typography>
                            </Box>
                          );
                        })}
                      </Box>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>최근 업로드된 문서</Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {documents.slice(0, 5).map(doc => (
                          <Box key={doc.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" sx={{ flex: 1 }}>{doc.title}</Typography>
                            <Typography variant="caption" color="textSecondary">
                              {format(new Date(doc.uploadDate), 'MM/dd')}
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
          <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>
              {selectedDoc ? '문서 수정' : '문서 추가'}
            </DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                <TextField
                  label="제목"
                  value={formData.title ?? ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
                <TextField
                  select
                  label="분류"
                  value={formData.category ?? ''}
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
                  value={formData.description ?? ''}
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
        </>
      )}
    </Box>
  );
};

export default Documents; 