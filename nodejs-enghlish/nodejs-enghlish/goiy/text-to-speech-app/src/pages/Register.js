import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { authAPI, otpAPI } from '../services/api';

const Register = () => {
  const [step, setStep] = useState('register'); // 'register' or 'otp'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [otp, setOtp] = useState('');
  const [pendingData, setPendingData] = useState({});
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    try {
      await otpAPI.sendOtpForRegister({ email });
      setPendingData({ name, email, password, age });
      setStep('otp');
      alert('OTP sent to your email. Please check and enter it.');
    } catch (error) {
      alert('Failed to send OTP: ' + error.response?.data?.message);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    try {
      await otpAPI.verifyOtp({ email, otp });
      // Now register
      const { data } = await authAPI.register(pendingData);
      login(data.token);
      alert('Registration successful!');
      navigate('/dashboard');
    } catch (error) {
      alert('Verification failed: ' + error.response?.data?.message);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 p-6 bg-white shadow-lg rounded-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">Register</h2>
      {step === 'register' ? (
        <form onSubmit={handleRegisterSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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
          <input
            type="number"
            placeholder="Age"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button 
            type="submit" 
            className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Send OTP
          </button>
        </form>
      ) : (
        <form onSubmit={handleOtpSubmit} className="space-y-4">
          <p className="text-center">Enter the OTP sent to {email}</p>
          <input
            type="text"
            placeholder="OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button 
            type="submit" 
            className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Verify & Register
          </button>
          <button 
            type="button"
            onClick={() => setStep('register')}
            className="w-full bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Back
          </button>
        </form>
      )}
      <p className="mt-4 text-center text-gray-600">
        Have an account?{" "}
        <a href="/login" className="text-blue-600 hover:underline">Login</a>
      </p>
    </div>
  );
};

export default Register;