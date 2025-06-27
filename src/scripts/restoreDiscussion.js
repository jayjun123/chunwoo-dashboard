import { db } from '../firebase.js';
import { collection, addDoc } from 'firebase/firestore';

const restoreDiscussion = async () => {
  try {
    await addDoc(collection(db, 'discussions'), {
      title: '',
      content: '',
      read: false
    });
    console.log('빈 discussions 문서 1개 생성 완료');
  } catch (error) {
    console.error('생성 실패:', error);
  }
};

restoreDiscussion(); 
 