import jwt from 'jsonwebtoken'

export const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]

    if (!token) {
        console.warn('Authentication failed: No token provided')
        return res.status(403).json({ message: 'No token provided' })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.user = decoded
        next()
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
