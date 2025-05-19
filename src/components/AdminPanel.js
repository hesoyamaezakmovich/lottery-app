import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { ClipLoader } from "react-spinners";
import { useNavigate } from "react-router-dom";

const AdminPanel = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lotteries, setLotteries] = useState([]);
  const [users, setUsers] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTickets: 0,
    totalPrizePool: 0,
    completedDraws: 0,
    activeDraws: 0,
  });

  // Состояния для создания новой лотереи
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newLottery, setNewLottery] = useState({
    name: "", // Добавляем поле name
    prize_pool: 1000,
    draw_date: "",
  });
  const [creatingLottery, setCreatingLottery] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("vip_level")
        .eq("id", session.user.id)
        .single();

      if (error) {
        setError("Ошибка при проверке прав доступа");
        navigate("/dashboard");
        return;
      }

      if (!data || data.vip_level < 5) {
        setError("У вас нет прав доступа к этой странице");
        navigate("/dashboard");
        return;
      }

      fetchData();
    };

    checkAdmin();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/login");
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, [navigate]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: lotteriesData, error: lotteriesError } = await supabase
        .from("lottery_draws")
        .select("*")
        .order("draw_date", { ascending: false });

      if (lotteriesError) throw lotteriesError;
      setLotteries(lotteriesData || []);

      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (usersError) throw usersError;
      setUsers(usersData || []);

      const { data: ticketsData, error: ticketsError } = await supabase
        .from("tickets")
        .select(`
          id,
          purchased_at,
          is_winning,
          user_id,
          lottery_draw_id
        `)
        .order("purchased_at", { ascending: false })
        .limit(20);

      if (ticketsError) throw ticketsError;
      setTickets(ticketsData || []);

      const statsObj = {
        totalUsers: usersData?.length || 0,
        totalTickets: ticketsData?.length || 0,
        totalPrizePool: lotteriesData?.reduce((sum, lottery) => sum + (lottery.prize_pool || 0), 0) || 0,
        completedDraws: lotteriesData?.filter(l => l.is_completed).length || 0,
        activeDraws: lotteriesData?.filter(l => !l.is_completed).length || 0,
      };

      setStats(statsObj);
    } catch (err) {
      console.error("Ошибка при загрузке данных:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewLottery({
      ...newLottery,
      [name]: value,
    });
  };

  const handleCreateLottery = async (e) => {
    e.preventDefault();
    setCreatingLottery(true);
    setError(null);

    try {
      if (!newLottery.draw_date) {
        throw new Error("Дата розыгрыша обязательна");
      }

      if (!newLottery.name.trim()) {
        throw new Error("Название лотереи обязательно");
      }

      const prizePool = parseFloat(newLottery.prize_pool);
      if (isNaN(prizePool) || prizePool <= 0) {
        throw new Error("Некорректный призовой фонд");
      }

      const { error } = await supabase
        .from("lottery_draws")
        .insert([{
          name: newLottery.name, // Добавляем название
          prize_pool: prizePool,
          draw_date: new Date(newLottery.draw_date).toISOString(),
          is_completed: false,
          winning_numbers: null
        }]);

      if (error) throw error;

      fetchData();
      setShowCreateForm(false);
      setNewLottery({
        name: "", // Сбрасываем поле name
        prize_pool: 1000,
        draw_date: "",
      });
      alert("Лотерея успешно создана!");
    } catch (err) {
      console.error("Ошибка при создании лотереи:", err);
      setError(err.message);
    } finally {
      setCreatingLottery(false);
    }
  };

  const handleCompleteDraw = async (lotteryId) => {
    if (!window.confirm("Вы уверены, что хотите завершить розыгрыш и определить победителей?")) {
      return;
    }

    setLoading(true);
    try {
      const winningNumbers = [];
      while (winningNumbers.length < 6) {
        const num = Math.floor(Math.random() * 36) + 1;
        if (!winningNumbers.includes(num)) {
          winningNumbers.push(num);
        }
      }
      winningNumbers.sort((a, b) => a - b);

      const { error: updateError } = await supabase
        .from("lottery_draws")
        .update({
          is_completed: true,
          winning_numbers: winningNumbers.join(",")
        })
        .eq("id", lotteryId);

      if (updateError) throw updateError;

      const { data: ticketsData, error: ticketsError } = await supabase
        .from("tickets")
        .select("*")
        .eq("lottery_draw_id", lotteryId);

      if (ticketsError) throw ticketsError;

      for (const ticket of ticketsData) {
        const ticketNumbers = ticket.numbers.split(",").map(n => parseInt(n.trim()));
        
        let matches = 0;
        for (const num of ticketNumbers) {
          if (winningNumbers.includes(num)) {
            matches++;
          }
        }
        
        if (matches >= 3) {
          await supabase
            .from("tickets")
            .update({ is_winning: true })
            .eq("id", ticket.id);
          
          const { data: lotteryData } = await supabase
            .from("lottery_draws")
            .select("prize_pool")
            .eq("id", lotteryId)
            .single();
          
          let prizeAmount = 0;
          if (matches === 3) {
            prizeAmount = lotteryData.prize_pool * 0.1;
          } else if (matches === 4) {
            prizeAmount = lotteryData.prize_pool * 0.2;
          } else if (matches === 5) {
            prizeAmount = lotteryData.prize_pool * 0.3;
          } else if (matches === 6) {
            prizeAmount = lotteryData.prize_pool * 0.4;
          }
          
          if (prizeAmount > 0) {
            const { data: userData } = await supabase
              .from("users")
              .select("balance")
              .eq("id", ticket.user_id)
              .single();
            
            await supabase
              .from("users")
              .update({ 
                balance: (userData.balance || 0) + prizeAmount,
                vip_level: matches === 6 ? 
                  Math.min((userData.vip_level || 0) + 2, 10) : 
                  (matches >= 4 ? Math.min((userData.vip_level || 0) + 1, 10) : (userData.vip_level || 0))
              })
              .eq("id", ticket.user_id);
          }
        }
      }

      fetchData();
      alert(`Розыгрыш завершен! Выигрышные номера: ${winningNumbers.join(", ")}`);
    } catch (err) {
      console.error("Ошибка при завершении розыгрыша:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !lotteries.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <ClipLoader size={40} color="#000" />
      </div>
    );
  }

  if (error && !lotteries.length) {
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

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-black mb-8 text-center">
          Административная панель
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-black mb-2">Пользователей</h3>
            <p className="text-2xl font-bold text-black">{stats.totalUsers}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-black mb-2">Билетов</h3>
            <p className="text-2xl font-bold text-black">{stats.totalTickets}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-black mb-2">Призовой фонд</h3>
            <p className="text-2xl font-bold text-black">{stats.totalPrizePool.toFixed(2)} ₽</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-black mb-2">Завершенных</h3>
            <p className="text-2xl font-bold text-black">{stats.completedDraws}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-black mb-2">Активных</h3>
            <p className="text-2xl font-bold text-black">{stats.activeDraws}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-black">Управление лотереями</h3>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-4 py-2 bg-yellow-500 text-black rounded-md hover:bg-yellow-600"
            >
              {showCreateForm ? "Отмена" : "Создать лотерею"}
            </button>
          </div>

          {showCreateForm && (
            <form onSubmit={handleCreateLottery} className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-black mb-1">
                    Название лотереи
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={newLottery.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label htmlFor="prize_pool" className="block text-sm font-medium text-black mb-1">
                    Призовой фонд (₽)
                  </label>
                  <input
                    type="number"
                    id="prize_pool"
                    name="prize_pool"
                    value={newLottery.prize_pool}
                    onChange={handleInputChange}
                    min="100"
                    step="100"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label htmlFor="draw_date" className="block text-sm font-medium text-black mb-1">
                    Дата розыгрыша
                  </label>
                  <input
                    type="datetime-local"
                    id="draw_date"
                    name="draw_date"
                    value={newLottery.draw_date}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              {error && <p className="text-red-600 mt-2">{error}</p>}
              <button
                type="submit"
                disabled={creatingLottery}
                className="mt-4 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
              >
                {creatingLottery ? <ClipLoader size={20} color="#fff" /> : "Создать лотерею"}
              </button>
            </form>
          )}

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left text-black">ID</th>
                  <th className="px-4 py-2 text-left text-black">Название</th>
                  <th className="px-4 py-2 text-left text-black">Призовой фонд</th>
                  <th className="px-4 py-2 text-left text-black">Дата розыгрыша</th>
                  <th className="px-4 py-2 text-left text-black">Статус</th>
                  <th className="px-4 py-2 text-left text-black">Выигрышные номера</th>
                  <th className="px-4 py-2 text-left text-black">Действия</th>
                </tr>
              </thead>
              <tbody>
                {lotteries.map((lottery) => (
                  <tr key={lottery.id} className="border-b border-gray-200">
                    <td className="px-4 py-2 text-black">{lottery.id.slice(-6)}</td>
                    <td className="px-4 py-2 text-black">{lottery.name || "Без названия"}</td>
                    <td className="px-4 py-2 text-black">{lottery.prize_pool?.toFixed(2)} ₽</td>
                    <td className="px-4 py-2 text-black">
                      {new Date(lottery.draw_date).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      {lottery.is_completed ? (
                        <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full">
                          Завершен
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded-full">
                          Активен
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-black">
                      {lottery.winning_numbers || "—"}
                    </td>
                    <td className="px-4 py-2">
                      {!lottery.is_completed && (
                        <button
                          onClick={() => handleCompleteDraw(lottery.id)}
                          className="px-3 py-1 bg-yellow-500 text-black text-sm rounded-md hover:bg-yellow-600"
                        >
                          Завершить
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h3 className="text-xl font-bold text-black mb-4">Последние пользователи</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left text-black">ID</th>
                  <th className="px-4 py-2 text-left text-black">Имя</th>
                  <th className="px-4 py-2 text-left text-black">Email</th>
                  <th className="px-4 py-2 text-left text-black">Баланс</th>
                  <th className="px-4 py-2 text-left text-black">Кристаллы</th>
                  <th className="px-4 py-2 text-left text-black">VIP</th>
                  <th className="px-4 py-2 text-left text-black">Дата регистрации</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-200">
                    <td className="px-4 py-2 text-black">{user.id.slice(-6)}</td>
                    <td className="px-4 py-2 text-black">{user.username || "—"}</td>
                    <td className="px-4 py-2 text-black">{user.email}</td>
                    <td className="px-4 py-2 text-black">{user.balance?.toFixed(2) || "0.00"} ₽</td>
                    <td className="px-4 py-2 text-black">{user.crystals || 0}</td>
                    <td className="px-4 py-2 text-black">{user.vip_level || 0}</td>
                    <td className="px-4 py-2 text-black">
                      {new Date(user.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-bold text-black mb-4">Последние билеты</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left text-black">ID</th>
                  <th className="px-4 py-2 text-left text-black">Пользователь</th>
                  <th className="px-4 py-2 text-left text-black">Лотерея</th>
                  <th className="px-4 py-2 text-left text-black">Дата покупки</th>
                  <th className="px-4 py-2 text-left text-black">Статус</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="border-b border-gray-200">
                    <td className="px-4 py-2 text-black">{ticket.id.slice(-6)}</td>
                    <td className="px-4 py-2 text-black">{ticket.user_id.slice(-6)}</td>
                    <td className="px-4 py-2 text-black">{ticket.lottery_draw_id.slice(-6)}</td>
                    <td className="px-4 py-2 text-black">
                      {new Date(ticket.purchased_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      {ticket.is_winning ? (
                        <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full">
                          Выигрышный
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-500 text-white text-xs rounded-full">
                          Обычный
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;