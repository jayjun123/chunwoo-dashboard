// Google Tasks API를 직접 호출하는 서비스
class GoogleTasksService {
  constructor() {
    this.accessToken = null;
    this.isInitialized = false;
  }

  // Google OAuth 인증 초기화
  async initializeAuth(token) {
    try {
      this.accessToken = token;
      this.isInitialized = true;
      console.log('Google Tasks 인증 초기화 완료');
      return true;
    } catch (error) {
      console.error('Google Tasks 인증 초기화 실패:', error);
      throw error;
    }
  }

  // Google API 호출 헬퍼 함수
  async makeGoogleApiCall(endpoint, method = 'GET', body = null) {
    if (!this.isInitialized || !this.accessToken) {
      throw new Error('Google Tasks가 초기화되지 않았습니다.');
    }

    const baseUrl = 'https://www.googleapis.com/tasks/v1';
    const url = `${baseUrl}${endpoint}`;
    
    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };

    const options = {
      method,
      headers,
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Google API 오류: ${errorData.error?.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Google API 호출 실패:', error);
      throw error;
    }
  }

  // Task 목록 가져오기
  async getTaskLists() {
    try {
      const response = await this.makeGoogleApiCall('/users/@me/lists');
      return response.items || [];
    } catch (error) {
      console.error('Task 목록 가져오기 실패:', error);
      throw error;
    }
  }

  // 특정 Task 목록의 할 일 가져오기
  async getTasks(taskListId) {
    try {
      const response = await this.makeGoogleApiCall(`/lists/${taskListId}/tasks`);
      return response.items || [];
    } catch (error) {
      console.error('할 일 가져오기 실패:', error);
      throw error;
    }
  }

  // 새 할 일 생성
  async createTask(taskListId, taskData) {
    try {
      const response = await this.makeGoogleApiCall(
        `/lists/${taskListId}/tasks`,
        'POST',
        taskData
      );
      return response;
    } catch (error) {
      console.error('할 일 생성 실패:', error);
      throw error;
    }
  }

  // 할 일 업데이트
  async updateTask(taskListId, taskId, taskData) {
    try {
      const response = await this.makeGoogleApiCall(
        `/lists/${taskListId}/tasks/${taskId}`,
        'PATCH',
        taskData
      );
      return response;
    } catch (error) {
      console.error('할 일 업데이트 실패:', error);
      throw error;
    }
  }

  // 할 일 삭제
  async deleteTask(taskListId, taskId) {
    try {
      await this.makeGoogleApiCall(
        `/lists/${taskListId}/tasks/${taskId}`,
        'DELETE'
      );
      return true;
    } catch (error) {
      console.error('할 일 삭제 실패:', error);
      throw error;
    }
  }

  // Firebase 투두를 Google Tasks 형식으로 변환
  convertFirebaseToGoogleTask(firebaseTodo) {
    return {
      title: firebaseTodo.text,
      notes: firebaseTodo.notes || '',
      completed: firebaseTodo.completed ? new Date().toISOString() : null,
      due: firebaseTodo.date ? new Date(firebaseTodo.date).toISOString() : null,
      status: firebaseTodo.completed ? 'completed' : 'needsAction'
    };
  }

  // Google Task를 Firebase 형식으로 변환
  convertGoogleToFirebaseTask(googleTask, userId) {
    return {
      text: googleTask.title,
      completed: googleTask.status === 'completed',
      userId: userId,
      date: googleTask.due ? new Date(googleTask.due).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      createdAt: new Date(),
      googleTaskId: googleTask.id,
      notes: googleTask.notes || ''
    };
  }

