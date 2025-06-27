const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, updateDoc, doc } = require('firebase/firestore');

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const updateUserRole = async () => {
  try {
    console.log('사용자 권한 업데이트 시작...');
    
    // members 컬렉션에서 fire8803@naver.com 사용자 찾기
    const membersRef = collection(db, 'members');
    const q = query(membersRef, where('email', '==', 'fire8803@naver.com'));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('fire8803@naver.com 사용자를 찾을 수 없습니다.');
      return;
    }
    
    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();
    
    console.log('현재 사용자 데이터:', userData);
    
    // role을 master로 업데이트
    await updateDoc(doc(db, 'members', userDoc.id), {
      role: 'master',
      grade: '마스터',
      updatedAt: new Date()
    });
    
    console.log('fire8803@naver.com 사용자의 권한이 master로 업데이트되었습니다.');
    
  } catch (error) {
    console.error('사용자 권한 업데이트 중 오류:', error);
  }
};

updateUserRole(); 