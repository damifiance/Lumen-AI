# Technology Stack

**Analysis Date:** 2026-02-12

## Languages

**Primary:**
- Python 3.11+ - Backend API, PDF processing, LLM orchestration
- TypeScript 5.9.3 - Frontend and Electron main process
- JavaScript/Node.js - Build scripts, Electron runtime

**Secondary:**
- Bash - Build and deployment scripts

## Runtime

**Environment:**
- Node.js 18+ (for frontend development and Electron)
- Python 3.11+ (for backend)
- Electron 33.0.0 (for desktop application)

**Package Manager:**
- npm (Node.js packages)
- pip (Python packages via pyproject.toml)
- Lockfile: `frontend/package-lock.json`, `electron/package-lock.json`, `backend/` uses pyproject.toml with pip

## Frameworks

**Backend:**
- FastAPI 0.115+ - REST API framework with async support
- Uvicorn 0.34+ - ASGI server for running FastAPI
- SQLAlchemy 2.0+ with asyncio - ORM for database models
- Pydantic Settings 2.7+ - Environment configuration management

**Frontend:**
- React 19.2.0 - UI framework
- Vite 7.2.4 - Build tool and dev server
- TypeScript 5.9.3 - Type safety

**Desktop:**
- Electron 33.0.0 - Cross-platform desktop shell
- electron-builder 25.0.0 - Packaging and distribution

**Styling:**
- Tailwind CSS 4.0.0 - Utility-first CSS framework
- @tailwindcss/vite 4.0.0 - Vite plugin for Tailwind

## Key Dependencies

**Critical (Backend):**
- litellm 1.55+ - LLM provider abstraction (supports OpenAI, Anthropic, Ollama)
- pymupdf 1.25+ - PDF reading and text extraction
- aiosqlite 0.20+ - Async SQLite driver
- sse-starlette 2.2+ - Server-Sent Events for streaming responses
- tiktoken 0.8+ - Token counting for LLMs
- scikit-learn 1.6+ - Machine learning utilities
- python-dotenv 1.0+ - Environment variable loading

**Critical (Frontend):**
- pdfjs-dist 4.10.38 - PDF viewer rendering
- react-pdf-highlighter-extended 8.0.0 - PDF highlight and annotation
- zustand 5.0.0 - Lightweight state management
- react-markdown 9.0.0 - Markdown rendering
- react-syntax-highlighter 15.6.0 - Code syntax highlighting
- katex 0.16.28 - LaTeX/math formula rendering
- lucide-react 0.470.0 - Icon library

**Infrastructure:**
- alembic 1.14+ - Database schema migrations
- httpx - Async HTTP client (for Ollama API calls)
- ruff 0.8+ - Python linter and formatter

## Configuration

**Environment:**
- Backend uses `.env` file with Pydantic Settings pattern
- Location: `/backend/.env` (example at `/backend/.env.example`)
- Variables: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OLLAMA_BASE_URL`, `PAPERS_ROOT`, `DATABASE_URL`
- Frontend proxies API requests to backend at development time via Vite proxy configuration

**Build:**
- Frontend: `frontend/vite.config.ts` - Vite configuration with React and Tailwind plugins
- Frontend: `frontend/tsconfig.json` and `frontend/tsconfig.app.json` - TypeScript strict mode enabled
- Backend: `backend/pyproject.toml` - Python project config with dependencies and tool settings
- Electron: `electron/electron-builder.json` - Packaging configuration for all platforms

## Platform Requirements

**Development:**
- Python 3.11+ with pip
- Node.js 18+ with npm
- Git for version control

**Desktop Application:**
- macOS 10.13+ (arm64 and x86_64 support)
- Windows 7+ (x86_64)
- Linux (AppImage format)

**Production:**
- Desktop: Self-contained Electron bundles with embedded Python backend
- Web: FastAPI backend + React frontend with Vite build artifacts

## Database

**Type:** SQLite with async support
- Path: `{project-root}/data/papers.db` (default, configurable via DATABASE_URL)
- Driver: aiosqlite (async SQLite)
- ORM: SQLAlchemy 2.0+ with async sessions
- Migrations: Alembic (configured in backend)

---

*Stack analysis: 2026-02-12*
