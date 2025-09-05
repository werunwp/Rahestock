#!/usr/bin/env node
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: 'env.migration' });

const config = {
  hosted: {
    host: process.env.HOSTED_DB_HOST,
    port: process.env.HOSTED_DB_PORT,
    database: process.env.HOSTED_DB_NAME,
    user: process.env.HOSTED_DB_USER,
    password: process.env.HOSTED_DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
  },
  local: {
    host: process.env.LOCAL_DB_HOST,
    port: process.env.LOCAL_DB_PORT,
    database: process.env.LOCAL_DB_NAME,
    user: process.env.LOCAL_DB_USER,
    password: process.env.LOCAL_DB_PASSWORD,
    ssl: false
  }
};

async function connectToDatabase(config) {
  const client = new Client(config);
  await client.connect();
  return client;
}

async function getTableSchemas(client) {
  const query = `
    SELECT 
      table_name,
      column_name,
      data_type,
      is_nullable,
      column_default,
      character_maximum_length,
      numeric_precision,
      numeric_scale
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    ORDER BY table_name, ordinal_position
  `;
  
  const result = await client.query(query);
  return result.rows;
}

async function getTableConstraints(client) {
  const query = `
    SELECT 
      tc.table_name,
      tc.constraint_name,
      tc.constraint_type,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints tc
    LEFT JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
    LEFT JOIN information_schema.constraint_column_usage ccu 
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.table_schema = 'public'
    ORDER BY tc.table_name, tc.constraint_name
  `;
  
  const result = await client.query(query);
  return result.rows;
}

async function getIndexes(client) {
  const query = `
    SELECT 
      tablename,
      indexname,
      indexdef
    FROM pg_indexes 
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname
  `;
  
  const result = await client.query(query);
  return result.rows;
}

async function getFunctions(client) {
  const query = `
    SELECT 
      routine_name,
      routine_definition
    FROM information_schema.routines 
    WHERE routine_schema = 'public'
    ORDER BY routine_name
  `;
  
  const result = await client.query(query);
  return result.rows;
}

async function generateCreateTableSQL(schemas, constraints) {
  const tableGroups = {};
  
  // Group columns by table
  schemas.forEach(col => {
    if (!tableGroups[col.table_name]) {
      tableGroups[col.table_name] = [];
    }
    tableGroups[col.table_name].push(col);
  });
  
  let sql = '';
  
  // Generate CREATE TABLE statements
  Object.keys(tableGroups).forEach(tableName => {
    const columns = tableGroups[tableName];
    const tableConstraints = constraints.filter(c => c.table_name === tableName);
    
    sql += `\n-- Table: ${tableName}\n`;
    sql += `CREATE TABLE IF NOT EXISTS public.${tableName} (\n`;
    
    const columnDefs = columns.map(col => {
      let def = `  ${col.column_name} ${col.data_type}`;
      
      if (col.character_maximum_length) {
        def += `(${col.character_maximum_length})`;
      } else if (col.numeric_precision && col.numeric_scale) {
        def += `(${col.numeric_precision},${col.numeric_scale})`;
      } else if (col.numeric_precision) {
        def += `(${col.numeric_precision})`;
      }
      
      if (col.is_nullable === 'NO') {
        def += ' NOT NULL';
      }
      
      if (col.column_default) {
        def += ` DEFAULT ${col.column_default}`;
      }
      
      return def;
    });
    
    sql += columnDefs.join(',\n');
    
    // Add primary key constraints
    const primaryKeys = tableConstraints.filter(c => c.constraint_type === 'PRIMARY KEY');
    if (primaryKeys.length > 0) {
      const pkColumns = primaryKeys.map(pk => pk.column_name);
      sql += `,\n  PRIMARY KEY (${pkColumns.join(', ')})`;
    }
    
    sql += '\n);\n';
    
    // Add foreign key constraints
    const foreignKeys = tableConstraints.filter(c => c.constraint_type === 'FOREIGN KEY');
    foreignKeys.forEach(fk => {
      sql += `ALTER TABLE public.${tableName} ADD CONSTRAINT ${fk.constraint_name} `;
      sql += `FOREIGN KEY (${fk.column_name}) REFERENCES public.${fk.foreign_table_name}(${fk.foreign_column_name});\n`;
    });
    
    sql += '\n';
  });
  
  return sql;
}

async function generateIndexSQL(indexes) {
  let sql = '\n-- Indexes\n';
  
  indexes.forEach(idx => {
    if (idx.indexname.includes('_pkey')) return; // Skip primary key indexes
    
    sql += `-- ${idx.indexname}\n`;
    sql += `${idx.indexdef};\n\n`;
  });
  
  return sql;
}

async function generateFunctionSQL(functions) {
  let sql = '\n-- Functions\n';
  
  functions.forEach(func => {
    sql += `-- Function: ${func.routine_name}\n`;
    sql += `${func.routine_definition};\n\n`;
  });
  
  return sql;
}

async function cloneStructure() {
  let hostedClient, localClient;
  
  try {
    console.log('🔌 Connecting to hosted Supabase...');
    hostedClient = await connectToDatabase(config.hosted);
    console.log('✅ Connected to hosted Supabase');
    
    console.log('🔌 Connecting to local Supabase...');
    localClient = await connectToDatabase(config.local);
    console.log('✅ Connected to local Supabase');
    
    console.log('📋 Getting table schemas...');
    const schemas = await getTableSchemas(hostedClient);
    console.log(`✅ Found ${schemas.length} columns in ${new Set(schemas.map(s => s.table_name)).size} tables`);
    
    console.log('🔗 Getting table constraints...');
    const constraints = await getTableConstraints(hostedClient);
    console.log(`✅ Found ${constraints.length} constraints`);
    
    console.log('📊 Getting indexes...');
    const indexes = await getIndexes(hostedClient);
    console.log(`✅ Found ${indexes.length} indexes`);
    
    console.log('⚙️ Getting functions...');
    const functions = await getFunctions(hostedClient);
    console.log(`✅ Found ${functions.length} functions`);
    
    console.log('📝 Generating SQL...');
    const createTableSQL = await generateCreateTableSQL(schemas, constraints);
    const indexSQL = await generateIndexSQL(indexes);
    const functionSQL = await generateFunctionSQL(functions);
    
    const fullSQL = createTableSQL + indexSQL + functionSQL;
    
    // Save SQL to file
    const sqlFile = 'cloned_structure.sql';
    fs.writeFileSync(sqlFile, fullSQL);
    console.log(`✅ SQL saved to ${sqlFile}`);
    
    console.log('🚀 Executing SQL on local database...');
    await localClient.query(fullSQL);
    console.log('✅ Database structure cloned successfully!');
    
    console.log('\n🎉 Migration completed!');
    console.log('📁 SQL file saved as: cloned_structure.sql');
    console.log('🔗 Your app is now connected to your self-hosted Supabase');
    
  } catch (error) {
    console.error('❌ Error during migration:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure your self-hosted Supabase is running!');
      console.log('   - Check if Docker is running');
      console.log('   - Check if Supabase is started');
    }
  } finally {
    if (hostedClient) await hostedClient.end();
    if (localClient) await localClient.end();
  }
}

if (require.main === module) {
  cloneStructure().catch(console.error);
}

module.exports = { cloneStructure };



