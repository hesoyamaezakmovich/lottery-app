import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { ClipLoader } from "react-spinners";

const InstantLotteries = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data, error } = await supabase
            .from("users")
            .select("*")
            .eq("id", session.user.id)
            .single();
          if (!error) setUser(data);
        }
      } catch (err) {
        console.error("Ошибка при получении данных пользователя:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <ClipLoader size={40} color="#000" />
      </div>
    );
  }

  const handlePlayLottery = (type) => {
    navigate(`/instant-lottery/${type}`);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-black mb-8 text-center">
          Моментальные лотереи
        </h1>
        
        <div className="mb-6 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-black mb-4">Как это работает</h2>
          <p className="text-gray-700 mb-3">
            Моментальные лотереи - это быстрый способ испытать удачу! Выберите тип лотереи, 
            внесите ставку и сразу узнайте результат. Каждая лотерея имеет свои правила 
            и коэффициенты выигрыша.
          </p>
          <p className="text-gray-700 mb-3">
            В отличие от обычных лотерей, результат становится известен моментально, 
            без ожидания даты розыгрыша.
          </p>
          {!user && (
            <p className="text-red-600 font-medium">
              Чтобы играть, необходимо авторизоваться
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Лотерея "Золотой сундук" */}
          <div className="bg-gradient-to-b from-yellow-500 to-amber-600 rounded-lg shadow-lg overflow-hidden transition-transform duration-300 hover:-translate-y-2">
            <div className="p-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-yellow-300 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-amber-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white text-center mb-2">
                Золотой сундук
              </h3>
              <p className="text-white text-center mb-4">
                Открой сундук с сокровищами!
              </p>
              <div className="bg-white bg-opacity-20 p-3 rounded-lg mb-4">
                <p className="text-white text-center font-semibold">
                  Стоимость: 50 ₽
                </p>
                <p className="text-white text-center text-sm">
                  Шанс выигрыша: 30%
                </p>
              </div>
              <p className="text-white text-sm text-center mb-4">
                Выбери один из трех сундуков и выиграй до 500 ₽!
              </p>
              <button
                onClick={() => handlePlayLottery("treasure-chest")}
                disabled={!user}
                className="w-full py-3 px-4 bg-white text-amber-600 font-bold rounded-lg hover:bg-yellow-100 focus:outline-none transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Играть
              </button>
            </div>
          </div>

          {/* Лотерея "Космическая удача" */}
          <div className="bg-gradient-to-b from-indigo-500 to-purple-600 rounded-lg shadow-lg overflow-hidden transition-transform duration-300 hover:-translate-y-2">
            <div className="p-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-indigo-300 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white text-center mb-2">
                Космическая удача
              </h3>
              <p className="text-white text-center mb-4">
                Исследуй космические просторы!
              </p>
              <div className="bg-white bg-opacity-20 p-3 rounded-lg mb-4">
                <p className="text-white text-center font-semibold">
                  Стоимость: 100 ₽
                </p>
                <p className="text-white text-center text-sm">
                  Шанс выигрыша: 25%
                </p>
              </div>
              <p className="text-white text-sm text-center mb-4">
                Собери комбинацию планет и выиграй до 1,000 ₽!
              </p>
              <button
                onClick={() => handlePlayLottery("space-fortune")}
                disabled={!user}
                className="w-full py-3 px-4 bg-white text-indigo-600 font-bold rounded-lg hover:bg-indigo-100 focus:outline-none transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Играть
              </button>
            </div>
          </div>

          {/* Лотерея "Изумрудный лес" */}
          <div className="bg-gradient-to-b from-emerald-500 to-green-600 rounded-lg shadow-lg overflow-hidden transition-transform duration-300 hover:-translate-y-2">
            <div className="p-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-emerald-300 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-emerald-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white text-center mb-2">
                Изумрудный лес
              </h3>
              <p className="text-white text-center mb-4">
                Волшебное приключение в лесу!
              </p>
              <div className="bg-white bg-opacity-20 p-3 rounded-lg mb-4">
                <p className="text-white text-center font-semibold">
                  Стоимость: 200 ₽
                </p>
                <p className="text-white text-center text-sm">
                  Шанс выигрыша: 20%
                </p>
              </div>
              <p className="text-white text-sm text-center mb-4">
                Найди волшебный артефакт и выиграй до 3,000 ₽!
              </p>
              <button
                onClick={() => handlePlayLottery("emerald-forest")}
                disabled={!user}
                className="w-full py-3 px-4 bg-white text-emerald-600 font-bold rounded-lg hover:bg-green-100 focus:outline-none transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Играть
              </button>
            </div>
          </div>
        </div>

        {user && (
          <div className="mt-8 bg-white p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-black mb-2">Ваш баланс</h3>
            <p className="text-2xl font-bold text-black">{user.balance?.toFixed(2) || "0.00"} ₽</p>
            <p className="text-sm text-gray-600 mt-1">
              Недостаточно средств? <a href="/profile" className="text-blue-500 hover:underline">Пополните баланс</a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstantLotteries;