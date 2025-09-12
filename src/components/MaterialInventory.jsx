<<<<<<< HEAD
import React, { useState, useEffect, useCallback } from 'react';
=======
import React, { useState, useEffect } from 'react';
>>>>>>> ae5decb092edae570c53532171b77e663caa0146
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Chip,
  Divider
} from '@mui/material';
import {
  Upload as UploadIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Palette as PaletteIcon
} from '@mui/icons-material';
import { uploadMaterialData, getMaterialDataFromFirebase, convertMaterialDataForSiteManagement } from '../utils/materialUploadUtils';
import IdeaPad from './NotepadApp';

const MaterialInventory = ({ siteId, siteName, templateType, onDataUpdate }) => {
  const [materialData, setMaterialData] = useState({
    items: [],
    summary: {
      totalContractAmount: 0,
      totalVat: 0,
      contractAmount: 0
    }
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [paintAppOpen, setPaintAppOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // templateType에 따른 표시 텍스트
  const getTemplateTypeText = () => {
    if (!templateType) return '';
    return templateType === 'L' ? 'L' : 'N';
  };

  // templateType에 따른 색상
  const getTemplateTypeColor = () => {
    if (!templateType) return 'default';
    return templateType === 'L' ? 'warning' : 'info';
  };

  // templateType에 따른 툴팁 텍스트
  const getTemplateTypeTooltip = () => {
    if (!templateType) return '';
    return templateType === 'L' 
      ? 'LONG 템플릿 - 견적서/납품계약서 다운로드 시 (L)gyunjuk.xlsx 사용'
      : 'NEW 템플릿 - 견적서/납품계약서 다운로드 시 (N)gyunjuk.xlsx 사용';
  };

  // 모바일 감지
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 물량 데이터 로드
<<<<<<< HEAD
  const loadMaterialData = useCallback(async () => {
=======
  const loadMaterialData = async () => {
>>>>>>> ae5decb092edae570c53532171b77e663caa0146
    if (!siteId) {
      console.warn('⚠️ siteId가 없어서 데이터를 로드할 수 없습니다.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      console.log('📥 물량 데이터 로드 시작:', siteId);
      
      const result = await getMaterialDataFromFirebase(siteId);
      
      if (result && result.success && result.data) {
        setMaterialData(result.data);
        console.log('✅ 물량 데이터 로드 완료:', result.data.items?.length || 0, '개 항목');
      } else {
        const errorMsg = result?.error || '물량 데이터를 불러올 수 없습니다.';
        console.error('❌ 데이터 로드 실패:', errorMsg);
        setError(errorMsg);
      }
    } catch (error) {
      console.error('❌ 물량 데이터 로드 중 예외 발생:', error);
      console.error('❌ 에러 스택:', error.stack);
      
      // 더 구체적인 에러 메시지 제공
      let errorMessage = '물량 데이터 로드 중 오류가 발생했습니다.';
      if (error.message.includes('Network')) {
        errorMessage = '네트워크 연결을 확인해주세요.';
      } else if (error.message.includes('Firebase')) {
        errorMessage = '데이터베이스 연결에 문제가 있습니다.';
      } else if (error.message.includes('Permission')) {
        errorMessage = '데이터 접근 권한이 없습니다.';
      }
      
      setError(`${errorMessage} (${error.message})`);
    } finally {
      setLoading(false);
    }
<<<<<<< HEAD
  }, [siteId]);
=======
  };
>>>>>>> ae5decb092edae570c53532171b77e663caa0146

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadMaterialData();
<<<<<<< HEAD
  }, [siteId, loadMaterialData]);
=======
  }, [siteId]);
>>>>>>> ae5decb092edae570c53532171b77e663caa0146

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      // 비동기 작업 취소를 위한 플래그
      console.log('🧹 MaterialInventory 컴포넌트 정리');
    };
  }, []);

  // 물량 항목 편집 함수들
  const handleEditItem = (item, index) => {
    setEditingItem({ ...item, index });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) {
      console.warn('⚠️ 편집할 항목이 없습니다.');
      return;
    }
    
    try {
      console.log('📝 물량 항목 수정 시작:', editingItem);
      
      const updatedItems = [...materialData.items];
      updatedItems[editingItem.index] = {
        ...editingItem,
        amount: (editingItem.quantity * editingItem.unitPrice).toString()
      };
      
      // Firebase 모듈 동적 import with error handling
      let doc, updateDoc, collection, serverTimestamp, query, where, getDocs, db;
      
      try {
        const firestoreModule = await import('firebase/firestore');
        const firebaseModule = await import('../firebase');
        
        doc = firestoreModule.doc;
        updateDoc = firestoreModule.updateDoc;
        collection = firestoreModule.collection;
        serverTimestamp = firestoreModule.serverTimestamp;
        query = firestoreModule.query;
        where = firestoreModule.where;
        getDocs = firestoreModule.getDocs;
        db = firebaseModule.db;
        
        if (!db) {
          throw new Error('Firebase 데이터베이스 연결이 실패했습니다.');
        }
      } catch (importError) {
        console.error('❌ Firebase 모듈 로드 실패:', importError);
        throw new Error('데이터베이스 연결에 실패했습니다.');
      }
      
      // materialEstimates 컬렉션 업데이트
      const materialQuery = query(
        collection(db, 'materialEstimates'),
        where('siteId', '==', siteId)
      );
      
      const materialDocs = await getDocs(materialQuery);
      
      if (materialDocs.empty) {
        throw new Error('해당 현장의 물량 데이터를 찾을 수 없습니다.');
      }
      
      const materialDoc = materialDocs.docs[0];
      await updateDoc(doc(db, 'materialEstimates', materialDoc.id), {
        items: updatedItems,
        updatedAt: serverTimestamp()
      });
      
      // 로컬 상태 업데이트
      setMaterialData(prev => ({
        ...prev,
        items: updatedItems
      }));
      
      setSuccess('물량 항목이 수정되었습니다.');
      setEditDialogOpen(false);
      setEditingItem(null);
      
      // 부모 컴포넌트에 업데이트 알림
      if (onDataUpdate) {
        try {
          onDataUpdate();
        } catch (updateError) {
          console.error('❌ 부모 컴포넌트 업데이트 실패:', updateError);
        }
      }
      
      console.log('✅ 물량 항목 수정 완료');
    } catch (error) {
      console.error('❌ 물량 항목 수정 실패:', error);
      console.error('❌ 에러 스택:', error.stack);
      
      // 더 구체적인 에러 메시지 제공
      let errorMessage = '물량 항목 수정 중 오류가 발생했습니다.';
      if (error.message.includes('Firebase')) {
        errorMessage = '데이터베이스 연결에 문제가 있습니다.';
      } else if (error.message.includes('찾을 수 없습니다')) {
        errorMessage = error.message;
      } else if (error.message.includes('Network')) {
        errorMessage = '네트워크 연결을 확인해주세요.';
      }
      
      setError(`${errorMessage} (${error.message})`);
    }
  };

  const handleCancelEdit = () => {
    setEditDialogOpen(false);
    setEditingItem(null);
  };

  // 파일 선택 핸들러
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // 엑셀 파일 검증
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      
      if (!validTypes.includes(file.type)) {
        setError('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.');
        return;
      }
      
      setSelectedFile(file);
      setError('');
    }
  };

  // 파일 업로드 핸들러
  const handleUpload = async () => {
    if (isProcessing) {
      console.warn('⚠️ 이미 처리 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    if (!selectedFile || !siteId) {
      setError('파일과 현장 정보가 필요합니다.');
      return;
    }

    setIsProcessing(true);
    setUploading(true);
    setError('');
    setSuccess('');

    try {
      console.log('📤 업로드 시작:', { fileName: selectedFile.name, siteId, siteName });
      
      const result = await uploadMaterialData(selectedFile, siteId, siteName);
      
      if (result && result.success) {
        console.log('✅ 업로드 성공:', result.message);
        setSuccess(result.message);
        setUploadDialogOpen(false);
        setSelectedFile(null);
        
        // 데이터 새로고침
        try {
          await loadMaterialData();
        } catch (reloadError) {
          console.error('❌ 데이터 새로고침 실패:', reloadError);
          setError('업로드는 완료되었지만 데이터 새로고침에 실패했습니다.');
        }
        
        // 부모 컴포넌트에 업데이트 알림
        if (onDataUpdate && result.data) {
          try {
            onDataUpdate(result.data);
          } catch (updateError) {
            console.error('❌ 부모 컴포넌트 업데이트 실패:', updateError);
          }
        }
      } else {
        const errorMsg = result?.error || '업로드에 실패했습니다.';
        console.error('❌ 업로드 실패:', errorMsg);
        setError(errorMsg);
      }
    } catch (error) {
      console.error('❌ 업로드 중 예외 발생:', error);
      console.error('❌ 에러 스택:', error.stack);
      
      // 더 구체적인 에러 메시지 제공
      let errorMessage = '업로드 중 오류가 발생했습니다.';
      if (error.message.includes('Network')) {
        errorMessage = '네트워크 연결을 확인해주세요.';
      } else if (error.message.includes('Firebase')) {
        errorMessage = '데이터베이스 연결에 문제가 있습니다.';
      } else if (error.message.includes('File')) {
        errorMessage = '파일 처리 중 오류가 발생했습니다.';
      }
      
      setError(`${errorMessage} (${error.message})`);
    } finally {
      setUploading(false);
      setIsProcessing(false);
    }
  };

  // 금액 포맷팅
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '0원';
    // 정수로 반올림하여 표시
    const roundedAmount = Math.round(amount);
    return new Intl.NumberFormat('ko-KR').format(roundedAmount) + '원';
  };

  // 수량 포맷팅
  const formatQuantity = (quantity, unit) => {
    if (!quantity && quantity !== 0) return '0';
    // 소수점 2째 자리까지 표시하되, 정확한 값은 유지
    const roundedForDisplay = Math.round(quantity * 100) / 100;
    const formatted = new Intl.NumberFormat('ko-KR').format(roundedForDisplay);
    return unit ? `${formatted} ${unit}` : formatted;
  };

  return (
    <Box sx={{ 
      bgcolor: '#1a1d21', 
      color: '#fff', 
      borderRadius: 2, 
      p: 2,
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* 헤더 */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 2,
        pb: 1,
        borderBottom: '1px solid #333'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#fff' }}>
            물량내역
          </Typography>
          {templateType && (
            <Chip
              label={getTemplateTypeText()}
              color={getTemplateTypeColor()}
              size="small"
              title={getTemplateTypeTooltip()}
              sx={{ 
                fontWeight: 'bold',
                '& .MuiChip-label': { color: '#fff' }
              }}
            />
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<UploadIcon />}
            onClick={() => {
              if (!isProcessing) {
                setUploadDialogOpen(true);
              }
            }}
            disabled={isProcessing}
            sx={{
              borderColor: '#43e97b',
              color: '#43e97b',
              '&:hover': { borderColor: '#2dd36f' },
              '&:disabled': { 
                borderColor: '#666', 
                color: '#666',
                cursor: 'not-allowed'
              }
            }}
          >
            {isProcessing ? '처리중...' : '업로드'}
          </Button>
          <IconButton
            size="small"
            onClick={() => {
              if (!isProcessing && !loading) {
                loadMaterialData();
              }
            }}
            disabled={loading || isProcessing}
            sx={{ 
              color: '#43e97b',
              '&:disabled': { color: '#666' }
            }}
            title={isProcessing ? '처리 중입니다' : '새로고침'}
          >
            <RefreshIcon />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => setPaintAppOpen(true)}
            sx={{ 
              color: '#ff6b6b',
              '&:hover': { backgroundColor: 'rgba(255, 107, 107, 0.1)' }
            }}
            title="그림판"
          >
            <PaletteIcon />
          </IconButton>
        </Box>
      </Box>

      {/* 에러/성공 메시지 */}
      {error && (
        <Alert severity="error" sx={{ mb: 2, bgcolor: '#2d1b1b', color: '#ff6b6b' }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2, bgcolor: '#1b2d1b', color: '#6bff6b' }}>
          {success}
        </Alert>
      )}

      {/* 로딩 상태 */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress sx={{ color: '#43e97b' }} />
        </Box>
      )}

      {/* 물량 데이터 테이블 */}
      {!loading && (
        <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {isMobile ? (
            // 모바일용 카드 형태
            <Box sx={{ 
              flex: 1,
              overflow: 'auto',
              p: 1
            }}>
              {materialData.items.length === 0 ? (
                <Box sx={{ 
                  textAlign: 'center', 
                  color: '#999', 
                  py: 4
                }}>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    물량 데이터가 없습니다.
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#666' }}>
                    견적서 엑셀 파일을 업로드해주세요.
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
<<<<<<< HEAD
                  {materialData.items.map((item, index) => {
                    // item 유효성 검사
                    if (!item || typeof item !== 'object') {
                      console.warn(`⚠️ 유효하지 않은 물량 데이터 항목 ${index}:`, item);
                      return null;
                    }
                    
                    return (
                      <Box
                        key={index}
                        sx={{
                          bgcolor: '#1e252b',
                          borderRadius: 1,
                          p: 2,
                          border: '1px solid #333',
                          '&:hover': { bgcolor: '#2a3441' }
                        }}
                      >
                        <Typography variant="subtitle2" sx={{ 
                          color: '#fff', 
                          fontWeight: 'bold',
                          mb: 1,
                          fontSize: '0.9rem'
                        }}>
                          {item.name || '품목명없음'}
                        </Typography>
=======
                  {materialData.items.map((item, index) => (
                    <Box
                      key={index}
                      sx={{
                        bgcolor: '#1e252b',
                        borderRadius: 1,
                        p: 2,
                        border: '1px solid #333',
                        '&:hover': { bgcolor: '#2a3441' }
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ 
                        color: '#fff', 
                        fontWeight: 'bold',
                        mb: 1,
                        fontSize: '0.9rem'
                      }}>
                        {item.name}
                      </Typography>
>>>>>>> ae5decb092edae570c53532171b77e663caa0146
                      
                      {item.specification && (
                        <Typography variant="caption" sx={{ 
                          color: '#999',
                          display: 'block',
                          mb: 1,
                          fontSize: '0.75rem'
                        }}>
                          {item.specification}
                        </Typography>
                      )}
                      
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 1
                      }}>
                        <Typography variant="body2" sx={{ color: '#b0b0b0', fontSize: '0.8rem' }}>
<<<<<<< HEAD
                          물량: {formatQuantity(item.quantity || 0, item.unit || '식')}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#b0b0b0', fontSize: '0.8rem' }}>
                          단가: {formatCurrency(item.unitPrice || 0)}
=======
                          물량: {formatQuantity(item.quantity, item.unit)}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#b0b0b0', fontSize: '0.8rem' }}>
                          단가: {formatCurrency(item.unitPrice)}
>>>>>>> ae5decb092edae570c53532171b77e663caa0146
                        </Typography>
                      </Box>
                      
                      <Typography variant="body1" sx={{ 
                        color: '#43e97b', 
                        fontWeight: 'bold',
                        textAlign: 'right',
                        fontSize: '0.9rem'
                      }}>
<<<<<<< HEAD
                        {formatCurrency(item.amount || 0)}
=======
                        {formatCurrency(item.amount)}
>>>>>>> ae5decb092edae570c53532171b77e663caa0146
                      </Typography>
                      
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'flex-end',
                        mt: 1
                      }}>
                        <IconButton
                          size="small"
                          onClick={() => handleEditItem(item, index)}
                          sx={{ 
                            color: '#43e97b',
                            '&:hover': { bgcolor: '#2a3441' }
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
<<<<<<< HEAD
                    );
                  })}
=======
                  ))}
>>>>>>> ae5decb092edae570c53532171b77e663caa0146
                </Box>
              )}
            </Box>
          ) : (
            // 데스크톱용 테이블
            <TableContainer 
              component={Paper} 
              sx={{ 
                flex: 1,
                bgcolor: '#232b3b',
                '& .MuiTable-root': { borderCollapse: 'separate', borderSpacing: 0 }
              }}
            >
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ 
                      bgcolor: '#1a1d21', 
                      color: '#fff', 
                      fontWeight: 'bold',
                      borderBottom: '2px solid #43e97b'
                    }}>
                      항목
                    </TableCell>
                    <TableCell sx={{ 
                      bgcolor: '#1a1d21', 
                      color: '#fff', 
                      fontWeight: 'bold',
                      borderBottom: '2px solid #43e97b'
                    }}>
                      물량
                    </TableCell>
                    <TableCell sx={{ 
                      bgcolor: '#1a1d21', 
                      color: '#fff', 
                      fontWeight: 'bold',
                      borderBottom: '2px solid #43e97b'
                    }}>
                      단가
                    </TableCell>
                    <TableCell sx={{ 
                      bgcolor: '#1a1d21', 
                      color: '#fff', 
                      fontWeight: 'bold',
                      borderBottom: '2px solid #43e97b'
                    }}>
                      금액
                    </TableCell>
                    <TableCell sx={{ 
                      bgcolor: '#1a1d21', 
                      color: '#fff', 
                      fontWeight: 'bold',
                      borderBottom: '2px solid #43e97b'
                    }}>
                      관리
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {materialData.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} sx={{ 
                        textAlign: 'center', 
                        color: '#999', 
                        py: 4,
                        borderBottom: 'none'
                      }}>
                        물량 데이터가 없습니다.
                        <br />
                        <Typography variant="caption" sx={{ color: '#666' }}>
                          견적서 엑셀 파일을 업로드해주세요.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
<<<<<<< HEAD
                    materialData.items.map((item, index) => {
                      // item 유효성 검사
                      if (!item || typeof item !== 'object') {
                        console.warn(`⚠️ 유효하지 않은 물량 데이터 항목 ${index}:`, item);
                        return null;
                      }
                      
                      return (
                        <TableRow 
                          key={index}
                          sx={{ 
                            '&:hover': { bgcolor: '#2a3441' },
                            '&:nth-of-type(odd)': { bgcolor: '#1e252b' }
                          }}
                        >
                          <TableCell sx={{ 
                            color: '#fff', 
                            borderBottom: '1px solid #333',
                            maxWidth: 200,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                {item.name || '품목명없음'}
                              </Typography>
                              {item.specification && (
                                <Typography variant="caption" sx={{ color: '#999' }}>
                                  {item.specification}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell sx={{ 
                            color: '#fff', 
                            borderBottom: '1px solid #333',
                            textAlign: 'right'
                          }}>
                            {formatQuantity(item.quantity || 0, item.unit || '식')}
                          </TableCell>
                          <TableCell sx={{ 
                            color: '#fff', 
                            borderBottom: '1px solid #333',
                            textAlign: 'right'
                          }}>
                            {formatCurrency(item.unitPrice || 0)}
                          </TableCell>
                          <TableCell sx={{ 
                            color: '#43e97b', 
                            borderBottom: '1px solid #333',
                            textAlign: 'right',
                            fontWeight: 'bold'
                          }}>
                            {formatCurrency(item.amount || 0)}
                          </TableCell>
                          <TableCell sx={{ 
                            color: '#fff', 
                            borderBottom: '1px solid #333',
                            textAlign: 'center'
                          }}>
                            <IconButton
                              size="small"
                              onClick={() => handleEditItem(item, index)}
                              sx={{ 
                                color: '#43e97b',
                                '&:hover': { bgcolor: '#2a3441' }
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })
=======
                    materialData.items.map((item, index) => (
                      <TableRow 
                        key={index}
                        sx={{ 
                          '&:hover': { bgcolor: '#2a3441' },
                          '&:nth-of-type(odd)': { bgcolor: '#1e252b' }
                        }}
                      >
                        <TableCell sx={{ 
                          color: '#fff', 
                          borderBottom: '1px solid #333',
                          maxWidth: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {item.name}
                            </Typography>
                            {item.specification && (
                              <Typography variant="caption" sx={{ color: '#999' }}>
                                {item.specification}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ 
                          color: '#fff', 
                          borderBottom: '1px solid #333',
                          textAlign: 'right'
                        }}>
                          {formatQuantity(item.quantity, item.unit)}
                        </TableCell>
                        <TableCell sx={{ 
                          color: '#fff', 
                          borderBottom: '1px solid #333',
                          textAlign: 'right'
                        }}>
                          {formatCurrency(item.unitPrice)}
                        </TableCell>
                        <TableCell sx={{ 
                          color: '#43e97b', 
                          borderBottom: '1px solid #333',
                          textAlign: 'right',
                          fontWeight: 'bold'
                        }}>
                          {formatCurrency(item.amount)}
                        </TableCell>
                        <TableCell sx={{ 
                          color: '#fff', 
                          borderBottom: '1px solid #333',
                          textAlign: 'center'
                        }}>
                          <IconButton
                            size="small"
                            onClick={() => handleEditItem(item, index)}
                            sx={{ 
                              color: '#43e97b',
                              '&:hover': { bgcolor: '#2a3441' }
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
>>>>>>> ae5decb092edae570c53532171b77e663caa0146
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* 편집 다이얼로그 */}
          <Dialog 
            open={editDialogOpen} 
            onClose={handleCancelEdit}
            maxWidth="sm"
            fullWidth
            PaperProps={{
              sx: {
                bgcolor: '#1e252b',
                color: '#fff',
                border: '1px solid #333'
              }
            }}
          >
            <DialogTitle sx={{ 
              bgcolor: '#1a1d21', 
              borderBottom: '1px solid #333',
              color: '#43e97b'
            }}>
              물량 항목 수정
            </DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
              {editingItem && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    label="품목명"
                    value={editingItem.name || ''}
                    onChange={(e) => setEditingItem(prev => ({ ...prev, name: e.target.value }))}
                    fullWidth
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        color: '#fff',
                        '& fieldset': { borderColor: '#333' },
                        '&:hover fieldset': { borderColor: '#43e97b' },
                        '&.Mui-focused fieldset': { borderColor: '#43e97b' }
                      },
                      '& .MuiInputLabel-root': { color: '#999' },
                      '& .MuiInputLabel-root.Mui-focused': { color: '#43e97b' }
                    }}
                  />
                  
                  <TextField
                    label="규격"
                    value={editingItem.specification || ''}
                    onChange={(e) => setEditingItem(prev => ({ ...prev, specification: e.target.value }))}
                    fullWidth
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        color: '#fff',
                        '& fieldset': { borderColor: '#333' },
                        '&:hover fieldset': { borderColor: '#43e97b' },
                        '&.Mui-focused fieldset': { borderColor: '#43e97b' }
                      },
                      '& .MuiInputLabel-root': { color: '#999' },
                      '& .MuiInputLabel-root.Mui-focused': { color: '#43e97b' }
                    }}
                  />
                  
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      label="수량"
                      type="number"
                      value={editingItem.quantity || 0}
                      onChange={(e) => setEditingItem(prev => ({ 
                        ...prev, 
                        quantity: parseFloat(e.target.value) || 0 
                      }))}
                      fullWidth
                      size="small"
                      inputProps={{ step: '0.00001' }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          color: '#fff',
                          '& fieldset': { borderColor: '#333' },
                          '&:hover fieldset': { borderColor: '#43e97b' },
                          '&.Mui-focused fieldset': { borderColor: '#43e97b' }
                        },
                        '& .MuiInputLabel-root': { color: '#999' },
                        '& .MuiInputLabel-root.Mui-focused': { color: '#43e97b' }
                      }}
                    />
                    
                    <TextField
                      label="단위"
                      value={editingItem.unit || ''}
                      onChange={(e) => setEditingItem(prev => ({ ...prev, unit: e.target.value }))}
                      fullWidth
                      size="small"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          color: '#fff',
                          '& fieldset': { borderColor: '#333' },
                          '&:hover fieldset': { borderColor: '#43e97b' },
                          '&.Mui-focused fieldset': { borderColor: '#43e97b' }
                        },
                        '& .MuiInputLabel-root': { color: '#999' },
                        '& .MuiInputLabel-root.Mui-focused': { color: '#43e97b' }
                      }}
                    />
                  </Box>
                  
                  <TextField
                    label="단가"
                    type="number"
                    value={editingItem.unitPrice || 0}
                    onChange={(e) => setEditingItem(prev => ({ 
                      ...prev, 
                      unitPrice: parseFloat(e.target.value) || 0 
                    }))}
                    fullWidth
                    size="small"
                    inputProps={{ step: '0.00001' }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        color: '#fff',
                        '& fieldset': { borderColor: '#333' },
                        '&:hover fieldset': { borderColor: '#43e97b' },
                        '&.Mui-focused fieldset': { borderColor: '#43e97b' }
                      },
                      '& .MuiInputLabel-root': { color: '#999' },
                      '& .MuiInputLabel-root.Mui-focused': { color: '#43e97b' }
                    }}
                  />
                  
                  <Box sx={{ 
                    p: 2, 
                    bgcolor: '#2a3441', 
                    borderRadius: 1,
                    border: '1px solid #333'
                  }}>
                    <Typography variant="body2" sx={{ color: '#999', mb: 1 }}>
                      계산된 금액
                    </Typography>
                    <Typography variant="h6" sx={{ color: '#43e97b', fontWeight: 'bold' }}>
                      {formatCurrency((editingItem.quantity || 0) * (editingItem.unitPrice || 0))}
                    </Typography>
                  </Box>
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ 
              bgcolor: '#1a1d21', 
              borderTop: '1px solid #333',
              p: 2
            }}>
              <Button 
                onClick={handleCancelEdit}
                sx={{ 
                  color: '#999',
                  '&:hover': { bgcolor: '#2a3441' }
                }}
              >
                취소
              </Button>
              <Button 
                onClick={handleSaveEdit}
                variant="contained"
                sx={{ 
                  bgcolor: '#43e97b',
                  color: '#000',
                  '&:hover': { bgcolor: '#2e7d32' }
                }}
                startIcon={<SaveIcon />}
              >
                저장
              </Button>
            </DialogActions>
          </Dialog>

          {/* 요약 정보 */}
          {materialData.items.length > 0 && (
            <Box sx={{ 
              mt: 2, 
              p: 2, 
              bgcolor: '#1e252b', 
              borderRadius: 1,
              border: '1px solid #333'
            }}>
              <Typography variant="subtitle2" sx={{ color: '#43e97b', mb: 1, fontWeight: 'bold' }}>
                요약 정보
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                <Chip 
                  label={`총공사계: ${formatCurrency(materialData.summary.totalContractAmount)}`}
                  sx={{ 
                    bgcolor: '#2d1b1b', 
                    color: '#ff6b6b',
                    fontWeight: 'bold'
                  }}
                />
                <Chip 
                  label={`부가세: ${formatCurrency(materialData.summary.totalVat)}`}
                  sx={{ 
                    bgcolor: '#1b2d1b', 
                    color: '#6bff6b',
                    fontWeight: 'bold'
                  }}
                />
                <Chip 
                  label={`계약금액: ${formatCurrency(materialData.summary.contractAmount)}`}
                  sx={{ 
                    bgcolor: '#1b1b2d', 
                    color: '#6b6bff',
                    fontWeight: 'bold'
                  }}
                />
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* 업로드 다이얼로그 */}
      <Dialog 
        open={uploadDialogOpen} 
        onClose={() => setUploadDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#1a1d21', color: '#fff' }}>
          견적서 업로드
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#1a1d21', color: '#fff', pt: 2 }}>
          <Typography variant="body2" sx={{ mb: 2, color: '#ccc' }}>
            견적서 엑셀 파일을 업로드하면 두 번째 시트(내역서)에서 물량 데이터를 자동으로 추출합니다.
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <input
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              id="material-file-upload"
              type="file"
              onChange={handleFileSelect}
            />
            <label htmlFor="material-file-upload">
              <Button
                variant="outlined"
                component="span"
                startIcon={<UploadIcon />}
                fullWidth
                sx={{
                  borderColor: '#43e97b',
                  color: '#43e97b',
                  '&:hover': { borderColor: '#2dd36f' }
                }}
              >
                {selectedFile ? selectedFile.name : '파일 선택'}
              </Button>
            </label>
          </Box>
          
          {selectedFile && (
            <Alert severity="info" sx={{ mb: 2, bgcolor: '#1b2d1b', color: '#6bff6b' }}>
              선택된 파일: {selectedFile.name}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#1a1d21', p: 2 }}>
          <Button 
            onClick={() => setUploadDialogOpen(false)}
            sx={{ color: '#999' }}
          >
            취소
          </Button>
          <Button 
            onClick={handleUpload}
            disabled={!selectedFile || uploading || isProcessing}
            variant="contained"
            sx={{
              bgcolor: '#43e97b',
              color: '#000',
              '&:hover': { bgcolor: '#2dd36f' },
              '&:disabled': { 
                bgcolor: '#333', 
                color: '#666',
                cursor: 'not-allowed'
              }
            }}
          >
            {uploading || isProcessing ? (
              <>
                <CircularProgress size={16} sx={{ mr: 1, color: '#000' }} />
                {uploading ? '업로드 중...' : '처리 중...'}
              </>
            ) : (
              '업로드'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* IDEA PAD 앱 */}
      <IdeaPad
        open={paintAppOpen}
        onClose={() => setPaintAppOpen(false)}
        siteId={siteId}
        siteName={siteName}
      />
    </Box>
  );
};

export default MaterialInventory;
