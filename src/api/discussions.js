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
  getDoc,
  writeBatch
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

// 실시간 토론 목록 구독 (개선된 버전)
export const subscribeToDiscussions = (callback) => {
  try {
    const q = query(
      discussionsCollection,
      orderBy('lastMessageTime', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const discussions = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        discussions.push({
          id: doc.id,
          ...data,
          // 타임스탬프 변환
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          lastMessageTime: data.lastMessageTime?.toDate ? data.lastMessageTime.toDate() : data.lastMessageTime,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
        });
      });
      console.log('🔥 실시간 토론 목록 업데이트:', discussions.length, '개');
      callback(discussions);
    }, (error) => {
      console.error('🔥 토론 목록 구독 오류:', error);
      // 오류 발생 시 빈 배열로 콜백 호출
      callback([]);
    });
  } catch (error) {
    console.error('🔥 토론 목록 구독 설정 오류:', error);
    // 오류 발생 시 빈 배열로 콜백 호출
    callback([]);
    return () => {};
  }
};

// 실시간 메시지 구독 (개선된 버전)
export const subscribeToMessages = (discussionId, callback) => {
  if (!discussionId) {
    console.warn('🔥 discussionId가 없어서 메시지 구독을 시작할 수 없습니다.');
    return () => {};
  }

  try {
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
          // 타임스탬프 변환
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : data.timestamp,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt
        });
      });
      console.log('🔥 실시간 메시지 업데이트:', discussionId, messages.length, '개');
      callback(messages);
    }, (error) => {
      console.error('🔥 메시지 구독 오류:', error);
      // 오류 발생 시 빈 배열로 콜백 호출
      callback([]);
    });
  } catch (error) {
    console.error('🔥 메시지 구독 설정 오류:', error);
    // 오류 발생 시 빈 배열로 콜백 호출
    callback([]);
    return () => {};
  }
};

// 새 토론 생성 (개선된 버전)
export const createDiscussion = async (discussionData) => {
  try {
    const batch = writeBatch(db);
    const timestamp = serverTimestamp();
    
    // 토론 문서 생성
    const discussionRef = doc(discussionsCollection);
    batch.set(discussionRef, {
      ...discussionData,
      createdAt: timestamp,
      lastMessageTime: timestamp,
      lastMessage: '새로운 토론이 시작되었습니다.',
      participants: [discussionData.createdBy || 'anonymous'], // 참여자 ID 배열로 저장
      participantDetails: {
        [discussionData.createdBy || 'anonymous']: {
          joinTime: timestamp,
          name: discussionData.authorName || '익명'
        }
      },
      unreadCount: 0,
      status: 'active'
    });

    // 첫 번째 메시지 추가
    const messageRef = doc(messagesCollection);
    batch.set(messageRef, {
      discussionId: discussionRef.id,
      content: '새로운 토론이 시작되었습니다.',
      author: '시스템',
      authorId: 'system',
      timestamp: timestamp,
      type: 'system'
    });

    // 배치 커밋
    await batch.commit();
    console.log('🔥 새 토론 생성 완료:', discussionRef.id);
    return discussionRef.id;
  } catch (error) {
    console.error('🔥 토론 생성 실패:', error);
    throw error;
  }
};

// 파일 업로드 (개선된 버전)
export const uploadFile = async (file, discussionId) => {
  try {
    const timestamp = Date.now();
    const fileName = `${discussionId}/${timestamp}_${file.name}`;
    const storageRef = ref(storage, `discussion_files/${fileName}`);
    
    console.log('🔥 파일 업로드 시작:', file.name);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    console.log('🔥 파일 업로드 완료:', file.name);
    return {
      name: file.name,
      url: downloadURL,
      size: file.size,
      type: file.type,
      path: fileName
    };
  } catch (error) {
    console.error('🔥 파일 업로드 실패:', error);
    throw error;
  }
};

