import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const USDA_API_BASE = "https://api.nal.usda.gov/fdc/v1";
const USDA_API_KEY = Deno.env.get("USDA_API_KEY");

serve(async (req) => {
  try {
    const { query, pageSize } = await req.json();

    const params = new URLSearchParams({
      query: query ?? "",
      pageSize: String(pageSize ?? 5),
      api_key: USDA_API_KEY ?? "",
    });

    const response = await fetch(`${USDA_API_BASE}/foods/search?${params}`);
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
      status: response.status,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});