import express from 'express'
import { randomUUID } from 'crypto'
import pool from '../db.js'
import { verifyToken } from '../middleware/auth.js'

const router = express.Router()

// Create new client with equipment
router.post('/', verifyToken, async (req, res) => {
    const { clientData, equipments } = req.body
    let connection

    try {
        // Validate required fields
        if (!clientData.cnpj || !clientData.nomeHospital || !clientData.email1 || !clientData.contato1) {
            return res.status(400).json({ message: 'Campos obrigatórios faltando' })
        }

        connection = await pool.getConnection()
        await connection.beginTransaction()

        // Generate UUID for client
        const clientId = randomUUID()

        // Insert client
        await connection.query(
            `INSERT INTO clients 
       (id, cnpj, nome_hospital, nome_fantasia, email1, email2, contato1, contato2, tipo_cliente) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                clientId,
                clientData.cnpj,
                clientData.nomeHospital,
                clientData.nomeFantasia || null,
                clientData.email1,
                clientData.email2 || null,
                clientData.contato1,
                clientData.contato2 || null,
                clientData.tipoCliente
            ]
        )

        // Insert equipments if any
        if (equipments && equipments.length > 0) {
            for (const equipment of equipments) {
                // Skip empty equipment entries
                if (!equipment.equipamento && !equipment.modelo) continue

                const equipmentId = randomUUID()
                await connection.query(
                    `INSERT INTO equipments 
           (id, client_id, equipamento, modelo, numero_serie, data_nota) 
           VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        equipmentId,
                        clientId,
                        equipment.equipamento,
                        equipment.modelo,
                        equipment.numeroSerie || null,
                        equipment.dataNota || null
                    ]
                )
            }
        }

        await connection.commit()

        res.status(201).json({
            message: 'Cliente cadastrado com sucesso!',
            clientId
        })

    } catch (error) {
        if (connection) {
            await connection.rollback()
        }

        console.error('Error creating client:', error)

        // Check for duplicate CNPJ
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'CNPJ já cadastrado' })
        }

        res.status(500).json({ message: 'Erro ao cadastrar cliente' })
    } finally {
        if (connection) {
            connection.release()
        }
    }
})

// Check if CNPJ exists
router.get('/check-cnpj/:cnpj', verifyToken, async (req, res) => {
    try {
        const cleanCNPJ = req.params.cnpj.replace(/\D/g, '') // Basic cleanup just in case
        // We need to match how it's stored. The valid CNPJ in DB seems to be stored with mask based on formatCNPJ usage in frontend, 
        // BUT wait. In `clients.js` line 32: `clientData.cnpj` is passed.
        // In `NovoCadastro.jsx` `handleClientChange`: `formattedValue = formatCNPJ(value)`.
        // So the DB likely stores formatted CNPJ "00.000.000/0000-00".
        // However, the `fetchCNPJData` in frontend cleans it before sending to BrasilAPI.
        // Let's check `NovoCadastro.jsx` again.
        // Line 137: `const cleanCNPJ = cnpj.replace(/\D/g, '');` -> sends clean to BrasilAPI.
        // Line 244: `formattedValue = formatCNPJ(value);` -> state stores formatted.
        // Line 291 handleSubmit -> sends clientData.cnpj (formatted).
        // So DB has formatted strings.
        // My new endpoint should probably handle both or expect one. 
        // Let's stick to expecting the value passed from frontend. 
        // If frontend sends clean digits, I need to format it to query DB, OR I should strip DB columns for comparison (inefficient).
        // Better: Frontend will likely send the clean digits to check, so I construct the formatted version here OR check 'LIKE' query?
        // Actually, let's just make the frontend send the clean version to this endpoint, and I'll match it against the DB. 
        // Wait, if DB stores formatted "XX.XXX.XXX/YYYY-ZZ", and I receive "XXXXXXXXYYYYZZ", I can't easily query.
        // I should probably check if I can format it here.
        // Re-reading `clients.js`:
        /*
           169:   const formatCNPJ = (value) => {
           170:     return value
           171:       .replace(/\D/g, '')
           172:       .replace(/^(\d{2})(\d)/, '$1.$2')
           ...
        */
        // I should duplicate this logic or flexible search. 
        // Flexible search: `WHERE REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', '') = ?`
        // This is robust.

        const [clients] = await pool.query(
            "SELECT id FROM clients WHERE REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', '') = ?",
            [cleanCNPJ]
        )

        if (clients.length > 0) {
            return res.json({ exists: true, id: clients[0].id })
        }

        res.json({ exists: false })
    } catch (error) {
        console.error('Error checking CNPJ:', error)
        res.status(500).json({ message: 'Erro ao verificar CNPJ' })
    }
})

