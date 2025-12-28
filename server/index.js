import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.js'
import clientsRoutes from './routes/clients.js'
import equipmentSettingsRoutes from './routes/equipmentSettings.js' // Added

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors())
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
})
