import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

// 이미지 캐시 객체
const imageCache = new Map();

const Image = ({
  src,
  alt,
  width,
  height,
  className,
  placeholder = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  lazy = false,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(!lazy);
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  useEffect(() => {
    if (!shouldLoad) return;
    
    // 캐시에서 확인
    if (imageCache.has(src)) {
      const cachedStatus = imageCache.get(src);
      if (cachedStatus === 'loaded') {
        setIsLoaded(true);
        return;
      } else if (cachedStatus === 'error') {
        setError(true);
        return;
      }
    }

    const img = new window.Image();
    
    const handleLoad = () => {
      imageCache.set(src, 'loaded');
      setIsLoaded(true);
      setError(false);
    };
    
    const handleError = () => {
      imageCache.set(src, 'error');
      setError(true);
      setIsLoaded(false);
    };

    img.onload = handleLoad;
    img.onerror = handleError;
    img.src = src;

    // 정리 함수
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, shouldLoad]);

  // 지연 로딩을 위한 IntersectionObserver
  useEffect(() => {
    if (!lazy || shouldLoad) return;

    if (!imgRef.current) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observerRef.current?.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    observerRef.current.observe(imgRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [lazy, shouldLoad]);

  return (
    <img
      ref={imgRef}
      src={isLoaded ? src : placeholder}
      alt={alt}
      width={width}
      height={height}
      className={`${className || ''} ${isLoaded ? 'loaded' : 'loading'} ${error ? 'error' : ''}`}
      style={{
        opacity: error ? 0.5 : (isLoaded ? 1 : 0.7),
        transition: 'opacity 0.2s ease-in-out',
        filter: error ? 'grayscale(100%)' : 'none'
      }}
      loading={lazy ? 'lazy' : 'eager'}
      {...props}
    />
  );
};

Image.propTypes = {
  src: PropTypes.string.isRequired,
  alt: PropTypes.string.isRequired,
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  className: PropTypes.string,
  placeholder: PropTypes.string,
  lazy: PropTypes.bool
};

export default Image; 