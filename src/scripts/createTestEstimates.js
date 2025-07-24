import { db } from '../firebase.js';
import { collection, addDoc } from 'firebase/firestore';

const createTestEstimates = async () => {
  try {
    console.log('견적 테스트 데이터 생성 시작...');
    
    // 한국 시간 기준 오늘 날짜
    const getKoreanDate = () => {
      const now = new Date();
      const koreanTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
      return koreanTime.toISOString().split('T')[0];
    };
    const today = getKoreanDate();
    
    const testEstimates = [
      {
        receptionDate: today,
        requester: '김의뢰자',
        submissionMethod: '이메일',
        company: '테스트건설',
        siteName: '테스트현장1',
        requestContent: '기초공사 견적요청',
        submissionDeadline: today, // 오늘 날짜로 설정
        submissionStatus: '제출대기',
        notes: '테스트 견적 1',
        contractStatus: '미수주',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        receptionDate: today,
        requester: '이의뢰자',
        submissionMethod: '전화',
        company: '테스트건설2',
        siteName: '테스트현장2',
        requestContent: '구조체공사 견적요청',
        submissionDeadline: today, // 오늘 날짜로 설정
        submissionStatus: '제출대기',
        notes: '테스트 견적 2',
        contractStatus: '미수주',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        receptionDate: today,
        requester: '박의뢰자',
        submissionMethod: '방문',
        company: '테스트건설3',
        siteName: '테스트현장3',
        requestContent: '마감공사 견적요청',
        submissionDeadline: today, // 오늘 날짜로 설정
        submissionStatus: '제출완료',
        notes: '테스트 견적 3',
        contractStatus: '미수주',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const estimate of testEstimates) {
      await addDoc(collection(db, 'estimates'), estimate);
      console.log(`견적 추가됨: ${estimate.siteName} - ${estimate.submissionDeadline}`);
    }

    console.log('견적 테스트 데이터 생성 완료!');
    console.log('오늘 날짜:', today);
    console.log('총', testEstimates.length, '개의 견적이 추가되었습니다.');
    
  } catch (error) {
    console.error('견적 테스트 데이터 생성 중 오류 발생:', error);
  }
};

export default createTestEstimates; 