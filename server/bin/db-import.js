#!/usr/bin/env node

/**
 * Database Migration Import Script
 *
 * This script will:
 * 1. Connect to a remote PostgreSQL database
 * 2. Import all SQL migration files from the migrations directory
 * 3. Run them in order based on filename
 *
 * Usage:
 * NODE_ENV=production DATABASE_URL="postgres://user:pass@host:port/db" node bin/db-import.js
 * 
 * Environment Variables:
 * - DATABASE_URL: PostgreSQL connection string
 * - DRY_RUN: Set to 'true' to preview migrations without executing
 */

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import pg from 'pg';

// Setup dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);

// Configuration
const databaseUrl = `REPLACE WITH DB CREDENTIALS`;
const dryRun = false;

/**
 * Parse database connection info from URL
 */
function parseDatabaseUrl(dbUrl) {
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  // Extract user, password, host, port, database from URL
  // Format: postgres://username:password@host:port/database
  const match = dbUrl.match(/postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);

  if (!match) {
    throw new Error(`Invalid DATABASE_URL format: ${dbUrl}`);
  }

  return {
    username: match[1],
    password: match[2],
    host: match[3],
    port: match[4],
    database: match[5]
  };
}

/**
 * Get sorted list of migration files
 */
function getMigrationFiles() {
  const migrationsDir = path.join(__dirname, '..', 'postgres', 'migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found: ${migrationsDir}`);
  }

  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .filter((file) => !file.includes('archived'))
    .sort();

  return { migrationsDir, migrationFiles };
}

/**
 * Test database connection
 */
async function testConnection(dbConfig) {
  console.log('🔍 Testing database connection...');
  
  const client = new pg.Client({
    user: dbConfig.username,
    password: dbConfig.password,
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database
  });

  try {
    await client.connect();
    const result = await client.query('SELECT version()');
    console.log(`✅ Connected to PostgreSQL: ${result.rows[0].version}`);
    await client.end();
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    return false;
  }
}

/**
 * Apply a single migration file
 */
async function applyMigration(dbConfig, migrationPath, filename) {
  console.log(`  ➡️  Applying ${filename}...`);
  
  if (dryRun) {
    console.log(`    [DRY RUN] Would execute: ${migrationPath}`);
    return;
  }

  try {
    // Use psql to apply the migration
    const command = `PGPASSWORD="${dbConfig.password}" psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database} -f "${migrationPath}"`;
    const { stdout, stderr } = await execAsync(command);

    if (stderr && !stderr.includes('NOTICE')) {
      console.warn(`    ⚠️  Warnings: ${stderr}`);
    }
    
    if (stdout && stdout.trim()) {
      console.log(`    ✅ Output: ${stdout.trim()}`);
    }
  } catch (error) {
    console.error(`    ❌ Error applying ${filename}:`, error.message);
    throw error;
  }
}

/**
 * Main function to import migrations
 */
async function importMigrations() {
  console.log('\x1b[34m%s\x1b[0m', '🚀 Starting migration import process...');
  
  if (dryRun) {
    console.log('\x1b[33m%s\x1b[0m', '⚠️  DRY RUN MODE: No changes will be made to the database');
  }

  try {
    // Parse database configuration
    const dbConfig = parseDatabaseUrl(databaseUrl);
    console.log(`📊 Target database: ${dbConfig.database} on ${dbConfig.host}:${dbConfig.port}`);

    // Test connection
    if (!(await testConnection(dbConfig))) {
      process.exit(1);
    }

    // Get migration files
    const { migrationsDir, migrationFiles } = getMigrationFiles();
    console.log(`📁 Found ${migrationFiles.length} migration files in ${migrationsDir}`);

    if (migrationFiles.length === 0) {
      console.log('⚠️  No migration files found. Nothing to import.');
      return;
    }

    // List migrations
    console.log('\n📋 Migration files to apply:');
    migrationFiles.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file}`);
    });

    // Apply migrations
    console.log('\n🔄 Applying migrations...');
    for (const migrationFile of migrationFiles) {
      const migrationPath = path.join(migrationsDir, migrationFile);
      await applyMigration(dbConfig, migrationPath, migrationFile);
    }

    if (dryRun) {
      console.log('\x1b[33m%s\x1b[0m', '✨ DRY RUN complete! No changes were made to the database.');
    } else {
      console.log('\x1b[32m%s\x1b[0m', '✅ Migration import complete!');
      console.log(`📁 Successfully applied ${migrationFiles.length} migrations`);
      console.log('\x1b[32m%s\x1b[0m', '✨ Your database is up to date!');
    }

  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', '❌ Error importing migrations:');
    console.error(error.message);
    process.exit(1);
  }
}

// Validate required environment variables
if (!databaseUrl) {
  console.error('\x1b[31m%s\x1b[0m', '❌ Error: DATABASE_URL environment variable is required');
  console.error('\x1b[31m%s\x1b[0m', 'Example: DATABASE_URL="postgres://user:password@host:port/database" node bin/db-import.js');
  process.exit(1);
}

// Run the import process
importMigrations();