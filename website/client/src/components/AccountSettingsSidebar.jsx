import React from 'react';
import { Link } from 'react-router-dom';
import 'styles/AccountSettingsSidebar.css';
import { FaCreditCard    } from 'react-icons/fa';
import { FaRightToBracket,FaUser } from 'react-icons/fa6';
function Sidebar({ activeLink }) {
  
  return (
    
    <div className="sidebar">
      <ul>
        <Link to="/AccountSettings" className="link">
          <li className={activeLink === 'profile' ? 'active' : ''}> 
            <FaUser size={24} color={activeLink === 'profile' ? '#ffffff' : '#94bbd4'} style={{ marginRight: '12px' }} />  
            Profile
          </li>
        </Link>
        <Link to="/changepassword" className="link">
          <li className={activeLink === 'login' ? 'active' : ''}>
            <FaRightToBracket size={24} color={activeLink === 'login' ? '#ffffff' : '#94bbd4'} style={{ marginRight: '12px' }} /> 
            Login
          </li>
        </Link>
        <Link to="/billing" className="link">
          <li className={activeLink === 'billing' ? 'active' : ''}>
            <FaCreditCard size={24} color={activeLink === 'billing' ? '#ffffff' : '#94bbd4'} style={{ marginRight: '12px' }} /> 
            Billing
          </li>
        </Link>
      </ul>
    </div>
  );
}

export default Sidebar;
