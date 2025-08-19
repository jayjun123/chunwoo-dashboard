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

  // 로그인 상태를 localStorage에 저장
  const saveUserToStorage = (user) => {
    try {
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('loginTime', Date.now().toString());
      } else {
        localStorage.removeItem('user');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('loginTime');
      }
    } catch (error) {
      console.error('사용자 정보 저장 실패:', error);
    }
  };

  // localStorage에서 사용자 정보 복원
  const restoreUserFromStorage = () => {
    try {
      const savedUser = localStorage.getItem('user');
      const isLoggedIn = localStorage.getItem('isLoggedIn');
      
      if (savedUser && isLoggedIn === 'true') {
        const user = JSON.parse(savedUser);
        const loginTime = parseInt(localStorage.getItem('loginTime') || '0');
        const now = Date.now();
        
        // 30일(30 * 24 * 60 * 60 * 1000) 이내의 로그인은 유지
        if (now - loginTime < 30 * 24 * 60 * 60 * 1000) {
          console.log('AuthContext - localStorage에서 사용자 정보 복원');
          setCurrentUser(user);
          return user;
        } else {
          // 30일이 지났으면 로그아웃 처리
          console.log('AuthContext - 로그인 만료 (30일 초과)');
          saveUserToStorage(null);
        }
      }
    } catch (error) {
      console.error('사용자 정보 복원 실패:', error);
    }
    return null;
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
      saveUserToStorage(userInfo); // localStorage에 사용자 정보 저장
      
      console.log('AuthContext - 로그인 완료:', userInfo.uid);
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
      saveUserToStorage(userInfo); // localStorage에 사용자 정보 저장
      
      console.log('AuthContext - Google 로그인 완료:', userInfo.uid);
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
      saveUserToStorage(null); // localStorage에서 사용자 정보 제거
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

  // 세션 동기화 함수
  const syncSession = async (user) => {
    try {
      if (user) {
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
        saveUserToStorage(userInfo); // localStorage에 사용자 정보 저장
        console.log('AuthContext - 사용자 정보 동기화 완료:', userInfo.uid);
        
      } else {
        setCurrentUser(null);
        console.log('AuthContext - 로그아웃 상태로 동기화');
      }
    } catch (error) {
      console.error('AuthContext - 세션 동기화 실패:', error);
      // 기본 사용자 정보로 설정
      if (user) {
        const userInfo = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        };
        setCurrentUser(userInfo);
      } else {
        setCurrentUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  // Firebase Auth 상태 변경 감지
  useEffect(() => {
    console.log('AuthContext - Firebase Auth 상태 감지 시작');
    let unsubscribe = null;
    let loadingTimeout = null;

    // 로딩 타임아웃 설정 (10초 후 강제로 로딩 해제)
    loadingTimeout = setTimeout(() => {
      console.log('AuthContext - 로딩 타임아웃 발생, 강제 로딩 해제');
      setLoading(false);
    }, 10000);

    try {
      unsubscribe = onAuthStateChanged(auth, async (user) => {
        console.log('AuthContext - Firebase Auth 상태 변경:', user ? `로그인 (${user.uid})` : '로그아웃');
        clearTimeout(loadingTimeout); // Auth 상태 변경 시 타임아웃 클리어
        
        // 개발 환경에서는 자동 로그인
        if (!user && import.meta.env.DEV) {
          console.log('AuthContext - 개발 환경에서 자동 로그인 설정');
          const mockUser = {
            uid: 'dev-user-123',
            email: 'dev@example.com',
            displayName: '개발자',
            role: 'admin',
            name: '개발자',
            organization: '개발팀'
          };
          setCurrentUser(mockUser);
          saveUserToStorage(mockUser);
          setLoading(false);
          return;
        }
        
        // 사용자가 없으면 localStorage에서 복원 시도
        if (!user) {
          const restoredUser = restoreUserFromStorage();
          if (restoredUser) {
            console.log('AuthContext - localStorage에서 사용자 정보 복원 성공');
            setLoading(false);
            return;
          }
          
          // 복원 실패 시 로그아웃 상태로 설정
          setCurrentUser(null);
          setLoading(false);
          return;
        }
        
        // 세션 동기화 실행
        await syncSession(user);
      }, (error) => {
        // Firebase Auth 초기화 오류 처리
        console.error('Firebase Auth 초기화 오류:', error);
        clearTimeout(loadingTimeout);
        
        // 개발 환경에서는 오류 무시하고 자동 로그인
        if (import.meta.env.DEV) {
          console.log('AuthContext - 개발 환경에서 Firebase 오류 무시하고 자동 로그인');
          const mockUser = {
            uid: 'dev-user-123',
            email: 'dev@example.com',
            displayName: '개발자',
            role: 'admin',
            name: '개발자',
            organization: '개발팀'
          };
          setCurrentUser(mockUser);
          setLoading(false);
          return;
        }
        
        // 프로덕션 환경에서는 오류 상태로 설정
        console.error('Firebase Auth 오류로 인한 로그아웃:', error);
        setCurrentUser(null);
        setLoading(false);
      });
    } catch (error) {
      console.error('AuthContext - onAuthStateChanged 설정 오류:', error);
      clearTimeout(loadingTimeout);
      
      // 개발 환경에서는 오류 무시하고 자동 로그인
      if (import.meta.env.DEV) {
        console.log('AuthContext - 개발 환경에서 설정 오류 무시하고 자동 로그인');
        const mockUser = {
          uid: 'dev-user-123',
          email: 'dev@example.com',
          displayName: '개발자',
          role: 'admin',
          name: '개발자',
          organization: '개발팀'
        };
        setCurrentUser(mockUser);
        setLoading(false);
        return;
      }
      
      setCurrentUser(null);
      setLoading(false);
    }
    
    return () => {
      try {
        if (unsubscribe && typeof unsubscribe === 'function') {
          unsubscribe();
        }
        if (loadingTimeout) {
          clearTimeout(loadingTimeout);
        }
      } catch (error) {
        console.error('AuthContext cleanup 오류:', error);
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