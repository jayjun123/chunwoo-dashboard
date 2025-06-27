import React, { useState } from 'react';
import { Box, Button, Typography, Paper, Grid, Alert } from '@mui/material';
import { PictureAsPdf as PdfIcon, Description as ExcelIcon, Download as DownloadIcon } from '@mui/icons-material';
import { exportToPDF, exportToExcel, exportFullGuidePDF } from '../utils/exportUtils';

const PDFTest = () => {
  const [message, setMessage] = useState('');

  // 샘플 데이터 (영문으로 변경)
  const sampleData = [
    { 'Date': '2024-01-15', 'Site': 'Site A', 'Progress': '10M KRW', 'Expense': '8M KRW', 'Rate': '80%' },
    { 'Date': '2024-01-16', 'Site': 'Site B', 'Progress': '15M KRW', 'Expense': '12M KRW', 'Rate': '85%' },
    { 'Date': '2024-01-17', 'Site': 'Site A', 'Progress': '20M KRW', 'Expense': '16M KRW', 'Rate': '90%' },
    { 'Date': '2024-01-18', 'Site': 'Site C', 'Progress': '8M KRW', 'Expense': '6M KRW', 'Rate': '75%' },
  ];

  const handleExportSamplePDF = () => {
    try {
      const result = exportToPDF(sampleData, {
        title: 'Construction Site Progress Report',
        fileName: 'Progress_Sample',
        columns: ['Date', 'Site', 'Progress', 'Expense', 'Rate']
      });
      
      if (result.success) {
        setMessage('✅ PDF file downloaded successfully!');
      } else {
        setMessage('❌ PDF download failed: ' + result.error);
      }
    } catch (error) {
      setMessage('❌ Error occurred: ' + error.message);
    }
  };

  const handleExportSampleExcel = () => {
    try {
      const result = exportToExcel(sampleData, 'Progress', 'Progress_Sample', {
        columnWidths: [
          { wch: 12 }, // Date
          { wch: 10 }, // Site
          { wch: 12 }, // Progress
          { wch: 12 }, // Expense
          { wch: 10 }  // Rate
        ]
      });
      
      if (result.success) {
        setMessage('✅ Excel file downloaded successfully!');
      } else {
        setMessage('❌ Excel download failed: ' + result.error);
      }
    } catch (error) {
      setMessage('❌ Error occurred: ' + error.message);
    }
  };

  const handleExportGuidePDF = () => {
    try {
      exportFullGuidePDF();
      setMessage('✅ 한글 설명서 PDF가 성공적으로 다운로드되었습니다!');
    } catch (error) {
      setMessage('❌ 설명서 PDF 다운로드에 실패했습니다: ' + error.message);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom sx={{ textAlign: 'center', mb: 4 }}>
        📄 PDF/엑셀 내보내기 테스트
      </Typography>

      {message && (
        <Alert severity={message.includes('✅') ? 'success' : 'error'} sx={{ mb: 3 }}>
          {message}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          📊 Sample Data Preview
        </Typography>
        <Box sx={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Date</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Site</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Progress</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Expense</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Rate</th>
              </tr>
            </thead>
            <tbody>
              {sampleData.map((row, index) => (
                <tr key={index}>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row['Date']}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row['Site']}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row['Progress']}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row['Expense']}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row['Rate']}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Button
              variant="contained"
              startIcon={<PdfIcon />}
              onClick={handleExportSamplePDF}
              fullWidth
              sx={{ mb: 1 }}
            >
              📄 Export PDF
            </Button>
            <Typography variant="body2" color="text.secondary">
              Export sample data to PDF<br />
              (English font, table format)
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Button
              variant="contained"
              startIcon={<ExcelIcon />}
              onClick={handleExportSampleExcel}
              fullWidth
              sx={{ mb: 1 }}
            >
              📊 Export Excel
            </Button>
            <Typography variant="body2" color="text.secondary">
              Export sample data to Excel<br />
              (Auto column width)
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={handleExportGuidePDF}
              fullWidth
              sx={{ mb: 1 }}
            >
              📖 한글 설명서 PDF
            </Button>
            <Typography variant="body2" color="text.secondary">
              웹앱 한글 사용 설명서 PDF<br />
              (이모지, 나눔고딕 폰트)
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          💡 사용 방법
        </Typography>
        <Typography variant="body2" paragraph>
          1. <strong>PDF 내보내기</strong>: 샘플 데이터를 PDF로 다운로드합니다.
        </Typography>
        <Typography variant="body2" paragraph>
          2. <strong>엑셀 내보내기</strong>: 샘플 데이터를 엑셀 파일로 다운로드합니다.
        </Typography>
        <Typography variant="body2" paragraph>
          3. <strong>한글 설명서 PDF</strong>: 웹앱의 전체 한글 사용 설명서를 PDF로 다운로드합니다.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          * 모든 파일은 다운로드 폴더에 저장됩니다.
        </Typography>
      </Paper>
    </Box>
  );
};

export default PDFTest; 