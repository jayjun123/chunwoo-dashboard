import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Select, MenuItem, Button, IconButton, TextField, Checkbox, FormControlLabel } from '@mui/material';
import { Star, StarBorder, Add, Delete } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import { db } from '../../firebase';

const SiteDetail = ({ siteId, initialData, onSave, onDelete, onCancel, onGisung }) => {
  const [formData, setFormData] = useState(initialData || {});
  const [items, setItems] = useState(initialData?.items || []);

  useEffect(() => {
    setFormData(initialData || { id: siteId });
    setItems(initialData?.items || []);
  }, [initialData, siteId]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleItemChange = (id, field, value) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };
  
  const handleAddItem = () => setItems([...items, { id: Date.now(), name: '', quantity: '', price: '' }]);
  const handleDeleteItem = (id) => setItems(items.filter(item => item.id !== id));
  
  const handleSaveClick = () => onSave({ ...formData, items });

  const commonTextFieldProps = {
    variant: "outlined",
    size: "small",
    fullWidth: true,
  };
  
  const FormLabel = ({ children }) => (
    <Typography variant="caption" sx={{ fontSize: '12px', color: '#bbb', mb: 0.5, display: 'block' }}>
      {children}
    </Typography>
  );

  return (
    <Box sx={{ p: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ display: 'flex', flex: 1, gap: 1, minHeight: 0 }}>
        {/* 현장세부입력 */}
        <Paper sx={{ p: 2, flex: 3, display: 'flex', flexDirection: 'column', gap: 1.5, overflowY: 'auto' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 2, alignItems: 'center' }}>
            <Box><FormLabel>현장명</FormLabel><TextField {...commonTextFieldProps} name="name" value={formData.name || ''} onChange={handleInputChange} /></Box>
            <Box><FormLabel>진행</FormLabel><Select {...commonTextFieldProps} name="status" value={formData.status || '진행'} onChange={handleInputChange}><MenuItem value="진행">진행</MenuItem><MenuItem value="예정">예정</MenuItem><MenuItem value="완료">완료</MenuItem><MenuItem value="보류">보류</MenuItem></Select></Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Box sx={{flex: 1}}><FormLabel>계약구분</FormLabel><Select {...commonTextFieldProps} name="contractType" value={formData.contractType || '하도급'} onChange={handleInputChange}><MenuItem value="하도급">하도급</MenuItem><MenuItem value="납품계약">납품계약</MenuItem></Select></Box>
            <FormControlLabel control={<Checkbox name="eBill" checked={!!formData.eBill} onChange={handleInputChange}/>} label="하도급지킴이" sx={{pt: 2.5}}/>
            <Box sx={{flex: 0.5}}><FormLabel>차수</FormLabel><TextField {...commonTextFieldProps} name="degree" value={formData.degree || ''} onChange={handleInputChange}/></Box>
            <Box sx={{pt: 2.5}}><IconButton onClick={() => handleInputChange({ target: { name: 'isFavorite', type: 'checkbox', checked: !formData.isFavorite }})}><Typography variant="caption" sx={{mr: 0.5}}>주요현장</Typography>{formData.isFavorite ? <Star color="primary" /> : <StarBorder />}</IconButton></Box>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
            <Box><FormLabel>계약금액</FormLabel><TextField {...commonTextFieldProps} name="contractAmount" value={formData.contractAmount || ''} onChange={handleInputChange} type="number"/></Box>
            <Box><FormLabel>선급금</FormLabel><TextField {...commonTextFieldProps} name="advance" value={formData.advance || ''} onChange={handleInputChange} type="number"/></Box>
            <Box><FormLabel>누계기성</FormLabel><TextField {...commonTextFieldProps} name="totalProgress" value={formData.totalProgress || ''} onChange={handleInputChange} type="number"/></Box>
          </Box>
          <Box><FormLabel>착공주소</FormLabel><TextField {...commonTextFieldProps} name="address" value={formData.address || ''} onChange={handleInputChange} /></Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Box><FormLabel>착공일</FormLabel><DatePicker value={formData.startDate ? new Date(formData.startDate) : null} onChange={(date) => handleInputChange({target: {name: 'startDate', value: date?.toISOString()}})} sx={{width: '100%'}}/></Box>
            <Box><FormLabel>준공예정일</FormLabel><DatePicker value={formData.endDate ? new Date(formData.endDate) : null} onChange={(date) => handleInputChange({target: {name: 'endDate', value: date?.toISOString()}})} sx={{width: '100%'}}/></Box>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
            <Box><FormLabel>회사명</FormLabel><TextField {...commonTextFieldProps} name="company" value={formData.company || ''} onChange={handleInputChange} /></Box>
            <Box><FormLabel>소장</FormLabel><TextField {...commonTextFieldProps} name="manager" value={formData.manager || ''} onChange={handleInputChange} /></Box>
            <Box><FormLabel>연락처</FormLabel><TextField {...commonTextFieldProps} name="phone" value={formData.phone || ''} onChange={handleInputChange} /></Box>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Box><FormLabel>시공팀</FormLabel><TextField {...commonTextFieldProps} name="constructionTeam" value={formData.constructionTeam || ''} onChange={handleInputChange} /></Box>
            <Box><FormLabel>기타사항</FormLabel><TextField {...commonTextFieldProps} name="desc" value={formData.desc || ''} onChange={handleInputChange} multiline rows={2}/></Box>
          </Box>
        </Paper>

        {/* 물량 내역 */}
        <Paper sx={{ p: 2, flex: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>물량 내역</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px auto', gap: 1, alignItems: 'center' }}>
              <FormLabel>항목</FormLabel>
              <FormLabel sx={{textAlign: 'right'}}>물량</FormLabel>
              <FormLabel sx={{textAlign: 'right'}}>단가</FormLabel>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, overflowY: 'auto', flex: 1 }}>
            {items.map(item => (
              <Box key={item.id} sx={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px 30px', gap: 1, alignItems: 'center' }}>
                <TextField {...commonTextFieldProps} name="name" value={item.name} onChange={(e) => handleItemChange(item.id, 'name', e.target.value)} />
                <TextField {...commonTextFieldProps} type="number" name="quantity" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)} />
                <TextField {...commonTextFieldProps} type="number" name="price" value={item.price} onChange={(e) => handleItemChange(item.id, 'price', e.target.value)} />
                <IconButton size="small" onClick={() => handleDeleteItem(item.id)}><Delete fontSize="inherit" /></IconButton>
              </Box>
            ))}
          </Box>
          <Button size="small" startIcon={<Add />} onClick={handleAddItem} variant="outlined" sx={{ mt: 1 }}>항목 추가</Button>
        </Paper>
      </Box>

      {/* 하단 버튼 */}
      <Box sx={{ pt: 1, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button variant="contained" color="primary" onClick={handleSaveClick}>저장하기</Button>
        <Button variant="outlined" color="error" onClick={() => onDelete(formData.id)}>삭제</Button>
        <Button variant="outlined" onClick={onGisung}>기성현황</Button>
      </Box>
    </Box>
  );
};

export default SiteDetail; 