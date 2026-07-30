import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import WebSocket from "ws";

dotenv.config();

// supabase-js eagerly builds a realtime client that needs a global WebSocket.
// Node < 22 has none natively (Vercel/Node 22 does). We never use realtime, but
// the constructor still requires an implementation to exist.
if (!(globalThis as { WebSocket?: unknown }).WebSocket) {
    (globalThis as { WebSocket?: unknown }).WebSocket = WebSocket;
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    throw new Error(
        "Missing Supabase environment variables. Check your .env file."
    );
}

// Public client — respects Row Level Security (RLS)
// Use this for operations on behalf of authenticated users
// flowType must be 'implicit' so that resetPasswordForEmail produces a
// #access_token hash-fragment redirect instead of a PKCE ?code= redirect
// (the PKCE code_verifier can't survive between the server request and the
// user clicking the email link).
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        flowType: 'implicit',
        autoRefreshToken: false,
        persistSession: false,
    },
});

// Admin client — bypasses RLS
// Use this ONLY for admin operations (reports, user management)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
