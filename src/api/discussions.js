import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  serverTimestamp,
  getDocs,
  getDoc
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db, storage } from '../firebase';

// 토론의견 컬렉션 참조
const discussionsCollection = collection(db, 'discussions');
const messagesCollection = collection(db, 'discussion_messages');

// 실시간 토론 목록 구독
export const subscribeToDiscussions = (callback) => {
  const q = query(
    discussionsCollection,
    orderBy('lastMessageTime', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const discussions = [];
    snapshot.forEach((doc) => {
      discussions.push({
        id: doc.id,
        ...doc.data()
      });
    });
    callback(discussions);
  });
};

// 실시간 메시지 구독
export const subscribeToMessages = (discussionId, callback) => {
  const q = query(
    messagesCollection,
    where('discussionId', '==', discussionId),
    orderBy('timestamp', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const messages = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        ...data,
        // 타임스탬프가 서버 타임스탬프인 경우 클라이언트 시간으로 변환
        timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : data.timestamp
      });
    });
    callback(messages);
  }, (error) => {
    console.error('메시지 구독 오류:', error);
  });
};

// 새 토론 생성
export const createDiscussion = async (discussionData) => {
  try {
    const docRef = await addDoc(discussionsCollection, {
      ...discussionData,
      createdAt: serverTimestamp(),
      lastMessageTime: serverTimestamp(),
      lastMessage: '새로운 토론이 시작되었습니다.',
      participants: 1,
      unreadCount: 0,
      status: 'active'
    });

    // 첫 번째 메시지 추가
    await addDoc(messagesCollection, {
      discussionId: docRef.id,
      content: '새로운 토론이 시작되었습니다.',
      author: '시스템',
      authorId: 'system',
      timestamp: serverTimestamp(),
      type: 'system'
    });

    return docRef.id;
  } catch (error) {
    console.error('토론 생성 실패:', error);
    throw error;
  }
};

// 파일 업로드
export const uploadFile = async (file, discussionId) => {
  try {
    const timestamp = Date.now();
    const fileName = `${discussionId}/${timestamp}_${file.name}`;
    const storageRef = ref(storage, `discussion_files/${fileName}`);
    
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return {
      name: file.name,
      url: downloadURL,
      size: file.size,
      type: file.type,
      path: fileName
    };
  } catch (error) {
    console.error('파일 업로드 실패:', error);
    throw error;
  }
};

// 파일 삭제
export const deleteFile = async (filePath) => {
  try {
    const storageRef = ref(storage, `discussion_files/${filePath}`);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('파일 삭제 실패:', error);
    throw error;
  }
};

// 메시지 전송 (파일 포함)
export const sendMessage = async (discussionId, messageData) => {
  try {
    const timestamp = serverTimestamp();
    
    // 파일이 있는 경우 업로드
    let uploadedFiles = [];
    if (messageData.files && messageData.files.length > 0) {
      const uploadPromises = messageData.files.map(file => uploadFile(file, discussionId));
      uploadedFiles = await Promise.all(uploadPromises);
    }
    
    // 메시지 데이터에서 파일 제거하고 업로드된 파일 정보로 교체
    const { files, ...messageWithoutFiles } = messageData;
    const finalMessageData = {
      ...messageWithoutFiles,
      files: uploadedFiles
    };
    
    // 메시지 추가와 토론 정보 업데이트를 병렬로 실행
    const [messageRef] = await Promise.all([
      addDoc(messagesCollection, {
        discussionId,
        ...finalMessageData,
        timestamp
      }),
      updateDoc(doc(db, 'discussions', discussionId), {
        lastMessage: messageData.content || `파일 ${uploadedFiles.length}개`,
        lastMessageTime: timestamp,
        unreadCount: 0
      })
    ]);

    return messageRef.id;
  } catch (error) {
    console.error('메시지 전송 실패:', error);
    throw error;
  }
};

