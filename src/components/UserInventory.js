import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabaseClient";
import { ClipLoader } from "react-spinners";

const UserInventory = ({ isOpen, onClose }) => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState("all");
  const [selectedItem, setSelectedItem] = useState(null);
  const [usingItem, setUsingItem] = useState(false);
  const [user, setUser] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Get user data
  useEffect(() => {
    const getUser = async () => {
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
    
    if (isOpen) {
      getUser();
    }
  }, [isOpen]);

  // Fetch inventory data
  useEffect(() => {
    const fetchInventory = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("user_inventory")
          .select("*")
          .eq("user_id", user.id)
          .eq("used", false)
          .filter("expires_at", "is", null)
          .or("expires_at.gt.now")
          .order("acquired_at", { ascending: false });
        console.log("Fetched inventory:", data);
        if (error) throw error;
        setInventory(data || []);
      } catch (err) {
        console.error("Error fetching inventory:", err);
        setError("Не удалось загрузить инвентарь");
      } finally {
        setLoading(false);
      }
    };
    if (user && isOpen) {
      fetchInventory();
    }
  }, [user, isOpen]);
  
  // Подписка на новые предметы
  useEffect(() => {
    const fetchInventory = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("user_inventory")
          .select("*")
          .eq("user_id", user.id);
        if (error) console.error("Ошибка загрузки:", error);
        else setInventory(data || []);
      } catch (err) {
        console.error("Ошибка:", err);
      } finally {
        setLoading(false);
      }
    };
    if (user && isOpen) fetchInventory();
  }, [user, isOpen]);

  // Filter inventory based on selected tab
  const filteredInventory = selectedTab === "all" 
    ? inventory 
    : inventory.filter(item => item.item_type === selectedTab);

  // Define item type tabs
  const tabs = [
    { id: "all", name: "Все предметы" },
    { id: "tickets", name: "Билеты" },
    { id: "discounts", name: "Скидки" },
    { id: "merch", name: "Мерч" },
    { id: "travel", name: "Путешествия" },
    { id: "bonuses", name: "Бонусы" },
    { id: "vip", name: "VIP" }
  ];

  // Get icon for item type
  const getItemIcon = (type) => {
    switch (type) {
      case "tickets": return "🎫";
      case "discounts": return "💰";
      case "merch": return "👕";
      case "travel": return "✈️";
      case "bonuses": return "💵";
      case "vip": return "👑";
      default: return "📦";
    }
  };

  // Format expiration date
  const formatExpires = (expiresAt) => {
    if (!expiresAt) return "Бессрочно";
    
    const expires = new Date(expiresAt);
    const now = new Date();
    
    // Calculate days remaining
    const diffTime = expires - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return "Истек";
    if (diffDays === 1) return "Истекает сегодня";
    if (diffDays < 7) return `Истекает через ${diffDays} дн.`;
    
    return `до ${expires.toLocaleDateString()}`;
  };

  // Use an item from inventory
  const handleUseItem = async (item) => {
    if (!user) return;
    
    setUsingItem(true);
    try {
      // Handle different item types accordingly
      if (item.item_type === "bonuses") {
        // Apply balance bonus
        const amount = parseFloat(item.description.match(/\+(\d+)/)[1]);
        
        const { error: balanceError } = await supabase
          .from("users")
          .update({ balance: user.balance + amount })
          .eq("id", user.id);
          
        if (balanceError) throw balanceError;
        
        // Update local user state
        setUser({
          ...user,
          balance: user.balance + amount
        });
      } else if (item.item_type === "vip" && item.item_name.includes("VIP Статус")) {
        // Apply VIP level increase
        const { error: vipError } = await supabase
          .from("users")
          .update({ vip_level: Math.min(user.vip_level + 1, 10) })
          .eq("id", user.id);
          
        if (vipError) throw vipError;
        
        // Update local user state
        setUser({
          ...user,
          vip_level: Math.min(user.vip_level + 1, 10)
        });
      }
      
      // Mark item as used
      const { error } = await supabase
        .from("user_inventory")
        .update({ 
          used: true,
          used_at: new Date().toISOString()
        })
        .eq("id", item.id);
        
      if (error) throw error;
      
      // Remove item from inventory
      setInventory(inventory.filter(i => i.id !== item.id));
      setSelectedItem(null);
      
      // Show success message
      setSuccessMessage(`Вы успешно использовали "${item.item_name}"!`);
      setTimeout(() => setSuccessMessage(null), 3000);
      
    } catch (err) {
      console.error("Error using item:", err);
      setError("Не удалось использовать предмет");
    } finally {
      setUsingItem(false);
    }
  };

  // Animation variants
  const modalVariants = {
    hidden: {
      opacity: 0,
      y: 50,
      scale: 0.95
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      transition: {
        duration: 0.2,
        ease: "easeIn"
      }
    }
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
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 p-5 shadow-lg">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold text-white">Мой инвентарь</h2>
                <p className="text-indigo-200 mt-1">Ваши предметы и награды</p>
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

          {/* User info */}
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
              
              <div className="flex items-center space-x-3">
                <div className="bg-gray-700 px-4 py-2 rounded-lg flex items-center">
                  <span className="text-white font-bold mr-2">₽</span>
                  <div>
                    <p className="text-xs text-gray-400">Баланс</p>
                    <p className="text-white font-bold">{user.balance?.toLocaleString('ru-RU', {minimumFractionDigits: 2, maximumFractionDigits: 2}) || "0.00"}</p>
                  </div>
                </div>
                
                <div className="bg-gray-700 px-4 py-2 rounded-lg flex items-center">
                  <span className="text-yellow-400 text-lg mr-2">✦</span>
                  <div>
                    <p className="text-xs text-gray-400">Кристаллы</p>
                    <p className="text-white font-bold">{user.crystals || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Category tabs */}
          <div className="p-4 flex items-center justify-center overflow-x-auto space-x-2 border-b border-gray-700">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                  selectedTab === tab.id
                    ? 'bg-indigo-700 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                } transition-colors duration-200`}
              >
                {tab.name}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="p-12 flex items-center justify-center">
              <ClipLoader size={50} color="#9f7aea" />
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto text-white">
              {filteredInventory.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-6xl mb-4">📦</div>
                  <h3 className="text-2xl font-bold mb-2">Ваш инвентарь пуст</h3>
                  <p className="text-gray-400">
                    Посетите магазин наград, чтобы приобрести предметы, которые будут отображаться здесь
                  </p>
                </div>
              ) : (
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredInventory.map(item => (
                    <motion.div
                      key={item.id}
                      whileHover={{ scale: 1.02 }}
                      className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700"
                    >
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-4xl">{getItemIcon(item.item_type)}</span>
                          <div className="text-sm text-gray-400">
                            {formatExpires(item.expires_at)}
                          </div>
                        </div>
                        <h3 className="text-xl font-bold mb-2">{item.item_name}</h3>
                        <p className="text-gray-400 text-sm min-h-[60px] mb-4">{item.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {new Date(item.acquired_at).toLocaleDateString()}
                          </span>
                          <button
                            onClick={() => setSelectedItem(item)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md transition-colors duration-200"
                          >
                            Подробнее
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Selected item details popup */}
          {selectedItem && (
            <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-80">
              <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center">
                    <span className="text-4xl mr-3">{getItemIcon(selectedItem.item_type)}</span>
                    <h3 className="text-xl font-bold text-white">{selectedItem.item_name}</h3>
                  </div>
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="text-gray-400 hover:text-white"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="mb-6">
                  <p className="text-gray-300 mb-4">{selectedItem.description}</p>
                  
                  {selectedItem.code && (
                    <div className="bg-gray-700 p-3 rounded-lg mb-4">
                      <p className="text-gray-400 text-sm mb-1">Код активации:</p>
                      <p className="font-mono text-lg text-white">{selectedItem.code}</p>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
                    <div>Получено: {new Date(selectedItem.acquired_at).toLocaleDateString()}</div>
                    <div>{formatExpires(selectedItem.expires_at)}</div>
                  </div>

                  {selectedItem.notes && (
                    <p className="text-gray-400 text-sm italic mb-4">{selectedItem.notes}</p>
                  )}
                  
                  <div className="bg-gray-700 p-3 rounded-lg mb-4">
                    <p className="text-gray-300 text-sm">
                      <strong>Тип:</strong> {
                        selectedItem.item_type === "tickets" ? "Билет" :
                        selectedItem.item_type === "discounts" ? "Скидка" :
                        selectedItem.item_type === "merch" ? "Мерч" :
                        selectedItem.item_type === "travel" ? "Путешествие" :
                        selectedItem.item_type === "bonuses" ? "Бонус" :
                        selectedItem.item_type === "vip" ? "VIP Статус" : 
                        "Предмет"
                      }
                    </p>
                    
                    <p className="text-gray-300 text-sm mt-1">
                      <strong>Количество:</strong> {selectedItem.quantity}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                  >
                    Закрыть
                  </button>
                  
                  {/* Only show Use button for usable items */}
                  {(selectedItem.item_type === "tickets" || 
                    selectedItem.item_type === "discounts" || 
                    selectedItem.item_type === "bonuses" || 
                    selectedItem.item_type === "vip") && (
                    <button
                      onClick={() => handleUseItem(selectedItem)}
                      disabled={usingItem}
                      className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                    >
                      {usingItem ? <ClipLoader size={16} color="#fff" /> : "Использовать"}
                    </button>
                  )}
                  
                  {/* Show Redeem button for physical items */}
                  {(selectedItem.item_type === "merch" || selectedItem.item_type === "travel") && (
                    <button
                      onClick={() => {
                        // Here we could implement a different redemption flow for physical items
                        // For now, just show the details
                        alert("Для получения этого предмета обратитесь в службу поддержки");
                      }}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    >
                      Получить
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="bg-gray-800 p-4 border-t border-gray-700">
            <div className="text-center text-gray-400 text-sm">
              <p>Используйте предметы из инвентаря, чтобы активировать их эффекты</p>
              <p className="mt-1">Некоторые предметы имеют ограниченный срок действия</p>
            </div>
          </div>

          {/* Success message */}
          <AnimatePresence>
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-green-700 text-white p-4 rounded-lg shadow-xl z-70"
              >
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="font-medium">{successMessage}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error message */}
          {error && (
            <div className="p-4 bg-red-900 bg-opacity-40 border border-red-700 text-red-200 mx-6 mb-4 rounded-lg">
              {error}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default UserInventory;