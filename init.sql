-- Initialization script for Excel to PostgreSQL import system
-- This script runs automatically when the container is first created

-- Create the user with password (if not exists)
DO $$
BEGIN
    CREATE USER excel_user WITH PASSWORD 'excel_password';
EXCEPTION WHEN DUPLICATE_OBJECT THEN
    -- User already exists, update password just in case
    ALTER USER excel_user WITH PASSWORD 'excel_password';
END
$$;

-- Enable UUID extension (useful for generating unique IDs)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create a schema for imported tables (optional)
-- CREATE SCHEMA IF NOT EXISTS imported_data;

-- Grant privileges to the user
ALTER ROLE excel_user WITH CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE excel_import TO excel_user;

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'Excel Import Database initialized successfully!';
    RAISE NOTICE 'Database: excel_import';
    RAISE NOTICE 'User: excel_user';
END $$;
