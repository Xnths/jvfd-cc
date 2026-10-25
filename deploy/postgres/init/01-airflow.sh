#!/bin/sh
# Runs once, on first initialisation of the data directory. Airflow gets its own role and
# database with no access to the `clinic` database.
set -e
: "${AIRFLOW_DB_PASSWORD:?AIRFLOW_DB_PASSWORD is required}"
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<SQL
CREATE ROLE airflow LOGIN PASSWORD '${AIRFLOW_DB_PASSWORD}';
CREATE DATABASE airflow OWNER airflow;
REVOKE ALL ON DATABASE ${POSTGRES_DB} FROM airflow;
SQL
