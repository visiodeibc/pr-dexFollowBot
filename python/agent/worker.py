from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import httpx

from settings import Settings
from supabase_client import SupabaseRestClient

logger = logging.getLogger(__name__)


class PythonHelloWorker:
    """Basic polling worker for the hello-world pipeline."""

    HANDLED_TYPES = ["python_hello"]

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        logger.info("httpx version %s", httpx.__version__)
        self._client = SupabaseRestClient(settings.supabase_url, settings.supabase_key)

    def run_forever(self) -> None:
        logger.info("Starting Python hello worker loop")
        while True:
            try:
                claimed = self._claim_next_job()
                if not claimed:
                    time.sleep(self._settings.poll_interval)
                    continue
                self._process_job(claimed)
            except Exception as exc:  # noqa: BLE001
                logger.exception("Worker loop error: %s", exc)
                time.sleep(self._settings.poll_interval)

    def _claim_next_job(self) -> Optional[Dict[str, Any]]:
        try:
            job = self._client.fetch_next_job(self.HANDLED_TYPES)
        except httpx.HTTPError as exc:
            logger.error("Failed to fetch next job: %s", exc)
            return None
        if not job:
            return None
        try:
            claimed = self._client.claim_job(job["id"])
        except httpx.HTTPError as exc:
            logger.error("Failed to claim job %s: %s", job["id"], exc)
            return None
        if not claimed:
            return None
        logger.info("Claimed job %s (%s)", claimed["id"], claimed["type"])
        return claimed

    def _process_job(self, job: Dict[str, Any]) -> None:
        session_id = job.get("session_id")
        chat_id = job.get("chat_id")
        job_id = job["id"]
        greeting = (
            f"👋 Hello from the Python worker! Timestamp: {datetime.now(timezone.utc).isoformat()}"
        )

        logger.info("Processing python_hello job %s for chat %s", job_id, chat_id)

        if session_id:
            self._append_session_memory(session_id, greeting)

        self._client.update_job(
            job_id,
            {
                "status": "completed",
                "result": {"message": greeting},
            },
        )

        self._client.insert_job(
            {
                "type": "notify_user",
                "chat_id": chat_id,
                "payload": {"message": greeting},
                "status": "queued",
                "session_id": session_id,
                "parent_job_id": job_id,
            }
        )

        logger.info("python_hello job %s completed", job_id)

    def _append_session_memory(self, session_id: str, message: str) -> None:
        try:
            self._client.insert_session_memory(
                {
                    "session_id": session_id,
                    "role": "assistant",
                    "kind": "message",
                    "content": {"text": message, "source": "python_hello"},
                }
            )
        except httpx.HTTPError as exc:
            logger.warning("Failed to append session memory: %s", exc)
