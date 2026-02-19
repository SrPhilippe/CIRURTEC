const { onSchedule } = require("firebase-functions/v2/scheduler")
const admin = require("firebase-admin")
const { Resend } = require("resend")
const {
    differenceInDays,
    addDays,
    parseISO,
    format,
    addMonths,
} = require("date-fns")

admin.initializeApp()
const db = admin.firestore()

// RESEND_API_KEY should be set in Firebase env or Secret Manager
const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * Gets recipients for warranty emails.
 * @param {Object} client The client data.
 * @param {Array<string>} userEmails Internal user emails.
 * @return {Array<string>} List of recipient emails.
 */
const getRecipients = (client, userEmails) => {
    if (process.env.TEST_EMAIL) {
        return [process.env.TEST_EMAIL]
    }
    const allEmails = [...(client.emails || []), ...userEmails]
    return [...new Set(allEmails)].filter(Boolean)
}

/**
 * Generates the HTML template for warranty emails.
 * @param {string} hospitalName
 * @param {string} equipmentName
 * @param {string} model
 * @param {string} serialNumber
 * @param {number} intervalMonths
 * @param {string} nextMaintenanceDate
 * @return {string} HTML string.
 */
const warrantyEmailTemplate = (
    hospitalName,
    equipmentName,
    model,
    serialNumber,
    intervalMonths,
    nextMaintenanceDate
) => {
    const monthsText = intervalMonths === 12 ? "1 ano" : `${intervalMonths} meses`
    return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #0ea5e9; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Acompanhamento de Garantia</h1>
            <p style="color: #e0f2fe; margin: 5px 0 0 0;">CIRURTEC - Assistência Técnica Especializada</p>
        </div>
        <div style="padding: 30px; line-height: 1.6;">
            <p>Olá,</p>
            <p>Este é um informe automático sobre o status de garantia e manutenção do seu equipamento na instituição <strong>${hospitalName}</strong>.</p>
            <div style="background-color: #f8fafc; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; font-weight: bold; color: #0369a1;">Detalhes do Equipamento:</p>
                <ul style="margin: 10px 0 0 0; padding-left: 20px; list-style-type: none;">
                    <li><strong>Equipamento:</strong> ${equipmentName}</li>
                    <li><strong>Modelo:</strong> ${model}</li>
                    <li><strong>Número de Série:</strong> ${serialNumber || "Não informado"}</li>
                </ul>
            </div>
            <p>Informamos que o equipamento completou <strong>${monthsText}</strong> desde a emissão da nota fiscal.</p>
            ${intervalMonths === 12 ?
            `<p style="color: #c2410c; font-weight: bold;">⚠️ Atenção: A garantia de fábrica encerra-se neste período.</p>` :
            `<p>Este é um marco para acompanhamento preventivo.</p>`
        }
            <p style="font-size: 14px; color: #64748b;">Próximo marco sugerido: ${nextMaintenanceDate || "Verificar no portal"}.</p>
        </div>
        <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #94a3b8;">
            <p>© ${new Date().getFullYear()} CIRURTEC. Todos os direitos reservados.</p>
        </div>
    </div>`
}

module.exports.dailyNotificationCheck = onSchedule({
    schedule: "0 8 * * *",
    secrets: ["RESEND_API_KEY"],
}, async () => {
    console.log("--- Starting Daily Notification Check ---")

    try {
        const usersSnapshot = await db.collection("users")
            .where("receive_warranty_emails", "==", true)
            .get()
        const userEmails = usersSnapshot.docs.map((doc) => doc.data().email)

        const clientsSnapshot = await db.collection("clients").get()
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        for (const clientDoc of clientsSnapshot.docs) {
            const client = clientDoc.data()
            const eqSnapshot = await db.collection("equipments")
                .where("clientId", "==", client.cnpj)
                .get()

            for (const eqDoc of eqSnapshot.docs) {
                const eq = eqDoc.data()
                if (!eq.dataNota) continue

                const invoiceDate = parseISO(eq.dataNota)
                invoiceDate.setHours(0, 0, 0, 0)

                const sentSnapshot = await db.collection("notifications")
                    .where("equipmentId", "==", eqDoc.id)
                    .where("status", "==", "SUCCESS")
                    .get()
                const sentIntervals = sentSnapshot.docs.map((doc) =>
                    doc.data().interval_months
                )

                const milestones = [3, 6, 9, 12]
                for (const months of milestones) {
                    if (sentIntervals.includes(months)) continue

                    const milestoneDate = addMonths(invoiceDate, months)
                    milestoneDate.setHours(0, 0, 0, 0)

                    if (today >= milestoneDate) {
                        console.log(`Triggering ${months}-month email for ${client.nome_hospital}`)

                        const nextM = milestones.find((m) => m > months)
                        const nextDate = nextM ?
                            format(addMonths(invoiceDate, nextM), "dd/MM/yyyy") :
                            null

                        const subject = `[CIRURTEC] Acompanhamento de Garantia - ${client.nome_hospital}`
                        const html = warrantyEmailTemplate(
                            client.nome_hospital,
                            eq.equipamento,
                            eq.modelo,
                            eq.numeroSerie,
                            months,
                            nextDate
                        )

                        const recipients = getRecipients(client, userEmails)
                        const { error } = await resend.emails.send({
                            from: "Cirurtec <onboarding@resend.dev>",
                            to: recipients,
                            subject,
                            html,
                        })

                        if (!error) {
                            await db.collection("notifications").add({
                                equipmentId: eqDoc.id,
                                interval_months: months,
                                status: "SUCCESS",
                                sentAt: admin.firestore.FieldValue.serverTimestamp(),
                            })
                        } else {
                            console.error(`Failed to send email for ${eqDoc.id}:`, error)
                        }
                    }
                }

                const maintenanceDays = [90, 180, 270, 365]
                for (const daysAfter of maintenanceDays) {
                    const mDate = addDays(invoiceDate, daysAfter)
                    const diff = differenceInDays(mDate, today)

                    if (diff === 30 || diff === 15) {
                        const type = daysAfter === 365 ? "Garantia / Preventiva" : "Preventiva"
                        const subject = `[CIRURTEC] Lembrete de ${type} - ${client.nome_hospital}`
                        const html = `
                <h2>Lembrete de Manutenção</h2>
                <p>O equipamento <strong>${eq.equipamento}</strong> da instituição <strong>${client.nome_hospital}</strong> 
                   tem uma manutenção para o dia <strong>${format(mDate, "dd/MM/yyyy")}</strong>.</p>
                <p>Faltam <strong>${diff} dias</strong>.</p>
            `
                        const recipients = getRecipients(client, userEmails)
                        await resend.emails.send({
                            from: "Cirurtec <onboarding@resend.dev>",
                            to: recipients,
                            subject,
                            html,
                        })
                    }
                }
            }
        }
        console.log("--- Notification Check Finished ---")
    } catch (err) {
        console.error("Error in dailyNotificationCheck:", err)
    }
})