// 파일 삭제
export const deleteFile = async (filePath) => {
  try {
    const storageRef = ref(storage, `discussion_files/${filePath}`);
    await deleteObject(storageRef);
    console.log('🔥 파일 삭제 완료:', filePath);
  } catch (error) {
    console.error('🔥 파일 삭제 실패:', error);
    throw error;
  }
};

// 메시지 전송 (즉시 연동 개선 버전)
export const sendMessage = async (discussionId, messageData) => {
  if (!discussionId) {
    throw new Error('discussionId가 필요합니다.');
  }

  try {
    const timestamp = serverTimestamp();
    console.log('🔥 메시지 전송 시작:', discussionId, messageData.content?.substring(0, 20));
    
    // 파일이 있는 경우 업로드
    let uploadedFiles = [];
    if (messageData.files && messageData.files.length > 0) {
      console.log('🔥 파일 업로드 시작:', messageData.files.length, '개');
      const uploadPromises = messageData.files.map(file => uploadFile(file, discussionId));
      uploadedFiles = await Promise.all(uploadPromises);
      console.log('🔥 파일 업로드 완료:', uploadedFiles.length, '개');
    }
    
    // 메시지 데이터에서 파일 제거하고 업로드된 파일 정보로 교체
    const { files, ...messageWithoutFiles } = messageData;
    
    // 사용자 이름이 없으면 기본값 설정
    const authorName = messageData.author || messageData.userName || messageData.displayName || '익명';
    
    const finalMessageData = {
      ...messageWithoutFiles,
      author: authorName, // 명시적으로 author 필드 설정
      userName: authorName, // userName 필드도 설정 (호환성)
      files: uploadedFiles,
      timestamp: timestamp
    };
    
    // 배치 작업으로 메시지 추가와 토론 정보 업데이트를 원자적으로 실행
    const batch = writeBatch(db);
    
    // 메시지 추가
    const messageRef = doc(messagesCollection);
    batch.set(messageRef, {
      discussionId,
      ...finalMessageData
    });
    
    // 토론 정보 업데이트
    const discussionRef = doc(db, 'discussions', discussionId);
    batch.update(discussionRef, {
      lastMessage: messageData.content || `파일 ${uploadedFiles.length}개`,
      lastMessageTime: timestamp,
      unreadCount: 0
    });
    
    // 배치 커밋
    await batch.commit();
    
    console.log('🔥 메시지 전송 완료:', messageRef.id);
    return messageRef.id;
  } catch (error) {
    console.error('🔥 메시지 전송 실패:', error);
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
    console.log('🔥 토론 정보 업데이트 완료:', discussionId);
  } catch (error) {
    console.error('🔥 토론 업데이트 실패:', error);
    throw error;
  }
};

// 토론 삭제 (개선된 버전)
export const deleteDiscussion = async (discussionId) => {
  try {
    console.log('🔥 토론 삭제 시작:', discussionId);
    
    // 관련 메시지들 먼저 삭제
    const messagesQuery = query(
      messagesCollection,
      where('discussionId', '==', discussionId)
    );
    const messagesSnapshot = await getDocs(messagesQuery);
    
    const batch = writeBatch(db);
    
    // 메시지들 삭제
    messagesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // 토론 삭제
    const discussionRef = doc(db, 'discussions', discussionId);
    batch.delete(discussionRef);
    
    // 배치 커밋
    await batch.commit();
    
    console.log('🔥 토론 삭제 완료:', discussionId);
  } catch (error) {
    console.error('🔥 토론 삭제 실패:', error);
    throw error;
  }
};

