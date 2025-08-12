import { contextBridge, ipcRenderer } from 'electron';

// Define the API we expose to the renderer
export interface ElectronAPI {
  auth: {
    login: () => Promise<void>;
    logout: () => Promise<void>;
    getUser: () => Promise<UserInfo | null>;
    onAuthStateChange: (callback: (user: UserInfo | null) => void) => void;
  };
  bot: {
    start: () => Promise<void>;
    stop: () => Promise<void>;
    getStatus: () => Promise<BotStatus>;
    onStatusChange: (callback: (status: BotStatus) => void) => void;
    getLogs: (lines?: number) => Promise<string[]>;
  };
  system: {
    openExternal: (url: string) => Promise<void>;
    getVersion: () => Promise<string>;
  };
  // System setup API
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  on: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
  off: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
}

export interface UserInfo {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
  email?: string;
}

export interface BotStatus {
  running: boolean;
  pid?: number;
  uptime?: number;
  error?: string;
}

// Expose protected methods that allow the renderer to safely interact with the main process
contextBridge.exposeInMainWorld('electronAPI', {
  auth: {
    login: () => ipcRenderer.invoke('auth:login'),
    logout: () => ipcRenderer.invoke('auth:logout'),
    getUser: () => ipcRenderer.invoke('auth:get-user'),
    onAuthStateChange: (callback: (user: UserInfo | null) => void) => {
      ipcRenderer.on('auth:state-changed', (_event, user) => callback(user));
    }
  },
  bot: {
    start: () => ipcRenderer.invoke('bot:start'),
    stop: () => ipcRenderer.invoke('bot:stop'),
    getStatus: () => ipcRenderer.invoke('bot:get-status'),
    onStatusChange: (callback: (status: BotStatus) => void) => {
      ipcRenderer.on('bot:status-changed', (_event, status) => callback(status));
    },
    getLogs: (lines?: number) => ipcRenderer.invoke('bot:get-logs', lines)
  },
  system: {
    openExternal: (url: string) => ipcRenderer.invoke('system:open-external', url),
    getVersion: () => ipcRenderer.invoke('system:get-version')
  },
  // Expose generic IPC communication for system setup
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  on: (channel: string, listener: (event: any, ...args: any[]) => void) => {
    ipcRenderer.on(channel, listener);
  },
  off: (channel: string, listener: (event: any, ...args: any[]) => void) => {
    ipcRenderer.off(channel, listener);
  }
});