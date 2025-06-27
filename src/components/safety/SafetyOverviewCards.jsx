import React, { useEffect, useState } from 'react';
import { Box, Grid, Paper, Typography, TextField, Chip, Divider, Button } from '@mui/material';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SchoolIcon from '@mui/icons-material/School';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import { db } from '../../firebase';
import { collection, query, getDocs } from 'firebase/firestore';

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
  const [search, setSearch] = useState('');
  const [siteData, setSiteData] = useState([]);
  const [inputs, setInputs] = useState({});

  useEffect(() => {
    // 4개 컬렉션에서 siteName만 추출해서 합치고, siteName별로 데이터 집계
    async function fetchAll() {
      const [ins, acc, edu, cost] = await Promise.all([
        getDocs(query(collection(db, 'safety_inspections'))),
        getDocs(query(collection(db, 'safety_accidents'))),
        getDocs(query(collection(db, 'safety_education'))),
        getDocs(query(collection(db, 'safety_costs'))),
      ]);
      const allSites = new Set([
        ...ins.docs.map(d => d.data().siteName),
        ...acc.docs.map(d => d.data().siteName),
        ...edu.docs.map(d => d.data().siteName),
        ...cost.docs.map(d => d.data().siteName),
      ].filter(Boolean));
      const arr = Array.from(allSites);
      const result = arr.map(siteName => {
        const inspections = ins.docs.map(d => d.data()).filter(d => d.siteName === siteName).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        const accidents = acc.docs.map(d => d.data()).filter(d => d.siteName === siteName).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        const educations = edu.docs.map(d => d.data()).filter(d => d.siteName === siteName).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        const costs = cost.docs.map(d => d.data()).filter(d => d.siteName === siteName).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        return {
          siteName,
          inspection: {
            count: inspections.length,
            last: inspections[0]?.title || '없음',
            status: inspections[0]?.status || '없음',
          },
          accident: {
            count: accidents.length,
            last: accidents[0]?.title || '없음',
            status: accidents[0]?.status || '없음',
          },
          education: {
            count: educations.length,
            last: educations[0]?.title || '없음',
            status: educations[0]?.status || '없음',
          },
          cost: {
            total: costs.reduce((sum, c) => sum + (Number(c.amount) || 0), 0),
            last: costs[0]?.note || '없음',
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
    <Box sx={{ width: '100%', mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <TextField
          size="small"
          placeholder="현장명 또는 키워드 검색"
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ width: 260, bgcolor: '#23272f', borderRadius: 2, input: { color: '#fff' } }}
        />
      </Box>
      <Grid container spacing={2}>
        {filtered.map(site => (
          <Grid item xs={12} md={6} lg={4} key={site.siteName}>
            <Paper sx={{ p: 2.5, bgcolor: '#181c24', borderRadius: 3, minHeight: 210, boxShadow: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, flex: 1 }}>{site.siteName}</Typography>
              </Box>
              <Divider sx={{ mb: 1.5, bgcolor: '#23272f' }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {/* 안전점검 */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minHeight: 36 }}>
                  {icons.inspection}
                  <Typography sx={{ color: '#fff', fontWeight: 500, ml: 0.5, mr: 1, minWidth: 60 }}>안전점검</Typography>
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end', gap: 0 }}>
                    <Chip
                      label={`${site.inspection.count}건`}
                      size="small"
                      sx={{
                        bgcolor: '#23272f',
                        color: '#4ade80',
                        fontWeight: 700,
                        mr: 0,
                        pr: 0,
                        px: 1,
                        minWidth: 'unset',
                        borderRadius: 1,
                        height: 32,
                        '& .MuiChip-label': { p: 0, m: 0, lineHeight: 1, display: 'inline-block' }
                      }}
                      component="span"
                      style={{ marginRight: 0 }}
                    />
                    <Chip label={site.inspection.status} size="small" sx={{ bgcolor: statusColor[site.inspection.status] || '#23272f', color: '#222', fontWeight: 700, mr: 1 }} />
                    <TextField
                      size="small"
                      variant="outlined"
                      placeholder="입력"
                      value={inputs[site.siteName]?.inspection || ''}
                      onChange={e => handleInputChange(site.siteName, 'inspection', e.target.value)}
                      sx={{
                        bgcolor: '#23272f',
                        input: { color: '#fff', pl: 0, textAlign: 'center' },
                        width: 120,
                        ml: 0,
                        mr: 1,
                        '& .MuiOutlinedInput-root': { borderRadius: 1 }
                      }}
                      InputProps={{ style: { paddingLeft: 0, textAlign: 'center' } }}
                    />
                    <Button variant="contained" size="small" sx={{ bgcolor: '#4ade80', color: '#222', fontWeight: 700, minWidth: 48 }} onClick={() => handleSave(site.siteName, 'inspection')}>저장</Button>
                    {site.inspection.last !== '없음' && (
                      <Typography sx={{ color: '#bbb', fontSize: 14, ml: 1 }}>{site.inspection.last}</Typography>
                    )}
                  </Box>
                </Box>
                {/* 사고예방 */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minHeight: 36 }}>
                  {icons.accident}
                  <Typography sx={{ color: '#fff', fontWeight: 500, ml: 0.5, mr: 1, minWidth: 60 }}>사고예방</Typography>
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end', gap: 0 }}>
                    <Chip
                      label={`${site.accident.count}건`}
                      size="small"
                      sx={{
                        bgcolor: '#23272f',
                        color: '#f87171',
                        fontWeight: 700,
                        mr: 0,
                        pr: 0,
                        px: 1,
                        minWidth: 'unset',
                        borderRadius: 1,
                        height: 32,
                        '& .MuiChip-label': { p: 0, m: 0, lineHeight: 1, display: 'inline-block' }
                      }}
                      component="span"
                      style={{ marginRight: 0 }}
                    />
                    <Chip label={site.accident.status} size="small" sx={{ bgcolor: statusColor[site.accident.status] || '#23272f', color: '#222', fontWeight: 700, mr: 1 }} />
                    <TextField
                      size="small"
                      variant="outlined"
                      placeholder="입력"
                      value={inputs[site.siteName]?.accident || ''}
                      onChange={e => handleInputChange(site.siteName, 'accident', e.target.value)}
                      sx={{
                        bgcolor: '#23272f',
                        input: { color: '#fff', pl: 0, textAlign: 'center' },
                        width: 120,
                        ml: 0,
                        mr: 1,
                        '& .MuiOutlinedInput-root': { borderRadius: 1 }
                      }}
                      InputProps={{ style: { paddingLeft: 0, textAlign: 'center' } }}
                    />
                    <Button variant="contained" size="small" sx={{ bgcolor: '#f87171', color: '#222', fontWeight: 700, minWidth: 48 }} onClick={() => handleSave(site.siteName, 'accident')}>저장</Button>
                    {site.accident.last !== '없음' && (
                      <Typography sx={{ color: '#bbb', fontSize: 14, ml: 1 }}>{site.accident.last}</Typography>
                    )}
                  </Box>
                </Box>
                {/* 안전교육 */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minHeight: 36 }}>
                  {icons.education}
                  <Typography sx={{ color: '#fff', fontWeight: 500, ml: 0.5, mr: 1, minWidth: 60 }}>안전교육</Typography>
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end', gap: 0 }}>
                    <Chip
                      label={`${site.education.count}건`}
                      size="small"
                      sx={{
                        bgcolor: '#23272f',
                        color: '#60a5fa',
                        fontWeight: 700,
                        mr: 0,
                        pr: 0,
                        px: 1,
                        minWidth: 'unset',
                        borderRadius: 1,
                        height: 32,
                        '& .MuiChip-label': { p: 0, m: 0, lineHeight: 1, display: 'inline-block' }
                      }}
                      component="span"
                      style={{ marginRight: 0 }}
                    />
                    <Chip label={site.education.status} size="small" sx={{ bgcolor: statusColor[site.education.status] || '#23272f', color: '#222', fontWeight: 700, mr: 1 }} />
                    <TextField
                      size="small"
                      variant="outlined"
                      placeholder="입력"
                      value={inputs[site.siteName]?.education || ''}
                      onChange={e => handleInputChange(site.siteName, 'education', e.target.value)}
                      sx={{
                        bgcolor: '#23272f',
                        input: { color: '#fff', pl: 0, textAlign: 'center' },
                        width: 120,
                        ml: 0,
                        mr: 1,
                        '& .MuiOutlinedInput-root': { borderRadius: 1 }
                      }}
                      InputProps={{ style: { paddingLeft: 0, textAlign: 'center' } }}
                    />
                    <Button variant="contained" size="small" sx={{ bgcolor: '#60a5fa', color: '#222', fontWeight: 700, minWidth: 48 }} onClick={() => handleSave(site.siteName, 'education')}>저장</Button>
                    {site.education.last !== '없음' && (
                      <Typography sx={{ color: '#bbb', fontSize: 14, ml: 1 }}>{site.education.last}</Typography>
                    )}
                  </Box>
                </Box>
                {/* 안전관리비 */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minHeight: 36 }}>
                  {icons.cost}
                  <Typography sx={{ color: '#fff', fontWeight: 500, ml: 0.5, mr: 1, minWidth: 60 }}>안전관리비</Typography>
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end', gap: 0 }}>
                    <Chip
                      label={site.cost.total ? site.cost.total.toLocaleString() + '원' : '0원'}
                      size="small"
                      sx={{
                        bgcolor: '#23272f',
                        color: '#facc15',
                        fontWeight: 700,
                        mr: 0,
                        pr: 0,
                        px: 1,
                        minWidth: 'unset',
                        borderRadius: 1,
                        height: 32,
                        '& .MuiChip-label': { p: 0, m: 0, lineHeight: 1, display: 'inline-block' }
                      }}
                      component="span"
                      style={{ marginRight: 0 }}
                    />
                    <TextField
                      size="small"
                      variant="outlined"
                      placeholder="입력"
                      value={inputs[site.siteName]?.cost || ''}
                      onChange={e => handleInputChange(site.siteName, 'cost', e.target.value)}
                      sx={{
                        bgcolor: '#23272f',
                        input: { color: '#fff', pl: 0, textAlign: 'center' },
                        width: 120,
                        ml: 0,
                        mr: 1,
                        '& .MuiOutlinedInput-root': { borderRadius: 1 }
                      }}
                      InputProps={{ style: { paddingLeft: 0, textAlign: 'center' } }}
                    />
                    <Button variant="contained" size="small" sx={{ bgcolor: '#facc15', color: '#222', fontWeight: 700, minWidth: 48 }} onClick={() => handleSave(site.siteName, 'cost')}>저장</Button>
                    {site.cost.last !== '없음' && (
                      <Typography sx={{ color: '#bbb', fontSize: 14, ml: 1 }}>{site.cost.last}</Typography>
                    )}
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