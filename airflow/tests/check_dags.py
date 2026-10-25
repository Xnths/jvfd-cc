"""Imports every DAG the way Airflow does. Run inside the image: python /opt/airflow/tests/check_dags.py"""
import sys

from airflow.models import DagBag

bag = DagBag(dag_folder="/opt/airflow/dags", include_examples=False)
if bag.import_errors:
    for path, err in bag.import_errors.items():
        print(f"IMPORT ERROR {path}:\n{err}")
    sys.exit(1)
expected = {"maintenance_daily", "backup_daily"}
missing = expected - set(bag.dag_ids)
if missing:
    print(f"missing DAGs: {missing}")
    sys.exit(1)
for dag_id, dag in bag.dags.items():
    assert dag.default_args.get("retries", 0) >= 0
    print(f"ok {dag_id}: {len(dag.tasks)} tasks, schedule={dag.schedule}")
