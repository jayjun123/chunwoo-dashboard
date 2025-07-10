import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const KeyboardManager = () => {
  const location = useLocation();
  const viewportRef = useRef(null);

  useEffect(() => {
    const handleViewportResize = () => {
      // 모바일에서 키보드가 올라올 때 뷰포트 조정
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        // 키보드가 올라왔을 때 뷰포트 높이 조정
        const visualViewport = window.visualViewport;
        if (visualViewport) {
          const height = visualViewport.height;
          const scale = visualViewport.scale;
          
          // 키보드가 올라왔는지 감지
          const isKeyboardVisible = height < window.innerHeight * 0.8;
          
          if (isKeyboardVisible) {
            // 키보드가 올라왔을 때 뷰포트 조정
            viewport.setAttribute('content', 
              `width=device-width, initial-scale=${scale}, maximum-scale=${scale}, minimum-scale=${scale}, user-scalable=no, viewport-fit=cover, height=${height}px`
            );
          } else {
            // 키보드가 내려갔을 때 원래 뷰포트로 복원
            viewport.setAttribute('content', 
              'width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover'
            );
          }
        }
      }
    };

    const handleFocusIn = (event) => {
      // 입력 필드에 포커스가 들어왔을 때
      const target = event.target;
      
      // 입력 필드가 화면 하단에 있는지 확인
      const rect = target.getBoundingClientRect();
      const isNearBottom = rect.bottom > window.innerHeight * 0.7;
      
      if (isNearBottom) {
        // 입력 필드가 화면 하단에 있으면 스크롤 조정
        setTimeout(() => {
          target.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
        }, 300);
      }
    };

    const handleFocusOut = () => {
      // 입력 필드에서 포커스가 나갔을 때 뷰포트 복원
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 
          'width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover'
        );
      }
    };

    const handleResize = () => {
      // 화면 크기 변경 시 뷰포트 조정
      handleViewportResize();
    };

    // visualViewport API 지원 확인
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize);
    }

    // 이벤트 리스너 등록
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    window.addEventListener('resize', handleResize);

    // 초기 뷰포트 설정
    handleViewportResize();

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportResize);
      }
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      window.removeEventListener('resize', handleResize);
    };
  }, [location.pathname]);

  // 입력 필드 자동 완성 방지
  useEffect(() => {
    const preventAutocomplete = (event) => {
      const target = event.target;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // 자동 완성 속성 설정
        if (!target.hasAttribute('autocomplete')) {
          target.setAttribute('autocomplete', 'off');
        }
        
        // 자동 대문자 변환 방지
        if (target.type === 'text' || target.type === 'email') {
          target.style.textTransform = 'none';
        }
      }
    };

    // 모든 입력 필드에 이벤트 리스너 추가
    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(input => {
      preventAutocomplete({ target: input });
    });

    // 동적으로 추가되는 입력 필드 감지
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const inputs = node.querySelectorAll ? node.querySelectorAll('input, textarea') : [];
            inputs.forEach(input => {
              preventAutocomplete({ target: input });
            });
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return null; // 이 컴포넌트는 UI를 렌더링하지 않음
};

export default KeyboardManager; 