import React from "react";

const LotteryCard = ({ lottery, onBuyTicket }) => {
  // Функция для расчета времени до розыгрыша
  const getTimeRemaining = () => {
    const drawTime = new Date(lottery.draw_date).getTime();
    const now = new Date().getTime();
    const timeRemaining = drawTime - now;
    
    if (timeRemaining <= 0) {
      return "Розыгрыш скоро состоится";
    }
    
    const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days} дн. ${hours} ч. до розыгрыша`;
    } else if (hours > 0) {
      return `${hours} ч. ${minutes} мин. до розыгрыша`;
    } else {
      return `${minutes} мин. до розыгрыша`;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden transition-transform duration-200 hover:shadow-lg hover:-translate-y-1">
      <div className="bg-yellow-500 p-4">
        <h3 className="text-xl font-bold text-black">
          {lottery.name || "Лотерея"}
        </h3>
      </div>
      
      <div className="p-5">
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-gray-500 text-sm">Призовой фонд</p>
            <p className="text-2xl font-bold text-black">{lottery.prize_pool?.toLocaleString()} ₽</p>
          </div>
          <div className="text-right">
            <p className="text-gray-500 text-sm">Стоимость билета</p>
            <p className="text-xl font-semibold text-black">{lottery.ticket_price || 100} ₽</p>
          </div>
        </div>
        
        <div className="mb-4 p-3 bg-gray-100 rounded-md">
          <p className="text-black font-medium">
            Дата розыгрыша: {new Date(lottery.draw_date).toLocaleString()}
          </p>
          <p className="text-black font-medium text-sm mt-1">
            {getTimeRemaining()}
          </p>
        </div>
        
        <button
          onClick={onBuyTicket}
          className="w-full py-3 px-4 bg-yellow-500 text-black font-bold rounded-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors duration-200"
        >
          Подробнее
        </button>
      </div>
    </div>
  );
};

export default LotteryCard;