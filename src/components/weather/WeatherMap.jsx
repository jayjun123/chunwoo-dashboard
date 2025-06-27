import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
} from '@mui/material';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useLoading } from '../common/LoadingProvider';

// Leaflet 마커 아이콘 설정
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const WeatherMap = () => {
  const { setLoading, setLoadingMessage } = useLoading();
  const [error, setError] = useState('');
  const [weatherData, setWeatherData] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState({
    lat: 37.5665,
    lng: 126.9780,
  });

  useEffect(() => {
    fetchWeatherData();
  }, [selectedLocation]);

  const fetchWeatherData = async () => {
    setLoading(true);
    setLoadingMessage('날씨 정보를 불러오는 중...');
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${selectedLocation.lat}&lon=${selectedLocation.lng}&appid=${process.env.REACT_APP_WEATHER_API_KEY}&units=metric&lang=kr`
      );
      const data = await response.json();
      setWeatherData(data);
    } catch (error) {
      console.error('날씨 데이터 조회 실패:', error);
      setError('날씨 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleMapClick = (e) => {
    setSelectedLocation({
      lat: e.latlng.lat,
      lng: e.latlng.lng,
    });
  };

  return (
    <Box sx={{ background: '#181A20', color: '#fff', minHeight: 120, borderRadius: 3, boxShadow: 4, p: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ color: '#fff', fontWeight: 700, fontSize: 32 }}>
        날씨 및 지도
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ background: '#232634', color: '#fff', borderRadius: 3, boxShadow: 3, p: 2, height: 500, overflow: 'hidden' }}>
            <MapContainer
              center={[selectedLocation.lat, selectedLocation.lng]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              onClick={handleMapClick}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <Marker position={[selectedLocation.lat, selectedLocation.lng]}>
                <Popup>
                  선택된 위치
                </Popup>
              </Marker>
            </MapContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          {weatherData ? (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: '#fff', fontWeight: 700, fontSize: 24 }}>
                  {weatherData.name}
                </Typography>
                <Typography variant="h3" sx={{ mb: 2, color: '#fff', fontWeight: 700, fontSize: 48 }}>
                  {Math.round(weatherData.main.temp)}°C
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ color: '#fff' }}>
                  체감 온도: {Math.round(weatherData.main.feels_like)}°C
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ color: '#fff' }}>
                  습도: {weatherData.main.humidity}%
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ color: '#fff' }}>
                  풍속: {weatherData.wind.speed}m/s
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ color: '#fff' }}>
                  날씨: {weatherData.weather[0].description}
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default WeatherMap; 