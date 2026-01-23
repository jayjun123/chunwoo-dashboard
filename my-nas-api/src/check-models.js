// check-models.js
require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;

async function listModels() {
  if (!API_KEY) {
    console.error("❌ .env 파일에서 GEMINI_API_KEY를 찾을 수 없습니다.");
    return;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY.trim()}`;
  
  console.log(`🔍 모델 목록 조회 중... (URL: ${url.replace(API_KEY, 'API_KEY_HIDDEN')})`);

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      console.error(`❌ 에러 발생: ${response.status}`);
      console.error(JSON.stringify(data, null, 2));
      return;
    }

    console.log("✅ 사용 가능한 모델 목록:");
    if (data.models) {
      data.models.forEach(model => {
        // 'generateContent' 기능을 지원하는 모델만 출력
        if (model.supportedGenerationMethods && model.supportedGenerationMethods.includes("generateContent")) {
          console.log(` - ${model.name.replace('models/', '')} (${model.displayName})`);
        }
      });
    } else {
      console.log("모델을 찾을 수 없습니다.");
    }

  } catch (error) {
    console.error("❌ 통신 에러:", error.message);
  }
}

listModels();