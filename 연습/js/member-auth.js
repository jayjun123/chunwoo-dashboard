// 회원 및 권한 관리 JS

// 예시 회원 데이터(최초 1회만 저장)
const defaultMemberData = {
  master: [
    {id: 'fire8803', name: '마스터', org: '총괄', pw: 'power520!!', role: '마스터'}
  ],
  admin: [  ],
  user: [  ],
  request: []
};

// 예시 메뉴 권한 데이터(최초 1회만 저장)
const defaultMenuAuth = {
  '공사현황': { 마스터: {읽기:1, 쓰기:1, 올리기:1, 내려받기:1, 수정:1}, 관리자: {읽기:1, 쓰기:1, 올리기:1, 내려받기:1, 수정:1}, 일반회원: {읽기:1, 쓰기:0, 올리기:0, 내려받기:0, 수정:0} },
  '회원명단': { 마스터: {읽기:1, 쓰기:1, 올리기:1, 내려받기:1, 수정:1}, 관리자: {읽기:1, 쓰기:1, 올리기:1, 내려받기:1, 수정:1}, 일반회원: {읽기:0, 쓰기:0, 올리기:0, 내려받기:0, 수정:0} },
  '메뉴권한': { 마스터: {읽기:1, 쓰기:1, 올리기:1, 내려받기:1, 수정:1}, 관리자: {읽기:0, 쓰기:0, 올리기:0, 내려받기:0, 수정:0}, 일반회원: {읽기:0, 쓰기:0, 올리기:0, 내려받기:0, 수정:0} },
  '기성현황': { 마스터: {읽기:1, 쓰기:1, 올리기:1, 내려받기:1, 수정:1}, 관리자: {읽기:1, 쓰기:1, 올리기:1, 내려받기:1, 수정:1}, 일반회원: {읽기:0, 쓰기:0, 올리기:0, 내려받기:0, 수정:0} }
};

// 초기 데이터 저장
if(!localStorage.getItem('memberData')) {
  localStorage.setItem('memberData', JSON.stringify(defaultMemberData));
}
if(!localStorage.getItem('menuAuth')) {
  localStorage.setItem('menuAuth', JSON.stringify(defaultMenuAuth));
}

// --- 회원 관리 기능 ---
function renderMemberSection() {
  const memberData = JSON.parse(localStorage.getItem('memberData'));
  const section = document.getElementById('member-section');
  if (!section) return;
  
  section.innerHTML = `
    <div class="member-vertical-list">
      <div>
        <h3>회원 신청목록 (${memberData.request.length}명)</h3>
        ${renderMemberTable(memberData.request, 'request')}
      </div>
      <div>
        <h3>일반회원 (${memberData.user.length}명)</h3>
        ${renderMemberTable(memberData.user, 'user')}
      </div>
      <div>
        <h3>관리자 (${memberData.admin.length}명)</h3>
        ${renderMemberTable(memberData.admin, 'admin')}
      </div>
      <div>
        <h3>마스터 (${memberData.master.length}명)</h3>
        ${renderMemberTable(memberData.master, 'master')}
      </div>
    </div>
  `;
  addRoleChangeEvents();
  addPwEyeEvents();
}

