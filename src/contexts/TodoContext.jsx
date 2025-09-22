import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { collection, query, where, addDoc, updateDoc, deleteDoc, doc, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { format, subDays } from 'date-fns';
import { useAuth } from './AuthContext';

const TodoContext = createContext();

export const useTodo = () => {
  const context = useContext(TodoContext);
  if (!context) {
    throw new Error('useTodo must be used within a TodoProvider');
  }
  return context;
};

export const TodoProvider = ({ children }) => {
  let authContext;
  let currentUser;
  let authLoading;
  
  try {
    authContext = useAuth();
    currentUser = authContext?.currentUser;
    authLoading = authContext?.loading;
  } catch (error) {
    console.warn('TodoContext: useAuth 초기화 실패, 기본값 사용:', error);
    currentUser = null;
    authLoading = true;
  }
  
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 실시간 투두 데이터 구독
  useEffect(() => {
    console.log('=== TodoContext useEffect 실행 ===');
    console.log('currentUser:', currentUser);
    console.log('currentUser?.uid:', currentUser?.uid);
    console.log('authLoading:', authLoading);
    
    // AuthProvider가 아직 로딩 중이면 대기
    if (authLoading) {
      console.log('AuthProvider 로딩 중 - 대기');
      return;
    }
    
    if (!currentUser?.uid) {
      console.log('사용자 ID가 없음 - todos 초기화');
      setTodos([]);
      setLoading(false);
      return;
    }

    console.log('Firestore 쿼리 시작 - userId:', currentUser.uid);
    
    const q = query(
      collection(db, 'todos'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        console.log('=== TodoContext 실시간 업데이트 ===');
        console.log('가져온 문서 개수:', snapshot.docs.length);
        console.log('원본 데이터:', data);
        
        // 클라이언트에서 정렬
        const sortedData = data.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
          const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
          return dateB - dateA; // 내림차순
        });
        
        console.log('정렬된 데이터:', sortedData);
        console.log('설정할 todos 개수:', sortedData.length);
        
        setTodos(sortedData);
        setError(null);
      } catch (error) {
        console.error('투두 데이터 실시간 업데이트 오류:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }, (error) => {
      console.error('투두 데이터 실시간 구독 오류:', error);
      setError(error.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser?.uid, authLoading]);

  // 투두 추가 (한국 시간 기준)
  const addTodo = async (text, date = null) => {
    if (!currentUser?.uid || !text.trim()) return;

    try {
      let todoDate;
      if (date) {
        todoDate = date;
      } else {
        // 한국 시간 기준으로 오늘 날짜 생성
        const now = new Date();
        const koreanTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
        const todayYear = koreanTime.getFullYear();
        const todayMonth = String(koreanTime.getMonth() + 1).padStart(2, '0');
        const todayDay = String(koreanTime.getDate()).padStart(2, '0');
        todoDate = `${todayYear}-${todayMonth}-${todayDay}`;
      }
      
      const newTodo = {
        text: text.trim(),
        completed: false,
        userId: currentUser.uid,
        date: todoDate,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('투두 추가 (한국 시간 기준):', newTodo);
      await addDoc(collection(db, 'todos'), newTodo);
    } catch (error) {
      console.error('투두 추가 오류:', error);
      throw error;
    }
  };

  // 투두 업데이트
  const updateTodo = async (id, updates) => {
    if (!currentUser?.uid) return;

    try {
      await updateDoc(doc(db, 'todos', id), {
        ...updates,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('투두 업데이트 오류:', error);
      throw error;
    }
  };

  // 투두 삭제
  const deleteTodo = async (id) => {
    if (!currentUser?.uid) return;

    try {
      await deleteDoc(doc(db, 'todos', id));
    } catch (error) {
      console.error('투두 삭제 오류:', error);
      throw error;
    }
  };

  // 투두 토글 (완료/미완료)
  const toggleTodo = async (id, completed) => {
    if (!currentUser?.uid) return;

    try {
      await updateDoc(doc(db, 'todos', id), {
        completed: !completed,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('투두 토글 오류:', error);
      throw error;
    }
  };

  // 오늘 투두만 필터링 (한국 시간 기준)
  const getTodayTodos = useCallback(() => {
    // 한국 시간 기준으로 오늘 날짜 생성
    const now = new Date();
    const koreanTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
    const todayYear = koreanTime.getFullYear();
    const todayMonth = String(koreanTime.getMonth() + 1).padStart(2, '0');
    const todayDay = String(koreanTime.getDate()).padStart(2, '0');
    const todayStr = `${todayYear}-${todayMonth}-${todayDay}`;
    
    console.log('오늘 날짜 (한국 시간):', todayStr);
    
    return todos.filter(todo => {
      try {
        const isToday = todo.date === todayStr;
        if (isToday) {
          console.log('오늘 투두:', todo.text, '날짜:', todo.date);
        }
        return isToday;
      } catch (error) {
        console.error('투두 날짜 필터링 오류:', error);
        return false;
      }
    });
  }, [todos]);

  // 전날 미완료 할일 불러오기 (한국 시간 기준)
  const loadIncompleteFromPreviousDay = useCallback(async () => {
    if (!currentUser?.uid) return;

    try {
      // 한국 시간 기준으로 전날과 오늘 날짜 계산
      const now = new Date();
      const koreanTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
      
      const yesterday = new Date(koreanTime);
      yesterday.setDate(koreanTime.getDate() - 1);
      const yesterdayStr = format(yesterday, 'yyyy-MM-dd');
      
      const todayStr = format(koreanTime, 'yyyy-MM-dd');
      
      console.log('전날 날짜 (한국 시간):', yesterdayStr);
      console.log('오늘 날짜 (한국 시간):', todayStr);
      
      // 전날 미완료 할일 조회
      const yesterdayQuery = query(
        collection(db, 'todos'),
        where('userId', '==', currentUser.uid),
        where('date', '==', yesterdayStr),
        where('completed', '==', false)
      );
      
      const yesterdaySnapshot = await getDocs(yesterdayQuery);
      
      if (yesterdaySnapshot.empty) {
        return { success: true, count: 0, message: '전날 미완료 할일이 없습니다.' };
      }
      
      let addedCount = 0;
      
      // 전날 미완료 항목들을 오늘로 복사
      for (const doc of yesterdaySnapshot.docs) {
        const todoData = doc.data();
        
        // 오늘 이미 같은 내용의 할일이 있는지 확인
        const existingTodo = todos.find(todo => 
          todo.text === todoData.text && 
          todo.date === todayStr
        );
        
        if (!existingTodo) {
          await addDoc(collection(db, 'todos'), {
            text: todoData.text,
            completed: false,
            userId: currentUser.uid,
            date: todayStr,
            createdAt: new Date(),
            updatedAt: new Date(),
            carriedOver: true,
            originalDate: yesterdayStr
          });
          addedCount++;
          console.log('전날 미완료 할일 이월:', todoData.text);
        }
      }
      
      return { 
        success: true, 
        count: addedCount, 
        message: `${addedCount}개의 미완료 할일을 오늘로 이월했습니다.` 
      };
    } catch (error) {
      console.error('전날 미완료 할일 불러오기 오류:', error);
      return { success: false, count: 0, message: '오류가 발생했습니다.' };
    }
  }, [currentUser?.uid, todos]);

  const value = {
    todos,
    loading,
    error,
    addTodo,
    updateTodo,
    deleteTodo,
    toggleTodo,
    getTodayTodos,
    loadIncompleteFromPreviousDay
  };

  console.log('=== TodoContext value ===');
  console.log('todos 개수:', todos.length);
  console.log('loading:', loading);
  console.log('error:', error);

  return (
    <TodoContext.Provider value={value}>
      {children}
    </TodoContext.Provider>
  );
}; 