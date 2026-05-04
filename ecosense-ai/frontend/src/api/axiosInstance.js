import axios from 'axios';
import useAuthStore from '../store/authStore';

const rawBaseURL = import.meta.env.VITE_API_URL || '';
const baseURL = rawBaseURL.endsWith('/') 
  ? `${rawBaseURL}api/v1` 
  : `${rawBaseURL}/api/v1`;

/**
 * Pre-configured Axios instance for EcoSense AI.
 */
const axiosInstance = axios.create({
  baseURL,
  // Send cookies automatically if any are used (e.g. if we switch refresh token to HTTP-Only cookies later)
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to prevent infinite retry loops
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor: Attach the current in-memory access token
axiosInstance.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 Unauthorized for token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Avoid retry loops for login and refresh endpoints explicitly limits natively tracking cleanly natively
    if (
      originalRequest.url?.includes('/auth/login/') ||
      originalRequest.url?.includes('/auth/refresh/') ||
      originalRequest.url?.includes('/auth/register/')
    ) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue the request until refresh finishes
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return axiosInstance(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      // Note: The prompt instructed to use refresh_token cookie, but the login API returned the refresh token in the body.
      // Assuming for now that the frontend handled storing the refresh token securely, or if HTTP-only cookie was used on backend,
      // the browser would send it automatically. Since our Login API returned it in JSON payload, let's pull it from localStorage
      // or assume the backend sets it. The spec says "refresh_token cookie", but our M2-T2 backend didn't set a cookie, it returned it in the body.
      // To strictly follow the "refresh_token cookie" prompt instruction for the interceptor, we will just POST to refresh and rely on withCredentials,
      // or fallback to localStorage if needed. For safety, we will let the backend handle the cookie or pass it if it's in storage.
      const rawRefreshToken = localStorage.getItem('refresh_token');

      try {
        const { data } = await axios.post(`${baseURL}/auth/refresh/`, {
          refresh_token: rawRefreshToken // passing exactly expecting native explicitly Django bounds securely
        });

        const newAccessToken = data.data?.access_token || data.access_token;
        const newRefreshToken = data.data?.refresh_token || data.refresh_token;

        if (newRefreshToken) {
          localStorage.setItem('refresh_token', newRefreshToken);
        }

        useAuthStore.getState().setAuth(
          useAuthStore.getState().user,
          newAccessToken
        );

        processQueue(null, newAccessToken);
        originalRequest.headers['Authorization'] = 'Bearer ' + newAccessToken;
        return axiosInstance(originalRequest);
      } catch (err) {
        processQueue(err, null);
        useAuthStore.getState().clearAuth();
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
