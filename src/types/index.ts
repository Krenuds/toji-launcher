// Shared type definitions between main and renderer processes

export interface UserInfo {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
}

export interface BotStatus {
  running: boolean;
  pid?: number;
  uptime?: number;
  error?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: UserInfo;
  error?: string;
}

// Global type declaration for window.electronAPI
declare global {
  interface Window {
    electronAPI: {
      auth: {
        login: () => Promise<AuthResponse>;
        logout: () => Promise<{ success: boolean }>;
        getUser: () => Promise<UserInfo | null>;
        onAuthStateChange: (callback: (user: UserInfo | null) => void) => void;
      };
      bot: {
        start: () => Promise<{ success: boolean; error?: string }>;
        stop: () => Promise<{ success: boolean; error?: string }>;
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
    };
  }
}