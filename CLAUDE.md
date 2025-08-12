# Electron Launcher - CLAUDE.md

## ⚠️ CRITICAL DEVELOPMENT REMINDER

**NEVER call code "production-ready," "complete," or "ready to go" until it's been thoroughly tested**

- Code that compiles ≠ code that works in real scenarios
- Implementation ≠ validation with actual users
- Multiple rounds of testing and iteration are ALWAYS needed
- Assume any newly written code will have bugs and edge cases
- "Works on my machine" is not the same as "works for users"

## Mission
Build a simple Electron launcher to replace the complex Tauri/Rust approach. Users authenticate with Discord, download the bot, and access a control panel. Configuration complexity comes later.

## Background - Why This Approach

### What We Tried (Tauri + Rust)
- **Complex Architecture**: Tauri → React → FastAPI → Bot subprocess
- **Build Issues**: Required Rust/Cargo, platform-specific builds, icon problems
- **OAuth Friction**: Manual token copy/paste from web page
- **Too Many Layers**: Backend API running on user's computer was unnecessary

### What We're Building (Electron)
- **Simple Architecture**: Electron app → Bot process (direct control)
- **Proven Technology**: JavaScript/TypeScript, no Rust needed
- **Better OAuth**: Built-in callback server, automatic token handling
- **Cross-Platform**: Works on Windows (primary target), Mac, Linux from day one

## Key Decisions from Our Conversation

1. **Discord OAuth Login** - Users authenticate with existing Azure server (20.169.250.88:8000)
2. **Electron over Tauri** - Simpler development, no Rust complexity
3. **Download on Demand** - Launcher downloads bot (~67MB) on first run
4. **Direct Control** - No backend API, launcher manages bot process directly
5. **Windows Priority** - Must work on Windows as primary success criteria
6. **Infrastructure First** - Get launcher working, fix bot configuration later

## Technical Approach

### Phase 1: Foundation
- Basic Electron window with React
- TypeScript for type safety
- Simple project structure

### Phase 2: OAuth Integration  
- Port logic from `launcher/backend/oauth_client_simple.py`
- Built-in callback server on port 42069
- Secure token storage using Electron's safeStorage API

### Phase 3: Bot Download
- Download PyInstaller bundle from GitHub/server
- Store in user's app data directory
- Progress indication during download

### Phase 4: Control Panel
- Start/Stop button
- Status indicator (running/stopped)
- Basic log viewer
- Settings button (disabled initially)

### Phase 5: Distribution
- GitHub Releases with installers
- Windows .exe, Mac .dmg, Linux AppImage
- Single download for users

## What to Reuse from Master Branch

### Code to Port
1. **OAuth Logic** - `launcher/backend/oauth_client_simple.py`
2. **Process Management** - `launcher/backend/bot_manager.py` 
3. **UI Components** - Inspiration from `launcher/src/components/`

### Working Components to Keep
1. **PyInstaller Bundle** - `bot/dist/toji-bot` (67MB, works perfectly)
2. **Build Script** - `bot/build_bundle.sh` as reference
3. **Azure OAuth Server** - Already deployed and operational

### What NOT to Use
- Tauri configuration
- FastAPI backend server
- Complex sidecar setup
- Multi-layer architecture

## Critical Information

### Service Endpoints
- OAuth Server: `http://20.169.250.88:8000`
- OAuth Callback: `http://localhost:42069/callback`
- Bot Download: GitHub Releases or custom server

### Bot Requirements
- Expects `DISCORD_BOT_TOKEN` environment variable
- Needs Whisper URL: `http://localhost:9000`
- Needs Piper URL: `http://localhost:9001`
- Configuration currently hardcoded (will fix in Phase 2)

### Success Criteria
1. ✅ User downloads installer from GitHub
2. ✅ Installer works on Windows
3. ✅ OAuth login with Discord works
4. ✅ Bot downloads automatically
5. ✅ Control panel shows bot status
6. ✅ Start/Stop button functions

### Not Required for MVP
- Bot configuration UI
- Path settings
- Service configuration  
- Auto-updates
- Advanced settings

## Development Notes

### Current Status
- Branch: `electron-launcher` (from `stable-base`)
- Bot works with: `./toji start` 
- PyInstaller bundle exists and works
- **Phase 1: ✅ COMPLETE** - Electron foundation built and tested

### Completed (Phase 1)
1. ✅ Initialized Electron project with TypeScript + React
2. ✅ Created basic window with gradient UI
3. ✅ Set up webpack dual-process build
4. ✅ Implemented security best practices
5. ✅ Added placeholder OAuth button
6. ✅ Build verified (headless environment)

### Next Steps (Phase 2)
1. Port OAuth logic from Python
2. Set up callback server (port 42069)
3. Implement secure token storage
4. Add IPC communication
5. Test with Azure OAuth server

### Testing
- Local: `npm start`
- Build: `npm run build`
- Package: `npm run package:win`

## File Structure
```
electron-launcher/
├── CLAUDE.md (this file)
├── LAUNCHER_ROADMAP.md (detailed implementation plan)
├── TEST_GUIDE.md (testing instructions)
├── README.md (user-facing documentation)
├── src/
│   ├── main/           # Electron main process
│   │   └── index.ts    # Main process entry
│   └── renderer/       # React UI
│       ├── index.tsx   # React entry point
│       ├── App.tsx     # Main component
│       ├── index.html  # HTML template
│       └── styles.css  # Styling
├── dist/               # Build output
│   ├── main.js        # Compiled main process
│   ├── renderer.js    # Compiled React app
│   └── index.html     # Final HTML
├── package.json       # Dependencies & scripts
├── tsconfig.json      # TypeScript config
├── webpack.config.js  # Build configuration
└── test-launcher.sh   # Test helper script
```

## Technical Implementation Details

### Dependencies (Phase 1)
- **Electron**: v37.2.6 - Latest stable
- **React**: v18.3.1 - Latest React 18
- **TypeScript**: v5.9.2 - Latest TS 5
- **Webpack**: v5.101.0 - Module bundler
- **electron-builder**: v26.0.12 - For distribution

### Build Process
1. TypeScript compiles to JavaScript
2. Webpack bundles main process (Node.js target)
3. Webpack bundles renderer (browser target)
4. HTML plugin injects scripts
5. Source maps generated for debugging

### Security Measures
- `nodeIntegration: false` - Prevents Node access in renderer
- `contextIsolation: true` - Isolates contexts
- CSP headers in HTML - Content Security Policy
- Preload script ready for Phase 2 IPC

## Important: Configuration Comes Later

The bot currently has hardcoded paths and expects services on localhost. This is OK for MVP. Phase 2 will focus on:
- Making paths configurable
- Service URL configuration
- Workspace selection
- User settings

For now, just get the launcher working. Authentication → Download → Control Panel.