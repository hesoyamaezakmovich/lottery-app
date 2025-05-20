import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ClipLoader } from 'react-spinners';

const LotteryList = () => {
  const [lotteries, setLotteries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserAndLotteries = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
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

  const handleARLotteryPlay = () => {
    navigate('/ar-lottery');
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-gray-900 to-gray-800 py-12 overflow-x-hidden">
      <div className="w-full px-4">
        <div className="text-center max-w-4xl mx-auto mb-12 mt-8">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-2">
            Испытайте удачу
          </h2>
          <p className="text-purple-300 text-lg md:text-xl mb-8">
            Выбирайте из множества захватывающих лотерей с большими призами
          </p>
        </div>

        <div className="relative w-full mb-16">
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-indigo-900 via-blue-900 to-purple-900 opacity-90">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
          </div>

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
                <button
                  onClick={handleARLotteryPlay}
                  className="px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl transition-all duration-300 shadow-lg"
                >
                  Попробовать AR Лотерею
                </button>
              </div>
              <div className="w-full md:w-1/2 lg:w-1/3">
                <div className="bg-gradient-to-b from-blue-600 via-blue-700 to-indigo-800 rounded-xl shadow-xl overflow-hidden border border-blue-400 border-opacity-20">
                  <div className="relative p-6">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-400 rounded-full filter blur-xl opacity-20 -mt-8 -mr-8"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500 rounded-full filter blur-xl opacity-20 -mb-16 -ml-16"></div>

                    <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-md p-6 rounded-lg relative z-10 border border-white border-opacity-20">
                      <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                      </div>

                      <div className="relative">
                        <h3 className="text-2xl font-bold text-white text-center mb-2">
                          AR Лотерея
                        </h3>
                        <div className="absolute -top-10 -right-4">
                          <span className="inline-block px-2 py-1 bg-yellow-500 text-xs font-bold rounded-full shadow-lg text-black transform rotate-12">NEW</span>
                        </div>
                      </div>

                      <p className="text-blue-100 text-center mb-4">
                        Увидьте результат в дополненной реальности!
                      </p>

                      <div className="bg-blue-900 bg-opacity-40 p-4 rounded-lg mb-5 border border-blue-400 border-opacity-30">
                        <div className="flex justify-between items-center mb-2 pb-2 border-b border-blue-300 border-opacity-30">
                          <span className="text-white font-medium">Стоимость:</span>
                          <span className="text-white font-bold">75 ₽</span>
                        </div>
                        <div className="flex justify-between items-center mb-2 pb-2 border-b border-blue-300 border-opacity-30">
                          <span className="text-white font-medium">Шанс выигрыша:</span>
                          <span className="text-white font-bold">25%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-white font-medium">Выигрыш до:</span>
                          <span className="text-white font-bold">1000 ₽</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-center space-x-2 mb-5 text-blue-100 text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <p>Разместите виртуальный сундук в вашем окружении!</p>
                      </div>

                      <button
                        onClick={handleARLotteryPlay}
                        className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-lg shadow-lg flex items-center justify-center space-x-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Играть</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-12">
          <h3 className="text-3xl font-bold text-white mb-8 text-center">
            Другие лотереи
          </h3>
          {loading ? (
            <div className="flex justify-center items-center">
              <ClipLoader color="#60A5FA" size={50} />
            </div>
          ) : error ? (
            <p className="text-red-400 text-center">{error}</p>
          ) : lotteries.length === 0 ? (
            <p className="text-gray-400 text-center">Нет доступных лотерей</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {lotteries.map((lottery) => (
                <div
                  key={lottery.id}
                  className="bg-gradient-to-b from-gray-800 to-gray-700 rounded-xl shadow-xl overflow-hidden border border-gray-600 border-opacity-20"
                >
                  <div className="relative p-6">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-400 rounded-full filter blur-xl opacity-20 -mt-8 -mr-8"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500 rounded-full filter blur-xl opacity-20 -mb-16 -ml-16"></div>

                    <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-md p-6 rounded-lg relative z-10 border border-white border-opacity-20">
                      <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-12 w-12 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3zm0 0c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3z"
                          />
                        </svg>
                      </div>

                      <h3 className="text-2xl font-bold text-white text-center mb-2">
                        {lottery.name || `Лотерея ${lottery.id}`}
                      </h3>
                      <p className="text-gray-300 text-center mb-4">
                        {lottery.description || "Участвуйте и выигрывайте крупные призы!"}
                      </p>

                      <div className="bg-gray-900 bg-opacity-40 p-4 rounded-lg mb-5 border border-gray-500 border-opacity-30">
                        <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-400 border-opacity-30">
                          <span className="text-white font-medium">Стоимость:</span>
                          <span className="text-white font-bold">
                            {lottery.ticket_price?.toLocaleString('ru-RU', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })} ₽
                          </span>
                        </div>
                        <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-400 border-opacity-30">
                          <span className="text-white font-medium">Шанс выигрыша:</span>
                          <span className="text-white font-bold">{lottery.win_chance || 20}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-white font-medium">Выигрыш до:</span>
                          <span className="text-white font-bold">
                            {lottery.max_prize?.toLocaleString('ru-RU', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })} ₽
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-center space-x-2 mb-5 text-gray-300 text-sm">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                        <p>
                          Дата розыгрыша:{" "}
                          {new Date(lottery.draw_date).toLocaleDateString("ru-RU", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                      </div>

                      <button
                        onClick={() => navigate(`/lottery/${lottery.id}`)}
                        className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-lg shadow-lg flex items-center justify-center space-x-2"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span>Участвовать</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LotteryList;