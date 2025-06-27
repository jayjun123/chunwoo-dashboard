import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FaFileExcel, FaFilePdf, FaCalendarAlt, FaChartBar, FaFileAlt, FaDownload, FaBuilding, FaUsers, FaBox, FaHardHat, FaSearch, FaFilter, FaChartLine, FaChartPie, FaBell, FaExclamationTriangle, FaSpinner, FaExclamationCircle } from 'react-icons/fa';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import { Chart, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement } from 'chart.js';
import { useAuth } from '../contexts/AuthContext';
import { permissionsAPI, sitesAPI, notificationsAPI } from '../api/database';
import { ErrorBoundary } from 'react-error-boundary';
import { toast } from 'react-toastify';
import '../styles/Reports.css';

Chart.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement);

// 에러 폴백 컴포넌트
const ErrorFallback = ({ error, resetErrorBoundary }) => {
  return (
    <div className="error-container">
      <FaExclamationCircle className="error-icon" />
      <h3>오류가 발생했습니다</h3>
      <p>{error.message}</p>
      <button onClick={resetErrorBoundary}>다시 시도</button>
    </div>
  );
};

// 로딩 컴포넌트
const LoadingSpinner = () => {
  return (
    <div className="loading-container">
      <FaSpinner className="spinner" />
      <p>데이터를 불러오는 중...</p>
    </div>
  );
};