  // Firebase에서 Google Tasks로 동기화
  async syncFirebaseToGoogle(firebaseTodos, taskListId) {
    try {
      const results = [];
      
      for (const todo of firebaseTodos) {
        // 이미 Google Task ID가 있으면 업데이트, 없으면 생성
        if (todo.googleTaskId) {
          try {
            await this.updateTask(taskListId, todo.googleTaskId, this.convertFirebaseToGoogleTask(todo));
            results.push({ id: todo.id, action: 'updated', googleTaskId: todo.googleTaskId });
          } catch (error) {
            console.error(`Google Task 업데이트 실패 (${todo.id}):`, error);
            // 업데이트 실패 시 새로 생성
            const newTask = await this.createTask(taskListId, this.convertFirebaseToGoogleTask(todo));
            results.push({ id: todo.id, action: 'created', googleTaskId: newTask.id });
          }
        } else {
          const newTask = await this.createTask(taskListId, this.convertFirebaseToGoogleTask(todo));
          results.push({ id: todo.id, action: 'created', googleTaskId: newTask.id });
        }
      }
      
      return results;
    } catch (error) {
      console.error('Firebase to Google 동기화 실패:', error);
      throw error;
    }
  }

  // Google Tasks에서 Firebase로 동기화
  async syncGoogleToFirebase(taskListId, userId, addDoc, todosCollection, updateDoc, doc, query, where) {
    try {
      const googleTasks = await this.getTasks(taskListId);
      const results = [];
      
      for (const googleTask of googleTasks) {
        // Firebase에 이미 존재하는지 확인
        const existingTodo = await this.findTodoByGoogleTaskId(googleTask.id, todosCollection, query, where);
        
        if (existingTodo) {
          // 기존 투두 업데이트
          await updateDoc(doc(todosCollection, existingTodo.id), {
            text: googleTask.title,
            completed: googleTask.status === 'completed',
            notes: googleTask.notes || '',
            updatedAt: new Date()
          });
          results.push({ googleTaskId: googleTask.id, action: 'updated', firebaseId: existingTodo.id });
        } else {
          // 새 투두 생성
          const newTodo = this.convertGoogleToFirebaseTask(googleTask, userId);
          const docRef = await addDoc(todosCollection, newTodo);
          results.push({ googleTaskId: googleTask.id, action: 'created', firebaseId: docRef.id });
        }
      }
      
      return results;
    } catch (error) {
      console.error('Google to Firebase 동기화 실패:', error);
      throw error;
    }
  }

  // Google Task ID로 Firebase 투두 찾기
  async findTodoByGoogleTaskId(googleTaskId, todosCollection, query, where) {
    try {
      const todoQuery = query(
        todosCollection,
        where('googleTaskId', '==', googleTaskId)
      );
      
      const { getDocs } = await import('firebase/firestore');
      const snapshot = await getDocs(todoQuery);
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
      }
      
      return null;
    } catch (error) {
      console.error('Google Task ID로 투두 찾기 실패:', error);
      return null;
    }
  }

  // 양방향 동기화
  async syncBidirectional(firebaseTodos, taskListId, userId, addDoc, todosCollection, updateDoc, doc, query, where) {
    try {
      // Firebase에서 Google로 동기화
      const firebaseToGoogle = await this.syncFirebaseToGoogle(firebaseTodos, taskListId);
      
      // Google에서 Firebase로 동기화
      const googleToFirebase = await this.syncGoogleToFirebase(taskListId, userId, addDoc, todosCollection, updateDoc, doc, query, where);
      
      return {
        firebaseToGoogle,
        googleToFirebase
      };
    } catch (error) {
      console.error('양방향 동기화 실패:', error);
      throw error;
    }
  }

  // 인증 상태 확인
  isAuthenticated() {
    return this.isInitialized && this.accessToken !== null;
  }

  // 인증 해제
  logout() {
    this.accessToken = null;
    this.isInitialized = false;
  }

  // 토큰 유효성 검사
  async validateToken() {
    if (!this.accessToken) {
      return false;
    }

    try {
      // 간단한 API 호출로 토큰 유효성 검사
      await this.makeGoogleApiCall('/users/@me/lists');
      return true;
    } catch (error) {
      console.error('토큰 유효성 검사 실패:', error);
      this.logout();
      return false;
    }
  }
}

// 싱글톤 인스턴스 생성
const googleTasksService = new GoogleTasksService();

export default googleTasksService; 