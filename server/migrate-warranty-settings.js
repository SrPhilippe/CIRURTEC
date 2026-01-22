import pool from './db.js'

const migrate = async () => {
    let connection
    try {
        connection = await pool.getConnection()
        console.log('Starting migration: Adding receive_warranty_emails to users...')

        // Check if column exists
        const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'receive_warranty_emails'
    `)

        if (columns.length === 0) {
            await connection.query(`
        ALTER TABLE users 
        ADD COLUMN receive_warranty_emails BOOLEAN DEFAULT FALSE
      `)
            console.log('✅ Column receive_warranty_emails added successfully.')
        } else {
            console.log('ℹ️ Column receive_warranty_emails already exists.')
        }

        console.log('Migration completed.')
    } catch (error) {
        console.error('❌ Migration failed:', error)
    } finally {
        if (connection) connection.release()
        process.exit()
    }
}

migrate()
