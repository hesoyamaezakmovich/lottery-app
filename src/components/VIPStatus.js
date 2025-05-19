import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const VIPStatus = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", session.user.id)
          .single();
        if (!error) setUser(data);
      }
    };
    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        supabase
          .from("users")
          .select("*")
          .eq("id", session.user.id)
          .single()
          .then(({ data, error }) => {
            if (!error) setUser(data);
          });
      } else {
        setUser(null);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  // Функция для определения следующего уровня VIP
  const getNextVIPLevel = () => {
    if (!user) return 1;

    const currentLevel = user.vip_level || 0;
    return Math.min(currentLevel + 1, 10); // Максимальный уровень VIP - 10
  };

  // Функция для получения требуемого количества кристаллов для следующего уровня
  const getRequiredCrystals = () => {
    const nextLevel = getNextVIPLevel();
    return nextLevel * 100; // Например, 100 кристаллов на каждый уровень
  };

  // Функция для получения бонусов для текущего уровня VIP
  const getCurrentVIPBenefits = () => {
    if (!user) return [];

    const currentLevel = user.vip_level || 0;

    const benefits = [
      { level: 1, name: "Скидка 5% на билеты" },
      { level: 2, name: "Бонус +10 кристаллов при пополнении" },
      { level: 3, name: "Ежедневный бонус +5 кристаллов" },
      { level: 4, name: "Скидка 10% на билеты" },
      { level: 5, name: "Доступ к административной панели" },
      { level: 6, name: "Ежедневный бонус +10 кристаллов" },
      { level: 7, name: "Скидка 15% на билеты" },
      { level: 8, name: "Бонус +50 кристаллов при пополнении" },
      { level: 9, name: "Ежедневный бонус +20 кристаллов" },
      { level: 10, name: "Скидка 20% на билеты + приоритетная поддержка" },
    ];

    return benefits.filter(benefit => benefit.level <= currentLevel);
  };

  // Функция для получения бонусов для следующего уровня VIP
  const getNextVIPBenefits = () => {
    const nextLevel = getNextVIPLevel();

    if (nextLevel > 10) return [];

    const benefits = [
      { level: 1, name: "Скидка 5% на билеты" },
      { level: 2, name: "Бонус +10 кристаллов при пополнении" },
      { level: 3, name: "Ежедневный бонус +5 кристаллов" },
      { level: 4, name: "Скидка 10% на билеты" },
      { level: 5, name: "Доступ к административной панели" },
      { level: 6, name: "Ежедневный бонус +10 кристаллов" },
      { level: 7, name: "Скидка 15% на билеты" },
      { level: 8, name: "Бонус +50 кристаллов при пополнении" },
      { level: 9, name: "Ежедневный бонус +20 кристаллов" },
      { level: 10, name: "Скидка 20% на билеты + приоритетная поддержка" },
    ];

    return benefits.filter(benefit => benefit.level === nextLevel);
  };

  // Функция для отображения прогресса до следующего уровня
  const getProgressPercentage = () => {
    if (!user) return 0;

    const currentLevel = user.vip_level || 0;
    if (currentLevel >= 10) return 100; // Максимальный уровень достигнут

    const requiredCrystals = getRequiredCrystals();
    const userCrystals = user.crystals || 0;

    return Math.min(Math.floor((userCrystals / requiredCrystals) * 100), 100);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-xl font-bold text-black mb-4">VIP Статус</h3>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-black font-semibold">Текущий уровень:</span>
          <span className="text-xl font-bold text-purple-700">{user.vip_level || 0}</span>
        </div>

        {user.vip_level < 10 && (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-black font-semibold">Следующий уровень:</span>
              <span className="text-lg font-semibold text-purple-600">{getNextVIPLevel()}</span>
            </div>

            <div className="flex items-center justify-between mb-1">
              <span className="text-black">Прогресс:</span>
              <span className="text-black">{user.crystals || 0} / {getRequiredCrystals()} кристаллов</span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-purple-600 h-2.5 rounded-full" 
                style={{ width: `${getProgressPercentage()}%` }}
              ></div>
            </div>
          </>
        )}
      </div>

      <div className="mb-6">
        <h4 className="text-lg font-semibold text-black mb-2">Текущие привилегии</h4>

        {getCurrentVIPBenefits().length > 0 ? (
          <ul className="list-disc pl-5 space-y-1">
            {getCurrentVIPBenefits().map((benefit, index) => (
              <li key={index} className="text-black">
                {benefit.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">У вас пока нет VIP привилегий</p>
        )}
      </div>

      {getNextVIPBenefits().length > 0 && (
        <div>
          <h4 className="text-lg font-semibold text-black mb-2">Следующий уровень</h4>
          <ul className="list-disc pl-5 space-y-1">
            {getNextVIPBenefits().map((benefit, index) => (
              <li key={index} className="text-black">
                {benefit.name}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-gray-500">
            Накопите еще {getRequiredCrystals() - (user.crystals || 0)} кристаллов для следующего уровня
          </p>
        </div>
      )}

      {user.vip_level >= 10 && (
        <div className="mt-4 p-3 bg-purple-100 rounded-md">
          <p className="text-purple-800 font-semibold">
            Поздравляем! Вы достигли максимального VIP уровня и получили все доступные привилегии.
          </p>
        </div>
      )}
    </div>
  );
};

export default VIPStatus;