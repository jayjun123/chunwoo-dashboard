import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Box,
  Card,
  CardContent,
  Grid,
  List,
  ListItem,
  ListItemText,
  Divider,
  TextField
} from '@mui/material';
import { 
  Upload as UploadIcon, 
  Download as DownloadIcon, 
  Refresh as RefreshIcon,
  Assessment as GisungIcon 
} from '@mui/icons-material';
import { 
  getGisungItems, 
  getGisungStatistics, 
  exportGisungData,
  searchGisungData 
} from '../api/gisung';
import { uploadGisungDataToFirebase } from '../utils/gisungDataUtils';

const GisungDataTest = () => {
  const [gisungData, setGisungData] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [siteName, setSiteName] = useState('');

  // 데이터 로드
  const loadData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const [data, stats] = await Promise.all([
        getGisungItems(),
        getGisungStatistics()
      ]);
      
      setGisungData(data);
      setStatistics(stats);
      console.log('✅ 기성금 데이터 로드 완료');
    } catch (error) {
      console.error('❌ 기성금 데이터 로드 실패:', error);
      setError('데이터를 불러오는데 실패했습니다: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 파일 업로드 처리
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx')) {
      setError('엑셀 파일(.xlsx)만 업로드 가능합니다.');
      return;
    }

    if (!siteName.trim()) {
      setError('현장명을 입력해주세요.');
      return;
    }

    setUploading(true);
    setError('');

    try {
      // 현장명을 기반으로 siteData 생성
      const siteData = {
        name: siteName.trim(),
        id: null // 실제 현장 ID는 나중에 조회
      };
      
      await uploadGisungDataToFirebase(file, siteData);
      setError('');
      // 업로드 후 데이터 새로고침
      await loadData();
    } catch (error) {
      console.error('❌ 파일 업로드 실패:', error);
      setError('파일 업로드에 실패했습니다: ' + error.message);
    } finally {
      setUploading(false);
    }

    // 파일 입력 초기화
    event.target.value = '';
  };

  // 데이터 내보내기
  const handleExport = async () => {
    try {
      await exportGisungData();
    } catch (error) {
      console.error('❌ 데이터 내보내기 실패:', error);
      setError('데이터 내보내기에 실패했습니다: ' + error.message);
    }
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadData();
  }, []);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        기성금회기성 데이터 테스트
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
        기성금회기성 데이터를 업로드하고 테스트할 수 있는 페이지입니다.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* 현장명 입력 */}
      <Box sx={{ mb: 2 }}>
        <TextField
          label="현장명"
          variant="outlined"
          value={siteName}
          onChange={(e) => setSiteName(e.target.value)}
          placeholder="기성금을 업로드할 현장명을 입력하세요"
          fullWidth
          helperText="이전 차수의 누계수량이 자동으로 전회수량으로 설정됩니다"
        />
      </Box>

      {/* 액션 버튼들 */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <input
          type="file"
          accept=".xlsx"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
          id="gisung-upload-test"
          disabled={uploading}
        />
        <label htmlFor="gisung-upload-test">
          <Button
            variant="contained"
            component="span"
            startIcon={uploading ? <CircularProgress size={20} /> : <UploadIcon />}
            disabled={uploading || !siteName.trim()}
          >
            {uploading ? '업로드 중...' : '기성금회기성 파일 업로드'}
          </Button>
        </label>
        
        <Button
          variant="outlined"
          onClick={loadData}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
        >
          새로고침
        </Button>
        
        <Button
          variant="contained"
          color="secondary"
          onClick={handleExport}
          disabled={loading || gisungData.length === 0}
          startIcon={<DownloadIcon />}
        >
          데이터 내보내기
        </Button>
      </Box>

      {/* 통계 카드 */}
      {statistics && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  총 항목 수
                </Typography>
                <Typography variant="h4">
                  {statistics.totalItems}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  계약금액 합계
                </Typography>
                <Typography variant="h4">
                  {statistics.totalContractAmount?.toLocaleString() || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  금회기성 합계
                </Typography>
                <Typography variant="h4">
                  {statistics.totalCurrentAmount?.toLocaleString() || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  평균 진도율
                </Typography>
                <Typography variant="h4">
                  {statistics.averageProgress?.toFixed(1) || 0}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 데이터 목록 */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          기성금회기성 데이터 목록
        </Typography>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : gisungData.length === 0 ? (
          <Alert severity="info">
            업로드된 기성금회기성 데이터가 없습니다. 파일을 업로드해주세요.
          </Alert>
        ) : (
          <List>
            {gisungData.slice(0, 10).map((item, index) => (
              <React.Fragment key={item.id || index}>
                <ListItem>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                          {item.name}
                        </Typography>
                        <Typography variant="body2" color="primary">
                          {item.currentQuantity} {item.unit}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="textSecondary">
                          규격: {item.specification || '-'} | 
                          계약수량: {item.contractQuantity?.toLocaleString() || 0} {item.unit} | 
                          계약단가: {item.contractUnitPrice?.toLocaleString() || 0}원 | 
                          계약금액: {item.contractAmount?.toLocaleString() || 0}원
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          전회기성: {item.previousQuantity?.toLocaleString() || 0} {item.unit} | 
                          금회기성: {item.currentQuantity?.toLocaleString() || 0} {item.unit} | 
                          누계: {item.totalQuantity?.toLocaleString() || 0} {item.unit} | 
                          진도율: {item.progress?.toFixed(1) || 0}%
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
                {index < gisungData.length - 1 && <Divider />}
              </React.Fragment>
            ))}
            {gisungData.length > 10 && (
              <ListItem>
                <ListItemText
                  primary={
                    <Typography variant="body2" color="textSecondary" align="center">
                      ... 외 {gisungData.length - 10}개 항목 더 있음
                    </Typography>
                  }
                />
              </ListItem>
            )}
          </List>
        )}
      </Paper>

      {/* 사용법 안내 */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          사용법
        </Typography>
        <Typography variant="body2" paragraph>
          1. <strong>기성금회기성 파일 업로드</strong>: 기성금 내역서 엑셀 파일을 업로드하면 자동으로 파싱되어 파이어베이스에 저장됩니다.
        </Typography>
        <Typography variant="body2" paragraph>
          2. <strong>자동 연동</strong>: 업로드된 데이터는 기성금청구서 생성과 현장관리 시스템에서 자동으로 사용됩니다.
        </Typography>
        <Typography variant="body2" paragraph>
          3. <strong>데이터 내보내기</strong>: 저장된 데이터를 JSON 형태로 내보낼 수 있습니다.
        </Typography>
        <Typography variant="body2" color="textSecondary">
          💡 기성금회기성 데이터는 페이지에 기록을 남기지 않고 파이어베이스에만 저장되어 데이터로만 사용됩니다.
        </Typography>
      </Paper>
    </Container>
  );
};

export default GisungDataTest;
