import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  FormControl,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  IconButton,
  Autocomplete,
  Grid,
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import IntegratedStatusBox from './IntegratedStatusBox';
import SiteGisungSummary from './SiteGisungSummary';
import { CONTRACT_TYPE_OPTIONS as CONTRACT_TYPE_OPTIONS_DEFAULT, WORK_SCOPE_OPTIONS as WORK_SCOPE_OPTIONS_DEFAULT, STATUS_OPTIONS as STATUS_OPTIONS_DEFAULT } from '../../utils/siteConstants';
import { formatContractAmount as formatContractAmountDefault, formatAdvanceAmount as formatAdvanceAmountDefault, formatGisungAmount as formatGisungAmountDefault, formatSafetyCost as formatSafetyCostDefault } from '../../utils/formatUtils';

export default function SiteDetailForm({ p }) {
  const {
    form,
    handleChange,
    isEditing,
    setIsEditing,
    selectedSite,
    isMobile,
    handleNewSite,
    handleWholeList,
    handleDistributionView,
    siteIntegratedStatus,
    totalIntegratedStatus,
    inputRef1,
    inputRef2,
    addressRef,
    startDateRef,
    endDateRef,
    companyNameRef,
    managerRef,
    phoneRef,
    teamRef,
    descRef,
    windowCompanyRef,
    noteRef,
    scrollFocus,
    isReadOnly,
    formatDateForInput,
    formatContractAmount = formatContractAmountDefault,
    formatAdvanceAmount = formatAdvanceAmountDefault,
    formatGisungAmount = formatGisungAmountDefault,
    formatSafetyCost = formatSafetyCostDefault,
    CONTRACT_TYPE_OPTIONS = CONTRACT_TYPE_OPTIONS_DEFAULT,
    WORK_SCOPE_OPTIONS = WORK_SCOPE_OPTIONS_DEFAULT,
    STATUS_OPTIONS = STATUS_OPTIONS_DEFAULT,
    vendors,
    setCompanyFocused,
    contractInputRef,
    handleContractFileChange,
    setShowContractPreview,
    contractUploading,
    setShowSitePhotosSection,
    sitePhotosSectionRef,
    setLoading,
    setLoadingMessage,
    handleSave,
    isSaving,
    handleEditClick,
    handleViewEstimate,
    handleDownloadNapfoomContract,
    handleDelete,
    handleGisung,
    loading,
  } = p;

  const integratedStatus = (siteIntegratedStatus || (totalIntegratedStatus && !selectedSite)) ? (siteIntegratedStatus || totalIntegratedStatus) : null;

  return (
    <Paper elevation={3} sx={{
      flex: { xs: 'none', md: 1 },
      width: { xs: '100%', md: 'auto' },
      display: { xs: isMobile && isEditing ? 'flex' : 'none', md: 'flex' },
      flexDirection: 'column',
      bgcolor: '#232734',
      p: isMobile ? 1 : 3,
      borderRadius: 2,
      minWidth: 0,
      height: { xs: 'auto', md: '100%' },
      position: isMobile ? 'relative' : 'static',
      top: isMobile ? '0px' : 'auto',
      left: isMobile ? '0px' : 'auto',
      overflow: 'visible',
      mb: '30px'
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: isMobile ? 1 : 2 }}>
        <Typography variant="h5" fontWeight="bold" sx={{ fontSize: isMobile ? '1.1rem' : 'inherit' }}>
          {isMobile && isEditing && !selectedSite ? '새 현장 등록' : '현장 상세 정보'}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
          {isMobile && isEditing && !selectedSite ? (
            <Button
              variant="outlined"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsEditing(false);
              }}
              size="small"
              sx={{
                fontSize: '0.7rem',
                color: '#f44336',
                borderColor: '#f44336',
                '&:hover': {
                  borderColor: '#d32f2f',
                  bgcolor: 'rgba(244, 67, 54, 0.1)'
                }
              }}
            >
              취소
            </Button>
          ) : (
            <>
              <Button
                variant="contained"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleNewSite();
                }}
                size={isMobile ? 'small' : 'small'}
                sx={{
                  fontSize: isMobile ? '0.7rem' : 'inherit',
                  bgcolor: '#4caf50',
                  minHeight: '44px',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                  '&:hover': {
                    bgcolor: '#388e3c'
                  }
                }}
              >
                + 새현장
              </Button>
              <Button variant="outlined" onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleWholeList();
              }} size={isMobile ? 'small' : 'small'} sx={{ fontSize: isMobile ? '0.7rem' : 'inherit', display: isMobile ? 'none' : 'inline-flex' }}>
                전체 List
              </Button>
              <Button variant="text" onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDistributionView();
              }} size={isMobile ? 'small' : 'small'} sx={{
                fontSize: isMobile ? '0.7rem' : 'inherit',
                display: isMobile ? 'none' : 'inline-flex',
                ml: 1,
                minWidth: 'auto',
                px: 1,
                border: 'none',
                color: '#ffffff',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
                title="회사별 현장 분포도 보기"
              >
                <AccountTreeIcon sx={{ fontSize: '2rem', color: '#ffffff' }} />
              </Button>
            </>
          )}
        </Box>
      </Box>
      <IntegratedStatusBox
        integratedStatus={integratedStatus}
        selectedSite={selectedSite}
        isMobile={isMobile}
      />

      <Box sx={{
        pr: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? 0.5 : 1,
        height: { xs: 'auto', md: 'calc(100% - 100px)' },
        minHeight: { xs: 'auto', md: 'auto' },
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollBehavior: 'smooth',
        touchAction: 'pan-y',
        '&::-webkit-scrollbar': {
          width: '8px'
        },
        '&::-webkit-scrollbar-track': {
          background: '#1a1d21',
          borderRadius: '4px'
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#444',
          borderRadius: '4px'
        },
        '&::-webkit-scrollbar-thumb:hover': {
          background: '#666'
        }
      }}>
        <Box sx={{ display: 'flex', gap: 1, flexDirection: isMobile ? 'column' : 'row' }}>
          <Box sx={{ flex: isMobile ? 'none' : 8 }}>
            <Typography variant="caption" display="block" sx={{ mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit' }}>
              현장명
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <TextField
                name="name"
                value={form.name ?? ''}
                onChange={handleChange}
                size="small"
                disabled={isReadOnly}
                sx={{
                  flex: 6,
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#ffffff' },
                    '&:hover fieldset': { borderColor: '#ffffff' },
                    '&.Mui-focused fieldset': { borderColor: '#ffffff' }
                  },
                  '& .MuiInputLabel-root': { color: '#bbb' },
                  '& .MuiInputBase-input': { color: '#fff' }
                }}
                inputRef={inputRef1}
                onFocus={scrollFocus(inputRef1)}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1.5 }}>
                <Typography variant="body2" sx={{ fontSize: isMobile ? '0.6rem' : '0.75rem' }}>주요현장</Typography>
                <IconButton
                  onClick={() => handleChange({ target: { name: 'isFavorite', value: !(form.isFavorite ?? false) } })}
                  size="small"
                  sx={{ ml: 0.5 }}
                  disabled={isReadOnly}
                >
                  {(form.isFavorite ?? false) ? <StarIcon sx={{ color: 'gold' }} /> : <StarBorderIcon />}
                </IconButton>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 2.5 }}>
                <Typography variant="body1" sx={{ fontSize: isMobile ? '0.7rem' : 'inherit' }}>사용인감</Typography>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <Select
                    name="stampType"
                    value={form.stampType ?? '인감없음'}
                    onChange={handleChange}
                    disabled={isReadOnly}
                    sx={{ fontSize: isMobile ? '0.7rem' : 'inherit' }}
                  >
                    <MenuItem value="인감없음">인감없음</MenuItem>
                    <MenuItem value="A인감">A인감</MenuItem>
                    <MenuItem value="□인감">□인감</MenuItem>
                    <MenuItem value="○인감">○인감</MenuItem>
                    <MenuItem value="☆인감">☆인감</MenuItem>
                    <MenuItem value="△인감">△인감</MenuItem>
                    <MenuItem value="♤인감">♤인감</MenuItem>
                    <MenuItem value="♧인감">♧인감</MenuItem>
                    <MenuItem value="♡인감">♡인감</MenuItem>
                    <MenuItem value="11인감">11인감</MenuItem>
                    <MenuItem value="기타">기타</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', flexDirection: 'row', flexWrap: isMobile ? 'wrap' : 'nowrap', minWidth: 0 }}>
          <Box sx={{ flex: '1 1 250px', minWidth: isMobile ? '100%' : 100 }}>
            <Typography variant="caption" display="block" sx={{ mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit' }}>
              계약구분
            </Typography>
            <FormControl fullWidth size="small" sx={{ minWidth: 0 }}>
              <Select name="contractType" value={form.contractType ?? '계약없음'} onChange={handleChange} disabled={isReadOnly}>
                {CONTRACT_TYPE_OPTIONS.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ pb: 0.5, flex: '0 0 auto' }}>
            <FormControlLabel
              control={<Checkbox name="subcontractGuardian" checked={form.subcontractGuardian ?? false} onChange={handleChange} disabled={isReadOnly} />}
              label="하도급지킴이"
              sx={{
                '& .MuiFormControlLabel-label': {
                  wordBreak: 'keep-all',
                  fontSize: isMobile ? '0.6rem' : 'inherit'
                }
              }}
            />
          </Box>
          <Box sx={{ flex: '1 1 260px', minWidth: isMobile ? '100%' : 100 }}>
            <Typography variant="caption" display="block" sx={{ mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit' }}>
              발주처
            </Typography>
            <TextField name="orderer" value={form.orderer ?? ''} onChange={handleChange} fullWidth size="small" disabled={isReadOnly} placeholder="발주처" sx={{ minWidth: 0, '& .MuiInputBase-root': { height: 40 } }} />
          </Box>
          <Box sx={{ flex: '0 1 100px', minWidth: 64 }}>
            <Typography variant="caption" display="block" sx={{ mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit' }}>
              관급/사급
            </Typography>
            <FormControl fullWidth size="small" sx={{ minWidth: 0 }}>
              <Select name="workScope" value={form.workScope ?? '없음'} onChange={handleChange} disabled={isReadOnly} sx={{ fontSize: isMobile ? '0.75rem' : 'inherit' }}>
                {WORK_SCOPE_OPTIONS.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ flex: '0 1 140px', minWidth: 80 }}>
            <Typography variant="caption" display="block" sx={{ mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit' }}>
              공고번호
            </Typography>
            <TextField name="announcementNo" value={form.announcementNo ?? ''} onChange={handleChange} fullWidth size="small" disabled={isReadOnly} placeholder="공고번호" sx={{ minWidth: 0, '& .MuiInputBase-root': { height: 40 } }} />
          </Box>
          <Box sx={{ flex: '1 1 215px', minWidth: isMobile ? '100%' : 100 }}>
            <Typography variant="caption" display="block" sx={{ mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit' }}>
              진행상황
            </Typography>
            <FormControl fullWidth size="small" sx={{ cursor: 'pointer', minWidth: 0 }}>
              <Select
                name="status"
                value={form.status ?? '진행'}
                onChange={handleChange}
                disabled={false}
                inputProps={{
                  style: { cursor: 'pointer' },
                  readOnly: false
                }}
                sx={{
                  cursor: 'pointer',
                  '& .MuiSelect-select': {
                    backgroundColor: form.status === '예정' ? '#ff9800' :
                      form.status === '진행' ? '#1976d2' :
                        form.status === '완료' ? '#43a047' :
                          form.status === '미정' ? '#757575' : '#757575',
                    color: 'white',
                    fontWeight: 'bold',
                    cursor: 'pointer !important',
                    userSelect: 'none',
                    '&:focus': {
                      cursor: 'pointer !important'
                    }
                  },
                  '& .MuiInputBase-root': {
                    cursor: 'pointer !important',
                    userSelect: 'none',
                    '&:hover': {
                      cursor: 'pointer !important'
                    },
                    '& input': {
                      cursor: 'pointer !important',
                      caretColor: 'transparent'
                    }
                  },
                  '& .MuiOutlinedInput-input': {
                    cursor: 'pointer !important',
                    caretColor: 'transparent'
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.23)'
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.5)'
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.5)'
                  }
                }}
              >
                {STATUS_OPTIONS.map(opt => (
                  <MenuItem key={opt} value={opt} sx={{
                    backgroundColor: opt === '예정' ? '#ff9800' :
                      opt === '진행' ? '#1976d2' :
                        opt === '완료' ? '#43a047' :
                          opt === '미정' ? '#757575' : '#757575',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: opt === '예정' ? '#f57c00' :
                        opt === '진행' ? '#1565c0' :
                          opt === '완료' ? '#388e3c' :
                            opt === '미정' ? '#616161' : '#616161'
                    }
                  }}>
                    {opt}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, mt: isMobile ? 0.3 : 0.5, flexDirection: isMobile ? 'column' : 'row' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" display="block" sx={{ mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit' }}>
              계약금액
            </Typography>
            <TextField name="contractAmount" value={isReadOnly ? formatContractAmount(form.contractAmount) : (form.contractAmount ?? '')} onChange={handleChange} fullWidth size="small" disabled={isReadOnly} inputRef={inputRef2} onFocus={scrollFocus(inputRef2)} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" display="block" sx={{ mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit' }}>
              선급금
            </Typography>
            <TextField name="advance" value={isReadOnly ? formatAdvanceAmount(form.advance) : (form.advance ?? '')} onChange={handleChange} fullWidth size="small" disabled={isReadOnly} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" display="block" sx={{ mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit' }}>
              누계기성
            </Typography>
            <TextField name="totalProgress" value={formatGisungAmount(form.totalProgress)} onChange={handleChange} fullWidth size="small" disabled={true} sx={{ '& .MuiInputBase-input': { color: '#4caf50', fontWeight: 'bold' } }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" display="block" sx={{ mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit' }}>
              안전관리비
            </Typography>
            <TextField name="safetyCost" value={isReadOnly ? formatSafetyCost(form.safetyCost) : (form.safetyCost ?? '')} onChange={handleChange} fullWidth size="small" disabled={isReadOnly} />
          </Box>
        </Box>

        <Box sx={{ display: 'flex' }}>
          <Box sx={{ width: '100%' }}>
            <Typography variant="caption" display="block" sx={{ mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit' }}>
              주소
            </Typography>
            <TextField
              name="address"
              value={form.address ?? ''}
              onChange={handleChange}
              fullWidth
              size="small"
              disabled={isReadOnly}
              inputRef={addressRef}
              onFocus={scrollFocus(addressRef)}
            />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexDirection: isMobile ? 'column' : 'row' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" display="block" sx={{ mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit' }}>
              착공일
            </Typography>
            <TextField
              name="startDate"
              type="date"
              value={formatDateForInput(form.startDate) ?? ''}
              onChange={handleChange}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              disabled={isReadOnly}
              inputRef={startDateRef}
              onFocus={scrollFocus(startDateRef)}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" display="block" sx={{ mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit' }}>
              준공예정일
            </Typography>
            <TextField
              name="endDate"
              type="date"
              value={formatDateForInput(form.endDate) ?? ''}
              onChange={handleChange}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              disabled={isReadOnly}
              inputRef={endDateRef}
              onFocus={scrollFocus(endDateRef)}
            />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexDirection: isMobile ? 'column' : 'row' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" display="block" sx={{ mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit' }}>
              회사명 (선택 또는 입력)
            </Typography>
            <Autocomplete
              options={[...new Set(vendors.map(v => (v.companyName ?? '').toString()))].filter(Boolean)}
              value={form.companyName ?? ''}
              onChange={(event, newValue) => {
                const e = { target: { name: 'companyName', value: (newValue ?? '').toString() } };
                handleChange(e);
              }}
              onInputChange={(event, newInputValue) => {
                const e = { target: { name: 'companyName', value: (newInputValue ?? '').toString() } };
                handleChange(e);
              }}
              onFocus={() => setCompanyFocused(true)}
              onBlur={() => setCompanyFocused(false)}
              freeSolo
              selectOnFocus={false}
              clearOnBlur={false}
              autoSelect={false}
              disabled={isReadOnly}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  inputRef={companyNameRef}
                  onFocus={scrollFocus(companyNameRef)}
                />
              )}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" display="block" sx={{ mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit' }}>
              소장
            </Typography>
            <TextField
              name="manager"
              value={form.manager ?? ''}
              onChange={handleChange}
              fullWidth
              size="small"
              disabled={isReadOnly}
              inputRef={managerRef}
              onFocus={scrollFocus(managerRef)}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" display="block" sx={{ mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit' }}>
              연락처
            </Typography>
            <TextField
              name="phone"
              value={form.phone ?? ''}
              onChange={handleChange}
              fullWidth
              size="small"
              disabled={isReadOnly}
              inputRef={phoneRef}
              onFocus={scrollFocus(phoneRef)}
            />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexDirection: isMobile ? 'column' : 'row' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" display="block" sx={{ mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit' }}>
              시공팀
            </Typography>
            <TextField
              name="team"
              value={form.team ?? ''}
              onChange={handleChange}
              fullWidth
              size="small"
              disabled={isReadOnly}
              inputRef={teamRef}
              onFocus={scrollFocus(teamRef)}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" display="block" sx={{ mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit' }}>
              창호업체
            </Typography>
            <TextField
              name="windowCompany"
              value={form.windowCompany ?? ''}
              onChange={handleChange}
              fullWidth
              size="small"
              disabled={isReadOnly}
              placeholder="창호업체명을 입력하세요"
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#ffffff' },
                  '&:hover fieldset': { borderColor: '#ffffff' },
                  '&.Mui-focused fieldset': { borderColor: '#ffffff' }
                },
                '& .MuiInputLabel-root': { color: '#bbb' },
                '& .MuiInputBase-input': { color: '#fff' }
              }}
              inputRef={windowCompanyRef}
              onFocus={scrollFocus(windowCompanyRef)}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" display="block" sx={{ mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit' }}>
              비고
            </Typography>
            <TextField
              name="note"
              value={form.note ?? ''}
              onChange={handleChange}
              fullWidth
              size="small"
              disabled={isReadOnly}
              inputRef={noteRef}
              onFocus={scrollFocus(noteRef)}
              placeholder="비고 사항"
            />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexDirection: isMobile ? 'column' : 'row' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" display="block" sx={{ mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit' }}>
              기타사항
            </Typography>
            <TextField
              name="desc"
              value={form.desc ?? ''}
              onChange={handleChange}
              fullWidth
              size="small"
              disabled={isReadOnly}
              inputRef={descRef}
              onFocus={scrollFocus(descRef)}
            />
          </Box>
        </Box>

        {/* 기타사항 아래 — 현장별 기성현황 요약 */}
        <SiteGisungSummary selectedSite={selectedSite} form={form} isMobile={isMobile} />
      </Box>

      <Box sx={{ mt: 'auto', pt: isMobile ? 0.5 : 1, display: 'flex', justifyContent: 'flex-end', gap: 1, flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          color="info"
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!selectedSite) {
              alert('현장을 선택해 주세요.');
              return;
            }
            try {
              setLoading(true);
              setLoadingMessage('납품확인서 생성 중...');
              const { createDeliveryConfirmation } = await import('../../utils/deliveryConfirmationUtils');
              const siteData = { ...selectedSite, stampType: form.stampType || selectedSite.stampType || 'A인감' };
              const { buffer, fileName } = await createDeliveryConfirmation(siteData);
              const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = fileName;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);
              alert('납품확인서가 다운로드되었습니다.');
            } catch (err) {
              console.error('납품확인서 생성 실패:', err);
              alert(err?.message || '납품확인서 생성에 실패했습니다.');
            } finally {
              setLoading(false);
              setLoadingMessage('');
            }
          }}
          disabled={!selectedSite || loading}
          size={isMobile ? 'small' : 'medium'}
          sx={{ fontSize: isMobile ? '0.7rem' : 'inherit' }}
        >
          납품확인서
        </Button>
        <input
          type="file"
          ref={contractInputRef}
          accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
          style={{ display: 'none' }}
          onChange={handleContractFileChange}
        />
        {(form.contractFileUrl || selectedSite?.contractFileUrl) ? (
          <Button
            variant="outlined"
            color="info"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowContractPreview(true);
            }}
            disabled={!selectedSite}
            size={isMobile ? 'small' : 'medium'}
            sx={{ fontSize: isMobile ? '0.7rem' : 'inherit' }}
          >
            계약서 보기
          </Button>
        ) : (
          <Button
            variant="outlined"
            color="info"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              contractInputRef.current?.click();
            }}
            disabled={!selectedSite || contractUploading}
            size={isMobile ? 'small' : 'medium'}
            sx={{ fontSize: isMobile ? '0.7rem' : 'inherit' }}
          >
            {contractUploading ? '업로드 중...' : '계약서업로드'}
          </Button>
        )}
        <Button
          variant="outlined"
          color="info"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowSitePhotosSection(true);
            requestAnimationFrame(() => {
              sitePhotosSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
          }}
          disabled={!selectedSite}
          size={isMobile ? 'small' : 'medium'}
          sx={{ fontSize: isMobile ? '0.7rem' : 'inherit' }}
        >
          현장사진
        </Button>
        {isEditing ? (
          <Button
            variant="contained"
            color="primary"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSave();
            }}
            disabled={isSaving}
            size={isMobile ? 'small' : 'medium'}
            sx={{
              fontSize: isMobile ? '0.7rem' : 'inherit',
              minHeight: '44px',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            {isSaving ? '저장 중...' : (selectedSite ? '저장하기' : '등록하기')}
          </Button>
        ) : (
          <Button
            variant="contained"
            color="primary"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleEditClick();
            }}
            disabled={!selectedSite}
            size={isMobile ? 'small' : 'medium'}
            sx={{
              fontSize: isMobile ? '0.7rem' : 'inherit',
              minHeight: '44px',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            수정하기
          </Button>
        )}
        <Button variant="outlined" color="info" onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleViewEstimate();
        }} disabled={!selectedSite} size={isMobile ? 'small' : 'medium'} sx={{ fontSize: isMobile ? '0.7rem' : 'inherit' }}>
          견적서보기
        </Button>

        {form?.contractType === '납품계약' && (
          <Button variant="contained" color="primary" onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDownloadNapfoomContract();
          }} disabled={!selectedSite} size={isMobile ? 'small' : 'medium'} sx={{ fontSize: isMobile ? '0.7rem' : 'inherit' }}>
            납품계약서
          </Button>
        )}

        <Button variant="outlined" color="secondary" onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleDelete();
        }} disabled={!selectedSite} size={isMobile ? 'small' : 'medium'} sx={{ fontSize: isMobile ? '0.7rem' : 'inherit' }}>
          삭제
        </Button>

        <Button variant="contained" color="success" onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleGisung();
        }} disabled={!selectedSite} size={isMobile ? 'small' : 'medium'} sx={{ fontSize: isMobile ? '0.7rem' : 'inherit' }}>
          기성현황
        </Button>
      </Box>
    </Paper>
  );
}
