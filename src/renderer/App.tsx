import React, { useState, useEffect } from 'react';
import { UserInfo } from '../types';
import SetupFlow from './components/SetupFlow';

type AppPhase = 'auth' | 'setup' | 'config' | 'ready';

function App() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPhase, setCurrentPhase] = useState<AppPhase>('auth');

  useEffect(() => {
    // Check if user is already logged in on startup
    checkAuthStatus();

    // Listen for auth state changes
    window.electronAPI.auth.onAuthStateChange((newUser) => {
      setUser(newUser);
    });
  }, []);

  const checkAuthStatus = async () => {
    try {
      const currentUser = await window.electronAPI.auth.getUser();
      setUser(currentUser);
      // If user is authenticated, move to system setup phase
      if (currentUser) {
        setCurrentPhase('setup');
      }
    } catch (err) {
      console.error('Failed to check auth status:', err);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await window.electronAPI.auth.login();
      if (result.success) {
        setUser(result.user || null);
        setCurrentPhase('setup');
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await window.electronAPI.auth.logout();
    setUser(null);
    setCurrentPhase('auth');
  };

  const handleSetupComplete = () => {
    setCurrentPhase('config');
  };

  return (
    <div className="app">
      <div className="header">
        <h1>🤖 Toji Launcher</h1>
        <p className="subtitle">Voice-Controlled Computer Interface</p>
      </div>

      <div className="main-content">
        {currentPhase === 'auth' && (
          <div className="status-card">
            <h2>Welcome to Toji</h2>
            <p>
              Sign in with Discord to get started. After logging in, we'll set up 
              your system and configure your voice-controlled computer interface.
            </p>
            
            <div className="auth-section">
              {error && (
                <div className="error-message">
                  ⚠️ {error}
                </div>
              )}
              
              {loading ? (
                <div className="loading">
                  <p>Authenticating with Discord...</p>
                  <div className="spinner"></div>
                </div>
              ) : (
                <>
                  <p className="info">Click below to authenticate with Discord</p>
                  <button 
                    className="btn-primary"
                    onClick={handleLogin}
                  >
                    Login with Discord
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {currentPhase === 'setup' && (
          <SetupFlow onComplete={handleSetupComplete} />
        )}

        {currentPhase === 'config' && (
          <div className="status-card">
            <h2>Welcome back, {user?.username}!</h2>
            <div className="user-info">
              {user?.avatar && (
                <img 
                  src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`}
                  alt="Avatar"
                  className="user-avatar"
                />
              )}
              <div className="user-details">
                <p><strong>Username:</strong> {user?.username}#{user?.discriminator}</p>
                <p><strong>User ID:</strong> {user?.id}</p>
              </div>
            </div>
            
            <div className="bot-config-section">
              <h3>✅ System Ready! Next: Configure Your Bot</h3>
              <p>
                Your system dependencies are installed. Now we need to configure your Discord bot 
                and voice services to complete the setup.
              </p>
              <div className="config-placeholder">
                <p className="info">Bot configuration will be implemented in Phase 3B</p>
                <ul>
                  <li>Enter your Discord bot token</li>
                  <li>Configure Whisper and Piper services</li>
                  <li>Start the bot and join a voice channel</li>
                </ul>
              </div>
            </div>
            
            <button 
              className="btn-secondary"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        )}

        {currentPhase === 'auth' && (
          <div className="info-cards">
            <div className="card">
              <h3>✅ Phase 1: Foundation</h3>
              <p>Electron + React + TypeScript - Complete!</p>
            </div>
            <div className="card active">
              <h3>🔐 Phase 2: OAuth</h3>
              <p>Discord authentication - Active</p>
            </div>
            <div className="card">
              <h3>📦 Phase 3: System Setup</h3>
              <p>Dependency installation - Coming next</p>
            </div>
          </div>
        )}
      </div>

      <div className="footer">
        <p>Toji Launcher v1.0.0 - Built with Electron + React + TypeScript</p>
      </div>
    </div>
  );
}

export default App;