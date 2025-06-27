// 기존 기성(gisung) 데이터의 siteId를 siteName 기준으로 sites 컬렉션의 id로 일괄 변경하는 스크립트
// Node.js 환경에서 실행 (firebase-admin 필요)

const admin = require('firebase-admin');
const serviceAccount = require('../firebaseServiceAccountKey.json'); // 서비스 계정 키 필요

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateGisungSiteId() {
  const sitesSnap = await db.collection('sites').get();
  const sites = {};
  sitesSnap.forEach(doc => {
    const data = doc.data();
    sites[data.name] = doc.id;
  });

  const gisungSnap = await db.collection('gisung').get();
  const batch = db.batch();
  let count = 0;
  gisungSnap.forEach(doc => {
    const data = doc.data();
    if (data.siteName && sites[data.siteName]) {
      batch.update(doc.ref, { siteId: sites[data.siteName] });
      count++;
    }
  });
  if (count > 0) {
    await batch.commit();
    console.log(`siteId 마이그레이션 완료! (${count}건)`);
  } else {
    console.log('수정할 데이터가 없습니다.');
  }
}

migrateGisungSiteId(); 