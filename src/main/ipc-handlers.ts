import { ipcMain, app } from 'electron';
import { authManager } from './auth';

/**
 * Register all IPC handlers for the main process
 */
export function registerIpcHandlers(mainWindow: Electron.BrowserWindow) {
  
  // Auth handlers
  ipcMain.handle('auth:login', async () => {
    try {
      await authManager.login();
      const user = authManager.getUser();
      
      // Notify renderer of auth state change
      mainWindow.webContents.send('auth:state-changed', user);
      
      return { success: true, user };
    } catch (error: any) {
      console.error('Login failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('auth:logout', async () => {
    authManager.logout();
    
    // Notify renderer of auth state change
    mainWindow.webContents.send('auth:state-changed', null);
    
    return { success: true };
  });

  ipcMain.handle('auth:get-user', async () => {
    return authManager.getUser();
  });

  // System handlers
  ipcMain.handle('system:get-version', async () => {
    return app.getVersion();
  });

  ipcMain.handle('system:open-external', async (event, url: string) => {
    const { shell } = require('electron');
    await shell.openExternal(url);
  });

  // Bot handlers (placeholder for Phase 3)
  ipcMain.handle('bot:start', async () => {
    // TODO: Implement in Phase 3
    return { success: false, error: 'Not implemented yet' };
  });

  ipcMain.handle('bot:stop', async () => {
    // TODO: Implement in Phase 3
    return { success: false, error: 'Not implemented yet' };
  });

  ipcMain.handle('bot:get-status', async () => {
    // TODO: Implement in Phase 3
    return { running: false };
  });

  ipcMain.handle('bot:get-logs', async (event, lines?: number) => {
    // TODO: Implement in Phase 3
    return [];
  });
}