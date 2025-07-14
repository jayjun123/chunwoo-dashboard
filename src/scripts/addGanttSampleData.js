import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

const addGanttSampleData = async () => {
  try {
    console.log('공정표 샘플 데이터 추가를 시작합니다...');

    // 샘플 작업 데이터
    const sampleTasks = [
      {
        name: '기초공사',
        description: '건물 기초 시공 작업',
        startDate: '2024-01-15',
        endDate: '2024-02-15',
        progress: 100,
        status: '완료',
        priority: '높음',
        assignee: '김철수',
        category: '시공',
        siteId: 'sample-site-1', // 실제 현장 ID로 변경 필요
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: '구조체 공사',
        description: '철근콘크리트 구조체 시공',
        startDate: '2024-02-01',
        endDate: '2024-04-30',
        progress: 75,
        status: '진행중',
        priority: '높음',
        assignee: '이영희',
        category: '시공',
        siteId: 'sample-site-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: '설계 검토',
        description: '건축 및 구조 설계도 검토',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        progress: 100,
        status: '완료',
        priority: '보통',
        assignee: '박민수',
        category: '설계',
        siteId: 'sample-site-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: '인허가 신청',
        description: '건축 허가 및 각종 인허가 신청',
        startDate: '2024-01-10',
        endDate: '2024-02-28',
        progress: 90,
        status: '진행중',
        priority: '높음',
        assignee: '최지영',
        category: '인허가',
        siteId: 'sample-site-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: '전기 설비 공사',
        description: '전기 배선 및 설비 설치',
        startDate: '2024-03-15',
        endDate: '2024-05-15',
        progress: 30,
        status: '진행중',
        priority: '보통',
        assignee: '정수민',
        category: '시공',
        siteId: 'sample-site-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: '조명 설비 설치',
        description: '실내외 조명 설비 설치',
        startDate: '2024-05-01',
        endDate: '2024-06-15',
        progress: 0,
        status: '예정',
        priority: '낮음',
        assignee: '한동훈',
        category: '시공',
        siteId: 'sample-site-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: '마감 공사',
        description: '내부 마감재 시공',
        startDate: '2024-04-01',
        endDate: '2024-07-31',
        progress: 20,
        status: '진행중',
        priority: '보통',
        assignee: '송미영',
        category: '시공',
        siteId: 'sample-site-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: '사전 안전 점검',
        description: '공사 시작 전 안전 점검',
        startDate: '2024-01-05',
        endDate: '2024-01-10',
        progress: 100,
        status: '완료',
        priority: '높음',
        assignee: '안전관리자',
        category: '검사',
        siteId: 'sample-site-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: '중간 검사',
        description: '공사 중간 단계 검사',
        startDate: '2024-03-01',
        endDate: '2024-03-15',
        progress: 0,
        status: '예정',
        priority: '높음',
        assignee: '검사관',
        category: '검사',
        siteId: 'sample-site-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: '최종 검사',
        description: '공사 완료 후 최종 검사',
        startDate: '2024-07-15',
        endDate: '2024-07-31',
        progress: 0,
        status: '예정',
        priority: '높음',
        assignee: '검사관',
        category: '검사',
        siteId: 'sample-site-1',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Firestore에 데이터 추가
    const tasksCollection = collection(db, 'ganttTasks');
    
    for (const task of sampleTasks) {
      await addDoc(tasksCollection, task);
      console.log(`작업 추가됨: ${task.name}`);
    }

    console.log('공정표 샘플 데이터 추가가 완료되었습니다!');
    console.log('총', sampleTasks.length, '개의 작업이 추가되었습니다.');
    
  } catch (error) {
    console.error('공정표 샘플 데이터 추가 중 오류 발생:', error);
  }
};

// 스크립트 실행
if (typeof window !== 'undefined') {
  // 브라우저 환경에서 실행
  window.addGanttSampleData = addGanttSampleData;
} else {
  // Node.js 환경에서 실행
  addGanttSampleData();
}

export default addGanttSampleData; 