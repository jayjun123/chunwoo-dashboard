import { useState, useRef, useEffect, useCallback } from 'react';
import { formatNasFetchErrorMessage } from '../utils/nasFetchErrors';

/**
 * 현장 사진(NAS/서버) 조회·업로드·삭제·미리보기 상태 및 로직.
 * @param {{ id?: string; name?: string } | null} selectedSite - 선택된 현장
 */
export function useSitePhotos(selectedSite) {
  const isNasPhotoBackend = import.meta.env.VITE_SITE_PHOTOS_BACKEND === 'nas';
  const nasApiUrl = (import.meta.env.VITE_NAS_API_URL || '').replace(/\/+$/, '');
  const photosApiKey = import.meta.env.VITE_PHOTOS_API_KEY;

  const [showSitePhotosSection, setShowSitePhotosSection] = useState(true);
  const [sitePhotos, setSitePhotos] = useState([]);
  const [sitePhotosLoading, setSitePhotosLoading] = useState(false);
  const [sitePhotosError, setSitePhotosError] = useState('');
  const [sitePhotoUploadOpen, setSitePhotoUploadOpen] = useState(false);
  const [selectedPreviewPhoto, setSelectedPreviewPhoto] = useState(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [previewTranslate, setPreviewTranslate] = useState({ x: 0, y: 0 });
  const [isPreviewPanning, setIsPreviewPanning] = useState(false);
  const previewPanStartRef = useRef(null);
  const replacePhotoInputRef = useRef(null);
  const sitePhotosSectionRef = useRef(null);

  const getPhotosAuthHeaders = useCallback(() => {
    if (!photosApiKey) return {};
    return { 'x-api-key': photosApiKey };
  }, [photosApiKey]);

  const loadSitePhotos = useCallback(async () => {
    try {
      setSitePhotosError('');

      if (!selectedSite?.id || !selectedSite?.name) {
        setSitePhotos([]);
        return;
      }

      if (isNasPhotoBackend) {
        if (!nasApiUrl) {
          throw new Error('VITE_NAS_API_URL이 설정되어 있지 않습니다.');
        }

        setSitePhotosLoading(true);
        const url = `${nasApiUrl}/site-photos/list?siteId=${encodeURIComponent(selectedSite.id)}&siteName=${encodeURIComponent(selectedSite.name)}`;
        const res = await fetch(url, { method: 'GET', headers: { ...getPhotosAuthHeaders() } });
        if (!res.ok) {
          throw new Error(`NAS API responded with status: ${res.status}`);
        }
        const data = await res.json();
        const list = (Array.isArray(data) ? data : []).map((p) => ({
          id: p.name,
          name: p.name,
          url: `${nasApiUrl}${p.url}`,
          size: p.size,
          mtimeMs: p.mtimeMs,
        }));
        setSitePhotos(list);
        return;
      }

      setSitePhotos([]);
    } catch (e) {
      console.error('현장사진 로드 실패:', e);
      setSitePhotosError(
        isNasPhotoBackend && nasApiUrl
          ? formatNasFetchErrorMessage(e, nasApiUrl)
          : e?.message || '현장사진 로드 중 오류가 발생했습니다.'
      );
      setSitePhotos([]);
    } finally {
      setSitePhotosLoading(false);
    }
  }, [selectedSite?.id, selectedSite?.name, isNasPhotoBackend, nasApiUrl, getPhotosAuthHeaders]);

  const handleDeleteSelectedPhoto = useCallback(async () => {
    try {
      if (!isNasPhotoBackend || !nasApiUrl) {
        throw new Error('NAS 사진 백엔드가 설정되어 있지 않습니다.');
      }
      if (!selectedSite?.id || !selectedSite?.name || !selectedPreviewPhoto?.name) {
        throw new Error('삭제할 사진 정보가 없습니다.');
      }

      const url = `${nasApiUrl}/site-photos/delete?siteId=${encodeURIComponent(selectedSite.id)}&siteName=${encodeURIComponent(selectedSite.name)}&name=${encodeURIComponent(selectedPreviewPhoto.name)}`;
      const res = await fetch(url, { method: 'DELETE', headers: { ...getPhotosAuthHeaders() } });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `Delete failed (${res.status})`);
      }

      setSelectedPreviewPhoto(null);
      await loadSitePhotos();
    } catch (e) {
      console.error('사진 삭제 실패:', e);
      setSitePhotosError(e?.message || '사진 삭제 중 오류가 발생했습니다.');
    }
  }, [isNasPhotoBackend, nasApiUrl, selectedSite?.id, selectedSite?.name, selectedPreviewPhoto?.name, getPhotosAuthHeaders, loadSitePhotos]);

  const handleReplaceSelectedPhoto = useCallback(async (file) => {
    try {
      if (!isNasPhotoBackend || !nasApiUrl) {
        throw new Error('NAS 사진 백엔드가 설정되어 있지 않습니다.');
      }
      if (!selectedSite?.id || !selectedSite?.name || !selectedPreviewPhoto?.name) {
        throw new Error('변경할 사진 정보가 없습니다.');
      }
      if (!file) return;

      const formData = new FormData();
      formData.append('siteId', selectedSite.id);
      formData.append('siteName', selectedSite.name);
      formData.append('oldName', selectedPreviewPhoto.name);
      formData.append('file', file);

      const url = `${nasApiUrl}/site-photos/replace`;
      const res = await fetch(url, { method: 'POST', headers: { ...getPhotosAuthHeaders() }, body: formData });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `Replace failed (${res.status})`);
      }
      const data = await res.json();
      const newPhoto = data?.file;
      await loadSitePhotos();

      if (newPhoto?.url) {
        setSelectedPreviewPhoto({
          id: newPhoto.name,
          name: newPhoto.name,
          url: `${nasApiUrl}${newPhoto.url}`,
          size: newPhoto.size,
          mtimeMs: Date.now(),
        });
      }
    } catch (e) {
      console.error('사진 변경 실패:', e);
      setSitePhotosError(e?.message || '사진 변경 중 오류가 발생했습니다.');
    }
  }, [isNasPhotoBackend, nasApiUrl, selectedSite?.id, selectedSite?.name, selectedPreviewPhoto?.name, getPhotosAuthHeaders, loadSitePhotos]);

  useEffect(() => {
    if (!showSitePhotosSection) return;
    loadSitePhotos();
  }, [selectedSite?.id, selectedSite?.name, showSitePhotosSection, isNasPhotoBackend, nasApiUrl, loadSitePhotos]);

  useEffect(() => {
    if (!selectedPreviewPhoto) return;
    setPreviewScale(1);
    setPreviewTranslate({ x: 0, y: 0 });
    setIsPreviewPanning(false);
    previewPanStartRef.current = null;
  }, [selectedPreviewPhoto?.url]);

  return {
    isNasPhotoBackend,
    nasApiUrl,
    showSitePhotosSection,
    setShowSitePhotosSection,
    sitePhotos,
    sitePhotosLoading,
    sitePhotosError,
    sitePhotoUploadOpen,
    setSitePhotoUploadOpen,
    selectedPreviewPhoto,
    setSelectedPreviewPhoto,
    previewScale,
    setPreviewScale,
    previewTranslate,
    setPreviewTranslate,
    isPreviewPanning,
    setIsPreviewPanning,
    previewPanStartRef,
    replacePhotoInputRef,
    sitePhotosSectionRef,
    loadSitePhotos,
    handleDeleteSelectedPhoto,
    handleReplaceSelectedPhoto,
  };
}
