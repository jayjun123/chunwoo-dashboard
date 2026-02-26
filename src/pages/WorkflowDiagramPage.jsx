import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Box, Typography, Container, Paper, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import MobileSidebar from '../components/MobileSidebar';
import { FEATURE_DETAILS, DATA_PAIRS } from '../data/workflowDiagramData';
import './WorkflowDiagramPage.css';

/** 연동 대상(시스템) 노드 — 랜딩과 같은 줄 오른쪽 끝에 배치 */
const SYSTEM_NODES = [
  { id: 'pwa', type: 'system', title: 'PWA', path: '앱', features: [] },
  { id: 'auth', type: 'system', title: 'Auth', path: 'Firebase Auth', features: [] },
  { id: 'firestore', type: 'system', title: 'Firestore', path: 'DB', features: [] },
  { id: 'storage', type: 'system', title: 'Storage', path: '파일', features: [] },
  { id: 'pwa-api', type: 'system', title: 'PWA API', path: 'API', features: [] },
  { id: 'mail-proxy', type: 'system', title: 'Mail/NAS', path: '메일·NAS', features: [] },
];

/** 노드 정의: data-id, type, title, path, features[] */
const NODE_SECTIONS = [
  {
    title: '① 진입 (Entry)',
    nodes: [
      { id: 'landing', type: 'entry', title: '🏠 랜딩페이지', path: '/ , /landing, /home', features: ['로그인·회원가입 버튼', '비로그인 진입점'] },
    ],
  },
  {
    title: '② 인증 (Auth)',
    nodes: [
      { id: 'login', type: 'auth', title: '🔐 로그인', path: '/login, /auth', features: ['Firebase Auth', '이메일/비밀번호'] },
      { id: 'register', type: 'auth', title: '📝 회원가입', path: '/register', features: ['가입 후 /register-success'] },
      { id: 'forgot', type: 'auth', title: '🔑 비밀번호 찾기', path: '/forgot-password', features: ['이메일로 재설정 링크'] },
    ],
  },
  {
    title: '③ 공통 레이아웃 (ProtectedRoute + Layout)',
    nodes: [
      { id: 'layout', type: 'layout', title: '📐 Layout', path: '로그인 후 모든 메인 페이지', features: ['사이드 메뉴(일정·현장·기성·견적 등)', '헤더·알림·프로필', '하단 네비(모바일)', '권한별 메뉴 노출'] },
    ],
  },
  {
    title: '④ 일정',
    nodes: [
      { id: 'schedule', type: 'schedule', title: '📅 일정관리', path: '/schedule, /dashboard, /d', features: ['캘린더·일정 CRUD', '견적/입찰 일정 연동', '날씨·체크', '엑셀 다운로드'] },
      { id: 'gantt', type: 'schedule', title: '📊 현장일정(간트)', path: '/gantt, /g', features: ['간트 차트', '현장별 일정', '히트맵 탭'] },
    ],
  },
  {
    title: '⑤ 현장',
    nodes: [
      { id: 'sites', type: 'site', title: '🏗️ 현장관리', path: '/sites, /st', features: ['현장 목록·등록·수정·삭제', '물량내역·계약서 업로드/미리보기', '기성현황·참여회사'] },
      { id: 'sites-detail', type: 'site', title: '📋 현장 상세', path: '/sites/:siteName', features: ['단일 현장 상세', 'SiteDetail 컴포넌트'] },
      { id: 'company-dist', type: 'site', title: '📊 회사별 현장', path: '/company-distribution, /cd', features: ['기간 설정·연도/일자', '회사별 그룹·총계약금액', '엑셀 다운로드(번호·회사명)'] },
      { id: 'whole-list', type: 'site', title: '📄 전체 리스트', path: '/whole-list, /wl', features: ['전체 현장 목록', '날짜/상태 필터'] },
      { id: 'importantsite', type: 'site', title: '⭐ 주요현장', path: '/importantsite, /is', features: ['즐겨찾기 현장'] },
      { id: 'mapping', type: 'etc', title: '🗺️ MAP', path: '/mapping, /map', features: ['지도·현장 위치'] },
    ],
  },
  {
    title: '⑥ 기성·지출·청구',
    nodes: [
      { id: 'progress', type: 'money', title: '💰 기성관리', path: '/progress, /p', features: ['기성현황·차수별', '선급금/입금완료 합산', '엑셀·청구서'] },
      { id: 'gisung', type: 'money', title: '📑 기성현황', path: '/gisung, /gs', features: ['현장별 기성 테이블', '입금확인·선급금 행 반영', '기성등록·청구서 업로드'] },
      { id: 'cost', type: 'money', title: '💸 지출', path: '/cost, /c', features: ['현장별 지출·자재/노무/장비 등'] },
      { id: 'claims', type: 'money', title: '📌 청구예정', path: '/claims, /cl', features: ['청구예정 목록', '기성과 연동'] },
      { id: 'settlement', type: 'money', title: '📋 정산관리', path: '/settlement, /settlement/:siteId', features: ['정산 목록·상세'] },
    ],
  },
  {
    title: '⑦ 견적',
    nodes: [
      { id: 'estimates', type: 'estimate', title: '📄 견적요청', path: '/estimates, /es', features: ['견적 목록·등록·상태', 'AI 메일 요약에서 적용', '엑셀·납품계약서'] },
      { id: 'estimate-analysis', type: 'estimate', title: '📈 견적 분석', path: '/estimate-analysis', features: ['견적 분석 뷰'] },
    ],
  },
  {
    title: '⑧ 시공·거래처',
    nodes: [
      { id: 'daema-team', type: 'people', title: '👷 시공팀', path: '/daema-team, /dt', features: ['팀별 카드·진행 현장', '5열 카드·스크롤'] },
      { id: 'team-settlement', type: 'people', title: '🤝 팀 정산', path: '/team-settlement', features: ['팀별 정산'] },
      { id: 'vendors', type: 'people', title: '📢 입찰현황', path: '/vendors, /v', features: ['입찰·견적 현황'] },
      { id: 'vendor-mgmt', type: 'people', title: '🏢 거래처관리', path: '/vendor-management, /vm', features: ['거래처 CRUD'] },
    ],
  },
  {
    title: '⑨ 안전',
    nodes: [
      { id: 'safety', type: 'safety', title: '🦺 안전관리', path: '/safety, /sf', features: ['안전 대시·탭'] },
      { id: 'safety-inspections', type: 'safety', title: '📋 안전점검', path: '/safety-inspections', features: ['점검 목록'] },
      { id: 'safety-accidents', type: 'safety', title: '⚠️ 사고/사고관리', path: '/safety-accidents', features: ['사고 기록'] },
      { id: 'safety-education', type: 'safety', title: '📚 안전교육', path: '/safety-education', features: ['교육 이력'] },
      { id: 'safety-costs', type: 'safety', title: '📊 안전 보고', path: '/safety-costs', features: ['안전 관련 보고'] },
    ],
  },
  {
    title: '⑩ 기타',
    nodes: [
      { id: 'discussions', type: 'etc', title: '💬 토론의견', path: '/discussions, /dc', features: ['토론방·댓글'] },
      { id: 'confidential', type: 'etc', title: '🔒 대외비', path: '/confidential, /cf', features: ['대외비 문서·악성미수금'] },
      { id: 'ai-summary', type: 'etc', title: '📧 AI 메일 요약', path: '/ai-summary', features: ['메일 목록·요약·검색', '제외 키워드·견적 연동'] },
      { id: 'quantity-check', type: 'etc', title: '📐 물량 파악', path: '/quantity-check', features: ['물량 확인'] },
      { id: 'todo', type: 'etc', title: '✅ 할일', path: '/todo-list, /todo/all', features: ['할일 목록'] },
      { id: 'settings', type: 'etc', title: '⚙️ 설정', path: '/settings, /set', features: ['앱 설정'] },
      { id: 'profile', type: 'etc', title: '👤 프로필', path: '/profile, /pr', features: ['내 정보'] },
    ],
  },
  {
    title: '⑪ 관리자',
    nodes: [
      { id: 'members', type: 'admin', title: '👥 멤버 관리', path: '/members, /m', features: ['회원 목록·등록·수정'] },
      { id: 'permissions', type: 'admin', title: '🔐 권한 관리', path: '/permissions, /pm', features: ['메뉴별 권한 설정'] },
      { id: 'users', type: 'admin', title: '👤 사용자 관리', path: '/users, /u', features: ['사용자·역할'] },
    ],
  },
];

