import React from 'react';
import 'pages/admin/styles/ActivityWindow.css';
import parse from 'html-react-parser';

const ActivityWindow = ({ activities, onClose }) => {
    return (
        <div className="activity-window">
            <div className="activity-window-content">
                <button className="close-button" onClick={onClose}>
                    &times;
                </button>
                <h2>All Recent Activities</h2>
                <ul>
                    {activities.length > 0 ? (
                        activities.map((activity) => (
                            <li key={activity.activity_id}>
                                <div className="activity-detail">
                                    {parse(activity.action_description)}
                                </div>
                            </li>
                        ))
                    ) : (
                        <li>No recent activity available.</li>
                    )}
                </ul>
            </div>
        </div>
    );
};

export default ActivityWindow;