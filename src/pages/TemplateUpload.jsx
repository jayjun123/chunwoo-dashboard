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
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { storage } from '../firebase';

const TemplateUpload = () => {
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [progressStep, setProgressStep] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedTemplates, setUploadedTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Firebase Storage에서 템플릿 목록 가져오기
  const loadUploadedTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const templatesRef = ref(storage, 'templates');
      const result = await listAll(templatesRef);
      
      const templates = await Promise.all(
        result.items.map(async (item) => {
          try {
            const downloadURL = await getDownloadURL(item);
            return {
              name: item.name,
              url: downloadURL,
              fullPath: item.fullPath
            };
          } catch (error) {
            console.warn(`템플릿 ${item.name} URL 가져오기 실패:`, error);
            return {
              name: item.name,
              url: null,
              fullPath: item.fullPath
            };
          }
        })
      );
      
      setUploadedTemplates(templates);
      console.log('📋 업로드된 템플릿 목록:', templates);
    } catch (error) {
      console.error('템플릿 목록 로드 실패:', error);
      setMessage('템플릿 목록을 불러오는데 실패했습니다: ' + error.message);
      setMessageType('error');
    } finally {
      setLoadingTemplates(false);
    }
  };

  // 컴포넌트 마운트 시 템플릿 목록 로드
  React.useEffect(() => {
    loadUploadedTemplates();
  }, []);

  // templateUrls.js 파일 내용 생성
  const generateTemplateUrlsFile = () => {
    const currentDate = new Date().toISOString();
    const projectId = 'chunwooo-edf9f'; // Firebase 프로젝트 ID
    
    let fileContent = `// Firebase Storage 템플릿 다운로드 URL
// 생성일: ${currentDate}
// 프로젝트: ${projectId}

export const templateUrls = {`;

    // 템플릿 매핑 규칙
    const templateMapping = {
      'NEW.xlsx': '(N)기성금청구서',
      'LONG.xlsx': '(L)기성금청구서',
      'Ngyunjuk.xlsx': '(N)견적서',
      'Lgyunjuk.xlsx': '(L)견적서',
      'Nnapfoom.xlsx': '(N)납품계약서',
      'Lnapfoom.xlsx': '(L)납품계약서'
    };

    uploadedTemplates.forEach(template => {
      if (template.url && templateMapping[template.name]) {
        const key = templateMapping[template.name];
        fileContent += `\n  // ${template.name}\n`;
        fileContent += `  "${key}": "${template.url}",`;
      }
    });

    fileContent += `\n};

// 사용 예시:
// import { templateUrls } from './templateUrls';
// const estimateNUrl = templateUrls['(N)견적서'];
// const estimateLUrl = templateUrls['(L)견적서'];
// const contractNUrl = templateUrls['(N)납품계약서'];
// const contractLUrl = templateUrls['(L)납품계약서'];
// const gisungNUrl = templateUrls['(N)기성금청구서'];
// const gisungLUrl = templateUrls['(L)기성금청구서'];

// 템플릿 타입별 설명
export const templateDescriptions = {`;

    uploadedTemplates.forEach(template => {
      if (template.url && templateMapping[template.name]) {
        const key = templateMapping[template.name];
        const description = key.includes('N)') ? 
          `${key.replace(/[()]/g, '')} (물량 20개 이하)` : 
          `${key.replace(/[()]/g, '')} (물량 21개 이상)`;
        fileContent += `\n  "${key}": "${description}",`;
      }
    });

    fileContent += `\n};`;

    return fileContent;
  };

  // templateUrls.js 파일 내용 복사
  const copyTemplateUrlsFile = () => {
    const fileContent = generateTemplateUrlsFile();
    navigator.clipboard.writeText(fileContent).then(() => {
      setMessage('templateUrls.js 파일 내용이 클립보드에 복사되었습니다! src/utils/templateUrls.js 파일을 업데이트하세요.');
      setMessageType('success');
    }).catch(() => {
      setMessage('파일 내용 복사에 실패했습니다.');
      setMessageType('error');
    });
  };

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
      
      // 템플릿 목록 새로고침
      await loadUploadedTemplates();

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
        { name: 'NEW.xlsx', path: '/NEW.xlsx', description: '기성금청구서 N타입 (20개 이하 물량)' },
        { name: 'LONG.xlsx', path: '/LONG.xlsx', description: '기성금청구서 L타입 (21개 이상 물량)' },
        { name: 'Ngyunjuk.xlsx', path: '/Ngyunjuk.xlsx', description: '견적서 N타입' },
        { name: 'Lgyunjuk.xlsx', path: '/Lgyunjuk.xlsx', description: '견적서 L타입' },
        { name: 'Nnapfoom.xlsx', path: '/Nnapfoom.xlsx', description: '납품계약서 N타입' },
        { name: 'Lnapfoom.xlsx', path: '/Lnapfoom.xlsx', description: '납품계약서 L타입' }
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
        // 템플릿 목록 새로고침
        await loadUploadedTemplates();
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
      { name: 'NEW.xlsx', path: '/NEW.xlsx' },
      { name: 'LONG.xlsx', path: '/LONG.xlsx' },
      { name: 'Ngyunjuk.xlsx', path: '/Ngyunjuk.xlsx' },
      { name: 'Lgyunjuk.xlsx', path: '/Lgyunjuk.xlsx' },
      { name: 'Nnapfoom.xlsx', path: '/Nnapfoom.xlsx' },
      { name: 'Lnapfoom.xlsx', path: '/Lnapfoom.xlsx' }
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
          {/* 업로드된 템플릿 목록 */}
          <Grid item xs={12}>
            <Card sx={{ bgcolor: '#f8f9fa' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📋 업로드된 템플릿 목록
                </Typography>
                {loadingTemplates ? (
                  <Typography variant="body2" color="text.secondary">
                    템플릿 목록을 불러오는 중...
                  </Typography>
                ) : uploadedTemplates.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    업로드된 템플릿이 없습니다.
                  </Typography>
                ) : (
                  <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                    {uploadedTemplates.map((template, index) => (
                      <Box key={index} sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        p: 1,
                        mb: 1,
                        bgcolor: 'white',
                        borderRadius: 1,
                        border: '1px solid #e0e0e0'
                      }}>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {template.name}
                          </Typography>
                          {template.url && (
                            <Typography variant="caption" color="text.secondary" sx={{ 
                              display: 'block',
                              wordBreak: 'break-all',
                              maxWidth: '400px'
                            }}>
                              {template.url}
                            </Typography>
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {template.url && (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => {
                                navigator.clipboard.writeText(template.url);
                                setMessage(`${template.name} URL이 클립보드에 복사되었습니다.`);
                                setMessageType('success');
                              }}
                            >
                              URL 복사
                            </Button>
                          )}
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={async () => {
                              if (window.confirm(`${template.name}을 삭제하시겠습니까?`)) {
                                try {
                                  const templateRef = ref(storage, template.fullPath);
                                  await deleteObject(templateRef);
                                  setMessage(`${template.name}이 삭제되었습니다.`);
                                  setMessageType('success');
                                  await loadUploadedTemplates();
                                } catch (error) {
                                  console.error('템플릿 삭제 실패:', error);
                                  setMessage(`템플릿 삭제에 실패했습니다: ${error.message}`);
                                  setMessageType('error');
                                }
                              }
                            }}
                          >
                            삭제
                          </Button>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    onClick={loadUploadedTemplates}
                    disabled={loadingTemplates}
                    size="small"
                  >
                    목록 새로고침
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={copyTemplateUrlsFile}
                    disabled={uploadedTemplates.length === 0}
                    size="small"
                  >
                    templateUrls.js 생성
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

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
                  기성금청구서 N타입
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  NEW.xlsx (20개 이하 물량)
                </Typography>
              </CardContent>
              <CardActions>
                <input
                  accept=".xlsx"
                  style={{ display: 'none' }}
                  id="gisung-n-template-upload"
                  type="file"
                  onChange={(e) => handleFileUpload(e, 'NEW.xlsx')}
                  disabled={uploading}
                />
                <label htmlFor="gisung-n-template-upload">
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
                  기성금청구서 L타입
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  LONG.xlsx (21개 이상 물량)
                </Typography>
              </CardContent>
              <CardActions>
                <input
                  accept=".xlsx"
                  style={{ display: 'none' }}
                  id="gisung-l-template-upload"
                  type="file"
                  onChange={(e) => handleFileUpload(e, 'LONG.xlsx')}
                  disabled={uploading}
                />
                <label htmlFor="gisung-l-template-upload">
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
                  견적서 N타입
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Ngyunjuk.xlsx
                </Typography>
              </CardContent>
              <CardActions>
                <input
                  accept=".xlsx"
                  style={{ display: 'none' }}
                  id="estimate-n-template-upload"
                  type="file"
                  onChange={(e) => handleFileUpload(e, 'Ngyunjuk.xlsx')}
                  disabled={uploading}
                />
                <label htmlFor="estimate-n-template-upload">
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
                  견적서 L타입
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Lgyunjuk.xlsx
                </Typography>
              </CardContent>
              <CardActions>
                <input
                  accept=".xlsx"
                  style={{ display: 'none' }}
                  id="estimate-l-template-upload"
                  type="file"
                  onChange={(e) => handleFileUpload(e, 'Lgyunjuk.xlsx')}
                  disabled={uploading}
                />
                <label htmlFor="estimate-l-template-upload">
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
                  납품계약서 N타입
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Nnapfoom.xlsx
                </Typography>
              </CardContent>
              <CardActions>
                <input
                  accept=".xlsx"
                  style={{ display: 'none' }}
                  id="contract-n-template-upload"
                  type="file"
                  onChange={(e) => handleFileUpload(e, 'Nnapfoom.xlsx')}
                  disabled={uploading}
                />
                <label htmlFor="contract-n-template-upload">
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
                  납품계약서 L타입
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Lnapfoom.xlsx
                </Typography>
              </CardContent>
              <CardActions>
                <input
                  accept=".xlsx"
                  style={{ display: 'none' }}
                  id="contract-l-template-upload"
                  type="file"
                  onChange={(e) => handleFileUpload(e, 'Lnapfoom.xlsx')}
                  disabled={uploading}
                />
                <label htmlFor="contract-l-template-upload">
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