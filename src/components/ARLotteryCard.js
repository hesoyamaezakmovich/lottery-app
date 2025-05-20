import React from "react";
import { motion } from "framer-motion";

const ARLotteryCard = ({ onPlay }) => {
  return (
    <motion.div 
      className="bg-gradient-to-b from-blue-600 via-blue-700 to-indigo-800 rounded-xl shadow-xl overflow-hidden border border-blue-400 border-opacity-20"
      whileHover={{ scale: 1.03 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div className="relative p-6">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-400 rounded-full filter blur-xl opacity-20 -mt-8 -mr-8"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500 rounded-full filter blur-xl opacity-20 -mb-16 -ml-16"></div>
        
        <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-md p-6 rounded-lg relative z-10 border border-white border-opacity-20">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          </div>
          
          <div className="relative">
            <h3 className="text-2xl font-bold text-white text-center mb-2">
              AR Лотерея
            </h3>
            <div className="absolute -top-10 -right-4">
              <span className="inline-block px-2 py-1 bg-yellow-500 text-xs font-bold rounded-full shadow-lg text-black transform rotate-12">NEW</span>
            </div>
          </div>
          
          <p className="text-blue-100 text-center mb-4">
            Увидьте результат в дополненной реальности!
          </p>
          
          {/* Animated information block with fixed contrast */}
          <motion.div 
            className="bg-blue-900 bg-opacity-40 p-4 rounded-lg mb-5 border border-blue-400 border-opacity-30"
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
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-blue-300 border-opacity-30">
              <span className="text-white font-medium">Стоимость:</span>
              <span className="text-white font-bold">75 ₽</span>
            </div>
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-blue-300 border-opacity-30">
              <span className="text-white font-medium">Шанс выигрыша:</span>
              <span className="text-white font-bold">25%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white font-medium">Выигрыш до:</span>
              <span className="text-white font-bold">1000 ₽</span>
            </div>
          </motion.div>
          
          <div className="flex items-center justify-center space-x-2 mb-5 text-blue-100 text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <p>Разместите виртуальный сундук в вашем окружении!</p>
          </div>
          
          <motion.button
            onClick={onPlay}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-lg shadow-lg flex items-center justify-center space-x-2"
            whileHover={{ 
              scale: 1.05,
              boxShadow: "0 10px 15px -3px rgba(59, 130, 246, 0.3)"
            }}
            whileTap={{ scale: 0.98 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Играть</span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default ARLotteryCard;