// 토론 참여자 추가
export const addParticipant = async (discussionId, userId, userName) => {
  try {
    const discussionRef = doc(db, 'discussions', discussionId);
    const discussionDoc = await getDoc(discussionRef);
    
    if (discussionDoc.exists()) {
      const discussionData = discussionDoc.data();
      const currentParticipants = discussionData.participants || [];
      const currentParticipantDetails = discussionData.participantDetails || {};
      
      // 이미 참여자인지 확인
      if (!Array.isArray(currentParticipants) || !currentParticipants.includes(userId)) {
        const updatedParticipants = Array.isArray(currentParticipants) 
          ? [...currentParticipants, userId] 
          : [userId];
        
        const updatedParticipantDetails = {
          ...currentParticipantDetails,
          [userId]: {
            joinTime: serverTimestamp(),
            name: userName || '익명'
          }
        };
        
        await updateDoc(discussionRef, {
          participants: updatedParticipants,
          participantDetails: updatedParticipantDetails
        });
        console.log('🔥 참여자 추가 완료:', discussionId, userName);
      } else {
        console.log('🔥 이미 참여중인 사용자:', discussionId, userName);
      }
    }
  } catch (error) {
    console.error('🔥 참여자 추가 실패:', error);
    throw error;
  }
};

// 토론 참여자 제거
export const removeParticipant = async (discussionId, userId) => {
  try {
    const discussionRef = doc(db, 'discussions', discussionId);
    const discussionDoc = await getDoc(discussionRef);
    
    if (discussionDoc.exists()) {
      const discussionData = discussionDoc.data();
      const currentParticipants = discussionData.participants || [];
      const currentParticipantDetails = discussionData.participantDetails || {};
      
      if (Array.isArray(currentParticipants)) {
        const updatedParticipants = currentParticipants.filter(id => id !== userId);
        const updatedParticipantDetails = { ...currentParticipantDetails };
        delete updatedParticipantDetails[userId];
        
        await updateDoc(discussionRef, {
          participants: updatedParticipants,
          participantDetails: updatedParticipantDetails
        });
        console.log('🔥 참여자 제거 완료:', discussionId, userId);
      }
    }
  } catch (error) {
    console.error('🔥 참여자 제거 실패:', error);
    throw error;
  }
};

// 읽지 않은 메시지 수 업데이트
export const updateUnreadCount = async (discussionId, count = 0) => {
  try {
    const discussionRef = doc(db, 'discussions', discussionId);
    await updateDoc(discussionRef, {
      unreadCount: count
    });
    console.log('🔥 읽지 않은 메시지 수 업데이트:', discussionId, count);
  } catch (error) {
    console.error('🔥 읽지 않은 메시지 수 업데이트 실패:', error);
    throw error;
  }
};

// 메시지 검색
export const searchMessages = async (discussionId, searchTerm) => {
  try {
    const q = query(
      messagesCollection,
      where('discussionId', '==', discussionId),
      where('content', '>=', searchTerm),
      where('content', '<=', searchTerm + '\uf8ff')
    );
    
    const snapshot = await getDocs(q);
    const messages = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : data.timestamp
      });
    });
    
    return messages;
  } catch (error) {
    console.error('🔥 메시지 검색 실패:', error);
    throw error;
  }
};

// 토론 검색
export const searchDiscussions = async (searchTerm) => {
  try {
    const q = query(
      discussionsCollection,
      where('title', '>=', searchTerm),
      where('title', '<=', searchTerm + '\uf8ff')
    );
    
    const snapshot = await getDocs(q);
    const discussions = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      discussions.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        lastMessageTime: data.lastMessageTime?.toDate ? data.lastMessageTime.toDate() : data.lastMessageTime
      });
    });
    
    return discussions;
  } catch (error) {
    console.error('🔥 토론 검색 실패:', error);
    throw error;
  }
};

// 카테고리별 토론 조회
export const getDiscussionsByCategory = async (category) => {
  try {
    const q = query(
      discussionsCollection,
      where('category', '==', category),
      orderBy('lastMessageTime', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const discussions = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      discussions.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        lastMessageTime: data.lastMessageTime?.toDate ? data.lastMessageTime.toDate() : data.lastMessageTime
      });
    });
    
    return discussions;
  } catch (error) {
    console.error('🔥 카테고리별 토론 조회 실패:', error);
    throw error;
  }
};

