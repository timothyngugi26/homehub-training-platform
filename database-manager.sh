#!/bin/bash

DB_FILE="database/students.db"

echo "🔍 Database Manager for CodeTrain"
echo "=================================="

if [ ! -f "$DB_FILE" ]; then
    echo "❌ Database file not found: $DB_FILE"
    exit 1
fi

echo "✅ Database found: $DB_FILE"
echo ""

while true; do
    echo "Choose an option:"
    echo "1. View all users"
    echo "2. View all tables"
    echo "3. View table structure"
    echo "4. Delete a user"
    echo "5. Exit"
    echo ""
    read -p "Enter choice (1-5): " choice

    case $choice in
        1)
            echo ""
            echo "👥 All Users:"
            sqlite3 "$DB_FILE" "SELECT id, username, email, created_at FROM users;"
            echo ""
            ;;
        2)
            echo ""
            echo "📊 All Tables:"
            sqlite3 "$DB_FILE" ".tables"
            echo ""
            ;;
        3)
            echo ""
            echo "🏗️ Table Structures:"
            sqlite3 "$DB_FILE" ".schema"
            echo ""
            ;;
        4)
            echo ""
            read -p "Enter username to delete: " username
            if [ -n "$username" ]; then
                sqlite3 "$DB_FILE" "DELETE FROM users WHERE username = '$username';"
                echo "✅ User '$username' deleted (if existed)"
            fi
            echo ""
            ;;
        5)
            echo "👋 Goodbye!"
            exit 0
            ;;
        *)
            echo "❌ Invalid choice. Please try again."
            echo ""
            ;;
    esac
done
