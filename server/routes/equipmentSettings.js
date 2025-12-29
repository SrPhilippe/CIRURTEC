
import express from 'express'
import pool from '../db.js'

const router = express.Router()

// GET all types with their models
router.get('/types', async (req, res) => {
    const connection = await pool.getConnection()
    try {
        const [types] = await connection.query('SELECT * FROM equipment_types ORDER BY name')

        // For each type, fetch its models
        // Optimisation: We could do a JOIN, but for simplicity/hierarchy building, two queries is fine or a single join.
        // Let's do a LEFT JOIN to get everything in one go.

        const [rows] = await connection.query(`
            SELECT t.id as type_id, t.name as type_name, m.id as model_id, m.name as model_name
            FROM equipment_types t
            LEFT JOIN equipment_models m ON t.id = m.type_id
            ORDER BY t.name, m.name
        `)

        // Transform flat rows into hierarchy
        const hierarchy = []
        const typeMap = new Map()

        rows.forEach(row => {
            if (!typeMap.has(row.type_id)) {
                const newType = {
                    id: row.type_id,
                    name: row.type_name,
                    models: []
                }
                hierarchy.push(newType)
                typeMap.set(row.type_id, newType)
            }

            if (row.model_id) {
                typeMap.get(row.type_id).models.push({
                    id: row.model_id,
                    name: row.model_name,
                    type_id: row.type_id
                })
            }
        })

        res.json(hierarchy)
    } catch (error) {
        console.error('Error fetching equipment hierarchy:', error)
        res.status(500).json({ error: 'Failed to fetch equipment hierarchy' })
    } finally {
        connection.release()
    }
})

// POST create a new type
router.post('/types', async (req, res) => {
    const { name } = req.body
    if (!name) return res.status(400).json({ error: 'Name is required' })

    const connection = await pool.getConnection()
    try {
        const [result] = await connection.query('INSERT INTO equipment_types (name) VALUES (?)', [name])
        res.status(201).json({ id: result.insertId, name, models: [] })
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Equipment type already exists' })
        }
        console.error('Error creating equipment type:', error)
        res.status(500).json({ error: 'Failed to create equipment type' })
    } finally {
        connection.release()
    }
})

// POST create a new model for a type
router.post('/models', async (req, res) => {
    const { name, type_id } = req.body
    if (!name || !type_id) return res.status(400).json({ error: 'Name and Type ID are required' })

    const connection = await pool.getConnection()
    try {
        const [result] = await connection.query(
            'INSERT INTO equipment_models (name, type_id) VALUES (?, ?)',
            [name, type_id]
        )
        res.status(201).json({ id: result.insertId, name, type_id })
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Model name already exists for this type' })
        }
        console.error('Error creating equipment model:', error)
        res.status(500).json({ error: 'Failed to create equipment model' })
    } finally {
        connection.release()
    }
})

// DELETE a type (Cascades to models due to DB schema)
router.delete('/types/:id', async (req, res) => {
    const { id } = req.params
    const connection = await pool.getConnection()
    try {
        await connection.query('DELETE FROM equipment_types WHERE id = ?', [id])
        res.json({ message: 'Type deleted successfully' })
    } catch (error) {
        console.error('Error deleting equipment type:', error)
        res.status(500).json({ error: 'Failed to delete equipment type' })
    } finally {
        connection.release()
    }
})

// DELETE a model
router.delete('/models/:id', async (req, res) => {
    const { id } = req.params
    const connection = await pool.getConnection()
    try {
        await connection.query('DELETE FROM equipment_models WHERE id = ?', [id])
        res.json({ message: 'Model deleted successfully' })
    } catch (error) {
        console.error('Error deleting equipment model:', error)
        res.status(500).json({ error: 'Failed to delete equipment model' })
    } finally {
        connection.release()
    }
})

// PUT update a type name
router.put('/types/:id', async (req, res) => {
    const { id } = req.params
    const { name } = req.body
    if (!name) return res.status(400).json({ error: 'Name is required' })

    const connection = await pool.getConnection()
    try {
        await connection.query('UPDATE equipment_types SET name = ? WHERE id = ?', [name, id])
        res.json({ id, name })
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Equipment type already exists' })
        }
        console.error('Error updating equipment type:', error)
        res.status(500).json({ error: 'Failed to update equipment type' })
    } finally {
        connection.release()
    }
})

// PUT update a model name
router.put('/models/:id', async (req, res) => {
    const { id } = req.params
    const { name } = req.body
    if (!name) return res.status(400).json({ error: 'Name is required' })

    const connection = await pool.getConnection()
    try {
        await connection.query('UPDATE equipment_models SET name = ? WHERE id = ?', [name, id])
        res.json({ id, name })
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Model name already exists for this type' })
        }
        console.error('Error updating equipment model:', error)
        res.status(500).json({ error: 'Failed to update equipment model' })
    } finally {
        connection.release()
    }
})

export default router
