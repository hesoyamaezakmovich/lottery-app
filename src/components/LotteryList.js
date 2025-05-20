import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { ClipLoader } from "react-spinners";
import ARLotteryCard from "./ARLotteryCard";
import { motion } from "framer-motion";

const LotteryList = () => {
  const [lotteries, setLotteries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserAndLotteries = async () => {
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

        const { data, error: lotteryError } = await supabase
          .from("lottery_draws")
          .select("*")
          .eq("is_completed", false)
          .order("draw_date", { ascending: true });

        if (lotteryError) throw lotteryError;
        setLotteries(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndLotteries();
  }, []);

  const handleLotterySelect = (lotteryId) => {
    navigate(`/lottery/${lotteryId}`);
  };
  
  const handleARLotteryPlay = () => {
    navigate('/ar-lottery');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <ClipLoader size={40} color="#8B5CF6" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg border border-purple-700">
          <p className="text-red-400">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-purple-600 rounded-md text-white hover:bg-purple-700"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 py-8">
      <div className="w-full px-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-2 text-center">
            Испытайте удачу
          </h2>
          <p className="text-purple-300 text-center text-lg md:text-xl mb-12">
            Выбирайте из множества захватывающих лотерей с большими призами
          </p>
        </motion.div>
        
        {/* Обновленная секция AR Лотереи на всю ширину */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative w-full mb-16"
        >
          {/* Фоновый градиент с эффектом parallax */}
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-indigo-900 via-blue-900 to-purple-900 opacity-90">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 animate-slow-move"></div>
          </div>
          
          {/* Декоративные элементы */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500 rounded-full filter blur-3xl opacity-20 -mt-20 -ml-20"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl opacity-20 -mb-40 -mr-40"></div>

          <div className="relative z-10 py-12 md:py-20 px-6 md:px-12 w-full">
            <div className="flex flex-col md:flex-row items-center justify-between max-w-7xl mx-auto">
              <div className="text-center md:text-left mb-8 md:mb-0 md:mr-12">
                <div className="flex items-center justify-center md:justify-start mb-4">
                  <h3 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                    AR Лотерея
                  </h3>
                  <span className="ml-4 px-3 py-1 bg-yellow-400 text-sm font-bold rounded-full text-black shadow-md">
                    НОВИНКА
                  </span>
                </div>
                <p className="text-blue-100 text-lg md:text-xl mb-6 max-w-lg mx-auto md:mx-0 leading-relaxed">
                  Испытайте революционный опыт лотереи с технологией дополненной реальности! 
                  Откройте сундук с сокровищами прямо в вашей комнате и узнайте свой приз.
                </p>
                <ul className="text-blue-100 mb-8 space-y-3 text-center md:text-left">
                  <li className="flex items-center justify-center md:justify-start">
                    <svg className="h-6 w-6 mr-3 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Стоимость билета: 75 ₽
                  </li>
                  <li className="flex items-center justify-center md:justify-start">
                    <svg className="h-6 w-6 mr-3 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Шанс выигрыша: 25%
                  </li>
                  <li className="flex items-center justify-center md:justify-start">
                    <svg className="h-6 w-6 mr-3 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Выигрыш до 1000 ₽
                  </li>
                </ul>
                <motion.button 
                  onClick={handleARLotteryPlay}
                  whileHover={{ scale: 1.05, boxShadow: "0 10px 20px rgba(0, 0, 0, 0.3)" }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-lg"
                >
                  Попробовать AR Лотерею
                </motion.button>
              </div>
              <div className="w-full md:w-1/2 lg:w-1/3">
                <ARLotteryCard onPlay={handleARLotteryPlay} />
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Остальные секции остаются без изменений */}
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-16">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-bold text-white">Доступные лотереи</h3>
              <div className="relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg blur"></div>
                <button className="relative px-4 py-2 bg-black rounded-lg text-white">
                  Все лотереи
                </button>
              </div>
            </div>
            
            {lotteries.length === 0 ? (
              <div className="bg-gray-800 p-8 rounded-lg shadow-lg text-center border border-gray-700">
                <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-300 mb-4 text-lg">Нет доступных лотерей в данный момент</p>
                <p className="text-gray-500">Новые лотереи скоро появятся, заглядывайте позже!</p>
              </div>
            ) : (
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {lotteries.map((lottery) => (
                  <motion.div key={lottery.id} variants={itemVariants}>
                    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-lg overflow-hidden border border-gray-700 hover:border-purple-500 transition-all duration-300 transform hover:-translate-y-1">
                      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4">
                        <h3 className="text-xl font-bold text-white">
                          {lottery.name || "Лотерея"}
                        </h3>
                      </div>
                      <div className="p-5">
                        <div className="flex justify-between items-center mb-4">
                          <div>
                            <p className="text-gray-400 text-sm">Призовой фонд</p>
                            <p className="text-2xl font-bold text-white">{lottery.prize_pool?.toLocaleString()} ₽</p>
                          </div>
                          <div className="text-right">
                            <p className="text-gray-400 text-sm">Стоимость билета</p>
                            <p className="text-xl font-semibold text-white">{lottery.ticket_price || 100} ₽</p>
                          </div>
                        </div>
                        <div className="mb-4 p-3 bg-gray-700 bg-opacity-50 rounded-md">
                          <p className="text-gray-300 font-medium">
                            Дата розыгрыша: {new Date(lottery.draw_date).toLocaleString()}
                          </p>
                          <div className="mt-2 w-full bg-gray-700 rounded-full h-1.5">
                            <div className="bg-gradient-to-r from-purple-500 to-blue-500 h-1.5 rounded-full w-3/4"></div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleLotterySelect(lottery.id)}
                          className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-md hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105"
                        >
                          Подробнее
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mb-8"
          >
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-bold text-white">Моментальные лотереи</h3>
              <button 
                onClick={() => navigate('/instant-lotteries')}
                className="px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 rounded-lg text-white hover:from-green-700 hover:to-teal-700"
              >
                Смотреть все
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-yellow-900 to-amber-900 rounded-xl shadow-lg overflow-hidden hover:shadow-amber-900/20 transition-all duration-300 transform hover:-translate-y-1">
                <div className="p-6">
                  <div className="w-16 h-16 bg-yellow-500 bg-opacity-30 rounded-full flex items-center justify-center mb-4 mx-auto">
                    <svg className="w-8 h-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white text-center mb-2">
                    Золотой сундук
                  </h3>
                  <p className="text-yellow-200 text-center mb-4">
                    Открой сундук с сокровищами!
                  </p>
                  <div className="bg-black bg-opacity-30 p-3 rounded-lg mb-4">
                    <p className="text-white text-center font-semibold">
                      Стоимость: 50 ₽
                    </p>
                    <p className="text-amber-300 text-center text-sm">
                      Шанс выигрыша: 30%
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/instant-lottery/pirate-treasure')}
                    className="w-full py-3 px-4 bg-yellow-600 text-white font-bold rounded-lg hover:bg-yellow-700 transition-all duration-300"
                  >
                    Играть
                  </button>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-indigo-900 to-violet-900 rounded-xl shadow-lg overflow-hidden hover:shadow-violet-900/20 transition-all duration-300 transform hover:-translate-y-1">
                <div className="p-6">
                  <div className="w-16 h-16 bg-indigo-500 bg-opacity-30 rounded-full flex items-center justify-center mb-4 mx-auto">
                    <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white text-center mb-2">
                    Мистический оракул
                  </h3>
                  <p className="text-indigo-200 text-center mb-4">
                    Раскрой тайны своей судьбы!
                  </p>
                  <div className="bg-black bg-opacity-30 p-3 rounded-lg mb-4">
                    <p className="text-white text-center font-semibold">
                      Стоимость: 100 ₽
                    </p>
                    <p className="text-indigo-300 text-center text-sm">
                      Шанс выигрыша: 25%
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/instant-lottery/mystic-oracle')}
                    className="w-full py-3 px-4 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-all duration-300"
                  >
                    Играть
                  </button>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-emerald-900 to-green-900 rounded-xl shadow-lg overflow-hidden hover:shadow-green-900/20 transition-all duration-300 transform hover:-translate-y-1">
                <div className="p-6">
                  <div className="w-16 h-16 bg-emerald-500 bg-opacity-30 rounded-full flex items-center justify-center mb-4 mx-auto">
                    <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white text-center mb-2">
                    Приключения в джунглях
                  </h3>
                  <p className="text-emerald-200 text-center mb-4">
                    Отправься на поиски сокровищ!
                  </p>
                  <div className="bg-black bg-opacity-30 p-3 rounded-lg mb-4">
                    <p className="text-white text-center font-semibold">
                      Стоимость: 200 ₽
                    </p>
                    <p className="text-emerald-300 text-center text-sm">
                      Шанс выигрыша: 20%
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/instant-lottery/jungle-adventure')}
                    className="w-full py-3 px-4 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-all duration-300"
                  >
                    Играть
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default LotteryList;