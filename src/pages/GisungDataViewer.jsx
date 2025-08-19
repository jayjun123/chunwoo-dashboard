import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Box,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import { Search as SearchIcon, Download as DownloadIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { getGisungItems, getGisungStatistics, exportGisungData } from '../api/gisung';

const GisungDataViewer = () => {
  const [gisungData, setGisungData] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

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

  // 검색 필터링
  const filteredData = gisungData.filter(item => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      (item.name && item.name.toLowerCase().includes(searchLower)) ||
      (item.specification && item.specification.toLowerCase().includes(searchLower)) ||
      (item.unit && item.unit.toLowerCase().includes(searchLower))
    );
  });

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

  // 숫자 포맷팅
  const formatNumber = (num) => {
    if (!num || num === 0) return '-';
    return num.toLocaleString();
  };

  // 진도율 포맷팅
  const formatProgress = (progress) => {
    if (!progress || progress === 0) return '-';
    return `${progress.toFixed(1)}%`;
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        기성금회기성 데이터 조회
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
        업로드된 기성금회기성 데이터를 조회하고 관리합니다.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

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
                  {formatNumber(statistics.totalContractAmount)}
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
                  {formatNumber(statistics.totalCurrentAmount)}
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
                  {formatProgress(statistics.averageProgress)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 검색 및 액션 버튼 */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          label="검색"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="품명, 규격, 단위로 검색..."
          sx={{ minWidth: 300 }}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
          }}
        />
        
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
          onClick={handleExport}
          disabled={loading || gisungData.length === 0}
          startIcon={<DownloadIcon />}
        >
          데이터 내보내기
        </Button>
      </Box>

      {/* 데이터 테이블 */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>품명</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>규격</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>단위</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="right">계약수량</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="right">계약단가</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="right">계약금액</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="right">전회기성수량</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="right">전회기성금액</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="right">금회기성수량</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="right">금회기성금액</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="right">누계수량</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="right">누계금액</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="right">진도율</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={13} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                    <Typography sx={{ mt: 1 }}>데이터를 불러오는 중...</Typography>
                  </TableCell>
                </TableRow>
              ) : filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} align="center" sx={{ py: 4 }}>
                    <Typography color="textSecondary">
                      {searchTerm ? '검색 결과가 없습니다.' : '데이터가 없습니다.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((item, index) => (
                  <TableRow key={item.id || index} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {item.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="textSecondary">
                        {item.specification || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={item.unit || '-'} 
                        size="small" 
                        variant="outlined"
                        color="primary"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {formatNumber(item.contractQuantity)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {formatNumber(item.contractUnitPrice)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {formatNumber(item.contractAmount)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {formatNumber(item.previousQuantity)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {formatNumber(item.previousAmount)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'primary.main' }}>
                        {formatNumber(item.currentQuantity)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'primary.main' }}>
                        {formatNumber(item.currentAmount)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {formatNumber(item.totalQuantity)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {formatNumber(item.totalAmount)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Chip 
                        label={formatProgress(item.progress)} 
                        size="small" 
                        color={item.progress >= 100 ? 'success' : item.progress >= 50 ? 'warning' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 결과 요약 */}
      {filteredData.length > 0 && (
        <Box sx={{ mt: 2, textAlign: 'right' }}>
          <Typography variant="body2" color="textSecondary">
            총 {filteredData.length}개 항목
            {searchTerm && ` (검색어: "${searchTerm}")`}
          </Typography>
        </Box>
      )}
    </Container>
  );
};

export default GisungDataViewer;
