import { db } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, orderBy, limit, getDoc } from 'firebase/firestore';

// 데이터베이스 연결 상태 모니터링
class DatabaseConnectionManager {
  constructor() {
    this.connectionStatus = 'disconnected';
    this.lastConnected = null;
    this.errorCount = 0;
    this.listeners = [];
  }

  // 연결 상태 업데이트
  updateStatus(status, error = null) {
    this.connectionStatus = status;
    if (status === 'connected') {
      this.lastConnected = new Date();
      this.errorCount = 0;
    } else if (status === 'error') {
      this.errorCount++;
    }
    
    this.notifyListeners(status, error);
  }

  // 리스너 추가
  addListener(callback) {
    this.listeners.push(callback);
  }

  // 리스너 제거
  removeListener(callback) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  // 리스너들에게 알림
  notifyListeners(status, error) {
    this.listeners.forEach(listener => {
      try {
        listener(status, error);
      } catch (err) {
        console.error('Database listener error:', err);
      }
    });
  }

  // 연결 상태 확인
  isConnected() {
    return this.connectionStatus === 'connected';
  }

  // 에러 횟수 확인
  getErrorCount() {
    return this.errorCount;
  }
}

// 전역 데이터베이스 연결 관리자
export const dbConnectionManager = new DatabaseConnectionManager();

// 에러 처리 래퍼 함수
const withErrorHandling = async (operation, operationName) => {
  try {
    dbConnectionManager.updateStatus('connecting');
    const result = await operation();
    dbConnectionManager.updateStatus('connected');
    return result;
  } catch (error) {
    console.error(`Database operation failed: ${operationName}`, error);
    dbConnectionManager.updateStatus('error', error);
    throw new Error(`데이터베이스 작업 실패: ${operationName} - ${error.message}`);
  }
};

