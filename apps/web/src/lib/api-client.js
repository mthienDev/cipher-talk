import axios from 'axios';
import { useAuthStore } from '../stores/auth-store';
const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
    headers: {
        'Content-Type': 'application/json',
    },
});
// Request interceptor: add auth header
apiClient.interceptors.request.use((config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});
// Response interceptor: handle 401, refresh token
apiClient.interceptors.response.use((response) => response, async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (!refreshToken) {
                throw new Error('No refresh token');
            }
            const { data } = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/auth/refresh`, { refreshToken });
            useAuthStore.getState().setAuth(data.user, data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
            originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
            return apiClient(originalRequest);
        }
        catch (refreshError) {
            useAuthStore.getState().logout();
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
            return Promise.reject(refreshError);
        }
    }
    return Promise.reject(error);
});
export default apiClient;
//# sourceMappingURL=api-client.js.map