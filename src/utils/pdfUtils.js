import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { NanumGothic } from '../assets/fonts/NanumGothic';

// PDF로 내보내기
export const exportToPDF = (data, options = {}) => {
  try {
    console.log('PDF 내보내기 시작');
    
    const doc = new jsPDF();
    
    // 기본 폰트 사용 (안정성 확보)
    doc.setFont('helvetica');
    
    // 제목 추가
    const title = options.title || '데이터 내보내기';
    doc.setFontSize(16);
    doc.text(title, 20, 20);
    
    // 날짜 추가
    const dateStr = new Date().toLocaleDateString('ko-KR');
    doc.setFontSize(10);
    doc.text(`생성일: ${dateStr}`, 20, 30);
    
    // 테이블 데이터 준비
    if (data && data.length > 0) {
      const headers = Object.keys(data[0]);
      const tableData = data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return JSON.stringify(value);
          return String(value);
        })
      );
      
      // 테이블 생성 (기본 폰트 사용)
      autoTable(doc, {
        head: [headers],
        body: tableData,
        startY: 40,
        styles: {
          font: 'helvetica',
          fontSize: 8
        },
        headStyles: {
          fillColor: [66, 114, 196],
          textColor: 255
        },
        columnStyles: {
          0: { cellWidth: 15 }, // No.
          1: { cellWidth: 40 }, // 현장명
          2: { cellWidth: 25 }, // 현장장
          3: { cellWidth: 40 }, // 주소
          4: { cellWidth: 20 }, // 상태
          5: { cellWidth: 20 }, // 착공일
          6: { cellWidth: 20 }, // 준공예정일
          7: { cellWidth: 30 }, // 계약금액
          8: { cellWidth: 15 }, // 진행률
          9: { cellWidth: 30 }  // 비고
        }
      });
    }
    
    // 파일명 생성
    const fileName = options.fileName || `export_${new Date().toISOString().split('T')[0]}.pdf`;
    
    // PDF 다운로드
    doc.save(fileName);
    
    console.log('PDF 내보내기 완료');
    return { success: true, fileName };
  } catch (error) {
    console.error('PDF 내보내기 실패:', error);
    return { success: false, error: error.message };
  }
};

// 현장현황표를 PDF로 내보내기
export const exportSiteStatusToPDF = async (sites, options = {}) => {
  try {
    console.log('현장현황표 PDF 내보내기 시작');
    
    const doc = new jsPDF();
    
    // 기본 폰트 사용 (한글 폰트 문제 해결)
    doc.setFont('helvetica');
    
    // 제목 추가
    doc.setFontSize(18);
    doc.text('Site Status Report', 20, 20);
    
    // 날짜 추가
    const dateStr = new Date().toLocaleDateString('ko-KR');
    doc.setFontSize(10);
    doc.text(`Generated: ${dateStr}`, 20, 30);
    
    // 요약 정보 추가
    const totalSites = sites.length;
    const inProgressSites = sites.filter(site => site.status === '진행중').length;
    const completedSites = sites.filter(site => site.status === '완료').length;
    const plannedSites = sites.filter(site => site.status === '계획중').length;
    
    doc.setFontSize(12);
    doc.text(`Total Sites: ${totalSites}`, 20, 45);
    doc.text(`In Progress: ${inProgressSites}`, 20, 55);
    doc.text(`Completed: ${completedSites}`, 20, 65);
    doc.text(`Planned: ${plannedSites}`, 20, 75);
    
    // 현장 데이터 테이블
    const tableData = sites.map((site, index) => [
      index + 1,
      site.name || '',
      site.manager || '',
      site.status || '',
      site.progress ? site.progress + '%' : '',
      site.contractAmount ? Number(site.contractAmount).toLocaleString() + '원' : '',
      site.note || ''
    ]);
    
    autoTable(doc, {
      head: [['No.', 'Site Name', 'Manager', 'Status', 'Progress', 'Contract Amount', 'Note']],
      body: tableData,
      startY: 85,
      styles: {
        font: 'helvetica',
        fontSize: 8
      },
      headStyles: {
        fillColor: [66, 114, 196],
        textColor: 255
      },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 40 },
        2: { cellWidth: 25 },
        3: { cellWidth: 20 },
        4: { cellWidth: 20 },
        5: { cellWidth: 35 },
        6: { cellWidth: 35 }
      }
    });
    
    const fileName = options.fileName || `SiteStatusReport_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    
    console.log('현장현황표 PDF 내보내기 완료');
    return { success: true, fileName };
  } catch (error) {
    console.error('현장현황표 PDF 내보내기 실패:', error);
    return { success: false, error: error.message };
  }
};

// 채팅 내역을 PDF로 내보내기
export const exportChatToPDF = (messages, roomInfo, options = {}) => {
  try {
    console.log('채팅 PDF 내보내기 시작');
    
    const doc = new jsPDF();
    
    // 한글 폰트 추가
    doc.addFont(NanumGothic, 'NanumGothic', 'normal');
    doc.setFont('NanumGothic');
    
    // 제목 추가
    const title = roomInfo?.name || '채팅 내역';
    doc.setFontSize(16);
    doc.text(title, 20, 20);
    
    // 방 정보 추가
    if (roomInfo) {
      doc.setFontSize(10);
      doc.text(`방 생성일: ${new Date(roomInfo.createdAt).toLocaleDateString('ko-KR')}`, 20, 30);
      doc.text(`참여자 수: ${roomInfo.participants?.length || 0}명`, 20, 35);
    }
    
    // 메시지 추가
    let yPosition = 50;
    messages.forEach((message, index) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      
      const timestamp = new Date(message.timestamp).toLocaleString('ko-KR');
      const sender = message.sender || '알 수 없음';
      const content = message.content || '';
      
      doc.setFontSize(8);
      doc.text(`${timestamp} - ${sender}:`, 20, yPosition);
      yPosition += 5;
      
      // 긴 메시지는 줄바꿈 처리
      const maxWidth = 170;
      const lines = doc.splitTextToSize(content, maxWidth);
      doc.text(lines, 25, yPosition);
      yPosition += lines.length * 5 + 5;
    });
    
    // 파일명 생성
    const fileName = options.fileName || `chat_${roomInfo?.name || 'room'}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    // PDF 다운로드
    doc.save(fileName);
    
    console.log('채팅 PDF 내보내기 완료');
    return { success: true, fileName };
  } catch (error) {
    console.error('채팅 PDF 내보내기 실패:', error);
    return { success: false, error: error.message };
  }
};

