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
        console.log('⚠️ 중첩 스크롤 컨테이너 감지:', {
          droppableId: container.getAttribute('data-rbd-droppable-id'),
          scrollableParents: scrollableParents.length
        });
        
        // 가장 가까운 스크롤 컨테이너만 유지하고 나머지는 스크롤 비활성화
        const closestScrollParent = scrollableParents[0];
        
        scrollableParents.slice(1).forEach(parent => {
          // 임시로 스크롤 비활성화
          parent.style.overflow = 'hidden';
          parent.setAttribute('data-dnd-scroll-disabled', 'true');
          fixedCount++;
        });
        
        // Droppable 컨테이너에 스크롤 속성 추가
        if (!container.style.overflow) {
          container.style.overflow = 'auto';
          container.style.maxHeight = '100%';
        }
      }
    });
    
    console.log(`✅ 중첩 스크롤 컨테이너 문제 해결 완료: ${fixedCount}개 컨테이너 수정`);
    return fixedCount;
  } catch (error) {
    console.error('❌ 중첩 스크롤 컨테이너 문제 해결 실패:', error);
    return 0;
  }
};

/**
 * 스크롤 컨테이너 복원 함수
 * 컴포넌트 언마운트 시 원래 스크롤 상태로 복원
 */
export const restoreScrollContainers = () => {
  try {
    console.log('🔧 스크롤 컨테이너 복원 시작');
    
    const disabledContainers = document.querySelectorAll('[data-dnd-scroll-disabled="true"]');
    let restoredCount = 0;
    
    disabledContainers.forEach(container => {
      // 원래 스크롤 속성 복원
      container.style.overflow = '';
      container.removeAttribute('data-dnd-scroll-disabled');
      restoredCount++;
    });
    
    console.log(`✅ 스크롤 컨테이너 복원 완료: ${restoredCount}개 컨테이너 복원`);
    return restoredCount;
  } catch (error) {
    console.error('❌ 스크롤 컨테이너 복원 실패:', error);
    return 0;
  }
};

/**
 * Droppable 컴포넌트용 스타일 개선
 * 중첩 스크롤 문제를 방지하는 스타일 적용
 */
export const getDroppableStyles = (isDraggingOver = false) => ({
  flex: 1,
  overflow: 'auto',
  maxHeight: '100%',
  position: 'relative',
  backgroundColor: isDraggingOver ? '#2a2b32' : '#23242a',
  // 스크롤바 스타일링
  scrollbarWidth: 'thin',
  scrollbarColor: '#4a5568 #2d3748',
  '&::-webkit-scrollbar': {
    width: '8px'
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: '#2d3748',
    borderRadius: '4px'
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: '#4a5568',
    borderRadius: '4px',
    '&:hover': {
      backgroundColor: '#718096'
    }
  }
});

/**
 * 자동 스크롤 컨테이너 문제 해결
 * 컴포넌트 마운트 시 자동으로 실행
 */
export const autoFixScrollContainers = () => {
  // DOM이 준비된 후 실행
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixNestedScrollContainers);
  } else {
    fixNestedScrollContainers();
  }
  
  // 페이지 언로드 시 복원
  window.addEventListener('beforeunload', restoreScrollContainers);
};