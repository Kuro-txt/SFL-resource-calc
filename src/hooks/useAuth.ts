import { useCallback, useEffect, useState } from "react";
import { createClient, SupabaseClient, User } from "@supabase/supabase-js";

export interface AuthState {
  ready: boolean;
  user: User | null;
  linkedFarmId: string;
  configError: string | null;
  signUp: (params: { username: string; password: string; farmId: string }) => Promise<{ error?: string; farmId?: string }>;
  signIn: (params: { username: string; password: string }) => Promise<{ error?: string; farmId?: string }>;
  signOut: () => Promise<void>;
}

let cachedSupabase: SupabaseClient | null = null;

async function getOrInitSupabase(): Promise<SupabaseClient | null> {
  if (cachedSupabase) return cachedSupabase;

  let url = "";
  let anonKey = "";

  try {
    const raw = sessionStorage.getItem("sfl_client_cfg");
    if (raw) {
      const parsed = JSON.parse(raw) as { supabaseUrl?: string; supabaseAnonKey?: string };
      if (parsed.supabaseUrl && parsed.supabaseAnonKey) {
        url = parsed.supabaseUrl;
        anonKey = parsed.supabaseAnonKey;
      }
    }
  } catch {
    // ignore storage errors
  }

  if (!url || !anonKey) {
    try {
      const localRes = await fetch("/api/config");
      if (localRes.ok) {
        const cfg = (await localRes.json()) as { supabaseUrl?: string; supabaseAnonKey?: string };
        if (cfg.supabaseUrl && cfg.supabaseAnonKey) {
          url = cfg.supabaseUrl;
          anonKey = cfg.supabaseAnonKey;
        }
      }
    } catch {
      // fallback below
    }
  }

  if (!url || !anonKey) {
    try {
      const remoteRes = await fetch("https://sfl-calculator-backend.onrender.com/api/config");
      if (remoteRes.ok) {
        const cfg = (await remoteRes.json()) as { supabaseUrl?: string; supabaseAnonKey?: string };
        if (cfg.supabaseUrl && cfg.supabaseAnonKey) {
          url = cfg.supabaseUrl;
          anonKey = cfg.supabaseAnonKey;
        }
      }
    } catch {
      // ignore
    }
  }

  if (!url || !anonKey) return null;

  try {
    sessionStorage.setItem("sfl_client_cfg", JSON.stringify({ supabaseUrl: url, supabaseAnonKey: anonKey }));
  } catch {
    // ignore
  }

  cachedSupabase = createClient(url, anonKey);
  return cachedSupabase;
}

function normalizeEmail(rawUsername: string): string {
  const clean = rawUsername.replace(/@gmail\.com$/i, "").replace(/@.*$/, "").trim().toLowerCase();
  return clean ? `${clean}@gmail.com` : "";
}

export function useAuth(): AuthState {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [linkedFarmId, setLinkedFarmId] = useState<string>(() => localStorage.getItem("sfl_farm_id") || "");
  const [configError, setConfigError] = useState<string | null>(null);

  const syncProfileFarmId = useCallback(async (client: SupabaseClient, authUser: User) => {
    try {
      const { data } = await client
        .from("profiles")
        .select("farm_id")
        .eq("id", authUser.id)
        .single();

      const foundFarmId = data?.farm_id ? String(data.farm_id).trim() : "";
      if (foundFarmId) {
        localStorage.setItem("sfl_farm_id", foundFarmId);
        setLinkedFarmId(foundFarmId);
        return foundFarmId;
      }
    } catch {
      // ignore if profile does not exist yet
    }
    return localStorage.getItem("sfl_farm_id") || "";
  }, []);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | null = null;

    (async () => {
      const client = await getOrInitSupabase();
      if (!active) return;

      if (!client) {
        setConfigError("Unable to load authentication config.");
        setReady(true);
        return;
      }

      const {
        data: { session },
      } = await client.auth.getSession();

      if (!active) return;

      if (session?.user) {
        setUser(session.user);
        await syncProfileFarmId(client, session.user);
      } else {
        setUser(null);
      }
      setReady(true);

      const { data: listener } = client.auth.onAuthStateChange(async (_event, nextSession) => {
        if (!active) return;
        if (nextSession?.user) {
          setUser(nextSession.user);
          await syncProfileFarmId(client, nextSession.user);
        } else {
          setUser(null);
        }
      });
      unsubscribe = () => listener.subscription.unsubscribe();
    })();

    return () => {
      active = false;
      if (unsubscribe) unsubscribe();
    };
  }, [syncProfileFarmId]);

  const signUp = useCallback(
    async ({ username, password, farmId }: { username: string; password: string; farmId: string }) => {
      const email = normalizeEmail(username);
      if (!email) return { error: "Please enter a valid account username." };
      if (!password || password.length < 6) return { error: "Password must be at least 6 characters long." };
      const numericFarm = parseInt(farmId.trim(), 10);
      if (!farmId.trim() || Number.isNaN(numericFarm) || numericFarm <= 0) {
        return { error: "Please enter a valid numeric Sunflower Land Farm ID." };
      }

      const client = await getOrInitSupabase();
      if (!client) return { error: "Connecting to Supabase... Please try again." };

      const { data, error } = await client.auth.signUp({ email, password });
      if (error) return { error: error.message };

      let authUser = data.user;
      if (authUser && !data.session) {
        const loginRes = await client.auth.signInWithPassword({ email, password });
        if (loginRes.data?.user) authUser = loginRes.data.user;
      }

      if (authUser) {
        await client.from("profiles").upsert({ id: authUser.id, farm_id: String(numericFarm) }, { onConflict: "id" });
        localStorage.setItem("sfl_farm_id", String(numericFarm));
        setLinkedFarmId(String(numericFarm));
        setUser(authUser);
      }

      return { farmId: String(numericFarm) };
    },
    []
  );

  const signIn = useCallback(
    async ({ username, password }: { username: string; password: string }) => {
      const email = normalizeEmail(username);
      if (!email) return { error: "Please enter your account username." };
      if (!password || password.length < 6) return { error: "Password must be at least 6 characters long." };

      const client = await getOrInitSupabase();
      if (!client) return { error: "Connecting to Supabase... Please try again." };

      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };

      let resolvedFarmId = "";
      if (data.user) {
        setUser(data.user);
        resolvedFarmId = await syncProfileFarmId(client, data.user);
      }

      return { farmId: resolvedFarmId };
    },
    [syncProfileFarmId]
  );

  const signOut = useCallback(async () => {
    const client = await getOrInitSupabase();
    if (client) {
      await client.auth.signOut();
    }
    setUser(null);
  }, []);

  return {
    ready,
    user,
    linkedFarmId,
    configError,
    signUp,
    signIn,
    signOut,
  };
}
