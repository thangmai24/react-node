import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  withCredentials: true
});

API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.endsWith('/users/login') &&
      !originalRequest.url.endsWith('/users/register')
    ) {
      originalRequest._retry = true;
      try {
        const { data } = await API.post('/users/refresh');
        if (data.token) {
          localStorage.setItem('token', data.token);
          originalRequest.headers.Authorization = `Bearer ${data.token}`;
          return API(originalRequest);
        }
      } catch (err) {
        localStorage.removeItem('token');
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => API.post('/users/register', data),
  login: (data) => API.post('/users/login', data),
  verifyToken: (token) =>
    API.post(
      '/verify',
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    ),
  logout: () => API.post('/users/logout')
};

export const chatAPI = {
  sendMessage: (data) => API.post('/chat', data)
};

export const notesAPI = {
  getAll: (data) => API.post('/notes/show', data),
  getById: (id) => API.get(`/notes/${id}`),
  create: (data) => API.post('/notes', data),
  update: (id, data) => API.put(`/notes/${id}`, data),
  delete: (id) => API.delete(`/notes/${id}`)
};

export const userAPI = {
  getProfile: () => API.get('/users/profile'),
  updateProfile: (data) => API.put('/users/profile', data),
  getAllUsers: () => API.get('/users/users')
};

export const otpAPI = {
  sendOtp: (data) => API.post('/otp/send-otp', data),
  verifyOtp: (data) => API.post('/otp/verify-otp', data),
  sendOtpForRegister: (data) => API.post('/otp/send-otp-register', data),
  resetPassword: (data) => API.post('/otp/reset-password', data)
};

export default API;
