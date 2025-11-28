import React from "react";
import "@/styles/admin/ActivityWindow.css";
import parse from "html-react-parser";

interface Activity {
  activity_id: number;
  action_description: string;
}

interface ActivityWindowProps {
  activities: Activity[];
  onClose: () => void;
}

const ActivityWindow: React.FC<ActivityWindowProps> = ({ activities, onClose }) => {
  return (
    <div className="activity-window-overlay">
      <div className="activity-window">
        <div className="activity-window-content">
          <div className="activity-header">
            <h2 className="activity-header-title">All Recent Activities</h2>
            <button
              className="activity-close-button"
              onClick={onClose}
              aria-label="Close"
            >
              &times;
            </button>
          </div>
          <div className="activity-list">
            {activities.length > 0 ? (
              <ul>
                {activities.map((activity) => (
                  <li key={activity.activity_id}>
                    <div className="activity-detail">
                      {parse(activity.action_description)}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="no-activity">No recent activity available.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityWindow;