// 문서 관련 API
export const documentsAPI = {
  async getAll() {
    return await withErrorHandling(async () => {
      const snapshot = await getDocs(collection(db, 'documents'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, 'documents.getAll');
  },
  async getById(id) {
    return await withErrorHandling(async () => {
      const docRef = doc(db, 'documents', id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
      return { id: docSnap.id, ...docSnap.data() };
    }, 'documents.getById');
  },
  async add(data) {
    return await withErrorHandling(async () => {
      return await addDoc(collection(db, 'documents'), {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }, 'documents.add');
  },
  async update(id, data) {
    return await withErrorHandling(async () => {
      return await updateDoc(doc(db, 'documents', id), {
        ...data,
        updatedAt: new Date()
      });
    }, 'documents.update');
  },
  async remove(id) {
    return await withErrorHandling(async () => {
      return await deleteDoc(doc(db, 'documents', id));
    }, 'documents.remove');
  },
  subscribeToDocuments(callback) {
    try {
      const q = query(collection(db, 'documents'), orderBy('createdAt', 'desc'));
      return onSnapshot(q, (snapshot) => {
        const documents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(documents);
      }, (error) => {
        console.error('Documents subscription error:', error);
        dbConnectionManager.updateStatus('error', error);
      });
    } catch (error) {
      console.error('Documents subscription setup error:', error);
      dbConnectionManager.updateStatus('error', error);
      throw error;
    }
  }
};

// 권한 관련 API
export const permissionsAPI = {
  async getAll() {
    return await withErrorHandling(async () => {
      const snapshot = await getDocs(collection(db, 'permissions'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, 'permissions.getAll');
  },
  async getById(id) {
    return await withErrorHandling(async () => {
      const docRef = doc(db, 'permissions', id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
      return { id: docSnap.id, ...docSnap.data() };
    }, 'permissions.getById');
  },
  async add(data) {
    return await withErrorHandling(async () => {
      return await addDoc(collection(db, 'permissions'), {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }, 'permissions.add');
  },
  async update(id, data) {
    return await withErrorHandling(async () => {
      return await updateDoc(doc(db, 'permissions', id), {
        ...data,
        updatedAt: new Date()
      });
    }, 'permissions.update');
  },
  async remove(id) {
    return await withErrorHandling(async () => {
      return await deleteDoc(doc(db, 'permissions', id));
    }, 'permissions.remove');
  },
  async getUserPermissions(userId) {
    return await withErrorHandling(async () => {
      const snapshot = await getDocs(query(collection(db, 'permissions'), where('userId', '==', userId)));
      return snapshot.docs[0]?.data();
    }, 'permissions.getUserPermissions');
  },
  subscribeToPermissions(callback) {
    try {
      const q = query(collection(db, 'permissions'), orderBy('createdAt', 'desc'));
      return onSnapshot(q, (snapshot) => {
        const permissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(permissions);
      }, (error) => {
        console.error('Permissions subscription error:', error);
        dbConnectionManager.updateStatus('error', error);
      });
    } catch (error) {
      console.error('Permissions subscription setup error:', error);
      dbConnectionManager.updateStatus('error', error);
      throw error;
    }
  }
};

// 기성관리 관련 API
export const progressAPI = {
  async getAll() {
    return await withErrorHandling(async () => {
      const snapshot = await getDocs(collection(db, 'progress'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, 'progress.getAll');
  },
  async getById(id) {
    return await withErrorHandling(async () => {
      const docRef = doc(db, 'progress', id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
      return { id: docSnap.id, ...docSnap.data() };
    }, 'progress.getById');
  },
  async add(data) {
    return await withErrorHandling(async () => {
      return await addDoc(collection(db, 'progress'), {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }, 'progress.add');
  },
  async update(id, data) {
    return await withErrorHandling(async () => {
      return await updateDoc(doc(db, 'progress', id), {
        ...data,
        updatedAt: new Date()
      });
    }, 'progress.update');
  },
  async remove(id) {
    return await withErrorHandling(async () => {
      return await deleteDoc(doc(db, 'progress', id));
    }, 'progress.remove');
  },
  async getBySiteId(siteId) {
    return await withErrorHandling(async () => {
      const snapshot = await getDocs(query(collection(db, 'progress'), where('siteId', '==', siteId)));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, 'progress.getBySiteId');
  },
  subscribeToProgress(siteId, callback) {
    try {
      const q = query(
        collection(db, 'progress'),
        where('siteId', '==', siteId),
        orderBy('createdAt', 'desc')
      );
      return onSnapshot(q, (snapshot) => {
        const progressData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(progressData);
      }, (error) => {
        console.error('Progress subscription error:', error);
        dbConnectionManager.updateStatus('error', error);
      });
    } catch (error) {
      console.error('Progress subscription setup error:', error);
      dbConnectionManager.updateStatus('error', error);
      throw error;
    }
  }
};

// 현장 관련 API
export const sitesAPI = {
  async getAll() {
    return await withErrorHandling(async () => {
      const snapshot = await getDocs(collection(db, 'sites'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, 'sites.getAll');
  },
  async getById(id) {
    return await withErrorHandling(async () => {
      const docRef = doc(db, 'sites', id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
      return { id: docSnap.id, ...docSnap.data() };
    }, 'sites.getById');
  },
  async add(data) {
    return await withErrorHandling(async () => {
      return await addDoc(collection(db, 'sites'), {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }, 'sites.add');
  },
  async update(id, data) {
    return await withErrorHandling(async () => {
      return await updateDoc(doc(db, 'sites', id), {
        ...data,
        updatedAt: new Date()
      });
    }, 'sites.update');
  },
  async remove(id) {
    return await withErrorHandling(async () => {
      return await deleteDoc(doc(db, 'sites', id));
    }, 'sites.remove');
  },
  async getByStatus(status) {
    return await withErrorHandling(async () => {
      const snapshot = await getDocs(query(collection(db, 'sites'), where('status', '==', status)));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, 'sites.getByStatus');
  },
  async getByManager(manager) {
    return await withErrorHandling(async () => {
      const snapshot = await getDocs(query(collection(db, 'sites'), where('manager', '==', manager)));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, 'sites.getByManager');
  },
  subscribeToSites(callback) {
    try {
      const q = query(collection(db, 'sites'), orderBy('name'));
      return onSnapshot(q, (snapshot) => {
        const sitesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(sitesData);
      }, (error) => {
        console.error('Sites subscription error:', error);
        dbConnectionManager.updateStatus('error', error);
      });
    } catch (error) {
      console.error('Sites subscription setup error:', error);
      dbConnectionManager.updateStatus('error', error);
      throw error;
    }
  }
};

// 거래처 관련 API
export const vendorsAPI = {
  async getAll() {
    return await withErrorHandling(async () => {
      const snapshot = await getDocs(collection(db, 'vendors'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, 'vendors.getAll');
  },
  async getById(id) {
    return await withErrorHandling(async () => {
      const docRef = doc(db, 'vendors', id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
      return { id: docSnap.id, ...docSnap.data() };
    }, 'vendors.getById');
  },
  async add(data) {
    return await withErrorHandling(async () => {
      return await addDoc(collection(db, 'vendors'), {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }, 'vendors.add');
  },
  async update(id, data) {
    return await withErrorHandling(async () => {
      return await updateDoc(doc(db, 'vendors', id), {
        ...data,
        updatedAt: new Date()
      });
    }, 'vendors.update');
  },
  async remove(id) {
    return await withErrorHandling(async () => {
      return await deleteDoc(doc(db, 'vendors', id));
    }, 'vendors.remove');
  },
  async getByName(name) {
    return await withErrorHandling(async () => {
      const snapshot = await getDocs(query(collection(db, 'vendors'), where('name', '==', name)));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, 'vendors.getByName');
  },
  subscribeToVendors(callback) {
    try {
      const q = query(collection(db, 'vendors'), orderBy('name'));
      return onSnapshot(q, (snapshot) => {
        const vendorsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(vendorsData);
      }, (error) => {
        console.error('Vendors subscription error:', error);
        dbConnectionManager.updateStatus('error', error);
      });
    } catch (error) {
      console.error('Vendors subscription setup error:', error);
      dbConnectionManager.updateStatus('error', error);
      throw error;
    }
  }
};

// 기성 관련 API
export const gisungAPI = {
  async getAll() {
    return await withErrorHandling(async () => {
      const snapshot = await getDocs(collection(db, 'gisung'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, 'gisung.getAll');
  },
  async getById(id) {
    return await withErrorHandling(async () => {
      const docRef = doc(db, 'gisung', id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
      return { id: docSnap.id, ...docSnap.data() };
    }, 'gisung.getById');
  },
  async add(data) {
    return await withErrorHandling(async () => {
      return await addDoc(collection(db, 'gisung'), {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }, 'gisung.add');
  },
  async update(id, data) {
    return await withErrorHandling(async () => {
      return await updateDoc(doc(db, 'gisung', id), {
        ...data,
        updatedAt: new Date()
      });
    }, 'gisung.update');
  },
  async remove(id) {
    return await withErrorHandling(async () => {
      return await deleteDoc(doc(db, 'gisung', id));
    }, 'gisung.remove');
  },
  async getBySiteId(siteId) {
    return await withErrorHandling(async () => {
      const snapshot = await getDocs(query(collection(db, 'gisung'), where('siteId', '==', siteId)));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, 'gisung.getBySiteId');
  },
  async getByName(name) {
    return await withErrorHandling(async () => {
      const snapshot = await getDocs(query(collection(db, 'gisung'), where('name', '==', name)));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, 'gisung.getByName');
  },
  subscribeToGisung(siteId, callback) {
    try {
      const q = query(
        collection(db, 'gisung'),
        where('siteId', '==', siteId),
        orderBy('sequence', 'asc')
      );
      return onSnapshot(q, (snapshot) => {
        const gisungData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(gisungData);
      }, (error) => {
        console.error('Gisung subscription error:', error);
        dbConnectionManager.updateStatus('error', error);
      });
    } catch (error) {
      console.error('Gisung subscription setup error:', error);
      dbConnectionManager.updateStatus('error', error);
      throw error;
    }
  }
};

// 지출 관련 API
export const costsAPI = {
  async getAll() {
    return await withErrorHandling(async () => {
      const snapshot = await getDocs(collection(db, 'costs'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, 'costs.getAll');
  },
  async getById(id) {
    return await withErrorHandling(async () => {
      const docRef = doc(db, 'costs', id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
      return { id: docSnap.id, ...docSnap.data() };
    }, 'costs.getById');
  },
  async add(data) {
    return await withErrorHandling(async () => {
      return await addDoc(collection(db, 'costs'), {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }, 'costs.add');
  },
  async update(id, data) {
    return await withErrorHandling(async () => {
      return await updateDoc(doc(db, 'costs', id), {
        ...data,
        updatedAt: new Date()
      });
    }, 'costs.update');
  },
  async remove(id) {
    return await withErrorHandling(async () => {
      return await deleteDoc(doc(db, 'costs', id));
    }, 'costs.remove');
  },
  async getBySiteId(siteId) {
    return await withErrorHandling(async () => {
      const snapshot = await getDocs(query(collection(db, 'costs'), where('siteId', '==', siteId)));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, 'costs.getBySiteId');
  },
  subscribeToCosts(siteId, callback) {
    try {
      const q = query(
        collection(db, 'costs'),
        where('siteId', '==', siteId),
        orderBy('createdAt', 'desc')
      );
      return onSnapshot(q, (snapshot) => {
        const costsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(costsData);
      }, (error) => {
        console.error('Costs subscription error:', error);
        dbConnectionManager.updateStatus('error', error);
      });
    } catch (error) {
      console.error('Costs subscription setup error:', error);
      dbConnectionManager.updateStatus('error', error);
      throw error;
    }
  }
};

// 일정 관련 API
export const schedulesAPI = {
  async getAll() {
    return await withErrorHandling(async () => {
      const snapshot = await getDocs(collection(db, 'schedules'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, 'schedules.getAll');
  },
  async getById(id) {
    return await withErrorHandling(async () => {
      const docRef = doc(db, 'schedules', id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
      return { id: docSnap.id, ...docSnap.data() };
    }, 'schedules.getById');
  },
  async add(data) {
    return await withErrorHandling(async () => {
      return await addDoc(collection(db, 'schedules'), {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }, 'schedules.add');
  },
  async update(id, data) {
    return await withErrorHandling(async () => {
      return await updateDoc(doc(db, 'schedules', id), {
        ...data,
        updatedAt: new Date()
      });
    }, 'schedules.update');
  },
  async remove(id) {
    return await withErrorHandling(async () => {
      return await deleteDoc(doc(db, 'schedules', id));
    }, 'schedules.remove');
  },
  async getBySiteId(siteId) {
    return await withErrorHandling(async () => {
      const snapshot = await getDocs(query(collection(db, 'schedules'), where('siteId', '==', siteId)));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, 'schedules.getBySiteId');
  },
  subscribeToSchedules(siteId, callback) {
    try {
      const q = query(
        collection(db, 'schedules'),
        where('siteId', '==', siteId),
        orderBy('startDate', 'asc')
      );
      return onSnapshot(q, (snapshot) => {
        const schedulesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(schedulesData);
      }, (error) => {
        console.error('Schedules subscription error:', error);
        dbConnectionManager.updateStatus('error', error);
      });
    } catch (error) {
      console.error('Schedules subscription setup error:', error);
      dbConnectionManager.updateStatus('error', error);
      throw error;
    }
  }
};

// 안전 관련 API
export const safetyAPI = {
  async getAll() {
    return await withErrorHandling(async () => {
      const snapshot = await getDocs(collection(db, 'safety'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, 'safety.getAll');
  },
  async getById(id) {
    return await withErrorHandling(async () => {
      const docRef = doc(db, 'safety', id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
      return { id: docSnap.id, ...docSnap.data() };
    }, 'safety.getById');
  },
  async add(data) {
    return await withErrorHandling(async () => {
      return await addDoc(collection(db, 'safety'), {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }, 'safety.add');
  },
  async update(id, data) {
    return await withErrorHandling(async () => {
      return await updateDoc(doc(db, 'safety', id), {
        ...data,
        updatedAt: new Date()
      });
    }, 'safety.update');
  },
  async remove(id) {
    return await withErrorHandling(async () => {
      return await deleteDoc(doc(db, 'safety', id));
    }, 'safety.remove');
  },
  async getBySiteId(siteId) {
    return await withErrorHandling(async () => {
      const snapshot = await getDocs(query(collection(db, 'safety'), where('siteId', '==', siteId)));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, 'safety.getBySiteId');
  },
  subscribeToSafety(siteId, callback) {
    try {
      const q = query(
        collection(db, 'safety'),
        where('siteId', '==', siteId),
        orderBy('createdAt', 'desc')
      );
      return onSnapshot(q, (snapshot) => {
        const safetyData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(safetyData);
      }, (error) => {
        console.error('Safety subscription error:', error);
        dbConnectionManager.updateStatus('error', error);
      });
    } catch (error) {
      console.error('Safety subscription setup error:', error);
      dbConnectionManager.updateStatus('error', error);
      throw error;
    }
  }
};

// 회원 관련 API
export const membersAPI = {
  async getAll() {
    return await withErrorHandling(async () => {
      const snapshot = await getDocs(collection(db, 'members'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, 'members.getAll');
  },
  async getById(id) {
    return await withErrorHandling(async () => {
      const docRef = doc(db, 'members', id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
      return { id: docSnap.id, ...docSnap.data() };
    }, 'members.getById');
  },
  async add(data) {
    return await withErrorHandling(async () => {
      return await addDoc(collection(db, 'members'), {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }, 'members.add');
  },
  async update(id, data) {
    return await withErrorHandling(async () => {
      return await updateDoc(doc(db, 'members', id), {
        ...data,
        updatedAt: new Date()
      });
    }, 'members.update');
  },
  async remove(id) {
    return await withErrorHandling(async () => {
      return await deleteDoc(doc(db, 'members', id));
    }, 'members.remove');
  },
  async getByEmail(email) {
    return await withErrorHandling(async () => {
      const snapshot = await getDocs(query(collection(db, 'members'), where('email', '==', email)));
      return snapshot.docs[0] ? { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } : null;
    }, 'members.getByEmail');
  },
  subscribeToMembers(callback) {
    try {
      const q = query(collection(db, 'members'), orderBy('name'));
      return onSnapshot(q, (snapshot) => {
        const membersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(membersData);
      }, (error) => {
        console.error('Members subscription error:', error);
        dbConnectionManager.updateStatus('error', error);
      });
    } catch (error) {
      console.error('Members subscription setup error:', error);
      dbConnectionManager.updateStatus('error', error);
      throw error;
    }
  }
};

// 날씨 관련 API
export const weatherAPI = {
  async getAll() {
    return await withErrorHandling(async () => {
      const snapshot = await getDocs(collection(db, 'weather'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, 'weather.getAll');
  },
  async getById(id) {
    return await withErrorHandling(async () => {
      const docRef = doc(db, 'weather', id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
      return { id: docSnap.id, ...docSnap.data() };
    }, 'weather.getById');
  },
  async add(data) {
    return await withErrorHandling(async () => {
      return await addDoc(collection(db, 'weather'), {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }, 'weather.add');
  },
  async update(id, data) {
    return await withErrorHandling(async () => {
      return await updateDoc(doc(db, 'weather', id), {
        ...data,
        updatedAt: new Date()
      });
    }, 'weather.update');
  },
  async remove(id) {
    return await withErrorHandling(async () => {
      return await deleteDoc(doc(db, 'weather', id));
    }, 'weather.remove');
  },
  async getLatest() {
    return await withErrorHandling(async () => {
      const snapshot = await getDocs(query(collection(db, 'weather'), orderBy('createdAt', 'desc'), limit(1)));
      return snapshot.docs[0] ? { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } : null;
    }, 'weather.getLatest');
  }
};

// 할일 관련 API
export const todosAPI = {
  async getAll() {
    return await withErrorHandling(async () => {
      const snapshot = await getDocs(collection(db, 'todos'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, 'todos.getAll');
  },
  async getById(id) {
    return await withErrorHandling(async () => {
      const docRef = doc(db, 'todos', id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
      return { id: docSnap.id, ...docSnap.data() };
    }, 'todos.getById');
  },
  async add(data) {
    return await withErrorHandling(async () => {
      return await addDoc(collection(db, 'todos'), {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }, 'todos.add');
  },
  async update(id, data) {
    return await withErrorHandling(async () => {
      return await updateDoc(doc(db, 'todos', id), {
        ...data,
        updatedAt: new Date()
      });
    }, 'todos.update');
  },
  async remove(id) {
    return await withErrorHandling(async () => {
      return await deleteDoc(doc(db, 'todos', id));
    }, 'todos.remove');
  },
  async getByUserId(userId) {
    return await withErrorHandling(async () => {
      const snapshot = await getDocs(query(collection(db, 'todos'), where('userId', '==', userId)));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, 'todos.getByUserId');
  },
  subscribeToTodos(userId, callback) {
    try {
      const q = query(
        collection(db, 'todos'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      return onSnapshot(q, (snapshot) => {
        const todosData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(todosData);
      }, (error) => {
        console.error('Todos subscription error:', error);
        dbConnectionManager.updateStatus('error', error);
      });
    } catch (error) {
      console.error('Todos subscription setup error:', error);
      dbConnectionManager.updateStatus('error', error);
      throw error;
    }
  }
};

// 협의 관련 API
export const discussionsAPI = {
  async getAll() {
    return await withErrorHandling(async () => {
      const snapshot = await getDocs(collection(db, 'discussions'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, 'discussions.getAll');
  },
  async getById(id) {
    return await withErrorHandling(async () => {
      const docRef = doc(db, 'discussions', id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
      return { id: docSnap.id, ...docSnap.data() };
    }, 'discussions.getById');
  },
  async add(data) {
    return await withErrorHandling(async () => {
      return await addDoc(collection(db, 'discussions'), {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }, 'discussions.add');
  },
  async update(id, data) {
    return await withErrorHandling(async () => {
      return await updateDoc(doc(db, 'discussions', id), {
        ...data,
        updatedAt: new Date()
      });
    }, 'discussions.update');
  },
  async remove(id) {
    return await withErrorHandling(async () => {
      return await deleteDoc(doc(db, 'discussions', id));
    }, 'discussions.remove');
  },
  async getBySiteId(siteId) {
    return await withErrorHandling(async () => {
      const snapshot = await getDocs(query(collection(db, 'discussions'), where('siteId', '==', siteId)));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, 'discussions.getBySiteId');
  },
  subscribeToDiscussions(siteId, callback) {
    try {
      const q = query(
        collection(db, 'discussions'),
        where('siteId', '==', siteId),
        orderBy('createdAt', 'desc')
      );
      return onSnapshot(q, (snapshot) => {
        const discussionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(discussionsData);
      }, (error) => {
        console.error('Discussions subscription error:', error);
        dbConnectionManager.updateStatus('error', error);
      });
    } catch (error) {
      console.error('Discussions subscription setup error:', error);
      dbConnectionManager.updateStatus('error', error);
      throw error;
    }
  }
};

// 견적 관련 API
export const estimatesAPI = {
  async getAll() {
    return await withErrorHandling(async () => {
      const snapshot = await getDocs(collection(db, 'estimates'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, 'estimates.getAll');
  },
  async getById(id) {
    return await withErrorHandling(async () => {
      const docRef = doc(db, 'estimates', id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
      return { id: docSnap.id, ...docSnap.data() };
    }, 'estimates.getById');
  },
  async add(data) {
    return await withErrorHandling(async () => {
      return await addDoc(collection(db, 'estimates'), {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }, 'estimates.add');
  },
  async update(id, data) {
    return await withErrorHandling(async () => {
      return await updateDoc(doc(db, 'estimates', id), {
        ...data,
        updatedAt: new Date()
      });
    }, 'estimates.update');
  },
  async remove(id) {
    return await withErrorHandling(async () => {
      return await deleteDoc(doc(db, 'estimates', id));
    }, 'estimates.remove');
  },
  async getBySiteId(siteId) {
    return await withErrorHandling(async () => {
      const snapshot = await getDocs(query(collection(db, 'estimates'), where('siteId', '==', siteId)));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, 'estimates.getBySiteId');
  },
  subscribeToEstimates(siteId, callback) {
    try {
      const q = query(
        collection(db, 'estimates'),
        where('siteId', '==', siteId),
        orderBy('createdAt', 'desc')
      );
      return onSnapshot(q, (snapshot) => {
        const estimatesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(estimatesData);
      }, (error) => {
        console.error('Estimates subscription error:', error);
        dbConnectionManager.updateStatus('error', error);
      });
    } catch (error) {
      console.error('Estimates subscription setup error:', error);
      dbConnectionManager.updateStatus('error', error);
      throw error;
    }
  }
};

// 청구 관련 API
export const claimsAPI = {
  async getAll() {
    return await withErrorHandling(async () => {
      const snapshot = await getDocs(collection(db, 'claims'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, 'claims.getAll');
  },
  async getById(id) {
    return await withErrorHandling(async () => {
      const docRef = doc(db, 'claims', id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
      return { id: docSnap.id, ...docSnap.data() };
    }, 'claims.getById');
  },
  async add(data) {
    return await withErrorHandling(async () => {
      return await addDoc(collection(db, 'claims'), {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }, 'claims.add');
  },
  async update(id, data) {
    return await withErrorHandling(async () => {
      return await updateDoc(doc(db, 'claims', id), {
        ...data,
        updatedAt: new Date()
      });
    }, 'claims.update');
  },
  async remove(id) {
    return await withErrorHandling(async () => {
      return await deleteDoc(doc(db, 'claims', id));
    }, 'claims.remove');
  },
  async getBySiteId(siteId) {
    return await withErrorHandling(async () => {
      const snapshot = await getDocs(query(collection(db, 'claims'), where('siteId', '==', siteId)));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, 'claims.getBySiteId');
  },
  subscribeToClaims(siteId, callback) {
    try {
      const q = query(
        collection(db, 'claims'),
        where('siteId', '==', siteId),
        orderBy('createdAt', 'desc')
      );
      return onSnapshot(q, (snapshot) => {
        const claimsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(claimsData);
      }, (error) => {
        console.error('Claims subscription error:', error);
        dbConnectionManager.updateStatus('error', error);
      });
    } catch (error) {
      console.error('Claims subscription setup error:', error);
      dbConnectionManager.updateStatus('error', error);
      throw error;
    }
  }
};

// 데이터베이스 연결 상태 확인 함수
export const checkDatabaseConnection = async () => {
  try {
    const testDoc = await getDocs(query(collection(db, 'sites'), limit(1)));
    dbConnectionManager.updateStatus('connected');
    return true;
  } catch (error) {
    console.error('Database connection check failed:', error);
    dbConnectionManager.updateStatus('error', error);
    return false;
  }
};

// 모든 API를 하나의 객체로 내보내기
export const databaseAPI = {
  documents: documentsAPI,
  permissions: permissionsAPI,
  progress: progressAPI,
  sites: sitesAPI,
  vendors: vendorsAPI,
  gisung: gisungAPI,
  costs: costsAPI,
  schedules: schedulesAPI,
  safety: safetyAPI,
  members: membersAPI,
  weather: weatherAPI,
  todos: todosAPI,
  discussions: discussionsAPI,
  estimates: estimatesAPI,
  claims: claimsAPI,
  connectionManager: dbConnectionManager,
  checkConnection: checkDatabaseConnection
}; 