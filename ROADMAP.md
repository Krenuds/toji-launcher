# Toji Launcher Roadmap

## Project Status: Ready for Repository Split

### Current State (January 2025)
The Electron launcher is **functionally complete** for Phase 1-3:
- ✅ Discord OAuth authentication
- ✅ Dependency management (Node.js, Claude CLI)
- ✅ Bot bundle download and extraction
- ✅ Cross-platform architecture foundation
- ✅ Real-time progress tracking
- ✅ Error handling and recovery

### Completed Phases

#### Phase 1: Foundation ✅
- Electron + React + TypeScript setup
- Basic window and UI components
- Webpack build configuration

#### Phase 2: Authentication ✅
- Discord OAuth with Azure server (20.169.250.88:8000)
- Secure token storage
- Login/logout flow

#### Phase 3: System Setup ✅
- Automated dependency detection and installation
- Bot bundle download from local/GitHub
- Platform abstraction layer (Linux implemented, Windows/Mac stubs)

### Next Steps: Repository Migration

#### Immediate Actions
1. **Create new GitHub repository**: `toji-launcher`
2. **Move launcher code**: Transfer all files from electron-launcher/
3. **Set up GitHub Actions**: Automated builds and releases
4. **Publish bot bundles**: Make them available via GitHub releases

#### Future Development (Post-Split)

##### Phase 4: Bot Configuration
- Service URL configuration (Whisper, Piper)
- Workspace management
- User preferences

##### Phase 5: Production Features
- Auto-updates for launcher
- Cross-platform testing (Windows, macOS)
- Installer creation (.exe, .dmg, .AppImage)
- Checksum verification for downloads

##### Phase 6: Polish
- UI animations and transitions
- Advanced error recovery
- Accessibility improvements
- Comprehensive logging

### Technical Architecture

```
toji-launcher/
├── src/
│   ├── main/           # Electron main process
│   ├── renderer/       # React UI
│   └── preload/        # IPC bridge
├── dist/               # Build output
├── package.json
├── webpack.config.js
└── README.md
```

### Dependencies
- Electron 37.x
- React 18.x
- TypeScript 5.x
- Webpack 5.x

### Platform Support
- **Linux**: Fully implemented
- **Windows**: Architecture ready, needs testing
- **macOS**: Architecture ready, needs testing

### Release Strategy
1. GitHub releases for launcher binaries
2. Separate releases for bot bundles
3. Version compatibility matrix
4. Automated build pipeline

### Success Metrics
- User can download and install launcher in < 1 minute
- Complete setup (with dependencies) in < 5 minutes
- Zero manual configuration for basic usage
- Clear error messages and recovery paths

### Testing Requirements
- Fresh OS installation tests
- Network failure scenarios
- Permission handling
- Cross-platform verification

## Migration Checklist
- [ ] Create toji-launcher repository
- [ ] Move code to new repo
- [ ] Set up GitHub Actions
- [ ] Create initial release
- [ ] Update bot repo to remove launcher
- [ ] Test end-to-end flow with real GitHub downloads
- [ ] Document installation process
- [ ] Create user guide

## Contact
For questions or contributions, please open an issue in the repository.