#!/bin/bash
# Writes the login for the (LAN-only) UI from the environment, then hands over to the stock entrypoint.
set -e
if [ -n "${AIRFLOW_ADMIN_PASSWORD:-}" ]; then
    umask 077
    printf '{"admin": "%s"}' "${AIRFLOW_ADMIN_PASSWORD}" > /opt/airflow/simple_auth_passwords.json
fi
exec /entrypoint "$@"
