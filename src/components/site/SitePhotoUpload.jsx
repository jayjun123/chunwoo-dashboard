import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Typography,
  IconButton,
  Box,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Alert,
  Snackbar,
  ImageList,
  ImageListItem,
  ImageListItemBar
} from '@mui/material';
import {
  PhotoCamera as PhotoCameraIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  Info as InfoIcon,
  Add as AddIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { storage, db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import Image from '../common/Image';

const SitePhotoUpload = ({ open, onClose, siteId, siteName }) => {
  const { currentUser } = useAuth();
  const isNasPhotoBackend = import.meta.env.VITE_SITE_PHOTOS_BACKEND === 'nas';
  const nasApiUrl = import.meta.env.VITE_NAS_API_URL;
  const photosApiKey = import.meta.env.VITE_PHOTOS_API_KEY;
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editData, setEditData] = useState({ title: '', description: '', category: '일반' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  const getPhotosAuthHeaders = () => {
    if (!photosApiKey) return {};
    return { 'x-api-key': photosApiKey };
  };

  // 사진 카테고리
  const categories = [
    { value: '일반', label: '일반', color: '#1976d2' },
    { value: '계획', label: '계획', color: '#4caf50' },
    { value: '안전점검', label: '안전점검', color: '#ff9800' },
    { value: '완료', label: '완료', color: '#2196f3' },
    { value: '문제점', label: '문제점', color: '#f44336' }
  ];

  useEffect(() => {
    if (open && siteId) {
      loadPhotos();
    }
  }, [open, siteId]);

  // 사진 로드
  const loadPhotos = async () => {
    try {
      if (isNasPhotoBackend) {
        if (!nasApiUrl) {
          throw new Error('VITE_NAS_API_URL이 설정되어 있지 않습니다.');
        }

        const url = `${nasApiUrl}/site-photos/list?siteId=${encodeURIComponent(siteId)}&siteName=${encodeURIComponent(siteName)}`;
        const res = await fetch(url, { method: 'GET', headers: { ...getPhotosAuthHeaders() } });
        if (!res.ok) {
          throw new Error(`NAS API responded with status: ${res.status}`);
        }
        const data = await res.json();
        const photoList = (Array.isArray(data) ? data : []).map((p) => ({
          id: p.name,
          url: `${nasApiUrl}${p.url}`,
          name: p.name,
          size: p.size,
          timeCreated: new Date(p.mtimeMs || Date.now()).toISOString(),
          customMetadata: {},
        }));
        setPhotos(photoList);
        return;
      }

      const storageRef = ref(storage, `sites/${siteId}/photos`);
      const result = await listAll(storageRef);
      
      const photoPromises = result.items.map(async (item) => {
        const url = await getDownloadURL(item);
        const metadata = await item.getMetadata();
        
        return {
          id: item.name,
          url,
          name: item.name,
          size: metadata.size,
          timeCreated: metadata.timeCreated,
          customMetadata: metadata.customMetadata || {}
        };
      });

      const photoList = await Promise.all(photoPromises);
      setPhotos(photoList.sort((a, b) => new Date(b.timeCreated) - new Date(a.timeCreated)));
    } catch (error) {
      console.error('사진 로드 실패:', error);
      setSnackbar({ open: true, message: '사진 로드 중 오류가 발생했습니다.', severity: 'error' });
    }
  };

  // 파일 업로드
  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      if (isNasPhotoBackend) {
        if (!nasApiUrl) {
          throw new Error('VITE_NAS_API_URL이 설정되어 있지 않습니다.');
        }

        const validFiles = files.filter((file) => {
          if (file.size > 10 * 1024 * 1024) {
            setSnackbar({ open: true, message: `${file.name} 파일이 너무 큽니다. (최대 10MB)`, severity: 'warning' });
            return false;
          }
          if (!file.type.startsWith('image/')) {
            setSnackbar({ open: true, message: `${file.name}은 이미지 파일이 아닙니다.`, severity: 'warning' });
            return false;
          }
          return true;
        });

        if (validFiles.length === 0) {
          return;
        }

        const formData = new FormData();
        formData.append('siteId', siteId);
        formData.append('siteName', siteName);
        validFiles.forEach((file) => formData.append('files', file));

        const uploadUrl = `${nasApiUrl}/site-photos/upload`;
        const res = await fetch(uploadUrl, { method: 'POST', headers: { ...getPhotosAuthHeaders() }, body: formData });
        if (!res.ok) {
          throw new Error(`NAS API responded with status: ${res.status}`);
        }
        const result = await res.json();
        const uploaded = (result?.files || []).map((f) => ({
          id: f.name,
          url: `${nasApiUrl}${f.url}`,
          name: f.originalName || f.name,
          size: f.size,
          timeCreated: new Date().toISOString(),
          customMetadata: {
            uploadedBy: currentUser?.uid || '',
            uploadedAt: new Date().toISOString(),
            title: f.originalName || f.name,
            description: '',
            category: '일반'
          }
        }));

        setPhotos((prev) => [...uploaded, ...prev]);
        setUploadProgress(100);
        setSnackbar({ open: true, message: '사진이 업로드되었습니다.', severity: 'success' });
        return;
      }

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // 파일 크기 체크 (10MB 제한)
        if (file.size > 10 * 1024 * 1024) {
          setSnackbar({ open: true, message: `${file.name} 파일이 너무 큽니다. (최대 10MB)`, severity: 'warning' });
          continue;
        }

        // 파일 타입 체크
        if (!file.type.startsWith('image/')) {
          setSnackbar({ open: true, message: `${file.name}은 이미지 파일이 아닙니다.`, severity: 'warning' });
          continue;
        }

        const fileName = `${Date.now()}_${file.name}`;
        const storageRef = ref(storage, `sites/${siteId}/photos/${fileName}`);
        
        // 업로드
        const snapshot = await uploadBytes(storageRef, file, {
          customMetadata: {
            uploadedBy: currentUser.uid,
            uploadedAt: new Date().toISOString(),
            title: file.name,
            description: '',
            category: '일반'
          }
        });

        // 다운로드 URL 가져오기
        const downloadURL = await getDownloadURL(snapshot.ref);

        // Firestore에 사진 정보 저장
        const photoData = {
          id: fileName,
          url: downloadURL,
          name: file.name,
          size: file.size,
          timeCreated: new Date().toISOString(),
          customMetadata: {
            uploadedBy: currentUser.uid,
            uploadedAt: new Date().toISOString(),
            title: file.name,
            description: '',
            category: '일반'
          }
        };

        setPhotos(prev => [photoData, ...prev]);

        // 진행률 업데이트
        setUploadProgress(((i + 1) / files.length) * 100);
      }

      setSnackbar({ open: true, message: '사진이 업로드되었습니다.', severity: 'success' });
    } catch (error) {
      console.error('사진 업로드 실패:', error);
      setSnackbar({ open: true, message: '사진 업로드 중 오류가 발생했습니다.', severity: 'error' });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // 사진 삭제
  const handleDeletePhoto = async (photo) => {
    try {
      if (isNasPhotoBackend) {
        if (!nasApiUrl) {
          throw new Error('VITE_NAS_API_URL이 설정되어 있지 않습니다.');
        }
        const name = photo?.id || photo?.name;
        if (!name) {
          throw new Error('삭제할 사진 정보가 없습니다.');
        }
        const url = `${nasApiUrl}/site-photos/delete?siteId=${encodeURIComponent(siteId)}&siteName=${encodeURIComponent(siteName)}&name=${encodeURIComponent(name)}`;
        const res = await fetch(url, { method: 'DELETE', headers: { ...getPhotosAuthHeaders() } });
        if (!res.ok) {
          throw new Error(`NAS API responded with status: ${res.status}`);
        }
        setPhotos((prev) => prev.filter((p) => (p?.id || p?.name) !== name));
        setSnackbar({ open: true, message: '사진이 삭제되었습니다.', severity: 'success' });
        return;
      }

      // Storage에서 파일 삭제
      const storageRef = ref(storage, `sites/${siteId}/photos/${photo.id}`);
      await deleteObject(storageRef);

      // 상태에서 제거
      setPhotos(prev => prev.filter(p => p.id !== photo.id));

      setSnackbar({ open: true, message: '사진이 삭제되었습니다.', severity: 'success' });
    } catch (error) {
      console.error('사진 삭제 실패:', error);
      setSnackbar({ open: true, message: '사진 삭제 중 오류가 발생했습니다.', severity: 'error' });
    }
  };

  // 사진 정보 수정
  const handleEditPhoto = async () => {
    if (!selectedPhoto) return;

    try {
      if (isNasPhotoBackend) {
        // TODO: NAS API에 사진 정보 수정 기능을 구현하세요.
        setSnackbar({ open: true, message: 'NAS 저장 방식에서는 사진 정보 수정 기능이 아직 지원되지 않습니다.', severity: 'info' });
        return;
      }

      const storageRef = ref(storage, `sites/${siteId}/photos/${selectedPhoto.id}`);
      
      // 메타데이터 업데이트
      await updateDoc(doc(db, 'sites', siteId), {
        photos: arrayUnion({
          id: selectedPhoto.id,
          title: editData.title,
          description: editData.description,
          category: editData.category,
          updatedAt: new Date().toISOString()
        })
      });

      // 로컬 상태 업데이트
      setPhotos(prev => prev.map(photo => 
        photo.id === selectedPhoto.id 
          ? { ...photo, customMetadata: { ...photo.customMetadata, ...editData } }
          : photo
      ));

      setShowEditDialog(false);
      setSelectedPhoto(null);
      setSnackbar({ open: true, message: '사진 정보가 수정되었습니다.', severity: 'success' });
    } catch (error) {
      console.error('사진 정보 수정 실패:', error);
      setSnackbar({ open: true, message: '사진 정보 수정 중 오류가 발생했습니다.', severity: 'error' });
    }
  };

  // 사진 다운로드
  const handleDownloadPhoto = async (photo) => {
    try {
      const response = await fetch(photo.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = photo.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('사진 다운로드 실패:', error);
      setSnackbar({ open: true, message: '사진 다운로드 중 오류가 발생했습니다.', severity: 'error' });
    }
  };

  // 사진 공유
  const handleSharePhoto = async (photo) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: photo.customMetadata?.title || photo.name,
          text: photo.customMetadata?.description || '',
          url: photo.url
        });
      } else {
        // 클립보드에 복사
        await navigator.clipboard.writeText(photo.url);
        setSnackbar({ open: true, message: '사진 URL이 클립보드에 복사되었습니다.', severity: 'success' });
      }
    } catch (error) {
      console.error('사진 공유 실패:', error);
      setSnackbar({ open: true, message: '사진 공유 중 오류가 발생했습니다.', severity: 'error' });
    }
  };

  // 파일 크기 포맷
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            📸 {siteName} - 사진 관리
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* 업로드 섹션 */}
        <Box sx={{ mb: 3, p: 2, border: '2px dashed #ccc', borderRadius: 2, textAlign: 'center' }}>
          <input
            accept="image/*"
            style={{ display: 'none' }}
            id="photo-upload"
            multiple
            type="file"
            onChange={handleFileUpload}
            disabled={uploading}
          />
          <label htmlFor="photo-upload">
            <Button
              variant="contained"
              component="span"
              startIcon={<PhotoCameraIcon />}
              disabled={uploading}
              sx={{ mb: 2 }}
            >
              사진 업로드
            </Button>
          </label>
          <Typography variant="body2" color="text.secondary">
            클릭하여 사진을 선택하거나 드래그하여 업로드하세요 (최대 10MB)
          </Typography>
          
          {uploading && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress variant="determinate" value={uploadProgress} />
              <Typography variant="body2" sx={{ mt: 1 }}>
                업로드 중... {Math.round(uploadProgress)}%
              </Typography>
            </Box>
          )}
        </Box>

        {/* 사진 갤러리 */}
        {photos.length > 0 ? (
          <ImageList cols={3} gap={8}>
            {photos.map((photo) => (
              <ImageListItem key={photo.id} sx={{ position: 'relative' }}>
                <Image
                  src={photo.url}
                  alt={photo.customMetadata?.title || photo.name}
                  lazy={true}
                  style={{ cursor: 'pointer', width: '100%', height: 'auto' }}
                  onClick={() => {
                    setSelectedPhoto(photo);
                    setEditData({
                      title: photo.customMetadata?.title || photo.name,
                      description: photo.customMetadata?.description || '',
                      category: photo.customMetadata?.category || '일반'
                    });
                    setShowEditDialog(true);
                  }}
                />
                <ImageListItemBar
                  title={photo.customMetadata?.title || photo.name}
                  subtitle={
                    <Box>
                      <Typography variant="caption" display="block">
                        {formatFileSize(photo.size)}
                      </Typography>
                      <Chip 
                        label={photo.customMetadata?.category || '일반'} 
                        size="small" 
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                  }
                  actionIcon={
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadPhoto(photo);
                        }}
                      >
                        <DownloadIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSharePhoto(photo);
                        }}
                      >
                        <ShareIcon />
                      </IconButton>
                      {!isNasPhotoBackend && (
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePhoto(photo);
                          }}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </Box>
                  }
                />
              </ImageListItem>
            ))}
          </ImageList>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <PhotoCameraIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              아직 업로드된 사진이 없습니다
            </Typography>
            <Typography variant="body2" color="text.secondary">
              위의 업로드 버튼을 클릭하여 첫 번째 사진을 추가해보세요
            </Typography>
          </Box>
        )}
      </DialogContent>

      {/* 사진 정보 수정 다이얼로그 */}
      <Dialog open={showEditDialog} onClose={() => setShowEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>사진 정보 수정</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="제목"
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="설명"
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                multiline
                rows={3}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>카테고리</InputLabel>
                <Select
                  value={editData.category}
                  onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                  label="카테고리"
                >
                  {categories.map(cat => (
                    <MenuItem key={cat.value} value={cat.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: cat.color
                          }}
                        />
                        {cat.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEditDialog(false)}>취소</Button>
          <Button onClick={handleEditPhoto} variant="contained">저장</Button>
        </DialogActions>
      </Dialog>

      {/* 스낵바 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default SitePhotoUpload; 