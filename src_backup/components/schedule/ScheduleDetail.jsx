import React, { useState } from 'react';
import styled from '@emotion/styled';

const ScheduleDetail = () => {
  const [isSubcontractChecked, setIsSubcontractChecked] = useState(false);
  const [isImportant, setIsImportant] = useState(false);

  return (
    <Container>
      <TopBar>
        <Title>현장 상세 정보</Title>
        <TopBarActions>
          <AddSiteButton>새현장 추가</AddSiteButton>
          <ListButton>전체리스트</ListButton>
        </TopBarActions>
      </TopBar>
      
      <ContentContainer>
        {/* 좌측: 현장 상세 정보 */}
        <LeftSection>
          {/* 1번째 줄: 현장명 + 진행상태 + 즐겨찾기 */}
          <FirstRow>
            <FormGroup style={{ flex: 2 }}>
              <Label>현장명</Label>
              <Input type="text" />
            </FormGroup>
            <CompactFormGroup>
              <Label>진행</Label>
              <Select>
                <option value="진행중">진행중</option>
                <option value="예정">예정</option>
                <option value="완료">완료</option>
                <option value="보류">보류</option>
              </Select>
            </CompactFormGroup>
          </FirstRow>

          {/* 2번째 줄: 계약구분 + 하도급지킴이 + 차수 + 주요현장 */}
          <Row>
            <ContractFormGroup>
              <Label>계약구분</Label>
              <Select onChange={(e) => setIsSubcontractChecked(e.target.value === '하도급계약')}>
                <option value="하도급계약">하도급계약</option>
                <option value="납품계약">납품계약</option>
                <option value="일반계약">일반계약</option>
                <option value="계약없음">계약없음</option>
                <option value="원도급계약">원도급계약</option>
              </Select>
            </ContractFormGroup>
            <CheckboxGroup>
              <Checkbox 
                type="checkbox" 
                id="subcontractCheck"
                disabled={!isSubcontractChecked}
              />
              <CheckboxLabel htmlFor="subcontractCheck">하도급지킴이</CheckboxLabel>
            </CheckboxGroup>
            <NumberFormGroup>
              <Label>차수</Label>
              <NumberInputWrapper>
                <NumberInput 
                  type="number" 
                  min="1" 
                  max="9" 
                  placeholder="차수"
                />
                <UnitText>차</UnitText>
              </NumberInputWrapper>
            </NumberFormGroup>
            <StarCheckboxContainer onClick={() => setIsImportant(!isImportant)}>
                <ImportantLabel>주요현장</ImportantLabel>
                <Star className={isImportant ? 'checked' : ''}>
                  {isImportant ? '★' : '☆'}
                </Star>
            </StarCheckboxContainer>
          </Row>

          {/* 3번째 줄: 계약금액, 선급금, 누계기성 */}
          <Row>
            <FormGroup>
              <Label>계약금액</Label>
              <Input type="number" />
            </FormGroup>
            <FormGroup>
              <Label>선급금</Label>
              <Input type="number" />
            </FormGroup>
            <FormGroup>
              <Label>누계기성</Label>
              <Input type="number" readOnly />
            </FormGroup>
          </Row>

          {/* 4번째 줄: 착공주소 */}
          <Row>
            <FormGroup>
              <Label>착공주소</Label>
              <Input type="text" />
            </FormGroup>
          </Row>

          {/* 5번째 줄: 착공일, 준공예정일 */}
          <Row>
            <FormGroup>
              <Label>착공일</Label>
              <DateInput type="date" />
            </FormGroup>
            <FormGroup>
              <Label>준공예정일</Label>
              <DateInput type="date" />
            </FormGroup>
          </Row>

          {/* 6번째 줄: 회사명, 소장, 연락처 */}
          <Row>
            <FormGroup>
              <Label>회사명</Label>
              <Input type="text" />
            </FormGroup>
            <FormGroup>
              <Label>소장</Label>
              <Input type="text" />
            </FormGroup>
            <FormGroup>
              <Label>연락처</Label>
              <Input type="tel" />
            </FormGroup>
          </Row>

          {/* 7번째 줄: 시공팀, 기타사항 */}
          <Row>
            <FormGroup>
              <Label>시공팀</Label>
              <Input type="text" />
            </FormGroup>
            <FormGroup style={{ flex: 2 }}>
              <Label>기타사항</Label>
              <Input type="text" />
            </FormGroup>
          </Row>

          {/* 버튼 그룹 */}
          <ButtonGroup>
            <SaveButton>저장하기</SaveButton>
            <DeleteButton>삭제</DeleteButton>
            <HistoryButton>기성현황</HistoryButton>
          </ButtonGroup>
        </LeftSection>

        {/* 우측: 물량 내역 */}
        <RightSection>
          <RightHeader>
            <HeaderTitle>물량 내역</HeaderTitle>
            <AddItemButton>품목추가</AddItemButton>
          </RightHeader>

          <ItemsContainer>
            <ItemGrid>
              <ColumnLabel>항목</ColumnLabel>
              <ColumnLabel>물량</ColumnLabel>
              <ColumnLabel>단가</ColumnLabel>
              <div></div>
            </ItemGrid>
            <ItemGrid>
              <ItemInput />
              <ItemInput type="number" />
              <ItemInput type="number" />
              <DeleteItemButton>삭제</DeleteItemButton>
            </ItemGrid>
          </ItemsContainer>
        </RightSection>
      </ContentContainer>
    </Container>
  );
};

const Container = styled.div`
  padding: 0;
  background-color: #1E1E1E;
  height: 100%;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
`;

const TopBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background-color: #2A2A2A;
  border-bottom: 1px solid #3A3A3A;
  
  @media (max-width: 768px) {
    padding: 15px;
  }
`;

const Title = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  color: white;

  @media (max-width: 768px) {
    font-size: 16px;
  }
`;

const TopBarActions = styled.div`
  display: flex;
  gap: 8px;
`;

const TopBarButton = styled.button`
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
`;

const AddSiteButton = styled(TopBarButton)`
  background-color: #0078D4;
  &:hover {
    background-color: #106EBE;
  }
  @media (max-width: 768px) {
    padding: 4px 8px;
    font-size: 12px;
  }
`;

const ListButton = styled(TopBarButton)`
  background-color: #6c757d;
  &:hover {
    background-color: #5a6268;
  }
  @media (max-width: 768px) {
    padding: 4px 8px;
    font-size: 12px;
  }
`;

const ContentContainer = styled.div`
  display: flex;
  gap: 20px;
  padding: 20px;
  height: calc(100% - 70px);
  overflow-y: auto;

  @media (max-width: 768px) {
    flex-direction: column;
    height: auto;
    overflow-y: visible;
    padding: 15px;
  }
`;

const LeftSection = styled.div`
  flex: 6;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;

  @media (max-width: 768px) {
    width: 100%;
    gap: 12px;
  }
`;

const RightSection = styled.div`
  flex: 4;
  min-width: 0;
  background-color: #2A2A2A;
  border-radius: 4px;
  display: flex;
  flex-direction: column;

  @media (max-width: 768px) {
    width: 100%;
  }
`;

const FirstRow = styled.div`
  display: flex;
  gap: 16px;
  align-items: flex-end;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
`;

const Row = styled.div`
  display: flex;
  gap: 16px;
  align-items: flex-end;
  width: 100%;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  position: relative;
`;

const CompactFormGroup = styled(FormGroup)`
  flex: 0 0 auto;
  width: 120px;

  @media (max-width: 768px) {
    width: 100%;
  }
`;

const NumberFormGroup = styled(FormGroup)`
  flex: 0 0 auto;
  width: 120px;
  
  @media (max-width: 768px) {
    width: 100%;
  }
`;

const CheckboxGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 8px;
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  margin: 0;
`;

const CheckboxLabel = styled.label`
  color: #888;
  font-size: 14px;
`;

const Label = styled.label`
  font-size: 14px;
  color: #888;
  text-align: left;
  width: 100%;
  @media (max-width: 1100px) {
    font-size: 12px;
  }
`;

const Input = styled.input`
  background-color: #2A2A2A;
  border: 1px solid #3A3A3A;
  border-radius: 4px;
  color: white;
  padding: 8px 12px;
  font-size: 14px;
  height: 36px;
  box-sizing: border-box;

  @media (max-width: 1100px) {
    padding: 6px 10px;
    font-size: 12px;
    height: 32px;
  }

  &:focus {
    outline: none;
    border-color: #0078D4;
  }
`;

const Select = styled.select`
  background-color: #2A2A2A;
  border: 1px solid #3A3A3A;
  border-radius: 4px;
  color: white;
  padding: 8px 12px;
  font-size: 14px;
  height: 36px;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 16px;
  cursor: pointer;

  @media (max-width: 1100px) {
    padding: 6px 10px;
    font-size: 12px;
    height: 32px;
  }

  &:focus {
    outline: none;
    border-color: #0078D4;
  }
`;

const DateInput = styled(Input)`
  &::-webkit-calendar-picker-indicator {
    filter: invert(1);
    cursor: pointer;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const Button = styled.button`
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  border: none;
  height: 36px;
`;

const SaveButton = styled(Button)`
  background-color: #0078D4;
  color: white;
  &:hover {
    background-color: #106EBE;
  }
`;

const DeleteButton = styled(Button)`
  background-color: #ff4444;
  color: white;
  &:hover {
    background-color: #ff6666;
  }
`;

const HistoryButton = styled(Button)`
  background-color: #333333;
  color: white;
  &:hover {
    background-color: #444444;
  }
`;

const RightHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #3A3A3A;
`;

const HeaderTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: white;
`;

const AddItemButton = styled(Button)`
  background-color: #0078D4;
  color: white;
  margin: 0;
  
  &:hover {
    background-color: #106EBE;
  }
`;

const ItemsContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ItemGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 80px 80px auto;
  gap: 8px;
  align-items: center;

  @media (max-width: 768px) {
    grid-template-columns: 1fr 60px 60px auto;
    gap: 6px;
  }
`;

const ColumnLabel = styled.span`
  color: #888;
  font-size: 14px;
  text-align: left;
`;

const ItemInput = styled(Input)`
  margin: 0;
`;

const DeleteItemButton = styled.button`
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  padding: 4px;
  font-size: 14px;
  
  &:hover {
    color: #ff4444;
  }
`;

const ContractFormGroup = styled(FormGroup)`
  flex: 0 0 auto;
  width: 150px;

  @media (max-width: 768px) {
    width: 100%;
  }
`;

const NumberInputWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const NumberInput = styled(Input)`
  width: 100%;
  padding-right: 24px;
`;

const UnitText = styled.span`
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  color: #888;
  font-size: 14px;
  pointer-events: none;
`;

const StarCheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding-bottom: 8px;
  cursor: pointer;
  margin-left: auto;

  @media (max-width: 768px) {
    margin-left: 0;
    align-self: flex-start;
  }
`;

const ImportantLabel = styled.span`
  font-size: 14px;
  color: #888;
`;

const Star = styled.span`
  font-size: 20px;
  color: #666;
  
  &.checked {
    color: #FFD700;
  }
`;

export default ScheduleDetail;