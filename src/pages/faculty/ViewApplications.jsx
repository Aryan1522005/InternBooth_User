import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { APPLICATION_STATUS, getStatusLabel, getStatusBadgeClass } from '../../utils/applicationUtils';

// Function to normalize department names for display
function normalizeDepartmentName(department) {
  if (!department) return 'N/A';
  const dept = department.trim();
  const entcVariants = [
    'ENTC',
    'Electronics & communication',
    'Electronics & Communication',
    'Electronics and Communication',
    'Electronics & Comm',
    'E&TC'
  ];
  
  if (entcVariants.some(variant => variant.toLowerCase() === dept.toLowerCase())) {
    return 'ELECTRONICS AND TELECOMMUNICATION';
  }
  
  return dept;
}

function ViewApplications() {
  const { internshipId } = useParams();
  const { currentUser } = useAuth();
  const [internship, setInternship] = useState(null);
  const [applications, setApplications] = useState([]);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    async function fetchInternshipData() {
      try {
        setLoading(true);
        setError('');

        // Fetch internship details
        const internshipDoc = await getDoc(doc(db, 'internships', internshipId));
        if (internshipDoc.exists()) {
          setInternship(internshipDoc.data());
        }

        // Fetch applications for this internship
        const applicationsQuery = query(
          collection(db, 'applications'),
          where('internshipId', '==', internshipId)
        );
        
        const applicationsSnapshot = await getDocs(applicationsQuery);
        const applicationsData = await Promise.all(applicationsSnapshot.docs.map(async (docSnapshot) => {
          const application = {
            id: docSnapshot.id,
            ...docSnapshot.data()
          };
          
          // Fetch student details for each application
          if (application.studentId) {
            try {
              console.log('Fetching student with ID:', application.studentId);
              const studentDoc = await getDoc(doc(db, 'students', application.studentId));
              if (studentDoc.exists()) {
                const studentData = studentDoc.data();
                console.log('Student data found:', studentData);
                // Add student details to the application object
                return {
                  ...application,
                  studentName: `${studentData.firstName} ${studentData.lastName}`,
                  studentClass: studentData.passingYear || '',
                  studentDepartment: normalizeDepartmentName(studentData.department) || '',
                  studentSkills: studentData.skills || [],
                  studentInterests: studentData.interests || [],
                  studentCertifications: studentData.certificates || [],
                  studentProjects: studentData.previousProjects ? [studentData.previousProjects] : [],
                  studentGithubLink: studentData.githubLink || '',
                  studentLinkedinLink: studentData.linkedinLink || '',
                  studentCodechefLink: studentData.codechefLink || '',
                  studentLeetcodeLink: studentData.leetcodeLink || '',
                  studentEmail: studentData.email || '',
                  studentPhone: studentData.phoneNumber || '',
                  studentCGPA: studentData.cgpa || ''
                };
              } else {
                // Try to fetch from users collection as fallback
                console.log('Student not found in students collection, trying users collection');
                const userDoc = await getDoc(doc(db, 'users', application.studentId));
                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  console.log('User data found:', userData);
                  // Add user details to the application object
                  return {
                    ...application,
                    studentName: `${userData.firstName} ${userData.lastName}`,
                    studentClass: userData.passingYear || '',
                    studentDepartment: normalizeDepartmentName(userData.department) || '',
                    studentSkills: userData.skills || [],
                    studentInterests: userData.interests || [],
                    studentCertifications: userData.certificates || [],
                    studentProjects: userData.previousProjects ? [userData.previousProjects] : [],
                    studentGithubLink: userData.githubLink || '',
                    studentLinkedinLink: userData.linkedinLink || '',
                    studentCodechefLink: userData.codechefLink || '',
                    studentLeetcodeLink: userData.leetcodeLink || ''
                  };
                }
              }
            } catch (studentError) {
              console.error('Error fetching student data:', studentError);
            }
          }
          
          return application;
        }));
        
        setApplications(applicationsData);
        setFilteredApplications(applicationsData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching internship data:', error);
        setError('Failed to load internship data');
        setLoading(false);
      }
    }

    if (internshipId && currentUser) {
      fetchInternshipData();
    }
  }, [internshipId, currentUser, db]);

  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredApplications(applications);
    } else {
      setFilteredApplications(applications.filter(application => application.status === statusFilter));
    }
  }, [statusFilter, applications]);

  if (loading) {
    return (
      <div className="w-11/12 md:w-3/4 mx-auto px-4 py-8">
        <p className="text-center">Loading applications...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-11/12 md:w-3/4 mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      </div>
    );
  }

  if (!internship) {
    return (
      <div className="w-11/12 md:w-3/4 mx-auto px-4 py-8">
        <p className="text-center">Internship not found</p>
      </div>
    );
  }

  return (
    <div className="w-11/12 md:w-3/4 mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">{internship.title}</h1>
          <p className="text-gray-600">{internship.companyName}</p>
        </div>
        <div className="flex space-x-4">
          <Link
            to={`/faculty/evaluate-quiz-submissions/${internshipId}`}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Evaluate Quiz Submissions
          </Link>
          <button
            onClick={() => window.history.back()}
            className="text-primary hover:text-primary-dark"
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Applications</h2>
            <p className="text-gray-600">{applications.length} applications received</p>
          </div>
          <div className="flex items-center flex-wrap gap-1">
            <button
              onClick={() => setStatusFilter('all')}
              className={`bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-l ${statusFilter === 'all' ? 'bg-blue-100 text-blue-800' : ''}`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter(APPLICATION_STATUS.FORM_SUBMITTED)}
              className={`bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 px-4 ${statusFilter === APPLICATION_STATUS.FORM_SUBMITTED ? 'bg-blue-100 text-blue-800' : ''}`}
            >
              Form Submitted
            </button>
            <button
              onClick={() => setStatusFilter(APPLICATION_STATUS.FORM_APPROVED)}
              className={`bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 px-4 ${statusFilter === APPLICATION_STATUS.FORM_APPROVED ? 'bg-blue-100 text-blue-800' : ''}`}
            >
              Form Approved
            </button>
            <button
              onClick={() => setStatusFilter(APPLICATION_STATUS.TEST_ASSIGNED)}
              className={`bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 px-4 ${statusFilter === APPLICATION_STATUS.TEST_ASSIGNED ? 'bg-purple-100 text-purple-800' : ''}`}
            >
              Test Assigned
            </button>
            <button
              onClick={() => setStatusFilter(APPLICATION_STATUS.QUIZ_COMPLETED)}
              className={`bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 px-4 ${statusFilter === APPLICATION_STATUS.QUIZ_COMPLETED ? 'bg-indigo-100 text-indigo-800' : ''}`}
            >
              Quiz Completed
            </button>
            <button
              onClick={() => setStatusFilter(APPLICATION_STATUS.QUIZ_APPROVED)}
              className={`bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 px-4 ${statusFilter === APPLICATION_STATUS.QUIZ_APPROVED ? 'bg-green-100 text-green-800' : ''}`}
            >
              Quiz Approved
            </button>
            <button
              onClick={() => setStatusFilter(APPLICATION_STATUS.SELECTED)}
              className={`bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-r ${statusFilter === APPLICATION_STATUS.SELECTED ? 'bg-green-100 text-green-800' : ''}`}
            >
              Selected
            </button>
          </div>
        </div>

        {filteredApplications.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No applications received yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Skills</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interests</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Certifications</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Projects</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GitHub</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LinkedIn</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CodeChef</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LeetCode</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied On</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {filteredApplications.map(application => (
                  <tr key={application.id} className="hover:bg-gray-100">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{application.studentName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {application.studentSkills?.map(skill => (
                        <span key={skill} className="bg-blue-100 text-blue-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded">{skill}</span>
                      ))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{application.studentClass}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{application.studentDepartment}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {application.studentInterests?.map(interest => (
                        <span key={interest} className="bg-blue-100 text-blue-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded">{interest}</span>
                      ))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {application.studentCertifications?.map(cert => (
                        <div key={cert.link} className="mb-2">
                          <a href={cert.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                            {cert.title}
                          </a>
                        </div>
                      ))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {application.studentProjects?.map(project => (
                        <div key={project} className="mb-2">
                          {project}
                        </div>
                      ))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {application.studentGithubLink && application.studentGithubLink !== 'NA' ? (
                        <a href={application.studentGithubLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                          GitHub
                        </a>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {application.studentLinkedinLink && application.studentLinkedinLink !== 'NA' ? (
                        <a href={application.studentLinkedinLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                          LinkedIn
                        </a>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {application.studentCodechefLink && application.studentCodechefLink !== 'NA' ? (
                        <a href={application.studentCodechefLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                          CodeChef
                        </a>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {application.studentLeetcodeLink && application.studentLeetcodeLink !== 'NA' ? (
                        <a href={application.studentLeetcodeLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                          LeetCode
                        </a>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(application.status)}`}>
                        {getStatusLabel(application.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(application.appliedAt).toLocaleDateString('en-GB')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default ViewApplications;
