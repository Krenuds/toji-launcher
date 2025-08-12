import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { registerIpcHandlers } from './ipc-handlers';
import { authManager } from './auth';
import { SystemSetup } from './system-setup';
import { BotDownloader } from './bot-downloader';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  // Create the browser window with security best practices
  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    title: 'Toji Launcher',
    webPreferences: {
      nodeIntegration: false,  // Security: disable node integration
      contextIsolation: true,   // Security: enable context isolation
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png') // We'll add icon later
  });

  // Register IPC handlers
  registerIpcHandlers(mainWindow);

  // Initialize system setup
  const systemSetup = new SystemSetup(mainWindow);
  
  // Initialize bot downloader
  const botDownloader = new BotDownloader(mainWindow);
  
  // Clean up on window close
  mainWindow.on('closed', () => {
    systemSetup.cleanup();
    botDownloader.cleanup();
    mainWindow = null;
  });

  // Load the index.html of the app
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Check auth state on startup (silent check)
  authManager.getUser();

}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // On macOS, keep app running unless explicitly quit
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
