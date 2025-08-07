import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Container
} from '@mui/material';
import { Upload as UploadIcon, Delete as DeleteIcon, CloudUpload as AutoUploadIcon } from '@mui/icons-material';
import { uploadTemplateToFirebase, checkTemplateStructure, deleteTemplateFromFirebase, uploadLocalTemplateToFirebase } from '../utils/gisungTemplateUtils';

const TemplateUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [progressStep, setProgressStep] = useState('');

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // 파일 확장자 확인
    if (!file.name.endsWith('.xlsx')) {
      setMessage('엑셀 파일(.xlsx)만 업로드 가능합니다.');
      setMessageType('error');
      return;
    }

    // 파일 크기 확인
    if (file.size === 0) {
      setMessage('파일이 비어있습니다.');
      setMessageType('error');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setMessage('파일 크기가 너무 큽니다. (최대 50MB)');
      setMessageType('error');
      return;
    }

    setUploading(true);
    setProgressStep('파일 검증 및 복구 중...');
    setMessage('파일 검증 및 복구 중...');
    setMessageType('info');

    try {
      setProgressStep('파일 업로드 중...');
      setMessage('파일 업로드 중...');
      await uploadTemplateToFirebase(file);
      setMessage('✅ 템플릿 파일이 성공적으로 업로드되었습니다! (손상된 파일은 자동으로 복구되었습니다)');
      setMessageType('success');
      setProgressStep('');
    } catch (error) {
      console.error('템플릿 업로드 실패:', error);
      
      // 사용자 친화적인 오류 메시지
      let userMessage = '업로드 실패: ' + error.message;
      
      if (error.message.includes('손상')) {
        userMessage = '파일이 심각하게 손상되었습니다. Excel에서 파일을 다시 저장해주세요.';
      } else if (error.message.includes('복구')) {
        userMessage = '파일 복구에 실패했습니다. 다른 파일을 시도해주세요.';
      }
      
      setMessage('❌ ' + userMessage);
      setMessageType('error');
      setProgressStep('');
    } finally {
      setUploading(false);
    }

    // 파일 입력 초기화
    event.target.value = '';
  };

  const handleCheckTemplateStructure = async () => {
    setUploading(true);
    setMessage('템플릿 구조 확인 중...');
    setMessageType('info');

    try {
      await checkTemplateStructure();
      setMessage('✅ 템플릿 구조 확인 완료! 콘솔을 확인해주세요.');
      setMessageType('success');
    } catch (error) {
      console.error('템플릿 구조 확인 실패:', error);
      setMessage('❌ 템플릿 구조 확인 실패: ' + error.message);
      setMessageType('error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!confirm('정말로 파이어베이스의 템플릿을 삭제하시겠습니까?')) {
      return;
    }

    setUploading(true);
    setProgressStep('템플릿 삭제 중...');
    setMessage('템플릿 삭제 중...');
    setMessageType('info');

    try {
      const result = await deleteTemplateFromFirebase();
      setMessage(`✅ ${result.message}`);
      setMessageType('success');
      setProgressStep('');
    } catch (error) {
      console.error('템플릿 삭제 실패:', error);
      setMessage(`❌ 템플릿 삭제 실패: ${error.message}`);
      setMessageType('error');
      setProgressStep('');
    } finally {
      setUploading(false);
    }
  };

  const handleAutoUploadTemplate = async () => {
    setUploading(true);
    setProgressStep('로컬 템플릿 자동 업로드 중...');
    setMessage('public 폴더의 gisung.xlsx를 파이어베이스에 업로드 중...');
    setMessageType('info');

    try {
      const result = await uploadLocalTemplateToFirebase();
      setMessage(`✅ ${result.message}\n📂 경로: ${result.path}\n📊 크기: ${result.size} bytes`);
      setMessageType('success');
      setProgressStep('');
    } catch (error) {
      console.error('자동 업로드 실패:', error);
      setMessage(`❌ 자동 업로드 실패: ${error.message}`);
      setMessageType('error');
      setProgressStep('');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          템플릿 파일 업로드
        </Typography>
        
        <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
          기성금청구서 템플릿 파일을 업로드하세요.
          <br />
          파일 형식: .xlsx (Excel 파일)
          <br />
          <strong>파일명: gisung.xlsx</strong>
          <br />
          <strong>💡 손상된 파일은 자동으로 복구됩니다!</strong>
        </Typography>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>템플릿 파일 요구사항:</strong>
            <br />
            • 시트 이름: "갑지", "기성금 내역서"
            <br />
            • 기성금 내역서 시트에 D, E열에 숫자가 있으면 F, H, J, K, L열에 수식이 있어야 함
            <br />
            • 수식 예시: F열 = D×E, H열 = G×E, J열 = I×E 등
            <br />
            • <strong>중요:</strong> 보호 설정을 걸어놓고 수정 가능한 셀만 열어놓으면 됩니다
            <br />
            <br />
            <strong>파일 손상 문제 해결:</strong>
            <br />
            • Excel에서 파일을 열어서 "다른 이름으로 저장" → "Excel 통합 문서 (.xlsx)"로 저장
            <br />
            • 파일이 손상된 경우: Excel에서 복구 후 다시 저장
            <br />
            • 파일 크기: 최대 50MB
          </Typography>
        </Alert>

        {message && (
          <Alert severity={messageType} sx={{ mb: 3 }}>
            {message}
            {progressStep && (
              <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                {progressStep}
              </Typography>
            )}
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <input
            type="file"
            accept=".xlsx"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            id="template-upload"
            disabled={uploading}
          />
          <label htmlFor="template-upload">
            <Button
              variant="contained"
              component="span"
              startIcon={uploading ? <CircularProgress size={20} /> : <UploadIcon />}
              disabled={uploading}
              size="large"
              sx={{ 
                fontSize: '1.1rem',
                py: 1.5,
                px: 3,
                mr: 2
              }}
            >
              {uploading ? (progressStep || '업로드 중...') : '템플릿 파일 선택'}
            </Button>
          </label>
          
          <Button
            variant="outlined"
            onClick={handleCheckTemplateStructure}
            disabled={uploading}
            size="large"
            sx={{ 
              fontSize: '1.1rem',
              py: 1.5,
              px: 3,
              mr: 2
            }}
          >
            템플릿 구조 확인
          </Button>
          
          <Button
            variant="outlined"
            color="error"
            onClick={handleDeleteTemplate}
            disabled={uploading}
            size="large"
            startIcon={<DeleteIcon />}
            sx={{ 
              fontSize: '1.1rem',
              py: 1.5,
              px: 3,
              mr: 2
            }}
          >
            템플릿 삭제
          </Button>
          
          <Button
            variant="contained"
            color="success"
            onClick={handleAutoUploadTemplate}
            disabled={uploading}
            size="large"
            startIcon={<AutoUploadIcon />}
            sx={{ 
              fontSize: '1.1rem',
              py: 1.5,
              px: 3
            }}
          >
            로컬 템플릿 자동 업로드
          </Button>
        </Box>

        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          업로드된 템플릿 파일은 기성금청구서 생성 시 사용됩니다.
          <br />
          기존 파일이 있다면 덮어쓰기됩니다.
        </Typography>
      </Paper>
    </Container>
  );
};

export default TemplateUpload; 