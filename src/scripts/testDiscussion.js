import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';

// 테스트 토론과 메시지 생성
const createTestDiscussion = async () => {
  try {
    console.log('🔥 테스트 토론 생성 시작...');
    
    // 토론 생성
    const discussionRef = await addDoc(collection(db, 'discussions'), {
      title: '테스트 토론',
      subtitle: '테스트용 토론입니다',
      siteName: '테스트 현장',
      password: '',
      category: '기타',
      priority: 'normal',
      createdBy: 'test-user',
      authorName: '테스트 사용자',
      avatar: '테',
      color: 'hsl(200, 70%, 60%)',
      createdAt: serverTimestamp(),
      lastMessageTime: serverTimestamp(),
      lastMessage: '테스트 메시지입니다.',
      participants: 1,
      unreadCount: 0,
      status: 'active'
    });
    
    console.log('🔥 토론 생성 완료:', discussionRef.id);
    
    // 테스트 메시지들 생성
    const messages = [
      {
        discussionId: discussionRef.id,
        content: '안녕하세요! 테스트 메시지입니다.',
        author: '테스트 사용자',
        authorId: 'test-user',
        timestamp: serverTimestamp(),
        type: 'text'
      },
      {
        discussionId: discussionRef.id,
        content: '두 번째 테스트 메시지입니다.',
        author: '테스트 사용자',
        authorId: 'test-user',
        timestamp: serverTimestamp(),
        type: 'text'
      },
      {
        discussionId: discussionRef.id,
        content: '세 번째 테스트 메시지입니다.',
        author: '테스트 사용자',
        authorId: 'test-user',
        timestamp: serverTimestamp(),
        type: 'text'
      }
    ];
    
    for (const messageData of messages) {
      await addDoc(collection(db, 'discussion_messages'), messageData);
    }
    
    console.log('🔥 테스트 메시지 생성 완료');
    console.log('🔥 생성된 토론 ID:', discussionRef.id);
    
    return discussionRef.id;
  } catch (error) {
    console.error('🔥 테스트 토론 생성 실패:', error);
    throw error;
  }
};

// 스크립트 실행
if (typeof window !== 'undefined') {
  // 브라우저에서 실행
  window.createTestDiscussion = createTestDiscussion;
  console.log('🔥 테스트 함수가 전역에 등록되었습니다. 브라우저 콘솔에서 createTestDiscussion()를 실행하세요.');
} else {
  // Node.js에서 실행
  createTestDiscussion().then(() => {
    console.log('🔥 테스트 완료');
    process.exit(0);
  }).catch((error) => {
    console.error('🔥 테스트 실패:', error);
    process.exit(1);
  });
} 