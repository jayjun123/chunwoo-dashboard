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
  Image as ImageIcon,
  Straighten as LineIcon,
  RadioButtonUnchecked as CircleIcon,
  CropSquare as SquareIcon,
  ChangeHistory as TriangleIcon,
  StarBorder as StarIcon,
  Highlight as HighlighterIcon,
  List as ListIcon,
  PushPin as PinIcon,
  PushPinOutlined as PinOutlinedIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { storage, db } from '../firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, setDoc, getDoc, collection, query, orderBy, getDocs, deleteDoc, addDoc } from 'firebase/firestore';

const IdeaPad = ({ open, onClose, siteId, siteName, drawingId }) => {
  // CSS 애니메이션 추가
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% {
          transform: scale(1);
          opacity: 1;
        }
        50% {
          transform: scale(1.2);
          opacity: 0.7;
        }
        100% {
          transform: scale(1);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  // 기본 상태
  const [currentTool, setCurrentTool] = useState('pen');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [isHighlighter, setIsHighlighter] = useState(false);
  const [isTouchEvent, setIsTouchEvent] = useState(false);
  const [highlighterColor, setHighlighterColor] = useState('#FFFF00');
  const [pressureSensitivity, setPressureSensitivity] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const isDrawingRef = useRef(false);
  const lastEventTime = useRef(0);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [shapes, setShapes] = useState([]);
  const [lastPoint, setLastPoint] = useState(null);
  
  // 안전한 toDataURL 함수 (CORS 오류 방지)
  const safeToDataURL = useCallback((canvas) => {
    try {
      return canvas.toDataURL();
    } catch (error) {
      console.warn('toDataURL 실패, 기본값 사용:', error);
      // CORS 오류 시 기본 캔버스 데이터 반환
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.fillStyle = '#ffffff';
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      return tempCanvas.toDataURL();
    }
  }, []);
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
  const [isPinned, setIsPinned] = useState(false);

  // 간단한 그리기를 위한 상태 (필요시 추가)

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
      
      // 좌표 유효성 검사
      if (typeof clientX === 'number' && typeof clientY === 'number' && 
          !isNaN(clientX) && !isNaN(clientY)) {
        setDialogPosition({
          x: clientX - dragStart.x,
          y: clientY - dragStart.y
        });
      }
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
      
      // 좌표 유효성 검사
      if (typeof clientX === 'number' && typeof clientY === 'number' && 
          !isNaN(clientX) && !isNaN(clientY)) {
        const deltaX = clientX - resizeStart.x;
        const deltaY = clientY - resizeStart.y;
        
        setDialogSize({
          width: Math.max(400, resizeStart.width + deltaX),
          height: Math.max(300, resizeStart.height + deltaY)
        });
      }
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
  const drawNotebookBackground = useCallback((ctx, width, height, hideLines = false) => {
    // 안티앨리어싱 비활성화로 선명한 선 그리기
    ctx.imageSmoothingEnabled = false;
    
    // 배경색 (더 밝고 깔끔한 흰색)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // 텍스트 입력 중이 아닐 때만 라인 그리기
    if (!hideLines) {
      // 줄 그리기 (더 선명하고 예쁜 파란색)
      ctx.strokeStyle = '#87CEEB'; // 하늘색
      ctx.lineWidth = 1;
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
      
      const lineSpacing = 24; // 줄 간격을 조금 더 넓게
      for (let y = lineSpacing; y < height; y += lineSpacing) {
        // 정수 좌표로 정확히 그리기
        const exactY = Math.round(y);
        ctx.beginPath();
        ctx.moveTo(0, exactY);
        ctx.lineTo(width, exactY);
        ctx.stroke();
      }

      // 왼쪽 여백선 (노트북 스타일 빨간선) - 사용자 요청으로 제거
      // ctx.save();
      // ctx.strokeStyle = '#FF6B6B';
      // ctx.lineWidth = 2;
      // ctx.beginPath();
      // ctx.moveTo(60, 0);
      // ctx.lineTo(60, height);
      // ctx.stroke();
      // ctx.restore();

      // 상단 여백선 제거 (점 문제 해결)

      // 페이지 번호 영역 (우하단)
      ctx.fillStyle = '#F8F8F8';
      ctx.fillRect(width - 80, height - 30, 60, 20);
      
      // 페이지 번호 텍스트
      ctx.fillStyle = '#999999';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('1', width - 50, height - 15);
    }
  }, []);

  // 도형 그리기 함수
  const drawShape = useCallback((ctx, start, end, tool, color = currentColor, lineWidth = brushSize) => {
    // 현재 캔버스 상태를 보존하기 위해 새로운 경로만 시작
    ctx.save(); // 현재 상태 저장
    
    // 색상 검증 및 로깅
    const validColor = color || currentColor;
    console.log('drawShape 호출 - 색상:', validColor, '도구:', tool);
    ctx.strokeStyle = validColor;
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

  // 좌표 변환 (마우스와 터치 모두 지원, 아이패드 최적화)
  const getCanvasCoordinates = useCallback((e) => {
    try {
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

      // 좌표 유효성 검사
      if (typeof clientX !== 'number' || typeof clientY !== 'number' || 
          isNaN(clientX) || isNaN(clientY)) {
        console.warn('유효하지 않은 좌표:', { clientX, clientY });
        return { x: 0, y: 0 };
      }

      // 캔버스 내부 좌표로 변환 (고정 크기 기준)
      const x = (clientX - rect.left) * (550 / rect.width);
      const y = (clientY - rect.top) * (1122 / rect.height);

      // 좌표 유효성 검사
      const validX = Math.max(0, Math.min(550, x));
      const validY = Math.max(0, Math.min(1122, y));

      return { x: validX, y: validY };
    } catch (error) {
      console.warn('좌표 변환 중 오류:', error);
      return { x: 0, y: 0 };
    }
  }, []);

  // 간단한 그리기 함수들
  const startSimpleDrawing = useCallback((e) => {
    if (!e.isTrusted) return;
    
    // 지우개 사용 시 추가 이벤트 차단
    if (currentTool === 'eraser') {
      e.preventDefault();
      e.stopPropagation();
      if (e.stopImmediatePropagation) {
        e.stopImmediatePropagation();
      }
    }
    
    const { x, y } = getCanvasCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // 도구별 설정
    if (currentTool === 'pen') {
      // 시작점 저장
      setLastPoint({ x, y });
      
      if (isHighlighter) {
        // 형관펜 모드 - 연속적인 선을 위한 설정
        ctx.strokeStyle = highlighterColor;
        ctx.lineWidth = Math.max(brushSize * 2, 2); // 최소 2px
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = 0.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(x, y);
      } else {
        // 일반 펜 모드 - 연속적인 선을 위한 설정
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = Math.max(brushSize, 1); // 최소 1px
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(x, y);
      }
    } else if (currentTool === 'eraser') {
      // 지우개는 시작점에서도 개별적으로 지우기
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, brushSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    
    setIsDrawing(true);
    isDrawingRef.current = true;
    
    console.log('간단한 그리기 시작:', { x, y, tool: currentTool, isHighlighter, highlighterColor });
  }, [getCanvasCoordinates, currentColor, brushSize, currentTool, isHighlighter, highlighterColor]);

  const continueSimpleDrawing = useCallback((e) => {
    if (!isDrawingRef.current) return;
    
    // 지우개 사용 시 추가 이벤트 차단
    if (currentTool === 'eraser') {
      e.preventDefault();
      e.stopPropagation();
      if (e.stopImmediatePropagation) {
        e.stopImmediatePropagation();
      }
    }
    
    const { x, y } = getCanvasCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (currentTool === 'pen') {
      // 연속적인 선 그리기 (점선 방지)
      if (isHighlighter) {
        ctx.strokeStyle = highlighterColor;
        ctx.lineWidth = Math.max(brushSize * 2, 2);
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = 0.5;
      } else {
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = Math.max(brushSize, 1);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
      }
      
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // 연속적인 선을 위해 lineTo 사용
      ctx.lineTo(x, y);
      ctx.stroke();
      
      // 현재 점을 다음 그리기를 위한 이전 점으로 저장
      setLastPoint({ x, y });
    } else if (currentTool === 'eraser') {
      // 지우개는 각 점마다 개별적으로 지우기 (깜빡거림 방지)
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = brushSize * 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(x, y, brushSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    
    console.log('간단한 그리기 계속:', { x, y, tool: currentTool, isHighlighter, highlighterColor });
  }, [getCanvasCoordinates, currentTool, currentColor, brushSize, isHighlighter, highlighterColor, lastPoint]);

  const stopSimpleDrawing = useCallback(() => {
    setIsDrawing(false);
    isDrawingRef.current = false;
    setLastPoint(null); // 그리기 종료 시 이전 점 초기화
    console.log('간단한 그리기 종료');
  }, []);

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

  // 전역 터치 이벤트 핸들러
  const handleGlobalTouch = useCallback((e) => {
    // IDEA PAD 컨테이너 내부에서만 처리
    const ideapadContainer = document.querySelector('.ideapad-container');
    if (ideapadContainer && ideapadContainer.contains(e.target)) {
      // 캔버스 영역이 아닌 경우에만 스크롤 허용
      if (!e.target.closest('canvas')) {
        // 스크롤 허용
        return;
      } else {
        // 캔버스 영역에서는 두 손가락 터치인 경우에만 스크롤 허용
        if (e.touches && e.touches.length > 1) {
          console.log('전역 이벤트: 두 손가락 터치 감지 - 스크롤 허용');
          return; // 스크롤 허용
        } else {
          // 한 손가락 터치인 경우 스크롤 차단
          e.preventDefault();
        }
      }
    }
  }, []);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      // 모든 이벤트 리스너 정리
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleMouseMove);
      document.removeEventListener('touchend', handleMouseUp);
      document.removeEventListener('touchstart', handleGlobalTouch);
      document.removeEventListener('touchmove', handleGlobalTouch);
      document.removeEventListener('touchend', handleGlobalTouch);
    };
  }, [handleMouseMove, handleMouseUp, handleGlobalTouch]);

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
    drawNotebookBackground(ctx, fixedWidth, fixedHeight, false); // 일반 그리기 모드에서는 라인 표시

    // 히스토리에 초기 상태 저장
    const imageData = safeToDataURL(canvas);
    setHistory([imageData]);
    setHistoryIndex(0);
  }, [drawNotebookBackground]);


  // 필압 감지 함수 (아이패드 최적화)
  const getPressure = useCallback((e) => {
    if (!pressureSensitivity) return 1;
    
    try {
      // 터치 이벤트에서 필압 감지
      if (e.touches && e.touches.length > 0) {
        const touch = e.touches[0];
        
        // iOS Safari에서 force 속성 지원 (아이패드 Apple Pencil)
        if (touch.force !== undefined && touch.force > 0) {
          // Apple Pencil의 경우 더 정확한 필압 감지
          const pressure = Math.max(0.1, Math.min(2, touch.force));
          console.log('Apple Pencil 필압 감지:', pressure);
          return pressure;
        }
        
        // radiusX, radiusY로 필압 추정 (일반 터치)
        if (touch.radiusX !== undefined && touch.radiusY !== undefined) {
          const radius = Math.min(touch.radiusX, touch.radiusY);
          const pressure = Math.max(0.1, Math.min(2, 1 - (radius / 50)));
          console.log('터치 반경 기반 필압 추정:', pressure);
          return pressure;
        }
        
        // 아이패드에서 필압 정보가 없는 경우 기본값
        console.log('필압 정보 없음, 기본값 사용');
        return 1;
      }
      
      // changedTouches에서도 확인 (터치 종료 시)
      if (e.changedTouches && e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        if (touch.force !== undefined && touch.force > 0) {
          return Math.max(0.1, Math.min(2, touch.force));
        }
      }
      
      // 마우스 이벤트에서는 기본값
      return 1;
    } catch (error) {
      console.warn('필압 감지 중 오류:', error);
      return 1; // 오류 시 기본값 반환
    }
  }, [pressureSensitivity]);


  // 간단한 그리기 시작
  const startDrawing = useCallback((e) => {
    // 두 손가락 터치인 경우 핀치 줌 허용
    if (e.touches && e.touches.length > 1) {
      // 핀치 줌 시작
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      // 초기 거리 저장 (핀치 줌 구현을 위해)
      e.initialDistance = distance;
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    if (currentTool === 'pen' || currentTool === 'eraser') {
      startSimpleDrawing(e);
    } else if (['line', 'rectangle', 'circle', 'triangle', 'star'].includes(currentTool)) {
      const { x, y } = getCanvasCoordinates(e);
      setStartPoint({ x, y });
      setIsDrawing(true);
      isDrawingRef.current = true;
    }
  }, [currentTool, startSimpleDrawing, getCanvasCoordinates]);

  // 간단한 그리기 계속
  const draw = useCallback((e) => {
    if (!isDrawingRef.current) return;
    
    // 두 손가락 터치인 경우 핀치 줌 처리
    if (e.touches && e.touches.length > 1) {
      // 핀치 줌 중
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      if (e.initialDistance) {
        const scale = distance / e.initialDistance;
        // 여기서 캔버스 스케일링 로직을 구현할 수 있습니다
        console.log('핀치 줌 스케일:', scale);
      }
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    if (currentTool === 'pen' || currentTool === 'eraser') {
      continueSimpleDrawing(e);
    } else if (['line', 'rectangle', 'circle', 'triangle', 'star'].includes(currentTool) && startPoint) {
      // 도형 미리보기
      const { x, y } = getCanvasCoordinates(e);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      

      if (history.length > 0 && historyIndex >= 0) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          
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
  }, [currentTool, continueSimpleDrawing, getCanvasCoordinates, startPoint, history, historyIndex, drawShape, currentColor, brushSize]);


  // drawingId가 있을 때 특정 아이디어 불러오기
  useEffect(() => {
    if (open && drawingId) {
      console.log('🔍 drawingId로 아이디어 불러오기:', drawingId);
      // loadSpecificDrawing 함수가 정의된 후에 호출
      const loadDrawing = async () => {
        try {
          console.log('🔍 특정 아이디어 불러오기:', drawingId);
          
          const docRef = doc(db, 'notepad_drawings', drawingId);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            console.log('🔍 불러온 아이디어 데이터:', data);
            
        // 간단한 방법으로 이미지 로드 (CORS 문제 무시)
        const img = new Image();
        
        img.onload = () => {
          const canvas = canvasRef.current;
          if (!canvas) {
            console.error('캔버스가 존재하지 않습니다.');
            return;
          }
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            console.error('캔버스 컨텍스트를 가져올 수 없습니다.');
            return;
          }
          
          // 캔버스 초기화
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // 이미지 그리기
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // 히스토리는 이미지 로드 후에만 설정
          setHistory([data.url]); // 원본 URL을 히스토리에 저장
          setHistoryIndex(0);
          
          console.log('🔍 아이디어가 캔버스에 로드됨');
        };
        
        img.onerror = (error) => {
          console.error('이미지 로드 실패:', error);
          alert('이미지 로드에 실패했습니다. 네트워크 연결을 확인해주세요.');
        };
        
        img.src = data.url;
            
            // 현장 정보 설정
            if (data.siteId && data.siteName) {
              setSelectedSiteId(data.siteId);
              setSelectedSiteName(data.siteName);
              setSearchQuery(data.siteName);
            }
          } else {
            console.log('🔍 아이디어를 찾을 수 없음');
          }
        } catch (error) {
          console.error('특정 아이디어 불러오기 실패:', error);
        }
      };
      
      loadDrawing();
    }
  }, [open, drawingId]);



  // 그리기 종료 (아이패드 최적화 - 두 손가락 스크롤 지원)
  // 간단한 그리기 종료
  const stopDrawing = useCallback((e) => {
    if (!isDrawingRef.current) return;
    
    // 두 손가락 터치인 경우 스크롤 허용
    if (e && e.touches && e.touches.length > 1) return;
    
    e?.preventDefault();
    e?.stopPropagation();
    
    if (currentTool === 'pen' || currentTool === 'eraser') {
      stopSimpleDrawing();
      
      // 히스토리에 저장
      const canvas = canvasRef.current;
      if (canvas) {
        const imageData = safeToDataURL(canvas);
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(imageData);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
      }
    } else if (['line', 'rectangle', 'circle', 'triangle', 'star'].includes(currentTool) && startPoint) {
      // 도형 그리기 완료
      const { x, y } = getCanvasCoordinates(e);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (history.length > 0 && historyIndex >= 0) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          
          drawShape(ctx, startPoint, { x, y }, currentTool);
          addShape(startPoint, { x, y }, currentTool);
          setStartPoint(null);
          
          const newImageData = safeToDataURL(canvas);
          const newHistory = history.slice(0, historyIndex + 1);
          newHistory.push(newImageData);
          setHistory(newHistory);
          setHistoryIndex(newHistory.length - 1);
        };
        img.src = history[historyIndex];
      }
      
      // 도형 그리기 완료 후 상태 리셋
      setIsDrawing(false);
      isDrawingRef.current = false;
    }
  }, [currentTool, stopSimpleDrawing, history, historyIndex, startPoint, getCanvasCoordinates, addShape, drawShape]);

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
        drawNotebookBackground(ctx, rect.width, rect.height, false); // 일반 그리기 모드에서는 라인 표시
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
        drawNotebookBackground(ctx, rect.width, rect.height, false); // 일반 그리기 모드에서는 라인 표시
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
    
    drawNotebookBackground(ctx, rect.width, rect.height, false); // 일반 그리기 모드에서는 라인 표시
    
    const imageData = safeToDataURL(canvas);
    setHistory([imageData]);
    setHistoryIndex(0);
    setShapes([]);
  }, [drawNotebookBackground]);

  // 아이디어가 저장된 현장 확인
  const checkSitesWithIdeas = useCallback(async (sites) => {
    try {
      const ideasQuery = query(collection(db, 'notepad_drawings'));
      const ideasSnapshot = await getDocs(ideasQuery);
      const sitesWithIdeas = new Set();
      
      console.log('🔍 모든 저장된 아이디어 확인 중...');
      
      ideasSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('🔍 저장된 아이디어 데이터:', {
          id: doc.id,
          siteName: data.siteName,
          displayName: data.displayName,
          isAutoSave: data.isAutoSave
        });
        
        if (data.siteName && !data.isAutoSave) {
          sitesWithIdeas.add(data.siteName);
        }
      });
      
      console.log('🔍 아이디어가 저장된 현장들:', Array.from(sitesWithIdeas));
      console.log('🔍 현재 현장 목록:', sites.map(site => site.name));
      
      // 현장 목록에 아이디어 표시 정보 추가
      const updatedSites = sites.map(site => {
        // 정확한 일치 확인
        let hasIdeas = sitesWithIdeas.has(site.name);
        
        // 정확한 일치만 허용 (부분 일치 제거)
        // if (!hasIdeas) {
        //   for (const savedSiteName of sitesWithIdeas) {
        //     // 더 엄격한 부분 일치: 현장명의 주요 부분이 일치하는지 확인
        //     const siteNameWords = site.name.split(' ').filter(word => word.length > 2);
        //     const savedNameWords = savedSiteName.split(' ').filter(word => word.length > 2);
        //     
        //     // 주요 단어들이 일치하는지 확인
        //     const hasCommonWords = siteNameWords.some(word => 
        //       savedNameWords.some(savedWord => 
        //         word.includes(savedWord) || savedWord.includes(word)
        //       )
        //     );
        //     
        //     if (hasCommonWords) {
        //       hasIdeas = true;
        //       console.log(`🔍 부분 일치 발견: "${site.name}" <-> "${savedSiteName}"`);
        //       break;
        //     }
        //   }
        // }
        
        console.log(`🔍 현장 "${site.name}" 아이디어 여부:`, hasIdeas);
        return {
          ...site,
          hasIdeas: hasIdeas
        };
      });
      
      setAllSites(updatedSites);
      setFilteredSites(updatedSites);
    } catch (error) {
      console.error('아이디어 저장 현장 확인 실패:', error);
    }
  }, []);

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
      
      // 각 현장의 아이디어 저장 상태 확인
      checkSitesWithIdeas(sitesList);
    } catch (error) {
      console.error('현장 목록 로드 실패:', error);
    }
  }, [checkSitesWithIdeas]);

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
      
      console.log('🔍 저장된 그림 로드 중, 선택된 현장 ID:', selectedSiteId);
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('🔍 저장된 그림 데이터:', {
          id: doc.id,
          siteId: data.siteId,
          siteName: data.siteName,
          displayName: data.displayName,
          selectedSiteId: selectedSiteId,
          matches: data.siteId === selectedSiteId
        });
        
        if (data.siteId === selectedSiteId) {
          drawings.push({
            id: doc.id,
            ...data
          });
        }
      });
      
      console.log('🔍 로드된 그림 개수:', drawings.length);
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
      const timestamp = new Date();
      const siteName = selectedSiteName || 'CHUNWOO';
      const fileName = `${siteName}_${timestamp.getTime()}.png`;
      const storageRef = ref(storage, `notepad_drawings/${fileName}`);
      
      canvas.toBlob(async (blob) => {
        await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(storageRef);
        
        await setDoc(doc(db, 'notepad_drawings', fileName), {
          url: downloadURL,
          siteId: selectedSiteId,
          siteName: siteName,
          displayName: `${siteName} - ${timestamp.toLocaleDateString()} ${timestamp.toLocaleTimeString()}`,
          timestamp: timestamp,
          shapes: shapes
        });
        
        console.log('🔍 아이디어패드 저장 완료:', {
          fileName: fileName,
          siteName: siteName,
          siteId: selectedSiteId,
          displayName: `${siteName} - ${timestamp.toLocaleDateString()} ${timestamp.toLocaleTimeString()}`
        });
        
        setAlert({ open: true, message: `${siteName} 현장의 아이디어가 저장되었습니다.`, severity: 'success' });
        loadSavedDrawings();
        
        // 현장 목록을 다시 로드하여 아이디어 표시 업데이트
        console.log('🔍 저장 완료 후 현장 목록 다시 로드 중...');
        loadSites();
      });
    } catch (error) {
      console.error('그림 저장 실패:', error);
      setAlert({ open: true, message: '그림 저장에 실패했습니다.', severity: 'error' });
    }
  }, [selectedSiteId, selectedSiteName, shapes, loadSavedDrawings, loadSites]);

  // 그림 삭제
  const deleteDrawing = useCallback(async (drawingId, fileName) => {
    try {
      // Firestore에서 문서 삭제
      await deleteDoc(doc(db, 'notepad_drawings', drawingId));
      
      // Storage에서 파일 삭제
      const storageRef = ref(storage, `notepad_drawings/${fileName}`);
      await deleteObject(storageRef);
      
      setAlert({ open: true, message: '그림이 삭제되었습니다.', severity: 'success' });
      loadSavedDrawings();
    } catch (error) {
      console.error('그림 삭제 실패:', error);
      setAlert({ open: true, message: '그림 삭제에 실패했습니다.', severity: 'error' });
    }
  }, [loadSavedDrawings]);

  // 그림 로드
  const loadDrawing = useCallback(async (drawing) => {
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      const img = new Image();
      
      img.onload = () => {
        ctx.clearRect(0, 0, rect.width, rect.height);
        drawNotebookBackground(ctx, rect.width, rect.height, false); // 기존 그림 로드 시 라인 표시
        ctx.drawImage(img, 0, 0);
        
        // 기존 도형들도 다시 그리기 (저장된 도형 정보가 있는 경우)
        if (drawing.shapes && drawing.shapes.length > 0) {
          drawing.shapes.forEach(shape => {
            console.log('저장된 도형 로드 - 색상:', shape.color, '타입:', shape.type);
            drawShape(ctx, shape.start, shape.end, shape.type, shape.color, shape.lineWidth);
          });
        }
        
        const imageData = safeToDataURL(canvas);
        setHistory([imageData]);
        setHistoryIndex(0); // 히스토리 배열의 첫 번째(유일한) 요소의 인덱스
        setShapes(drawing.shapes || []);
      };
      
      img.src = drawing.url;
      setShowList(false);
    } catch (error) {
      console.error('그림 로드 실패:', error);
      setAlert({ open: true, message: '그림을 불러오는데 실패했습니다.', severity: 'error' });
    }
  }, [drawNotebookBackground, drawShape]);

  // 다운로드
  const downloadDrawing = useCallback(() => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `idea_pad_${Date.now()}.png`;
    link.href = safeToDataURL(canvas);
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
      
      // 저장된 목록 팝업 외부 클릭
      if (showList && !event.target.closest('.saved-list-container')) {
        setShowList(false);
      }
      
      // 아이디어패드가 고정되지 않았고, 아이디어패드 외부 클릭 시
      if (!isPinned && open && !event.target.closest('.ideapad-container')) {
        
        // 자동 저장 후 닫기
        const autoSaveAndClose = async () => {
          try {
            const canvas = canvasRef.current;
            if (canvas && history.length > 1) { // 초기 상태가 아닌 경우만 저장
              const timestamp = new Date();
              const siteName = selectedSiteName || 'CHUNWOO';
              const fileName = `${siteName}_autosave_${timestamp.getTime()}.png`;
              const storageRef = ref(storage, `notepad_drawings/${fileName}`);
              const canvasDataURL = safeToDataURL(canvas);
              const response = await fetch(canvasDataURL);
              const blob = await response.blob();
              
              await uploadBytes(storageRef, blob);
              const downloadURL = await getDownloadURL(storageRef);
              
              await addDoc(collection(db, 'notepad_drawings'), {
                siteId: selectedSiteId,
                siteName: siteName,
                displayName: `${siteName} - 자동저장 ${timestamp.toLocaleDateString()} ${timestamp.toLocaleTimeString()}`,
                fileName,
                downloadURL,
                timestamp: timestamp,
                isAutoSave: true
              });
              
              console.log(`${siteName} 현장 자동 저장 완료`);
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
  }, [showSiteDropdown, isPinned, open, selectedSiteId, selectedSiteName, onClose]);

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

  // 아이패드/터치 디바이스 최적화 (개선된 버전)
  useEffect(() => {
    if (open) {
      try {
        // 터치 디바이스 감지
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isIPad = /iPad/.test(navigator.userAgent) || 
                      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        
        console.log('디바이스 정보:', { isTouchDevice, isIOS, isIPad });
        
        if (isTouchDevice) {
          // 터치 디바이스에서 더 부드러운 그리기를 위한 설정
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            
            // 이미지 스무딩 설정
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // 아이패드 특별 설정
            if (isIPad) {
              // Apple Pencil 지원을 위한 추가 설정
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
              
              // 터치 이벤트 최적화
              canvas.style.touchAction = 'none';
              canvas.style.webkitTouchCallout = 'none';
              canvas.style.webkitUserSelect = 'none';
              canvas.style.userSelect = 'none';
              
              console.log('아이패드 최적화 설정 적용 완료');
            }
            
            // 일반 터치 디바이스 설정
            canvas.style.touchAction = 'none';
            canvas.style.webkitUserSelect = 'none';
            canvas.style.userSelect = 'none';
            
            console.log('터치 디바이스 최적화 설정 적용 완료');
          }
        }

        // 전역 터치 이벤트 리스너 추가 (두 손가락 스크롤 지원)

        // 전역 이벤트 리스너 등록
        document.addEventListener('touchstart', handleGlobalTouch, { passive: false });
        document.addEventListener('touchmove', handleGlobalTouch, { passive: false });
        document.addEventListener('touchend', handleGlobalTouch, { passive: false });

        // 정리 함수
        return () => {
          document.removeEventListener('touchstart', handleGlobalTouch);
          document.removeEventListener('touchmove', handleGlobalTouch);
          document.removeEventListener('touchend', handleGlobalTouch);
        };
      } catch (error) {
        console.warn('터치 디바이스 최적화 설정 중 오류:', error);
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
        flexDirection: 'column',
        // 터치 스크롤 제어 (두 손가락 스크롤 지원)
        touchAction: 'pan-y pinch-zoom', // 세로 스크롤과 핀치 줌 허용
        webkitTouchCallout: 'none',
        webkitUserSelect: 'none',
        userSelect: 'none',
        webkitOverflowScrolling: 'touch'
      }}
      onTouchStart={(e) => {
        // 캔버스 영역이 아닌 경우에만 스크롤 허용
        if (!e.target.closest('canvas')) {
          // 스크롤 허용
        } else {
          // 캔버스 영역에서는 두 손가락 터치인 경우에만 스크롤 허용
          if (e.touches && e.touches.length > 1) {
            // 스크롤 허용
          } else {
            e.preventDefault();
          }
        }
      }}
      onTouchMove={(e) => {
        // 캔버스 영역이 아닌 경우에만 스크롤 허용
        if (!e.target.closest('canvas')) {
          // 스크롤 허용
        } else {
          // 캔버스 영역에서는 두 손가락 터치인 경우에만 스크롤 허용
          if (e.touches && e.touches.length > 1) {
            // 스크롤 허용
          } else {
            e.preventDefault();
          }
        }
      }}
      onTouchEnd={(e) => {
        // 캔버스 영역이 아닌 경우에만 스크롤 허용
        if (!e.target.closest('canvas')) {
          // 스크롤 허용
        } else {
          // 캔버스 영역에서는 두 손가락 터치인 경우에만 스크롤 허용
          if (e.touches && e.touches.length > 1) {
            // 스크롤 허용
          } else {
            e.preventDefault();
          }
        }
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
                  '&::-webkit-scrollbar': {
                    display: 'none'
                  },
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
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
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>{highlightText(site.name, searchQuery)}</Box>
                        {site.hasIdeas && (
                          <EditNoteIcon
                            sx={{
                              fontSize: 16,
                              color: '#FFD700',
                              marginLeft: '8px'
                            }}
                          />
                        )}
                      </Box>
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
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
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
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


          {/* 도형 버튼들 */}
          <Tooltip title="직선">
            <IconButton
              color={currentTool === 'line' ? 'primary' : 'default'}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
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
                  onClick={() => {
                    console.log('색상 변경:', color);
                    setCurrentColor(color);
                  }}
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

        {/* 캔버스 영역 - 스크롤 가능하도록 개선 */}
        <Box 
          sx={{ 
            position: 'relative', 
            flex: 1, 
            overflow: 'auto', // 스크롤 허용
            '&::-webkit-scrollbar': {
              display: 'none'
            },
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            width: '100%',
            height: '100%', // 전체 높이 사용
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start', // 상단 정렬로 변경
            backgroundColor: '#f5f5f5',
            padding: '20px', // 여백 추가
            // 터치 스크롤 제어 (두 손가락 스크롤 지원)
            touchAction: 'pan-y pinch-zoom', // 세로 스크롤과 핀치 줌 허용
            webkitTouchCallout: 'none',
            webkitUserSelect: 'none',
            userSelect: 'none',
            webkitOverflowScrolling: 'touch'
          }}
          onTouchStart={(e) => {
            // 캔버스 영역이 아닌 경우에만 스크롤 허용
            if (!e.target.closest('canvas')) {
              // 스크롤 허용
            } else {
              // 캔버스 영역에서는 두 손가락 터치인 경우에만 스크롤 허용
              if (e.touches && e.touches.length > 1) {
                // 스크롤 허용
              } else {
                e.preventDefault();
              }
            }
          }}
          onTouchMove={(e) => {
            // 캔버스 영역이 아닌 경우에만 스크롤 허용
            if (!e.target.closest('canvas')) {
              // 스크롤 허용
            } else {
              // 캔버스 영역에서는 두 손가락 터치인 경우에만 스크롤 허용
              if (e.touches && e.touches.length > 1) {
                // 스크롤 허용
              } else {
                e.preventDefault();
              }
            }
          }}
          onTouchEnd={(e) => {
            // 캔버스 영역이 아닌 경우에만 스크롤 허용
            if (!e.target.closest('canvas')) {
              // 스크롤 허용
            } else {
              // 캔버스 영역에서는 두 손가락 터치인 경우에만 스크롤 허용
              if (e.touches && e.touches.length > 1) {
                // 스크롤 허용
              } else {
                e.preventDefault();
              }
            }
          }}
        >
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            onContextMenu={(e) => e.preventDefault()}
            style={{
              cursor: currentTool === 'pen' ? 'crosshair' : 
                     currentTool === 'eraser' ? 'crosshair' :
                     currentTool === 'text' ? 'text' : 'default',
              display: 'block',
              width: '550px', // 고정 너비
              height: '1122px', // 고정 높이
              touchAction: 'pan-y pinch-zoom', // 두 손가락 스크롤과 핀치 줌 허용
              border: '1px solid #444',
              backgroundColor: '#f8f9fa',
              imageRendering: 'pixelated', // 크기 고정
              // 아이패드 최적화 추가 스타일
              webkitTouchCallout: 'none',
              webkitUserSelect: 'none',
              userSelect: 'none',
              webkitTapHighlightColor: 'transparent',
              // 터치 이벤트 최적화
              pointerEvents: 'auto',
              // Apple Pencil 지원
              webkitAppearance: 'none',
              appearance: 'none',
              // 하단 접근을 위한 추가 스타일
              marginBottom: '40px', // 하단 여백 추가
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)' // 그림자 추가로 구분
            }}
          />
          
        </Box>

        {/* 저장된 목록 */}
        {showList && (
          <Box
            className="saved-list-container"
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
            <List sx={{ 
              maxHeight: 300, 
              overflow: 'auto',
              '&::-webkit-scrollbar': {
                display: 'none'
              },
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}>
              {savedDrawings.length === 0 ? (
                <ListItem>
                  <Typography sx={{ color: '#ccc' }}>저장된 목록이 없습니다</Typography>
                </ListItem>
              ) : (
                savedDrawings.map((drawing) => (
                  <ListItem
                    key={drawing.id}
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      px: 2,
                      py: 1,
                      '&:hover': {
                        backgroundColor: '#444'
                      }
                    }}
                  >
                    <ListItemButton
                      onClick={() => loadDrawing(drawing)}
                      sx={{ 
                        color: '#fff',
                        flex: 1,
                        textAlign: 'left'
                      }}
                    >
                      <Typography variant="body2">
                        {drawing.displayName || `${drawing.siteName || 'CHUNWOO'} - ${new Date(drawing.timestamp?.toDate?.() || drawing.timestamp).toLocaleString()}`}
                        {drawing.isAutoSave && ' (자동저장)'}
                      </Typography>
                    </ListItemButton>
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDrawing(drawing.id, drawing.fileName || drawing.id);
                      }}
                      sx={{ 
                        color: '#ff6b6b',
                        ml: 1,
                        '&:hover': {
                          backgroundColor: 'rgba(255, 107, 107, 0.1)'
                        }
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItem>
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
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{
          '& .MuiSnackbarContent-root': {
            fontSize: '16px',
            fontWeight: 'bold'
          }
        }}
      >
        <Alert 
          severity={alert.severity} 
          onClose={() => setAlert({ ...alert, open: false })}
          sx={{
            fontSize: '16px',
            fontWeight: 'bold',
            minWidth: '300px'
          }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default IdeaPad;