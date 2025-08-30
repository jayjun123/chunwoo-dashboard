import * as XLSX from 'xlsx';

// ?„ë¬¸?ì¸ ?‘ì? ?”ì?¸ìœ¼ë¡??´ë³´?´ê¸°
export const exportToExcel = (data, sheetName, fileName, options = {}) => {
  try {
    // ?°ì´??ê²€ì¦?    if (!data || !Array.isArray(data)) {
      throw new Error('? íš¨?˜ì? ?Šì? ?°ì´?°ì…?ˆë‹¤. ë°°ì—´ ?•íƒœ???°ì´?°ê? ?„ìš”?©ë‹ˆ??');
    }
    
    if (data.length === 0) {
      throw new Error('?´ë³´???°ì´?°ê? ?†ìŠµ?ˆë‹¤.');
    }
    
    // ?°ì´???•ë¦¬ (undefined, null ê°?ì²˜ë¦¬)
    const cleanData = data.map((row) => {
      const cleanRow = {};
      Object.keys(row).forEach(key => {
        const value = row[key];
        if (value === undefined || value === null) {
          cleanRow[key] = '';
        } else if (typeof value === 'object' && value !== null) {
          // ê°ì²´??ë°°ì—´??ê²½ìš° ë¬¸ì?´ë¡œ ë³€??          cleanRow[key] = JSON.stringify(value);
        } else {
          cleanRow[key] = value;
        }
      });
      return cleanRow;
    });
    
    const wb = XLSX.utils.book_new();
    
    // ?Œí¬?œíŠ¸ ?ì„±
    const ws = XLSX.utils.json_to_sheet(cleanData);
    
    // ?„ë¬¸?ì¸ ?‘ì? ?”ì???ìš©
    applyExcelStyling(ws, cleanData, options);
    
    // ?Œí¬ë¶ì— ?œíŠ¸ ì¶”ê?
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    // ?Œì¼ëª…ì— ? ì§œ ì¶”ê?
    const dateStr = new Date().toISOString().split('T')[0];
    const finalFileName = fileName ? `${fileName}_${dateStr}.xlsx` : `export_${dateStr}.xlsx`;
    
    // ?‘ì? ?Œì¼ ?¤ìš´ë¡œë“œ
    XLSX.writeFile(wb, finalFileName);
    
    return { success: true, fileName: finalFileName };
  } catch (error) {
    console.error('?‘ì? ?´ë³´?´ê¸° ?¤íŒ¨:', error);
    return { success: false, error: error.message };
  }
};

// ?„ë¬¸?ì¸ ?‘ì? ?¤í??¼ë§ ?ìš©
const applyExcelStyling = (ws, data, options) => {
  try {
    // ?Œí¬?œíŠ¸ ë²”ìœ„ ?•ì¸
    if (!ws['!ref']) {
      return;
    }
    
    const range = XLSX.utils.decode_range(ws['!ref']);
    
    // ?¤ë” ?¤í??¼ë§ (ì²?ë²ˆì§¸ ??
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!ws[cellAddress]) continue;
      
      ws[cellAddress].s = {
        font: {
          name: 'ë§‘ì? ê³ ë”•',
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
    
    // ?°ì´?????¤í??¼ë§
    for (let row = range.s.r + 1; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!ws[cellAddress]) continue;
        
        ws[cellAddress].s = {
          font: {
            name: 'ë§‘ì? ê³ ë”•',
            sz: 10
          },
          alignment: {
            horizontal: 'center',
            vertical: 'center'
          },
          border: {
            top: { style: 'thin', color: { rgb: 'D0D0D0' } },
            bottom: { style: 'thin', color: { rgb: 'D0D0D0' } },
            left: { style: 'thin', color: { rgb: 'D0D0D0' } },
            right: { style: 'thin', color: { rgb: 'D0D0D0' } }
          }
        };
      }
    }
    
    // ???ˆë¹„ ?ë™ ì¡°ì •
    const colWidths = [];
    for (let col = range.s.c; col <= range.e.c; col++) {
      let maxWidth = 10;
      for (let row = range.s.r; row <= range.e.r; row++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (ws[cellAddress] && ws[cellAddress].v) {
          const cellValue = String(ws[cellAddress].v);
          maxWidth = Math.max(maxWidth, cellValue.length);
        }
      }
      colWidths.push({ wch: Math.min(maxWidth + 2, 50) });
    }
    
    ws['!cols'] = colWidths;
  } catch (error) {
    console.error('?‘ì? ?¤í??¼ë§ ?ìš© ?¤íŒ¨:', error);
  }
};

// ìº˜ë¦°???°ì´?°ë? ?‘ì?ë¡??´ë³´?´ê¸°
export const exportCalendarToExcel = (calendarItems, year, month, fileName) => {
  try {
    const wb = XLSX.utils.book_new();
    
    // ë©”ì¸ ìº˜ë¦°???œíŠ¸ ?ì„±
    const calendarSheet = createCalendarSheet(calendarItems, year, month);
    XLSX.utils.book_append_sheet(wb, calendarSheet, `${year}??{month}???¼ì •`);
    
    // ?”ì•½ ?œíŠ¸ ?ì„±
    const summarySheet = createSummarySheet(calendarItems, year, month);
    XLSX.utils.book_append_sheet(wb, summarySheet, '?”ì•½');
    
    // ?Œì¼ëª??ì„±
    const dateStr = new Date().toISOString().split('T')[0];
    const finalFileName = fileName ? `${fileName}_${year}??{month}??${dateStr}.xlsx` : `calendar_${year}??{month}??${dateStr}.xlsx`;
    
    // ?Œì¼ ?¤ìš´ë¡œë“œ
    XLSX.writeFile(wb, finalFileName);
    
    return { success: true, fileName: finalFileName };
  } catch (error) {
    console.error('ìº˜ë¦°???‘ì? ?´ë³´?´ê¸° ?¤íŒ¨:', error);
    return { success: false, error: error.message };
  }
};

// ìº˜ë¦°???œíŠ¸ ?ì„±
const createCalendarSheet = (calendarItems, year, month) => {
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
  
  const calendarData = [];
  
  // ?¤ë” ì¶”ê?
  calendarData.push(['??, '??, '??, '??, 'ëª?, 'ê¸?, '??]);
  
  // ë¹??€ë¡??œì‘
  let currentRow = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    currentRow.push('');
  }
  
  // ? ì§œ?€ ?¼ì • ì¶”ê?
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    
    // ?´ë‹¹ ? ì§œ???¼ì • ì°¾ê¸°
    const dayItems = calendarItems.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate.getDate() === day && 
             itemDate.getMonth() === month - 1 && 
             itemDate.getFullYear() === year;
    });
    
    const dayContent = dayItems.length > 0 
      ? `${day}\n${dayItems.map(item => item.title).join('\n')}`
      : day.toString();
    
    currentRow.push(dayContent);
    
    // ? ìš”?¼ì´ê±°ë‚˜ ë§ˆì?ë§?? ì´ë©??¤ìŒ ?‰ìœ¼ë¡?    if (dayOfWeek === 6 || day === daysInMonth) {
      // 7ê°œê? ?˜ë„ë¡?ë¹??€ ì¶”ê?
      while (currentRow.length < 7) {
        currentRow.push('');
      }
      calendarData.push(currentRow);
      currentRow = [];
    }
  }
  
  const ws = XLSX.utils.aoa_to_sheet(calendarData);
  
  // ?¤í??¼ë§ ?ìš©
  const range = XLSX.utils.decode_range(ws['!ref']);
  
  // ?¤ë” ?¤í??¼ë§
  for (let col = 0; col < 7; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (ws[cellAddress]) {
      ws[cellAddress].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '4472C4' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      };
    }
  }
  
  // ???ˆë¹„ ?¤ì •
  ws['!cols'] = Array(7).fill({ wch: 15 });
  
  return ws;
};

// ?”ì•½ ?œíŠ¸ ?ì„±
const createSummarySheet = (calendarItems, year, month) => {
  const summaryData = [
    ['??ª©', 'ê°œìˆ˜'],
    ['?„ì²´ ?¼ì •', calendarItems.length],
    ['?„ë£Œ???¼ì •', calendarItems.filter(item => item.completed).length],
    ['ë¯¸ì™„ë£??¼ì •', calendarItems.filter(item => !item.completed).length]
  ];
  
  const ws = XLSX.utils.aoa_to_sheet(summaryData);
  
  // ?¤í??¼ë§ ?ìš©
  const range = XLSX.utils.decode_range(ws['!ref']);
  
  // ?¤ë” ?¤í??¼ë§
  for (let col = 0; col < 2; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (ws[cellAddress]) {
      ws[cellAddress].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '4472C4' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      };
    }
  }
  
  // ???ˆë¹„ ?¤ì •
  ws['!cols'] = [{ wch: 20 }, { wch: 10 }];
  
  return ws;
}; 

