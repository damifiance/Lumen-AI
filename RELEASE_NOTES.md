# Lumen AI

## Download

| Platform | File to look for | Notes |
|----------|-----------------|-------|
| **Windows** | `.exe` installer | Double-click to install |
| **macOS** | `.dmg` disk image | See macOS note below |
| **Linux** | `.AppImage` | Make executable with `chmod +x`, then run |

> **macOS first launch:** macOS will show *"Lumen AI Not Opened — Apple could not verify…"*. This is normal for apps distributed outside the App Store. To fix it:
> 1. Click **Done** (not "Move to Trash")
> 2. Open **System Settings → Privacy & Security**
> 3. Scroll down — you'll see a message about Lumen AI being blocked. Click **Open Anyway**
> 4. macOS will ask one more time — click **Open**
>
> You only need to do this once.

## What's New

### Desktop App (All Platforms)
- **macOS** — DMG installer (Apple Silicon)
- **Windows** — NSIS installer (x64)
- **Linux** — AppImage

### Core Features
- PDF viewer with clean, modern interface
- Multi-tab support — open multiple papers at once
- Text highlighting in multiple colors, saved automatically
- Notes — attach notes to any text selection
- Select & Ask AI — select text, ask a question, get an AI answer
- AI Chat — ask questions about the entire paper
- Pin folders for quick access on launch
- Local AI models via Ollama (free, private, no API keys)
- Cloud model support (OpenAI, Anthropic)
- LaTeX math rendering with KaTeX
- Customizable keyboard shortcuts
- Cross-platform (macOS, Windows, Linux)

## Installation

### Windows
Download the `.exe` installer from the assets below and run it.

### macOS
Download the `.dmg` file, open it, and drag Lumen AI into Applications.

### Linux
Download the `.AppImage` file, make it executable (`chmod +x`), and run it.

## Prerequisites
- [Ollama](https://ollama.com) installed with at least one model (e.g., `ollama pull llama3.1`)
- Or OpenAI/Anthropic API keys configured in Settings
