import { db } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, orderBy } from 'firebase/firestore';

// 문서 관련 API
export const documentsAPI = {
  async getAll() {
    const snapshot = await getDocs(collection(db, 'documents'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  async add(data) {
    return await addDoc(collection(db, 'documents'), data);
  },
  async update(id, data) {
    return await updateDoc(doc(db, 'documents', id), data);
  },
  async remove(id) {
    return await deleteDoc(doc(db, 'documents', id));
  }
};

// 권한 관련 API
export const permissionsAPI = {
  async getAll() {
    const snapshot = await getDocs(collection(db, 'permissions'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  async add(data) {
    return await addDoc(collection(db, 'permissions'), data);
  },
  async update(id, data) {
    return await updateDoc(doc(db, 'permissions', id), data);
  },
  async remove(id) {
    return await deleteDoc(doc(db, 'permissions', id));
  },
  async getUserPermissions(userId) {
    const snapshot = await getDocs(query(collection(db, 'permissions'), where('userId', '==', userId)));
    return snapshot.docs[0]?.data();
  }
};

// 기성관리 관련 API
export const progressAPI = {
  async getAll() {
    const snapshot = await getDocs(collection(db, 'progress'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  async add(data) {
    return await addDoc(collection(db, 'progress'), data);
  },
  async update(id, data) {
    return await updateDoc(doc(db, 'progress', id), data);
  },
  async remove(id) {
    return await deleteDoc(doc(db, 'progress', id));
  },
  subscribeToProgress(siteId, callback) {
    const q = query(
      collection(db, 'progress'),
      where('siteId', '==', siteId),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const progressData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(progressData);
    });
  }
};

// 현장 관련 API
export const sitesAPI = {
  async getAll() {
    const snapshot = await getDocs(collection(db, 'sites'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  async add(data) {
    return await addDoc(collection(db, 'sites'), data);
  },
  async update(id, data) {
    return await updateDoc(doc(db, 'sites', id), data);
  },
  async remove(id) {
    return await deleteDoc(doc(db, 'sites', id));
  },
  subscribeToSites(callback) {
    const q = query(collection(db, 'sites'), orderBy('name'));
    return onSnapshot(q, (snapshot) => {
      const sitesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(sitesData);
    });
  }
}; 