import Sidebar from 'features/admin/components/Sidebar';
import DashboardContent from './DashboardContent';
import './Dashboard.css';

const Dashboard = () => {
  return (
    <div className="dashboard-container">
      <Sidebar />
      <DashboardContent />
    </div>
  );
};

export default Dashboard;
