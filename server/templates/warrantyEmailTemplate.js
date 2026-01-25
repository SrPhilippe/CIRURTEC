export const warrantyEmailTemplate = (hospitalName, equipmentName, model, serialNumber, intervalMonths, nextMaintenanceDate) => {
    const monthsText = intervalMonths === 12 ? '1 ano' : `${intervalMonths} meses`

    return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #0ea5e9; padding: 20px; text-align: center;">
            <div style="background-color: white; padding: 10px; border-radius: 8px; display: inline-block; margin-bottom: 15px;">
                <img src="cid:header-logo" alt="Cirurtec" width="150" style="max-height: 50px; width: auto; display: block;" />
            </div>
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
                    <li><strong>Número de Série:</strong> ${serialNumber || 'Não informado'}</li>
                </ul>
            </div>

            <p>Informamos que o equipamento completou <strong>${monthsText}</strong> desde a emissão da nota fiscal.</p>
            
            ${intervalMonths === 12
            ? `<p style="color: #c2410c; font-weight: bold;">⚠️ Atenção: A garantia de fábrica encerra-se neste período. Recomendamos a verificação de contratos de manutenção preventiva para garantir a continuidade operacional.</p>`
            : `<p>Este é um marco para acompanhamento preventivo. Nossa equipe está à disposição para qualquer suporte necessário.</p>`
        }

            <div style="text-align: center; margin: 30px 0;">
                <a href="https://cirurtec.com.br" style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Acessar Portal do Cliente</a>
            </div>

            <p style="font-size: 14px; color: #64748b;">Próximo marco sugerido: ${nextMaintenanceDate || 'Verificar no portal'}.</p>
        </div>
        
        <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #94a3b8;">
            <p style="margin: 0;">Este é um e-mail automático, por favor não responda.</p>
            <p style="margin: 5px 0 0 0;">© ${new Date().getFullYear()} CIRURTEC. Todos os direitos reservados.</p>
        </div>
    </div>
    `
}
