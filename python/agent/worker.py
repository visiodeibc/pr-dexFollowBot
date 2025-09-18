from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from supabase import create_client, Client

from settings import Settings

logger = logging.getLogger(__name__)


class PythonHelloWorker:
    """Basic polling worker for the hello-world pipeline."""

    HANDLED_TYPES = ["python_hello"]

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client: Client = create_client(settings.supabase_url, settings.supabase_key)

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
        response = (
            self._client.table("jobs")
            .select("*")
            .eq("status", "queued")
            .in_("type", self.HANDLED_TYPES)
            .order("created_at", desc=False)
            .limit(1)
            .execute()
        )
        jobs = getattr(response, "data", None) or []
        if not jobs:
            return None
        job = jobs[0]
        now_iso = datetime.now(timezone.utc).isoformat()
        update = (
            self._client.table("jobs")
            .update({"status": "processing", "updated_at": now_iso})
            .eq("id", job["id"])
            .eq("status", "queued")
            .execute()
        )
        updated = getattr(update, "data", None) or []
        if not updated:
            # Another worker grabbed it first
            return None
        logger.info("Claimed job %s (%s)", job["id"], job["type"])
        return updated[0]

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

        now_iso = datetime.now(timezone.utc).isoformat()
        self._client.table("jobs").update(
            {
                "status": "completed",
                "result": {"message": greeting},
                "updated_at": now_iso,
            }
        ).eq("id", job_id).execute()

        self._client.table("jobs").insert(
            {
                "type": "notify_user",
                "chat_id": chat_id,
                "payload": {"message": greeting},
                "status": "queued",
                "session_id": session_id,
                "parent_job_id": job_id,
            }
        ).execute()

        logger.info("python_hello job %s completed", job_id)

    def _append_session_memory(self, session_id: str, message: str) -> None:
        try:
            self._client.table("session_memories").insert(
                {
                    "session_id": session_id,
                    "role": "assistant",
                    "kind": "message",
                    "content": {"text": message, "source": "python_hello"},
                }
            ).execute()
        except Exception as exc:  # noqa: BLE001
            logger.warning("Failed to append session memory: %s", exc)
