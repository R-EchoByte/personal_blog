from __future__ import annotations

import sys
from pathlib import Path


def get_backend_root() -> Path:
    if getattr(sys, "frozen", False):
        runtime_root = getattr(sys, "_MEIPASS", None)
        if runtime_root:
            return Path(runtime_root).resolve()
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parents[2]


def get_frontend_dist_dir() -> Path:
    backend_root = get_backend_root()

    bundled_dist_dir = backend_root / "frontend_dist"
    if bundled_dist_dir.is_dir():
        return bundled_dist_dir

    dev_dist_dir = backend_root.parent / "frontend" / "dist"
    return dev_dist_dir
