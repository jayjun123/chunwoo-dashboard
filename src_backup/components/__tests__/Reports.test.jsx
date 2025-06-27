import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Reports from '../Reports';
import { AuthProvider } from '../../contexts/AuthContext';
import { useAuth } from '../../contexts/AuthContext';

// Mock useAuth hook
jest.mock('../../contexts/AuthContext', () => ({
  ...jest.requireActual('../../contexts/AuthContext'),
  useAuth: jest.fn()
}));

// Mock API calls
jest.mock('../../api/reports', () => ({
  getReports: jest.fn(),
  getReportTypes: jest.fn(),
  getReportStats: jest.fn(),
  getReportCharts: jest.fn(),
  exportReport: jest.fn()
}));

describe('Reports Component', () => {
  const mockUser = {
    id: 1,
    name: 'Test User',
    role: 'admin'
  };

  beforeEach(() => {
    useAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true
    });
  });

  it('renders loading state initially', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Reports />
        </AuthProvider>
      </BrowserRouter>
    );
    
    expect(screen.getByText('로딩 중...')).toBeInTheDocument();
  });

  it('renders error state when API fails', async () => {
    const { getReports } = require('../../api/reports');
    getReports.mockRejectedValueOnce(new Error('API Error'));

    render(
      <BrowserRouter>
        <AuthProvider>
          <Reports />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('데이터를 불러오는 중 오류가 발생했습니다.')).toBeInTheDocument();
    });
  });

  it('renders reports data successfully', async () => {
    const mockReports = [
      {
        id: 1,
        title: 'Test Report',
        type: 'daily',
        created_at: '2024-03-20'
      }
    ];

    const { getReports } = require('../../api/reports');
    getReports.mockResolvedValueOnce(mockReports);

    render(
      <BrowserRouter>
        <AuthProvider>
          <Reports />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Report')).toBeInTheDocument();
    });
  });

  it('handles report type filter change', async () => {
    const { getReports } = require('../../api/reports');
    getReports.mockResolvedValueOnce([]);

    render(
      <BrowserRouter>
        <AuthProvider>
          <Reports />
        </AuthProvider>
      </BrowserRouter>
    );

    const typeFilter = screen.getByLabelText('보고서 유형');
    fireEvent.change(typeFilter, { target: { value: 'daily' } });

    await waitFor(() => {
      expect(getReports).toHaveBeenCalledWith(expect.objectContaining({
        type: 'daily'
      }));
    });
  });

  it('handles date range filter change', async () => {
    const { getReports } = require('../../api/reports');
    getReports.mockResolvedValueOnce([]);

    render(
      <BrowserRouter>
        <AuthProvider>
          <Reports />
        </AuthProvider>
      </BrowserRouter>
    );

    const startDate = screen.getByLabelText('시작일');
    fireEvent.change(startDate, { target: { value: '2024-03-01' } });

    await waitFor(() => {
      expect(getReports).toHaveBeenCalledWith(expect.objectContaining({
        start_date: '2024-03-01'
      }));
    });
  });

  it('handles search input', async () => {
    const { getReports } = require('../../api/reports');
    getReports.mockResolvedValueOnce([]);

    render(
      <BrowserRouter>
        <AuthProvider>
          <Reports />
        </AuthProvider>
      </BrowserRouter>
    );

    const searchInput = screen.getByPlaceholderText('보고서 검색...');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    await waitFor(() => {
      expect(getReports).toHaveBeenCalledWith(expect.objectContaining({
        search: 'test'
      }));
    });
  });

  it('handles export report', async () => {
    const { getReports, exportReport } = require('../../api/reports');
    getReports.mockResolvedValueOnce([]);
    exportReport.mockResolvedValueOnce({ success: true });

    render(
      <BrowserRouter>
        <AuthProvider>
          <Reports />
        </AuthProvider>
      </BrowserRouter>
    );

    const exportButton = screen.getByText('내보내기');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(exportReport).toHaveBeenCalled();
    });
  });

  it('shows error toast when export fails', async () => {
    const { getReports, exportReport } = require('../../api/reports');
    getReports.mockResolvedValueOnce([]);
    exportReport.mockRejectedValueOnce(new Error('Export failed'));

    render(
      <BrowserRouter>
        <AuthProvider>
          <Reports />
        </AuthProvider>
      </BrowserRouter>
    );

    const exportButton = screen.getByText('내보내기');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText('보고서 내보내기 실패')).toBeInTheDocument();
    });
  });
}); 