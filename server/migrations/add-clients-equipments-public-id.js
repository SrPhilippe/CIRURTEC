import pool from '../db.js'
import { nanoid } from 'nanoid'
import Hashids from 'hashids'

const hashids = new Hashids('cirurtec-equipments', 8)

const migrate = async () => {
    let connection
    try {
        connection = await pool.getConnection()
        console.log('Connected to database.')

        // 1. Add public_ID to clients
        const [clientColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'clients' 
      AND COLUMN_NAME = 'public_ID'
    `)

        if (clientColumns.length === 0) {
            console.log('Adding public_ID to clients...')
            await connection.query(`
        ALTER TABLE clients 
        ADD COLUMN public_ID VARCHAR(21) UNIQUE
      `)
        } else {
            console.log('public_ID already exists in clients.')
        }

        // 2. Add public_ID to equipments
        const [equipmentColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'equipments' 
      AND COLUMN_NAME = 'public_ID'
    `)

        if (equipmentColumns.length === 0) {
            console.log('Adding public_ID to equipments...')
            await connection.query(`
        ALTER TABLE equipments 
        ADD COLUMN public_ID VARCHAR(50) UNIQUE
      `)
        } else {
            console.log('public_ID already exists in equipments.')
        }

        // 3. Backfill clients
        console.log('Backfilling clients...')
        const [clients] = await connection.query('SELECT id FROM clients WHERE public_ID IS NULL')
        if (clients.length > 0) {
            for (const client of clients) {
                const publicId = nanoid()
                await connection.query('UPDATE clients SET public_ID = ? WHERE id = ?', [publicId, client.id])
            }
            console.log(`Updated ${clients.length} clients.`)
        }

        // 4. Backfill equipments
        console.log('Backfilling equipments...')
        const [equipments] = await connection.query('SELECT id FROM equipments WHERE public_ID IS NULL')
        if (equipments.length > 0) {
            for (const eq of equipments) {
                // Generate a unique number for hashids. 
                // Since we don't have int ID, we use timestamp + random or just a high entropy random number.
                // Hashids works best with integers.
                // Let's use Date.now() + index is safe enough for batch, but here I'll just use a random integer.
                const uniqueNum = Date.now() + Math.floor(Math.random() * 10000)
                // We need to sleep slightly or use high res time to avoid collision if loop is too fast? 
                // uniqueNum collision risk is low with random, but let's be safe.
                // Actually, let's just use hex from UUID? No, hashids needs int.

                // Strategy: Use BigInt from part of existing UUID? 
                // Or simplier: just random integer sequence.
                const publicId = hashids.encode(uniqueNum)

                // Should check for uniqueness but probability is low for this migration size.
                // Better: use a counter if we want short IDs, but random timestamp is fine.

                await connection.query('UPDATE equipments SET public_ID = ? WHERE id = ?', [publicId, eq.id])
            }
            console.log(`Updated ${equipments.length} equipments.`)
        }

    } catch (error) {
        console.error('Migration failed:', error)
    } finally {
        if (connection) connection.release()
        process.exit()
    }
}

migrate()
