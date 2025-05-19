import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";

const Header = ({ showLogout = false }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="w-full bg-primary py-4 px-6 shadow-md flex justify-between items-center">
      <div 
        className="text-secondary-dark font-bold text-2xl cursor-pointer flex items-center" 
        onClick={() => navigate("/dashboard")}
      >
        {/* Здесь можно добавить лого */}
        <div className="bg-secondary-dark rounded-full w-8 h-8 mr-2 flex items-center justify-center">
          <span className="text-primary text-xs font-bold">6/36</span>
        </div>
        ЛОТЕРЕЯ
      </div>
      {showLogout ? (
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-secondary text-primary font-semibold rounded-md hover:bg-secondary-light transition-colors duration-300"
        >
          Выйти
        </button>
      ) : (
        <div className="flex gap-4">
          {location.pathname !== "/login" && (
            <button
              onClick={() => navigate("/login")}
              className="px-4 py-2 bg-secondary text-primary font-semibold rounded-md hover:bg-secondary-light transition-colors duration-300"
            >
              Войти
            </button>
          )}
          {location.pathname !== "/register" && (
            <button
              onClick={() => navigate("/register")}
              className="px-4 py-2 bg-secondary text-primary font-semibold rounded-md hover:bg-secondary-light transition-colors duration-300"
            >
              Регистрация
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Header;