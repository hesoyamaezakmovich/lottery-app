import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dpedoavcbtbhhzcavalm.supabase.co"; // Замени на свой Project URL
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwZWRvYXZjYnRiaGh6Y2F2YWxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2NDUyODEsImV4cCI6MjA2MzIyMTI4MX0.lITiaaBJuV4jIuJaVtZtcPn27nlRONtVbLqfER28sJY"; // Замени на свой Anon Public Key
export const supabase = createClient(supabaseUrl, supabaseKey);