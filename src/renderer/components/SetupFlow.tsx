import React, { useState, useEffect } from 'react';
import { SystemRequirement, InstallationPlan, InstallProgress } from '../../main/system-setup';
import { DownloadProgress } from '../../main/bot-downloader';
import RequirementStatus from './RequirementStatus';
import InstallationPlanView from './InstallationPlanView';
import ProgressDisplay from './ProgressDisplay';

type SetupStep = 'welcome' | 'checking' | 'plan' | 'installing' | 'dependencies-complete' | 'bot-downloading' | 'complete' | 'error';

interface SetupFlowProps {
  onComplete: () => void;
}

export default function SetupFlow({ onComplete }: SetupFlowProps) {
  const [currentStep, setCurrentStep] = useState<SetupStep>('welcome');
  const [requirements, setRequirements] = useState<SystemRequirement[]>([]);
  const [installationPlan, setInstallationPlan] = useState<InstallationPlan | null>(null);
  const [installProgress, setInstallProgress] = useState<InstallProgress | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Listen for requirement updates
    const handleRequirementsUpdate = (event: any, updatedRequirements: SystemRequirement[]) => {
      setRequirements(updatedRequirements);
    };

    // Listen for installation progress
    const handleInstallationProgress = (event: any, progress: InstallProgress) => {
      setInstallProgress(progress);
    };

    // Listen for installation completion
    const handleInstallationComplete = (event: any, result: { success: boolean; requirements: SystemRequirement[] }) => {
      if (result.success) {
        setCurrentStep('dependencies-complete');
        setRequirements(result.requirements);
      } else {
        setError('Installation failed. Some dependencies could not be installed.');
        setCurrentStep('error');
      }
    };

    // Listen for bot download progress
    const handleBotDownloadProgress = (event: any, progress: DownloadProgress) => {
      setDownloadProgress(progress);
      if (progress.stage === 'complete') {
        setCurrentStep('complete');
      } else if (progress.stage === 'error') {
        setError(`Bot download failed: ${progress.error}`);
        setCurrentStep('error');
      }
    };

    // Listen for installation errors
    const handleInstallationError = (event: any, errorInfo: { error: string; canRetry: boolean }) => {
      setError(errorInfo.error);
      setCurrentStep('error');
    };

    window.electronAPI.on('system-setup:requirements-update', handleRequirementsUpdate);
    window.electronAPI.on('system-setup:installation-progress', handleInstallationProgress);
    window.electronAPI.on('system-setup:installation-complete', handleInstallationComplete);
    window.electronAPI.on('system-setup:installation-error', handleInstallationError);
    window.electronAPI.on('bot:download-progress', handleBotDownloadProgress);

    return () => {
      window.electronAPI.off('system-setup:requirements-update', handleRequirementsUpdate);
      window.electronAPI.off('system-setup:installation-progress', handleInstallationProgress);
      window.electronAPI.off('system-setup:installation-complete', handleInstallationComplete);
      window.electronAPI.off('system-setup:installation-error', handleInstallationError);
      window.electronAPI.off('bot:download-progress', handleBotDownloadProgress);
    };
  }, []);

  const handleStartSetup = async () => {
    setCurrentStep('checking');
    setError(null);
    
    try {
      const checkedRequirements = await window.electronAPI.invoke('system-setup:check-requirements');
      setRequirements(checkedRequirements);
      
      const missingRequirements = checkedRequirements.filter((req: SystemRequirement) => req.status === 'missing');
      
      if (missingRequirements.length === 0) {
        // Dependencies are ready, check if bot needs to be downloaded
        await checkAndDownloadBot();
      } else {
        const plan = await window.electronAPI.invoke('system-setup:get-installation-plan', missingRequirements);
        setInstallationPlan(plan);
        setCurrentStep('plan');
      }
    } catch (err: any) {
      setError(`Failed to check system requirements: ${err.message}`);
      setCurrentStep('error');
    }
  };

  const handleStartInstallation = async () => {
    if (!installationPlan) return;
    
    // Go straight to installation - sudo will be handled by the install script
    await startInstallation();
  };

  const startInstallation = async () => {
    if (!installationPlan) return;
    
    setCurrentStep('installing');
    
    try {
      await window.electronAPI.invoke('system-setup:start-installation', installationPlan);
    } catch (err: any) {
      setError(`Installation failed: ${err.message}`);
      setCurrentStep('error');
    }
  };

  const handleRetry = () => {
    setCurrentStep('welcome');
    setError(null);
    setInstallProgress(null);
    setDownloadProgress(null);
    setRequirements([]);
    setInstallationPlan(null);
  };

  const checkAndDownloadBot = async () => {
    try {
      const isBotInstalled = await window.electronAPI.invoke('bot:check-installed');
      if (isBotInstalled) {
        setCurrentStep('complete');
      } else {
        setCurrentStep('dependencies-complete');
      }
    } catch (err: any) {
      console.error('Failed to check bot installation:', err);
      setCurrentStep('dependencies-complete'); // Continue anyway
    }
  };

  const handleDownloadBot = async () => {
    setCurrentStep('bot-downloading');
    try {
      await window.electronAPI.invoke('bot:download');
      // Progress updates will be handled by the event listener
    } catch (err: any) {
      setError(`Bot download failed: ${err.message}`);
      setCurrentStep('error');
    }
  };

  return (
    <div className="setup-flow">
      {currentStep === 'welcome' && (
        <WelcomeStep onStart={handleStartSetup} />
      )}

      {currentStep === 'checking' && (
        <CheckingStep requirements={requirements} />
      )}

      {currentStep === 'plan' && installationPlan && (
        <InstallationPlanView 
          plan={installationPlan} 
          onInstall={handleStartInstallation}
          onCancel={() => setCurrentStep('welcome')}
        />
      )}

      {currentStep === 'installing' && installProgress && (
        <ProgressDisplay progress={installProgress} />
      )}

      {currentStep === 'dependencies-complete' && (
        <DependenciesCompleteStep onDownloadBot={handleDownloadBot} />
      )}

      {currentStep === 'bot-downloading' && downloadProgress && (
        <BotDownloadStep progress={downloadProgress} />
      )}

      {currentStep === 'complete' && (
        <CompleteStep requirements={requirements} onContinue={onComplete} />
      )}

      {currentStep === 'error' && error && (
        <ErrorStep error={error} onRetry={handleRetry} />
      )}
    </div>
  );
}

