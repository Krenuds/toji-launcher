import React, { useState } from 'react';
import { InstallationPlan } from '../../main/system-setup';

interface InstallationPlanViewProps {
  plan: InstallationPlan;
  onInstall: () => void;
  onCancel: () => void;
}

export default function InstallationPlanView({ plan, onInstall, onCancel }: InstallationPlanViewProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getMethodDescription = (method: string) => {
    switch (method) {
      case 'apt':
        return 'System package manager';
      case 'npm':
        return 'Node.js package manager';
      case 'download':
        return 'Direct download';
      case 'manual':
        return 'Manual installation required';
      default:
        return method;
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'apt':
        return '📦';
      case 'npm':
        return '📁';
      case 'download':
        return '⬇️';
      case 'manual':
        return '👤';
      default:
        return '🔧';
    }
  };

  return (
    <div className="setup-step installation-plan-step">
      <div className="step-icon">📋</div>
      <h2>Ready to install dependencies</h2>
      
      <div className="installation-summary">
        <p>We need to install the following items:</p>
        
        <div className="installation-items">
          {plan.items.map((item, index) => (
            <div key={index} className="installation-item">
              <div className="item-header">
                <span className="item-icon">{getMethodIcon(item.method)}</span>
                <div className="item-info">
                  <h3 className="item-name">{item.name}</h3>
                  <div className="item-meta">
                    <span className="item-size">{item.size}</span>
                    <span className="item-time">{item.estimatedTime}</span>
                    <span className="item-method">{getMethodDescription(item.method)}</span>
                  </div>
                </div>
              </div>
              
              {showDetails && (
                <div className="item-description">
                  {item.description}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="installation-info">
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Total time:</span>
            <span className="info-value">{plan.totalTime}</span>
          </div>
          
          {plan.requiresSudo && (
            <div className="info-item sudo-warning">
              <span className="info-label">Administrator access:</span>
              <span className="info-value">Required</span>
              <div className="sudo-explanation">
                You'll be asked for your password ONCE at the start of installation.
              </div>
            </div>
          )}
        </div>
      </div>

      {!plan.canAutoInstall && (
        <div className="manual-install-warning">
          <h3>⚠️ Manual installation required</h3>
          <p>
            Some dependencies cannot be installed automatically on your system.
            We'll guide you through the manual installation process.
          </p>
        </div>
      )}

      <div className="step-actions">
        <button 
          className="primary-button" 
          onClick={onInstall}
          disabled={!plan.canAutoInstall}
        >
          {plan.canAutoInstall ? 'Install Now' : 'Show Manual Instructions'}
        </button>
        
        <button className="secondary-button" onClick={onCancel}>
          Cancel
        </button>
        
        <button 
          className="text-button" 
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? 'Hide Details' : 'What does this do?'}
        </button>
      </div>

      {showDetails && (
        <div className="installation-details">
          <h3>Installation Details</h3>
          <div className="details-content">
            <h4>What will happen:</h4>
            <ol>
              {plan.items.map((item, index) => (
                <li key={index}>
                  <strong>{item.name}</strong> will be installed using {getMethodDescription(item.method)}
                  {item.method === 'apt' && (
                    <div className="method-details">
                      • Updates system package lists<br/>
                      • Downloads and installs from official repositories<br/>
                      • Requires administrator privileges
                    </div>
                  )}
                  {item.method === 'npm' && (
                    <div className="method-details">
                      • Installs globally using Node.js package manager<br/>
                      • Downloads from npmjs.org registry<br/>
                      • Requires Node.js to be installed first
                    </div>
                  )}
                </li>
              ))}
            </ol>
            
            <h4>Security & Privacy:</h4>
            <ul>
              <li>All software is downloaded from official sources</li>
              <li>No third-party or unofficial packages</li>
              <li>Installation logs are available for review</li>
              {plan.requiresSudo && (
                <li>Administrator privileges requested once and used only for system package installation</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}