import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";

const Navbar = () => {
  const { user, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const handleLotteryClick = () => {
    console.log("Navbar: User state on Lottery click:", user);
    navigate("/dashboard");
  };

  return (
    <nav className="bg-yellow-500 shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold text-black">
            Лотерея
          </Link>
          <button
            className="md:hidden text-black focus:outline-none"
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
          <div className={`md:flex items-center space-x-6 ${isMenuOpen ? "block" : "hidden"} md:block`}>
            <button
              onClick={handleLotteryClick}
              className="block text-black hover:text-gray-800 py-2 md:py-0"
            >
              Лотереи
            </button>
            {user ? (
              <>
                <Link
                  to="/profile"
                  className="block text-black hover:text-gray-800 py-2 md:py-0"
                >
                  Профиль
                </Link>
                <button
                  onClick={handleSignOut}
                  className="block text-black hover:text-gray-800 py-2 md:py-0"
                >
                  Выйти
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="block text-black hover:text-gray-800 py-2 md:py-0"
                >
                  Вход
                </Link>
                <Link
                  to="/register"
                  className="block text-black hover:text-gray-800 py-2 md:py-0"
                >
                  Регистрация
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;