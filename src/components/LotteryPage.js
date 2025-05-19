import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { ClipLoader } from "react-spinners";
import TicketNumberSelector from "./TicketNumberSelector";

const LotteryPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lottery, setLottery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [buying, setBuying] = useState(false);
  const [showTicketSelector, setShowTicketSelector] = useState(false);
  const [userTickets, setUserTickets] = useState([]);

  useEffect(() => {
    const fetchLotteryData = async () => {
      setLoading(true);
      try {
        // Получаем данные лотереи
        const { data: lotteryData, error: lotteryError } = await supabase
          .from("lottery_draws")
          .select("*")
          .eq("id", id)
          .single();

        if (lotteryError) {
          throw lotteryError;
        }

        setLottery(lotteryData);

        // Получаем данные текущего пользователя
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("*")
            .eq("id", session.user.id)
            .single();

          if (!userError) {
            setUser(userData);

            // Получаем билеты пользователя для этой лотереи
            const { data: ticketsData, error: ticketsError } = await supabase
              .from("tickets")
              .select("*")
              .eq("user_id", session.user.id)
              .eq("lottery_draw_id", id);

            if (!ticketsError) {
              setUserTickets(ticketsData || []);
            }
          }
        }
      } catch (err) {
        console.error("Ошибка при загрузке данных:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLotteryData();
  }, [id]);

  const handleBuyTicket = async (selectedNumbers) => {
    if (!user) {
      setError("Пожалуйста, войдите в аккаунт");
      navigate("/login");
      return;
    }

    setBuying(true);
    setError(null);

    try {
      // Проверяем баланс пользователя
      const ticketPrice = lottery.ticket_price || 100;
      
      if (user.balance < ticketPrice) {
        const remainingCost = ticketPrice - user.balance;
        const crystalsNeeded = Math.ceil(remainingCost / 10);

        if (user.crystals < crystalsNeeded) {
          throw new Error("Недостаточно денег и кристаллов для покупки билета");
        }

        const crystalsToUse = crystalsNeeded;
        await supabase
          .from("users")
          .update({ balance: 0, crystals: user.crystals - crystalsToUse })
          .eq("id", user.id);
      } else {
        await supabase
          .from("users")
          .update({ balance: user.balance - ticketPrice })
          .eq("id", user.id);
      }

      // Сохраняем билет с выбранными номерами
      const numbersString = selectedNumbers.join(',');
      
      const { error } = await supabase
        .from("tickets")
        .insert([{ 
          user_id: user.id, 
          lottery_draw_id: id,
          numbers: numbersString,
          purchased_at: new Date().toISOString(),
          is_winning: false
        }]);

      if (error) throw error;

      // Обновляем локальное состояние пользователя
      const { data: updatedUser } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();
        
      setUser(updatedUser);

      // Получаем обновленный список билетов
      const { data: ticketsData } = await supabase
        .from("tickets")
        .select("*")
        .eq("user_id", user.id)
        .eq("lottery_draw_id", id);
        
      setUserTickets(ticketsData || []);

      alert("Билет успешно куплен!");
      setShowTicketSelector(false);
    } catch (err) {
      console.error("Ошибка при покупке билета:", err);
      setError(err.message);
    } finally {
      setBuying(false);
    }
  };

  // Функция для расчета времени до розыгрыша
  const getTimeRemaining = () => {
    if (!lottery) return null;
    
    const drawTime = new Date(lottery.draw_date).getTime();
    const now = new Date().getTime();
    const timeRemaining = drawTime - now;
    
    if (timeRemaining <= 0) {
      return "Розыгрыш скоро состоится";
    }
    
    const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days} дн. ${hours} ч. ${minutes} мин.`;
    } else if (hours > 0) {
      return `${hours} ч. ${minutes} мин.`;
    } else {
      return `${minutes} мин.`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <ClipLoader size={40} color="#000" />
      </div>
    );
  }

  if (error || !lottery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h2 className="text-2xl font-bold text-black mb-4 text-center">
            Ошибка
          </h2>
          <p className="text-red-600 text-center">{error || "Лотерея не найдена"}</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-4 w-full py-2 px-4 bg-yellow-500 text-black font-semibold rounded-md hover:bg-yellow-600"
          >
            Вернуться к списку лотерей
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
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Назад к списку
          </button>
          <h1 className="text-3xl font-bold text-black">
            {lottery.name || "Лотерея"}
          </h1>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          {/* Шапка лотереи */}
          <div className="bg-yellow-500 p-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-black">
                {lottery.name || "Лотерея"}
              </h2>
              {!lottery.is_completed && (
                <div className="bg-white px-4 py-2 rounded-lg text-black font-semibold">
                  До розыгрыша: {getTimeRemaining()}
                </div>
              )}
            </div>
          </div>

          <div className="p-6">
            {/* Основная информация */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
              <div>
                <h3 className="text-xl font-bold text-black mb-4">Информация о лотерее</h3>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-600">Призовой фонд</p>
                    <p className="text-3xl font-bold text-black">{lottery.prize_pool?.toLocaleString()} ₽</p>
                  </div>
                  
                  <div>
                    <p className="text-gray-600">Стоимость билета</p>
                    <p className="text-2xl font-bold text-black">{lottery.ticket_price || 100} ₽</p>
                  </div>
                  
                  <div>
                    <p className="text-gray-600">Дата розыгрыша</p>
                    <p className="text-xl font-semibold text-black">
                      {new Date(lottery.draw_date).toLocaleString()}
                    </p>
                  </div>
                  
                  {lottery.is_completed && (
                    <div>
                      <p className="text-gray-600">Выигрышные номера</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {lottery.winning_numbers?.split(',').map((num, index) => (
                          <div 
                            key={index} 
                            className="bg-yellow-500 w-10 h-10 rounded-full flex items-center justify-center text-black font-bold"
                          >
                            {num.trim()}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-black mb-4">Правила лотереи</h3>
                
                <div className="bg-gray-100 p-4 rounded-lg">
                  <p className="text-black mb-3">
                    Чтобы участвовать в лотерее, выберите 6 чисел от 1 до 36. Розыгрыш состоится {new Date(lottery.draw_date).toLocaleString()}.
                  </p>
                  
                  <h4 className="font-semibold text-black mb-2">Выигрыши:</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li className="text-black">3 совпадения - 10% призового фонда</li>
                    <li className="text-black">4 совпадения - 20% призового фонда</li>
                    <li className="text-black">5 совпадений - 30% призового фонда</li>
                    <li className="text-black">6 совпадений - 40% призового фонда</li>
                  </ul>
                  
                  <p className="text-black mt-3">
                    При выигрыше деньги автоматически зачисляются на ваш счет, а ваш VIP-уровень повышается.
                  </p>
                </div>
              </div>
            </div>

            {/* Кнопка покупки билета (если лотерея активна) */}
            {!lottery.is_completed && (
              <div className="mt-6">
                <button
                  onClick={() => setShowTicketSelector(true)}
                  disabled={buying}
                  className="w-full py-3 px-4 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-50 flex items-center justify-center transition-colors duration-200 text-lg"
                >
                  {buying ? (
                    <ClipLoader size={24} color="#000" />
                  ) : (
                    "Купить билет"
                  )}
                </button>
                {!user && (
                  <p className="text-center text-red-500 mt-2">
                    Для покупки билета необходимо авторизоваться
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Билеты пользователя */}
        {user && userTickets.length > 0 && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-gray-50 p-6">
              <h3 className="text-xl font-bold text-black mb-4">Ваши билеты для этой лотереи</h3>
              
              <div className="space-y-4">
                {userTickets.map((ticket) => (
                  <div key={ticket.id} className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-black font-semibold">
                        Билет #{ticket.id.slice(-6)}
                      </p>
                      {ticket.is_winning && (
                        <span className="px-3 py-1 bg-green-500 text-white text-sm rounded-full">
                          Выигрышный
                        </span>
                      )}
                    </div>
                    
                    <div>
                      <p className="text-gray-600 mb-2">Выбранные номера:</p>
                      <div className="flex flex-wrap gap-2">
                        {ticket.numbers?.split(',').map((num, index) => (
                          <div 
                            key={index} 
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold 
                              ${lottery.winning_numbers && lottery.winning_numbers.split(',').includes(num.trim()) 
                                ? 'bg-green-500 text-white' 
                                : 'bg-gray-200 text-black'}`}
                          >
                            {num.trim()}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <p className="text-gray-500 text-sm mt-3">
                      Куплен: {new Date(ticket.purchased_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Модальное окно выбора номеров */}
        {showTicketSelector && (
          <TicketNumberSelector 
            onConfirm={handleBuyTicket}
            onCancel={() => setShowTicketSelector(false)}
            ticketPrice={lottery.ticket_price || 100}
          />
        )}
        
        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default LotteryPage;