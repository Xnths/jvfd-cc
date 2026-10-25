"""Calls the Go API's internal jobs with a service token (client_credentials).

Every call carries an Idempotency-Key built from the run and task ids, so a retried task never repeats work:
the API returns the stored result instead.
"""
import os
import time

import requests

AUTH_URL = os.environ.get("CLINIC_AUTH_URL", "http://clinic-auth:8081")
API_URL = os.environ.get("CLINIC_API_URL", "http://clinic-api:8080")
_token = {"value": None, "expires": 0.0}


def _bearer() -> str:
    if _token["value"] and time.time() < _token["expires"] - 30:
        return _token["value"]
    resp = requests.post(
        f"{AUTH_URL}/auth/token",
        data={
            "grant_type": "client_credentials",
            "client_id": os.environ["JOBS_CLIENT_ID"],
            "client_secret": os.environ["JOBS_CLIENT_SECRET"],
        },
        timeout=15,
    )
    resp.raise_for_status()
    body = resp.json()
    _token["value"] = body["access_token"]
    _token["expires"] = time.time() + float(body.get("expires_in", 300))
    return _token["value"]


def _headers(extra=None):
    return {"Authorization": f"Bearer {_bearer()}", **(extra or {})}


def idempotency_key(context) -> str:
    return f"{context['run_id']}:{context['task_instance'].task_id}"


def run_job(name: str, context) -> dict:
    """Runs one Go job and returns its summary. Raises on failure so the task retries with backoff."""
    resp = requests.post(
        f"{API_URL}/api/v1/internal/jobs/{name}",
        headers=_headers({"Idempotency-Key": idempotency_key(context)}),
        timeout=11 * 60,  # the API caps a job at 10 minutes
    )
    if resp.status_code == 409:
        raise RuntimeError(f"{name}: a run with this key is still in progress")
    resp.raise_for_status()
    return resp.json().get("summary", {})


def report(job: str, key: str, status: str, summary=None, error: str = "") -> None:
    """Leaves a record of a non-Go task (backups) in the admin's job list."""
    requests.post(
        f"{API_URL}/api/v1/internal/jobs-report",
        headers=_headers(),
        json={"job": job, "key": key, "status": status, "summary": summary or {}, "error": error},
        timeout=15,
    ).raise_for_status()
