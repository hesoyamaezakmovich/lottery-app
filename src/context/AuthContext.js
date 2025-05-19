// Обновленный контекст авторизации с поддержкой баланса и кристаллов
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
  const [userProfile, setUserProfile] = useState(null);

  // Функция для обновления профиля пользователя
  const updateUserProfile = async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error("Ошибка получения данных пользователя:", userError);
        return;
      }

      if (userData.user) {
        // Получение дополнительных данных из таблицы profiles
        const { data: profileData, error: profileError } = await supabase
          .from("users")
          .select("*")
          .eq("id", userData.user.id)
          .single();

        if (profileError) {
          console.error("Ошибка получения профиля:", profileError);
          return;
        }

        setUserProfile(profileData);
        setUser({
          ...userData.user,
          ...profileData
        });
      }
    } catch (err) {
      console.error("Ошибка обновления профиля:", err);
    }
  };

  // Функция для обновления баланса пользователя
  const updateBalance = async (amount) => {
    try {
      if (!user) return;

      const { error } = await supabase
        .from("users")
        .update({ balance: user.balance + amount })
        .eq("id", user.id);

      if (error) throw error;

      // Обновляем локальный стейт
      setUser({
        ...user,
        balance: user.balance + amount
      });
      
      // Обновляем полный профиль
      await updateUserProfile();
      
      return true;
    } catch (err) {
      console.error("Ошибка обновления баланса:", err);
      return false;
    }
  };

  // Функция для обновления кристаллов пользователя
  const updateCrystals = async (amount) => {
    try {
      if (!user) return;

      const { error } = await supabase
        .from("users")
        .update({ crystals: user.crystals + amount })
        .eq("id", user.id);

      if (error) throw error;

      // Обновляем локальный стейт
      setUser({
        ...user,
        crystals: user.crystals + amount
      });
      
      // Обновляем полный профиль
      await updateUserProfile();
      
      return true;
    } catch (err) {
      console.error("Ошибка обновления кристаллов:", err);
      return false;
    }
  };

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
          
          // Получение дополнительной информации из таблицы users
          if (userData.user) {
            const { data: profileData, error: profileError } = await supabase
              .from("users")
              .select("*")
              .eq("id", userData.user.id)
              .single();
            
            if (profileError) {
              console.error("Profile error:", profileError.message);
              
              // Если профиль не найден, создаем его
              if (profileError.code === "PGRST116") {
                const { error: insertError } = await supabase
                  .from("users")
                  .insert({
                    id: userData.user.id,
                    email: userData.user.email,
                    username: userData.user.email,
                    balance: 0,
                    crystals: 0,
                    vip_level: 0,
                    created_at: new Date().toISOString()
                  });
                
                if (insertError) {
                  console.error("Error creating profile:", insertError);
                  throw insertError;
                }
                
                // Получаем созданный профиль
                const { data: newProfileData } = await supabase
                  .from("users")
                  .select("*")
                  .eq("id", userData.user.id)
                  .single();
                
                setUserProfile(newProfileData);
                setUser({
                  ...userData.user,
                  ...newProfileData
                });
              } else {
                throw profileError;
              }
            } else {
              setUserProfile(profileData);
              setUser({
                ...userData.user,
                ...profileData
              });
            }
          } else {
            setUser(null);
            setUserProfile(null);
          }
        } else {
          setUser(null);
          setUserProfile(null);
        }
      } catch (err) {
        console.error("AuthContext fetch error:", err.message);
        setUser(null);
        setUserProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("AuthContext onAuthStateChange:", event, session);
      
      if (session?.user) {
        // При изменении состояния авторизации обновляем пользовательские данные
        try {
          const { data, error } = await supabase
            .from("users")
            .select("*")
            .eq("id", session.user.id)
            .single();
          
          if (error) {
            if (error.code === "PGRST116") {
              // Создаем профиль если его нет
              const { error: insertError } = await supabase
                .from("users")
                .insert({
                  id: session.user.id,
                  email: session.user.email,
                  username: session.user.email,
                  balance: 0,
                  crystals: 0,
                  vip_level: 0,
                  created_at: new Date().toISOString()
                });
              
              if (insertError) throw insertError;
              
              // Получаем созданный профиль
              const { data: newData } = await supabase
                .from("users")
                .select("*")
                .eq("id", session.user.id)
                .single();
              
              setUserProfile(newData);
              setUser({
                ...session.user,
                ...newData
              });
            } else {
              throw error;
            }
          } else {
            setUserProfile(data);
            setUser({
              ...session.user,
              ...data
            });
          }
        } catch (err) {
          console.error("Error updating user data:", err);
          setUser(session.user);
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      
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
      setUserProfile(null);
    } catch (err) {
      console.error("AuthContext signOut error:", err.message);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signOut, 
      userProfile,
      updateUserProfile,
      updateBalance,
      updateCrystals
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;