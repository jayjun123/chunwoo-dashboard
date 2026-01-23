import React, { useEffect, useState } from 'react';

const API_URL = 'http://localhost:3000/api/mails';

const importanceStyles = {
  high: {
    border: 'border-red-500/60',
    badge: 'bg-red-500/20 text-red-200'
  },
  medium: {
    border: 'border-yellow-500/60',
    badge: 'bg-yellow-400/20 text-yellow-200'
  },
  low: {
    border: 'border-emerald-500/40',
    badge: 'bg-emerald-500/20 text-emerald-200'
  },
  default: {
    border: 'border-slate-700/70',
    badge: 'bg-slate-700/60 text-slate-200'
  }
};

const classificationStyles = {
  업무: 'bg-blue-500/20 text-blue-200 border-blue-400/40',
  개인: 'bg-purple-500/20 text-purple-200 border-purple-400/40',
  기타: 'bg-slate-500/20 text-slate-200 border-slate-400/40'
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
};

const MailDashboard = () => {
  const [mails, setMails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadMails = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error(`API 오류: ${response.status}`);
      }
      const data = await response.json();
      setMails(Array.isArray(data) ? data : []);
    } catch (error) {
      setErrorMessage(error?.message || '메일 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMails();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">AI 메일 요약 대시보드</h1>
            <p className="text-sm text-slate-400">
              메일 {mails.length}건을 최신순으로 보여줍니다.
            </p>
          </div>
          <button
            type="button"
            onClick={loadMails}
            className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:border-slate-500 hover:text-white"
          >
            새로고침
          </button>
        </div>

        {loading && (
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-6 text-center text-slate-300">
            로딩 중...
          </div>
        )}

        {errorMessage && !loading && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
            {errorMessage}
          </div>
        )}

        {!loading && !errorMessage && mails.length === 0 && (
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-6 text-center text-slate-300">
            표시할 메일이 없습니다.
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {mails.map((mail) => {
            const importanceKey = (mail.importance || 'default').toLowerCase();
            const style = importanceStyles[importanceKey] || importanceStyles.default;
            const classification = mail.ai_classification || '기타';

            return (
              <div
                key={`${mail.id || mail.received_at}-${mail.sender_name}-${mail.subject}`}
                className={`rounded-xl border ${style.border} bg-slate-900/70 p-5 shadow-lg backdrop-blur`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${style.badge}`}>
                    중요도 {mail.importance || 'unknown'}
                  </span>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      classificationStyles[classification] || classificationStyles.기타
                    }`}
                  >
                    {classification}
                  </span>
                  <span className="ml-auto text-xs text-slate-400">
                    {formatDate(mail.received_at)}
                  </span>
                </div>

                <div className="mt-3">
                  <p className="text-sm text-slate-400">{mail.sender_name || '보낸 사람 미상'}</p>
                  <h3 className="mt-1 text-lg font-semibold text-white">
                    {mail.subject || '제목 없음'}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-200">
                    {mail.summary || '요약 내용이 없습니다.'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MailDashboard;
