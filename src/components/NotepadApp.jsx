import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  TextField,
  Typography,
  Alert,
  Snackbar,
  Tooltip,
  Slider,
  FormControl,
  Select,
  List,
  ListItem,
  ListItemButton,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  Download as DownloadIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Clear as ClearIcon,
  Brush as BrushIcon,
  ContentCut as EraserIcon,
  TextFields as TextIcon,
  Image as ImageIcon,
  Straighten as LineIcon,
  RadioButtonUnchecked as CircleIcon,
  CropSquare as SquareIcon,
  ChangeHistory as TriangleIcon,
  StarBorder as StarIcon,
  Highlight as HighlighterIcon,
  List as ListIcon,
  PushPin as PinIcon,
  PushPinOutlined as PinOutlinedIcon
} from '@mui/icons-material';
import { storage, db } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, getDoc, collection, query, orderBy, getDocs } from 'firebase/firestore';

const IdeaPad = ({ open, onClose, siteId, siteName }) => {
  // 기본 상태
  const [currentTool, setCurrentTool] = useState('pen');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [isHighlighter, setIsHighlighter] = useState(false);
  const [highlighterColor, setHighlighterColor] = useState('#FFFF00');
  const [pressureSensitivity, setPressureSensitivity] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [shapes, setShapes] = useState([]);
  const [startPoint, setStartPoint] = useState(null);
  const [selectedSiteId, setSelectedSiteId] = useState(siteId || 'CHUNWOO');
  const [selectedSiteName, setSelectedSiteName] = useState(siteName || '');
  const [savedDrawings, setSavedDrawings] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [allSites, setAllSites] = useState([]);
  const [filteredSites, setFilteredSites] = useState([]);
  const [showSiteDropdown, setShowSiteDropdown] = useState(false);
  const [showList, setShowList] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  // Refs
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [dialogSize, setDialogSize] = useState({ width: 550, height: 800 });
  const [dialogPosition, setDialogPosition] = useState({ 
    x: window.innerWidth - 650, // 오른쪽에서 550px(캔버스) + 100px(여백)
    y: 100 
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // 드래그 이벤트 핸들러 (마우스와 터치 모두 지원)
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
    
    // 터치 이벤트인지 마우스 이벤트인지 확인
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    setDragStart({
      x: clientX - dialogPosition.x,
      y: clientY - dialogPosition.y
    });
  }, [dialogPosition]);

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      // 터치 이벤트인지 마우스 이벤트인지 확인
      let clientX, clientY;
      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      
      setDialogPosition({
        x: clientX - dragStart.x,
        y: clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 리사이즈 이벤트 핸들러 (마우스와 터치 모두 지원)
  const handleResizeStart = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    
    // 터치 이벤트인지 마우스 이벤트인지 확인
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    setResizeStart({
      x: clientX,
      y: clientY,
      width: dialogSize.width,
      height: dialogSize.height
    });
  }, [dialogSize]);

  const handleResizeMove = useCallback((e) => {
    if (isResizing) {
      // 터치 이벤트인지 마우스 이벤트인지 확인
      let clientX, clientY;
      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      
      const deltaX = clientX - resizeStart.x;
      const deltaY = clientY - resizeStart.y;
      
      setDialogSize({
        width: Math.max(400, resizeStart.width + deltaX),
        height: Math.max(300, resizeStart.height + deltaY)
      });
    }
  }, [isResizing, resizeStart]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    // 리사이즈 완료 후 캔버스 크기 조정
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      
      // 고정 크기 (550px × 1122px)
      const fixedWidth = 550;
      const fixedHeight = 1122;
      
      // 캔버스 크기 설정 (고정 크기)
      canvas.width = fixedWidth;
      canvas.height = fixedHeight;
      
      // CSS 크기 설정 (고정)
      canvas.style.width = fixedWidth + 'px';
      canvas.style.height = fixedHeight + 'px';
      canvas.style.maxWidth = fixedWidth + 'px';
      canvas.style.maxHeight = fixedHeight + 'px';
      canvas.style.minWidth = fixedWidth + 'px';
      canvas.style.minHeight = fixedHeight + 'px';

      // 노트북 배경 그리기
      drawNotebookBackground(ctx, fixedWidth, fixedHeight);

      // 현재 히스토리 이미지가 있으면 다시 그리기
      if (history.length > 0 && historyIndex >= 0) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
        };
        img.src = history[historyIndex];
      }
    }, 100);
  }, [history, historyIndex]);

  // 색상 팔레트 (회색 1번째, 4번째 제거)
  const colors = [
    '#333333', '#666666', '#CCCCCC',
    '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF',
    '#00FFFF', '#FFA500', '#800080', '#FFC0CB', '#A52A2A'
  ];

  const highlighterColors = [
    '#FFFF00', // 노랑
    '#FFA500', // 주황
    '#90EE90', // 연두
    '#FF6B6B'  // 빨강
  ];

  // 노트북 배경 그리기
  const drawNotebookBackground = useCallback((ctx, width, height) => {
    // 배경색
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);

    // 줄 그리기
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    const lineSpacing = 20;
    for (let y = lineSpacing; y < height; y += lineSpacing) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    // 왼쪽 여백선
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, 0);
    ctx.lineTo(60, height);
    ctx.stroke();
  }, []);

  // 도형 그리기 함수
  const drawShape = useCallback((ctx, start, end, tool, color = currentColor, lineWidth = brushSize) => {
    // 현재 캔버스 상태를 보존하기 위해 새로운 경로만 시작
    ctx.save(); // 현재 상태 저장
    
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.fillStyle = 'transparent';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'source-over'; // 기존 그림 위에 그리기

    const { x: x1, y: y1 } = start;
    const { x: x2, y: y2 } = end;

    ctx.beginPath();

    switch (tool) {
      case 'line':
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        break;
      case 'rectangle':
        ctx.rect(x1, y1, x2 - x1, y2 - y1);
        break;
      case 'circle':
        const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        ctx.arc(x1, y1, radius, 0, 2 * Math.PI);
        break;
      case 'triangle':
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x1 + (x2 - x1) / 2, y1);
        ctx.closePath();
        break;
      case 'star':
        const centerX = (x1 + x2) / 2;
        const centerY = (y1 + y2) / 2;
        const outerRadius = Math.min(Math.abs(x2 - x1), Math.abs(y2 - y1)) / 2;
        const innerRadius = outerRadius * 0.4;
        const spikes = 5;
        
        for (let i = 0; i < spikes * 2; i++) {
          const angle = (i * Math.PI) / spikes;
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        break;
    }

    ctx.stroke();
    ctx.restore(); // 이전 상태 복원
  }, [currentColor, brushSize]);

  // 도형 추가
  const addShape = useCallback((start, end, tool) => {
    const newShape = {
      id: Date.now(),
      type: tool,
      start,
      end,
      color: currentColor,
      lineWidth: brushSize
    };
    setShapes(prev => [...prev, newShape]);
  }, [currentColor, brushSize]);

  // 전역 마우스/터치 이벤트 리스너
  useEffect(() => {
    if (isDragging || isResizing) {
      const moveHandler = isDragging ? handleMouseMove : handleResizeMove;
      const endHandler = isDragging ? handleMouseUp : handleResizeEnd;
      
      document.addEventListener('mousemove', moveHandler);
      document.addEventListener('mouseup', endHandler);
      document.addEventListener('touchmove', moveHandler, { passive: false });
      document.addEventListener('touchend', endHandler);
      
      return () => {
        document.removeEventListener('mousemove', moveHandler);
        document.removeEventListener('mouseup', endHandler);
        document.removeEventListener('touchmove', moveHandler);
        document.removeEventListener('touchend', endHandler);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp, handleResizeMove, handleResizeEnd]);

  // 캔버스 초기화
  const initializeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // 고정 크기 (550px × 1122px)
    const fixedWidth = 550;
    const fixedHeight = 1122;
    
    // 캔버스 크기 설정 (고정 크기)
    canvas.width = fixedWidth;
    canvas.height = fixedHeight;
    
    // CSS 크기 설정 (고정)
    canvas.style.width = fixedWidth + 'px';
    canvas.style.height = fixedHeight + 'px';
    canvas.style.maxWidth = fixedWidth + 'px';
    canvas.style.maxHeight = fixedHeight + 'px';
    canvas.style.minWidth = fixedWidth + 'px';
    canvas.style.minHeight = fixedHeight + 'px';

    // 노트북 배경 그리기
    drawNotebookBackground(ctx, fixedWidth, fixedHeight);

    // 히스토리에 초기 상태 저장
    const imageData = canvas.toDataURL();
    setHistory([imageData]);
    setHistoryIndex(0);
  }, [drawNotebookBackground]);


  // 필압 감지 함수
  const getPressure = useCallback((e) => {
    if (!pressureSensitivity) return 1;
    
    // 터치 이벤트에서 필압 감지
    if (e.touches && e.touches.length > 0) {
      const touch = e.touches[0];
      // force 속성 (iOS Safari에서 지원)
      if (touch.force !== undefined) {
        return Math.max(0.1, Math.min(2, touch.force));
      }
      // radiusX, radiusY로 필압 추정 (Android)
      if (touch.radiusX !== undefined && touch.radiusY !== undefined) {
        const radius = Math.min(touch.radiusX, touch.radiusY);
        return Math.max(0.1, Math.min(2, 1 - (radius / 50)));
      }
    }
    
    // 마우스 이벤트에서는 기본값
    return 1;
  }, [pressureSensitivity]);

  // 좌표 변환 (마우스와 터치 모두 지원)
  const getCanvasCoordinates = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    // 터치 이벤트인지 마우스 이벤트인지 확인
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // 캔버스 내부 좌표로 변환 (고정 크기 기준)
    const x = (clientX - rect.left) * (550 / rect.width);
    const y = (clientY - rect.top) * (1122 / rect.height);

    return { x, y };
  }, []);

  // 텍스트 입력 자동 완료 함수
  const completeTextInput = useCallback(() => {
    if (isTyping && textInput.trim() !== '') {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      ctx.save();
      ctx.font = `${brushSize * 4}px Arial`;
      ctx.fillStyle = currentColor;
      ctx.textBaseline = 'top';
      
      const rect = canvas.getBoundingClientRect();
      const textX = textPosition.x * (rect.width / 550);
      const textY = textPosition.y * (rect.height / 1122);
      
      ctx.fillText(textInput, textX, textY);
      ctx.restore();
      
      const imageData = canvas.toDataURL();
      setHistory(prev => [...prev.slice(0, historyIndex + 1), imageData]);
      setHistoryIndex(prev => prev + 1);
      
      // 텍스트 입력 종료 (십자가 마커 제거)
      setIsTyping(false);
      setTextInput('');
      setTextPosition(null);
      
      // 마커 제거를 위해 캔버스 즉시 다시 그리기
      const canvasElement = canvasRef.current;
      if (canvasElement) {
        const ctx = canvasElement.getContext('2d');
        if (history.length > 0 && historyIndex >= 0) {
          const img = new Image();
          img.onload = () => {
            ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
            drawNotebookBackground(ctx, canvasElement.width, canvasElement.height);
            ctx.drawImage(img, 0, 0);
          };
          img.src = history[historyIndex];
        }
      }
    }
  }, [isTyping, textInput, textPosition, brushSize, currentColor, historyIndex]);

  // 그리기 시작
  const startDrawing = useCallback((e) => {
    // 터치 이벤트의 기본 동작 방지 (스크롤 등)
    e.preventDefault();

    const { x, y } = getCanvasCoordinates(e);

    // 텍스트 입력 중이고 다른 곳을 클릭한 경우 현재 텍스트를 캔버스에 그리기
    if (isTyping && currentTool === 'text' && textInput.trim() !== '') {
      completeTextInput();
      setCurrentTool('pen'); // 텍스트 입력 후 펜 도구로 전환
      return;
    }

    // 텍스트 도구인 경우 텍스트 입력 시작
    if (currentTool === 'text') {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      
      // 실제 클릭한 화면 좌표 저장 (캔버스 컨테이너 기준)
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      
      console.log('텍스트 입력 시작:', { 
        canvasX: x, 
        canvasY: y,
        screenX: screenX,
        screenY: screenY
      });
      
      // 화면 좌표만 저장 (input 요소 위치용)
      setTextPosition({ screenX, screenY, canvasX: x, canvasY: y });
      setIsTyping(true);
      setTextInput('');
      return;
    }

    setIsDrawing(true);
    const pressure = getPressure(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // 도형 그리기인 경우 시작점 저장
    if (['line', 'rectangle', 'circle', 'triangle', 'star'].includes(currentTool)) {
      setStartPoint({ x, y });
      return;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);

    if (currentTool === 'pen') {
      if (isHighlighter) {
        ctx.globalCompositeOperation = 'multiply';
        ctx.strokeStyle = highlighterColor + '60';
        ctx.lineWidth = brushSize * 3 * pressure; // 필압 적용
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = brushSize * pressure; // 필압 적용
      }
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    } else if (currentTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = brushSize * 2 * pressure; // 필압 적용
      ctx.lineCap = 'round';
    }
  }, [currentTool, currentColor, brushSize, isHighlighter, highlighterColor, getCanvasCoordinates]);

  // 그리기 중
  const draw = useCallback((e) => {
    if (!isDrawing || currentTool === 'text') return;

    // 터치 이벤트의 기본 동작 방지
    e.preventDefault();

    const { x, y } = getCanvasCoordinates(e);
    const pressure = getPressure(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (currentTool === 'pen' || currentTool === 'eraser') {
      // 필압에 따른 선 굵기 동적 조절
      if (currentTool === 'pen') {
        if (isHighlighter) {
          ctx.lineWidth = brushSize * 3 * pressure;
        } else {
          ctx.lineWidth = brushSize * pressure;
        }
      } else if (currentTool === 'eraser') {
        ctx.lineWidth = brushSize * 2 * pressure;
      }
      
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else if (['line', 'rectangle', 'circle', 'triangle', 'star'].includes(currentTool) && startPoint) {
      // 도형 미리보기 그리기
      // 현재 히스토리 이미지를 먼저 그리기
      if (history.length > 0 && historyIndex >= 0) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          drawNotebookBackground(ctx, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          
          // 미리보기 도형 그리기
          ctx.save();
          ctx.strokeStyle = currentColor;
          ctx.lineWidth = brushSize;
          ctx.fillStyle = 'transparent';
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.globalCompositeOperation = 'source-over';
          
          drawShape(ctx, startPoint, { x, y }, currentTool);
          ctx.restore();
        };
        img.src = history[historyIndex];
      }
    }
  }, [isDrawing, currentTool, getCanvasCoordinates, startPoint, history, historyIndex, drawShape, currentColor, brushSize, drawNotebookBackground]);

  // 텍스트 입력 처리 (한글 지원)
  const handleTextInput = useCallback((e) => {
    if (!isTyping || currentTool !== 'text') return;

    if (e.key === 'Enter') {
      // 텍스트를 캔버스에 그리기
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      ctx.save();
      ctx.font = `${brushSize * 4}px Arial`;
      ctx.fillStyle = currentColor;
      ctx.textBaseline = 'top';
      
      // 텍스트 위치를 캔버스 좌표로 변환
      const rect = canvas.getBoundingClientRect();
      const x = textPosition.x * (rect.width / 550);
      const y = textPosition.y * (rect.height / 1122);
      
      ctx.fillText(textInput, x, y);
      ctx.restore();
      
      // 히스토리에 추가
      const imageData = canvas.toDataURL();
      setHistory(prev => [...prev.slice(0, historyIndex + 1), imageData]);
      setHistoryIndex(prev => prev + 1);
      
      // 텍스트 입력 종료
      setIsTyping(false);
      setTextInput('');
      setTextPosition(null);
      setCurrentTool('pen'); // 텍스트 입력 후 펜 도구로 전환
    } else if (e.key === 'Escape') {
      // 텍스트 입력 취소
      setIsTyping(false);
      setTextInput('');
      setTextPosition(null);
      setCurrentTool('pen');
    }
    // 한글 입력은 input 이벤트로 처리
  }, [isTyping, currentTool, textPosition, textInput, brushSize, currentColor, historyIndex]);

  // 키보드 이벤트 리스너 등록 (간단한 방법)
  useEffect(() => {
    if (isTyping) {
      document.addEventListener('keydown', handleTextInput);
      return () => {
        document.removeEventListener('keydown', handleTextInput);
      };
    }
  }, [isTyping, handleTextInput]);

  // 텍스트 입력 중일 때 위치 표시
  useEffect(() => {
    if (isTyping && textPosition) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      
      // 현재 히스토리 이미지를 먼저 그리기
      if (history.length > 0 && historyIndex >= 0) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          drawNotebookBackground(ctx, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          
          // 텍스트 입력 위치에 십자가 표시
          ctx.save();
          ctx.strokeStyle = currentColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(textPosition.canvasX - 8, textPosition.canvasY);
          ctx.lineTo(textPosition.canvasX + 8, textPosition.canvasY);
          ctx.moveTo(textPosition.canvasX, textPosition.canvasY - 8);
          ctx.lineTo(textPosition.canvasX, textPosition.canvasY + 8);
          ctx.stroke();
          ctx.restore();
        };
        img.src = history[historyIndex];
      } else {
        // 히스토리가 없는 경우 기본 배경만 그리기
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawNotebookBackground(ctx, canvas.width, canvas.height);
        
        // 텍스트 입력 위치에 십자가 표시
        ctx.save();
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(textPosition.canvasX - 8, textPosition.canvasY);
        ctx.lineTo(textPosition.canvasX + 8, textPosition.canvasY);
        ctx.moveTo(textPosition.canvasX, textPosition.canvasY - 8);
        ctx.lineTo(textPosition.canvasX, textPosition.canvasY + 8);
        ctx.stroke();
        ctx.restore();
      }
    } else if (!isTyping) {
      // 텍스트 입력이 완료되면 십자가 마커 제거를 위해 캔버스 다시 그리기
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      
      // 현재 히스토리 이미지를 다시 그리기 (십자가 마커 없이)
      if (history.length > 0 && historyIndex >= 0) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          drawNotebookBackground(ctx, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        };
        img.src = history[historyIndex];
      } else {
        // 히스토리가 없는 경우 기본 배경만 그리기
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawNotebookBackground(ctx, canvas.width, canvas.height);
      }
    }
  }, [isTyping, textPosition, currentColor, history, historyIndex, drawNotebookBackground]);


  // 그리기 종료
  const stopDrawing = useCallback((e) => {
    if (!isDrawing) return;

    // 터치 이벤트의 기본 동작 방지
    if (e) e.preventDefault();

    setIsDrawing(false);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.globalCompositeOperation = 'source-over';

    // 도형 그리기인 경우 도형 추가 및 그리기
    if (['line', 'rectangle', 'circle', 'triangle', 'star'].includes(currentTool) && startPoint) {
      const { x, y } = getCanvasCoordinates(e);
      
      // 히스토리 이미지를 먼저 복원
      if (history.length > 0 && historyIndex >= 0) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          drawNotebookBackground(ctx, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          
          // 최종 도형 그리기
          drawShape(ctx, startPoint, { x, y }, currentTool);
          
          // 도형 추가
          addShape(startPoint, { x, y }, currentTool);
          setStartPoint(null);
          
          // 도형이 그려진 후의 캔버스를 히스토리에 저장
          const newImageData = canvas.toDataURL();
          const newHistory = history.slice(0, historyIndex + 1);
          newHistory.push(newImageData);
          setHistory(newHistory);
          setHistoryIndex(newHistory.length - 1);
        };
        img.src = history[historyIndex];
      }
      return; // 도형 그리기 완료 시 여기서 종료
    }

    // 히스토리에 저장
    const imageData = canvas.toDataURL();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(imageData);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [isDrawing, history, historyIndex, currentTool, startPoint, getCanvasCoordinates, addShape, drawShape]);

  // 실행 취소
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, rect.width, rect.height);
        drawNotebookBackground(ctx, rect.width, rect.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = history[newIndex];
    }
  }, [historyIndex, history, drawNotebookBackground]);

  // 다시 실행
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, rect.width, rect.height);
        drawNotebookBackground(ctx, rect.width, rect.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = history[newIndex];
    }
  }, [historyIndex, history, drawNotebookBackground]);

  // 캔버스 지우기
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    drawNotebookBackground(ctx, rect.width, rect.height);
    
    const imageData = canvas.toDataURL();
    setHistory([imageData]);
    setHistoryIndex(0);
    setShapes([]);
  }, [drawNotebookBackground]);

  // 현장 목록 로드
  const loadSites = useCallback(async () => {
    try {
      const q = query(collection(db, 'sites'), orderBy('name'));
      const querySnapshot = await getDocs(q);
      const sitesList = [];
      
      querySnapshot.forEach((doc) => {
        sitesList.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setAllSites(sitesList);
      setFilteredSites(sitesList);
    } catch (error) {
      console.error('현장 목록 로드 실패:', error);
    }
  }, []);

  // 현장 검색 (개선된 검색)
  const handleSiteSearch = useCallback((query) => {
    if (query.trim() === '') {
      setFilteredSites(allSites);
      setShowSiteDropdown(false);
    } else {
      const searchTerm = query.toLowerCase().trim();
      
      // 더 정확한 검색: 시작 부분 우선, 부분 일치 포함
      const filtered = allSites
        .map(site => {
          const name = site.name.toLowerCase();
          let score = 0;
          
          // 정확한 일치
          if (name === searchTerm) score = 100;
          // 시작 부분 일치
          else if (name.startsWith(searchTerm)) score = 80;
          // 단어 시작 부분 일치
          else if (name.includes(' ' + searchTerm)) score = 60;
          // 부분 일치
          else if (name.includes(searchTerm)) score = 40;
          
          return { ...site, score };
        })
        .filter(site => site.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10); // 최대 10개 결과만 표시
      
      setFilteredSites(filtered);
      setShowSiteDropdown(filtered.length > 0);
    }
  }, [allSites]);

  // 현장 선택
  const handleSiteSelect = useCallback((site) => {
    setSelectedSiteId(site.id);
    setSelectedSiteName(site.name);
    setSearchQuery(site.name);
    setShowSiteDropdown(false);
  }, []);

  // 저장된 그림 목록 로드
  const loadSavedDrawings = useCallback(async () => {
    try {
      const q = query(
        collection(db, 'notepad_drawings'),
        orderBy('timestamp', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const drawings = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.siteId === selectedSiteId) {
          drawings.push({
            id: doc.id,
            ...data
          });
        }
      });
      
      setSavedDrawings(drawings);
    } catch (error) {
      console.error('저장된 그림 로드 실패:', error);
      setAlert({ open: true, message: '저장된 그림을 불러오는데 실패했습니다.', severity: 'error' });
    }
  }, [selectedSiteId]);

  // 그림 저장
  const saveDrawing = useCallback(async () => {
    try {
      const canvas = canvasRef.current;
      const fileName = `drawing_${Date.now()}.png`;
      const storageRef = ref(storage, `notepad_drawings/${fileName}`);
      
      canvas.toBlob(async (blob) => {
        await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(storageRef);
        
        await setDoc(doc(db, 'notepad_drawings', fileName), {
          url: downloadURL,
          siteId: selectedSiteId,
          siteName: selectedSiteName || 'CHUNWOO',
          timestamp: new Date(),
          shapes: shapes
        });
        
        setAlert({ open: true, message: '그림이 저장되었습니다.', severity: 'success' });
        loadSavedDrawings();
      });
    } catch (error) {
      console.error('그림 저장 실패:', error);
      setAlert({ open: true, message: '그림 저장에 실패했습니다.', severity: 'error' });
    }
  }, [selectedSiteId, selectedSiteName, shapes, loadSavedDrawings]);

  // 그림 로드
  const loadDrawing = useCallback(async (drawing) => {
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      const img = new Image();
      
      img.onload = () => {
        ctx.clearRect(0, 0, rect.width, rect.height);
        drawNotebookBackground(ctx, rect.width, rect.height);
        ctx.drawImage(img, 0, 0);
        
        const imageData = canvas.toDataURL();
        setHistory([imageData]);
        setHistoryIndex(0);
        setShapes(drawing.shapes || []);
      };
      
      img.src = drawing.url;
      setShowList(false);
    } catch (error) {
      console.error('그림 로드 실패:', error);
      setAlert({ open: true, message: '그림을 불러오는데 실패했습니다.', severity: 'error' });
    }
  }, [drawNotebookBackground]);

  // 다운로드
  const downloadDrawing = useCallback(() => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `idea_pad_${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  }, []);

  // Effects
  useEffect(() => {
    if (open) {
      initializeCanvas();
      loadSites();
      loadSavedDrawings();
    }
  }, [open, initializeCanvas, loadSites, loadSavedDrawings]);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event) => {
      // 검색 드롭다운 외부 클릭
      if (showSiteDropdown && !event.target.closest('.site-search-container')) {
        setShowSiteDropdown(false);
      }
      
      // 아이디어패드가 고정되지 않았고, 아이디어패드 외부 클릭 시
      if (!isPinned && open && !event.target.closest('.ideapad-container')) {
        // 현재 텍스트 입력 중이면 완료
        if (isTyping && textInput.trim() !== '') {
          completeTextInput();
        }
        
        // 자동 저장 후 닫기
        const autoSaveAndClose = async () => {
          try {
            const canvas = canvasRef.current;
            if (canvas && history.length > 1) { // 초기 상태가 아닌 경우만 저장
              const fileName = `autosave_${Date.now()}.png`;
              const storageRef = ref(storage, `notepad_drawings/${fileName}`);
              const canvasDataURL = canvas.toDataURL('image/png');
              const response = await fetch(canvasDataURL);
              const blob = await response.blob();
              
              await uploadBytes(storageRef, blob);
              const downloadURL = await getDownloadURL(storageRef);
              
              await addDoc(collection(db, 'notepad_drawings'), {
                siteId: selectedSiteId,
                siteName: selectedSiteName,
                fileName,
                downloadURL,
                timestamp: new Date(),
                isAutoSave: true
              });
              
              console.log('자동 저장 완료');
            }
          } catch (error) {
            console.error('자동 저장 실패:', error);
          } finally {
            onClose();
          }
        };
        
        autoSaveAndClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSiteDropdown, isPinned, open, isTyping, textInput, completeTextInput, selectedSiteId, selectedSiteName, onClose]);

  // 창 크기 변경 시 오른쪽 위치 유지
  useEffect(() => {
    const handleResize = () => {
      setDialogPosition(prev => ({
        ...prev,
        x: Math.min(prev.x, window.innerWidth - 650)
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        // 고정 크기 (550px × 1122px)
        const fixedWidth = 550;
        const fixedHeight = 1122;
        
        // 캔버스 크기 설정 (고정 크기)
        canvas.width = fixedWidth;
        canvas.height = fixedHeight;
        
        // CSS 크기 설정 (고정)
        canvas.style.width = fixedWidth + 'px';
        canvas.style.height = fixedHeight + 'px';
        canvas.style.maxWidth = fixedWidth + 'px';
        canvas.style.maxHeight = fixedHeight + 'px';
        canvas.style.minWidth = fixedWidth + 'px';
        canvas.style.minHeight = fixedHeight + 'px';

        // 노트북 배경 그리기
        drawNotebookBackground(ctx, fixedWidth, fixedHeight);

        // 현재 히스토리 이미지가 있으면 다시 그리기
        if (history.length > 0 && historyIndex >= 0) {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0);
          };
          img.src = history[historyIndex];
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [dialogSize, open, history, historyIndex]);

  // 아이패드/터치 디바이스 최적화
  useEffect(() => {
    if (open) {
      // 터치 디바이스 감지
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      if (isTouchDevice) {
        // 터치 디바이스에서 더 부드러운 그리기를 위한 설정
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
        }
      }
    }
  }, [open]);

  // 띄워두기 상태일 때 창 닫기 방지
  const handleClose = useCallback(() => {
    if (!isPinned) {
      onClose();
    }
  }, [isPinned, onClose]);

  if (!open) return null;

  return (
    <Box
      className="ideapad-container"
      sx={{
        position: 'fixed',
        top: dialogPosition.y,
        left: dialogPosition.x,
        width: dialogSize.width,
        height: dialogSize.height,
        backgroundColor: '#1a1a1a',
        color: '#fff',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        border: '1px solid #444',
        borderRadius: '8px',
        zIndex: 1300,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#2d2d2d',
          color: '#fff',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          padding: '16px',
          borderBottom: '1px solid #444'
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6">IDEA PAD</Typography>
          
          {/* 간단한 현장 검색 컴포넌트 */}
          <Box 
            sx={{ 
              position: 'relative', 
              minWidth: 200,
              pointerEvents: 'auto'
            }}
            onClick={(e) => {
              e.stopPropagation();
              const input = e.currentTarget.querySelector('input');
              if (input) {
                input.focus();
              }
            }}
          >
            <input
              type="text"
              placeholder="현장명 검색"
              value={searchQuery}
              onChange={(e) => {
                e.stopPropagation();
                console.log('입력값:', e.target.value);
                setSearchQuery(e.target.value);
                if (e.target.value.trim() !== '') {
                  handleSiteSearch(e.target.value);
                } else {
                  setShowSiteDropdown(false);
                }
              }}
              onFocus={(e) => {
                e.stopPropagation();
                e.target.focus();
                if (searchQuery.trim() !== '') {
                  setShowSiteDropdown(true);
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                e.target.focus();
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              onKeyDown={(e) => {
                e.stopPropagation();
              }}
              onBlur={() => {
                setTimeout(() => setShowSiteDropdown(false), 150);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: '#333',
                color: '#fff',
                border: '1px solid #555',
                borderRadius: '4px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                cursor: 'text',
                pointerEvents: 'auto',
                zIndex: 1
              }}
            />
            
            {/* 검색 결과 드롭다운 */}
            {showSiteDropdown && filteredSites.length > 0 && (
              <Box
                sx={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: '#2d2d2d',
                  border: '1px solid #555',
                  borderTop: 'none',
                  borderRadius: '0 0 4px 4px',
                  maxHeight: 200,
                  overflowY: 'auto',
                  zIndex: 1000,
                  boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
                }}
              >
                {filteredSites.map((site, index) => {
                  // 검색어 하이라이트 함수
                  const highlightText = (text, searchTerm) => {
                    if (!searchTerm) return text;
                    const regex = new RegExp(`(${searchTerm})`, 'gi');
                    const parts = text.split(regex);
                    return parts.map((part, i) => 
                      regex.test(part) ? (
                        <span key={i} style={{ backgroundColor: '#ffeb3b', color: '#000', fontWeight: 'bold' }}>
                          {part}
                        </span>
                      ) : part
                    );
                  };

                  return (
                    <Box
                      key={site.id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSiteSelect(site);
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      sx={{
                        padding: '10px 12px',
                        cursor: 'pointer',
                        color: '#fff',
                        borderBottom: '1px solid #444',
                        fontSize: '14px',
                        backgroundColor: index === selectedIndex ? '#444' : 'transparent',
                        '&:hover': {
                          backgroundColor: '#444'
                        },
                        '&:last-child': {
                          borderBottom: 'none'
                        }
                      }}
                    >
                      {highlightText(site.name, searchQuery)}
                    </Box>
                  );
                })}
              </Box>
            )}
            
            {/* 검색 결과 없음 */}
            {showSiteDropdown && searchQuery.trim() !== '' && filteredSites.length === 0 && (
              <Box
                sx={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: '#2d2d2d',
                  border: '1px solid #555',
                  borderTop: 'none',
                  borderRadius: '0 0 4px 4px',
                  padding: '10px 12px',
                  color: '#999',
                  fontSize: '14px',
                  fontStyle: 'italic',
                  zIndex: 1000
                }}
              >
                검색 결과가 없습니다
              </Box>
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title={isPinned ? "띄워두기 해제" : "띄워두기"}>
            <IconButton 
              onClick={() => setIsPinned(!isPinned)} 
              sx={{ 
                color: isPinned ? '#ffeb3b' : '#fff',
                backgroundColor: isPinned ? 'rgba(255, 235, 59, 0.1)' : 'transparent'
              }}
            >
              {isPinned ? <PinIcon /> : <PinOutlinedIcon />}
            </IconButton>
          </Tooltip>
          <IconButton 
            onClick={handleClose} 
            sx={{ 
              color: isPinned ? '#666' : '#fff',
              opacity: isPinned ? 0.5 : 1
            }}
            disabled={isPinned}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ flex: 1, backgroundColor: '#1a1a1a', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* 툴바 - 3줄로 구성 */}
        <Box sx={{ backgroundColor: '#2d2d2d', borderBottom: '1px solid #444' }}>
          {/* 1줄: 그리기 도구 */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              p: 1,
              borderBottom: '1px solid #444'
            }}
          >
          <Tooltip title="펜">
            <IconButton
              color={currentTool === 'pen' && !isHighlighter ? 'primary' : 'default'}
              onClick={() => {
                completeTextInput();
                setCurrentTool('pen');
                setIsHighlighter(false);
              }}
              sx={{ 
                color: '#fff',
                backgroundColor: currentTool === 'pen' && !isHighlighter ? 'rgba(25, 118, 210, 0.2)' : 'transparent'
              }}
            >
              <BrushIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="형광펜">
            <Box sx={{ position: 'relative' }}>
              <IconButton
                color={isHighlighter ? 'primary' : 'default'}
                onClick={() => {
                  completeTextInput();
                  setCurrentTool('pen');
                  setIsHighlighter(true);
                }}
                sx={{ 
                  color: '#fff',
                  backgroundColor: isHighlighter ? 'rgba(255, 255, 0, 0.2)' : 'transparent'
                }}
              >
                <HighlighterIcon />
              </IconButton>
              
              {/* 형관펜 색상 팝업 */}
              {isHighlighter && (
                <Box sx={{ 
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-25%)',
                  mt: 1,
                  backgroundColor: '#2d2d2d',
                  border: '1px solid #555',
                  borderRadius: '8px',
                  padding: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  zIndex: 1000,
                  display: 'flex',
                  gap: 1,
                  alignItems: 'center'
                }}>
                  {highlighterColors.map((color) => (
                    <Box
                      key={color}
                      onClick={() => setHighlighterColor(color)}
                      sx={{
                        width: 28,
                        height: 28,
                        backgroundColor: color,
                        border: highlighterColor === color ? '2px solid #fff' : '1px solid #ccc',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          transform: 'scale(1.1)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                        }
                      }}
                    />
                  ))}
                </Box>
              )}
            </Box>
          </Tooltip>

          <Tooltip title="지우개">
            <IconButton
              color={currentTool === 'eraser' ? 'primary' : 'default'}
              onClick={() => {
                completeTextInput();
                setCurrentTool('eraser');
                setIsHighlighter(false);
              }}
              sx={{ 
                color: '#fff',
                backgroundColor: currentTool === 'eraser' ? 'rgba(25, 118, 210, 0.2)' : 'transparent'
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M16.24 3.56l4.95 4.94c.78.79.78 2.05 0 2.84L12 20.53a4.008 4.008 0 0 1-5.66 0L2.81 17c-.78-.79-.78-2.05 0-2.84l10.6-10.6c.79-.78 2.05-.78 2.83 0M4.22 15.58l3.54 3.53c.78.79 2.04.79 2.83 0l3.53-3.53-6.36-6.36-3.54 3.36z"/>
              </svg>
            </IconButton>
          </Tooltip>

          <Tooltip title="텍스트 입력">
            <IconButton
              color={currentTool === 'text' ? 'primary' : 'default'}
              onClick={() => {
                setCurrentTool('text');
                setIsHighlighter(false);
              }}
              sx={{ 
                color: '#fff',
                backgroundColor: currentTool === 'text' ? 'rgba(25, 118, 210, 0.2)' : 'transparent'
              }}
            >
              <TextIcon />
            </IconButton>
          </Tooltip>

          {/* 도형 버튼들 */}
          <Tooltip title="직선">
            <IconButton
              color={currentTool === 'line' ? 'primary' : 'default'}
              onClick={() => {
                completeTextInput();
                setCurrentTool('line');
                setIsHighlighter(false);
              }}
              sx={{ 
                color: '#fff',
                backgroundColor: currentTool === 'line' ? 'rgba(25, 118, 210, 0.2)' : 'transparent'
              }}
            >
              <LineIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="사각형">
            <IconButton
              color={currentTool === 'rectangle' ? 'primary' : 'default'}
              onClick={() => {
                completeTextInput();
                setCurrentTool('rectangle');
                setIsHighlighter(false);
              }}
              sx={{ 
                color: '#fff',
                backgroundColor: currentTool === 'rectangle' ? 'rgba(25, 118, 210, 0.2)' : 'transparent'
              }}
            >
              <SquareIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="원">
            <IconButton
              color={currentTool === 'circle' ? 'primary' : 'default'}
              onClick={() => {
                completeTextInput();
                setCurrentTool('circle');
                setIsHighlighter(false);
              }}
              sx={{ 
                color: '#fff',
                backgroundColor: currentTool === 'circle' ? 'rgba(25, 118, 210, 0.2)' : 'transparent'
              }}
            >
              <CircleIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="삼각형">
            <IconButton
              color={currentTool === 'triangle' ? 'primary' : 'default'}
              onClick={() => {
                completeTextInput();
                setCurrentTool('triangle');
                setIsHighlighter(false);
              }}
              sx={{ 
                color: '#fff',
                backgroundColor: currentTool === 'triangle' ? 'rgba(25, 118, 210, 0.2)' : 'transparent'
              }}
            >
              <TriangleIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="별">
            <IconButton
              color={currentTool === 'star' ? 'primary' : 'default'}
              onClick={() => {
                completeTextInput();
                setCurrentTool('star');
                setIsHighlighter(false);
              }}
              sx={{ 
                color: '#fff',
                backgroundColor: currentTool === 'star' ? 'rgba(25, 118, 210, 0.2)' : 'transparent'
              }}
            >
              <StarIcon />
            </IconButton>
          </Tooltip>

            <Box sx={{ width: 100, ml: 2 }}>
              <Typography variant="caption" sx={{ color: '#ccc' }}>
                크기: {brushSize}px
              </Typography>
              <Slider
                value={brushSize}
                onChange={(e, value) => setBrushSize(value)}
                min={1}
                max={20}
                size="small"
                sx={{ color: '#1976d2' }}
              />
            </Box>

            <Tooltip title={pressureSensitivity ? "필압 감지 켜짐" : "필압 감지 꺼짐"}>
              <IconButton
                onClick={() => setPressureSensitivity(!pressureSensitivity)}
                sx={{ 
                  color: pressureSensitivity ? '#4caf50' : '#ccc',
                  ml: 1
                }}
              >
                <Typography variant="caption" sx={{ fontSize: '10px' }}>
                  필압
                </Typography>
              </IconButton>
            </Tooltip>
          </Box>

          {/* 2줄: 색깔 팔레트 */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              p: 1,
              borderBottom: '1px solid #444'
            }}
          >
            <Typography variant="caption" sx={{ color: '#ccc', mr: 1 }}>
              색상:
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {colors.map((color) => (
                <Box
                  key={color}
                  onClick={() => setCurrentColor(color)}
                  sx={{
                    width: 24,
                    height: 24,
                    backgroundColor: color,
                    border: currentColor === color ? '2px solid #fff' : '1px solid #ccc',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    '&:hover': {
                      transform: 'scale(1.1)',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }
                  }}
                />
              ))}
            </Box>

          </Box>

          {/* 3줄: 버튼들 */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1
            }}
          >

            <Button
              variant="outlined"
              size="small"
              startIcon={<UndoIcon />}
              onClick={undo}
              disabled={historyIndex <= 0}
              sx={{ minWidth: 'auto', px: 1 }}
            >
              실행취소
            </Button>

            <Button
              variant="outlined"
              size="small"
              startIcon={<RedoIcon />}
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              sx={{ minWidth: 'auto', px: 1 }}
            >
              다시실행
            </Button>

            <Button
              variant="outlined"
              size="small"
              startIcon={<ClearIcon />}
              onClick={clearCanvas}
              sx={{ minWidth: 'auto', px: 1 }}
            >
              초기화
            </Button>

            <Button
              variant="contained"
              size="small"
              startIcon={<SaveIcon />}
              onClick={saveDrawing}
              sx={{ minWidth: 'auto', px: 1 }}
            >
              저장
            </Button>

            <Button
              variant="outlined"
              size="small"
              startIcon={<ListIcon />}
              onClick={() => setShowList(!showList)}
              sx={{ minWidth: 'auto', px: 1 }}
            >
              목록
            </Button>

            <Button
              variant="outlined"
              size="small"
              startIcon={<DownloadIcon />}
              onClick={downloadDrawing}
              sx={{ minWidth: 'auto', px: 1 }}
            >
              다운로드
            </Button>
          </Box>
        </Box>

        {/* 캔버스 영역 */}
        <Box sx={{ 
          position: 'relative', 
          flex: 1, 
          overflow: 'hidden',
          width: '100%',
          height: '800px', // 고정 높이
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#f5f5f5'
        }}>
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            style={{
              cursor: currentTool === 'pen' ? 'crosshair' : 
                     currentTool === 'text' ? 'text' : 'default',
              display: 'block',
              width: '550px', // 고정 너비
              height: '1122px', // 고정 높이
              touchAction: 'none', // 터치 스크롤 방지
              border: '1px solid #444',
              backgroundColor: '#f8f9fa',
              imageRendering: 'pixelated' // 크기 고정
            }}
          />
          
          {/* 텍스트 입력 박스 */}
          {isTyping && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '8px',
                padding: '16px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                zIndex: 1000,
                minWidth: '300px'
              }}
            >
              <TextField
                fullWidth
                value={textInput}
                onChange={(e) => {
                  console.log('텍스트 입력:', e.target.value);
                  setTextInput(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    // 텍스트를 캔버스에 그리기
                    const canvas = canvasRef.current;
                    const ctx = canvas.getContext('2d');
                    
                    ctx.save();
                    ctx.font = `${brushSize * 4}px Arial`;
                    ctx.fillStyle = currentColor;
                    ctx.textBaseline = 'top';
                    
                    // 저장된 캔버스 좌표 사용
                    ctx.fillText(textInput, textPosition.canvasX, textPosition.canvasY);
                    ctx.restore();
                    
                    // 히스토리에 추가
                    const imageData = canvas.toDataURL();
                    setHistory(prev => [...prev.slice(0, historyIndex + 1), imageData]);
                    setHistoryIndex(prev => prev + 1);
                    
                    // 텍스트 입력 종료
                    setIsTyping(false);
                    setTextInput('');
                    setTextPosition(null);
                    setCurrentTool('pen');
                    
                    // 마커 제거를 위해 캔버스 즉시 다시 그리기
                    const canvasElement = canvasRef.current;
                    if (canvasElement) {
                      const ctx = canvasElement.getContext('2d');
                      if (history.length > 0 && historyIndex >= 0) {
                        const img = new Image();
                        img.onload = () => {
                          ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
                          drawNotebookBackground(ctx, canvasElement.width, canvasElement.height);
                          ctx.drawImage(img, 0, 0);
                        };
                        img.src = history[historyIndex];
                      }
                    }
                  } else if (e.key === 'Escape') {
                    // 텍스트 입력 취소
                    setIsTyping(false);
                    setTextInput('');
                    setTextPosition(null);
                    setCurrentTool('pen');
                  }
                }}
                onBlur={() => {
                  // 포커스를 잃으면 텍스트 입력 종료
                  if (textInput.trim() !== '') {
                    // 텍스트를 캔버스에 그리기
                    const canvas = canvasRef.current;
                    const ctx = canvas.getContext('2d');
                    
                    ctx.save();
                    ctx.font = `${brushSize * 4}px Arial`;
                    ctx.fillStyle = currentColor;
                    ctx.textBaseline = 'top';
                    
                    // 저장된 캔버스 좌표 사용
                    ctx.fillText(textInput, textPosition.canvasX, textPosition.canvasY);
                    ctx.restore();
                    
                    const imageData = canvas.toDataURL();
                    setHistory(prev => [...prev.slice(0, historyIndex + 1), imageData]);
                    setHistoryIndex(prev => prev + 1);
                  }
                  
                  setIsTyping(false);
                  setTextInput('');
                  setTextPosition(null);
                  setCurrentTool('pen');
                }}
                placeholder="텍스트를 입력하세요"
                variant="outlined"
                size="small"
                autoFocus
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: `${brushSize * 4}px`,
                    color: currentColor,
                    '& fieldset': {
                      border: 'none', // 테두리 제거
                    },
                    '&:hover fieldset': {
                      border: 'none',
                    },
                    '&.Mui-focused fieldset': {
                      border: 'none',
                    },
                  }
                }}
              />
              <Box sx={{ 
                mt: 1, 
                display: 'flex', 
                justifyContent: 'space-between',
                fontSize: '12px',
                color: '#666'
              }}>
                <span>Enter: 확인</span>
                <span>Escape: 취소</span>
              </Box>
            </Box>
          )}
        </Box>

        {/* 저장된 목록 */}
        {showList && (
          <Box
            sx={{
              position: 'absolute',
              top: 60,
              right: 10,
              width: 300,
              maxHeight: 400,
              backgroundColor: '#2d2d2d',
              border: '1px solid #555',
              borderRadius: 1,
              zIndex: 1000
            }}
          >
            <Typography variant="h6" sx={{ p: 2, color: '#fff' }}>
              저장된 목록
            </Typography>
            <List sx={{ maxHeight: 300, overflow: 'auto' }}>
              {savedDrawings.length === 0 ? (
                <ListItem>
                  <Typography sx={{ color: '#ccc' }}>저장된 목록이 없습니다</Typography>
                </ListItem>
              ) : (
                savedDrawings.map((drawing) => (
                  <ListItemButton
                    key={drawing.id}
                    onClick={() => loadDrawing(drawing)}
                    sx={{ color: '#fff' }}
                  >
                    <Typography variant="body2">
                      {new Date(drawing.timestamp?.toDate?.() || drawing.timestamp).toLocaleString()}
                    </Typography>
                  </ListItemButton>
                ))
              )}
            </List>
          </Box>
        )}
      </Box>

      {/* 리사이즈 핸들 */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: 30,
          height: 30,
          cursor: 'nw-resize',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid #666',
          borderRadius: '4px 0 0 0',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            borderColor: '#999'
          }
        }}
        onMouseDown={handleResizeStart}
        onTouchStart={handleResizeStart}
      >
        <Box
          sx={{
            position: 'absolute',
            bottom: 4,
            right: 4,
            width: 0,
            height: 0,
            borderLeft: '12px solid transparent',
            borderBottom: '12px solid #666',
            '&:hover': {
              borderBottom: '12px solid #999'
            }
          }}
        />
      </Box>

      <Snackbar
        open={alert.open}
        autoHideDuration={3000}
        onClose={() => setAlert({ ...alert, open: false })}
      >
        <Alert severity={alert.severity} onClose={() => setAlert({ ...alert, open: false })}>
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default IdeaPad;