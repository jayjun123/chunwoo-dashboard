import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

const COLLECTION_NAME = 'schedules';

// 일정 목록 조회
export const getSchedules = async (filters = {}) => {
  try {
    let q = collection(db, COLLECTION_NAME);
    
    // 필터 적용
    if (filters.startDate && filters.endDate) {
      q = query(
        q,
        where('startDate', '>=', filters.startDate),
        where('startDate', '<=', filters.endDate)
      );
    }
    
    if (filters.siteId) {
      q = query(q, where('siteId', '==', filters.siteId));
    }
    
    if (filters.type) {
      q = query(q, where('type', '==', filters.type));
    }

    // 정렬
    q = query(q, orderBy('startDate', 'asc'));

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('일정 조회 실패:', error);
    throw error;
  }
};

// 일정 추가
export const addSchedule = async (scheduleData) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...scheduleData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return { id: docRef.id, ...scheduleData };
  } catch (error) {
    console.error('일정 추가 실패:', error);
    throw error;
  }
};

// 일정 수정
export const updateSchedule = async (scheduleId, scheduleData) => {
  try {
    const scheduleRef = doc(db, COLLECTION_NAME, scheduleId);
    await updateDoc(scheduleRef, {
      ...scheduleData,
      updatedAt: Timestamp.now()
    });
    return { id: scheduleId, ...scheduleData };
  } catch (error) {
    console.error('일정 수정 실패:', error);
    throw error;
  }
};

// 일정 삭제
export const deleteSchedule = async (scheduleId) => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, scheduleId));
    return scheduleId;
  } catch (error) {
    console.error('일정 삭제 실패:', error);
    throw error;
  }
};

// 일정 순서 변경
export const reorderSchedules = async (scheduleIds) => {
  try {
    const batch = db.batch();
    
    scheduleIds.forEach((scheduleId, index) => {
      const scheduleRef = doc(db, COLLECTION_NAME, scheduleId);
      batch.update(scheduleRef, { 
        order: index,
        updatedAt: Timestamp.now()
      });
    });

    await batch.commit();
    return scheduleIds;
  } catch (error) {
    console.error('일정 순서 변경 실패:', error);
    throw error;
  }
}; 