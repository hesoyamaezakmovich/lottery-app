// Updated Navbar.js with VIP Shop button and Inventory access
import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import VIPShop from "./VIPShop"; // Import the VIP Shop component
import UserInventory from "./UserInventory"; // Import the User Inventory component

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isVIPShopOpen, setIsVIPShopOpen] = useState(false); // State for VIP Shop modal
  const [isInventoryOpen, setIsInventoryOpen] = useState(false); // State for Inventory modal
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

  // Function to determine if a route is active
  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path);
  };

  return (
    <nav className="bg-gray-900 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left section: Logo and navigation */}
          <div className="flex items-center space-x-4">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center shadow-lg hover:shadow-purple-500/30 transition-all duration-300">
                <span className="text-white text-sm font-bold">ЛОТО</span>
              </div>
              <span className="text-2xl font-bold text-white tracking-tight">FutureWin</span>
            </Link>
            
            {/* Navigation for desktop (moved from center to left) */}
            <div className="hidden md:block ml-6">
              <div className="border border-gray-700 rounded-lg p-1">
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
            </div>
          </div>

          {/* Right section: User info and VIP status */}
          <div className="flex items-center space-x-3">
            {/* VIP Shop Button - Only show for logged in users */}
            {user && (
              <div className="hidden md:flex items-center space-x-3">
                <button
                  onClick={() => setIsInventoryOpen(true)}
                  className="flex items-center space-x-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-3 py-1.5 rounded-md font-medium hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 shadow-md"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  <span>Инвентарь</span>
                </button>
                
                <button
                  onClick={() => setIsVIPShopOpen(true)}
                  className="flex items-center space-x-1 bg-gradient-to-r from-yellow-500 to-amber-600 text-black px-3 py-1.5 rounded-md font-medium hover:from-yellow-600 hover:to-amber-700 transition-all duration-300 shadow-md"
                >
                  <span className="text-yellow-900">✦</span>
                  <span>Магазин наград</span>
                  {/* Pulsing dot for attention */}
                  <span className="absolute top-0 right-0 transform translate-x-1 -translate-y-1 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                </button>
              </div>
            )}
            
            {/* User balance (only for desktop) */}
            {user && (
              <div className="hidden md:flex items-center">
                <div className="bg-gray-800 px-4 py-2 rounded-lg border border-gray-700">
                  <p className="text-gray-400 text-xs">Баланс</p>
                  <p className="text-white font-medium">{user.balance?.toLocaleString('ru-RU', {minimumFractionDigits: 2, maximumFractionDigits: 2}) || "0.00"} ₽</p>
                </div>
                
                {/* Crystals (only for desktop) */}
                <div className="ml-3 bg-gray-800 px-4 py-2 rounded-lg border border-gray-700">
                  <p className="text-gray-400 text-xs">Кристаллы</p>
                  <div className="flex items-center">
                    <p className="text-white font-medium">{user.crystals || 0}</p>
                    <span className="ml-1 text-yellow-400">✦</span>
                  </div>
                </div>
                
                {/* VIP level moved outside balance block */}
                {user.vip_level > 0 && (
                  <div className="ml-3 bg-yellow-400 px-3 py-2 rounded-lg">
                    <p className="text-xs font-bold text-gray-900">VIP {user.vip_level}</p>
                  </div>
                )}
              </div>
            )}

            {/* User actions for desktop */}
            <div className="hidden md:flex items-center space-x-2">
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

          {/* Mobile menu button */}
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

      {/* Mobile menu */}
      <div className={`${isMenuOpen ? 'block' : 'hidden'} md:hidden border-t border-gray-800`}>
        {user && (
          <div className="flex flex-col space-y-2 px-4 py-3 bg-gray-800 border-b border-gray-700">
            {/* Mobile user info */}
            <div className="flex justify-between items-center">
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
              {/* VIP status outside the balance block in mobile view */}
              {user.vip_level > 0 && (
                <div className="bg-yellow-400 rounded-full px-2 py-0.5">
                  <p className="text-xs font-bold text-gray-900">VIP {user.vip_level}</p>
                </div>
              )}
            </div>
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
          {/* VIP Shop in mobile menu */}
          {user && (
            <>
              <button
                onClick={() => {
                  setIsInventoryOpen(true);
                  setIsMenuOpen(false);
                }}
                className="w-full text-left flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800 bg-gradient-to-r from-indigo-500/20 to-purple-600/20"
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                Мой инвентарь
              </button>
              
              <button
                onClick={() => {
                  setIsVIPShopOpen(true);
                  setIsMenuOpen(false);
                }}
                className="w-full text-left flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800 bg-gradient-to-r from-yellow-500/20 to-amber-600/20"
              >
                <span className="text-yellow-400 mr-2">✦</span>
                Магазин наград
                <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-black bg-red-400 rounded-full">
                  VIP
                </span>
              </button>
            </>
          )}
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

      {/* VIP Shop Modal */}
      {isVIPShopOpen && <VIPShop isOpen={isVIPShopOpen} onClose={() => setIsVIPShopOpen(false)} />}
      
      {/* Inventory Modal */}
      {isInventoryOpen && <UserInventory isOpen={isInventoryOpen} onClose={() => setIsInventoryOpen(false)} />}
    </nav>
  );
};

export default Navbar;