import apiClient from '../../../lib/api-client';
export const authApi = {
    register: async (data) => {
        const response = await apiClient.post('/auth/register', data);
        return response.data;
    },
    login: async (data) => {
        const response = await apiClient.post('/auth/login', data);
        return response.data;
    },
    logout: async (refreshToken) => {
        await apiClient.post('/auth/logout', { refreshToken });
    },
    refresh: async (refreshToken) => {
        const response = await apiClient.post('/auth/refresh', { refreshToken });
        return response.data;
    },
};
//# sourceMappingURL=auth-api.js.map