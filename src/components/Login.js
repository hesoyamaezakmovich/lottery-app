import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { ClipLoader } from "react-spinners";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Введите корректный email");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Пароль должен содержать минимум 6 символов");
      setLoading(false);
      return;
    }

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-3xl font-bold text-black mb-6 text-center">
          Вход в лотерею
        </h2>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-black">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full px-4 py-2 bg-white border border-black rounded-md text-black focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-transform duration-200"
              placeholder="Введите ваш email"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-black">
              Пароль
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 w-full px-4 py-2 bg-white border border-black rounded-md text-black focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-transform duration-200"
              placeholder="Введите пароль"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-yellow-500 text-black font-semibold rounded-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? <ClipLoader size={20} color="#000" /> : "Войти"}
          </button>
        </form>
        <p className="mt-4 text-center text-black">
          Нет аккаунта?{" "}
          <a href="/register" className="text-yellow-600 hover:underline">
            Зарегистрироваться
          </a>
        </p>
        <p className="mt-2 text-center text-black">
          <a href="/reset-password" className="text-yellow-600 hover:underline">
            Забыли пароль?
          </a>
        </p>
      </div>
    </div>
  );
};

export default Login;