// 리포트를 PDF로 내보내기
export const exportReportToPDF = (reportData, options = {}) => {
  try {
    console.log('리포트 PDF 내보내기 시작');
    
    const doc = new jsPDF();
    
    // 한글 폰트 추가
    doc.addFont(NanumGothic, 'NanumGothic', 'normal');
    doc.setFont('NanumGothic');
    
    // 제목 추가
    const title = options.title || '리포트';
    doc.setFontSize(16);
    doc.text(title, 20, 20);
    
    // 날짜 추가
    const dateStr = new Date().toLocaleDateString('ko-KR');
    doc.setFontSize(10);
    doc.text(`생성일: ${dateStr}`, 20, 30);
    
    let yPosition = 40;
    
    // 리포트 데이터 추가
    if (reportData && typeof reportData === 'object') {
      Object.entries(reportData).forEach(([key, value]) => {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFontSize(10);
        doc.text(`${key}: ${value}`, 20, yPosition);
        yPosition += 10;
      });
    }
    
    // 파일명 생성
    const fileName = options.fileName || `report_${new Date().toISOString().split('T')[0]}.pdf`;
    
    // PDF 다운로드
    doc.save(fileName);
    
    console.log('리포트 PDF 내보내기 완료');
    return { success: true, fileName };
  } catch (error) {
    console.error('리포트 PDF 내보내기 실패:', error);
    return { success: false, error: error.message };
  }
};

// 전체 가이드 PDF 내보내기
export const exportFullGuidePDF = () => {
  try {
    console.log('전체 가이드 PDF 내보내기 시작');
    
    const doc = new jsPDF();
    
    // 한글 폰트 추가
    doc.addFont(NanumGothic, 'NanumGothic', 'normal');
    doc.setFont('NanumGothic');
    
    // 제목
    doc.setFontSize(20);
    doc.text('시스템 사용 가이드', 20, 20);
    
    // 날짜
    doc.setFontSize(10);
    doc.text(`생성일: ${new Date().toLocaleDateString('ko-KR')}`, 20, 30);
    
    let yPosition = 40;
    
    // 가이드 내용
    const guideContent = [
      { title: '1. 현장 관리', content: '현장 정보를 등록하고 관리할 수 있습니다.' },
      { title: '2. 일정 관리', content: '현장별 공사 일정을 관리할 수 있습니다.' },
      { title: '3. 진행률 관리', content: '현장별 진행률을 업데이트할 수 있습니다.' },
      { title: '4. 보고서 생성', content: '현장 현황을 PDF나 엑셀로 내보낼 수 있습니다.' }
    ];
    
    guideContent.forEach((item, index) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFontSize(12);
      doc.text(item.title, 20, yPosition);
      yPosition += 8;
      
      doc.setFontSize(10);
      doc.text(item.content, 25, yPosition);
      yPosition += 15;
    });
    
    const fileName = `시스템_가이드_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    
    console.log('전체 가이드 PDF 내보내기 완료');
    return { success: true, fileName };
  } catch (error) {
    console.error('전체 가이드 PDF 내보내기 실패:', error);
    return { success: false, error: error.message };
  }
};

// 사용자 가이드 PDF 내보내기
export const exportUserGuidePDF = () => {
  try {
    console.log('사용자 가이드 PDF 내보내기 시작');
    
    const doc = new jsPDF();
    
    // 한글 폰트 추가
    doc.addFont(NanumGothic, 'NanumGothic', 'normal');
    doc.setFont('NanumGothic');
    
    // 제목
    doc.setFontSize(18);
    doc.text('사용자 가이드', 20, 20);
    
    // 날짜
    doc.setFontSize(10);
    doc.text(`생성일: ${new Date().toLocaleDateString('ko-KR')}`, 20, 30);
    
    let yPosition = 40;
    
    // 사용자 가이드 내용
    const userGuideContent = [
      { title: '로그인', content: '사용자 계정으로 로그인합니다.' },
      { title: '현장 조회', content: '등록된 현장 목록을 확인합니다.' },
      { title: '현장 상세', content: '현장별 상세 정보를 확인합니다.' },
      { title: '데이터 내보내기', content: '현장 데이터를 PDF나 엑셀로 내보냅니다.' }
    ];
    
    userGuideContent.forEach((item, index) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFontSize(12);
      doc.text(item.title, 20, yPosition);
      yPosition += 8;
      
      doc.setFontSize(10);
      doc.text(item.content, 25, yPosition);
      yPosition += 15;
    });
    
    const fileName = `사용자_가이드_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    
    console.log('사용자 가이드 PDF 내보내기 완료');
    return { success: true, fileName };
  } catch (error) {
    console.error('사용자 가이드 PDF 내보내기 실패:', error);
    return { success: false, error: error.message };
  }
}; 

