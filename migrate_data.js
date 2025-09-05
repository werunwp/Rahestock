#!/usr/bin/env node

/**
 * Data Migration Script: Hosted Supabase → Self-Hosted Supabase
 * 
 * This script helps you export data from your hosted Supabase instance
 * and import it into your self-hosted instance.
 * 
 * Prerequisites:
 * 1. Install required packages: npm install pg dotenv
 * 2. Set up environment variables in .env.migration
 * 3. Have access to both databases
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.migration' });

// Configuration
const config = {
  hosted: {
    host: process.env.HOSTED_DB_HOST || 'db.fbpzvcixoocdtzqvtwfr.supabase.co',
    port: process.env.HOSTED_DB_PORT || 5432,
    database: process.env.HOSTED_DB_NAME || 'postgres',
    user: process.env.HOSTED_DB_USER || 'postgres',
    password: process.env.HOSTED_DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
  },
  local: {
    host: process.env.LOCAL_DB_HOST || 'localhost',
    port: process.env.LOCAL_DB_PORT || 54322,
    database: process.env.LOCAL_DB_NAME || 'postgres',
    user: process.env.LOCAL_DB_USER || 'postgres',
    password: process.env.LOCAL_DB_PASSWORD || 'postgres'
  }
};

// Tables to migrate (in order due to foreign key constraints)
const TABLES = [
  'profiles',
  'customers', 
  'products',
  'product_variants',
  'sales',
  'sales_items',
  'inventory_logs',
  'system_settings',
  'user_roles'
];

async function connectToDatabase(config) {
  const client = new Client(config);
  try {
    await client.connect();
    console.log(`✅ Connected to database: ${config.host}:${config.port}`);
    return client;
  } catch (error) {
    console.error(`❌ Failed to connect to database: ${error.message}`);
    throw error;
  }
}

async function exportTableData(client, tableName) {
  try {
    console.log(`📤 Exporting data from table: ${tableName}`);
    
    // Get table structure
    const structureQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = $1 
      ORDER BY ordinal_position
    `;
    const structureResult = await client.query(structureQuery, [tableName]);
    
    // Get data
    const dataQuery = `SELECT * FROM ${tableName}`;
    const dataResult = await client.query(dataQuery);
    
    const exportData = {
      table: tableName,
      structure: structureResult.rows,
      data: dataResult.rows,
      count: dataResult.rowCount
    };
    
    // Save to file
    const fileName = `export_${tableName}_${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(fileName, JSON.stringify(exportData, null, 2));
    
    console.log(`✅ Exported ${dataResult.rowCount} rows from ${tableName} to ${fileName}`);
    return exportData;
    
  } catch (error) {
    console.error(`❌ Failed to export table ${tableName}: ${error.message}`);
    return null;
  }
}

async function importTableData(client, tableName, exportData) {
  try {
    console.log(`📥 Importing data to table: ${tableName}`);
    
    if (!exportData || !exportData.data || exportData.data.length === 0) {
      console.log(`⚠️ No data to import for table: ${tableName}`);
      return;
    }
    
    // Clear existing data
    await client.query(`DELETE FROM ${tableName}`);
    console.log(`🗑️ Cleared existing data from ${tableName}`);
    
    // Import data
    for (const row of exportData.data) {
      const columns = Object.keys(row);
      const values = Object.values(row);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      
      const insertQuery = `
        INSERT INTO ${tableName} (${columns.join(', ')})
        VALUES (${placeholders})
      `;
      
      await client.query(insertQuery, values);
    }
    
    console.log(`✅ Imported ${exportData.data.length} rows to ${tableName}`);
    
  } catch (error) {
    console.error(`❌ Failed to import table ${tableName}: ${error.message}`);
  }
}

async function migrateData() {
  console.log('🚀 Starting Supabase Data Migration...\n');
  
  let hostedClient, localClient;
  
  try {
    // Connect to both databases
    hostedClient = await connectToDatabase(config.hosted);
    localClient = await connectToDatabase(config.local);
    
    console.log('\n📊 Starting data export from hosted database...\n');
    
    // Export all tables
    const exports = {};
    for (const table of TABLES) {
      const exportData = await exportTableData(hostedClient, table);
      if (exportData) {
        exports[table] = exportData;
      }
    }
    
    console.log('\n📊 Starting data import to local database...\n');
    
    // Import all tables
    for (const table of TABLES) {
      if (exports[table]) {
        await importTableData(localClient, table, exports[table]);
      }
    }
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📋 Summary:');
    Object.entries(exports).forEach(([table, data]) => {
      console.log(`  ${table}: ${data.count} rows`);
    });
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
  } finally {
    // Close connections
    if (hostedClient) await hostedClient.end();
    if (localClient) await localClient.end();
    console.log('\n🔌 Database connections closed');
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateData().catch(console.error);
}

module.exports = { migrateData, exportTableData, importTableData };

