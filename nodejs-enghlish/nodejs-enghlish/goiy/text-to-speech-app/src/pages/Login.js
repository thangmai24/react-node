import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { authAPI, otpAPI } from '../services/api';
import Button from '../component/Button';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login'); // 'login' or 'forgot'
  const [forgotStep, setForgotStep] = useState('email'); // 'email', 'otp', 'reset'
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false); 

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

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authAPI.login({ email, password });
      login(data.token);
      navigate('/dashboard');
    } catch (error) {
      alert('Login failed: ' + error.response?.data?.msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    try {
      await otpAPI.sendOtp({ email });
      setForgotStep('otp');
      alert('OTP sent to your email.');
    } catch (error) {
      alert('Failed to send OTP: ' + error.response?.data?.message);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      await otpAPI.resetPassword({ email, otp, newPassword });
      alert('Password reset successful. Please login.');
      setMode('login');
      setForgotStep('email');
      setOtp('');
      setNewPassword('');
    } catch (error) {
      alert('Failed to reset password: ' + error.response?.data?.message);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 p-6 bg-white shadow-lg rounded-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">
        {mode === 'login' ? 'Login' : 'Forgot Password'}
      </h2>
      {mode === 'login' ? (
        <>
          <form onSubmit={handleLoginSubmit} className="space-y-4">
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
            <Button 
              type="submit"
              loading={loading} 
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Login
            </Button>
          </form>
          <p className="mt-4 text-center text-gray-600">
            Don&apos;t have an account?{' '}
            <a href="/register" className="text-blue-600 hover:underline">Register</a>
          </p>
          <p className="mt-2 text-center">
            <button 
              onClick={() => setMode('forgot')}
              className="text-blue-600 hover:underline"
            >
              Forgot Password?
            </button>
          </p>
        </>
      ) : (
        <>
          {forgotStep === 'email' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button 
                type="submit" 
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Send OTP
              </button>
            </form>
          )}
          {forgotStep === 'otp' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <input
                type="text"
                placeholder="OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button 
                type="submit" 
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Reset Password
              </button>
            </form>
          )}
          <p className="mt-4 text-center">
            <button 
              onClick={() => { setMode('login'); setForgotStep('email'); }}
              className="text-blue-600 hover:underline"
            >
              Back to Login
            </button>
          </p>
        </>
      )}
    </div>
  );
};

export default Login;