// ?œê? ê¸ˆì•¡ ë³€???¨ìˆ˜ (NUMBERSTRING ?€ì²?
export const convertToKoreanCurrency = (amount) => {
  // ?…ë ¥ê°?ê²€ì¦?ë°?ë³€??  const numAmount = Number(amount) || 0;
  
  if (numAmount === 0) return '?ì›??;
  
  const units = ['', 'ë§?, '??, 'ì¡?];
  const digits = ['', '??, '??, '??, '??, '??, '??, 'ì¹?, '??, 'êµ?];
  const positions = ['', '??, 'ë°?, 'ì²?];
  
  let result = '';
  let unitIndex = 0;
  let tempAmount = Math.abs(numAmount); // ?ˆë?ê°??¬ìš©
  
  while (tempAmount > 0) {
    const section = tempAmount % 10000;
    if (section > 0) {
      let sectionStr = '';
      let tempSection = section;
      let positionIndex = 0;
      
      while (tempSection > 0) {
        const digit = tempSection % 10;
        if (digit > 0) {
          if (digit > 1 || positionIndex === 0) {
            sectionStr = digits[digit] + sectionStr;
          }
          if (positionIndex > 0) {
            sectionStr = positions[positionIndex] + sectionStr;
          }
        }
        tempSection = Math.floor(tempSection / 10);
        positionIndex++;
      }
      
      if (unitIndex > 0) {
        sectionStr += units[unitIndex];
      }
      result = sectionStr + result;
    }
    
    tempAmount = Math.floor(tempAmount / 10000);
    unitIndex++;
  }
  
  // ?Œìˆ˜??ê²½ìš° ì²˜ë¦¬
  if (numAmount < 0) {
    result = 'ë§ˆì´?ˆìŠ¤ ' + result;
  }
  
  return result + '?ì •';
};

// ê¸°ì„±ê¸ˆì²­êµ¬ì„œ ?‘ì? ?ì„± (Firebase Storage ?„ìš©)
export const generateGisungExcel = async (siteData, gisungData) => {
  try {
    console.log('?“„ ê¸°ì„±ê¸ˆì²­êµ¬ì„œ ?ì„± ?œì‘:', { 
      siteName: siteData.name, 
      gisungData: gisungData
    });
    
    // Firebase Storage?ì„œ ê¸°ì„±ê¸ˆì²­êµ¬ì„œ ?œí”Œë¦??¤ìš´ë¡œë“œ
    const { ref, getDownloadURL } = await import('firebase/storage');
    const { storage } = await import('../firebase');
    
    const templateRef = ref(storage, 'templates/NEWgisung.xlsx');
    
    try {
      const templateURL = await getDownloadURL(templateRef);
      console.log('??Firebase Storage ?œí”Œë¦?URL ê°€?¸ì˜¤ê¸??±ê³µ:', templateURL);
      
      // ?œí”Œë¦??Œì¼ ê°€?¸ì˜¤ê¸?      const response = await fetch(templateURL);
      if (!response.ok) {
        throw new Error(`?œí”Œë¦??Œì¼ ?¤ìš´ë¡œë“œ ?¤íŒ¨: ${response.status} ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      console.log('??Firebase Storage ?œí”Œë¦??Œì¼ ?¤ìš´ë¡œë“œ ?„ë£Œ:', arrayBuffer.byteLength, 'bytes');
      
      // XLSXë¡??Œí¬ë¶??½ê¸°
      const workbook = XLSX.read(arrayBuffer, { type: 'array', cellFormula: true });
      console.log('??Firebase Storage ?œí”Œë¦??Œí¬ë¶?ë¡œë“œ ?„ë£Œ');
      
      // ê¸°ì„±ê¸??´ì—­???œíŠ¸???°ì´???…ë ¥
      const detailSheet = workbook.Sheets['ê¸°ì„±ê¸??´ì—­??];
      if (detailSheet) {
        console.log('?“ ê¸°ì„±ê¸??´ì—­???œíŠ¸???°ì´???…ë ¥...');
        
        // ?¤ì œ ?„ì¥ ?°ì´???¬ìš© (? ë™?? ?œì„œ ë³´ì¥)
        let items = [];
        
        // ê¸°ì„± ?°ì´?°ì—???¤ì œ ??ª©??ê°€?¸ì˜¤ê¸?        if (gisungData && gisungData.length > 0) {
          const currentGisung = gisungData[0]; // ì²?ë²ˆì§¸ ê¸°ì„± ?°ì´???¬ìš©
          if (currentGisung.items && Array.isArray(currentGisung.items)) {
            items = currentGisung.items.map((item, index) => ({
              name: item.itemName || item.name || '',
              specification: item.specification || '',
              unit: item.unit || '',
              contractQuantity: Number(item.contractQuantity || item.quantity || 0),
              contractUnitPrice: Number(item.contractUnitPrice || item.price || 0),
              previousQuantity: Number(item.previousQuantity || 0),
              currentQuantity: Number(item.currentQuantity || 0),
              rowIndex: item.rowIndex || index // ?œì„œ ë³´ì¥???¸ë±??            }));
            
            // rowIndexë¡??•ë ¬?˜ì—¬ ?œì„œ ë³´ì¥
            items.sort((a, b) => (a.rowIndex || 0) - (b.rowIndex || 0));
            
            console.log('?“‹ ê¸°ì„± ?°ì´????ª©??(?œì„œ?€ë¡?:', items.map((item, index) => `${index + 1}. ${item.name}`));
          }
        }
        
        // ê¸°ì„± ?°ì´?°ê? ?†ìœ¼ë©?ê¸°ë³¸ ?œí”Œë¦??¬ìš© (ê²¬ì ???œì„œ?€ë¡?
        if (items.length === 0) {
          items = [
            // 1. ?™êµì°?ê´€ê³µì„œ)?„ìš©? ë¦¬ - ëª¨ë“  ì¢…ë¥˜ ë¨¼ì?
            { name: '?™êµì°?ê´€ê³µì„œ)?„ìš©? ë¦¬', specification: '22mm(5+12+5), MCT(HS)+?„ë¥´ê³??¬ëª…, ê³ ë‹¨???”ë¸”ë¡œì´ ë³µì¸µ? ë¦¬', unit: 'MÂ²', contractQuantity: 0, contractUnitPrice: 49000 },
            { name: '?™êµì°?ê´€ê³µì„œ)?„ìš©? ë¦¬', specification: '22mm(5+12+5), MCT(HS)+?„ë¥´ê³?ì¹¼ë¼, ê³ ë‹¨???”ë¸”ë¡œì´ ë³µì¸µ? ë¦¬', unit: 'MÂ²', contractQuantity: 0, contractUnitPrice: 46000 },
            { name: '?™êµì°?ê´€ê³µì„œ)?„ìš©? ë¦¬', specification: '24mm(5+14+5), MCT(HS)+?„ë¥´ê³??¬ëª…, ê³ ë‹¨???”ë¸”ë¡œì´ ë³µì¸µ? ë¦¬', unit: 'MÂ²', contractQuantity: 0, contractUnitPrice: 46000 },
            { name: '?™êµì°?ê´€ê³µì„œ)?„ìš©? ë¦¬', specification: '24mm(5+14+5), MCT(HS)+?„ë¥´ê³?ì¹¼ë¼, ê³ ë‹¨???”ë¸”ë¡œì´ ë³µì¸µ? ë¦¬', unit: 'MÂ²', contractQuantity: 0, contractUnitPrice: 48000 },
            { name: '?™êµì°?ê´€ê³µì„œ)?„ìš©? ë¦¬', specification: '24mm(6+12+6), MCT(HS)+?„ë¥´ê³??¬ëª…, ê³ ë‹¨???”ë¸”ë¡œì´ ë³µì¸µ? ë¦¬', unit: 'MÂ²', contractQuantity: 0, contractUnitPrice: 51000 },
            { name: '?™êµì°?ê´€ê³µì„œ)?„ìš©? ë¦¬', specification: '43mm(5+14+5+14+5), MCT(HS)+?„ë¥´ê³??¬ëª…(HS)+?„ë¥´ê³?MCT(HS), ê³ ë‹¨???”ë¸”ë¡œì´ ?¼ì¤‘', unit: 'MÂ²', contractQuantity: 0, contractUnitPrice: 110000 },
            
            // 2. ë³µì¸µ? ë¦¬ - ëª¨ë“  ì¢…ë¥˜
            { name: 'ë³µì¸µ? ë¦¬', specification: 'ë³µì¸µ? ë¦¬, ?¬ëª…, 16mm', unit: 'MÂ²', contractQuantity: 0, contractUnitPrice: 22000 },
            { name: 'ë³µì¸µ? ë¦¬', specification: 'ë³µì¸µ? ë¦¬, ?¬ëª…, 22mm, ê±´ì¡°ê³µê¸°', unit: 'MÂ²', contractQuantity: 0, contractUnitPrice: 26000 },
            { name: 'ë³µì¸µ? ë¦¬', specification: 'ë³µì¸µ? ë¦¬, ì»¬ëŸ¬, 22mm, ê±´ì¡°ê³µê¸°, ê·¸ë¦°', unit: 'MÂ²', contractQuantity: 0, contractUnitPrice: 29000 },
            
            // 3. ì°½í˜¸? ë¦¬?¤ì¹˜/ë³µì¸µ? ë¦¬ - ëª¨ë“  ì¢…ë¥˜
            { name: 'ì°½í˜¸? ë¦¬?¤ì¹˜/ë³µì¸µ? ë¦¬', specification: '? ë¦¬?ê»˜ 16mm ?´í•˜', unit: 'MÂ²', contractQuantity: 0, contractUnitPrice: 15000 },
            { name: 'ì°½í˜¸? ë¦¬?¤ì¹˜/ë³µì¸µ? ë¦¬', specification: '? ë¦¬?ê»˜ 22mm ?´í•˜', unit: 'MÂ²', contractQuantity: 0, contractUnitPrice: 15000 },
            { name: 'ì°½í˜¸? ë¦¬?¤ì¹˜/ë³µì¸µ? ë¦¬', specification: '? ë¦¬?ê»˜ 24mm ?´í•˜', unit: 'MÂ²', contractQuantity: 0, contractUnitPrice: 18000 },
            { name: 'ì°½í˜¸? ë¦¬?¤ì¹˜/ë³µì¸µ? ë¦¬', specification: '? ë¦¬?œê»˜ 43mm ?´í•˜', unit: 'MÂ²', contractQuantity: 0, contractUnitPrice: 20000 },
            
            // 4. ? ë¦¬ì£¼ìœ„ ì½”í‚¹
            { name: '? ë¦¬ì£¼ìœ„ ì½”í‚¹', specification: 'ë³µì¸µ? ë¦¬ 5Ã—5, ?¤ë¦¬ì½??‘ë©´)', unit: 'M', contractQuantity: 0, contractUnitPrice: 300 },
            
            // 5. ë°©ìŠµê±°ìš¸
            { name: 'ë°©ìŠµê±°ìš¸', specification: '5mm,?€?¬í•¨', unit: 'MÂ²', contractQuantity: 0, contractUnitPrice: 100000 }
            // ?¨ìˆ˜?•ë¦¬??ë§ˆì?ë§‰ì— ë³„ë„ ì¶”ê?
          ];
        }
        
        // ?ë˜ ë°©ì‹?¼ë¡œ ê°„ë‹¨?˜ê²Œ ?…ë ¥
        let currentRow = 6;
        
        items.forEach((item, index) => {
          detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 0 })] = { v: item.specification };
          detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 1 })] = { v: item.name };
          detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 2 })] = { v: item.unit };
          detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 3 })] = { v: item.contractQuantity };
          detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 4 })] = { v: item.contractUnitPrice };
          detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 6 })] = { v: item.previousQuantity || 0 };
          detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 8 })] = { v: item.currentQuantity || 0 };
          currentRow++;
        });
        
        // 6. ë§ˆì?ë§‰ì— ?¨ìˆ˜?•ë¦¬ ì¶”ê?
        detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 0 })] = { v: '?¨ìˆ˜?•ë¦¬' };
        detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 1 })] = { v: 'NEGO' };
        detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 2 })] = { v: '?? };
        detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 3 })] = { v: 1 };
        detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 4 })] = { v: -341570 };
        detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 5 })] = { v: -341570 };
        
        console.log('???°ì´???…ë ¥ ?„ë£Œ');
      }
      
      return workbook;
      
    } catch (error) {
      console.error('??Firebase Storage ?œí”Œë¦?ë¡œë“œ ?¤íŒ¨:', error);
      throw new Error(`Firebase Storage?ì„œ ?œí”Œë¦¿ì„ ê°€?¸ì˜¬ ???†ìŠµ?ˆë‹¤: ${error.message}`);
    }
    
  } catch (error) {
    console.error('??ê¸°ì„±ê¸ˆì²­êµ¬ì„œ ?ì„± ?¤íŒ¨:', error);
    throw error;
  }
};

// ê¸°ì„±ê¸??´ì—­?œì— ?˜ì‹ ?ìš©?˜ëŠ” ?¨ìˆ˜
const applyGisungFormulas = (worksheet) => {
  // ?¤ë”ê°€ 5?‰ì´ë¯€ë¡??°ì´?°ëŠ” 6?‰ë????œì‘ (0ë¶€???œì‘?˜ë?ë¡?5)
  const startRow = 5;
  const endRow = 20; // ?¨ìˆ˜?•ë¦¬ê¹Œì? ?¬í•¨
  
  // F?´ì— ?˜ì‹ ?ìš© (ê³„ì•½ê¸ˆì•¡ - ê¸ˆì•¡) - F6ë¶€??F20ê¹Œì?
  for (let row = startRow; row <= endRow; row++) {
    const cellAddress = XLSX.utils.encode_cell({ r: row, c: 5 }); // F??    worksheet[cellAddress] = {
      f: `=D${row + 1}*E${row + 1}`, // ?˜ëŸ‰ Ã— ?¨ê?
      v: 0 // ê¸°ë³¸ê°?    };
  }
  
  // H?´ì— ?˜ì‹ ?ìš© (?„íšŒê¸°ì„± - ê¸ˆì•¡) - H6ë¶€??H20ê¹Œì?
  for (let row = startRow; row <= endRow; row++) {
    const cellAddress = XLSX.utils.encode_cell({ r: row, c: 7 }); // H??    worksheet[cellAddress] = {
      f: `=G${row + 1}*E${row + 1}`, // ?„íšŒê¸°ì„± ?˜ëŸ‰ Ã— ?¨ê?
      v: 0 // ê¸°ë³¸ê°?    };
  }
  
  // J?´ì— ?˜ì‹ ?ìš© (ê¸ˆíšŒê¸°ì„± - ê¸ˆì•¡) - J6ë¶€??J20ê¹Œì?
  for (let row = startRow; row <= endRow; row++) {
    const cellAddress = XLSX.utils.encode_cell({ r: row, c: 9 }); // J??    worksheet[cellAddress] = {
      f: `=I${row + 1}*E${row + 1}`, // ê¸ˆíšŒê¸°ì„± ?˜ëŸ‰ Ã— ?¨ê?
      v: 0 // ê¸°ë³¸ê°?    };
  }
  
  // K?´ì— ?˜ì‹ ?ìš© (?©ê³„ - ?˜ëŸ‰) - K6ë¶€??K20ê¹Œì?
  for (let row = startRow; row <= endRow; row++) {
    const cellAddress = XLSX.utils.encode_cell({ r: row, c: 10 }); // K??    worksheet[cellAddress] = {
      f: `=G${row + 1}+I${row + 1}`, // ?„íšŒê¸°ì„± ?˜ëŸ‰ + ê¸ˆíšŒê¸°ì„± ?˜ëŸ‰
      v: 0 // ê¸°ë³¸ê°?    };
  }
  
  // L?´ì— ?˜ì‹ ?ìš© (?©ê³„ - ê¸ˆì•¡) - L6ë¶€??L20ê¹Œì?
  for (let row = startRow; row <= endRow; row++) {
    const cellAddress = XLSX.utils.encode_cell({ r: row, c: 11 }); // L??    worksheet[cellAddress] = {
      f: `=H${row + 1}+J${row + 1}`, // ?„íšŒê¸°ì„± ê¸ˆì•¡ + ê¸ˆíšŒê¸°ì„± ê¸ˆì•¡
      v: 0 // ê¸°ë³¸ê°?    };
  }
  
  // ? ê¸‰ê¸? ì´ê³µ?¬ë¹„, ë¶€ê°€?? ì´ê³„ ?˜ì‹ ?ìš©
  // ? ê¸‰ê¸ˆì? ?´ë? ê°’ìœ¼ë¡??¤ì •??(F22)
  
  // ì´ê³µ?¬ë¹„ ?˜ì‹ (F23) - ?¨ìˆ˜?•ë¦¬ê¹Œì? ?¬í•¨
  const detailTotalCell = XLSX.utils.encode_cell({ r: 22, c: 5 }); // F23
  worksheet[detailTotalCell] = {
    f: '=SUM(F6:F20)', // ?¨ìˆ˜?•ë¦¬ê¹Œì? ?¬í•¨???©ê³„
    v: 0
  };
  
  // ë¶€ê°€???˜ì‹ (F24) - ì´ê³µ?¬ë¹„??10%
  const detailVatCell = XLSX.utils.encode_cell({ r: 23, c: 5 }); // F24
  worksheet[detailVatCell] = {
    f: '=F23*0.1', // ì´ê³µ?¬ë¹„ * 10%
    v: 0
  };
  
  // ì´ê³„ ?˜ì‹ (F25) - ì´ê³µ?¬ë¹„ + ë¶€ê°€??  const detailGrandTotalCell = XLSX.utils.encode_cell({ r: 24, c: 5 }); // F25
  worksheet[detailGrandTotalCell] = {
    f: '=F23+F24', // ì´ê³µ?¬ë¹„ + ë¶€ê°€??    v: 0
  };
};

// ê¸°ì„±ê¸??´ì—­???œíŠ¸ ?°ì´???ì„± (ê¸°ì¡´ ?œí”Œë¦?? ì?, ?°ì´?°ë§Œ ?˜ì •)
const createGisungDetailSheet = (siteData, gisungData) => {
  const data = [];
  
  // ?°ì´??ê²€ì¦?ë°?ê¸°ë³¸ê°??¤ì •
  const safeSiteData = siteData || {};
  const safeGisungData = Array.isArray(gisungData) ? gisungData : [];
  
  // ?œëª© (A1:M1 ë³‘í•©)
  data.push(['ê¸°ì„±ê¸??´ì—­??, '', '', '', '', '', '', '', '', '', '', '', '']);
  data.push([]);
  
  // ê³µì‚¬ëª??œê±° - ?ˆëª…ë§??œì‹œ?˜ë„ë¡??˜ì •
  data.push([]);
  data.push([]);
  
  // ?¤ë” (ê°€ë¡?A4 ?©ì???ë§ì¶° ë°°ì¹˜ - 2???¤ë”)
  data.push(['?ˆëª…', 'ê·œê²©', '?¨ìœ„', '?˜ëŸ‰(ê³„ì•½?˜ëŸ‰)', '?¨ê?', 'ê¸ˆì•¡', '?˜ëŸ‰(?„íšŒ)', 'ê¸ˆì•¡(?„íšŒ)', '?˜ëŸ‰(ê¸ˆíšŒ)', 'ê¸ˆì•¡(ê¸ˆíšŒ)', '?˜ëŸ‰(?©ê³„)', 'ê¸ˆì•¡(?©ê³„)', 'ë¹„ê³ ']);
  
  // ?¬ì§„???˜ì˜¨ ?•í™•???°ì´?°ë¡œ ?˜ì • (?¨ìˆ˜?•ë¦¬ ì¤‘ë³µ ?œê±°)
  const basicItems = [
    { name: 'ë³µì¸µ? ë¦¬', specification: '?¬ëª…, 16mm', unit: 'MÂ²', contractQuantity: 6, contractUnitPrice: 22000 },
    { name: 'ë³µì¸µ? ë¦¬', specification: '?¬ëª…, 22mm, ê±´ì¡°ê³µê¸°', unit: 'MÂ²', contractQuantity: 10, contractUnitPrice: 26000 },
    { name: 'ë³µì¸µ? ë¦¬', specification: 'ì»¬ëŸ¬, 22mm, ê±´ì¡°ê³µê¸°, ê·¸ë¦°', unit: 'MÂ²', contractQuantity: 10, contractUnitPrice: 29000 },
    { name: '?™êµì°?ê´€ê³µì„œ)?„ìš©? ë¦¬', specification: '22mm(5+12+5), MCT(HS)+?„ë¥´ê³???, unit: 'MÂ²', contractQuantity: 1, contractUnitPrice: 49000 },
    { name: '?™êµì°?ê´€ê³µì„œ)?„ìš©? ë¦¬', specification: '22mm(5+12+5), MCT(HS)+?„ë¥´ê³???, unit: 'MÂ²', contractQuantity: 1, contractUnitPrice: 46000 },
    { name: '?™êµì°?ê´€ê³µì„œ)?„ìš©? ë¦¬', specification: '24mm(5+14+5), MCT(HS)+?„ë¥´ê³?', unit: 'MÂ²', contractQuantity: 35, contractUnitPrice: 46000 },
    { name: '?™êµì°?ê´€ê³µì„œ)?„ìš©? ë¦¬', specification: '24mm(5+14+5), MCT(HS)+?„ë¥´ê³???, unit: 'MÂ²', contractQuantity: 17, contractUnitPrice: 48000 },
    { name: '?™êµì°?ê´€ê³µì„œ)?„ìš©? ë¦¬', specification: '24mm(6+12+6), MCT(HS)+?„ë¥´ê³?', unit: 'MÂ²', contractQuantity: 6, contractUnitPrice: 51000 },
    { name: '?™êµì°?ê´€ê³µì„œ)?„ìš©? ë¦¬', specification: '43mm(5+14+5+14+5), MCT(HS)+??, unit: 'MÂ²', contractQuantity: 13, contractUnitPrice: 110000 },
    { name: 'ì°½í˜¸? ë¦¬?¤ì¹˜/ë³µì¸µ? ë¦¬', specification: '? ë¦¬?ê»˜ 16mm ?´í•˜', unit: 'MÂ²', contractQuantity: 6, contractUnitPrice: 15000 },
    { name: 'ì°½í˜¸? ë¦¬?¤ì¹˜/ë³µì¸µ? ë¦¬', specification: '? ë¦¬?ê»˜ 22mm ?´í•˜', unit: 'MÂ²', contractQuantity: 21, contractUnitPrice: 15000 },
    { name: 'ì°½í˜¸? ë¦¬?¤ì¹˜/ë³µì¸µ? ë¦¬', specification: '? ë¦¬?ê»˜ 24mm ?´í•˜', unit: 'MÂ²', contractQuantity: 57, contractUnitPrice: 18000 },
    { name: 'ì°½í˜¸? ë¦¬?¤ì¹˜/ë³µì¸µ? ë¦¬', specification: '? ë¦¬?œê»˜ 43mm ?´í•˜', unit: 'MÂ²', contractQuantity: 13, contractUnitPrice: 20000 },
    { name: '? ë¦¬ì£¼ìœ„ ì½”í‚¹', specification: 'ë³µì¸µ? ë¦¬ 5x5, ?¤ë¦¬ì½??‘ë©´)', unit: 'M', contractQuantity: 509, contractUnitPrice: 300 },
    { name: 'ë°©ìŠµê±°ìš¸', specification: '5mm,?€?¬í•¨', unit: 'MÂ²', contractQuantity: 1, contractUnitPrice: 100000 }
    // ?¨ìˆ˜?•ë¦¬ ?œê±° - ë§ˆì?ë§‰ì— ??ë²ˆë§Œ ì¶”ê?
  ];
  
  let hasData = false;
  
  // ê¸°ë³¸ ??ª©??ì¶”ê? (ê¸°ì¡´ ?œí”Œë¦?êµ¬ì¡° ? ì?)
  basicItems.forEach(item => {
    data.push([
      item.name,                    // A?? ?ˆëª…
      item.specification,           // B?? ê·œê²©
      item.unit,                    // C?? ?¨ìœ„
      item.contractQuantity,        // D?? ?˜ëŸ‰(ê³„ì•½?˜ëŸ‰)
      item.contractUnitPrice,       // E?? ?¨ê?
      0,                           // F?? ê¸ˆì•¡ (?˜ì‹?¼ë¡œ ê³„ì‚°)
      0,                           // G?? ?˜ëŸ‰(?„íšŒ)
      0,                           // H?? ê¸ˆì•¡(?„íšŒ) (?˜ì‹?¼ë¡œ ê³„ì‚°)
      0,                           // I?? ?˜ëŸ‰(ê¸ˆíšŒ)
      0,                           // J?? ê¸ˆì•¡(ê¸ˆíšŒ) (?˜ì‹?¼ë¡œ ê³„ì‚°)
      0,                           // K?? ?˜ëŸ‰(?©ê³„) (?˜ì‹?¼ë¡œ ê³„ì‚°)
      0,                           // L?? ê¸ˆì•¡(?©ê³„) (?˜ì‹?¼ë¡œ ê³„ì‚°)
      ''                           // M?? ë¹„ê³ 
    ]);
  });
  
  // ?¤ì œ ê¸°ì„± ?°ì´?°ê? ?ˆëŠ” ê²½ìš° ?´ë‹¹ ?°ì´?°ë¡œ ??–´?°ê¸° (?œì„œ ë³´ì¥)
  if (safeGisungData.length > 0) {
    const currentGisung = safeGisungData[safeGisungData.length - 1];
    
    // itemsê°€ ?ˆëŠ” ê²½ìš°
    if (currentGisung.items && Array.isArray(currentGisung.items) && currentGisung.items.length > 0) {
      hasData = true;
      const items = currentGisung.items;
      
      // ê¸°ì„± ?°ì´?°ë? ?œì„œ?€ë¡??•ë ¬
      const sortedItems = [...items].sort((a, b) => (a.rowIndex || 0) - (b.rowIndex || 0));
      
      console.log('?“‹ ê¸°ì„± ?°ì´???œì„œ:', sortedItems.map((item, index) => `${index + 1}. ${item.itemName || item.name} (??${item.rowIndex || 'N/A'})`));
      
      // ?œì„œ?€ë¡??°ì´???…ë°?´íŠ¸ (?¸ë±??ë§¤ì¹­)
      sortedItems.forEach((item, index) => {
        // item??ê°ì²´?¸ì? ?•ì¸?˜ê³  ?ˆì „?˜ê²Œ ì²˜ë¦¬
        if (typeof item !== 'object' || item === null || Array.isArray(item)) {
          return;
        }
        
        // ê¸°ë³¸ ??ª©?¤ê³¼ ë§¤ì¹­?˜ì—¬ ?°ì´???…ë°?´íŠ¸
        const matchingIndex = data.findIndex(row => {
          const rowName = row[0] || '';
          const itemName = item.itemName || item.name || '';
          return rowName === itemName;
        });
        
        if (matchingIndex !== -1) {
          // ê¸°ì¡´ ?‰ì„ ?¤ì œ ?°ì´?°ë¡œ ?…ë°?´íŠ¸
          const contractQuantity = Number(item.contractQuantity || item.quantity || 0);
          const contractUnitPrice = Number(item.contractUnitPrice || item.price || 0);
          const previousQuantity = Number(item.previousQuantity || 0);
          const currentQuantity = Number(item.currentQuantity || 0);
          
          data[matchingIndex] = [
            String(item.itemName || item.name || ''),  // A?? ?ˆëª…
            String(item.specification || ''),          // B?? ê·œê²©
            String(item.unit || ''),                   // C?? ?¨ìœ„
            contractQuantity,                          // D?? ?˜ëŸ‰(ê³„ì•½?˜ëŸ‰)
            contractUnitPrice,                         // E?? ?¨ê?
            0,                                        // F?? ê¸ˆì•¡ (?˜ì‹?¼ë¡œ ê³„ì‚°)
            previousQuantity,                          // G?? ?˜ëŸ‰(?„íšŒ)
            0,                                        // H?? ê¸ˆì•¡(?„íšŒ) (?˜ì‹?¼ë¡œ ê³„ì‚°)
            currentQuantity,                           // I?? ?˜ëŸ‰(ê¸ˆíšŒ)
            0,                                        // J?? ê¸ˆì•¡(ê¸ˆíšŒ) (?˜ì‹?¼ë¡œ ê³„ì‚°)
            0,                                        // K?? ?˜ëŸ‰(?©ê³„) (?˜ì‹?¼ë¡œ ê³„ì‚°)
            0,                                        // L?? ê¸ˆì•¡(?©ê³„) (?˜ì‹?¼ë¡œ ê³„ì‚°)
            String(item.remark || '')                 // M?? ë¹„ê³ 
          ];
          
          console.log(`??${index + 1}ë²ˆì§¸ ??ª© ë§¤ì¹­: ${item.itemName || item.name} (??${item.rowIndex || 'N/A'})`);
        }
      });
    }
  }
  
  // ëª¨ë“  ??ª©???„í„°ë§?(?¨ìˆ˜?•ë¦¬ ?¬í•¨)
  const filteredData = [];
  
  for (const row of data) {
    const itemName = row[0] || '';
    
    // ì§‘ê³„ ?‰ë“¤??ë§Œë‚˜ë©?ì¤‘ë‹¨
    if (itemName.includes('ì´?ê³µì‚¬ê³?) || itemName.includes('ì´ê³µ?¬ê³„') || 
        itemName.includes('ë¶€ê°€??) || itemName.includes('ê³„ì•½ê¸ˆì•¡')) {
      console.log('?›‘ ì§‘ê³„??ë°œê²¬ ??ì¤‘ë‹¨:', itemName);
      break;
    } else if (itemName) {
      // ëª¨ë“  ??ª© ?¬í•¨ (?¨ìˆ˜?•ë¦¬ ?¬í•¨)
      filteredData.push(row);
    }
  }
  
  console.log('??ëª¨ë“  ??ª©???„í„°ë§??„ë£Œ (?¨ìˆ˜?•ë¦¬ ?¬í•¨)');
  
  // ?¨ìˆ˜?•ë¦¬ ?´í›„??? ê¸‰ê¸? ì´ê³µ?¬ë¹„, ë¶€ê°€?? ì´ê³„ ì¶”ê?
  filteredData.push([]); // ë¹???  filteredData.push([]); // ë¹???  
  // ? ê¸‰ê¸???ì¶”ê?
  filteredData.push(['? ê¸‰ê¸?, '', '', '', '', Number(safeSiteData.advance || 0), '', '', '', '', '', '', '']);
  
  // ì´ê³µ?¬ë¹„ ??ì¶”ê? (?˜ì‹?¼ë¡œ ê³„ì‚°)
  filteredData.push(['ì´ê³µ?¬ë¹„', '', '', '', '', 0, '', '', '', '', '', '', '']); // F?´ì— ?˜ì‹ ?ìš© ?ˆì •
  
  // ë¶€ê°€????ì¶”ê? (?˜ì‹?¼ë¡œ ê³„ì‚°)
  filteredData.push(['ë¶€ê°€??, '', '', '', '', 0, '', '', '', '', '', '', '']); // F?´ì— ?˜ì‹ ?ìš© ?ˆì •
  
  // ì´ê³„ ??ì¶”ê? (?˜ì‹?¼ë¡œ ê³„ì‚°)
  filteredData.push(['ì´ê³„', '', '', '', '', 0, '', '', '', '', '', '', '']); // F?´ì— ?˜ì‹ ?ìš© ?ˆì •
  
  return filteredData;
};

// ê¸°ì„±ê¸??´ì—­???¤í??¼ë§ ?ìš©
const applyGisungDetailStyling = (detailSheet) => {
  try {
    // ?œëª© ë³‘í•© (A1:M1)
    if (!detailSheet['!merges']) detailSheet['!merges'] = [];
    detailSheet['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 12 } });
    
    // ?¤ë” ?¤í??¼ë§ (13ê°?ì»¬ëŸ¼) - 5??    for (let col = 0; col < 13; col++) {
      const cell4 = XLSX.utils.encode_cell({ r: 4, c: col });
      
      if (detailSheet[cell4]) {
        detailSheet[cell4].s = {
          font: { name: 'ë§‘ì? ê³ ë”•', sz: 9, bold: true },
          alignment: { horizontal: 'center', vertical: 'center' },
          fill: { fgColor: { rgb: '4472C4' } },
          color: { rgb: 'FFFFFF' }
        };
      }
    }
    
    // ???ˆë¹„ ?¤ì •
    detailSheet['!cols'] = [
      { wch: 15 }, // A (?ˆëª…)
      { wch: 12 }, // B (ê·œê²©)
      { wch: 6 },  // C (?¨ìœ„)
      { wch: 8 },  // D (?˜ëŸ‰-ê³„ì•½)
      { wch: 8 },  // E (?¨ê?)
      { wch: 10 }, // F (ê¸ˆì•¡-ê³„ì•½)
      { wch: 8 },  // G (?˜ëŸ‰-?„íšŒ)
      { wch: 10 }, // H (ê¸ˆì•¡-?„íšŒ)
      { wch: 8 },  // I (?˜ëŸ‰-ê¸ˆíšŒ)
      { wch: 10 }, // J (ê¸ˆì•¡-ê¸ˆíšŒ)
      { wch: 8 },  // K (?˜ëŸ‰-?©ê³„)
      { wch: 10 }, // L (ê¸ˆì•¡-?©ê³„)
      { wch: 12 }, // M (ë¹„ê³ )
    ];
    
  } catch (error) {
    console.error('ê¸°ì„±ê¸??´ì—­???¤í??¼ë§ ?ìš© ?¤íŒ¨:', error);
  }
};

// ?œíŠ¸ ê°?ì°¸ì¡° ?¤ì •
const setSheetReferences = (workbook, gapjiSheet, detailSheet) => {
  // ê°‘ì? ?œíŠ¸???˜ì‹ ?¤ì •
  // H14 = ê¸°ì„±ê¸??´ì—­??F27 (ê³„ì•½ ì´ì•¡)
  // H16 = ê¸°ì„±ê¸??´ì—­??H24 (? ê¸‰ê¸?
  // H18 = ê¸°ì„±ê¸??´ì—­??H27 (?„íšŒ ê¸°ì„±??
  // H20 = ê¸°ì„±ê¸??´ì—­??J27 (ê¸ˆíšŒ ê¸°ì„±??
  // H23 = ê¸°ì„±ê¸??´ì—­??L27 (?„ê³„ ê¸°ì„±??
  // H27 = ê¸°ì„±ê¸??´ì—­??F27 - ê¸°ì„±ê¸??´ì—­??L27 (?”ì•¡)
  
  // ê¸°ì„±ê¸??´ì—­???œíŠ¸??A2 ?€??ê³µì‚¬ëª??œì‹œ
  // A2 = "ê³µì‚¬ëª?: "&ê°‘ì?!D4&" ì¤?? ë¦¬ê³µì‚¬"
};

// ?‘ì? ?Œì¼ ?¤ìš´ë¡œë“œ
export const downloadGisungExcel = async (siteData, gisungData, filename = 'ê¸°ì„±ê¸ˆì²­êµ¬ì„œ.xlsx') => {
  try {
    const workbook = await generateGisungExcel(siteData, gisungData);
    XLSX.writeFile(workbook, filename);
    console.log('??ê¸°ì„±ê¸ˆì²­êµ¬ì„œ ?¤ìš´ë¡œë“œ ?„ë£Œ:', filename);
  } catch (error) {
    console.error('??ê¸°ì„±ê¸ˆì²­êµ¬ì„œ ?¤ìš´ë¡œë“œ ?¤íŒ¨:', error);
    throw error;
  }
};

// ?‘ì? ?Œì¼ ?…ë¡œ??ë°??Œì‹±
export const parseGisungExcel = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellFormula: true });
        const normNum = (v) => {
          if (v === null || v === undefined || v === '') return 0;
          const s = String(v).trim().replace(/[,\s]/g, '');
          const n = parseFloat(s);
          return Number.isFinite(n) ? n : 0;
        };
        const tryReadGapji = () => {
          // ê°‘ì? ?œíŠ¸ë¥?ì°¾ì•„ A36, H16, H20, H23???½ëŠ”??          let gapjiName = null;
          if (workbook.Sheets['ê°‘ì?']) gapjiName = 'ê°‘ì?';
          else {
            const found = workbook.SheetNames.find(n => n && n.includes('ê°?));
            if (found) gapjiName = found;
          }
          if (!gapjiName) return null;
          const ws = workbook.Sheets[gapjiName];
          if (!ws) return null;
          const read = (addr) => (ws[addr] ? ws[addr].v : '');
          const rawMonth = (read('A36') || '').toString().trim();
          // A36 ?ˆì‹œ: 2025.08. ??YYYY-MM?¼ë¡œ ë³€??          let gisungMonth = '';
          const m = rawMonth.match(/(\d{4})[\.-](\d{1,2})/);
          if (m) gisungMonth = `${m[1]}-${m[2].padStart(2, '0')}`;
          const advance = normNum(read('H16'));
          const previous = normNum(read('H18'));
          const current = normNum(read('H20'));
          const cumulative = normNum(read('H23')) || (previous + current);
          return { gisungMonth, advance, current, cumulative, previous };
        };
        
        // ê¸°ì„±?„í™© ?œíŠ¸ ?Œì‹± (?ˆë¡œ???•ì‹)
        const gisungSheet = workbook.Sheets['ê¸°ì„±?„í™©'];
        if (gisungSheet) {
        const gisungData = XLSX.utils.sheet_to_json(gisungSheet, { defval: '' });
          console.log('ê¸°ì„±?„í™© ?œíŠ¸ ?°ì´??', gisungData);
          
          if (gisungData && gisungData.length > 0) {
            // ì²?ë²ˆì§¸ ?‰ì—???„ì¥ëª…ê³¼ ê¸°ì„±??ì¶”ì¶œ
            const firstRow = gisungData[0];
            const siteName = (firstRow['?„ì¥ëª?] || '').toString().trim();
            let gisungMonth = (firstRow['ê¸°ì„±??] || '').toString().trim();
            
            // ê¸°ì„± ?°ì´??ë³€??(ê¸°ë³¸?ìœ¼ë¡?ë¯¸ì²­êµ??íƒœë¡??¤ì •)
            const num = (v) => {
              if (v === null || v === undefined || v === '') return 0;
              const s = String(v).trim().replace(/,/g, '');
              const n = parseFloat(s);
              return Number.isFinite(n) ? n : 0;
            };
            const items = gisungData.map(row => ({
              itemName: (row['?„ì¥ëª?] || '').toString().trim(),
              gisungMonth: (row['ê¸°ì„±??] || '').toString().trim(),
              specification: '',
              unit: '',
              contractQuantity: 0,
              contractUnitPrice: 0,
              contractAmount: num(row['ê³„ì•½ê¸ˆì•¡']),
              previousQuantity: 0,
              previousAmount: num(row['?„íšŒê¸°ì„±']),
              currentQuantity: 0,
              currentAmount: num(row['ê¸°ì„±ê¸ˆì•¡']),
              totalQuantity: 0,
              totalAmount: num(row['?„íšŒê¸°ì„±']) + num(row['ê¸°ì„±ê¸ˆì•¡']),
              remark: (row['ë¹„ê³ '] || '').toString().trim(),
              claimStatus: 'ë¯¸ì²­êµ? // ê¸°ë³¸?ìœ¼ë¡?ë¯¸ì²­êµ??íƒœë¡??¤ì •
            }));
            
            // ê°‘ì??ì„œ ë³´ì •ê°??½ì–´ ë°˜ì˜
            const gapji = tryReadGapji();
            const summary = (() => {
              const base = {
                totalContractAmount: items.reduce((sum, item) => sum + item.contractAmount, 0),
                totalPreviousAmount: items.reduce((sum, item) => sum + item.previousAmount, 0),
                totalCurrentAmount: items.reduce((sum, item) => sum + item.currentAmount, 0),
                totalAmount: items.reduce((sum, item) => sum + item.totalAmount, 0)
              };
              if (gapji) {
                if (!gisungMonth && gapji.gisungMonth) gisungMonth = gapji.gisungMonth;
                return {
                  totalContractAmount: base.totalContractAmount,
                  totalPreviousAmount: gapji.previous,
                  totalCurrentAmount: gapji.current,
                  totalAmount: gapji.cumulative,
                  advance: gapji.advance
                };
              }
              return base;
            })();
            
            resolve({
              siteName,
              gisungMonth,
              items,
              summary
            });
            return;
          }
        }
        
        // ê¸°ì„±ê¸??´ì—­???œíŠ¸ ?Œì‹± (ê¸°ì¡´ ?•ì‹)
        const detailSheet = workbook.Sheets['ê¸°ì„±ê¸??´ì—­??];
        if (!detailSheet) {
          throw new Error('ê¸°ì„±?„í™© ?ëŠ” ê¸°ì„±ê¸??´ì—­???œíŠ¸ë¥?ì°¾ì„ ???†ìŠµ?ˆë‹¤.');
        }
        
        const detailData = XLSX.utils.sheet_to_json(detailSheet, { header: 1, defval: '' });
        
        // ?°ì´???Œì‹±
        const parsedData = parseDetailData(detailData);
        // ê°‘ì? ?œíŠ¸ ?ˆìœ¼ë©??”ì•½ê°?êµì²´
        const gapji = tryReadGapji();
        if (gapji) {
          parsedData.gisungMonth = gapji.gisungMonth || parsedData.gisungMonth;
          parsedData.summary = parsedData.summary || {};
          parsedData.summary.totalPreviousAmount = gapji.previous;
          parsedData.summary.totalCurrentAmount = gapji.current;
          parsedData.summary.totalAmount = gapji.cumulative;
          parsedData.summary.advance = gapji.advance;
        }
        
        resolve(parsedData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('?Œì¼ ?½ê¸° ?¤ë¥˜'));
    reader.readAsArrayBuffer(file);
  });
};

// ?ì„¸ ?°ì´???Œì‹± (?œì„œ ë³´ì¥)
const parseDetailData = (data) => {
  const items = [];
  
  // ?¤ë” ê±´ë„ˆ?°ê¸° (4?‰ê¹Œì§€)
  for (let i = 4; i < data.length - 4; i++) {
    const row = data[i];
    const itemName = row && row[0] ? String(row[0]).trim() : '';
    
    // ?¨ìˆ˜?•ë¦¬??NEGO ?´í›„??ì§‘ê³„ ?‰ë“¤??ë§Œë‚˜ë©?ì¤‘ë‹¨ (ì´ê³µ?¬ê³„, ë¶€ê°€?? ê³„ì•½ê¸ˆì•¡ ???œì™¸)
    if (itemName.includes('ì´?ê³µì‚¬ê³?) || itemName.includes('ì´ê³µ?¬ê³„') || 
        itemName.includes('ë¶€ê°€??) || itemName.includes('ê³„ì•½ê¸ˆì•¡')) {
      console.log(`?›‘ ì§‘ê³„??ë°œê²¬: ${i + 1}??- ?Œì‹± ì¤‘ë‹¨`);
      break;
    }
    
    // ? íš¨???‰ë§Œ ì²˜ë¦¬
    if (row && row[0] && row[0] !== '? ê¸‰ê¸? && row[0] !== 'ì´ì›ê°€' && row[0] !== 'ë¶€ê°€ê°€ì¹˜ì„¸' && row[0] !== 'ì´ê³„') {
      // ?¨ìˆ˜?•ë¦¬ ì¤‘ë³µ ?œê±° ë¡œì§ ?œê±° - ?¤ì œ ?°ì´?°ì˜ ?¨ìˆ˜?•ë¦¬ë¥??¬í•¨
      
      // ?«ì ?Œì‹± ?¨ìˆ˜ ê°œì„  (?Œìˆ˜???˜ì§¸?ë¦¬ê¹Œì?)
      const parseNumber = (value) => {
        if (value === null || value === undefined || value === '') return 0;
        const str = String(value).trim().replace(/[,\s]/g, '');
        const num = parseFloat(str);
        return Number.isFinite(num) ? Math.round(num * 100) / 100 : 0;
      };
      
      // K?´ì´ ?˜ì‹?¸ì? ?•ì¸ (G+I ?•íƒœ)
      const kCell = row[10];
      let totalQuantity = 0;
      let isKFormula = false;
      
      console.log(`?” K???€ ë¶„ì„ (??${i + 1}):`, {
        kCell: kCell,
        kCellType: typeof kCell,
        hasFormula: kCell && typeof kCell === 'object' && kCell.f,
        formula: kCell && typeof kCell === 'object' ? kCell.f : '?†ìŒ'
      });
      
      if (kCell && typeof kCell === 'object' && kCell.f) {
        // ?˜ì‹??ê²½ìš°
        const formula = kCell.f.toString().toUpperCase();
        if (formula.includes('G') && formula.includes('I') && formula.includes('+')) {
          isKFormula = true;
          totalQuantity = parseNumber(kCell.v || kCell.result || 0);
          console.log(`??K???˜ì‹ ë°œê²¬: ${formula}, ê³„ì‚°ê°? ${totalQuantity}`);
        } else {
          console.log(`? ï¸ K???˜ì‹?´ì?ë§?G+I ?•íƒœê°€ ?„ë‹˜: ${formula}`);
        }
      } else {
        // ?¼ë°˜ ê°’ì¸ ê²½ìš°
        totalQuantity = parseNumber(row[10]);
        console.log(`?“ K???¼ë°˜ê°? ${totalQuantity}`);
      }
      
      const item = {
        itemName: String(row[0] || '').trim(), // A?´ì„ ?ˆëª…?¼ë¡œ
        specification: String(row[1] || '').trim(), // B?´ì„ ê·œê²©?¼ë¡œ
        unit: String(row[2] || '').trim(),
        contractQuantity: parseNumber(row[3]),
        contractUnitPrice: parseNumber(row[4]),
        contractAmount: parseNumber(row[5]),
        previousQuantity: parseNumber(row[6]),
        previousAmount: parseNumber(row[7]),
        currentQuantity: parseNumber(row[8]),
        currentAmount: parseNumber(row[9]),
        totalQuantity: totalQuantity,
        totalAmount: parseNumber(row[11]),
        remark: String(row[12] || '').trim(),
        isKFormula: isKFormula, // K?´ì´ ?˜ì‹?¸ì? ?œì‹œ
        rowIndex: i // ???¸ë±??ì¶”ê? (?œì„œ ë³´ì¥??
      };
      
      console.log(`?Œì‹±????ª©: ${item.itemName} (??${i + 1})`, {
        contractQuantity: item.contractQuantity.toFixed(2),
        currentQuantity: item.currentQuantity.toFixed(2),
        totalQuantity: item.totalQuantity.toFixed(2),
        contractAmount: item.contractAmount.toFixed(2),
        currentAmount: item.currentAmount.toFixed(2),
        totalAmount: item.totalAmount.toFixed(2)
      });
      
      items.push(item);
    }
  }
  
  // ???¸ë±?¤ë¡œ ?•ë ¬?˜ì—¬ ?œì„œ ë³´ì¥
  items.sort((a, b) => a.rowIndex - b.rowIndex);
  
  console.log('?“‹ ?Œì‹±????ª©??(?œì„œ?€ë¡?:', items.map((item, index) => `${index + 1}. ${item.itemName} (??${item.rowIndex + 1})`));
  
  return {
    items,
    summary: {
      totalContractAmount: data[data.length - 4]?.[5] || 0,
      totalPreviousAmount: data[data.length - 4]?.[7] || 0,
      totalCurrentAmount: data[data.length - 4]?.[9] || 0,
      totalAmount: data[data.length - 4]?.[11] || 0
    }
  };
};

// ?¼ì •ê´€ë¦??‘ì? ?¤ìš´ë¡œë“œ (? ì§œ ë³‘í•©, ?•ë ¬, ?Œë‘ë¦??¤í???ê°œì„ )
export const exportScheduleToExcel = (data, fileName) => {
  try {
    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error('? íš¨?˜ì? ?Šì? ?°ì´?°ì…?ˆë‹¤.');
    }
    
    const wb = XLSX.utils.book_new();
    
    // ?°ì´?°ì—???¤ì œ ???•ë³´ ì¶”ì¶œ
    let dataYear = new Date().getFullYear();
    let dataMonth = new Date().getMonth() + 1;
    let firstDay = 1;
    let lastDay = new Date().getDate();
    
    // ?°ì´?°ì—??? ì§œ ?•ë³´ ì¶”ì¶œ?˜ì—¬ ??ë²”ìœ„ ê³„ì‚°
    const validDates = data
      .filter(row => row.?¼ì && row.?¼ì.trim() !== '')
      .map(row => {
        // ? ì§œ ?•ì‹ ë³€??(YYYY-MM-DD ?ëŠ” MM/DD ??
        let dateStr = row.?¼ì;
        if (typeof dateStr === 'string') {
          // YYYY-MM-DD ?•ì‹??ê²½ìš°
          if (dateStr.includes('-')) {
            const parts = dateStr.split('-');
            if (parts.length >= 2) {
              return {
                year: parseInt(parts[0]),
                month: parseInt(parts[1]),
                day: parseInt(parts[2])
              };
            }
          }
          // MM/DD ?•ì‹??ê²½ìš°
          else if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length >= 2) {
              return {
                year: dataYear, // ?„ì¬ ?°ë„ ?¬ìš©
                month: parseInt(parts[0]),
                day: parseInt(parts[1])
              };
            }
          }
        }
        return null;
      })
      .filter(date => date !== null);
    
    if (validDates.length > 0) {
      // ê°€???´ë¥¸ ? ì§œ?€ ??? ? ì§œ ì°¾ê¸°
      const sortedDates = validDates.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        if (a.month !== b.month) return a.month - b.month;
        return a.day - b.day;
      });
      
      const earliest = sortedDates[0];
      const latest = sortedDates[sortedDates.length - 1];
      
      dataYear = earliest.year;
      dataMonth = earliest.month;
      firstDay = earliest.day;
      lastDay = latest.day;
    }
    
    // ?¤ë” ?ìŠ¤???ì„±: ?¤ì œ ?°ì´?°ì˜ ???•ë³´ ?¬ìš©
    const headerText = `${dataYear}??${dataMonth}??${firstDay}??${dataMonth}??${lastDay}???¼ì • BRIEF`;
    
    // ?¤ë” ??ì¶”ê? (A~E??ë³‘í•©)
    const headerRow = [headerText, '', '', '', ''];
    const dataHeaders = ['?¼ì', 'ë¶„ë¥˜', '?„ì¥ëª?, '?¤ëª…', 'ì²´í¬ë°•ìŠ¤? ë¬´'];
    
    // ?°ì´?°ë? 2ì°¨ì› ë°°ì—´ë¡?ë³€??(? ì§œ ?•ì‹ ê°œì„ )
    const rows = [headerRow, dataHeaders];
    
    // ? ì§œë³„ë¡œ ê·¸ë£¹?”í•˜??ë³‘í•© ?•ë³´ ?ì„±
    const mergeInfo = [];
    let currentDate = '';
    let mergeStartRow = 2; // ?¤ë”ê°€ 2?‰ì´ë¯€ë¡?2ë¶€???œì‘
    let mergeCount = 0;
    
    data.forEach((row, index) => {
      // ? ì§œ ?•ì‹ ê°œì„ 
      let formattedDate = row.?¼ì || '';
      if (formattedDate && typeof formattedDate === 'string') {
        // YYYY-MM-DDë¥?MM/DD ?•ì‹?¼ë¡œ ë³€??        if (formattedDate.includes('-')) {
          const parts = formattedDate.split('-');
          if (parts.length >= 3) {
            const month = parseInt(parts[1]);
            const day = parseInt(parts[2]);
            formattedDate = `${month}/${day}`;
          }
        }
      }
      
      const rowData = [
        formattedDate,
        row.ë¶„ë¥˜ || '',
        row.?„ì¥ëª?|| '',
        row.?¤ëª… || '',
        row.ì²´í¬ë°•ìŠ¤? ë¬´ || ''
      ];
      rows.push(rowData);
      
      // ? ì§œ ë³‘í•© ?•ë³´ ê³„ì‚°
      if (formattedDate && formattedDate !== currentDate) {
        // ?´ì „ ? ì§œ??ë³‘í•© ?•ë³´ ?€??        if (currentDate && mergeCount > 0) {
          mergeInfo.push({
            s: { r: mergeStartRow, c: 0 },
            e: { r: mergeStartRow + mergeCount - 1, c: 0 }
          });
        }
        currentDate = formattedDate;
        mergeStartRow = index + 2; // ?¤ë”ê°€ 2?‰ì´ë¯€ë¡?+2
        mergeCount = 1;
      } else if (formattedDate === currentDate) {
        mergeCount++;
      }
    });
    
    // ë§ˆì?ë§?? ì§œ??ë³‘í•© ?•ë³´ ?€??    if (currentDate && mergeCount > 0) {
      mergeInfo.push({
        s: { r: mergeStartRow, c: 0 },
        e: { r: mergeStartRow + mergeCount - 1, c: 0 }
      });
    }
    
    // ?¤ë” ë³‘í•© ?•ë³´ ì¶”ê? (A~E??ë³‘í•©)
    mergeInfo.push({
      s: { r: 0, c: 0 },
      e: { r: 0, c: 4 }
    });
    
    // ?Œí¬?œíŠ¸ ?ì„±
    const ws = XLSX.utils.aoa_to_sheet(rows);
    
    // ?€ ë³‘í•© ?¤ì •
    ws['!merges'] = mergeInfo;
    
    // ?¤í??¼ë§ ?ìš©
    applyScheduleStyling(ws, rows.length, dataHeaders.length);
    
    // ?Œí¬ë¶ì— ?œíŠ¸ ì¶”ê?
    XLSX.utils.book_append_sheet(wb, ws, '?¼ì •ê´€ë¦?);
    
    // ?Œì¼ ?¤ìš´ë¡œë“œ
    XLSX.writeFile(wb, `${fileName}.xlsx`);
    
    return { success: true, fileName: `${fileName}.xlsx` };
  } catch (error) {
    console.error('?¼ì •ê´€ë¦??‘ì? ?´ë³´?´ê¸° ?¤íŒ¨:', error);
    return { success: false, error: error.message };
  }
};

// ?¼ì •ê´€ë¦??‘ì? ?¤í??¼ë§
const applyScheduleStyling = (ws, rowCount, colCount) => {
  try {
    // ë©”ì¸ ?¤ë” ?¤í??¼ë§ (A~E??ë³‘í•©???¤ë”)
    const mainHeaderCell = XLSX.utils.encode_cell({ r: 0, c: 0 });
    if (ws[mainHeaderCell]) {
      ws[mainHeaderCell].s = {
        font: {
          name: 'ë§‘ì? ê³ ë”•',
          sz: 18,
          bold: true,
          color: { rgb: '000000' }
        },
        fill: {
          fgColor: { rgb: 'E6E6E6' }
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
    
    // ?°ì´???¤ë” ?¤í??¼ë§ (??ë²ˆì§¸ ??
    for (let col = 0; col < colCount; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 1, c: col });
      if (!ws[cellAddress]) continue;
      
      ws[cellAddress].s = {
        font: {
          name: 'ë§‘ì? ê³ ë”•',
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
    
    // ?°ì´?????¤í??¼ë§
    for (let row = 2; row < rowCount; row++) {
      for (let col = 0; col < colCount; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!ws[cellAddress]) continue;
        
        const cell = ws[cellAddress];
        
        // ê¸°ë³¸ ?¤í???        cell.s = {
          font: {
            name: 'ë§‘ì? ê³ ë”•',
            sz: 10,
            color: { rgb: '000000' }
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
        
        // ? ì§œ ??(ì²?ë²ˆì§¸ ?? - ì¤‘ì•™ ?•ë ¬
        if (col === 0) {
          cell.s.alignment.horizontal = 'center';
          cell.s.font.bold = true;
        }
        
        // ë¶„ë¥˜ ??(??ë²ˆì§¸ ?? - ì¤‘ì•™ ?•ë ¬
        if (col === 1) {
          cell.s.alignment.horizontal = 'center';
        }
        
        // ?„ì¥ëª???(??ë²ˆì§¸ ?? - ?¼ìª½ ?•ë ¬
        if (col === 2) {
          cell.s.alignment.horizontal = 'left';
        }
        
        // ?¤ëª… ??(??ë²ˆì§¸ ?? - ?¼ìª½ ?•ë ¬
        if (col === 3) {
          cell.s.alignment.horizontal = 'left';
        }
        
        // ì²´í¬ë°•ìŠ¤? ë¬´ ??(?¤ì„¯ ë²ˆì§¸ ?? - ì¤‘ì•™ ?•ë ¬, ?‰ìƒ ?ìš©
        if (col === 4) {
          cell.s.alignment.horizontal = 'center';
          if (cell.v === 'ì²´í¬') {
            cell.s.font.color = { rgb: 'FF0000' }; // ë¹¨ê°„??            cell.s.font.bold = true;
          } else if (cell.v === 'ë¯¸ì²´??) {
            cell.s.font.color = { rgb: '000000' }; // ê²€?€??          }
        }
      }
    }
    
    // ???ˆë¹„ ?¤ì •
    ws['!cols'] = [
      { width: 12 }, // ?¼ì
      { width: 8 },  // ë¶„ë¥˜
      { width: 30 }, // ?„ì¥ëª?      { width: 40 }, // ?¤ëª…
      { width: 10 }  // ì²´í¬ë°•ìŠ¤? ë¬´
    ];
    
    // ???’ì´ ?¤ì •
    ws['!rows'] = [];
    for (let i = 0; i < rowCount; i++) {
      if (i === 0) {
        ws['!rows'][i] = { hpt: 30 }; // ë©”ì¸ ?¤ë”??30?¬ì¸???’ì´
      } else {
        ws['!rows'][i] = { hpt: 20 }; // ?˜ë¨¸ì§€??20?¬ì¸???’ì´
      }
    }
    
    // ? ì§œë³?êµµì? ?Œë‘ë¦??ìš©
    let currentDate = '';
    let dateStartRow = 2; // ?¤ë”ê°€ 2?‰ì´ë¯€ë¡?2ë¶€???œì‘
    
    for (let row = 2; row < rowCount; row++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: 0 });
      const cell = ws[cellAddress];
      
      if (cell && cell.v && cell.v !== currentDate) {
        // ?´ì „ ? ì§œ ê·¸ë£¹??ë§ˆì?ë§??‰ì— êµµì? ?Œë‘ë¦??ìš©
        if (currentDate && row > dateStartRow) {
          for (let col = 0; col < colCount; col++) {
            const borderCellAddress = XLSX.utils.encode_cell({ r: row - 1, c: col });
            const borderCell = ws[borderCellAddress];
            if (borderCell) {
              borderCell.s.border.bottom = { style: 'thick', color: { rgb: '000000' } };
            }
          }
        }
        
        // ??? ì§œ ê·¸ë£¹??ì²?ë²ˆì§¸ ?‰ì— êµµì? ?Œë‘ë¦??ìš©
        for (let col = 0; col < colCount; col++) {
          const borderCellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const borderCell = ws[borderCellAddress];
          if (borderCell) {
            borderCell.s.border.top = { style: 'thick', color: { rgb: '000000' } };
          }
        }
        
        currentDate = cell.v;
        dateStartRow = row;
      }
    }
    
    // ë§ˆì?ë§?? ì§œ ê·¸ë£¹??ë§ˆì?ë§??‰ì— êµµì? ?Œë‘ë¦??ìš©
    if (currentDate) {
      for (let col = 0; col < colCount; col++) {
        const borderCellAddress = XLSX.utils.encode_cell({ r: rowCount - 1, c: col });
        const borderCell = ws[borderCellAddress];
        if (borderCell) {
          borderCell.s.border.bottom = { style: 'thick', color: { rgb: '000000' } };
        }
      }
    }
    
  } catch (error) {
    console.error('?¼ì •ê´€ë¦??¤í??¼ë§ ?ìš© ?¤íŒ¨:', error);
  }
}; 

/**
 * ?„ì¥ê´€ë¦??¸ë??´ì—­ê³?ê¸°ì„±?„í™©???°ë™???‘ì? ?‘ì‹ ?ì„±
 */
export const generateIntegratedGisungExcel = async (siteName, gisungData, siteData) => {
  try {
    // ?Œí¬ë¶??ì„±
    const workbook = XLSX.utils.book_new();
    
    // 1. ê°‘ì? ?œíŠ¸ ?ì„±
    const gajiData = generateGajiSheet(siteName, gisungData, siteData);
    const gajiWorksheet = XLSX.utils.aoa_to_sheet(gajiData);
    XLSX.utils.book_append_sheet(workbook, gajiWorksheet, 'ê°‘ì?');
    
    // 2. ?´ì—­???œíŠ¸ ?ì„±
    const naeyukData = generateNaeyukSheet(siteName, siteData);
    const naeyukWorksheet = XLSX.utils.aoa_to_sheet(naeyukData);
    XLSX.utils.book_append_sheet(workbook, naeyukWorksheet, '?´ì—­??);
    
    // 3. ê¸°ì„±?„í™© ?œíŠ¸ ?ì„±
    const gisungDataSheet = generateGisungSheet(siteName, gisungData);
    const gisungWorksheet = XLSX.utils.aoa_to_sheet(gisungDataSheet);
    XLSX.utils.book_append_sheet(workbook, gisungWorksheet, 'ê¸°ì„±?„í™©');
    
    // ?Œì¼ ?¤ìš´ë¡œë“œ
    const fileName = `${siteName}_ê¸°ì„±?„í™©_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    
    console.log('?µí•© ê¸°ì„±?„í™© ?‘ì? ?ì„± ?„ë£Œ:', fileName);
    return fileName;
  } catch (error) {
    console.error('?µí•© ê¸°ì„±?„í™© ?‘ì? ?ì„± ?¤ë¥˜:', error);
    throw error;
  }
};

/**
 * ê°‘ì? ?œíŠ¸ ?°ì´???ì„±
 */
const generateGajiSheet = (siteName, gisungData, siteData) => {
  const data = [];
  
  // ?¤ë”
  data.push(['ê¸°ì„±?„í™© ê°‘ì?']);
  data.push([]);
  data.push(['?„ì¥ëª?, siteName]);
  data.push(['ê³„ì•½ê¸ˆì•¡', formatNumber(siteData.contractAmount || 0) + '??]);
  data.push(['? ê¸‰ê¸?, formatNumber(siteData.advance || 0) + '??]);
  data.push([]);
  
  // ê¸°ì„± ?„í™© ?Œì´ë¸??¤ë”
  data.push(['ì°¨ìˆ˜', 'ê¸°ì„±??, 'ê¸°ì„±ê¸ˆì•¡', '?„ê³„ê¸°ì„±', 'ë¹„ê³ ']);
  
  // ê¸°ì„± ?°ì´??  let cumulativeAmount = parseFloat(siteData.advance) || 0;
  gisungData.forEach((gisung, index) => {
    const gisungAmount = parseFloat(gisung.gisungAmount) || 0;
    cumulativeAmount += gisungAmount;
    
    data.push([
      gisung.sequence || `${index + 1}ì°?,
      gisung.gisungMonth || '',
      formatNumber(gisungAmount) + '??,
      formatNumber(cumulativeAmount) + '??,
      gisung.note || ''
    ]);
  });
  
  return data;
};

/**
 * ?´ì—­???œíŠ¸ ?°ì´???ì„±
 */
const generateNaeyukSheet = (siteName, siteData) => {
  const data = [];
  
  // ?¤ë”
  data.push(['ê¸°ì„±?„í™© ?´ì—­??]);
  data.push([]);
  data.push(['?„ì¥ëª?, siteName]);
  data.push(['ê³„ì•½ê¸ˆì•¡', formatNumber(siteData.contractAmount || 0) + '??]);
  data.push([]);
  
  // ?´ì—­???Œì´ë¸??¤ë”
  data.push(['', '??ª©ëª?, '', 'ë¬¼ëŸ‰', '', '', '', '', '', '', '?¨ê?', 'ê¸ˆì•¡']);
  
  // ?¸ë??´ì—­ ?°ì´??  const items = siteData.items || [];
  items.forEach((item, index) => {
    data.push([
      index + 1,
      item.name || '',
      '',
      formatNumber(item.quantity || 0),
      '',
      '',
      '',
      '',
      '',
      '',
      formatNumber(item.unitPrice || 0),
      formatNumber(item.totalPrice || 0)
    ]);
  });
  
  // ?©ê³„
  const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.totalPrice) || 0), 0);
  data.push(['', '?©ê³„', '', '', '', '', '', '', '', '', '', formatNumber(totalAmount)]);
  
  return data;
};

/**
 * ê¸°ì„±?„í™© ?œíŠ¸ ?°ì´???ì„±
 */
const generateGisungSheet = (siteName, gisungData) => {
  const data = [];
  
  // ?¤ë”
  data.push(['ê¸°ì„±?„í™© ?ì„¸']);
  data.push([]);
  data.push(['?„ì¥ëª?, siteName]);
  data.push([]);
  
  // ê¸°ì„±?„í™© ?Œì´ë¸??¤ë”
  data.push(['ì°¨ìˆ˜', 'ê¸°ì„±??, 'ì¹´í…Œê³ ë¦¬', 'ê¸°ì„±ê¸ˆì•¡', 'ë¹„ê³ ']);
  
  // ê¸°ì„± ?°ì´??  gisungData.forEach((gisung, index) => {
    data.push([
      gisung.sequence || `${index + 1}ì°?,
      gisung.gisungMonth || '',
      gisung.category || '',
      formatNumber(parseFloat(gisung.gisungAmount) || 0) + '??,
      gisung.note || ''
    ]);
  });
  
  return data;
};

/**
 * ?«ì ?¬ë§·??(ì²??¨ìœ„ ì½¤ë§ˆ)
 */
const formatNumber = (num) => {
  if (!num && num !== 0) return '';
  const numValue = parseFloat(num);
  if (isNaN(numValue)) return '';
  
  // ?Œìˆ«???˜ì§¸?ë¦¬ê¹Œì? ?œì‹œ (?„ìš”?œë§Œ)
  return numValue.toLocaleString('ko-KR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
};

/**
 * ?µí™” ?¬ë§·??(ì²??¨ìœ„ ì½¤ë§ˆ + ??
 */
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || amount === '') return '';
  const numValue = parseFloat(amount);
  if (isNaN(numValue)) return '';
  
  // ?Œìˆ«???˜ì§¸?ë¦¬ê¹Œì? ?œì‹œ (?„ìš”?œë§Œ)
  return `${numValue.toLocaleString('ko-KR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}??;
}; 

// Python ?¤í¬ë¦½íŠ¸ ê¸°ë°˜ ê°œì„ ??ê¸°ì„± ?„ì¥ë³??‘ì? ?¤ìš´ë¡œë“œ
export const generateImprovedGisungExcel = (siteData, gisungData) => {
  try {
    const wb = XLSX.utils.book_new();
    
    // ê°‘ì? ?œíŠ¸ ?ì„±
    const gapjiSheet = createImprovedGapjiSheet(siteData, gisungData);
    XLSX.utils.book_append_sheet(wb, gapjiSheet, 'ê°‘ì?');
    
    // ê¸°ì„±ê¸??´ì—­???œíŠ¸ ?ì„±
    const detailSheet = createImprovedDetailSheet(siteData, gisungData);
    XLSX.utils.book_append_sheet(wb, detailSheet, 'ê¸°ì„±ê¸??´ì—­??);
    
    // ?¤í??¼ë§ ?ìš©
    applyImprovedGisungStyling(gapjiSheet, detailSheet);
    
    return wb;
  } catch (error) {
    console.error('ê°œì„ ??ê¸°ì„± ?‘ì? ?ì„± ?¤íŒ¨:', error);
    throw error;
  }
};

// ê°œì„ ??ê°‘ì? ?œíŠ¸ ?ì„± (Python ?¤í¬ë¦½íŠ¸ ê¸°ë°˜)
const createImprovedGapjiSheet = (siteData, gisungData) => {
  const ws = XLSX.utils.aoa_to_sheet([
    ['', '', '', ''],
    ['', '', '', ''],
    ['', '', 'ê³µì‚¬ëª?, siteData?.name || ''],
    ['', '', '', ''],
    ['', '', '?œê³µ??, siteData?.contractor || ''],
    ['', '', '', ''],
    ['', '', '?˜ë„ê¸?ê³µì‚¬ëª?, siteData?.subcontract || ''],
    ['', '', '', ''],
    ['', '', 'ê³„ì•½(ì°©ê³µ)?¼ì', formatDate(siteData?.startDate) || ''],
    ['', '', '', ''],
    ['', '', 'ì¤€ê³µì¼??, formatDate(siteData?.finishDate) || ''],
    ['', '', '', ''],
    ['', '', 'ê³„ì•½ê¸ˆì•¡', formatCurrency(siteData?.contractAmount) || ''],
    ['', '', '', ''],
    ['', '', '? ê¸‰ê¸?, formatCurrency(siteData?.advance || 0) || ''],
    ['', '', '', ''],
    ['', '', 'ê¸°ì„±ê¸ˆì•¡', formatCurrency(calculateTotalGisung(gisungData)) || ''],
    ['', '', '', ''],
    ['', '', 'ì°¨ìˆ˜', gisungData?.[0]?.sequence || ''],
    ['', '', '', ''],
    ['', '', 'ê¸°ì„±??, formatMonth(gisungData?.[0]?.gisungMonth) || '']
  ]);
  
  return ws;
};

// ê°œì„ ??ê¸°ì„±ê¸??´ì—­???œíŠ¸ ?ì„± (Python ?¤í¬ë¦½íŠ¸ ê¸°ë°˜)
const createImprovedDetailSheet = (siteData, gisungData) => {
  const headers = [
    '?„ì¥ëª?, 'ì°¨ìˆ˜', 'ê¸°ì„±??, 'ê¸°ì„±ê¸ˆì•¡', '?„íšŒê¸°ì„±', '?„ê³„ê¸°ì„±', 'ê²°ì œë°©ë²•', 'ë¹„ê³ '
  ];
  
  const rows = [headers];
  
  // ê¸°ì„± ?°ì´?°ë? ?„ì¬ êµ¬ì¡°??ë§ê²Œ ë³€??  if (gisungData && gisungData.length > 0) {
    gisungData.forEach((gisung, index) => {
      const prevGisung = Number(gisung.prevGisung) || 0;
      const currentGisung = Number(gisung.gisungAmount) || 0;
      const cumulativeGisung = prevGisung + currentGisung;
      
      const row = [
        gisung.name || '',                    // ?„ì¥ëª?        gisung.sequence || `${index + 1}ì°?,  // ì°¨ìˆ˜
        formatMonth(gisung.gisungMonth) || '', // ê¸°ì„±??        formatCurrency(gisung.gisungAmount) || '', // ê¸°ì„±ê¸ˆì•¡
        formatCurrency(gisung.prevGisung) || '', // ?„íšŒê¸°ì„±
        formatCurrency(cumulativeGisung) || '', // ?„ê³„ê¸°ì„±
        gisung.paymentMethod || '',           // ê²°ì œë°©ë²•
        gisung.note || ''                     // ë¹„ê³ 
      ];
      rows.push(row);
    });
  }
  
  // ? ê¸‰ê¸???ì¶”ê?
  rows.push(['', '', '', '', '', '', '', '']);
  rows.push(['? ê¸‰ê¸?, '', '', '', '', formatCurrency(siteData?.advance || 0) || '', '', '']);
  
  const ws = XLSX.utils.aoa_to_sheet(rows);
  return ws;
};

// ê°œì„ ???¤í??¼ë§ ?ìš©
const applyImprovedGisungStyling = (gapjiSheet, detailSheet) => {
  // ê°‘ì? ?œíŠ¸ ?¤í??¼ë§
  if (gapjiSheet['!ref']) {
    const gapjiRange = XLSX.utils.decode_range(gapjiSheet['!ref']);
    
    // ?¤ë” ?€ ?¤í??¼ë§ (C??
    for (let row = 2; row <= gapjiRange.e.r; row += 2) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: 2 });
      if (gapjiSheet[cellAddress]) {
        gapjiSheet[cellAddress].s = {
          font: { bold: true, color: { rgb: '000000' } },
          fill: { fgColor: { rgb: 'E6E6E6' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          }
        };
      }
    }
    
    // ê°??€ ?¤í??¼ë§ (D??
    for (let row = 2; row <= gapjiRange.e.r; row += 2) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: 3 });
      if (gapjiSheet[cellAddress]) {
        gapjiSheet[cellAddress].s = {
          font: { color: { rgb: '000000' } },
          alignment: { horizontal: 'left', vertical: 'center' },
          border: {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          }
        };
      }
    }
  }
  
  // ê¸°ì„±ê¸??´ì—­???¤í??¼ë§
  if (detailSheet['!ref']) {
    const detailRange = XLSX.utils.decode_range(detailSheet['!ref']);
    
    // ?¤ë” ???¤í??¼ë§
    for (let col = 0; col <= detailRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (detailSheet[cellAddress]) {
        detailSheet[cellAddress].s = {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '4472C4' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          }
        };
      }
    }
    
    // ?°ì´?????¤í??¼ë§
    for (let row = 1; row <= detailRange.e.r; row++) {
      for (let col = 0; col <= detailRange.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (detailSheet[cellAddress]) {
          detailSheet[cellAddress].s = {
            font: { color: { rgb: '000000' } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: {
              top: { style: 'thin' },
              bottom: { style: 'thin' },
              left: { style: 'thin' },
              right: { style: 'thin' }
            }
          };
        }
      }
    }
  }
};

// ?¬í¼ ?¨ìˆ˜??const formatDate = (date) => {
  if (!date) return '';
  try {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return '';
  }
};

const formatMonth = (monthStr) => {
  if (!monthStr) return '';
  try {
    const [year, month] = monthStr.split('-');
    return `${year}??${month}??;
  } catch {
    return monthStr;
  }
};

const calculateTotalGisung = (gisungData) => {
  if (!gisungData || !Array.isArray(gisungData)) return 0;
  return gisungData.reduce((sum, item) => sum + (Number(item.gisungAmount) || 0), 0);
}; 

// ?¤ë¬¼???‘ì? ?Œì¼ ?…ë¡œ??ë°??Œì‹±
export const parseSilmulExcel = (file, targetSiteName = '') => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { 
          type: 'array', 
          cellFormula: true,
          cellText: false,
          cellDates: true,
          cellNF: false,
          cellStyles: false,
          cellHTML: false
        });
        
        // ì²?ë²ˆì§¸ ?œíŠ¸ ?¬ìš© (?œíŠ¸ ?´ë¦„ ?ê??†ìŒ)
        console.log('?¬ìš© ê°€?¥í•œ ?œíŠ¸??', workbook.SheetNames);
        
        if (workbook.SheetNames.length === 0) {
          throw new Error('?‘ì? ?Œì¼???œíŠ¸ê°€ ?†ìŠµ?ˆë‹¤.');
        }
        
        const firstSheetName = workbook.SheetNames[0];
        const wonjangSheet = workbook.Sheets[firstSheetName];
        
        console.log(`ì²?ë²ˆì§¸ ?œíŠ¸ "${firstSheetName}" ?¬ìš©`);
        
        // ?¨ê²¨ì§??‰ê³¼ ???•ë³´ ì¶”ì¶œ
        const hiddenRows = [];
        const hiddenCols = [];
        
        // ?¨ê²¨ì§????•ë³´ ì¶”ì¶œ
        if (wonjangSheet['!rows']) {
          wonjangSheet['!rows'].forEach((row, index) => {
            if (row && row.hidden) {
              hiddenRows.push(index);
            }
          });
        }
        
        // ?¨ê²¨ì§????•ë³´ ì¶”ì¶œ
        if (wonjangSheet['!cols']) {
          wonjangSheet['!cols'].forEach((col, index) => {
            if (col && col.hidden) {
              hiddenCols.push(index);
            }
          });
        }
        
        console.log('?¨ê²¨ì§???', hiddenRows);
        console.log('?¨ê²¨ì§???', hiddenCols);
        
        // ?¨ê²¨ì§???ë²”ìœ„ ë¶„ì„
        if (hiddenRows.length > 0) {
          const sortedHiddenRows = hiddenRows.sort((a, b) => a - b);
          const firstHidden = sortedHiddenRows[0];
          const lastHidden = sortedHiddenRows[sortedHiddenRows.length - 1];
          
          console.log('?“Š ?¨ê²¨ì§???ë¶„ì„:');
          console.log(`- ì²?ë²ˆì§¸ ?¨ê²¨ì§??? ${firstHidden + 1}??);
          console.log(`- ë§ˆì?ë§??¨ê²¨ì§??? ${lastHidden + 1}??);
          console.log(`- ?¨ê²¨ì§????? ${hiddenRows.length}ê°?);
          
          // ?°ì†???¨ê²¨ì§???ë²”ìœ„ ì°¾ê¸°
          const ranges = [];
          let start = sortedHiddenRows[0];
          let end = sortedHiddenRows[0];
          
          for (let i = 1; i < sortedHiddenRows.length; i++) {
            if (sortedHiddenRows[i] === end + 1) {
              end = sortedHiddenRows[i];
            } else {
              ranges.push({ start: start + 1, end: end + 1 });
              start = sortedHiddenRows[i];
              end = sortedHiddenRows[i];
            }
          }
          ranges.push({ start: start + 1, end: end + 1 });
          
          console.log('?“‹ ?¨ê²¨ì§???ë²”ìœ„:');
          ranges.forEach((range, index) => {
            console.log(`  ${index + 1}. ${range.start}??~ ${range.end}??(${range.end - range.start + 1}ê°???`);
          });
        }
        
        // ?¨ê²¨ì§??‰ì´ ë§ì? ê²½ìš° (1-1443?‰ì´ ?¨ê²¨ì§?ê²½ìš°) ë³´ì´???‰ë§Œ ê²€?‰í•˜?„ë¡ ?¤ì •
        if (hiddenRows.length > 1000) {
          console.log('? ï¸ ë§ì? ?‰ì´ ?¨ê²¨???ˆìŠµ?ˆë‹¤. ë³´ì´???‰ë§Œ ê²€?‰í•©?ˆë‹¤.');
          console.log(`?¨ê²¨ì§????? ${hiddenRows.length}`);
        }
        
        // ?ì¥ ?œíŠ¸ ?°ì´?°ë? ë°°ì—´ë¡?ë³€??(?„ì²´ ?°ì´???¬í•¨, ?˜ì‹ ê°?ì²˜ë¦¬)
        const wonjangData = XLSX.utils.sheet_to_json(wonjangSheet, { 
          header: 1, 
          defval: '',
          raw: false,
          dateNF: 'yyyy-mm-dd'
        });
        
        console.log(`?„ì²´ ?°ì´?????? ${wonjangData.length}`);
        console.log(`?°ì´??ë²”ìœ„: 1??~ ${wonjangData.length}??);
        
        // ?¤ë¬¼???°ì´???Œì‹± (ëª©í‘œ ?„ì¥ëª…ìœ¼ë¡??„í„°ë§?
        const silmulData = parseWonjangData(wonjangData, targetSiteName, hiddenRows, hiddenCols);
        
        // ì²˜ë¦¬???????•ë³´ ì¶”ê?
        const result = {
          ...silmulData,
          processedRows: wonjangData.length,
          fileName: file.name
        };
        
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('?Œì¼ ?½ê¸° ?¤ë¥˜'));
    reader.readAsArrayBuffer(file);
  });
};

// ?ì¥ ?œíŠ¸ ?°ì´???Œì‹± (ê°„ë‹¨??ë²„ì „)
const parseWonjangData = (data, targetSiteName = '', hiddenRows = [], hiddenCols = []) => {
  console.log(`=== ?¤ë¬¼???ì¥ ?Œì‹± ?œì‘ ===`);
  console.log(`ëª©í‘œ ?„ì¥ëª? "${targetSiteName}"`);
  
  const siteData = [];
  let currentSite = null;
  
  // ?°ì´???‰ì„ ?œíšŒ?˜ë©´???„ì¥ëª…ê³¼ ?ˆëª© ?•ë³´ ì¶”ì¶œ
  for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
    const row = data[rowIndex];
    if (!row || row.length < 10) continue;
    
    const cValue = String(row[2] || '').trim(); // C?´ì—???„ì¥ëª?ì°¾ê¸°
    
    // ê´„í˜¸ë¡??œì‘?˜ëŠ” ê²½ìš° ?„ì¥ëª…ìœ¼ë¡?ê°„ì£¼
    if (cValue.startsWith('(')) {
      // ?´ì „ ?„ì¥ ?°ì´???€??      if (currentSite) {
        siteData.push(currentSite);
        console.log(`?’¾ ?„ì¥ "${currentSite.siteName}" ?€???„ë£Œ (${currentSite.items.length}ê°??ˆëª©)`);
      }
      
      // ???„ì¥ ?œì‘
      currentSite = {
        siteName: cValue,
        startRow: rowIndex + 1,
        items: []
      };
      
      console.log(`???„ì¥ "${cValue}" ?°ì´???˜ì§‘ ?œì‘ (??${rowIndex + 1})`);
    }
    
    // ?„ì¥ëª…ì´ ?¤ì •???íƒœ?ì„œ ?ˆëª© ?°ì´???˜ì§‘
    if (currentSite && !cValue.startsWith('(')) {
      const itemName = String(row[2] || '').trim(); // C?? ?ˆëª©ëª?      
      // ?˜ì‹ ê²°ê³¼ ì²˜ë¦¬ ?¨ìˆ˜
      const getCellValue = (cellValue) => {
        if (cellValue === null || cellValue === undefined || cellValue === '') return 0;
        
        // ?˜ì‹ ê°’ì´ ê°ì²´ë¡?ë°˜í™˜?˜ëŠ” ê²½ìš° ì²˜ë¦¬
        if (typeof cellValue === 'object' && cellValue !== null) {
          if (cellValue.result !== undefined) {
            return parseFloat(cellValue.result) || 0;
          } else if (cellValue.v !== undefined) {
            return parseFloat(cellValue.v) || 0;
          } else {
            console.log('? ï¸ ?˜ì‹ ê°?ê°ì²´ êµ¬ì¡°:', cellValue);
            return 0;
          }
        }
        
        return parseFloat(cellValue) || 0;
      };
      
      const fValue = getCellValue(row[5]); // F?? ?‰ìˆ˜
      const gValue = getCellValue(row[6]); // G?? ?¨ê?
      const jValue = getCellValue(row[9]); // J?? ê¸ˆì•¡
      
      // ?ˆëª©ëª…ì´ ?ˆê±°??F,G,J ê°’ì´ ?ˆìœ¼ë©??˜ì§‘
      if (itemName || fValue > 0 || gValue > 0 || jValue > 0) {
        const item = {
          itemName: itemName,
          fValue: fValue,
          gValue: gValue,
          jValue: jValue,
          row: rowIndex + 1
        };
        
        currentSite.items.push(item);
        
        // "ê²½ìš´" ?„ì¥??ê²½ìš° ë¡œê·¸ ì¶œë ¥
        if (currentSite.siteName.toLowerCase().includes('ê²½ìš´')) {
          console.log(`?“¦ ?ˆëª© ì¶”ê?: "${itemName}" (F: ${fValue}, G: ${gValue}, J: ${jValue})`);
        }
      } else {
        // ?ˆëª©ëª…ì´ ?†ëŠ” ê²½ìš°??ë¡œê·¸ ì¶œë ¥ (?”ë²„ê¹…ìš©)
        if (currentSite && currentSite.siteName.toLowerCase().includes('ê²½ìš´') && rowIndex < 100) {
          console.log(`???ˆëª© ?˜ì§‘ ?¤íŒ¨ (??${rowIndex + 1}): itemName="${itemName}", ê¸¸ì´=${itemName ? itemName.length : 0}`);
        }
      }
    }
  }
  
  // ë§ˆì?ë§??„ì¥ ?°ì´???€??  if (currentSite) {
    siteData.push(currentSite);
  }
  
  console.log(`?“Š ?˜ì§‘???„ì¥ ?°ì´?? ${siteData.length}ê°??„ì¥`);
  siteData.forEach(site => {
    console.log(`- ${site.siteName}: ${site.items.length}ê°??ˆëª©`);
    if (site.items.length === 0) {
      console.log(`  ? ï¸  ?ˆëª©???†ëŠ” ?„ì¥: ${site.siteName}`);
    } else {
      // ?ˆëª©???ˆëŠ” ?„ì¥??ì²?ëª?ê°??ˆëª© ì¶œë ¥
      site.items.slice(0, 3).forEach((item, index) => {
        console.log(`  ?“¦ ?ˆëª© ${index + 1}: "${item.itemName}" (F: ${item.fValue}, G: ${item.gValue}, J: ${item.jValue})`);
      });
      if (site.items.length > 3) {
        console.log(`  ... ??${site.items.length - 3}ê°??ˆëª©`);
      }
    }
  });
  
  // ê²€?‰ì–´ê°€ ?ˆìœ¼ë©?ë§¤ì¹­?˜ëŠ” ?„ì¥ëª…ë“¤ ì°¾ê¸°
  if (targetSiteName) {
    const matchingSites = siteData.filter(site => {
      const siteNameClean = site.siteName.toLowerCase().replace(/[()]/g, '').trim();
      const targetClean = targetSiteName.toLowerCase().trim();
      const shouldMatch = siteNameClean.includes(targetClean);
      
      // ?”ë²„ê¹? ë§¤ì¹­ ê³¼ì • ?•ì¸
      console.log(`?” ?„ì¥ëª?ë§¤ì¹­ ?”ë²„ê¹?`, {
        originalName: site.siteName,
        siteNameClean: siteNameClean,
        targetClean: targetClean,
        shouldMatch: shouldMatch
      });
      
      return shouldMatch;
    });
    
    console.log(`?” ê²€?‰ì–´ "${targetSiteName}"ê³?ë§¤ì¹­???„ì¥?? ${matchingSites.length}ê°?);
    matchingSites.forEach(site => {
      console.log(`- ${site.siteName}: ${site.items.length}ê°??ˆëª©`);
    });
    
    if (matchingSites.length === 0) {
      // ë§¤ì¹­?˜ëŠ” ?„ì¥???†ìœ¼ë©??ëŸ¬ ë©”ì‹œì§€
      console.log(`??ê²€?‰ì–´ "${targetSiteName}"ê³?ë§¤ì¹­?˜ëŠ” ?„ì¥???†ìŠµ?ˆë‹¤.`);
      return { 
        siteName: '', 
        items: [],
        siteData: siteData,
        availableSites: [],
        showSelectionDialog: false,
        error: `ê²€?‰ì–´ "${targetSiteName}"ê³?ë§¤ì¹­?˜ëŠ” ?„ì¥??ì°¾ì„ ???†ìŠµ?ˆë‹¤.`
      };
    } else if (matchingSites.length === 1) {
      // ?˜ë‚˜ë§?ë§¤ì¹­?˜ë©´ ?ë™ ? íƒ
      const targetSite = matchingSites[0];
      console.log(`???¨ì¼ ?„ì¥ ë§¤ì¹­: "${targetSite.siteName}"`);
      
      const aggregatedItems = aggregateItemsByType(targetSite.items);
      return {
        siteName: targetSite.siteName,
        items: aggregatedItems,
        siteData: siteData
      };
    } else {
      // ?¬ëŸ¬ ê°?ë§¤ì¹­?˜ë©´ ?¤ì´?¼ë¡œê·??œì‹œ
      console.log(`?“‹ ?¤ì´?¼ë¡œê·?? íƒ ?„ìš”: ${matchingSites.length}ê°??„ì¥`);
      return { 
        siteName: '', 
        items: [],
        siteData: siteData,
        availableSites: matchingSites.map(site => site.siteName),
        showSelectionDialog: true
      };
    }
  } else {
    // ê²€?‰ì–´ê°€ ?†ìœ¼ë©?ëª¨ë“  ?„ì¥ ?°ì´??ë°˜í™˜
    const allItems = [];
    siteData.forEach(site => {
      const aggregatedItems = aggregateItemsByType(site.items);
      aggregatedItems.forEach(item => {
        item.siteName = site.siteName;
        allItems.push(item);
      });
    });
    
    return {
      siteName: '?„ì²´ ?„ì¥',
      items: allItems,
      siteData: siteData,
      availableSites: siteData.map(site => site.siteName)
    };
  }
};

// ?ˆëª©ë³„ë¡œ ?©ì‚°?˜ëŠ” ?¨ìˆ˜
const aggregateItemsByType = (items) => {
  const aggregated = {};
  
  items.forEach(item => {
    const key = item.itemName.trim();
    if (!aggregated[key]) {
      aggregated[key] = {
        itemName: key,
        fSum: 0, // F???©ê³„
        gValues: [], // G??ê°’ë“¤ (ì²?ë²ˆì§¸ ê°’ë§Œ ?¬ìš©)
        jSum: 0, // J???©ê³„
        count: 0
      };
    }
    
    aggregated[key].fSum += item.fValue;
    aggregated[key].jSum += item.jValue;
    aggregated[key].count += 1;
    
    // G??ê°??€??(ì²?ë²ˆì§¸ ê°’ë§Œ ?¬ìš©???ˆì •)
    if (item.gValue > 0) {
      aggregated[key].gValues.push(item.gValue);
    }
  });

  // ê³„ì‚°??ê°’ë“¤ë¡?ë³€??  return Object.values(aggregated).map(item => {
    const quantity = item.fSum / 10.89; // ë¬¼ëŸ‰ = F????/ 10.89
    const unitPrice = item.gValues.length > 0 ? (item.gValues[0] * 10.89 / 1.1) : 0; // Gê°?* 10.89 / 1.1
    const amount = item.jSum / 1.1; // J????/ 1.1

    return {
      itemName: item.itemName,
      quantity: quantity,
      unitPrice: unitPrice,
      amount: amount,
      fSum: item.fSum,
      gFirst: item.gValues[0] || 0,
      jSum: item.jSum
    };
  });
};

