// Stand-ins for the server-only keys. Both test servers get them as env
// values, and the *.secrets.spec.ts tests check that no response contains
// them. They are not keys and unlock nothing.
export const SERVER_KEY_SENTINELS = {
  SUPABASE_SECRET_KEY: "sentinel-supabase-secret-not-a-key",
  AI_GATEWAY_API_KEY: "sentinel-ai-gateway-not-a-key",
};
