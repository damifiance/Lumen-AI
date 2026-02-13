# Coding Conventions

**Analysis Date:** 2026-02-12

## Naming Patterns

**Files:**
- React components: PascalCase (e.g., `FileBrowser.tsx`, `ChatPanel.tsx`, `HighlightContainer.tsx`)
- API modules: camelCase (e.g., `papers.ts`, `chat.ts`, `files.ts`)
- Store modules: camelCase with "Store" suffix (e.g., `paperStore.ts`, `chatStore.ts`, `highlightStore.ts`)
- Type/Schema files: camelCase with `.ts` extension (e.g., `paper.ts`, `chat.ts`, `highlight.ts`)
- Router modules (backend): camelCase (e.g., `files.py`, `papers.py`, `highlights.py`)
- Service modules (backend): snake_case with `_service.py` suffix (e.g., `file_service.py`, `pdf_service.py`, `llm_service.py`)

**Functions:**
- React components/hooks: PascalCase (e.g., `FileBrowser`, `ChatPanel`, `useHighlightStore`)
- Regular functions in TypeScript: camelCase (e.g., `handleFileSelect`, `togglePin`, `loadDirectory`)
- Async functions: camelCase (e.g., `getPaperMetadata`, `loadHighlights`)
- Python functions: snake_case (e.g., `get_roots`, `browse_directory`, `get_metadata`)
- Internal/private functions prefixed with underscore: `_get_ollama_models`, `_resolve_model`

**Variables:**
- Constants: UPPER_SNAKE_CASE (e.g., `PINNED_DIR_KEY`, `CLOUD_MODELS`)
- React hooks/state: camelCase (e.g., `isLoading`, `currentPath`, `isPinned`)
- Store state properties: camelCase (e.g., `activeTabIndex`, `messages`, `isStreaming`)
- Zustand store selector: camelCase (e.g., `usePaperStore`, `useChatStore`)
- Python module-level constants: UPPER_SNAKE_CASE (e.g., `CLOUD_MODELS`, `PINNED_DIR_KEY`)

**Types:**
- Interfaces: PascalCase (e.g., `PaperMetadata`, `ChatMessage`, `FileEntry`)
- Interface for props: PascalCase with "Props" suffix (e.g., `FileBrowserProps`, `ChatMessageProps`)
- Generic types: PascalCase (e.g., `ChatMessageType`)
- Pydantic models: PascalCase (e.g., `ChatMessageSchema`, `AskRequest`, `ConversationRequest`)

## Code Style

**Formatting:**
- TypeScript/JavaScript: 2-space indentation (enforced by Vite/tsconfig)
- Python: 4-space indentation (standard PEP 8)
- Line width: Generally 80-100 characters (Tailwind class strings may exceed)
- Semicolons: Used consistently in TypeScript/JavaScript

**Linting:**
- TypeScript: Strict mode enabled (`"strict": true` in `tsconfig.app.json`)
- Unused locals/parameters: Flagged (`"noUnusedLocals": true`, `"noUnusedParameters": true`)
- Import ordering: Enforced (see below)
- Type safety: Verbatim module syntax (`"verbatimModuleSyntax": true`)
- Syntax-only erasure enabled (`"erasableSyntaxOnly": true`)
- No unchecked side-effect imports (`"noUncheckedSideEffectImports": true`)

**React/JSX:**
- `"jsx": "react-jsx"` - Uses React 19 automatic JSX transform
- Components use functional syntax exclusively
- Props destructured in parameters: `({ onFileSelect, activePath }: FileBrowserProps)`
- Inline event handlers preferred with useCallback for performance
- Template literals for className combinations with ternaries

## Import Organization

**Order (TypeScript/JavaScript):**
1. React imports: `import { useState } from 'react'`
2. Third-party libraries: `import { create } from 'zustand'`, `import ReactMarkdown from 'react-markdown'`
3. Internal imports (relative paths): `import { useShortcutStore } from '../../stores/shortcutStore'`
4. Type imports: `import type { FileEntry } from '../../types/file'`
5. Styles/side effects: `import 'katex/dist/katex.min.css'`

**Path Aliases:**
- Relative paths used exclusively (no aliases configured)
- Pattern: `../../` for parent directory traversal
- Sibling imports: `./ChatMessage`, `./ChatInput`

**Python imports:**
- Standard library first: `import os`, `from pathlib import Path`
- Third-party: `from fastapi import APIRouter`, `from app.config import settings`
- Local app imports: `from app.services.pdf_service import extract_text`

