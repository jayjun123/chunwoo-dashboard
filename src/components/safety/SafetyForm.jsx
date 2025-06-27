import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaPlus, FaTrash, FaUpload } from 'react-icons/fa';
import '../../styles/SafetyForm.css';

const SafetyForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(isEdit);
  const [formData, setFormData] = useState({
    title: '',
    site: '',
    date: '',
    inspector: '',
    status: '예정',
    findings: [],
    attachments: []
  });

  useEffect(() => {
    if (isEdit) {
      // 임시 데이터 로드
      const mockInspection = {
        id: 1,
        title: '기초 공사 안전 점검',
        site: '서울 강남 신축 아파트',
        date: '2024-01-15',
        status: '완료',
        inspector: '이영희',
        findings: [
          {
            id: 1,
            description: '안전모 미착용자 발견',
            severity: '높음',
            status: '해결',
            location: '1층 기초 공사 현장',
            action: '안전모 착용 지시 및 안전교육 실시',
            resolvedDate: '2024-01-15'
          }
        ],
        attachments: [
          {
            id: 1,
            name: '안전 점검 보고서.pdf',
            type: 'pdf',
            size: '2.5MB'
          }
        ]
      };

      setFormData(mockInspection);
      setLoading(false);
    }
  }, [id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFindingChange = (index, field, value) => {
    const newFindings = [...formData.findings];
    newFindings[index] = {
      ...newFindings[index],
      [field]: value
    };
    setFormData(prev => ({
      ...prev,
      findings: newFindings
    }));
  };

  const addFinding = () => {
    setFormData(prev => ({
      ...prev,
      findings: [
        ...prev.findings,
        {
          id: Date.now(),
          description: '',
          severity: '중간',
          status: '미해결',
          location: '',
          action: '',
          resolvedDate: ''
        }
      ]
    }));
  };

  const removeFinding = (index) => {
    setFormData(prev => ({
      ...prev,
      findings: prev.findings.filter((_, i) => i !== index)
    }));
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const newAttachments = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      type: file.type.split('/')[1],
      size: `${(file.size / (1024 * 1024)).toFixed(1)}MB`
    }));

    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...newAttachments]
    }));
  };

  const removeAttachment = (index) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: API 호출 구현
    console.log('Form submitted:', formData);
    navigate('/safety');
  };

  if (loading) {
    return <div className="loading">로딩 중...</div>;
  }

  return (
    <div className="safety-form">
      <div className="form-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <FaArrowLeft /> 목록으로
        </button>
        <h1>{isEdit ? '안전 점검 수정' : '새 안전 점검 등록'}</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <h2>기본 정보</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="title">점검명</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="site">현장</label>
              <input
                type="text"
                id="site"
                name="site"
                value={formData.site}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="date">점검일</label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="inspector">점검자</label>
              <input
                type="text"
                id="inspector"
                name="inspector"
                value={formData.inspector}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="status">상태</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                required
              >
                <option value="예정">예정</option>
                <option value="진행중">진행중</option>
                <option value="완료">완료</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="section-header">
            <h2>발견된 문제점</h2>
            <button type="button" className="add-button" onClick={addFinding}>
              <FaPlus /> 문제점 추가
            </button>
          </div>

          <div className="findings-list">
            {formData.findings.map((finding, index) => (
              <div key={finding.id} className="finding-form">
                <div className="finding-header">
                  <h3>문제점 #{index + 1}</h3>
                  <button
                    type="button"
                    className="remove-button"
                    onClick={() => removeFinding(index)}
                  >
                    <FaTrash />
                  </button>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>설명</label>
                    <input
                      type="text"
                      value={finding.description}
                      onChange={(e) => handleFindingChange(index, 'description', e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>심각도</label>
                    <select
                      value={finding.severity}
                      onChange={(e) => handleFindingChange(index, 'severity', e.target.value)}
                      required
                    >
                      <option value="높음">높음</option>
                      <option value="중간">중간</option>
                      <option value="낮음">낮음</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>위치</label>
                    <input
                      type="text"
                      value={finding.location}
                      onChange={(e) => handleFindingChange(index, 'location', e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>조치사항</label>
                    <input
                      type="text"
                      value={finding.action}
                      onChange={(e) => handleFindingChange(index, 'action', e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>상태</label>
                    <select
                      value={finding.status}
                      onChange={(e) => handleFindingChange(index, 'status', e.target.value)}
                      required
                    >
                      <option value="미해결">미해결</option>
                      <option value="해결">해결</option>
                    </select>
                  </div>

                  {finding.status === '해결' && (
                    <div className="form-group">
                      <label>해결일</label>
                      <input
                        type="date"
                        value={finding.resolvedDate}
                        onChange={(e) => handleFindingChange(index, 'resolvedDate', e.target.value)}
                        required
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="form-section">
          <div className="section-header">
            <h2>첨부파일</h2>
            <div className="file-upload">
              <input
                type="file"
                id="file-upload"
                multiple
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <label htmlFor="file-upload" className="upload-button">
                <FaUpload /> 파일 첨부
              </label>
            </div>
          </div>

          <div className="attachments-list">
            {formData.attachments.map((file, index) => (
              <div key={file.id} className="attachment-item">
                <div className="file-info">
                  <span className="file-name">{file.name}</span>
                  <span className="file-details">
                    {file.type.toUpperCase()} • {file.size}
                  </span>
                </div>
                <button
                  type="button"
                  className="remove-button"
                  onClick={() => removeAttachment(index)}
                >
                  <FaTrash />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="cancel-button" onClick={() => navigate(-1)}>
            취소
          </button>
          <button type="submit" className="submit-button">
            {isEdit ? '수정하기' : '등록하기'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SafetyForm; 