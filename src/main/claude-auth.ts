import { BrowserWindow, ipcMain } from 'electron';
import { spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(require('child_process').exec);

/**
 * Claude Authentication Manager
 * 
 * Handles Claude Code CLI authentication using the browser-based login flow.
 * This is cross-platform since `claude login --browser` works the same on all OS.
 */
export class ClaudeAuthManager {
  private authWindow: BrowserWindow | null = null;
  private mainWindow: BrowserWindow;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.setupIpcHandlers();
  }

  private setupIpcHandlers(): void {
    // Check if Claude is authenticated
    ipcMain.handle('claude:check-auth', async () => {
      return await this.checkAuthentication();
    });

    // Start Claude authentication
    ipcMain.handle('claude:start-auth', async () => {
      return await this.startAuthentication();
    });
  }

  /**
   * Check if Claude Code CLI is authenticated
   */
  async checkAuthentication(): Promise<{ authenticated: boolean; details?: string }> {
    try {
      // First check if Claude is installed
      try {
        await execAsync('claude --version', { timeout: 5000 });
      } catch {
        // Claude is not installed
        return {
          authenticated: false,
          details: 'Claude Code CLI is not installed'
        };
      }

      // Now check if Claude is authenticated by trying to use it
      // This tests if Claude can actually respond (requires authentication)
      // Using a simple command with empty stdin to prevent hanging
      try {
        const { stdout } = await execAsync('echo "" | claude -p "say yes" --print', {
          timeout: 30000,  // 30 second timeout (should be enough for a simple response)
          shell: true
        });
        
        // If we got a response, Claude is authenticated
        if (stdout && stdout.length > 0) {
          return {
            authenticated: true,
            details: 'Claude Code CLI is authenticated and working'
          };
        } else {
          // No response, likely not authenticated
          return {
            authenticated: false,
            details: 'Claude Code CLI is installed but not authenticated'
          };
        }
      } catch (error) {
        // Command failed, likely not authenticated
        const errorMessage = (error as any).message || '';
        
        // Check for specific error patterns
        if (errorMessage.includes('login') || errorMessage.includes('auth')) {
          return {
            authenticated: false,
            details: 'Claude Code CLI requires authentication - please log in'
          };
        }
        
        // Generic not authenticated
        return {
          authenticated: false,
          details: 'Claude Code CLI is installed but not authenticated'
        };
      }
    } catch (error) {
      // Unexpected error
      return {
        authenticated: false,
        details: `Error checking Claude authentication: ${(error as Error).message}`
      };
    }
  }

  /**
   * Start Claude authentication using browser flow
   */
  async startAuthentication(): Promise<{ success: boolean; error?: string }> {
    try {
      // First check if Claude is installed
      try {
        await execAsync('claude --version');
      } catch {
        return {
          success: false,
          error: 'Claude Code CLI is not installed. Please install it first.'
        };
      }

      // Start the authentication process
      // This will open the default browser automatically
      const authProcess = spawn('claude', ['login', '--browser'], {
        shell: true,
        detached: false
      });

      return new Promise((resolve) => {
        let output = '';
        let errorOutput = '';

        authProcess.stdout.on('data', (data) => {
          output += data.toString();
          console.log('Claude auth output:', data.toString());
          
          // Send progress updates to renderer
          this.mainWindow.webContents.send('claude:auth-progress', {
            message: data.toString()
          });
        });

        authProcess.stderr.on('data', (data) => {
          errorOutput += data.toString();
          console.error('Claude auth error:', data.toString());
        });

        authProcess.on('close', async (code) => {
          if (code === 0) {
            // Authentication succeeded
            const authStatus = await this.checkAuthentication();
            resolve({
              success: authStatus.authenticated
            });
          } else {
            // Authentication failed
            resolve({
              success: false,
              error: errorOutput || 'Authentication failed'
            });
          }
        });

        authProcess.on('error', (err) => {
          resolve({
            success: false,
            error: `Failed to start authentication: ${err.message}`
          });
        });
      });
    } catch (error) {
      return {
        success: false,
        error: `Authentication error: ${(error as Error).message}`
      };
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.authWindow && !this.authWindow.isDestroyed()) {
      this.authWindow.close();
      this.authWindow = null;
    }
  }
}