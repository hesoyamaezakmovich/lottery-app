// src/components/ARLotteryView.js
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { ClipLoader } from "react-spinners";
// Для Three.js нужно установить npm install three
// Импорт ARButton может вызвать ошибку, если Three.js не установлен
// import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';

const ARLotteryView = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [arStarted, setArStarted] = useState(false);
  
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const navigate = useNavigate();

  // Получаем данные билета
  useEffect(() => {
    const fetchTicket = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("ar_lottery_tickets")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        setTicket(data);

        // Отмечаем билет как просмотренный
        if (!data.viewed) {
          await supabase
            .from("ar_lottery_tickets")
            .update({ viewed: true })
            .eq("id", id);
        }
      } catch (err) {
        console.error("Ошибка при получении билета:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [id]);

  // Инициализация AR сессии (упрощенная версия)
  const initAR = () => {
    // Проверка поддержки WebXR
    if (!('xr' in navigator)) {
      setError("WebXR не поддерживается вашим браузером. Пожалуйста, используйте совместимое устройство и браузер.");
      return;
    }

    alert("В этой демо-версии полная AR-функциональность отключена, так как требует установки Three.js и настройки WebXR.");
    
    // В реальном коде здесь была бы инициализация Three.js и WebXR
    setArStarted(true);
  };

  // Эффект для инициализации AR сцены
  useEffect(() => {
    if (!ticket || !containerRef.current || arStarted) return;
    
    // Мы не инициализируем AR автоматически, пользователь должен нажать на кнопку
    
    return () => {
      // Здесь код очистки ресурсов
    };
  }, [ticket, arStarted]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <ClipLoader size={40} color="#000" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h2 className="text-2xl font-bold text-black mb-4 text-center">
            Ошибка
          </h2>
          <p className="text-red-600 text-center">{error}</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-4 w-full py-2 px-4 bg-yellow-500 text-black font-semibold rounded-md hover:bg-yellow-600"
          >
            Вернуться на главную
          </button>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h2 className="text-2xl font-bold text-black mb-4 text-center">
            Билет не найден
          </h2>
          <p className="text-gray-700 text-center">
            Билет AR лотереи не найден или был удален.
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-4 w-full py-2 px-4 bg-yellow-500 text-black font-semibold rounded-md hover:bg-yellow-600"
          >
            Вернуться на главную
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen relative">
      {/* AR контейнер */}
      <div ref={containerRef} className="absolute inset-0 bg-black">
        {/* Плейсхолдер для AR контента */}
        {arStarted ? (
          <div className="flex items-center justify-center h-full text-white">
            <div className="text-center p-8 bg-black bg-opacity-70 rounded-lg">
              <h2 className="text-xl font-bold mb-4">AR Режим активирован</h2>
              <p>
                {ticket.is_win 
                  ? `Поздравляем! Вы выиграли ${ticket.win_amount} ₽` 
                  : "К сожалению, вы не выиграли в этот раз"}
              </p>
              <div className="mt-4">
                {ticket.is_win ? (
                  <div className="text-6xl mb-2">💰</div>
                ) : (
                  <div className="text-6xl mb-2">📦</div>
                )}
              </div>
              <p className="text-sm mt-4">
                Для полной AR-функциональности требуется установка Three.js и настройка WebXR.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-white">
              <h2 className="text-2xl font-bold mb-6">Просмотр результата лотереи</h2>
              <p className="mb-8">
                {ticket.is_win 
                  ? `Поздравляем! Вы выиграли ${ticket.win_amount} ₽` 
                  : "К сожалению, вы не выиграли в этот раз"}
              </p>
              <button
                onClick={initAR}
                className="px-6 py-3 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-600"
              >
                Запустить AR просмотр
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Кнопка возврата (видна только до начала AR) */}
      {!arStarted && (
        <div className="absolute top-4 left-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 bg-yellow-500 text-black rounded-full shadow-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default ARLotteryView;