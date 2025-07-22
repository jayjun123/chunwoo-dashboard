import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc, Timestamp } from 'firebase/firestore';
import { saveSessionInfo, loadSessionInfo, clearSessionInfo, checkSessionSync } from '../utils/sessionUtils';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 로컬 스토리지에서 로그인 상태 확인 (Firebase Auth와 동기화)
  const getStoredUser = () => {
    try {
      // Firebase Auth의 현재 상태를 우선 확인
      const currentAuthUser = auth.currentUser;
      if (currentAuthUser) {
        console.log('AuthContext - Firebase Auth에서 현재 사용자 확인:', currentAuthUser.uid);
        return null; // Firebase Auth가 있으면 로컬 스토리지는 무시
      }
      
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('로컬 스토리지 읽기 실패:', error);
      return null;
    }
  };

  // 로컬 스토리지에 사용자 정보 저장 (Firebase Auth와 동기화)
  const storeUser = (user) => {
    try {
      if (user) {
        // Firebase Auth와 동기화 확인
        const currentAuthUser = auth.currentUser;
        if (currentAuthUser && currentAuthUser.uid === user.uid) {
          localStorage.setItem('user', JSON.stringify(user));
          console.log('AuthContext - 사용자 정보 저장 (Firebase Auth와 동기화됨):', user.uid);
        } else {
          console.warn('AuthContext - Firebase Auth와 사용자 정보가 일치하지 않음, 저장하지 않음');
        }
      } else {
        localStorage.removeItem('user');
        console.log('AuthContext - 사용자 정보 제거');
      }
    } catch (error) {
      console.error('로컬 스토리지 저장 실패:', error);
    }
  };

  // 회원가입 (이름과 소속 정보 포함)
  const register = async (email, password, name, organization) => {
    try {
      // Firebase Auth로 사용자 생성
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Firestore에 추가 사용자 정보 저장
      const userData = {
        email: email,
        name: name,
        organization: organization,
        role: 'user', // 기본 역할
        grade: '일반회원', // 기본 등급
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        isActive: true,
        lastLoginAt: Timestamp.now()
      };

      // Firestore에 사용자 정보 저장
      await setDoc(doc(db, 'members', user.uid), userData);

      // 프로필 업데이트 (displayName 설정)
      await updateProfile(user, {
        displayName: name
      });

      console.log('회원가입 성공:', user.uid);
      return userCredential;
    } catch (error) {
      console.error('회원가입 실패:', error);
      throw error;
    }
  };

  // 로그인
  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'members', userCredential.user.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};
      
      const userInfo = {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName,
        ...userData,
      };
      
      setCurrentUser(userInfo);
      storeUser(userInfo);
      saveSessionInfo(userInfo);
      
      console.log('AuthContext - 로그인 완료 및 세션 저장:', userInfo.uid);
      return userCredential;
    } catch (error) {
      console.error('로그인 실패:', error);
      throw error;
    }
  };

  // Google 로그인
  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      // Google Tasks API 권한 추가
      provider.addScope('https://www.googleapis.com/auth/tasks');
      provider.addScope('https://www.googleapis.com/auth/tasks.readonly');
      
      const userCredential = await signInWithPopup(auth, provider);
      const userDoc = await getDoc(doc(db, 'members', userCredential.user.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};
      
      const userInfo = {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName,
        ...userData,
      };
      
      setCurrentUser(userInfo);
      storeUser(userInfo);
      saveSessionInfo(userInfo);
      
      console.log('AuthContext - Google 로그인 완료 및 세션 저장:', userInfo.uid);
      return userCredential;
    } catch (error) {
      console.error('Google 로그인 실패:', error);
      throw error;
    }
  };

  // 로그아웃
  const logout = async () => {
    try {
      console.log('AuthContext - 로그아웃 시작');
      setCurrentUser(null);
      storeUser(null);
      clearSessionInfo();
      await signOut(auth);
      console.log('AuthContext - 로그아웃 완료');
    } catch (error) {
      console.error('AuthContext - 로그아웃 실패:', error);
      throw error;
    }
  };

  // 사용자 정보 새로고침 (Firebase에서 최신 정보 가져오기)
  const refreshUserInfo = async () => {
    if (!auth.currentUser) return;
    
    try {
      const userDoc = await getDoc(doc(db, 'members', auth.currentUser.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};
      
      const userInfo = {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        displayName: auth.currentUser.displayName,
        ...userData,
      };
      
      setCurrentUser(userInfo);
      storeUser(userInfo);
      console.log('AuthContext - 사용자 정보 새로고침 완료:', userInfo);
      return userInfo;
    } catch (error) {
      console.error('사용자 정보 새로고침 실패:', error);
      throw error;
    }
  };

  // 비밀번호 재설정
  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  // 프로필 업데이트
  async function updateUserProfile(profile) {
    try {
      await updateProfile(auth.currentUser, profile);
    } catch (error) {
      setError(error.message);
      throw error;
    }
  }

  useEffect(() => {
    let unsubscribeFirestore = null;
    
    // 로딩 타임아웃 설정 (5초 후 강제 로딩 종료)
    const loadingTimeout = setTimeout(() => {
      console.warn('AuthContext - 로딩 타임아웃, 강제로 로딩 종료');
      setLoading(false);
    }, 5000);
    
      // 세션 동기화 함수
  const syncSession = async (user) => {
    if (user) {
      try {
        // 토큰 새로고침으로 세션 유지
        const token = await user.getIdToken(true);
        console.log('AuthContext - 세션 동기화 완료 (토큰 새로고침)');
        
        // Firestore에서 최신 사용자 정보 가져오기
        const userDoc = await getDoc(doc(db, 'members', user.uid));
        const userData = userDoc.exists() ? userDoc.data() : {};
        
        const userInfo = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          ...userData,
        };
        
        setCurrentUser(userInfo);
        storeUser(userInfo);
        console.log('AuthContext - 사용자 정보 동기화 완료:', userInfo.uid);
        
        // 세션 정보 저장
        saveSessionInfo(userInfo);
        
      } catch (error) {
        console.error('AuthContext - 세션 동기화 실패:', error);
        // 기본 사용자 정보로 설정
        const userInfo = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        };
        setCurrentUser(userInfo);
        storeUser(userInfo);
      }
    } else {
      setCurrentUser(null);
      storeUser(null);
      console.log('AuthContext - 로그아웃 상태로 동기화');
      
      // 세션 정보 제거
      clearSessionInfo();
    }
    setLoading(false);
  };
    
        // Firebase Auth 상태 변경 리스너
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('AuthContext - Firebase Auth 상태 변경:', user ? `로그인 (${user.uid})` : '로그아웃');
      clearTimeout(loadingTimeout); // Auth 상태 변경 시 타임아웃 클리어
      
      // 세션 동기화 실행
      await syncSession(user);
    }, (error) => {
      // Firebase Auth 초기화 오류 처리
      console.error('Firebase Auth 초기화 오류:', error);
      setCurrentUser(null);
      storeUser(null);
      setLoading(false);
    });

    // 브라우저 탭 간 세션 동기화
    const handleStorageChange = (e) => {
      if (e.key === 'userSession') {
        console.log('AuthContext - 다른 탭에서 세션 변경 감지');
        // 세션 동기화 상태 확인
        const currentAuthUser = auth.currentUser;
        if (currentAuthUser) {
          const syncStatus = checkSessionSync(currentAuthUser);
          if (!syncStatus.synced) {
            console.log('AuthContext - 세션 동기화 필요:', syncStatus.reason);
            syncSession(currentAuthUser);
          }
        }
      }
    };

    // storage 이벤트 리스너 추가
    window.addEventListener('storage', handleStorageChange);

    return () => {
      try {
        clearTimeout(loadingTimeout); // 타임아웃 클리어
        unsubscribe();
        if (unsubscribeFirestore) {
          unsubscribeFirestore();
        }
        window.removeEventListener('storage', handleStorageChange);
      } catch (error) {
        console.error('구독 해제 오류:', error);
      }
    };
  }, []);

  const value = {
    currentUser,
    register,
    login,
    loginWithGoogle,
    logout,
    refreshUserInfo,
    resetPassword,
    updateUserProfile,
    error,
    setError,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 