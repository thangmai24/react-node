import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { authAPI } from '../services/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    const checkToken = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          await authAPI.verifyToken(token);
          navigate('/dashboard');
        } catch (err) {
          console.error("Token invalid or expired", err);
          localStorage.removeItem('token');
          navigate('/login');
        }
      }
    };
    checkToken();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await authAPI.login({ email, password });
      login(data.token);
      navigate('/dashboard');
    } catch (error) {
      alert('Login failed: ' + error.response?.data?.msg);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 p-6 bg-white shadow-lg rounded-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button 
          type="submit" 
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Login
        </button>
      </form>
      <p className="mt-4 text-center text-gray-600">
        Don&apos;t have an account?{' '}
        <a href="/register" className="text-blue-600 hover:underline">Register</a>
      </p>
    </div>
  );
};

export default Login;
