// db/sql.js
import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

let pool;

function buildSQLConfig() {
  // תומך ב: "localhost", או "localhost\\SQLEXPRESS"
  let server = process.env.SQL_HOST || 'localhost';
  let instanceName = undefined;

  if (server.includes('\\')) {
    const [host, instance] = server.split('\\');
    server = host;
    instanceName = instance;
  }

  const config = {
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    server,
    database: process.env.SQL_DB,
    options: {
      encrypt: false,
      enableArithAbort: true,
      trustServerCertificate: true,
      ...(instanceName ? { instanceName } : {})
    }
    // אם את עובדת עם פורט קבוע ל-SQLEXPRESS, אפשר להוסיף socketOptions.port
  };

  return config;
}

export const getSQLPool = async () => {
  if (pool) return pool;
  try {
    pool = await sql.connect(buildSQLConfig());
    console.log('✅ Connected to SQL Server');
    return pool;
  } catch (err) {
    console.error('❌ SQL connection failed:', err.message);
    throw err;
  }
};
