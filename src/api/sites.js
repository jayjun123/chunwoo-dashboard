import { collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, limit, writeBatch } from 'firebase/firestore';
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
    const docSnap = await getDoc(docRef);
    
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
      createdAt: new Date(),
      updatedAt: new Date(),
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
    
    // 기존 현장 데이터 조회
    const siteSnap = await getDoc(docRef);
    if (!siteSnap.exists()) {
      throw new Error('현장을 찾을 수 없습니다.');
    }
    
    const oldSiteData = siteSnap.data();
    const oldName = oldSiteData.name;
    const newName = siteData.name;
    
    // 현장 정보 업데이트
    await updateDoc(docRef, {
      ...siteData,
      updatedAt: new Date()
    });
    
    // 현장명이 변경된 경우 기성 데이터도 함께 업데이트
    if (oldName !== newName) {
      console.log('현장명 변경 감지:', { oldName, newName });
      
      // 기성 데이터에서 해당 현장명을 가진 모든 문서 찾기
      const gisungQuery = query(
        collection(db, 'gisung'),
        where('name', '==', oldName)
      );
      const gisungSnapshot = await getDocs(gisungQuery);
      
      // 기성 데이터 업데이트
      const updatePromises = gisungSnapshot.docs.map(doc => {
        return updateDoc(doc.ref, {
          name: newName,
          updatedAt: new Date()
        });
      });
      
      await Promise.all(updatePromises);
      console.log(`${gisungSnapshot.docs.length}개의 기성 데이터 업데이트 완료`);
    }
    
    return { id, ...siteData };
  } catch (err) {
    console.error('현장 수정 실패:', err);
    throw err;
  }
}

// 현장 삭제
export async function deleteSite(id) {
  try {
    console.log('🗑️ 현장 삭제 시작:', id);
    
    // 1. 현장 정보 조회 (현장명 확인용)
    const siteRef = doc(db, COLLECTION_NAME, id);
    const siteSnap = await getDoc(siteRef);
    
    if (!siteSnap.exists()) {
      throw new Error('삭제할 현장을 찾을 수 없습니다.');
    }
    
    const siteData = siteSnap.data();
    const siteName = siteData.name;
    console.log('🗑️ 삭제할 현장명:', siteName);
    
    // 2. 관련 데이터 삭제 (배치 작업)
    const batch = writeBatch(db);
    
    // 2-1. 업로드된 기성금청구서 데이터 삭제 (gisung_uploads)
    try {
      const gisungUploadsQuery = query(
        collection(db, 'gisung_uploads'),
        where('siteId', '==', id)
      );
      const gisungUploadsSnap = await getDocs(gisungUploadsQuery);
      console.log(`🗑️ 삭제할 업로드된 기성금청구서 데이터: ${gisungUploadsSnap.docs.length}개`);
      
      gisungUploadsSnap.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
    } catch (error) {
      console.warn('⚠️ 업로드된 기성금청구서 데이터 삭제 실패:', error);
    }
    
    // 2-2. 기성 데이터 삭제 (gisung)
    try {
      const gisungQuery = query(
        collection(db, 'gisung'),
        where('siteId', '==', id)
      );
      const gisungSnap = await getDocs(gisungQuery);
      console.log(`🗑️ 삭제할 기성 데이터: ${gisungSnap.docs.length}개`);
      
      gisungSnap.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
    } catch (error) {
      console.warn('⚠️ 기성 데이터 삭제 실패:', error);
    }
    
    // 2-3. 현장 물량내역 삭제 (siteItems)
    try {
      const siteItemsQuery = query(
        collection(db, 'siteItems'),
        where('siteId', '==', id)
      );
      const siteItemsSnap = await getDocs(siteItemsQuery);
      console.log(`🗑️ 삭제할 현장 물량내역: ${siteItemsSnap.docs.length}개`);
      
      siteItemsSnap.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
    } catch (error) {
      console.warn('⚠️ 현장 물량내역 삭제 실패:', error);
    }
    
    // 2-4. 기성 아이템 데이터 삭제 (gisungItems)
    try {
      const gisungItemsQuery = query(
        collection(db, 'gisungItems'),
        where('siteName', '==', siteName)
      );
      const gisungItemsSnap = await getDocs(gisungItemsQuery);
      console.log(`🗑️ 삭제할 기성 아이템 데이터: ${gisungItemsSnap.docs.length}개`);
      
      gisungItemsSnap.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
    } catch (error) {
      console.warn('⚠️ 기성 아이템 데이터 삭제 실패:', error);
    }
    
    // 2-5. 일정 데이터 삭제 (schedules)
    try {
      const schedulesQuery = query(
        collection(db, 'schedules'),
        where('siteId', '==', id)
      );
      const schedulesSnap = await getDocs(schedulesQuery);
      console.log(`🗑️ 삭제할 일정 데이터: ${schedulesSnap.docs.length}개`);
      
      schedulesSnap.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
    } catch (error) {
      console.warn('⚠️ 일정 데이터 삭제 실패:', error);
    }
    
    // 3. 현장 정보 삭제 (마지막에 삭제)
    batch.delete(siteRef);
    
    // 4. 배치 작업 실행
    await batch.commit();
    
    console.log('✅ 현장 및 관련 데이터 삭제 완료:', siteName);
    return id;
    
  } catch (err) {
    console.error('❌ 현장 삭제 실패:', err);
    throw err;
  }
} 