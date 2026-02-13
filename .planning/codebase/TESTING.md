# Testing Patterns

**Analysis Date:** 2026-02-12

## Test Framework

**Status:** No testing infrastructure detected

**Current State:**
- No test files found in `frontend/src/` or `backend/app/`
- No Jest, Vitest, Pytest, or other test runner configuration files
- No `*.test.*` or `*.spec.*` files in application code (only in `node_modules/`)
- No test configuration files: `jest.config.*`, `vitest.config.*`, `pytest.ini`, etc.

**Implications:**
- All code changes are untested by automated test suites
- Quality assurance relies on manual testing and integration testing
- No regression detection mechanism for refactors

---

## Recommended Testing Strategy

If testing infrastructure is to be added, follow these patterns based on existing code:

### Frontend Testing (Recommended: Vitest + React Testing Library)

**Potential Structure:**
```
frontend/src/
├── api/
│   ├── client.ts
│   └── __tests__/
│       └── client.test.ts
├── stores/
│   ├── paperStore.ts
│   └── __tests__/
│       └── paperStore.test.ts
├── components/
│   ├── FileBrowser.tsx
│   └── __tests__/
│       └── FileBrowser.test.tsx
└── utils/
    ├── noteHelpers.ts
    └── __tests__/
        └── noteHelpers.test.ts
```

**Configuration Pattern (if implemented):**
```typescript
// vitest.config.ts (recommended setup)
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

**Unit Test Pattern - Store Testing:**
```typescript
// stores/__tests__/paperStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { usePaperStore } from '../paperStore'

describe('usePaperStore', () => {
  beforeEach(() => {
    // Reset store between tests
    usePaperStore.setState({
      tabs: [],
      activeTabIndex: -1,
      activePaperPath: null,
      metadata: null,
      isLoading: false,
    })
  })

  it('should open a new tab', () => {
    const store = usePaperStore.getState()
    const metadata = { page_count: 10, title: 'Test', author: 'Author', subject: '' }

    store.openTab('/path/to/paper.pdf', metadata)

    expect(usePaperStore.getState().tabs).toHaveLength(1)
    expect(usePaperStore.getState().activeTabIndex).toBe(0)
  })

  it('should switch between tabs', () => {
    const store = usePaperStore.getState()
    const metadata = { page_count: 10, title: 'Test', author: 'Author', subject: '' }

    store.openTab('/path/1.pdf', metadata)
    store.openTab('/path/2.pdf', metadata)
    store.switchTab(0)

    expect(usePaperStore.getState().activeTabIndex).toBe(0)
  })

  it('should close a tab', () => {
    const store = usePaperStore.getState()
    const metadata = { page_count: 10, title: 'Test', author: 'Author', subject: '' }

    store.openTab('/path/1.pdf', metadata)
    store.openTab('/path/2.pdf', metadata)
    store.closeTab(0)

    expect(usePaperStore.getState().tabs).toHaveLength(1)
  })
})
```

**Unit Test Pattern - Utilities:**
```typescript
// utils/__tests__/noteHelpers.test.ts
import { describe, it, expect } from 'vitest'
import { createNoteEntry, parseNotes, serializeNotes } from '../noteHelpers'

describe('noteHelpers', () => {
  it('should create a note entry with UUID and timestamp', () => {
    const note = createNoteEntry('Test note')

    expect(note.text).toBe('Test note')
    expect(note.id).toBeTruthy()
    expect(note.createdAt).toBeTruthy()
  })

  it('should parse JSON array of notes', () => {
    const notes = [
      { id: '1', text: 'First', createdAt: '2026-02-12T00:00:00Z' },
      { id: '2', text: 'Second', createdAt: '2026-02-12T01:00:00Z' },
    ]
    const serialized = JSON.stringify(notes)

    const parsed = parseNotes(serialized)

    expect(parsed).toHaveLength(2)
    expect(parsed[0].text).toBe('First')
  })

  it('should handle legacy plain-string comments', () => {
    const parsed = parseNotes('Legacy comment text')

    expect(parsed).toHaveLength(1)
    expect(parsed[0].text).toBe('Legacy comment text')
  })

  it('should serialize notes to JSON', () => {
    const notes = [createNoteEntry('Test')]
    const serialized = serializeNotes(notes)

    expect(() => JSON.parse(serialized)).not.toThrow()
    const reparsed = JSON.parse(serialized)
    expect(reparsed[0].text).toBe('Test')
  })
})
```

**Component Test Pattern:**
```typescript
// components/__tests__/FileBrowser.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FileBrowser } from '../file-browser/FileBrowser'

