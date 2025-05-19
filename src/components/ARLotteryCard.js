import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { ClipLoader } from "react-spinners";
import { motion } from "framer-motion";

const ARLotteryCard = ({ onPlay }) => {
  // Компонент карточки AR лотереи для Dashboard
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
        <div className="bg-white bg-opacity-20 p-3 rounded-lg mb-4">
          <p className="text-white text-center font-semibold">
            Стоимость: 75 ₽
          </p>
          <p className="text-white text-center text-sm">
            Шанс выигрыша: 25%
          </p>
        </div>
        <p className="text-white text-sm text-center mb-4">
          Сканируйте QR-код и увидите свой выигрыш в AR!
        </p>
        <button
          onClick={onPlay}
          className="w-full py-3 px-4 bg-white text-indigo-600 font-bold rounded-lg hover:bg-blue-100 focus:outline-none transition-colors duration-200"
        >
          Играть
        </button>
      </div>
    </motion.div>
  );
};

export default ARLotteryCard;