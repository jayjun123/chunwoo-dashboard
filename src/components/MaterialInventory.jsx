import React, { useState, useEffect } from 'react';
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
  Save as SaveIcon
} from '@mui/icons-material';
import { uploadMaterialData, getMaterialDataFromFirebase, convertMaterialDataForSiteManagement } from '../utils/materialUploadUtils';

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
  const [editingItem, setEditingItem] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

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
  const loadMaterialData = async () => {
    if (!siteId) return;
    
    setLoading(true);
    setError('');
    
    try {
      const result = await getMaterialDataFromFirebase(siteId);
      
      if (result.success) {
        setMaterialData(result.data);
        console.log('✅ 물량 데이터 로드 완료:', result.data.items.length, '개 항목');
      } else {
        setError('물량 데이터를 불러올 수 없습니다.');
      }
    } catch (error) {
      console.error('❌ 물량 데이터 로드 실패:', error);
      setError('물량 데이터 로드 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadMaterialData();
  }, [siteId]);

  // 물량 항목 편집 함수들
  const handleEditItem = (item, index) => {
    setEditingItem({ ...item, index });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    
    try {
      const updatedItems = [...materialData.items];
      updatedItems[editingItem.index] = {
        ...editingItem,
        amount: (editingItem.quantity * editingItem.unitPrice).toString()
      };
      
      // Firebase에 업데이트
      const { doc, updateDoc, collection, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      
      // materialEstimates 컬렉션 업데이트
      const { query, where, getDocs } = await import('firebase/firestore');
      const materialQuery = query(
        collection(db, 'materialEstimates'),
        where('siteId', '==', siteId)
      );
      const materialDocs = await getDocs(materialQuery);
      
      if (!materialDocs.empty) {
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
          onDataUpdate();
        }
      }
    } catch (error) {
      console.error('❌ 물량 항목 수정 실패:', error);
      setError('물량 항목 수정 중 오류가 발생했습니다.');
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
    if (!selectedFile || !siteId) {
      setError('파일과 현장 정보가 필요합니다.');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const result = await uploadMaterialData(selectedFile, siteId, siteName);
      
      if (result.success) {
        setSuccess(result.message);
        setUploadDialogOpen(false);
        setSelectedFile(null);
        
        // 데이터 새로고침
        await loadMaterialData();
        
        // 부모 컴포넌트에 업데이트 알림
        if (onDataUpdate) {
          onDataUpdate(result.data);
        }
      } else {
        setError(result.error || '업로드에 실패했습니다.');
      }
    } catch (error) {
      console.error('❌ 업로드 실패:', error);
      setError('업로드 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
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
            onClick={() => setUploadDialogOpen(true)}
            sx={{
              borderColor: '#43e97b',
              color: '#43e97b',
              '&:hover': { borderColor: '#2dd36f' }
            }}
          >
            업로드
          </Button>
          <IconButton
            size="small"
            onClick={loadMaterialData}
            disabled={loading}
            sx={{ color: '#43e97b' }}
          >
            <RefreshIcon />
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
                          물량: {formatQuantity(item.quantity, item.unit)}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#b0b0b0', fontSize: '0.8rem' }}>
                          단가: {formatCurrency(item.unitPrice)}
                        </Typography>
                      </Box>
                      
                      <Typography variant="body1" sx={{ 
                        color: '#43e97b', 
                        fontWeight: 'bold',
                        textAlign: 'right',
                        fontSize: '0.9rem'
                      }}>
                        {formatCurrency(item.amount)}
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
                  ))}
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
            disabled={!selectedFile || uploading}
            variant="contained"
            sx={{
              bgcolor: '#43e97b',
              color: '#000',
              '&:hover': { bgcolor: '#2dd36f' },
              '&:disabled': { bgcolor: '#333', color: '#666' }
            }}
          >
            {uploading ? (
              <>
                <CircularProgress size={16} sx={{ mr: 1, color: '#000' }} />
                업로드 중...
              </>
            ) : (
              '업로드'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MaterialInventory;
