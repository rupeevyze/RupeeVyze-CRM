import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatDate, isDueToday, isOverdueDueDate } from "../utils.js";

const priorityConfig = {
  High: { color: "#dc2626", bg: "#fef2f2", label: "High" },
  Medium: { color: "#d97706", bg: "#fffbeb", label: "Medium" },
  Low: { color: "#16a34a", bg: "#f0fdf4", label: "Low" },
};

export default function CandidateCard({ candidate, onOpen, stageColor, detailsPrefix = "/adviser/profile", isAdmin, onApprove, onReject }) {
  const navigate = useNavigate();
  const priority = candidate.priority || candidate.followUp?.priority || "Medium";
  const pc = priorityConfig[priority] || priorityConfig.Medium;
  const dueDate = candidate.dueDate || "";
  const overdueDue = isOverdueDueDate(dueDate);
  const dueToday = isDueToday(dueDate);
  const approvalStatus = candidate.approvalStatus || "approved";
  const isPending = approvalStatus.startsWith("pending_");
  const isRejected = approvalStatus.startsWith("rejected_");
  const statusLabels = {
    pending_add: "Pending Add",
    pending_edit: "Pending Edit",
    pending_delete: "Pending Delete",
    rejected_add: "Rejected",
    rejected_edit: "Rejected",
  };

  return (
    <div className="candidate-card" onClick={() => navigate(`${detailsPrefix}/${candidate.id}`)}>
      <div className="card-header">
        <div>
          <h3>{candidate.name}</h3>
          <p>{candidate.mobile || candidate.phone}</p>
        </div>
        <span className="badge" style={{ backgroundColor: stageColor }}>
          {candidate.workflowStage}
        </span>
        {(isPending || isRejected) && (
          <span className="badge" style={{ backgroundColor: isRejected ? "#dc2626" : "#d97706" }}>
            {statusLabels[approvalStatus] || approvalStatus}
          </span>
        )}
        {candidate.policyIssued === "Yes" && (
          <span className="badge" style={{ backgroundColor: "#16a34a" }}>Issued</span>
        )}
        {candidate.premiumCollected === "Yes" && (
          <span className="badge" style={{ backgroundColor: "#2563eb" }}>Premium Received</span>
        )}
      </div>
      <p>{candidate.leadSource || candidate.source} · {candidate.recruitedBy || candidate.assignedTo}</p>
      {candidate.stageStatus && (
        <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "#64748b" }}>Stage Status: {candidate.stageStatus}</p>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "6px 0", flexWrap: "wrap" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", fontWeight: 600, color: pc.color, background: pc.bg, padding: "2px 8px", borderRadius: "12px" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: pc.color, display: "inline-block" }} />
          {pc.label}
        </span>
        {dueDate && (
          <span style={{ fontSize: "0.75rem", fontWeight: 500, color: overdueDue ? "#dc2626" : dueToday ? "#ea580c" : "#64748b" }}>
            Due: {formatDate(dueDate)}
          </span>
        )}
      </div>
      <div className="card-row">
        <span>Next Follow-up: {formatDate(candidate.followUpDate || candidate.nextFollowUp)}</span>
      </div>
      <div className="card-actions">
        <Link
          className="button secondary"
          to={`${detailsPrefix}/${candidate.id}`}
          onClick={(event) => event.stopPropagation()}
        >
          View Details
        </Link>
        {isAdmin && isPending ? (
          <>
            <button
              type="button"
              className="button primary"
              style={{ background: "#16a34a" }}
              onClick={(event) => { event.stopPropagation(); onApprove && onApprove(candidate); }}
            >
              Approve
            </button>
            <button
              type="button"
              className="button secondary"
              style={{ color: "#dc2626", borderColor: "#dc2626" }}
              onClick={(event) => { event.stopPropagation(); onReject && onReject(candidate); }}
            >
              Reject
            </button>
          </>
        ) : (
          !(isPending && !isAdmin) && (
            <button
              type="button"
              className="button primary"
              onClick={(event) => {
                event.stopPropagation();
                onOpen(candidate);
              }}
            >
              {isRejected ? "Revise" : "Edit"}
            </button>
          )
        )}
      </div>
    </div>
  );
}
