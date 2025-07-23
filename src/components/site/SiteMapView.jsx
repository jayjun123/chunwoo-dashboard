import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Tooltip,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Map as MapIcon,
  LocationOn as LocationIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  Directions as DirectionsIcon,
  Photo as PhotoIcon,
  Business as BusinessIcon,

  AttachMoney as MoneyIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase';

const SiteMapView = ({ sites, onSiteUpdate, onSiteAdd }) => {
  const { currentUser } = useAuth();
  const [selectedSite, setSelectedSite] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 37.5665, lng: 126.9780 }); // 서울
  const [zoom, setZoom] = useState(10);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  // Google Maps API 로드
  useEffect(() => {
    const loadGoogleMaps = () => {
      if (window.google && window.google.maps) {
        initializeMap();
      } else {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = initializeMap;
        document.head.appendChild(script);
      }
    };

    loadGoogleMaps();
  }, []);

  // 지도 초기화
  const initializeMap = () => {
    if (!mapRef.current || !window.google) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: mapCenter,
      zoom: zoom,
      mapTypeId: window.google.maps.MapTypeId.ROADMAP,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
    });

    // 현장 마커 추가
    addSiteMarkers(map);

    // 지도 이벤트 리스너
    map.addListener('click', (event) => {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      setMapCenter({ lat, lng });
      setShowAddDialog(true);
    });

    // 줌 변경 이벤트
    map.addListener('zoom_changed', () => {
      setZoom(map.getZoom());
    });

    // 중심점 변경 이벤트
    map.addListener('center_changed', () => {
      const center = map.getCenter();
      setMapCenter({ lat: center.lat(), lng: center.lng() });
    });
  };

  // 현장 마커 추가
  const addSiteMarkers = (map) => {
    // 기존 마커 제거
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    sites.forEach(site => {
      if (site.latitude && site.longitude) {
        const marker = new window.google.maps.Marker({
          position: { lat: parseFloat(site.latitude), lng: parseFloat(site.longitude) },
          map: map,
          title: site.name,
          icon: getMarkerIcon(site.status),
          animation: window.google.maps.Animation.DROP
        });

        // 마커 클릭 이벤트
        marker.addListener('click', () => {
          setSelectedSite(site);
        });

        // 정보창 생성
        const infoWindow = new window.google.maps.InfoWindow({
          content: createInfoWindowContent(site)
        });

        // 마커 클릭 시 정보창 표시
        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });

        markersRef.current.push(marker);
      }
    });
  };

  // 마커 아이콘 생성
  const getMarkerIcon = (status) => {
    const colors = {
      '진행중': '#4CAF50',
      '완료': '#2196F3',
      '진행상황': '#FFC107',
      '미정': '#9E9E9E'
    };

    return {
      path: window.google.maps.SymbolPath.CIRCLE,
      scale: 10,
      fillColor: colors[status] || '#9E9E9E',
      fillOpacity: 0.8,
      strokeColor: '#FFFFFF',
      strokeWeight: 2
    };
  };

  // 정보창 내용 생성
  const createInfoWindowContent = (site) => {
    return `
      <div style="padding: 10px; max-width: 300px;">
        <h3 style="margin: 0 0 10px 0; color: #1976d2;">${site.name}</h3>
        <p style="margin: 5px 0; color: #666;">
          <strong>상태:</strong> ${site.status}
        </p>
        <p style="margin: 5px 0; color: #666;">
          <strong>진행률:</strong> ${site.totalProgress || 0}%
        </p>
        <p style="margin: 5px 0; color: #666;">
          <strong>주소:</strong> ${site.address || '주소 없음'}
        </p>
        <div style="margin-top: 10px;">
          <button onclick="window.openSiteDetails('${site.id}')" 
                  style="background: #1976d2; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">
            상세보기
          </button>
        </div>
      </div>
    `;
  };

  // 현장 추가 다이얼로그
  const AddSiteDialog = () => {
    const [formData, setFormData] = useState({
      name: '',
      address: '',
      latitude: mapCenter.lat,
      longitude: mapCenter.lng,
      status: '진행상황',
      description: ''
    });

    const handleSave = async () => {
      try {
        const siteData = {
          ...formData,
          createdAt: new Date(),
          createdBy: currentUser.uid,
          totalProgress: 0
        };

        const docRef = await addDoc(collection(db, 'sites'), siteData);
        const newSite = { id: docRef.id, ...siteData };
        
        onSiteAdd(newSite);
        setShowAddDialog(false);
        setSnackbar({ open: true, message: '현장이 추가되었습니다.', severity: 'success' });
      } catch (error) {
        console.error('현장 추가 실패:', error);
        setSnackbar({ open: true, message: '현장 추가 중 오류가 발생했습니다.', severity: 'error' });
      }
    };

    return (
      <Dialog open={showAddDialog} onClose={() => setShowAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>새 현장 추가</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="현장명"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="주소"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="위도"
                type="number"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="경도"
                type="number"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>상태</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  label="상태"
                >
                  <MenuItem value="진행상황">진행상황</MenuItem>
                  <MenuItem value="완료">완료</MenuItem>
                  <MenuItem value="미정">미정</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="설명"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddDialog(false)}>취소</Button>
          <Button onClick={handleSave} variant="contained">저장</Button>
        </DialogActions>
      </Dialog>
    );
  };

  // 현장 상세 정보 카드
  const SiteDetailCard = () => {
    if (!selectedSite) return null;

    return (
      <Card sx={{ position: 'absolute', top: 20, right: 20, width: 350, zIndex: 1000 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">{selectedSite.name}</Typography>
            <IconButton onClick={() => setSelectedSite(null)} size="small">
              <DeleteIcon />
            </IconButton>
          </Box>

          <List dense>
            <ListItem>
              <ListItemIcon>
                <BusinessIcon />
              </ListItemIcon>
              <ListItemText 
                primary="상태" 
                secondary={
                  <Chip 
                    label={selectedSite.status} 
                    size="small" 
                    color={selectedSite.status === '진행중' ? 'success' : 'default'}
                  />
                }
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <MoneyIcon />
              </ListItemIcon>
              <ListItemText 
                primary="진행률" 
                secondary={`${selectedSite.totalProgress || 0}%`}
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <LocationIcon />
              </ListItemIcon>
              <ListItemText 
                primary="주소" 
                secondary={selectedSite.address || '주소 없음'}
              />
            </ListItem>

            {selectedSite.description && (
              <ListItem>
                <ListItemIcon>
                  <InfoIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="설명" 
                  secondary={selectedSite.description}
                />
              </ListItem>
            )}
          </List>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              startIcon={<EditIcon />}
              onClick={() => setShowEditDialog(true)}
            >
              수정
            </Button>
            <Button
              size="small"
              startIcon={<DirectionsIcon />}
              onClick={() => {
                const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedSite.latitude},${selectedSite.longitude}`;
                window.open(url, '_blank');
              }}
            >
              길찾기
            </Button>
            <Button
              size="small"
              startIcon={<PhotoIcon />}
              onClick={() => {
                // 사진 첨부 기능 (추후 구현)
                setSnackbar({ open: true, message: '사진 첨부 기능은 추후 구현 예정입니다.', severity: 'info' });
              }}
            >
              사진
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ position: 'relative', height: '100vh' }}>
      {/* 지도 컨테이너 */}
      <Box
        ref={mapRef}
        sx={{
          width: '100%',
          height: '100%',
          position: 'relative'
        }}
      />

      {/* 현장 상세 정보 */}
      <SiteDetailCard />

      {/* 새 현장 추가 버튼 */}
      <Box sx={{ position: 'absolute', top: 20, left: 20, zIndex: 1000 }}>
        <Tooltip title="새 현장 추가">
          <IconButton
            color="primary"
            onClick={() => setShowAddDialog(true)}
            sx={{ bgcolor: 'white', boxShadow: 2 }}
          >
            <AddIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* 현장 목록 */}
      <Paper sx={{ position: 'absolute', bottom: 20, left: 20, right: 20, maxHeight: 200, overflow: 'auto', zIndex: 1000 }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>현장 목록</Typography>
          <Grid container spacing={1}>
            {sites.map(site => (
              <Grid item xs={12} sm={6} md={4} key={site.id}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    bgcolor: selectedSite?.id === site.id ? 'action.selected' : 'background.paper'
                  }}
                  onClick={() => setSelectedSite(site)}
                >
                  <CardContent sx={{ p: 1 }}>
                    <Typography variant="body2" noWrap>{site.name}</Typography>
                    <Chip 
                      label={site.status} 
                      size="small" 
                      color={site.status === '진행중' ? 'success' : 'default'}
                    />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Paper>

      {/* 다이얼로그들 */}
      <AddSiteDialog />

      {/* 스낵바 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SiteMapView; 