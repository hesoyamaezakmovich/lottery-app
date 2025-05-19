import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { ClipLoader } from "react-spinners";

const LotteryList = () => {
  const [lotteries, setLotteries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [buying, setBuying] = useState(null);
  const [user, setUser] = useState(null);

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

  const handleBuyTicket = async (lotteryId, ticketPrice) => {
    if (!user) {
      setError("Пожалуйста, войдите в аккаунт");
      return;
    }

    setBuying(lotteryId);
    setError(null);

    try {
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

      const { error } = await supabase
        .from("tickets")
        .insert([{ user_id: user.id, lottery_draw_id: lotteryId }]);

      if (error) throw error;

      // Обновляем локальное состояние пользователя
      const { data: updatedUser } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();
      setUser(updatedUser);

      alert("Билет успешно куплен!");
    } catch (err) {
      setError(err.message);
    } finally {
      setBuying(null);
    }
  };

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
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-black mb-8 text-center">
          Активные лотереи
        </h2>
        {lotteries.length === 0 ? (
          <p className="text-black text-center">Нет доступных лотерей</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {lotteries.map((lottery) => (
              <div
                key={lottery.id}
                className="bg-white p-6 rounded-lg shadow-md"
              >
                <h3 className="text-xl font-bold text-black mb-2">
                  {lottery.name || "Лотерея"}
                </h3>
                <p className="text-black">
                  Цена билета: {lottery.ticket_price || 100} руб.
                </p>
                <p className="text-black">
                  Призовой фонд: {lottery.prize_pool} руб.
                </p>
                <p className="text-black">
                  Дата розыгрыша: {new Date(lottery.draw_date).toLocaleString()}
                </p>
                <button
                  onClick={() => handleBuyTicket(lottery.id, lottery.ticket_price || 100)}
                  disabled={buying === lottery.id}
                  className="mt-4 w-full py-2 px-4 bg-yellow-500 text-black font-semibold rounded-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-50 flex items-center justify-center"
                >
                  {buying === lottery.id ? (
                    <ClipLoader size={20} color="#000" />
                  ) : (
                    "Купить билет"
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LotteryList;