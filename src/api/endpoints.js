import { supabase } from "../supabaseClient.js";

// ---------------------------------------------------------------------------
// Mapping helpers: the app's JS objects use camelCase; the candidates table
// uses snake_case columns. Other tables (clients, team_members,
// performance_records, override_payout_records, service_requests) store
// their whole record as a jsonb `data` column plus a couple of indexed
// columns used by RLS (assigned_advisor_id / advisor_id), so those just
// round-trip the object as-is.
// ---------------------------------------------------------------------------

function candidateToRow(c) {
  return {
    lead_id: c.leadId,
    lead_type: c.leadType,
    name: c.name,
    mobile: c.mobile,
    phone: c.phone,
    email: c.email,
    city: c.city,
    workflow_stage: c.workflowStage,
    lead_status: c.leadStatus,
    assigned_to: c.assignedTo,
    assigned_advisor_id: c.assignedAdvisorId ? String(c.assignedAdvisorId) : null,
    lead_source: c.leadSource,
    source: c.source,
    priority: c.priority,
    next_follow_up: c.nextFollowUp,
    created_date: c.createdDate,
    notes: c.notes,
    policy_number: c.policyNumber,
    advisor_code: c.advisorCode,
    timeline: c.timeline || [],
    activities: c.activities || [],
    documents: c.documents || [],
    communication: c.communication || [],
    tasks: c.tasks || [],
    follow_up: c.followUp || {},
  };
}

function rowToCandidate(r) {
  if (!r) return r;
  return {
    id: r.id,
    leadId: r.lead_id,
    leadType: r.lead_type,
    name: r.name,
    mobile: r.mobile,
    phone: r.phone,
    email: r.email,
    city: r.city,
    workflowStage: r.workflow_stage,
    leadStatus: r.lead_status,
    assignedTo: r.assigned_to,
    assignedAdvisorId: r.assigned_advisor_id,
    leadSource: r.lead_source,
    source: r.source,
    priority: r.priority,
    nextFollowUp: r.next_follow_up,
    createdDate: r.created_date,
    notes: r.notes,
    policyNumber: r.policy_number,
    advisorCode: r.advisor_code,
    timeline: r.timeline || [],
    activities: r.activities || [],
    documents: r.documents || [],
    communication: r.communication || [],
    tasks: r.tasks || [],
    followUp: r.follow_up || {},
    approvalStatus: r.approval_status || "approved",
    pendingData: r.pending_data || null,
    requestedBy: r.requested_by || null,
    requestedAt: r.requested_at || null,
  };
}

function throwIfError(error) {
  if (error) throw new Error(error.message || "Supabase request failed");
}

