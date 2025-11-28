'use client';

import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/AccountSettingsSidebar';
import BadgeNotification from '@/components/BadgeNotification';
import ProtectedRoute from '@/components/ProtectedRoute';
import MaintenanceCheck from '@/components/MaintenanceCheck';
import { useAuth } from '@/contexts/AuthContext';
import '@/styles/AccountSettings.css';
import defaultProfilePic from '@/public/assets/images/default-profile-pic.png';
import { FaCamera } from 'react-icons/fa';

interface Badge {
  badge_id: number;
  badge_type: string;
  badge_name: string;
  badge_description: string;
  badge_image: string;
}

interface CountryOption {
  value: string;
  label: string;
}

const AccountSettings: React.FC = () => {
  const { user, setUser } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState('');
  const [newSkill, setNewSkill] = useState('');

  // Badge notification state
  const [showBadgeNotification, setShowBadgeNotification] = useState(false);
  const [profileCompleteBadge, setProfileCompleteBadge] = useState<Badge | null>(null);
  const [badgesBefore, setBadgesBefore] = useState<Badge[]>([]);

  const countryOptions: CountryOption[] = [
    { value: 'Other', label: 'Other' },
    { value: 'Palestine', label: 'Palestine' },
    { value: 'Jordan', label: 'Jordan' },
    { value: 'USA', label: 'USA' },
    { value: 'UK', label: 'UK' }
  ];

  // Fetch badges before profile update
  useEffect(() => {
    const fetchBadges = async () => {
      if (user && user.token) {
        try {
          const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/badges/user`, {
            headers: { Authorization: `Bearer ${user.token}` },
          });
          if (res.data.success && Array.isArray(res.data.badges)) {
            setBadgesBefore(res.data.badges);
          }
        } catch (err) {
          // Optionally handle error
        }
      }
    };
    fetchBadges();
  }, [user]);

  useEffect(() => {
    if (!user || !user.token) {
      router.push('/');
    } else {
      if (user.name) setName(user.name);
      if (user.country) setCountry(user.country);
      if (user.bio) setBio(user.bio);
      if (user.skills) setSkills(user.skills.join(', '));
    }
  }, [user, router]);

  const handleRemoveProfilePic = async () => {
    try {
      const response = await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/removeProfilePic`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });

      const updatedUser = { ...user, profileimage: null };
      setUser(updatedUser);

      localStorage.setItem('user', JSON.stringify(updatedUser));
      toast.success('Profile picture removed successfully');
    } catch (error: any) {
      console.error('[handleRemoveProfilePic] Error:', error);
      console.error(
        '[handleRemoveProfilePic] Response data:',
        error.response?.data,
      );
      console.error('[handleRemoveProfilePic] Stack:', error.stack);
      toast.error(
        error.response?.data?.error ||
        'An error occurred while removing your profile picture'
      );
    }
  };

  const handleProfilePicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append('profilePic', file);

    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/uploadProfilePic`, formData, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      const { profileimage } = response.data;
      if (!profileimage) {
        console.error(
          '[handleProfilePicChange] No profile image URL in response',
        );
        throw new Error('No profile image URL received from server');
      }

      const updatedUser = {
        ...user,
        profileimage: profileimage,
      };
      setUser(updatedUser);

      localStorage.setItem('user', JSON.stringify(updatedUser));

      toast.success('Profile picture updated successfully');
    } catch (error: any) {
      console.error('[handleProfilePicChange] Error:', error);
      console.error(
        '[handleProfilePicChange] Response data:',
        error.response?.data,
      );
      console.error('[handleProfilePicChange] Stack:', error.stack);
      toast.error(
        error.response?.data?.error ||
        'An error occurred while uploading your profile picture'
      );
    }
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const skillsArray = skills
        .split(',')
        .map((skill) => skill.trim())
        .filter((skill) => skill !== '');

      console.log('[DEBUG] badgesBefore:', badgesBefore);

      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/update-profile`,
        {
          name,
          country,
          bio,
          skills: skillsArray,
        },
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        },
      );
      const updatedUser = { ...user, name, country, bio, skills: skillsArray };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      toast.success('Profile updated successfully');

      // Fetch badges after update
      const badgeRes = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/badges/user`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (badgeRes.data.success && Array.isArray(badgeRes.data.badges)) {
        const badgesAfter = badgeRes.data.badges;
        console.log('[DEBUG] badgesAfter:', badgesAfter);
        const hadProfileComplete = badgesBefore.some(b => b.badge_type === 'profile_complete');
        const newProfileBadge = badgesAfter.find(b => b.badge_type === 'profile_complete');
        console.log('[DEBUG] hadProfileComplete:', hadProfileComplete, 'newProfileBadge:', newProfileBadge);
        if (!hadProfileComplete && newProfileBadge) {
          console.log('[DEBUG] Triggering BadgeNotification for profile_complete');
          setProfileCompleteBadge(newProfileBadge);
          setShowBadgeNotification(true);
        }
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(
        error.response?.data?.error ||
        'An error occurred while updating your profile'
      );
    }
  };

  return (
    <MaintenanceCheck>
      <ProtectedRoute>
        <>
          <Navbar />
          {showBadgeNotification && profileCompleteBadge && (
            <BadgeNotification
              badge={profileCompleteBadge}
              onClose={() => setShowBadgeNotification(false)}
            />
          )}
          <div className="account-settings-profile-page">
            <Sidebar activeLink="profile" />

            <div className="account-settings-profile-content">
              <h2>{name ? `Welcome, ${name}!` : 'Loading...'}</h2>
              <div className="account-settings-profile-header">
                <div className="account-settings-profile-avatar">
                  <img
                    src={user?.profileimage || defaultProfilePic.src}
                    alt="Profile"
                    onError={(e: any) => {
                      console.error(
                        '[ProfilePage] Error loading profile image:',
                        e,
                      );
                      e.target.src = defaultProfilePic.src;
                    }}
                  />
                  <label
                    htmlFor="profilePicInput"
                    className="account-settings-profile-pic-buttons"
                  >
                    <FaCamera size={16} color="#e2e8f0" />
                  </label>
                  <input
                    type="file"
                    id="profilePicInput"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleProfilePicChange}
                  />
                </div>
              </div>

              <form
                className="account-settings-profile-form"
                onSubmit={handleSaveChanges}
              >
                <label htmlFor="name">Name</label>
                <input
                  type="text"
                  id="name"
                  className="Rand-idafkd-Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />

                <label htmlFor="country">Country</label>
                <div style={{ marginBottom: '1rem' }}>
                  <Select
                    id="country"
                    classNamePrefix="account-settings-select"
                    value={countryOptions.find(opt => opt.value === country)}
                    onChange={(opt) => setCountry(opt?.value || '')}
                    options={countryOptions}
                    isSearchable={false}
                    styles={{
                      control: (provided) => ({
                        ...provided,
                        backgroundColor: '#282f40',
                        color: 'white',
                        borderColor: '#282f40',
                      }),
                      singleValue: (provided) => ({
                        ...provided,
                        color: 'white',
                      }),
                      menu: (provided) => ({
                        ...provided,
                        backgroundColor: '#282f40',
                        color: 'white',
                      }),
                      option: (provided, state) => ({
                        ...provided,
                        backgroundColor: state.isFocused ? '#1a1f2b' : '#282f40',
                        color: 'white',
                        cursor: 'pointer',
                      }),
                      input: (provided) => ({
                        ...provided,
                        color: 'white',
                      }),
                      dropdownIndicator: (provided) => ({
                        ...provided,
                        color: 'white',
                      }),
                      indicatorSeparator: (provided) => ({
                        ...provided,
                        backgroundColor: 'white',
                      }),
                    }}
                  />
                </div>

                <label htmlFor="bio">Bio</label>
                <textarea
                  id="bio"
                  className="account-settings-textarea"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                ></textarea>

                <label htmlFor="skills">Skills</label>
                <div className="skills-container">
                  <div className="skills-wrapper">
                    {skills.split(',').map(
                      (skill, index) =>
                        skill.trim() && (
                          <div key={index} className="skill-badge">
                            {skill.trim()}
                            <span
                              className="skill-remove-icon"
                              onClick={() => {
                                const newSkills = skills
                                  .split(',')
                                  .filter((_, i) => i !== index)
                                  .join(', ');
                                setSkills(newSkills);
                              }}
                            >
                              ×
                            </span>
                          </div>
                        ),
                    )}
                  </div>
                  <div className="skill-input-container">
                    <input
                      type="text"
                      className="skill-input"
                      placeholder="Add a skill..."
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newSkill.trim()) {
                          e.preventDefault();
                          setSkills(skills ? `${skills}, ${newSkill}` : newSkill);
                          setNewSkill('');
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="add-skill-btn"
                      onClick={() => {
                        if (newSkill.trim()) {
                          setSkills(skills ? `${skills}, ${newSkill}` : newSkill);
                          setNewSkill('');
                        }
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="account-settings-form-buttons">
                  <button type="submit" className="settings-btn settings-save-btn">
                    Save Changes
                  </button>
                  <button
                    type="button"
                    className="settings-btn settings-cancel-btn"
                    onClick={() => router.push('/AccountSettings')}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      </ProtectedRoute>
    </MaintenanceCheck>
  );
};

export default AccountSettings;
