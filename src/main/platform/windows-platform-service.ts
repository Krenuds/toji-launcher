import { PlatformService, OSInfo, SystemCapabilities, InstallProgress } from './platform-service';

/**
 * Windows-specific platform service implementation
 * 
 * TODO: This is a placeholder implementation for Phase 2
 * Will implement Windows-specific operations like:
 * - MSI installer downloads and execution
 * - UAC elevation for privilege escalation
 * - Windows registry detection
 * - winget or manual package management
 */
export class WindowsPlatformService extends PlatformService {

  async getOSInfo(): Promise<OSInfo> {
    return {
      supported: false,
      platform: 'win32',
      version: 'unknown',
      details: 'Windows support not yet implemented (coming in Phase 2)'
    };
  }

  async checkSystemCapabilities(): Promise<SystemCapabilities> {
    return {
      hasPackageManager: false,
      hasPrivilegeEscalation: false,
      canInstallSystemPackages: false
    };
  }

  getAppDataPath(): string {
    // Windows convention: use AppData\Roaming\Toji Launcher
    return process.env.APPDATA + '\\Toji Launcher' || 'C:\\Users\\Default\\AppData\\Roaming\\Toji Launcher';
  }

  async checkNodeJS(): Promise<{ found: boolean; version?: string; details?: string }> {
    // TODO: Implement Windows Node.js detection
    // 1. Check if 'node' command exists in PATH
    // 2. Run 'node --version' to get version
    // 3. Verify version is >= 14 for Claude Code compatibility
    return {
      found: false,
      details: 'Windows Node.js detection not yet implemented'
    };
  }

  async checkClaudeCode(): Promise<{ found: boolean; version?: string; details?: string }> {
    // TODO: Implement Windows Claude Code detection
    // 1. Check if 'claude' command exists in PATH
    // 2. Run 'claude --version' to get version
    // 3. Note: Claude CLI now has native Windows PowerShell support
    return {
      found: false,
      details: 'Windows Claude Code detection not yet implemented'
    };
  }

  async installNodeJS(): Promise<void> {
    // TODO: Implement Windows Node.js installation
    // 1. Download Node.js MSI installer from https://nodejs.org/dist/latest-v20.x/
    //    - Choose x64 MSI for 64-bit systems
    //    - Size: ~30MB download
    // 2. Use UAC elevation to run: msiexec /i node-installer.msi /quiet
    // 3. Verify installation by checking registry or running 'node --version'
    // 4. Add Node.js to PATH if not already present
    // Alternative: Use winget if available: winget install OpenJS.NodeJS
    throw new Error('Windows Node.js installation not yet implemented');
  }

  async installClaudeCode(): Promise<void> {
    // TODO: Implement Windows Claude Code installation
    // 1. Ensure Node.js/npm is installed first
    // 2. Run: npm install -g @anthropic-ai/claude-code
    // 3. Note: Claude CLI now has native Windows PowerShell support (no WSL needed)
    // 4. Verify installation: claude --version
    throw new Error('Windows Claude Code installation not yet implemented');
  }

  async installAllDependencies(missingDeps: string[]): Promise<void> {
    // TODO: Implement batch Windows dependency installation
    // 1. Check for admin privileges (required for MSI installation)
    // 2. If Node.js missing:
    //    - Download and install via MSI or winget
    // 3. If Claude Code missing:
    //    - Install via npm after Node.js
    // 4. Use single UAC prompt for all operations
    throw new Error('Windows dependency installation not yet implemented');
  }

  async runElevatedCommand(command: string, description: string): Promise<void> {
    // TODO: Implement Windows UAC elevation
    // 1. Use Electron's built-in shell.openExternal with 'runas' verb
    // 2. Alternative: Create a PowerShell script and run with Start-Process -Verb RunAs
    // 3. For MSI: msiexec automatically prompts for UAC when needed
    // 4. Consider using windows-elevate npm package for simpler implementation
    throw new Error('Windows privilege escalation not yet implemented');
  }

  async downloadFile(url: string, destination: string): Promise<void> {
    // TODO: Implement Windows file download
    // 1. Use Node.js https module (cross-platform)
    // 2. Alternative: Use PowerShell's Invoke-WebRequest
    // 3. Show progress updates during download
    // 4. Verify file integrity after download
    throw new Error('Windows file download not yet implemented');
  }
}