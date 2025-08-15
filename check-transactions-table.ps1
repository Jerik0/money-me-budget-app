#!/bin/bash
echo "Connecting to PostgreSQL database..."
echo "Running initial query..."

# First run a query
docker exec money-me-postgres psql -U postgres_admin -d money_me_app -c "SELECT * FROM transactions;"

echo ""
echo "Now connecting interactively. Type your SQL queries below. Use '\\q' to exit."
echo "----------------------------------------"

# Then connect interactively
docker exec -it money-me-postgres psql -U postgres_admin -d money_me_app
