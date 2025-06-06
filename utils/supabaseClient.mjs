import { createClient } from "@supabase/supabase-js";  

const supabaseUrl = process.env.SUPABASE_URL; 
const supabaseAnonkey = process.env.SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonkey); // Create a Supabase client instance