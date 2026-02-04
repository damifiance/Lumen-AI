# AI Paper Reader

A local AI-powered tool for reading academic papers. Highlight text, ask AI to explain passages, and chat about entire papers — all running on your machine.

![Python](https://img.shields.io/badge/Python-3.12-blue)
![React](https://img.shields.io/badge/React-19-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

- **PDF Viewer** — Read papers with a clean, modern interface
- **Highlighting** — Highlight text in multiple colors, saved automatically
- **Select & Ask AI** — Select any passage and get an instant AI explanation
- **AI Chat** — Ask questions about the entire paper in a side panel
- **Local Models** — Runs with Ollama (free, private, no API keys needed)
- **Multi-Model** — Also supports OpenAI and Anthropic if you have API keys
- **File Browser** — Navigate your local folders to find papers

## Quick Start

### Option 1: Docker (Recommended)

**Prerequisites:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) and [Ollama](https://ollama.com/download)

```bash
# 1. Install a local AI model
ollama pull llama3.1

# 2. Clone this repo
git clone https://github.com/YOUR_USERNAME/AI-paper-reader.git
cd AI-paper-reader

# 3. Start the app
docker compose up --build

# 4. Open in your browser
open http://localhost:3000
```

That's it. Your Documents folder is automatically accessible.

### Option 2: Manual Setup

**Prerequisites:** Python 3.11+, Node.js 18+, [Ollama](https://ollama.com/download)

```bash
# 1. Install a local AI model
ollama pull llama3.1

# 2. Clone and install
git clone https://github.com/YOUR_USERNAME/AI-paper-reader.git
cd AI-paper-reader

cd backend && pip install -e . && cd ..
cd frontend && npm install --legacy-peer-deps && cd ..

# 3. Start (run each in a separate terminal)
cd backend && uvicorn app.main:app --reload --port 8000
cd frontend && npm run dev

# 4. Open in your browser
open http://localhost:5173
```

## Usage

1. **Browse** — Use the sidebar to navigate to a folder with PDF papers
2. **Read** — Click a PDF to open it in the viewer
3. **Highlight** — Select text and pick a color to highlight
4. **Ask AI** — Select text and click "Ask AI" for an explanation
5. **Chat** — Click the chat button (bottom-right) to ask questions about the whole paper
6. **Switch Models** — Use the model dropdown in the chat panel

## Using Cloud AI Models (Optional)

If you want to use GPT-4o or Claude instead of local models:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and add your API keys:
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
├── backend/          # Python FastAPI server
│   ├── app/
│   │   ├── routers/  # API endpoints
│   │   ├── services/ # Business logic (PDF, LLM, files)
│   │   ├── models/   # Database models
│   │   └── schemas/  # Request/response types
│   └── pyproject.toml
├── frontend/         # React app
│   └── src/
│       ├── components/  # UI components
│       ├── stores/      # Zustand state management
│       ├── api/         # API client
│       └── types/       # TypeScript types
├── docker-compose.yml
└── start.sh          # One-click launcher (macOS)
```

## License

MIT