// ê¸°ì¡´ ê³„ì•½ ?°ì´?°ì? ?¤ë¬¼???°ì´??ë§¤ì¹­ ?¨ìˆ˜
export const matchContractWithSilmul = (contractItems, silmulItems) => { const unmatchedSilmulItems = [...silmulItems];
  const matchedItems = [];
  
  contractItems.forEach(contractItem => {
    const contractName = contractItem.name || '';
    const contractSpec = contractItem.specification || '';
    const fullContractText = `${contractName} ${contractSpec}`.toLowerCase();
    
    // ë§¤ì¹­ ê·œì¹™ ?•ì˜
    const matchingRules = [
      // 22mm, 22?¬ëª…ë¡œì´, 22~~ ??22 ê´€??ë§¤ì¹­
      {
        condition: (contractText) => contractText.includes('22'),
        match: (silmulItem) => silmulItem.itemName.toLowerCase().includes('22')
      },
      // CL (?¬ëª…) ë§¤ì¹­
      {
        condition: (contractText) => contractText.includes('cl'),
        match: (silmulItem) => silmulItem.itemName.toLowerCase().includes('?¬ëª…')
      },
      // LE (ë¡œì´) ë§¤ì¹­
      {
        condition: (contractText) => contractText.includes('le'),
        match: (silmulItem) => silmulItem.itemName.toLowerCase().includes('ë¡œì´')
      },
      // ?”ë¸”ë¡œì´ (Së¡??œì‘?˜ëŠ” ?¨ì–´ ?ëŠ” M?¼ë¡œ ?œì‘?˜ëŠ” ?¨ì–´) ë§¤ì¹­
      {
        condition: (contractText) => contractText.includes('?”ë¸”ë¡œì´'),
        match: (silmulItem) => {
          const itemName = silmulItem.itemName.toLowerCase();
          // Së¡??œì‘?˜ëŠ” ?¨ì–´ (SKN, SKG, SKS ?? ?ëŠ” M?¼ë¡œ ?œì‘?˜ëŠ” ?¨ì–´ ì°¾ê¸°
          const words = itemName.split(/\s+/);
          return words.some(word => word.startsWith('s') || word.startsWith('m'));
        }
      },
      // ?¼ë°˜?ì¸ ?¤ì›Œ??ë§¤ì¹­
      {
        condition: (contractText) => true, // ê¸°ë³¸ ë§¤ì¹­
        match: (silmulItem) => {
          const itemName = silmulItem.itemName.toLowerCase();
          // ì£¼ìš” ?¤ì›Œ?œë“¤???¬í•¨?˜ì–´ ?ˆëŠ”ì§€ ?•ì¸
          const keywords = fullContractText.split(/\s+/).filter(word => word.length > 1);
          return keywords.some(keyword => itemName.includes(keyword));
        }
      }
    ];
    
    // ë§¤ì¹­?˜ëŠ” ?¤ë¬¼????ª© ì°¾ê¸°
    let matchedSilmulItem = null;
    for (const rule of matchingRules) {
      if (rule.condition(fullContractText)) {
        const matchedIndex = unmatchedSilmulItems.findIndex(silmulItem => rule.match(silmulItem)); if (matchedIndex !== -1) { matchedSilmulItem = unmatchedSilmulItems[matchedIndex]; unmatchedSilmulItems.splice(matchedIndex, 1); }
        if (matchedSilmulItem) {
          console.log(`??ë§¤ì¹­ ?±ê³µ: "${contractName}" ??"${matchedSilmulItem.itemName}"`);
          break;
        }
      }
    }
    
    // ë§¤ì¹­????ª© ?ì„±
    const matchedItem = {
      ...contractItem,
      actualQuantity: matchedSilmulItem ? matchedSilmulItem.quantity.toFixed(2) : '',
      actualPrice: matchedSilmulItem ? Math.round(matchedSilmulItem.unitPrice) : '',
      actualAmount: matchedSilmulItem ? Math.round(matchedSilmulItem.amount) : '',
      quantityDifference: matchedSilmulItem ? (matchedSilmulItem.quantity - (parseFloat(contractItem.contractQuantity) || 0)).toFixed(2) : '',
      amountDifference: matchedSilmulItem ? (matchedSilmulItem.amount - (parseFloat(contractItem.contractAmount) || 0)) : '',
      matchedSilmulItem: matchedSilmulItem
    };
    
    matchedItems.push(matchedItem);
  });
  
  return { matchedItems, unmatchedSilmulItems };
};

