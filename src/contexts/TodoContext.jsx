import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { collection, query, where, addDoc, updateDoc, deleteDoc, doc, getDocs, orderBy } from 'firebase/firestore';
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
  const { currentUser } = useAuth();
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);

  // 투두 데이터 가져오기
  const fetchTodos = useCallback(async () => {
    if (!currentUser?.uid) {
      setTodos([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // 오늘 투두리스트 확인
      const todayQuery = query(
        collection(db, 'todos'),
        where('userId', '==', currentUser.uid),
        where('date', '==', today)
      );
      
      const todaySnapshot = await getDocs(todayQuery);
      
      // 오늘 투두리스트가 없으면 전날 미완료 항목을 carry over
      if (todaySnapshot.empty && !initialized) {
        const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
        const yesterdayQuery = query(
          collection(db, 'todos'),
          where('userId', '==', currentUser.uid),
          where('date', '==', yesterday),
          where('completed', '==', false)
        );
        
        const yesterdaySnapshot = await getDocs(yesterdayQuery);
        
        // 전날 미완료 항목들을 오늘로 carry over
        for (const doc of yesterdaySnapshot.docs) {
          const todoData = doc.data();
          await addDoc(collection(db, 'todos'), {
            ...todoData,
            date: today,
            carriedOver: true,
            createdAt: new Date(),
            completed: false
          });
        }
      }
    } catch (error) {
      console.error('투두리스트 초기화 오류:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.uid, initialized]);

  // 실시간 투두 데이터 구독
  useEffect(() => {
    if (!currentUser?.uid) {
      setTodos([]);
      setLoading(false);
      return;
    }

    const loadTodos = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, 'todos'),
          where('userId', '==', currentUser.uid)
        );
        
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // 클라이언트에서 정렬
        const sortedData = data.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
          const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
          return dateB - dateA; // 내림차순
        });
        
        setTodos(sortedData);
        setError(null);
      } catch (error) {
        console.error('투두 데이터 로드 오류:', error);
        setTodos([]);
        setError(null);
      } finally {
        setLoading(false);
      }
    };

    loadTodos();
  }, [currentUser?.uid]);

  // 초기 데이터 로드 (한 번만 실행)
  useEffect(() => {
    if (!initialized && currentUser?.uid) {
      fetchTodos();
      setInitialized(true);
    }
  }, [fetchTodos, initialized, currentUser?.uid]);

  // 투두 추가
  const addTodo = async (text, date = null) => {
    if (!currentUser?.uid || !text.trim()) return;

    try {
      const todoDate = date || format(new Date(), 'yyyy-MM-dd');
      const todo = await addDoc(collection(db, 'todos'), {
        text: text.trim(),
        completed: false,
        userId: currentUser.uid,
        date: todoDate,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // 로컬 상태 업데이트
      const newTodo = { id: todo.id, text: text.trim(), completed: false, userId: currentUser.uid, date: todoDate, createdAt: new Date(), updatedAt: new Date() };
      setTodos(prev => [newTodo, ...prev]);
      
      return todo;
    } catch (error) {
      console.error('투두 추가 오류:', error);
      throw error;
    }
  };

  // 투두 수정
  const updateTodo = async (id, updates) => {
    if (!currentUser?.uid) return;

    try {
      await updateDoc(doc(db, 'todos', id), {
        ...updates,
        updatedAt: new Date()
      });
      
      // 로컬 상태 업데이트
      setTodos(prev => prev.map(todo => 
        todo.id === id ? { ...todo, ...updates, updatedAt: new Date() } : todo
      ));
    } catch (error) {
      console.error('투두 수정 오류:', error);
      throw error;
    }
  };

  // 투두 삭제
  const deleteTodo = async (id) => {
    if (!currentUser?.uid) return;

    try {
      await deleteDoc(doc(db, 'todos', id));
      
      // 로컬 상태 업데이트
      setTodos(prev => prev.filter(todo => todo.id !== id));
    } catch (error) {
      console.error('투두 삭제 오류:', error);
      throw error;
    }
  };

  // 투두 토글 (완료/미완료)
  const toggleTodo = async (id, completed) => {
    return updateTodo(id, { completed: !completed });
  };

  // 오늘 투두만 필터링 (date 포맷 불일치 방지)
  const getTodayTodos = useCallback(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return todos.filter(todo => {
      try {
        return format(new Date(todo.date), 'yyyy-MM-dd') === today;
      } catch {
        return false;
      }
    });
  }, [todos]);

  // 특정 날짜 투두 필터링
  const getTodosByDate = useCallback((date) => {
    return todos.filter(todo => todo.date === date);
  }, [todos]);

  // 데이터 새로고침
  const refreshTodos = useCallback(async () => {
    if (!currentUser?.uid) return;
    
    try {
      setLoading(true);
      const q = query(
        collection(db, 'todos'),
        where('userId', '==', currentUser.uid)
      );
      
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const sortedData = data.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return dateB - dateA;
      });
      
      setTodos(sortedData);
      setError(null);
    } catch (error) {
      console.error('투두 데이터 새로고침 오류:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.uid]);

  const value = {
    todos,
    todayTodos: getTodayTodos(),
    loading,
    error,
    addTodo,
    updateTodo,
    deleteTodo,
    toggleTodo,
    getTodosByDate,
    refreshTodos
  };

  return (
    <TodoContext.Provider value={value}>
      {children}
    </TodoContext.Provider>
  );
}; 