import React, { useState } from 'react';
import KoreanInputExample from '../components/common/KoreanInputExample';
import AdvancedKoreanInput from '../components/common/AdvancedKoreanInput';

/**
 * IME Composition 처리 데모 페이지
 * 
 * 한글 입력 시 IME composition 이벤트가 어떻게 처리되는지
 * 실제로 확인할 수 있는 페이지입니다.
 */

const IMEDemo = () => {
  const [basicInput, setBasicInput] = useState('');
  const [advancedInput, setAdvancedInput] = useState('');
  const [textareaInput, setTextareaInput] = useState('');
  
  // 자동 완성 제안 목록
  const suggestions = [
    '안녕하세요',
    '안녕',
    '안녕하신가요',
    '안녕하시는지',
    '안녕하시는지요',
    '안녕하시는지 확인',
    '안녕하시는지 확인해보세요',
    '안녕하시는지 확인해보시겠어요',
    '안녕하시는지 확인해보시겠어요?',
    '안녕하시는지 확인해보시겠어요? 안녕하세요'
  ];

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '800px', 
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ 
        textAlign: 'center', 
        color: '#333',
        marginBottom: '30px',
        borderBottom: '3px solid #2196F3',
        paddingBottom: '10px'
      }}>
        🇰🇷 한글 IME Composition 처리 데모
      </h1>

      <div style={{ 
        backgroundColor: '#e3f2fd', 
        padding: '20px', 
        borderRadius: '10px',
        marginBottom: '30px',
        border: '1px solid #2196F3'
      }}>
        <h3 style={{ marginTop: 0, color: '#1976d2' }}>📚 IME Composition 이벤트란?</h3>
        <p style={{ lineHeight: '1.6', marginBottom: '15px' }}>
          한글 입력 시 자음과 모음이 조합되는 과정을 실시간으로 처리하는 이벤트입니다.
        </p>
        <div style={{ 
          backgroundColor: 'white', 
          padding: '15px', 
          borderRadius: '8px',
          border: '1px solid #ddd'
        }}>
          <h4 style={{ marginTop: 0, color: '#333' }}>예시: "한" 입력 과정</h4>
          <ol style={{ margin: 0, paddingLeft: '20px' }}>
            <li><strong>compositionstart</strong> → ㅎ (조합 시작)</li>
            <li><strong>compositionupdate</strong> → 하 (조합 중간)</li>
            <li><strong>compositionupdate</strong> → 한 (조합 중간)</li>
            <li><strong>compositionend</strong> → 한 (조합 완료)</li>
          </ol>
        </div>
      </div>

      {/* 기본 예시 컴포넌트 */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ 
          color: '#333', 
          borderLeft: '4px solid #4CAF50',
          paddingLeft: '15px'
        }}>
          🎯 기본 IME 처리 예시
        </h2>
        <KoreanInputExample />
      </div>

      {/* 고급 입력 컴포넌트 */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ 
          color: '#333', 
          borderLeft: '4px solid #FF9800',
          paddingLeft: '15px'
        }}>
          🚀 고급 한글 입력 컴포넌트
        </h2>
        
        <div style={{ 
          backgroundColor: '#fff3e0', 
          padding: '15px', 
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #ff9800'
        }}>
          <h4 style={{ marginTop: 0, color: '#e65100' }}>주요 기능</h4>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            <li>실시간 조합 상태 표시</li>
            <li>자동 완성 제안</li>
            <li>입력 히스토리</li>
            <li>모바일 키보드 최적화</li>
            <li>에러 처리 및 복구</li>
          </ul>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3>1️⃣ 기본 고급 입력</h3>
          <AdvancedKoreanInput
            value={basicInput}
            onChange={(e) => setBasicInput(e.target.value)}
            placeholder="한글을 입력해보세요..."
            style={{ marginBottom: '10px' }}
          />
          <p style={{ fontSize: '14px', color: '#666', margin: '5px 0' }}>
            입력된 값: <strong>{basicInput || '없음'}</strong>
          </p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3>2️⃣ 자동 완성 기능</h3>
          <AdvancedKoreanInput
            value={advancedInput}
            onChange={(e) => setAdvancedInput(e.target.value)}
            placeholder="'안녕'을 입력해보세요..."
            autoComplete={true}
            suggestions={suggestions}
            style={{ marginBottom: '10px' }}
          />
          <p style={{ fontSize: '14px', color: '#666', margin: '5px 0' }}>
            입력된 값: <strong>{advancedInput || '없음'}</strong>
          </p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3>3️⃣ 최대 길이 제한</h3>
          <AdvancedKoreanInput
            placeholder="최대 10자까지 입력 가능..."
            maxLength={10}
            style={{ marginBottom: '10px' }}
          />
          <p style={{ fontSize: '14px', color: '#666', margin: '5px 0' }}>
            최대 10자까지 입력 가능합니다.
          </p>
        </div>
      </div>

      {/* Textarea 예시 */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ 
          color: '#333', 
          borderLeft: '4px solid #9C27B0',
          paddingLeft: '15px'
        }}>
          📝 Textarea IME 처리
        </h2>
        
        <div style={{ 
          backgroundColor: '#f3e5f5', 
          padding: '15px', 
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #9c27b0'
        }}>
          <h4 style={{ marginTop: 0, color: '#7b1fa2' }}>여러 줄 입력에서의 IME 처리</h4>
          <p style={{ margin: 0, lineHeight: '1.6' }}>
            Textarea에서도 동일한 IME composition 이벤트가 발생하며, 
            여러 줄 입력 시에도 한글 조합이 정상적으로 처리됩니다.
          </p>
        </div>

        <textarea
          value={textareaInput}
          onChange={(e) => setTextareaInput(e.target.value)}
          placeholder="여러 줄 한글 입력을 테스트해보세요..."
          style={{
            width: '100%',
            minHeight: '120px',
            padding: '15px',
            fontSize: '16px',
            border: '2px solid #9C27B0',
            borderRadius: '8px',
            outline: 'none',
            resize: 'vertical',
            fontFamily: 'inherit',
            lineHeight: '1.5'
          }}
        />
        <p style={{ fontSize: '14px', color: '#666', margin: '5px 0' }}>
          입력된 줄 수: <strong>{textareaInput.split('\n').length}</strong>줄
        </p>
      </div>

      {/* 모바일 최적화 정보 */}
      <div style={{ 
        backgroundColor: '#e8f5e8', 
        padding: '20px', 
        borderRadius: '10px',
        marginBottom: '30px',
        border: '1px solid #4caf50'
      }}>
        <h3 style={{ marginTop: 0, color: '#2e7d32' }}>📱 모바일 최적화</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
          <div>
            <h4 style={{ color: '#388e3c' }}>키보드 처리</h4>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>키보드 높이 자동 감지</li>
              <li>뷰포트 자동 조정</li>
              <li>입력 필드 중앙 정렬</li>
            </ul>
          </div>
          <div>
            <h4 style={{ color: '#388e3c' }}>성능 최적화</h4>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>커서 위치 고정</li>
              <li>조합 중 튐 방지</li>
              <li>메모리 누수 방지</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 사용법 가이드 */}
      <div style={{ 
        backgroundColor: '#fafafa', 
        padding: '20px', 
        borderRadius: '10px',
        border: '1px solid #ddd'
      }}>
        <h3 style={{ marginTop: 0, color: '#333' }}>📖 사용법 가이드</h3>
        
        <div style={{ marginBottom: '20px' }}>
          <h4>1. 기본 사용법</h4>
          <pre style={{ 
            backgroundColor: '#f5f5f5', 
            padding: '15px', 
            borderRadius: '5px',
            overflow: 'auto',
            fontSize: '14px'
          }}>
{`import { useIMEHandler } from '../utils/imeHandler';

const MyComponent = () => {
  const inputRef = useRef(null);
  useIMEHandler(inputRef);
  
  return (
    <input
      ref={inputRef}
      onCompositionStart={(e) => console.log('조합 시작:', e.data)}
      onCompositionUpdate={(e) => console.log('조합 중:', e.data)}
      onCompositionEnd={(e) => console.log('조합 완료:', e.data)}
    />
  );
};`}
          </pre>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h4>2. 고급 컴포넌트 사용법</h4>
          <pre style={{ 
            backgroundColor: '#f5f5f5', 
            padding: '15px', 
            borderRadius: '5px',
            overflow: 'auto',
            fontSize: '14px'
          }}>
{`import AdvancedKoreanInput from '../components/common/AdvancedKoreanInput';

const MyComponent = () => {
  const [value, setValue] = useState('');
  
  return (
    <AdvancedKoreanInput
      value={value}
      onChange={(e) => setValue(e.target.value)}
      autoComplete={true}
      suggestions={['안녕하세요', '안녕']}
      maxLength={50}
    />
  );
};`}
          </pre>
        </div>

        <div>
          <h4>3. 유틸리티 함수 사용법</h4>
          <pre style={{ 
            backgroundColor: '#f5f5f5', 
            padding: '15px', 
            borderRadius: '5px',
            overflow: 'auto',
            fontSize: '14px'
          }}>
{`import { IMEUtils } from '../utils/imeHandler';

// 현재 IME 상태 확인
const state = IMEUtils.getIMEState();

// 수동으로 조합 취소
IMEUtils.cancelComposition();

// 뷰포트 조정
IMEUtils.adjustViewport();`}
          </pre>
        </div>
      </div>

      {/* 푸터 */}
      <div style={{ 
        textAlign: 'center', 
        marginTop: '40px', 
        padding: '20px',
        borderTop: '1px solid #eee',
        color: '#666'
      }}>
        <p>🇰🇷 한글 IME Composition 처리 데모 페이지</p>
        <p style={{ fontSize: '14px' }}>
          이 페이지는 한글 입력 시 IME composition 이벤트가 어떻게 처리되는지 
          실제로 확인할 수 있도록 만들어졌습니다.
        </p>
      </div>
    </div>
  );
};

export default IMEDemo; 