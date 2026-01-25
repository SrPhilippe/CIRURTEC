export const resetPasswordTemplate = (resetLink, username) => {
    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #0ea5e9;">Redefinição de Senha - CIRURTEC</h2>
        <p>Olá${username ? `, <strong>${username}</strong>` : ''},</p>
        <p>Recebemos uma solicitação para redefinir a senha da sua conta no sistema Cirurtec.</p>
        <p>Se você não solicitou esta alteração, ignore este e-mail.</p>
        <p>Para criar uma nova senha, clique no botão abaixo:</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Redefinir Minha Senha</a>
        </div>
        <p>Ou copie e cole o link abaixo no seu navegador:</p>
        <p style="font-size: 12px; color: #666; word-break: break-all;">${resetLink}</p>
        <br>
        <p>Este link é válido por 1 hora.</p>
        <hr>
        <p style="font-size: 12px; color: #888;">Sistema CIRURTEC - Notificações Automáticas</p>
    </div>
    `
}
