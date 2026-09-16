import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useCrm } from "../crmContext.jsx";
import { useAuth } from "../authContext.jsx";

const allNavItems = [
  { label: "Dashboard", to: "/adviser/dashboard" },
  { label: "Lead Management", to: "/adviser/lead-management" },
  { label: "Advisor Operations", to: "/adviser/advisor-operations" },
  { label: "Client Operations", to: "/adviser/client-operations" },
  { label: "Business Intelligence", to: "/adviser/business-intelligence" },
  { label: "Administration", to: "/adviser/administration" }
];

const ADVISOR_NAV_ITEMS = [
  { label: "Dashboard", to: "/adviser/dashboard" },
  { label: "Lead Management", to: "/adviser/lead-management" },
  { label: "Client Operations", to: "/adviser/client-operations" },
];

function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { candidates, clients } = useCrm();
  const { currentUser, isAdmin, isAdvisor, canViewModule, logout } = useAuth();
  const [search, setSearch] = useState("");

  const navItems = useMemo(() => {
    if (isAdvisor) return ADVISOR_NAV_ITEMS;
    return allNavItems.filter((item) => canViewModule(item.to));
  }, [isAdvisor, canViewModule]);

  const notifications = useMemo(() => {
    const alertItems = [];
    const visibleCandidates = isAdvisor
      ? candidates.filter((c) => String(c.assignedAdvisorId || "") === String(currentUser?.id || ""))
      : candidates;
    visibleCandidates.forEach((candidate) => {
      if (candidate.nextFollowUp || candidate.followUpDate) {
        const due = new Date(candidate.nextFollowUp || candidate.followUpDate);
        const today = new Date();
        const sameDay = due.toDateString() === today.toDateString();
        if (sameDay) alertItems.push({ id: candidate.id, message: `Follow-up Due Today • ${candidate.name}` });
      }
      if (candidate.workflowStage === "Training") alertItems.push({ id: `${candidate.id}-training`, message: `Training Pending • ${candidate.name}` });
      if (candidate.workflowStage === "Exam") alertItems.push({ id: `${candidate.id}-exam`, message: `Exam Scheduled Today • ${candidate.name}` });
      if (candidate.documents?.length === 0) alertItems.push({ id: `${candidate.id}-docs`, message: `Documents Pending • ${candidate.name}` });
    });
    return alertItems.slice(0, 5);
  }, [candidates, isAdvisor, currentUser]);

  const handleSearch = (event) => {
    const value = event.target.value;
    setSearch(value);
    if (value.trim().length > 2) {
      const q = value.toLowerCase();

      if (!isAdvisor) {
        const candidateMatch = candidates.find((candidate) => {
          const fields = [
            String(candidate.id),
            candidate.leadId,
            candidate.name,
            candidate.mobile,
            candidate.phone,
            candidate.email,
            candidate.city,
            candidate.assignedTo,
            candidate.leadSource,
            candidate.advisorCode,
          ];
          return fields.some((field) => field?.toLowerCase().includes(q));
        });

        if (candidateMatch) {
          navigate(`/adviser/profile/${candidateMatch.id}`);
          return;
        }
      }

      const advisorClients = isAdvisor
        ? (clients || []).filter((c) => String(c.assignedAdvisorId || "") === String(currentUser?.id || ""))
        : (clients || []);

      const clientMatch = advisorClients.find((client) => {
        const fields = [
          String(client.id),
          client.clientId,
          client.name,
          client.mobile,
          client.city,
          client.advisorAssigned,
          client.policyNumber,
          client.advisorName,
        ];
        return fields.some((field) => field?.toLowerCase().includes(q));
      });

      if (clientMatch) {
        navigate(`/adviser/profile/${clientMatch.candidateId}`);
        return;
      }

      if (!isAdvisor) {
        const policyMatch = (clients || []).flatMap((client) => (client.policies || []).map((policy) => ({ ...policy, clientName: client.name, advisor: client.advisorAssigned })) ).find((policy) => {
          const fields = [policy.policyNumber, policy.clientName, policy.advisor, policy.policyType];
          return fields.some((field) => field?.toLowerCase().includes(q));
        });

        if (policyMatch) {
          navigate(`/adviser/client-operations/policies`);
        }
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div>
          <h2>RupeeVyze Insurance CRM</h2>
        </div>

        <nav>
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={location.pathname.startsWith(item.to) ? "active" : ""}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="content">
        <div className="topbar">
          <input className="topbar-search" type="text" value={search} onChange={handleSearch} placeholder="Search Lead/Advisor/Client ID, Name, Mobile, Advisor Code" />
          <div className="topbar-actions">
            <div className="notification-chip">🔔 {notifications.length}</div>
            <div className="topbar-user" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span>{currentUser?.name} ({currentUser?.role})</span>
              <button
                onClick={handleLogout}
                style={{
                  background: "none",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  padding: "4px 10px",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  color: "#64748b",
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}

export default Layout;
