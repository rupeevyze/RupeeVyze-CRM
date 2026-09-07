import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography
} from "@mui/material";
import { useCrm } from "../crmContext.jsx";
import { useAuth, filterByRole } from "../authContext.jsx";
import StageSelect from "../components/StageSelect.jsx";
import CandidateModal from "../components/CandidateModal.jsx";
import { formatDate, getFollowUpDate, getRecordType } from "../utils.js";

const customerTabs = [
  "Overview",
  "Timeline",
  "Activities",
  "Documents",
  "Communication",
  "Tasks",
  "Notes",
  "History",
  "Conversion"
];

const advisorTabs = [
  "Overview",
  "Recruitment Journey",
  "Recruitment Activities",
  "Onboarding Documents",
  "Recruitment Communication",
  "Training & Exam",
  "Recruitment Notes",
  "Recruitment History",
  "Activation"
];

const clientTabs = [
  "Overview",
  "Timeline",
  "Activities",
  "Documents",
  "Communication",
  "Notes",
  "History"
];

function CandidateDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { candidates, updateCandidateStage, updateCandidateNote, updateCandidate, deleteCandidate, advisorWorkflowStages, submitClientEdit, submitClientDelete, approveClientRequest, rejectClientRequest, resubmitClientRequest } = useCrm();
  const { currentUser, isAdmin, isAdvisor, canEditClient, canDeleteClient, canAssignClient } = useAuth();
  const [activeTab, setActiveTab] = useState("Overview");
  const [note, setNote] = useState("");
  const [tasks, setTasks] = useState([]);
  const [communications, setCommunications] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [newTask, setNewTask] = useState({ title: "", assignedTo: "", dueDate: "", priority: "Medium" });
  const [newComm, setNewComm] = useState({ type: "Call", date: "", remarks: "" });
  const [documentType, setDocumentType] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedDocument, setUploadedDocument] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [onboardingDocs, setOnboardingDocs] = useState({});
  const [viewingDoc, setViewingDoc] = useState(null);
  const [deletingDoc, setDeletingDoc] = useState(null);
  const [onboardUploadTarget, setOnboardUploadTarget] = useState(null);
  const [onboardFile, setOnboardFile] = useState(null);
  const [onboardUploading, setOnboardUploading] = useState(false);
  const [onboardFileError, setOnboardFileError] = useState("");

  const candidate = useMemo(
    () => candidates.find((item) => String(item.id) === id || String(item.leadId) === id),
    [candidates, id]
  );

  const hasAccess = useMemo(() => {
    if (!candidate) return false;
    if (isAdmin) return true;
    if (isAdvisor) {
      return String(candidate.assignedAdvisorId || "") === String(currentUser?.id || "");
    }
    return true;
  }, [candidate, isAdmin, isAdvisor, currentUser]);

  const accessibleCandidates = useMemo(() => filterByRole(candidates, currentUser), [candidates, currentUser]);

  const currentIndex = useMemo(() => accessibleCandidates.findIndex((item) => String(item.id) === id), [accessibleCandidates, id]);
  const previousLead = currentIndex > 0 ? accessibleCandidates[currentIndex - 1] : null;
  const nextLead = currentIndex >= 0 && currentIndex < accessibleCandidates.length - 1 ? accessibleCandidates[currentIndex + 1] : null;

  const isAdvisorLead = candidate?.leadType === "Advisor" || candidate?.leadType === "Recruitment";
  const isActiveClient = !isAdvisorLead && candidate?.workflowStage === "Active Client";
  const recordType = getRecordType(candidate);

  const approvalStatus = candidate?.approvalStatus || "approved";
  const isPendingState = approvalStatus.startsWith("pending_");
  const isRejectedState = approvalStatus.startsWith("rejected_");
  const isOwnClientRecord = recordType === "client" && String(candidate?.assignedAdvisorId || "") === String(currentUser?.id || "");

  const tabs = useMemo(() => {
    if (recordType === "advisor") return advisorTabs;
    if (recordType === "client") return clientTabs;
    return customerTabs;
  }, [recordType]);

  const availableDocumentTypes = useMemo(() => {
    if (recordType === "advisor") {
      return [
        "Aadhaar Card",
        "PAN Card",
        "Passport Size Photo",
        "Bank Passbook",
        "Cancelled Cheque",
        "Educational Certificate",
        "IRDA Certificate (if applicable)",
        "Address Proof",
        "Other"
      ];
    }

    if (recordType === "client") {
      return [
        "Aadhaar Card",
        "PAN Card",
        "Proposal Form",
        "Medical Reports",
        "Income Proof",
        "Address Proof",
        "Policy Documents",
        "Nominee Proof",
        "Other"
      ];
    }

    return [
      "Aadhaar Card",
      "PAN Card",
      "Proposal Form",
      "Medical Reports",
      "Income Proof",
      "Address Proof",
      "Policy Documents",
      "Nominee Proof",
      "Other"
    ];
  }, [recordType]);

  useEffect(() => {
    if (candidate) {
      setNote(candidate.notes || "");
      setTasks(candidate.tasks ? [...candidate.tasks] : []);
      setCommunications(candidate.communication ? [...candidate.communication] : []);
      setDocuments(candidate.documents ? [...candidate.documents] : []);
      setOnboardingDocs(candidate.onboardingDocuments || {});
      setActiveTab("Overview");
    }
  }, [candidate]);

  if (!candidate) {
    return (
      <div>
        <h1>Candidate not found</h1>
        <button onClick={() => navigate(-1)}>Back to Pipeline</button>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div>
        <h1>Access Denied</h1>
        <p>You do not have permission to view this profile.</p>
        <button onClick={() => navigate(-1)}>Back</button>
      </div>
    );
  }

  const handleSaveNote = () => {
    updateCandidateNote(candidate.id, note);
  };

  const handleAddTask = () => {
    if (!newTask.title.trim()) return;
    const updated = [...tasks, { ...newTask, id: `T-${Date.now()}`, status: "Open" }];
    setTasks(updated);
    setNewTask({ title: "", assignedTo: "", dueDate: "", priority: "Medium" });
    updateCandidate(candidate.id, { tasks: updated });
  };

  const handleAddCommunication = () => {
    if (!newComm.remarks.trim()) return;
    const updated = [...communications, newComm];
    setCommunications(updated);
    setNewComm({ type: "Call", date: "", remarks: "" });
    updateCandidate(candidate.id, { communication: updated });
  };

  const handleFileSelection = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadProgress(0);
    }
  };

  const handleUploadDocument = () => {
    if (!documentType || !selectedFile) return;

    setUploading(true);
    setUploadProgress(0);

    const interval = window.setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          window.clearInterval(interval);
          return 100;
        }
        return prev + 20;
      });
    }, 120);

    window.setTimeout(() => {
      window.clearInterval(interval);
      setUploading(false);
      setUploadProgress(100);
      const updatedDocuments = [...(candidate.documents || []), documentType];
      setDocuments(updatedDocuments);
      setUploadedDocument({
        type: documentType,
        fileName: selectedFile.name,
        uploadedAt: new Date().toLocaleString(),
        uploadedBy: "Current User",
        status: "Uploaded"
      });
      updateCandidate(candidate.id, { documents: updatedDocuments, updatedAt: new Date().toISOString() });
      setSelectedFile(null);
    }, 700);
  };

  const handleReplaceDocument = () => {
    setUploadedDocument(null);
    setSelectedFile(null);
    setDocumentType("");
    setUploadProgress(0);
    setUploading(false);
  };

  const handleDeleteDocument = () => {
    setUploadedDocument(null);
    setSelectedFile(null);
    setDocumentType("");
    setUploadProgress(0);
    setUploading(false);
  };

  const ALLOWED_DOC_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
  const MAX_FILE_SIZE = 5 * 1024 * 1024;

  const handleOnboardFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_DOC_TYPES.includes(file.type)) {
      setOnboardFileError("Only PDF, JPG, JPEG, and PNG files are allowed.");
      setOnboardFile(null);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setOnboardFileError("File size must be under 5 MB.");
      setOnboardFile(null);
      return;
    }
    setOnboardFileError("");
    setOnboardFile(file);
  };

  const handleOnboardUpload = () => {
    if (!onboardUploadTarget || !onboardFile) return;
    setOnboardUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const now = new Date().toLocaleString();
      const updated = {
        ...onboardingDocs,
        [onboardUploadTarget]: {
          status: "Submitted",
          fileName: onboardFile.name,
          fileURL: reader.result,
          uploadDate: now,
          uploadedBy: "Current User"
        }
      };
      setOnboardingDocs(updated);
      setOnboardUploading(false);
      setOnboardUploadTarget(null);
      setOnboardFile(null);
      setOnboardFileError("");
      updateCandidate(candidate.id, { onboardingDocuments: updated });
    };
    reader.readAsDataURL(onboardFile);
  };

  const handleOnboardConfirmDelete = () => {
    if (!deletingDoc) return;
    const updated = { ...onboardingDocs };
    delete updated[deletingDoc];
    setOnboardingDocs(updated);
    setDeletingDoc(null);
    updateCandidate(candidate.id, { onboardingDocuments: updated });
  };

  if (!candidate) {
    return (
      <div className="detail-card" style={{ padding: "3rem", textAlign: "center" }}>
        <Typography variant="h5" sx={{ color: "#64748b", mb: 2 }}>Lead not found</Typography>
        <Button variant="contained" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="detail-card">
      <div className="page-header">
        <div>
          <h1>{candidate.name}</h1>
          <p>{recordType === "client" ? "360° Client Profile" : recordType === "advisor" ? "360° Advisor Profile" : "360° Lead Profile"} • {candidate.leadId || candidate.advisorCode || candidate.email} • {candidate.city || candidate.phone}</p>
        </div>
        <div className="page-actions">
          {recordType === "client" && isPendingState ? (
            isAdmin ? (
              <>
                <button type="button" className="button secondary" style={{ color: "#16a34a", borderColor: "#16a34a" }} onClick={async () => { await approveClientRequest(candidate.id); }}>
                  Approve
                </button>
                <button type="button" className="button secondary" style={{ color: "#dc2626", borderColor: "#dc2626" }} onClick={async () => { await rejectClientRequest(candidate.id, window.prompt("Reason for rejection (optional):") || ""); }}>
                  Reject
                </button>
              </>
            ) : (
              <span style={{ color: "#92400e", fontSize: "0.875rem", alignSelf: "center" }}>Awaiting admin approval</span>
            )
          ) : recordType === "client" && isRejectedState && isOwnClientRecord ? (
            <button type="button" className="button secondary" onClick={() => setEditOpen(true)}>
              Revise &amp; Resubmit
            </button>
          ) : (
            <>
              {canEditClient(candidate) && (
                <button type="button" className="button secondary" onClick={() => setEditOpen(true)}>
                  Edit
                </button>
              )}
              {canDeleteClient(candidate) && (
                <button type="button" className="button secondary" style={{ color: "#dc2626", borderColor: "#dc2626" }} onClick={() => setDeleteConfirmOpen(true)}>
                  Delete
                </button>
              )}
            </>
          )}
          <button type="button" className="button secondary" onClick={() => previousLead && navigate(`/adviser/profile/${previousLead.id}`)} disabled={!previousLead}>
            ← Previous Lead
          </button>
          <button type="button" className="button secondary" onClick={() => nextLead && navigate(`/adviser/profile/${nextLead.id}`)} disabled={!nextLead}>
            Next Lead →
          </button>
        </div>
      </div>

      {recordType === "client" && isRejectedState && isOwnClientRecord && candidate.rejectionReason && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "0.75rem 1rem", margin: "0 0 1rem" }}>
          <strong style={{ color: "#b91c1c" }}>Rejected: </strong>
          <span style={{ color: "#7f1d1d" }}>{candidate.rejectionReason}</span>
        </div>
      )}

      <div className="tab-row">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Overview" && (
        <div className="card detail-card">
          <div className="detail-grid">
            {recordType === "client" ? (
              <>
                <div>
                  <h3>Client Information</h3>
                  <div className="detail-item"><span>Client ID</span><strong>{candidate.leadId || candidate.id}</strong></div>
                  <div className="detail-item"><span>Name</span><strong>{candidate.name}</strong></div>
                  <div className="detail-item"><span>Mobile</span><strong>{candidate.phone}</strong></div>
                  <div className="detail-item"><span>Email</span><strong>{candidate.email}</strong></div>
                  <div className="detail-item"><span>City</span><strong>{candidate.city}</strong></div>
                  <div className="detail-item"><span>Lead Source</span><strong>{candidate.leadSource || candidate.source || "Not specified"}</strong></div>
                  <div className="detail-item"><span>Policy Type Interest</span><strong>{candidate.policyTypeInterest || "Not specified"}</strong></div>
                </div>

                <div>
                  <h3>Current Status</h3>
                  <div className="detail-item">
                    <span>Client Status</span>
                    <strong>{candidate.workflowStage}</strong>
                  </div>
                  <div className="detail-item"><span>Lead Status</span><strong>{candidate.leadStatus}</strong></div>
                  <div className="detail-item"><span>Assigned Advisor</span><strong>{candidate.assignedAdvisorName || candidate.assignedTo || "Unassigned"}</strong></div>
                  <div className="detail-item"><span>Priority</span><strong>{candidate.priority || candidate.followUp?.priority || "Medium"}</strong></div>
                  <div className="detail-item"><span>Due Date</span><strong>{formatDate(candidate.dueDate) || "Not set"}</strong></div>
                  <div className="detail-item"><span>Next Follow-up</span><strong>{formatDate(candidate.nextFollowUp || candidate.followUpDate)}</strong></div>
                  {candidate.workflowStage === "Medical" && (
                    <>
                      <div className="detail-item"><span>Stage Status</span><strong>{candidate.stageStatus || "Pending"}</strong></div>
                      {candidate.stageStatus === "Completed" && (
                        <div className="detail-item"><span>Medical Completion Date</span><strong>{formatDate(candidate.medicalCompletionDate) || "Not set"}</strong></div>
                      )}
                    </>
                  )}
                  {candidate.workflowStage === "Underwriting" && (
                    <>
                      <div className="detail-item"><span>Stage Status</span><strong>{candidate.stageStatus || "Pending"}</strong></div>
                      {candidate.stageStatus === "Completed" && (
                        <div className="detail-item"><span>Underwriting Completion Date</span><strong>{formatDate(candidate.underwritingCompletionDate) || "Not set"}</strong></div>
                      )}
                    </>
                  )}
                  {candidate.workflowStage === "KYC Complete" && (
                    <>
                      <div className="detail-item"><span>Stage Status</span><strong>{candidate.stageStatus || "Pending"}</strong></div>
                      {candidate.stageStatus === "Completed" && (
                        <div className="detail-item"><span>KYC Completed Date</span><strong>{formatDate(candidate.kycCompletedDate) || "Not set"}</strong></div>
                      )}
                    </>
                  )}
                  {candidate.workflowStage === "Proposal Submitted" && candidate.proposalAttachment?.fileName && (
                    <div className="detail-item">
                      <span>Proposal Attachment</span>
                      <strong>
                        <a href={candidate.proposalAttachment.fileURL} target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>
                          {candidate.proposalAttachment.fileName}
                        </a>
                      </strong>
                    </div>
                  )}
                </div>

                <div>
                  <h3>Policy Details</h3>
                  <div className="detail-item"><span>Policy Number</span><strong>{candidate.policyNumber || "Not issued"}</strong></div>
                  <div className="detail-item"><span>Policy Interest</span><strong>{candidate.policyInterest || "Not specified"}</strong></div>
                  <div className="detail-item"><span>Notes</span><strong>{candidate.notes || "No notes provided."}</strong></div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <h3>Lead Information</h3>
                  <div className="detail-item"><span>Lead ID</span><strong>{candidate.leadId || candidate.id}</strong></div>
                  <div className="detail-item"><span>Name</span><strong>{candidate.name}</strong></div>
                  <div className="detail-item"><span>Lead Type</span><strong>{candidate.leadType}</strong></div>
                  <div className="detail-item"><span>Mobile</span><strong>{candidate.phone}</strong></div>
                  <div className="detail-item"><span>Email</span><strong>{candidate.email}</strong></div>
                  <div className="detail-item"><span>City</span><strong>{candidate.city}</strong></div>
                  <div className="detail-item"><span>Lead Source</span><strong>{candidate.leadSource || candidate.source || "Not specified"}</strong></div>
                </div>

                <div>
                  <h3>Current Status</h3>
                  <div className="detail-item">
                    <span>{isAdvisorLead ? "Recruitment Stage" : "Workflow Stage"}</span>
                    <StageSelect
                      stage={candidate.workflowStage}
                      leadType={candidate.leadType}
                      onChange={(stage) => updateCandidateStage(candidate.id, stage)}
                      clientFlow={isActiveClient}
                    />
                  </div>
                  <div className="detail-item"><span>Lead Status</span><strong>{candidate.leadStatus}</strong></div>
                  {isAdvisorLead && (
                    <div className="detail-item"><span>Assigned To</span><strong>{candidate.assignedAdvisorName || candidate.assignedTo || "Unassigned"}</strong></div>
                  )}
                  <div className="detail-item"><span>Priority</span><strong>{candidate.priority || candidate.followUp?.priority || "Medium"}</strong></div>
                  <div className="detail-item"><span>Due Date</span><strong>{formatDate(candidate.dueDate) || "Not set"}</strong></div>
                  <div className="detail-item"><span>Next Follow-up</span><strong>{formatDate(candidate.nextFollowUp || candidate.followUpDate)}</strong></div>
                  {!isAdvisorLead && (
                    <>
                      <div className="detail-item">
                        <span>Policy Status</span>
                        <strong>{candidate.policyIssued === "Yes" ? "Issued ✅" : "Pending"}</strong>
                      </div>
                      <div className="detail-item">
                        <span>Premium</span>
                        <strong>{candidate.premiumCollected === "Yes" ? "Collected" : "Pending"}</strong>
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <h3>Business Details</h3>
                  <div className="detail-item"><span>Advisor Name</span><strong>{candidate.advisorName || "Not applicable"}</strong></div>
                  <div className="detail-item"><span>Policy Interest</span><strong>{candidate.policyInterest || "Not applicable"}</strong></div>
                  <div className="detail-item"><span>Notes</span><strong>{candidate.notes || "No notes provided."}</strong></div>
                </div>

                {!isAdvisorLead && candidate.policyIssued === "Yes" && (
                  <div>
                    <h3>Policy Details</h3>
                    <div className="detail-item"><span>Policy Number</span><strong>{candidate.policyNumber || "Not Available"}</strong></div>
                    <div className="detail-item"><span>Insurance Company</span><strong>{candidate.insuranceCompany || "Not Available"}</strong></div>
                    <div className="detail-item"><span>Policy Type</span><strong>{candidate.policyType || "Not Available"}</strong></div>
                    <div className="detail-item"><span>Policy Start Date</span><strong>{candidate.policyStartDate || "Not Available"}</strong></div>
                    <div className="detail-item"><span>Policy End Date</span><strong>{candidate.policyEndDate || "Not Available"}</strong></div>
                    <div className="detail-item"><span>Premium Frequency</span><strong>{candidate.premiumFrequency || "Not Available"}</strong></div>
                    <div className="detail-item"><span>Sum Assured</span><strong>{candidate.sumAssured || "Not Available"}</strong></div>
                    <div className="detail-item"><span>Nominee Name</span><strong>{candidate.nomineeName || "Not Available"}</strong></div>
                    <div className="detail-item"><span>Remarks</span><strong>{candidate.policyRemarks || "Not Available"}</strong></div>
                  </div>
                )}

                {!isAdvisorLead && candidate.premiumCollected === "Yes" && (
                  <div>
                    <h3>Premium Details</h3>
                    <div className="detail-item"><span>Premium Amount</span><strong>{candidate.premiumAmount || "Not Available"}</strong></div>
                    <div className="detail-item"><span>Collection Date</span><strong>{candidate.collectionDate || "Not Available"}</strong></div>
                    <div className="detail-item"><span>Payment Mode</span><strong>{candidate.paymentMode || "Not Available"}</strong></div>
                    <div className="detail-item"><span>Transaction ID</span><strong>{candidate.transactionReference || "Not Available"}</strong></div>
                    <div className="detail-item"><span>Receipt Number</span><strong>{candidate.receiptNumber || "Not Available"}</strong></div>
                    <div className="detail-item"><span>Collected By</span><strong>{candidate.collectedBy || "Not Available"}</strong></div>
                    <div className="detail-item"><span>Remarks</span><strong>{candidate.premiumRemarks || "Not Available"}</strong></div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === "Timeline" && (
        <div className="card">
          <h3>Timeline</h3>
          {(candidate.timeline || []).length > 0 ? (
            <div className="timeline">
              {candidate.timeline.map((item, index) => (
                <div key={`${item.stage}-${index}`} className="timeline-step">
                  <span>{item.stage}</span>
                  <p>{item.date}</p>
                </div>
              ))}
            </div>
          ) : (
            <p>No timeline entries available.</p>
          )}
        </div>
      )}

      {activeTab === "Activities" && (
        <div className="card">
          <h3>Activities</h3>
          {(candidate.activities || []).length > 0 ? (
            <div className="activity-list">
              {candidate.activities.map((activity, index) => (
                <div key={`${activity.type}-${index}`} className="activity-item">
                  <div className="activity-dot" style={{ background: "#2563eb" }} />
                  <div>
                    <strong>{activity.type}</strong>
                    <p>{activity.text}</p>
                  </div>
                  <span>{activity.date}</span>
                </div>
              ))}
            </div>
          ) : (
            <p>No activity records found.</p>
          )}
        </div>
      )}

      {activeTab === "Documents" && recordType === "insurance_customer_lead" && (
        <div className="card">
          <h3>Documents</h3>

          {uploadedDocument ? (
            <Card variant="outlined" sx={{ borderColor: "success.main", bgcolor: "success.50" }}>
              <CardContent>
                <Stack spacing={2}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="h6" color="success.main">✅ Successfully Uploaded</Typography>
                  </Box>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between">
                    <Box>
                      <Typography variant="body2" color="text.secondary">Document Type</Typography>
                      <Typography variant="subtitle1" fontWeight={600}>{uploadedDocument.type}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">File Name</Typography>
                      <Typography variant="subtitle1" fontWeight={600}>{uploadedDocument.fileName}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Upload Date & Time</Typography>
                      <Typography variant="subtitle1" fontWeight={600}>{uploadedDocument.uploadedAt}</Typography>
                    </Box>
                  </Stack>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Uploaded By</Typography>
                      <Typography variant="subtitle1" fontWeight={600}>{uploadedDocument.uploadedBy}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Status</Typography>
                      <Typography variant="subtitle1" fontWeight={600} color="success.main">{uploadedDocument.status}</Typography>
                    </Box>
                  </Stack>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                    <Button variant="outlined" size="small">View</Button>
                    <Button variant="outlined" size="small" onClick={handleReplaceDocument}>Replace</Button>
                    <Button variant="outlined" color="error" size="small" onClick={handleDeleteDocument}>Delete</Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ) : (
            <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderStyle: "dashed", borderColor: "grey.400", bgcolor: "grey.50" }}>
              <Stack spacing={2}>
                <FormControl fullWidth size="small">
                  <InputLabel id="document-type-label">Select Document Type</InputLabel>
                  <Select
                    labelId="document-type-label"
                    value={documentType}
                    label="Select Document Type"
                    onChange={(event) => setDocumentType(event.target.value)}
                  >
                    {availableDocumentTypes.map((type) => (
                      <MenuItem key={type} value={type}>{type}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {documentType && (
                  <Stack spacing={2}>
                    <Button component="label" variant="outlined" fullWidth>
                      Choose File
                      <input hidden type="file" onChange={handleFileSelection} />
                    </Button>

                    {selectedFile ? (
                      <Alert severity="info">Selected file: {selectedFile.name}</Alert>
                    ) : (
                      <Typography variant="body2" color="text.secondary">Choose a file to begin the upload process.</Typography>
                    )}

                    <Button variant="contained" onClick={handleUploadDocument} disabled={!selectedFile || uploading}>
                      Upload
                    </Button>

                    {uploading && (
                      <Box>
                        <LinearProgress variant="determinate" value={uploadProgress} />
                        <Typography variant="caption" color="text.secondary">Uploading document... {uploadProgress}%</Typography>
                      </Box>
                    )}
                  </Stack>
                )}
              </Stack>
            </Paper>
          )}

          {(documents || []).length > 0 && (
            <Box mt={2}>
              <Typography variant="subtitle2" gutterBottom>Existing Documents</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {documents.map((doc, index) => (
                  <Chip key={`${doc}-${index}`} label={doc} variant="outlined" />
                ))}
              </Stack>
            </Box>
          )}
        </div>
      )}

      {activeTab === "Communication" && (
        <div className="card">
          <h3>Communication</h3>
          {(communications || []).length > 0 ? (
            <div className="activity-list">
              {communications.map((comm, index) => (
                <div key={`${comm.type}-${index}`} className="activity-item">
                  <div className="activity-dot" style={{ background: "#10b981" }} />
                  <div>
                    <strong>{comm.type}</strong>
                    <p>{comm.remarks}</p>
                  </div>
                  <span>{comm.date || "—"}</span>
                </div>
              ))}
            </div>
          ) : (
            <p>No communication entries available.</p>
          )}
          <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
            <label>
              <span>Type</span>
              <select value={newComm.type} onChange={(e) => setNewComm((prev) => ({ ...prev, type: e.target.value }))}>
                <option>Call</option>
                <option>WhatsApp</option>
                <option>Email</option>
                <option>SMS</option>
                <option>Meeting</option>
              </select>
            </label>
            <label>
              <span>Date</span>
              <input type="date" value={newComm.date} onChange={(e) => setNewComm((prev) => ({ ...prev, date: e.target.value }))} />
            </label>
            <label>
              <span>Remarks</span>
              <textarea value={newComm.remarks} onChange={(e) => setNewComm((prev) => ({ ...prev, remarks: e.target.value }))} />
            </label>
            <button className="button primary" onClick={handleAddCommunication}>Save Communication</button>
          </div>
        </div>
      )}

      {activeTab === "Tasks" && recordType === "insurance_customer_lead" && (
        <div className="card">
          <h3>Tasks</h3>
          {(tasks || []).length > 0 ? (
            <div className="activity-list">
              {tasks.map((task) => (
                <div key={task.id} className="activity-item">
                  <div className="activity-dot" style={{ background: "#f59e0b" }} />
                  <div>
                    <strong>{task.title}</strong>
                    <p>{task.assignedTo} • Due {task.dueDate}</p>
                  </div>
                  <span>{task.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <p>No tasks found.</p>
          )}
          <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
            <label>
              <span>Title</span>
              <input value={newTask.title} onChange={(e) => setNewTask((prev) => ({ ...prev, title: e.target.value }))} />
            </label>
            <label>
              <span>Assigned To</span>
              <input value={newTask.assignedTo} onChange={(e) => setNewTask((prev) => ({ ...prev, assignedTo: e.target.value }))} />
            </label>
            <label>
              <span>Due Date</span>
              <input type="date" value={newTask.dueDate} onChange={(e) => setNewTask((prev) => ({ ...prev, dueDate: e.target.value }))} />
            </label>
            <label>
              <span>Priority</span>
              <select value={newTask.priority} onChange={(e) => setNewTask((prev) => ({ ...prev, priority: e.target.value }))}>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </label>
            <button className="button primary" onClick={handleAddTask}>Add Task</button>
          </div>
        </div>
      )}

      {activeTab === "Notes" && (
        <div className="card">
          <h3>Notes</h3>
          <textarea
            className="details-notes"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add or update notes for this candidate"
          />
          <button className="primary" onClick={handleSaveNote}>Save Notes</button>
        </div>
      )}

      {activeTab === "History" && (
        <div className="card">
          <h3>Assignment History</h3>
          {(candidate.timeline || []).length > 0 ? (
            <div className="activity-list">
              {candidate.timeline.map((item, index) => (
                <div key={`${item.stage}-hist-${index}`} className="activity-item">
                  <div className="activity-dot" style={{ background: "#64748b" }} />
                  <div>
                    <strong>{item.stage}</strong>
                    <p>{item.date}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No history available.</p>
          )}
        </div>
      )}

      {activeTab === "Conversion" && recordType === "insurance_customer_lead" && (
        <div className="card">
          <h3>Conversion Journey</h3>
          {(candidate.timeline || []).length > 0 ? (
            <div className="timeline">
              {candidate.timeline.map((item, index) => (
                <div key={`${item.stage}-conv-${index}`} className="timeline-step">
                  <span>{item.stage}</span>
                </div>
              ))}
            </div>
          ) : (
            <p>No conversion history found.</p>
          )}
        </div>
      )}

      {activeTab === "Recruitment Journey" && (
        <div className="card">
          <h3>Recruitment Journey</h3>
          <div className="timeline">
            {[...advisorWorkflowStages, "Dropped"].map((stage) => {
              const stageTimeline = (candidate.timeline || []).find((t) => t.stage === stage);
              const isCurrentStage = candidate.workflowStage === stage;
              const isPastStage = (() => {
                const currentIdx = advisorWorkflowStages.indexOf(candidate.workflowStage);
                const stageIdx = advisorWorkflowStages.indexOf(stage);
                return currentIdx > stageIdx;
              })();
              return (
                <div key={stage} className="timeline-step" style={{ opacity: isPastStage || isCurrentStage ? 1 : 0.45 }}>
                  <span style={{ fontWeight: isCurrentStage ? 700 : 400 }}>{stage}</span>
                  {stageTimeline && <p>{stageTimeline.date}</p>}
                  {isCurrentStage && <p style={{ color: "#2563eb", fontWeight: 600 }}>Current</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "Recruitment Activities" && (
        <div className="card">
          <h3>Recruitment Activities</h3>
          {(candidate.activities || []).length > 0 ? (
            <div className="activity-list">
              {candidate.activities.map((activity, index) => (
                <div key={`${activity.type}-${index}`} className="activity-item">
                  <div className="activity-dot" style={{ background: "#2563eb" }} />
                  <div>
                    <strong>{activity.type}</strong>
                    <p>{activity.text}</p>
                  </div>
                  <span>{activity.date}</span>
                </div>
              ))}
            </div>
          ) : (
            <p>No recruitment activities recorded.</p>
          )}
        </div>
      )}

      {activeTab === "Onboarding Documents" && (
        <div className="card">
          <h3>Onboarding Documents</h3>
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {["Aadhaar", "PAN", "Bank Details", "Educational Certificates", "Passport Photo", "Address Proof", "Cancelled Cheque", "NAAF Form"].map((doc) => {
              const docData = onboardingDocs[doc] || { status: "Pending" };
              const isUploaded = docData.status === "Submitted" || docData.status === "Verified";
              const statusColor = docData.status === "Verified" ? "#16a34a" : docData.status === "Submitted" ? "#2563eb" : docData.status === "Rejected" ? "#dc2626" : "#64748b";
              return (
                <div key={doc} className="activity-item" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
                  <div className="activity-dot" style={{ background: statusColor }} />
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <strong>{doc}</strong>
                    {isUploaded && docData.uploadDate && (
                      <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>
                        Uploaded: {docData.uploadDate} by {docData.uploadedBy}
                      </p>
                    )}
                  </div>
                  <span style={{ color: statusColor, fontWeight: 600, marginRight: 8 }}>{docData.status}</span>
                  <Stack direction="row" spacing={1} useFlexGap>
                    {!isUploaded ? (
                      <>
                        <Button size="small" variant="contained" onClick={() => { setOnboardUploadTarget(doc); setOnboardFile(null); setOnboardFileError(""); }}>
                          Upload
                        </Button>
                        <Button size="small" variant="outlined" disabled>
                          View
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="small" variant="contained" onClick={() => { setOnboardUploadTarget(doc); setOnboardFile(null); setOnboardFileError(""); }}>
                          Replace
                        </Button>
                        <Button size="small" variant="outlined" onClick={() => setViewingDoc(doc)}>
                          View
                        </Button>
                        <Button size="small" variant="outlined" color="error" onClick={() => setDeletingDoc(doc)}>
                          Remove
                        </Button>
                      </>
                    )}
                  </Stack>
                </div>
              );
            })}
          </div>

          {onboardUploadTarget && (
            <div className="modal-backdrop" onClick={() => { setOnboardUploadTarget(null); setOnboardFile(null); setOnboardFileError(""); }}>
              <div className="modal-content" style={{ maxWidth: "480px", padding: "1.5rem" }} onClick={(e) => e.stopPropagation()}>
                <h3 style={{ margin: "0 0 0.5rem" }}>
                  {onboardingDocs[onboardUploadTarget] ? "Replace" : "Upload"} {onboardUploadTarget}
                </h3>
                <Button component="label" variant="outlined" fullWidth sx={{ mb: 1 }}>
                  Choose File
                  <input hidden type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleOnboardFileChange} />
                </Button>
                {onboardFileError && <Alert severity="error" sx={{ mb: 1 }}>{onboardFileError}</Alert>}
                {onboardFile && <Alert severity="info" sx={{ mb: 1 }}>{onboardFile.name}</Alert>}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
                  <button className="button secondary" onClick={() => { setOnboardUploadTarget(null); setOnboardFile(null); setOnboardFileError(""); }}>Cancel</button>
                  <button className="button primary" disabled={!onboardFile || onboardUploading} onClick={handleOnboardUpload}>
                    {onboardUploading ? "Uploading..." : "Upload"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {viewingDoc && onboardingDocs[viewingDoc] && (
            <div className="modal-backdrop" onClick={() => setViewingDoc(null)}>
              <div className="modal-content" style={{ maxWidth: "700px", padding: "1.5rem" }} onClick={(e) => e.stopPropagation()}>
                <h3 style={{ margin: "0 0 0.5rem" }}>{viewingDoc}</h3>
                <p style={{ margin: "0 0 1rem", color: "#475569" }}>{onboardingDocs[viewingDoc].fileName}</p>
                {onboardingDocs[viewingDoc].fileURL?.startsWith("data:image") ? (
                  <img src={onboardingDocs[viewingDoc].fileURL} alt={viewingDoc} style={{ maxWidth: "100%", maxHeight: "500px", display: "block", margin: "0 auto" }} />
                ) : onboardingDocs[viewingDoc].fileURL?.startsWith("data:application/pdf") ? (
                  <iframe src={onboardingDocs[viewingDoc].fileURL} style={{ width: "100%", height: "500px", border: "1px solid #e2e8f0" }} title={viewingDoc} />
                ) : (
                  <p>No preview available.</p>
                )}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
                  <button className="button secondary" onClick={() => setViewingDoc(null)}>Close</button>
                </div>
              </div>
            </div>
          )}

          {deletingDoc && (
            <div className="modal-backdrop" onClick={() => setDeletingDoc(null)}>
              <div className="modal-content" style={{ maxWidth: "420px", padding: "1.5rem" }} onClick={(e) => e.stopPropagation()}>
                <h3 style={{ margin: "0 0 0.5rem" }}>Remove Document</h3>
                <p style={{ margin: "0 0 1.5rem", color: "#475569" }}>
                  Are you sure you want to remove <strong>{deletingDoc}</strong>? The status will reset to Pending.
                </p>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                  <button className="button secondary" onClick={() => setDeletingDoc(null)}>Cancel</button>
                  <button className="button secondary" style={{ color: "#dc2626", borderColor: "#dc2626" }} onClick={handleOnboardConfirmDelete}>Remove</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "Recruitment Communication" && (
        <div className="card">
          <h3>Recruitment Communication</h3>
          {(communications || []).length > 0 ? (
            <div className="activity-list">
              {communications.map((comm, index) => (
                <div key={`${comm.type}-${index}`} className="activity-item">
                  <div className="activity-dot" style={{ background: "#10b981" }} />
                  <div>
                    <strong>{comm.type}</strong>
                    <p>{comm.remarks}</p>
                  </div>
                  <span>{comm.date || "\u2014"}</span>
                </div>
              ))}
            </div>
          ) : (
            <p>No recruitment communication entries.</p>
          )}
          <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
            <label>
              <span>Type</span>
              <select value={newComm.type} onChange={(e) => setNewComm((prev) => ({ ...prev, type: e.target.value }))}>
                <option>Call</option>
                <option>Email</option>
                <option>SMS</option>
                <option>WhatsApp</option>
                <option>Interview Notification</option>
                <option>Training Notification</option>
                <option>Exam Notification</option>
              </select>
            </label>
            <label>
              <span>Date</span>
              <input type="date" value={newComm.date} onChange={(e) => setNewComm((prev) => ({ ...prev, date: e.target.value }))} />
            </label>
            <label>
              <span>Remarks</span>
              <textarea value={newComm.remarks} onChange={(e) => setNewComm((prev) => ({ ...prev, remarks: e.target.value }))} />
            </label>
            <button className="button primary" onClick={handleAddCommunication}>Save Communication</button>
          </div>
        </div>
      )}

      {activeTab === "Training & Exam" && (
        <div className="card">
          <h3>Training &amp; Exam</h3>
          <div className="detail-grid">
            <div>
              <h3>Training</h3>
              <div className="detail-item">
                <span>Status</span>
                <strong>{candidate.trainingStatus || "Pending"}</strong>
              </div>
              <div className="detail-item">
                <span>Training Date</span>
                <strong>{formatDate(candidate.trainingDate) || "Not scheduled"}</strong>
              </div>
              <div className="detail-item">
                <span>Completion Date</span>
                <strong>{formatDate(candidate.trainingCompletionDate) || "Not completed"}</strong>
              </div>
            </div>
            <div>
              <h3>Exam</h3>
              <div className="detail-item">
                <span>Status</span>
                <strong>{candidate.examStatus || "Pending"}</strong>
              </div>
              <div className="detail-item">
                <span>Exam Date</span>
                <strong>{formatDate(candidate.examDate) || "Not scheduled"}</strong>
              </div>
              <div className="detail-item">
                <span>Exam Score</span>
                <strong>{candidate.examResult || "Not available"}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "Recruitment Notes" && (
        <div className="card">
          <h3>Recruitment Notes</h3>
          <textarea
            className="details-notes"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add or update recruitment notes"
          />
          <button className="primary" onClick={handleSaveNote}>Save Notes</button>
        </div>
      )}

      {activeTab === "Recruitment History" && (
        <div className="card">
          <h3>Recruitment History</h3>
          {(candidate.timeline || []).length > 0 ? (
            <div className="activity-list">
              {candidate.timeline.map((item, index) => (
                <div key={`${item.stage}-recruit-hist-${index}`} className="activity-item">
                  <div className="activity-dot" style={{ background: "#64748b" }} />
                  <div>
                    <strong>{item.stage}</strong>
                    <p>{item.date}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No recruitment history available.</p>
          )}
        </div>
      )}

      {activeTab === "Activation" && (
        <div className="card">
          <h3>Activation</h3>
          <div className="detail-grid">
            <div>
              <h3>Activation Details</h3>
              <div className="detail-item">
                <span>Advisor Code</span>
                <strong>{candidate.advisorCode || "Not generated"}</strong>
              </div>
              <div className="detail-item">
                <span>Code Generation Date</span>
                <strong>{formatDate(candidate.codeGenerationDate) || "Not generated"}</strong>
              </div>
              <div className="detail-item">
                <span>Activation Date</span>
                <strong>{formatDate(candidate.activationDate) || "Not activated"}</strong>
              </div>
              <div className="detail-item">
                <span>Reporting Manager</span>
                <strong>{candidate.reportingManager || "Not assigned"}</strong>
              </div>
              <div className="detail-item">
                <span>Branch</span>
                <strong>{candidate.branch || "Not specified"}</strong>
              </div>
              <div className="detail-item">
                <span>Current Status</span>
                <strong>{candidate.leadStatus || "Open"}</strong>
              </div>
            </div>
            {candidate.leadStatus === "Lost" && (
              <div>
                <h3>Dropped</h3>
                <div className="detail-item">
                  <span>Drop Reason</span>
                  <strong>{candidate.dropReason || "Not specified"}</strong>
                </div>
                <div className="detail-item">
                  <span>Drop Date</span>
                  <strong>{formatDate(candidate.dropDate) || "Not specified"}</strong>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {editOpen && (
        <CandidateModal
          candidate={candidate}
          stageOptions={recordType === "insurance_customer_lead" ? undefined : []}
          stageColors={{}}
          onClose={() => setEditOpen(false)}
          onSave={async (id, payload) => {
            if (!canEditClient(candidate) && !(recordType === "client" && isRejectedState && isOwnClientRecord)) return;
            if (recordType === "client" && isAdvisor) {
              if (isRejectedState) {
                await resubmitClientRequest(id, payload);
              } else {
                await submitClientEdit(id, payload);
              }
            } else {
              updateCandidate(id, payload);
            }
            setEditOpen(false);
          }}
        />
      )}

      {deleteConfirmOpen && (
        <div className="modal-backdrop" onClick={() => setDeleteConfirmOpen(false)}>
          <div className="modal-content" style={{ maxWidth: "420px", padding: "1.5rem" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 0.5rem" }}>Delete Record</h3>
            <p style={{ margin: "0 0 1.5rem", color: "#475569" }}>
              Are you sure you want to delete <strong>{candidate.name}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button className="button secondary" onClick={() => setDeleteConfirmOpen(false)}>Cancel</button>
              <button
                className="button secondary"
                style={{ color: "#dc2626", borderColor: "#dc2626" }}
                onClick={async () => {
                  if (!canDeleteClient(candidate)) return;
                  if (recordType === "client" && isAdvisor) {
                    await submitClientDelete(candidate.id);
                    setDeleteConfirmOpen(false);
                  } else {
                    await deleteCandidate(candidate.id);
                    setDeleteConfirmOpen(false);
                    navigate(-1);
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CandidateDetails;