import jwt from 'jsonwebtoken'
import { adminAuth } from '../firebase-admin.js'

export const verifyToken = async (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]

    if (!token) {
        console.warn('Authentication failed: No token provided')
        return res.status(403).json({ message: 'No token provided' })
    }

    try {
        // 1. Try Firebase Admin SDK verification (Standard for current frontend)
        try {
            const decodedToken = await adminAuth.verifyIdToken(token)
            req.user = {
                id: decodedToken.uid,
                uid: decodedToken.uid,
                email: decodedToken.email,
                rights: decodedToken.rights || 'Padrão', // Custom claims or fallback
                role: decodedToken.role || 'Padrão'
            }

            // If custom claims are not present, we might need to fetch them from Firestore?
            // But usually we set them or just rely on the token for basic identity.
            // For now, let's just use the token.
            return next()
        } catch (firebaseError) {
            // 2. Fallback to Legacy JWT verification (for older parts of the system)
            const decoded = jwt.verify(token, process.env.JWT_SECRET)
            req.user = decoded
            next()
        }
    } catch (err) {
        console.error('Authentication failed: Invalid or expired token', err.message)
        return res.status(401).json({ message: 'Unauthorized' })
    }
}

export const verifyAdmin = (req, res, next) => {
    if (req.user.rights !== 'ADMIN' && req.user.rights !== 'Master') {
        return res.status(403).json({ message: 'Require Admin or Master Role!' })
    }
    next()
}
