// Firebase Storage에 템플릿 파일들 다시 업로드
import { getStorage, ref, uploadBytes, deleteObject, listAll } from 'firebase/storage';
import { storage } from './src/firebase.js';

const reuploadTemplates = async () => {
  try {
    console.log('🚀 Firebase Storage 템플릿 파일 재업로드 시작...');
    
    // 1. 기존 템플릿 파일들 삭제
    console.log('🗑️ 기존 템플릿 파일들 삭제 중...');
    const templatesRef = ref(storage, 'templates');
    const existingTemplates = await listAll(templatesRef);
    
    for (const item of existingTemplates.items) {
      try {
        await deleteObject(item);
        console.log(`✅ ${item.name} 삭제 완료`);
      } catch (error) {
        console.log(`⚠️ ${item.name} 삭제 실패 (이미 없음):`, error.message);
      }
    }
    
    // 2. NEWgisung.xlsx 업로드
    console.log('📤 NEWgisung.xlsx 업로드 중...');
    const newGisungResponse = await fetch('/NEWgisung.xlsx');
    if (!newGisungResponse.ok) {
      throw new Error('NEWgisung.xlsx 파일을 찾을 수 없습니다.');
    }
    const newGisungBuffer = await newGisungResponse.arrayBuffer();
    const newGisungRef = ref(storage, 'templates/NEWgisung.xlsx');
    await uploadBytes(newGisungRef, newGisungBuffer);
    console.log('✅ NEWgisung.xlsx 업로드 완료');
    
    // 3. LONGgisung.xlsx 업로드
    console.log('📤 LONGgisung.xlsx 업로드 중...');
    const longGisungResponse = await fetch('/LONGgisung.xlsx');
    if (!longGisungResponse.ok) {
      throw new Error('LONGgisung.xlsx 파일을 찾을 수 없습니다.');
    }
    const longGisungBuffer = await longGisungResponse.arrayBuffer();
    const longGisungRef = ref(storage, 'templates/LONGgisung.xlsx');
    await uploadBytes(longGisungRef, longGisungBuffer);
    console.log('✅ LONGgisung.xlsx 업로드 완료');
    
    // 4. 업로드된 파일들 확인
    console.log('🔍 업로드된 파일들 확인 중...');
    const uploadedTemplates = await listAll(templatesRef);
    console.log('📁 templates 폴더 내용:');
    uploadedTemplates.items.forEach(item => {
      console.log(`- ${item.name}`);
    });
    
    console.log('\n🎉 템플릿 파일 재업로드 완료!');
    alert('템플릿 파일 재업로드가 완료되었습니다!');
    
  } catch (error) {
    console.error('❌ 템플릿 재업로드 실패:', error);
    alert(`템플릿 재업로드 실패: ${error.message}`);
  }
};

// 전역 함수로 등록
window.reuploadTemplates = reuploadTemplates;

console.log('✅ 템플릿 재업로드 스크립트 로드 완료');
console.log('🚀 브라우저 콘솔에서 다음 명령어를 실행하세요:');
console.log('reuploadTemplates()');

