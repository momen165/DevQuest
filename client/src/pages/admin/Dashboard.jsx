import Sidebar from "../admin/components/Sidebar";
import DashboardContent from "../admin/DashboardContent";
import "../admin/styles/Dashboard.css";

const Dashboard = () => {
  return (
    <div className="dashboard-container">
      <Sidebar />
      <DashboardContent />
    </div>
  );
};

export default Dashboard;
