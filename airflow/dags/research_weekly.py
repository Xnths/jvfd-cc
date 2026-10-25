"""Weekly: fetch new papers (PubMed, SciELO) and draft one digest post. The draft is never published automatically."""
from datetime import datetime, timedelta

import clinic_hook
from airflow.sdk import dag, task


@dag(dag_id="research_weekly", schedule="0 11 * * 1", start_date=datetime(2026, 10, 1), catchup=False, max_active_runs=1,
     default_args={"retries": 3, "retry_delay": timedelta(minutes=10), "retry_exponential_backoff": True}, tags=["clinic", "seo"])
def research_weekly():
    @task
    def fetch(**context):
        return clinic_hook.run_job("research.fetch", context)

    @task
    def digest(**context):
        return clinic_hook.run_job("research.digest", context)

    fetch() >> digest()


research_weekly()
