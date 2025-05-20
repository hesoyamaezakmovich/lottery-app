import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { ClipLoader } from "react-spinners";
import { motion, AnimatePresence } from "framer-motion";
import UserInventory from "./UserInventory"; // Import UserInventory component

const VIPShop = ({ isOpen, onClose }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [purchaseSuccess, setPurchaseSuccess] = useState(null);
  const [showInventory, setShowInventory] = useState(false);

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data, error } = await supabase
            .from("users")
            .select("*")
            .eq("id", session.user.id)
            .single();
          if (error) throw error;
          setUser(data);
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
        setError("Не удалось загрузить данные пользователя.");
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchUser();
    }
  }, [isOpen]);

  // Define reward items
  const rewardItems = [
    {
      id: 1,
      name: "Бесплатный лотерейный билет",
      description: "Получите один бесплатный билет для участия в любой лотерее.",
      price: 100,
      minVipLevel: 1,
      category: "tickets",
      image: "🎫",
    },
    {
      id: 2,
      name: "Премиум лотерейный билет",
      description: "Билет с повышенным шансом выигрыша для участия в лотерее.",
      price: 300,
      minVipLevel: 2,
      category: "tickets",
      image: "🎟️",
    },
    {
      id: 3,
      name: "5 Бесплатных билетов",
      description: "Набор из 5 бесплатных билетов для любой лотереи.",
      price: 450,
      minVipLevel: 3,
      category: "tickets",
      image: "🎫",
    },
    {
      id: 4,
      name: "Скидка 5% на все лотереи",
      description: "Скидка 5% на все лотерейные билеты в течение недели.",
      price: 200,
      minVipLevel: 1,
      category: "discounts",
      image: "💰",
    },
    {
      id: 5,
      name: "Скидка 10% на все лотереи",
      description: "Скидка 10% на все лотерейные билеты в течение недели.",
      price: 500,
      minVipLevel: 3,
      category: "discounts",
      image: "💸",
    },
    {
      id: 6,
      name: "Скидка 15% на все лотереи",
      description: "Скидка 15% на все лотерейные билеты в течение недели.",
      price: 1000,
      minVipLevel: 5,
      category: "discounts",
      image: "💎",
    },
    {
      id: 7,
      name: "Брендированная кружка",
      description: "Стильная кружка с логотипом FutureWin.",
      price: 500,
      minVipLevel: 2,
      category: "merch",
      image: "☕",
    },
    {
      id: 8,
      name: "Футболка FutureWin",
      description: "Эксклюзивная футболка с логотипом сервиса.",
      price: 1000,
      minVipLevel: 4,
      category: "merch",
      image: "👕",
    },
    {
      id: 9,
      name: "Худи с логотипом",
      description: "Премиальное худи с вышитым логотипом FutureWin.",
      price: 2000,
      minVipLevel: 6,
      category: "merch",
      image: "🧥",
    },
    {
      id: 10,
      name: "Скидка 10% на путевку",
      description: "Скидочный сертификат на путешествие от нашего партнера.",
      price: 5000,
      minVipLevel: 7,
      category: "travel",
      image: "✈️",
    },
    {
      id: 11,
      name: "Скидка 15% на путевку",
      description: "Повышенный скидочный сертификат на отдых в любой точке мира.",
      price: 7500,
      minVipLevel: 8,
      category: "travel",
      image: "🏝️",
    },
    {
      id: 12,
      name: "Скидка 25% на путевку",
      description: "Максимальный скидочный сертификат на элитный отдых.",
      price: 10000,
      minVipLevel: 10,
      category: "travel",
      image: "🌴",
    },
    {
      id: 13,
      name: "Бонус к балансу +500₽",
      description: "Моментальное пополнение вашего баланса на 500₽.",
      price: 750,
      minVipLevel: 3,
      category: "bonuses",
      image: "💵",
    },
    {
      id: 14,
      name: "Бонус к балансу +1000₽",
      description: "Моментальное пополнение вашего баланса на 1000₽.",
      price: 1400,
      minVipLevel: 5,
      category: "bonuses",
      image: "💵",
    },
    {
      id: 15,
      name: "VIP Статус +1 уровень",
      description: "Мгновенное повышение вашего VIP уровня на 1 пункт.",
      price: 5000,
      minVipLevel: 5,
      category: "vip",
      image: "👑",
    },
  ];

  const categories = [
    { id: "all", name: "Все награды" },
    { id: "tickets", name: "Билеты" },
    { id: "discounts", name: "Скидки" },
    { id: "merch", name: "Мерч" },
    { id: "travel", name: "Путешествия" },
    { id: "bonuses", name: "Бонусы" },
    { id: "vip", name: "VIP" },
  ];

  const filteredItems = selectedCategory === "all"
    ? rewardItems
    : rewardItems.filter(item => item.category === selectedCategory);

  // Handle purchase
  const handlePurchase = async (item) => {
    if (!user) return;

    if (user.crystals < item.price) {
      setError("Недостаточно кристаллов для покупки!");
      return;
    }

    if (user.vip_level < item.minVipLevel) {
      setError(`Для покупки требуется VIP уровень ${item.minVipLevel} или выше!`);
      return;
    }

    try {
      setPurchasing(true);
      setError(null);

      // Update user's crystal balance
      const { error: updateError } = await supabase
        .from("users")
        .update({ crystals: user.crystals - item.price })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // Apply reward effect
      if (item.category === "bonuses" && item.name.includes("Бонус к балансу")) {
        const amount = parseInt(item.name.match(/\+(\d+)/)[1]);
        const { error: balanceError } = await supabase
          .from("users")
          .update({ balance: user.balance + amount })
          .eq("id", user.id);
        if (balanceError) throw balanceError;
      } else if (item.category === "vip" && item.name.includes("VIP Статус")) {
        const { error: vipError } = await supabase
          .from("users")
          .update({ vip_level: Math.min(user.vip_level + 1, 10) })
          .eq("id", user.id);
        if (vipError) throw vipError;
      }

      // Record the purchase
      const { error: purchaseError } = await supabase
        .from("reward_purchases")
        .insert([{
          user_id: user.id,
          reward_id: item.id,
          reward_name: item.name,
          price: item.price,
          purchased_at: new Date().toISOString(),
        }]);

      if (purchaseError) throw purchaseError;

      // Add to user inventory
      const { error: inventoryError } = await supabase
        .from("user_inventory")
        .insert([{
          user_id: user.id,
          item_id: item.id,
          item_name: item.name,
          item_type: item.category,
          description: item.description,
          expires_at: ["discounts", "tickets"].includes(item.category)
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            : null,
          quantity: 1,
          notes: `Purchased from VIP Shop for ${item.price} crystals`,
        }]);

      if (inventoryError) throw inventoryError;

      // Update local user state
      setUser({
        ...user,
        crystals: user.crystals - item.price,
        balance: item.category === "bonuses" && item.name.includes("Бонус к балансу")
          ? user.balance + parseInt(item.name.match(/\+(\d+)/)[1])
          : user.balance,
        vip_level: item.category === "vip" && item.name.includes("VIP Статус")
          ? Math.min(user.vip_level + 1, 10)
          : user.vip_level,
      });

      // Show success message
      setPurchaseSuccess({
        item: item.name,
        message: `Вы успешно приобрели ${item.name}!`,
      });

      setTimeout(() => {
        setPurchaseSuccess(null);
      }, 3000);
    } catch (err) {
      console.error("Error purchasing reward:", err);
      setError("Произошла ошибка при покупке. Пожалуйста, попробуйте еще раз.");
    } finally {
      setPurchasing(false);
    }
  };

  // Animation variants
  const modalVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: "easeOut" } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2, ease: "easeIn" } },
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4 overflow-y-auto">
      <AnimatePresence>
        <motion.div
          className="bg-gray-900 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden relative"
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Decorative header */}
          <div className="bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-700 p-5 shadow-lg">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold text-white">Магазин наград VIP</h2>
                <p className="text-purple-200 mt-1">Эксклюзивные награды для VIP пользователей</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors text-white"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* User info and crystals */}
          {user && (
            <div className="bg-gray-800 p-4 flex items-center justify-between border-b border-gray-700">
              <div className="flex items-center">
                <div className="bg-yellow-400 rounded-full w-10 h-10 flex items-center justify-center mr-3">
                  <span className="text-gray-900 font-bold">{user.vip_level || 0}</span>
                </div>
                <div>
                  <p className="text-white font-medium">{user.username || user.email}</p>
                  <p className="text-yellow-400 text-sm">VIP Уровень: {user.vip_level || 0}</p>
                </div>
              </div>
              <div className="flex items-center">
                <button
                  onClick={() => setShowInventory(true)}
                  className="mr-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center"
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                    />
                  </svg>
                  Мой инвентарь
                </button>
                <div className="bg-gray-700 px-4 py-2 rounded-lg flex items-center">
                  <span className="text-yellow-400 text-lg mr-2">✦</span>
                  <div>
                    <p className="text-xs text-gray-400">Баланс кристаллов</p>
                    <p className="text-white font-bold">{user.crystals || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Category tabs */}
          <div className="p-4 flex items-center justify-center overflow-x-auto space-x-2 border-b border-gray-700">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                  selectedCategory === category.id
                    ? "bg-purple-700 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                } transition-colors duration-200`}
              >
                {category.name}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="p-12 flex items-center justify-center">
              <ClipLoader size={50} color="#9f7aea" />
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto text-white">
              {/* Items grid */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.map(item => (
                  <motion.div
                    key={item.id}
                    whileHover={{ scale: 1.02 }}
                    className={`bg-gray-800 rounded-lg overflow-hidden border ${
                      user && user.vip_level >= item.minVipLevel
                        ? "border-purple-600"
                        : "border-gray-700"
                    }`}
                  >
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-4xl">{item.image}</span>
                        <div className="flex items-center bg-gray-700 px-3 py-1 rounded-full">
                          <span className="text-yellow-400 mr-1">✦</span>
                          <span className="font-bold">{item.price}</span>
                        </div>
                      </div>
                      <h3 className="text-xl font-bold mb-2">{item.name}</h3>
                      <p className="text-gray-400 text-sm min-h-[40px] mb-4">{item.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 flex items-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 mr-1 text-yellow-500"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Мин. VIP: {item.minVipLevel}
                        </span>
                        <button
                          onClick={() => handlePurchase(item)}
                          disabled={
                            purchasing ||
                            !user ||
                            user.crystals < item.price ||
                            user.vip_level < item.minVipLevel
                          }
                          className={`px-4 py-2 rounded font-semibold text-sm ${
                            user && user.vip_level >= item.minVipLevel && user.crystals >= item.price
                              ? "bg-purple-600 hover:bg-purple-700 text-white"
                              : "bg-gray-700 text-gray-400 cursor-not-allowed"
                          }`}
                        >
                          {purchasing ? (
                            <ClipLoader size={16} color="#fff" />
                          ) : user && user.vip_level < item.minVipLevel ? (
                            "Недоступно"
                          ) : user && user.crystals < item.price ? (
                            "Недостаточно кристаллов"
                          ) : (
                            "Приобрести"
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Error messages */}
          {error && (
            <div className="p-4 bg-red-900 bg-opacity-40 border border-red-700 text-red-200 mx-6 mb-4 rounded-lg">
              {error}
            </div>
          )}

          {/* Success message */}
          <AnimatePresence>
            {purchaseSuccess && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-green-700 text-white p-4 rounded-lg shadow-xl"
              >
                <div className="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <p className="font-medium">{purchaseSuccess.message}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer with info */}
          <div className="bg-gray-800 p-4 border-t border-gray-700">
            <div className="text-center text-gray-400 text-sm">
              <p>Покупайте награды, повышайте VIP-уровень и получайте больше эксклюзивных предложений!</p>
              <p className="mt-1">Все покупки подтверждаются мгновенно и не требуют дополнительной активации.</p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* User Inventory Modal */}
      {showInventory && (
        <UserInventory isOpen={showInventory} onClose={() => setShowInventory(false)} />
      )}
    </div>
  );
};

export default VIPShop;