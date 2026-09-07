import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import EventIcon from "@mui/icons-material/Event";
import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import { useCrm } from "../../crmContext.jsx";
import { useAuth } from "../../authContext.jsx";

const emptyForm = { name: "", mobile: "", city: "", email: "" };
function ApprovalBadge({ status }) {
  if (!status || status === "approved") return null;
  const labels = {
    pending_add: "Pending Add",
    pending_edit: "Pending Edit",
    pending_delete: "Pending Delete",
    rejected_add: "Rejected — Needs Revision",
    rejected_edit: "Rejected — Needs Revision",
  };
  const color = status.startsWith("rejected") ? "error" : "warning";
  return <Chip label={labels[status] || status} size="small" color={color} sx={{ ml: 1 }} />;
}

export default function ClientsList() {
  const { candidates: allCandidates, submitClient, submitClientEdit, submitClientDelete, approveClientRequest, rejectClientRequest, resubmitClientRequest, addCandidate, updateCandidate, deleteCandidate } = useCrm();
  const { currentUser, isAdmin, isAdvisor } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // candidate being edited
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [actionError, setActionError] = useState("");

  const activeClientCandidates = useMemo(() => {
    let list = (allCandidates || []).filter(
      (c) => (c.leadType === "Insurance Customer" || !c.leadType) &&
        (c.workflowStage === "Active Client" || c.approvalStatus === "pending_add")
    );
    if (isAdvisor && currentUser) {
      list = list.filter((c) => String(c.assignedAdvisorId || "") === String(currentUser.id || ""));
    }
    return list.map((c) => ({
      candidateId: String(c.id),
      clientId: c.leadId || `LD-${c.id}`,
      name: c.name || "",
      mobile: c.mobile || c.phone || "",
      city: c.city || "",
      advisorAssigned: c.assignedAdvisorName || c.assignedTo || "",
      assignedAdvisorId: c.assignedAdvisorId || "",
      finalStatus: c.leadStatus || "Active Client",
      leadSource: c.leadSource || c.source || "",
      email: c.email || "",
      dateReceived: c.createdDate || "",
      approvalStatus: c.approvalStatus || "approved",
      pendingData: c.pendingData || null,
      raw: c,
    }));
  }, [allCandidates, currentUser, isAdvisor]);

  const filteredClients = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    return activeClientCandidates.filter((client) => {
      const matchesSearch = !normalized || client.name.toLowerCase().includes(normalized) || client.city.toLowerCase().includes(normalized) || client.advisorAssigned.toLowerCase().includes(normalized);
      const matchesStatus = statusFilter === "All" || (client.finalStatus || "Active Client") === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [activeClientCandidates, searchTerm, statusFilter]);

  const summaryClients = activeClientCandidates;

  const summaryCards = useMemo(() => {
    const active = summaryClients.filter((client) => (client.finalStatus || "Active Client") === "Active Client").length;
    const currentMonth = new Date().toISOString().slice(0, 7);
    const newClients = summaryClients.filter((client) => client.dateReceived && client.dateReceived.startsWith(currentMonth)).length;
    const pending = summaryClients.filter((client) => client.approvalStatus !== "approved").length;

    return [
      { label: "Total Clients", value: summaryClients.length, icon: PersonIcon, color: "#2563eb" },
      { label: "Active Clients", value: active, icon: VerifiedUserIcon, color: "#16a34a" },
      { label: "New Clients", value: newClients, icon: EventIcon, color: "#d97706" },
      { label: "Pending Approval", value: pending, icon: PersonIcon, color: "#7c3aed" }
    ];
  }, [summaryClients]);

  const openAdd = () => {
    setForm(emptyForm);
    setFormError("");
    setFormSuccess("");
    setAddOpen(true);
  };

  const openEdit = (client) => {
    setEditTarget(client);
    setForm({ name: client.name, mobile: client.mobile, city: client.city, email: client.email });
    setFormError("");
    setFormSuccess("");
  };

  const closeDialogs = () => {
    if (submitting) return;
    setAddOpen(false);
    setEditTarget(null);
  };

  const handleAddSubmit = async () => {
    setFormError("");
    if (!form.name || !form.mobile) {
      setFormError("Name and mobile are required.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        mobile: form.mobile,
        city: form.city,
        email: form.email,
        workflowStage: "Active Client",
        leadStatus: "Active Client",
        createdDate: new Date().toISOString().slice(0, 10),
      };
      if (isAdmin) {
        await addCandidate(payload);
        setFormSuccess("Client added.");
      } else {
        await submitClient(payload);
        setFormSuccess("Submitted for admin approval.");
      }
      setTimeout(() => setAddOpen(false), 900);
    } catch (err) {
      setFormError(err.message || "Failed to add client.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async () => {
    setFormError("");
    if (!form.name || !form.mobile) {
      setFormError("Name and mobile are required.");
      return;
    }
    setSubmitting(true);
    try {
      const isRejectedState = (editTarget.approvalStatus || "").startsWith("rejected_");
      if (isAdmin) {
        await updateCandidate(editTarget.candidateId, form);
        setFormSuccess("Client updated.");
      } else if (isRejectedState) {
        await resubmitClientRequest(editTarget.candidateId, form);
        setFormSuccess("Resubmitted for admin approval.");
      } else {
        await submitClientEdit(editTarget.candidateId, form);
        setFormSuccess("Edit submitted for admin approval.");
      }
      setTimeout(() => setEditTarget(null), 900);
    } catch (err) {
      setFormError(err.message || "Failed to submit edit.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRequest = async (client) => {
    setActionError("");
    try {
      if (isAdmin) {
        await deleteCandidate(client.candidateId);
      } else {
        await submitClientDelete(client.candidateId);
      }
    } catch (err) {
      setActionError(err.message || "Failed to delete/submit delete request.");
    }
  };

  const handleApprove = async (client) => {
    setActionError("");
    try {
      await approveClientRequest(client.candidateId);
    } catch (err) {
      setActionError(err.message || "Failed to approve.");
    }
  };

  const handleReject = async (client) => {
    setActionError("");
    try {
      await rejectClientRequest(client.candidateId);
    } catch (err) {
      setActionError(err.message || "Failed to reject.");
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: "#0f172a" }}>Client Portfolio</Typography>
          <Typography variant="body1" sx={{ color: "#475569" }}>
            A professional client directory with status, advisor ownership and servicing context.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>Add Client</Button>
      </Box>

      {actionError && <Alert severity="error" onClose={() => setActionError("")}>{actionError}</Alert>}

      <Grid container spacing={2}>
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Grid item xs={12} sm={6} md={3} key={card.label}>
              <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #e2e8f0", height: "100%" }}>
                <CardContent>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ bgcolor: `${card.color}15`, color: card.color, borderRadius: "50%", p: 1 }}>
                      <Icon fontSize="small" />
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">{card.label}</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>{card.value}</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #e2e8f0" }}>
        <Box sx={{ p: 2, borderBottom: "1px solid #e2e8f0" }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
            <TextField size="small" placeholder="Search client, city or advisor" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} sx={{ minWidth: 280 }} />
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} label="Status" onChange={(event) => setStatusFilter(event.target.value)}>
                <MenuItem value="All">All Status</MenuItem>
                <MenuItem value="Active Client">Active Client</MenuItem>
                <MenuItem value="Proposal Submitted">Proposal Submitted</MenuItem>
                <MenuItem value="In Progress">In Progress</MenuItem>
                <MenuItem value="Lost">Lost</MenuItem>
                <MenuItem value="Follow-up Pending">Follow-up Pending</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Client ID</TableCell>
                <TableCell>Client Name</TableCell>
                <TableCell>Mobile</TableCell>
                <TableCell>City</TableCell>
                <TableCell>Advisor</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: "center", py: 4, color: "#64748b" }}>No records found</TableCell>
                </TableRow>
              ) : (
                filteredClients.map((client) => {
                  const isOwnClient = isAdvisor && String(client.assignedAdvisorId) === String(currentUser?.id);
                  const isPendingState = (client.approvalStatus || "").startsWith("pending_");
                  const isRejectedState = (client.approvalStatus || "").startsWith("rejected_");
                  const adminCanEditDirectly = isAdmin && !isPendingState;
                  const advisorCanEditApproved = isOwnClient && client.approvalStatus === "approved";
                  const advisorCanRevise = isOwnClient && isRejectedState;
                  return (
                    <TableRow key={client.clientId || client.candidateId} hover>
                      <TableCell>{client.clientId || client.candidateId}</TableCell>
                      <TableCell>{client.name}</TableCell>
                      <TableCell>{client.mobile}</TableCell>
                      <TableCell>{client.city}</TableCell>
                      <TableCell>{client.advisorAssigned}</TableCell>
                      <TableCell>
                        <Chip label={client.finalStatus || "Active Client"} size="small" color={client.finalStatus === "Active Client" ? "success" : client.finalStatus === "Lost" ? "error" : "info"} />
                        <ApprovalBadge status={client.approvalStatus} />
                        {isRejectedState && client.raw?.rejectionReason && (
                          <Tooltip title={client.raw.rejectionReason}>
                            <Typography component="span" variant="caption" sx={{ ml: 1, color: "#b91c1c", cursor: "help" }}>(why?)</Typography>
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Link className="button secondary" to={`/adviser/profile/${client.candidateId}`}>View</Link>
                          {adminCanEditDirectly && (
                            <>
                              <Button size="small" variant="outlined" onClick={() => openEdit(client)}>Edit</Button>
                              <Button size="small" variant="text" color="error" onClick={() => handleDeleteRequest(client)}>Delete</Button>
                            </>
                          )}
                          {advisorCanEditApproved && (
                            <>
                              <Button size="small" variant="outlined" onClick={() => openEdit(client)}>Edit</Button>
                              <Button size="small" variant="text" color="error" onClick={() => handleDeleteRequest(client)}>Delete</Button>
                            </>
                          )}
                          {advisorCanRevise && (
                            <Button size="small" variant="contained" onClick={() => openEdit(client)}>Revise &amp; Resubmit</Button>
                          )}
                          {isAdmin && isPendingState && (
                            <>
                              <Tooltip title="Approve">
                                <Button size="small" variant="contained" color="success" onClick={() => handleApprove(client)}><CheckIcon fontSize="small" /></Button>
                              </Tooltip>
                              <Tooltip title="Reject">
                                <Button size="small" variant="outlined" color="error" onClick={() => handleReject(client)}><CloseIcon fontSize="small" /></Button>
                              </Tooltip>
                            </>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add Client dialog */}
      <Dialog open={addOpen} onClose={closeDialogs} maxWidth="sm" fullWidth>
        <DialogTitle>Add Client</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {isAdvisor && (
              <Typography variant="body2" color="text.secondary">
                This client will be submitted for admin approval before it appears live in the system.
              </Typography>
            )}
            {formError && <Alert severity="error">{formError}</Alert>}
            {formSuccess && <Alert severity="success">{formSuccess}</Alert>}
            <TextField label="Full Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} disabled={submitting} fullWidth />
            <TextField label="Mobile" value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))} disabled={submitting} fullWidth />
            <TextField label="City" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} disabled={submitting} fullWidth />
            <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} disabled={submitting} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeDialogs} disabled={submitting}>Close</Button>
          <Button onClick={handleAddSubmit} variant="contained" disabled={submitting} startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}>
            {submitting ? "Submitting..." : isAdvisor ? "Submit for Approval" : "Add Client"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Client dialog */}
      <Dialog open={Boolean(editTarget)} onClose={closeDialogs} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Client</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {isAdvisor && (
              <Typography variant="body2" color="text.secondary">
                These changes will be submitted for admin approval before they go live.
              </Typography>
            )}
            {formError && <Alert severity="error">{formError}</Alert>}
            {formSuccess && <Alert severity="success">{formSuccess}</Alert>}
            <TextField label="Full Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} disabled={submitting} fullWidth />
            <TextField label="Mobile" value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))} disabled={submitting} fullWidth />
            <TextField label="City" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} disabled={submitting} fullWidth />
            <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} disabled={submitting} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeDialogs} disabled={submitting}>Close</Button>
          <Button onClick={handleEditSubmit} variant="contained" disabled={submitting} startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}>
            {submitting ? "Submitting..." : isAdvisor ? "Submit for Approval" : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
