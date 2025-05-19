import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { ClipLoader } from "react-spinners";
import PirateTreasure from "./PirateTreasure";
import MysticOracle from "./MysticOracle";
import JungleAdventure from "./JungleAdventure";

const InstantLotteryGame = ({ type }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [canPlay, setCanPlay] = useState(true);
  const [lastPlayed, setLastPlayed] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const lotteryConfig = {
    "pirate-treasure": { price: 50, winChance: 0.3, maxWin: 500 },
    "mystic-oracle": { price: 100, winChance: 0.25, maxWin: 1000 },
    "jungle-adventure": { price: 200, winChance: 0.2, maxWin: 3000 },
  };

  const config = lotteryConfig[type] || lotteryConfig["pirate-treasure"];

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data, error } = await supabase
            .from("users")
            .select("*")
            .eq("id", session.user.id)
            .single();
          if (!error) setUser(data);
        }
      } catch (err) {
        setError("Failed to load user data");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [type]);

  useEffect(() => {
    const checkCooldown = () => {
      const now = new Date().getTime();
      const last = localStorage.getItem(`lastPlayed_${type}`);
      if (last) {
        const timeDiff = (now - last) / 1000; // seconds
        if (timeDiff < 60) { // 1 minute cooldown for testing
          setCanPlay(false);
          setLastPlayed(new Date(parseInt(last)));
        } else {
          setCanPlay(true);
          localStorage.removeItem(`lastPlayed_${type}`);
        }
      }
    };
    checkCooldown();
  }, [type]);

  const playLottery = async () => {
    if (!user || user.balance < config.price) {
      setError("Insufficient balance or not logged in");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const win = Math.random() < config.winChance;
      let winnings = 0;
      if (win) {
        winnings = Math.floor(Math.random() * config.maxWin) + 1;
        await supabase
          .from("users")
          .update({ balance: user.balance + winnings })
          .eq("id", user.id);
        setUser({ ...user, balance: user.balance + winnings });
      }

      await supabase
        .from("users")
        .update({ balance: user.balance - config.price })
        .eq("id", user.id);

      setUser({ ...user, balance: user.balance - config.price });
      setResult({ win, winnings });
      localStorage.setItem(`lastPlayed_${type}`, Date.now().toString());
      setCanPlay(false);
      setLastPlayed(new Date());
    } catch (err) {
      setError("Error playing lottery");
    } finally {
      setLoading(false);
    }
  };

  const getTimeRemaining = () => {
    if (!lastPlayed) return "0s";
    const now = new Date().getTime();
    const timeDiff = 60 - ((now - lastPlayed.getTime()) / 1000);
    return timeDiff > 0 ? `${Math.ceil(timeDiff)}s` : "0s";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <ClipLoader size={40} color="#000" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-red-600">Please log in to play</p>
      </div>
    );
  }

  const renderGame = () => {
    switch (type) {
      case "pirate-treasure":
        return <PirateTreasure play={playLottery} canPlay={canPlay} result={result} />;
      case "mystic-oracle":
        return <MysticOracle play={playLottery} canPlay={canPlay} result={result} />;
      case "jungle-adventure":
        return <JungleAdventure play={playLottery} canPlay={canPlay} result={result} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold text-black mb-4 text-center">
            {type === "pirate-treasure" && "Pirate Treasure"}
            {type === "mystic-oracle" && "Mystic Oracle"}
            {type === "jungle-adventure" && "Jungle Adventure"}
          </h1>
          <p className="text-center text-gray-600 mb-4">
            Cost: {config.price} ₽ | Win Chance: {config.winChance * 100}% | Max Win: {config.maxWin} ₽
          </p>
          <p className="text-center text-black mb-4">
            Balance: {user.balance.toFixed(2)} ₽
          </p>
          {!canPlay && (
            <p className="text-center text-yellow-600 mb-4">
              Cooldown: {getTimeRemaining()} remaining
            </p>
          )}
          {error && <p className="text-center text-red-600 mb-4">{error}</p>}
          {renderGame()}
        </div>
      </div>
    </div>
  );
};

export default InstantLotteryGame;