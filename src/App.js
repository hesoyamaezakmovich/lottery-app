import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Register from "./components/Register";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Profile from "./components/Profile";
import ResetPassword from "./components/ResetPassword";
import AdminPanel from "./components/AdminPanel";
import LotteryPage from "./components/LotteryPage";
import InstantLotteries from "./components/InstantLotteries";
import InstantLotteryGame from "./components/InstantLotteryGame";
import { supabase } from "./supabaseClient";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      if (session) {
        const { data, error } = await supabase
          .from("users")
          .select("vip_level")
          .eq("id", session.user.id)
          .single();
        if (!error && data.vip_level >= 5) {
          setIsAdmin(true);
        }
      }
      setLoading(false);
    };
    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      if (session) {
        supabase
          .from("users")
          .select("vip_level")
          .eq("id", session.user.id)
          .single()
          .then(({ data, error }) => {
            if (!error && data.vip_level >= 5) {
              setIsAdmin(true);
            } else {
              setIsAdmin(false);
            }
          });
      } else {
        setIsAdmin(false);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-100">Загрузка...</div>;
  }

  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
            <Route path="/profile" element={isAuthenticated ? <Profile /> : <Navigate to="/login" />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="/"
              element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />}
            />
            <Route
              path="/admin"
              element={isAuthenticated && isAdmin ? <AdminPanel /> : <Navigate to="/login" />}
            />
            <Route
              path="/lottery/:id"
              element={<LotteryPage />}
            />
            {/* Маршруты для моментальных лотерей */}
            <Route
              path="/instant-lotteries"
              element={<InstantLotteries />}
            />
            <Route
              path="/instant-lottery/:type"
              element={isAuthenticated ? <InstantLotteryGame /> : <Navigate to="/login" />}
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;