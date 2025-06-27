import { useNavigate } from 'react-router-dom';

function SiteInfoPopup({ site, onClose }) {
  const navigate = useNavigate();

  const handleDetailClick = () => {
    navigate(`/site-details/${site.id}`);
  };

  const handleProgressClick = () => {
    navigate(`/site-progress/${site.id}`);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#fff',
          padding: '20px',
          borderRadius: '8px',
          width: '400px',
          position: 'relative'
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            color: '#666'
          }}
        >
          ×
        </button>

        <h2 style={{ marginBottom: '20px' }}>{site.name}</h2>
        
        <div style={{ marginBottom: '15px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>회사명</div>
          <div>{site.company}</div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>소장명</div>
          <div>{site.manager}</div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>시공팀</div>
          <div>{site.constructionTeam}</div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={handleDetailClick}
            style={{
              padding: '8px 16px',
              backgroundColor: '#1976d2',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            세부현황
          </button>
          <button
            onClick={handleProgressClick}
            style={{
              padding: '8px 16px',
              backgroundColor: '#4caf50',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            기성현황
          </button>
        </div>
      </div>
    </div>
  );
}

export default SiteInfoPopup; 