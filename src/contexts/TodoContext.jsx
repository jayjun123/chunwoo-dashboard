import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { collection, query, where, addDoc, updateDoc, deleteDoc, doc, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { format, subDays } from 'date-fns';
import { useAuth } from './AuthContext';
import googleTasksService from '../services/googleTasksService';

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
  const [isGoogleTasksEnabled, setIsGoogleTasksEnabled] = useState(false);
  const [googleTasksInitialized, setGoogleTasksInitialized] = useState(false);

  // 마스터 사용자 확인
  const isMasterUser = useCallback(() => {
    return currentUser?.email === 'master@chunwoo.com'; // 실제 마스터 이메일로 변경
  }, [currentUser?.email]);

  // Google Tasks 초기화
  const initializeGoogleTasks = useCallback(async () => {
    if (!isMasterUser()) {
      setIsGoogleTasksEnabled(false);
      return;
    }

    try {
      await googleTasksService.initialize(currentUser.email);
      await googleTasksService.signIn();
      setIsGoogleTasksEnabled(true);
      setGoogleTasksInitialized(true);
      console.log('Google Tasks 초기화 완료');
    } catch (error) {
      console.error('Google Tasks 초기화 실패:', error);
      setIsGoogleTasksEnabled(false);
    }
  }, [currentUser?.email, isMasterUser]);

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
      
      // 마스터 사용자이고 Google Tasks가 활성화된 경우
      if (isMasterUser() && isGoogleTasksEnabled) {
        try {
          const googleTasks = await googleTasksService.syncGoogleToLocal();
          const localTodos = googleTasks.map(task => ({
            id: task.id,
            text: task.text,
            completed: task.completed,
            userId: currentUser.uid,
            date: today,
            createdAt: new Date(),
            updatedAt: new Date(),
            source: 'google',
            googleTaskId: task.googleTaskId
          }));
          
          setTodos(localTodos);
          return;
        } catch (error) {
          console.error('Google Tasks 동기화 실패, 로컬 투두 사용:', error);
        }
      }
      
      // 일반 사용자 또는 Google Tasks 실패 시 로컬 투두 사용
      const todayQuery = query(
        collection(db, 'todos'),
        where('userId', '==', currentUser.uid),
        where('date', '==', today)
      );
      
      const todaySnapshot = await getDocs(todayQuery);
      
      // 오늘 투두리스트 가져오기 (자동 carry over 제거)
      const todayTodos = todaySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setTodos(todayTodos);
    } catch (error) {
      console.error('투두리스트 초기화 오류:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.uid, initialized, isMasterUser, isGoogleTasksEnabled]);

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
        
        // 마스터 사용자이고 Google Tasks가 활성화된 경우
        if (isMasterUser() && isGoogleTasksEnabled) {
          try {
            const googleTasks = await googleTasksService.syncGoogleToLocal();
            const localTodos = googleTasks.map(task => ({
              id: task.id,
              text: task.text,
              completed: task.completed,
              userId: currentUser.uid,
              date: format(new Date(), 'yyyy-MM-dd'),
              createdAt: new Date(),
              updatedAt: new Date(),
              source: 'google',
              googleTaskId: task.googleTaskId
            }));
            
            setTodos(localTodos);
            setError(null);
            return;
          } catch (error) {
            console.error('Google Tasks 동기화 실패, 로컬 투두 사용:', error);
          }
        }
        
        // 일반 사용자 또는 Google Tasks 실패 시 로컬 투두 사용
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
  }, [currentUser?.uid, isMasterUser, isGoogleTasksEnabled]);

  // Google Tasks 초기화
  useEffect(() => {
    if (isMasterUser() && !googleTasksInitialized) {
      initializeGoogleTasks();
    }
  }, [isMasterUser, googleTasksInitialized, initializeGoogleTasks]);

  // 초기 데이터 로드 (한 번만 실행)
  useEffect(() => {
    if (!initialized && currentUser?.uid) {
      const loadInitialData = async () => {
        try {
          setLoading(true);
          
          // 마스터 사용자이고 Google Tasks가 활성화된 경우
          if (isMasterUser() && isGoogleTasksEnabled) {
            try {
              const googleTasks = await googleTasksService.syncGoogleToLocal();
              const localTodos = googleTasks.map(task => ({
                id: task.id,
                text: task.text,
                completed: task.completed,
                userId: currentUser.uid,
                date: format(new Date(), 'yyyy-MM-dd'),
                createdAt: new Date(),
                updatedAt: new Date(),
                source: 'google',
                googleTaskId: task.googleTaskId
              }));
              
              setTodos(localTodos);
              setError(null);
              return;
            } catch (error) {
              console.error('Google Tasks 동기화 실패, 로컬 투두 사용:', error);
            }
          }
          
          // 일반 사용자 또는 Google Tasks 실패 시 로컬 투두 사용
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
      
      loadInitialData();
      setInitialized(true);
    }
  }, [initialized, currentUser?.uid, isMasterUser, isGoogleTasksEnabled]);

  // 투두 추가
  const addTodo = async (text, date = null) => {
    if (!currentUser?.uid || !text.trim()) return;

    try {
      const todoDate = date || format(new Date(), 'yyyy-MM-dd');
      
      // 마스터 사용자이고 Google Tasks가 활성화된 경우
      if (isMasterUser() && isGoogleTasksEnabled) {
        try {
          const googleTask = await googleTasksService.addTask(text.trim());
          const newTodo = {
            id: googleTask.id,
            text: text.trim(),
            completed: false,
            userId: currentUser.uid,
            date: todoDate,
            createdAt: new Date(),
            updatedAt: new Date(),
            source: 'google',
            googleTaskId: googleTask.id
          };
          
          setTodos(prev => [newTodo, ...prev]);
          return newTodo;
        } catch (error) {
          console.error('Google Tasks 추가 실패, 로컬 투두 사용:', error);
        }
      }
      
      // 일반 사용자 또는 Google Tasks 실패 시 로컬 투두 사용
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
      // 마스터 사용자이고 Google Tasks가 활성화된 경우
      if (isMasterUser() && isGoogleTasksEnabled) {
        try {
          const todo = todos.find(t => t.id === id);
          if (todo?.googleTaskId) {
            await googleTasksService.updateTask(todo.googleTaskId, {
              title: updates.text || todo.text,
              completed: updates.completed !== undefined ? (updates.completed ? new Date().toISOString() : null) : undefined
            });
          }
        } catch (error) {
          console.error('Google Tasks 업데이트 실패:', error);
        }
      }
      
      // 로컬 상태 업데이트
      setTodos(prev => prev.map(todo => 
        todo.id === id ? { ...todo, ...updates, updatedAt: new Date() } : todo
      ));
      
      // 일반 사용자 또는 Google Tasks 실패 시 로컬 투두 업데이트
      if (!isMasterUser() || !isGoogleTasksEnabled) {
        await updateDoc(doc(db, 'todos', id), {
          ...updates,
          updatedAt: new Date()
        });
      }
    } catch (error) {
      console.error('투두 수정 오류:', error);
      throw error;
    }
  };

  // 투두 삭제
  const deleteTodo = async (id) => {
    if (!currentUser?.uid) return;

    try {
      // 마스터 사용자이고 Google Tasks가 활성화된 경우
      if (isMasterUser() && isGoogleTasksEnabled) {
        try {
          const todo = todos.find(t => t.id === id);
          if (todo?.googleTaskId) {
            await googleTasksService.deleteTask(todo.googleTaskId);
          }
        } catch (error) {
          console.error('Google Tasks 삭제 실패:', error);
        }
      }
      
      // 로컬 상태 업데이트
      setTodos(prev => prev.filter(todo => todo.id !== id));
      
      // 일반 사용자 또는 Google Tasks 실패 시 로컬 투두 삭제
      if (!isMasterUser() || !isGoogleTasksEnabled) {
        await deleteDoc(doc(db, 'todos', id));
      }
    } catch (error) {
      console.error('투두 삭제 오류:', error);
      throw error;
    }
  };

  // 투두 토글 (완료/미완료)
  const toggleTodo = async (id, completed) => {
    if (!currentUser?.uid) return;

    try {
      // 마스터 사용자이고 Google Tasks가 활성화된 경우
      if (isMasterUser() && isGoogleTasksEnabled) {
        try {
          const todo = todos.find(t => t.id === id);
          if (todo?.googleTaskId) {
            if (!completed) {
              await googleTasksService.completeTask(todo.googleTaskId);
            } else {
              await googleTasksService.uncompleteTask(todo.googleTaskId);
            }
          }
        } catch (error) {
          console.error('Google Tasks 토글 실패:', error);
        }
      }
      
      // 로컬 상태 업데이트
      setTodos(prev => prev.map(todo => 
        todo.id === id ? { ...todo, completed: !completed, updatedAt: new Date() } : todo
      ));
      
      // 일반 사용자 또는 Google Tasks 실패 시 로컬 투두 업데이트
      if (!isMasterUser() || !isGoogleTasksEnabled) {
        await updateDoc(doc(db, 'todos', id), {
          completed: !completed,
          updatedAt: new Date()
        });
      }
    } catch (error) {
      console.error('투두 토글 오류:', error);
      throw error;
    }
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

  // 전날 미완료 할일 불러오기
  const loadIncompleteFromPreviousDay = useCallback(async () => {
    if (!currentUser?.uid) return;

    try {
      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // 전날 미완료 할일 조회
      const yesterdayQuery = query(
        collection(db, 'todos'),
        where('userId', '==', currentUser.uid),
        where('date', '==', yesterday),
        where('completed', '==', false)
      );
      
      const yesterdaySnapshot = await getDocs(yesterdayQuery);
      
      if (yesterdaySnapshot.empty) {
        return { success: true, count: 0, message: '전날 미완료 할일이 없습니다.' };
      }
      
      let addedCount = 0;
      const newTodos = [];
      
      // 전날 미완료 항목들을 오늘로 복사
      for (const doc of yesterdaySnapshot.docs) {
        const todoData = doc.data();
        
        // 오늘 이미 같은 내용의 할일이 있는지 확인
        const existingTodo = todos.find(todo => 
          todo.text === todoData.text && 
          format(new Date(todo.date), 'yyyy-MM-dd') === today
        );
        
        if (!existingTodo) {
          const newTodoRef = await addDoc(collection(db, 'todos'), {
            text: todoData.text,
            completed: false,
            userId: currentUser.uid,
            date: today,
            createdAt: new Date(),
            updatedAt: new Date(),
            carriedOver: true,
            originalDate: yesterday
          });
          
          const newTodo = {
            id: newTodoRef.id,
            text: todoData.text,
            completed: false,
            userId: currentUser.uid,
            date: today,
            createdAt: new Date(),
            updatedAt: new Date(),
            carriedOver: true,
            originalDate: yesterday
          };
          
          newTodos.push(newTodo);
          addedCount++;
        }
      }
      
      // 로컬 상태 업데이트
      if (newTodos.length > 0) {
        setTodos(prev => [...newTodos, ...prev]);
      }
      
      return { 
        success: true, 
        count: addedCount, 
        message: `전날 미완료 할일 ${addedCount}개를 불러왔습니다.` 
      };
      
    } catch (error) {
      console.error('전날 미완료 할일 불러오기 오류:', error);
      return { 
        success: false, 
        count: 0, 
        message: '전날 미완료 할일을 불러오는 중 오류가 발생했습니다.' 
      };
    }
  }, [currentUser?.uid, todos]);

  // Google Tasks 동기화
  const syncWithGoogleTasks = async () => {
    if (!isMasterUser() || !isGoogleTasksEnabled) {
      throw new Error('마스터 사용자만 Google Tasks 동기화를 사용할 수 있습니다.');
    }

    try {
      const syncedTasks = await googleTasksService.syncLocalToGoogle(todos);
      console.log('Google Tasks 동기화 완료:', syncedTasks);
      return syncedTasks;
    } catch (error) {
      console.error('Google Tasks 동기화 실패:', error);
      throw error;
    }
  };

  const value = {
    todos,
    loading,
    error,
    addTodo,
    updateTodo,
    deleteTodo,
    toggleTodo,
    getTodayTodos,
    loadIncompleteFromPreviousDay,
    isGoogleTasksEnabled,
    isMasterUser: isMasterUser(),
    syncWithGoogleTasks
  };

  return (
    <TodoContext.Provider value={value}>
      {children}
    </TodoContext.Provider>
  );
}; 