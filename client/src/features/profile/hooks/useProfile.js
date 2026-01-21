import { useState, useEffect } from 'react';
import axios from 'axios';

const api_url = import.meta.env.VITE_API_URL;

export const useProfile = (user) => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [badges, setBadges] = useState([]);
  const [loadingBadges, setLoadingBadges] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user || !user.user_id) return;
      
      try {
        setLoading(true);
        const profileResponse = await axios.get(
          `${api_url}/students/${user.user_id}`,
          {
            headers: { Authorization: `Bearer ${user.token}` },
          },
        );

        setProfileData(profileResponse.data);
        setError(null);
      } catch (err) {
        console.error("Error fetching profile data:", err);
        setError(err.response?.data?.error || "Failed to load profile data");
      } finally {
        setLoading(false);
      }
    };

    const fetchUserBadges = async () => {
      if (!user || !user.token) return;

      try {
        setLoadingBadges(true);
        const badgeResponse = await axios.get(
          `${api_url}/badges/user`,
          {
            headers: { Authorization: `Bearer ${user.token}` },
          }
        );
        
        if (badgeResponse.data.success && badgeResponse.data.badges) {
          setBadges(badgeResponse.data.badges);
        }
      } catch (err) {
        console.error("Error fetching badges:", err);
      } finally {
        setLoadingBadges(false);
      }
    };

    fetchProfileData();
    fetchUserBadges();
  }, [user]);

  return {
    profileData,
    loading,
    error,
    badges,
    loadingBadges
  };
};
