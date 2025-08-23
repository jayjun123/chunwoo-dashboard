import React, { useEffect, useState } from 'react';
import { Box, Grid, Paper, Typography, TextField, Chip, Divider, Button, useTheme, useMediaQuery, IconButton, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SchoolIcon from '@mui/icons-material/School';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import DeleteIcon from '@mui/icons-material/Delete';
import { db } from '../../firebase';
import { collection, query, getDocs, deleteDoc, doc, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const icons = {
  inspection: <AssignmentTurnedInIcon sx={{ color: '#4ade80', mr: 0.5 }} fontSize="small" />,
  accident: <WarningAmberIcon sx={{ color: '#f87171', mr: 0.5 }} fontSize="small" />,
  education: <SchoolIcon sx={{ color: '#60a5fa', mr: 0.5 }} fontSize="small" />,
  cost: <MonetizationOnIcon sx={{ color: '#facc15', mr: 0.5 }} fontSize="small" />,
};

const statusColor = {
  완료: '#4ade80',
  진행중: '#facc15',
  예정: '#60a5fa',
};

function SafetyOverviewCards() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [search, setSearch] = useState('');
  const [siteData, setSiteData] = useState([]);
  const [inputs, setInputs] = useState({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState(null);

  const navigate = useNavigate();

  // 삭제 확인 다이얼로그 열기
  const handleDeleteClick = (siteName) => {
    setSiteToDelete(siteName);
    setDeleteDialogOpen(true);
  };

  // 삭제 실행
  const handleDeleteConfirm = async () => {
    if (!siteToDelete) return;
    
    try {
      console.log(`${siteToDelete} 현장의 안전관리 데이터 삭제 시작...`);
      
      // 각 컬렉션에서 해당 현장의 데이터 삭제
      const collections = ['safety_inspections', 'safety_accidents', 'safety_education', 'safety_costs'];
      
      for (const collectionName of collections) {
        const q = query(collection(db, collectionName), where('siteName', '==', siteToDelete));
        const snapshot = await getDocs(q);
        
        console.log(`${collectionName}에서 ${snapshot.docs.length}개 문서 삭제`);
        
        // 각 문서 삭제
        for (const docSnapshot of snapshot.docs) {
          await deleteDoc(doc(db, collectionName, docSnapshot.id));
        }
      }
      
      console.log(`${siteToDelete} 현장의 안전관리 데이터 삭제 완료`);
      
      // 데이터 다시 로드
      fetchAll();
      
      setDeleteDialogOpen(false);
      setSiteToDelete(null);
      
      // 성공 메시지 (간단한 alert 사용)
      alert(`${siteToDelete} 현장의 안전관리 데이터가 삭제되었습니다.`);
      
    } catch (error) {
      console.error('삭제 중 오류 발생:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  // 삭제 취소
  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setSiteToDelete(null);
  };

  // 데이터 로드 함수
  const fetchAll = async () => {
    // 4개 컬렉션 + sites에서 siteId→siteName 매핑
    const [ins, acc, edu, cost, sitesSnap] = await Promise.all([
      getDocs(query(collection(db, 'safety_inspections'))),
      getDocs(query(collection(db, 'safety_accidents'))),
      getDocs(query(collection(db, 'safety_education'))),
      getDocs(query(collection(db, 'safety_costs'))),
      getDocs(query(collection(db, 'sites'))),
    ]);
      const sitesMap = {};
      sitesSnap.docs.forEach(doc => {
        const d = doc.data();
        
        // 멕시카나 현장 특별 확인 및 제외
        if (d.name && d.name.includes('멕시카나')) {
          console.log(`🔍 멕시카나 현장 발견 및 제외:`, d);
          return; // 멕시카나 현장은 제외
        }
        
        // 공사기간이 끝났는지 확인
        if (d.endDate) {
          const today = new Date();
          let endDate;
          
          // endDate 형식 처리
          if (typeof d.endDate === 'string') {
            if (d.endDate.includes('-')) {
              endDate = new Date(d.endDate + 'T00:00:00');
            } else if (d.endDate.includes('/')) {
              endDate = new Date(d.endDate + 'T00:00:00');
            } else if (d.endDate.includes('.')) {
              // "8.15" 또는 "2025.08.15" 형식 처리
              const parts = d.endDate.split('.');
              if (parts.length === 2) {
                // "8.15" 형식
                const month = parseInt(parts[0]) - 1; // 월은 0부터 시작
                const day = parseInt(parts[1]);
                const currentYear = new Date().getFullYear();
                endDate = new Date(currentYear, month, day);
              } else if (parts.length === 3) {
                // "2025.08.15" 형식
                const year = parseInt(parts[0]);
                const month = parseInt(parts[1]) - 1; // 월은 0부터 시작
                const day = parseInt(parts[2]);
                endDate = new Date(year, month, day);
              } else {
                endDate = new Date(d.endDate + 'T00:00:00');
              }
            } else if (d.endDate.length === 8) {
              const year = d.endDate.substring(0, 4);
              const month = d.endDate.substring(4, 6);
              const day = d.endDate.substring(6, 8);
              endDate = new Date(`${year}-${month}-${day}T00:00:00`);
            } else {
              endDate = new Date(d.endDate + 'T00:00:00');
            }
          } else if (d.endDate instanceof Date) {
            endDate = d.endDate;
          } else {
            endDate = d.endDate.toDate ? d.endDate.toDate() : new Date(d.endDate);
          }
          
          // 날짜 비교를 위해 시간을 제거하고 날짜만 비교
          const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
          
          // 공사기간이 끝난 현장은 제외
          if (todayDate > endDateOnly) {
            console.log(`🔍 안전관리 카드 - ${d.name}: 공사기간 종료 (${d.endDate}) -> 제외`);
            return;
          } else {
            console.log(`🔍 안전관리 카드 - ${d.name}: 공사기간 진행중 (${d.endDate}) -> 포함`);
          }
        }
        
        sitesMap[doc.id] = d.name;
      });
      // siteName이 없으면 siteId로 매핑
      function getSiteName(d) {
        return d.siteName || sitesMap[d.siteId] || d.siteId || '';
      }
             // 공사기간이 끝나지 않은 현장만 포함하는 Set 생성
       const activeSiteNames = new Set(Object.values(sitesMap));
       
       const allSites = new Set([
         ...ins.docs.map(d => getSiteName(d.data())),
         ...acc.docs.map(d => getSiteName(d.data())),
         ...edu.docs.map(d => getSiteName(d.data())),
         ...cost.docs.map(d => getSiteName(d.data())),
       ].filter(Boolean).filter(siteName => {
         // 멕시카나 현장 제외
         if (siteName.includes('멕시카나')) {
           console.log(`🔍 안전관리 카드 - 멕시카나 현장 제외: ${siteName}`);
           return false;
         }
         // 공사기간이 끝나지 않은 현장만 포함
         return activeSiteNames.has(siteName);
       }));
      const arr = Array.from(allSites);
      const siteArr = arr.length > 0 ? arr : ['등록된 현장 없음'];
      const result = siteArr.map(siteName => {
        const inspections = ins.docs.map(d => d.data()).filter(d => getSiteName(d) === siteName);
        const accidents = acc.docs.map(d => d.data()).filter(d => getSiteName(d) === siteName);
        const educations = edu.docs.map(d => d.data()).filter(d => getSiteName(d) === siteName);
        const costs = cost.docs.map(d => d.data()).filter(d => getSiteName(d) === siteName);
        return {
          siteName,
          inspection: {
            count: inspections.length || 0,
            last: inspections[0]?.title || '',
            status: inspections[0]?.status || '',
          },
          accident: {
            count: accidents.length || 0,
            last: accidents[0]?.title || '',
            status: accidents[0]?.status || '',
          },
          education: {
            count: educations.length || 0,
            last: educations[0]?.title || '',
            status: educations[0]?.status || '',
          },
          cost: {
            total: costs.reduce((sum, c) => sum + (Number(c.amount) || 0), 0) || 0,
            last: costs[0]?.note || ''
          },
        };
      });
      setSiteData(result);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // 검색 필터
  const filtered = siteData.filter(site =>
    site.siteName.toLowerCase().includes(search.toLowerCase()) ||
    site.inspection.last.toLowerCase().includes(search.toLowerCase()) ||
    site.accident.last.toLowerCase().includes(search.toLowerCase()) ||
    site.education.last.toLowerCase().includes(search.toLowerCase()) ||
    site.cost.last.toLowerCase().includes(search.toLowerCase())
  );

  // PDF 다운로드 함수
  const handleDownloadPDF = async () => {
    try {
      // 임시로 색상을 반전시킨 카드들을 생성
      const originalCards = document.querySelectorAll('[data-testid="safety-cards-container"] .MuiPaper-root');
      const originalStyles = [];
      
      // 원본 스타일 저장 및 색상 반전 적용
      originalCards.forEach((card, index) => {
        originalStyles[index] = {
          backgroundColor: card.style.backgroundColor,
          color: card.style.color,
          border: card.style.border
        };
        
        // 카드 배경을 흰색으로, 텍스트를 검은색으로 변경
        card.style.backgroundColor = '#ffffff';
        card.style.color = '#000000';
        card.style.border = '1px solid #000000';
        
        // 내부 모든 요소들의 색상과 배경 변경
        const allElements = card.querySelectorAll('*');
        allElements.forEach(element => {
          // 텍스트 색상을 검은색으로
          if (element.style && element.style.color) {
            element.style.color = '#000000';
          }
          
          // Chip 요소들의 배경을 하얀색으로, 테두리를 검은색으로
          if (element.classList && element.classList.contains('MuiChip-root')) {
            element.style.backgroundColor = '#ffffff';
            element.style.border = '1px solid #000000';
            element.style.color = '#000000';
          }
          
          // Typography 요소들의 색상을 검은색으로
          if (element.classList && element.classList.contains('MuiTypography-root')) {
            element.style.color = '#000000';
          }
          
          // Divider 색상을 검은색으로
          if (element.classList && element.classList.contains('MuiDivider-root')) {
            element.style.backgroundColor = '#000000';
          }
        });
      });

      // 현재 화면의 카드들을 캡처
      const cardsContainer = document.querySelector('[data-testid="safety-cards-container"]') || 
                           document.querySelector('.MuiBox-root');
      
      if (!cardsContainer) {
        alert('카드 컨테이너를 찾을 수 없습니다.');
        return;
      }

      const canvas = await html2canvas(cardsContainer, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false
      });

      // 원본 스타일 복원
      originalCards.forEach((card, index) => {
        if (originalStyles[index]) {
          card.style.backgroundColor = originalStyles[index].backgroundColor;
          card.style.color = originalStyles[index].color;
          card.style.border = originalStyles[index].border;
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // 이미지 크기 계산 (A4에 맞게 조정)
      const imgWidth = pageWidth - 20; // 여백 10mm씩
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // 첫 페이지에 이미지 추가
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      
      // 이미지가 페이지보다 크면 여러 페이지로 분할
      if (imgHeight > pageHeight - 20) {
        const pagesNeeded = Math.ceil(imgHeight / (pageHeight - 20));
        
        for (let i = 1; i < pagesNeeded; i++) {
          pdf.addPage();
          const yOffset = -(i * (pageHeight - 20));
          pdf.addImage(imgData, 'PNG', 10, 10 + yOffset, imgWidth, imgHeight);
        }
      }
      
      pdf.save('안전관리_현황.pdf');
    } catch (error) {
      console.error('PDF 생성 오류:', error);
      alert('PDF 생성 중 오류가 발생했습니다.');
    }
  };

  // 입력값 변경 핸들러
  const handleInputChange = (siteName, type, value) => {
    setInputs(prev => ({
      ...prev,
      [siteName]: {
        ...prev[siteName],
        [type]: value
      }
    }));
  };

  // 저장 버튼 클릭 시(임시: 콘솔 출력)
  const handleSave = (siteName, type) => {
    const value = inputs[siteName]?.[type] || '';
    console.log(`[${siteName}] ${type} 입력값:`, value);
    // 실제 저장 로직은 추후 구현
  };

  return (
    <Box sx={{ 
      width: '100%', 
      mb: 3, 
      px: isMobile ? '16px' : 0
    }}>
             <Box sx={{ 
         display: 'flex', 
         alignItems: 'center', 
         mb: 2,
         justifyContent: isMobile ? 'center' : 'flex-start',
         gap: 1
       }}>
        <TextField
          size="small"
          placeholder="현장명 또는 키워드 검색"
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ 
            width: isMobile ? '100%' : 260, 
            bgcolor: '#23272f', 
            borderRadius: 2, 
            input: { color: '#fff' },
            '& .MuiOutlinedInput-root': {
              fontSize: isMobile ? '0.9rem' : 'inherit'
            }
          }}
        />
                 <Button
           variant="contained"
           startIcon={<CloudDownloadIcon />}
           onClick={handleDownloadPDF}
           sx={{
             bgcolor: '#4ade80',
             color: '#fff',
             '&:hover': {
               bgcolor: '#22c55e'
             },
             fontSize: isMobile ? '0.8rem' : 'inherit',
             px: isMobile ? 2 : 3,
             py: isMobile ? 1 : 1.5,
             height: '40px' // TextField와 동일한 높이로 설정
           }}
         >
           다운로드
         </Button>
      </Box>

             <Box 
         data-testid="safety-cards-container"
         sx={{ 
           display: 'flex', 
           flexWrap: 'wrap', 
           gap: isMobile ? 2 : 2.5,
           justifyContent: 'flex-start'
         }}
       >
        {filtered.map(site => (
          <Box key={site.siteName} sx={{ 
            flex: '0 0 auto',
            width: isMobile ? 'calc(50% - 8px)' : '400px',
            minWidth: isMobile ? 'calc(50% - 8px)' : '400px'
          }}>
            <Paper sx={{ 
              p: isMobile ? 1.5 : 2.5, 
              bgcolor: '#181c24', 
              borderRadius: isMobile ? 2 : 3, 
              minHeight: isMobile ? 200 : 210, 
              boxShadow: 3,
              position: 'relative',
              ml: isMobile ? 0 : 0,
              width: '100%'
            }}>
              {/* 그리드 오버레이 */}
              <Box sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'none',
                zIndex: 1,
                opacity: 0.1,
                backgroundImage: `
                  linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                `,
                backgroundSize: '20px 40px',
                borderRadius: 3
              }} />
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, position: 'relative', zIndex: 2 }}>
                <Typography 
                  variant={isMobile ? "h6" : "h6"} 
                  sx={{ 
                    color: '#fff', 
                    fontWeight: 700, 
                    flex: 1,
                    fontSize: '1rem'
                  }}
                >
                  {site.siteName}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => handleDeleteClick(site.siteName)}
                  sx={{
                    color: '#ef4444',
                    bgcolor: 'rgba(239, 68, 68, 0.1)',
                    '&:hover': {
                      bgcolor: 'rgba(239, 68, 68, 0.2)',
                    },
                    width: isMobile ? 28 : 32,
                    height: isMobile ? 28 : 32,
                  }}
                >
                  <DeleteIcon sx={{ fontSize: isMobile ? '1rem' : '1.2rem' }} />
                </IconButton>
              </Box>
              <Divider sx={{ mb: 1.5, bgcolor: '#23272f' }} />
              
              <Box sx={{ position: 'relative', zIndex: 2 }}>
                {/* 안전 점검 */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minHeight: 35, position: 'relative' }}>
                  {icons.inspection}
                  <Typography sx={{ minWidth: 80, fontSize: isMobile ? '0.8rem' : '1rem' }}>안전   점검</Typography>
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-start', gap: 0 }}>
                    <Box sx={{ ml: isMobile ? -1.25 : -0.625, width: 110, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ width: isMobile ? 50 : 60 }} />
                      <Chip
                        label={site.inspection.count + '건'}
                        size="small"
                        sx={{
                          bgcolor: '#23272f',
                          color: '#4ade80',
                          fontWeight: 700,
                          px: 1,
                          minWidth: 'unset',
                          borderRadius: 1,
                          height: isMobile ? 28 : 32,
                          '& .MuiChip-label': { p: 0, m: 0, lineHeight: 1, display: 'inline-block' },
                          fontSize: isMobile ? '0.7rem' : '0.9rem',
                          alignSelf: 'center'
                        }}
                        component="span"
                      />
                    </Box>
                    <TextField
                      size="small"
                      variant="outlined"
                      placeholder="입력"
                      value={inputs[site.siteName]?.inspection || ''}
                      onChange={e => handleInputChange(site.siteName, 'inspection', e.target.value)}
                      sx={{ 
                        width: isMobile ? 80 : 105, 
                        height: 28, 
                        ml: isMobile ? 0 : -0.625, 
                        mr: 1, 
                        '& .MuiOutlinedInput-root': { 
                          borderRadius: 1, 
                          height: 28, 
                          p: 0,
                          fontSize: isMobile ? '0.8rem' : '1rem'
                        } 
                      }}
                      InputProps={{ 
                        style: { 
                          height: 28, 
                          padding: 0, 
                          fontSize: isMobile ? '0.8rem' : '1rem', 
                          textAlign: 'center', 
                          lineHeight: 1 
                        } 
                      }}
                    />
                  </Box>
                </Box>
                {/* 사고 예방 */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minHeight: 35, position: 'relative' }}>
                  {icons.accident}
                  <Typography sx={{ minWidth: 80, fontSize: isMobile ? '0.8rem' : '1rem' }}>사고   예방</Typography>
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-start', gap: 0 }}>
                    <Box sx={{ ml: isMobile ? -1.25 : -0.625, width: 110, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ width: isMobile ? 50 : 60 }} />
                      <Chip
                        label={site.accident.count + '건'}
                        size="small"
                        sx={{
                          bgcolor: '#23272f',
                          color: '#f87171',
                          fontWeight: 700,
                          px: 1,
                          minWidth: 'unset',
                          borderRadius: 1,
                          height: isMobile ? 28 : 32,
                          '& .MuiChip-label': { p: 0, m: 0, lineHeight: 1, display: 'inline-block' },
                          fontSize: isMobile ? '0.7rem' : '0.9rem',
                          alignSelf: 'center'
                        }}
                        component="span"
                      />
                    </Box>
                    <TextField
                      size="small"
                      variant="outlined"
                      placeholder="입력"
                      value={inputs[site.siteName]?.accident || ''}
                      onChange={e => handleInputChange(site.siteName, 'accident', e.target.value)}
                      sx={{ 
                        width: isMobile ? 80 : 105, 
                        height: 28, 
                        ml: isMobile ? 0 : -0.625, 
                        mr: 1, 
                        '& .MuiOutlinedInput-root': { 
                          borderRadius: 1, 
                          height: 28, 
                          p: 0,
                          fontSize: isMobile ? '0.8rem' : '1rem'
                        } 
                      }}
                      InputProps={{ 
                        style: { 
                          height: 28, 
                          padding: 0, 
                          fontSize: isMobile ? '0.8rem' : '1rem', 
                          textAlign: 'center', 
                          lineHeight: 1 
                        } 
                      }}
                    />
                  </Box>
                </Box>
                {/* 안전 교육 */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minHeight: 35, position: 'relative' }}>
                  {icons.education}
                  <Typography sx={{ minWidth: 80, fontSize: isMobile ? '0.8rem' : '1rem' }}>안전   교육</Typography>
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-start', gap: 0 }}>
                    <Box sx={{ ml: isMobile ? -1.25 : -0.625, width: 110, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ width: isMobile ? 50 : 60 }} />
                      <Chip
                        label={site.education.count + '건'}
                        size="small"
                        sx={{
                          bgcolor: '#23272f',
                          color: '#60a5fa',
                          fontWeight: 700,
                          px: 1,
                          minWidth: 'unset',
                          borderRadius: 1,
                          height: isMobile ? 28 : 32,
                          '& .MuiChip-label': { p: 0, m: 0, lineHeight: 1, display: 'inline-block' },
                          fontSize: isMobile ? '0.7rem' : '0.9rem',
                          alignSelf: 'center'
                        }}
                        component="span"
                      />
                    </Box>
                    <TextField
                      size="small"
                      variant="outlined"
                      placeholder="입력"
                      value={inputs[site.siteName]?.education || ''}
                      onChange={e => handleInputChange(site.siteName, 'education', e.target.value)}
                      sx={{ 
                        width: isMobile ? 80 : 105, 
                        height: 28, 
                        ml: isMobile ? 0 : -0.625, 
                        mr: 1, 
                        '& .MuiOutlinedInput-root': { 
                          borderRadius: 1, 
                          height: 28, 
                          p: 0,
                          fontSize: isMobile ? '0.8rem' : '1rem'
                        } 
                      }}
                      InputProps={{ 
                        style: { 
                          height: 28, 
                          padding: 0, 
                          fontSize: isMobile ? '0.8rem' : '1rem', 
                          textAlign: 'center', 
                          lineHeight: 1 
                        } 
                      }}
                    />
                  </Box>
                </Box>
                {/* 안전관리비 */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minHeight: 35, position: 'relative' }}>
                  {icons.cost}
                  <Typography sx={{ minWidth: 80, fontSize: isMobile ? '0.8rem' : '1rem' }}>안전관리비</Typography>
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-start', gap: 0 }}>
                    <Box sx={{ ml: isMobile ? -1.25 : -0.625, width: 110, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ width: isMobile ? 50 : 60 }} />
                      <Chip
                        label={site.cost.total ? site.cost.total.toLocaleString() + '원' : '0원'}
                        size="small"
                        sx={{
                          bgcolor: '#23272f',
                          color: '#facc15',
                          fontWeight: 700,
                          px: 1,
                          minWidth: 'unset',
                          borderRadius: 1,
                          height: isMobile ? 28 : 32,
                          '& .MuiChip-label': { p: 0, m: 0, lineHeight: 1, display: 'inline-block' },
                          fontSize: isMobile ? '0.7rem' : '0.9rem',
                          alignSelf: 'center'
                        }}
                        component="span"
                      />
                    </Box>
                    <TextField
                      size="small"
                      variant="outlined"
                      placeholder="입력"
                      value={inputs[site.siteName]?.cost || ''}
                      onChange={e => handleInputChange(site.siteName, 'cost', e.target.value)}
                      sx={{ 
                        width: isMobile ? 80 : 105, 
                        height: 28, 
                        ml: isMobile ? 0 : -0.625, 
                        mr: 1, 
                        '& .MuiOutlinedInput-root': { 
                          borderRadius: 1, 
                          height: 28, 
                          p: 0,
                          fontSize: isMobile ? '0.8rem' : '1rem'
                        } 
                      }}
                      InputProps={{ 
                        style: { 
                          height: 28, 
                          padding: 0, 
                          fontSize: isMobile ? '0.8rem' : '1rem', 
                          textAlign: 'center', 
                          lineHeight: 1 
                        } 
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Box>
        ))}
      </Box>
      
      {/* 삭제 확인 다이얼로그 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#1a1a1a',
            color: '#fff',
            borderRadius: 3
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: '#232b3b', 
          color: '#ef4444',
          fontWeight: 700,
          fontSize: '1.2rem',
          textAlign: 'center'
        }}>
          ⚠️ 삭제 확인
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 2 }}>
          <Typography sx={{ 
            color: '#fff', 
            fontSize: '1rem', 
            textAlign: 'center',
            mb: 2
          }}>
            <strong>{siteToDelete}</strong> 현장의 모든 안전관리 데이터를 삭제하시겠습니까?
          </Typography>
          <Typography sx={{ 
            color: '#f59e42', 
            fontSize: '0.9rem', 
            textAlign: 'center',
            bgcolor: 'rgba(245, 158, 66, 0.1)',
            p: 2,
            borderRadius: 2,
            border: '1px solid rgba(245, 158, 66, 0.3)'
          }}>
            삭제된 데이터는 복구할 수 없습니다.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ 
          p: 3, 
          justifyContent: 'center',
          gap: 2
        }}>
          <Button 
            onClick={handleDeleteCancel}
            variant="outlined"
            sx={{
              color: '#fff',
              borderColor: '#666',
              '&:hover': {
                borderColor: '#999'
              }
            }}
          >
            취소
          </Button>
          <Button 
            onClick={handleDeleteConfirm}
            variant="contained"
            sx={{
              bgcolor: '#ef4444',
              color: '#fff',
              '&:hover': {
                bgcolor: '#dc2626'
              }
            }}
          >
            삭제
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default SafetyOverviewCards; 