const Reports = () => {
  const { currentUser } = useAuth();
  const [selectedSite, setSelectedSite] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [reportType, setReportType] = useState('daily');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCustomReportModal, setShowCustomReportModal] = useState(false);
  const [customReportFields, setCustomReportFields] = useState({
    title: '',
    fields: [],
    format: 'excel'
  });
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [permissions, setPermissions] = useState({ read: false, write: false, admin: false });
  const [sites, setSites] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filterOptions, setFilterOptions] = useState({
    progress: 'all',
    accidents: 'all',
    issues: 'all'
  });
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  // 권한 정보 불러오기 (useCallback으로 최적화)
  const fetchPermissions = useCallback(async () => {
    if (!currentUser) return;
    try {
      const userPerm = await permissionsAPI.getUserPermissions(currentUser.uid);
      if (userPerm && userPerm.reports) {
        setPermissions(userPerm.reports);
      } else {
        setPermissions({ read: false, write: false, admin: false });
      }
    } catch (err) {
      setError(err);
      toast.error('권한 정보를 불러오는데 실패했습니다.');
    }
  }, [currentUser]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  // 실시간 현장+보고서 데이터 구독 (useCallback으로 최적화)
  const subscribeToSites = useCallback(() => {
    if (!permissions.read) return;
    setIsLoading(true);
    try {
      const unsubscribe = sitesAPI.subscribeToSites((updatedSites) => {
        setSites(updatedSites);
        setLastUpdate(new Date());
        setIsLoading(false);
      });
      return () => unsubscribe && unsubscribe();
    } catch (err) {
      setError(err);
      toast.error('데이터를 불러오는데 실패했습니다.');
      setIsLoading(false);
    }
  }, [permissions.read]);

  useEffect(() => {
    return subscribeToSites();
  }, [subscribeToSites]);

  // 실시간 알림 구독 (useCallback으로 최적화)
  const subscribeToNotifications = useCallback(() => {
    if (!currentUser) return;
    try {
      const unsubscribe = notificationsAPI.subscribeToNotifications(currentUser.uid, (updatedNotifications) => {
        setNotifications(updatedNotifications);
      });
      return () => unsubscribe && unsubscribe();
    } catch (err) {
      setError(err);
      toast.error('알림을 불러오는데 실패했습니다.');
    }
  }, [currentUser]);

  useEffect(() => {
    return subscribeToNotifications();
  }, [subscribeToNotifications]);

  // 통계 데이터 계산 (useMemo로 최적화)
  const stats = useMemo(() => {
    const totalSites = sites.length;
    const completedSites = sites.filter(site => site.reports?.daily?.[0]?.progress === '100%' || site.reports?.daily?.[0]?.progress === 100).length;
    const inProgressSites = sites.filter(site => site.reports?.daily?.[0]?.progress !== '100%' && site.reports?.daily?.[0]?.progress !== 100).length;
    const avgProgress = totalSites > 0 ? Math.round(sites.reduce((acc, site) => acc + parseInt(site.reports?.daily?.[0]?.progress || 0), 0) / totalSites) : 0;
    return { totalSites, completedSites, inProgressSites, avgProgress };
  }, [sites]);

  // 차트 데이터 (useMemo로 최적화)
  const chartData = useMemo(() => ({
    doughnut: {
      labels: ['진행 중', '완료'],
      datasets: [
        {
          data: [stats.inProgressSites, stats.completedSites],
          backgroundColor: ['#36A2EB', '#4BC0C0'],
          borderWidth: 1,
        },
      ],
    },
    bar: {
      labels: sites.map(site => site.name),
      datasets: [
        {
          label: '진행률 (%)',
          data: sites.map(site => parseInt(site.reports?.daily?.[0]?.progress || 0)),
          backgroundColor: '#36A2EB',
          borderWidth: 1,
        },
      ],
    },
    line: {
      labels: ['1월', '2월', '3월', '4월', '5월', '6월'],
      datasets: [
        {
          label: '평균 진행률 (%)',
          data: [30, 45, 60, 75, 85, 90],
          borderColor: '#4BC0C0',
          tension: 0.1,
        },
      ],
    },
  }), [sites, stats]);

  // 필터링된 데이터 (useMemo로 최적화)
  const filteredSites = useMemo(() => {
    return sites.filter(site => {
      if (selectedSite !== 'all' && site.id !== selectedSite) return false;
      if (searchTerm && !site.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (filterOptions.progress !== 'all') {
        const progress = parseInt(site.reports?.daily?.[0]?.progress || 0);
        if (filterOptions.progress === 'high' && progress < 70) return false;
        if (filterOptions.progress === 'medium' && (progress < 30 || progress >= 70)) return false;
        if (filterOptions.progress === 'low' && progress >= 30) return false;
      }
      return true;
    });
  }, [sites, selectedSite, searchTerm, filterOptions]);

  // 엑셀/PDF 내보내기 (useCallback으로 최적화)
  const handleExportReport = useCallback(async (format) => {
    if (!permissions.write) {
      toast.error('내보내기 권한이 없습니다.');
      return;
    }
    setIsExporting(true);
    try {
      // 엑셀/PDF 내보내기 로직
      await new Promise(resolve => setTimeout(resolve, 1000)); // 임시 지연
      toast.success(`${format.toUpperCase()} 파일이 생성되었습니다.`);
    } catch (err) {
      setError(err);
      toast.error('파일 생성에 실패했습니다.');
    } finally {
      setIsExporting(false);
    }
  }, [permissions.write]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSiteClick = (site) => {
    setSelectedSite(site);
  };

  const handleReportTypeChange = (type) => {
    setReportType(type);
  };

  const handleDateChange = (e) => {
    setDateRange({
      ...dateRange,
      [e.target.name]: e.target.value
    });
  };

  const handleCreateCustomReport = () => {
    setShowCustomReportModal(true);
  };

  const handleSaveCustomReport = () => {
    if (!customReportFields.title || customReportFields.fields.length === 0) return;

    // TODO: 커스텀 보고서 저장 로직 구현
    console.log('커스텀 보고서 저장:', customReportFields);

    setShowCustomReportModal(false);
    setCustomReportFields({
      title: '',
      fields: [],
      format: 'excel'
    });
  };

  const handleAddField = () => {
    setCustomReportFields(prev => ({
      ...prev,
      fields: [...prev.fields, { name: '', type: 'text' }]
    }));
  };

  const handleRemoveField = (index) => {
    setCustomReportFields(prev => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index)
    }));
  };

  const handleFieldChange = (index, field, value) => {
    setCustomReportFields(prev => ({
      ...prev,
      fields: prev.fields.map((f, i) => {
        if (i === index) {
          return { ...f, [field]: value };
        }
        return f;
      })
    }));
  };

  const handleReportSelect = (reportType) => {
    setSelectedReport(reportType);
    setReportData(null);
  };

  const generateReport = () => {
    // 임시 데이터 생성
    const mockData = {
      'progress': {
        title: '공사 진행 현황 보고서',
        data: {
          totalSites: 5,
          completedSites: 2,
          inProgressSites: 2,
          pendingSites: 1,
          completionRate: 40,
          timeline: [
            { date: '2024-03-01', completed: 0 },
            { date: '2024-03-15', completed: 1 },
            { date: '2024-03-30', completed: 2 }
          ]
        }
      },
      'safety': {
        title: '안전 관리 보고서',
        data: {
          totalIncidents: 3,
          resolvedIncidents: 2,
          pendingIncidents: 1,
          categories: {
            'PPE': 1,
            'Equipment': 1,
            'Scaffolding': 1
          },
          timeline: [
            { date: '2024-03-01', incidents: 0 },
            { date: '2024-03-15', incidents: 2 },
            { date: '2024-03-30', incidents: 3 }
          ]
        }
      },
      'materials': {
        title: '자재 관리 보고서',
        data: {
          totalMaterials: 15,
          lowStock: 3,
          categories: {
            'Concrete': 5,
            'Steel': 3,
            'Paint': 2,
            'Wood': 3,
            'Tile': 2
          },
          stockValue: 150000000,
          timeline: [
            { date: '2024-03-01', value: 120000000 },
            { date: '2024-03-15', value: 135000000 },
            { date: '2024-03-30', value: 150000000 }
          ]
        }
      },
      'users': {
        title: '사용자 활동 보고서',
        data: {
          totalUsers: 20,
          activeUsers: 15,
          userRoles: {
            'Admin': 2,
            'Manager': 5,
            'User': 13
          },
          activities: {
            'Site Creation': 3,
            'Document Upload': 12,
            'Discussion': 8,
            'Safety Report': 5
          },
          timeline: [
            { date: '2024-03-01', activities: 5 },
            { date: '2024-03-15', activities: 15 },
            { date: '2024-03-30', activities: 28 }
          ]
        }
      }
    };

    setReportData(mockData[selectedReport]);
  };

  const downloadReport = () => {
    // PDF 생성 및 다운로드 로직
    alert('보고서가 다운로드되었습니다.');
  };

  // 권한 없을 때 안내
  if (!permissions.read) {
    return (
      <div className="reports-container" style={{textAlign:'center',padding:'60px 0'}}>
        <h2>보고서</h2>
        <p style={{color:'var(--danger-color)',fontWeight:600}}>이 메뉴를 볼 권한이 없습니다.</p>
      </div>
    );
  }

  // 로딩 중일 때
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // 에러 발생 시
  if (error) {
    return (
      <div className="error-container">
        <FaExclamationCircle className="error-icon" />
        <h3>오류가 발생했습니다</h3>
        <p>{error.message}</p>
        <button onClick={() => setError(null)}>다시 시도</button>
      </div>
    );
  }

  // 알림 표시
  const renderNotifications = () => {
    if (!showNotifications) return null;
    return (
      <div className="notifications-panel">
        <div className="notifications-header">
          <h4>알림</h4>
          <button onClick={() => setShowNotifications(false)}>닫기</button>
        </div>
        <div className="notifications-list">
          {notifications.length === 0 ? (
            <p>새로운 알림이 없습니다.</p>
          ) : (
            notifications.map(notification => (
              <div key={notification.id} className={`notification-item ${notification.read ? 'read' : 'unread'}`}>
                <FaExclamationTriangle className="notification-icon" />
                <div className="notification-content">
                  <p>{notification.message}</p>
                  <small>{new Date(notification.timestamp).toLocaleString()}</small>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => setError(null)}>
      <div className="reports-container">
        <div className="reports-header">
          <h2>보고서</h2>
          <div className="header-actions">
            <button className="notification-button" onClick={() => setShowNotifications(!showNotifications)}>
              <FaBell />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="notification-badge">{notifications.filter(n => !n.read).length}</span>
              )}
            </button>
            <button className="filter-button" onClick={() => setShowFilters(!showFilters)}>
              <FaFilter /> 필터
            </button>
            {permissions.write && (
              <button className="download-button" onClick={() => handleExportReport('excel')} disabled={isExporting}>
                <FaFileExcel /> 엑셀
              </button>
            )}
            {permissions.write && (
              <button className="download-button" onClick={() => handleExportReport('pdf')} disabled={isExporting}>
                <FaFilePdf /> PDF
              </button>
            )}
          </div>
        </div>
        {renderNotifications()}
        <div className="reports-content">
          {/* 좌측: 탭 메뉴 */}
          <div className="reports-sidebar">
            <div className="report-types">
              <button className={`report-type-button ${reportType === 'daily' ? 'active' : ''}`} onClick={() => handleReportTypeChange('daily')}><FaCalendarAlt /> 일일 보고서</button>
              <button className={`report-type-button ${reportType === 'weekly' ? 'active' : ''}`} onClick={() => handleReportTypeChange('weekly')}><FaChartBar /> 주간 보고서</button>
              <button className={`report-type-button ${reportType === 'monthly' ? 'active' : ''}`} onClick={() => handleReportTypeChange('monthly')}><FaFileAlt /> 월간 보고서</button>
              {permissions.write && (
                <button className={`report-type-button ${reportType === 'custom' ? 'active' : ''}`} onClick={() => handleReportTypeChange('custom')}><FaFileAlt /> 커스텀 보고서</button>
              )}
            </div>
          </div>
          {/* 우측: 메인 컨텐츠 */}
          <div className="reports-main">
            {/* 필터 영역 */}
            <div className="report-filters">
              <div className="site-filter">
                <select value={selectedSite} onChange={(e) => setSelectedSite(e.target.value)}>
                  <option value="all">전체 현장</option>
                  {sites.map(site => (
                    <option key={site.id} value={site.id}>{site.name}</option>
                  ))}
                </select>
              </div>
              <div className="date-range">
                <input type="date" name="startDate" value={dateRange.startDate} onChange={e => setDateRange({ ...dateRange, startDate: e.target.value })} />
                <span>~</span>
                <input type="date" name="endDate" value={dateRange.endDate} onChange={e => setDateRange({ ...dateRange, endDate: e.target.value })} />
              </div>
              <div className="search-container">
                <input type="text" placeholder="보고서 검색..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                <FaSearch className="search-icon" />
              </div>
              {permissions.write && (
                <button className="generate-button" onClick={() => setShowCustomReportModal(true)}><FaFileAlt /> 보고서 생성</button>
              )}
            </div>
            {/* 필터 옵션 */}
            {showFilters && (
              <div className="filter-options">
                <div className="filter-group">
                  <label>진행률</label>
                  <select value={filterOptions.progress} onChange={e => setFilterOptions({ ...filterOptions, progress: e.target.value })}>
                    <option value="all">전체</option>
                    <option value="high">70% 이상</option>
                    <option value="medium">30% ~ 70%</option>
                    <option value="low">30% 미만</option>
                  </select>
                </div>
                <div className="filter-group">
                  <label>사고</label>
                  <select value={filterOptions.accidents} onChange={e => setFilterOptions({ ...filterOptions, accidents: e.target.value })}>
                    <option value="all">전체</option>
                    <option value="yes">있음</option>
                    <option value="no">없음</option>
                  </select>
                </div>
                <div className="filter-group">
                  <label>이슈</label>
                  <select value={filterOptions.issues} onChange={e => setFilterOptions({ ...filterOptions, issues: e.target.value })}>
                    <option value="all">전체</option>
                    <option value="yes">있음</option>
                    <option value="no">없음</option>
                  </select>
                </div>
              </div>
            )}
            {/* 실시간 업데이트 표시 */}
            {lastUpdate && (
              <div className="last-update">
                마지막 업데이트: {lastUpdate.toLocaleString()}
              </div>
            )}
            {/* 통계 카드 */}
            <div className="stats-grid">
              <div className="stat-card">
                <h4>총 현장 수</h4>
                <p>{stats.totalSites}</p>
              </div>
              <div className="stat-card">
                <h4>진행 중 현장</h4>
                <p>{stats.inProgressSites}</p>
              </div>
              <div className="stat-card">
                <h4>완료 현장</h4>
                <p>{stats.completedSites}</p>
              </div>
              <div className="stat-card">
                <h4>평균 진행률</h4>
                <p>{stats.avgProgress}%</p>
              </div>
            </div>
            {/* 차트 영역 */}
            <div className="charts-grid">
              <div className="chart-card">
                <h4>전체 진행률</h4>
                <Doughnut data={chartData.doughnut} options={{ plugins: { legend: { position: 'bottom' } } }} />
              </div>
              <div className="chart-card">
                <h4>현장별 진행률</h4>
                <Bar data={chartData.bar} options={{ plugins: { legend: { display: false } } }} />
              </div>
              <div className="chart-card">
                <h4>시간별 진행률 추이</h4>
                <Line data={chartData.line} options={{ plugins: { legend: { position: 'bottom' } } }} />
              </div>
            </div>
            {/* 보고서 테이블 */}
            <div className="report-table">
              <table>
                <thead>
                  <tr>
                    <th>날짜</th>
                    <th>현장</th>
                    <th>진행률</th>
                    <th>작업자</th>
                    <th>사고</th>
                    <th>이슈</th>
                    <th>비고</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSites.map(site => (
                    <tr key={site.id}>
                      <td>{site.reports?.daily?.[0]?.date || '-'}</td>
                      <td>{site.name}</td>
                      <td>{site.reports?.daily?.[0]?.progress || '-'}</td>
                      <td>{site.reports?.daily?.[0]?.workers || '-'}</td>
                      <td>{site.reports?.daily?.[0]?.accidents || '-'}</td>
                      <td>{site.reports?.daily?.[0]?.issues || '-'}</td>
                      <td>{site.reports?.daily?.[0]?.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {/* 커스텀 보고서 모달 */}
        {showCustomReportModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>커스텀 보고서 생성</h3>
                <button onClick={() => setShowCustomReportModal(false)}>×</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>보고서 제목</label>
                  <input
                    type="text"
                    value={customReportFields.title}
                    onChange={(e) => setCustomReportFields(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="보고서 제목을 입력하세요"
                  />
                </div>
                <div className="form-group">
                  <label>포맷</label>
                  <select
                    value={customReportFields.format}
                    onChange={(e) => setCustomReportFields(prev => ({ ...prev, format: e.target.value }))}
                  >
                    <option value="excel">Excel</option>
                    <option value="pdf">PDF</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>필드</label>
                  {customReportFields.fields.map((field, index) => (
                    <div key={index} className="field-row">
                      <input
                        type="text"
                        value={field.name}
                        onChange={(e) => handleFieldChange(index, 'name', e.target.value)}
                        placeholder="필드명"
                      />
                      <select
                        value={field.type}
                        onChange={(e) => handleFieldChange(index, 'type', e.target.value)}
                      >
                        <option value="text">텍스트</option>
                        <option value="number">숫자</option>
                        <option value="date">날짜</option>
                      </select>
                      <button onClick={() => handleRemoveField(index)}>삭제</button>
                    </div>
                  ))}
                  <button onClick={handleAddField}>필드 추가</button>
                </div>
              </div>
              <div className="modal-footer">
                <button onClick={handleSaveCustomReport}>저장</button>
                <button onClick={() => setShowCustomReportModal(false)}>취소</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default Reports; 