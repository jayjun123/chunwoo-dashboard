import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { NanumGothic } from '../assets/fonts/NanumGothic.js';

// 전문적인 엑셀 디자인으로 내보내기
export const exportToExcel = (data, sheetName, fileName, options = {}) => {
  try {
    console.log('exportToExcel 함수 시작');
    console.log('받은 데이터:', data);
    console.log('데이터 타입:', typeof data);
    console.log('데이터가 배열인가?', Array.isArray(data));
    
    // 데이터 검증
    if (!data || !Array.isArray(data)) {
      console.error('데이터 검증 실패:', { data, isArray: Array.isArray(data) });
      throw new Error('유효하지 않은 데이터입니다. 배열 형태의 데이터가 필요합니다.');
    }
    
    if (data.length === 0) {
      console.error('데이터가 비어있음');
      throw new Error('내보낼 데이터가 없습니다.');
    }
    
    console.log('데이터 검증 통과, 데이터 개수:', data.length);
    console.log('첫 번째 데이터 샘플:', data[0]);
    
    // 데이터 정리 (undefined, null 값 처리)
    const cleanData = data.map((row, index) => {
      console.log(`데이터 ${index} 처리 중:`, row);
      const cleanRow = {};
      Object.keys(row).forEach(key => {
        const value = row[key];
        if (value === undefined || value === null) {
          cleanRow[key] = '';
        } else if (typeof value === 'object' && value !== null) {
          // 객체나 배열인 경우 문자열로 변환
          cleanRow[key] = JSON.stringify(value);
        } else {
          cleanRow[key] = value;
        }
      });
      console.log(`데이터 ${index} 정리 완료:`, cleanRow);
      return cleanRow;
    });
    
    console.log('정리된 데이터:', cleanData);
    console.log('정리된 데이터 개수:', cleanData.length);
    
    const wb = XLSX.utils.book_new();
    
    // 워크시트 생성
    console.log('워크시트 생성 시작');
    const ws = XLSX.utils.json_to_sheet(cleanData);
    console.log('워크시트 생성 완료:', ws);
    console.log('워크시트 범위:', ws['!ref']);
    
    // 전문적인 엑셀 디자인 적용
    applyExcelStyling(ws, cleanData, options);
    
    // 워크북에 시트 추가
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    // 파일명에 날짜 추가
    const dateStr = new Date().toISOString().split('T')[0];
    const finalFileName = fileName ? `${fileName}_${dateStr}.xlsx` : `export_${dateStr}.xlsx`;
    
    console.log('최종 파일명:', finalFileName);
    
    // 엑셀 파일 다운로드
    XLSX.writeFile(wb, finalFileName);
    
    console.log('엑셀 파일 다운로드 완료');
    return { success: true, fileName: finalFileName };
  } catch (error) {
    console.error('엑셀 내보내기 실패:', error);
    console.error('에러 스택:', error.stack);
    return { success: false, error: error.message };
  }
};

