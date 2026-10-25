"""Search Console → gsc_daily, then rules that turn the numbers into suggestions (never changes content)."""
from datetime import datetime, timedelta

import clinic_hook
from airflow.sdk import dag, task

DEFAULTS = {"retries": 3, "retry_delay": timedelta(minutes=5), "retry_exponential_backoff": True, "max_retry_delay": timedelta(hours=1)}


@dag(dag_id="seo_gsc_daily", schedule="0 9 * * *", start_date=datetime(2026, 10, 1), catchup=False, max_active_runs=1, default_args=DEFAULTS, tags=["clinic", "seo"])
def seo_gsc_daily():
    @task
    def sync(**context):
        return clinic_hook.run_job("gsc.sync", context)

    @task
    def opportunities(**context):
        return clinic_hook.run_job("seo.opportunities", context)

    sync() >> opportunities()


seo_gsc_daily()
