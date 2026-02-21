import express from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import pool from '../db.js'
import { verifyToken, verifyAdmin } from '../middleware/auth.js'
import { nanoid } from 'nanoid'
import { sendEmail } from '../services/emailService.js'
import { resetPasswordTemplate } from '../templates/emailTemplates.js'

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

// Forgot Password
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body

    if (!email) {
        return res.status(400).json({ message: 'Email required' })
    }

    try {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email])

        // Security: Always return "If email exists..." message
        if (users.length > 0) {
            const user = users[0]

            // Generate Reset Token (1 hour expiration)
            const resetToken = jwt.sign(
                { id: user.id, type: 'reset' },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            )

            // In a real production environment, link would be formatted:
            // const link = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`
            // But for now we just need to send the email.
            // Assuming localhost for link for now or better yet, just the token logic.
            // User didn't ask for the RESET PAGE yet, just the EMAIL sending logic.
            // I'll create a link to a hypothetical /redefinir-senha route
            const resetLink = `http://localhost:5173/redefinir-senha?token=${resetToken}`

            const html = resetPasswordTemplate(resetLink, user.username)

            // DEV OVERRIDE: Send to philippecoding@gmail.com
            // In PROD: to = user.email
            const to = 'philippecoding@gmail.com'

            console.log(`Sending Reset Password email for ${user.email} to ${to}`)
            await sendEmail(to, 'Redefinição de Senha - CIRURTEC', html)
        } else {
            console.log(`Reset Password requested for non-existent email: ${email}`)
        }

        res.json({ message: 'Se o e-mail estiver cadastrado, você receberá um link para redefinição de senha.' })

    } catch (error) {
        console.error('Forgot Password Error:', error)
        res.status(500).json({ message: 'Erro ao processar solicitação' })
    }
})

// Reset Password
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body

    if (!token || !newPassword) {
        return res.status(400).json({ message: 'Token e nova senha são obrigatórios' })
    }

    try {
        // Verify Token
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        if (decoded.type !== 'reset') {
            return res.status(400).json({ message: 'Token inválido' })
        }

        const userId = decoded.id

        // Update Password
        const hashedPassword = bcrypt.hashSync(newPassword, 8)

        await pool.query(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, userId]
        )

        res.json({ message: 'Senha redefinida com sucesso!' })

    } catch (error) {
        console.error('Reset Password Error:', error)
        if (error.name === 'TokenExpiredError') {
            return res.status(400).json({ message: 'O link de redefinição expirou. Solicite um novo.' })
        }
        res.status(400).json({ message: 'Link inválido ou expirado' })
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
        const [users] = await pool.query('SELECT id, public_ID, username, email, role, rights, created_at, receive_warranty_emails FROM users')
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

// Update Warranty Email Settings (Admin Only)
router.put('/users/:id/warranty-settings', [verifyToken, verifyAdmin], async (req, res) => {
    const { id } = req.params
    const { receive_warranty_emails } = req.body

    try {
        await pool.query(
            'UPDATE users SET receive_warranty_emails = ? WHERE id = ?',
            [receive_warranty_emails, id]
        )
        res.json({ message: 'Configuração atualizada com sucesso' })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Erro ao atualizar configuração' })
    }
})

// Delete User (Admin Only)
router.delete('/users/:idOrPublicId', [verifyToken, verifyAdmin], async (req, res) => {
    const { idOrPublicId } = req.params

    try {
        let userId = idOrPublicId

        if (isNaN(idOrPublicId)) {
            const [users] = await pool.query('SELECT id FROM users WHERE public_ID = ?', [idOrPublicId])
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

// Update User Profile
// ... (existing code)

// Reset User Password to Default (Admin/Master Only)
router.post('/reset-user-password-default', [verifyToken, verifyAdmin], async (req, res) => {
    const { targetUid } = req.body

    if (!targetUid) {
        return res.status(400).json({ message: 'Target User UID is required' })
    }

    try {
        const { default: admin, adminAuth, adminDb } = await import('../firebase-admin.js')

        // 1. Get User Data from Firestore
        const userDoc = await adminDb.collection('users').doc(targetUid).get()
        if (!userDoc.exists()) {
            return res.status(404).json({ message: 'User not found' })
        }

        const userData = userDoc.data()
        const username = userData.username

        // 2. Calculate Default Password Pattern
        // Pattern: FirstChar + Month + MiddleChar + LastChar + Year
        const now = new Date()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const year = String(now.getFullYear())

        const firstChar = username.charAt(0).toUpperCase()
        const lastChar = username.charAt(username.length - 1).toUpperCase()
        const middleIndex = Math.floor(username.length / 2)
        const middleChar = username.charAt(middleIndex).toUpperCase()

        const defaultPassword = `${firstChar}${month}${middleChar}${lastChar}${year}`

        // 3. Update Password in Firebase Auth
        await adminAuth.updateUser(targetUid, {
            password: defaultPassword
        })

        // 4. Ensure no plain-text password exists in Firestore (Security cleanup)
        if (userData.password) {
            await adminDb.collection('users').doc(targetUid).update({
                password: admin.firestore.FieldValue.delete(),
                updatedAt: new Date()
            })
        }

        res.json({
            message: 'Senha redefinida com sucesso para o padrão do sistema.',
            defaultPassword: defaultPassword // Optional: inform the admin what the password is
        })

    } catch (error) {
        console.error('Reset Default Password Error:', error)
        res.status(500).json({ message: 'Erro ao redefinir senha para o padrão.' })
    }
})

export default router
