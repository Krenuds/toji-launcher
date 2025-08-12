import React from 'react';
import { SystemRequirement } from '../../main/system-setup';

interface RequirementStatusProps {
  requirements: SystemRequirement[];
}

export default function RequirementStatus({ requirements }: RequirementStatusProps) {
  const getStatusIcon = (status: SystemRequirement['status']) => {
    switch (status) {
      case 'checking':
        return <span className="status-icon checking">⏳</span>;
      case 'found':
        return <span className="status-icon found">✅</span>;
      case 'missing':
        return <span className="status-icon missing">❌</span>;
      case 'error':
        return <span className="status-icon error">⚠️</span>;
      case 'skipped':
        return <span className="status-icon skipped">➖</span>;
      default:
        return <span className="status-icon unknown">❓</span>;
    }
  };

  const getStatusText = (req: SystemRequirement) => {
    switch (req.status) {
      case 'checking':
        return 'Checking...';
      case 'found':
        return req.version ? `Found (${req.version})` : 'Found';
      case 'missing':
        return 'Not installed';
      case 'error':
        return 'Check failed';
      case 'skipped':
        return 'Skipped';
      default:
        return 'Unknown';
    }
  };

  const getStatusClass = (status: SystemRequirement['status']) => {
    return `requirement-item ${status}`;
  };

  return (
    <div className="requirement-status">
      {requirements.map((req) => (
        <div key={req.name} className={getStatusClass(req.status)}>
          <div className="requirement-header">
            {getStatusIcon(req.status)}
            <div className="requirement-info">
              <h3 className="requirement-name">{req.name}</h3>
              <div className="requirement-status-text">
                {getStatusText(req)}
              </div>
            </div>
          </div>
          
          {req.details && (
            <div className="requirement-details">
              {req.details}
            </div>
          )}

          {req.status === 'checking' && (
            <div className="checking-indicator">
              <div className="spinner"></div>
            </div>
          )}
        </div>
      ))}

      {requirements.length === 0 && (
        <div className="no-requirements">
          <p>Loading system requirements...</p>
        </div>
      )}
    </div>
  );
}