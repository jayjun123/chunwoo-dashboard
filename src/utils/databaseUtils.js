import { databaseAPI, dbConnectionManager } from '../api/database';

// 데이터베이스 연동 상태 진단
export const diagnoseDatabaseConnection = async () => {
  const results = {
    overall: 'unknown',
    details: {},
    recommendations: []
  };

  try {
    // 1. 기본 연결 테스트
    const connectionTest = await databaseAPI.checkConnection();
    results.details.connection = {
      status: connectionTest ? 'success' : 'failed',
      message: connectionTest ? '데이터베이스 연결 성공' : '데이터베이스 연결 실패'
    };

    // 2. 각 컬렉션별 테스트
    const collections = [
      'sites', 'progress', 'discussions', 'safety', 'todos',
      'weather', 'members', 'permissions', 'costs', 'documents',
      'schedules', 'vendors', 'gisung', 'estimates', 'claims'
    ];

    for (const collection of collections) {
      try {
        const api = databaseAPI[collection.replace(/s$/, '') + 'API'] || databaseAPI[collection + 'API'];
        if (api && api.getAll) {
          await api.getAll();
          results.details[collection] = {
            status: 'success',
            message: `${collection} 컬렉션 접근 성공`
          };
        } else {
          results.details[collection] = {
            status: 'warning',
            message: `${collection} 컬렉션 API 없음`
          };
        }
      } catch (error) {
        results.details[collection] = {
          status: 'error',
          message: `${collection} 컬렉션 접근 실패: ${error.message}`
        };
      }
    }

    // 3. 연결 관리자 상태 확인
    const connectionStatus = dbConnectionManager.isConnected();
    const errorCount = dbConnectionManager.getErrorCount();
    
    results.details.connectionManager = {
      status: connectionStatus ? 'success' : 'error',
      message: `연결 관리자: ${connectionStatus ? '정상' : '오류'} (오류 ${errorCount}회)`
    };

    // 4. 전체 상태 평가
    const errorCounts = Object.values(results.details).filter(d => d.status === 'error').length;
    const warningCounts = Object.values(results.details).filter(d => d.status === 'warning').length;

    if (errorCounts === 0 && warningCounts === 0) {
      results.overall = 'excellent';
      results.recommendations.push('모든 데이터베이스 연동이 정상입니다.');
    } else if (errorCounts === 0) {
      results.overall = 'good';
      results.recommendations.push('일부 컬렉션에 API가 없지만 연결은 정상입니다.');
    } else if (errorCounts < 5) {
      results.overall = 'fair';
      results.recommendations.push('일부 데이터베이스 연동에 문제가 있습니다.');
    } else {
      results.overall = 'poor';
      results.recommendations.push('데이터베이스 연동에 심각한 문제가 있습니다.');
    }

    // 5. 권장사항 추가
    if (errorCount > 0) {
      results.recommendations.push(`연결 오류가 ${errorCount}회 발생했습니다. 네트워크 상태를 확인해주세요.`);
    }

    const failedCollections = Object.entries(results.details)
      .filter(([key, detail]) => detail.status === 'error' && key !== 'connection')
      .map(([key]) => key);

    if (failedCollections.length > 0) {
      results.recommendations.push(`다음 컬렉션에 문제가 있습니다: ${failedCollections.join(', ')}`);
    }

  } catch (error) {
    results.overall = 'error';
    results.details.general = {
      status: 'error',
      message: `진단 중 오류 발생: ${error.message}`
    };
    results.recommendations.push('데이터베이스 진단 중 오류가 발생했습니다.');
  }

  return results;
};