describe('FileBrowser', () => {
  it('renders welcome message when no folder selected', () => {
    const onFileSelect = vi.fn()

    render(<FileBrowser onFileSelect={onFileSelect} activePath={null} />)

    expect(screen.getByText(/Open a folder/i)).toBeInTheDocument()
  })

  it('calls onFileSelect when a file is clicked', async () => {
    const onFileSelect = vi.fn()
    const { user } = render(
      <FileBrowser onFileSelect={onFileSelect} activePath={null} />
    )

    // Would need to mock getRoots and browseDirectory
    // Then test interaction
  })
})
```

---

### Backend Testing (Recommended: Pytest)

**Potential Structure:**
```
backend/
├── app/
│   ├── routers/
│   │   ├── chat.py
│   │   └── papers.py
│   └── services/
│       ├── pdf_service.py
│       └── file_service.py
└── tests/
    ├── conftest.py
    ├── test_routers/
    │   ├── test_chat.py
    │   └── test_papers.py
    └── test_services/
        ├── test_file_service.py
        └── test_pdf_service.py
```

**Configuration Pattern (if implemented):**
```ini
# pyproject.toml or pytest.ini
[tool:pytest]
testpaths = ["tests"]
python_files = "test_*.py"
python_classes = "Test*"
python_functions = "test_*"
```

**Unit Test Pattern - Service Testing:**
```python
# tests/test_services/test_file_service.py
import pytest
from pathlib import Path
from app.services.file_service import get_roots, browse_directory

def test_get_roots():
    """get_roots should return list of standard directories if they exist."""
    roots = get_roots()

    assert isinstance(roots, list)
    # Home should always exist
    assert any(root.name == "Home" for root in roots)

def test_browse_directory_valid():
    """browse_directory should list files and folders."""
    # Use temp directory
    import tempfile
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create test structure
        Path(tmpdir, "test.pdf").touch()
        Path(tmpdir, "subfolder").mkdir()

        entries = browse_directory(tmpdir)

        assert len(entries) == 2
        assert any(e.name == "test.pdf" and not e.is_dir for e in entries)
        assert any(e.name == "subfolder" and e.is_dir for e in entries)

def test_browse_directory_restricted():
    """browse_directory should restrict access outside home."""
    with pytest.raises(PermissionError):
        browse_directory("/etc/passwd")
```

**API Route Test Pattern:**
```python
# tests/test_routers/test_papers.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_get_paper_metadata(tmp_path):
    """GET /api/papers/metadata should return paper metadata."""
    # Create test PDF (would need pypdf or similar to mock)
    test_pdf = tmp_path / "test.pdf"
    test_pdf.touch()

    response = client.get(f"/api/papers/metadata?path={test_pdf}")

    # Would return 200 if PDF is valid
    # assert response.status_code == 200
    # assert response.json()["title"]

def test_get_paper_metadata_not_found():
    """GET /api/papers/metadata should return 404 for missing file."""
    response = client.get("/api/papers/metadata?path=/nonexistent/file.pdf")

    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()
```

---

## Test File Organization

**Frontend (Co-located):**
- Test files live in `__tests__/` subdirectory next to source
- Naming: `[source-name].test.ts[x]`
- Example: `src/stores/paperStore.ts` → `src/stores/__tests__/paperStore.test.ts`

**Backend (Separate):**
- All tests in `tests/` directory at project root
- Mirrored structure to `app/`
- Naming: `test_[module-name].py`
- Example: `app/services/file_service.py` → `tests/test_services/test_file_service.py`

---

## Mocking

**Frontend (Vitest + MSW or vi.mock):**

**Framework:** `vi.mock()` from Vitest or `msw` (Mock Service Worker)

**API Mocking Pattern:**
```typescript
// Setup: Mock the API client
vi.mock('../../api/client', () => ({
  apiFetch: vi.fn(),
  apiStreamUrl: vi.fn((path) => `http://localhost:8000/api${path}`),
}))

// In tests:
import { apiFetch } from '../../api/client'

