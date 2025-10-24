const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, updateDoc, doc, addDoc } = require('firebase/firestore');

// Firebase 설정 (실제 설정으로 교체 필요)
const firebaseConfig = {
  apiKey: "AIzaSyBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "chunwooo-edf9f.firebaseapp.com",
  projectId: "chunwooo-edf9f",
  storageBucket: "chunwooo-edf9f.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const updateParkmg0688Member = async () => {
  try {
    console.log('🔧 parkmg0688@naver.com 사용자 멤버 정보 업데이트 시작...');
    
    // members 컬렉션에서 parkmg0688@naver.com 사용자 찾기
    const membersRef = collection(db, 'members');
    const q = query(membersRef, where('email', '==', 'parkmg0688@naver.com'));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('⚠️ parkmg0688@naver.com 사용자를 members 컬렉션에서 찾을 수 없습니다.');
      console.log('새로운 멤버로 추가합니다...');
      
      // 새로운 멤버 추가
      await addDoc(membersRef, {
        email: 'parkmg0688@naver.com',
        role: 'master',
        grade: '마스터',
        teamGrade: 'A',
        displayName: '박민규',
        createdAt: new Date(),
        updatedAt: new Date(),
        permissions: {
          dashboard: { view: true, create: true, edit: true, delete: true, manage: true },
          importantSite: { view: true, create: true, edit: true, delete: true, manage: true },
          sites: { view: true, create: true, edit: true, delete: true, manage: true },
          mapping: { view: true, create: true, edit: true, delete: true, manage: true },
          safety: { view: true, create: true, edit: true, delete: true, manage: true },
          claims: { view: true, create: true, edit: true, delete: true, manage: true },
          estimates: { view: true, create: true, edit: true, delete: true, manage: true },
          discussions: { view: true, create: true, edit: true, delete: true, manage: true },
          vendors: { view: true, create: true, edit: true, delete: true, manage: true },
          cost: { view: true, create: true, edit: true, delete: true, manage: true },
          daemaTeam: { view: true, create: true, edit: true, delete: true, manage: true },
          calendar: { view: true, create: true, edit: true, delete: true, manage: true },
          vendorManagement: { view: true, create: true, edit: true, delete: true, manage: true },
          confidential: { view: true, create: true, edit: true, delete: true, manage: true },
          wholeList: { view: true, create: true, edit: true, delete: true, manage: true },
          gantt: { view: true, create: true, edit: true, delete: true, manage: true },
          notifications: { view: true, create: true, edit: true, delete: true, manage: true },
          userManagement: { view: true, create: true, edit: true, delete: true, manage: true },
          permissions: { view: true, create: true, edit: true, delete: true, manage: true },
          materials: { view: true, create: true, edit: true, delete: true, manage: true }
        }
      });
      
      console.log('✅ parkmg0688@naver.com 사용자가 새로운 마스터 멤버로 추가되었습니다.');
      return;
    }
    
    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();
    
    console.log('현재 사용자 데이터:', userData);
    
    // role을 master로 업데이트
    await updateDoc(doc(db, 'members', userDoc.id), {
      role: 'master',
      grade: '마스터',
      teamGrade: 'A',
      displayName: '박민규',
      updatedAt: new Date(),
      permissions: {
        dashboard: { view: true, create: true, edit: true, delete: true, manage: true },
        importantSite: { view: true, create: true, edit: true, delete: true, manage: true },
        sites: { view: true, create: true, edit: true, delete: true, manage: true },
        mapping: { view: true, create: true, edit: true, delete: true, manage: true },
        safety: { view: true, create: true, edit: true, delete: true, manage: true },
        claims: { view: true, create: true, edit: true, delete: true, manage: true },
        estimates: { view: true, create: true, edit: true, delete: true, manage: true },
        discussions: { view: true, create: true, edit: true, delete: true, manage: true },
        vendors: { view: true, create: true, edit: true, delete: true, manage: true },
        cost: { view: true, create: true, edit: true, delete: true, manage: true },
        daemaTeam: { view: true, create: true, edit: true, delete: true, manage: true },
        calendar: { view: true, create: true, edit: true, delete: true, manage: true },
        vendorManagement: { view: true, create: true, edit: true, delete: true, manage: true },
        confidential: { view: true, create: true, edit: true, delete: true, manage: true },
        wholeList: { view: true, create: true, edit: true, delete: true, manage: true },
        gantt: { view: true, create: true, edit: true, delete: true, manage: true },
        notifications: { view: true, create: true, edit: true, delete: true, manage: true },
        userManagement: { view: true, create: true, edit: true, delete: true, manage: true },
        permissions: { view: true, create: true, edit: true, delete: true, manage: true },
        materials: { view: true, create: true, edit: true, delete: true, manage: true }
      }
    });
    
    console.log('✅ parkmg0688@naver.com 사용자의 권한이 master로 업데이트되었습니다.');
    
  } catch (error) {
    console.error('❌ 사용자 권한 업데이트 중 오류:', error);
  }
};

updateParkmg0688Member();
