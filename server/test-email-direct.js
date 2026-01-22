import { sendEmail } from './services/emailService.js'

const recipients = ['philippecoding@gmail.com']

console.log('Sending test email to:', recipients)

const result = await sendEmail(
    recipients,
    'Teste de Notificação - Sistema CIRURTEC',
    `
    <h1>Teste de Envio de E-mail</h1>
    <p>Olá,</p>
    <p>Este é um teste de envio de e-mail do sistema <strong>CIRURTEC</strong> para validar a integração com a Resend.</p>
    <p>Se você recebeu esta mensagem, a configuração está correta!</p>
    <br>
    <p>Data/Hora: ${new Date().toLocaleString('pt-BR')}</p>
    `
)

if (result.success) {
    console.log('Email sent successfully:', result.data)
} else {
    console.error('Failed to send email:', result.error)
}
