import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("MY_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), { status: 401, headers: corsHeaders });
    }

    const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers: corsHeaders });
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: callerProfile, error: profileErr } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();

    if (profileErr || callerProfile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Only admins can create advisor accounts" }), { status: 403, headers: corsHeaders });
    }

    const { name, email, password, candidateId } = await req.json();
    if (!name || !email || !password) {
      return new Response(JSON.stringify({ error: "name, email, and password are required" }), { status: 400, headers: corsHeaders });
    }

    // If no existing candidate/advisor record was chosen to link, create a
    // minimal one now so this advisor has an advisor_candidate_id to be
    // scoped to (RLS policies require this — a null id can never match).
    let resolvedCandidateId = candidateId;
    if (!resolvedCandidateId) {
      const { data: newCandidate, error: candidateErr } = await adminClient
        .from("candidates")
        .insert({ name, email, lead_type: "Advisor", workflow_stage: "Active Advisor", lead_status: "Active" })
        .select()
        .single();
      if (candidateErr) {
        return new Response(JSON.stringify({ error: `Failed to create linked advisor record: ${candidateErr.message}` }), { status: 400, headers: corsHeaders });
      }
      resolvedCandidateId = String(newCandidate.id);
    }

    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createErr || !newUser?.user) {
      return new Response(JSON.stringify({ error: createErr?.message || "Failed to create user" }), { status: 400, headers: corsHeaders });
    }

    const { error: insertErr } = await adminClient.from("profiles").insert({
      id: newUser.user.id,
      name,
      email,
      role: "advisor",
      advisor_candidate_id: resolvedCandidateId,
    });

    if (insertErr) {
      await adminClient.auth.admin.deleteUser(newUser.user.id);
      return new Response(JSON.stringify({ error: insertErr.message }), { status: 400, headers: corsHeaders });
    }

    return new Response(
      JSON.stringify({ success: true, userId: newUser.user.id, candidateId: resolvedCandidateId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});