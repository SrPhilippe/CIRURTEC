/**
 * Hook personalizado para adiar a atualização de um valor (debounce).
 * Útil para evitar chamadas excessivas à API enquanto o usuário digita (ex: pesquisa, validação em tempo real).
 * 
 * @param {any} value - O valor a ser monitorado.
 * @param {number} delay - O tempo de atraso em milissegundos.
 * @returns {any} - O valor atualizado após o atraso.
 */
import { useState, useEffect } from 'react'

export default function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value)

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value)
        }, delay)

        return () => {
            clearTimeout(handler)
        }
    }, [value, delay])

    return debouncedValue
}
