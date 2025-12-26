import pool from '../db.js'

const verify = async () => {
    try {
        const [clients] = await pool.query('SELECT id, nome_hospital, public_ID FROM clients LIMIT 5')
        console.log('--- Clients ---')
        console.table(clients)

        const [equipments] = await pool.query('SELECT id, equipamento, public_ID FROM equipments LIMIT 5')
        console.log('--- Equipments ---')
        console.table(equipments)

    } catch (error) {
        console.error(error)
    } finally {
        process.exit()
    }
}

verify()
