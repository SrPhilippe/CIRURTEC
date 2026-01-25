import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null

if (!resend) {
    console.warn('RESEND_API_KEY is missing in .env. Email notifications will be disabled.')
}

export const sendEmail = async (to, subject, html, attachments = []) => {
    if (!resend) {
        console.error('Cannot send email: RESEND_API_KEY is missing.')
        return { success: false, error: 'Missing API Key' }
    }

    try {
        const { data, error } = await resend.emails.send({
            from: 'Cirurtec <onboarding@resend.dev>', // Using Resend's testing domain until cirurtec.com.br is verified
            to: Array.isArray(to) ? to : [to],
            subject,
            html,
            attachments
        })

        if (error) {
            console.error('Error sending email via Resend:', error)
            return { success: false, error }
        }

        return { success: true, data }
    } catch (error) {
        console.error('Unexpected error sending email:', error)
        return { success: false, error }
    }
}
