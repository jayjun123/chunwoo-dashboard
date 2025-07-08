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

  // 로컬 스토리지에서 로그인 상태 확인
  const getStoredUser = () => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('로컬 스토리지 읽기 실패:', error);
      return null;
    }
  };

  // 로컬 스토리지에 사용자 정보 저장
  const storeUser = (user) => {
    try {
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        localStorage.removeItem('user');
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
      return userCredential;
    } catch (error) {
      console.error('Google 로그인 실패:', error);
      throw error;
    }
  };

  // 로그아웃
  const logout = () => {
    setCurrentUser(null);
    storeUser(null);
    return signOut(auth);
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
    
    // 초기 로딩 시 로컬 스토리지에서 사용자 정보 복원
    const storedUser = getStoredUser();
    if (storedUser && !currentUser) {
      console.log('AuthContext - 로컬 스토리지에서 사용자 정보 복원:', storedUser);
      setCurrentUser(storedUser);
    }
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('AuthContext - Firebase Auth 상태 변경:', user ? '로그인' : '로그아웃');
      
      if (user) {
        try {
          // 토큰 새로고침 (세션 유지)
          const token = await user.getIdToken(true);
          console.log('AuthContext - 토큰 새로고침 완료');
          
          // Firestore 실시간 리스너 추가
          unsubscribeFirestore = onSnapshot(doc(db, 'members', user.uid), 
            (doc) => { // Success callback
              try {
                const userData = doc.exists() ? doc.data() : {};
                const userInfo = {
                  uid: user.uid,
                  email: user.email,
                  displayName: user.displayName,
                  ...userData,
                };

                // 기본값 설정하지 않음 - Firestore에서 실제 값 사용
                console.log('AuthContext - Firestore에서 로드된 사용자 정보:', userData);

                setCurrentUser(userInfo);
                storeUser(userInfo);
                console.log('AuthContext - 실시간 업데이트:', userInfo);
                setLoading(false); // 정보 로드 완료, 로딩 종료
              } catch (error) {
                console.error('사용자 데이터 처리 오류:', error);
                const userInfo = { 
                  uid: user.uid,
                  email: user.email,
                  displayName: user.displayName,
                  // 기본값 설정하지 않음
                };
                setCurrentUser(userInfo);
                storeUser(userInfo);
                setLoading(false);
              }
            },
            (error) => { // Error callback
              console.error('Firestore 스냅샷 에러:', error);
              // 에러 발생 시 기본 사용자 정보로 설정
              const userInfo = { 
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                // 기본값 설정하지 않음
              };
              setCurrentUser(userInfo);
              storeUser(userInfo);
              setLoading(false); // 에러 발생 시에도 로딩 종료
            }
          );
        } catch (error) {
          console.error('Firestore 구독 설정 오류:', error);
          const userInfo = { 
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            // 기본값 설정하지 않음
          };
          setCurrentUser(userInfo);
          storeUser(userInfo);
          setLoading(false);
        }
      } else {
        // 로그아웃 상태
        console.log('AuthContext - 로그아웃 상태로 변경');
        setCurrentUser(null);
        storeUser(null);
        setLoading(false); // 로딩 종료
      }
    }, (error) => {
      // Firebase Auth 초기화 오류 처리
      console.error('Firebase Auth 초기화 오류:', error);
      setCurrentUser(null);
      storeUser(null);
      setLoading(false);
    });

    return () => {
      try {
        unsubscribe();
        if (unsubscribeFirestore) {
          unsubscribeFirestore();
        }
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