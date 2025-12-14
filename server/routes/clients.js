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

// Get all clients
router.get('/', verifyToken, async (req, res) => {
    try {
        const [clients] = await pool.query('SELECT * FROM clients ORDER BY created_at DESC')
        res.json(clients)
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
