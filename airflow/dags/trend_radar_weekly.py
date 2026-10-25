"""Weekly: awareness dates that are close and searches that are rising → the topic queue (Pautas)."""
from datetime import datetime, timedelta

import clinic_hook
from airflow.sdk import dag, task


@dag(dag_id="trend_radar_weekly", schedule="0 10 * * 1", start_date=datetime(2026, 10, 1), catchup=False, max_active_runs=1,
     default_args={"retries": 2, "retry_delay": timedelta(minutes=10)}, tags=["clinic", "seo"])
def trend_radar_weekly():
    @task
    def radar(**context):
        return clinic_hook.run_job("trends.radar", context)

    radar()


trend_radar_weekly()
