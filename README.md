# Lumen AI

A local AI-powered tool for reading academic papers. Highlight text, ask AI to explain passages, and chat about entire papers — all running on your machine.

![Python](https://img.shields.io/badge/Python-3.12-blue)
![React](https://img.shields.io/badge/React-19-blue)

## Features

- **PDF Viewer** — Read papers with a clean, modern interface
- **Multi-Tab** — Open multiple papers at once, switch between them
- **Highlighting** — Highlight text in multiple colors, saved automatically
- **Notes** — Attach notes to any text selection, shown as dashed underlines
- **Select & Ask AI** — Select any passage, type your question, get an AI answer
- **AI Chat** — Ask questions about the entire paper in a side panel
- **Pin Folders** — Pin your papers folder so it opens automatically on launch
- **Local Models** — Runs with Ollama (free, private, no API keys needed)
- **Multi-Model** — Also supports OpenAI and Anthropic if you have API keys
- **LaTeX Rendering** — Math formulas rendered cleanly with KaTeX
- **Customizable Shortcuts** — All keyboard shortcuts can be changed
- **Cross-Platform** — Works on macOS, Windows, and Linux

---

## Keyboard Shortcuts

All shortcuts use **Option** on macOS and **Alt** on Windows/Linux (to avoid conflicts with browser shortcuts). You can customize them inside the app.

| Shortcut | Action |
|----------|--------|
| `Option/Alt + 1-9` | Switch to tab 1-9 |
| `Option/Alt + W` | Close current tab |
| `Option/Alt + /` | Toggle chat panel |
| `Option/Alt + K` | Show keyboard shortcuts |
| `Enter` | Send chat message |
| `Shift + Enter` | New line in chat |

To customize shortcuts, press `Option/Alt + K` or click the keyboard icon in the sidebar.

---

## Desktop App (No Terminal Needed)

Download the `.dmg` from the [Releases](#) page, open it, drag **Lumen AI** into Applications, and double-click to launch.

> On first launch, macOS may block the unsigned app. Right-click → **Open** → click **Open** in the dialog.

### Building the Desktop App Yourself

```bash
# 1. Install deps (first time)
cd backend && pip install -e ".[dev]" && cd ..
cd frontend && npm install && cd ..
cd electron && npm install && cd ..

# 2. Build backend + frontend
npm run build

# 3. Package as .dmg (macOS) / .exe (Windows) / .AppImage (Linux)
npm run package:mac
npm run package:win
npm run package:linux
```

The installer appears in `dist/installers/`. The resulting app is fully self-contained — no Python, Node, or terminal required for end users.

### Desktop App Dev Mode

Run backend, frontend, and Electron together with hot reload:

```bash
npm run dev
```

---

## macOS Setup

**Prerequisites:** Python 3.11+, Node.js 18+, [Ollama](https://ollama.com/download/mac)

```bash
# 1. Install a local AI model
ollama pull llama3.1

# 2. Clone and install
git clone https://github.com/damifiance/Lumen-AI.git
cd Lumen-AI

cd backend && pip install -e . && cd ..
cd frontend && npm install --legacy-peer-deps && cd ..

# 3. Run the app
./start.sh
```

The app opens automatically in your browser at `http://localhost:5173`.

### macOS App Shortcut

After setup, you can launch the app from Spotlight:

1. Press `Cmd + Space`, type **"Lumen AI"**
2. It opens a Terminal and starts both servers

---

## Windows Setup

**Step 1 — Install prerequisites:**

1. Download and install [Python 3.12+](https://www.python.org/downloads/) — **check "Add Python to PATH"** during install
2. Download and install [Node.js 22+](https://nodejs.org/) (LTS version)
3. Download and install [Ollama for Windows](https://ollama.com/download/windows)
4. Download and install [Git for Windows](https://git-scm.com/download/win) (if you don't have it)

**Step 2 — Install a local AI model:**

Open **Command Prompt** or **PowerShell** and run:

```
ollama pull llama3.1
```

**Step 3 — Clone and install the app:**

```
git clone https://github.com/damifiance/Lumen-AI.git
cd Lumen-AI

cd backend
pip install -e .
cd ..

cd frontend
npm install --legacy-peer-deps
cd ..
```

**Step 4 — Start the app:**

Double-click `start.bat` in the project folder, or run:

```
start.bat
```

The app opens automatically in your browser at `http://localhost:5173`.

**Tip:** Create a shortcut to `start.bat` on your Desktop for quick access.

---

## Usage

1. **Open a folder** — Select a folder containing your PDF papers from the sidebar
2. **Pin it** — Click the pin icon so it opens automatically next time
3. **Read** — Click any PDF to open it in the viewer
4. **Multi-tab** — Open multiple papers; switch with `Option/Alt + 1-9`
5. **Highlight** — Select text and pick a color to highlight it
6. **Note** — Select text, click "Note", type a note, and hit Enter to save
7. **Ask AI** — Select text, click "Ask AI", type your question, and hit Enter
8. **Chat** — Click the sun button (bottom-right) or press `Option/Alt + /` to chat about the whole paper
9. **Switch Models** — Use the model dropdown in the chat panel header
10. **Shortcuts** — Press `Option/Alt + K` to view and customize all keyboard shortcuts

## Using Cloud AI Models (Optional)

If you want to use GPT-4o or Claude instead of (or alongside) local models:

**macOS / Linux:**
```bash
cp backend/.env.example backend/.env
```

**Windows:**
```
copy backend\.env.example backend\.env
```

Then edit `backend/.env` and add your API keys:
```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Zustand
- **Backend:** Python, FastAPI, PyMuPDF, LiteLLM
- **AI:** Ollama (local), OpenAI, Anthropic
- **Database:** SQLite (highlights, paper metadata)
- **PDF:** react-pdf-highlighter-extended (based on PDF.js)

## Project Structure

```
AI-paper-reader/
├── backend/            # Python FastAPI server
│   ├── app/
│   │   ├── routers/    # API endpoints
│   │   ├── services/   # Business logic (PDF, LLM, files)
│   │   ├── models/     # Database models
│   │   └── schemas/    # Request/response types
│   ├── lumen-backend.spec  # PyInstaller build spec
│   └── pyproject.toml
├── frontend/           # React app
│   └── src/
│       ├── components/ # UI components
│       ├── stores/     # Zustand state management
│       ├── api/        # API client
│       └── types/      # TypeScript types
├── electron/           # Electron desktop wrapper
│   ├── main.js         # Main process (spawns backend, creates window)
│   ├── preload.js      # IPC bridge to renderer
│   └── electron-builder.json  # Installer build config
├── scripts/            # Build scripts
│   ├── build.js        # Full build orchestrator
│   └── dev.js          # Dev mode launcher
├── start.sh            # Web app launcher (macOS/Linux)
└── start.bat           # Web app launcher (Windows)
```

## Contact

Found a bug or have a question? Reach out:

- **Email:** jh0420park@gmail.com
- **Instagram:** [@zzhy0](https://instagram.com/zzhy0)
- **LinkedIn:** [Jaehyung Park](https://www.linkedin.com/in/jaehyung-park-4986b53a5/)

## Copyright

owned  by JaeHyung(Benjamin) Park
