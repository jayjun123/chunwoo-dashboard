import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const PopupContext = createContext();

export const usePopup = () => {
  const context = useContext(PopupContext);
  if (!context) {
    throw new Error('usePopup must be used within a PopupProvider');
  }
  return context;
};

const PopupProvider = ({ children }) => {
  const [activePopups, setActivePopups] = useState([]);
  const popupRefs = useRef(new Map());

  // 팝업 등록
  const registerPopup = useCallback((id, priority = 0, element = null) => {
    setActivePopups(prev => {
      const existing = prev.find(p => p.id === id);
      if (existing) {
        return prev.map(p => p.id === id ? { ...p, priority, element } : p);
      }
      return [...prev, { id, priority, element }].sort((a, b) => b.priority - a.priority);
    });
    
    if (element) {
      popupRefs.current.set(id, element);
    }
  }, []);

  // 팝업 해제
  const unregisterPopup = useCallback((id) => {
    setActivePopups(prev => prev.filter(p => p.id !== id));
    popupRefs.current.delete(id);
  }, []);

  // 외부 클릭 처리
  const handleOutsideClick = (event) => {
    // 활성화된 팝업이 없으면 무시
    if (activePopups.length === 0) return;

    // 클릭된 요소가 어떤 팝업에 속하는지 확인
    let clickedPopup = null;
    for (const popup of activePopups) {
      const element = popupRefs.current.get(popup.id);
      if (element && element.contains(event.target)) {
        clickedPopup = popup;
        break;
      }
    }

    // 클릭된 요소가 팝업 외부라면
    if (!clickedPopup) {
      // 가장 높은 우선순위의 팝업을 닫음
      const topPopup = activePopups[0];
      if (topPopup && topPopup.element) {
        // 팝업의 onClose 함수가 있다면 호출
        if (topPopup.element.onClose) {
          topPopup.element.onClose();
        }
        // 팝업 해제
        unregisterPopup(topPopup.id);
      }
    }
  };

  // ESC 키 처리
  const handleKeyDown = (event) => {
    if (event.key === 'Escape' && activePopups.length > 0) {
      const topPopup = activePopups[0];
      if (topPopup && topPopup.element) {
        if (topPopup.element.onClose) {
          topPopup.element.onClose();
        }
        unregisterPopup(topPopup.id);
      }
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activePopups]);

  const value = {
    registerPopup,
    unregisterPopup,
    activePopups,
  };

  return (
    <PopupContext.Provider value={value}>
      {children}
    </PopupContext.Provider>
  );
};

export default PopupProvider; 