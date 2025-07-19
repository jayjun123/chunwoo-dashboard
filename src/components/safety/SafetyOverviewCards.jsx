import React, { useEffect, useState } from 'react';
import { Box, Grid, Paper, Typography, TextField, Chip, Divider, Button, useTheme, useMediaQuery } from '@mui/material';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SchoolIcon from '@mui/icons-material/School';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import { db } from '../../firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const icons = {
  inspection: <AssignmentTurnedInIcon sx={{ color: '#4ade80', mr: 0.5 }} fontSize="small" />,
  accident: <WarningAmberIcon sx={{ color: '#f87171', mr: 0.5 }} fontSize="small" />,
  education: <SchoolIcon sx={{ color: '#60a5fa', mr: 0.5 }} fontSize="small" />,
  cost: <MonetizationOnIcon sx={{ color: '#facc15', mr: 0.5 }} fontSize="small" />,
};

const statusColor = {
  완료: '#4ade80',
  진행중: '#facc15',
  예정: '#60a5fa',
};

function SafetyOverviewCards() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [search, setSearch] = useState('');
  const [siteData, setSiteData] = useState([]);
  const [inputs, setInputs] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    // 4개 컬렉션 + sites에서 siteId→siteName 매핑
    async function fetchAll() {
      const [ins, acc, edu, cost, sitesSnap] = await Promise.all([
        getDocs(query(collection(db, 'safety_inspections'))),
        getDocs(query(collection(db, 'safety_accidents'))),
        getDocs(query(collection(db, 'safety_education'))),
        getDocs(query(collection(db, 'safety_costs'))),
        getDocs(query(collection(db, 'sites'))),
      ]);
      const sitesMap = {};
      sitesSnap.docs.forEach(doc => {
        const d = doc.data();
        sitesMap[doc.id] = d.name;
      });
      // siteName이 없으면 siteId로 매핑
      function getSiteName(d) {
        return d.siteName || sitesMap[d.siteId] || d.siteId || '';
      }
      const allSites = new Set([
        ...ins.docs.map(d => getSiteName(d.data())),
        ...acc.docs.map(d => getSiteName(d.data())),
        ...edu.docs.map(d => getSiteName(d.data())),
        ...cost.docs.map(d => getSiteName(d.data())),
      ].filter(Boolean));
      const arr = Array.from(allSites);
      const siteArr = arr.length > 0 ? arr : ['등록된 현장 없음'];
      const result = siteArr.map(siteName => {
        const inspections = ins.docs.map(d => d.data()).filter(d => getSiteName(d) === siteName);
        const accidents = acc.docs.map(d => d.data()).filter(d => getSiteName(d) === siteName);
        const educations = edu.docs.map(d => d.data()).filter(d => getSiteName(d) === siteName);
        const costs = cost.docs.map(d => d.data()).filter(d => getSiteName(d) === siteName);
        return {
          siteName,
          inspection: {
            count: inspections.length || 0,
            last: inspections[0]?.title || '',
            status: inspections[0]?.status || '',
          },
          accident: {
            count: accidents.length || 0,
            last: accidents[0]?.title || '',
            status: accidents[0]?.status || '',
          },
          education: {
            count: educations.length || 0,
            last: educations[0]?.title || '',
            status: educations[0]?.status || '',
          },
          cost: {
            total: costs.reduce((sum, c) => sum + (Number(c.amount) || 0), 0) || 0,
            last: costs[0]?.note || ''
          },
        };
      });
      setSiteData(result);
    }
    fetchAll();
  }, []);

  // 검색 필터
  const filtered = siteData.filter(site =>
    site.siteName.toLowerCase().includes(search.toLowerCase()) ||
    site.inspection.last.toLowerCase().includes(search.toLowerCase()) ||
    site.accident.last.toLowerCase().includes(search.toLowerCase()) ||
    site.education.last.toLowerCase().includes(search.toLowerCase()) ||
    site.cost.last.toLowerCase().includes(search.toLowerCase())
  );

  // 입력값 변경 핸들러
  const handleInputChange = (siteName, type, value) => {
    setInputs(prev => ({
      ...prev,
      [siteName]: {
        ...prev[siteName],
        [type]: value
      }
    }));
  };

  // 저장 버튼 클릭 시(임시: 콘솔 출력)
  const handleSave = (siteName, type) => {
    const value = inputs[siteName]?.[type] || '';
    console.log(`[${siteName}] ${type} 입력값:`, value);
    // 실제 저장 로직은 추후 구현
  };

  return (
    <Box sx={{ 
      width: '100%', 
      mb: 3, 
      maxWidth: isMobile ? '100vw' : '100%',
      px: isMobile ? '16px' : 0
    }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        mb: 2,
        justifyContent: isMobile ? 'center' : 'flex-start'
      }}>
        <TextField
          size="small"
          placeholder="현장명 또는 키워드 검색"
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ 
            width: isMobile ? '100%' : 260, 
            bgcolor: '#23272f', 
            borderRadius: 2, 
            input: { color: '#fff' },
            '& .MuiOutlinedInput-root': {
              fontSize: isMobile ? '0.9rem' : 'inherit'
            }
          }}
        />
      </Box>
      


      <Grid container spacing={isMobile ? 2 : 2.5}>
        {filtered.map(site => (
          <Grid item xs={12} md={4} lg={4} key={site.siteName} sx={{ width: '100%', px: isMobile ? 0 : 0 }}>
            <Paper sx={{ 
              p: isMobile ? 1.5 : 2.5, 
              bgcolor: '#181c24', 
              borderRadius: isMobile ? 2 : 3, 
              minHeight: isMobile ? 200 : 210, 
              boxShadow: 3,
              position: 'relative',
              ml: isMobile ? 0 : 0,
              width: '100%'
            }}>
              {/* 그리드 오버레이 */}
              <Box sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'none',
                zIndex: 1,
                opacity: 0.1,
                backgroundImage: `
                  linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                `,
                backgroundSize: '20px 40px',
                borderRadius: 3
              }} />
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, position: 'relative', zIndex: 2 }}>
                <Typography 
                  variant={isMobile ? "h6" : "h6"} 
                  sx={{ 
                    color: '#fff', 
                    fontWeight: 700, 
                    flex: 1,
                    fontSize: '1rem'
                  }}
                >
                  {site.siteName}
                </Typography>
              </Box>
              <Divider sx={{ mb: 1.5, bgcolor: '#23272f' }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 0.1 : 0.15, position: 'relative', zIndex: 2 }}>
                {/* 안전점검 */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minHeight: 35, position: 'relative' }}>
                  {icons.inspection}
                  <Typography sx={{ minWidth: 60, fontSize: isMobile ? '0.8rem' : '1rem' }}>{isMobile ? ' 안전점검' : ' 안 전 점 검'}</Typography>
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-start', gap: 0 }}>
                    <Box sx={{ ml: isMobile ? -1.25 : -0.625, width: 110, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ width: isMobile ? 50 : 60 }} />
                      <Chip
                        label={`${site.inspection.count || 0}건`}
                        size="small"
                        sx={{
                          bgcolor: '#23272f',
                          color: '#4ade80',
                          fontWeight: 700,
                          px: 1,
                          minWidth: 'unset',
                          borderRadius: 1,
                          height: isMobile ? 28 : 32,
                          fontSize: isMobile ? '0.7rem' : '0.9rem',
                          '& .MuiChip-label': { p: 0, m: 0, lineHeight: 1, display: 'inline-block' },
                          alignSelf: 'center'
                        }}
                        component="span"
                      />
                    </Box>
                    <TextField
                      size="small"
                      variant="outlined"
                      placeholder="입력"
                      value={inputs[site.siteName]?.inspection || ''}
                      onChange={e => handleInputChange(site.siteName, 'inspection', e.target.value)}
                      sx={{ 
                        width: isMobile ? 80 : 105, 
                        height: 28, 
                        ml: isMobile ? 0 : -0.625, 
                        mr: 1, 
                        '& .MuiOutlinedInput-root': { 
                          borderRadius: 1, 
                          height: 28, 
                          p: 0,
                          fontSize: isMobile ? '0.8rem' : '1rem'
                        } 
                      }}
                      InputProps={{ 
                        style: { 
                          height: 28, 
                          padding: 0, 
                          fontSize: isMobile ? '0.8rem' : '1rem', 
                          textAlign: 'center', 
                          lineHeight: 1 
                        } 
                      }}
                    />
                  </Box>
                </Box>
                {/* 사고예방 */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minHeight: 35, position: 'relative' }}>
                  {icons.accident}
                  <Typography sx={{ minWidth: 60, fontSize: isMobile ? '0.8rem' : '1rem' }}>{isMobile ? ' 사고예방' : ' 사 고 예 방'}</Typography>
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-start', gap: 0 }}>
                    <Box sx={{ ml: isMobile ? -1.25 : -0.625, width: 110, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ width: isMobile ? 50 : 60 }} />
                      <Chip
                        label={`${site.accident.count || 0}건`}
                        size="small"
                        sx={{
                          bgcolor: '#23272f',
                          color: '#f87171',
                          fontWeight: 700,
                          px: 1,
                          minWidth: 'unset',
                          borderRadius: 1,
                          height: isMobile ? 28 : 32,
                          fontSize: isMobile ? '0.7rem' : '0.9rem',
                          '& .MuiChip-label': { p: 0, m: 0, lineHeight: 1, display: 'inline-block' },
                          alignSelf: 'center'
                        }}
                        component="span"
                      />
                    </Box>
                    <TextField
                      size="small"
                      variant="outlined"
                      placeholder="입력"
                      value={inputs[site.siteName]?.accident || ''}
                      onChange={e => handleInputChange(site.siteName, 'accident', e.target.value)}
                      sx={{ 
                        width: isMobile ? 80 : 105, 
                        height: 28, 
                        ml: isMobile ? 0 : -0.625, 
                        mr: 1, 
                        '& .MuiOutlinedInput-root': { 
                          borderRadius: 1, 
                          height: 28, 
                          p: 0,
                          fontSize: isMobile ? '0.8rem' : '1rem'
                        } 
                      }}
                      InputProps={{ 
                        style: { 
                          height: 28, 
                          padding: 0, 
                          fontSize: isMobile ? '0.8rem' : '1rem', 
                          textAlign: 'center', 
                          lineHeight: 1 
                        } 
                      }}
                    />
                  </Box>
                </Box>
                {/* 안전교육 */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minHeight: 35, position: 'relative' }}>
                  {icons.education}
                  <Typography sx={{ minWidth: 60, fontSize: isMobile ? '0.8rem' : '1rem' }}>{isMobile ? ' 안전교육' : ' 안 전 교 육'}</Typography>
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-start', gap: 0 }}>
                    <Box sx={{ ml: isMobile ? -1.25 : -0.625, width: 110, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ width: isMobile ? 50 : 60 }} />
                      <Chip
                        label={`${site.education.count || 0}건`}
                        size="small"
                        sx={{
                          bgcolor: '#23272f',
                          color: '#60a5fa',
                          fontWeight: 700,
                          px: 1,
                          minWidth: 'unset',
                          borderRadius: 1,
                          height: isMobile ? 28 : 32,
                          fontSize: isMobile ? '0.7rem' : '0.9rem',
                          '& .MuiChip-label': { p: 0, m: 0, lineHeight: 1, display: 'inline-block' },
                          alignSelf: 'center'
                        }}
                        component="span"
                      />
                    </Box>
                    <TextField
                      size="small"
                      variant="outlined"
                      placeholder="입력"
                      value={inputs[site.siteName]?.education || ''}
                      onChange={e => handleInputChange(site.siteName, 'education', e.target.value)}
                      sx={{ 
                        width: isMobile ? 80 : 105, 
                        height: 28, 
                        ml: isMobile ? 0 : -0.625, 
                        mr: 1, 
                        '& .MuiOutlinedInput-root': { 
                          borderRadius: 1, 
                          height: 28, 
                          p: 0,
                          fontSize: isMobile ? '0.8rem' : '1rem'
                        } 
                      }}
                      InputProps={{ 
                        style: { 
                          height: 28, 
                          padding: 0, 
                          fontSize: isMobile ? '0.8rem' : '1rem', 
                          textAlign: 'center', 
                          lineHeight: 1 
                        } 
                      }}
                    />
                  </Box>
                </Box>
                {/* 안전관리비 */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minHeight: 35, position: 'relative' }}>
                  {icons.cost}
                  <Typography sx={{ minWidth: 60, fontSize: isMobile ? '0.8rem' : '1rem' }}>안전관리비</Typography>
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-start', gap: 0 }}>
                    <Box sx={{ ml: isMobile ? -1.25 : -0.625, width: 110, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ width: isMobile ? 50 : 60 }} />
                      <Chip
                        label={site.cost.total ? site.cost.total.toLocaleString() + '원' : '0원'}
                        size="small"
                        sx={{
                          bgcolor: '#23272f',
                          color: '#facc15',
                          fontWeight: 700,
                          px: 1,
                          minWidth: 'unset',
                          borderRadius: 1,
                          height: isMobile ? 28 : 32,
                          '& .MuiChip-label': { p: 0, m: 0, lineHeight: 1, display: 'inline-block' },
                          fontSize: isMobile ? '0.7rem' : '0.9rem',
                          alignSelf: 'center'
                        }}
                        component="span"
                      />
                    </Box>
                    <TextField
                      size="small"
                      variant="outlined"
                      placeholder="입력"
                      value={inputs[site.siteName]?.cost || ''}
                      onChange={e => handleInputChange(site.siteName, 'cost', e.target.value)}
                      sx={{ 
                        width: isMobile ? 80 : 105, 
                        height: 28, 
                        ml: isMobile ? 0 : -0.625, 
                        mr: 1, 
                        '& .MuiOutlinedInput-root': { 
                          borderRadius: 1, 
                          height: 28, 
                          p: 0,
                          fontSize: isMobile ? '0.8rem' : '1rem'
                        } 
                      }}
                      InputProps={{ 
                        style: { 
                          height: 28, 
                          padding: 0, 
                          fontSize: isMobile ? '0.8rem' : '1rem', 
                          textAlign: 'center', 
                          lineHeight: 1 
                        } 
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export default SafetyOverviewCards; 