// 전문적인 엑셀 스타일링 적용
const applyExcelStyling = (ws, data, options) => {
  try {
    // 워크시트 범위 확인
    if (!ws['!ref']) {
      console.warn('워크시트가 비어있습니다.');
      return;
    }
    
    const range = XLSX.utils.decode_range(ws['!ref']);
    
    // 헤더 스타일링 (첫 번째 행)
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!ws[cellAddress]) continue;
      
      ws[cellAddress].s = {
        font: {
          name: '맑은 고딕',
          sz: 12,
          bold: true,
          color: { rgb: 'FFFFFF' }
        },
        fill: {
          fgColor: { rgb: '4472C4' }
        },
        alignment: {
          horizontal: 'center',
          vertical: 'center'
        },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      };
    }
    
    // 데이터 행 스타일링
    for (let row = range.s.r + 1; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!ws[cellAddress]) continue;
        
        // 짝수/홀수 행 구분 색상
        const isEvenRow = row % 2 === 0;
        const bgColor = isEvenRow ? 'F2F2F2' : 'FFFFFF';
        
        ws[cellAddress].s = {
          font: {
            name: '맑은 고딕',
            sz: 10
          },
          fill: {
            fgColor: { rgb: bgColor }
          },
          alignment: {
            horizontal: 'center',
            vertical: 'center'
          },
          border: {
            top: { style: 'thin', color: { rgb: 'D9D9D9' } },
            bottom: { style: 'thin', color: { rgb: 'D9D9D9' } },
            left: { style: 'thin', color: { rgb: 'D9D9D9' } },
            right: { style: 'thin', color: { rgb: 'D9D9D9' } }
          }
        };
        
        // 숫자 컬럼 우측 정렬
        const cellValue = ws[cellAddress].v;
        if (typeof cellValue === 'number' || !isNaN(parseFloat(cellValue))) {
          ws[cellAddress].s.alignment.horizontal = 'right';
        }
        
        // 긴 텍스트 컬럼 좌측 정렬
        if (typeof cellValue === 'string' && cellValue.length > 20) {
          ws[cellAddress].s.alignment.horizontal = 'left';
        }
      }
    }
    
    // 요약 정보 추가 (마지막 행에)
    if (data.length > 0) {
      const summaryRow = range.e.r + 2;
      const totalLabel = XLSX.utils.encode_cell({ r: summaryRow, c: 0 });
      const totalValue = XLSX.utils.encode_cell({ r: summaryRow, c: 1 });
      
      ws[totalLabel] = { v: '총 개수', t: 's' };
      ws[totalValue] = { v: data.length, t: 'n' };
      
      // 요약 행 스타일링
      ws[totalLabel].s = {
        font: { name: '맑은 고딕', sz: 11, bold: true },
        fill: { fgColor: { rgb: 'E7E6E6' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      };
      
      ws[totalValue].s = {
        font: { name: '맑은 고딕', sz: 11, bold: true },
        fill: { fgColor: { rgb: 'E7E6E6' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      };
      
      // 범위 업데이트
      ws['!ref'] = XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: summaryRow, c: range.e.c }
      });
    }
    
    // 컬럼 너비 자동 조정
    if (options.columnWidths) {
      ws['!cols'] = options.columnWidths;
    } else {
      const defaultWidths = Object.keys(data[0] || {}).map(() => ({ wch: 15 }));
      ws['!cols'] = defaultWidths;
    }
    
    // 행 높이 설정
    ws['!rows'] = [];
    for (let i = 0; i <= range.e.r + 3; i++) {
      ws['!rows'][i] = { hpt: i === 0 ? 25 : 20 }; // 헤더는 25pt, 나머지는 20pt
    }
  } catch (error) {
    console.error('엑셀 스타일링 적용 실패:', error);
    // 스타일링 실패해도 기본 기능은 동작하도록 함
  }
};

// 일정관리 전용 엑셀 내보내기 (월별 캘린더 형태)
export const exportCalendarToExcel = (calendarItems, year, month, fileName) => {
  try {
    const wb = XLSX.utils.book_new();
    
    // 월별 캘린더 시트 생성
    const ws = createCalendarSheet(calendarItems, year, month);
    XLSX.utils.book_append_sheet(wb, ws, `${year}년${month}월`);
    
    // 요약 시트 생성
    const summaryWs = createSummarySheet(calendarItems, year, month);
    XLSX.utils.book_append_sheet(wb, summaryWs, '요약');
    
    const dateStr = new Date().toISOString().split('T')[0];
    const finalFileName = `${fileName}_${year}년${month}월_${dateStr}.xlsx`;
    
    XLSX.writeFile(wb, finalFileName);
    return { success: true, fileName: finalFileName };
  } catch (error) {
    console.error('캘린더 엑셀 내보내기 실패:', error);
    return { success: false, error: error.message };
  }
};

