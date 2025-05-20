import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { motion } from "framer-motion";

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchUser = async () => {
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
    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        supabase
          .from("users")
          .select("*")
          .eq("id", session.user.id)
          .single()
          .then(({ data, error }) => {
            if (!error) setUser(data);
          });
      } else {
        setUser(null);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate("/login");
  };

  const handleLotteryClick = () => {
    navigate("/dashboard");
  };

  // Функция для определения активности ссылки
  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <motion.nav 
      className="bg-gradient-to-r from-purple-700 to-indigo-900 text-white shadow-lg"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-3">
            <div className="bg-white rounded-full w-10 h-10 flex items-center justify-center">
              <span className="text-purple-700 text-sm font-bold">ЛОТО</span>
            </div>
            <span className="text-2xl font-bold tracking-wider">FutureWin</span>
          </Link>
          
          {/* Информация о пользователе и балансе */}
          {user && (
            <div className="hidden md:flex items-center bg-opacity-30 bg-white rounded-lg px-4 py-2">
              <div className="text-xs mr-4">
                <span className="block text-gray-300">Ваш баланс</span>
                <span className="font-bold text-lg">{user.balance?.toFixed(2) || "0.00"} ₽</span>
              </div>
              <div className="text-xs">
                <span className="block text-gray-300">Кристаллы</span>
                <div className="flex items-center">
                  <span className="font-bold text-lg">{user.crystals || 0}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex items-center space-x-1">
            <button
              className="md:hidden text-white focus:outline-none"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
                />
              </svg>
            </button>
            
            <div className={`md:flex items-center space-x-1 ${isMenuOpen ? "block absolute top-16 right-4 bg-purple-900 p-4 shadow-lg rounded-lg z-50 w-64" : "hidden"} md:static md:bg-transparent md:shadow-none md:p-0 md:block md:w-auto`}>
              <Link
                to="/dashboard"
                className={`block px-4 py-2 rounded-md font-medium transition-colors duration-200 ${isActive('/dashboard') ? 'bg-indigo-700 text-white' : 'hover:bg-indigo-800 text-gray-100'}`}
              >
                Лотереи
              </Link>
              <Link
                to="/instant-lotteries"
                className={`block px-4 py-2 rounded-md font-medium transition-colors duration-200 ${isActive('/instant-lotteries') ? 'bg-indigo-700 text-white' : 'hover:bg-indigo-800 text-gray-100'}`}
              >
                Моментальные
              </Link>
              <Link
                to="/ar-lottery"
                className={`block px-4 py-2 rounded-md font-medium transition-colors duration-200 ${isActive('/ar-lottery') ? 'bg-indigo-700 text-white' : 'hover:bg-indigo-800 text-gray-100'} relative`}
              >
                AR Лотерея
                <span className="absolute top-0 right-0 -mt-1 -mr-1 px-1.5 py-0.5 bg-yellow-500 text-xs font-bold rounded-full">NEW</span>
              </Link>
              {user ? (
                <>
                  <Link
                    to="/profile"
                    className={`block px-4 py-2 rounded-md font-medium transition-colors duration-200 ${isActive('/profile') ? 'bg-indigo-700 text-white' : 'hover:bg-indigo-800 text-gray-100'}`}
                  >
                    Профиль
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="block w-full md:w-auto text-left px-4 py-2 rounded-md font-medium transition-colors duration-200 hover:bg-red-700 text-gray-100"
                  >
                    Выйти
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="block px-4 py-2 rounded-md font-medium transition-colors duration-200 hover:bg-indigo-800 text-gray-100"
                  >
                    Вход
                  </Link>
                  <Link
                    to="/register"
                    className="block px-4 py-2 bg-indigo-500 rounded-md font-semibold text-white hover:bg-indigo-600 transition-colors duration-200"
                  >
                    Регистрация
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;