// 사용자별 토론 조회
export const getDiscussionsByUser = async (userId) => {
  try {
    const q = query(
      discussionsCollection,
      where('authorId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const discussions = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      discussions.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        lastMessageTime: data.lastMessageTime?.toDate ? data.lastMessageTime.toDate() : data.lastMessageTime
      });
    });
    
    return discussions;
  } catch (error) {
    console.error('🔥 사용자별 토론 조회 실패:', error);
    throw error;
  }
};

// 토론 통계 조회
export const getDiscussionStats = async () => {
  try {
    const snapshot = await getDocs(discussionsCollection);
    const totalDiscussions = snapshot.size;
    
    let totalMessages = 0;
    let totalParticipants = 0;
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      totalParticipants += data.participants || 0;
    });
    
    // 메시지 수는 별도로 계산
    const messagesSnapshot = await getDocs(messagesCollection);
    totalMessages = messagesSnapshot.size;
    
    return {
      totalDiscussions,
      totalMessages,
      totalParticipants,
      averageMessagesPerDiscussion: totalDiscussions > 0 ? Math.round(totalMessages / totalDiscussions) : 0
    };
  } catch (error) {
    console.error('🔥 토론 통계 조회 실패:', error);
    throw error;
  }
};

// 토론 참여자 정보 조회
export const getDiscussionParticipants = async (discussionId) => {
  try {
    const discussionDoc = await getDoc(doc(db, 'discussions', discussionId));
    if (!discussionDoc.exists()) {
      throw new Error('토론을 찾을 수 없습니다.');
    }

    const discussionData = discussionDoc.data();
    const participants = discussionData.participants || [];
    const participantDetails = discussionData.participantDetails || {};

    // 참여자 상세 정보 조회
    const participantList = [];
    
    // participants가 배열인지 숫자인지 확인
    const participantIds = Array.isArray(participants) ? participants : [];
    
    for (const participantId of participantIds) {
      try {
        // 먼저 participantDetails에서 정보 확인
        const detailInfo = participantDetails[participantId];
        if (detailInfo) {
          participantList.push({
            id: participantId,
            name: detailInfo.name || '익명',
            email: detailInfo.email || '',
            role: detailInfo.role || '일반',
            avatar: detailInfo.avatar || '',
            joinTime: detailInfo.joinTime || discussionData.createdAt,
            isOnline: false
          });
        } else {
          // users 컬렉션에서 정보 조회
          const userDoc = await getDoc(doc(db, 'users', participantId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            participantList.push({
              id: participantId,
              name: userData.name || userData.displayName || '알 수 없음',
              email: userData.email || '',
              role: userData.role || '일반',
              avatar: userData.photoURL || '',
              joinTime: discussionData.createdAt,
              isOnline: false
            });
          } else {
            // 사용자 정보가 없는 경우 기본 정보로 추가
            participantList.push({
              id: participantId,
              name: '알 수 없음',
              email: '',
              role: '일반',
              avatar: '',
              joinTime: discussionData.createdAt,
              isOnline: false
            });
          }
        }
      } catch (error) {
        console.error('참여자 정보 조회 실패:', participantId, error);
        // 조회 실패한 참여자는 기본 정보로 추가
        participantList.push({
          id: participantId,
          name: '알 수 없음',
          email: '',
          role: '일반',
          avatar: '',
          joinTime: discussionData.createdAt,
          isOnline: false
        });
      }
    }

    return {
      totalCount: participantIds.length,
      participants: participantList,
      discussionInfo: {
        title: discussionData.title,
        subtitle: discussionData.subtitle,
        siteName: discussionData.siteName,
        createdAt: discussionData.createdAt
      }
    };
  } catch (error) {
    console.error('🔥 참여자 정보 조회 실패:', error);
    throw error;
  }
}; 