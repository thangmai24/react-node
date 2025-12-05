import React, { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import { FiMenu, FiX } from "react-icons/fi";

const Navbar = () => {
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            const decoded = jwtDecode(token);
            setUser({ id: decoded.id, name: decoded.name });
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("token");
        setUser(null);
        alert("Bạn đã logout!");
        navigate("/login");
    };

    const shortName =
        user && user.name
            ? user.name.length > 10
                ? user.name.substring(0, 10) + "..."
                : user.name
            : "Guest";

    return (
        <>
            {/* Navbar top */}
            <nav className="bg-white shadow-md px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-[10000]">
                {/* Logo + App Name */}
                <div className="flex items-center space-x-2">
                    <div
                        className="relative w-9 h-9 sm:w-10 sm:h-10"
                        onMouseEnter={() => setIsHovering(true)}
                        onMouseLeave={() => setIsHovering(false)}
                    >
                        {isHovering ? (
                            <video
                                src={`${process.env.PUBLIC_URL}/image/logo-video.mp4`}
                                className="w-full h-full rounded-full object-cover"
                                autoPlay
                                muted
                                loop
                            />
                        ) : (
                            <img
                                src={`${process.env.PUBLIC_URL}/image/logo.png`}
                                alt="logo"
                                className="w-full h-full rounded-full"
                            />
                        )}
                    </div>
                    <span className="text-lg sm:text-xl font-bold text-gray-700">
                        Goiy
                    </span>
                </div>

                {/* Menu desktop */}
                <ul className="hidden md:flex space-x-6 text-gray-600 font-medium">
                    <li
                        className="hover:text-blue-500 cursor-pointer"
                        onClick={() => navigate("/dashboard")}
                    >
                        Home
                    </li>
                    <li
                        className="hover:text-blue-500 cursor-pointer"
                        onClick={() => navigate("/Notes")}
                    >
                        Notes
                    </li>
                    <li
                        className="hover:text-blue-500 cursor-pointer"
                        onClick={() => navigate("/contact")}
                    >
                        Contact
                    </li>
                </ul>

                {/* Avatar + user dropdown (desktop) */}
                <div className="relative hidden md:block">
                    <button
                        className="flex items-center space-x-2 focus:outline-none"
                        onClick={() => setUserMenuOpen((prev) => !prev)}
                    >
                        <img
                            src="https://via.placeholder.com/35"
                            alt="avatar"
                            className="w-9 h-9 rounded-full border"
                        />
                        <span className="text-gray-700 font-medium">{shortName}</span>
                    </button>

                    {userMenuOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg">
                            <ul className="py-2">
                                <li
                                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                    onClick={() => {
                                        navigate("/profile");
                                        setUserMenuOpen(false);
                                    }}
                                >
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

                {/* Nút ba gạch cho mobile */}
                <button
                    className="md:hidden p-2 rounded-md border border-gray-200 hover:bg-gray-100"
                    onClick={() => setMobileMenuOpen(true)}
                >
                    <FiMenu size={20} />
                </button>
            </nav>

            {/* Overlay + Sidebar mobile */}
            {mobileMenuOpen && (
                <>
                    {/* Overlay đen mờ */}
                    <div
                        className="fixed inset-0 bg-black/40 z-[10000]"
                        onClick={() => setMobileMenuOpen(false)}
                    />

                    {/* Sidebar */}
                    <div className="fixed top-0 left-0 h-full w-64 bg-white shadow-xl z-[10001] flex flex-col p-4">
                        {/* Header sidebar */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2">
                                <img
                                    src={`${process.env.PUBLIC_URL}/image/logo.png`}
                                    alt="logo"
                                    className="w-9 h-9 rounded-full"
                                />
                                <span className="text-lg font-bold text-gray-700">Goiy</span>
                            </div>
                            <button
                                className="p-1 rounded-md hover:bg-gray-100"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                <FiX size={20} />
                            </button>
                        </div>



                        {/* Menu items */}
                        <ul className="flex-1 space-y-2 text-gray-700 font-medium">
                            <li
                                className="px-2 py-2 rounded-md hover:bg-gray-100 cursor-pointer"
                                onClick={() => {
                                    navigate("/dashboard");
                                    setMobileMenuOpen(false);
                                }}
                            >
                                Home
                            </li>
                            <li
                                className="px-2 py-2 rounded-md hover:bg-gray-100 cursor-pointer"
                                onClick={() => {
                                    navigate("/Notes");
                                    setMobileMenuOpen(false);
                                }}
                            >
                                Notes
                            </li>
                            <li
                                className="px-2 py-2 rounded-md hover:bg-gray-100 cursor-pointer"
                                onClick={() => {
                                    navigate("/contact");
                                    setMobileMenuOpen(false);
                                }}
                            >
                                Contact
                            </li>
                        </ul>
                        {/* User info */}
                        <div className="flex items-center space-x-2 mb-4">
                            <img
                                src="https://via.placeholder.com/35"
                                alt="avatar"
                                className="w-9 h-9 rounded-full border"
                            />
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-gray-800">
                                    {shortName}
                                </span>
                            </div>
                        </div>
                        {/* Logout */}
                        <button
                            onClick={() => {
                                handleLogout();
                                setMobileMenuOpen(false);
                            }}
                            className="mt-auto w-full py-2 text-sm font-semibold text-red-500 border-t border-gray-200 pt-3 text-left"
                        >
                            Đăng xuất
                        </button>
                    </div>
                </>
            )}
        </>
    );
};

export default Navbar;
