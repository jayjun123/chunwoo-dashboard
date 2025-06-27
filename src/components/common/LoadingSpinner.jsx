import React from 'react';
import { FiLoader } from 'react-icons/fi';
import '../../styles/LoadingSpinner.css';

const LoadingSpinner = () => {
  return (
    <div className="loading-container">
      <FiLoader className="loading-spinner" />
      <p>로딩 중...</p>
    </div>
  );
};

export default LoadingSpinner; 