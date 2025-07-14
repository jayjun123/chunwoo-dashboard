import React, { useState, useRef } from 'react';
import { 
  useIMEHandler, 
  usePWAKeyboardOptimization, 
  OptimizedInput,
  IMEUtils 
} from '../../utils/imeHandler';

/**
 * 한글 IME Composition 처리 예시 컴포넌트
 * 
 * 사용자가 "ㅎ + ㅏ + ㄴ"을 입력하는 동안:
 * - compositionstart → ㅎ
 * - compositionupdate → 하  
 * - compositionupdate → 한
 * - compositionend → 한 입력 완료
 */

const KoreanInputExample = () => {
  const [inputValue, setInputValue] = useState('');
  const [compositionStatus, setCompositionStatus] = useState('');
  const [imeState, setImeState] = useState({});
  
  const inputRef = useRef(null);
  const textareaRef = useRef(null);
  
  // IME 핸들러 적용
  useIMEHandler(inputRef);
  useIMEHandler(textareaRef);
  usePWAKeyboardOptimization();

  // Composition 이벤트 핸들러들
  const handleCompositionStart = (event) => {
    console.log('🎯 Composition Start:', event.data);
    setCompositionStatus('조합 시작: ' + (event.data || ''));
    
    // IME 상태 업데이트
    setTimeout(() => {
      setImeState(IMEUtils.getIMEState());
    }, 100);
  };

  const handleCompositionUpdate = (event) => {
    console.log('🔄 Composition Update:', event.data);
    setCompositionStatus('조합 중: ' + (event.data || ''));
    
    // 실시간 IME 상태 업데이트
    setImeState(IMEUtils.getIMEState());
  };

  const handleCompositionEnd = (event) => {
    console.log('✅ Composition End:', event.data);
    setCompositionStatus('조합 완료: ' + (event.data || ''));
    
    // 최종 IME 상태 업데이트
    setTimeout(() => {
      setImeState(IMEUtils.getIMEState());
    }, 100);
  };

  // 수동 조합 취소
  const handleCancelComposition = () => {
    IMEUtils.cancelComposition();
    setCompositionStatus('조합 취소됨');
  };

  // 뷰포트 수동 조정
  const handleAdjustViewport = () => {
    IMEUtils.adjustViewport();
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>🇰🇷 한글 IME Composition 처리 예시</h2>
      
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h3>📝 사용법</h3>
        <p>한글을 입력해보세요: <strong>ㅎ + ㅏ + ㄴ → 한</strong></p>
        <p>조합 과정이 실시간으로 표시됩니다.</p>
      </div>

      {/* 기본 Input 예시 */}
      <div style={{ marginBottom: '20px' }}>
        <h3>1️⃣ 기본 Input (useIMEHandler 사용)</h3>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onCompositionStart={handleCompositionStart}
          onCompositionUpdate={handleCompositionUpdate}
          onCompositionEnd={handleCompositionEnd}
          placeholder="한글을 입력해보세요..."
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '16px',
            border: '2px solid #ddd',
            borderRadius: '8px',
            outline: 'none'
          }}
        />
      </div>

      {/* OptimizedInput 예시 */}
      <div style={{ marginBottom: '20px' }}>
        <h3>2️⃣ OptimizedInput 컴포넌트</h3>
        <OptimizedInput
          type="text"
          placeholder="최적화된 한글 입력..."
          onCompositionStart={handleCompositionStart}
          onCompositionUpdate={handleCompositionUpdate}
          onCompositionEnd={handleCompositionEnd}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '16px',
            border: '2px solid #4CAF50',
            borderRadius: '8px',
            outline: 'none'
          }}
        />
      </div>

      {/* Textarea 예시 */}
      <div style={{ marginBottom: '20px' }}>
        <h3>3️⃣ Textarea (여러 줄 입력)</h3>
        <textarea
          ref={textareaRef}
          onCompositionStart={handleCompositionStart}
          onCompositionUpdate={handleCompositionUpdate}
          onCompositionEnd={handleCompositionEnd}
          placeholder="여러 줄 한글 입력..."
          style={{
            width: '100%',
            minHeight: '100px',
            padding: '12px',
            fontSize: '16px',
            border: '2px solid #2196F3',
            borderRadius: '8px',
            outline: 'none',
            resize: 'vertical'
          }}
        />
      </div>

      {/* 상태 표시 */}
      <div style={{ marginBottom: '20px' }}>
        <h3>📊 IME 상태 정보</h3>
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#e3f2fd', 
          borderRadius: '8px',
          fontFamily: 'monospace'
        }}>
          <p><strong>조합 상태:</strong> {compositionStatus || '대기 중'}</p>
          <p><strong>조합 중:</strong> {imeState.isComposing ? '✅ 예' : '❌ 아니오'}</p>
          <p><strong>한글 입력:</strong> {imeState.isKoreanInput ? '✅ 예' : '❌ 아니오'}</p>
          <p><strong>커서 위치:</strong> {imeState.lastCursorPosition || 0}</p>
          <p><strong>조합 텍스트:</strong> {imeState.compositionText || '없음'}</p>
        </div>
      </div>

      {/* 제어 버튼들 */}
      <div style={{ marginBottom: '20px' }}>
        <h3>🎮 제어 버튼</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleCancelComposition}
            style={{
              padding: '10px 15px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            조합 취소
          </button>
          <button
            onClick={handleAdjustViewport}
            style={{
              padding: '10px 15px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            뷰포트 조정
          </button>
          <button
            onClick={() => IMEUtils.restoreViewport()}
            style={{
              padding: '10px 15px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            뷰포트 복원
          </button>
        </div>
      </div>

      {/* 이벤트 설명 */}
      <div style={{ 
        padding: '15px', 
        backgroundColor: '#fff3e0', 
        borderRadius: '8px',
        border: '1px solid #ff9800'
      }}>
        <h3>📚 Composition 이벤트 설명</h3>
        <ul style={{ margin: '0', paddingLeft: '20px' }}>
          <li><strong>compositionstart:</strong> 자음/모음 조합 시작 시 발생</li>
          <li><strong>compositionupdate:</strong> 조합 중간 글자가 바뀔 때 발생</li>
          <li><strong>compositionend:</strong> 조합 완료 후 최종 글자가 확정될 때 발생</li>
        </ul>
        <p style={{ marginTop: '10px', marginBottom: '0', fontSize: '14px', color: '#666' }}>
          예: "ㅎ + ㅏ + ㄴ" 입력 시 → start(ㅎ) → update(하) → update(한) → end(한)
        </p>
      </div>
    </div>
  );
};

export default KoreanInputExample; 