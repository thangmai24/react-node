import API from "../services/api";
import {jwtDecode} from "jwt-decode";

export const checkAuth = async (navigate) => {
  const token = localStorage.getItem("token");

  const redirectLogin = () => {
    alert("Chưa đăng nhập hoặc phiên đã hết hạn!");
    localStorage.removeItem("token");
    navigate("/login");
    return null;
  };

  if (!token) {
    // Try to refresh using cookie
    try {
      const { data } = await API.post('/users/refresh');
      if (data.token) {
        localStorage.setItem('token', data.token);
        const decoded = jwtDecode(data.token);
        return decoded.id;
      }
      return redirectLogin();
    } catch (err) {
      return redirectLogin();
    }
  }

  let decoded;
  try {
    decoded = jwtDecode(token);
  } catch (e) {
    return redirectLogin();
  }

  if (decoded.exp * 1000 < Date.now()) {
    // Token expired, try refresh
    try {
      const { data } = await API.post('/users/refresh');
      if (data.token) {
        localStorage.setItem('token', data.token);
        const decoded2 = jwtDecode(data.token);
        return decoded2.id;
      }
      return redirectLogin();
    } catch (err) {
      return redirectLogin();
    }
  }

  return decoded.id; // trả về user_id
};
