// Минималистичный темный Navbar.js
import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";

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

  // Функция для определения активности ссылки
  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path);
  };

  return (
    <nav className="bg-gray-900 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Логотип */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center shadow-lg hover:shadow-purple-500/30 transition-all duration-300">
                <span className="text-white text-sm font-bold">ЛОТО</span>
              </div>
              <span className="text-2xl font-bold text-white tracking-tight">FutureWin</span>
            </Link>
          </div>

          {/* Информация о пользователе и балансе (только для десктопа) */}
          {user && (
            <div className="hidden md:flex items-center bg-gray-800 px-4 py-2 rounded-lg border border-gray-700">
              <div className="mr-6">
                <p className="text-gray-400 text-xs">Баланс</p>
                <p className="text-white font-medium">{user.balance?.toLocaleString('ru-RU', {minimumFractionDigits: 2, maximumFractionDigits: 2}) || "0.00"} ₽</p>
              </div>
              <div className="relative">
                <p className="text-gray-400 text-xs">Кристаллы</p>
                <div className="flex items-center">
                  <p className="text-white font-medium">{user.crystals || 0}</p>
                  <span className="ml-1 text-yellow-400">✦</span>
                </div>
                {user.vip_level > 0 && (
                  <div className="absolute -top-2 -right-2">
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold text-gray-900 bg-yellow-400 rounded-full">
                      VIP {user.vip_level}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Навигация для десктопа */}
          <div className="hidden md:block">
            <div className="flex items-center">
              <div className="border border-gray-700 rounded-lg p-1 mr-4">
                <Link
                  to="/dashboard"
                  className={`px-3 py-1.5 rounded text-sm font-medium ${
                    isActive('/dashboard')
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800 hover:bg-opacity-50'
                  } transition-colors duration-200`}
                >
                  Лотереи
                </Link>
                <Link
                  to="/instant-lotteries"
                  className={`px-3 py-1.5 rounded text-sm font-medium ${
                    isActive('/instant-lotteries')
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800 hover:bg-opacity-50'
                  } transition-colors duration-200`}
                >
                  Моментальные
                </Link>
                <Link
                  to="/ar-lottery"
                  className={`px-3 py-1.5 rounded text-sm font-medium relative ${
                    isActive('/ar-lottery')
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800 hover:bg-opacity-50'
                  } transition-colors duration-200`}
                >
                  AR Лотерея
                  {!isActive('/ar-lottery') && (
                    <span className="absolute top-0 right-0 transform translate-x-1 -translate-y-1 w-2 h-2 bg-yellow-400 rounded-full"></span>
                  )}
                </Link>
              </div>

              {user ? (
                <div className="flex items-center space-x-2">
                  <Link
                    to="/profile"
                    className={`p-2 rounded-md ${
                      isActive('/profile')
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-300 hover:text-white hover:bg-gray-800'
                    } transition-colors duration-200`}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="p-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-800 transition-colors duration-200"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link
                    to="/login"
                    className="px-3 py-1.5 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-colors duration-200"
                  >
                    Вход
                  </Link>
                  <Link
                    to="/register"
                    className="px-3 py-1.5 rounded-md text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors duration-200"
                  >
                    Регистрация
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Мобильная кнопка меню */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 focus:outline-none"
              aria-expanded={isMenuOpen}
            >
              <span className="sr-only">Открыть меню</span>
              <svg
                className={`${isMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <svg
                className={`${isMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Мобильное меню */}
      <div className={`${isMenuOpen ? 'block' : 'hidden'} md:hidden border-t border-gray-800`}>
        {user && (
          <div className="flex justify-between items-center px-4 py-3 bg-gray-800 border-b border-gray-700">
            <div>
              <p className="text-xs text-gray-400">Баланс</p>
              <p className="text-white font-medium">{user.balance?.toLocaleString('ru-RU', {minimumFractionDigits: 2, maximumFractionDigits: 2}) || "0.00"} ₽</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Кристаллы</p>
              <div className="flex items-center">
                <p className="text-white font-medium">{user.crystals || 0}</p>
                <span className="ml-1 text-yellow-400">✦</span>
              </div>
            </div>
            {user.vip_level > 0 && (
              <div className="bg-yellow-400 rounded-full px-2 py-0.5">
                <p className="text-xs font-bold text-gray-900">VIP {user.vip_level}</p>
              </div>
            )}
          </div>
        )}
        
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <Link
            to="/dashboard"
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              isActive('/dashboard')
                ? 'bg-gray-800 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-800'
            }`}
            onClick={() => setIsMenuOpen(false)}
          >
            Лотереи
          </Link>
          <Link
            to="/instant-lotteries"
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              isActive('/instant-lotteries')
                ? 'bg-gray-800 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-800'
            }`}
            onClick={() => setIsMenuOpen(false)}
          >
            Моментальные
          </Link>
          <Link
            to="/ar-lottery"
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              isActive('/ar-lottery')
                ? 'bg-gray-800 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-800'
            }`}
            onClick={() => setIsMenuOpen(false)}
          >
            <div className="flex items-center">
              AR Лотерея
              <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-black bg-yellow-400 rounded-full">
                NEW
              </span>
            </div>
          </Link>
          {user ? (
            <>
              <Link
                to="/profile"
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive('/profile')
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-800'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Профиль
              </Link>
              <button
                onClick={() => {
                  handleSignOut();
                  setIsMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800"
              >
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800"
                onClick={() => setIsMenuOpen(false)}
              >
                Вход
              </Link>
              <Link
                to="/register"
                className="block px-3 py-2 rounded-md text-base font-medium bg-indigo-600 text-white hover:bg-indigo-700"
                onClick={() => setIsMenuOpen(false)}
              >
                Регистрация
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;