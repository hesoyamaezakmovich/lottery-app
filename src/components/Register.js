import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { ClipLoader } from "react-spinners";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
  
    // Валидация email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Введите корректный email");
      setLoading(false);
      return;
    }
  
    // Валидация пароля
    if (password.length < 6) {
      setError("Пароль должен содержать минимум 6 символов");
      setLoading(false);
      return;
    }
  
    // Проверка уникальности имени пользователя
    const { data: existingUser, error: checkError } = await supabase
      .from("profiles")
      .select("username")
      .eq("username", username)
      .single();
  
    if (existingUser) {
      setError("Имя пользователя уже занято");
      setLoading(false);
      return;
    }
  
    if (checkError && checkError.code !== "PGRST116") {
      setError("Ошибка проверки имени пользователя: " + checkError.message);
      setLoading(false);
      return;
    }
  
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
  
      if (signUpError) throw signUpError;
  
      const { error: profileError } = await supabase
        .from("profiles")
        .insert([{ id: data.user.id, username }]);
  
      if (profileError) throw profileError;
  
      alert("Регистрация успешна! Проверьте email для подтверждения.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-3xl font-bold text-white mb-6 text-center">
          Присоединяйся к лотерее
        </h2>
        <form onSubmit={handleRegister} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-300">
              Имя пользователя
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="mt-1 w-full px-4 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 transition-transform duration-200"
              placeholder="Выберите имя пользователя"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full px-4 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 transition-transform duration-200"
              placeholder="Введите ваш email"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">
              Пароль
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 w-full px-4 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 transition-transform duration-200"
              placeholder="Создайте пароль"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
                type="submit"
                isabled={loading}
                className="w-full py-2 px-4 bg-orange-500 text-white font-semibold rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 flex items-center justify-center"
            >
                {loading ? <ClipLoader size={20} color="#fff" /> : "Зарегистрироваться"}
            </button>
        </form>
        <p className="mt-4 text-center text-gray-400">
          Уже есть аккаунт?{" "}
          <a href="/login" className="text-orange-500 hover:underline">
            Войти
          </a>
        </p>
      </div>
    </div>
  );
};

export default Register;