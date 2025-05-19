import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { ClipLoader } from "react-spinners";

const Profile = () => {
  const [user, setUser] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [username, setUsername] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);

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
          .select("*")
          .eq("id", userData.user.id)
          .single();

        if (profileError) {
          console.error("Ошибка получения профиля:", profileError);
          
          // Если ошибка связана с отсутствием профиля, создаем его
          if (profileError.code === "PGRST116") {
            const { error: insertError } = await supabase
              .from("profiles")
              .insert({
                id: userData.user.id,
                email: userData.user.email,
                username: userData.user.email,
                created_at: new Date().toISOString()
              });
              
            if (insertError) {
              throw insertError;
            }
            
            // Повторно запрашиваем профиль после создания
            const { data: newProfileData } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", userData.user.id)
              .single();
              
            setUser({ 
              ...userData.user, 
              username: newProfileData?.username || userData.user.email 
            });
            setUsername(newProfileData?.username || userData.user.email);
          } else {
            throw profileError;
          }
        } else {
          // Успешно получили профиль
          setUser({ 
            ...userData.user, 
            username: profileData?.username || userData.user.email 
          });
          setUsername(profileData?.username || userData.user.email);
        }

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

        setTickets(ticketData || []);
      } catch (err) {
        console.error("Ошибка в компоненте Profile:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndTickets();
  }, []);

  const handleSaveUsername = async () => {
    if (!username.trim()) {
      alert("Имя пользователя не может быть пустым");
      return;
    }
    
    setSavingUsername(true);
    try {
      const { error } = await supabase
        .from("profiles")
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
        <div className="bg-white p-8 rounded-lg shadow-md">
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
          
          <h3 className="text-xl font-bold text-black mb-4">Купленные билеты</h3>
          {tickets.length === 0 ? (
            <p className="text-black">Вы еще не купили билеты</p>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="bg-gray-50 p-4 rounded-md">
                  <p className="text-black">
                    Лотерея: {ticket.lotteries?.name || "Название недоступно"}
                  </p>
                  <p className="text-black">
                    Дата покупки: {ticket.purchased_at ? new Date(ticket.purchased_at).toLocaleString() : "Дата не указана"}
                  </p>
                  <p className="text-black">
                    Дата розыгрыша: {ticket.lotteries?.draw_date ? new Date(ticket.lotteries.draw_date).toLocaleString() : "Дата не указана"}
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