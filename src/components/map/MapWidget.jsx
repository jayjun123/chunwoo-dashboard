import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Alert,
  Button,
  TextField,
  Paper,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { useLoading } from '../common/LoadingProvider';

const MapWidget = ({ onLocationSelect }) => {
  const [map, setMap] = useState(null);
  const [marker, setMarker] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const mapRef = useRef(null);
  const { setLoading, setLoadingMessage } = useLoading();

  useEffect(() => {
    const initMap = () => {
      if (!window.naver || !window.naver.maps) {
        setError('네이버맵을 불러오는데 실패했습니다.');
        return;
      }

      const options = {
        center: new window.naver.maps.LatLng(37.5665, 126.9780),
        zoom: 13,
        zoomControl: true,
        zoomControlOptions: {
          position: window.naver.maps.Position.TOP_RIGHT
        }
      };

      const newMap = new window.naver.maps.Map(mapRef.current, options);
      setMap(newMap);

      window.naver.maps.Event.addListener(newMap, 'click', (e) => {
        const latlng = e.coord;
        updateMarker(latlng);
        if (onLocationSelect) {
          onLocationSelect({
            lat: latlng.y,
            lng: latlng.x,
          });
        }
      });
    };

    const script = document.createElement('script');
    script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${import.meta.env.VITE_NAVER_CLIENT_ID}&submodules=geocoder`;
    script.async = true;
    script.onload = initMap;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [onLocationSelect]);

  const updateMarker = (position) => {
    if (marker) {
      marker.setMap(null);
    }

    const newMarker = new window.naver.maps.Marker({
      position: position,
      map: map,
    });

    setMarker(newMarker);
  };

  const handleSearch = async () => {
    if (!searchQuery) return;

    setLoading(true);
    setLoadingMessage('위치 검색 중...');
    try {
      window.naver.maps.Service.geocode({
        query: searchQuery
      }, (status, response) => {
        if (status === window.naver.maps.Service.Status.OK) {
          const item = response.v2.meta.totalCount > 0 ? response.v2.addresses[0] : null;
          if (item) {
            const coords = new window.naver.maps.LatLng(item.y, item.x);
            map.setCenter(coords);
            updateMarker(coords);
            if (onLocationSelect) {
              onLocationSelect({
                lat: item.y,
                lng: item.x,
                address: item.roadAddress || item.jibunAddress,
              });
            }
          } else {
            setError('위치를 찾을 수 없습니다.');
          }
        } else {
          setError('위치 검색에 실패했습니다.');
        }
      });
    } catch (error) {
      console.error('위치 검색 실패:', error);
      setError('위치 검색에 실패했습니다.');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="위치 검색"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          InputProps={{
            endAdornment: (
              <Button onClick={handleSearch}>
                <SearchIcon />
              </Button>
            ),
          }}
        />
      </Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Box
        ref={mapRef}
        sx={{
          width: '100%',
          height: '300px',
          backgroundColor: '#f5f5f5',
          borderRadius: 1,
        }}
      />
    </Box>
  );
};

export default MapWidget; 