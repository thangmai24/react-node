import React, { useState, useEffect } from "react";
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
// import { AuthContext } from '../context/AuthContext';
const Navbar = () => {
    const [open, setOpen] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            const decoded = jwtDecode(token); // Giả sử bạn có thư viện jwt-decode
            setUser({ id: decoded.id, name: decoded.name });
        }
    }, []);
    const handleLogout = () => {
        localStorage.removeItem('token');
        setUser(null);
        alert("Bạn đã logout!");
        navigate('/login');
    };

    const handleSubmit = () => {
        alert("chức năng này chưa được phát triển!");
    }
    return (
        <nav className="bg-white shadow-md px-6 py-3 flex items-center justify-between sticky top-0 z-[10000]">
            {/* Logo + App Name */}
            <div className="flex items-center space-x-2">
                <div
                    className="relative w-10 h-10"
                    onMouseEnter={() => setIsHovering(true)}
                    onMouseLeave={() => setIsHovering(false)}
                >
                    {isHovering ? (
                        <video
                            src={`${process.env.PUBLIC_URL}/image/logo-video.mp4`}
                            alt="logo"
                            className="w-10 h-10 rounded-full object-cover"
                            autoPlay
                            muted
                            loop
                        />
                    ) : (
                        <img
                            src={`${process.env.PUBLIC_URL}/image/logo.png`}
                            alt="logo"
                            className="w-10 h-10 rounded-full"
                        />
                    )}
                </div>
                <span className="text-xl font-bold text-gray-700">Goiy</span>
            </div>

            {/* Menu */}
            <ul className="hidden md:flex space-x-6 text-gray-600 font-medium">
                <li className="hover:text-blue-500 cursor-pointer" onClick={handleSubmit}>Home</li>
                <li className="hover:text-blue-500 cursor-pointer" onClick={handleSubmit}>Dashboard</li>
                <li className="hover:text-blue-500 cursor-pointer" onClick={() => navigate('/Notes')}>Notes</li>
                <li className="hover:text-blue-500 cursor-pointer" onClick={() => navigate('/contact')}>Contact</li>
            </ul>

            {/* Avatar + Tên tài khoản */}
            <div className="relative">
                <button
                    className="flex items-center space-x-2 focus:outline-none"
                    onClick={() => setOpen(!open)}
                >
                    <img
                        src="https://via.placeholder.com/35"
                        alt="avatar"
                        className="w-9 h-9 rounded-full border"
                    />
                    <span className="text-gray-700 font-medium">{user ? user.name != null ? user.name.substring(0, 10) + '...' : user.name : 'Guest'}</span>
                </button>

                {/* Dropdown */}
                {open && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg">
                        <ul className="py-2">
                            <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer" onClick={() => navigate('/profile')}>
                                Thông tin tài khoản
                            </li>
                            <li
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-red-500"
                                onClick={handleLogout}
                            >
                                Đăng xuất
                            </li>
                        </ul>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
