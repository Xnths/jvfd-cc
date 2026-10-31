"""Daily Google Ads check: refresh Google's own numbers (summary, impressions/clicks per campaign), then alert."""
from datetime import datetime, timedelta

import clinic_hook
from airflow.sdk import dag, task

DEFAULTS = {"retries": 3, "retry_delay": timedelta(minutes=2), "retry_exponential_backoff": True, "max_retry_delay": timedelta(minutes=30)}


@dag(
    dag_id="ads_daily",
    schedule="15 9 * * *",
    start_date=datetime(2026, 10, 1),
    catchup=False,
    max_active_runs=1,
    default_args=DEFAULTS,
    tags=["clinic", "ads"],
)
def ads_daily():
    @task
    def reconcile(**context):
        return clinic_hook.run_job("ads.reconcile", context)

    @task
    def adjust(**context):
        return clinic_hook.run_job("ads.adjust", context)

    @task(trigger_rule="all_done")  # a Google outage must not silence the alert about it
    def alerts(**context):
        return clinic_hook.run_job("ads.alerts", context)

    # Alerts read the campaign clicks reconcile just stored.
    reconcile() >> adjust() >> alerts()


ads_daily()
