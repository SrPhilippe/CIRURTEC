
import pool from '../db.js'

async function migrate() {
    const connection = await pool.getConnection()
    try {
        console.log('Starting migration: create-equipment-hierarchy-tables')

        await connection.beginTransaction()

        // Create equipment_types table
        await connection.query(`
      CREATE TABLE IF NOT EXISTS equipment_types (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `)
        console.log('Created equipment_types table')

        // Create equipment_models table
        await connection.query(`
      CREATE TABLE IF NOT EXISTS equipment_models (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (type_id) REFERENCES equipment_types(id) ON DELETE CASCADE,
        UNIQUE KEY unique_model_per_type (name, type_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `)
        console.log('Created equipment_models table')

        await connection.commit()
        console.log('Migration completed successfully')
    } catch (error) {
        await connection.rollback()
        console.error('Migration failed:', error)
        process.exit(1)
    } finally {
        connection.release()
        process.exit(0)
    }
}

migrate()