it('should fetch paper metadata', async () => {
  vi.mocked(apiFetch).mockResolvedValue({
    page_count: 10,
    title: 'Test Paper',
    author: 'Author',
    subject: 'Test',
  })

  // Test code using apiFetch
})
```

**Store Mocking Pattern:**
```typescript
// Mock Zustand store state
usePaperStore.setState({
  tabs: [
    { path: '/test.pdf', metadata: { /* ... */ } },
  ],
  activeTabIndex: 0,
  activePaperPath: '/test.pdf',
})
```

**Backend (pytest-mock, monkeypatch):**

**Framework:** `pytest` with `monkeypatch` or `pytest-mock`

**File System Mocking:**
```python
def test_browse_directory(tmp_path, monkeypatch):
    """Mock file system using temporary directory."""
    # Create test structure
    (tmp_path / "test.pdf").touch()

    entries = browse_directory(str(tmp_path))
    assert len(entries) == 1
```

**API Client Mocking:**
```python
def test_get_ollama_models(monkeypatch):
    """Mock httpx.get for Ollama models endpoint."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "models": [{"name": "llama2"}]
    }

    monkeypatch.setattr("httpx.get", lambda *a, **k: mock_response)

    models = _get_ollama_models()
    assert len(models) == 1
```

**What to Mock:**
- External HTTP calls (APIs, Ollama)
- File system operations (use `tmp_path` for tests)
- Time-dependent operations (use fixed timestamps)
- Database queries (use fixtures with test data)

**What NOT to Mock:**
- Internal utility functions (test them directly)
- Data transformation logic (test with real data)
- Store state updates (test by reading `getState()`)
- Response validation (test actual Pydantic models)

---

## Fixtures and Factories

**Test Data:**

**Frontend Fixtures (Vitest pattern):**
```typescript
// src/test/fixtures/paper.ts
export const mockPaperMetadata = (): PaperMetadata => ({
  page_count: 10,
  title: 'Test Paper',
  author: 'Test Author',
  subject: 'Test Subject',
})

export const mockChatMessage = (overrides?: Partial<ChatMessage>): ChatMessage => ({
  id: 'msg-1',
  role: 'user',
  content: 'Test message',
  ...overrides,
})
```

**Backend Fixtures (Pytest pattern):**
```python
# tests/conftest.py
import pytest
from app.schemas.file_browser import FileEntry

@pytest.fixture
def sample_file_entry():
    return FileEntry(
        name="test.pdf",
        path="/home/user/test.pdf",
        is_dir=False,
        size=1024,
        modified=1644604800.0
    )

@pytest.fixture
def sample_paper_metadata():
    return {
        "page_count": 10,
        "title": "Test Paper",
        "author": "Test Author",
        "subject": "Test Subject"
    }
```

**Location:**
- Frontend: `frontend/src/test/fixtures/` or co-located in `__tests__/` directories
- Backend: `tests/conftest.py` or `tests/fixtures/`

---

## Coverage

**Current Status:** No coverage tracking configured

**Recommended Approach (if implemented):**

**Frontend:**
```bash
# vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
      ],
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80,
    },
  },
})
```

**Backend:**
```bash
# pytest.ini or pyproject.toml
pytest = pytest --cov=app --cov-report=html --cov-report=term
```

**Coverage Requirements (recommended):**
- Critical paths: >= 90% (API routes, state management)
- Utilities: >= 85% (helpers, transformations)
- Components: >= 70% (UI interactions vary)
- Services: >= 85% (business logic)

---

## Test Types

**Unit Tests:**
- Scope: Individual functions, stores, utilities
- Approach: Fast, isolated, mock dependencies
- Example: `noteHelpers` utility functions tested with various inputs

**Integration Tests:**
- Scope: API routes with services, store interactions with components
- Approach: Use real service dependencies, mock only external APIs
- Example: `POST /api/chat/ask` with mocked LLM service

**E2E Tests:**
- Status: Not currently implemented
- Framework if added: `Playwright` or `Cypress`
- Would test: Complete user flows (open file → select text → ask AI)

---

## Common Patterns (If Testing Implemented)

**Async Testing (Frontend - Vitest):**
```typescript
it('should load highlights when paper is selected', async () => {
  const store = usePaperStore.getState()

  await store.setActivePaper('/path.pdf', mockMetadata)

  expect(usePaperStore.getState().isLoading).toBe(false)
})
```

**Error Testing:**

**Frontend:**
```typescript
it('should handle missing file error gracefully', async () => {
  vi.mocked(apiFetch).mockRejectedValue(new Error('File not found'))

  const onFileSelect = vi.fn()
  render(<FileBrowser onFileSelect={onFileSelect} activePath={null} />)

  // Verify error handling doesn't crash component
})
```

**Backend:**
```python
def test_missing_pdf_returns_404():
    response = client.get("/api/papers/metadata?path=/missing.pdf")

    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()
```

---

*Testing analysis: 2026-02-12*
