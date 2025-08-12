import { spawn } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as https from 'https';
import * as fs from 'fs';
import * as os from 'os';
import { PlatformService, OSInfo, SystemCapabilities, InstallProgress } from './platform-service';
import { InstallScriptBuilder } from '../install-script-builder';

const execAsync = promisify(require('child_process').exec);

/**
 * Linux-specific platform service implementation
 * 
 * This class handles all Linux-specific operations including:
 * - APT package management
 * - pkexec/sudo privilege escalation
 * - Linux distribution detection
 * - Debian/Ubuntu-specific installation paths
 */
export class LinuxPlatformService extends PlatformService {
  private currentProgress?: InstallProgress;

  private updateProgress(update: Partial<InstallProgress>): void {
    this.currentProgress = { ...this.currentProgress, ...update } as InstallProgress;
    if (this.onProgressCallback) {
      this.onProgressCallback(this.currentProgress);
    }
  }

  async getOSInfo(): Promise<OSInfo> {
    const platform = os.platform();
    const release = os.release();
    
    if (platform !== 'linux') {
      return {
        supported: false,
        platform,
        version: release,
        details: `Expected Linux platform, got ${platform}`
      };
    }

    try {
      // Try to get Linux distribution info
      let distroInfo = 'Linux';
      
      try {
        // Check /etc/os-release for distribution info
        if (fs.existsSync('/etc/os-release')) {
          const osRelease = fs.readFileSync('/etc/os-release', 'utf8');
          const nameMatch = osRelease.match(/PRETTY_NAME="([^"]+)"/);
          if (nameMatch) {
            distroInfo = nameMatch[1];
          }
        }
      } catch (error) {
        // Could not read distribution info, use generic 'Linux'
      }

      return {
        supported: true,
        platform: 'linux',
        version: release,
        details: `${distroInfo} (${release})`
      };
    } catch (error) {
      return {
        supported: false,
        platform: platform || 'unknown',
        version: 'unknown',
        details: `Could not detect Linux system: ${(error as Error).message}`
      };
    }
  }

  async checkSystemCapabilities(): Promise<SystemCapabilities> {
    const capabilities: SystemCapabilities = {
      hasPackageManager: false,
      hasPrivilegeEscalation: false,
      canInstallSystemPackages: false
    };

    try {
      // Check for apt (Debian/Ubuntu package manager)
      await execAsync('which apt');
      capabilities.hasPackageManager = true;
      capabilities.packageManagerName = 'apt';
    } catch {
      // apt not available - could check for yum, dnf, etc. in the future
    }

    try {
      // Check for pkexec (GUI privilege escalation - preferred)
      await execAsync('which pkexec');
      capabilities.hasPrivilegeEscalation = true;
      capabilities.elevationMethod = 'pkexec';
    } catch {
      try {
        // Fallback to sudo (command line privilege escalation)
        await execAsync('which sudo');
        capabilities.hasPrivilegeEscalation = true;
        capabilities.elevationMethod = 'sudo';
      } catch {
        // No privilege escalation available
      }
    }

    // Can install system packages if we have both package manager and privilege escalation
    capabilities.canInstallSystemPackages = capabilities.hasPackageManager && capabilities.hasPrivilegeEscalation;

    return capabilities;
  }

  getAppDataPath(): string {
    // Linux convention: use ~/.toji-launcher for application data
    return path.join(os.homedir(), '.toji-launcher');
  }

  async checkNodeJS(): Promise<{ found: boolean; version?: string; details?: string }> {
    try {
      const { stdout: versionOutput } = await execAsync('node --version');
      const version = versionOutput.trim();
      
      // Check if version is acceptable (v14+ recommended for Claude Code)
      const versionNumber = parseInt(version.substring(1).split('.')[0]);
      const isAcceptableVersion = versionNumber >= 14;
      
      if (!isAcceptableVersion) {
        return {
          found: false,
          version,
          details: `Found Node.js ${version} but v14+ is required`
        };
      }
      
      return {
        found: true,
        version,
        details: `Node.js ${version} is installed`
      };
    } catch (error) {
      return {
        found: false,
        details: 'Node.js is not installed'
      };
    }
  }

  async checkClaudeCode(): Promise<{ found: boolean; version?: string; details?: string }> {
    try {
      const { stdout: versionOutput } = await execAsync('claude --version');
      const version = versionOutput.trim();
      
      return {
        found: true,
        version,
        details: `Claude Code CLI ${version} is installed`
      };
    } catch (error) {
      return {
        found: false,
        details: 'Claude Code CLI is not installed'
      };
    }
  }

  async installAllDependencies(missingDeps: string[]): Promise<void> {
    this.updateProgress({
      step: 'Preparing installation',
      progress: 0,
      details: 'Building installation script...',
      logOutput: []
    });

    const builder = new InstallScriptBuilder();
    
    // Add all required commands based on what's missing
    if (missingDeps.includes('Node.js')) {
      // Try apt-get approach (most common on Ubuntu/Debian)
      builder.addCommand('apt-get update', 'Updating package list', true);
      builder.addCommand('apt-get install -y nodejs npm', 'Installing Node.js and npm', true);
    }
    
    if (missingDeps.includes('Claude Code CLI')) {
      // Install Claude Code after Node.js
      builder.addCommand(
        'npm install -g @anthropic-ai/claude-code',
        'Installing Claude Code CLI',
        true
      );
    }
    
    // Build and run the combined script
    const scriptPath = await builder.saveToFile();
    
    try {
      await this.runInstallScript(scriptPath, 'Installing all dependencies');
      
      // Verify installations
      if (missingDeps.includes('Node.js')) {
        try {
          await execAsync('node --version');
        } catch {
          throw new Error('Node.js installation verification failed');
        }
      }
      
      if (missingDeps.includes('Claude Code CLI')) {
        try {
          await execAsync('claude --version');
        } catch {
          throw new Error('Claude Code CLI installation verification failed');
        }
      }
      
      this.updateProgress({
        step: 'Installation complete',
        progress: 100,
        details: 'All dependencies installed successfully'
      });
    } finally {
      // Cleanup
      await fs.promises.unlink(scriptPath);
    }
  }

  async installNodeJS(): Promise<void> {
    this.updateProgress({
      step: 'Installing Node.js',
      progress: 0,
      details: 'Preparing Node.js installation...',
      logOutput: []
    });

    try {
      // Try apt-get first
      await this.installNodeJSWithApt();
    } catch (aptError) {
      // apt-get failed, trying NodeSource
      try {
        await this.installNodeJSWithNodeSource();
      } catch (nodeSourceError) {
        // NodeSource failed, trying portable
        await this.installPortableNodeJS();
      }
    }
  }

  private async installNodeJSWithApt(): Promise<void> {
    const builder = new InstallScriptBuilder();
    
    // Update package list and install Node.js
    builder.addCommand('apt-get update', 'Updating package list', true);
    builder.addCommand('apt-get install -y nodejs npm', 'Installing Node.js and npm via apt', true);
    
    const scriptPath = await builder.saveToFile();
    await this.runInstallScript(scriptPath, 'Installing Node.js via apt-get');
    
    // Cleanup
    await fs.promises.unlink(scriptPath);
  }

  private async installNodeJSWithNodeSource(): Promise<void> {
    const builder = new InstallScriptBuilder();
    
    // NodeSource installation script
    builder.addCommand(
      'curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -',
      'Adding NodeSource repository',
      true
    );
    builder.addCommand('apt-get install -y nodejs', 'Installing Node.js from NodeSource', true);
    
    const scriptPath = await builder.saveToFile();
    await this.runInstallScript(scriptPath, 'Installing Node.js via NodeSource');
    
    // Cleanup
    await fs.promises.unlink(scriptPath);
  }

  private async installPortableNodeJS(): Promise<void> {
    const appDataPath = this.getAppDataPath();
    const nodePath = path.join(appDataPath, 'node');
    
    this.updateProgress({
      step: 'Downloading portable Node.js',
      progress: 30,
      currentCommand: 'Downloading Node.js LTS...'
    });

    // Create app data directory
    await fs.promises.mkdir(appDataPath, { recursive: true });

    // Download Node.js binary
    const nodeVersion = 'v20.11.0'; // LTS version as of Jan 2024
    const platform = 'linux'; // We know we're on Linux
    const arch = process.arch;
    const nodeUrl = `https://nodejs.org/dist/${nodeVersion}/node-${nodeVersion}-${platform}-${arch}.tar.gz`;

    const tarPath = path.join(appDataPath, 'node.tar.gz');
    
    // Download the tar file
    await this.downloadFile(nodeUrl, tarPath);

    this.updateProgress({
      step: 'Extracting Node.js',
      progress: 60
    });

    // Extract the tar file
    await execAsync(`tar -xzf ${tarPath} -C ${appDataPath}`);
    
    // Move to simpler path
    const extractedDir = path.join(appDataPath, `node-${nodeVersion}-${platform}-${arch}`);
    if (fs.existsSync(nodePath)) {
      await fs.promises.rm(nodePath, { recursive: true });
    }
    await fs.promises.rename(extractedDir, nodePath);

    // Add to PATH for this process
    const binPath = path.join(nodePath, 'bin');
    process.env.PATH = `${binPath}:${process.env.PATH}`;

    this.updateProgress({
      step: 'Node.js installation complete',
      progress: 100,
      details: `Installed portable Node.js to ${nodePath}`
    });

    // Clean up tar file
    await fs.promises.unlink(tarPath);
  }

  async installClaudeCode(): Promise<void> {
    this.updateProgress({
      step: 'Installing Claude CLI',
      progress: 0,
      details: 'Preparing Claude CLI installation...',
      logOutput: []
    });

    try {
      // First try to install without sudo (if npm is configured for user installs)
      await this.runCommand('npm install -g @anthropic-ai/claude-code', 'Installing Claude Code CLI');
      
      // Verify installation
      await execAsync('claude --version');
      
      this.updateProgress({
        step: 'Claude Code CLI installation complete',
        progress: 100
      });
    } catch (error) {
      // If that fails, try with sudo
      const builder = new InstallScriptBuilder();
      builder.addCommand(
        'npm install -g @anthropic-ai/claude-code',
        'Installing Claude Code CLI globally',
        true
      );
      
      const scriptPath = await builder.saveToFile();
      
      try {
        await this.runInstallScript(scriptPath, 'Installing Claude Code CLI with sudo');
        
        // Verify installation
        await execAsync('claude --version');
        
        this.updateProgress({
          step: 'Claude Code CLI installation complete',
          progress: 100
        });
      } finally {
        // Cleanup
        await fs.promises.unlink(scriptPath);
      }
    }
  }

  async runElevatedCommand(command: string, description: string): Promise<void> {
    const capabilities = await this.checkSystemCapabilities();
    
    if (!capabilities.hasPrivilegeEscalation) {
      throw new Error('No privilege escalation method available (pkexec or sudo required)');
    }

    const elevatedCommand = capabilities.elevationMethod === 'pkexec' 
      ? `pkexec ${command}`
      : `sudo ${command}`;
    
    await this.runCommand(elevatedCommand, description);
  }

  async downloadFile(url: string, destination: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(destination);
      
      https.get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // Handle redirect
          file.close();
          this.downloadFile(response.headers.location!, destination)
            .then(resolve)
            .catch(reject);
          return;
        }

        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }).on('error', (err) => {
        fs.unlink(destination, () => {}); // Delete partial file
        reject(err);
      });
    });
  }

  /**
   * Run a single command and track progress
   */
  private async runCommand(command: string, description: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const logOutput = this.currentProgress?.logOutput || [];
      logOutput.push(`> ${command}`);
      this.updateProgress({ logOutput: [...logOutput] });

      const child = spawn('sh', ['-c', command]);
      let stderr = '';

      child.stdout?.on('data', (data) => {
        const text = data.toString();
        if (text.trim()) {
          logOutput.push(text.trim());
          this.updateProgress({ logOutput: [...logOutput] });
        }
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          logOutput.push(`✓ ${description} completed`);
          this.updateProgress({ logOutput: [...logOutput] });
          resolve();
        } else {
          logOutput.push(`✗ ${description} failed with code ${code}`);
          this.updateProgress({ logOutput: [...logOutput] });
          reject(new Error(`Command failed: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        logOutput.push(`✗ ${description} error: ${error.message}`);
        this.updateProgress({ logOutput: [...logOutput] });
        reject(error);
      });
    });
  }

  /**
   * Run an installation script with sudo/pkexec (single password prompt)
   */
  private async runInstallScript(scriptPath: string, description: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const logOutput = this.currentProgress?.logOutput || [];
      
      this.updateProgress({
        currentCommand: description,
        logOutput: [...logOutput, `>>> ${description}`]
      });

      // Run the script normally - it will handle sudo/pkexec internally
      const child = spawn('bash', [scriptPath]);
      let stderr = '';

      child.stdout?.on('data', (data) => {
        const text = data.toString();
        
        // Parse progress messages
        const progressMatch = text.match(/PROGRESS:(\d+):(.+)/);
        if (progressMatch) {
          const progress = parseInt(progressMatch[1]);
          const step = progressMatch[2];
          this.updateProgress({
            progress,
            currentCommand: step
          });
        }
        
        // Add to log output
        const lines = text.split('\n').filter((line: string) => line.trim());
        lines.forEach((line: string) => {
          if (!line.startsWith('PROGRESS:')) {
            logOutput.push(line);
            this.updateProgress({ logOutput: [...logOutput] });
          }
        });
      });

      child.stderr?.on('data', (data) => {
        const text = data.toString();
        stderr += text;
        
        // Also show stderr in logs (might contain useful info)
        if (text.trim() && !text.includes('[sudo]')) {
          logOutput.push(`stderr: ${text.trim()}`);
          this.updateProgress({ logOutput: [...logOutput] });
        }
      });

      child.on('close', (code) => {
        if (code === 0) {
          logOutput.push(`✓ ${description} completed successfully`);
          this.updateProgress({ logOutput: [...logOutput] });
          resolve();
        } else {
          const error = `Installation failed with code ${code}: ${stderr}`;
          logOutput.push(`✗ ${error}`);
          this.updateProgress({ 
            logOutput: [...logOutput],
            error 
          });
          reject(new Error(error));
        }
      });

      child.on('error', (error) => {
        logOutput.push(`✗ Script error: ${error.message}`);
        this.updateProgress({ 
          logOutput: [...logOutput],
          error: error.message 
        });
        reject(error);
      });
    });
  }
}