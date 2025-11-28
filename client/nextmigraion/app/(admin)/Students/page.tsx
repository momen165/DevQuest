'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import MaintenanceCheck from '@/components/MaintenanceCheck';
import LoadingSpinner from '@/components/CircularProgress';
import Sidebar from '@/components/admin/Sidebar';
import StudentDetailTable from '@/components/admin/StudentDetailTable';
import axios from 'axios';
import '@/styles/admin/Students.css';

interface Student {
  user_id: number;
  name: string;
  email: string;
  subscription_type: string;
  is_verified: boolean;
}

const deduplicateStudents = (students: Student[]): Student[] => {
  const seen = new Set<number>();
  return students.filter((student) => {
    if (seen.has(student.user_id)) {
      return false;
    }
    seen.add(student.user_id);
    return true;
  });
};

const StudentSubscriptionTable: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        const token = userData ? userData.token : null;

        if (!token) {
          throw new Error('No token found. Please log in again.');
        }

        const headers = { Authorization: `Bearer ${token}` };
        const response = await axios.get<{ students: Student[] }>(
          `${process.env.NEXT_PUBLIC_API_URL}/students`,
          { headers }
        );

        const uniqueStudents = deduplicateStudents(response.data.students || []);
        setStudents(uniqueStudents);
      } catch (err: any) {
        console.error('Error fetching students:', err.response?.data || err.message);
        setError(err.response?.data?.error || 'Failed to fetch students.');
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const filteredStudents = deduplicateStudents(
    Array.isArray(students)
      ? students.filter((student) => {
          const name = student.name ? student.name.toLowerCase() : '';
          const email = student.email ? student.email.toLowerCase() : '';
          const search = searchTerm.toLowerCase();
          return name.includes(search) || email.includes(search);
        })
      : []
  );

  const handleRowClick = (student: Student) => {
    setSelectedStudent(student);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedStudent(null);
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div>{error}</div>;

  return (
    <MaintenanceCheck>
      <ProtectedRoute adminRequired={true}>
        <div className="student-subscription-page">
          <Sidebar />
          <div className="student-subscription-content">
            <h2 className="studentPageTitle">Student Management</h2>

            <div className="search-bar">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={handleSearch}
              />
              <button className="search-button">
                <i className="fas fa-search"></i> Search
              </button>
            </div>

            {filteredStudents.length > 0 ? (
              <table className="subscription-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Subscription</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr
                      key={student.user_id}
                      onClick={() => handleRowClick(student)}
                      className={selectedStudent?.user_id === student.user_id ? 'selected' : ''}
                    >
                      <td>{student.user_id}</td>
                      <td>{student.name || 'Unknown'}</td>
                      <td>{student.email || 'Unknown'}</td>
                      <td>{student.subscription_type || 'N/A'}</td>
                      <td>
                        <span className={`status-badge ${student.is_verified ? 'active' : 'inactive'}`}>
                          {student.is_verified ? 'Verified' : 'Unverified'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="no-results">
                {searchTerm ? 'No students found matching your search.' : 'No students available.'}
              </div>
            )}

            {isModalOpen && selectedStudent && (
              <StudentDetailTable studentId={selectedStudent.user_id} onClose={handleCloseModal} />
            )}
          </div>
        </div>
      </ProtectedRoute>
    </MaintenanceCheck>
  );
};

export default StudentSubscriptionTable;
