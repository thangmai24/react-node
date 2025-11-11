import React, { useState } from 'react';
import Navbar from '../component/Nav';
const ContactPage = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        message: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Xử lý gửi form ở đây
        console.log('Form submitted:', formData);
        alert('Cảm ơn bạn đã liên hệ! Chúng tôi sẽ phản hồi sớm nhất có thể.');
        setFormData({ name: '', email: '', message: '' });
    };

    return (
        <>

            <Navbar />
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <h1 className="text-4xl font-bold text-gray-800 mb-4">Liên Hệ Với Chúng Tôi</h1>
                        <div className="w-24 h-1 bg-indigo-600 mx-auto mb-6"></div>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Hãy kết nối với chúng tôi để cùng nhau chia sẻ và thúc đẩy tinh thần học tập không ngừng
                        </p>
                    </div>

                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                        <div className="md:flex">
                            {/* Phần thông điệp */}
                            <div className="md:w-1/2 bg-gradient-to-br from-indigo-600 to-purple-700 p-8 text-white">
                                <h2 className="text-2xl font-bold mb-6">Thông Điệp Động Viên</h2>
                                <div className="space-y-4">
                                    <p className="text-lg leading-relaxed">
                                        Việc học không chỉ là một nhiệm vụ, mà là hành trình khám phá bản thân và thế giới xung quanh.
                                        Đừng bao giờ xem nhẹ giá trị của tri thức, bởi mỗi bài học là một viên gạch xây nên tương lai của chính bạn.
                                    </p>
                                    <p className="text-lg leading-relaxed">
                                        Hãy biến việc học thành đam mê cháy bỏng, thành mục tiêu rõ ràng mà bạn theo đuổi mỗi ngày.
                                        Đừng để nó mãi chỉ là ước mơ xa vời, bởi ước mơ không hành động sẽ mãi chỉ là giấc mơ.
                                    </p>
                                    <p className="text-lg leading-relaxed">
                                        Tri thức là bước đệm vững chắc giúp bạn vươn tới những đỉnh cao mới, mở ra cánh cửa của những cơ hội
                                        và trải nghiệm quý giá. Mỗi kiến thức bạn tích lũy hôm nay sẽ trở thành nền tảng cho thành công của ngày mai.
                                    </p>
                                    <p className="text-lg leading-relaxed font-semibold italic mt-6">
                                        "Học tập là hành trình cả đời - hãy bắt đầu ngay hôm nay và không bao giờ từ bỏ!"
                                    </p>
                                </div>
                            </div>

                            {/* Phần form liên hệ */}
                            <div className="md:w-1/2 p-8">
                                <h2 className="text-2xl font-bold text-gray-800 mb-6">Gửi Thông Điệp Của Bạn</h2>
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div>
                                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                            Họ và tên
                                        </label>
                                        <input
                                            type="text"
                                            id="name"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200"
                                            placeholder="Nhập họ và tên của bạn"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200"
                                            placeholder="Nhập địa chỉ email của bạn"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                                            Thông điệp
                                        </label>
                                        <textarea
                                            id="message"
                                            name="message"
                                            value={formData.message}
                                            onChange={handleChange}
                                            required
                                            rows="5"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200"
                                            placeholder="Chia sẻ suy nghĩ, câu hỏi hoặc thông điệp của bạn..."
                                        ></textarea>
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-200"
                                    >
                                        Gửi Thông Điệp
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>

                    {/* Thông tin liên hệ bổ sung */}
                    <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow-md text-center">
                            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">Email</h3>
                            <p className="text-gray-600">support@hocvui.edu.vn</p>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-md text-center">
                            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">Điện thoại</h3>
                            <p className="text-gray-600">+84 123 456 789</p>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-md text-center">
                            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">Địa chỉ</h3>
                            <p className="text-gray-600">123 Đường Tri Thức, Quận 1, TP.HCM</p>
                        </div>
                    </div>
                </div>
            </div>
        </>

    );
};

export default ContactPage;