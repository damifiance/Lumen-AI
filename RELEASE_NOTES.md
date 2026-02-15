# Lumen AI

## Download

| Platform | File to look for | Notes |
|----------|-----------------|-------|
| **Windows** | `.exe` installer | Double-click to install |
| **macOS** | `.dmg` disk image | See macOS note below |
| **Linux** | `.AppImage` | Make executable with `chmod +x`, then run |

> **macOS first launch:** macOS will show *"Lumen AI Not Opened — Apple could not verify..."*. This is normal for apps distributed outside the App Store. To fix it:
> 1. Click **Done** (not "Move to Trash")
> 2. Open **System Settings > Privacy & Security**
> 3. Scroll **all the way to the bottom**, past the privacy categories — in the **Security** section you'll see a message about Lumen AI being blocked. Click **Open Anyway**
> 4. macOS will ask one more time — click **Open**
>
> You only need to do this once.

## What's New

### v0.3.0 — Authentication & Profiles

**Sign In with Google or GitHub**
- OAuth sign-in via Google and GitHub — no passwords needed
- Web-based auth flow with automatic deep link back to the app
- Session persists across app restarts

**User Profiles**
- Full profile page on the Lumen AI website (avatar, username, bio, institution, research interests)
- View and edit your profile from the browser
- Circular avatar in the app sidebar when signed in

**Account Management**
- Sign out from the app or website
- Account deletion available on the profile page
- Auth is optional — local AI via Ollama works without signing in

**Website**
- New auth page with modern dark card design
- Profile editing page with portfolio-style layout
- Signed-in users see their avatar in the website navbar

### v0.2.1 — System Tray, Auto-Update & New Logo

**System Tray**
- App lives in the menu bar with Open, Check for Updates, and Quit
- Closing the window hides to tray instead of quitting
- Works on macOS, Windows, and Linux

**Auto-Update Checker**
- Check for updates from the tray menu or the About modal
- Compares against the latest GitHub release
- Silent update check on launch (production only)

**New Branding**
- New Lumen.ai geometric "L" logo throughout the app
- Updated app icon for all platforms (macOS, Windows, Linux)
- AI assistant renamed to "Lumen" in chat

### v0.2.0 — Interactive Enhancements

**Draggable Popups**
- Notes popup — drag by the header to reposition
- Ask AI popup — drag to move it while reading nearby context
- Selection toolbar — drag via the divider handle to reposition

**PDF Zoom Controls**
- Zoom buttons (+/-) in the top-right corner
- Trackpad pinch-to-zoom with natural gestures
- Ctrl+scroll zoom for mouse users
- Click the percentage to reset to page-width
- Drag-to-pan — click and drag whitespace when zoomed in
- Horizontal scrollbar when zoomed past page width

**Highlight Improvements**
- Highlights preserve their original color when using "Ask AI"
- Highlights with notes show a dotted underline indicator
- Smooth fade transition during zoom (no jitter)

**Performance**
- PDF caching with HTTP headers for faster reloads

**Bug Fixes**
- Fixed zoom buttons unable to zoom past page-width
- Fixed popups disappearing when dragged too far
- Fixed notes popup appearing in wrong position
- Fixed click events being blocked by drag handlers

### v0.1.1 — Bug Fix
- **Windows:** Fixed file browser back button not working

### v0.1.0 — Initial Release
- PDF viewer with multi-tab support
- Text highlighting in multiple colors
- Notes on any text selection
- Select & Ask AI
- AI Chat about entire papers
- Pin folders for quick access
- Local AI via Ollama, cloud via OpenAI/Anthropic
- LaTeX math rendering
- Cross-platform (macOS, Windows, Linux)

## Prerequisites
- [Ollama](https://ollama.com) installed with at least one model (e.g., `ollama pull llama3.1`)
- Or OpenAI/Anthropic API keys configured in Settings
