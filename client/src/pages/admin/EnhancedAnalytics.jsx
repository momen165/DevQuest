// Enhanced Analytics Component
import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import axios from 'axios';
import { useAuth } from '../../AuthContext';
import Sidebar from './components/Sidebar';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, registerables } from 'chart.js';
import './styles/EnhancedAnalytics.css';
import {
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { MdDevices, MdPeople, MdDashboard } from 'react-icons/md';
import { FaGlobe, FaMobile, FaDesktop, FaTablet } from 'react-icons/fa';

// Register ChartJS components
ChartJS.register(...registerables);

const Analytics = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('30days');
  const [activeTab, setActiveTab] = useState('basic'); // basic, users, environment
  const [analytics, setAnalytics] = useState({
    visits: {
      daily: [],
      monthly: [],
      last7Days: [],
      total: 0,
      unique: 0,
    },
    userStats: {
      totalUsers: 0,
      activeUsers: 0,
      newUsers: 0,
    },
    courseStats: {
      totalCourses: 0,
      totalEnrollments: 0,
      completionRate: 0,
    },
    engagementStats: {
      averageSessionTime: 0,
      bounceRate: 0,
      pageViews: 0,
    },
    deviceBreakdown: [],
    topPages: [],
    userEngagement: {
      newUsersDaily: [],
      activeUsers24h: 0,
      quizzesTaken: 0,
      mostAttemptedLessons: [],
    },
    environmentInfo: {
      topCountries: [],
      browserStats: [],
    },
  });

  // Extracted fetch function so it can be called from the reload button
  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const token = user?.token;

      if (!token) {
        throw new Error('Authentication token not found');
      }

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      // Fetch analytics data from your API with time range parameter
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/admin/analytics?range=${timeRange}`,
        { headers }
      );

      setAnalytics(response.data);
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError(err.response?.data?.error || 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [user, timeRange]);

  // Chart data preparation
  const visitsChartData = {
    labels: analytics.visits?.daily?.map((item) => item.date) || [],
    datasets: [
      {
        label: 'Daily Visits',
        data: analytics.visits?.daily?.map((item) => item.count) || [],
        fill: false,
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        tension: 0.2,
      },
    ],
  };
  const deviceChartData = {
    labels: (analytics.deviceBreakdown || []).map((item) => item.device),
    datasets: [
      {
        data: (analytics.deviceBreakdown || []).map((item) => parseFloat(item.percentage)),
        backgroundColor: ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
        borderWidth: 0,
      },
    ],
  };

  // New chart data for daily new users
  const newUsersDailyChartData = {
    labels: analytics.userEngagement?.newUsersDaily?.map((item) => item.date) || [],
    datasets: [
      {
        label: 'New Users',
        data: analytics.userEngagement?.newUsersDaily?.map((item) => item.count) || [],
        fill: false,
        backgroundColor: 'rgba(79, 70, 229, 0.6)',
        borderColor: 'rgba(79, 70, 229, 1)',
        tension: 0.2,
      },
    ],
  };

  // Browser stats chart data
  const browserStatsChartData = {
    labels: analytics.environmentInfo?.browserStats?.map((item) => item.browser) || [],
    datasets: [
      {
        data:
          analytics.environmentInfo?.browserStats?.map((item) => parseFloat(item.percentage)) || [],
        backgroundColor: [
          '#4F46E5',
          '#10B981',
          '#F59E0B',
          '#EF4444',
          '#8B5CF6',
          '#EC4899',
          '#0EA5E9',
        ],
        borderWidth: 0,
      },
    ],
  };

  // Countries chart data
  const countriesChartData = {
    labels: analytics.environmentInfo?.topCountries?.map((item) => item.country) || [],
    datasets: [
      {
        data: analytics.environmentInfo?.topCountries?.map((item) => parseInt(item.visits)) || [],
        backgroundColor: ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
        borderWidth: 0,
      },
    ],
  };

  if (loading) {
    return (
      <div className="admin-analytics-page">
        <Sidebar />
        <div className="analytics-loading">
          <CircularProgress />
          <p>Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-analytics-page">
        <Sidebar />
        <div className="analytics-error">
          <h2>Error Loading Analytics</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-analytics-page">
      <Sidebar />
      <div className="analytics-content">
        <header className="analytics-header">
          <h1>Site Analytics</h1>
          <div className="analytics-controls">
            <div className="analytics-tabs">
              <button
                className={`tab-button ${activeTab === 'basic' ? 'active' : ''}`}
                onClick={() => setActiveTab('basic')}
              >
                <MdDashboard /> Basic Stats
              </button>
              <button
                className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
                onClick={() => setActiveTab('users')}
              >
                <MdPeople /> User Engagement
              </button>
              <button
                className={`tab-button ${activeTab === 'environment' ? 'active' : ''}`}
                onClick={() => setActiveTab('environment')}
              >
                <MdDevices /> Environment
              </button>
            </div>
            {/* React Select for time range */}
            <div style={{ minWidth: 160 }}>
              <Select
                classNamePrefix="time-range-selector"
                value={[
                  { value: '7days', label: 'Last 7 days' },
                  { value: '30days', label: 'Last 30 days' },
                  { value: '90days', label: 'Last 90 days' },
                ].find((opt) => opt.value === timeRange)}
                onChange={(opt) => setTimeRange(opt.value)}
                options={[
                  { value: '7days', label: 'Last 7 days' },
                  { value: '30days', label: 'Last 30 days' },
                  { value: '90days', label: 'Last 90 days' },
                ]}
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
            <button className="reload-button" onClick={fetchAnalyticsData}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path d="M8 3a5 5 0 0 0-5 5v.7l-.7-.7A.5.5 0 0 0 1.5 8.5H4a.5.5 0 0 0 0-1H2.1l1.1-1.1A6 6 0 0 1 14 8a.5.5 0 0 0 1 0 7 7 0 0 0-7-5z" />
                <path d="M8 13a5 5 0 0 1-5-5v-.7l.7.7a.5.5 0 0 0 .7-.7l-2-2a.5.5 0 0 0-.7 0l-2 2a.5.5 0 1 0 .7.7L1.5 7.3V8a6 6 0 0 0 11.9 1H12a.5.5 0 0 0 0 1h2.5a.5.5 0 0 0 .5-.5V7a.5.5 0 0 0-1 0v1.1A7 7 0 0 1 8 13z" />
              </svg>
              Refresh
            </button>
          </div>
        </header>

        {/* BASIC STATS TAB */}
        {activeTab === 'basic' && (
          <>
            <div className="analytics-metrics">
              <div className="metric-card">
                <h3>Total Visits</h3>{' '}
                <p className="metric-value">{(analytics.visits.total || 0).toLocaleString()}</p>
                <p className="metric-subtext">
                  {(analytics.visits.unique || 0).toLocaleString()} unique visitors
                </p>
              </div>

              <div className="metric-card">
                <h3>Total Users</h3>{' '}
                <p className="metric-value">{analytics.userStats?.totalUsers || 0}</p>
                <p className="metric-change positive">
                  +{analytics.userStats?.newUsers || 0} new this month
                </p>
              </div>

              <div className="metric-card">
                <h3>Active Users</h3>{' '}
                <p className="metric-value">{analytics.userStats?.activeUsers || 0}</p>
                <p className="metric-subtext">
                  {Math.round(
                    ((analytics.userStats?.activeUsers || 0) /
                      (analytics.userStats?.totalUsers || 1)) *
                      100
                  )}
                  % of total users
                </p>
              </div>

              <div className="metric-card">
                <h3>Avg. Session</h3>{' '}
                <p className="metric-value">
                  {Math.round((analytics.engagementStats?.averageSessionTime || 0) / 60)} min
                </p>{' '}
                <p className="metric-subtext">
                  {(analytics.engagementStats?.pageViews || 0).toLocaleString()} page views
                </p>
              </div>
            </div>

            <div className="analytics-charts">
              <div className="chart-container">
                <h3>Site Visits Trend</h3>
                <div className="chart-wrapper">
                  {!analytics.visits?.daily?.length ? (
                    <div className="chart-loading">
                      <CircularProgress size={30} />
                      <p>Loading chart data...</p>
                    </div>
                  ) : (
                    <Line
                      data={visitsChartData}
                      options={{
                        responsive: true,
                        plugins: {
                          legend: { position: 'top' },
                          tooltip: { mode: 'index' },
                        },
                        scales: {
                          y: { beginAtZero: true },
                        },
                      }}
                    />
                  )}
                </div>
              </div>

              <div className="chart-container">
                <h3>Top Pages</h3>
                <div className="table-wrapper">
                  {!analytics.topPages?.length ? (
                    <div className="chart-loading">
                      <CircularProgress size={30} />
                      <p>Loading data...</p>
                    </div>
                  ) : (
                    <TableContainer component={Paper} className="analytics-table">
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Page Path</TableCell>
                            <TableCell align="right">Visits</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(analytics.topPages || [])
                            .filter(
                              (page) =>
                                page.page_visited &&
                                !page.page_visited.startsWith('/admin/analytics') &&
                                !page.page_visited.startsWith('/getCoursesWithRatings') &&
                                !page.page_visited.startsWith('/api')
                            )
                            .map((page, index) => (
                              <TableRow key={index}>
                                <TableCell>{page.page_visited}</TableCell>
                                <TableCell align="right">{page.visits}</TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* USER ENGAGEMENT TAB */}
        {activeTab === 'users' && (
          <>
            <div className="analytics-metrics">
              <div className="metric-card">
                <h3>New Users (Last 24h)</h3>
                <p className="metric-value">
                  {analytics.userEngagement?.newUsersDaily?.[
                    analytics.userEngagement?.newUsersDaily?.length - 1
                  ]?.count || 0}
                </p>
              </div>

              <div className="metric-card">
                <h3>Active Users (24h)</h3>
                <p className="metric-value">{analytics.userEngagement?.activeUsers24h || 0}</p>
                <p className="metric-subtext">
                  {Math.round(
                    ((analytics.userEngagement?.activeUsers24h || 0) /
                      (analytics.userStats?.totalUsers || 1)) *
                      100
                  )}
                  % of total users
                </p>
              </div>

              <div className="metric-card">
                <h3>Quizzes Taken</h3>
                <p className="metric-value">{analytics.userEngagement?.quizzesTaken || 0}</p>
              </div>

              <div className="metric-card">
                <h3>Course Enrollments</h3>{' '}
                <p className="metric-value">{analytics.courseStats?.totalEnrollments || 0}</p>
                <p className="metric-subtext">
                  {Math.round(analytics.courseStats?.completionRate || 0)}% completion rate
                </p>
              </div>
            </div>

            <div className="analytics-charts">
              <div className="chart-container">
                <h3>New Users Trend</h3>
                <div className="chart-wrapper">
                  {analytics.userEngagement?.newUsersDaily?.length === 0 ? (
                    <div className="chart-loading">
                      <CircularProgress size={30} />
                      <p>Loading chart data...</p>
                    </div>
                  ) : (
                    <Line
                      data={newUsersDailyChartData}
                      options={{
                        responsive: true,
                        plugins: {
                          legend: { position: 'top' },
                          tooltip: { mode: 'index' },
                        },
                        scales: {
                          y: { beginAtZero: true },
                        },
                      }}
                    />
                  )}
                </div>
              </div>

              <div className="chart-container">
                <h3>Most Attempted Lessons</h3>
                <div className="table-wrapper">
                  {analytics.userEngagement?.mostAttemptedLessons?.length === 0 ? (
                    <div className="chart-loading">
                      <CircularProgress size={30} />
                      <p>Loading data...</p>
                    </div>
                  ) : (
                    <TableContainer component={Paper} className="analytics-table">
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Lesson Title</TableCell>
                            <TableCell align="right">Attempts</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {analytics.userEngagement?.mostAttemptedLessons?.map((lesson, index) => (
                            <TableRow key={index}>
                              <TableCell>{lesson.lesson_title}</TableCell>
                              <TableCell align="right">{lesson.attempts}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ENVIRONMENT TAB */}
        {activeTab === 'environment' && (
          <>
            <div className="analytics-metrics">
              {' '}
              <div className="metric-card">
                <h3>Desktop Users</h3>
                <p className="metric-value">
                  {(analytics.deviceBreakdown || []).find((d) => d.device === 'Desktop')?.percentage
                    ? parseFloat(
                        (analytics.deviceBreakdown || []).find((d) => d.device === 'Desktop')
                          ?.percentage
                      ).toFixed(1)
                    : '0.0'}
                  %
                </p>
                <FaDesktop className="metric-icon" />
              </div>{' '}
              <div className="metric-card">
                <h3>Mobile Users</h3>{' '}
                <p className="metric-value">
                  {(analytics.deviceBreakdown || []).find((d) => d.device === 'Mobile')?.percentage
                    ? parseFloat(
                        (analytics.deviceBreakdown || []).find((d) => d.device === 'Mobile')
                          ?.percentage
                      ).toFixed(1)
                    : '0.0'}
                  %
                </p>
                <FaMobile className="metric-icon" />
              </div>{' '}
              <div className="metric-card">
                <h3>Tablet Users</h3>
                <p className="metric-value">
                  {(analytics.deviceBreakdown || []).find((d) => d.device === 'Tablet')?.percentage
                    ? parseFloat(
                        (analytics.deviceBreakdown || []).find((d) => d.device === 'Tablet')
                          ?.percentage
                      ).toFixed(1)
                    : '0.0'}
                  %
                </p>
                <FaTablet className="metric-icon" />
              </div>
              <div className="metric-card">
                <h3>Top Country</h3>
                <p className="metric-value">
                  {analytics.environmentInfo?.topCountries?.[0]?.country || 'Unknown'}
                </p>
                <FaGlobe className="metric-icon" />
              </div>
            </div>

            <div className="analytics-charts">
              <div className="chart-row">
                <div className="chart-container half">
                  <h3>Device Breakdown</h3>
                  <div className="chart-wrapper">
                    {!analytics.deviceBreakdown?.length ? (
                      <div className="chart-loading">
                        <CircularProgress size={30} />
                        <p>Loading chart data...</p>
                      </div>
                    ) : (
                      <Pie
                        data={deviceChartData}
                        options={{
                          responsive: true,
                          plugins: {
                            legend: { position: 'right' },
                          },
                        }}
                      />
                    )}
                  </div>
                </div>

                <div className="chart-container half">
                  <h3>Browser Statistics</h3>
                  <div className="chart-wrapper">
                    {analytics.environmentInfo?.browserStats?.length === 0 ? (
                      <div className="chart-loading">
                        <CircularProgress size={30} />
                        <p>Loading chart data...</p>
                      </div>
                    ) : (
                      <Doughnut
                        data={browserStatsChartData}
                        options={{
                          responsive: true,
                          plugins: {
                            legend: { position: 'right' },
                          },
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="chart-container">
                <h3>Top Countries</h3>
                <div className="chart-row">
                  <div className="chart-wrapper half">
                    {analytics.environmentInfo?.topCountries?.length === 0 ? (
                      <div className="chart-loading">
                        <CircularProgress size={30} />
                        <p>Loading chart data...</p>
                      </div>
                    ) : (
                      <Bar
                        data={countriesChartData}
                        options={{
                          responsive: true,
                          indexAxis: 'y',
                          plugins: {
                            legend: { display: false },
                          },
                        }}
                      />
                    )}
                  </div>
                  <div className="table-wrapper half">
                    {analytics.environmentInfo?.topCountries?.length === 0 ? (
                      <div className="chart-loading">
                        <CircularProgress size={30} />
                        <p>Loading data...</p>
                      </div>
                    ) : (
                      <TableContainer component={Paper} className="analytics-table">
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Country</TableCell>
                              <TableCell align="right">Visits</TableCell>
                              <TableCell align="right">%</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {analytics.environmentInfo?.topCountries?.map((country, index) => (
                              <TableRow key={index}>
                                <TableCell>{country.country}</TableCell>
                                <TableCell align="right">{country.visits}</TableCell>{' '}
                                <TableCell align="right">
                                  {(
                                    (country.visits / (analytics.visits?.total || 1)) *
                                    100
                                  ).toFixed(1)}
                                  %
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Analytics;