const LEGEND_ITEMS = [
  { color: '#4caf50', label: '진입' },
  { color: '#8d6e63', label: '인증' },
  { color: '#2196f3', label: '레이아웃' },
  { color: '#9c27b0', label: '일정' },
  { color: '#4caf50', label: '현장' },
  { color: '#2196f3', label: '기성·지출' },
  { color: '#ff9800', label: '견적' },
  { color: '#c4a574', label: '시공·거래처' },
  { color: '#f44336', label: '안전' },
  { color: '#00bcd4', label: '기타' },
  { color: '#e91e63', label: '관리자' },
];

const WorkflowDiagramPage = () => {
  const [popup, setPopup] = useState({ open: false, nodeName: '', feature: null });
  const [pathData, setPathData] = useState({ paths: [], width: 0, height: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const workflowRef = useRef(null);

  const measureAndDrawPaths = useCallback(() => {
    const workflow = workflowRef.current;
    if (!workflow) return;
    const workflowRect = workflow.getBoundingClientRect();
    const nodes = workflow.querySelectorAll('.node[data-id]');
    const idToRect = {};
    nodes.forEach((el) => {
      const id = el.getAttribute('data-id');
      if (!id) return;
      const r = el.getBoundingClientRect();
      idToRect[id] = {
        left: r.left - workflowRect.left,
        top: r.top - workflowRect.top,
        right: r.right - workflowRect.left,
        bottom: r.bottom - workflowRect.top,
        width: r.width,
        height: r.height,
      };
    });
    const paths = [];
    DATA_PAIRS.forEach(([fromId, toId]) => {
      const from = idToRect[fromId];
      const to = idToRect[toId];
      if (!from || !to) return;
      const x1 = from.right;
      const y1 = from.top + from.height / 2;
      const x2 = to.left;
      const y2 = to.top + to.height / 2;
      paths.push({ fromId, toId, x1, y1, x2, y2 });
    });
    let maxX = workflow.offsetWidth || workflowRect.width;
    let maxY = workflow.offsetHeight || workflowRect.height;
    paths.forEach((p) => {
      maxX = Math.max(maxX, p.x1, p.x2);
      maxY = Math.max(maxY, p.y1, p.y2);
    });
    setPathData({
      paths,
      width: Math.ceil(maxX) + 40,
      height: Math.ceil(maxY) + 40,
    });
  }, []);

  useEffect(() => {
    const runMeasure = () => requestAnimationFrame(() => requestAnimationFrame(measureAndDrawPaths));
    runMeasure();
    const t1 = setTimeout(runMeasure, 150);
    const t2 = setTimeout(runMeasure, 450);
    const t3 = setTimeout(runMeasure, 900);
    const workflow = workflowRef.current;
    const ro = workflow && typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(runMeasure)
      : null;
    if (ro && workflow) ro.observe(workflow);
    const resizeHandler = () => requestAnimationFrame(measureAndDrawPaths);
    window.addEventListener('resize', resizeHandler);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (ro && workflow) ro.unobserve(workflow);
      window.removeEventListener('resize', resizeHandler);
    };
  }, [measureAndDrawPaths]);

  const openFeaturePopup = useCallback((nodeId, nodeTitle, featureIndex, featureText) => {
    const list = FEATURE_DETAILS[nodeId];
    const feature = list && list[featureIndex];
    setPopup({
      open: true,
      nodeName: nodeTitle,
      feature: feature || { title: featureText, connection: '해당 페이지와 연동된 시스템은 통합 다이어그램을 참고하세요.', desc: '선택한 항목의 상세 설명입니다.' },
    });
  }, []);

  const closePopup = useCallback(() => setPopup((p) => ({ ...p, open: false })), []);

  /** HTML처럼 이벤트 위임: workflow 영역 클릭 시 노드 선택 / 불릿 클릭 시 팝업 */
  const handleWorkflowClick = useCallback(
    (e) => {
      const workflow = workflowRef.current;
      if (!workflow || !workflow.contains(e.target)) return;

      const featureSpan = e.target.closest('.node-features span');
      if (featureSpan) {
        const nodeEl = featureSpan.closest('.node[data-id]');
        if (!nodeEl) return;
        const nodeId = nodeEl.getAttribute('data-id');
        const nodeTitleEl = nodeEl.querySelector('.node-title');
        const nodeTitle = nodeTitleEl ? nodeTitleEl.textContent.trim() : nodeId;
        const allSpans = nodeEl.querySelectorAll('.node-features span');
        const idx = Array.prototype.indexOf.call(allSpans, featureSpan);
        const featureText = featureSpan.textContent.trim();
        setSelectedNodeId(nodeId);
        openFeaturePopup(nodeId, nodeTitle, idx, featureText);
        e.stopPropagation();
        e.preventDefault();
        return;
      }

      const nodeEl = e.target.closest('.node[data-id]');
      if (nodeEl) {
        const nodeId = nodeEl.getAttribute('data-id');
        setSelectedNodeId((prev) => (prev === nodeId ? null : nodeId));
        e.stopPropagation();
      } else {
        setSelectedNodeId(null);
      }
    },
    [openFeaturePopup]
  );

  const handleWorkflowKeyDown = useCallback(
    (e) => {
      if (e.key !== 'Enter') return;
      const active = document.activeElement;
      const workflow = workflowRef.current;
      if (!workflow || !active || !workflow.contains(active)) return;

      const featureSpan = active.closest('.node-features span');
      if (featureSpan) {
        const nodeEl = featureSpan.closest('.node[data-id]');
        if (!nodeEl) return;
        const nodeId = nodeEl.getAttribute('data-id');
        const nodeTitleEl = nodeEl.querySelector('.node-title');
        const nodeTitle = nodeTitleEl ? nodeTitleEl.textContent.trim() : nodeId;
        const allSpans = nodeEl.querySelectorAll('.node-features span');
        const idx = Array.prototype.indexOf.call(allSpans, featureSpan);
        const featureText = featureSpan.textContent.trim();
        setSelectedNodeId(nodeId);
        openFeaturePopup(nodeId, nodeTitle, idx, featureText);
        e.preventDefault();
        return;
      }

      const nodeEl = active.closest('.node[data-id]');
      if (nodeEl) {
        const nodeId = nodeEl.getAttribute('data-id');
        setSelectedNodeId((prev) => (prev === nodeId ? null : nodeId));
        e.preventDefault();
      }
    },
    [openFeaturePopup]
  );

  return (
    <Box
      sx={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        position: 'relative',
        overflow: 'hidden',
        paddingTop: '64px',
      }}
    >
      <MobileSidebar />
      <Container
        maxWidth={false}
        disableGutters
        sx={{
          flex: 1,
          minHeight: 0,
          py: 2,
          px: 0,
          width: '100%',
          maxWidth: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 2,
            borderRadius: 2,
            flex: 1,
            minHeight: 0,
            width: '100%',
            maxWidth: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <Typography variant="h5" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
            🔗 시스템 연동도
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            랜딩 → 인증 → 페이지 연동 및 기능 · 노드 클릭 시 불릿을 누르면 연동/기능 설명을 볼 수 있습니다.
          </Typography>

          <Box
            className="wf-diagram scrollbar-hidden"
            onClick={(e) => {
              if (!workflowRef.current?.contains(e.target)) setSelectedNodeId(null);
            }}
            sx={{
              flex: 1,
              minHeight: 0,
              overflow: 'auto',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
            }}
          >
            <div className="canvas">
              <div className="workflow" ref={workflowRef} onClick={handleWorkflowClick} onKeyDown={handleWorkflowKeyDown} role="presentation">
                {/* 연결선 베이스 레이어 (노드 뒤) */}
                {pathData.width > 0 && pathData.height > 0 && (
                  <svg className="workflow-svg-layer" viewBox={`0 0 ${pathData.width} ${pathData.height}`} preserveAspectRatio="none" style={{ pointerEvents: 'none' }} aria-hidden="true">
                    <g>
                      {pathData.paths.map((p, i) => {
                        const isHighlight = selectedNodeId && (p.fromId === selectedNodeId || p.toId === selectedNodeId);
                        if (isHighlight) return null;
                        const midX = (p.x1 + p.x2) / 2;
                        const d = `M ${p.x1} ${p.y1} C ${midX} ${p.y1}, ${midX} ${p.y2}, ${p.x2} ${p.y2}`;
                        return (
                          <path
                            key={i}
                            d={d}
                            fill="none"
                            stroke="rgba(255,255,255,0.45)"
                            strokeWidth={1.5}
                            strokeDasharray="4 2"
                          />
                        );
                      })}
                    </g>
                  </svg>
                )}

                <div className="workflow-nodes-layer">
                  {/* 연동 흐름 */}
                  <div className="section flow-strip">
                    <div className="section-title">연동 흐름 (Flow)</div>
                    <div className="flow-row">
                      <span className="flow-node">랜딩 /</span>
                      <span className="flow-arrow">→</span>
                      <span className="flow-node">로그인 / 회원가입</span>
                      <span className="flow-arrow">→</span>
                      <span className="flow-node">ProtectedRoute</span>
                      <span className="flow-arrow">→</span>
                      <span className="flow-node">Layout (메뉴)</span>
                      <span className="flow-arrow">→</span>
                      <span className="flow-node">대시보드/일정 (기본)</span>
                      <span className="flow-arrow">→</span>
                      <span className="flow-node">메뉴 클릭 → 각 페이지</span>
                    </div>
                  </div>

                  {/* 노드 섹션들 */}
                  {NODE_SECTIONS.map((sec) => (
                    <div key={sec.title} className="section">
                      <div className="section-title">{sec.title}</div>
                      <div className={sec.title === '① 진입 (Entry)' ? 'row row-entry-with-system' : 'row'}>
                        {sec.nodes.map((node) => (
                          <div
                            key={node.id}
                            className={`node node-${node.type} ${selectedNodeId === node.id ? 'selected' : ''}`}
                            data-id={node.id}
                            role="button"
                            tabIndex={0}
                            title="클릭 시 연결선 강조, 불릿 클릭 시 상세 설명"
                          >
                            <span className="node-title">{node.title}</span>
                            <span className="node-path">{node.path}</span>
                            <span className="node-features">
                              {node.features.map((text, idx) => (
                                <span key={idx} role="button" tabIndex={0}>
                                  {text}
                                </span>
                              ))}
                            </span>
                            <span className="connector" />
                          </div>
                        ))}
                        {sec.title === '① 진입 (Entry)' && (
                          <>
                            <div className="row-entry-spacer" aria-hidden="true" />
                            <div className="row row-system-nodes">
                              {SYSTEM_NODES.map((node) => (
                                <div
                                  key={node.id}
                                  className={`node node-${node.type} ${selectedNodeId === node.id ? 'selected' : ''}`}
                                  data-id={node.id}
                                  role="button"
                                  tabIndex={0}
                                  title="클릭 시 연결선 강조"
                                >
                                  <span className="node-title">{node.title}</span>
                                  <span className="node-path">{node.path}</span>
                                  <span className="node-features" />
                                  <span className="connector" />
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 선택 시 강조 연결선 레이어 (노드 위) — 클릭은 노드로 통과 */}
                {pathData.width > 0 && pathData.height > 0 && selectedNodeId && (
                  <svg
                    className="workflow-svg-layer workflow-svg-layer-overlay"
                    viewBox={`0 0 ${pathData.width} ${pathData.height}`}
                    preserveAspectRatio="none"
                    style={{ pointerEvents: 'none' }}
                    aria-hidden="true"
                  >
                    <g>
                      {pathData.paths.map((p, i) => {
                        const isHighlight = p.fromId === selectedNodeId || p.toId === selectedNodeId;
                        if (!isHighlight) return null;
                        const midX = (p.x1 + p.x2) / 2;
                        const d = `M ${p.x1} ${p.y1} C ${midX} ${p.y1}, ${midX} ${p.y2}, ${p.x2} ${p.y2}`;
                        return (
                          <path
                            key={i}
                            d={d}
                            fill="none"
                            stroke="#ffc850"
                            strokeWidth={2.5}
                            strokeDasharray="none"
                          />
                        );
                      })}
                    </g>
                  </svg>
                )}
              </div>
            </div>

            <div className="legend">
              {LEGEND_ITEMS.map((item) => (
                <div key={item.label} className="legend-item">
                  <span className="legend-dot" style={{ background: item.color }} />
                  {item.label}
                </div>
              ))}
            </div>
          </Box>
        </Paper>
      </Container>

      <Dialog open={popup.open} onClose={closePopup} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#2a2e3a', color: '#e0e0e0' } }}>
        <DialogTitle sx={{ borderBottom: '1px solid #444', bgcolor: '#333', color: '#ffc850' }}>
          {popup.nodeName && popup.feature ? `${popup.nodeName} · ${popup.feature.title}` : '연동/기능 설명'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {popup.feature && (
            <>
              <Typography variant="subtitle2" color="primary" sx={{ color: '#90caf9', mb: 0.5 }}>연동</Typography>
              <Typography variant="body2" sx={{ mb: 1.5 }}>{popup.feature.connection || '-'}</Typography>
              <Typography variant="subtitle2" sx={{ color: '#90caf9', mb: 0.5 }}>기능 설명</Typography>
              <Typography variant="body2">{popup.feature.desc || '-'}</Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closePopup} variant="contained" color="inherit" sx={{ bgcolor: '#444' }}>닫기</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkflowDiagramPage;
