import { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ko } from 'date-fns/locale';

function AdvancedSearch({ onSearch, onReset }) {
  const [searchParams, setSearchParams] = useState({
    siteName: '',
    company: '',
    manager: '',
    startDate: null,
    endDate: null
  });

  const handleSearch = () => {
    onSearch(searchParams);
  };

  const handleReset = () => {
    setSearchParams({
      siteName: '',
      company: '',
      manager: '',
      startDate: null,
      endDate: null
    });
    onReset();
  };

  return (
    <div style={{ 
      display: 'flex', 
      gap: '10px', 
      alignItems: 'center',
      padding: '10px',
      border: '1px solid #e3eaf3',
      borderRadius: '4px'
    }}>
      <input
        type="text"
        value={searchParams.siteName}
        onChange={(e) => setSearchParams({...searchParams, siteName: e.target.value})}
        placeholder="현장명"
        style={{
          width: '120px',
          padding: '6px 10px',
          height: '32px',
          borderRadius: '4px',
          border: '1px solid #e3eaf3',
          fontSize: '0.9rem'
        }}
      />
      <input
        type="text"
        value={searchParams.company}
        onChange={(e) => setSearchParams({...searchParams, company: e.target.value})}
        placeholder="건설사"
        style={{
          width: '120px',
          padding: '6px 10px',
          height: '32px',
          borderRadius: '4px',
          border: '1px solid #e3eaf3',
          fontSize: '0.9rem'
        }}
      />
      <input
        type="text"
        value={searchParams.manager}
        onChange={(e) => setSearchParams({...searchParams, manager: e.target.value})}
        placeholder="담당자"
        style={{
          width: '120px',
          padding: '6px 10px',
          height: '32px',
          borderRadius: '4px',
          border: '1px solid #e3eaf3',
          fontSize: '0.9rem'
        }}
      />
      <DatePicker
        selected={searchParams.startDate}
        onChange={(date) => setSearchParams({...searchParams, startDate: date})}
        selectsStart
        startDate={searchParams.startDate}
        endDate={searchParams.endDate}
        locale={ko}
        dateFormat="yyyy-MM-dd"
        placeholderText="시작일"
        style={{
          width: '120px',
          padding: '6px 10px',
          height: '32px',
          borderRadius: '4px',
          border: '1px solid #e3eaf3',
          fontSize: '0.9rem'
        }}
      />
      <DatePicker
        selected={searchParams.endDate}
        onChange={(date) => setSearchParams({...searchParams, endDate: date})}
        selectsEnd
        startDate={searchParams.startDate}
        endDate={searchParams.endDate}
        minDate={searchParams.startDate}
        locale={ko}
        dateFormat="yyyy-MM-dd"
        placeholderText="종료일"
        style={{
          width: '120px',
          padding: '6px 10px',
          height: '32px',
          borderRadius: '4px',
          border: '1px solid #e3eaf3',
          fontSize: '0.9rem'
        }}
      />
      <button
        onClick={handleSearch}
        style={{
          padding: '6px 12px',
          height: '32px',
          backgroundColor: '#1976d2',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '0.9rem',
          whiteSpace: 'nowrap'
        }}
      >
        검색
      </button>
      <button
        onClick={handleReset}
        style={{
          padding: '6px 12px',
          height: '32px',
          backgroundColor: '#666',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '0.9rem',
          whiteSpace: 'nowrap'
        }}
      >
        검색 초기화
      </button>
    </div>
  );
}

export default AdvancedSearch; 