import React from "react";
import { Link } from "react-router-dom";
import "../styles/AccountSettingsSidebar.css";
import { FaCreditCard } from "react-icons/fa";
import { FaRightToBracket, FaUser } from "react-icons/fa6";

function Sidebar({ activeLink }) {
  return (
    <div className="account-settings-sidebar">
      <ul className="account-settings-sidebar-list">
        <Link to="/AccountSettings" className="account-settings-sidebar-link">
          <li
            className={`account-settings-sidebar-item ${activeLink === "profile" ? "account-settings-sidebar-item-active" : ""}`}
          >
            <FaUser
              size={24}
              color={activeLink === "profile" ? "#ffffff" : "#94bbd4"}
              className="account-settings-sidebar-icon"
            />
            Profile
          </li>
        </Link>
        <Link to="/changepassword" className="account-settings-sidebar-link">
          <li
            className={`account-settings-sidebar-item ${activeLink === "login" ? "account-settings-sidebar-item-active" : ""}`}
          >
            <FaRightToBracket
              size={24}
              color={activeLink === "login" ? "#ffffff" : "#94bbd4"}
              className="account-settings-sidebar-icon"
            />
            Login
          </li>
        </Link>
        <Link to="/billing" className="account-settings-sidebar-link">
          <li
            className={`account-settings-sidebar-item ${activeLink === "billing" ? "account-settings-sidebar-item-active" : ""}`}
          >
            <FaCreditCard
              size={24}
              color={activeLink === "billing" ? "#ffffff" : "#94bbd4"}
              className="account-settings-sidebar-icon"
            />
            Billing
          </li>
        </Link>
      </ul>
    </div>
  );
}

export default Sidebar;
