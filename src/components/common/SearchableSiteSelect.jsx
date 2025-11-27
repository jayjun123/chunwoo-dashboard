import React, { useState } from 'react';
import { 
  Autocomplete, 
  TextField, 
  Box, 
  Typography,
  Chip,
  IconButton
} from '@mui/material';
import { Search as SearchIcon, Close as CloseIcon } from '@mui/icons-material';

const SearchableSiteSelect = ({
  sites = [],
  value = '',
  onChange,
  label = '현장명',
  placeholder = '현장명을 입력하세요',
  size = 'medium',
  fullWidth = true,
  disabled = false,
  multiple = false,
  sx = {},
  isMobile = false,
  openOnFocus = true,
  clearOnBlur = false,
  selectOnFocus = false,
  excludeFullyPaidSites = false,
  paymentStatusMap = {},
  excludeCompletedSites = false // 완료된 현장을 드롭다운에서 숨기기 (검색은 가능)
}) => {
  const [open, setOpen] = useState(false);

  const handleChange = (event, newValue) => {
    // 선택이 완료되면 드롭다운 닫기
    setOpen(false);
    
    console.log('SearchableSiteSelect handleChange:', newValue);
    console.log('SearchableSiteSelect multiple:', multiple);
    
    if (multiple) {
      // 다중 선택인 경우
      if (Array.isArray(newValue)) {
        console.log('일반 다중 선택:', newValue);
        // 선택된 값들을 문자열 배열로 변환
        const selectedValues = newValue.map(item => {
          if (typeof item === 'string') {
            return item;
          }
          if (item && typeof item === 'object') {
            return item.name || '';
          }
          return '';
        }).filter(item => item !== '');
        
        console.log('변환된 선택값:', selectedValues);
        onChange(selectedValues);
      } else {
        console.log('빈 배열 또는 null:', newValue);
        onChange(newValue || []);
      }
    } else {
      // 단일 선택인 경우
      if (newValue && typeof newValue === 'object' && newValue.name === '전체선택') {
        console.log('전체선택 선택됨');
        onChange('전체선택');
      } else if (newValue && typeof newValue === 'object') {
        console.log('단일 선택 (객체):', newValue.name);
        onChange(newValue.name || '');
      } else if (typeof newValue === 'string') {
        // freeSolo 모드에서 직접 입력한 문자열 값
        console.log('직접 입력 (문자열):', newValue);
        onChange(newValue);
      } else if (newValue === null) {
        // 값이 지워진 경우
        console.log('값 지워짐');
        onChange('');
      } else {
        console.log('단일 선택 (문자열):', newValue);
        onChange(newValue || '');
      }
    }
  };

  const handleInputChange = (event, newInputValue, reason) => {
    // 검색어가 입력되면 드롭다운이 자동으로 열리도록 함
    if (reason === 'input' || reason === 'clear') {
      // 사용자가 입력하거나 지운 경우 드롭다운 열기
      setOpen(true);
    }
    
    // 검색 중에는 onChange를 호출하지 않음 (검색 결과를 보여주기 위함)
    // 실제 선택은 handleChange에서 처리됨
  };

  const getOptionLabel = (option) => {
    if (typeof option === 'string') {
      return option;
    }
    if (option && typeof option === 'object') {
      return option.name || '';
    }
    return '';
  };

  const isOptionEqualToValue = (option, value) => {
    if (typeof option === 'string' && typeof value === 'string') {
      return option === value;
    }
    if (option && typeof option === 'object' && value && typeof value === 'object') {
      return option.id === value.id || option.name === value.name;
    }
    if (typeof option === 'string' && value && typeof value === 'object') {
      return option === value.name;
    }
    if (option && typeof option === 'object' && typeof value === 'string') {
      return option.name === value;
    }
    // 추가: 전체선택 옵션 처리
    if (option && typeof option === 'object' && option.name === '전체선택' && value === '전체선택') {
      return true;
    }
    return false;
  };

  const filterOptions = (options, { inputValue: searchValue }) => {
    // options가 배열이 아닌 경우 빈 배열 반환
    if (!Array.isArray(options)) {
      return [];
    }
    
    // MUI Autocomplete가 전달하는 inputValue를 직접 사용
    const currentInputValue = searchValue || '';
    
    // 정산완료 현장 제외 옵션이 활성화된 경우 필터링
    let filteredOptions = options;
    if (excludeFullyPaidSites && Object.keys(paymentStatusMap).length > 0) {
      filteredOptions = options.filter(option => {
        let siteName = '';
        if (typeof option === 'string') {
          siteName = option;
        } else if (option && typeof option === 'object') {
          siteName = option.name || '';
        }
        // 정산완료된 현장은 제외
        return !paymentStatusMap[siteName]?.isFullyPaid;
      });
    }
    
    // 완료된 현장을 드롭다운에서 숨기기 (검색할 때는 포함)
    // currentInputValue가 없을 때만 완료된 현장 제외 (드롭다운 열 때)
    if (!currentInputValue && excludeCompletedSites) {
      filteredOptions = filteredOptions.filter(option => {
        if (typeof option === 'string') {
          return true; // 문자열인 경우 sites 배열에서 status를 확인할 수 없으므로 포함
        } else if (option && typeof option === 'object') {
          // 완료된 현장 제외 (status가 '완료'인 경우)
          return option.status !== '완료';
        }
        return true;
      });
    }
    
    if (!currentInputValue || currentInputValue.trim() === '') {
      // 전체선택 옵션을 맨 위에 추가
      const allSitesOption = { name: '전체선택', id: 'all', isAllOption: true };
      return [allSitesOption, ...filteredOptions];
    }
    
    // 검색 시에는 모든 현장 포함 (완료된 현장도 검색 가능)
    const searchLower = currentInputValue.toLowerCase().trim();
    const filtered = filteredOptions.filter(option => {
      let siteName = '';
      let manager = '';
      if (typeof option === 'string') {
        siteName = option;
      } else if (option && typeof option === 'object') {
        siteName = option.name || '';
        manager = option.manager || '';
      }
      return siteName.toLowerCase().includes(searchLower) || 
             manager.toLowerCase().includes(searchLower);
    });
    
    // 검색 결과가 없을 때 안내 메시지
    if (filtered.length === 0) {
      return [{ name: '검색 결과가 없습니다', disabled: true }];
    }
    
    return filtered;
  };

  const renderOption = (props, option) => {
    let siteName = '';
    let siteStatus = '';
    let manager = '';
    let isDisabled = false;
    let isAllOption = false;
    
    if (typeof option === 'string') {
      siteName = option;
    } else if (option && typeof option === 'object') {
      siteName = option.name || '';
      siteStatus = option.status || '';
      manager = option.manager || '';
      isDisabled = option.disabled || false;
      isAllOption = option.isAllOption || false;
    }
    
    // key를 별도로 추출하여 직접 전달
    const { key, ...otherProps } = props;
    
    // 터치 이벤트 처리
    const handleClick = (e) => {
      if (!isDisabled && otherProps.onClick) {
        e.preventDefault();
        e.stopPropagation();
        otherProps.onClick(e);
      }
    };
    
    const handleTouchStart = (e) => {
      if (!isDisabled && otherProps.onClick) {
        e.preventDefault();
        e.stopPropagation();
        otherProps.onClick(e);
      }
    };
    
    return (
      <Box 
        component="li" 
        key={key} 
        {...otherProps}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        sx={{
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent'
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          width: '100%',
          opacity: isDisabled ? 0.6 : 1,
          cursor: isDisabled ? 'default' : 'pointer',
          minHeight: isMobile ? '44px' : 'auto',
          py: isMobile ? 1.5 : 1
        }}>
          <Typography sx={{ 
            fontSize: isMobile ? '0.9rem' : '1rem',
            color: isDisabled ? '#888' : (isAllOption ? '#4caf50' : '#fff'),
            fontWeight: isAllOption ? 'bold' : 'normal'
          }}>
            {isAllOption ? '📋 ' : ''}{siteName}
          </Typography>
          {manager && !isDisabled && !isAllOption && (
            <Typography 
              sx={{ 
                fontSize: isMobile ? '0.7rem' : '0.8rem', 
                color: '#4caf50',
                mt: 0.5
              }}
            >
              소장: {manager}
            </Typography>
          )}
          {siteStatus && !isDisabled && !isAllOption && (
            <Typography 
              sx={{ 
                fontSize: isMobile ? '0.7rem' : '0.8rem', 
                color: '#bbb',
                mt: 0.5
              }}
            >
              상태: {siteStatus}
            </Typography>
          )}
          {isAllOption && (
            <Typography 
              sx={{ 
                fontSize: isMobile ? '0.7rem' : '0.8rem', 
                color: '#4caf50',
                mt: 0.5
              }}
            >
              모든 현장을 선택합니다
            </Typography>
          )}
        </Box>
      </Box>
    );
  };

  const renderInput = (params) => (
    <TextField
      {...params}
      label={label}
      placeholder={placeholder}
      size={size}
      sx={{
        ...sx,
        '& .MuiOutlinedInput-root': {
          '& fieldset': { borderColor: '#333' },
          '&:hover fieldset': { borderColor: '#555' },
          '&.Mui-focused fieldset': { borderColor: '#90caf9' }
        },
        '& .MuiInputLabel-root': { 
          color: '#bbb', 
          fontSize: isMobile ? '0.9rem' : '1rem' 
        },
        '& .MuiInputBase-input': { 
          color: '#fff', 
          fontSize: isMobile ? '0.9rem' : '1rem', 
          py: isMobile ? 1 : 1.5 
        },
        '& .MuiAutocomplete-clearIndicator': {
          color: '#fff'
        },
        '& .MuiAutocomplete-popupIndicator': {
          color: '#fff'
        }
      }}
      InputProps={{
        ...params.InputProps,
        startAdornment: (
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
            <SearchIcon sx={{ color: '#bbb', fontSize: isMobile ? '1.2rem' : '1.5rem' }} />
          </Box>
        ),
        endAdornment: (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {value && (
              <IconButton
                size="small"
                onClick={() => onChange('')}
                sx={{ color: '#bbb', mr: 0.5 }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            )}
            {params.InputProps.endAdornment}
          </Box>
        )
      }}
    />
  );

  const renderTags = (tagValue, getTagProps) => {
    return tagValue.map((option, index) => {
      let siteName = '';
      if (typeof option === 'string') {
        siteName = option;
      } else if (option && typeof option === 'object') {
        siteName = option.name || '';
      }
      
      return (
        <Chip
          {...getTagProps({ index })}
          key={index}
          label={siteName}
          size="small"
          sx={{
            bgcolor: '#2c3446',
            color: '#fff',
            '& .MuiChip-deleteIcon': {
              color: '#bbb',
              '&:hover': { color: '#fff' }
            }
          }}
        />
      );
    });
  };

  // value가 문자열인 경우 해당하는 객체를 찾아서 설정
  // sites가 배열이 아닌 경우 빈 배열로 처리
  const safeSites = Array.isArray(sites) ? sites : [];

  const getValueForAutocomplete = () => {
    if (multiple) {
      // multiple 모드에서는 value가 배열이어야 함
      if (Array.isArray(value)) {
        return value.map(item => {
          if (typeof item === 'string') {
            const foundSite = safeSites.find(site => site.name === item);
            return foundSite || item;
          }
          return item;
        });
      }
      return [];
    }
    if (typeof value === 'string' && value) {
      const foundSite = safeSites.find(site => site.name === value);
      // 찾은 현장이 있으면 객체 반환, 없으면 문자열 그대로 반환 (freeSolo 모드)
      return foundSite || value;
    }
    return value;
  };

  return (
    <Autocomplete
      options={safeSites}
      value={getValueForAutocomplete()}
      onChange={handleChange}
      onInputChange={handleInputChange}
      getOptionLabel={getOptionLabel}
      isOptionEqualToValue={isOptionEqualToValue}
      filterOptions={filterOptions}
      renderOption={renderOption}
      renderInput={renderInput}
      renderTags={multiple ? renderTags : undefined}
      multiple={multiple}
      disabled={disabled}
      fullWidth={fullWidth}
      size={size}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={(event, reason) => {
        // escape 키를 누르거나 옵션을 선택한 경우에만 닫기
        if (reason === 'escape' || reason === 'selectOption') {
          setOpen(false);
        }
        // blur 이벤트로는 닫지 않음 (검색 결과를 계속 보여주기 위함)
      }}
      openOnFocus={true}
      clearOnBlur={false}
      freeSolo={true}
      selectOnFocus={false}
      disableClearable={false}
      clearOnEscape={true}
      autoHighlight={false}
      autoComplete={false}
      disablePortal={false}
      slotProps={{
        popper: {
          style: {
            zIndex: 1400, // Dialog(1300)보다 높은 z-index
            position: 'fixed' // fixed positioning으로 확실하게 위에 표시
          },
          modifiers: [
            {
              name: 'zIndex',
              enabled: true,
              options: {
                zIndex: 1400
              }
            },
            {
              name: 'offset',
              enabled: true,
              options: {
                offset: [0, 4]
              }
            }
          ]
        }
      }}
      sx={{
        '& .MuiAutocomplete-paper': {
          bgcolor: '#232b3b',
          maxHeight: isMobile ? 200 : 300,
          overflow: 'auto',
          zIndex: '1400 !important', // Dialog(1300)보다 높은 z-index
        },
        '& .MuiAutocomplete-popper': {
          zIndex: '1400 !important', // Popper도 Dialog보다 높은 z-index 설정
        },
        '& .MuiAutocomplete-listbox': {
          maxHeight: 'none',
          '& .MuiAutocomplete-option': {
            color: '#fff',
            fontSize: isMobile ? '0.9rem' : '1rem',
            py: isMobile ? 1 : 1.5,
            '&:hover': { bgcolor: '#2c3446' },
            '&.Mui-focused': { bgcolor: '#2c3446' },
            '&.Mui-selected': { bgcolor: '#1976d2' },
            '&.Mui-disabled': {
              color: '#888',
              cursor: 'default',
              '&:hover': { bgcolor: 'transparent' }
            }
          }
        }
      }}
      ListboxProps={{
        style: {
          maxHeight: isMobile ? 200 : 300,
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none' // IE/Edge
        },
        onScroll: (event) => {
          const { target } = event;
          if (target.scrollTop + target.clientHeight === target.scrollHeight) {
            // 스크롤이 끝에 도달했을 때의 처리 (필요시 추가)
          }
        }
      }}
      slotProps={{
        paper: {
          style: {
            maxHeight: isMobile ? 200 : 300,
            overflow: 'auto',
            scrollbarWidth: 'none', // Firefox
            msOverflowStyle: 'none' // IE/Edge
          }
        }
      }}
    />
  );
};

export default SearchableSiteSelect; 