// ? íƒ???„ì¥ëª…ë“¤ë¡??°ì´?°ë? ?©ì‚°?˜ëŠ” ?¨ìˆ˜
export const aggregateDataBySelectedSites = (siteData, selectedSiteNames) => {
  console.log(`?” ? íƒ???„ì¥ëª…ë“¤:`, selectedSiteNames);
  
  // ? íƒ???„ì¥??ì°¾ê¸°
  const selectedSites = siteData.filter(site => selectedSiteNames.includes(site.siteName));
  console.log(`?“Š ? íƒ???„ì¥?? ${selectedSites.length}ê°?);
  
  // ëª¨ë“  ?ˆëª© ?©ì¹˜ê¸?  const allItems = [];
  selectedSites.forEach(site => {
    console.log(`?“¦ ${site.siteName}: ${site.items.length}ê°??ˆëª© ì¶”ê?`);
    allItems.push(...site.items);
  });
  
  console.log(`?“¦ ì´??ˆëª© ?? ${allItems.length}ê°?);
  
  // ?ˆëª©ë³??©ì‚°
  const aggregatedItems = aggregateItemsByType(allItems);
  console.log(`???©ì‚° ?„ë£Œ: ${aggregatedItems.length}ê°??ˆëª©`);
  
  return {
    siteName: selectedSiteNames.join(', '),
    items: aggregatedItems,
    selectedSites: selectedSiteNames
  };
};

