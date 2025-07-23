import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { NanumGothic } from '../assets/fonts/NanumGothic.js';

// PDF로 내보내기
export const exportToPDF = (data, options = {}) => {
  try {
    console.log('PDF 내보내기 시작');
    
    const doc = new jsPDF();
    
    // 한글 폰트 추가
    doc.addFont(NanumGothic, 'NanumGothic', 'normal');
    doc.setFont('NanumGothic');
    
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
      
      // 테이블 생성
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
    
    // 리포트 내용 추가
    if (reportData.summary) {
      doc.setFontSize(12);
      doc.text('요약', 20, yPosition);
      yPosition += 10;
      
      doc.setFontSize(10);
      const summaryLines = doc.splitTextToSize(reportData.summary, 170);
      doc.text(summaryLines, 20, yPosition);
      yPosition += summaryLines.length * 5 + 10;
    }
    
    // 통계 데이터 추가
    if (reportData.statistics) {
      doc.setFontSize(12);
      doc.text('통계', 20, yPosition);
      yPosition += 10;
      
      const statsData = Object.entries(reportData.statistics).map(([key, value]) => [key, value]);
      
      autoTable(doc, {
        head: [['항목', '값']],
        body: statsData,
        startY: yPosition,
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

// 전체 가이드 PDF 생성
export const exportFullGuidePDF = () => {
  try {
    console.log('전체 가이드 PDF 생성 시작');
    
    const doc = new jsPDF();
    
    // 한글 폰트 추가
    doc.addFont(NanumGothic, 'NanumGothic', 'normal');
    doc.setFont('NanumGothic');
    
    // 제목
    doc.setFontSize(18);
    doc.text('천우 건설현장관리시스템 사용자 가이드', 20, 20);
    
    // 목차
    doc.setFontSize(12);
    doc.text('목차', 20, 40);
    
    const sections = [
      '1. 시스템 개요',
      '2. 현장 관리',
      '3. 일정 관리',
      '4. 안전 관리',
      '5. 기성 관리',
      '6. 사용자 관리',
      '7. 보고서 생성'
    ];
    
    let yPosition = 50;
    sections.forEach(section => {
      doc.text(section, 25, yPosition);
      yPosition += 8;
    });
    
    // 각 섹션 내용
    yPosition = 120;
    
    // 1. 시스템 개요
    doc.setFontSize(14);
    doc.text('1. 시스템 개요', 20, yPosition);
    yPosition += 10;
    
    doc.setFontSize(10);
    const overviewText = '천우 건설현장관리시스템은 건설 현장의 모든 업무를 통합 관리할 수 있는 종합 플랫폼입니다. 현장 관리, 일정 관리, 안전 관리, 기성 관리 등 모든 기능을 제공합니다.';
    const overviewLines = doc.splitTextToSize(overviewText, 170);
    doc.text(overviewLines, 20, yPosition);
    yPosition += overviewLines.length * 5 + 10;
    
    // 2. 현장 관리
    doc.setFontSize(14);
    doc.text('2. 현장 관리', 20, yPosition);
    yPosition += 10;
    
    doc.setFontSize(10);
    const siteText = '현장 등록, 수정, 삭제 기능을 제공합니다. 현장별 상세 정보와 진행 상황을 관리할 수 있습니다.';
    const siteLines = doc.splitTextToSize(siteText, 170);
    doc.text(siteLines, 20, yPosition);
    yPosition += siteLines.length * 5 + 10;
    
    // 파일명 생성
    const fileName = `천우현장관리시스템_사용자가이드_${new Date().toISOString().split('T')[0]}.pdf`;
    
    // PDF 다운로드
    doc.save(fileName);
    
    console.log('전체 가이드 PDF 생성 완료');
    return { success: true, fileName };
  } catch (error) {
    console.error('전체 가이드 PDF 생성 실패:', error);
    return { success: false, error: error.message };
  }
};

// 사용자 가이드 PDF 생성
export const exportUserGuidePDF = () => {
  try {
    console.log('사용자 가이드 PDF 생성 시작');
    
    const doc = new jsPDF();
    
    // 한글 폰트 추가
    doc.addFont(NanumGothic, 'NanumGothic', 'normal');
    doc.setFont('NanumGothic');
    
    // 제목
    doc.setFontSize(16);
    doc.text('사용자 가이드', 20, 20);
    
    // 기본 사용법
    doc.setFontSize(12);
    doc.text('기본 사용법', 20, 40);
    
    doc.setFontSize(10);
    const basicText = '1. 로그인 후 대시보드에서 전체 현황을 확인할 수 있습니다.\n2. 좌측 메뉴를 통해 각 기능에 접근할 수 있습니다.\n3. 모바일에서는 하단 네비게이션을 사용합니다.';
    const basicLines = doc.splitTextToSize(basicText, 170);
    doc.text(basicLines, 20, 50);
    
    // 파일명 생성
    const fileName = `사용자가이드_${new Date().toISOString().split('T')[0]}.pdf`;
    
    // PDF 다운로드
    doc.save(fileName);
    
    console.log('사용자 가이드 PDF 생성 완료');
    return { success: true, fileName };
  } catch (error) {
    console.error('사용자 가이드 PDF 생성 실패:', error);
    return { success: false, error: error.message };
  }
}; 