function renderMemberTable(list, type) {
  return `<div class="member-table-wrap">
    <table class="member-table">
      <thead>
        <tr>
          <th>아이디</th>
          <th>이름</th>
          <th>소속</th>
          <th>비밀번호</th>
          <th></th>
          <th>권한</th>
          ${type === 'request' ? '<th>신청일시</th>' : ''}
        </tr>
      </thead>
      <tbody>
        ${list.map((m, idx) => `
          <tr>
            <td>${m.id}</td>
            <td>${m.name}</td>
            <td>${m.org}</td>
            <td><span class="pw-blind" data-pw="${m.pw}">${'*'.repeat(m.pw.length)}</span></td>
            <td><button class="pw-eye-btn" data-type="${type}" data-idx="${idx}"></button></td>
            <td>
              ${m.role === '마스터' ? 
                '<span style="color:#e53935;font-weight:bold;">마스터</span>' : 
                `<select class="role-select" data-type="${type}" data-idx="${idx}">
                  <option value="관리자"${m.role==='관리자'?' selected':''}>관리자</option>
                  <option value="일반회원"${m.role==='일반회원'?' selected':''}>일반회원</option>
                  <option value="요청"${m.role==='요청'?' selected':''}>요청</option>
                  <option value="회원거절"${m.role==='회원거절'?' selected':''}>회원거절</option>
                </select>`
              }
            </td>
            ${type === 'request' ? `<td>${m.requestDate ? new Date(m.requestDate).toLocaleString() : '-'}</td>` : ''}
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>`;
}

function addRoleChangeEvents() {
  document.querySelectorAll('.role-select').forEach(select => {
    select.onchange = function() {
      const type = this.dataset.type;
      const idx = parseInt(this.dataset.idx);
      const newRole = this.value;
      const memberData = JSON.parse(localStorage.getItem('memberData'));
      let member;
      
      // 기존 위치에서 제거
      if(type === 'master') member = memberData.master.splice(idx, 1)[0];
      else if(type === 'admin') member = memberData.admin.splice(idx, 1)[0];
      else if(type === 'user') member = memberData.user.splice(idx, 1)[0];
      else if(type === 'request') member = memberData.request.splice(idx, 1)[0];
      
      member.role = newRole;
      
      // 새 위치에 추가
      if(newRole === '마스터') memberData.master.push(member);
      else if(newRole === '관리자') memberData.admin.push(member);
      else if(newRole === '일반회원') memberData.user.push(member);
      else if(newRole === '요청' || newRole === '회원거절') memberData.request.push(member);
      
      // 저장 및 갱신
      localStorage.setItem('memberData', JSON.stringify(memberData));
      
      // 권한 변경 알림
      const roleNames = {
        '마스터': '마스터',
        '관리자': '관리자',
        '일반회원': '일반회원',
        '요청': '신청대기',
        '회원거절': '거절'
      };
      
      // 권한 변경 알림 및 화면 갱신
      alert(`${member.name}님의 권한이 ${roleNames[newRole]}로 변경되었습니다.`);
      renderMemberSection();
      
      // 현재 로그인한 사용자의 권한이 변경된 경우 메뉴 권한 즉시 적용
      if(member.id === localStorage.getItem('loginId')) {
        localStorage.setItem('isAdmin', newRole === '관리자' ? 'Y' : 'N');
        localStorage.setItem('isMaster', newRole === '마스터' ? 'Y' : 'N');
        showMenusByAuth();
      }
    };
  });
}

function addPwEyeEvents() {
  document.querySelectorAll('.pw-eye-btn').forEach(btn => {
    btn.onclick = function() {
      const type = this.dataset.type;
      const idx = parseInt(this.dataset.idx);
      const memberData = JSON.parse(localStorage.getItem('memberData'));
      let member;
      if(type === 'admin') member = memberData.admin[idx];
      else if(type === 'user') member = memberData.user[idx];
      else if(type === 'request') member = memberData.request[idx];
      const pwSpan = this.closest('tr').querySelector('.pw-blind');
      if(this.classList.contains('active')) {
        pwSpan.textContent = '*'.repeat(member.pw.length);
        this.classList.remove('active');
      } else {
        pwSpan.textContent = member.pw;
        this.classList.add('active');
      }
    };
  });
}

// --- 권한 관리 기능 ---
function renderAuthSection() {
  const menuAuth = JSON.parse(localStorage.getItem('menuAuth'));
  const section = document.getElementById('auth-section');
  if (!section) return;
  
  section.innerHTML = `
    <div style="overflow-x:auto;">
      <table class="auth-table" style="width:100%;min-width:600px;">
        <thead>
          <tr style="background:#e3eaf3; color:#1976d2;">
            <th>메뉴</th>
            <th>권한</th>
            <th>읽기</th>
            <th>쓰기</th>
            <th>올리기</th>
            <th>내려받기</th>
            <th>수정</th>
          </tr>
        </thead>
        <tbody>
          ${Object.keys(menuAuth).map(menu => {
            return ['마스터','관리자','일반회원'].map((role, i) => `
              <tr>
                ${i===0?`<td rowspan="3" style="font-weight:bold;">${menu}</td>`:''}
                <td>${role}</td>
                ${['읽기','쓰기','올리기','내려받기','수정'].map(auth => `
                  <td><input type="checkbox" class="auth-chk" data-menu="${menu}" data-role="${role}" data-auth="${auth}" ${menuAuth[menu][role][auth] ? 'checked' : ''}></td>
                `).join('')}
              </tr>
            `).join('');
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
  addAuthChangeEvents();
}

function addAuthChangeEvents() {
  document.querySelectorAll('.auth-chk').forEach(chk => {
    chk.onchange = function() {
      const menu = this.dataset.menu;
      const role = this.dataset.role;
      const auth = this.dataset.auth;
      const menuAuth = JSON.parse(localStorage.getItem('menuAuth'));
      menuAuth[menu][role][auth] = this.checked ? 1 : 0;
      localStorage.setItem('menuAuth', JSON.stringify(menuAuth));
      
      // 권한 변경 알림
      const authNames = {
        '읽기': '조회',
        '쓰기': '작성',
        '올리기': '업로드',
        '내려받기': '다운로드',
        '수정': '수정'
      };
      alert(`${menu} 메뉴의 ${role} ${authNames[auth]} 권한이 ${this.checked ? '부여' : '제거'}되었습니다.`);
      
      // 화면 갱신 및 메뉴 권한 즉시 적용
      renderAuthSection();
      showMenusByAuth();
    };
  });
}

// 페이지 로드 시 해당 섹션 렌더링
document.addEventListener('DOMContentLoaded', function() {
  // 데이터 초기화
  localStorage.clear();
  
  // 초기 데이터 저장
  localStorage.setItem('memberData', JSON.stringify(defaultMemberData));
  localStorage.setItem('menuAuth', JSON.stringify(defaultMenuAuth));
  
  // 마스터 계정 추가
  const memberData = JSON.parse(localStorage.getItem('memberData'));
  memberData.master.push({
    id: 'fire8803',
    name: '마스터',
    org: '총괄',
    pw: 'power520!!',
    role: '마스터'
  });
  localStorage.setItem('memberData', JSON.stringify(memberData));
  
  // 마스터 계정으로 로그인
  localStorage.setItem('loginId', 'fire8803');
  localStorage.setItem('isMaster', 'Y');
  localStorage.setItem('isAdmin', 'N');
  
  // 메뉴 권한 즉시 적용
  if(typeof showMenusByAuth === 'function') {
    showMenusByAuth();
  }
  
  if(document.getElementById('member-section')) {
    renderMemberSection();
  }
  if(document.getElementById('auth-section')) {
    renderAuthSection();
  }
});

// 로그아웃
localStorage.removeItem('loginId');
localStorage.removeItem('isAdmin');
localStorage.removeItem('isMaster');

localStorage.clear();

console.log(JSON.parse(localStorage.getItem('menuAuth')));

// 기성현황 메뉴 권한 확인을 위한 함수
function checkMenuAuth(menuName) {
  const menuAuth = JSON.parse(localStorage.getItem('menuAuth'));
  const isMaster = localStorage.getItem('isMaster') === 'Y';
  const isAdmin = localStorage.getItem('isAdmin') === 'Y';
  
  if (!menuAuth || !menuAuth[menuName]) return false;
  
  if (isMaster) return menuAuth[menuName]['마스터']['읽기'] === 1;
  if (isAdmin) return menuAuth[menuName]['관리자']['읽기'] === 1;
  return menuAuth[menuName]['일반회원']['읽기'] === 1;
}

// 기성현황 메뉴 표시 여부 확인
console.log('기성현황 메뉴 권한:', checkMenuAuth('기성현황')); 