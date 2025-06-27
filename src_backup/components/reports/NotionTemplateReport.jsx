import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Chip,
  Divider
} from '@mui/material';
import {
  Description as ReportIcon,
  Article as TemplateIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import notionService from '../../services/notionService';

const NotionTemplateReport = () => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateData, setTemplateData] = useState({});
  const [reportHtml, setReportHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewDialog, setPreviewDialog] = useState(false);
  const [settingsDialog, setSettingsDialog] = useState(false);

  // 기본 데이터 필드들
  const [reportData, setReportData] = useState({
    프로젝트명: '',
    현장명: '',
    보고자: '',
    보고일: new Date().toLocaleDateString('ko-KR'),
    진행상황: '',
    특이사항: '',
    다음계획: ''
  });

  // 템플릿 목록 가져오기
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await notionService.getTemplatesFromDatabase();
      setTemplates(response.results || []);
    } catch (error) {
      console.error('템플릿 로드 실패:', error);
      setError('템플릿을 불러올 수 없습니다. Notion API 설정을 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  // 템플릿 선택 시 미리보기
  const handleTemplateSelect = async (templateId) => {
    if (!templateId) return;
    
    setSelectedTemplate(templateId);
    setLoading(true);
    
    try {
      const html = await notionService.convertTemplateToReport(templateId, reportData);
      setReportHtml(html);
    } catch (error) {
      console.error('템플릿 변환 실패:', error);
      setError('템플릿을 변환할 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 데이터 업데이트 시 보고서 재생성
  const handleDataChange = async (field, value) => {
    const newData = { ...reportData, [field]: value };
    setReportData(newData);
    
    if (selectedTemplate) {
      try {
        const html = await notionService.convertTemplateToReport(selectedTemplate, newData);
        setReportHtml(html);
      } catch (error) {
        console.error('보고서 업데이트 실패:', error);
      }
    }
  };

  // 보고서 미리보기
  const handlePreview = () => {
    setPreviewDialog(true);
  };

  // PDF 다운로드
  const handleDownloadPDF = () => {
    const element = document.createElement('div');
    element.innerHTML = reportHtml;
    element.style.padding = '20px';
    element.style.fontFamily = 'Arial, sans-serif';
    
    // jsPDF를 사용한 PDF 생성
    const { jsPDF } = require('jspdf');
    const pdf = new jsPDF();
    
    pdf.html(element, {
      callback: function(pdf) {
        pdf.save(`보고서_${reportData.현장명 || '제목없음'}_${new Date().toISOString().split('T')[0]}.pdf`);
      }
    });
  };

  // Notion에 보고서 업로드
  const handleUploadToNotion = async () => {
    if (!selectedTemplate) {
      alert('템플릿을 선택해주세요.');
      return;
    }

    setLoading(true);
    
    try {
      const title = `${reportData.현장명} - ${reportData.보고일} 보고서`;
      const properties = {
        'Status': {
          select: {
            name: '완료'
          }
        },
        'Type': {
          select: {
            name: 'Report'
          }
        }
      };
      
      await notionService.createPageFromTemplate(selectedTemplate, title, properties);
      alert('Notion에 보고서가 업로드되었습니다.');
    } catch (error) {
      console.error('Notion 업로드 실패:', error);
      alert('Notion 업로드에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <TemplateIcon sx={{ fontSize: 32, color: '#1976d2' }} />
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Notion 템플릿 보고서
        </Typography>
        <Button
          startIcon={<RefreshIcon />}
          onClick={loadTemplates}
          disabled={loading}
          variant="outlined"
          size="small"
        >
          새로고침
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* 템플릿 선택 및 설정 */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: 'fit-content' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                템플릿 선택
              </Typography>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>템플릿 선택</InputLabel>
                <Select
                  value={selectedTemplate}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  disabled={loading}
                >
                  {templates.map((template) => (
                    <MenuItem key={template.id} value={template.id}>
                      {template.properties?.Title?.title?.[0]?.plain_text || '제목 없음'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Typography variant="subtitle2" sx={{ mb: 2, color: '#666' }}>
                보고서 데이터 입력
              </Typography>

              {Object.keys(reportData).map((field) => (
                <TextField
                  key={field}
                  label={field}
                  value={reportData[field]}
                  onChange={(e) => handleDataChange(field, e.target.value)}
                  fullWidth
                  size="small"
                  sx={{ mb: 2 }}
                  multiline={field.includes('사항') || field.includes('계획')}
                  rows={field.includes('사항') || field.includes('계획') ? 3 : 1}
                />
              ))}

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  startIcon={<ReportIcon />}
                  onClick={handlePreview}
                  disabled={!selectedTemplate || loading}
                  fullWidth
                >
                  미리보기
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={handleDownloadPDF}
                  disabled={!reportHtml || loading}
                  fullWidth
                >
                  PDF 다운로드
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<SettingsIcon />}
                  onClick={() => setSettingsDialog(true)}
                  fullWidth
                >
                  Notion 설정
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 보고서 미리보기 */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                보고서 미리보기
              </Typography>
              
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : reportHtml ? (
                <Box
                  sx={{
                    border: '1px solid #ddd',
                    borderRadius: 2,
                    p: 3,
                    minHeight: 400,
                    backgroundColor: '#fff',
                    color: '#333'
                  }}
                  dangerouslySetInnerHTML={{ __html: reportHtml }}
                />
              ) : (
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  py: 8,
                  color: '#666'
                }}>
                  <TemplateIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    템플릿을 선택해주세요
                  </Typography>
                  <Typography variant="body2">
                    왼쪽에서 템플릿을 선택하면 미리보기가 표시됩니다.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 미리보기 다이얼로그 */}
      <Dialog
        open={previewDialog}
        onClose={() => setPreviewDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>보고서 미리보기</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              border: '1px solid #ddd',
              borderRadius: 2,
              p: 3,
              backgroundColor: '#fff',
              color: '#333',
              maxHeight: 600,
              overflow: 'auto'
            }}
            dangerouslySetInnerHTML={{ __html: reportHtml }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialog(false)}>닫기</Button>
          <Button onClick={handleDownloadPDF} variant="contained">
            PDF 다운로드
          </Button>
          <Button onClick={handleUploadToNotion} variant="contained" color="secondary">
            Notion에 업로드
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notion 설정 다이얼로그 */}
      <Dialog
        open={settingsDialog}
        onClose={() => setSettingsDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Notion API 설정</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Notion API 연동을 위해 다음 설정이 필요합니다:
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              1. Notion Integration Token
            </Typography>
            <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
              Notion 개발자 페이지에서 Integration을 생성하고 토큰을 발급받으세요.
            </Typography>
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              2. Database ID
            </Typography>
            <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
              보고서를 저장할 Notion 데이터베이스의 ID를 입력하세요.
            </Typography>
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              3. Template Page ID
            </Typography>
            <Typography variant="body2" sx={{ color: '#666' }}>
              템플릿으로 사용할 Notion 페이지의 ID를 입력하세요.
            </Typography>
          </Box>
          
          <Alert severity="info" sx={{ mt: 2 }}>
            환경변수 파일(.env)에 다음 변수들을 설정해주세요:
            <br />
            VITE_NOTION_TOKEN=your_integration_token
            <br />
            VITE_NOTION_DATABASE_ID=your_database_id
            <br />
            VITE_NOTION_TEMPLATE_PAGE_ID=your_template_page_id
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsDialog(false)}>닫기</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NotionTemplateReport; 