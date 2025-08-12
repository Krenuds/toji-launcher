/**
 * Abstract platform service for handling OS-specific operations
 * 
 * This interface defines the contract that all platform implementations must follow.
 * Each platform (Linux, Windows, macOS) will have its own implementation.
 */

export interface OSInfo {
  supported: boolean;
  platform: string;
  version: string;
  details: string;
}

export interface SystemCapabilities {
  hasPackageManager: boolean;
  hasPrivilegeEscalation: boolean;
  canInstallSystemPackages: boolean;
  packageManagerName?: string;
  elevationMethod?: string;
}

export interface InstallProgress {
  step: string;
  progress: number;
  currentCommand?: string;
  details?: string;
  error?: string;
  canViewDetails?: boolean;
  logOutput?: string[];
}

export abstract class PlatformService {
  protected onProgressCallback?: (progress: InstallProgress) => void;

  /**
   * Set callback for progress updates during installation
   */
  onProgress(callback: (progress: InstallProgress) => void): void {
    this.onProgressCallback = callback;
  }

  /**
   * Get information about the current operating system
   */
  abstract getOSInfo(): Promise<OSInfo>;

  /**
   * Check what system capabilities are available (package managers, privilege escalation, etc.)
   */
  abstract checkSystemCapabilities(): Promise<SystemCapabilities>;

  /**
   * Get the appropriate application data directory for this platform
   */
  abstract getAppDataPath(): string;

  /**
   * Check if Node.js is installed and meets requirements
   */
  abstract checkNodeJS(): Promise<{ found: boolean; version?: string; details?: string }>;

  /**
   * Check if Claude Code CLI is installed
   */
  abstract checkClaudeCode(): Promise<{ found: boolean; version?: string; details?: string }>;

  /**
   * Install Node.js using platform-appropriate methods
   */
  abstract installNodeJS(): Promise<void>;

  /**
   * Install Claude Code CLI using platform-appropriate methods
   */
  abstract installClaudeCode(): Promise<void>;

  /**
   * Install all missing dependencies in a single operation
   * This should minimize password prompts by batching operations
   */
  abstract installAllDependencies(missingDeps: string[]): Promise<void>;

  /**
   * Run a command with elevated privileges using platform-appropriate method
   * (pkexec on Linux, UAC on Windows, osascript on macOS)
   */
  abstract runElevatedCommand(command: string, description: string): Promise<void>;

  /**
   * Download a file from URL to destination path
   * This is platform-agnostic but included for completeness
   */
  abstract downloadFile(url: string, destination: string): Promise<void>;
}

/**
 * Factory function to get the appropriate platform service for the current OS
 */
export function getPlatformService(): PlatformService {
  switch (process.platform) {
    case 'linux':
      return new (require('./linux-platform-service').LinuxPlatformService)();
    case 'win32':
      return new (require('./windows-platform-service').WindowsPlatformService)();
    case 'darwin':
      return new (require('./macos-platform-service').MacOSPlatformService)();
    default:
      throw new Error(`Unsupported platform: ${process.platform}. Supported platforms: linux, win32, darwin`);
  }
}