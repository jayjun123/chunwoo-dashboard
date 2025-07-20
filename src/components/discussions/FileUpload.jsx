import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  IconButton,
  Typography,
  LinearProgress,
  Chip,
  Dialog,
  DialogContent,
  DialogActions,
  Paper,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Alert,
  Snackbar
} from '@mui/material';
import {
  AttachFile as AttachFileIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  Description as DocIcon,
  TableChart as ExcelIcon,
  TextFields as TextIcon,
  Close as CloseIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  CloudUpload as UploadIcon
} from '@mui/icons-material';
import { storage } from '../../firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

const FileUpload = ({ onFilesChange, maxFiles = 5, maxFileSize = 10 }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [imageModal, setImageModal] = useState({ open: false, image: null });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const fileInputRef = useRef(null);

  // 지원하는 파일 타입
  const supportedTypes = {
    'image/jpeg': { icon: ImageIcon, label: '이미지' },
    'image/png': { icon: ImageIcon, label: '이미지' },
    'image/gif': { icon: ImageIcon, label: '이미지' },
    'image/webp': { icon: ImageIcon, label: '이미지' },
    'application/pdf': { icon: PdfIcon, label: 'PDF' },
    'application/msword': { icon: DocIcon, label: 'Word' },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: DocIcon, label: 'Word' },
    'application/vnd.ms-excel': { icon: ExcelIcon, label: 'Excel' },
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: ExcelIcon, label: 'Excel' },
    'text/plain': { icon: TextIcon, label: '텍스트' }
  };

  // 파일 크기 포맷팅
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 파일 타입 확인
  const getFileType = (file) => {
    return supportedTypes[file.type] || { icon: AttachFileIcon, label: '파일' };
  };

  // 파일 선택 핸들러
  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    
    // 파일 개수 제한 확인
    if (selectedFiles.length + files.length > maxFiles) {
      setSnackbar({
        open: true,
        message: `최대 ${maxFiles}개까지만 첨부할 수 있습니다.`,
        severity: 'warning'
      });
      return;
    }

    // 파일 크기 및 타입 검증
    const validFiles = files.filter(file => {
      // 파일 크기 확인 (MB 단위)
      if (file.size > maxFileSize * 1024 * 1024) {
        setSnackbar({
          open: true,
          message: `${file.name} 파일이 너무 큽니다. (최대 ${maxFileSize}MB)`,
          severity: 'warning'
        });
        return false;
      }

      // 지원하는 파일 타입 확인
      if (!supportedTypes[file.type]) {
        setSnackbar({
          open: true,
          message: `${file.name} 파일 형식이 지원되지 않습니다.`,
          severity: 'warning'
        });
        return false;
      }

      return true;
    });

    // 미리보기 URL 생성
    const filesWithPreview = validFiles.map(file => ({
      file,
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.type,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      uploaded: false,
      downloadUrl: null
    }));

    setSelectedFiles(prev => [...prev, ...filesWithPreview]);
    onFilesChange([...selectedFiles, ...filesWithPreview]);
  };

  // 파일 제거
  const handleFileRemove = (fileId) => {
    setSelectedFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId);
      onFilesChange(updated);
      return updated;
    });
  };

  // 파일 업로드
  const uploadFile = async (fileData) => {
    return new Promise((resolve, reject) => {
      const timestamp = Date.now();
      const fileName = `${timestamp}_${fileData.file.name}`;
      const storageRef = ref(storage, `discussions/${fileName}`);
      const uploadTask = uploadBytesResumable(storageRef, fileData.file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(prev => ({
            ...prev,
            [fileData.id]: progress
          }));
        },
        (error) => {
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  };

  // 모든 파일 업로드
  const uploadAllFiles = async () => {
    setUploading(true);
    const uploadPromises = selectedFiles
      .filter(f => !f.uploaded)
      .map(async (fileData) => {
        try {
          const downloadURL = await uploadFile(fileData);
          return {
            ...fileData,
            uploaded: true,
            downloadUrl: downloadURL
          };
        } catch (error) {
          console.error('Upload error:', error);
          setSnackbar({
            open: true,
            message: `파일 "${fileData.name}" 업로드 실패: ${error.message}`,
            severity: 'error'
          });
          return {
            ...fileData,
            error: error.message
          };
        }
      });

    try {
      const uploadedFiles = await Promise.all(uploadPromises);
      setSelectedFiles(uploadedFiles);
      onFilesChange(uploadedFiles);
      setSnackbar({
        open: true,
        message: '파일 업로드가 완료되었습니다.',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: '파일 업로드 중 오류가 발생했습니다.',
        severity: 'error'
      });
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  };

  // 이미지 모달 열기
  const handleImageClick = (imageUrl) => {
    setImageModal({ open: true, image: imageUrl });
  };

  // 파일 다운로드
  const handleDownload = (fileData) => {
    if (fileData.downloadUrl) {
      const link = document.createElement('a');
      link.href = fileData.downloadUrl;
      link.download = fileData.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Box>
      {/* 파일 선택 버튼 */}
      <Box sx={{ mb: 2 }}>
        <input
          type="file"
          multiple
          ref={fileInputRef}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
        />
        <Button
          variant="outlined"
          startIcon={<AttachFileIcon />}
          onClick={() => fileInputRef.current?.click()}
          disabled={selectedFiles.length >= maxFiles || uploading}
          sx={{
            borderColor: '#90caf9',
            color: '#90caf9',
            '&:hover': { borderColor: '#64b5f6', backgroundColor: 'rgba(144, 202, 249, 0.1)' }
          }}
        >
          파일 첨부 ({selectedFiles.length}/{maxFiles})
        </Button>
      </Box>

      {/* 파일 미리보기 */}
      {selectedFiles.length > 0 && (
        <Paper sx={{ p: 2, mb: 2, backgroundColor: '#2d3748' }}>
          <Typography variant="h6" sx={{ color: '#90caf9', mb: 2 }}>
            첨부된 파일 ({selectedFiles.length}개)
          </Typography>
          
          <Grid container spacing={2}>
            {selectedFiles.map((fileData) => {
              const FileIcon = getFileType(fileData).icon;
              const isImage = fileData.type.startsWith('image/');
              
              return (
                <Grid item xs={12} sm={6} md={4} key={fileData.id}>
                  <Paper sx={{ 
                    p: 2, 
                    backgroundColor: '#4a5568',
                    border: '1px solid #718096'
                  }}>
                    {/* 이미지 미리보기 */}
                    {isImage && fileData.preview && (
                      <Box 
                        sx={{ 
                          width: '100%', 
                          height: 120, 
                          mb: 1,
                          backgroundImage: `url(${fileData.preview})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          borderRadius: 1,
                          cursor: 'pointer',
                          border: '2px solid #90caf9'
                        }}
                        onClick={() => handleImageClick(fileData.preview)}
                      />
                    )}

                    {/* 파일 정보 */}
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <FileIcon sx={{ color: '#90caf9', mr: 1 }} />
                      <Typography variant="body2" sx={{ color: '#ccc', flex: 1 }}>
                        {fileData.name}
                      </Typography>
                    </Box>

                    <Typography variant="caption" sx={{ color: '#888', display: 'block', mb: 1 }}>
                      {formatFileSize(fileData.size)}
                    </Typography>

                    {/* 업로드 진행률 */}
                    {uploading && uploadProgress[fileData.id] !== undefined && (
                      <Box sx={{ mb: 1 }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={uploadProgress[fileData.id]} 
                          sx={{ mb: 0.5 }}
                        />
                        <Typography variant="caption" sx={{ color: '#90caf9' }}>
                          {Math.round(uploadProgress[fileData.id])}%
                        </Typography>
                      </Box>
                    )}

                    {/* 액션 버튼 */}
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {fileData.uploaded && fileData.downloadUrl && (
                        <IconButton
                          size="small"
                          onClick={() => handleDownload(fileData)}
                          sx={{ color: '#90caf9' }}
                        >
                          <DownloadIcon />
                        </IconButton>
                      )}
                      <IconButton
                        size="small"
                        onClick={() => handleFileRemove(fileData.id)}
                        sx={{ color: '#f56565' }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>

          {/* 업로드 버튼 */}
          {selectedFiles.some(f => !f.uploaded) && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Button
                variant="contained"
                startIcon={<UploadIcon />}
                onClick={uploadAllFiles}
                disabled={uploading}
                sx={{
                  backgroundColor: '#90caf9',
                  color: '#1a202c',
                  '&:hover': { backgroundColor: '#64b5f6' }
                }}
              >
                {uploading ? '업로드 중...' : '파일 업로드'}
              </Button>
            </Box>
          )}
        </Paper>
      )}

      {/* 이미지 모달 */}
      <Dialog
        open={imageModal.open}
        onClose={() => setImageModal({ open: false, image: null })}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { backgroundColor: '#2d3748' }
        }}
      >
        <DialogContent sx={{ p: 0, textAlign: 'center' }}>
          <img
            src={imageModal.image}
            alt="미리보기"
            style={{
              maxWidth: '100%',
              maxHeight: '70vh',
              objectFit: 'contain'
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setImageModal({ open: false, image: null })}
            sx={{ color: '#90caf9' }}
          >
            닫기
          </Button>
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
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FileUpload; 