// 토론 정보 업데이트
export const updateDiscussion = async (discussionId, updateData) => {
  try {
    const discussionRef = doc(db, 'discussions', discussionId);
    await updateDoc(discussionRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('토론 업데이트 실패:', error);
    throw error;
  }
};

// 토론 삭제
export const deleteDiscussion = async (discussionId) => {
  try {
    // 토론 삭제
    const discussionRef = doc(db, 'discussions', discussionId);
    await deleteDoc(discussionRef);

    // 관련 메시지들 삭제
    const messagesQuery = query(
      messagesCollection,
      where('discussionId', '==', discussionId)
    );
    const messagesSnapshot = await getDocs(messagesQuery);
    
    const deletePromises = messagesSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
  } catch (error) {
    console.error('토론 삭제 실패:', error);
    throw error;
  }
};

// 토론 참여자 추가
export const addParticipant = async (discussionId, userId, userName) => {
  try {
    const discussionRef = doc(db, 'discussions', discussionId);
    const discussionDoc = await getDoc(discussionRef);
    
    if (discussionDoc.exists()) {
      const currentParticipants = discussionDoc.data().participants || 1;
      await updateDoc(discussionRef, {
        participants: currentParticipants + 1
      });
    }
  } catch (error) {
    console.error('참여자 추가 실패:', error);
    throw error;
  }
};

// 토론 참여자 제거
export const removeParticipant = async (discussionId) => {
  try {
    const discussionRef = doc(db, 'discussions', discussionId);
    const discussionDoc = await getDoc(discussionRef);
    
    if (discussionDoc.exists()) {
      const currentParticipants = discussionDoc.data().participants || 1;
      const newParticipants = Math.max(0, currentParticipants - 1);
      
      await updateDoc(discussionRef, {
        participants: newParticipants
      });
    }
  } catch (error) {
    console.error('참여자 제거 실패:', error);
    throw error;
  }
};

// 읽지 않은 메시지 수 업데이트
export const updateUnreadCount = async (discussionId, count) => {
  try {
    const discussionRef = doc(db, 'discussions', discussionId);
    await updateDoc(discussionRef, {
      unreadCount: count
    });
  } catch (error) {
    console.error('읽지 않은 메시지 수 업데이트 실패:', error);
    throw error;
  }
};

// 토론 검색
export const searchDiscussions = async (searchTerm) => {
  try {
    const q = query(
      discussionsCollection,
      where('title', '>=', searchTerm),
      where('title', '<=', searchTerm + '\uf8ff'),
      orderBy('title'),
      limit(20)
    );

    const snapshot = await getDocs(q);
    const discussions = [];
    snapshot.forEach((doc) => {
      discussions.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return discussions;
  } catch (error) {
    console.error('토론 검색 실패:', error);
    throw error;
  }
};

// 카테고리별 토론 조회
export const getDiscussionsByCategory = async (category) => {
  try {
    const q = query(
      discussionsCollection,
      where('category', '==', category),
      orderBy('lastMessageTime', 'desc'),
      limit(20)
    );

    const snapshot = await getDocs(q);
    const discussions = [];
    snapshot.forEach((doc) => {
      discussions.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return discussions;
  } catch (error) {
    console.error('카테고리별 토론 조회 실패:', error);
    throw error;
  }
};

// 사용자별 토론 조회
export const getDiscussionsByUser = async (userId) => {
  try {
    const q = query(
      discussionsCollection,
      where('createdBy', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const snapshot = await getDocs(q);
    const discussions = [];
    snapshot.forEach((doc) => {
      discussions.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return discussions;
  } catch (error) {
    console.error('사용자별 토론 조회 실패:', error);
    throw error;
  }
};

// 토론 통계 조회
export const getDiscussionStats = async () => {
  try {
    const totalQuery = query(discussionsCollection);
    const activeQuery = query(
      discussionsCollection,
      where('status', '==', 'active')
    );

    const [totalSnapshot, activeSnapshot] = await Promise.all([
      getDocs(totalQuery),
      getDocs(activeQuery)
    ]);

    return {
      total: totalSnapshot.size,
      active: activeSnapshot.size
    };
  } catch (error) {
    console.error('토론 통계 조회 실패:', error);
    throw error;
  }
}; 