import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { ClipLoader } from "react-spinners";

const ResetPassword = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Введите корректный email");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "http://localhost:3000/update-password",
      });

      if (error) throw error;

      setMessage("Письмо для сброса пароля отправлено на ваш email.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-dark">
      {/* Верхняя панель с логотипом */}
      <div className="fixed top-0 w-full bg-primary py-4 px-6 shadow-md flex justify-center">
        <div className="flex items-center">
          <div className="text-secondary-dark font-bold text-2xl">ЛОТЕРЕЯ</div>
        </div>
      </div>
      
      <div className="bg-background-medium p-8 rounded-lg shadow-lg w-full max-w-md border-2 border-primary">
        <h2 className="text-3xl font-bold text-primary mb-6 text-center">
          Сброс пароля
        </h2>
        <form onSubmit={handleResetPassword} className="space-y-6">
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
              className="mt-1 w-full px-4 py-3 bg-background-light text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition-transform duration-200"
              placeholder="Введите ваш email"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {message && <p className="text-green-500 text-sm">{message}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-primary text-secondary-dark font-bold rounded-md hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary-dark disabled:opacity-50 flex items-center justify-center transition-all duration-300"
          >
            {loading ? <ClipLoader size={20} color="#212121" /> : "ОТПРАВИТЬ"}
          </button>
        </form>
        <div className="mt-6 text-center text-gray-400">
          <p>Вернуться к{" "}
            <a href="/login" className="text-primary hover:text-primary-light">
              входу
            </a>
          </p>
        </div>
      </div>
      
      {/* Нижняя панель (футер) */}
      <div className="fixed bottom-0 w-full bg-secondary py-3 px-6 shadow-inner">
        <div className="flex justify-center text-sm text-gray-500">
          <p>© 2025 Лотерея. Все права защищены.</p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;