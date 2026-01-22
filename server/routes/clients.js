import express from 'express'
import { randomUUID } from 'crypto'
import pool from '../db.js'
import { verifyToken } from '../middleware/auth.js'
import { nanoid } from 'nanoid'
import Hashids from 'hashids'

const hashids = new Hashids('cirurtec-equipments', 8)

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

        // Generate UUID for client and public_ID
        const clientId = randomUUID()
        const clientPublicId = nanoid()

        // Insert client
        await connection.query(
            `INSERT INTO clients 
       (id, cnpj, nome_hospital, nome_fantasia, email1, email2, contato1, contato2, public_ID) 
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
                clientPublicId
            ]
        )

        // Insert equipments if any
        if (equipments && equipments.length > 0) {
            for (const equipment of equipments) {
                // Skip empty equipment entries
                if (!equipment.equipamento && !equipment.modelo) continue

                // Generate HashID for equipment ID
                const equipmentId = hashids.encode(Date.now() + Math.floor(Math.random() * 100000))

                await connection.query(
                    `INSERT INTO equipments 
           (id, client_id, equipamento, modelo, numero_serie, data_nota, tipo_instalacao) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        equipmentId,
                        clientId,
                        equipment.equipamento,
                        equipment.modelo,
                        equipment.numeroSerie || null,
                        equipment.dataNota || null,
                        equipment.tipoInstalacao || 'CEMIG'
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

// Check if CNPJ exists (and return ID if needed)
router.get('/check-cnpj/:cnpj', verifyToken, async (req, res) => {
    try {
        const cleanCNPJ = req.params.cnpj.replace(/\D/g, '')

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

// Helper to find client ID from param (UUID, public_ID, or CNPJ)
const resolveClientId = async (param) => {
    // 1. If it looks like UUID, try UUID first
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(param)) {
        return param
    }

    // 2. Try strict match on public_ID (21 chars) OR clean CNPJ lookup
    const cleanParam = param.replace(/\D/g, '')

    // Construct query to search all 3 possibilities for robustness
    // If it's a CNPJ (mostly digits), cleanParam will be populated
    // If it's public_ID, param is preserved

    let query = "SELECT id FROM clients WHERE id = ? OR public_ID = ?"
    let params = [param, param]

    if (cleanParam.length > 5) { // Assuming CNPJ part has significant digits
        query += " OR REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', '') = ?"
        params.push(cleanParam)
    }

    // Execute search
    const [clients] = await pool.query(query, params)

    if (clients.length > 0) return clients[0].id
    return null
}

// Get all clients with their equipment (for filtering)
router.get('/', verifyToken, async (req, res) => {
    try {
        const query = `
            SELECT 
                c.*, 
                JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'id', e.id,
                        'equipamento', e.equipamento, 
                        'modelo', e.modelo, 
                        'numero_serie', e.numero_serie,
                        'tipo_instalacao', e.tipo_instalacao
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

// Get client by ID (or public_ID/CNPJ) with equipment
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const id = await resolveClientId(req.params.id)

        if (!id) {
            return res.status(404).json({ message: 'Cliente não encontrado' })
        }

        const [clients] = await pool.query('SELECT * FROM clients WHERE id = ?', [id])

        if (clients.length === 0) {
            return res.status(404).json({ message: 'Cliente não encontrado' })
        }

        const [equipments] = await pool.query('SELECT * FROM equipments WHERE client_id = ?', [id])

        // Fetch sent notifications for these equipments
        if (equipments.length > 0) {
            const equipmentIds = equipments.map(e => e.id)
            const [notifications] = await pool.query(
                'SELECT equipment_id, interval_months FROM sent_notifications WHERE equipment_id IN (?) AND status = "SUCCESS"',
                [equipmentIds]
            )

            // Attach notifications to equipments
            equipments.forEach(eq => {
                eq.sentNotifications = notifications
                    .filter(n => n.equipment_id === eq.id)
                    .map(n => n.interval_months)
            })
        }

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
        const id = await resolveClientId(req.params.id)
        if (!id) return res.status(404).json({ message: 'Cliente não encontrado' })

        if (!clientData.cnpj || !clientData.nomeHospital || !clientData.email1 || !clientData.contato1) {
            return res.status(400).json({ message: 'Campos obrigatórios faltando' })
        }

        connection = await pool.getConnection()
        await connection.beginTransaction()

        // Security Check: Fetch current client data to compare CNPJ
        const [currentClientRows] = await connection.query('SELECT cnpj FROM clients WHERE id = ?', [id])

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
       SET cnpj = ?, nome_hospital = ?, nome_fantasia = ?, email1 = ?, email2 = ?, contato1 = ?, contato2 = ?
       WHERE id = ?`,
            [
                clientData.cnpj,
                clientData.nomeHospital,
                clientData.nomeFantasia || null,
                clientData.email1,
                clientData.email2 || null,
                clientData.contato1,
                clientData.contato2 || null,
                id
            ]
        )

        // Update equipments: Delete all and re-insert (simplest strategy to handle adds/removes/edits)
        await connection.query('DELETE FROM equipments WHERE client_id = ?', [id])

        if (equipments && equipments.length > 0) {
            for (const equipment of equipments) {
                if (!equipment.equipamento && !equipment.modelo) continue

                const equipmentId = hashids.encode(Date.now() + Math.floor(Math.random() * 100000))

                await connection.query(
                    `INSERT INTO equipments 
           (id, client_id, equipamento, modelo, numero_serie, data_nota, tipo_instalacao) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        equipmentId,
                        id,
                        equipment.equipamento,
                        equipment.modelo,
                        equipment.numeroSerie || null,
                        equipment.dataNota || null,
                        equipment.tipoInstalacao || 'CEMIG'
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
        const id = await resolveClientId(req.params.id)
        if (!id) return res.status(404).json({ message: 'Cliente não encontrado' })

        connection = await pool.getConnection()
        await connection.beginTransaction()

        // Delete equipments first (foreign key constraint)
        await connection.query('DELETE FROM equipments WHERE client_id = ?', [id])

        // Delete client
        const [result] = await connection.query('DELETE FROM clients WHERE id = ?', [id])

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
