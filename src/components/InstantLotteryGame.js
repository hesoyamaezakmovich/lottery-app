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
  const [showRules, setShowRules] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Конфигурация лотерей
  const lotteryConfig = {
    "pirate-treasure": {
      price: 50,
      winChance: 0.3,
      maxWin: 500,
      title: "Золотой сундук",
      description: "Найдите сокровища пиратов!",
      rules: (
        <>
          <p><strong>Описание:</strong> Выберите один из трех сундуков. Один из них содержит сокровище, которое принесет выигрыш.</p>
          <p><strong>Стоимость игры:</strong> 50 ₽</p>
          <p><strong>Шанс выигрыша:</strong> 30%</p>
          <p><strong>Максимальный выигрыш:</strong> 500 ₽</p>
          <p><strong>Как играть:</strong> Нажмите на один из сундуков. Если он выигрышный, вы получите случайную сумму от 50 ₽ до 500 ₽.</p>
          <p><strong>Кулдаун:</strong> 60 секунд между играми.</p>
          <p><strong>Примечание:</strong> Результат отображается с анимацией открытия сундука.</p>
        </>
      ),
    },
    "mystic-oracle": {
      price: 100,
      winChance: 0.25,
      maxWin: 1000,
      title: "Мистический оракул",
      description: "Раскройте тайны своей судьбы!",
      rules: (
        <>
          <p><strong>Описание:</strong> Выберите одну из пяти магических карт. Одна из них может принести удачу.</p>
          <p><strong>Стоимость игры:</strong> 100 ₽</p>
          <p><strong>Шанс выигрыша:</strong> 25%</p>
          <p><strong>Максимальный выигрыш:</strong> 1000 ₽</p>
          <p><strong>Как играть:</strong> Нажмите на одну из карт. Если она выигрышная, вы получите случайную сумму от 100 ₽ до 1000 ₽.</p>
          <p><strong>Кулдаун:</strong> 60 секунд между играми.</p>
          <p><strong>Примечание:</strong> Карты анимируются с эффектом переворота.</p>
        </>
      ),
    },
    "jungle-adventure": {
      price: 200,
      winChance: 0.2,
      maxWin: 3000,
      title: "Приключения в джунглях",
      description: "Отыщите древние артефакты!",
      rules: (
        <>
          <p><strong>Описание:</strong> Выберите один из трех путей (Храм, Водопад, Пещера). Один ведет к сокровищу.</p>
          <p><strong>Стоимость игры:</strong> 200 ₽</p>
          <p><strong>Шанс выигрыша:</strong> 20%</p>
          <p><strong>Максимальный выигрыш:</strong> 3000 ₽</p>
          <p><strong>Как играть:</strong> Нажмите на один из путей. Если он ведет к сокровищу, вы получите случайную сумму от 200 ₽ до 3000 ₽.</p>
          <p><strong>Кулдаун:</strong> 60 секунд между играми.</p>
          <p><strong>Примечание:</strong> Результат показывается с тематической анимацией.</p>
        </>
      ),
    },
  };

  const config = lotteryConfig[type] || lotteryConfig["pirate-treasure"];

  // Получение данных пользователя
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

  // Управление кулдауном и таймером
  useEffect(() => {
    const checkCooldown = () => {
      const now = new Date().getTime();
      const last = localStorage.getItem(`lastPlayed_${type}`);
      if (last) {
        const timeDiff = (now - parseInt(last)) / 1000;
        if (timeDiff < 60) {
          setCanPlay(false);
          setLastPlayed(new Date(parseInt(last)));
          setTimeRemaining(Math.ceil(60 - timeDiff));
        } else {
          setCanPlay(true);
          setTimeRemaining(0);
          localStorage.removeItem(`lastPlayed_${type}`);
        }
      }
    };

    checkCooldown();

    const interval = setInterval(() => {
      if (!canPlay && lastPlayed) {
        const now = new Date().getTime();
        const timeDiff = 60 - ((now - lastPlayed.getTime()) / 1000);
        if (timeDiff <= 0) {
          setCanPlay(true);
          setTimeRemaining(0);
          localStorage.removeItem(`lastPlayed_${type}`);
        } else {
          setTimeRemaining(Math.ceil(timeDiff));
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [type, canPlay, lastPlayed]);

  // Логика игры
  const playLottery = async () => {
    if (!user || user.balance < config.price) {
      setError("Недостаточно средств или вы не авторизованы");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const win = Math.random() < config.winChance;
      let winnings = 0;

      if (win) {
        winnings = Math.floor(Math.random() * (config.maxWin - config.price)) + config.price;
        await supabase
          .from("users")
          .update({ balance: user.balance + winnings - config.price })
          .eq("id", user.id);
        setUser({ ...user, balance: user.balance + winnings - config.price });
      } else {
        await supabase
          .from("users")
          .update({ balance: user.balance - config.price })
          .eq("id", user.id);
        setUser({ ...user, balance: user.balance - config.price });
      }

      await supabase
        .from("instant_lottery_history")
        .insert([
          {
            user_id: user.id,
            lottery_type: type,
            amount: config.price,
            is_win: win,
            winnings: win ? winnings : 0,
            played_at: new Date().toISOString(),
          },
        ]);

      localStorage.setItem(`lastPlayed_${type}`, Date.now().toString());
      setCanPlay(false);
      setLastPlayed(new Date());
      setResult({ win, winnings });
    } catch (err) {
      console.error("Ошибка при игре в лотерею:", err);
      setError("Произошла ошибка при проведении игры");
    } finally {
      setLoading(false);
    }
  };

  // Модальное окно с правилами
  const RulesModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <h3 className="text-xl font-bold text-black mb-4">Правила игры: {config.title}</h3>
        <div className="text-gray-700 mb-4">{config.rules}</div>
        <button
          onClick={() => setShowRules(false)}
          className="w-full py-2 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600"
        >
          Закрыть
        </button>
      </div>
    </div>
  );

  // Рендеринг игры
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

  return (
    <div
      className={`min-h-screen py-8 ${
        type === "pirate-treasure"
          ? "bg-gradient-to-b from-amber-100 to-amber-300"
          : type === "mystic-oracle"
          ? "bg-gradient-to-b from-indigo-100 to-purple-300"
          : "bg-gradient-to-b from-green-100 to-emerald-300"
      }`}
    >
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate("/instant-lotteries")}
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
            Назад к списку
          </button>
          <h1 className="text-3xl font-bold text-black">{config.title}</h1>
          <button
            onClick={() => setShowRules(true)}
            className="ml-auto px-4 py-2 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600"
          >
            Правила
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-gray-600">Ваш баланс</p>
                <p className="text-2xl font-bold text-black">
                  {user.balance?.toFixed(2) || "0.00"} ₽
                </p>
              </div>
              <div>
                <p className="text-gray-600">Стоимость игры</p>
                <p className="text-xl font-bold text-black">{config.price} ₽</p>
              </div>
            </div>
          </div>

          {!canPlay && (
            <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-yellow-700 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l1.5 1.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-yellow-700 font-medium">
                Следующая игра через: {timeRemaining} сек
              </p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-red-700 font-medium text-center">{error}</p>
            </div>
          )}

          {renderGame()}
        </div>
      </div>
      {showRules && <RulesModal />}
    </div>
  );
};

export default InstantLotteryGame;