import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';

const COLLECTION_NAME = 'sites';
const PAGE_SIZE = 20;

// 현장 리스트 조회 (페이지네이션 적용)
export async function getSites({ name = '', company = '', manager = '', page = 1 } = {}) {
  try {
    let q = collection(db, COLLECTION_NAME);
    
    // 필터 적용
    if (name) {
      q = query(q, where('name', '>=', name), where('name', '<=', name + '\uf8ff'));
    }
    if (company) {
      q = query(q, where('company', '>=', company), where('company', '<=', company + '\uf8ff'));
    }
    if (manager) {
      q = query(q, where('manager', '>=', manager), where('manager', '<=', manager + '\uf8ff'));
    }

    // 정렬 및 페이지네이션
    q = query(
      q,
      orderBy('updatedAt', 'desc'),
      limit(PAGE_SIZE * page)
    );

    const snapshot = await getDocs(q);
    const sites = snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      company: doc.data().company,
      manager: doc.data().manager,
      status: doc.data().status,
      startDate: doc.data().startDate,
      endDate: doc.data().endDate,
      progress: doc.data().progress,
      updatedAt: doc.data().updatedAt
    }));

    return sites;
  } catch (err) {
    console.error('현장 리스트 조회 실패:', err);
    throw err;
  }
}

// 현장 상세 조회
export async function getSiteById(id) {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDocs(docRef);
    
    if (!docSnap.exists()) {
      throw new Error('현장을 찾을 수 없습니다.');
    }

    return {
      id: docSnap.id,
      ...docSnap.data()
    };
  } catch (err) {
    console.error('현장 상세 조회 실패:', err);
    throw err;
  }
}

// 현장 추가
export async function addSite(siteData) {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...siteData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isSample: false
    });
    return { id: docRef.id, ...siteData };
  } catch (err) {
    console.error('현장 추가 실패:', err);
    throw err;
  }
}

// 현장 수정
export async function updateSite(id, siteData) {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      ...siteData,
      updatedAt: new Date().toISOString()
    });
    return { id, ...siteData };
  } catch (err) {
    console.error('현장 수정 실패:', err);
    throw err;
  }
}

// 현장 삭제
export async function deleteSite(id) {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
    return id;
  } catch (err) {
    console.error('현장 삭제 실패:', err);
    throw err;
  }
} 