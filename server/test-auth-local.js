
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

dotenv.config()

if (!process.env.JWT_SECRET) {
    console.error('FAILED: JWT_SECRET is missing')
    process.exit(1)
}

try {
    const payload = { id: 123, username: 'test' }
    const secret = process.env.JWT_SECRET

    // Sign
    const token = jwt.sign(payload, secret, { expiresIn: '1h' })
    console.log('Token created successfully')

    // Verify
    const decoded = jwt.verify(token, secret)
    console.log('Token verified successfully:', decoded.username === 'test')

} catch (error) {
    console.error('FAILED:', error.message)
    process.exit(1)
}
