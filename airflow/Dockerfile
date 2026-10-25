# Apache Airflow for the clinic's scheduled jobs. Version pinned; nothing user-facing depends on it.
FROM apache/airflow:3.1.5-python3.12

USER root
# pg_dump must be at least as new as the server (Postgres 17): use the PGDG client. rclone copies backups off the Pi.
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl gnupg ca-certificates \
 && install -d /usr/share/postgresql-common/pgdg \
 && curl -fsSL -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc \
 && . /etc/os-release \
 && echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt ${VERSION_CODENAME}-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
 && apt-get update \
 && apt-get install -y --no-install-recommends postgresql-client-17 rclone \
 && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY --chmod=0755 entrypoint-clinic.sh /entrypoint-clinic.sh
USER airflow
ENTRYPOINT ["/usr/bin/dumb-init", "--", "/entrypoint-clinic.sh"]
CMD ["--help"]
