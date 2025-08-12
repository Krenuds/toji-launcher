import { BrowserWindow, ipcMain } from 'electron';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { promisify } from 'util';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream';
import * as tar from 'tar';

const pipelineAsync = promisify(pipeline);
const mkdirAsync = promisify(fs.mkdir);
const accessAsync = promisify(fs.access);

export interface DownloadProgress {
  stage: 'checking' | 'downloading' | 'extracting' | 'verifying' | 'complete' | 'error';
  progress: number; // 0-100
  totalBytes?: number;
  downloadedBytes?: number;
  message: string;
  error?: string;
}

export interface BotRelease {
  version: string;
  downloadUrl: string;
  size: number;
  checksum?: string;
}

export class BotDownloader {
  private mainWindow: BrowserWindow;
  private botDirectory: string;
  private currentDownload?: any;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.botDirectory = path.join(os.homedir(), '.toji', 'bot');
    this.setupIpcHandlers();
  }

  private setupIpcHandlers(): void {
    ipcMain.handle('bot:check-installed', async () => {
      return await this.checkBotInstalled();
    });

    ipcMain.handle('bot:download', async () => {
      return await this.downloadBot();
    });

    ipcMain.handle('bot:get-latest-release', async () => {
      return await this.getLatestRelease();
    });
  }

  private updateProgress(progress: DownloadProgress): void {
    this.mainWindow.webContents.send('bot:download-progress', progress);
  }

  async checkBotInstalled(): Promise<boolean> {
    try {
      // Check if bot directory exists and contains the executable
      const botExecutable = path.join(this.botDirectory, 'toji-bot');
      await accessAsync(botExecutable, fs.constants.X_OK);
      return true;
    } catch {
      return false;
    }
  }

  async getLatestRelease(): Promise<BotRelease> {
    // For development/testing, use local file
    const localBundlePath = path.join(__dirname, 'bot', 'toji-bot-linux-x64.tar.gz');
    
    // Check if local bundle exists
    try {
      const stats = fs.statSync(localBundlePath);
      console.log('Using local bot bundle for testing:', localBundlePath);
      return {
        version: 'v1.0.0-local',
        downloadUrl: `file://${localBundlePath}`,
        size: stats.size,
      };
    } catch (error) {
      console.log('Local bundle not found, using GitHub release');
    }
    
    // Production: Query GitHub releases API
    // const response = await fetch('https://api.github.com/repos/yourusername/toji/releases/latest');
    // const release = await response.json();
    // return {
    //   version: release.tag_name,
    //   downloadUrl: release.assets[0].browser_download_url,
    //   size: release.assets[0].size
    // };

    // Fallback for now
    return {
      version: 'v1.0.0',
      downloadUrl: 'https://github.com/yourusername/toji/releases/download/v1.0.0/toji-bot-linux.tar.gz',
      size: 14 * 1024 * 1024, // 14MB (actual size)
    };
  }

  async downloadBot(): Promise<boolean> {
    try {
      this.updateProgress({
        stage: 'checking',
        progress: 0,
        message: 'Checking for latest bot version...'
      });

      // Get latest release info
      const release = await this.getLatestRelease();

      // Create bot directory if it doesn't exist
      await mkdirAsync(this.botDirectory, { recursive: true });

      // Download the bot
      this.updateProgress({
        stage: 'downloading',
        progress: 0,
        totalBytes: release.size,
        downloadedBytes: 0,
        message: `Downloading bot ${release.version} (${Math.round(release.size / 1024 / 1024)}MB)...`
      });

      const downloadPath = path.join(os.tmpdir(), 'toji-bot-download.tar.gz');
      await this.downloadFile(release.downloadUrl, downloadPath, release.size);

      // Extract the bot
      this.updateProgress({
        stage: 'extracting',
        progress: 50,
        message: 'Extracting bot files...'
      });

      await this.extractArchive(downloadPath, this.botDirectory);

      // Clean up download
      fs.unlinkSync(downloadPath);

      // Verify installation
      this.updateProgress({
        stage: 'verifying',
        progress: 90,
        message: 'Verifying bot installation...'
      });

      const isInstalled = await this.checkBotInstalled();
      if (!isInstalled) {
        throw new Error('Bot verification failed - executable not found');
      }

      // Make executable
      const botExecutable = path.join(this.botDirectory, 'toji-bot');
      fs.chmodSync(botExecutable, 0o755);

      this.updateProgress({
        stage: 'complete',
        progress: 100,
        message: 'Bot installed successfully!'
      });

      return true;
    } catch (error) {
      this.updateProgress({
        stage: 'error',
        progress: 0,
        message: 'Bot download failed',
        error: (error as Error).message
      });
      return false;
    }
  }

  private async downloadFile(url: string, destination: string, totalSize: number): Promise<void> {
    // Handle local file URLs for testing
    if (url.startsWith('file://')) {
      const sourcePath = url.replace('file://', '');
      return new Promise((resolve, reject) => {
        const readStream = fs.createReadStream(sourcePath);
        const writeStream = fs.createWriteStream(destination);
        let downloadedBytes = 0;

        readStream.on('data', (chunk: any) => {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          downloadedBytes += buffer.length;
          const progress = Math.round((downloadedBytes / totalSize) * 100);
          
          this.updateProgress({
            stage: 'downloading',
            progress: Math.min(progress * 0.5, 50), // Cap at 50% for download phase
            totalBytes: totalSize,
            downloadedBytes,
            message: `Copying local bundle... ${Math.round(downloadedBytes / 1024 / 1024)}MB / ${Math.round(totalSize / 1024 / 1024)}MB`
          });
        });

        readStream.pipe(writeStream);

        writeStream.on('finish', () => {
          writeStream.close();
          resolve();
        });

        readStream.on('error', reject);
        writeStream.on('error', reject);
      });
    }

    // Handle HTTP/HTTPS downloads
    return new Promise((resolve, reject) => {
      const file = createWriteStream(destination);
      let downloadedBytes = 0;

      const request = https.get(url, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            https.get(redirectUrl, (redirectResponse) => {
              this.handleDownloadResponse(redirectResponse, file, totalSize, resolve, reject);
            });
          } else {
            reject(new Error('Redirect without location header'));
          }
        } else if (response.statusCode === 200) {
          this.handleDownloadResponse(response, file, totalSize, resolve, reject);
        } else {
          reject(new Error(`Download failed with status ${response.statusCode}`));
        }
      });

      request.on('error', (error) => {
        fs.unlinkSync(destination);
        reject(error);
      });

      this.currentDownload = request;
    });
  }

  private handleDownloadResponse(
    response: any,
    file: fs.WriteStream,
    totalSize: number,
    resolve: Function,
    reject: Function
  ): void {
    let downloadedBytes = 0;

    response.on('data', (chunk: Buffer) => {
      downloadedBytes += chunk.length;
      const progress = Math.round((downloadedBytes / totalSize) * 100);
      
      this.updateProgress({
        stage: 'downloading',
        progress: Math.min(progress * 0.5, 50), // Cap at 50% for download phase
        totalBytes: totalSize,
        downloadedBytes,
        message: `Downloading... ${Math.round(downloadedBytes / 1024 / 1024)}MB / ${Math.round(totalSize / 1024 / 1024)}MB`
      });
    });

    response.pipe(file);

    file.on('finish', () => {
      file.close();
      resolve();
    });

    file.on('error', (error: Error) => {
      fs.unlinkSync(file.path.toString());
      reject(error);
    });
  }

  private async extractArchive(archivePath: string, destination: string): Promise<void> {
    const extension = path.extname(archivePath);

    if (extension === '.gz' || extension === '.tar') {
      // Extract tar.gz
      await tar.extract({
        file: archivePath,
        cwd: destination
      });
    } else if (extension === '.zip') {
      // For Windows support later, we'll need to handle zip files
      // For now, we only support tar.gz
      throw new Error('ZIP extraction not yet implemented');
    } else {
      throw new Error(`Unsupported archive format: ${extension}`);
    }
  }

  cleanup(): void {
    if (this.currentDownload) {
      this.currentDownload.abort();
      this.currentDownload = null;
    }
  }
}