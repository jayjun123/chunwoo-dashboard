/**
 * Firestore 오류 처리 및 재연결 유틸리티
 */

import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

class FirestoreErrorHandler {
  constructor() {
    this.retryCount = 0;
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1초
    this.isReconnecting = false;
  }

  /**
   * Firestore 오류 처리
   * @param {Error} error - Firestore 오류
   * @param {Function} retryCallback - 재시도 콜백 함수
   */
  async handleError(error, retryCallback) {
    console.error('🔥 Firestore 오류 발생:', error);
    
    // 오류 코드별 처리
    switch (error.code) {
      case 'permission-denied':
        console.error('❌ 권한 거부:', error.message);
        this.handlePermissionError();
        break;
        
      case 'unavailable':
        console.error('❌ 서비스 사용 불가:', error.message);
        await this.handleUnavailableError(retryCallback);
        break;
        
      case 'unauthenticated':
        console.error('❌ 인증 실패:', error.message);
        await this.handleAuthError();
        break;
        
      case 'resource-exhausted':
        console.error('❌ 리소스 한계 초과:', error.message);
        await this.handleResourceExhaustedError(retryCallback);
        break;
        
      default:
        console.error('❌ 알 수 없는 오류:', error.code, error.message);
        await this.handleGenericError(retryCallback);
    }
  }

  /**
   * 권한 오류 처리
   */
  handlePermissionError() {
    // 사용자에게 권한 오류 알림
    if (window.showSnackbar) {
      window.showSnackbar({
        open: true,
        message: '데이터 접근 권한이 없습니다. 관리자에게 문의하세요.',
        severity: 'error'
      });
    }
  }

  /**
   * 서비스 사용 불가 오류 처리
   */
  async handleUnavailableError(retryCallback) {
    if (this.retryCount < this.maxRetries && !this.isReconnecting) {
      this.isReconnecting = true;
      this.retryCount++;
      
      console.log(`🔄 Firestore 재연결 시도 ${this.retryCount}/${this.maxRetries}`);
      
      // 지수 백오프로 재시도 지연
      const delay = this.retryDelay * Math.pow(2, this.retryCount - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      try {
        if (retryCallback) {
          await retryCallback();
        }
        console.log('✅ Firestore 재연결 성공');
        this.retryCount = 0;
      } catch (retryError) {
        console.error('❌ Firestore 재연결 실패:', retryError);
        await this.handleUnavailableError(retryCallback);
      } finally {
        this.isReconnecting = false;
      }
    } else {
      console.error('❌ 최대 재시도 횟수 초과');
      if (window.showSnackbar) {
        window.showSnackbar({
          open: true,
          message: '서버 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.',
          severity: 'error'
        });
      }
    }
  }

  /**
   * 인증 오류 처리
   */
  async handleAuthError() {
    console.log('🔐 인증 상태 확인 중...');
    
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        unsubscribe();
        
        if (user) {
          console.log('✅ 사용자 인증 상태 정상');
          resolve(true);
        } else {
          console.log('❌ 사용자 인증 필요');
          // 로그인 페이지로 리다이렉트
          window.location.href = '/login';
          resolve(false);
        }
      });
    });
  }

  /**
   * 리소스 한계 초과 오류 처리
   */
  async handleResourceExhaustedError(retryCallback) {
    console.log('⏳ 리소스 한계 초과 - 30초 대기 후 재시도');
    
    // 30초 대기
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    if (retryCallback) {
      await retryCallback();
    }
  }

  /**
   * 일반 오류 처리
   */
  async handleGenericError(retryCallback) {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      console.log(`🔄 일반 오류 재시도 ${this.retryCount}/${this.maxRetries}`);
      
      await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      
      if (retryCallback) {
        await retryCallback();
      }
    }
  }

  /**
   * 연결 상태 확인
   */
  async checkConnection() {
    try {
      const testDoc = doc(db, 'test', 'connection');
      await getDoc(testDoc);
      console.log('✅ Firestore 연결 상태 정상');
      return true;
    } catch (error) {
      console.error('❌ Firestore 연결 상태 확인 실패:', error);
      return false;
    }
  }

  /**
   * 재시도 카운터 리셋
   */
  resetRetryCount() {
    this.retryCount = 0;
    this.isReconnecting = false;
  }
}

// 전역 인스턴스 생성
export const firestoreErrorHandler = new FirestoreErrorHandler();

// 전역 오류 핸들러 등록
window.firestoreErrorHandler = firestoreErrorHandler;




