# OmniMap Python Agent

Prototype FastAPI service + polling worker that processes `python_hello` jobs from Supabase and replies to Telegram users through the Node worker. The worker talks to Supabase via the REST interface using the service-role key.

## Quickstart

```bash
# inside repo root
cd python/agent
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Environment variables (use `.env` locally):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE` (or fallback `SUPABASE_ANON_KEY` for dev)
- `PYTHON_WORKER_POLL_INTERVAL` (seconds, default `5`)
- `PYTHON_WORKER_ENABLED` (set to `false` to disable polling loop)

Deploy to Cloud Run with the included `Dockerfile`:

```bash
gcloud run deploy omnimap-python-agent \
  --source . \
  --region <REGION> \
  --set-env-vars SUPABASE_URL=...,SUPABASE_SERVICE_ROLE=...
```

The FastAPI service exposes:

- `GET /healthz` – health probe for Cloud Run
- `GET /hello` – manual hello-world response

On startup the background thread polls Supabase REST (`/rest/v1`) for `python_hello` jobs and posts a `notify_user` job after crafting a greeting.
