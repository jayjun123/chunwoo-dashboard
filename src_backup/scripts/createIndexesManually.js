// Firebase Console에서 수동으로 인덱스 생성하는 가이드
// 이 스크립트는 인덱스 생성 과정을 단계별로 안내합니다.

console.log('🔥 Firebase Firestore 인덱스 생성 가이드');
console.log('=====================================');

const indexes = [
  {
    name: 'progress 컬렉션 인덱스',
    collection: 'progress',
    fields: [
      { path: 'siteId', order: 'Ascending' },
      { path: 'date', order: 'Ascending' }
    ],
    description: '현장별 기간별 기성 현황 조회용',
    steps: [
      '1. Firebase Console에서 "Create Index" 클릭',
      '2. Collection ID에 "progress" 입력',
      '3. 첫 번째 필드: siteId (Ascending)',
      '4. 두 번째 필드: date (Ascending)',
      '5. "Create" 클릭'
    ]
  },
  {
    name: 'discussions 컬렉션 인덱스 (방 목록)',
    collection: 'discussions',
    fields: [
      { path: 'type', order: 'Ascending' },
      { path: 'timestamp', order: 'Descending' }
    ],
    description: '협의방 목록 조회용 (최신순)',
    steps: [
      '1. Firebase Console에서 "Create Index" 클릭',
      '2. Collection ID에 "discussions" 입력',
      '3. 첫 번째 필드: type (Ascending)',
      '4. 두 번째 필드: timestamp (Descending)',
      '5. "Create" 클릭'
    ]
  },
  {
    name: 'discussions 컬렉션 인덱스 (메시지)',
    collection: 'discussions',
    fields: [
      { path: 'roomId', order: 'Ascending' },
      { path: 'timestamp', order: 'Ascending' }
    ],
    description: '협의방 메시지 조회용 (시간순)',
    steps: [
      '1. Firebase Console에서 "Create Index" 클릭',
      '2. Collection ID에 "discussions" 입력',
      '3. 첫 번째 필드: roomId (Ascending)',
      '4. 두 번째 필드: timestamp (Ascending)',
      '5. "Create" 클릭'
    ]
  }
];

console.log('\n📋 생성할 인덱스 목록:');
indexes.forEach((index, i) => {
  console.log(`\n${i + 1}. ${index.name}`);
  console.log(`   컬렉션: ${index.collection}`);
  console.log(`   필드: ${index.fields.map(f => `${f.path} (${f.order})`).join(' + ')}`);
  console.log(`   설명: ${index.description}`);
  console.log('   단계:');
  index.steps.forEach(step => console.log(`   ${step}`));
});

console.log('\n🌐 Firebase Console 링크:');
console.log('https://console.firebase.google.com/v1/r/project/chunwooo-edf9f/firestore/indexes');

console.log('\n⏱️ 인덱스 생성 시간:');
console.log('- 각 인덱스당 1-5분 소요');
console.log('- 상태가 "Building"에서 "Enabled"로 변경될 때까지 대기');

console.log('\n✅ 완료 후 확인:');
console.log('- 앱에서 보고서 기능 정상 작동');
console.log('- 성능 최적화 알림 사라짐');
console.log('- 실시간 데이터 업데이트 최적화');

console.log('\n🚀 시작하기:');
console.log('위의 Firebase Console 링크를 클릭하여 인덱스 생성을 시작하세요!'); 