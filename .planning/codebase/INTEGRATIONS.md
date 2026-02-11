# External Integrations

**Analysis Date:** 2026-02-12

## APIs & External Services

**LLM Providers:**
- OpenAI (GPT-4o, GPT-4o Mini)
  - SDK/Client: litellm (via OpenAI Python SDK)
  - Auth: `OPENAI_API_KEY` environment variable
  - Endpoint: Default OpenAI API endpoint
  - Location: `backend/app/services/llm_service.py`

- Anthropic (Claude Sonnet 4, Claude Haiku)
  - SDK/Client: litellm (via Anthropic Python SDK)
  - Auth: `ANTHROPIC_API_KEY` environment variable
  - Endpoint: Default Anthropic API endpoint
  - Location: `backend/app/services/llm_service.py`

- Ollama (Local Models)
  - SDK/Client: httpx (async HTTP client with litellm support)
  - Auth: None (local service)
  - Endpoint: `http://localhost:11434` (configurable via `OLLAMA_BASE_URL`)
  - Discovery: `/api/tags` endpoint for model enumeration
  - Location: `backend/app/services/llm_service.py`

## Data Storage

**Databases:**
- SQLite (default)
  - Connection: `sqlite+aiosqlite:///{data_dir}/papers.db` (default path)
  - Configurable via `DATABASE_URL` environment variable
  - Client: SQLAlchemy 2.0+ with aiosqlite async driver
  - Location: `backend/app/database.py`
  - Models: `backend/app/models/` (paper.py, highlight.py)

**File Storage:**
- Local filesystem only
- Papers directory: Configurable via `PAPERS_ROOT` environment variable (default: `~/Documents`)
- PDF extraction via pymupdf library
- Location: `backend/app/services/pdf_service.py`

**Caching:**
- None (no external caching service used)

## Authentication & Identity

**Auth Provider:**
- None - Application is local/desktop-only, no user authentication system
- Electron app and FastAPI backend communicate on localhost
- Cross-Origin Resource Sharing (CORS) configured to allow localhost requests

## Monitoring & Observability

**Error Tracking:**
- None detected - No external error tracking service integrated

**Logs:**
- Standard Python logging via `logging` module
- FastAPI request/response logging via Uvicorn
- Electron console output captured in `main.js`
- No external logging aggregation detected

## CI/CD & Deployment

**Hosting:**
- Desktop: Electron application packaged for macOS, Windows, Linux via electron-builder
- Backend embedded as compiled binary (PyInstaller) within Electron app
- Web mode: FastAPI backend + Vite-built React frontend (static files)

**CI Pipeline:**
- None detected - Build scripts are local (`npm run build`, `npm run package:*`)

## Environment Configuration

**Required env vars (Backend):**
- `OPENAI_API_KEY` - OpenAI API key (optional, leave empty if not using)
- `ANTHROPIC_API_KEY` - Anthropic API key (optional, leave empty if not using)
- `OLLAMA_BASE_URL` - Ollama service URL (default: `http://localhost:11434`)
- `PAPERS_ROOT` - Root directory for papers (default: `~/Documents`)
- `DATABASE_URL` - SQLite database URL (default: auto-generated in data/ directory)

**Secrets location:**
- `.env` file in `backend/` directory (not committed to git)
- Environment variables injected at runtime for desktop app
- Example file: `backend/.env.example` shows all available configurations

## API Endpoints (Backend)

**Health Check:**
- `GET /api/health` - Service health check

**Papers Management:**
- `GET /api/papers` - List papers
- `POST /api/papers` - Create/register paper
- `GET /api/papers/{id}` - Get paper metadata
- Location: `backend/app/routers/papers.py`

**File Operations:**
- `POST /api/files/upload` - Upload PDF file
- `GET /api/files/download/{file_id}` - Download file
- Location: `backend/app/routers/files.py`

**Highlights & Annotations:**
- `GET /api/highlights/{paper_id}` - Get all highlights for a paper
- `POST /api/highlights` - Create highlight/note
- `PATCH /api/highlights/{id}` - Update highlight
- `DELETE /api/highlights/{id}` - Delete highlight
- Location: `backend/app/routers/highlights.py`

**Chat & LLM:**
- `GET /api/chat/models` - List available models
- `POST /api/chat/ask` - Ask question about selected text (streaming)
- `POST /api/chat/conversation` - Multi-turn conversation (streaming)
- Location: `backend/app/routers/chat.py`
- Response Format: Server-Sent Events (SSE) via sse_starlette

## Streaming & Real-time Communication

**Streaming Protocol:**
- Server-Sent Events (SSE) for LLM response streaming
- Implementation: sse_starlette library
- Client: Fetch API with EventSource or raw fetch with custom streaming handler
- Endpoints: `/api/chat/ask`, `/api/chat/conversation`
- Location: `backend/app/routers/chat.py`, `frontend/src/api/chat.ts`

## Frontend API Client

**HTTP Client:**
- Native Fetch API (no axios or other library)
- Base URL: `/api` (proxied in dev, direct in production)
- Dynamic port detection for Electron environment via `__BACKEND_PORT__` global
- Location: `frontend/src/api/client.ts`

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- None detected

## Cross-Platform Data Sync

**Desktop App Specific:**
- Electron IPC for communication between main process and renderer
- Backend process launched as child process in Electron app
- Dynamic port allocation via find-free-port library
- Data directory: User app data folder (platform-specific)
- Location: `electron/main.js`

---

*Integration audit: 2026-02-12*
