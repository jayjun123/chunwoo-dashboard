import React, { useState } from 'react';
import { 
  Autocomplete, 
  TextField, 
  Box, 
  Typography,
  Chip
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';

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
  isMobile = false
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleChange = (event, newValue) => {
    if (multiple) {
      onChange(newValue);
    } else {
      // 객체인 경우 name만 반환, 문자열인 경우 그대로 반환
      if (newValue && typeof newValue === 'object') {
        onChange(newValue.name || '');
      } else {
        onChange(newValue || '');
      }
    }
  };

  const handleInputChange = (event, newInputValue) => {
    setInputValue(newInputValue);
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
    return false;
  };

  const filterOptions = (options, { inputValue }) => {
    const filtered = options.filter(option => {
      let siteName = '';
      if (typeof option === 'string') {
        siteName = option;
      } else if (option && typeof option === 'object') {
        siteName = option.name || '';
      }
      return siteName.toLowerCase().includes(inputValue.toLowerCase());
    });
    return filtered;
  };

  const renderOption = (props, option) => {
    let siteName = '';
    let siteStatus = '';
    
    if (typeof option === 'string') {
      siteName = option;
    } else if (option && typeof option === 'object') {
      siteName = option.name || '';
      siteStatus = option.status || '';
    }
    
    return (
      <Box component="li" {...props}>
        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
          <Typography sx={{ fontSize: isMobile ? '0.9rem' : '1rem' }}>
            {siteName}
          </Typography>
          {siteStatus && (
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
  const getValueForAutocomplete = () => {
    if (multiple) {
      return value;
    }
    if (typeof value === 'string' && value) {
      return sites.find(site => site.name === value) || value;
    }
    return value;
  };

  return (
    <Autocomplete
      options={sites}
      value={getValueForAutocomplete()}
      onChange={handleChange}
      inputValue={inputValue}
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
      sx={{
        '& .MuiAutocomplete-paper': {
          bgcolor: '#232b3b',
          '& .MuiAutocomplete-listbox': {
            '& .MuiAutocomplete-option': {
              color: '#fff',
              fontSize: isMobile ? '0.9rem' : '1rem',
              py: isMobile ? 1 : 1.5,
              '&:hover': { bgcolor: '#2c3446' },
              '&.Mui-focused': { bgcolor: '#2c3446' },
              '&.Mui-selected': { bgcolor: '#1976d2' }
            }
          }
        }
      }}
      ListboxProps={{
        style: {
          maxHeight: isMobile ? 200 : 300
        }
      }}
    />
  );
};

export default SearchableSiteSelect; 