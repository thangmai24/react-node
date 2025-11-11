import axios from 'axios';

const API = axios.create({ baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api' });

API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

export const authAPI = {
  register: (data) => API.post('/users/register', data),
  login: (data) => API.post('/users/login', data),
  verifyToken: (token) => API.post('/verify', {}, { headers: { Authorization: `Bearer ${token}` } }),
};

export const chatAPI = {
  sendMessage: (data) => API.post('/chat', data ),
};

// 📝 Notes API (RESTful)
export const notesAPI = {
  getAll: (data) => API.post('/notes/show', data),
  getById: (id) => API.get(`/notes/${id}`),
  create: (data) => API.post('/notes', data),
  update: (id, data) => API.put(`/notes/${id}`, data),
  delete: (id) => API.delete(`/notes/${id}`),
};


export default API;