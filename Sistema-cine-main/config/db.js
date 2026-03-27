// config/db.js
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('╔════════════════════════════════════╗');
        console.log('║   ✅ CONECTADO A MySQL             ║');
        console.log('╚════════════════════════════════════╝');
        console.log('📊 Base de datos:', process.env.DB_NAME);
        console.log('🌐 Servidor:', process.env.DB_HOST);
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Error conectando a MySQL:', error.message);
        return false;
    }
}

async function initializeAuthData() {
    try {
        await pool.query(
            `CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nombre VARCHAR(120) NOT NULL,
                email VARCHAR(150) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                role ENUM('admin', 'client', 'seller') NOT NULL DEFAULT 'client',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`
        );

        await pool.query(
            "ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'client', 'seller') NOT NULL DEFAULT 'client'"
        );

        const adminEmail = 'admin@gmail.com';
        const adminPassword = 'admin123';
        const adminName = 'Administrador';
        const hash = await bcrypt.hash(adminPassword, 10);

        const [adminRows] = await pool.query("SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1");
        if (adminRows.length === 0) {
            await pool.query(
                'INSERT INTO users (nombre, email, password_hash, role) VALUES (?, ?, ?, ?)',
                [adminName, adminEmail, hash, 'admin']
            );
            console.log('👤 Usuario admin creado:', adminEmail);
        } else {
            await pool.query(
                "UPDATE users SET nombre = ?, email = ?, password_hash = ? WHERE id = ? AND role = 'admin'",
                [adminName, adminEmail, hash, adminRows[0].id]
            );
            console.log('👤 Credenciales de admin actualizadas:', adminEmail);
        }
    } catch (error) {
        console.error('❌ Error inicializando usuarios:', error.message);
    }
}

module.exports = { pool, testConnection, initializeAuthData };
