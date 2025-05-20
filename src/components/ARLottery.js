// Обновленный ARLottery.js с поддержкой настоящей AR
import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { ClipLoader } from "react-spinners";
import { useNavigate, useParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";

const ARLottery = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [result, setResult] = useState(null);
  const [qrValue, setQrValue] = useState("");
  const [deviceInfo, setDeviceInfo] = useState("");
  const [arSupported, setArSupported] = useState(false);
  const navigate = useNavigate();
  const { ticket_id } = useParams();

  // Определение устройства пользователя и поддержки AR
  useEffect(() => {
    const detectDevice = () => {
      const ua = navigator.userAgent;
      
      // Определяем тип устройства и браузер
      const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
      const isAndroid = /Android/.test(ua);
      const isMobile = isIOS || isAndroid;
      const browser = 
        /CriOS/.test(ua) ? "Chrome на iOS" :
        /FxiOS/.test(ua) ? "Firefox на iOS" :
        /EdgiOS/.test(ua) ? "Edge на iOS" :
        /OPiOS/.test(ua) ? "Opera на iOS" :
        /Safari/.test(ua) && isIOS ? "Safari на iOS" :
        /Chrome/.test(ua) ? "Chrome" :
        /Firefox/.test(ua) ? "Firefox" :
        /Edge/.test(ua) ? "Edge" :
        /Opera/.test(ua) ? "Opera" :
        "Неизвестный браузер";
      
      const deviceType = isIOS ? "iOS" : isAndroid ? "Android" : "Десктоп";
      const deviceInfo = `${deviceType}, ${browser}`;
      
      setDeviceInfo(deviceInfo);
      console.log(`Определено устройство: ${deviceInfo}`);
      
      // Проверяем поддержку WebXR
      if (navigator.xr) {
        navigator.xr.isSessionSupported('immersive-ar')
          .then((supported) => {
            setArSupported(supported);
            console.log(`Поддержка AR: ${supported ? 'Да' : 'Нет'}`);
          })
          .catch(err => {
            console.error(`Ошибка при проверке поддержки AR: ${err.message}`);
            setArSupported(false);
          });
      } else {
        console.log('WebXR API не поддерживается в этом браузере');
        setArSupported(false);
      }
      
      return { isIOS, isAndroid, isMobile, browser, deviceType };
    };
    
    detectDevice();
  }, []);

  // Получаем данные пользователя
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        
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

  // Получаем или создаем билет AR лотереи
  useEffect(() => {
    const getOrCreateARResult = async () => {
      setLoading(true);
      try {
        if (!user) return;

        if (ticket_id) {
          // Получаем существующий билет по ID
          console.log(`Получение билета AR лотереи: ${ticket_id}`);
          const { data: ticketData, error: ticketError } = await supabase
            .from("ar_lottery_tickets")
            .select("*")
            .eq("id", ticket_id)
            .single();

          if (ticketError) throw ticketError;

          setResult(ticketData);
          // Генерируем QR-код с URL для просмотра результата
          setQrValue(`${window.location.origin}/ar-lottery/view/${ticketData.id}`);
          console.log(`Билет AR лотереи загружен: ${ticketData.id}`);
        } else {
          // Проверяем баланс пользователя
          if (user.balance < 75) {
            throw new Error("Недостаточно средств для покупки билета AR лотереи. Требуется 75 ₽.");
          }
          
          // Списываем стоимость билета с баланса пользователя
          const { error: balanceError } = await supabase
            .from("users")
            .update({ balance: user.balance - 75 })
            .eq("id", user.id);
            
          if (balanceError) throw balanceError;
          
          // Создаем новый билет AR лотереи
          const isWin = Math.random() < 0.25; // 25% шанс выигрыша
          const winAmount = isWin ? Math.floor(Math.random() * 900) + 100 : 0; // от 100 до 1000 руб

          const { data: newTicket, error: createError } = await supabase
            .from("ar_lottery_tickets")
            .insert([
              {
                user_id: user.id,
                is_win: isWin,
                win_amount: winAmount,
                created_at: new Date().toISOString(),
                viewed: false,
                ar_model: isWin ? "treasure_chest" : "empty_chest",
              },
            ])
            .select();

          if (createError) throw createError;
          
          // Начисляем выигрыш, если билет выигрышный
          if (isWin && winAmount > 0) {
            console.log(`Начисление выигрыша: ${winAmount} ₽`);
            const { error: updateBalanceError } = await supabase
              .from("users")
              .update({ balance: user.balance - 75 + winAmount }) // Списываем стоимость и начисляем выигрыш
              .eq("id", user.id);
              
            if (updateBalanceError) throw updateBalanceError;
          }

          setResult(newTicket[0]);
          // Генерируем QR-код с URL для просмотра результата
          setQrValue(`${window.location.origin}/ar-lottery/view/${newTicket[0].id}`);
          console.log(`Билет AR лотереи создан: ${newTicket[0].id}`);
        }
      } catch (err) {
        console.error("Ошибка при получении/создании AR лотереи:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      getOrCreateARResult();
    } else {
      setLoading(false);
    }
  }, [user, ticket_id]);

  // Перенаправление на просмотр билета
  const startView = async () => {
    try {
      // Отмечаем билет как просмотренный, если он еще не был просмотрен
      if (result && !result.viewed) {
        await supabase
          .from("ar_lottery_tickets")
          .update({ viewed: true })
          .eq("id", result.id);
      }
      
      // Перенаправляем на страницу просмотра
      navigate(`/ar-lottery/view/${result.id}`);
    } catch (err) {
      console.error("Ошибка при запуске просмотра:", err);
      setError("Не удалось открыть просмотр. Пожалуйста, попробуйте еще раз.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <ClipLoader size={40} color="#000" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h2 className="text-2xl font-bold text-black mb-4 text-center">
            Необходима авторизация
          </h2>
          <p className="text-gray-700 text-center mb-6">
            Для доступа к AR лотерее необходимо авторизоваться.
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => navigate("/login")}
              className="px-4 py-2 bg-yellow-500 text-black font-semibold rounded-md hover:bg-yellow-600"
            >
              Войти
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="px-4 py-2 bg-gray-300 text-black font-semibold rounded-md hover:bg-gray-400"
            >
              Назад
            </button>
          </div>
        </div>
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

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate("/dashboard")}
            className="mr-4 flex items-center text-black hover:text-gray-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Назад
          </button>
          <h1 className="text-3xl font-bold text-black">AR Лотерея</h1>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold text-black mb-4 text-center">
            {ticket_id ? "Ваш билет AR лотереи" : "Новый билет AR лотереи"}
          </h2>

          {result && (
            <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-center text-black font-semibold mb-2">
                Для просмотра результата в дополненной реальности отсканируйте QR-код или нажмите кнопку ниже
              </p>

              <div className="flex flex-col items-center justify-center">
                <div className="bg-white p-4 rounded-lg mb-4">
                  <QRCodeCanvas value={qrValue} size={200} />
                </div>

                <p className="text-sm text-gray-600 mb-4 text-center">
                  QR-код содержит ссылку для просмотра результата в дополненной реальности
                </p>
              </div>
            </div>
          )}

          <div className="text-center">
            {/* Информация о поддержке AR */}
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-blue-700 mb-2">
                Определено устройство: {deviceInfo}
              </p>
              <p className="text-green-600 text-sm">
                {arSupported 
                  ? "На вашем устройстве поддерживается настоящая AR-визуализация! Откройте просмотр, чтобы увидеть ваш результат в реальном мире."
                  : "На вашем устройстве будет использована альтернативная 3D-визуализация, которая работает на всех устройствах."}
              </p>
            </div>

            <button
              onClick={startView}
              disabled={loading || !result}
              className={`px-6 py-3 rounded-lg font-bold text-lg ${
                arSupported ? "bg-green-500 hover:bg-green-600" : "bg-yellow-500 hover:bg-yellow-600"
              } text-black ${loading || !result ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {arSupported ? "Открыть AR просмотр" : "Открыть 3D просмотр"}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-black mb-4">Как это работает</h3>

          <div className="space-y-4">
            <p className="text-black">
              AR лотерея позволяет вам увидеть результат в виде виртуального сундука с сокровищами прямо в вашем окружении!
            </p>

            <ol className="list-decimal pl-5 space-y-2 text-black">
              <li>Покупка билета автоматически списывает 75₽ с вашего баланса</li>
              <li>Получите QR-код для вашего билета</li>
              <li>
                Отсканируйте его с помощью камеры на другом устройстве или нажмите
                кнопку "Открыть AR просмотр"
              </li>
              <li>В AR-просмотре вы увидите виртуальный сундук прямо в вашей комнате, который покажет результат вашей лотереи</li>
              <li>Вы можете перемещаться вокруг сундука и рассматривать его со всех сторон!</li>
              <li>Шанс выигрыша составляет 25%</li>
              <li>Размер выигрыша от 100₽ до 1000₽</li>
            </ol>

            <p className="text-black">
              Выигрыш в AR лотерее моментально зачисляется на ваш счет!
            </p>
            
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-bold text-black mb-2">Преимущества AR просмотра</h4>
              <ul className="list-disc pl-5 space-y-1 text-black">
                <li>Видите сундук прямо в вашем окружении - на полу, столе или любой другой поверхности</li>
                <li>Полная 3D-визуализация с возможностью обхода объекта со всех сторон</li>
                <li>Работает с современными мобильными устройствами</li>
                <li>Красивая анимация открытия сундука с сокровищами</li>
                <li>Уникальный опыт взаимодействия с виртуальными объектами в реальном мире</li>
              </ul>
            </div>
            
            {!arSupported && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-bold text-black mb-2">Для устройств без поддержки AR</h4>
                <p className="text-black">
                  Если ваше устройство не поддерживает AR, вы все равно сможете насладиться 3D-визуализацией сундука
                  с сокровищами в интерактивном режиме. Вы сможете вращать сундук мышью или касаниями экрана.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ARLottery;