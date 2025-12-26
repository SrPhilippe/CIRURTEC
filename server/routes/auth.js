import express from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import pool from '../db.js'
import { verifyToken, verifyAdmin } from '../middleware/auth.js'
import { nanoid } from 'nanoid'

const router = express.Router()

// Check Username Availability
router.get('/check-username/:username', verifyToken, async (req, res) => {
    try {
        const [users] = await pool.query('SELECT id FROM users WHERE username = ?', [req.params.username])
        res.json({ exists: users.length > 0 })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Error checking username' })
    }
})

// Check Email Availability
router.get('/check-email/:email', verifyToken, async (req, res) => {
    try {
        const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [req.params.email])
        res.json({ exists: users.length > 0 })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Error checking email' })
    }
})

// Login
router.post('/login', async (req, res) => {
    const { usernameOrEmail, password } = req.body

    try {
        const [users] = await pool.query(
            'SELECT * FROM users WHERE username = ? OR email = ?',
            [usernameOrEmail, usernameOrEmail]
        )

        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' })
        }

        const user = users[0]
        const passwordIsValid = bcrypt.compareSync(password, user.password)

        if (!passwordIsValid) {
            return res.status(401).json({ message: 'Invalid Password' })
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, rights: user.rights, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        )

        res.status(200).send({
            id: user.id,
            public_id: user.public_ID,
            username: user.username,
            email: user.email,
            rights: user.rights,
            role: user.role,
            accessToken: token
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Internal Server Error' })
    }
})

// Register (Protected)
router.post('/register', [verifyToken, verifyAdmin], async (req, res) => {
    const { username, email, password, role, rights } = req.body

    // Validation
    if (username.length > 16) return res.status(400).json({ message: 'Username max 16 characters' })
    if (/\s/.test(username)) return res.status(400).json({ message: 'Username cannot contain spaces' })
    if (!/^[a-zA-Z0-9._-]+$/.test(username)) return res.status(400).json({ message: 'Username contains invalid characters' })
    if (password.length > 24) return res.status(400).json({ message: 'Password max 24 characters' })

    try {
        // Check if user exists
        const [existingUsers] = await pool.query(
            'SELECT * FROM users WHERE username = ? OR email = ?',
            [username, email]
        )

        if (existingUsers.length > 0) {
            return res.status(400).json({ message: 'Username or Email already in use' })
        }

        const hashedPassword = bcrypt.hashSync(password, 8)
        const validRights = ['ADMIN', 'Master', 'Padrão']
        const userRights = validRights.includes(rights) ? rights : 'Padrão'
        const publicId = nanoid()

        await pool.query(
            'INSERT INTO users (username, email, password, role, rights, public_ID) VALUES (?, ?, ?, ?, ?, ?)',
            [username, email, hashedPassword, role, userRights, publicId]
        )

        res.status(201).json({ message: 'User registered successfully!' })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Internal Server Error' })
    }
})

// Get Current User
router.get('/me', verifyToken, async (req, res) => {
    try {
        const [users] = await pool.query('SELECT id, public_ID, username, email, rights, role FROM users WHERE id = ?', [req.user.id])
        if (users.length === 0) return res.status(404).json({ message: 'User not found' })
        res.json(users[0])
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user' })
    }
})

// Get All Users (Admin Only)
router.get('/users', [verifyToken, verifyAdmin], async (req, res) => {
    try {
        const [users] = await pool.query('SELECT id, public_ID, username, email, role, rights, created_at FROM users')
        res.json(users)
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Erro ao buscar usuários' })
    }
})

// Update User Profile
router.put('/users/:idOrPublicId', verifyToken, async (req, res) => {
    const { idOrPublicId } = req.params
    const { username, email, password } = req.body

    // Validation - only validate if fields are provided
    if (username !== undefined) {
        if (username.length > 16) return res.status(400).json({ message: 'Usuário max 16 caracteres' })
        if (/\s/.test(username)) return res.status(400).json({ message: 'Usuário não pode conter espaço' })
        if (!/^[a-zA-Z0-9._-]+$/.test(username)) return res.status(400).json({ message: 'Usuário contém caracteres inválidos' })
    }
    if (password && password.length > 24) return res.status(400).json({ message: 'Senha max 24 caracteres' })

    let connection
    try {
        let userId = idOrPublicId

        // Resolve public_ID to ID if necessary
        // Check if it's numeric (ID) or string (public_ID)
        // Simple check: if it contains non-digits, it's public_ID (except typical public_ID doesn't look like number anyway)
        // NanoID is 21 chars, ID is int.

        if (isNaN(idOrPublicId)) {
            const [users] = await pool.query('SELECT id FROM users WHERE public_ID = ?', [idOrPublicId])
            if (users.length === 0) return res.status(404).json({ message: 'Usuário não encontrado' })
            userId = users[0].id
        } else {
            userId = parseInt(idOrPublicId)
        }

        // Ensure user is updating their own profile or is Admin
        if (userId !== req.user.id && req.user.rights !== 'ADMIN') {
            return res.status(403).json({ message: 'Não Autorizado' })
        }

        // Get current user data
        const [currentUser] = await pool.query('SELECT username, email FROM users WHERE id = ?', [userId])
        if (currentUser.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado' })
        }

        // Use current values if not provided
        const finalUsername = username !== undefined ? username : currentUser[0].username
        const finalEmail = email !== undefined ? email : currentUser[0].email

        // Check if username/email already exists (excluding current user)
        const [existing] = await pool.query(
            'SELECT * FROM users WHERE (username = ? OR email = ?) AND id != ?',
            [finalUsername, finalEmail, userId]
        )

        if (existing.length > 0) {
            return res.status(400).json({ message: 'Usuário ou E-mail já está em uso' })
        }

        let query = 'UPDATE users SET username = ?, email = ?'
        let params = [finalUsername, finalEmail]

        if (password) {
            const hashedPassword = bcrypt.hashSync(password, 8)
            query += ', password = ?'
            params.push(hashedPassword)
        }

        query += ' WHERE id = ?'
        params.push(userId)

        await pool.query(query, params)

        // Return updated user info (excluding password)
        const [updatedUser] = await pool.query('SELECT id, public_ID, username, email, role, rights FROM users WHERE id = ?', [userId])

        res.json({ message: 'Perfil Atualizado com Sucesso', user: updatedUser[0] })

    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Erro ao atualizar perfil' })
    }
})

// Delete User (Admin Only)
// Delete User (Admin Only)
router.delete('/users/:idOrPublicId', [verifyToken, verifyAdmin], async (req, res) => {
    const { idOrPublicId } = req.params

    try {
        let userId = idOrPublicId

        if (isNaN(idOrPublicId)) {
            const [users] = await pool.query('SELECT id FROM users WHERE public_ID = ?', [idOrPublicId])
            // If not found, try proceeding as if it might fail later, or return 404 here
            if (users.length === 0) return res.status(404).json({ message: 'Usuário não encontrado' })
            userId = users[0].id
        } else {
            userId = parseInt(idOrPublicId)
        }

        if (userId === req.user.id) {
            return res.status(400).json({ message: 'Você não pode excluir sua própria conta' })
        }

        const [result] = await pool.query('DELETE FROM users WHERE id = ?', [userId])

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado' })
        }

        res.json({ message: 'Usuário excluído com sucesso' })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Erro ao excluir usuário' })
    }
})

export default router
