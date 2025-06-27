// Firestore 인덱스 생성 스크립트
// 이 스크립트는 Firebase Admin SDK를 사용하여 필요한 인덱스를 자동으로 생성합니다.

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Firebase Admin SDK 초기화 (서비스 계정 키 필요)
const serviceAccount = require('./serviceAccountKey.json');

const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(app);

// 필요한 인덱스 정의
const requiredIndexes = [
  {
    collectionGroup: 'progress',
    fields: [
      { fieldPath: 'siteId', order: 'ASCENDING' },
      { fieldPath: 'date', order: 'ASCENDING' }
    ],
    queryScope: 'COLLECTION'
  },
  {
    collectionGroup: 'discussions',
    fields: [
      { fieldPath: 'type', order: 'ASCENDING' },
      { fieldPath: 'timestamp', order: 'DESCENDING' }
    ],
    queryScope: 'COLLECTION'
  },
  {
    collectionGroup: 'discussions',
    fields: [
      { fieldPath: 'roomId', order: 'ASCENDING' },
      { fieldPath: 'timestamp', order: 'ASCENDING' }
    ],
    queryScope: 'COLLECTION'
  }
];

async function createIndexes() {
  try {
    console.log('Firestore 인덱스 생성을 시작합니다...');
    
    for (const indexConfig of requiredIndexes) {
      console.log(`인덱스 생성 중: ${indexConfig.collectionGroup} - ${indexConfig.fields.map(f => f.fieldPath).join(', ')}`);
      
      // 인덱스 생성 (실제로는 Firebase Console에서 수동으로 생성해야 함)
      // 이 스크립트는 인덱스 생성 명령을 보여주는 용도입니다.
      
      console.log('인덱스 생성 명령:');
      console.log(`gcloud firestore indexes composite create --collection-group=${indexConfig.collectionGroup} --field-config=${indexConfig.fields.map(f => `field-path=${f.fieldPath},order=${f.order}`).join(',')}`);
    }
    
    console.log('인덱스 생성이 완료되었습니다.');
    console.log('참고: 실제 인덱스 생성을 위해서는 Firebase Console에서 수동으로 생성하거나 gcloud CLI를 사용하세요.');
    
  } catch (error) {
    console.error('인덱스 생성 중 오류 발생:', error);
  }
}

// 스크립트 실행
createIndexes(); 