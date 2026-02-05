# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec for Lumen AI backend

import sys
import os
from pathlib import Path
from PyInstaller.utils.hooks import collect_all, collect_submodules

block_cipher = None

# Collect ALL of litellm — it has too many dynamic imports/data files
litellm_datas, litellm_binaries, litellm_hiddenimports = collect_all('litellm')

a = Analysis(
    ['app/main.py'],
    pathex=[],
    binaries=litellm_binaries,
    datas=litellm_datas,
    hiddenimports=litellm_hiddenimports + [
        # FastAPI / Uvicorn
        'uvicorn',
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',

        # SQLAlchemy async
        'sqlalchemy.dialects.sqlite',
        'aiosqlite',

        # Tiktoken
        'tiktoken',
        'tiktoken_ext',
        'tiktoken_ext.openai_public',

        # scikit-learn
        'sklearn',
        'sklearn.feature_extraction',
        'sklearn.feature_extraction.text',
        'sklearn.utils._cython_blas',
        'sklearn.utils._typedefs',

        # PyMuPDF
        'fitz',

        # SSE
        'sse_starlette',

        # Pydantic
        'pydantic',
        'pydantic_settings',

        # Other
        'dotenv',
        'email.mime.text',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='lumen-backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    target_arch=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='lumen-backend',
)