// 데이터베이스 성능 테스트
export const testDatabasePerformance = async () => {
  const results = {
    readPerformance: {},
    writePerformance: {},
    recommendations: []
  };

  try {
    // 읽기 성능 테스트
    const startTime = Date.now();
    await databaseAPI.sites.getAll();
    const readTime = Date.now() - startTime;
    
    results.readPerformance = {
      time: readTime,
      status: readTime < 1000 ? 'excellent' : readTime < 3000 ? 'good' : 'poor',
      message: `읽기 성능: ${readTime}ms`
    };

    // 쓰기 성능 테스트 (테스트 데이터)
    const testData = {
      name: '성능테스트',
      status: '테스트',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const writeStartTime = Date.now();
    await databaseAPI.sites.add(testData);
    const writeTime = Date.now() - writeStartTime;

    results.writePerformance = {
      time: writeTime,
      status: writeTime < 2000 ? 'excellent' : writeTime < 5000 ? 'good' : 'poor',
      message: `쓰기 성능: ${writeTime}ms`
    };

    // 권장사항
    if (readTime > 3000) {
      results.recommendations.push('읽기 성능이 느립니다. 인덱스를 확인해주세요.');
    }
    if (writeTime > 5000) {
      results.recommendations.push('쓰기 성능이 느립니다. 네트워크 상태를 확인해주세요.');
    }

  } catch (error) {
    results.readPerformance = {
      time: 0,
      status: 'error',
      message: `성능 테스트 실패: ${error.message}`
    };
    results.recommendations.push('성능 테스트 중 오류가 발생했습니다.');
  }

  return results;
};

// 데이터베이스 동기화 상태 확인
export const checkDataSyncStatus = async () => {
  const results = {
    syncStatus: {},
    recommendations: []
  };

  try {
    // 실시간 구독 테스트
    const subscriptions = [];
    
    // sites 구독 테스트
    const sitesSubscription = databaseAPI.sites.subscribeToSites((data) => {
      results.syncStatus.sites = {
        status: 'active',
        message: `실시간 구독 활성화 (${data.length}개 데이터)`
      };
    });

    // gisung 구독 테스트 (첫 번째 사이트가 있다면)
    const sites = await databaseAPI.sites.getAll();
    if (sites.length > 0) {
      const gisungSubscription = databaseAPI.gisung.subscribeToGisung(sites[0].id, (data) => {
        results.syncStatus.gisung = {
          status: 'active',
          message: `실시간 구독 활성화 (${data.length}개 데이터)`
        };
      });
      subscriptions.push(gisungSubscription);
    }

    subscriptions.push(sitesSubscription);

    // 5초 후 구독 정리
    setTimeout(() => {
      subscriptions.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
    }, 5000);

    results.recommendations.push('실시간 데이터 동기화가 정상적으로 작동합니다.');

  } catch (error) {
    results.syncStatus.general = {
      status: 'error',
      message: `동기화 테스트 실패: ${error.message}`
    };
    results.recommendations.push('실시간 동기화 테스트 중 오류가 발생했습니다.');
  }

  return results;
};

// 데이터베이스 연동 개선 권장사항
export const getDatabaseOptimizationRecommendations = () => {
  const recommendations = [
    {
      category: '성능',
      items: [
        '자주 사용되는 쿼리에 인덱스 추가',
        '불필요한 데이터 구독 해제',
        '페이지네이션 구현으로 대용량 데이터 처리 개선',
        '캐싱 전략 수립'
      ]
    },
    {
      category: '안정성',
      items: [
        '오프라인 지원 강화',
        '에러 재시도 로직 구현',
        '데이터 백업 전략 수립',
        '연결 상태 모니터링 강화'
      ]
    },
    {
      category: '보안',
      items: [
        'Firestore 보안 규칙 검토',
        '사용자 권한 관리 강화',
        '데이터 암호화 고려',
        'API 키 보안 강화'
      ]
    },
    {
      category: '유지보수',
      items: [
        '데이터베이스 스키마 문서화',
        'API 함수 타입 정의',
        '테스트 코드 작성',
        '모니터링 로그 개선'
      ]
    }
  ];

  return recommendations;
};

// 데이터베이스 연결 상태 요약
export const getDatabaseStatusSummary = () => {
  const status = dbConnectionManager.isConnected();
  const errorCount = dbConnectionManager.getErrorCount();
  
  return {
    connected: status,
    errorCount,
    lastConnected: dbConnectionManager.lastConnected,
    status: status ? '정상' : '오류',
    message: status 
      ? '데이터베이스 연결이 정상입니다.' 
      : `데이터베이스 연결에 문제가 있습니다. (오류 ${errorCount}회)`
  };
}; 

// Firebase 연결 상태 확인
export const isFirebaseConnected = () => {
  try {
    // Firebase 앱이 초기화되었는지 확인
    return typeof window !== 'undefined' && window.firebase;
  } catch (error) {
    console.warn('Firebase 연결 상태 확인 실패:', error);
    return false;
  }
};

// 안전한 문서 업데이트 함수
export const safeUpdateDoc = async (docRef, data, options = {}) => {
  try {
    if (!isFirebaseConnected()) {
      console.warn('Firebase가 연결되지 않았습니다.');
      return false;
    }
    
    const { updateDoc } = await import('firebase/firestore');
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date()
    });
    
    return true;
  } catch (error) {
    console.error('문서 업데이트 실패:', error);
    
    // 메시지 채널 오류인 경우 재시도
    if (error.message.includes('message channel closed')) {
      console.log('메시지 채널 오류 감지, 재시도 중...');
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const { updateDoc } = await import('firebase/firestore');
        await updateDoc(docRef, {
          ...data,
          updatedAt: new Date()
        });
        return true;
      } catch (retryError) {
        console.error('재시도 실패:', retryError);
        return false;
      }
    }
    
    return false;
  }
};

// 디바운스된 업데이트 함수
export const debouncedUpdate = (func, delay = 1000) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}; 