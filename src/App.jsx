function App() {
  return (
    <div style={{
      backgroundColor: '#1a1a1a',
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '2rem',
      color: '#ffffff'
    }}>
      <h1 style={{
        color: '#ffffff',
        marginBottom: '2rem',
        textShadow: '0 0 10px rgba(255,255,255,0.3)'
      }}>
        Chunwoo Dashboard
      </h1>
      <div style={{
        backgroundColor: '#2d2d2d',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '800px'
      }}>
        {/* 여기에 대시보드 컨텐츠가 들어갈 예정입니다 */}
      </div>
    </div>
  )
}

export default App
