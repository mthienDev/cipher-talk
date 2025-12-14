import type { User } from '@ciphertalk/shared';
export interface RegisterData {
    email: string;
    username: string;
    displayName: string;
    password: string;
}
export interface LoginData {
    email: string;
    password: string;
}
export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    user: User;
}
export declare const authApi: {
    register: (data: RegisterData) => Promise<AuthResponse>;
    login: (data: LoginData) => Promise<AuthResponse>;
    logout: (refreshToken: string) => Promise<void>;
    refresh: (refreshToken: string) => Promise<AuthResponse>;
};
//# sourceMappingURL=auth-api.d.ts.map