import { BrowserWindow, app } from 'electron';
import { safeStorage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

const OAUTH_SERVER_URL = process.env.OAUTH_SERVER_URL || 'http://20.169.250.88:8000';
const AUTH_FILE = path.join(app.getPath('userData'), 'auth.json');

export interface UserInfo {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
}

export interface AuthData {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  user: UserInfo;
  timestamp: number;
}

class AuthManager {
  private authWindow: BrowserWindow | null = null;
  private authData: AuthData | null = null;

  constructor() {
    this.loadAuthData();
  }

  /**
   * Load saved auth data from encrypted storage
   */
  private loadAuthData(): void {
    try {
      if (fs.existsSync(AUTH_FILE)) {
        const encryptedData = fs.readFileSync(AUTH_FILE);
        if (safeStorage.isEncryptionAvailable()) {
          const decrypted = safeStorage.decryptString(encryptedData);
          this.authData = JSON.parse(decrypted);
          // Silent load - no console output needed
        }
      }
    } catch (error) {
      console.error('Failed to load auth data:', error);
      this.authData = null;
    }
  }

  /**
   * Save auth data to encrypted storage
   */
  private saveAuthData(data: AuthData): void {
    try {
      if (safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(JSON.stringify(data));
        fs.writeFileSync(AUTH_FILE, encrypted);
        // Silent save - no console output needed
      } else {
        // Fallback to plain text if encryption not available (dev mode)
        fs.writeFileSync(AUTH_FILE, JSON.stringify(data, null, 2));
        console.warn('Saved auth data without encryption (dev mode)');
      }
      this.authData = data;
    } catch (error) {
      console.error('Failed to save auth data:', error);
    }
  }

  /**
   * Start OAuth flow with Discord
   */
  async login(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Create auth window
      this.authWindow = new BrowserWindow({
        width: 500,
        height: 700,
        title: 'Login with Discord',
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        }
      });

      // Load OAuth URL
      const authUrl = `${OAUTH_SERVER_URL}/auth/discord`;
      
      // Only open DevTools in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log('Loading OAuth URL:', authUrl);
        this.authWindow.webContents.openDevTools();
      }
      
      // Add error handlers
      this.authWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        console.error('Failed to load:', errorDescription, 'URL:', validatedURL);
      });
      
      this.authWindow.webContents.on('did-finish-load', () => {
        if (process.env.NODE_ENV === 'development') {
          const currentURL = this.authWindow!.webContents.getURL();
          console.log('Page loaded successfully:', currentURL);
        }
      });
      
      this.authWindow.loadURL(authUrl);

      // Handle navigation to detect callback
      this.authWindow.webContents.on('did-navigate', async (event, url) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('Navigated to:', url);
        }
        
        // Check if we're on the callback/success page
        if (url.includes('/auth/callback')) {
          try {
            // Wait a moment for the page to fully load
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Extract auth data from the page with polling mechanism
            // The server sets window.TOJI_AUTH_DATA via script tag which takes time to execute
            const authData = await this.authWindow!.webContents.executeJavaScript(`
              new Promise((resolve) => {
                let attempts = 0;
                const checkForData = () => {
                  // Check for window.TOJI_AUTH_DATA first
                  if (window.TOJI_AUTH_DATA) {
                    resolve(window.TOJI_AUTH_DATA);
                  } 
                  // Fallback to localStorage
                  else if (localStorage.getItem('toji-auth')) {
                    try {
                      resolve(JSON.parse(localStorage.getItem('toji-auth')));
                    } catch (e) {
                      // Keep error logging as it's important for debugging
                      console.error('Failed to parse localStorage data:', e);
                    }
                  }
                  // Keep trying for 5 seconds (50 attempts * 100ms)
                  else if (++attempts > 50) {
                    resolve(null);
                  } 
                  // Try again in 100ms
                  else {
                    setTimeout(checkForData, 100);
                  }
                };
                checkForData();
              })
            `);
            
            if (authData && authData.access_token) {
              // Add timestamp for expiry tracking
              authData.timestamp = Date.now();
              
              // Save auth data
              this.saveAuthData(authData);
              
              // Close auth window
              if (this.authWindow) {
                this.authWindow.close();
                this.authWindow = null;
              }
              
              resolve();
            } else {
              throw new Error('No auth data found on success page');
            }
          } catch (error) {
            console.error('Failed to extract auth data:', error);
            reject(error);
          }
        }
      });

      // Handle window closed
      this.authWindow.on('closed', () => {
        this.authWindow = null;
        // If we get here without resolving, user closed the window
        reject(new Error('Authentication cancelled by user'));
      });
    });
  }

  /**
   * Logout and clear auth data
   */
  logout(): void {
    this.authData = null;
    try {
      if (fs.existsSync(AUTH_FILE)) {
        fs.unlinkSync(AUTH_FILE);
      }
    } catch (error) {
      console.error('Failed to delete auth file:', error);
    }
  }

  /**
   * Get current user info
   */
  getUser(): UserInfo | null {
    return this.authData?.user || null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    if (!this.authData) return false;
    
    // Check if token is expired (if we have expiry info)
    if (this.authData.expires_in && this.authData.timestamp) {
      const expiryTime = this.authData.timestamp + (this.authData.expires_in * 1000);
      if (Date.now() > expiryTime) {
        // Token expired - will return false
        return false;
      }
    }
    
    return true;
  }

  /**
   * Get access token (for future API calls if needed)
   */
  getAccessToken(): string | null {
    return this.authData?.access_token || null;
  }
}

// Export singleton instance
export const authManager = new AuthManager();