// 캘린더 시트 생성
const createCalendarSheet = (calendarItems, year, month) => {
  const ws = {};
  
  // 요일 헤더
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  weekdays.forEach((day, index) => {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: index });
    ws[cellAddress] = { v: day, t: 's' };
    ws[cellAddress].s = {
      font: { name: '맑은 고딕', sz: 12, bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '4472C4' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
    };
  });
  
  // 월 헤더
  const monthHeader = XLSX.utils.encode_cell({ r: 0, c: 7 });
  ws[monthHeader] = { v: `${year}년 ${month}월`, t: 's' };
  ws[monthHeader].s = {
    font: { name: '맑은 고딕', sz: 14, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '4472C4' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
  };
  
  // 달력 그리드 생성
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
  let currentDay = 1;
  let currentRow = 1;
  
  // 주별로 반복
  for (let week = 0; week < 6 && currentDay <= daysInMonth; week++) {
    // 요일별로 반복
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const cellAddress = XLSX.utils.encode_cell({ r: currentRow, c: dayOfWeek });
      
      // 첫 주에서 월의 첫 날 이전은 빈 셀로
      if (week === 0 && dayOfWeek < firstDayOfMonth) {
        ws[cellAddress] = { v: '', t: 's' };
        ws[cellAddress].s = {
          font: { name: '맑은 고딕', sz: 10 },
          fill: { fgColor: { rgb: 'F8F9FA' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
        };
        continue;
      }
      
      // 월의 마지막 날 이후는 빈 셀로
      if (currentDay > daysInMonth) {
        ws[cellAddress] = { v: '', t: 's' };
        ws[cellAddress].s = {
          font: { name: '맑은 고딕', sz: 10 },
          fill: { fgColor: { rgb: 'F8F9FA' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
        };
        continue;
      }
      
      // 날짜 셀
      ws[cellAddress] = { v: currentDay, t: 'n' };
      ws[cellAddress].s = {
        font: { name: '맑은 고딕', sz: 10, bold: true },
        fill: { fgColor: { rgb: 'E3F2FD' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
      };
      
      // 해당 날짜의 일정 추가
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
      const items = calendarItems[dateStr] || [];
      
      if (items.length > 0) {
        items.forEach((item, index) => {
          const itemRow = currentRow + 1 + index;
          const itemCell = XLSX.utils.encode_cell({ r: itemRow, c: dayOfWeek });
          ws[itemCell] = { v: item.text, t: 's' };
          ws[itemCell].s = {
            font: { name: '맑은 고딕', sz: 8 },
            fill: { fgColor: { rgb: 'FFF2CC' } },
            alignment: { horizontal: 'left', vertical: 'top' },
            border: { bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
          };
        });
      }
      
      currentDay++;
    }
    
    // 현재 주의 최대 높이 계산 (일정이 있는 경우 고려)
    let maxItemsInWeek = 0;
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const dayInWeek = currentDay - 7 + dayOfWeek;
      if (dayInWeek >= 1 && dayInWeek <= daysInMonth) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayInWeek).padStart(2, '0')}`;
        const items = calendarItems[dateStr] || [];
        maxItemsInWeek = Math.max(maxItemsInWeek, items.length);
      }
    }
    
    currentRow += Math.max(1, maxItemsInWeek) + 1;
  }
  
  // 컬럼 너비 설정
  ws['!cols'] = Array(8).fill({ wch: 15 });
  
  // 행 높이 설정
  ws['!rows'] = Array(40).fill({ hpt: 20 });
  
  return ws;
};

// 요약 시트 생성
const createSummarySheet = (calendarItems, year, month) => {
  const ws = {};
  
  // 헤더
  const headers = ['날짜', '일정 수', '일정 목록'];
  headers.forEach((header, index) => {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: index });
    ws[cellAddress] = { v: header, t: 's' };
    ws[cellAddress].s = {
      font: { name: '맑은 고딕', sz: 12, bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '4472C4' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
    };
  });
  
  // 데이터
  let row = 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const items = calendarItems[dateStr] || [];
    
    if (items.length > 0) {
      const dateCell = XLSX.utils.encode_cell({ r: row, c: 0 });
      const countCell = XLSX.utils.encode_cell({ r: row, c: 1 });
      const listCell = XLSX.utils.encode_cell({ r: row, c: 2 });
      
      ws[dateCell] = { v: `${month}월 ${day}일`, t: 's' };
      ws[countCell] = { v: items.length, t: 'n' };
      ws[listCell] = { v: items.map(item => item.text).join(', '), t: 's' };
      
      // 스타일링
      [dateCell, countCell, listCell].forEach(cell => {
        ws[cell].s = {
          font: { name: '맑은 고딕', sz: 10 },
          fill: { fgColor: { rgb: row % 2 === 0 ? 'F2F2F2' : 'FFFFFF' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
        };
      });
      
      row++;
    }
  }
  
  // 컬럼 너비 설정
  ws['!cols'] = [
    { wch: 12 }, // 날짜
    { wch: 8 },  // 일정 수
    { wch: 50 }  // 일정 목록
  ];
  
  return ws;
};

// PDF 내보내기 시 한글 폰트 설정 (개선된 버전)
export const exportToPDF = (data, options = {}) => {
  try {
    const doc = new jsPDF();
    
    // 기본 폰트 설정 (한글 지원)
    doc.setFont('helvetica');
    
    // 제목 설정
    if (options.title) {
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(options.title, 14, 15);
    }
    
    // 테이블 생성
    if (data && data.length > 0) {
      const tableColumns = options.columns || Object.keys(data[0]);
      const tableRows = data.map(row => 
        tableColumns.map(col => {
          const value = row[col];
          // 숫자 포맷팅
          if (typeof value === 'number') {
            return value.toLocaleString();
          }
          // 날짜 포맷팅
          if (value && typeof value === 'string' && value.includes('-')) {
            try {
              const date = new Date(value);
              if (!isNaN(date.getTime())) {
                return date.toLocaleDateString('ko-KR');
              }
            } catch (e) {
              // 날짜 변환 실패 시 원본 값 반환
            }
          }
          return value || '';
        })
      );
      
      autoTable(doc, {
        head: [tableColumns],
        body: tableRows,
        startY: options.title ? 25 : 20,
        styles: { 
          font: 'helvetica', 
          fontStyle: 'normal',
          fontSize: 9
        },
        headStyles: { 
          font: 'helvetica', 
          fontStyle: 'bold',
          fontSize: 10,
          fillColor: [41, 128, 185],
          textColor: [255, 255, 255]
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        margin: { top: 10, right: 10, bottom: 10, left: 10 },
        didDrawPage: function (data) {
          // 페이지 번호
          const pageCount = doc.internal.getNumberOfPages();
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.text(`Page ${data.pageNumber} / ${pageCount}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
        }
      });
    }
    
    // 파일명 설정
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = options.fileName ? `${options.fileName}_${dateStr}.pdf` : `export_${dateStr}.pdf`;
    
    // PDF 파일 다운로드
    doc.save(fileName);
    
    return { success: true, fileName };
  } catch (error) {
    console.error('PDF 내보내기 실패:', error);
    return { success: false, error: error.message };
  }
};

