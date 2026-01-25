import { checkAndSendNotifications } from './services/notificationService.js'
import dotenv from 'dotenv'
dotenv.config()

console.log('--- Manual Notification Test Start ---')
checkAndSendNotifications().then(() => {
    console.log('--- Manual Notification Test End ---')
    process.exit(0)
}).catch(err => {
    console.error('Test failed:', err)
    process.exit(1)
})
