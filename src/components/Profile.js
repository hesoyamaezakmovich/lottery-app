import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const Profile = () => {
  const [user, setUser] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserAndTickets = async () => {
      setLoading(true);
      try {
        // Получение данных пользователя
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) {
          setError("Пользователь не авторизован");
          setLoading(false);
          return;
        }

        // Получение профиля
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", userData.user.id)
          .single();

        if (profileError) throw profileError;

        setUser({ ...userData.user, username: profileData.username });

        // Получение билетов
        const { data: ticketData, error: ticketError } = await supabase
          .from("tickets")
          .select(`
            id,
            purchased_at,
            lotteries (
              name,
              draw_date
            )
          `)
          .eq("user_id", userData.user.id)
          .order("purchased_at", { ascending: false });

        if (ticketError) throw ticketError;

        setTickets(ticketData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndTickets();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-black">Загрузка...</p>
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
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h3 className="text-xl font-bold text-black mb-4">
            Имя пользователя: {user.username}
          </h3>
          <p className="text-black mb-4">Email: {user.email}</p>
          <h3 className="text-xl font-bold text-black mb-4">Купленные билеты</h3>
          {tickets.length === 0 ? (
            <p className="text-black">Вы еще не купили билеты</p>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="bg-gray-50 p-4 rounded-md">
                  <p className="text-black">
                    Лотерея: {ticket.lotteries.name}
                  </p>
                  <p className="text-black">
                    Дата покупки: {new Date(ticket.purchased_at).toLocaleString()}
                  </p>
                  <p className="text-black">
                    Дата розыгрыша: {new Date(ticket.lotteries.draw_date).toLocaleString()}
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