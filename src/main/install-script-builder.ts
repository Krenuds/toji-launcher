import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface InstallCommand {
  command: string;
  description: string;
  requiresSudo: boolean;
}

export class InstallScriptBuilder {
  private commands: InstallCommand[] = [];
  
  /**
   * Add a command to the installation script
   */
  addCommand(command: string, description: string, requiresSudo: boolean = false): void {
    this.commands.push({ command, description, requiresSudo });
  }
  
  /**
   * Build a shell script that runs all commands
   * Commands that need sudo are grouped together
   */
  buildScript(): string {
    const script: string[] = [];
    
    // Script header
    script.push('#!/bin/bash');
    script.push('set -e'); // Exit on error
    script.push('');
    script.push('# Toji Launcher Installation Script');
    script.push('# Generated at ' + new Date().toISOString());
    script.push('');
    
    // Progress function
    script.push('progress() {');
    script.push('  echo "PROGRESS:$1:$2"');
    script.push('}');
    script.push('');
    
    // Group commands by sudo requirement
    const regularCommands = this.commands.filter(cmd => !cmd.requiresSudo);
    const sudoCommands = this.commands.filter(cmd => cmd.requiresSudo);
    
    // Add regular commands first
    if (regularCommands.length > 0) {
      script.push('# Commands that do not require sudo');
      regularCommands.forEach((cmd, index) => {
        script.push(`progress ${index * 10} "${cmd.description}"`);
        script.push(`echo ">>> ${cmd.description}"`);
        script.push(cmd.command);
        script.push('');
      });
    }
    
    // Add sudo commands
    if (sudoCommands.length > 0) {
      script.push('# Commands that require sudo');
      script.push('echo "The following operations require administrator privileges:"');
      sudoCommands.forEach(cmd => {
        script.push(`echo "  - ${cmd.description}"`);
      });
      script.push('');
      
      // Create a temporary script for sudo commands
      script.push('# Create temporary sudo script');
      script.push('SUDO_SCRIPT=$(mktemp /tmp/toji-sudo-XXXXXX.sh)');
      script.push('cat > "$SUDO_SCRIPT" << \'EOF\'');
      script.push('#!/bin/bash');
      script.push('set -e');
      sudoCommands.forEach((cmd, index) => {
        const progress = 50 + (index * 10);
        script.push(`echo "PROGRESS:${progress}:${cmd.description}"`);
        script.push(`echo ">>> ${cmd.description}"`);
        script.push(cmd.command);
        script.push('');
      });
      script.push('EOF');
      script.push('');
      script.push('# Run with pkexec for GUI password prompt');
      script.push('pkexec bash "$SUDO_SCRIPT"');
      script.push('rm -f "$SUDO_SCRIPT"');
    }
    
    script.push('');
    script.push('progress 100 "Installation complete"');
    script.push('echo "✓ All installations completed successfully"');
    
    return script.join('\n');
  }
  
  /**
   * Save the script to a temporary file
   */
  async saveToFile(): Promise<string> {
    const tmpDir = os.tmpdir();
    const scriptPath = path.join(tmpDir, `toji-install-${Date.now()}.sh`);
    const scriptContent = this.buildScript();
    
    await fs.promises.writeFile(scriptPath, scriptContent, { mode: 0o755 });
    return scriptPath;
  }
}