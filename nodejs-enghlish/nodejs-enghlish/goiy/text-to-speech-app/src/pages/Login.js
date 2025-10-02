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
          // gọi API verify token
          await authAPI.verifyToken(token); 
          navigate('/dashboard'); // nếu token hợp lệ thì cho vào dashboard
        } catch (err) {
          console.error("Token invalid or expired", err);
          localStorage.removeItem('token'); // xóa token hết hạn
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
      // localStorage.setItem('tokenapp', data.token);
      navigate('/dashboard');
    } catch (error) {
      alert('Login failed: ' + error.response?.data?.msg);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: '100%', marginBottom: '10px', padding: '10px' }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: '100%', marginBottom: '10px', padding: '10px' }}
        />
        <button type="submit" style={{ width: '100%', padding: '10px' }}>Login</button>
      </form>
      <p>Don't have account? <a href="/register">Register</a></p>
    </div>
  );
};

export default Login;