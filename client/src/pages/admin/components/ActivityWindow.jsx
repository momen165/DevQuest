import React from "react";
import "../../../pages/admin/styles/ActivityWindow.css";
import parse from "html-react-parser";

const ActivityWindow = ({ activities, onClose }) => {
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
