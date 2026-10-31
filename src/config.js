// Settings: the only part you normally edit.

/* ============================================================
   SETTINGS — the only part you normally edit.
   Leave supabaseUrl empty to run in demo mode.
   ============================================================ */
const CONFIG = {
  supabaseUrl: "https://vkyfnewnpsyuhbmvryws.supabase.co",       // e.g. "https://abcd1234.supabase.co"
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZreWZuZXducHN5dWhibXZyeXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3NTczMjUsImV4cCI6MjEwODMzMzMyNX0.FyGj1LjJkpDz6xtjKH28EscjSCtL_99M6mindIVG8rU",   // the "anon public" key from Supabase > Project Settings > API
  contactEmail: "",   // shown for objections to moderation decisions; until set, the app links to the Impressum
  // The weekly Talk Train: weekday (1 = Monday … 7 = Sunday), departure time in Berlin time, ride length in minutes, route text
  talkTrain: {
    weekday: 2, time: "07:42", minutes: 45,
    route: {
      de: "RE 1 ab Düren · Wagen 5",
      en: "RE 1 from Düren · coach 5",
      ar: "RE 1 من دورن · العربة 5"
    }
  }
};

export { CONFIG };
