export const analyzeTripText = async (text, apiKey) => {
    if (!text.trim()) return null

    const prompt = `
      Analise o texto abaixo, que descreve uma viagem de trabalho, e extraia os dados para formato JSON.
      
      Texto: "${text}"
      
      Regras de extração:
      1. technicians: Lista de nomes de pessoas citadas.
      2. destinations: Lista de objetos contendo:
         - city: Cidade de destino.
         - startDate: Data de ida no formato DD-MM-YYYY. Assuma o ano corrente se não citado.
         - endDate: Data de volta no formato DD-MM-YYYY. Se for voltar no mesmo dia, igual à startDate.
         - visitType: Escolha ESTRITAMENTE um destes: "PREVENTIVA", "CORRETIVA", "PREVENTIVA + CORRETIVA", "CEMIG", "INSTALAÇÃO", "VISITA TÉCNICA", "OUTROS". Se não estiver claro, use "OUTROS".
         - tasks: Lista de locais e o que será feito (ex: "Santa Casa - Troca de Switch"). Melhore o texto para soar profissional.
         - returnSameDay: Booleano. True se o texto deixar claro que voltam no mesmo dia (ex: "bate e volta", "diário"), False caso contrário.
      3. transport: Escolha um destes: "VEÍCULO PARTICULAR", "VEÍCULO DA EMPRESA", "ÔNIBUS". Padrão: "VEÍCULO DA EMPRESA".
      4. Quando não citado, o ano deverá ser o ano corrente.

      Responda APENAS o JSON, sem markdown.
      Exemplo de JSON: { "technicians": ["João"], "destinations": [{ "city": "Betim", "startDate": "20-10-2023", "endDate": "20-10-2023", "visitType": "CORRETIVA", "tasks": ["Hospital Regional - Reparo"], "returnSameDay": false }], "transport": "VEÍCULO DA EMPRESA" }
    `

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        })

        if (!response.ok) {
            throw new Error(`Erro na API: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        let jsonStr = data.candidates?.[0]?.content?.parts?.[0]?.text

        if (!jsonStr) {
            throw new Error("A IA não retornou um texto válido.")
        }

        // Limpeza básica
        jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim()

        return JSON.parse(jsonStr)
    } catch (error) {
        console.error("Erro na IA:", error)
        throw error
    }
}

export const generateSubject = async (summaries, apiKey) => {
    const prompt = `
      Crie um assunto de e-mail profissional, curto e direto para as seguintes viagens técnicas. 
      Padrão desejado: "Programação de Viagem: [Cidades Principais] - [Datas Resumidas]".
      Datas devem ser formatadas como DD-MM-YYYY.
      Dados: ${summaries}
      Responda APENAS o texto do assunto.
    `

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        })

        if (!response.ok) {
            throw new Error(`Erro na API: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        const subject = data.candidates?.[0]?.content?.parts?.[0]?.text

        if (!subject) throw new Error("Assunto não gerado pela IA.")
        return subject
    } catch (error) {
        console.error("Erro ao gerar assunto:", error)
        throw error
    }
}
