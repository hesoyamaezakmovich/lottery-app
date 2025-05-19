import React, { useState, useCallback, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { ClipLoader } from "react-spinners";
import VIPStatus from "./VIPStatus"; // Импорт используемого компонента

const Profile = () => {
  const [user, setUser] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [username, setUsername] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);
  // Состояния для пополнения баланса
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [processingDeposit, setProcessingDeposit] = useState(false);

  const fetchUserAndTickets = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Пользователь не авторизован");
        setLoading(false);
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .single();
      if (userError) throw userError;
      setUser(userData);
      setUsername(userData.username || userData.email);

      const { data: ticketData, error: ticketError } = await supabase
        .from("tickets")
        .select(`
          id,
          purchased_at,
          is_winning,
          numbers,
          lottery_draw_id,
          lottery_draws (
            id,
            name,
            winning_numbers,
            draw_date,
            prize_pool,
            is_completed
          )
        `)
        .eq("user_id", session.user.id)
        .order("purchased_at", { ascending: false });

      if (ticketError) throw ticketError;
      setTickets(ticketData || []);
    } catch (err) {
      console.error("Ошибка при получении данных:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserAndTickets();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        fetchUserAndTickets();
      } else {
        setUser(null);
        setTickets([]);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, [fetchUserAndTickets]);

  const handleSaveUsername = async () => {
    if (!username.trim()) {
      alert("Имя пользователя не может быть пустым");
      return;
    }

    setSavingUsername(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({ username })
        .eq("id", user.id);

      if (error) throw error;

      setUser({ ...user, username });
      setEditMode(false);
      alert("Имя пользователя успешно обновлено");
    } catch (err) {
      console.error("Ошибка при обновлении имени пользователя:", err);
      alert("Не удалось обновить имя пользователя: " + err.message);
    } finally {
      setSavingUsername(false);
    }
  };

  const handleDeposit = async (e) => {
    e.preventDefault();

    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Пожалуйста, введите корректную сумму");
      return;
    }

    setProcessingDeposit(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({
          balance: (user.balance || 0) + amount,
          crystals: (user.crystals || 0) + Math.floor(amount / 100) * 10,
        })
        .eq("id", user.id);

      if (error) throw error;

      const bonusCrystals = Math.floor(amount / 100) * 10;
      setUser({
        ...user,
        balance: (user.balance || 0) + amount,
        crystals: (user.crystals || 0) + bonusCrystals,
      });

      if (bonusCrystals > 0) {
        alert(`Баланс пополнен на ${amount} руб. Вы получили ${bonusCrystals} бонусных кристаллов!`);
      } else {
        alert(`Баланс пополнен на ${amount} руб.`);
      }

      setShowDepositForm(false);
      setDepositAmount("");
    } catch (err) {
      console.error("Ошибка при пополнении баланса:", err);
      alert("Ошибка при пополнении баланса: " + err.message);
    } finally {
      setProcessingDeposit(false);
    }
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <ClipLoader size={40} color="#000" />
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h2 className="text-2xl font-bold text-black mb-4 text-center">
            Ошибка
          </h2>
          <p className="text-red-600 text-center">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 w-full py-2 px-4 bg-yellow-500 text-black font-semibold rounded-md hover:bg-yellow-600"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-black">Пожалуйста, войдите в аккаунт</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-black mb-8 text-center">
          Профиль пользователя
        </h2>
        
        <div className="bg-white p-8 rounded-lg shadow-md mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-black">
              Имя пользователя: 
              {editMode ? (
                <div className="flex items-center mt-2">
                  <input 
                    type="text" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded-md mr-2"
                  />
                  <button 
                    onClick={handleSaveUsername}
                    disabled={savingUsername}
                    className="px-3 py-1 bg-yellow-500 text-black rounded-md hover:bg-yellow-600 mr-2"
                  >
                    {savingUsername ? <ClipLoader size={16} color="#000" /> : "Сохранить"}
                  </button>
                  <button 
                    onClick={() => {
                      setEditMode(false);
                      setUsername(user.username);
                    }}
                    className="px-3 py-1 bg-gray-300 text-black rounded-md hover:bg-gray-400"
                  >
                    Отмена
                  </button>
                </div>
              ) : (
                <span className="ml-2">{user.username || user.email}</span>
              )}
            </h3>
            {!editMode && (
              <button 
                onClick={() => setEditMode(true)} 
                className="px-3 py-1 bg-yellow-500 text-black rounded-md hover:bg-yellow-600"
              >
                Изменить
              </button>
            )}
          </div>
          
          <p className="text-black mb-6">Email: {user.email}</p>
          
          {/* Блок с балансом и кристаллами */}
          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h4 className="text-lg font-semibold text-black">Баланс</h4>
                <p className="text-2xl font-bold text-black">{user.balance?.toFixed(2) || "0.00"} ₽</p>
              </div>
              <button 
                onClick={() => setShowDepositForm(!showDepositForm)}
                className="px-4 py-2 bg-yellow-500 text-black rounded-md hover:bg-yellow-600"
              >
                {showDepositForm ? "Отмена" : "Пополнить баланс"}
              </button>
            </div>
            
            {showDepositForm && (
              <form onSubmit={handleDeposit} className="mb-4">
                <div className="flex items-center">
                  <input 
                    type="number" 
                    min="1"
                    step="0.01"
                    value={depositAmount} 
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="Сумма пополнения"
                    className="px-4 py-2 border border-gray-300 rounded-l-md flex-grow"
                    required
                  />
                  <button 
                    type="submit"
                    disabled={processingDeposit}
                    className="px-4 py-2 bg-yellow-600 text-black rounded-r-md hover:bg-yellow-700"
                  >
                    {processingDeposit ? <ClipLoader size={16} color="#000" /> : "Пополнить"}
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  За каждые 100 ₽ вы получите 10 бонусных кристаллов!
                </p>
              </form>
            )}
            
            <div className="mt-4">
              <h4 className="text-lg font-semibold text-black">Кристаллы</h4>
              <div className="flex items-center">
                <span className="text-2xl font-bold text-black mr-2">{user.crystals || 0}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Кристаллы можно использовать для покупки билетов и получения специальных предложений.
              </p>
            </div>
            
            {user.vip_level > 0 && (
              <div className="mt-4">
                <h4 className="text-lg font-semibold text-black">VIP Уровень</h4>
                <p className="text-2xl font-bold text-purple-700">{user.vip_level}</p>
                <p className="text-sm text-gray-600 mt-1">
                  VIP-игроки получают дополнительные бонусы и привилегии.
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Компонент VIP Статуса */}
        <div className="mb-8">
          <VIPStatus />
        </div>
        
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h3 className="text-xl font-bold text-black mb-4">Купленные билеты</h3>
          {loading ? (
            <div className="flex justify-center py-8">
              <ClipLoader size={30} color="#000" />
            </div>
          ) : tickets.length === 0 ? (
            <p className="text-black">Вы еще не купили билеты</p>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="bg-gray-50 p-4 rounded-md">
                  <div className="flex justify-between items-center">
                    <p className="text-black font-semibold">
                      Билет #{ticket.id.slice(-6)} - {ticket.lottery_draws?.name || "Лотерея без названия"}
                    </p>
                    {ticket.is_winning && (
                      <span className="px-2 py-1 bg-green-500 text-white text-sm rounded-full">
                        Выигрышный
                      </span>
                    )}
                  </div>
                  
                  <p className="text-black mt-2">
                    <span className="font-semibold">Номера:</span> {ticket.numbers}
                  </p>
                  
                  {ticket.lottery_draws && (
                    <>
                      <p className="text-black">
                        <span className="font-semibold">Дата розыгрыша:</span> {
                          ticket.lottery_draws.draw_date 
                            ? new Date(ticket.lottery_draws.draw_date).toLocaleString() 
                            : "Дата не указана"
                        }
                      </p>
                      
                      {ticket.lottery_draws.is_completed && (
                        <p className="text-black">
                          <span className="font-semibold">Выигрышные номера:</span> {ticket.lottery_draws.winning_numbers || "Нет данных"}
                        </p>
                      )}
                      
                      <p className="text-black">
                        <span className="font-semibold">Призовой фонд:</span> {ticket.lottery_draws.prize_pool?.toFixed(2) || 0} ₽
                      </p>
                      
                      <p className="text-black">
                        <span className="font-semibold">Статус:</span> {
                          ticket.lottery_draws.is_completed
                            ? "Розыгрыш завершен"
                            : "Ожидает розыгрыша"
                        }
                      </p>
                    </>
                  )}
                  
                  <p className="text-gray-500 text-sm mt-2">
                    Куплен: {ticket.purchased_at ? new Date(ticket.purchased_at).toLocaleString() : "Дата не указана"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;