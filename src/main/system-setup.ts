import { ipcMain, BrowserWindow } from 'electron';
import { getPlatformService, PlatformService } from './platform/platform-service';
import { ClaudeAuthManager } from './claude-auth';

export interface SystemRequirement {
  name: string;
  status: 'checking' | 'found' | 'missing' | 'error' | 'skipped';
  version?: string;
  details?: string;
  required: boolean;
}

export interface InstallationPlan {
  items: Array<{
    name: string;
    method: 'apt' | 'npm' | 'download' | 'manual';
    size: string;
    estimatedTime: string;
    description: string;
  }>;
  totalTime: string;
  requiresSudo: boolean;
  canAutoInstall: boolean;
}

export interface InstallProgress {
  step: string;
  progress: number; // 0-100
  currentCommand?: string;
  details?: string;
  error?: string;
  canViewDetails?: boolean;
  logOutput?: string[];
}

export class SystemSetup {
  private platformService: PlatformService;
  private claudeAuthManager: ClaudeAuthManager;
  private mainWindow: BrowserWindow;
  private installationAttempted: boolean = false;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.platformService = getPlatformService();
    this.claudeAuthManager = new ClaudeAuthManager(mainWindow);
    this.setupIpcHandlers();
  }

  private setupIpcHandlers(): void {
    // Check system requirements
    ipcMain.handle('system-setup:check-requirements', async () => {
      return await this.checkAllRequirements();
    });

    // Get installation plan
    ipcMain.handle('system-setup:get-installation-plan', async (_, missingRequirements: SystemRequirement[]) => {
      return await this.createInstallationPlan(missingRequirements);
    });

    // Start installation process
    ipcMain.handle('system-setup:start-installation', async (_, plan: InstallationPlan) => {
      return await this.executeInstallationPlan(plan);
    });

    // Get current installation progress
    ipcMain.handle('system-setup:get-progress', () => {
      // getCurrentProgress method doesn't exist anymore, return null
      return null;
    });
  }

  private async checkAllRequirements(): Promise<SystemRequirement[]> {
    const requirements: SystemRequirement[] = [
      {
        name: 'Operating System',
        status: 'checking',
        required: true
      },
      {
        name: 'Node.js',
        status: 'checking',
        required: true
      },
      {
        name: 'Claude Code CLI',
        status: 'checking',
        required: true
      },
      {
        name: 'Claude Authentication',
        status: 'checking',
        required: true  // REQUIRED for legal compliance - users must accept ToS
      }
    ];

    // Send initial status to renderer
    this.mainWindow.webContents.send('system-setup:requirements-update', requirements);

    // Check each requirement
    for (let i = 0; i < requirements.length; i++) {
      const req = requirements[i];
      
      try {
        switch (req.name) {
          case 'Operating System':
            const osInfo = await this.platformService.getOSInfo();
            req.status = osInfo.supported ? 'found' : 'error';
            req.version = osInfo.version;
            req.details = osInfo.details;
            break;

          case 'Node.js':
            const nodeInfo = await this.platformService.checkNodeJS();
            req.status = nodeInfo.found ? 'found' : 'missing';
            req.version = nodeInfo.version;
            req.details = nodeInfo.details;
            break;

          case 'Claude Code CLI':
            const claudeInfo = await this.platformService.checkClaudeCode();
            req.status = claudeInfo.found ? 'found' : 'missing';
            req.version = claudeInfo.version;
            req.details = claudeInfo.details;
            break;

          case 'Claude Authentication':
            // Only check auth if Claude CLI is installed
            const claudeReq = requirements.find(r => r.name === 'Claude Code CLI');
            if (claudeReq?.status !== 'found') {
              req.status = 'skipped';
              req.details = 'Skipped - Claude Code CLI not installed';
            } else {
              // Update UI to show we're actively checking (this can take time)
              req.details = 'Verifying Claude authentication (this may take up to 30 seconds)...';
              this.mainWindow.webContents.send('system-setup:requirements-update', [...requirements]);
              
              const authInfo = await this.claudeAuthManager.checkAuthentication();
              req.status = authInfo.authenticated ? 'found' : 'missing';
              req.details = authInfo.details;
            }
            break;
        }
      } catch (error) {
        req.status = 'error';
        req.details = `Check failed: ${(error as Error).message}`;
      }

      // Update UI with current progress
      this.mainWindow.webContents.send('system-setup:requirements-update', [...requirements]);
      
      // Small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return requirements;
  }

  private async createInstallationPlan(missingRequirements: SystemRequirement[]): Promise<InstallationPlan> {
    const items = [];
    let requiresSudo = false;
    let totalTimeMinutes = 0;

    for (const req of missingRequirements.filter(r => r.status === 'missing')) {
      switch (req.name) {
        case 'Node.js':
          items.push({
            name: 'Node.js',
            method: 'apt' as const,
            size: '~15MB',
            estimatedTime: '2-3 minutes',
            description: 'JavaScript runtime required for Claude Code CLI'
          });
          requiresSudo = true;
          totalTimeMinutes += 3;
          break;

        case 'Claude Code CLI':
          items.push({
            name: 'Claude Code CLI',
            method: 'npm' as const,
            size: '~5MB',
            estimatedTime: '1-2 minutes',
            description: 'Anthropic\'s command-line interface for Claude'
          });
          totalTimeMinutes += 2;
          break;
      }
    }

    return {
      items,
      totalTime: `${totalTimeMinutes}-${totalTimeMinutes + 2} minutes`,
      requiresSudo,
      canAutoInstall: items.length > 0
    };
  }

  private async executeInstallationPlan(plan: InstallationPlan): Promise<boolean> {
    this.platformService.onProgress((progress: InstallProgress) => {
      this.mainWindow.webContents.send('system-setup:installation-progress', progress);
    });

    try {
      // Collect all missing dependencies
      const missingDeps = plan.items.map(item => item.name);
      
      // Install everything in one go (single password prompt)
      await this.platformService.installAllDependencies(missingDeps);

      // Mark installation as complete
      this.installationAttempted = true;

      // Final verification (will check REAL system state, not simulated)
      const finalCheck = await this.checkAllRequirements();
      const allInstalled = finalCheck.every(req => 
        req.status === 'found' || 
        req.status === 'skipped' || 
        !req.required
      );

      this.mainWindow.webContents.send('system-setup:installation-complete', {
        success: allInstalled,
        requirements: finalCheck
      });

      return allInstalled;
    } catch (error) {
      this.mainWindow.webContents.send('system-setup:installation-error', {
        error: (error as Error).message,
        canRetry: true
      });
      return false;
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.claudeAuthManager.cleanup();
  }
}