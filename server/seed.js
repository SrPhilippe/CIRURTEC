import bcrypt from 'bcrypt'
import pool from './db.js'

const seed = async () => {
    try {
        const password = 'admin123'
        const hashedPassword = bcrypt.hashSync(password, 8)
        const username = 'admin'
        const email = 'admin@cirurtec.com'

        const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username])

        if (users.length > 0) {
            console.log('Admin user already exists.')
            process.exit(0)
        }

        await pool.query(
            'INSERT INTO users (username, email, password, role, rights) VALUES (?, ?, ?, ?, ?)',
            [username, email, hashedPassword, 'Administrator', 'ADMIN']
        )

        console.log('Default Admin user created!')
        console.log('Username: admin')
        console.log('Password: admin123')
        process.exit(0)
    } catch (error) {
        console.error('Error seeding database:', error)
        process.exit(1)
    }
}

seed()
