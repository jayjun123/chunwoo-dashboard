import { db } from '../firebase.js';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { getGisungDataFromFirebase } from '../utils/gisungDataUtils.js';

// 기성금회기성 데이터 조회
export const getGisungItems = async (filters = {}) => {
  try {
    console.log('📥 기성금회기성 데이터 조회 시작...');
    
    // 파이어베이스에서 데이터 조회
    const gisungData = await getGisungDataFromFirebase();
    
    // 필터 적용
    let filteredData = gisungData;
    
    if (filters.name) {
      filteredData = filteredData.filter(item => 
        item.name && item.name.toLowerCase().includes(filters.name.toLowerCase())
      );
    }
    
    if (filters.specification) {
      filteredData = filteredData.filter(item => 
        item.specification && item.specification.toLowerCase().includes(filters.specification.toLowerCase())
      );
    }
    
    if (filters.hasCurrentQuantity) {
      filteredData = filteredData.filter(item => 
        item.currentQuantity && item.currentQuantity > 0
      );
    }
    
    if (filters.hasContractAmount) {
      filteredData = filteredData.filter(item => 
        item.contractAmount && item.contractAmount > 0
      );
    }
    
    // 정렬
    if (filters.sortBy) {
      filteredData.sort((a, b) => {
        const aValue = a[filters.sortBy] || 0;
        const bValue = b[filters.sortBy] || 0;
        return filters.sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
      });
    }
    
    console.log(`📊 조회된 기성금 데이터: ${filteredData.length}개 항목`);
    return filteredData;
    
  } catch (error) {
    console.error('❌ 기성금회기성 데이터 조회 실패:', error);
    throw error;
  }
};

// 특정 품목의 기성금 데이터 조회
export const getGisungItemByName = async (itemName, specification = '') => {
  try {
    console.log(`🔍 특정 품목 조회: ${itemName} (${specification})`);
    
    const gisungData = await getGisungDataFromFirebase();
    
    const item = gisungData.find(item => 
      item.name === itemName && 
      (specification ? item.specification === specification : true)
    );
    
    return item || null;
    
  } catch (error) {
    console.error('❌ 특정 품목 조회 실패:', error);
    throw error;
  }
};

// 기성금 데이터 통계 조회
export const getGisungStatistics = async () => {
  try {
    console.log('📊 기성금 데이터 통계 조회...');
    
    const gisungData = await getGisungDataFromFirebase();
    
    const statistics = {
      totalItems: gisungData.length,
      totalContractAmount: gisungData.reduce((sum, item) => sum + (item.contractAmount || 0), 0),
      totalCurrentAmount: gisungData.reduce((sum, item) => sum + (item.currentAmount || 0), 0),
      totalPreviousAmount: gisungData.reduce((sum, item) => sum + (item.previousAmount || 0), 0),
      totalAmount: gisungData.reduce((sum, item) => sum + (item.totalAmount || 0), 0),
      itemsWithCurrentQuantity: gisungData.filter(item => item.currentQuantity && item.currentQuantity > 0).length,
      itemsWithContractAmount: gisungData.filter(item => item.contractAmount && item.contractAmount > 0).length,
      averageProgress: gisungData.length > 0 ? 
        gisungData.reduce((sum, item) => sum + (item.progress || 0), 0) / gisungData.length : 0
    };
    
    console.log('📊 통계 계산 완료:', statistics);
    return statistics;
    
  } catch (error) {
    console.error('❌ 기성금 통계 조회 실패:', error);
    throw error;
  }
};

// 기성금 데이터를 현장별로 그룹화
export const getGisungDataBySite = async (siteName) => {
  try {
    console.log(`🏗️ 현장별 기성금 데이터 조회: ${siteName}`);
    
    const gisungData = await getGisungDataFromFirebase();
    
    // 현장명으로 필터링 (현재는 모든 데이터를 반환, 향후 현장별 구분 로직 추가 가능)
    const siteData = gisungData.filter(item => {
      // 현장별 구분 로직이 있다면 여기에 추가
      return true; // 현재는 모든 데이터 반환
    });
    
    return siteData;
    
  } catch (error) {
    console.error('❌ 현장별 기성금 데이터 조회 실패:', error);
    throw error;
  }
};

// 기성금 데이터 검색
export const searchGisungData = async (searchTerm) => {
  try {
    console.log(`🔍 기성금 데이터 검색: ${searchTerm}`);
    
    const gisungData = await getGisungDataFromFirebase();
    
    if (!searchTerm) {
      return gisungData;
    }
    
    const searchLower = searchTerm.toLowerCase();
    const searchResults = gisungData.filter(item => 
      (item.name && item.name.toLowerCase().includes(searchLower)) ||
      (item.specification && item.specification.toLowerCase().includes(searchLower)) ||
      (item.unit && item.unit.toLowerCase().includes(searchLower))
    );
    
    console.log(`🔍 검색 결과: ${searchResults.length}개 항목`);
    return searchResults;
    
  } catch (error) {
    console.error('❌ 기성금 데이터 검색 실패:', error);
    throw error;
  }
};

// 기성금 데이터 내보내기 (JSON 형태)
export const exportGisungData = async () => {
  try {
    console.log('📤 기성금 데이터 내보내기...');
    
    const gisungData = await getGisungDataFromFirebase();
    const statistics = await getGisungStatistics();
    
    const exportData = {
      exportDate: new Date().toISOString(),
      statistics: statistics,
      items: gisungData
    };
    
    // JSON 파일로 다운로드
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `gisung_data_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('✅ 기성금 데이터 내보내기 완료');
    return exportData;
    
  } catch (error) {
    console.error('❌ 기성금 데이터 내보내기 실패:', error);
    throw error;
  }
};