## Error Handling

**Patterns:**

**TypeScript/Frontend:**
- Promise-based with `.catch()` for network calls (see `api/chat.ts`)
- Try-catch in async functions: wraps file loading, API calls, JSON parsing
- Graceful fallbacks with silent catches for non-critical operations:
  ```typescript
  try {
    const parsed = JSON.parse(comment);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Legacy plain-string comment — wrap into a single entry
  }
  ```
- Error messages passed to callbacks: `callbacks.onError(new Error(...))`
- Console logging for user-facing errors: `console.error('Failed to open paper:', err)`
- SSE error events sent to client: `yield { "event": "error", "data": json.dumps({"error": str(e)}) }`

**Python/Backend:**
- HTTPException for API responses: `raise HTTPException(status_code=404, detail="PDF not found")`
- Specific exceptions caught: `FileNotFoundError`, `PermissionError`
- Logging for server errors: `logger.exception("Failed to prepare paper context")`
- General fallback handling: `except Exception as e:` followed by logging and HTTPException
- Permission checks with explicit PermissionError: `raise PermissionError("Access restricted to home directory")`

**Guidelines:**
- Errors are caught close to their source
- User-facing messages are clear and short
- Server errors are logged for debugging
- Missing resources return 404, access violations return appropriate status
- Silent catches only for non-essential operations (malformed JSON in streaming)

## Logging

**Framework:** Console and logger in both frontend and backend

**Frontend patterns:**
- `console.error()` for user-visible errors: `console.error('Failed to open paper:', err)`
- Error object passed directly: preserves stack trace
- Used for debugging async operations and file loading failures

**Backend patterns:**
- `logging.getLogger(__name__)` per module
- `logger.exception()` for error context with traceback
- `logger.debug()` for state changes (not heavily used in current code)

## Comments

**When to Comment:**
- Complex logic explanation (e.g., path parsing for Windows vs. Unix)
- Compat notes for deprecated features: `// Compat aliases`, `// Compat: used by App.tsx`
- Clarifying intent for unusual patterns (e.g., `// Legacy plain-string comment`)
- Section headers in JSX: `{/* Sidebar */}`, `{/* Navigation bar */}`
- Storage key explanation: `const PINNED_DIR_KEY = 'pinned-directory';`

**JSDoc/TSDoc:**
- Not heavily used; types are self-documenting
- Interface properties inline documented in FastAPI schemas: `page: int | None = Query(None, description="Specific page number (0-indexed)")`
- No standalone JSDoc blocks observed in codebase

**Guidelines:**
- Comments explain "why," not "what"
- Section dividers in JSX for layout clarity
- Compat/legacy notes marked explicitly for future refactoring

## Function Design

**Size:**
- Average function 15-40 lines
- Small components/utilities < 20 lines
- Larger components split into logical sections with comments

**Parameters:**
- Props destructured in function signature for React components
- Multiple parameters grouped in objects/interfaces when > 3 params
- Optional parameters at end with defaults: `temperature: float = 0.3`
- Stream callbacks passed as object: `callbacks: StreamCallbacks`

**Return Values:**
- Async functions return Promises: `Promise<PaperMetadata>`, `Promise<FileEntry[]>`
- React components render JSX
- API functions return typed response objects: `PaperMetadata`, `ModelInfo[]`
- Generators used for streaming: `AsyncGenerator[str, None]`
- Event source responses for SSE: `EventSourceResponse(event_generator())`

## Module Design

**Exports:**
- Named exports preferred: `export function FileBrowser(...)`, `export const usePaperStore = ...`
- Default exports used for route modules in backend: `export router`
- Type exports with `export type`: `export type ChatMessage as ChatMessageType`

**Barrel Files:**
- No barrel files observed
- Each module imports directly from source

**Zustand Store Pattern:**
- Single `create<State>` call per store
- State interface defined above implementation
- Methods returned as part of state object
- Store initialized with full state: `usePaperStore = create<PaperState>((set, get) => ({...}))`
- Getters use `get()` to access current state
- Selector pattern used in components: `const { items } = useStore()` or `useStore((s) => s.items)`

**Router Pattern (FastAPI):**
- `router = APIRouter()` per module
- Registered in main.py with prefix: `app.include_router(files.router, prefix="/api/files")`
- Endpoints decorated with HTTP method: `@router.get()`, `@router.post()`
- Response models specified: `response_model=PaperMetadata`
- Query parameters extracted: `path: str = Query(...)`

---

*Convention analysis: 2026-02-12*
