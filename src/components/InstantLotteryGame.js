import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { ClipLoader } from "react-spinners";
import PirateTreasure from "./PirateTreasure";
import MysticOracle from "./MysticOracle";
import JungleAdventure from "./JungleAdventure";

const InstantLotteryGame = () => {
  const { type } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [canPlay, setCanPlay] = useState(true);
  const [lastPlayed, setLastPlayed] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Конфигурация для разных типов лотерей
  const lotteryConfig = {
    "pirate-treasure": { 
      price: 50, 
      winChance: 0.3, 
      maxWin: 500,
      title: "Золотой сундук",
      description: "Найдите сокровища пиратов!"
    },
    "mystic-oracle": { 
      price: 100, 
      winChance: 0.25, 
      maxWin: 1000,
      title: "Мистический оракул",
      description: "Раскройте тайны своей судьбы!"
    },
    "jungle-adventure": { 
      price: 200, 
      winChance: 0.2, 
      maxWin: 3000,
      title: "Приключения в джунглях",
      description: "Отыщите древние артефакты!"
    },
  };

  // Получаем конфигурацию для текущей лотереи или используем значения по умолчанию
  const config = lotteryConfig[type] || lotteryConfig["pirate-treasure"];

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
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
        setError("Не удалось загрузить данные пользователя");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [type]);

  useEffect(() => {
    const checkCooldown = () => {
      const now = new Date().getTime();
      const last = localStorage.getItem(`lastPlayed_${type}`);
      if (last) {
        const timeDiff = (now - parseInt(last)) / 1000; // секунды
        if (timeDiff < 60) { // 1 минута для тестирования
          setCanPlay(false);
          setLastPlayed(new Date(parseInt(last)));
          
          // Запускаем интервал для обновления оставшегося времени
          const interval = setInterval(() => {
            const currentTime = new Date().getTime();
            const elapsed = (currentTime - parseInt(last)) / 1000;
            if (elapsed >= 60) {
              setCanPlay(true);
              clearInterval(interval);
            }
          }, 1000);
          
          return () => clearInterval(interval);
        } else {
          setCanPlay(true);
          localStorage.removeItem(`lastPlayed_${type}`);
        }
      }
    };
    checkCooldown();
  }, [type]);

  const playLottery = async () => {
    if (!user || user.balance < config.price) {
      setError("Недостаточно средств или вы не авторизованы");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Определяем выигрыш
      const win = Math.random() < config.winChance;
      let winnings = 0;
      
      if (win) {
        // Рассчитываем случайный выигрыш в пределах максимальной суммы
        winnings = Math.floor(Math.random() * (config.maxWin - config.price)) + config.price;
        
        // Обновляем баланс пользователя (добавляем выигрыш)
        await supabase
          .from("users")
          .update({ balance: user.balance + winnings - config.price })
          .eq("id", user.id);
        
        setUser({ ...user, balance: user.balance + winnings - config.price });
      } else {
        // Обновляем баланс пользователя (вычитаем стоимость)
        await supabase
          .from("users")
          .update({ balance: user.balance - config.price })
          .eq("id", user.id);
          
        setUser({ ...user, balance: user.balance - config.price });
      }

      // Записываем результат игры в историю
      await supabase
        .from("instant_lottery_history")
        .insert([{
          user_id: user.id,
          lottery_type: type,
          amount: config.price,
          is_win: win,
          winnings: win ? winnings : 0,
          played_at: new Date().toISOString()
        }]);

      // Устанавливаем время последней игры для кулдауна
      localStorage.setItem(`lastPlayed_${type}`, Date.now().toString());
      setCanPlay(false);
      setLastPlayed(new Date());
      
      // Устанавливаем результат для отображения
      setResult({ win, winnings });
    } catch (err) {
      console.error("Ошибка при игре в лотерею:", err);
      setError("Произошла ошибка при проведении игры");
    } finally {
      setLoading(false);
    }
  };

  const getTimeRemaining = () => {
    if (!lastPlayed) return "0 сек";
    const now = new Date().getTime();
    const timeDiff = 60 - ((now - lastPlayed.getTime()) / 1000);
    return timeDiff > 0 ? `${Math.ceil(timeDiff)} сек` : "0 сек";
  };

  if (loading && !user) {
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
            Для игры в моментальные лотереи необходимо авторизоваться.
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => navigate("/login")}
              className="px-4 py-2 bg-yellow-500 text-black font-semibold rounded-md hover:bg-yellow-600"
            >
              Войти
            </button>
            <button
              onClick={() => navigate("/instant-lotteries")}
              className="px-4 py-2 bg-gray-300 text-black font-semibold rounded-md hover:bg-gray-400"
            >
              Назад
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderGame = () => {
    switch (type) {
      case "pirate-treasure":
        return <PirateTreasure play={playLottery} canPlay={canPlay} result={result} />;
      case "mystic-oracle":
        return <MysticOracle play={playLottery} canPlay={canPlay} result={result} />;
      case "jungle-adventure":
        return <JungleAdventure play={playLottery} canPlay={canPlay} result={result} />;
      default:
        return <PirateTreasure play={playLottery} canPlay={canPlay} result={result} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center mb-6">
          <button 
            onClick={() => navigate("/instant-lotteries")}
            className="mr-4 flex items-center text-black hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Назад к списку
          </button>
          <h1 className="text-3xl font-bold text-black">
            {config.title}
          </h1>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-gray-600">Ваш баланс</p>
                <p className="text-2xl font-bold text-black">{user.balance?.toFixed(2) || "0.00"} ₽</p>
              </div>
              <div>
                <p className="text-gray-600">Стоимость игры</p>
                <p className="text-xl font-bold text-black">{config.price} ₽</p>
              </div>
            </div>
          </div>

          {!canPlay && (
            <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-yellow-700 font-medium text-center">
                Следующая игра доступна через: {getTimeRemaining()}
              </p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-red-700 font-medium text-center">
                {error}
              </p>
            </div>
          )}

          {renderGame()}
        </div>
      </div>
    </div>
  );
};

export default InstantLotteryGame;