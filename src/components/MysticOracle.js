import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

const MysticOracle = ({ play, canPlay, result }) => {
  const [selectedCard, setSelectedCard] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [cards, setCards] = useState([
    { id: 1, flipped: false, symbol: "✨" },
    { id: 2, flipped: false, symbol: "🔮" },
    { id: 3, flipped: false, symbol: "🌙" },
    { id: 4, flipped: false, symbol: "⭐" },
    { id: 5, flipped: false, symbol: "🌟" }
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
    setSelectedCard(null);
    setShowResult(false);
    setCards([
      { id: 1, flipped: false, symbol: "✨" },
      { id: 2, flipped: false, symbol: "🔮" },
      { id: 3, flipped: false, symbol: "🌙" },
      { id: 4, flipped: false, symbol: "⭐" },
      { id: 5, flipped: false, symbol: "🌟" }
    ]);
  };

  const handleCardClick = (cardId) => {
    if (!canPlay || selectedCard !== null) return;
    
    setSelectedCard(cardId);
    play(); // Вызываем функцию игры из родительского компонента
  };

  const handleResultReceived = () => {
    // Определяем результат карт на основе выигрыша или проигрыша
    const luckyCardId = Math.floor(Math.random() * 5) + 1;
    
    const updatedCards = cards.map(card => {
      if (card.id === selectedCard) {
        return { 
          ...card, 
          flipped: true, 
          isWinning: card.id === luckyCardId && result.win
        };
      }
      return card;
    });
    
    setCards(updatedCards);
    
    // Показываем результат с небольшой задержкой для анимации
    setTimeout(() => {
      setShowResult(true);
    }, 1000);
  };

  return (
    <div className="py-8 bg-indigo-50 rounded-lg p-6">
      <div className="mb-8 bg-indigo-100 p-6 rounded-lg border-2 border-indigo-600">
        <h3 className="text-xl font-bold text-indigo-800 mb-4 text-center">
          Мистический Оракул
        </h3>
        <p className="text-indigo-700 mb-4 text-center">
          Выберите одну из карт и раскройте свою судьбу! Карта может принести вам благосклонность звезд или оставить ни с чем.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-4 mb-8">
        {cards.map((card) => (
          <motion.div 
            key={card.id}
            className={`
              cursor-pointer
              ${!canPlay || selectedCard !== null ? 'cursor-default' : 'hover:scale-105'}
              ${selectedCard === card.id ? 'ring-4 ring-indigo-500' : ''}
            `}
            whileHover={canPlay && selectedCard === null ? { scale: 1.05 } : {}}
            onClick={() => handleCardClick(card.id)}
          >
            <div className="w-24 h-36 md:w-28 md:h-40 relative rounded-lg overflow-hidden perspective">
              <motion.div 
                className="w-full h-full absolute"
                initial={false}
                animate={{ rotateY: card.flipped ? 180 : 0 }}
                transition={{ duration: 0.6 }}
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* Передняя сторона карты */}
                <div className="w-full h-full absolute backface-hidden bg-gradient-to-b from-indigo-600 to-purple-800 flex items-center justify-center">
                  <div className="text-indigo-200 text-3xl font-semibold">?</div>
                  <div className="absolute inset-0 border-2 border-indigo-300 rounded-lg m-1 pointer-events-none"></div>
                </div>
                
                {/* Задняя сторона карты */}
                <div 
                  className={`w-full h-full absolute backface-hidden ${card.isWinning ? 'bg-gradient-to-b from-purple-400 to-purple-800' : 'bg-gradient-to-b from-gray-400 to-gray-700'} flex items-center justify-center`}
                  style={{ transform: "rotateY(180deg)" }}
                >
                  <div className="text-5xl">
                    {card.isWinning ? "✨" : "☁️"}
                  </div>
                  <div className="absolute inset-0 border-2 border-indigo-300 rounded-lg m-1 pointer-events-none"></div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        ))}
      </div>

      {showResult && (
        <div className={`
          p-6 rounded-lg text-center mt-4 
          ${result.win ? 'bg-indigo-100 border-2 border-indigo-500' : 'bg-gray-100 border-2 border-gray-500'}
        `}>
          {result.win ? (
            <div>
              <h3 className="text-2xl font-bold text-indigo-700 mb-2">Звезды благоволят вам!</h3>
              <p className="text-indigo-800">Вы выиграли {result.winnings} ₽</p>
            </div>
          ) : (
            <div>
              <h3 className="text-2xl font-bold text-gray-700 mb-2">Звезды молчат...</h3>
              <p className="text-gray-800">Попробуйте в следующий раз</p>
            </div>
          )}
        </div>
      )}

      {!canPlay && !showResult && (
        <div className="text-center mt-4">
          <div className="inline-block">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-4xl mb-2"
            >
              🔮
            </motion.div>
          </div>
          <p className="text-indigo-700 font-semibold">Предсказываем судьбу...</p>
        </div>
      )}

      <div className="mt-8 text-center">
        {!canPlay && result && (
          <button
            onClick={resetGame}
            disabled={canPlay}
            className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none disabled:opacity-50"
          >
            Гадать снова
          </button>
        )}
      </div>

      <style jsx>{`
        .perspective {
          perspective: 1000px;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
      `}</style>
    </div>
  );
};

export default MysticOracle;