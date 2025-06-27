import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DocumentManagement from './DocumentManagement';

// Mock ThemeContext
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({ isDarkMode: false })
}));

// Mock documentsAPI
const mockDocs = [
  {
    id: '1',
    title: '테스트 문서',
    category: '계약서',
    description: '설명',
    fileUrl: '',
    tags: ['테스트'],
    relatedSiteId: '',
    createdBy: '홍길동',
    status: 'active'
  }
];
const subscribeToDocuments = jest.fn(cb => {
  cb(mockDocs);
  return () => {};
});
const addDocument = jest.fn();
const updateDocument = jest.fn();
const deleteDocument = jest.fn();

jest.mock('../api/database', () => ({
  documentsAPI: {
    subscribeToDocuments,
    addDocument,
    updateDocument,
    deleteDocument
  }
}));

describe('DocumentManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('문서관리 컴포넌트가 정상 렌더링된다', async () => {
    render(<DocumentManagement />);
    expect(screen.getByText('문서관리')).toBeInTheDocument();
    expect(await screen.findByText('테스트 문서')).toBeInTheDocument();
  });

  it('문서 검색이 동작한다', async () => {
    render(<DocumentManagement />);
    const searchInput = screen.getByPlaceholderText('문서 검색...');
    fireEvent.change(searchInput, { target: { value: '테스트' } });
    expect(await screen.findByText('테스트 문서')).toBeInTheDocument();
    fireEvent.change(searchInput, { target: { value: '없는문서' } });
    await waitFor(() => {
      expect(screen.queryByText('테스트 문서')).not.toBeInTheDocument();
    });
  });

  it('문서 추가 버튼 클릭 시 모달이 열린다', () => {
    render(<DocumentManagement />);
    fireEvent.click(screen.getByText('문서 추가'));
    expect(screen.getByText('문서 추가')).toBeInTheDocument();
    expect(screen.getByLabelText('제목')).toBeInTheDocument();
  });

  it('문서 삭제 버튼 클릭 시 삭제 함수가 호출된다', async () => {
    window.confirm = jest.fn(() => true);
    render(<DocumentManagement />);
    const deleteBtn = await screen.findByText('삭제');
    fireEvent.click(deleteBtn);
    expect(deleteDocument).toHaveBeenCalledWith('1');
  });
}); 