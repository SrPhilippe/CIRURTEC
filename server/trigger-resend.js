import pool from './db.js'
import { checkAndSendNotifications } from './services/notificationService.js'

const resend = async () => {
    try {
        const equipmentId = 'rVN3v6x1N' // Equipment with SN 2509191950
        console.log(`Clearing 6-month notification for equipment ${equipmentId}...`)

        await pool.query(
            'DELETE FROM sent_notifications WHERE equipment_id = ? AND interval_months = ?',
            [equipmentId, 6]
        )

        console.log('Record cleared. Triggering notification service...')
        await checkAndSendNotifications()

        console.log('Done.')
    } catch (error) {
        console.error('Error:', error)
    } finally {
        process.exit()
    }
}

resend()
