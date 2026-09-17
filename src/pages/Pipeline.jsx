import { useMemo, useState } from "react";
import { Box, Button, Paper, Typography } from "@mui/material";
import { useCrm } from "../crmContext.jsx";
import { useAuth, filterByRole } from "../authContext.jsx";
import { isDueToday, isDueWithinDays, isOverdueDueDate } from "../utils.js";
import CandidateCard from "../components/CandidateCard.jsx";
import CandidateModal from "../components/CandidateModal.jsx";
import CandidateForm from "../components/CandidateForm.jsx";

function Pipeline({ detailsPrefix }) {
  const { candidates: allCandidates, updateCandidateStage, updateCandidate, updateCandidateNote, addCandidate, submitClient, submitClientEdit, resubmitClientRequest, approveClientRequest, rejectClientRequest, pipelineStages, sources, recruiterNames, stageBadge, advisorWorkflowStages, customerWorkflowStages } = useCrm();
  const { currentUser, isAdvisor, isAdmin } = useAuth();
  const candidates = useMemo(() => filterByRole(allCandidates, currentUser), [allCandidates, currentUser]);
  const detailsPathPrefix = detailsPrefix || "/adviser/profile";
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("All Stages");
  const [sourceFilter, setSourceFilter] = useState("All Sources");
  const [recruiterFilter, setRecruiterFilter] = useState("All Recruiters");
  const [cityFilter, setCityFilter] = useState("All Cities");
  const [priorityDueFilter, setPriorityDueFilter] = useState("All");
  const [activeCandidate, setActiveCandidate] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  const cityOptions = useMemo(() => {
    return [...new Set(candidates.map((candidate) => candidate.city).filter(Boolean))];
  }, [candidates]);

  const stageOptions = customerWorkflowStages;

  const filteredCandidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return candidates.filter((candidate) => {
      const isInsuranceCustomer = !candidate.leadType || candidate.leadType === "Insurance Customer";
      if (!isInsuranceCustomer) return false;
      if (candidate.workflowStage === "Active Client") return false;
      const searchText = [candidate.name, candidate.mobile, candidate.phone, candidate.email, candidate.city, candidate.leadId, candidate.advisorCode].join(" ").toLowerCase();
      const matchesSearch = q === "" || searchText.includes(q);
      const matchesStage = stageFilter === "All Stages" || candidate.workflowStage === stageFilter;
      const matchesSource = sourceFilter === "All Sources" || candidate.source === sourceFilter || candidate.leadSource === sourceFilter;
      const matchesRecruiter = recruiterFilter === "All Recruiters" || candidate.recruitedBy === recruiterFilter || candidate.assignedTo === recruiterFilter;
      const matchesCity = cityFilter === "All Cities" || candidate.city === cityFilter;
      let matchesPriorityDue = true;
      if (priorityDueFilter === "High Priority") {
        matchesPriorityDue = (candidate.priority || candidate.followUp?.priority || "Medium") === "High";
      } else if (priorityDueFilter === "Due Today") {
        matchesPriorityDue = isDueToday(candidate.dueDate);
      } else if (priorityDueFilter === "Upcoming Due") {
        matchesPriorityDue = isDueWithinDays(candidate.dueDate, 7);
      } else if (priorityDueFilter === "Overdue") {
        matchesPriorityDue = isOverdueDueDate(candidate.dueDate);
      }
      return matchesSearch && matchesStage && matchesSource && matchesRecruiter && matchesCity && matchesPriorityDue;
    });
  }, [candidates, search, stageFilter, sourceFilter, recruiterFilter, cityFilter, priorityDueFilter]);

  const exportCsv = () => {
    const rows = [
      ["Name", "Phone", "Email", "City", "Source", "Recruiter", "Stage", "Follow-up Date", "Notes",
       "Assigned To", "Policy Issued", "Policy Number", "Insurance Company", "Policy Type",
       "Policy Start Date", "Policy End Date", "Premium Frequency", "Sum Assured", "Nominee Name",
       "Premium Collected", "Premium Amount", "Collection Date", "Payment Mode", "Transaction ID",
       "Receipt Number", "Collected By"],
      ...filteredCandidates.map((candidate) => [
        candidate.name,
        candidate.mobile || candidate.phone,
        candidate.email,
        candidate.city,
        candidate.leadSource || candidate.source,
        candidate.assignedTo || candidate.recruitedBy || "",
        candidate.workflowStage,
        candidate.nextFollowUp || candidate.followUpDate || "",
        candidate.notes,
        candidate.assignedTo || "",
        candidate.policyIssued || "",
        candidate.policyNumber || "",
        candidate.insuranceCompany || "",
        candidate.policyType || "",
        candidate.policyStartDate || "",
        candidate.policyEndDate || "",
        candidate.premiumFrequency || "",
        candidate.sumAssured || "",
        candidate.nomineeName || "",
        candidate.premiumCollected || "",
        candidate.premiumAmount || "",
        candidate.collectionDate || "",
        candidate.paymentMode || "",
        candidate.transactionReference || "",
        candidate.receiptNumber || "",
        candidate.collectedBy || ""
      ])
    ];

    const csvContent = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "lead_pipeline.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: "#0f172a" }}>Customer Leads Pipeline</Typography>
          <Typography variant="body1" sx={{ color: "#475569" }}>
            Manage insurance customer lead stages, follow-ups, and assignments.
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1.5 }}>
          <Button variant="outlined" size="small" onClick={exportCsv}>
            Export CSV
          </Button>
          <Button variant="contained" size="small" onClick={() => setFormOpen(true)}>
            + Add Lead
          </Button>
        </Box>
      </Box>

      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #e2e8f0", p: 2, mb: 2.5 }}>
        <div className="filters-row">
          <input
            type="text"
            placeholder="Search lead by name, phone, email or city"
            className="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="filter" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
            <option>All Stages</option>
            {stageOptions.map((stage) => (
              <option key={stage}>{stage}</option>
            ))}
          </select>
          <select className="filter" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
            <option>All Sources</option>
            {sources.map((source) => (
              <option key={source}>{source}</option>
            ))}
          </select>
          <select className="filter" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
            <option>All Cities</option>
            {cityOptions.map((city) => (
              <option key={city}>{city}</option>
            ))}
          </select>
          <select className="filter" value={recruiterFilter} onChange={(e) => setRecruiterFilter(e.target.value)}>
            <option>All Recruiters</option>
            {recruiterNames.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
          <select className="filter" value={priorityDueFilter} onChange={(e) => setPriorityDueFilter(e.target.value)}>
            <option>All</option>
            <option>High Priority</option>
            <option>Due Today</option>
            <option>Upcoming Due</option>
            <option>Overdue</option>
          </select>
        </div>
      </Paper>

      <div className="pipeline-grid">
        {filteredCandidates.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: "1 / -1", textAlign: "center", padding: "3rem", color: "#64748b" }}>
            No records found
          </div>
        ) : (
          filteredCandidates.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              onOpen={setActiveCandidate}
              stageColor={stageBadge[candidate.workflowStage] || "#64748b"}
              detailsPrefix={detailsPathPrefix}
              isAdmin={isAdmin}
              onApprove={(c) => approveClientRequest(c.id)}
              onReject={(c) => rejectClientRequest(c.id, window.prompt("Reason for rejection (optional):") || "")}
            />
          ))
        )}
      </div>

      {activeCandidate && (
        <CandidateModal
          candidate={activeCandidate}
          stageOptions={pipelineStages}
          stageColors={stageBadge}
          onClose={() => setActiveCandidate(null)}
          onStageUpdate={(id, stage) => {
            updateCandidateStage(id, stage);
            setActiveCandidate(null);
          }}
          onNoteSave={(id, note) => {
            updateCandidateNote(id, note);
            setActiveCandidate(null);
          }}
          onSave={async (id, payload) => {
            if (isAdvisor && String(activeCandidate?.assignedAdvisorId || "") === String(currentUser?.id || "")) {
              const status = activeCandidate?.approvalStatus || "approved";
              if (status.startsWith("rejected_")) {
                await resubmitClientRequest(id, payload);
              } else {
                await submitClientEdit(id, payload);
              }
            } else {
              updateCandidate(id, payload);
            }
            setActiveCandidate(null);
          }}
        />
      )}

      <CandidateForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onAdd={async (candidateData) => {
          if (isAdvisor) {
            await submitClient(candidateData);
          } else {
            await addCandidate(candidateData);
          }
          setFormOpen(false);
        }}
        pipelineStages={pipelineStages}
        sources={sources}
      />
    </div>
  );
}

export default Pipeline;
