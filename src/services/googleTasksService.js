/**
 * Google Tasks API 서비스
 * 마스터 아이디만 Google Tasks와 연동
 */

// 마스터 아이디 설정 (환경변수에서 가져오기)
const MASTER_EMAIL = process.env.REACT_APP_MASTER_EMAIL || 'master@chunwoo.com';

// Google Tasks API 클라이언트 ID (환경변수에서 가져오기)
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || 'your-google-client-id.apps.googleusercontent.com';

class GoogleTasksService {
  constructor() {
    this.isInitialized = false;
    this.gapi = null;
    this.isMasterUser = false;
  }

  // 마스터 사용자 확인
  isMasterUser(userEmail) {
    return userEmail === MASTER_EMAIL;
  }

  // Google API 초기화
  async initialize(userEmail) {
    if (this.isInitialized) return;

    this.isMasterUser = this.isMasterUser(userEmail);
    
    if (!this.isMasterUser) {
      console.log('마스터 사용자가 아닙니다. 개인 투두를 사용합니다.');
      return;
    }

    try {
      // Google API 로드
      await this.loadGoogleAPI();
      
      // Google API 초기화
      await new Promise((resolve, reject) => {
        gapi.load('client:auth2', async () => {
          try {
            await gapi.client.init({
              clientId: GOOGLE_CLIENT_ID,
              scope: 'https://www.googleapis.com/auth/tasks'
            });
            
            this.gapi = gapi;
            this.isInitialized = true;
            console.log('Google Tasks API 초기화 완료');
            resolve();
          } catch (error) {
            console.error('Google API 초기화 실패:', error);
            reject(error);
          }
        });
      });
    } catch (error) {
      console.error('Google Tasks 서비스 초기화 실패:', error);
      throw error;
    }
  }

