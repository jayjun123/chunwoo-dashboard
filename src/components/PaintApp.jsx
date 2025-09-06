import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Slider,
  Paper,
  Chip,
  Alert,
  Snackbar,
  Tooltip,
  Divider
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Clear as ClearIcon,
  Palette as PaletteIcon,
  Brush as BrushIcon,
  AutoFixHigh as EraserIcon,
  FormatAlignLeft as AlignLeftIcon,
  FormatAlignCenter as AlignCenterIcon,
  FormatAlignRight as AlignRightIcon,
  OpenInFull as MaximizeIcon,
  CloseFullscreen as MinimizeIcon
} from '@mui/icons-material';
import { ref, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const PaintApp = ({ open, onClose, siteId, siteName }) => {
  const { currentUser } = useAuth();
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState('pen');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [alignment, setAlignment] = useState('left');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isResizing, setIsResizing] = useState(false);
  const [dialogPosition, setDialogPosition] = useState({ x: 100, y: 100 });
  const [dialogSize, setDialogSize] = useState({ width: 800, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [savedDrawings, setSavedDrawings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
    '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#FFC0CB',
    '#A52A2A', '#808080', '#FFFFFF'
  ];

  useEffect(() => {
    if (open) {
      initializeCanvas();
      loadSavedDrawings();
    }
  }, [open]);

  const initializeCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      saveToHistory();
    }
  };

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const imageData = canvas.toDataURL();
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(imageData);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  };

  const undo = () => {
    if (historyIndex > 0) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      saveToHistory();
    }
  };

  const startDrawing = (e) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    
    if (currentTool === 'pen') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = currentColor;
    } else if (currentTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    }
    
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveToHistory();
    }
  };

  const handleMouseDown = (e) => {
    if (e.target.closest('.paint-toolbar')) return;
    setDragStart({ x: e.clientX - dialogPosition.x, y: e.clientY - dialogPosition.y });
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setDialogPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const saveDrawing = async (drawingName) => {
    if (!drawingName.trim()) {
      setSnackbar({ open: true, message: '그림 이름을 입력해주세요.', severity: 'error' });
      return;
    }

    setLoading(true);
    try {
      const canvas = canvasRef.current;
      const dataURL = canvas.toDataURL('image/png');
      const response = await fetch(dataURL);
      const blob = await response.blob();
      
      const fileName = `${drawingName}_${Date.now()}.png`;
      const storagePath = siteId ? `paintings/sites/${siteId}/${fileName}` : `paintings/general/${fileName}`;
      const storageRef = ref(storage, storagePath);
      
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      
      // Firestore에 메타데이터 저장
      const paintingData = {
        name: drawingName,
        url: downloadURL,
        siteId: siteId || null,
        siteName: siteName || null,
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email,
        createdAt: new Date(),
        storagePath: storagePath
      };
      
      setSnackbar({ open: true, message: '그림이 저장되었습니다!', severity: 'success' });
      loadSavedDrawings();
    } catch (error) {
      console.error('저장 실패:', error);
      setSnackbar({ open: true, message: '저장에 실패했습니다.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadSavedDrawings = async () => {
    try {
      const storagePath = siteId ? `paintings/sites/${siteId}/` : `paintings/general/`;
      const listRef = ref(storage, storagePath);
      const result = await listAll(listRef);
      
      const drawings = await Promise.all(
        result.items.map(async (item) => {
          const url = await getDownloadURL(item);
          return {
            name: item.name,
            url: url,
            path: item.fullPath
          };
        })
      );
      
      setSavedDrawings(drawings);
    } catch (error) {
      console.error('그림 목록 로드 실패:', error);
    }
  };

  const loadDrawing = async (url) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      saveToHistory();
    };
    img.src = url;
  };

  const deleteDrawing = async (path) => {
    try {
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
      setSnackbar({ open: true, message: '그림이 삭제되었습니다.', severity: 'success' });
      loadSavedDrawings();
    } catch (error) {
      console.error('삭제 실패:', error);
      setSnackbar({ open: true, message: '삭제에 실패했습니다.', severity: 'error' });
    }
  };

  const downloadDrawing = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `그림_${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          position: 'fixed',
          left: dialogPosition.x,
          top: dialogPosition.y,
          width: dialogSize.width,
          height: dialogSize.height,
          maxWidth: 'none',
          maxHeight: 'none',
          m: 0,
          overflow: 'hidden'
        }
      }}
      BackdropProps={{
        sx: { backgroundColor: 'rgba(0,0,0,0.3)' }
      }}
    >
      <DialogTitle
        sx={{
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 1,
          backgroundColor: 'primary.main',
          color: 'white'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <Typography variant="h6">
          그림판 {siteName && `- ${siteName}`}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="최대화">
            <IconButton size="small" color="inherit">
              <MaximizeIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="닫기">
            <IconButton size="small" color="inherit" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* 도구 모음 */}
        <Box className="paint-toolbar" sx={{ 
          p: 1, 
          borderBottom: 1, 
          borderColor: 'divider',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          alignItems: 'center'
        }}>
          {/* 그리기 도구 */}
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="펜">
              <IconButton
                size="small"
                color={currentTool === 'pen' ? 'primary' : 'default'}
                onClick={() => setCurrentTool('pen')}
              >
                <BrushIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="지우개">
              <IconButton
                size="small"
                color={currentTool === 'eraser' ? 'primary' : 'default'}
                onClick={() => setCurrentTool('eraser')}
              >
                <EraserIcon />
              </IconButton>
            </Tooltip>
          </Box>

          <Divider orientation="vertical" flexItem />

          {/* 색상 선택 */}
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            <PaletteIcon fontSize="small" />
            {colors.map((color) => (
              <Box
                key={color}
                sx={{
                  width: 24,
                  height: 24,
                  backgroundColor: color,
                  border: currentColor === color ? '2px solid #000' : '1px solid #ccc',
                  cursor: 'pointer',
                  borderRadius: '50%'
                }}
                onClick={() => setCurrentColor(color)}
              />
            ))}
          </Box>

          <Divider orientation="vertical" flexItem />

          {/* 브러시 크기 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
            <Typography variant="body2">크기:</Typography>
            <Slider
              value={brushSize}
              onChange={(e, value) => setBrushSize(value)}
              min={1}
              max={20}
              size="small"
              sx={{ width: 80 }}
            />
            <Typography variant="body2">{brushSize}px</Typography>
          </Box>

          <Divider orientation="vertical" flexItem />

          {/* 정렬 */}
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="왼쪽 정렬">
              <IconButton
                size="small"
                color={alignment === 'left' ? 'primary' : 'default'}
                onClick={() => setAlignment('left')}
              >
                <AlignLeftIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="중앙 정렬">
              <IconButton
                size="small"
                color={alignment === 'center' ? 'primary' : 'default'}
                onClick={() => setAlignment('center')}
              >
                <AlignCenterIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="오른쪽 정렬">
              <IconButton
                size="small"
                color={alignment === 'right' ? 'primary' : 'default'}
                onClick={() => setAlignment('right')}
              >
                <AlignRightIcon />
              </IconButton>
            </Tooltip>
          </Box>

          <Divider orientation="vertical" flexItem />

          {/* 편집 도구 */}
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="실행 취소">
              <IconButton size="small" onClick={undo} disabled={historyIndex <= 0}>
                <UndoIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="다시 실행">
              <IconButton size="small" onClick={redo} disabled={historyIndex >= history.length - 1}>
                <RedoIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="지우기">
              <IconButton size="small" onClick={clearCanvas}>
                <ClearIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* 캔버스 영역 */}
        <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <canvas
            ref={canvasRef}
            width={dialogSize.width - 20}
            height={dialogSize.height - 200}
            style={{
              border: '1px solid #ccc',
              cursor: currentTool === 'pen' ? 'crosshair' : 'pointer',
              display: 'block'
            }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
        </Box>

        {/* 저장된 그림 목록 */}
        {savedDrawings.length > 0 && (
          <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider', maxHeight: 120, overflow: 'auto' }}>
            <Typography variant="subtitle2" gutterBottom>
              저장된 그림 ({savedDrawings.length}개)
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {savedDrawings.map((drawing, index) => (
                <Chip
                  key={index}
                  label={drawing.name.replace('.png', '')}
                  onClick={() => loadDrawing(drawing.url)}
                  onDelete={() => deleteDrawing(drawing.path)}
                  size="small"
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 1, borderTop: 1, borderColor: 'divider' }}>
        <TextField
          size="small"
          placeholder="그림 이름"
          sx={{ flex: 1, mr: 1 }}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              saveDrawing(e.target.value);
              e.target.value = '';
            }
          }}
        />
        <Button
          startIcon={<SaveIcon />}
          onClick={(e) => {
            const input = e.target.closest('.MuiDialogActions-root').querySelector('input');
            saveDrawing(input.value);
            input.value = '';
          }}
          disabled={loading}
        >
          저장
        </Button>
        <Button
          startIcon={<DownloadIcon />}
          onClick={downloadDrawing}
        >
          다운로드
        </Button>
        <Button onClick={onClose}>
          닫기
        </Button>
      </DialogActions>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default PaintApp;
