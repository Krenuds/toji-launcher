# Toji Launcher

A simple, elegant Electron launcher for the Toji Discord Bot - transforming Discord into a voice-controlled computer interface.

## 🚀 Quick Start

```bash
# Clone and navigate
cd /home/travis/toji/electron-launcher

# Install dependencies
npm install

# Run the launcher
npm start
```

## 📋 Current Status: Phase 3A.1 Complete

### ✅ Phase 2 Complete - OAuth Authentication
- Full Discord OAuth integration with Azure server
- Secure token storage using Electron safeStorage
- Built-in browser window for auth flow
- Complete IPC communication system
- User login/logout with profile display

### ✅ Phase 3A.1 Complete - System Dependencies  
- **System Setup Orchestration** - Guided dependency installation
- **OS Detection** - Linux distribution identification
- **Node.js Management** - Multi-strategy installation (apt → NodeSource → portable)
- **Progress Tracking** - Real-time installation progress with logs
- **Error Recovery** - Graceful fallback handling
- **Modern UI** - Complete setup flow with progress indicators

### 🔧 Current Focus: Phase 3A.2 - Claude Code Installation
- Extend system setup for Claude Code CLI
- Automated `claude login --browser` flow
- Authentication verification and state management

## 🖥️ System Requirements

- **Node.js**: 14.0 or higher (auto-installed if missing)
- **OS**: Linux distributions (Ubuntu, Debian, CentOS) - **Windows support planned separately**
- **Display**: Required for GUI (no headless support)
- **RAM**: 1GB recommended for setup process
- **Disk**: 500MB for launcher + dependencies
- **Network**: Internet connection for dependency downloads

## 🧪 Testing

See [TEST_GUIDE.md](./TEST_GUIDE.md) for detailed testing instructions.

### Quick Test
1. Run `npm start`
2. Verify window opens with Toji branding
3. Click "Login with Discord" button
4. See loading animation (returns to login after 2s)

## 🏗️ Development

### Project Structure
```
electron-launcher/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── auth.ts             # Discord OAuth integration
│   │   ├── system-setup.ts     # System setup orchestration
│   │   ├── dependency-checker.ts # OS/dependency detection
│   │   ├── dependency-installer.ts # Automated installation
│   │   └── index.ts            # Main process entry
│   ├── renderer/                # React UI
│   │   ├── components/         # Setup flow components
│   │   │   ├── SetupFlow.tsx          # Main setup orchestration
│   │   │   ├── RequirementStatus.tsx   # Dependency status display
│   │   │   ├── InstallationPlanView.tsx # Installation confirmation
│   │   │   └── ProgressDisplay.tsx     # Real-time progress
│   │   └── App.tsx             # Main app with phase management
│   ├── preload/                # IPC bridge
│   └── types/                  # TypeScript definitions
├── dist/                       # Build output
├── PHASE3_ROADMAP.md          # Development roadmap  
└── NEXT.md                    # Current status & next steps
```

### Available Scripts
- `npm start` - Run in development
- `npm run build` - Build the app
- `npm run dev` - Watch mode
- `npm run package:win` - Build Windows installer
- `npm run package:linux` - Build Linux AppImage

## 🎯 Project Goals

1. **Simple** - One-click install and setup
2. **Secure** - OAuth with encrypted token storage  
3. **Cross-platform** - Windows (primary), Mac, Linux
4. **User-friendly** - No technical knowledge required
5. **Reliable** - Automatic updates and error recovery

## 📝 Technical Stack

- **Electron** - Desktop application framework
- **React 18** - UI components
- **TypeScript** - Type safety
- **Webpack 5** - Module bundling
- **electron-builder** - Distribution packaging

## 🐛 Known Issues

- Linux requires `--no-sandbox` flag in some environments
- Headless/SSH environments not supported (requires GUI)
- Windows support not yet implemented (separate launcher planned)
- Claude Code authentication requires manual browser interaction
- Installation requires sudo/pkexec for system packages

## 📚 Documentation

- [PHASE3_ROADMAP.md](./PHASE3_ROADMAP.md) - Detailed development roadmap
- [NEXT.md](./NEXT.md) - Current status & next steps
- [LAUNCHER_ROADMAP.md](./LAUNCHER_ROADMAP.md) - Original launcher roadmap
- [TEST_GUIDE.md](./TEST_GUIDE.md) - Testing instructions
- [CLAUDE.md](./CLAUDE.md) - Technical documentation

## 🤝 Contributing

Currently in active development (Phase 3A.2). Linux testing and feedback welcome!

### How to Help
1. **Test the system setup flow** on fresh Linux installations
2. **Report dependency installation issues** with system details
3. **Test privilege escalation** (pkexec/sudo prompts)
4. **Suggest UX improvements** for setup process

### Testing Focus Areas
- Various Linux distributions (Ubuntu, Debian, CentOS, Arch)
- Different Node.js installation scenarios
- Network/firewall restrictions
- Limited privilege environments

## 📜 License

Part of the Toji-Core project - Voice-controlled computer interface for accessibility.

---

**Current Version**: 1.0.0-alpha (Phase 3A.1)  
**Next Milestone**: Claude Code Integration (Phase 3A.2)  
**Architecture**: Linux-first, Windows launcher planned separately