import React, { useEffect, useState } from 'react';
import { progressAPI, sitesAPI, permissionsAPI } from '../api/database';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import '../styles/ProgressManagement.css';
import { formatContractAmount, formatGisungAmount, formatAdvanceAmount, formatBalanceAmount } from '../utils/formatUtils';

const ProgressManagement = () => {
  const { isDarkMode } = useTheme();
  const { currentUser } = useAuth();
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);
  const [progressData, setProgressData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    contractAmount: 0,    // 계약금액
    advancePayment: 0,    // 선급금
    progressPayments: [], // 기성금 목록
    retentionMoney: 0,    // 유지보수금
    totalPaid: 0,         // 총 지급액
    remainingAmount: 0    // 잔여금액
  });
  const [permissions, setPermissions] = useState({ read: false, write: false, delete: false });

  // 권한 정보 불러오기
  useEffect(() => {
    if (!currentUser) return;
    const fetchPermissions = async () => {
      const userPerm = await permissionsAPI.getUserPermissions(currentUser.uid);
      if (userPerm && userPerm.progressManagement) {
        setPermissions(userPerm.progressManagement);
      } else {
        setPermissions({ read: false, write: false, delete: false });
      }
    };
    fetchPermissions();
  }, [currentUser]);

  // 현장 목록 로드
  useEffect(() => {
    const unsubscribe = sitesAPI.subscribeToSites((updatedSites) => {
      setSites(updatedSites);
    });
    return () => unsubscribe();
  }, []);

  // 선택된 현장의 기성현황 로드
  useEffect(() => {
    if (selectedSite && permissions.read) {
      const unsubscribe = progressAPI.subscribeToProgress(selectedSite.id, (progress) => {
        if (progress.length > 0) {
          setProgressData(progress[0]);
          setFormData(progress[0]);
        } else {
          setProgressData(null);
          setFormData({
            contractAmount: 0,
            advancePayment: 0,
            progressPayments: [],
            retentionMoney: 0,
            totalPaid: 0,
            remainingAmount: 0
          });
        }
      });
      return () => unsubscribe();
    }
  }, [selectedSite, permissions.read]);

  // 기성현황 저장
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (progressData) {
        await progressAPI.updateProgress(progressData.id, {
          ...formData,
          siteId: selectedSite.id
        });
      } else {
        await progressAPI.addProgress({
          ...formData,
          siteId: selectedSite.id
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('기성현황 저장 실패:', error);
      alert('기성현황 저장에 실패했습니다.');
    }
  };

  // 기성금 추가
  const handleAddProgressPayment = () => {
    setFormData({
      ...formData,
      progressPayments: [
        ...formData.progressPayments,
        {
          date: new Date().toISOString().split('T')[0],
          amount: 0,
          description: ''
        }
      ]
    });
  };

  // 기성금 삭제
  const handleRemoveProgressPayment = (index) => {
    const newPayments = [...formData.progressPayments];
    newPayments.splice(index, 1);
    setFormData({
      ...formData,
      progressPayments: newPayments
    });
  };

  // 기성금 변경
  const handleProgressPaymentChange = (index, field, value) => {
    const newPayments = [...formData.progressPayments];
    newPayments[index] = {
      ...newPayments[index],
      [field]: value
    };
    setFormData({
      ...formData,
      progressPayments: newPayments
    });
  };

  // 총 지급액 계산
  const calculateTotalPaid = () => {
    const progressTotal = formData.progressPayments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0
    );
    return formData.advancePayment + progressTotal;
  };

  // 잔여금액 계산
  const calculateRemainingAmount = () => {
    return formData.contractAmount - calculateTotalPaid() - formData.retentionMoney;
  };

  // 권한 없을 때 안내
  if (!permissions.read) {
    return (
      <div className={`progress-management ${isDarkMode ? 'dark' : 'light'}`} style={{textAlign:'center',padding:'60px 0'}}>
        <h2>기성현황</h2>
        <p style={{color:'var(--danger-color)',fontWeight:600}}>이 메뉴를 볼 권한이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className={`progress-management ${isDarkMode ? 'dark' : 'light'}`} style={{ width: '100vw', maxWidth: '100vw', margin: 0, padding: 0, boxSizing: 'border-box', minHeight: '100vh' }}>
      <div className="progress-header" style={{ width: '100vw', maxWidth: '100vw', margin: 0, padding: 0, boxSizing: 'border-box' }}>
        <h2>기성현황</h2>
        <div className="progress-actions">
          <select
            value={selectedSite?.id || ''}
            onChange={(e) => setSelectedSite(sites.find(site => site.id === e.target.value))}
            className="site-select"
          >
            <option value="">현장 선택</option>
            {sites.map(site => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
          {selectedSite && permissions.write && (
            <button onClick={() => setIsModalOpen(true)} className="edit-button">
              기성현황 수정
            </button>
          )}
        </div>
      </div>

      {selectedSite && progressData && (
        <div className="progress-content" style={{ width: '100vw', maxWidth: '100vw', margin: 0, padding: 0, boxSizing: 'border-box' }}>
          <div className="progress-summary" style={{ width: '100vw', maxWidth: '100vw', margin: 0, padding: 0, boxSizing: 'border-box' }}>
            <div className="summary-card" style={{ width: '100%', maxWidth: '100%', margin: 0, padding: 0, boxSizing: 'border-box' }}>
              <h3>계약금액</h3>
              <p>{formatContractAmount(progressData.contractAmount)}</p>
            </div>
            <div className="summary-card" style={{ width: '100%', maxWidth: '100%', margin: 0, padding: 0, boxSizing: 'border-box' }}>
              <h3>선급금</h3>
              <p>{formatAdvanceAmount(progressData.advancePayment)}</p>
            </div>
            <div className="summary-card" style={{ width: '100%', maxWidth: '100%', margin: 0, padding: 0, boxSizing: 'border-box' }}>
              <h3>기성금</h3>
              <p>{formatGisungAmount(progressData.progressPayments.reduce(
                (sum, payment) => sum + Number(payment.amount),
                0
              ))}</p>
            </div>
            <div className="summary-card" style={{ width: '100%', maxWidth: '100%', margin: 0, padding: 0, boxSizing: 'border-box' }}>
              <h3>유지보수금</h3>
              <p>{formatBalanceAmount(progressData.retentionMoney)}</p>
            </div>
            <div className="summary-card" style={{ width: '100%', maxWidth: '100%', margin: 0, padding: 0, boxSizing: 'border-box' }}>
              <h3>총 지급액</h3>
              <p>{formatBalanceAmount(progressData.totalPaid)}</p>
            </div>
            <div className="summary-card" style={{ width: '100%', maxWidth: '100%', margin: 0, padding: 0, boxSizing: 'border-box' }}>
              <h3>잔여금액</h3>
              <p>{progressData.remainingAmount?.toLocaleString()}원</p>
            </div>
          </div>

          <div className="progress-details" style={{ width: '100vw', maxWidth: '100vw', margin: 0, padding: 0, boxSizing: 'border-box' }}>
            <h3>기성금 내역</h3>
            <table className="progress-table" style={{ width: '100vw', maxWidth: '100vw', minWidth: '100vw', margin: 0, padding: 0, boxSizing: 'border-box' }}>
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>금액</th>
                  <th>설명</th>
                  {permissions.write && <th>관리</th>}
                </tr>
              </thead>
              <tbody>
                {formData.progressPayments.map((payment, index) => (
                  <tr key={index}>
                    <td>
                      <input
                        type="date"
                        value={payment.date}
                        onChange={(e) => handleProgressPaymentChange(index, 'date', e.target.value)}
                        disabled={!permissions.write}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={payment.amount}
                        onChange={(e) => handleProgressPaymentChange(index, 'amount', e.target.value)}
                        disabled={!permissions.write}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={payment.description}
                        onChange={(e) => handleProgressPaymentChange(index, 'description', e.target.value)}
                        disabled={!permissions.write}
                      />
                    </td>
                    {permissions.write && (
                      <td>
                        <button type="button" onClick={() => handleRemoveProgressPayment(index)} className="delete-button">
                          삭제
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {permissions.write && (
              <button type="button" onClick={handleAddProgressPayment} className="add-button">
                기성금 추가
              </button>
            )}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>기성현황 수정</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>계약금액</label>
                <input
                  type="number"
                  value={formData.contractAmount}
                  onChange={(e) => setFormData({
                    ...formData,
                    contractAmount: Number(e.target.value)
                  })}
                  required
                  disabled={!permissions.write}
                />
              </div>
              <div className="form-group">
                <label>선급금</label>
                <input
                  type="number"
                  value={formData.advancePayment}
                  onChange={(e) => setFormData({
                    ...formData,
                    advancePayment: Number(e.target.value)
                  })}
                  required
                  disabled={!permissions.write}
                />
              </div>
              <div className="form-group">
                <label>유지보수금</label>
                <input
                  type="number"
                  value={formData.retentionMoney}
                  onChange={(e) => setFormData({
                    ...formData,
                    retentionMoney: Number(e.target.value)
                  })}
                  required
                  disabled={!permissions.write}
                />
              </div>

              <div className="progress-payments">
                <h4>기성금 내역</h4>
                <table className="progress-table">
                  <thead>
                    <tr>
                      <th>날짜</th>
                      <th>금액</th>
                      <th>설명</th>
                      {permissions.write && <th>관리</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {formData.progressPayments.map((payment, index) => (
                      <tr key={index}>
                        <td>
                          <input
                            type="date"
                            value={payment.date}
                            onChange={(e) => handleProgressPaymentChange(index, 'date', e.target.value)}
                            disabled={!permissions.write}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={payment.amount}
                            onChange={(e) => handleProgressPaymentChange(index, 'amount', e.target.value)}
                            disabled={!permissions.write}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={payment.description}
                            onChange={(e) => handleProgressPaymentChange(index, 'description', e.target.value)}
                            disabled={!permissions.write}
                          />
                        </td>
                        {permissions.write && (
                          <td>
                            <button type="button" onClick={() => handleRemoveProgressPayment(index)} className="delete-button">
                              삭제
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {permissions.write && (
                  <button type="button" onClick={handleAddProgressPayment} className="add-button">
                    기성금 추가
                  </button>
                )}
              </div>
              <div className="modal-actions">
                <button type="submit" className="save-button" disabled={!permissions.write}>
                  저장
                </button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="cancel-button">
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressManagement; 