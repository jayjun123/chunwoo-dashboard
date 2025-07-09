import React from 'react';

const App = () => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#181A20',
      color: '#fff',
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1>천우현장관리</h1>
        <p>Netlify 배포 테스트 성공!</p>
        <p>빌드가 정상적으로 완료되었습니다.</p>
      </div>
    </div>
  );
};

export default App; 