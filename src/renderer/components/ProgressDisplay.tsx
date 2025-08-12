import React, { useState } from 'react';
import { InstallProgress } from '../../main/system-setup';

interface ProgressDisplayProps {
  progress: InstallProgress;
}

export default function ProgressDisplay({ progress }: ProgressDisplayProps) {
  const [showLogs, setShowLogs] = useState(false);

  const getProgressBarClass = () => {
    if (progress.progress === 100) return 'progress-bar complete';
    if (progress.progress > 0) return 'progress-bar active';
    return 'progress-bar';
  };

  return (
    <div className="setup-step progress-step">
      <div className="step-icon">⏳</div>
      <h2>{progress.step}</h2>
      
      <div className="progress-container">
        <div className={getProgressBarClass()}>
          <div 
            className="progress-fill" 
            style={{ width: `${progress.progress}%` }}
          />
        </div>
        
        <div className="progress-text">
          {progress.progress}% complete
        </div>
      </div>

      {progress.currentCommand && (
        <div className="current-command">
          <div className="command-label">Running:</div>
          <div className="command-text">
            <code>{progress.currentCommand}</code>
          </div>
        </div>
      )}

      <div className="progress-actions">
        {progress.canViewDetails && (
          <button 
            className="text-button" 
            onClick={() => setShowLogs(!showLogs)}
          >
            {showLogs ? 'Hide Details' : 'View Details'}
          </button>
        )}
      </div>

      {showLogs && progress.logOutput && (
        <div className="installation-logs">
          <div className="logs-header">
            <h3>Installation Log</h3>
            <div className="logs-info">
              Real-time output from installation commands
            </div>
          </div>
          
          <div className="logs-content">
            {progress.logOutput.length === 0 ? (
              <div className="no-logs">No log output yet...</div>
            ) : (
              progress.logOutput.map((line, index) => (
                <div key={index} className={getLogLineClass(line)}>
                  {line}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="progress-note">
        <p>This may take several minutes depending on your internet connection.</p>
        <p>Please don't close this window during installation.</p>
      </div>
    </div>
  );
}

function getLogLineClass(line: string): string {
  if (line.startsWith('✓')) return 'log-line success';
  if (line.startsWith('✗')) return 'log-line error';
  if (line.startsWith('>')) return 'log-line command';
  if (line.startsWith('stderr:')) return 'log-line warning';
  return 'log-line';
}