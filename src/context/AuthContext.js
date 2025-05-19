import React, { createContext, useState, useEffect, useContext } from "react";
import { supabase } from "../supabaseClient";

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("AuthContext: Initializing...");

    const fetchSession = async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        console.log("AuthContext getSession:", sessionData, "Error:", sessionError);
        if (sessionError) {
          console.error("Session error:", sessionError.message);
          throw sessionError;
        }

        if (sessionData.session) {
          const { data: userData, error: userError } = await supabase.auth.getUser();
          console.log("AuthContext getUser:", userData, "Error:", userError);
          if (userError) {
            console.error("User error:", userError.message);
            throw userError;
          }
          setUser(userData.user || null);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("AuthContext fetch error:", err.message);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("AuthContext onAuthStateChange:", event, session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (err) {
      console.error("AuthContext signOut error:", err.message);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;