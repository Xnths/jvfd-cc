"""Nightly backup: pg_dump of the clinic database and a tar of the media volume, copied off the Pi when a remote is set."""
import os
import subprocess
import time
from datetime import datetime, timedelta
from pathlib import Path

import clinic_hook
from airflow.sdk import dag, task

BACKUP_DIR = Path(os.environ.get("BACKUP_DIR", "/backups"))
MEDIA_DIR = Path(os.environ.get("MEDIA_DIR", "/media"))
KEEP_DAILY, KEEP_WEEKLY = 7, 4


def _prune(prefix: str) -> None:
    """Keeps the newest 7 daily files and the newest 4 Sunday files; removes the rest."""
    files = sorted(BACKUP_DIR.glob(f"{prefix}-*"), reverse=True)
    daily = files[:KEEP_DAILY]
    weekly = [f for f in files[KEEP_DAILY:] if datetime.strptime(f.name.split("-")[1][:8], "%Y%m%d").weekday() == 6][:KEEP_WEEKLY]
    for f in files:
        if f not in daily and f not in weekly:
            f.unlink()


@dag(
    dag_id="backup_daily",
    schedule="15 4 * * *",
    start_date=datetime(2026, 10, 1),
    catchup=False,
    max_active_runs=1,
    default_args={"retries": 2, "retry_delay": timedelta(minutes=10)},
    tags=["clinic"],
)
def backup_daily():
    @task
    def dump(**context):
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)
        stamp = datetime.utcnow().strftime("%Y%m%d-%H%M")
        db_file, media_file = BACKUP_DIR / f"clinic-{stamp}.dump", BACKUP_DIR / f"media-{stamp}.tar.gz"
        env = {**os.environ, "PGPASSWORD": os.environ["BACKUP_DB_PASSWORD"]}
        subprocess.run(["pg_dump", "-Fc", "-h", "clinic-postgres", "-U", "clinic_backup", "-d", "clinic", "-f", str(db_file)], check=True, env=env)
        if MEDIA_DIR.exists():
            subprocess.run(["tar", "-czf", str(media_file), "-C", str(MEDIA_DIR), "."], check=True)
        # A dump that cannot even be listed is not a backup.
        subprocess.run(["pg_restore", "--list", str(db_file)], check=True, stdout=subprocess.DEVNULL)
        return {"db": db_file.name, "db_bytes": db_file.stat().st_size, "media": media_file.name if media_file.exists() else None}

    @task
    def offsite(result: dict):
        remote = os.environ.get("RCLONE_REMOTE", "").strip()
        if not remote:
            return {**result, "offsite": False}
        for name in (result["db"], result.get("media")):
            if name:
                subprocess.run(["rclone", "copyto", str(BACKUP_DIR / name), f"{remote.rstrip('/')}/{name}"], check=True)
        return {**result, "offsite": True}

    @task
    def prune_and_report(result: dict, **context):
        _prune("clinic")
        _prune("media")
        clinic_hook.report("backup.run", context["run_id"], "ok", {**result, "kept": len(list(BACKUP_DIR.glob("clinic-*")))})

    prune_and_report(offsite(dump()))


backup_daily()
