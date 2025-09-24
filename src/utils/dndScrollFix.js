/**
 * react-beautiful-dnd 중첩 스크롤 컨테이너 문제 해결 유틸리티
 */

/**
 * 중첩 스크롤 컨테이너 문제를 해결하는 함수
 * Droppable 컴포넌트에서 중첩된 스크롤 컨테이너를 감지하고 해결
 */
export const fixNestedScrollContainers = () => {
  try {
    console.log('🔧 react-beautiful-dnd 중첩 스크롤 컨테이너 문제 해결 시작');
    
    // 모든 Droppable 컨테이너 찾기
    const droppableContainers = document.querySelectorAll('[data-rbd-droppable-id]');
    let fixedCount = 0;
    
    droppableContainers.forEach(container => {
      // 부모 요소들 중 스크롤 가능한 요소 찾기
      const scrollableParents = [];
      let parent = container.parentElement;
      
      while (parent && parent !== document.body) {
        const computedStyle = window.getComputedStyle(parent);
        const overflow = computedStyle.overflow;
        const overflowY = computedStyle.overflowY;
        const overflowX = computedStyle.overflowX;
        
        // 스크롤 가능한 부모 요소 감지
        if (overflow === 'auto' || overflow === 'scroll' || 
            overflowY === 'auto' || overflowY === 'scroll' ||
            overflowX === 'auto' || overflowX === 'scroll') {
          scrollableParents.push(parent);
        }
        
        parent = parent.parentElement;
      }
      
      // 중첩된 스크롤 컨테이너가 있는 경우 해결
      if (scrollableParents.length > 1) {
        console.log(`🔧 중첩 스크롤 컨테이너 발견: ${scrollableParents.length}개`);
        
        // 가장 가까운 스크롤 컨테이너만 유지하고 나머지는 스크롤 비활성화
        const closestScrollable = scrollableParents[0];
        
        scrollableParents.slice(1).forEach(parent => {
          // 임시로 스크롤 비활성화
          parent.style.overflow = 'hidden';
          parent.style.overflowY = 'hidden';
          parent.style.overflowX = 'hidden';
          
          // 데이터 속성으로 원래 스타일 저장
          parent.setAttribute('data-original-overflow', parent.style.overflow);
          parent.setAttribute('data-original-overflow-y', parent.style.overflowY);
          parent.setAttribute('data-original-overflow-x', parent.style.overflowX);
          
          console.log(`🔧 스크롤 비활성화: ${parent.tagName} (${parent.className})`);
        });
        
        // 가장 가까운 스크롤 컨테이너는 유지
        closestScrollable.style.overflow = 'auto';
        closestScrollable.style.overflowY = 'auto';
        
        fixedCount++;
      }
    });
    
    console.log(`✅ 중첩 스크롤 컨테이너 문제 해결 완료: ${fixedCount}개 컨테이너 수정`);
    
  } catch (error) {
    console.warn('⚠️ 중첩 스크롤 컨테이너 문제 해결 중 오류:', error.message);
  }
};

/**
 * 스크롤 컨테이너 스타일 복원 함수
 * 드래그 앤 드롭 완료 후 원래 스타일로 복원
 */
export const restoreScrollContainers = () => {
  try {
    console.log('🔧 스크롤 컨테이너 스타일 복원 시작');
    
    const modifiedContainers = document.querySelectorAll('[data-original-overflow]');
    let restoredCount = 0;
    
    modifiedContainers.forEach(container => {
      const originalOverflow = container.getAttribute('data-original-overflow');
      const originalOverflowY = container.getAttribute('data-original-overflow-y');
      const originalOverflowX = container.getAttribute('data-original-overflow-x');
      
      if (originalOverflow) {
        container.style.overflow = originalOverflow;
        container.removeAttribute('data-original-overflow');
      }
      
      if (originalOverflowY) {
        container.style.overflowY = originalOverflowY;
        container.removeAttribute('data-original-overflow-y');
      }
      
      if (originalOverflowX) {
        container.style.overflowX = originalOverflowX;
        container.removeAttribute('data-original-overflow-x');
      }
      
      restoredCount++;
    });
    
    console.log(`✅ 스크롤 컨테이너 스타일 복원 완료: ${restoredCount}개 컨테이너 복원`);
    
  } catch (error) {
    console.warn('⚠️ 스크롤 컨테이너 스타일 복원 중 오류:', error.message);
  }
};

/**
 * DragDropContext에서 사용할 수 있는 이벤트 핸들러
 */
export const createDndEventHandlers = () => {
  return {
    onDragStart: () => {
      console.log('🚀 드래그 시작 - 중첩 스크롤 컨테이너 문제 해결');
      fixNestedScrollContainers();
    },
    
    onDragEnd: () => {
      console.log('🏁 드래그 종료 - 스크롤 컨테이너 스타일 복원');
      // 약간의 지연 후 복원 (드래그 애니메이션 완료 대기)
      setTimeout(() => {
        restoreScrollContainers();
      }, 300);
    }
  };
};

/**
 * Droppable 컴포넌트에 적용할 수 있는 공통 props
 */
export const getDroppableProps = () => {
  return {
    isDropDisabled: false,
    // 중첩 스크롤 컨테이너 문제 해결을 위한 추가 속성
    ignoreContainerClipping: false,
    isCombineEnabled: false
  };
};

/**
 * 자동으로 중첩 스크롤 컨테이너 문제를 해결하는 훅
 */
export const useDndScrollFix = () => {
  const [isDragging, setIsDragging] = React.useState(false);
  
  const handleDragStart = () => {
    setIsDragging(true);
    fixNestedScrollContainers();
  };
  
  const handleDragEnd = () => {
    setIsDragging(false);
    setTimeout(() => {
      restoreScrollContainers();
    }, 300);
  };
  
  return {
    isDragging,
    handleDragStart,
    handleDragEnd
  };
};


