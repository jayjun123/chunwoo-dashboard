const { contextBridge, ipcRenderer } = require('electron');

// 렌더러 프로세스에서 사용할 API 노출
contextBridge.exposeInMainWorld('electronAPI', {
  // 앱 정보 가져오기
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppName: () => ipcRenderer.invoke('get-app-name'),
  
  // 파일 시스템 관련 (필요시 추가)
  // openFile: () => ipcRenderer.invoke('open-file'),
  // saveFile: (data) => ipcRenderer.invoke('save-file', data),
  
  // 시스템 정보
  getPlatform: () => process.platform,
  getArch: () => process.arch,
  
  // 개발 모드 확인
  isDev: process.env.NODE_ENV === 'development',
  
  // 알림 (Windows 네이티브 알림)
  showNotification: (title, body) => {
    if (process.platform === 'win32') {
      // Windows 네이티브 알림 사용
      new Notification(title, { body });
    }
  }
});

// 보안: Node.js API 비활성화
process.once('loaded', () => {
  // Node.js 글로벌 객체 제거
  delete global.process;
  delete global.Buffer;
  delete global.setImmediate;
  delete global.clearImmediate;
});
