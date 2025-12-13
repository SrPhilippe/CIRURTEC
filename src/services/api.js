import axios from 'axios'

const api = axios.create({
    baseURL: 'http://localhost:5000/api',
})

api.interceptors.request.use(
    (config) => {
        const user = JSON.parse(localStorage.getItem('user'))
        if (user && user.accessToken) {
            config.headers['Authorization'] = `Bearer ${user.accessToken}`
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

export default api