// ?«ì ?Œì‹± ?¨ìˆ˜ (ê°œì„ ??ë²„ì „ - ?˜ì‹ ê°?ì§€??
const parseNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  
  // XLSX?ì„œ ?˜ì‹ ê°’ì´ ê°ì²´ë¡?ë°˜í™˜?˜ëŠ” ê²½ìš° ì²˜ë¦¬
  if (typeof value === 'object' && value !== null) {
    // ?˜ì‹ ê²°ê³¼ê°’ì´ ?ˆëŠ” ê²½ìš° ?¬ìš©
    if (value.result !== undefined) {
      value = value.result;
    } else if (value.v !== undefined) {
      value = value.v;
    } else {
      console.log('? ï¸ ?˜ì‹ ê°?ê°ì²´ êµ¬ì¡°:', value);
      return 0;
    }
  }
  
  // ë¬¸ì?´ì¸ ê²½ìš° ?¼í‘œ?€ ê³µë°± ?œê±°
  const str = String(value).trim().replace(/[,\s]/g, '');
  
  // ?«ìê°€ ?„ë‹Œ ë¬¸ì ?œê±° (?Œìˆ˜?ì? ? ì?)
  const cleanStr = str.replace(/[^\d.-]/g, '');
  
  const num = parseFloat(cleanStr);
  return Number.isFinite(num) ? num : 0;
};

