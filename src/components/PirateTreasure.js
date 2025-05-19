import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

const PirateTreasure = ({ play, canPlay, result }) => {
  const [selectedChest, setSelectedChest] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [chests, setChests] = useState([
    { id: 1, open: false, content: null },
    { id: 2, open: false, content: null },
    { id: 3, open: false, content: null }
  ]);

  // Сброс состояния при изменении возможности играть
  useEffect(() => {
    if (canPlay) {
      resetGame();
    }
  }, [canPlay]);

  // Обновление состояния при получении результата
  useEffect(() => {
    if (result) {
      handleResultReceived();
    }
  }, [result]);

  const resetGame = () => {
    setSelectedChest(null);
    setShowResult(false);
    setChests([
      { id: 1, open: false, content: null },
      { id: 2, open: false, content: null },
      { id: 3, open: false, content: null }
    ]);
  };

  const handleChestClick = (chestId) => {
    if (!canPlay || selectedChest !== null) return;
    
    setSelectedChest(chestId);
    play(); // Вызываем функцию игры из родительского компонента
  };

  const handleResultReceived = () => {
    // Определяем содержимое сундуков на основе результата
    const winningChestId = Math.floor(Math.random() * 3) + 1;
    
    const updatedChests = chests.map(chest => {
      if (chest.id === selectedChest) {
        return { 
          ...chest, 
          open: true, 
          content: chest.id === winningChestId && result.win ? "win" : "lose" 
        };
      }
      return chest;
    });
    
    setChests(updatedChests);
    
    // Показываем результат с небольшой задержкой для анимации
    setTimeout(() => {
      setShowResult(true);
    }, 1000);
  };

  return (
    <div className="py-8">
      <div className="mb-8 bg-amber-100 p-6 rounded-lg border-2 border-amber-600">
        <h3 className="text-xl font-bold text-amber-800 mb-4 text-center">
          Золотой Сундук
        </h3>
        <p className="text-amber-700 mb-4 text-center">
          Выберите один из трех сундуков и найдите сокровища! В одном из сундуков находится золото, в остальных — пусто.
        </p>
      </div>

      <div className="flex justify-center space-x-8 mb-8">
        {chests.map((chest) => (
          <motion.div 
            key={chest.id}
            className={`
              cursor-pointer relative
              ${!canPlay || selectedChest !== null ? 'cursor-default' : 'hover:scale-105'}
              ${selectedChest === chest.id ? 'ring-4 ring-yellow-500' : ''}
            `}
            whileHover={canPlay && selectedChest === null ? { scale: 1.05 } : {}}
            onClick={() => handleChestClick(chest.id)}
          >
            <div className="w-32 h-32 md:w-40 md:h-40 relative">
              {chest.open ? (
                <div className={`
                  w-full h-full flex items-center justify-center rounded-lg
                  ${chest.content === "win" ? "bg-yellow-500" : "bg-gray-300"}
                `}>
                  {chest.content === "win" ? (
                    <div className="text-center">
                      <div className="text-4xl">💰</div>
                      <div className="mt-2 font-bold text-amber-900">Выигрыш!</div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-4xl">🏴‍☠️</div>
                      <div className="mt-2 font-bold text-gray-600">Пусто</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gradient-to-b from-amber-700 to-amber-900 w-full h-full rounded-lg shadow-md flex items-center justify-center">
                  <div className="bg-yellow-500 w-16 h-12 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-t-lg border-b-4 border-yellow-700"></div>
                  <div className="bg-yellow-600 w-4 h-4 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full border border-yellow-800"></div>
                </div>
              )}
              <div className="text-center mt-2 font-semibold text-amber-800">
                Сундук {chest.id}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {showResult && (
        <div className={`
          p-6 rounded-lg text-center mt-4 
          ${result.win ? 'bg-green-100 border-2 border-green-500' : 'bg-red-100 border-2 border-red-500'}
        `}>
          {result.win ? (
            <div>
              <h3 className="text-2xl font-bold text-green-700 mb-2">Поздравляем!</h3>
              <p className="text-green-800">Вы выиграли {result.winnings} ₽</p>
            </div>
          ) : (
            <div>
              <h3 className="text-2xl font-bold text-red-700 mb-2">Не повезло!</h3>
              <p className="text-red-800">Попробуйте в следующий раз</p>
            </div>
          )}
        </div>
      )}

      {!canPlay && !showResult && (
        <div className="text-center mt-4">
          <div className="inline-block">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="text-4xl mb-2"
            >
              ⏳
            </motion.div>
          </div>
          <p className="text-amber-700 font-semibold">Открываем сундук...</p>
        </div>
      )}

      <div className="mt-8 text-center">
        {!canPlay && result && (
          <button
            onClick={resetGame}
            disabled={canPlay}
            className="px-6 py-3 bg-amber-500 text-white font-bold rounded-lg shadow-md hover:bg-amber-600 focus:outline-none disabled:opacity-50"
          >
            Играть снова
          </button>
        )}
      </div>
    </div>
  );
};

export default PirateTreasure;