import express from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import pool from '../db.js'
import { verifyToken, verifyAdmin } from '../middleware/auth.js'

const router = express.Router()

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

        await pool.query(
            'INSERT INTO users (username, email, password, role, rights) VALUES (?, ?, ?, ?, ?)',
            [username, email, hashedPassword, role, userRights]
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
        const [users] = await pool.query('SELECT id, username, email, rights, role FROM users WHERE id = ?', [req.user.id])
        if (users.length === 0) return res.status(404).json({ message: 'User not found' })
        res.json(users[0])
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user' })
    }
})

// Get All Users (Admin Only)
router.get('/users', [verifyToken, verifyAdmin], async (req, res) => {
    try {
        const [users] = await pool.query('SELECT id, username, email, role, rights, created_at FROM users')
        res.json(users)
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Error fetching users' })
    }
})

// Update User Profile
router.put('/users/:id', verifyToken, async (req, res) => {
    const userId = req.params.id
    const { username, email, password } = req.body

    // Ensure user is updating their own profile or is Admin
    // For now, let's strictly restrict to own profile mostly, or Admin can edit anyone?
    // Requirement says "menu de configurações, onde o mesmo poderá editar informações do seu perfil".
    // So strictly own profile is the main requirement. 
    // Allowing Admin to edit via this route might be useful too, but let's stick to "Settings" context.

    if (parseInt(userId) !== req.user.id && req.user.rights !== 'ADMIN') {
        return res.status(403).json({ message: 'Unauthorized' })
    }

    try {
        // Check if username/email already exists (excluding current user)
        const [existing] = await pool.query(
            'SELECT * FROM users WHERE (username = ? OR email = ?) AND id != ?',
            [username, email, userId]
        )

        if (existing.length > 0) {
            return res.status(400).json({ message: 'Username or Email already in use' })
        }

        let query = 'UPDATE users SET username = ?, email = ?'
        let params = [username, email]

        if (password) {
            const hashedPassword = bcrypt.hashSync(password, 8)
            query += ', password = ?'
            params.push(hashedPassword)
        }

        query += ' WHERE id = ?'
        params.push(userId)

        await pool.query(query, params)

        // Return updated user info (excluding password)
        const [updatedUser] = await pool.query('SELECT id, username, email, role, rights FROM users WHERE id = ?', [userId])

        res.json({ message: 'Profile updated successfully', user: updatedUser[0] })

    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Error updating profile' })
    }
})

export default router