// 차트 이미지를 포함한 PDF 내보내기
export const exportChartToPDF = async (chartElement, data, options = {}) => {
  try {
    console.log('차트 PDF 내보내기 시작');
    
    const doc = new jsPDF();
    
    // 한글 폰트 추가
    doc.addFont(NanumGothic, 'NanumGothic', 'normal');
    doc.setFont('NanumGothic');
    
    // 제목 추가
    const title = options.title || '차트 리포트';
    doc.setFontSize(16);
    doc.text(title, 20, 20);
    
    // 날짜 추가
    const dateStr = new Date().toLocaleDateString('ko-KR');
    doc.setFontSize(10);
    doc.text(`생성일: ${dateStr}`, 20, 30);
    
    // 차트 이미지 캡처 시도
    if (chartElement) {
      try {
        // html2canvas를 사용하여 차트를 이미지로 캡처
        const html2canvas = (await import('html2canvas')).default;
        const canvas = await html2canvas(chartElement, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        });
        
        const imgData = canvas.toDataURL('image/png');
        
        // 이미지 크기 조정
        const imgWidth = 170;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // 이미지 추가
        doc.addImage(imgData, 'PNG', 20, 45, imgWidth, imgHeight);
        
        // 테이블 시작 위치 조정
        const tableStartY = 50 + imgHeight;
        
        // 테이블 데이터 추가
        if (data && data.length > 0) {
          const headers = Object.keys(data[0]);
          const tableData = data.map(row => 
            headers.map(header => {
              const value = row[header];
              if (value === null || value === undefined) return '';
              if (typeof value === 'object') return JSON.stringify(value);
              return String(value);
            })
          );
          
          autoTable(doc, {
            head: [headers],
            body: tableData,
            startY: tableStartY,
            styles: {
              font: 'NanumGothic',
              fontSize: 8
            },
            headStyles: {
              fillColor: [66, 114, 196],
              textColor: 255
            }
          });
        }
      } catch (imageError) {
        console.warn('차트 이미지 캡처 실패, 테이블만 포함:', imageError);
        
        // 이미지 캡처 실패 시 테이블만 포함
        if (data && data.length > 0) {
          const headers = Object.keys(data[0]);
          const tableData = data.map(row => 
            headers.map(header => {
              const value = row[header];
              if (value === null || value === undefined) return '';
              if (typeof value === 'object') return JSON.stringify(value);
              return String(value);
            })
          );
          
          autoTable(doc, {
            head: [headers],
            body: tableData,
            startY: 40,
            styles: {
              font: 'NanumGothic',
              fontSize: 8
            },
            headStyles: {
              fillColor: [66, 114, 196],
              textColor: 255
            }
          });
        }
      }
    } else {
      // 차트 요소가 없으면 테이블만 포함
      if (data && data.length > 0) {
        const headers = Object.keys(data[0]);
        const tableData = data.map(row => 
          headers.map(header => {
            const value = row[header];
            if (value === null || value === undefined) return '';
            if (typeof value === 'object') return JSON.stringify(value);
            return String(value);
          })
        );
        
        autoTable(doc, {
          head: [headers],
          body: tableData,
          startY: 40,
          styles: {
            font: 'NanumGothic',
            fontSize: 8
          },
          headStyles: {
            fillColor: [66, 114, 196],
            textColor: 255
          }
        });
      }
    }
    
    // 파일명 생성
    const fileName = options.fileName || `chart_export_${new Date().toISOString().split('T')[0]}.pdf`;
    
    // PDF 다운로드
    doc.save(fileName);
    
    console.log('차트 PDF 내보내기 완료');
    return { success: true, fileName };
  } catch (error) {
    console.error('차트 PDF 내보내기 실패:', error);
    return { success: false, error: error.message };
  }
}; 