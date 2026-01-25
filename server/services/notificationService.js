import pool from '../db.js'
import { sendEmail } from './emailService.js'
import { differenceInDays, addDays, parseISO, format, addMonths } from 'date-fns'
import { warrantyEmailTemplate } from '../templates/warrantyEmailTemplate.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const getRecipients = (row, userEmails) => {
    if (process.env.TEST_EMAIL) {
        return [process.env.TEST_EMAIL]
    }
    return [...new Set([row.email1, row.email2, ...userEmails])].filter(Boolean)
}

export const checkAndSendNotifications = async () => {
    console.log('--- Starting Daily Notification Check ---')
    try {
        // 1. Get all clients, their equipments, and already sent warranty notifications
        const query = `
            SELECT 
                c.nome_hospital, c.email1, c.email2,
                e.id as equipment_id, e.equipamento, e.modelo, e.numero_serie, e.data_nota,
                GROUP_CONCAT(sn.interval_months) as sent_intervals
            FROM clients c
            JOIN equipments e ON c.id = e.client_id
            LEFT JOIN sent_notifications sn ON e.id = sn.equipment_id AND sn.status = 'SUCCESS'
            GROUP BY e.id
        `
        const [rows] = await pool.query(query)

        // 2. Get all system users to notify them too (only those opted-in)
        const [users] = await pool.query('SELECT email FROM users WHERE receive_warranty_emails = TRUE')
        const userEmails = users.map(u => u.email)

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        for (const row of rows) {
            if (!row.data_nota) continue

            // data_nota is stored as DD/MM/YYYY in the DB but parseISO expects YYYY-MM-DD
            // Let's handle the date parsing robustly. If it's DD/MM/YYYY:
            let invoiceDate
            if (row.data_nota.includes('/')) {
                const [day, month, year] = row.data_nota.split('/')
                invoiceDate = new Date(year, month - 1, day)
            } else {
                invoiceDate = parseISO(row.data_nota)
            }

            invoiceDate.setHours(0, 0, 0, 0)

            const sentIntervals = row.sent_intervals ? row.sent_intervals.split(',').map(Number) : []
            const milestones = [3, 6, 9, 12]

            // --- A. Warranty Milestones (Persistent/Catch-up logic) ---
            for (const months of milestones) {
                // If already sent, skip
                if (sentIntervals.includes(months)) continue

                const milestoneDate = addMonths(invoiceDate, months)
                milestoneDate.setHours(0, 0, 0, 0)

                // If today is on or after the milestone date, send it
                if (today >= milestoneDate) {
                    console.log(`Triggering ${months}-month warranty email for ${row.nome_hospital} - ${row.equipamento}`)

                    const nextMilestone = milestones.find(m => m > months)
                    const nextDate = nextMilestone ? format(addMonths(invoiceDate, nextMilestone), 'dd/MM/yyyy') : null

                    const subject = `[CIRURTEC] Acompanhamento de Garantia (${months === 12 ? '1 ano' : months + ' meses'}) - ${row.nome_hospital}`
                    const html = warrantyEmailTemplate(
                        row.nome_hospital,
                        row.equipamento,
                        row.modelo,
                        row.numero_serie,
                        months,
                        nextDate
                    )

                    const recipients = getRecipients(row, userEmails)

                    // Read logo for embedding
                    let attachments = []
                    try {
                        const logoPath = path.join(__dirname, '../../src/assets/images/logo-cirurtec.png')
                        console.log('Reading logo from:', logoPath)
                        if (fs.existsSync(logoPath)) {
                            const logoContent = fs.readFileSync(logoPath)
                            attachments.push({
                                filename: 'logo-cirurtec.png',
                                content: logoContent,
                                content_id: 'header-logo'
                            })
                        }
                    } catch (err) {
                        console.error('Error attaching logo:', err)
                    }

                    await delay(500) // Avoid Resend rate limits (2 req/sec)
                    const emailResult = await sendEmail(recipients, subject, html, attachments)

                    if (emailResult.success) {
                        // Record as sent
                        await pool.query(
                            'INSERT INTO sent_notifications (equipment_id, interval_months, status) VALUES (?, ?, ?)',
                            [row.equipment_id, months, 'SUCCESS']
                        )
                    } else {
                        console.error(`Failed to send email for ${row.equipment_id} at ${months} months`)
                    }
                }
            }

            // --- B. Maintenance Reminders (Old logic: 30 and 15 days before maintenance) ---
            const maintenanceDays = [90, 180, 270, 365]
            for (const daysAfter of maintenanceDays) {
                const maintenanceDate = addDays(invoiceDate, daysAfter)
                const diff = differenceInDays(maintenanceDate, today)

                if (diff === 30 || diff === 15) {
                    const type = daysAfter === 365 ? 'Final de Garantia / Preventiva Anual' : 'Manutenção Preventiva'
                    const subject = `[CIRURTEC] Lembrete de ${type} - ${row.nome_hospital}`
                    const html = `
                        <h2>Lembrete de Manutenção</h2>
                        <p>Olá,</p>
                        <p>Este é um lembrete automático de que o equipamento <strong>${row.equipamento} (${row.modelo})</strong> 
                        da instituição <strong>${row.nome_hospital}</strong> tem uma manutenção programada para o dia <strong>${format(maintenanceDate, 'dd/MM/yyyy')}</strong>.</p>
                        <p>Faltam <strong>${diff} dias</strong> para o vencimento.</p>
                        <p>Atenciosamente,<br>Sistema CIRURTEC</p>
                    `

                    const recipients = getRecipients(row, userEmails)
                    console.log(`Sending ${diff}-day notification for ${row.nome_hospital} - ${row.equipamento}`)

                    await delay(500) // Avoid Resend rate limits
                    await sendEmail(recipients, subject, html)
                }
            }

            // --- C. Special Negotiation Aviso (30 days before 365 days) ---
            const warrantyEndDate = addDays(invoiceDate, 365)
            const warrantyDiff = differenceInDays(warrantyEndDate, today)

            if (warrantyDiff === 30) {
                const subject = `[CIRURTEC] Negociação de Contrato / Fim de Garantia - ${row.nome_hospital}`
                const html = `
                    <h2>Aviso de Final de Garantia</h2>
                    <p>Olá,</p>
                    <p>A garantia do equipamento <strong>${row.equipamento} (${row.modelo})</strong> da instituição <strong>${row.nome_hospital}</strong> chegará ao fim em 30 dias (${format(warrantyEndDate, 'dd/MM/yyyy')}).</p>
                    <p>Gostaríamos de iniciar a negociação para a renovação do seu contrato de manutenção para garantir a continuidade da assistência especializada.</p>
                    <p>Nossa equipe comercial entrará em contato em breve.</p>
                    <p>Atenciosamente,<br>Equipe CIRURTEC</p>
                 `
                const recipients = getRecipients(row, userEmails)

                await delay(500) // Avoid Resend rate limits
                await sendEmail(recipients, subject, html)
            }
        }

        console.log('--- Notification Check Finished ---')
    } catch (error) {
        console.error('Error in checkAndSendNotifications:', error)
    }
}
