import React, { useState } from "react";
import { ClipLoader } from "react-spinners";

const TicketNumberSelector = ({ onConfirm, onCancel, ticketPrice }) => {
  const [selectedNumbers, setSelectedNumbers] = useState([]);
  const [loading, setLoading] = useState(false);
  const maxSelections = 6;
  
  // Generate numbers from 1 to 36
  const numbers = Array.from({ length: 36 }, (_, i) => i + 1);
  
  const handleNumberClick = (number) => {
    if (selectedNumbers.includes(number)) {
      // Remove number if already selected
      setSelectedNumbers(selectedNumbers.filter(num => num !== number));
    } else if (selectedNumbers.length < maxSelections) {
      // Add number if we haven't reached max selections
      setSelectedNumbers([...selectedNumbers, number]);
    }
  };
  
  const handleRandomSelection = () => {
    const randomNumbers = [];
    while (randomNumbers.length < maxSelections) {
      const num = Math.floor(Math.random() * 36) + 1;
      if (!randomNumbers.includes(num)) {
        randomNumbers.push(num);
      }
    }
    setSelectedNumbers(randomNumbers.sort((a, b) => a - b));
  };
  
  const handleSubmit = () => {
    if (selectedNumbers.length !== maxSelections) {
      alert(`Пожалуйста, выберите ровно ${maxSelections} чисел`);
      return;
    }
    
    setLoading(true);
    // Sort numbers for better display
    const sortedNumbers = [...selectedNumbers].sort((a, b) => a - b);
    onConfirm(sortedNumbers);
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full">
        <h3 className="text-xl font-bold text-black mb-4">Выберите 6 чисел для вашего билета</h3>
        
        <div className="mb-4">
          <p className="text-gray-600">
            Выбрано: {selectedNumbers.length} из {maxSelections}
          </p>
          <p className="text-black font-semibold">
            Стоимость билета: {ticketPrice} ₽
          </p>
        </div>
        
        <div className="grid grid-cols-6 gap-2 mb-6">
          {numbers.map((number) => (
            <button
              key={number}
              onClick={() => handleNumberClick(number)}
              className={`
                h-10 w-10 rounded-full flex items-center justify-center text-lg font-medium
                ${selectedNumbers.includes(number) 
                  ? 'bg-yellow-500 text-black' 
                  : 'bg-gray-200 text-black hover:bg-gray-300'}
                transition-colors duration-200
              `}
            >
              {number}
            </button>
          ))}
        </div>
        
        <div className="mb-4">
          <button
            onClick={handleRandomSelection}
            className="w-full py-2 px-4 bg-gray-200 text-black font-semibold rounded-md hover:bg-gray-300 mb-2"
          >
            Случайный выбор
          </button>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 px-4 bg-gray-300 text-black font-semibold rounded-md hover:bg-gray-400"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={selectedNumbers.length !== maxSelections || loading}
            className="flex-1 py-2 px-4 bg-yellow-500 text-black font-semibold rounded-md hover:bg-yellow-600 disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? <ClipLoader size={20} color="#000" /> : "Купить билет"}
          </button>
        </div>
        
        {selectedNumbers.length > 0 && (
          <div className="mt-4 p-3 bg-gray-100 rounded-md">
            <p className="text-black font-medium">
              Выбранные номера: {selectedNumbers.sort((a, b) => a - b).join(", ")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketNumberSelector;