import axios from "axios";
import { auth } from "../firebase";

const baseURL = import.meta.env.VITE_API_URL || "https://expenseengine-backend.vercel.app/api";
if (!baseURL) {
  console.error("CRITICAL: VITE_API_URL environment variable is missing in production build!");
}

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(
  async (config) => {
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken();
      localStorage.setItem("authToken", token);
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      const token = localStorage.getItem("authToken");
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const fetcher = (url) => api.get(url).then(res => {
  if (typeof res.data === "string") throw new Error("Bad API URL or HTML response received");
  return res.data;
});