import pool from '../db.js'
import { randomUUID } from 'crypto'

const createClientsTables = async () => {
    let connection

    try {
        connection = await pool.getConnection()

        console.log('Starting database migration...')

        // Start transaction
        await connection.beginTransaction()

        // Create clients table
        console.log('Creating clients table...')
        await connection.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id VARCHAR(36) PRIMARY KEY,
        cnpj VARCHAR(18) NOT NULL UNIQUE,
        nome_hospital VARCHAR(255) NOT NULL,
        nome_fantasia VARCHAR(255),
        email1 VARCHAR(100) NOT NULL,
        email2 VARCHAR(100),
        contato1 VARCHAR(20) NOT NULL,
        contato2 VARCHAR(20),
        tipo_cliente ENUM('CEMIG', 'CIRURTEC') NOT NULL DEFAULT 'CEMIG',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_cnpj (cnpj),
        INDEX idx_nome_hospital (nome_hospital)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

        // Create equipments table
        console.log('Creating equipments table...')
        await connection.query(`
      CREATE TABLE IF NOT EXISTS equipments (
        id VARCHAR(36) PRIMARY KEY,
        client_id VARCHAR(36) NOT NULL,
        equipamento VARCHAR(100) NOT NULL,
        modelo VARCHAR(100) NOT NULL,
        numero_serie VARCHAR(100),
        data_nota VARCHAR(10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
        INDEX idx_client_id (client_id),
        INDEX idx_numero_serie (numero_serie)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

        // Commit transaction
        await connection.commit()

        console.log('✅ Migration completed successfully!')
        console.log('Tables created:')
        console.log('  - clients (with UUID primary key)')
        console.log('  - equipments (with UUID primary key and foreign key to clients)')

    } catch (error) {
        // Rollback on error
        if (connection) {
            await connection.rollback()
        }
        console.error('❌ Migration failed:', error.message)
        throw error
    } finally {
        if (connection) {
            connection.release()
        }
        // Close pool to allow script to exit
        await pool.end()
    }
}

// Run migration
createClientsTables()
    .then(() => {
        console.log('Migration script finished.')
        process.exit(0)
    })
    .catch((error) => {
        console.error('Migration script failed:', error)
        process.exit(1)
    })
