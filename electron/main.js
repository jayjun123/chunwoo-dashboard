const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

// 메인 윈도우 객체를 전역으로 유지
let mainWindow;

// 기본 메뉴 템플릿
const template = [
  {
    label: '파일',
    submenu: [
      {
        label: '새로 만들기',
        accelerator: 'CmdOrCtrl+N',
        click: () => {
          // 새로 만들기 기능
        }
      },
      {
        label: '열기',
        accelerator: 'CmdOrCtrl+O',
        click: () => {
          // 열기 기능
        }
      },
      { type: 'separator' },
      {
        label: '종료',
        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
        click: () => {
          app.quit();
        }
      }
    ]
  },
  {
    label: '편집',
    submenu: [
      { role: 'undo', label: '실행 취소' },
      { role: 'redo', label: '다시 실행' },
      { type: 'separator' },
      { role: 'cut', label: '잘라내기' },
      { role: 'copy', label: '복사' },
      { role: 'paste', label: '붙여넣기' },
      { role: 'selectall', label: '모두 선택' }
    ]
  },
  {
    label: '보기',
    submenu: [
      { role: 'reload', label: '새로고침' },
      { role: 'forceReload', label: '강제 새로고침' },
      { role: 'toggleDevTools', label: '개발자 도구' },
      { type: 'separator' },
      { role: 'resetZoom', label: '실제 크기' },
      { role: 'zoomIn', label: '확대' },
      { role: 'zoomOut', label: '축소' },
      { type: 'separator' },
      { role: 'togglefullscreen', label: '전체 화면' }
    ]
  },
  {
    label: '도움말',
    submenu: [
      {
        label: '프로그램 정보',
        click: () => {
          dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: '프로그램 정보',
            message: '현장관리 시스템',
            detail: '버전: 1.0.0\n개발: Chunwoo Team'
          });
        }
      },
      {
        label: '웹사이트 방문',
        click: () => {
          shell.openExternal('https://your-website.com');
        }
      }
    ]
  }
];

// 메인 윈도우 생성
function createWindow() {
  // 브라우저 윈도우 생성
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../public/favicon.ico'),
    show: false,
    titleBarStyle: 'default',
    autoHideMenuBar: false
  });

  // Firebase 앱이므로 빌드된 파일 사용 (로컬 서버 불필요)
  if (isDev) {
    // 개발 모드: 빌드된 파일 사용
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    mainWindow.webContents.openDevTools();
  } else {
    // 프로덕션: 빌드된 파일
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // 윈도우가 준비되면 표시
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // 개발 모드가 아닐 때만 메뉴 설정
    if (!isDev) {
      const menu = Menu.buildFromTemplate(template);
      Menu.setApplicationMenu(menu);
    }
  });

  // 윈도우가 닫힐 때
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 새 창이 열릴 때 기본 브라우저에서 열기
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// 앱이 준비되면 윈도우 생성
app.whenReady().then(createWindow);

// 모든 윈도우가 닫히면 앱 종료 (macOS 제외)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// macOS에서 dock 아이콘 클릭 시 윈도우 다시 생성
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 보안: 새 창 생성 방지
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

// IPC 핸들러들
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-app-name', () => {
  return app.getName();
});

// 개발 모드에서만 메뉴 표시
if (isDev) {
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
