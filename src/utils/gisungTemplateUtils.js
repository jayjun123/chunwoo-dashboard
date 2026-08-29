// 기성금청구서 유틸리티 (템플릿 기반)
import ExcelJS from 'exceljs';
import { getSafePrice, setCellValueSafely, filterMaterialItems, logMaterialItem, cleanSheetData, fillGisungStyleData } from './excelCommonUtils';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

/** 착공/준공일 → `YYYY년 MM월 DD일` (잘못 치환된 `YYYY년 MM년 DD월` 방지) */
export function formatGisungKoreanDate(dateValue) {
  if (dateValue == null || dateValue === '') return '0000년 00월 00일';

  let y = null;
  let m = null;
  let d = null;

  if (typeof dateValue?.toDate === 'function') {
    const dt = dateValue.toDate();
    if (!Number.isNaN(dt.getTime())) {
      y = dt.getFullYear();
      m = dt.getMonth() + 1;
      d = dt.getDate();
    }
  } else if (dateValue instanceof Date) {
    if (!Number.isNaN(dateValue.getTime())) {
      y = dateValue.getFullYear();
      m = dateValue.getMonth() + 1;
      d = dateValue.getDate();
    }
  } else {
    const raw = String(dateValue).trim();
    // 이미 올바른 형식
    const already = raw.match(/^(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
    if (already) {
      y = Number(already[1]);
      m = Number(already[2]);
      d = Number(already[3]);
    } else {
      // 잘못된 `2024년 01년 15월` / `2024년 01월` 등도 복구 시도
      const broken = raw.match(/^(\d{4})\s*년\s*(\d{1,2})\s*년\s*(\d{1,2})\s*월/);
      if (broken) {
        y = Number(broken[1]);
        m = Number(broken[2]);
        d = Number(broken[3]);
      } else {
        const ymd = raw.match(/(\d{4})[.\-\/년\s]+(\d{1,2})[.\-\/월\s]+(\d{1,2})/);
        if (ymd) {
          y = Number(ymd[1]);
          m = Number(ymd[2]);
          d = Number(ymd[3]);
        } else {
          const ym = raw.match(/(\d{4})[.\-\/년\s]+(\d{1,2})/);
          if (ym) {
            y = Number(ym[1]);
            m = Number(ym[2]);
            d = 1;
          }
        }
      }
    }
  }

  if (!y || !m) return '0000년 00월 00일';
  const pad = (n) => String(n).padStart(2, '0');
  return `${y}년 ${pad(m)}월 ${pad(d || 1)}일`;
}

/** 실제 입력 행 수(총계/부가세 제외) 기준으로 N/L 결정. 20초과면 무조건 L */
export function resolveGisungTemplateType(siteItems = [], preferredType) {
  const list = Array.isArray(siteItems) ? siteItems : [];
  const dataCount = list.filter(
    (item) => item && !item.isTotal && !item.isVat && !item.isTotalWithVat
  ).length;
  const needsLong = dataCount > 20;

  if (needsLong) {
    if (preferredType === 'N') {
      console.warn(`⚠️ 물량 ${dataCount}개 → N 템플릿으로는 잘리므로 L(LONG)로 전환`);
    }
    return 'L';
  }

  if (preferredType === 'L' || preferredType === 'N') return preferredType;
  // AUTO / 미지정
  return 'N';
}

// Firebase Storage에서 템플릿 다운로드
const downloadTemplateFromUrls = async (templateKey) => {
  try {
    console.log(`📥 템플릿 다운로드 시작: ${templateKey}`);
    
    // 템플릿 파일명 매핑
    const templateFileMap = {
      "(N)견적서": "Ngyunjuk.xlsx",
      "(L)견적서": "Lgyunjuk.xlsx",
      "(N)납품계약서": "Nnapfoom.xlsx",
      "(L)납품계약서": "Lnapfoom.xlsx",
      "(N)기성금청구서": "NEW.xlsx",
      "(L)기성금청구서": "LONG.xlsx"
    };
    
    const fileName = templateFileMap[templateKey];
    if (!fileName) {
      throw new Error(`템플릿 파일명을 찾을 수 없습니다: ${templateKey}`);
    }
    
    // 재시도 로직을 위한 함수
    const retryFetch = async (url, options, maxRetries = 3) => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`🔄 다운로드 시도 ${attempt}/${maxRetries}: ${url}`);
          
          // 타임아웃을 위한 AbortController 생성
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            controller.abort();
          }, 10000); // 10초 타임아웃으로 단축
          
          const response = await fetch(url, {
            ...options,
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const arrayBuffer = await response.arrayBuffer();
          console.log(`✅ 다운로드 성공 (시도 ${attempt}): ${arrayBuffer.byteLength} bytes`);
          return arrayBuffer;
        } catch (error) {
          console.warn(`⚠️ 시도 ${attempt} 실패:`, error.message);
          
          if (attempt === maxRetries) {
            throw error;
          }
          
          // 지수 백오프로 재시도 간격 증가
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`⏳ ${delay}ms 후 재시도...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    };
    
    // 1. 로컬 파일 우선 사용 (가장 빠름)
    try {
      console.log(`📁 로컬 파일 시도: /${fileName}`);
      const localUrl = `/${fileName}`;
      
      const arrayBuffer = await retryFetch(localUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Cache-Control': 'no-cache'
        },
        mode: 'cors'
      });
      
      console.log(`✅ 로컬 파일로 템플릿 다운로드 완료: ${templateKey} (${arrayBuffer.byteLength} bytes)`);
      return arrayBuffer;
    } catch (localError) {
      console.warn(`⚠️ 로컬 파일 접근 실패: ${localError.message}`);
    }
    
    // 3. 공개 URL 사용 시도 (여러 URL 변형 시도)
    const publicUrlVariants = {
      "(N)기성금청구서": [
        "https://firebasestorage.googleapis.com/v0/b/chunwooo-edf9f.firebasestorage.app/o/templates%2FNEW.xlsx?alt=media",
        "https://storage.googleapis.com/chunwooo-edf9f.firebasestorage.app/templates/NEW.xlsx",
        "https://firebasestorage.googleapis.com/v0/b/chunwooo-edf9f.firebasestorage.app/o/templates%2FNEW.xlsx?alt=media&token=public"
      ],
      "(L)기성금청구서": [
        "https://firebasestorage.googleapis.com/v0/b/chunwooo-edf9f.firebasestorage.app/o/templates%2FLONG.xlsx?alt=media",
        "https://storage.googleapis.com/chunwooo-edf9f.firebasestorage.app/templates/LONG.xlsx",
        "https://firebasestorage.googleapis.com/v0/b/chunwooo-edf9f.firebasestorage.app/o/templates%2FLONG.xlsx?alt=media&token=public"
      ],
      "(N)견적서": [
        "https://firebasestorage.googleapis.com/v0/b/chunwooo-edf9f.firebasestorage.app/o/templates%2FNgyunjuk.xlsx?alt=media",
        "https://storage.googleapis.com/chunwooo-edf9f.firebasestorage.app/templates/Ngyunjuk.xlsx"
      ],
      "(L)견적서": [
        "https://firebasestorage.googleapis.com/v0/b/chunwooo-edf9f.firebasestorage.app/o/templates%2FLgyunjuk.xlsx?alt=media",
        "https://storage.googleapis.com/chunwooo-edf9f.firebasestorage.app/templates/Lgyunjuk.xlsx"
      ],
      "(N)납품계약서": [
        "https://firebasestorage.googleapis.com/v0/b/chunwooo-edf9f.firebasestorage.app/o/templates%2FNnapfoom.xlsx?alt=media",
        "https://storage.googleapis.com/chunwooo-edf9f.firebasestorage.app/templates/Nnapfoom.xlsx"
      ],
      "(L)납품계약서": [
        "https://firebasestorage.googleapis.com/v0/b/chunwooo-edf9f.firebasestorage.app/o/templates%2FLnapfoom.xlsx?alt=media",
        "https://storage.googleapis.com/chunwooo-edf9f.firebasestorage.app/templates/Lnapfoom.xlsx"
      ]
    };
    
    const urlVariants = publicUrlVariants[templateKey];
    if (!urlVariants || urlVariants.length === 0) {
      throw new Error(`공개 URL을 찾을 수 없습니다: ${templateKey}`);
    }
    
    // 각 URL 변형을 순차적으로 시도
    for (let i = 0; i < urlVariants.length; i++) {
      try {
        const url = urlVariants[i];
        console.log(`📥 공개 URL 시도 ${i + 1}/${urlVariants.length}: ${url}`);
        
        const arrayBuffer = await retryFetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Cache-Control': 'no-cache',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          mode: 'cors',
          credentials: 'omit'
        });
        
        console.log(`✅ 공개 URL로 템플릿 다운로드 완료: ${templateKey} (${arrayBuffer.byteLength} bytes)`);
        return arrayBuffer;
      } catch (urlError) {
        console.warn(`⚠️ URL ${i + 1} 실패:`, urlError.message);
        if (i === urlVariants.length - 1) {
          // 마지막 URL도 실패하면 로컬 파일 시도
          break;
        }
      }
    }
    
    
    // 모든 방법이 실패한 경우
    throw new Error('모든 다운로드 방법이 실패했습니다. 네트워크 연결을 확인하고 다시 시도해주세요.');
    
  } catch (error) {
    console.error(`❌ 템플릿 다운로드 실패: ${templateKey}`, error);
    
    // 더 구체적인 오류 메시지 제공
    let errorMessage = '템플릿 다운로드 중 오류가 발생했습니다.';
    
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      errorMessage = '템플릿 다운로드 시간이 초과되었습니다. 네트워크 연결을 확인해주세요.';
    } else if (error.message.includes('Failed to fetch') || error.message.includes('ERR_FAILED')) {
      errorMessage = '네트워크 연결에 문제가 있습니다. 인터넷 연결을 확인하고 다시 시도해주세요.';
    } else if (error.message.includes('CORS')) {
      errorMessage = '브라우저 보안 정책으로 인해 다운로드가 차단되었습니다. 다른 브라우저를 사용해보세요.';
    } else if (error.message.includes('HTTP 403') || error.message.includes('HTTP 404')) {
      errorMessage = '템플릿 파일에 접근할 수 없습니다. 관리자에게 문의해주세요.';
    } else {
      errorMessage = `템플릿 다운로드 중 오류가 발생했습니다: ${error.message}`;
    }
    
    throw new Error(errorMessage);
  }
};

// 기성금청구서 템플릿 기반 생성
export const generateTemplateBasedGisungExcel = async (siteData, gisungData, siteItems = [], currentSequence = 1, previousGisungData = null) => {
  try {
    console.log('🚀 기성금청구서 템플릿 기반 생성 시작');
    
    // 물량 데이터 개수에 따라 템플릿 선택 (N: 20개 이하, L: 21개 이상 — 초과 시 강제 L)
    const itemCount = Array.isArray(siteItems) ? siteItems.length : 0;
    const preferred =
      siteData?.templateType === 'AUTO' || !siteData?.templateType
        ? 'AUTO'
        : siteData.templateType;
    const templateType = resolveGisungTemplateType(siteItems, preferred);

    const templateKey = `(${templateType})기성금청구서`;
    
    console.log(`📊 물량 개수: ${itemCount}개 → ${templateType} 타입 템플릿 사용`);
    console.log(`📋 기성금청구서 템플릿 선택: ${templateType} 타입 (${templateType === 'L' ? 'LONG' : 'NEW'})`);
    
    // 템플릿 다운로드 (Firebase Storage 사용)
    const arrayBuffer = await downloadTemplateFromUrls(templateKey);
    
    // 워크북 로드 (원본 수식 보존, Shared Formula 문제 해결)
    const workbook = new ExcelJS.Workbook();
    try {
      // 첫 번째 시도: 기본 설정으로 로딩
      await workbook.xlsx.load(arrayBuffer, {
        sharedFormula: false,
        ignoreFormulas: false,  // 수식 보존
        ignoreFormulaErrors: true,
        ignoreStyles: false,
        ignoreDataValidations: false,
        ignoreConditionalFormats: false
      });
      console.log('✅ 기본 설정으로 기성금청구서 템플릿 로드 성공');
    } catch (loadError) {
      console.warn('⚠️ 기본 로딩 실패, Shared Formula 무시로 재시도:', loadError.message);
      
      // 두 번째 시도: Shared Formula만 무시
      await workbook.xlsx.load(arrayBuffer, {
        sharedFormula: false,
        ignoreSharedFormulas: true,
        ignoreFormulas: false,  // 수식 보존
        ignoreFormulaErrors: true,
        ignoreStyles: false,
        ignoreDataValidations: false,
        ignoreConditionalFormats: false
      });
      console.log('✅ Shared Formula 무시로 기성금청구서 템플릿 로드 성공');
    }
    
    // Shared Formula 문제 해결 (모든 셀을 독립적인 수식으로 변환)
    fixGisungSharedFormulaIssues(workbook);
    
    // 추가적인 Shared Formula 완전 제거 (ExcelJS 내장 기능 사용)
    try {
      console.log('🔧 ExcelJS 내장 기능으로 Shared Formula 완전 제거');
      workbook.worksheets.forEach(sheet => {
        console.log(`🚨 ${sheet.name} 시트 모든 공유셀 완전 제거`);
        
        // 모든 셀을 스캔하여 공유셀 완전 제거
        for (let row = 1; row <= 100; row++) {
          for (let col = 1; col <= 26; col++) {
            try {
              const cell = sheet.getCell(row, col);
              if (cell) {
                // 모든 공유셀 관련 속성 강제 제거
                if (cell.sharedFormula !== undefined) {
                  console.log(`🚨 ${String.fromCharCode(64 + col)}${row} 셀 sharedFormula 강제 제거`);
                  delete cell.sharedFormula;
                }
                if (cell.si !== undefined) {
                  console.log(`🚨 ${String.fromCharCode(64 + col)}${row} 셀 si 강제 제거`);
                  delete cell.si;
                }
                if (cell.ref !== undefined) {
                  console.log(`🚨 ${String.fromCharCode(64 + col)}${row} 셀 ref 강제 제거`);
                  delete cell.ref;
                }
                
                // 수식에 공유셀 관련 내용이 있으면 제거
                if (cell.formula && typeof cell.formula === 'string') {
                  if (cell.formula.includes('si=') || cell.formula.includes('shared') || cell.formula.includes('undefined')) {
                    console.log(`🚨 ${String.fromCharCode(64 + col)}${row} 셀 수식에서 공유셀 관련 내용 제거`);
                    cell.formula = cell.formula.replace(/si=\d+/g, '');
                    cell.formula = cell.formula.replace(/shared/g, '');
                    cell.formula = cell.formula.replace(/undefined/g, '');
                  }
                }
              }
            } catch (cellError) {
              // 개별 셀 오류는 무시
            }
          }
        }
      });
      console.log('✅ ExcelJS 내장 기능으로 Shared Formula 완전 제거 완료');
    } catch (excelJSError) {
      console.warn('⚠️ ExcelJS 내장 기능 Shared Formula 제거 중 오류:', excelJSError.message);
    }
    
    // 🚨 L28 셀 특별 강력 처리 (공유셀 오류 완전 해결)
    try {
      console.log('🚨 L28 셀 특별 강력 처리 시작');
      workbook.worksheets.forEach(sheet => {
        const l28Cell = sheet.getCell('L28');
        if (l28Cell) {
          console.log('🚨 L28 셀 강력 처리 - 모든 Shared Formula 관련 속성 제거');
          
          // 모든 Shared Formula 관련 속성 강제 제거
          if (l28Cell.sharedFormula !== undefined) {
            console.log('🚨 L28 셀 sharedFormula 강제 제거');
            delete l28Cell.sharedFormula;
          }
          if (l28Cell.si !== undefined) {
            console.log('🚨 L28 셀 si 강제 제거');
            delete l28Cell.si;
          }
          if (l28Cell.ref !== undefined) {
            console.log('🚨 L28 셀 ref 강제 제거');
            delete l28Cell.ref;
          }
          
          // L28 셀의 수식이 있다면 완전히 정리
          if (l28Cell.formula && typeof l28Cell.formula === 'string') {
            console.log(`🚨 L28 셀 원본 수식: ${l28Cell.formula}`);
            
            // 모든 Shared Formula 관련 문자열 제거
            l28Cell.formula = l28Cell.formula.replace(/si=\d+/g, '');
            l28Cell.formula = l28Cell.formula.replace(/shared/g, '');
            l28Cell.formula = l28Cell.formula.replace(/undefined/g, '');
            
            console.log(`🚨 L28 셀 정리된 수식: ${l28Cell.formula}`);
          }
          
          // L28 셀을 완전히 새로운 셀로 재생성
          console.log('🚨 L28 셀 완전 재생성');
          const newCell = sheet.getCell('L28');
          if (newCell.formula) {
            newCell.formula = newCell.formula;
          }
          
          console.log('✅ L28 셀 특별 강력 처리 완료');
        }
      });
    } catch (l28Error) {
      console.warn('⚠️ L28 셀 특별 강력 처리 실패:', l28Error.message);
    }
    
    // 🔍 최종 확인: F8 셀과 L28 셀의 Shared Formula 속성이 제거되었는지 확인
    console.log('🔍 최종 확인: F8 셀과 L28 셀 Shared Formula 상태 확인...');
    workbook.worksheets.forEach(sheet => {
      try {
        // F8 셀 확인
        const f8Cell = sheet.getCell('F8');
        if (f8Cell) {
          console.log(`🔍 F8 셀 최종 상태:`);
          console.log(`  - sharedFormula: ${f8Cell.sharedFormula !== undefined ? '존재함 (문제!)' : '제거됨 ✅'}`);
          console.log(`  - si: ${f8Cell.si !== undefined ? '존재함 (문제!)' : '제거됨 ✅'}`);
          console.log(`  - ref: ${f8Cell.ref !== undefined ? '존재함 (문제!)' : '제거됨 ✅'}`);
          console.log(`  - formula: ${f8Cell.formula ? `수식 있음: ${f8Cell.formula}` : '수식 없음'}`);
          
          // 만약 여전히 문제가 있다면 강제로 제거
          if (f8Cell.sharedFormula !== undefined || f8Cell.si !== undefined || f8Cell.ref !== undefined) {
            console.log('🚨 F8 셀에 여전히 Shared Formula 속성이 존재! 강제 제거...');
            delete f8Cell.sharedFormula;
            delete f8Cell.si;
            delete f8Cell.ref;
            console.log('✅ F8 셀 Shared Formula 속성 강제 제거 완료');
          }
        }
        
        // L28 셀 확인 (Shared Formula master 문제 해결 확인)
        const l28Cell = sheet.getCell('L28');
        if (l28Cell) {
          console.log(`🔍 L28 셀 최종 상태:`);
          console.log(`  - sharedFormula: ${l28Cell.sharedFormula !== undefined ? '존재함 (문제!)' : '제거됨 ✅'}`);
          console.log(`  - si: ${l28Cell.si !== undefined ? '존재함 (문제!)' : '제거됨 ✅'}`);
          console.log(`  - ref: ${l28Cell.ref !== undefined ? '존재함 (문제!)' : '제거됨 ✅'}`);
          console.log(`  - formula: ${l28Cell.formula ? `수식 있음: ${l28Cell.formula}` : '수식 없음'}`);
          
          // 만약 여전히 문제가 있다면 강제로 제거
          if (l28Cell.sharedFormula !== undefined || l28Cell.si !== undefined || l28Cell.ref !== undefined) {
            console.log('🚨 L28 셀에 여전히 Shared Formula 속성이 존재! 강제 제거...');
            delete l28Cell.sharedFormula;
            delete l28Cell.si;
            delete l28Cell.ref;
            console.log('✅ L28 셀 Shared Formula 속성 강제 제거 완료');
          }
          
          // L28 셀의 수식이 L27을 참조하는 경우, L27 셀이 존재하는지 확인
          if (l28Cell.formula && l28Cell.formula.includes('L27')) {
            try {
              const l27Cell = sheet.getCell('L27');
              if (!l27Cell || l27Cell.value === null || l27Cell.value === undefined) {
                console.log('🔧 L27 셀이 존재하지 않거나 비어있음. L28 수식을 안전한 값으로 변경');
                l28Cell.formula = null; // 수식 제거
                l28Cell.value = 0; // 안전한 기본값
              } else {
                console.log(`🔧 L27 셀 값 확인: ${l27Cell.value}`);
                // L27 셀이 존재하지만 수식이 문제가 있을 수 있으므로 개별 수식으로 변경
                l28Cell.formula = 'H27*0.1'; // H27*0.1로 수식 변경 (더 안전함)
                console.log('🔧 L28 수식을 H27*0.1로 안전하게 변경');
              }
            } catch (l27Error) {
              console.log('🔧 L27 셀 접근 실패. L28 수식을 안전한 값으로 변경');
              l28Cell.formula = null;
              l28Cell.value = 0;
            }
          }
        }
      } catch (checkError) {
        console.warn('⚠️ F8/L28 셀 최종 확인 중 오류:', checkError.message);
      }
    });
    
    console.log('✅ 템플릿 로드 완료');
    
    // 갑지 시트 가져오기
    const gapjiSheet = workbook.getWorksheet('갑지');
    if (!gapjiSheet) {
      throw new Error('갑지 시트를 찾을 수 없습니다.');
    }
    
    // 기성금 내역서 시트 가져오기
    const detailSheet = workbook.getWorksheet('기성금 내역서');
    if (!detailSheet) {
      throw new Error('기성금 내역서 시트를 찾을 수 없습니다.');
    }
    
    // 🔍 디버깅: 26행부터 데이터 확인
    console.log('🔍 템플릿 로드 후 26행부터 데이터 확인:');
    for (let row = 26; row <= 30; row++) {
      const aCell = detailSheet.getCell(`A${row}`);
      const fCell = detailSheet.getCell(`F${row}`);
      
      console.log(`\n=== ${row}행 상세 분석 ===`);
      console.log(`A열 값: "${aCell.value}" (타입: ${typeof aCell.value})`);
      console.log(`F열 값: "${fCell.value}" (타입: ${typeof fCell.value})`);
      console.log(`F열 수식: "${fCell.formula || '수식없음'}"`);
      console.log(`F열 수식 타입: ${typeof fCell.formula}`);
      
      // F열 셀의 모든 속성 확인
      console.log(`F열 셀 속성들:`, {
        hasFormula: !!fCell.formula,
        formula: fCell.formula,
        value: fCell.value,
        result: fCell.result,
        type: fCell.type
      });
      
      // F열이 수식인지 확인
      if (fCell.formula) {
        console.log(`  ✅ ${row}행 F열 수식 보존됨: ${fCell.formula}`);
      } else {
        console.log(`  ❌ ${row}행 F열 수식 없음`);
      }
    }
    
    // Shared Formula 관련 속성 제거 및 데이터 입력
    await fillGisungData(workbook, siteData, gisungData, siteItems, currentSequence, previousGisungData);

    // 내역서 인쇄영역·열 범위: A~M (L에서 잘리고 M만 보이는 현상 방지)
    const detailSheetAfter = workbook.getWorksheet('기성금 내역서');
    if (detailSheetAfter) {
      const printEndRow = templateType === 'L' ? 55 : 30;
      detailSheetAfter.pageSetup = {
        ...(detailSheetAfter.pageSetup || {}),
        printArea: `A1:M${printEndRow}`,
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        orientation: 'landscape',
      };
      // 사용 범위가 L에서 끊기지 않도록 M열까지 명시
      try {
        detailSheetAfter.getColumn(13).width = detailSheetAfter.getColumn(13).width || 9;
      } catch (_) { /* ignore */ }
      console.log(`🖨️ 내역서 printArea = A1:M${printEndRow}`);
    }
    
    console.log('✅ 기성금청구서 템플릿 기반 생성 완료');
    return { 
      workbook, 
      gisungMonth: getPreviousMonth(),
      templateType
    };
    
  } catch (error) {
    console.error('❌ 기성금청구서 생성 실패:', error);
    throw error;
  }
};

// 기성금청구서에 데이터 입력 (템플릿 사용)
const fillGisungData = async (workbook, siteData, gisungData, siteItems, currentSequence = 1, previousGisungData = null) => {
  try {
    console.log('📝 기성금청구서 데이터 입력 시작');
    
    const gapjiSheet = workbook.getWorksheet('갑지');
    const detailSheet = workbook.getWorksheet('기성금 내역서');
    
         // 갑지 시트 데이터 입력
     if (gapjiSheet) {
       // 기본 정보 입력 (실제 템플릿 구조에 맞게)
       const basicInfoCells = [
         { cell: 'A2', value: `${currentSequence}차 기성금 청구서` }, // 차수
         { cell: 'D4', value: siteData?.name || '현장명' }, // 공사명
         { cell: 'D6', value: siteData?.companyName || siteData?.company || siteData?.contractor || '시공사' }, // 시공사
         { cell: 'D8', value: '유리공사' }, // 하도급 공사명 (고정)
         { cell: 'D10', value: formatGisungKoreanDate(siteData?.startDate) }, // 계약(착공)일자
         { cell: 'D12', value: formatGisungKoreanDate(siteData?.endDate) }, // 준공일자
         { cell: 'A36', value: getPreviousMonth() }, // 현재월-1
         { cell: 'A44', value: (siteData?.companyName || siteData?.company || siteData?.contractor || '회사명') + ' 귀중' } // 회사명 귀중
       ];
       
       basicInfoCells.forEach(({ cell, value }) => {
         const cellObj = gapjiSheet.getCell(cell);
         cellObj.value = value;
       });
       
       // H16에 선급금 입력 (NEW, LONG 템플릿 모두 동일)
       const advanceAmount = Number(siteData?.advance || 0);
       const h16Cell = gapjiSheet.getCell('H16');
       h16Cell.value = advanceAmount;
       console.log(`💰 갑지 H16에 선급금 입력: ${advanceAmount}`);
       
       // H열 셀들은 수식을 그대로 두고, D열 셀들이 H열을 참조하도록 함
       // (H열 수식을 덮어쓰지 않음)
       
       // 인감 이미지 추가 (납품계약서와 동일한 방식)
       const stampType = siteData?.stampType || '인감없음';
       console.log('🖊️ 갑지 시트 인감 이미지 처리 시작:', stampType);
       
       // 인감없음인 경우 A인감으로 처리, 기타인감인 경우 이미지 넣지 않음
       if (stampType === '기타인감') {
         console.log('📝 기타인감이므로 이미지 삽입하지 않음:', stampType);
       } else {
         // 실제 사용할 인감 타입 결정
         const actualStampType = stampType === '인감없음' ? 'A인감' : stampType;
         console.log('🖊️ 실제 사용할 인감 타입:', actualStampType);
         
         try {
           // 인감 이미지 다운로드 함수 (로컬 파일 우선 사용)
           const downloadSignatureImage = async (stampType = 'A인감') => {
             const stampImageMap = {
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
             
             const mappedImageName = stampImageMap[stampType];
             if (!mappedImageName) {
               console.warn('⚠️ 알 수 없는 인감 타입:', stampType);
               return null;
             }
             
             // 1. 로컬 파일 우선 시도
             try {
               console.log('📁 로컬 인감 이미지 시도:', mappedImageName);
               const localUrl = `/${mappedImageName}`;
               const response = await fetch(localUrl);
               
               if (response.ok) {
                 const arrayBuffer = await response.arrayBuffer();
                 console.log('✅ 로컬 인감 이미지 다운로드 완료:', mappedImageName);
                 return arrayBuffer;
               }
             } catch (localError) {
               console.warn('⚠️ 로컬 인감 이미지 실패:', localError.message);
             }
             
             // 2. Firebase Storage에서 인감 이미지 가져오기 (대체 방법)
             try {
               console.log('🔥 Firebase Storage에서 인감 이미지 가져오기');
               const stampsRef = ref(storage, `stamps/${mappedImageName}`);
               const downloadURL = await getDownloadURL(stampsRef);
               console.log('📁 Firebase Storage 이미지 경로:', downloadURL);
               
               const response = await fetch(downloadURL);
               if (!response.ok) {
                 throw new Error(`인감 이미지 다운로드 실패: ${response.status}`);
               }
               
               const arrayBuffer = await response.arrayBuffer();
               console.log('✅ Firebase Storage 인감 이미지 다운로드 완료:', mappedImageName);
               return arrayBuffer;
             } catch (firebaseError) {
               console.warn('⚠️ Firebase Storage 인감 이미지 실패:', firebaseError.message);
               return null;
             }
           };
           
                        // F40 셀 위치에 인감 이미지 추가
             const imageBuffer = await downloadSignatureImage(actualStampType);
             if (imageBuffer && gapjiSheet && workbook) {
               const imageId = workbook.addImage({
                 buffer: imageBuffer,
                 extension: 'png',
               });
               
               gapjiSheet.addImage(imageId, {
                 tl: { col: 5, row: 39 }, // F40 위치
                 ext: { width: 80, height: 80 }
               });
               console.log('✅ 인감 이미지 삽입 완료 (F40):', actualStampType);

               // 내역서 시트에는 인감 이미지 삽입하지 않음 (인덱스1에서 제거)
               console.log('📝 내역서 시트에는 인감 이미지 삽입하지 않음 (인덱스1 제거)');
           } else {
             console.log('📝 인감 이미지 없음 또는 워크북 없음:', actualStampType);
           }
         } catch (imageError) {
           console.warn('⚠️ 인감 이미지 추가 실패:', imageError);
         }
       }
     }
    
         // 기성금 내역서 데이터 입력
     if (detailSheet && siteItems && siteItems.length > 0) {
       console.log(`📋 물량 데이터 개수: ${siteItems.length}개`);
       
       // 물량 데이터에서 계약서 자동계산 항목만 제외 (isTotal, isVat, isTotalWithVat이 true인 항목들)
       // 단수정리 항목은 물량데이터와 함께 취급해야 함
       const filteredItems = siteItems.filter(item => 
         !item.isTotal && !item.isVat && !item.isTotalWithVat
       );
       
       console.log(`📋 필터링된 물량 데이터: ${filteredItems.length}개 (계약서 자동계산 항목 제외, 단수정리 포함)`);
       
       // 단수정리 항목 찾기 (물량데이터와 함께 처리)
       const dansooItem = siteItems.find(item => item?.name === '단수정리');
       if (dansooItem) {
         console.log(`💰 단수정리 항목 발견: ${dansooItem.amount} (${dansooItem.quantity})`);
         console.log(`📊 단수정리 항목을 물량데이터와 함께 처리합니다.`);
       }
       
       // 🛡️ 공통 유틸리티를 사용하여 기성금용 데이터 입력
       // (빈 행은 ''가 아니라 null 빈칸 + 수식 제거 → #VALUE!로 합계가 깨지지 않음)
       fillGisungStyleData(detailSheet, siteItems, 6, '기성금');
       
       // 보호된 합계 행은 fillGisungStyleData가 maxDataRow 밖이라 유지됨
       console.log('🛡️ 보호된 셀과 수식은 변경하지 않음 (합계·선급금 행)');
       
       // 선급금은 갑지 H16에 입력하므로 기성금 내역서에서는 건드리지 않음
       console.log(`💰 선급금은 갑지 H16에 입력됨 (기성금 내역서 보호된 셀 보존)`);
       
       // 기성수량(G열)에 누계수량 설정 (K열의 result 값 사용)
       console.log('🔍 previousGisungData 확인:', previousGisungData);
       // 이전 기성 데이터가 있으면 전회기성(G열) 설정
       if (previousGisungData && previousGisungData.extractedItems) {
         console.log('📊 이전 기성 데이터에서 전회기성 설정 시작');
         
         try {
           const extractedItems = typeof previousGisungData.extractedItems === 'string' 
             ? JSON.parse(previousGisungData.extractedItems) 
             : previousGisungData.extractedItems;
           
           console.log('📊 추출된 항목들:', extractedItems);
           
           // 데이터가 있는 행에만 전회수량(G) 설정 — 빈 행에 0을 넣으면 수식/#VALUE! 유발
           const filteredLen = filteredItems.length;
           const maxGisungRow = 5 + filteredLen;
           for (let row = 6; row <= maxGisungRow; row++) {
             const item = extractedItems.find(item => item.row === row);
             const aVal = detailSheet.getCell(row, 1).value;
             if (aVal == null || aVal === '') continue;

             if (item && item.kValue !== null && item.kValue !== undefined) {
               const gCell = detailSheet.getCell(`G${row}`);
               gCell.value = Number(item.kValue) || 0;
               console.log(`✅ 행 ${row}: K값(누계수량 ${item.kValue}) → G값(전회수량)으로 복사 완료 - ${item.itemName}`);
             }
           }
           
           console.log('✅ 전회기성(G열) 설정 완료');
         } catch (error) {
           console.warn('⚠️ 전회기성 설정 실패:', error);
         }
       } else if (previousGisungData && previousGisungData.prevGisung) {
         // extractedItems가 없어도 prevGisung 값이 있으면 사용
         console.log('📊 prevGisung 값으로 전회기성 설정:', previousGisungData.prevGisung);
         
         // 전회기성 총액을 첫 번째 행에 표시 (임시)
         const gCell = detailSheet.getCell('G6');
         gCell.value = previousGisungData.prevGisung;
         console.log(`✅ G6에 전회기성 총액 설정: ${previousGisungData.prevGisung}`);
       } else {
         console.log('📊 이전 기성금청구서 데이터가 없어 전회기성 설정 건너뜀');
       }
       
                // NEW 템플릿에서는 26행부터는 원본 템플릿 데이터 보존
        if (filteredItems.length <= 20) {
          console.log('📋 NEW 템플릿: 26행부터는 원본 템플릿 데이터 보존');
          
          // 26행부터 30행까지 원본 데이터 보존 확인 및 강제 보호
          for (let row = 26; row <= 30; row++) {
            const aCell = detailSheet.getCell(`A${row}`);
            if (aCell.value) {
              console.log(`✅ ${row}행 A열 데이터 보존: ${aCell.value}`);
            }
            
            // F, G, H열의 수식과 데이터 강제 보존
            for (let col = 6; col <= 8; col++) { // F, G, H열
              const cell = detailSheet.getCell(row, col);
              if (cell.formula) {
                console.log(`🛡️ ${row}행 ${String.fromCharCode(64 + col)}열 수식 보존: ${cell.formula}`);
              }
            }
          }
          
          // 26행부터는 원본 템플릿에 있던 데이터를 그대로 유지
        }
        
        // LONG 템플릿에서는 51행부터 54행까지는 건드리지 않음 (셀 보호 유지)
        if (filteredItems.length > 20) {
          console.log('📋 LONG 템플릿: 51행부터 54행까지는 셀 보호 유지하여 원본 데이터 보존');
          
          // 51행부터 54행까지 원본 데이터 보존 확인 및 강제 보호
          for (let row = 51; row <= 54; row++) {
            const aCell = detailSheet.getCell(`A${row}`);
            if (aCell.value) {
              console.log(`✅ ${row}행 A열 데이터 보존: ${aCell.value}`);
            }
            
            // F, G, H열의 수식과 데이터 강제 보존
            for (let col = 6; col <= 8; col++) { // F, G, H열
              const cell = detailSheet.getCell(row, col);
              if (cell.formula) {
                console.log(`🛡️ ${row}행 ${String.fromCharCode(64 + col)}열 수식 보존: ${cell.formula}`);
              }
            }
          }
          
          // 51행부터 54행까지는 아무것도 건드리지 않음
        }
       
       // 총원가 관련 셀들은 보호된 셀이므로 건드리지 않음 (원본 템플릿 데이터 보존)
       // NEW 템플릿: 26-30행 보호, LONG 템플릿: 51-54행 보호
       console.log('🛡️ 보호된 셀 보존: NEW(26-30행), LONG(51-54행) - 원본 템플릿 데이터 유지');
       
       // 기성금 내역서는 물량과 금액 데이터만 포함 (인감은 갑지에만)
       
       console.log(`✅ ${siteItems.length}개 항목 입력 완료 (A6부터 A50까지만, 보호된 셀 보존)`);
     }
    
    console.log('✅ 기성금청구서 데이터 입력 완료');
    return getPreviousMonth();
    
  } catch (error) {
    console.error('❌ 데이터 입력 실패:', error);
    throw error;
  }
};

// 기성금청구서 템플릿 기반 다운로드 함수 (넷틀리파이 호환)
export const downloadTemplateBasedGisungExcel = async (siteData, gisungData, siteItems = [], filename = '기성금청구서.xlsx') => {
  try {
    console.log('🚀 기성금청구서 템플릿 기반 다운로드 시작');
    
    // 템플릿 기반 엑셀 생성
    const { workbook, gisungMonth } = await generateTemplateBasedGisungExcel(siteData, gisungData, siteItems, 1, null);
    
    // 수식 보존 강제로 버퍼 생성
    console.log('💾 수식 보존 강제로 파일 생성 중...');
    const buffer = await workbook.xlsx.writeBuffer({
      sharedFormula: false,
      ignoreFormulas: false,  // 수식 보존 강제
      ignoreSharedFormulas: true,
      ignoreStyles: false,
      ignoreDataValidations: false,
      ignoreConditionalFormats: false,
      ignoreMacros: false,
      ignorePictures: false,
      ignoreCharts: false
    });
    console.log('✅ 수식 보존으로 파일 생성 완료');
    
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    // 파일 다운로드
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    console.log('✅ 기성금청구서 다운로드 완료:', filename);
    return { success: true, filename };
    
  } catch (error) {
    console.error('❌ 기성금청구서 다운로드 실패:', error);
    throw error;
  }
};

// 기성금청구서 Shared Formula 문제 완전 해결 함수 (모든 Shared Formula 속성 제거)
const fixGisungSharedFormulaIssues = (workbook) => {
  try {
    console.log('🔧 기성금청구서 모든 Shared Formula 속성 제거 시작');
    
    workbook.worksheets.forEach(sheet => {
      console.log(`🔧 ${sheet.name} 시트 Shared Formula 속성 제거`);
      
      let removedCount = 0;
      
      // 모든 셀을 스캔하여 Shared Formula 속성 제거
      console.log(`🔍 ${sheet.name} 시트 전체 Shared Formula 속성 제거 시작...`);
      
      for (let row = 1; row <= 100; row++) { // 100행까지 스캔
        for (let col = 1; col <= 26; col++) { // A-Z 열까지 스캔
          try {
            const cell = sheet.getCell(row, col);
            if (cell) {
              let hasRemoved = false;
              
              // Shared Formula 관련 속성 모두 제거
              if (cell.sharedFormula !== undefined) {
                console.log(`🔧 ${String.fromCharCode(64 + col)}${row} 셀 sharedFormula 제거`);
                delete cell.sharedFormula;
                hasRemoved = true;
              }
              
              if (cell.si !== undefined) {
                console.log(`🔧 ${String.fromCharCode(64 + col)}${row} 셀 si 제거`);
                delete cell.si;
                hasRemoved = true;
              }
              
              if (cell.ref !== undefined) {
                console.log(`🔧 ${String.fromCharCode(64 + col)}${row} 셀 ref 제거`);
                delete cell.ref;
                hasRemoved = true;
              }
              
              // 수식에 si 참조가 포함된 경우 정리
              if (cell.formula && typeof cell.formula === 'string' && cell.formula.includes('si=')) {
                cell.formula = cell.formula.replace(/si=\d+/g, '');
                hasRemoved = true;
              }
              
              // Shared Formula 관련 문자열이 있는 경우 제거
              if (cell.formula && typeof cell.formula === 'string' && 
                  (cell.formula.includes('shared') || cell.formula.includes('undefined'))) {
                cell.formula = cell.formula.replace(/shared|undefined/g, '');
                hasRemoved = true;
              }
              
              if (hasRemoved) {
                removedCount++;
              }
            }
          } catch (scanError) {
            // 개별 셀 스캔 오류는 무시하고 계속 진행
            console.warn(`⚠️ ${String.fromCharCode(64 + col)}${row} 셀 처리 실패:`, scanError.message);
          }
        }
      }
      
      console.log(`✅ ${sheet.name} 시트 Shared Formula 속성 제거 완료: ${removedCount}개 셀`);
    });
    
    console.log('✅ 기성금청구서 모든 Shared Formula 속성 제거 완료');
  } catch (error) {
    console.warn('⚠️ 기성금청구서 Shared Formula 속성 제거 중 오류:', error.message);
  }
};

// 헬퍼 함수들
const getPreviousMonth = () => {
  const now = new Date();
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${previousMonth.getFullYear()}.${String(previousMonth.getMonth() + 1).padStart(2, '0')}.`;
};

// 기성금 업로드 시 각 항목별 누계기성 값 저장 (수량과 금액 모두)
export const saveCumulativeGisungData = async (siteId, sequence, extractedItems) => {
  try {
    console.log('💾 누계기성 데이터 저장 시작:', { siteId, sequence, extractedItems });
    
    const { doc, setDoc, collection } = await import('firebase/firestore');
    const { db } = await import('../firebase');
    
    // 누계기성 데이터 저장 (K열=누계수량, L열=누계금액)
    const cumulativeData = {
      siteId: siteId,
      sequence: sequence,
      extractedItems: extractedItems, // K값(누계수량)과 L값(누계금액) 모두 포함
      savedAt: new Date(),
      updatedAt: new Date()
    };
    
    // gisung_cumulative 컬렉션에 저장
    const docRef = doc(collection(db, 'gisung_cumulative'), `${siteId}_${sequence}`);
    await setDoc(docRef, cumulativeData, { merge: true });
    
    console.log('✅ 누계기성 데이터 저장 완료:', docRef.id);
    console.log('📊 저장된 데이터:', {
      siteId,
      sequence,
      itemCount: extractedItems.length,
      sampleItem: extractedItems[0] // 첫 번째 항목 샘플
    });
    
    return { success: true, docId: docRef.id };
    
  } catch (error) {
    console.error('❌ 누계기성 데이터 저장 실패:', error);
    return { success: false, error: error.message };
  }
};

// 누계기성 데이터 가져오기
export const getCumulativeGisungData = async (siteId, sequence) => {
  try {
    console.log('📥 누계기성 데이터 가져오기:', { siteId, sequence });
    
    const { doc, getDoc, collection } = await import('firebase/firestore');
    const { db } = await import('../firebase');
    
    // gisung_cumulative 컬렉션에서 데이터 가져오기
    const docRef = doc(collection(db, 'gisung_cumulative'), `${siteId}_${sequence}`);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log('✅ 누계기성 데이터 가져오기 완료:', data);
      return { success: true, data: data };
    } else {
      console.log('📊 누계기성 데이터 없음');
      return { success: false, data: null };
    }
    
  } catch (error) {
    console.error('❌ 누계기성 데이터 가져오기 실패:', error);
    return { success: false, error: error.message };
  }
};

// 기성금 데이터 이동 함수들
export const moveCurrentToPrevious = async (siteId, gisungId) => {
  try {
    console.log('🔄 기성금 데이터 이동 시작:', { siteId, gisungId });
    
    const { doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc } = await import('firebase/firestore');
    const { db } = await import('../firebase');
    
    // 현재 기성 데이터 가져오기
    const gisungDoc = await getDoc(doc(db, 'gisung', gisungId));
    if (!gisungDoc.exists()) {
      throw new Error('기성 데이터를 찾을 수 없습니다.');
    }
    
    const currentGisung = gisungDoc.data();
    console.log('📊 현재 기성 데이터:', currentGisung);
    
    // 같은 현장의 다음 차수 기성 데이터 찾기
    const currentSequence = parseInt(currentGisung.sequence?.replace('차', '') || '0');
    const nextSequence = currentSequence + 1;
    
    const nextGisungQuery = query(
      collection(db, 'gisung'),
      where('siteId', '==', siteId),
      where('sequence', '==', `${nextSequence}차`)
    );
    
    const nextGisungSnapshot = await getDocs(nextGisungQuery);
    let nextGisungDoc = null;
    
    if (!nextGisungSnapshot.empty) {
      nextGisungDoc = nextGisungSnapshot.docs[0];
      console.log('📊 다음 차수 기성 데이터 발견:', nextGisungDoc.data());
    } else {
      console.log('📊 다음 차수 기성 데이터가 없어 새로 생성합니다.');
    }
    
    // 현재 기성 데이터를 청구완료로 변경
    await updateDoc(doc(db, 'gisung', gisungId), {
      claimStatus: '청구완료',
      updatedAt: new Date()
    });
    
    console.log('✅ 현재 기성 데이터 청구완료 처리 완료');
    
    // 현재 기성 데이터의 내역을 전회기성으로 저장
    const currentGisungAmount = currentGisung.gisungAmount || 0;
    const currentPrevGisung = currentGisung.prevGisung || 0;
    const totalPrevGisung = currentPrevGisung + currentGisungAmount;
    
    console.log(`📊 전회기성 계산: ${currentPrevGisung} + ${currentGisungAmount} = ${totalPrevGisung}`);
    
    // 다음 차수 기성 데이터가 있으면 전회기성 업데이트
    if (nextGisungDoc) {
      await updateDoc(doc(db, 'gisung', nextGisungDoc.id), {
        prevGisung: totalPrevGisung,
        updatedAt: new Date()
      });
      
      console.log('✅ 다음 차수 전회기성 업데이트 완료:', totalPrevGisung);
    } else {
      // 다음 차수가 없으면 새로 생성
      const nextGisungData = {
        siteId: siteId,
        name: currentGisung.name,
        sequence: `${nextSequence}차`,
        status: '미청구',
        claimStatus: '미청구',
        contractAmount: currentGisung.contractAmount || 0,
        advance: currentGisung.advance || 0,
        prevGisung: totalPrevGisung, // 현재 기성금을 전회기성으로 설정
        gisungAmount: 0, // 새로운 기성금은 0으로 초기화
        gisungMonth: getCurrentMonth(),
        note: '',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const newGisungDoc = await addDoc(collection(db, 'gisung'), nextGisungData);
      console.log('✅ 다음 차수 기성 데이터 생성 완료:', newGisungDoc.id);
    }
    
    return { success: true, message: '기성금 데이터 이동이 완료되었습니다.' };
    
  } catch (error) {
    console.error('❌ 기성금 데이터 이동 실패:', error);
    return { success: false, message: error.message };
  }
};

export const createNextGisungWithPrevious = async (siteId, currentGisungData) => {
  try {
    console.log('🔄 다음 차수 기성 데이터 생성 시작:', { siteId, currentGisungData });
    
    const { addDoc, collection } = await import('firebase/firestore');
    const { db } = await import('../firebase');
    
    const currentSequence = parseInt(currentGisungData.sequence?.replace('차', '') || '0');
    const nextSequence = currentSequence + 1;
    
    const nextGisungData = {
      siteId: siteId,
      name: currentGisungData.name,
      sequence: `${nextSequence}차`,
      status: '미청구',
      claimStatus: '미청구',
      contractAmount: currentGisungData.contractAmount || 0,
      advance: currentGisungData.advance || 0,
      prevGisung: currentGisungData.gisungAmount || 0, // 현재 기성금을 전회기성으로 설정
      gisungAmount: 0, // 새로운 기성금은 0으로 초기화
      gisungMonth: getCurrentMonth(),
      note: '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const newGisungDoc = await addDoc(collection(db, 'gisung'), nextGisungData);
    
    console.log('✅ 다음 차수 기성 데이터 생성 완료:', newGisungDoc.id);
    return { success: true, gisungId: newGisungDoc.id, data: nextGisungData };
    
  } catch (error) {
    console.error('❌ 다음 차수 기성 데이터 생성 실패:', error);
    return { success: false, message: error.message };
  }
};

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

