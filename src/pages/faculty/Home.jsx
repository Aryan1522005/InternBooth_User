import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';

function FacultyHome() {
  const { currentUser, getUserData } = useAuth();
  const [facultyData, setFacultyData] = useState(null);
  const [internships, setInternships] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchHomeData() {
      if (!currentUser) return;

      try {
        setLoading(true);
        setError('');

        // Get faculty data
        const user = await getUserData(currentUser.uid);
        setFacultyData(user);

        // Fetch faculty's internships
        const internshipsQuery = query(
          collection(db, 'internships'),
          where('facultyId', '==', currentUser.uid),
          orderBy('postedDate', 'desc')
        );
        
        const internshipsSnapshot = await getDocs(internshipsQuery);
        const internshipsData = internshipsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setInternships(internshipsData);

        // Fetch applications for faculty's internships
        const internshipIds = internshipsData.map(internship => internship.id);
        if (internshipIds.length > 0) {
          const applicationsData = [];
          for (const internshipId of internshipIds) {
            const applicationsQuery = query(
              collection(db, 'applications'),
              where('internshipId', '==', internshipId)
            );
            const applicationsSnapshot = await getDocs(applicationsQuery);
            applicationsSnapshot.docs.forEach(appDoc => {
              applicationsData.push({ id: appDoc.id, ...appDoc.data() });
            });
          }
          setApplications(applicationsData);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching home data:', error);
        setError('Failed to load data. Please try again later.');
        setLoading(false);
      }
    }

    fetchHomeData();
  }, [currentUser, getUserData]);

  if (loading) {
    return (
      <div className="w-11/12 md:w-3/4 mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-center">Loading...</p>
      </div>
    );
  }

  return (
    <div className="w-11/12 md:w-3/4 mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h1 className="text-2xl font-bold mb-2">
          Welcome, {facultyData?.firstName || 'Faculty'}!
        </h1>
        <p className="text-gray-600 mb-4">
          Manage your internship opportunities and student applications from your dashboard.
        </p>
        <Link
          to="/faculty/dashboard"
          className="inline-block bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Your Internships</h2>
          <p className="text-3xl font-bold text-primary mb-2">{internships.length}</p>
          <p className="text-gray-600">Active internship opportunities</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Applications</h2>
          <p className="text-3xl font-bold text-primary mb-2">{applications.length}</p>
          <p className="text-gray-600">Total student applications</p>
        </div>
      </div>

      {/* Recent Internships */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Internships</h2>
        {internships.length === 0 ? (
          <p className="text-gray-600">You haven't posted any internships yet.</p>
        ) : (
          <div className="space-y-4">
            {internships.slice(0, 3).map(internship => (
              <div key={internship.id} className="border-b border-gray-200 pb-4 last:border-0">
                <h3 className="text-lg font-medium">{internship.title}</h3>
                <p className="text-gray-600 text-sm mb-2">{internship.companyName}</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    Posted on {new Date(internship.postedDate).toLocaleDateString('en-GB')}
                  </span>
                  <Link
                    to={`/faculty/internships/${internship.id}`}
                    className="text-primary hover:underline text-sm"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default FacultyHome; 