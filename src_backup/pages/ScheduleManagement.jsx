import React, { useState } from 'react';
import styled from '@emotion/styled';
import '../styles/ScheduleManagement.css';
import ScheduleDetail from '../components/schedule/ScheduleDetail';

const ScheduleManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <Container>
      <LeftPanel>
        <Title>현장 목록</Title>
        <SearchBar>
          <SearchIcon>🔍</SearchIcon>
          <SearchInput
            type="text"
            placeholder="현장명 또는 담당자 검색"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </SearchBar>
        <TabContainer>
          <Tab className="active">진행중</Tab>
          <Tab>예정</Tab>
          <Tab>완료</Tab>
          <Tab>보류</Tab>
        </TabContainer>
        <CountInfo>전체 0개</CountInfo>
      </LeftPanel>
      <ScheduleDetail />
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  height: 100vh;
  background-color: #1E1E1E;
  color: white;

  @media (max-width: 768px) {
    flex-direction: column;
    height: auto;
  }
`;

const LeftPanel = styled.div`
  width: 300px;
  background-color: #2A2A2A;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  border-right: 1px solid #3A3A3A;
  transition: all 0.2s ease-in-out;

  @media (max-width: 1100px) {
    width: 250px;
    padding: 15px;
    gap: 12px;
  }

  @media (max-width: 768px) {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #3A3A3A;
    height: auto;
    padding: 0.9375rem;
  }
`;

const Title = styled.h1`
  font-size: 18px;
  font-weight: bold;
  margin: 0;
  color: #FFFFFF;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
  height: 24px;
  line-height: 24px;
  display: flex;
  align-items: center;

  &.active {
    color: #0078D4;
  }

  @media (max-width: 1100px) {
    font-size: 16px;
    height: 22px;
    line-height: 22px;
  }

  @media (max-width: 48rem) {
    font-size: 13px;
    padding: 6px 12px;
    height: 20px;
    line-height: 20px;
  }
`;

const SearchBar = styled.div`
  position: relative;
  width: 100%;
`;

const SearchIcon = styled.span`
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #666;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 8px 8px 8px 35px;
  background-color: #1E1E1E;
  border: 1px solid #3A3A3A;
  border-radius: 4px;
  color: white;
  font-size: 14px;

  @media (max-width: 1100px) {
    font-size: 12px;
    padding: 6px 6px 6px 30px;
  }

  &:focus {
    outline: none;
    border-color: #0078D4;
  }

  &::placeholder {
    color: #666;
  }
`;

const TabContainer = styled.div`
  display: flex;
  justify-content: space-around;
  gap: 0.625rem;
  border-bottom: 1px solid #3A3A3A;
  padding-bottom: 0.625rem;
`;

const Tab = styled.button`
  background: none;
  border: none;
  color: #888;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;

  @media (max-width: 1100px) {
    font-size: 12px;
    padding: 6px 12px;
  }

  &.active {
    color: #0078D4;
    position: relative;

    &:after {
      content: '';
      position: absolute;
      bottom: -0.6875rem;
      left: 0;
      width: 100%;
      height: 0.125rem;
      background-color: #0078D4;
    }
  }

  &:hover {
    color: #0078D4;
  }

  @media (max-width: 48rem) {
    font-size: 0.8125rem;
    padding: 0.375rem 0.75rem;
  }
`;

const CountInfo = styled.div`
  font-size: 14px;
  color: #888;

  @media (max-width: 1100px) {
    font-size: 12px;
  }
`;

export default ScheduleManagement; 