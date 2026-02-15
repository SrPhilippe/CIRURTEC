import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.js'
import clientsRoutes from './routes/clients.js'
import equipmentSettingsRoutes from './routes/equipmentSettings.js'
import cron from 'node-cron'
import { checkAndSendNotifications } from './services/notificationService.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors({
    origin: ['https://cirurtec.com.br', 'http://localhost:5173'] // Allow requests from this origin
}))
app.use(express.json())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/clients', clientsRoutes)
app.use('/api/equipment-settings', equipmentSettingsRoutes) // Added

app.get('/', (req, res) => {
    res.send('CIRURTEC API is running')
})

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)

    // Schedule notification check every day at 08:00
    cron.schedule('0 */6 * * *', () => {
        checkAndSendNotifications()
    })

    if (!process.env.JWT_SECRET) {
        console.error('CRITICAL: JWT_SECRET is missing!')
    } else {
        console.log('JWT_SECRET loaded successfully.')
    }
})
