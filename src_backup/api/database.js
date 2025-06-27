import { db } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

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
  }
}; 