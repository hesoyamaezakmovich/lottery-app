import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { ClipLoader } from "react-spinners";
import LotteryCard from "./LotteryCard";

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
          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <p className="text-black mb-4">Нет доступных лотерей в данный момент</p>
            <p className="text-gray-600">Пожалуйста, загляните позже</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {lotteries.map((lottery) => (
              <LotteryCard
                key={lottery.id}
                lottery={lottery}
                onBuyTicket={() => handleLotterySelect(lottery.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LotteryList;