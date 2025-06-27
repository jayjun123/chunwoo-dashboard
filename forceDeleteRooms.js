const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc, query, where } = require('firebase/firestore');

// Firebase 설정 (src/firebase.js에서 가져온 설정)
const firebaseConfig = {
  apiKey: "AIzaSyBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function forceDeleteAllRooms() {
  try {
    console.log('🚀 강제 삭제 시작...');
    
    // 1. 모든 대화방 조회
    console.log('📋 대화방 목록 조회 중...');
    const roomsSnapshot = await getDocs(collection(db, 'discussionRooms'));
    const rooms = roomsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log(`📊 총 ${rooms.length}개의 대화방 발견`);
    
    if (rooms.length === 0) {
      console.log('✅ 삭제할 대화방이 없습니다.');
      return;
    }
    
    // 2. 각 대화방의 메시지 삭제
    for (const room of rooms) {
      console.log(`🗑️ 대화방 "${room.name}" (${room.id}) 처리 중...`);
      
      // 해당 대화방의 모든 메시지 조회
      const messagesQuery = query(collection(db, 'discussions'), where('roomId', '==', room.id));
      const messagesSnapshot = await getDocs(messagesQuery);
      
      console.log(`  - ${messagesSnapshot.docs.length}개의 메시지 발견`);
      
      // 메시지 삭제
      if (!messagesSnapshot.empty) {
        const deletePromises = messagesSnapshot.docs.map(doc => {
          console.log(`    삭제 중: ${doc.id}`);
          return deleteDoc(doc.ref);
        });
        await Promise.all(deletePromises);
        console.log(`  ✅ ${messagesSnapshot.docs.length}개 메시지 삭제 완료`);
      }
      
      // 대화방 삭제
      console.log(`  🗑️ 대화방 삭제 중: ${room.id}`);
      await deleteDoc(doc(db, 'discussionRooms', room.id));
      console.log(`  ✅ 대화방 삭제 완료`);
    }
    
    console.log('🎉 모든 대화방 삭제 완료!');
    
  } catch (error) {
    console.error('❌ 삭제 중 오류 발생:', error);
    console.error('오류 상세:', error.code, error.message);
  }
}

// 스크립트 실행
forceDeleteAllRooms(); 