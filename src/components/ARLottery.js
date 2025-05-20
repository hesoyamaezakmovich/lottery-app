// src/components/ARLottery.js
import React from "react";
import { useNavigate } from "react-router-dom";
import ARLotteryCard from "./ARLotteryCard";
import { supabase } from "../supabaseClient"; // Путь зависит от расположения supabaseClient.js

const ARLottery = () => {
  const navigate = useNavigate();

  const handlePlay = async () => {
    console.log("=== handlePlay: Начало обработки нажатия кнопки 'Играть' ===");
    try {
      console.log("Проверка авторизации...");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("=== Ошибка: Пользователь не авторизован ===");
        navigate("/login");
        return;
      }
      console.log("=== Пользователь авторизован, user.id:", user.id, "===");

      console.log("Создание билета...");
      const { data, error } = await supabase
        .from("ar_lottery_tickets")
        .insert({
          user_id: user.id,
          is_win: Math.random() < 0.25,
          win_amount: 1000,
          viewed: false,
        })
        .select()
        .single();

      if (error) {
        console.error("=== Ошибка при создании билета:", error.message, "===");
        throw error;
      }

      console.log("=== Билет создан успешно, data:", data, "===");
      navigate(`/ar-lottery/view/${data.id}`);
    } catch (err) {
      console.error("=== Общая ошибка в handlePlay:", err.message, "===");
      // Добавим временное уведомление в консоль для пользователя
      console.log("=== Произошла ошибка. Проверьте консоль или авторизацию. ===");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <ARLotteryCard onPlay={handlePlay} />
    </div>
  );
};

export default ARLottery;