  // Google API 스크립트 로드
  loadGoogleAPI() {
    return new Promise((resolve, reject) => {
      if (window.gapi) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Google 로그인
  async signIn() {
    if (!this.isMasterUser || !this.gapi) {
      throw new Error('마스터 사용자만 Google Tasks를 사용할 수 있습니다.');
    }

    try {
      const authInstance = this.gapi.auth2.getAuthInstance();
      if (!authInstance.isSignedIn.get()) {
        await authInstance.signIn();
      }
      return authInstance.currentUser.get();
    } catch (error) {
      console.error('Google 로그인 실패:', error);
      throw error;
    }
  }

  // Google 로그아웃
  async signOut() {
    if (!this.isMasterUser || !this.gapi) return;

    try {
      const authInstance = this.gapi.auth2.getAuthInstance();
      await authInstance.signOut();
    } catch (error) {
      console.error('Google 로그아웃 실패:', error);
    }
  }

  // 작업 목록 가져오기
  async getTaskLists() {
    if (!this.isMasterUser || !this.gapi) {
      throw new Error('마스터 사용자만 Google Tasks를 사용할 수 있습니다.');
    }

    try {
      const response = await this.gapi.client.tasks.tasklists.list();
      return response.result.items || [];
    } catch (error) {
      console.error('작업 목록 가져오기 실패:', error);
      throw error;
    }
  }

  // 작업 가져오기
  async getTasks(taskListId = '@default') {
    if (!this.isMasterUser || !this.gapi) {
      throw new Error('마스터 사용자만 Google Tasks를 사용할 수 있습니다.');
    }

    try {
      const response = await this.gapi.client.tasks.tasks.list({
        tasklist: taskListId,
        showCompleted: false,
        maxResults: 100
      });
      
      return response.result.items || [];
    } catch (error) {
      console.error('작업 가져오기 실패:', error);
      throw error;
    }
  }

  // 작업 추가
  async addTask(title, taskListId = '@default') {
    if (!this.isMasterUser || !this.gapi) {
      throw new Error('마스터 사용자만 Google Tasks를 사용할 수 있습니다.');
    }

    try {
      const response = await this.gapi.client.tasks.tasks.insert({
        tasklist: taskListId,
        resource: {
          title: title,
          notes: '천우시스템에서 추가됨'
        }
      });
      
      return response.result;
    } catch (error) {
      console.error('작업 추가 실패:', error);
      throw error;
    }
  }

  // 작업 업데이트
  async updateTask(taskId, updates, taskListId = '@default') {
    if (!this.isMasterUser || !this.gapi) {
      throw new Error('마스터 사용자만 Google Tasks를 사용할 수 있습니다.');
    }

    try {
      const response = await this.gapi.client.tasks.tasks.patch({
        tasklist: taskListId,
        task: taskId,
        resource: updates
      });
      
      return response.result;
    } catch (error) {
      console.error('작업 업데이트 실패:', error);
      throw error;
    }
  }

  // 작업 삭제
  async deleteTask(taskId, taskListId = '@default') {
    if (!this.isMasterUser || !this.gapi) {
      throw new Error('마스터 사용자만 Google Tasks를 사용할 수 있습니다.');
    }

    try {
      await this.gapi.client.tasks.tasks.delete({
        tasklist: taskListId,
        task: taskId
      });
    } catch (error) {
      console.error('작업 삭제 실패:', error);
      throw error;
    }
  }

  // 작업 완료 처리
  async completeTask(taskId, taskListId = '@default') {
    if (!this.isMasterUser || !this.gapi) {
      throw new Error('마스터 사용자만 Google Tasks를 사용할 수 있습니다.');
    }

    try {
      const response = await this.gapi.client.tasks.tasks.patch({
        tasklist: taskListId,
        task: taskId,
        resource: {
          completed: new Date().toISOString()
        }
      });
      
      return response.result;
    } catch (error) {
      console.error('작업 완료 처리 실패:', error);
      throw error;
    }
  }

  // 작업 미완료 처리
  async uncompleteTask(taskId, taskListId = '@default') {
    if (!this.isMasterUser || !this.gapi) {
      throw new Error('마스터 사용자만 Google Tasks를 사용할 수 있습니다.');
    }

    try {
      const response = await this.gapi.client.tasks.tasks.patch({
        tasklist: taskListId,
        task: taskId,
        resource: {
          completed: null
        }
      });
      
      return response.result;
    } catch (error) {
      console.error('작업 미완료 처리 실패:', error);
      throw error;
    }
  }

  // 로컬 투두를 Google Tasks로 동기화
  async syncLocalToGoogle(localTodos) {
    if (!this.isMasterUser || !this.gapi) {
      throw new Error('마스터 사용자만 Google Tasks를 사용할 수 있습니다.');
    }

    try {
      const googleTasks = await this.getTasks();
      const syncedTasks = [];

      for (const localTodo of localTodos) {
        // 이미 동기화된 작업인지 확인
        const existingTask = googleTasks.find(task => 
          task.notes && task.notes.includes(`localId:${localTodo.id}`)
        );

        if (!existingTask) {
          // 새로운 작업 추가
          const newTask = await this.addTask(localTodo.text);
          await this.updateTask(newTask.id, {
            notes: `localId:${localTodo.id}\n천우시스템에서 추가됨`
          });
          syncedTasks.push({ ...newTask, localId: localTodo.id });
        }
      }

      return syncedTasks;
    } catch (error) {
      console.error('로컬 투두 동기화 실패:', error);
      throw error;
    }
  }

  // Google Tasks를 로컬 투두로 동기화
  async syncGoogleToLocal() {
    if (!this.isMasterUser || !this.gapi) {
      throw new Error('마스터 사용자만 Google Tasks를 사용할 수 있습니다.');
    }

    try {
      const googleTasks = await this.getTasks();
      const localTodos = [];

      for (const googleTask of googleTasks) {
        if (!googleTask.completed) {
          localTodos.push({
            id: googleTask.id,
            text: googleTask.title,
            completed: false,
            source: 'google',
            googleTaskId: googleTask.id
          });
        }
      }

      return localTodos;
    } catch (error) {
      console.error('Google Tasks 동기화 실패:', error);
      throw error;
    }
  }
}

// 싱글톤 인스턴스 생성
const googleTasksService = new GoogleTasksService();

export default googleTasksService; 