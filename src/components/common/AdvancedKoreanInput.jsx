import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  useIMEHandler, 
  usePWAKeyboardOptimization, 
  IMEUtils 
} from '../../utils/imeHandler';

/**
 * 고급 한글 IME 입력 컴포넌트
 * 
 * 기능:
 * - 실시간 조합 상태 표시
 * - 자동 완성 제안
 * - 입력 히스토리
 * - 모바일 키보드 최적화
 * - 에러 처리 및 복구
 */

const AdvancedKoreanInput = ({
  value = '',
  onChange,
  placeholder = '한글을 입력하세요...',
  maxLength,
  disabled = false,
  autoComplete = false,
  suggestions = [],
  onCompositionStart,
  onCompositionUpdate,
  onCompositionEnd,
  style = {},
  className = '',
  ...props
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [isComposing, setIsComposing] = useState(false);
  const [compositionText, setCompositionText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [inputHistory, setInputHistory] = useState([]);
  const [error, setError] = useState(null);
  
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  
  // IME 핸들러 적용
  useIMEHandler(inputRef);
  usePWAKeyboardOptimization();

  // 값 변경 시 상태 동기화
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // 자동 완성 제안 필터링
  useEffect(() => {
    if (autoComplete && suggestions.length > 0 && inputValue && !isComposing) {
      const filtered = suggestions.filter(suggestion =>
        suggestion.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredSuggestions(filtered.slice(0, 5)); // 최대 5개 제안
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }, [inputValue, suggestions, autoComplete, isComposing]);

  // Composition 이벤트 핸들러들
  const handleCompositionStart = useCallback((event) => {
    setIsComposing(true);
    setCompositionText(event.data || '');
    setError(null);
    
    // 조합 시작 시 시각적 피드백
    if (inputRef.current) {
      inputRef.current.style.borderColor = '#2196F3';
      inputRef.current.style.boxShadow = '0 0 0 2px rgba(33, 150, 243, 0.2)';
    }
    
    onCompositionStart?.(event);
  }, [onCompositionStart]);

  const handleCompositionUpdate = useCallback((event) => {
    setCompositionText(event.data || '');
    
    // 조합 중 시각적 피드백 업데이트
    if (inputRef.current) {
      inputRef.current.style.backgroundColor = 'rgba(33, 150, 243, 0.05)';
    }
    
    onCompositionUpdate?.(event);
  }, [onCompositionUpdate]);

  const handleCompositionEnd = useCallback((event) => {
    setIsComposing(false);
    setCompositionText('');
    
    // 조합 완료 시 스타일 복원
    if (inputRef.current) {
      inputRef.current.style.borderColor = '';
      inputRef.current.style.boxShadow = '';
      inputRef.current.style.backgroundColor = '';
    }
    
    // 입력 히스토리에 추가
    const finalText = event.data || '';
    if (finalText && !inputHistory.includes(finalText)) {
      setInputHistory(prev => [finalText, ...prev.slice(0, 9)]); // 최대 10개 유지
    }
    
    onCompositionEnd?.(event);
  }, [onCompositionEnd, inputHistory]);

  // 입력 값 변경 처리
  const handleInputChange = useCallback((event) => {
    const newValue = event.target.value;
    
    // 최대 길이 체크
    if (maxLength && newValue.length > maxLength) {
      setError(`최대 ${maxLength}자까지 입력 가능합니다.`);
      return;
    }
    
    setInputValue(newValue);
    setError(null);
    onChange?.(event);
  }, [onChange, maxLength]);

  // 제안 선택 처리
  const handleSuggestionSelect = useCallback((suggestion) => {
    setInputValue(suggestion);
    setShowSuggestions(false);
    setError(null);
    
    // onChange 이벤트 시뮬레이션
    const event = {
      target: { value: suggestion },
      type: 'change'
    };
    onChange?.(event);
    
    // 입력 필드에 포커스
    inputRef.current?.focus();
  }, [onChange]);

  // 히스토리 항목 선택
  const handleHistorySelect = useCallback((historyItem) => {
    setInputValue(historyItem);
    setError(null);
    
    const event = {
      target: { value: historyItem },
      type: 'change'
    };
    onChange?.(event);
    
    inputRef.current?.focus();
  }, [onChange]);

  // 조합 취소
  const handleCancelComposition = useCallback(() => {
    IMEUtils.cancelComposition();
    setIsComposing(false);
    setCompositionText('');
    setError('조합이 취소되었습니다.');
  }, []);

  // 키보드 이벤트 처리
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape' && isComposing) {
      event.preventDefault();
      handleCancelComposition();
    }
    
    // 화살표 키로 제안 네비게이션
    if (showSuggestions && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      // 제안 네비게이션 로직 구현 가능
    }
  }, [isComposing, showSuggestions, handleCancelComposition]);

  // 외부 클릭 시 제안 닫기
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`advanced-korean-input ${className}`} style={{ position: 'relative', ...style }}>
      {/* 메인 입력 필드 */}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onCompositionStart={handleCompositionStart}
        onCompositionUpdate={handleCompositionUpdate}
        onCompositionEnd={handleCompositionEnd}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        style={{
          width: '100%',
          padding: '12px 16px',
          fontSize: '16px',
          border: `2px solid ${error ? '#f44336' : isComposing ? '#2196F3' : '#ddd'}`,
          borderRadius: '8px',
          outline: 'none',
          transition: 'all 0.2s ease',
          backgroundColor: disabled ? '#f5f5f5' : 'white',
          ...style
        }}
        {...props}
      />

      {/* 조합 상태 표시 */}
      {isComposing && (
        <div style={{
          position: 'absolute',
          top: '-25px',
          left: '0',
          fontSize: '12px',
          color: '#2196F3',
          backgroundColor: 'rgba(33, 150, 243, 0.1)',
          padding: '2px 8px',
          borderRadius: '4px',
          border: '1px solid #2196F3'
        }}>
          조합 중: {compositionText}
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div style={{
          marginTop: '5px',
          fontSize: '12px',
          color: '#f44336',
          display: 'flex',
          alignItems: 'center',
          gap: '5px'
        }}>
          <span>⚠️</span>
          {error}
        </div>
      )}

      {/* 자동 완성 제안 */}
      {showSuggestions && (
        <div
          ref={suggestionsRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: '0',
            right: '0',
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            maxHeight: '200px',
            overflowY: 'auto'
          }}
        >
          {filteredSuggestions.map((suggestion, index) => (
            <div
              key={index}
              onClick={() => handleSuggestionSelect(suggestion)}
              style={{
                padding: '10px 16px',
                cursor: 'pointer',
                borderBottom: index < filteredSuggestions.length - 1 ? '1px solid #eee' : 'none',
                hover: {
                  backgroundColor: '#f5f5f5'
                }
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#f5f5f5';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'white';
              }}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}

      {/* 입력 히스토리 */}
      {inputHistory.length > 0 && !showSuggestions && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '0',
          right: '0',
          backgroundColor: 'white',
          border: '1px solid #ddd',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          maxHeight: '150px',
          overflowY: 'auto'
        }}>
          <div style={{
            padding: '8px 16px',
            fontSize: '12px',
            color: '#666',
            borderBottom: '1px solid #eee',
            backgroundColor: '#f9f9f9'
          }}>
            최근 입력
          </div>
          {inputHistory.map((historyItem, index) => (
            <div
              key={index}
              onClick={() => handleHistorySelect(historyItem)}
              style={{
                padding: '10px 16px',
                cursor: 'pointer',
                borderBottom: index < inputHistory.length - 1 ? '1px solid #eee' : 'none',
                fontSize: '14px'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#f5f5f5';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'white';
              }}
            >
              {historyItem}
            </div>
          ))}
        </div>
      )}

      {/* 제어 버튼들 */}
      <div style={{
        position: 'absolute',
        right: '8px',
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        gap: '5px'
      }}>
        {isComposing && (
          <button
            onClick={handleCancelComposition}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
            title="조합 취소"
          >
            ✕
          </button>
        )}
        {inputValue && (
          <button
            onClick={() => {
              setInputValue('');
              onChange?.({ target: { value: '' } });
            }}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              backgroundColor: '#999',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
            title="지우기"
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  );
};

export default AdvancedKoreanInput; 