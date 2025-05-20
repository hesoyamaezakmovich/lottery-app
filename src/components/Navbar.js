import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

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

  return (
    <nav className="bg-yellow-500 shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold text-black">
            Лотерея
          </Link>
          <div className="flex items-center space-x-4">
            {user && (
              <div className="text-black">
                Баланс: {user.balance || 0} руб. | Кристаллы: {user.crystals || 0}
              </div>
            )}
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
            <div className={`md:flex items-center space-x-6 ${isMenuOpen ? "block absolute top-16 right-4 bg-yellow-500 p-4 shadow-lg rounded-lg z-50" : "hidden"} md:static md:bg-transparent md:shadow-none md:p-0 md:block`}>
              <button
                onClick={handleLotteryClick}
                className="block text-black hover:text-gray-800 py-2 md:py-0"
              >
                Лотереи
              </button>
              <Link
                to="/instant-lotteries"
                className="block text-black hover:text-gray-800 py-2 md:py-0"
              >
                Моментальные лотереи
              </Link>
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
      </div>
    </nav>
  );
};

export default Navbar;