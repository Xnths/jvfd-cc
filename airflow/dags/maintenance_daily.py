"""Daily housekeeping: privacy retention, newsletter outbox backstop, Airflow's own tables."""
import subprocess
from datetime import datetime, timedelta

import clinic_hook
from airflow.sdk import dag, task

DEFAULTS = {"retries": 3, "retry_delay": timedelta(minutes=2), "retry_exponential_backoff": True, "max_retry_delay": timedelta(minutes=30)}


@dag(
    dag_id="maintenance_daily",
    schedule="30 3 * * *",
    start_date=datetime(2026, 10, 1),
    catchup=False,
    max_active_runs=1,
    default_args=DEFAULTS,
    tags=["clinic"],
)
def maintenance_daily():
    @task
    def retention(**context):
        return clinic_hook.run_job("retention.cleanup", context)

    @task
    def newsletter_reconcile(**context):
        return clinic_hook.run_job("newsletter.reconcile", context)

    @task(retries=0)
    def airflow_db_clean():
        """Keeps Airflow's metadata small on the Pi (everything older than 30 days)."""
        cutoff = (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%d")
        subprocess.run(["airflow", "db", "clean", "--clean-before-timestamp", cutoff, "--yes", "--skip-archive"], check=True)

    [retention(), newsletter_reconcile()] >> airflow_db_clean()


maintenance_daily()
