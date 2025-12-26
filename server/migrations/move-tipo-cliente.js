import pool from '../db.js'

const migrate = async () => {
    let connection
    try {
        connection = await pool.getConnection()
        console.log('Connected to database.')

        // 1. Add tipo_instalacao to equipments
        const [equipmentColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'equipments' 
      AND COLUMN_NAME = 'tipo_instalacao'
    `)

        if (equipmentColumns.length === 0) {
            console.log('Adding tipo_instalacao to equipments...')
            await connection.query(`
        ALTER TABLE equipments 
        ADD COLUMN tipo_instalacao ENUM('CEMIG', 'CIRURTEC', 'BAUMER') DEFAULT 'CEMIG'
      `)
        } else {
            console.log('tipo_instalacao already exists in equipments.')
        }

        // 2. Backfill equipments with value from clients
        console.log('Backfilling equipments types from clients...')
        // We do a join update. syntax: UPDATE equipments e JOIN clients c ON e.client_id = c.id SET e.tipo_instalacao = c.tipo_cliente
        // Check if tipo_cliente exists in clients first to avoid error if re-running
        const [clientColumns] = await connection.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'clients' 
            AND COLUMN_NAME = 'tipo_cliente'
        `)

        if (clientColumns.length > 0) {
            await connection.query(`
                UPDATE equipments e 
                JOIN clients c ON e.client_id = c.id 
                SET e.tipo_instalacao = c.tipo_cliente
            `)
            console.log('Backfill complete.')

            // 3. Drop tipo_cliente from clients
            console.log('Dropping tipo_cliente from clients...')
            await connection.query(`
                ALTER TABLE clients 
                DROP COLUMN tipo_cliente
            `)
            console.log('Dropped tipo_cliente from clients.')
        } else {
            console.log('tipo_cliente column not found in clients (already dropped?). Skipping backfill and drop.')
        }

    } catch (error) {
        console.error('Migration failed:', error)
    } finally {
        if (connection) connection.release()
        process.exit()
    }
}

migrate()
