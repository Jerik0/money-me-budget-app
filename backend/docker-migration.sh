#!/bin/bash

echo "🚀 Starting migration from within Docker container..."

# Clear the transactions table
echo "🗑️  Clearing transactions table..."
psql -h postgres -U postgres_admin -d money_me_app -c "DELETE FROM transactions;"

# Run the insert-transactions.sql file
echo "📝 Executing insert-transactions.sql..."
psql -h postgres -U postgres_admin -d money_me_app -f /app/insert-transactions.sql

# Verify the migration
echo "🔍 Verifying migration..."
psql -h postgres -U postgres_admin -d money_me_app -c "SELECT COUNT(*) as count FROM transactions;"

echo "🎉 Migration completed successfully!"