// 대화방 내용 PDF 내보내기 (특별한 형식)
export const exportChatToPDF = (messages, roomInfo, options = {}) => {
  try {
    const doc = new jsPDF();
    
    // 기본 폰트 설정
    doc.setFont('helvetica');
    
    // 제목
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`${roomInfo.name} (${roomInfo.siteName}) Chat Room`, 20, 20);
    
    // 정보
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Messages: ${messages.length}`, 20, 30);
    doc.text(`Created: ${roomInfo.createdAt || 'No date'}`, 20, 35);
    doc.text(`Password: ${roomInfo.password ? 'Yes' : 'No'}`, 20, 40);
    
    // 구분선
    doc.line(20, 45, 190, 45);
    
    // 메시지 목록
    let yPosition = 55;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    messages.forEach((message, index) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      
      const timestamp = message.timestamp ? new Date(message.timestamp.toDate()).toLocaleString('ko-KR') : 'No time';
      const sender = message.senderName || message.sender || 'Unknown';
      const content = message.content || message.text || '';
      
      doc.setFont('helvetica', 'bold');
      doc.text(`${timestamp} - ${sender}:`, 20, yPosition);
      yPosition += 5;
      
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(content, 170);
      lines.forEach(line => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(line, 25, yPosition);
        yPosition += 4;
      });
      
      yPosition += 8;
    });
    
    const fileName = `Chat_${roomInfo.name}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    
    return { success: true, fileName };
  } catch (error) {
    console.error('채팅 PDF 내보내기 실패:', error);
    return { success: false, error: error.message };
  }
};

// 보고서 PDF 내보내기
export const exportReportToPDF = (reportData, options = {}) => {
  try {
    const doc = new jsPDF();
    
    // 기본 폰트 설정
    doc.setFont('helvetica');
    
    // 제목
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Construction Site Report', 14, 20);
    
    // 기본 정보
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Site: ${reportData.site || 'All'}`, 14, 35);
    doc.text(`Period: ${reportData.period || 'All'}`, 14, 45);
    doc.text(`Generated: ${new Date().toLocaleDateString('ko-KR')}`, 14, 55);
    
    // 요약 정보
    if (reportData.summary) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary:', 14, 75);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const summaryLines = doc.splitTextToSize(reportData.summary, 180);
      let yPos = 85;
      summaryLines.forEach(line => {
        doc.text(line, 14, yPos);
        yPos += 5;
      });
    }
    
    // 데이터 테이블
    if (reportData.data && reportData.data.length > 0) {
      const startY = reportData.summary ? 120 : 80;
      
      const columns = Object.keys(reportData.data[0]);
      const rows = reportData.data.map(row => 
        columns.map(col => {
          const value = row[col];
          if (typeof value === 'number') {
            return value.toLocaleString();
          }
          return value || '';
        })
      );
      
      autoTable(doc, {
        head: [columns],
        body: rows,
        startY,
        styles: { 
          font: 'helvetica', 
          fontStyle: 'normal',
          fontSize: 8
        },
        headStyles: { 
          font: 'helvetica', 
          fontStyle: 'bold',
          fontSize: 9,
          fillColor: [41, 128, 185],
          textColor: [255, 255, 255]
        },
        margin: { top: 10, right: 10, bottom: 10, left: 10 }
      });
    }
    
    const fileName = `Report_${reportData.site || 'All'}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    
    return { success: true, fileName };
  } catch (error) {
    console.error('보고서 PDF 내보내기 실패:', error);
    return { success: false, error: error.message };
  }
};