// ---------------------------------- candidates ----------------------------
export const candidatesApi = {
  async list() {
    const { data, error } = await supabase.from("candidates").select("*").order("id", { ascending: true });
    throwIfError(error);
    return (data || []).map(rowToCandidate);
  },
  async getById(id) {
    const { data, error } = await supabase.from("candidates").select("*").eq("id", id).single();
    throwIfError(error);
    return rowToCandidate(data);
  },
  async create(payload) {
    const { data, error } = await supabase.from("candidates").insert(candidateToRow(payload)).select().single();
    throwIfError(error);
    return rowToCandidate(data);
  },
  async update(id, updates) {
    const row = candidateToRow(updates);
    // Only send fields that were actually provided, to avoid clobbering
    // unrelated columns with undefined -> null.
    Object.keys(row).forEach((k) => row[k] === undefined && delete row[k]);
    const { data, error } = await supabase.from("candidates").update(row).eq("id", id).select().single();
    throwIfError(error);
    return rowToCandidate(data);
  },
  async remove(id) {
    const { error } = await supabase.from("candidates").delete().eq("id", id);
    throwIfError(error);
    return { success: true };
  },
  async updateStage(id, { stage }) {
    const { data, error } = await supabase.from("candidates").update({ workflow_stage: stage }).eq("id", id).select().single();
    throwIfError(error);
    return rowToCandidate(data);
  },
  async updateNote(id, { note }) {
    const { data, error } = await supabase.from("candidates").update({ notes: note }).eq("id", id).select().single();
    throwIfError(error);
    return rowToCandidate(data);
  },
  async updateFollowUp(id, followUpPatch) {
    const { data: existing, error: fetchErr } = await supabase.from("candidates").select("follow_up").eq("id", id).single();
    throwIfError(fetchErr);
    const merged = { ...(existing?.follow_up || {}), ...followUpPatch };
    const { data, error } = await supabase.from("candidates").update({ follow_up: merged }).eq("id", id).select().single();
    throwIfError(error);
    return rowToCandidate(data);
  },
  async bulkCreate(records) {
    const rows = records.map(candidateToRow);
    const { data, error } = await supabase.from("candidates").insert(rows).select();
    throwIfError(error);
    return { imported: (data || []).length, skipped: 0, records: (data || []).map(rowToCandidate) };
  },

  // ---------------- Client add/edit/delete approval workflow ----------------

  // Advisor submits a brand-new client; it's created immediately but flagged
  // pending_add so it doesn't count as live until an admin approves it.
  async submitClientForApproval(payload, requestedByUserId) {
    const row = {
      ...candidateToRow(payload),
      approval_status: "pending_add",
      requested_by: requestedByUserId ? String(requestedByUserId) : null,
      requested_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from("candidates").insert(row).select().single();
    throwIfError(error);
    return rowToCandidate(data);
  },

  // Advisor proposes changes to an existing (already-approved) client.
  // The live `data` columns are left untouched; the proposal sits in
  // pending_data until an admin approves or rejects it.
  async submitEditForApproval(id, proposedChanges, requestedByUserId) {
    const { data, error } = await supabase
      .from("candidates")
      .update({
        pending_data: proposedChanges,
        approval_status: "pending_edit",
        requested_by: requestedByUserId ? String(requestedByUserId) : null,
        requested_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();
    throwIfError(error);
    return rowToCandidate(data);
  },

  // Advisor requests deletion; the record stays visible (flagged) until an
  // admin approves the removal.
  async submitDeleteForApproval(id, requestedByUserId) {
    const { data, error } = await supabase
      .from("candidates")
      .update({
        approval_status: "pending_delete",
        requested_by: requestedByUserId ? String(requestedByUserId) : null,
        requested_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();
    throwIfError(error);
    return rowToCandidate(data);
  },

  // Admin approves a pending add/edit/delete.
  async approveRequest(id) {
    const { data: existing, error: fetchErr } = await supabase.from("candidates").select("*").eq("id", id).single();
    throwIfError(fetchErr);

    if (existing.approval_status === "pending_delete") {
      const { error } = await supabase.from("candidates").delete().eq("id", id);
      throwIfError(error);
      return { deleted: true, id };
    }

    if (existing.approval_status === "pending_edit") {
      const row = { ...candidateToRow({ ...rowToCandidate(existing), ...existing.pending_data }), approval_status: "approved", pending_data: null, requested_by: null, requested_at: null };
      const { data, error } = await supabase.from("candidates").update(row).eq("id", id).select().single();
      throwIfError(error);
      return rowToCandidate(data);
    }

    // pending_add
    const { data, error } = await supabase
      .from("candidates")
      .update({ approval_status: "approved", requested_by: null, requested_at: null })
      .eq("id", id)
      .select()
      .single();
    throwIfError(error);
    return rowToCandidate(data);
  },

  // Admin rejects a pending add/edit/delete.
  async rejectRequest(id) {
    const { data: existing, error: fetchErr } = await supabase.from("candidates").select("approval_status").eq("id", id).single();
    throwIfError(fetchErr);

    if (existing.approval_status === "pending_add") {
      // A rejected new client never went live — remove it entirely.
      const { error } = await supabase.from("candidates").delete().eq("id", id);
      throwIfError(error);
      return { deleted: true, id };
    }

    // pending_edit or pending_delete: revert to the last approved state.
    const { data, error } = await supabase
      .from("candidates")
      .update({ approval_status: "approved", pending_data: null, requested_by: null, requested_at: null })
      .eq("id", id)
      .select()
      .single();
    throwIfError(error);
    return rowToCandidate(data);
  },
};

// ------------------------------ jsonb-blob tables --------------------------
// Generic helper for tables shaped as { id, data jsonb, ...index columns }
function jsonbTable(tableName, extraColumnsFromRecord = () => ({})) {
  return {
    async list() {
      const { data, error } = await supabase.from(tableName).select("*").order("id", { ascending: true });
      throwIfError(error);
      return (data || []).map((r) => ({ id: r.id, ...(r.data || {}) }));
    },
    async create(record) {
      const { id: _drop, ...rest } = record || {};
      const row = { data: rest, ...extraColumnsFromRecord(rest) };
      const { data, error } = await supabase.from(tableName).insert(row).select().single();
      throwIfError(error);
      return { id: data.id, ...(data.data || {}) };
    },
    async update(id, updates) {
      const { data: existing, error: fetchErr } = await supabase.from(tableName).select("data").eq("id", id).single();
      throwIfError(fetchErr);
      const merged = { ...(existing?.data || {}), ...updates };
      const row = { data: merged, ...extraColumnsFromRecord(merged) };
      const { data, error } = await supabase.from(tableName).update(row).eq("id", id).select().single();
      throwIfError(error);
      return { id: data.id, ...(data.data || {}) };
    },
    async remove(id) {
      const { error } = await supabase.from(tableName).delete().eq("id", id);
      throwIfError(error);
      return { success: true };
    },
  };
}

const clientsTable = jsonbTable("clients", (rec) => ({ assigned_advisor_id: rec.assignedAdvisorId ? String(rec.assignedAdvisorId) : null }));
const performanceTable = jsonbTable("performance_records", (rec) => ({ advisor_id: rec.advisorCode ? String(rec.advisorCode) : (rec.advisorName ? String(rec.advisorName) : null) }));
const teamMembersTable = jsonbTable("team_members");
const serviceRequestsTable = jsonbTable("service_requests", (rec) => ({ assigned_advisor_id: rec.assignedTo ? String(rec.assignedTo) : null }));

export const clientsApi = {
  list: (params) => clientsTable.list(params),
  getById: async (id) => {
    const all = await clientsTable.list();
    return all.find((c) => String(c.id) === String(id));
  },
  create: (data) => clientsTable.create(data),
  update: (id, data) => clientsTable.update(id, data),
  getPolicies: () => Promise.resolve([]),
  getClaims: () => Promise.resolve([]),
  getRenewals: () => Promise.resolve([]),
};

export const teamMembersApi = {
  list: () => teamMembersTable.list(),
};

export const settingsApi = {
  async get() {
    const { data, error } = await supabase.from("settings").select("*").eq("id", 1).single();
    throwIfError(error);
    return {
      businessName: data.business_name,
      selectedConfigId: data.selected_config_id,
      followUpReminderDays: data.follow_up_reminder_days,
      contactEmail: data.contact_email,
    };
  },
  async update(newSettings) {
    const row = {
      business_name: newSettings.businessName,
      selected_config_id: newSettings.selectedConfigId,
      follow_up_reminder_days: newSettings.followUpReminderDays,
      contact_email: newSettings.contactEmail,
    };
    Object.keys(row).forEach((k) => row[k] === undefined && delete row[k]);
    const { data, error } = await supabase.from("settings").update(row).eq("id", 1).select().single();
    throwIfError(error);
    return {
      businessName: data.business_name,
      selectedConfigId: data.selected_config_id,
      followUpReminderDays: data.follow_up_reminder_days,
      contactEmail: data.contact_email,
    };
  },
};

export const performanceApi = {
  list: () => performanceTable.list(),
  create: (data) => performanceTable.create(data),
  update: (id, data) => performanceTable.update(id, data),
};

export const overridePayoutsApi = {
  async list() {
    const { data, error } = await supabase.from("override_payout_records").select("*").order("id", { ascending: true });
    throwIfError(error);
    return (data || []).map((r) => ({ id: r.id, ...(r.data || {}) }));
  },
  async replaceAll(records) {
    // Simplest safe approach: wipe and re-insert. Fine at this data volume;
    // revisit with upserts if the table grows large.
    const { error: delErr } = await supabase.from("override_payout_records").delete().neq("id", -1);
    throwIfError(delErr);
    if (!records.length) return [];
    const rows = records.map((r) => { const { id, ...rest } = r; return { data: rest }; });
    const { data, error } = await supabase.from("override_payout_records").insert(rows).select();
    throwIfError(error);
    return (data || []).map((r) => ({ id: r.id, ...(r.data || {}) }));
  },
};

export const servicesApi = {
  list: () => serviceRequestsTable.list(),
  create: (data) => serviceRequestsTable.create(data),
  update: (id, data) => serviceRequestsTable.update(id, data),
  remove: (id) => serviceRequestsTable.remove(id),
};

// ---------------------------- policies / claims / rewards / roles / permissions ----
const policiesTable = jsonbTable("policies");
const claimsTable = jsonbTable("claims");
const rewardsTable = jsonbTable("rewards");
const rolesTable = jsonbTable("roles");
const permissionsTable = jsonbTable("permissions");

export const policiesApi = {
  list: () => policiesTable.list(),
  create: (data) => policiesTable.create(data),
  update: (id, data) => policiesTable.update(id, data),
  remove: (id) => policiesTable.remove(id),
};

export const claimsApi = {
  list: () => claimsTable.list(),
  create: (data) => claimsTable.create(data),
  update: (id, data) => claimsTable.update(id, data),
  remove: (id) => claimsTable.remove(id),
};

export const rewardsApi = {
  list: () => rewardsTable.list(),
  create: (data) => rewardsTable.create(data),
  update: (id, data) => rewardsTable.update(id, data),
  remove: (id) => rewardsTable.remove(id),
};

export const rolesApi = {
  list: () => rolesTable.list(),
  create: (data) => rolesTable.create(data),
  update: (id, data) => rolesTable.update(id, data),
  remove: (id) => rolesTable.remove(id),
};

export const permissionsApi = {
  list: () => permissionsTable.list(),
  create: (data) => permissionsTable.create(data),
  update: (id, data) => permissionsTable.update(id, data),
  remove: (id) => permissionsTable.remove(id),
};
