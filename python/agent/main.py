from __future__ import annotations

import logging
from threading import Thread
from typing import Optional

from fastapi import FastAPI

from .settings import get_settings
from .worker import PythonHelloWorker

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="OmniMap Python Agent", version="0.1.0")
_worker_thread: Optional[Thread] = None


@app.on_event("startup")
def launch_worker() -> None:
    settings = get_settings()
    if not settings.enable_worker:
        logger.info("Python worker disabled via environment flag")
        return

    worker = PythonHelloWorker(settings)
    thread = Thread(target=worker.run_forever, name="python-worker", daemon=True)
    thread.start()
    global _worker_thread  # noqa: PLW0603
    _worker_thread = thread
    logger.info("Python worker thread started")


@app.get("/healthz")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/hello")
def sample_hello() -> dict[str, str]:
    return {"message": "Hello from the OmniMap Python agent"}
