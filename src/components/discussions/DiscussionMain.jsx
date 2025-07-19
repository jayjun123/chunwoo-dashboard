import React from 'react';

const DiscussionMain = () => {
  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#181a20', 
      color: 'white', 
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <h1 style={{ color: '#90caf9', marginBottom: '20px' }}>
        💬 토론의견
      </h1>
      <p style={{ marginBottom: '15px', fontSize: '18px' }}>
        토론의견 기능이 준비 중입니다.
      </p>
      <p style={{ color: '#888', fontSize: '14px' }}>
        곧 새로운 토론 기능으로 업데이트될 예정입니다.
      </p>
    </div>
  );
};

export default DiscussionMain; 