// ?¤ë¬¼???°ì´?°ë? ê¸°ì¡´ ê²¬ì ???•ì‹?¼ë¡œ ë³€??export const convertSilmulToEstimate = (silmulData, estimateTemplate) => {
  const convertedItems = [];
  
  // ê²¬ì ???œí”Œë¦¿ì˜ ?ˆëª…ê³?ê·œê²©??ê¸°ì??¼ë¡œ ë§¤ì¹­
  if (estimateTemplate && estimateTemplate.items) {
    estimateTemplate.items.forEach(templateItem => {
      // ?¤ë¬¼???°ì´?°ì—??ë§¤ì¹­?˜ëŠ” ??ª© ì°¾ê¸°
      const matchingSilmul = silmulData.items.find(silmulItem => {
        const templateName = String(templateItem.name || '').toLowerCase();
        const silmulName = String(silmulItem.itemName || '').toLowerCase();
        
        // ?ˆëª… ë§¤ì¹­ (ë¶€ë¶??¼ì¹˜)
        const nameMatch = templateName.includes(silmulName) || silmulName.includes(templateName);
        
        // ê·œê²© ë§¤ì¹­ (?ˆëŠ” ê²½ìš°)
        const templateSpec = String(templateItem.specification || '').toLowerCase();
        const silmulSpec = String(silmulItem.specification || '').toLowerCase();
        const specMatch = !templateSpec || !silmulSpec || templateSpec.includes(silmulSpec) || silmulSpec.includes(templateSpec);
        
        return nameMatch && specMatch;
      });
      
      if (matchingSilmul) {
        // ë§¤ì¹­???¤ë¬¼???°ì´?°ë¡œ ê²¬ì ????ª© ?…ë°?´íŠ¸
        convertedItems.push({
          ...templateItem,
          quantity: matchingSilmul.area,
          unitPrice: matchingSilmul.unitPrice,
          totalPrice: matchingSilmul.amount,
          isSilmulData: true,
          originalSilmulItem: matchingSilmul
        });
      } else {
        // ë§¤ì¹­?˜ì? ?Šì? ê²½ìš° ê¸°ì¡´ ?œí”Œë¦?? ì?
        convertedItems.push({
          ...templateItem,
          isSilmulData: false
        });
      }
    });
  }
  
  return {
    siteName: silmulData.siteName,
    items: convertedItems,
    totalAmount: convertedItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0)
  };
};
