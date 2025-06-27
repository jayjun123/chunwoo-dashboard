import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc, Timestamp } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
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
      const userData = userDoc.exists() ? doc.data() : {};
      
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
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        try {
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

                if (!userInfo.role) userInfo.role = 'user';
                if (!userInfo.grade) userInfo.grade = '일반회원';

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
                  role: 'user',
                  grade: '일반회원',
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
                role: 'user',
                grade: '일반회원',
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
            role: 'user',
            grade: '일반회원',
          };
          setCurrentUser(userInfo);
          storeUser(userInfo);
          setLoading(false);
        }
      } else {
        // 로그아웃 상태
        setCurrentUser(null);
        storeUser(null);
        setLoading(false); // 로딩 종료
      }
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

  // 브라우저 탭/창 닫힐 때 로그아웃 처리
  useEffect(() => {
    const handleBeforeUnload = () => {
      // 브라우저를 닫을 때 로그아웃
      storeUser(null);
    };

    const handleVisibilityChange = () => {
      // 탭이 숨겨질 때 로그아웃
      if (document.visibilityState === 'hidden') {
        storeUser(null);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const value = {
    currentUser,
    register,
    login,
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
      {!loading && children}
    </AuthContext.Provider>
  );
}; 