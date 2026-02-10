import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useAuth } from "app/AuthContext";
import toast, { Toaster } from "react-hot-toast";
import {
  Shield,
  ShieldAlert,
  Power,
  UserPlus,
  UserMinus,
  Gift,
  RefreshCw,
  Terminal,
  Cpu,
  Server,
  Lock,
} from "lucide-react";
import "./AdminSettingsPage.css";

// --- Components ---

function GrantFreeSubscriptionForm() {
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGrant = async (e) => {
    e.preventDefault();
    if (!userId || Number.isNaN(userId)) {
      toast.error("Please enter a valid user ID");
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/admin/grant-free-subscription`,
        { userId: parseInt(userId, 10) }
      );
      toast.success(response.data.message || "Free subscription granted");
      setUserId("");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to grant free subscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel-card grant-sub-panel">
      <div className="panel-header">
        <Gift size={20} className="panel-icon icon-purple" />
        <h3>Grant Access</h3>
      </div>
      <p className="panel-description">Provide complimentary premium access to a user.</p>

      <form className="cmd-form" onSubmit={handleGrant}>
        <div className="input-group">
          <span className="input-prefix">ID:</span>
          <input
            className="cmd-input"
            type="number"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="0000"
            min="1"
            disabled={loading}
          />
        </div>
        <button className="cmd-btn btn-primary" type="submit" disabled={loading}>
          {loading ? "PROCESSING..." : "EXECUTE GRANT"}
        </button>
      </form>
    </div>
  );
}

const AdminSettingsPage = () => {
  const [newAdminId, setNewAdminId] = useState("");
  const [isAddingAdmin, setIsAddingAdmin] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [adminActivity, setAdminActivity] = useState([]);
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isActivityLoading, setIsActivityLoading] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [error, setError] = useState(null);

  // Refs for scrolling to bottom of logs if needed, but we'll stick to top-newest
  const activityEndRef = useRef(null);

  useEffect(() => {
    const userObj = JSON.parse(localStorage.getItem("user"));
    if (userObj?.token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${userObj.token}`;
      axios.defaults.baseURL = `${import.meta.env.VITE_API_URL}`;
    }
    fetchAdminActivities();
  }, []);

  // Poll for activities every 30 seconds for that "live" feel
  useEffect(() => {
    const interval = setInterval(fetchAdminActivities, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatActivity = (activity) => ({
    id: activity.activity_id || activity.id,
    type: activity.action_type || activity.type,
    description: activity.action_description || activity.description,
    created_at: activity.created_at,
    is_course_activity: activity.is_course_activity || false,
  });

  const fetchAdminActivities = async () => {
    setIsActivityLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/activities`);
      if (Array.isArray(response.data)) {
        setAdminActivity(response.data.map(formatActivity));
      } else {
        setAdminActivity([]);
      }
    } catch (err) {
      console.error("Error fetching admin activities:", err);
    } finally {
      setIsActivityLoading(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.userId) return;

    const checkAdminStatus = async () => {
      try {
        const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/admin/status`);
        if (!data.isAdmin) {
          setError("ACCESS DENIED: INSUFFICIENT PRIVILEGES");
          return false;
        }
        return true;
      } catch {
        setError("CONNECTION FAILURE: UNABLE TO VERIFY CREDENTIALS");
        return false;
      }
    };

    const loadData = async () => {
      const isAdmin = await checkAdminStatus();
      if (isAdmin) {
        await fetchSystemSettings();
      }
    };
    loadData();
  }, [user?.userId]);

  const fetchSystemSettings = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/system-settings`);
      setMaintenanceMode(!!response.data.maintenanceMode);
    } catch {
      console.error("Failed to fetch settings");
    }
  };

  const handleAdminAction = async (e) => {
    e.preventDefault();
    if (!newAdminId || Number.isNaN(newAdminId)) {
      toast.error("INVALID INPUT: USER ID REQUIRED");
      return;
    }

    const action = isAddingAdmin ? "add" : "remove";
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/admin/${action}-admin`, {
        userId: parseInt(newAdminId, 10),
      });
      toast.success(response.data.message.toUpperCase());
      setNewAdminId("");
    } catch (err) {
      toast.error(err.response?.data?.error || `FAILED TO ${action.toUpperCase()} ADMIN`);
    }
  };

  const handleMaintenanceToggle = async () => {
    try {
      const newState = !maintenanceMode;
      await axios.post(`${import.meta.env.VITE_API_URL}/admin/maintenance-mode`, {
        enabled: newState,
      });
      setMaintenanceMode(newState);
      toast.success(`SYSTEM STATUS: ${newState ? "MAINTENANCE" : "OPERATIONAL"}`);
    } catch {
      toast.error("FAILED TO UPDATE SYSTEM STATUS");
      fetchSystemSettings(); // Revert to server state
    }
  };

  if (error) {
    return (
      <div className="admin-lockout">
        <ShieldAlert size={64} color="#ef4444" />
        <h1>{error}</h1>
        <p>Terminal connection terminated.</p>
      </div>
    );
  }

  return (
    <div className="admin-console">
      <Toaster
        toastOptions={{
          className: "cmd-toast",
          style: {
            background: "#1a1f2e",
            color: "#fff",
            border: "1px solid #3b82f6",
            fontFamily: "monospace",
          },
        }}
      />

      {/* Header Bar */}
      <header className="console-header">
        <div className="header-brand">
          <Shield size={24} className="brand-icon" />
          <div className="brand-text">
            <h1>ADMIN.CONSOLE</h1>
            <span className="version">v2.4.0-RC</span>
          </div>
        </div>
        <div className="header-status">
          <div className={`status-indicator ${maintenanceMode ? "warning" : "active"}`}>
            <span className="dot"></span>
            {maintenanceMode ? "MAINTENANCE MODE" : "SYSTEM OPERATIONAL"}
          </div>
          <div className="user-badge">
            <span className="user-role">ROOT_ACCESS</span>
            <span className="user-id">ID: {user?.userId || "UNKNOWN"}</span>
          </div>
        </div>
      </header>

      {/* Main Grid Layout */}
      <main className="console-grid">
        {/* Left Column: Controls */}
        <div className="console-column left-col">
          {/* Admin Management Panel */}
          <section className="panel-card admin-manage-panel">
            <div className="panel-header">
              <Lock size={20} className="panel-icon icon-blue" />
              <h3>Privilege Control</h3>
            </div>

            <form className="cmd-form" onSubmit={handleAdminAction}>
              <div className="toggle-group">
                <button
                  type="button"
                  className={`toggle-btn ${isAddingAdmin ? "active" : ""}`}
                  onClick={() => setIsAddingAdmin(true)}
                >
                  <UserPlus size={16} /> ADD
                </button>
                <button
                  type="button"
                  className={`toggle-btn ${!isAddingAdmin ? "active" : ""}`}
                  onClick={() => setIsAddingAdmin(false)}
                >
                  <UserMinus size={16} /> REVOKE
                </button>
              </div>

              <div className="input-group">
                <span className="input-prefix">TARGET_ID:</span>
                <input
                  className="cmd-input"
                  type="number"
                  value={newAdminId}
                  onChange={(e) => setNewAdminId(e.target.value)}
                  placeholder="0000"
                  min="1"
                />
              </div>

              <button className={`cmd-btn ${isAddingAdmin ? "btn-blue" : "btn-red"}`} type="submit">
                {isAddingAdmin ? "GRANT PRIVILEGES" : "REVOKE ACCESS"}
              </button>
            </form>
          </section>

          {/* Subscription Panel */}
          <GrantFreeSubscriptionForm />

          {/* System Control Panel */}
          <section className="panel-card system-panel">
            <div className="panel-header">
              <Server size={20} className="panel-icon icon-orange" />
              <h3>System State</h3>
            </div>

            <div className="system-status-row">
              <div className="status-info">
                <span className="status-label">Maintenance Protocol</span>
                <p className="status-desc">
                  {maintenanceMode
                    ? "ACTIVE - User access restricted"
                    : "INACTIVE - Normal operations"}
                </p>
              </div>
              <label className="cyber-switch">
                <input
                  type="checkbox"
                  checked={maintenanceMode}
                  onChange={handleMaintenanceToggle}
                />
                <span className="switch-slider">
                  <Power size={14} className="switch-icon" />
                </span>
              </label>
            </div>
          </section>
        </div>

        {/* Right Column: Activity Log */}
        <div className="console-column right-col">
          <section className="panel-card activity-panel">
            <div className="panel-header">
              <div className="header-left">
                <Terminal size={20} className="panel-icon icon-green" />
                <h3>System Logs</h3>
              </div>
              <button
                className="refresh-icon-btn"
                onClick={fetchAdminActivities}
                title="Refresh Logs"
                disabled={isActivityLoading}
              >
                <RefreshCw size={16} className={isActivityLoading ? "spin" : ""} />
              </button>
            </div>

            <div className="log-container">
              {isLoading ? (
                <div className="loading-state">
                  <Cpu className="pulse-icon" size={40} />
                  <span>INITIALIZING DATA STREAM...</span>
                </div>
              ) : adminActivity.length === 0 ? (
                <div className="empty-state">
                  <span>NO ACTIVITY DETECTED</span>
                </div>
              ) : (
                <div className="log-feed">
                  {adminActivity.map((activity) => (
                    <div
                      key={`${activity.id}_${activity.created_at}`}
                      className="log-entry"
                      onClick={() => setSelectedActivity(activity)}
                    >
                      <span className="log-timestamp">
                        [{new Date(activity.created_at).toLocaleTimeString([], { hour12: false })}]
                      </span>
                      <span className={`log-type type-${activity.type?.toLowerCase()}`}>
                        {activity.type?.toUpperCase()}
                      </span>
                      <span className="log-message">{activity.description}</span>
                    </div>
                  ))}
                  <div ref={activityEndRef} />
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Activity Detail Modal */}
      {selectedActivity && (
        <div className="overlay-backdrop" onClick={() => setSelectedActivity(null)}>
          <div className="modal-terminal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4>LOG_DETAIL_VIEWER</h4>
              <button onClick={() => setSelectedActivity(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <span className="label">TIMESTAMP:</span>
                <span className="value">{new Date(selectedActivity.created_at).toISOString()}</span>
              </div>
              <div className="detail-row">
                <span className="label">ACTION_TYPE:</span>
                <span className="value">{selectedActivity.type}</span>
              </div>
              <div className="detail-row">
                <span className="label">CONTEXT:</span>
                <span className="value highlight">
                  {selectedActivity.is_course_activity ? "COURSE_MOD" : "SYSTEM_MOD"}
                </span>
              </div>
              <div className="detail-block">
                <span className="label">DESCRIPTION:</span>
                <p className="value block-text">{selectedActivity.description}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettingsPage;
