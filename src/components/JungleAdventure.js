import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

const JungleAdventure = ({ play, canPlay, result }) => {
  const [selectedPath, setSelectedPath] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [paths, setPaths] = useState([
    { id: 1, revealed: false, content: null, name: "Храм" },
    { id: 2, revealed: false, content: null, name: "Водопад" },
    { id: 3, revealed: false, content: null, name: "Пещера" }
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
    setSelectedPath(null);
    setShowResult(false);
    setPaths([
      { id: 1, revealed: false, content: null, name: "Храм" },
      { id: 2, revealed: false, content: null, name: "Водопад" },
      { id: 3, revealed: false, content: null, name: "Пещера" }
    ]);
  };

  const handlePathClick = (pathId) => {
    if (!canPlay || selectedPath !== null) return;
    
    setSelectedPath(pathId);
    play(); // Вызываем функцию игры из родительского компонента
  };

  const handleResultReceived = () => {
    // Определяем результат пути на основе выигрыша или проигрыша
    const luckyPathId = Math.floor(Math.random() * 3) + 1;
    
    const updatedPaths = paths.map(path => {
      if (path.id === selectedPath) {
        return { 
          ...path, 
          revealed: true, 
          content: path.id === luckyPathId && result.win ? "treasure" : "danger" 
        };
      }
      return path;
    });
    
    setPaths(updatedPaths);
    
    // Показываем результат с небольшой задержкой для анимации
    setTimeout(() => {
      setShowResult(true);
    }, 1000);
  };

  // Иконки для путей
  const pathIcons = {
    1: "🏛️", // Храм
    2: "🌊", // Водопад
    3: "🏔️", // Пещера
  };

  return (
    <div className="py-8 bg-green-50 rounded-lg p-6">
      <div className="mb-8 bg-green-100 p-6 rounded-lg border-2 border-green-600">
        <h3 className="text-xl font-bold text-green-800 mb-4 text-center">
          Приключения в Джунглях
        </h3>
        <p className="text-green-700 mb-4 text-center">
          Выберите один из путей в джунглях! Один из них ведёт к древнему сокровищу, но остальные могут быть опасны.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-6 mb-8">
        {paths.map((path) => (
          <motion.div 
            key={path.id}
            className={`
              cursor-pointer
              ${!canPlay || selectedPath !== null ? 'cursor-default' : 'hover:scale-105'}
              ${selectedPath === path.id ? 'ring-4 ring-green-500' : ''}
            `}
            whileHover={canPlay && selectedPath === null ? { scale: 1.05 } : {}}
            onClick={() => handlePathClick(path.id)}
          >
            <div className="w-32 h-40 md:w-40 md:h-48 relative rounded-lg overflow-hidden">
              {path.revealed ? (
                <div className={`
                  w-full h-full flex items-center justify-center rounded-lg
                  ${path.content === "treasure" ? "bg-green-500" : "bg-red-400"}
                `}>
                  {path.content === "treasure" ? (
                    <div className="text-center">
                      <div className="text-4xl">💎</div>
                      <div className="mt-2 font-bold text-green-900">Сокровище!</div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-4xl">🐍</div>
                      <div className="mt-2 font-bold text-red-700">Опасность!</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gradient-to-b from-green-600 to-green-800 w-full h-full rounded-lg shadow-md flex flex-col items-center justify-center p-4">
                  <div className="text-5xl mb-3">{pathIcons[path.id]}</div>
                  <div className="bg-green-200 w-full py-2 rounded-md text-center font-semibold text-green-800">
                    {path.name}
                  </div>
                </div>
              )}
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
              <h3 className="text-2xl font-bold text-green-700 mb-2">Вы нашли сокровище!</h3>
              <p className="text-green-800">Ваша награда: {result.winnings} ₽</p>
            </div>
          ) : (
            <div>
              <h3 className="text-2xl font-bold text-red-700 mb-2">Опасные джунгли!</h3>
              <p className="text-red-800">Попробуйте другой путь в следующий раз</p>
            </div>
          )}
        </div>
      )}

      {!canPlay && !showResult && (
        <div className="text-center mt-4">
          <div className="inline-block">
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-4xl mb-2"
            >
              🧭
            </motion.div>
          </div>
          <p className="text-green-700 font-semibold">Исследуем маршрут...</p>
        </div>
      )}

      <div className="mt-8 text-center">
        {!canPlay && result && (
          <button
            onClick={resetGame}
            disabled={canPlay}
            className="px-6 py-3 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 focus:outline-none disabled:opacity-50"
          >
            Новое приключение
          </button>
        )}
      </div>
    </div>
  );
};

export default JungleAdventure;