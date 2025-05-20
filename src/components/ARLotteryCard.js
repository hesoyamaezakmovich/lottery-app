import React from "react";
import { motion } from "framer-motion";

const ARLotteryCard = ({ onPlay }) => {
  // Улучшенный компонент карточки AR лотереи для Dashboard
  return (
    <motion.div 
      className="bg-gradient-to-b from-blue-500 to-indigo-600 rounded-lg shadow-lg overflow-hidden transition-transform duration-300 hover:-translate-y-2"
      whileHover={{ scale: 1.02 }}
    >
      <div className="p-6">
        <div className="w-16 h-16 mx-auto mb-4 bg-blue-300 rounded-full flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-white text-center mb-2">
          AR Лотерея
        </h3>
        <p className="text-white text-center mb-4">
          Узнайте результат в дополненной реальности!
        </p>
        
        {/* Анимированный блок с информацией */}
        <motion.div 
          className="bg-white bg-opacity-20 p-3 rounded-lg mb-4"
          initial={{ opacity: 0.9 }}
          animate={{ 
            opacity: [0.9, 1, 0.9],
            scale: [1, 1.02, 1]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse"
          }}
        >
          <p className="text-white text-center font-semibold">
            Стоимость: 75 ₽
          </p>
          <p className="text-white text-center text-sm">
            Шанс выигрыша: 25%
          </p>
          <p className="text-white text-center text-sm mt-1">
            Выигрыш до 1000 ₽
          </p>
        </motion.div>
        
        <div className="text-white text-sm text-center mb-4 flex items-center justify-center">
          <span className="mr-2">📱</span>
          <p>Разместите виртуальный сундук в реальном мире через AR!</p>
        </div>
        
        <motion.button
          onClick={onPlay}
          className="w-full py-3 px-4 bg-white text-indigo-600 font-bold rounded-lg hover:bg-blue-100 focus:outline-none transition-colors duration-200"
          whileHover={{ 
            backgroundColor: "#e6f0ff",
            boxShadow: "0 4px 6px rgba(59, 130, 246, 0.2)"
          }}
          whileTap={{ scale: 0.98 }}
        >
          Играть
        </motion.button>
      </div>
    </motion.div>
  );
};

export default ARLotteryCard;