function WelcomeStep({ onStart }: { onStart: () => void }) {
  return (
    <div className="setup-step welcome-step">
      <div className="step-icon">🎉</div>
      <h2>Welcome! Let's set up your system</h2>
      <p>
        We'll check what you need and help install everything automatically.
      </p>
      <p>
        This process will verify your system has the required dependencies:
      </p>
      <ul>
        <li><strong>Node.js</strong> - JavaScript runtime for Claude Code CLI</li>
        <li><strong>Claude Code CLI</strong> - Anthropic's command-line interface</li>
      </ul>
      <div className="step-actions">
        <button className="primary-button" onClick={onStart}>
          Start Setup
        </button>
      </div>
    </div>
  );
}

function CheckingStep({ requirements }: { requirements: SystemRequirement[] }) {
  return (
    <div className="setup-step checking-step">
      <div className="step-icon">📋</div>
      <h2>Checking your system...</h2>
      <RequirementStatus requirements={requirements} />
      <div className="checking-note">
        <p>This may take a few moments while we verify your system configuration.</p>
      </div>
    </div>
  );
}

function CompleteStep({ requirements, onContinue }: { 
  requirements: SystemRequirement[]; 
  onContinue: () => void; 
}) {
  return (
    <div className="setup-step complete-step">
      <div className="step-icon success">✅</div>
      <h2>System setup complete!</h2>
      <p>All required dependencies are now installed and ready.</p>
      
      <div className="final-requirements">
        <RequirementStatus requirements={requirements} />
      </div>

      <div className="setup-summary">
        <h3>What's installed:</h3>
        <ul>
          {requirements
            .filter(req => req.status === 'found')
            .map(req => (
              <li key={req.name}>
                <strong>{req.name}</strong>
                {req.version && <span className="version"> ({req.version})</span>}
              </li>
            ))}
        </ul>
      </div>

      <div className="step-actions">
        <button className="primary-button" onClick={onContinue}>
          Continue to Bot Setup
        </button>
      </div>
    </div>
  );
}


function DependenciesCompleteStep({ onDownloadBot }: { onDownloadBot: () => void }) {
  return (
    <div className="setup-step dependencies-complete-step">
      <div className="step-icon success">✅</div>
      <h2>Dependencies installed successfully!</h2>
      <p>
        System dependencies are ready. Now let's download and install the Toji bot.
      </p>
      
      <div className="next-step-info">
        <h3>Next: Download Toji Bot</h3>
        <p>
          The bot is a pre-built package (about 14MB) that includes everything needed
          to run your voice-controlled computer interface.
        </p>
      </div>

      <div className="step-actions">
        <button className="primary-button" onClick={onDownloadBot}>
          Download Bot
        </button>
      </div>
    </div>
  );
}

function BotDownloadStep({ progress }: { progress: DownloadProgress }) {
  const getProgressMessage = () => {
    switch (progress.stage) {
      case 'checking':
        return '🔍 Checking for latest bot version...';
      case 'downloading':
        return '⬇️ Downloading bot bundle...';
      case 'extracting':
        return '📦 Extracting bot files...';
      case 'verifying':
        return '✅ Verifying installation...';
      case 'complete':
        return '🎉 Bot installed successfully!';
      case 'error':
        return '❌ Download failed';
      default:
        return progress.message;
    }
  };

  return (
    <div className="setup-step bot-download-step">
      <div className="step-icon">🤖</div>
      <h2>Installing Toji Bot</h2>
      
      <div className="download-progress">
        <div className="progress-message">{getProgressMessage()}</div>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progress.progress}%` }}
          ></div>
        </div>
        <div className="progress-text">{progress.progress}%</div>
        
        {progress.totalBytes && progress.downloadedBytes && (
          <div className="download-stats">
            {Math.round(progress.downloadedBytes / 1024 / 1024)}MB / {Math.round(progress.totalBytes / 1024 / 1024)}MB
          </div>
        )}
      </div>

      {progress.stage === 'error' && progress.error && (
        <div className="error-message">
          <p>{progress.error}</p>
        </div>
      )}
    </div>
  );
}

function ErrorStep({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="setup-step error-step">
      <div className="step-icon error">❌</div>
      <h2>Setup Error</h2>
      <div className="error-message">
        <p>{error}</p>
      </div>
      
      <div className="error-help">
        <h3>What you can try:</h3>
        <ul>
          <li>Check your internet connection</li>
          <li>Make sure you have administrator privileges</li>
          <li>Try running the setup again</li>
          <li>Install Node.js manually from <a href="https://nodejs.org/" target="_blank">nodejs.org</a></li>
        </ul>
      </div>

      <div className="step-actions">
        <button className="primary-button" onClick={onRetry}>
          Try Again
        </button>
        <button className="secondary-button" onClick={() => window.electronAPI.system.openExternal('https://nodejs.org/')}>
          Install Node.js Manually
        </button>
      </div>
    </div>
  );
}