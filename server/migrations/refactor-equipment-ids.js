import pool from '../db.js'
import Hashids from 'hashids'

const hashids = new Hashids('cirurtec-equipments', 8)

const migrate = async () => {
    let connection
    try {
        connection = await pool.getConnection()
        await connection.beginTransaction()
        console.log('Connected to database.')

        // 1. Drop public_ID column if exists
        const [columns] = await connection.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'equipments' 
            AND COLUMN_NAME = 'public_ID'
        `)

        if (columns.length > 0) {
            console.log('Dropping public_ID column from equipments...')
            await connection.query('ALTER TABLE equipments DROP COLUMN public_ID')
        }

        // 2. Fetch all equipments
        console.log('Fetching equipments...')
        const [equipments] = await connection.query('SELECT id FROM equipments')

        if (equipments.length > 0) {
            console.log(`Found ${equipments.length} equipments to migrate.`)

            for (const eq of equipments) {
                // Generate new HashID
                const uniqueSeed = Date.now() + Math.floor(Math.random() * 100000)
                const newId = hashids.encode(uniqueSeed) // This is now the PRIMARY KEY ID

                console.log(`Migrating equipment ${eq.id} -> ${newId}`)

                // Update ID directly. 
                // Note: If ID is referenced elsewhere, we'd need to update FKs first. 
                // Checks schema: no tables reference equipments.id. So safe to update.

                // We must disable FK checks temporarily if self-referencing (not case here) but standard practice for heavy updates
                await connection.query('SET FOREIGN_KEY_CHECKS=0')
                await connection.query('UPDATE equipments SET id = ? WHERE id = ?', [newId, eq.id])
                await connection.query('SET FOREIGN_KEY_CHECKS=1')
            }
            console.log('Equipments ID migration complete.')
        } else {
            console.log('No equipments found to migrate.')
        }

        await connection.commit()
        console.log('Migration committed successfully.')

    } catch (error) {
        if (connection) await connection.rollback()
        console.error('Migration failed:', error)
    } finally {
        if (connection) connection.release()
        process.exit()
    }
}

migrate()