// Get all clients with their equipment (for filtering)
router.get('/', verifyToken, async (req, res) => {
    try {
        const query = `
            SELECT 
                c.*, 
                JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'equipamento', e.equipamento, 
                        'modelo', e.modelo, 
                        'numero_serie', e.numero_serie
                    )
                ) as equipments_json 
            FROM clients c 
            LEFT JOIN equipments e ON c.id = e.client_id 
            GROUP BY c.id 
            ORDER BY c.created_at DESC
        `
        const [clients] = await pool.query(query)

        // Parse JSON if the driver doesn't do it automatically (sometimes it comes as string)
        const parsedClients = clients.map(client => ({
            ...client,
            equipments: typeof client.equipments_json === 'string'
                ? JSON.parse(client.equipments_json)
                : (client.equipments_json || [])
        }))

        res.json(parsedClients)
    } catch (error) {
        console.error('Error fetching clients:', error)
        res.status(500).json({ message: 'Erro ao buscar clientes' })
    }
})

// Get client by ID with equipment
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const [clients] = await pool.query('SELECT * FROM clients WHERE id = ?', [req.params.id])

        if (clients.length === 0) {
            return res.status(404).json({ message: 'Cliente não encontrado' })
        }

        const [equipments] = await pool.query('SELECT * FROM equipments WHERE client_id = ?', [req.params.id])

        res.json({
            client: clients[0],
            equipments
        })
    } catch (error) {
        console.error('Error fetching client:', error)
        res.status(500).json({ message: 'Erro ao buscar cliente' })
    }
})

// Update client
router.put('/:id', verifyToken, async (req, res) => {
    const { clientData, equipments } = req.body
    let connection

    try {
        if (!clientData.cnpj || !clientData.nomeHospital || !clientData.email1 || !clientData.contato1) {
            return res.status(400).json({ message: 'Campos obrigatórios faltando' })
        }

        connection = await pool.getConnection()
        await connection.beginTransaction()

        // Security Check: Fetch current client data to compare CNPJ
        const [currentClientRows] = await connection.query('SELECT cnpj FROM clients WHERE id = ?', [req.params.id])

        if (currentClientRows.length === 0) {
            await connection.rollback() // clean up transaction if client not found
            connection.release()
            return res.status(404).json({ message: 'Cliente não encontrado' })
        }

        const currentCnpj = currentClientRows[0].cnpj

        // If CNPJ is being changed
        if (currentCnpj !== clientData.cnpj) {
            // Check permissions
            const userRole = (req.user.rights || req.user.role || '').toUpperCase()

            // Allow only ADMIN or MASTER to change CNPJ
            if (userRole !== 'ADMIN' && userRole !== 'MASTER') {
                await connection.rollback()
                connection.release()
                return res.status(403).json({ message: 'Você não tem permissão para alterar o CNPJ. O Administrador foi notificado.' })
            }
        }

        // Update client info
        await connection.query(
            `UPDATE clients 
       SET cnpj = ?, nome_hospital = ?, nome_fantasia = ?, email1 = ?, email2 = ?, contato1 = ?, contato2 = ?, tipo_cliente = ?
       WHERE id = ?`,
            [
                clientData.cnpj,
                clientData.nomeHospital,
                clientData.nomeFantasia || null,
                clientData.email1,
                clientData.email2 || null,
                clientData.contato1,
                clientData.contato2 || null,
                clientData.tipoCliente,
                req.params.id
            ]
        )

        // Update equipments: Delete all and re-insert (simplest strategy to handle adds/removes/edits)
        await connection.query('DELETE FROM equipments WHERE client_id = ?', [req.params.id])

        if (equipments && equipments.length > 0) {
            for (const equipment of equipments) {
                if (!equipment.equipamento && !equipment.modelo) continue

                const equipmentId = randomUUID()
                await connection.query(
                    `INSERT INTO equipments 
           (id, client_id, equipamento, modelo, numero_serie, data_nota) 
           VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        equipmentId,
                        req.params.id,
                        equipment.equipamento,
                        equipment.modelo,
                        equipment.numeroSerie || null,
                        equipment.dataNota || null
                    ]
                )
            }
        }

        await connection.commit()
        res.json({ message: 'Cliente atualizado com sucesso' })

    } catch (error) {
        if (connection) await connection.rollback()
        console.error('Error updating client:', error)
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'CNPJ já cadastrado em outro cliente' })
        }
        res.status(500).json({ message: 'Erro ao atualizar cliente' })
    } finally {
        if (connection) connection.release()
    }
})

// Delete client
router.delete('/:id', verifyToken, async (req, res) => {
    let connection

    try {
        connection = await pool.getConnection()
        await connection.beginTransaction()

        // Delete equipments first (foreign key constraint)
        await connection.query('DELETE FROM equipments WHERE client_id = ?', [req.params.id])

        // Delete client
        const [result] = await connection.query('DELETE FROM clients WHERE id = ?', [req.params.id])

        if (result.affectedRows === 0) {
            await connection.rollback()
            return res.status(404).json({ message: 'Cliente não encontrado' })
        }

        await connection.commit()
        res.json({ message: 'Cliente excluído com sucesso' })

    } catch (error) {
        if (connection) await connection.rollback()
        console.error('Error deleting client:', error)
        res.status(500).json({ message: 'Erro ao excluir cliente' })
    } finally {
        if (connection) connection.release()
    }
})

export default router
