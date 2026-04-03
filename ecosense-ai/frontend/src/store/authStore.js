import { create } from 'zustand';

// Attempt extraction of existing limits cleanly from local boundaries natively
const savedToken = localStorage.getItem('access_token');
const savedUser = localStorage.getItem('user');

const useAuthStore = create((set) => ({
  user: savedUser ? JSON.parse(savedUser) : null,
  accessToken: savedToken || null,
  isAuthenticated: !!savedToken,

  setAuth: (user, accessToken, refreshToken) => {
    localStorage.setItem('access_token', accessToken);
    if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));

    set({ user, accessToken, isAuthenticated: true });
  },

  clearAuth: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    set({ user: null, accessToken: null, isAuthenticated: false });
  },
}));

export default useAuthStore;
