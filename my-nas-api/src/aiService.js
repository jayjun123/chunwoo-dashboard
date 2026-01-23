const GEMINI_API_KEY = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '';
// 모델명을 1.5-flash 대신 더 안정적인 gemini-pro를 기본값으로 설정합니다.
const GEMINI_MODEL = (process.env.GEMINI_MODEL || 'gemini-pro').trim();

const buildPrompt = (text) => ({
  contents: [
    {
      role: 'user',
      parts: [
        {
          text: `
너는 한국어 메일 분류/요약기다. 
결과는 반드시 아래의 JSON 스키마 형식을 따르는 순수한 JSON 데이터로만 반환하라. 
다른 설명이나 앞뒤 인사말은 절대 포함하지 마라.

분류 라벨: "업무", "광고", "개인", "기타"
중요도: "high", "medium", "low"

출력 JSON 스키마:
{
  "summary": "메일의 핵심 내용을 1~2문장으로 요약",
  "ai_classification": "업무|광고|개인|기타",
  "importance": "high|medium|low"
}

메일 본문:
${text}
          `.trim()
        }
      ]
    }
  ],
  generationConfig: {
    temperature: 0.1
  }
});

const safeParseJson = (value) => {
  if (!value) return null;
  try {
    const cleanJson = value.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    return null;
  }
};

const summarizeAndClassify = async (text) => {
  if (!GEMINI_API_KEY) return { summary: '', ai_classification: '기타', importance: 'medium' };

  try {
    // 가장 범용적인 v1beta 엔드포인트를 사용합니다.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPrompt(text))
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // 404가 다시 발생하면 터미널에 상세 주소를 찍어 확인합니다.
      throw new Error(`Gemini API 오류: ${response.status} (URL: ${url})`);
    }

    const data = await response.json();
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = safeParseJson(content);

    return {
      summary: parsed?.summary || '요약 내용 없음',
      ai_classification: parsed?.ai_classification || '기타',
      importance: parsed?.importance || 'medium'
    };
  } catch (error) {
    console.error('AI 요약 실패:', error.message);
    return { summary: '요약 실패', ai_classification: '기타', importance: 'low' };
  }
};

module.exports = { summarizeAndClassify };