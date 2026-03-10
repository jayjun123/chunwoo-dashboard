# PWA → IPA 빌드 및 아이패드 설치 가이드 (Mac + Cursor)

이 프로젝트는 **Capacitor**로 이미 설정되어 있습니다. Mac에서 웹 빌드 후 iOS 앱으로 패키징해 아이패드에 설치할 수 있습니다.

---

## 1. 사전 준비 (Mac)

- **macOS** (필수)
- **Xcode** (App Store에서 설치, 최신 버전 권장)
- **Xcode Command Line Tools**
  ```bash
  xcode-select --install
  ```
- **Node.js** (v18 이상 권장)
- **Apple ID** (무료 계정으로도 기기 직접 설치 가능)

---

## 2. Mac에서 프로젝트 열기

1. 이 저장소를 Mac으로 가져옵니다 (Git clone, USB 복사, 클라우드 동기화 등).
2. **Cursor**를 실행하고 해당 프로젝트 폴더를 엽니다.
3. Cursor 내장 터미널을 엽니다 (`` Ctrl+` `` 또는 터미널 메뉴).

---

## 3. 의존성 설치 및 웹 빌드

프로젝트 루트에서:

```bash
npm install
npm run build
```

`dist` 폴더에 PWA가 빌드됩니다.

---

## 4. iOS 네이티브 프로젝트 추가 (최초 1회)

**ios** 폴더가 아직 없다면 (Windows에서만 작업했다면 보통 없음):

```bash
npx cap add ios
```

- CocoaPods 설치 등으로 시간이 걸릴 수 있습니다.
- **반드시 Mac에서만** 실행 가능합니다.

이미 **ios** 폴더가 있다면 이 단계는 건너뜁니다.

---

## 5. 웹 빌드 결과를 iOS 앱에 반영

```bash
npx cap sync ios
```

- `dist` 내용이 `ios/App/Public` 등으로 복사됩니다.
- 소스 수정 후 다시 빌드할 때마다 `npm run build` → `npx cap sync ios` 를 반복하면 됩니다.

---

## 6. Xcode에서 열기

```bash
npx cap open ios
```

또는:

```bash
open ios/App/App.xcworkspace
```

- **반드시 `.xcworkspace` 파일**을 열어야 합니다 (`.xcodeproj` 아님).

---

## 7. Xcode에서 서명(Signing) 설정

1. 왼쪽에서 **App** 프로젝트 선택 → **Signing & Capabilities** 탭.
2. **Team**: 본인 Apple ID로 로그인한 팀 선택.
   - 팀이 없으면 **Add Account**로 Apple ID 추가 후 팀 생성.
3. **Bundle Identifier**가 고유해야 합니다 (예: `com.chunwoo.ai`).  
   이미 사용 중이면 예: `com.chunwoo.ai.companyname` 처럼 바꿉니다.

---

## 8. 아이패드에 바로 설치 (개발용, 가장 빠름)

1. 아이패드를 **USB로 Mac에 연결**합니다.
2. 아이패드에서 **“이 컴퓨터를 신뢰하시겠습니까?”** → **신뢰**.
3. Xcode 상단에서 **실행 대상(Device)**을 연결된 **아이패드**로 선택합니다.
4. **Run** 버튼(▶) 클릭 또는 `Cmd + R`.
5. 처음에는 아이패드 **설정 > 일반 > VPN 및 기기 관리**에서 개발자 앱을 **신뢰**해야 실행됩니다.

이렇게 하면 **IPA 파일 없이** 바로 아이패드에 앱이 설치·실행됩니다.

---

## 9. IPA 파일 만들어서 배포/보관하려면

1. Xcode 메뉴: **Product** → **Archive**.
2. 아카이브가 끝나면 **Organizer** 창이 뜹니다.
3. 방금 만든 아카이브 선택 → **Distribute App**.
4. **Development** 또는 **Ad Hoc** 선택 후 다음을 따라 IPA를 내보냅니다.
5. 내보낸 IPA는:
   - **Ad Hoc**: 등록된 기기 UDID에만 설치 가능 (Apple Developer 계정 필요).
   - **Development**: 해당 Mac에서 연결해 설치한 기기용.

---

## 10. 한 번에 실행할 명령어 요약 (Mac, Cursor 터미널)

```bash
# 최초 1회: ios 폴더 없을 때만
npx cap add ios

# 빌드 + 동기화 (코드 수정할 때마다)
npm run build
npx cap sync ios

# Xcode 열기
npx cap open ios
```

이후 Xcode에서 대상 기기를 **아이패드**로 선택하고 **Run** 하면 됩니다.

---

## 11. 자주 나오는 문제

| 문제 | 조치 |
|------|------|
| `npx cap add ios` 실패 (CocoaPods 오류) | `npx cap update ios` 후 다시 시도. 또는 Xcode·Command Line Tools 재설치. |
| 서명 오류 (Signing for "App" requires a development team) | **Signing & Capabilities**에서 Team 선택 및 Bundle ID 확인. |
| 아이패드에 “신뢰할 수 없는 개발자” | 아이패드 **설정 > 일반 > VPN 및 기기 관리**에서 해당 개발자 **신뢰**. |
| 앱이 빈 화면 / 안 뜸 | `npm run build` → `npx cap sync ios` 다시 실행 후 Xcode에서 **Clean Build Folder** 후 Run. |

---

## 12. 정리

- **PWA 전체**가 `dist`에 빌드되고, Capacitor가 이걸 **iOS WebView 앱**으로 감쌉니다.
- **Mac + Cursor**에서: `npm run build` → `npx cap sync ios` → `npx cap open ios` → Xcode에서 아이패드 선택 후 **Run** 하면 바로 아이패드에 설치됩니다.
- IPA가 필요하면 Xcode에서 **Product → Archive** 후 **Distribute App**으로 내보내면 됩니다.
