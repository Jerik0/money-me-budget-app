#!/bin/bash
# Custom initialization script to set up pg_hba.conf

# Wait for postgres to be ready
until pg_isready -U postgres_admin -d money_me_app; do
  echo "Waiting for postgres to be ready..."
  sleep 1
done

# Copy our custom pg_hba.conf
cp /docker-entrypoint-initdb.d/pg_hba.conf /var/lib/postgresql/data/pg_hba.conf

# Reload the configuration
psql -U postgres_admin -d money_me_app -c "SELECT pg_reload_conf();"

echo "pg_hba.conf has been updated and configuration reloaded"
