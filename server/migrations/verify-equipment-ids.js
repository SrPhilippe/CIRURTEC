import pool from '../db.js'

const verify = async () => {
    try {
        const [equipments] = await pool.query('SELECT id, equipamento, client_id FROM equipments LIMIT 10')
        console.log('--- Equipments (ID is now HashID) ---')
        console.table(equipments)

        // Check if public_ID is gone
        const [columns] = await pool.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'equipments' 
            AND COLUMN_NAME = 'public_ID'
        `)

        if (columns.length === 0) {
            console.log('✅ public_ID column removed from equipments.')
        } else {
            console.error('❌ public_ID column still exists!')
        }

    } catch (error) {
        console.error(error)
    } finally {
        process.exit()
    }
}

verify()
