export const fetchCities = async () => {
    try {
        const response = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/municipios')
        const data = await response.json()

        // Map to simpler structure: { id, nome, uf }
        return data.map(city => ({
            id: city.id,
            nome: city.nome,
            uf: city.microrregiao?.mesorregiao?.UF?.sigla || city['regiao-imediata']?.['regiao-intermediaria']?.UF?.sigla || ''
        }))
    } catch (error) {
        console.error("Erro ao buscar cidades:", error)
        throw error
    }
}
