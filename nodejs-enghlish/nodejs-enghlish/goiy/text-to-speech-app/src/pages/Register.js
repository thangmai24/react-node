import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { authAPI } from '../services/api';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await authAPI.register({ email, password });
      login(data.token);
      alert('Registration successful!');
      navigate('/dashboard');
    } catch (error) {
      alert('Register failed: ' + error.response?.data?.msg);
    }
  };

  return (
   <div className="max-w-md mx-auto mt-12 p-6 bg-white shadow-lg rounded-lg">
  <h2 className="text-2xl font-bold mb-6 text-center">Register</h2>
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
      className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors"
    >
      Register
    </button>
  </form>
  <p className="mt-4 text-center text-gray-600">
    Have an account?{" "}
    <a href="/login" className="text-blue-600 hover:underline">Login</a>
  </p>
</div>

  );
};

export default Register;