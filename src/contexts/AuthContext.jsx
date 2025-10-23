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
import { 
  logLoginSuccess, 
  logLoginFailed, 
  logLogout, 
  logRegister, 
  detectSuspiciousActivity 
} from '../utils/securityUtils';
import { debugMasterUser } from '../utils/masterUtils';


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

  console.log('🔐 AuthProvider 렌더링:', { currentUser, loading, error });

  // 로그인 상태를 localStorage에 저장
  const saveUserToStorage = (user) => {
    try {
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('loginTime', Date.now().toString());
        console.log('✅ 사용자 정보를 localStorage에 저장했습니다.');
      } else {
        localStorage.removeItem('user');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('loginTime');
        console.log('✅ localStorage에서 사용자 정보를 제거했습니다.');
      }
    } catch (error) {
      console.error('❌ 사용자 정보 저장 실패:', error);
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
          console.log('✅ AuthContext - localStorage에서 사용자 정보 복원');
          setCurrentUser(user);
          return user;
        } else {
          // 30일이 지났으면 로그아웃 처리
          console.log('⚠️ AuthContext - 로그인 만료 (30일 초과)');
          saveUserToStorage(null);
        }
      }
    } catch (error) {
      console.error('❌ 사용자 정보 복원 실패:', error);
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

      // 보안 로그 기록
      try {
        await logRegister(user.uid, email, {
          name,
          organization,
          registrationMethod: 'email'
        });
      } catch (logError) {
        console.warn('보안 로그 기록 실패:', logError);
        // 로그 기록 실패해도 회원가입은 계속 진행
      }

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
      
      // 보안 로그 기록 (로그인 성공)
      try {
        await logLoginSuccess(userInfo.uid, email, {
          loginMethod: 'email',
          userRole: userData.role || 'user'
        });
      } catch (logError) {
        console.warn('보안 로그 기록 실패:', logError);
        // 로그 기록 실패해도 로그인은 계속 진행
      }
      
      console.log('AuthContext - 로그인 완료:', userInfo.uid);
      return userCredential;
    } catch (error) {
      console.error('로그인 실패:', error);
      
      // 보안 로그 기록 (로그인 실패)
      try {
        await logLoginFailed(email, error.message, {
          loginMethod: 'email',
          errorCode: error.code
        });
      } catch (logError) {
        console.warn('보안 로그 기록 실패:', logError);
        // 로그 기록 실패해도 오류는 계속 throw
      }
      
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
      
      // 보안 로그 기록 (Google 로그인 성공)
      try {
        await logLoginSuccess(userInfo.uid, userInfo.email, {
          loginMethod: 'google',
          userRole: userData.role || 'user'
        });
      } catch (logError) {
        console.warn('보안 로그 기록 실패:', logError);
        // 로그 기록 실패해도 로그인은 계속 진행
      }
      
      console.log('AuthContext - Google 로그인 완료:', userInfo.uid);
      return userCredential;
    } catch (error) {
      console.error('Google 로그인 실패:', error);
      
      // 보안 로그 기록 (Google 로그인 실패)
      try {
        await logLoginFailed(userCredential?.user?.email || 'unknown', error.message, {
          loginMethod: 'google',
          errorCode: error.code
        });
      } catch (logError) {
        console.warn('보안 로그 기록 실패:', logError);
        // 로그 기록 실패해도 오류는 계속 throw
      }
      
      throw error;
    }
  };

  // 로그아웃
  const logout = async () => {
    try {
      console.log('AuthContext - 로그아웃 시작');
      
      // 보안 로그 기록 (로그아웃)
      if (currentUser) {
        try {
          await logLogout(currentUser.uid, currentUser.email, {
            logoutMethod: 'manual'
          });
        } catch (logError) {
          console.warn('보안 로그 기록 실패:', logError);
          // 로그 기록 실패해도 로그아웃은 계속 진행
        }
      }
      
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
    console.log('🔍 Firebase 인증 상태 감지 시작');
    
    try {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        console.log('🔥 Firebase 인증 상태 변경:', user ? '로그인됨' : '로그아웃됨');
        
        try {
          if (user) {
            console.log('👤 사용자 정보:', { uid: user.uid, email: user.email });
            
            // Firestore에서 추가 사용자 정보 가져오기
            try {
              const userDoc = await getDoc(doc(db, 'members', user.uid));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                console.log('📄 Firestore 사용자 데이터:', userData);
                
                // 사용자 객체에 Firestore 데이터 병합
                const enhancedUser = {
                  ...user,
                  ...userData
                };
                
                setCurrentUser(enhancedUser);
                saveUserToStorage(enhancedUser);
                console.log('✅ 사용자 정보 설정 완료');
                
                // 디버깅 로그 추가
                debugMasterUser(enhancedUser);
                
                // 자동 로그인 감지 시 보안 로그 기록
                try {
                  await logLoginSuccess(enhancedUser.uid, enhancedUser.email, {
                    loginMethod: 'auto',
                    userRole: enhancedUser.role || 'user',
                    source: 'onAuthStateChanged'
                  });
                } catch (logError) {
                  console.warn('자동 로그인 보안 로그 기록 실패:', logError);
                }
              } else {
                console.log('⚠️ Firestore에 사용자 데이터가 없습니다.');
                setCurrentUser(user);
                saveUserToStorage(user);
              }
            } catch (firestoreError) {
              console.error('❌ Firestore 데이터 조회 실패:', firestoreError);
              // Firestore 오류가 있어도 기본 사용자 정보는 설정
              setCurrentUser(user);
              saveUserToStorage(user);
            }
          } else {
            console.log('🚪 사용자 로그아웃');
            setCurrentUser(null);
            saveUserToStorage(null);
          }
        } catch (error) {
          console.error('❌ 사용자 정보 처리 중 오류:', error);
          setError('사용자 정보를 처리하는 중 오류가 발생했습니다.');
        } finally {
          console.log('✅ 인증 상태 처리 완료, 로딩 상태 해제');
          setLoading(false);
        }
      }, (error) => {
        console.error('❌ Firebase 인증 상태 감지 오류:', error);
        setError('인증 상태를 확인하는 중 오류가 발생했습니다.');
        setLoading(false);
      });

      // 초기 로딩 시 localStorage에서 사용자 정보 복원 시도
      const restoredUser = restoreUserFromStorage();
      if (restoredUser) {
        console.log('🔄 localStorage에서 복원된 사용자 정보로 임시 설정');
        setCurrentUser(restoredUser);
        setLoading(false);
      }

      return () => {
        console.log('🧹 AuthProvider cleanup - Firebase 구독 해제');
        unsubscribe();
      };
    } catch (error) {
      console.error('❌ AuthProvider 초기화 오류:', error);
      setError('인증 시스템을 초기화하는 중 오류가 발생했습니다.');
      setLoading(false);
    }
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