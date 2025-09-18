from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache


@dataclass(frozen=True)
class Settings:
    supabase_url: str
    supabase_key: str
    poll_interval: float
    enable_worker: bool


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    url = os.getenv("SUPABASE_URL")
    if not url:
        raise RuntimeError("SUPABASE_URL is required for the Python agent")

    key = os.getenv("SUPABASE_SERVICE_ROLE") or os.getenv("SUPABASE_ANON_KEY")
    if not key:
        raise RuntimeError("SUPABASE_SERVICE_ROLE or SUPABASE_ANON_KEY must be set")

    try:
        interval = float(os.getenv("PYTHON_WORKER_POLL_INTERVAL", "5"))
    except ValueError as exc:
        raise RuntimeError("PYTHON_WORKER_POLL_INTERVAL must be numeric") from exc

    enable_worker = os.getenv("PYTHON_WORKER_ENABLED", "true").lower() not in {"0", "false", "no"}

    return Settings(
        supabase_url=url,
        supabase_key=key,
        poll_interval=max(1.0, interval),
        enable_worker=enable_worker,
    )
