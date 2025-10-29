import { jwtDecode } from "jwt-decode";

export const checkAuth = (navigate) => {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Chưa đăng nhập!");
    navigate("/login");
    return null;
  }

  const decoded = jwtDecode(token);
  if (decoded.exp * 1000 < Date.now()) {
    alert("Token đã hết hạn, vui lòng đăng nhập lại!");
    localStorage.removeItem("token");
    navigate("/login");
    return null;
  }

  return decoded.id; // trả về user_id
};
