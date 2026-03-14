/**
 * 납품확인서 생성 유틸리티
 * - Firebase Storage templates/납품확인서.xlsx 템플릿 사용
 * - 현장 사용인감(stampType) 없으면 A인감, 인감 이미지 E43 근처 110x110, 오른쪽 10px 오프셋
 */
import ExcelJS from 'exceljs';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

const STAMP_IMAGE_MAP = {
  'A인감': 'A.png',
  '□인감': '네모.png',
  '○인감': '동.png',
  '☆인감': '별.png',
  '△인감': '삼각.png',
  '♤인감': '스페이드.png',
  '♧인감': '클로버.png',
  '♡인감': '하트.png',
  '11인감': '11.png'
};

const STAMP_SIZE = { width: 110, height: 110 };
// E43 셀 기준, 오른쪽 10px / 위로 10px (행·열 단위 ~64px 가정)
const STAMP_CELL_E43 = { col: 4 + 10 / 64, row: 42 - 10 / 64 };

/**
 * 기본 납품확인서 템플릿 엑셀 생성 (Firebase 업로드용)
 * Firebase Storage에 템플릿이 없을 때 TemplateUpload 페이지에서 이 버퍼를 업로드하면 됨.
 * @returns {Promise<ArrayBuffer>}
 */
export const createDefaultDeliveryConfirmationTemplate = async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('납품확인서', { views: [{ showGridLines: true }] });

  sheet.getCell(1, 1).value = '납품확인서';
  sheet.getCell(1, 1).font = { bold: true, size: 16 };
  sheet.getCell(2, 1).value = '현장명:';
  sheet.getCell(3, 1).value = '납품일:';
  sheet.getCell(4, 1).value = '납품 내용';
  sheet.getCell(5, 1).value = '비고';
  sheet.getColumn(1).width = 18;
  sheet.getColumn(2).width = 15;
  sheet.getColumn(3).width = 15;
  sheet.getColumn(4).width = 15;
  sheet.getColumn(5).width = 20;
  // E43 인감 위치는 비워둠 (createDeliveryConfirmation에서 이미지 추가)
  sheet.getCell(43, 5).value = '';
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

/**
 * 납품확인서 엑셀 생성 및 다운로드
 * @param {Object} siteData - 현장 정보 (name, stampType 등)
 * @returns {Promise<{ buffer: ArrayBuffer, fileName: string }>}
 */
export const createDeliveryConfirmation = async (siteData) => {
  const stampType = siteData?.stampType || '인감없음';
  const actualStampType = stampType === '인감없음' ? 'A인감' : stampType;

  let arrayBuffer;
  try {
    const templateRef = ref(storage, 'templates/납품확인서.xlsx');
    const downloadURL = await getDownloadURL(templateRef);
    const response = await fetch(downloadURL);
    if (!response.ok) {
      throw new Error(`템플릿을 불러올 수 없습니다. HTTP ${response.status}`);
    }
    arrayBuffer = await response.arrayBuffer();
  } catch (err) {
    console.error('납품확인서 템플릿 로드 실패:', err);
    throw new Error('납품확인서 템플릿을 불러오지 못했습니다. Firebase Storage templates/납품확인서.xlsx 를 확인해 주세요.');
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  const sheet = workbook.worksheets[0] || workbook.getWorksheet(1);
  if (!sheet) {
    throw new Error('납품확인서 시트를 찾을 수 없습니다.');
  }

  // 셀에 데이터 채우기 (C5 공사명, C6 주소, C7 발주처, C8 회사명, A34 생성월)
  const siteName = siteData?.name || siteData?.siteName || '';
  const siteAddress = siteData?.address || '';
  const orderer = siteData?.orderer || '';
  const companyName = siteData?.companyName || siteData?.company || '';
  const now = new Date();
  const monthLabel = `${now.getFullYear()}년 ${now.getMonth() + 1}월`;
  // 공사명: "(데이터값) 중 유리공사" 띄어쓰기 포함
  const projectName = siteName ? `${siteName} 중 유리공사` : '';

  sheet.getCell(5, 3).value = projectName; // C5 공사명 (○○ 중 유리공사)
  sheet.getCell(6, 3).value = siteAddress; // C6 현장 주소
  sheet.getCell(7, 3).value = orderer;    // C7 발주처
  sheet.getCell(8, 3).value = companyName; // C8 회사명
  sheet.getCell(34, 1).value = monthLabel; // A34 현재 생성하는 달

  if (actualStampType !== '기타인감' && STAMP_IMAGE_MAP[actualStampType]) {
    try {
      const stampsRef = ref(storage, `stamps/${STAMP_IMAGE_MAP[actualStampType]}`);
      const url = await getDownloadURL(stampsRef);
      const resp = await fetch(url);
      if (resp.ok) {
        const buf = await resp.arrayBuffer();
        const imageId = workbook.addImage({ buffer: buf, extension: 'png' });
        sheet.addImage(imageId, {
          tl: { col: STAMP_CELL_E43.col, row: STAMP_CELL_E43.row },
          ext: STAMP_SIZE
        });
      }
    } catch (imageError) {
      console.warn('납품확인서 인감 이미지 추가 실패:', imageError);
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `납품확인서_${siteName || '현장'}_${new Date().toISOString().split('T')[0]}.xlsx`;
  return { buffer, fileName };
};
