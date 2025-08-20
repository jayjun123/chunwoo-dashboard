import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Alert,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  LinearProgress
} from '@mui/material';
import { Upload as UploadIcon, Download as DownloadIcon, CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';

const TemplateUpload = () => {
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [progressStep, setProgressStep] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Firebase Storage에 템플릿 업로드 (권한 문제 우회)
  const handleFirebaseUpload = async (file, templateName) => {
    try {
      setUploading(true);
      setProgressStep(`${templateName} 템플릿 업로드 중...`);
      setUploadProgress(10);

      // 기존 파일 삭제 시도 (권한 문제 무시)
      try {
        const existingRef = ref(storage, `templates/${templateName}`);
        await deleteObject(existingRef);
        console.log(`🗑️ 기존 ${templateName} 삭제 완료`);
        setUploadProgress(30);
      } catch (deleteError) {
        console.warn(`⚠️ 기존 ${templateName} 삭제 실패 (무시):`, deleteError.message);
        setUploadProgress(30);
      }

      // 새 파일 업로드
      const storageRef = ref(storage, `templates/${templateName}`);
      const snapshot = await uploadBytes(storageRef, file);
      setUploadProgress(80);

      // 다운로드 URL 가져오기
      const downloadURL = await getDownloadURL(storageRef);
      setUploadProgress(100);

      console.log(`✅ ${templateName} 템플릿 업로드 완료:`, downloadURL);
      setMessage(`${templateName} 템플릿이 Firebase Storage에 성공적으로 업로드되었습니다!`);
      setMessageType('success');
      setProgressStep('');

    } catch (error) {
      console.error(`❌ ${templateName} 템플릿 업로드 실패:`, error);
      setMessage(`${templateName} 템플릿 업로드에 실패했습니다: ${error.message}`);
      setMessageType('error');
      setProgressStep('');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // 파일 선택 및 업로드
  const handleFileUpload = async (event, templateName) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx')) {
      setMessage('Excel 파일(.xlsx)만 업로드 가능합니다.');
      setMessageType('error');
      return;
    }

    await handleFirebaseUpload(file, templateName);
  };

  // 모든 템플릿 일괄 업로드
  const handleBulkUpload = async () => {
    try {
      setUploading(true);
      setProgressStep('모든 템플릿 일괄 업로드 중...');
      setUploadProgress(10);

      const templates = [
        { name: 'NEWgisung.xlsx', path: '/NEWgisung.xlsx' },
        { name: '견적서.xlsx', path: '/견적서.xlsx' },
        { name: '납품계약서 갑지.xlsx', path: '/납품계약서 갑지.xlsx' }
      ];

      for (let i = 0; i < templates.length; i++) {
        const template = templates[i];
        setProgressStep(`${template.name} 업로드 중... (${i + 1}/${templates.length})`);
        
        try {
          // public 폴더에서 파일 가져오기
          const response = await fetch(template.path);
          if (!response.ok) {
            throw new Error(`파일을 찾을 수 없습니다: ${template.path}`);
          }
          
          const arrayBuffer = await response.arrayBuffer();
          const file = new File([arrayBuffer], template.name, {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          });

          await handleFirebaseUpload(file, template.name);
          setUploadProgress((i + 1) * 30);
          
        } catch (error) {
          console.error(`${template.name} 업로드 실패:`, error);
          setMessage(`${template.name} 업로드에 실패했습니다: ${error.message}`);
          setMessageType('error');
          break;
        }
      }

      if (uploadProgress >= 90) {
        setMessage('모든 템플릿이 Firebase Storage에 성공적으로 업로드되었습니다!');
        setMessageType('success');
      }

    } catch (error) {
      console.error('일괄 업로드 실패:', error);
      setMessage(`일괄 업로드에 실패했습니다: ${error.message}`);
      setMessageType('error');
    } finally {
      setUploading(false);
      setProgressStep('');
      setUploadProgress(0);
    }
  };

  // 브라우저 콘솔에서 실행할 수 있는 스크립트 생성 (간단 버전)
  const generateConsoleScript = () => {
    const script = `
// 간단한 템플릿 업로드 스크립트
(async function() {
  try {
    console.log('🚀 템플릿 업로드 시작...');
    
    const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
    const { storage } = await import('./src/firebase.js');
    
    const templates = [
      { name: 'NEWgisung.xlsx', path: '/NEWgisung.xlsx' },
      { name: '견적서.xlsx', path: '/견적서.xlsx' },
      { name: '납품계약서 갑지.xlsx', path: '/납품계약서 갑지.xlsx' }
    ];
    
    for (const template of templates) {
      try {
        console.log(\`📤 \${template.name} 업로드 중...\`);
        
        const response = await fetch(template.path);
        if (!response.ok) throw new Error(\`파일 없음: \${template.path}\`);
        
        const arrayBuffer = await response.arrayBuffer();
        const file = new File([arrayBuffer], template.name, {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        
        const storageRef = ref(storage, \`templates/\${template.name}\`);
        await uploadBytes(storageRef, file);
        
        const downloadURL = await getDownloadURL(storageRef);
        console.log(\`✅ \${template.name} 완료: \${downloadURL}\`);
        
      } catch (error) {
        console.error(\`❌ \${template.name} 실패: \${error.message}\`);
      }
    }
    
    console.log('🎉 모든 템플릿 업로드 완료!');
    alert('✅ 템플릿 업로드 완료!');
    
  } catch (error) {
    console.error('❌ 업로드 실패:', error);
    alert(\`❌ 실패: \${error.message}\`);
  }
})();
    `;
    
    // 클립보드에 복사
    navigator.clipboard.writeText(script).then(() => {
      setMessage('간단한 스크립트가 클립보드에 복사되었습니다! F12 → Console에서 붙여넣고 실행하세요.');
      setMessageType('success');
    }).catch(() => {
      setMessage('스크립트 복사에 실패했습니다. 수동으로 복사해주세요.');
      setMessageType('warning');
    });
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Firebase Storage 템플릿 업로드
        </Typography>
        
        <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
          개발자 모드에서 만든 템플릿들을 Firebase Storage에 업로드하여 배포 환경에서도 동일하게 사용할 수 있습니다.
        </Typography>

        {uploading && (
          <Box sx={{ mb: 3 }}>
            <LinearProgress variant="determinate" value={uploadProgress} />
            <Typography variant="body2" sx={{ mt: 1 }}>
              {progressStep}
            </Typography>
          </Box>
        )}
        
        {message && (
          <Alert severity={messageType} sx={{ mb: 3 }}>
            {message}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* 브라우저 콘솔 스크립트 */}
          <Grid item xs={12}>
            <Card sx={{ bgcolor: '#f5f5f5' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  🔧 권한 문제 해결 방법
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Firebase Storage 권한 문제가 발생하는 경우, 브라우저 콘솔에서 직접 실행할 수 있는 스크립트를 사용하세요.
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  variant="contained"
                  onClick={generateConsoleScript}
                  fullWidth
                >
                  브라우저 콘솔용 스크립트 복사
                </Button>
              </CardActions>
            </Card>
          </Grid>

          {/* 일괄 업로드 */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  모든 템플릿 일괄 업로드
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  public 폴더의 모든 템플릿을 Firebase Storage에 업로드합니다.
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  variant="contained"
                  startIcon={<CloudUploadIcon />}
                  onClick={handleBulkUpload}
                  disabled={uploading}
                  fullWidth
                >
                  모든 템플릿 업로드
                </Button>
              </CardActions>
            </Card>
          </Grid>

          {/* 개별 템플릿 업로드 */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  기성금청구서 템플릿
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  NEWgisung.xlsx
                </Typography>
              </CardContent>
              <CardActions>
                <input
                  accept=".xlsx"
                  style={{ display: 'none' }}
                  id="gisung-template-upload"
                  type="file"
                  onChange={(e) => handleFileUpload(e, 'NEWgisung.xlsx')}
                  disabled={uploading}
                />
                <label htmlFor="gisung-template-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<UploadIcon />}
                    disabled={uploading}
                    fullWidth
                  >
                    업로드
                  </Button>
                </label>
              </CardActions>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  견적서 템플릿
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  견적서.xlsx
                </Typography>
              </CardContent>
              <CardActions>
                <input
                  accept=".xlsx"
                  style={{ display: 'none' }}
                  id="estimate-template-upload"
                  type="file"
                  onChange={(e) => handleFileUpload(e, '견적서.xlsx')}
                  disabled={uploading}
                />
                <label htmlFor="estimate-template-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<UploadIcon />}
                    disabled={uploading}
                    fullWidth
                  >
                    업로드
                  </Button>
                </label>
              </CardActions>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  납품계약서 템플릿
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  납품계약서 갑지.xlsx
                </Typography>
              </CardContent>
              <CardActions>
                <input
                  accept=".xlsx"
                  style={{ display: 'none' }}
                  id="contract-template-upload"
                  type="file"
                  onChange={(e) => handleFileUpload(e, '납품계약서 갑지.xlsx')}
                  disabled={uploading}
                />
                <label htmlFor="contract-template-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<UploadIcon />}
                    disabled={uploading}
                    fullWidth
                  >
                    업로드
                  </Button>
                </label>
              </CardActions>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ mt: 4, p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>
            📋 업로드 완료 후 해야 할 일
          </Typography>
          <Typography variant="body2" component="div">
            <ol>
              <li>모든 템플릿이 성공적으로 업로드되었는지 확인</li>
              <li>기성금청구서, 견적서, 납품계약서 기능 테스트</li>
              <li>문제가 없으면 Firebase Storage 보안 규칙을 다시 제한</li>
              <li>배포 후 모든 기능이 정상 작동하는지 확인</li>
            </ol>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default TemplateUpload; 