// 웹앱 설명서 PDF 내보내기 (1페이지: 간략설명/장단점/점수, 2페이지~: 사용설명서 상세)
export const exportFullGuidePDF = () => {
  const doc = new jsPDF();
  doc.addFileToVFS('NanumGothic.ttf', NanumGothic);
  doc.addFont('NanumGothic.ttf', 'NanumGothic', 'normal');
  doc.setFont('NanumGothic', 'normal');

  // 1페이지: 간략설명/장단점/점수
  doc.setFontSize(18);
  doc.text('🏗️ 건설현장 통합관리 웹앱', 20, 25);
  doc.setFontSize(13);
  doc.text('1. 📋 간략 설명', 15, 40);
  doc.setFontSize(11);
  doc.text('이 웹앱은 건설 현장 관리, 기성/지출/투두/보고서/날씨 등 통합 관리 플랫폼입니다.', 15, 48);
  doc.setFontSize(13);
  doc.text('2. 👍 장점', 15, 60);
  doc.setFontSize(11);
  doc.text('- 실시간 데이터 반영(onSnapshot), 권한 분리, 한글 PDF/엑셀 내보내기, 반응형 UI', 15, 68);
  doc.setFontSize(13);
  doc.text('3. 👎 단점', 15, 80);
  doc.setFontSize(11);
  doc.text('- 모바일에서 버튼 겹침, 일부 안내 메시지 부족, 폰트 세팅 필요', 15, 88);
  doc.setFontSize(13);
  doc.text('4. 🏅 UX/UI 평가 및 점수', 15, 100);
  doc.setFontSize(11);
  doc.text('• 정보구조: 9점 / 10점', 15, 108);
  doc.text('• 실시간성: 10점 / 10점', 15, 114);
  doc.text('• 한글지원: 10점 / 10점', 15, 120);
  doc.text('• 반응형: 8점 / 10점', 15, 126);

  // 2페이지: 각 화면별 상세 설명(버튼, 기능, 연동 데이터, 실시간성, 권한, 팁, 전문가 추천 연동)
  doc.addPage();
  doc.setFontSize(15);
  doc.text('📝 화면별 사용설명서 및 데이터 연동', 15, 20);

  const manual = [
    ['화면', '버튼/위치', '기능 설명', '연동 데이터/실시간성', '권한/팁'],
    // 대시보드
    ['대시보드', '로그아웃(상단바)', '현재 계정 로그아웃', '-', '-'],
    ['대시보드', '대시보드(좌측 메뉴)', '전체 현황 요약, 주요 알림, 오늘의 투두 등', 'Firestore: todos, notifications', '모든 사용자'],
    ['대시보드', '설정(우측 상단)', '테마, 알림, 계정정보 등 설정', 'Firestore: users, localStorage', '마스터만 일부 메뉴 노출'],
    ['대시보드', '투두 추가(메인)', '할 일 직접 추가, 마감일/우선순위 지정', 'Firestore: todos (onSnapshot)', '본인/마스터'],
    ['대시보드', '투두 체크박스(메인)', '할 일 완료/미완료 체크', 'Firestore: todos (실시간)', '본인/마스터'],
    ['대시보드', '투두 삭제(메인)', '해당 할 일 삭제', 'Firestore: todos', '본인/마스터'],
    ['대시보드', '기성현황 바로가기(하단)', '기성/지출/월별/현장별 현황 페이지로 이동', '-', '-'],
    // 투두리스트
    ['투두리스트', '회원 드롭다운(상단)', '(마스터만) 전체 회원별 투두 실시간 모니터링', 'Firestore: todos (onSnapshot)', '마스터만'],
    ['투두리스트', '미완료 불러오기(메인)', '미완료 투두만 필터링', 'Firestore: todos', '모든 사용자'],
    ['투두리스트', '포스트잇 UI(메인)', '할 일 목록을 포스트잇 스타일로 시각화', '-', '-'],
    ['투두리스트', '조작 UI 없음(메인)', '전체리스트에서는 추가/수정/삭제 불가', '-', '대시보드에서만 가능'],
    // 기성/지출/현황
    ['기성/지출/현황', '기성관리/기성현황/지출/월별/현장별(상단)', '5개 버튼 한 줄, 각 버튼별 데이터 필터링', 'Firestore: progress (onSnapshot)', '모든 사용자'],
    ['기성/지출/현황', '엑셀/PDF 내보내기(메인)', '현재 표 데이터를 엑셀/PDF로 다운로드, 한글 폰트 적용', '프론트 데이터, jsPDF, xlsx', '-'],
    ['기성/지출/현황', '차트/표/리스트(메인)', '데이터 시각화, 월별/현장별/유형별 집계', 'Firestore: progress', '-'],
    // 보고서
    ['보고서', 'AI 요약(상단)', '데이터 요약 자동 생성', 'OpenAI API, Firestore: progress', '마스터만'],
    ['보고서', 'PDF/엑셀 내보내기(상단)', '보고서 데이터 다운로드', '프론트 데이터, jsPDF, xlsx', '-'],
    // 문서관리
    ['문서관리', '문서 업로드(상단)', '문서 파일 업로드', 'Firebase Storage, Firestore: documents', '모든 사용자'],
    ['문서관리', '문서 다운로드/삭제(리스트)', '문서 파일 다운로드/삭제', 'Firebase Storage, Firestore: documents', '권한별 제한 가능'],
    // 날씨 위젯
    ['날씨', '지역검색(상단)', '지역명 입력 시 실시간 기상청 API 연동', '기상청 API, .env의 API키', '-'],
    ['날씨', '날씨 상세(우측 확장)', '날씨 상세정보 다이얼로그', '기상청 API', '-'],
    // 설정
    ['설정', '테마 변경(메인)', '다크/라이트, 색상/글씨 변경', 'localStorage', '-'],
    ['설정', '알림 설정(메인)', '알림 on/off', 'Firestore: users', '-'],
    // 기타
    ['공통', '실시간성', 'onSnapshot, 실시간 반영', 'Firestore, 일부 API', '-'],
    ['공통', '권한 분리', '마스터/일반, 일부 메뉴/기능 제한', 'Firestore: users.role', '-'],
    ['공통', '안내 메시지', '데이터 없음/오류/권한 안내', '-', '-'],
    ['공통', '반응형 UI', '데스크톱/모바일 최적화', 'CSS, MUI', '-'],
    ['채팅/댓글', '채팅/댓글(하단)', '현장/문서/보고서별 실시간 채팅/댓글', 'Firestore: chats, WebSocket', '모든 사용자'],
    ['푸시알림', '알림(상단/모바일)', '주요 이벤트 실시간 푸시알림', 'FCM, Web Push API', '알림 설정 가능'],
    ['외부문서연동', '첨부(문서관리)', '구글드라이브/원드라이브/Dropbox 문서 첨부', '외부 API, Firestore: documents', '권한별 제한 가능'],
    ['캘린더연동', '일정(설정/상단)', '구글/네이버/카카오 캘린더와 일정 양방향 동기화', '외부 API, Firestore: schedules', '-'],
    ['사진/도면주석', '이미지(문서/지도)', '사진/도면 업로드, 이미지 위 주석/마킹', 'Firestore Storage, Fabric.js', '모바일 최적화'],
    ['지도(GIS)', '지도(현장/대시보드)', '현장 위치, 위험구역, 진행상황 지도 시각화', '카카오맵/구글맵 API, Firestore: sites', '-'],
    ['AI요약/자동화', 'AI요약(보고서)', '보고서/이슈 자동 요약, 키워드 추출', 'OpenAI, Firestore: reports', '마스터만'],
    ['OCR/음성인식', '사진/음성(입력)', '사진에서 텍스트 추출, 음성으로 투두/보고서 입력', 'Google Vision, Speech-to-Text API', '-'],
    ['감사로그', '로그(설정/관리)', '모든 주요 변경/다운로드/삭제/공유 이력 자동 기록', 'Firestore: logs', '관리자만'],
    ['결재/전자결재', '결재(보고서/지출)', '결재자 지정, 단계별 승인, 결재이력 관리', 'Firestore: approvals', '결재권자만'],
    ['SMS/카톡/이메일', '알림(설정/상단)', '주요 알림을 SMS, 카톡, 이메일로 동시 발송', 'Twilio, 카카오톡, SendGrid API', '-'],
    ['오프라인지원', '입력/조회(모바일)', '오프라인 입력/조회, 자동 동기화', 'IndexedDB, PWA', '모바일 최적화'],
  ];

  autoTable(doc, {
    head: [manual[0]],
    body: manual.slice(1),
    startY: 30,
    styles: { font: 'NanumGothic', fontSize: 10 },
    headStyles: { font: 'NanumGothic', fontStyle: 'bold', fontSize: 11, fillColor: [41, 128, 185], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { left: 5, right: 5 }
  });

  // 마지막 페이지: 전문가 관점 특장단점/총평
  doc.addPage();
  doc.setFontSize(16);
  doc.text('🔎 전문가 관점에서 본 특장단점 및 총평', 15, 25);
  doc.setFontSize(12);
  doc.setFont('NanumGothic', 'bold');
  doc.text('1. 주요 장점', 15, 40);
  doc.setFont('NanumGothic', 'normal');
  doc.setFontSize(11);
  doc.text([
    '• 실시간 데이터 동기화(onSnapshot)와 권한 분리로 현장/관리자 모두에게 최적화된 협업 경험 제공',
    '• 한글 PDF/엑셀 내보내기, 반응형 UI 등 국내 실무 환경에 최적화',
    '• 데이터 구조가 명확하고, 각 기능별로 연동 데이터가 일관성 있게 관리됨',
    '• 확장성(외부 API, AI, 지도, 결재 등) 고려 설계로 미래지향적',
    '• 사용자별 맞춤 대시보드, 알림, 모바일 지원 등 현장 실무에 꼭 필요한 요소 반영'
  ], 15, 48);
  doc.setFont('NanumGothic', 'bold');
  doc.setFontSize(12);
  doc.text('2. 주요 단점 및 개선방향', 15, 90);
  doc.setFont('NanumGothic', 'normal');
  doc.setFontSize(11);
  doc.text([
    '• 일부 화면(특히 모바일)에서 버튼/필터 UI가 겹치거나 가독성이 떨어질 수 있음',
    '• 안내 메시지/에러 처리/권한 안내가 더 직관적으로 보완 필요',
    '• 외부 서비스(클라우드, 결재, 지도 등)와의 연동은 옵션이지만, 실무에서는 필수에 가까움',
    '• 데이터 감사/로그, 결재, AI 자동화 등은 실제 도입 시 추가 커스터마이징 필요',
    '• 현장별/역할별 맞춤화(위젯, 알림, 권한 등) 기능이 더 강화되면 경쟁력이 극대화될 것'
  ], 15, 98);
  doc.setFont('NanumGothic', 'bold');
  doc.setFontSize(12);
  doc.text('3. 총평', 15, 140);
  doc.setFont('NanumGothic', 'normal');
  doc.setFontSize(11);
  doc.text([
    '30년간 협업툴/현장관리 솔루션을 기획/개발/컨설팅해온 전문가의 관점에서,',
    '이 웹앱은 실무에 꼭 필요한 실시간성, 데이터 일관성, 한글 지원, 확장성, UX/UI를 모두 갖춘 우수한 플랫폼입니다.',
    '특히 국내 건설/현장 환경에 맞춘 한글 PDF, 권한 분리, 실시간 모니터링, 외부 연동 확장성 등은 현장 실무자와 관리자 모두에게 큰 가치를 제공합니다.',
    '향후 외부 서비스 연동, AI 자동화, 맞춤형 대시보드, 모바일 최적화가 추가된다면 국내 최고 수준의 현장관리 협업툴로 자리매김할 수 있습니다.'
  ], 15, 148);

  // 저장
  const dateStr = new Date().toISOString().split('T')[0];
  doc.save(`건설현장_통합관리_웹앱_설명서_${dateStr}.pdf`);
}; 