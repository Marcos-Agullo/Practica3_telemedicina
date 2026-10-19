let db;

if (process.env.DATABASE_URL) {
    console.log("Conectando a base de datos PostgreSQL en la Nube (Supabase)...");
    const { Pool } = require("pg");
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    db = {
        async query(sql, params) {
            let paramIndex = 1;
            let pgSql = sql.replace(/\?/g, () => "$" + (paramIndex++));
            const isInsert = /^\s*insert\s+into/i.test(pgSql);
            const isUpdateOrDelete = /^\s*(update|delete)/i.test(pgSql);

            if (isInsert && !/returning/i.test(pgSql)) {
                pgSql += " RETURNING id";
            }

            const res = await pool.query(pgSql, params || []);

            if (isInsert) {
                const insertResult = {
                    affectedRows: res.rowCount,
                    insertId: res.rows && res.rows.length > 0 && res.rows[0].id ? res.rows[0].id : 0
                };
                return [insertResult, res.fields];
            } else if (isUpdateOrDelete) {
                const modResult = {
                    affectedRows: res.rowCount
                };
                return [modResult, res.fields];
            } else {
                return [res.rows, res.fields];
            }
        }
    };
} else {
    console.log("Conectando a base de datos MariaDB local...");
    const mysql = require("mysql2/promise");
    db = mysql.createPool({
        host: "localhost",
        port: 3306,
        user: "root",
        database: "datos_practica_distribuidos",
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
}

module.exports = db;