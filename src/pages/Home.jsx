import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { Search } from 'lucide-react';
import InternshipCard from '../components/InternshipCard';

// Domain tag colors mapping
const DOMAIN_COLORS = {
  'VLSI': 'bg-[#EBF5FF] text-[#1E40AF]',
  'Embedded C': 'bg-[#FEE2E2] text-[#991B1B]',
  'Web Development': 'bg-[#DCFCE7] text-[#166534]',
  'Mobile Development': 'bg-[#F3E8FF] text-[#6B21A8]',
  'AI/ML': 'bg-[#FEF9C3] text-[#854D0E]',
  'Data Science': 'bg-[#E0E7FF] text-[#3730A3]',
  'Cloud Computing': 'bg-[#FCE7F3] text-[#9D174D]',
  'DevOps': 'bg-[#FFEDD5] text-[#9A3412]',
  'UI/UX Design': 'bg-[#CCFBF1] text-[#115E59]',
  'Cybersecurity': 'bg-[#FFE4E6] text-[#9F1239]'
};

function Home() {
  const [internships, setInternships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { currentUser, getUserData } = useAuth();
  const [userInterests, setUserInterests] = useState([]);
  const [userDepartment, setUserDepartment] = useState('');
  const [filterByInterests, setFilterByInterests] = useState(true);
  const [filterByDepartment, setFilterByDepartment] = useState(true);
  const [showAllInternships, setShowAllInternships] = useState(false);
  const [showExpiredInternships, setShowExpiredInternships] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('');
  const [appliedInternshipIds, setAppliedInternshipIds] = useState([]);

  useEffect(() => {
    async function fetchInternships() {
      try {
        setLoading(true);
        setError('');
        
        // Fetch current user's interests if logged in
        if (currentUser) {
          try {
            const userData = await getUserData(currentUser.uid);
            console.log('Raw user data:', userData);
            
            // Check both interestedDomains and interests fields
            const userDomains = userData?.interestedDomains || userData?.interests || [];
            const department = userData?.department || '';
            console.log('Extracted user domains:', userDomains);
            console.log('User department:', department);
            
            if (userDomains.length > 0) {
              setUserInterests(userDomains);
              setFilterByInterests(true);
              console.log('User interests set:', userDomains);
            } else {
              console.log('No user interests found');
              setFilterByInterests(false);
            }
            
            if (department) {
              setUserDepartment(department);
              setFilterByDepartment(true);
            } else {
              setFilterByDepartment(false);
            }
          } catch (userError) {
            console.error('Error fetching user data:', userError);
            setError('Error loading user preferences');
            setFilterByInterests(false); // Disable filtering if we can't get user interests
          }
        } else {
          console.log('No current user, showing all internships');
          setFilterByInterests(false);
        }
        
        // Fetch internships
        const internshipsRef = collection(db, 'internships');
        console.log('Fetching internships...');
        
        let internshipsQuery;
        try {
          internshipsQuery = query(internshipsRef, orderBy('postedDate', 'desc'));
          const querySnapshot = await getDocs(internshipsQuery);
          console.log('Raw internships fetched:', querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          
          // Fetch faculty data for each internship
          const internshipsWithFaculty = await Promise.all(
            querySnapshot.docs.map(async (docSnapshot) => {
              try {
                const internshipData = { id: docSnapshot.id, ...docSnapshot.data() };
                console.log('Raw internship data:', internshipData);
                
                // Ensure domains is always an array
                if (!internshipData.domains) {
                  internshipData.domains = [];
                } else if (!Array.isArray(internshipData.domains)) {
                  internshipData.domains = [internshipData.domains];
                }
                
                if (internshipData.facultyId) {
                  const facultyRef = doc(db, 'users', internshipData.facultyId);
                  const facultyDoc = await getDoc(facultyRef);
                  if (facultyDoc.exists()) {
                    internshipData.faculty = facultyDoc.data();
                  } else {
                    console.log('Faculty not found for:', internshipData.facultyId);
                  }
                }
                return internshipData;
              } catch (internshipError) {
                console.error('Error processing internship:', docSnapshot.id, internshipError);
                return null;
              }
            })
          );
          
          // Filter out any null values from failed internship processing
          const validInternships = internshipsWithFaculty.filter(Boolean);
          console.log('Final processed internships:', validInternships);
          
          setInternships(validInternships);
          setLoading(false);
          setError('');
        } catch (queryError) {
          console.error('Error executing internships query:', queryError);
          throw new Error('Failed to fetch internships list');
        }
      } catch (error) {
        console.error('Error in fetchInternships:', error);
        setError(error.message || 'Failed to load internships. Please try again later.');
        setLoading(false);
      }
    }
    
    fetchInternships();
  }, [currentUser, getUserData]);

  useEffect(() => {
    async function fetchAppliedInternships() {
      if (currentUser) {
        try {
          const applicationsQuery = query(
            collection(db, 'applications'),
            where('studentId', '==', currentUser.uid)
          );
          const applicationsSnapshot = await getDocs(applicationsQuery);
          const ids = applicationsSnapshot.docs.map(doc => doc.data().internshipId);
          setAppliedInternshipIds(ids);
        } catch (error) {
          console.error('Error fetching applied internships:', error);
        }
      } else {
        setAppliedInternshipIds([]);
      }
    }
    fetchAppliedInternships();
  }, [currentUser]);

  // Department mapping for internship filtering
  const DEPARTMENT_DOMAINS = {
    'Computer Science': [
      'Algorithms & Data Structures', 'Software Development', 'Database Systems',
      'Operating Systems', 'Computer Networks', 'Cybersecurity', 'Cloud Computing',
      'Artificial Intelligence', 'Machine Learning', 'Data Science',
      'Computer Graphics & AR/VR', 'Distributed Systems', 'Theory of Computation'
    ],
    'Information Technology': [
      'Web Development', 'Mobile App Development', 'Software Engineering',
      'Information Security', 'Cloud & DevOps', 'Big Data Analytics',
      'Database Management', 'IT Infrastructure & Networking',
      'E-commerce & ERP Systems', 'Human-Computer Interaction'
    ],
    'Electrical Engineering': [
      'Power Systems', 'Electrical Machines', 'Control Systems',
      'Power Electronics & Drives', 'Renewable Energy Systems',
      'High Voltage Engineering', 'Smart Grid & Energy Management',
      'Microgrids & Distributed Generation', 'Instrumentation & Measurement', 'Electromagnetics'
    ],
    'Electronics and Telecommunication': [
      'VLSI Design', 'Embedded Systems', 'Digital Signal Processing (DSP)',
      'Control Systems', 'Communication Systems (Wireless, Optical, Satellite)',
      'Antennas & Microwave Engineering', 'Internet of Things (IoT)',
      'Robotics & Automation', 'Nanoelectronics', 'Power Electronics'
    ],
    'Mechanical Engineering': [
      'Design Engineering', 'Thermal Engineering', 'Manufacturing & Production',
      'Mechatronics', 'CAD/CAM & Robotics', 'Fluid Mechanics & Hydraulics',
      'Automotive Engineering', 'Aerospace Engineering',
      'Energy Systems & Power Plants', 'Industrial Engineering'
    ],
    'Civil Engineering': [
      'Structural Engineering', 'Geotechnical Engineering', 'Transportation Engineering',
      'Environmental Engineering', 'Construction Management', 'Water Resources Engineering',
      'Surveying & Geoinformatics', 'Coastal & Offshore Engineering',
      'Urban Planning & Smart Cities', 'Earthquake Engineering'
    ],
    'Artificial Intelligence': [
      'Machine Learning', 'Deep Learning', 'Natural Language Processing (NLP)',
      'Computer Vision', 'Reinforcement Learning', 'Neural Networks',
      'AI in Robotics', 'Explainable AI', 'AI in Healthcare / Finance / IoT',
      'Data Mining & Knowledge Discovery'
    ]
  };

  // Filter internships based on search term, department, and deadline
  const filteredInternships = internships.filter(internship => {
    // Hide internships the student has already applied to (only when viewing department-specific)
    if (!showAllInternships && appliedInternshipIds.includes(internship.id)) {
      return false;
    }

    // Hide internships where application deadline has passed (unless showing expired)
    if (!showExpiredInternships && internship.firstRoundDate) {
      const deadline = new Date(internship.firstRoundDate);
      const now = new Date();
      if (deadline < now) {
        return false;
      }
    }

    // Search term matching
    const matchesSearch = !searchTerm || // if no search term, show all
      internship.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      internship.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      internship.domains?.some(domain => 
        domain?.toLowerCase().includes(searchTerm.toLowerCase())
      );

    // If showing all internships, only apply search filter
    if (showAllInternships) {
      return matchesSearch;
    }

    // Department-based filtering ONLY - no domain or interest filtering
    let matchesDepartment = true;
    if (filterByDepartment && userDepartment) {
      // Use the departments field exclusively
      if (internship.departments && internship.departments.length > 0) {
        matchesDepartment = internship.departments.includes(userDepartment);
      } else {
        // If no departments field, don't show the internship in department filter
        matchesDepartment = false;
      }
    }

    return matchesSearch && matchesDepartment;
  });

  // Log final filtered results
  console.log('Final filtered internships:', {
    total: internships.length,
    filtered: filteredInternships.length,
    internships: filteredInternships.map(i => ({
      id: i.id,
      title: i.title,
      domains: i.domains
    }))
  });

  return (
    <div className="min-h-screen flex flex-row bg-white ">
      {/* Search and Filters Section */}
      <div className="w-[25%] bg-background rounded-xl p-5">
          <div className="flex flex-col gap-5">
            <input
              type="text"
              placeholder="Search internships..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            
            {/* Department Toggle */}
            {userDepartment && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {showAllInternships ? 'All Internships' : `${userDepartment} Internships`}
                  </span>
                  <button
                    onClick={() => setShowAllInternships(!showAllInternships)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors w-32 ${
                      showAllInternships 
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                        : 'bg-primary text-white hover:bg-primary-dark'
                    }`}
                  >
                    {showAllInternships ? 'Show My Dept' : 'Show All'}
                  </button>
                </div>
                {showAllInternships && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> You can view all internships but can only apply to those where your department ({userDepartment}) is listed as a target department. 
                      Look for "Your domains match!" badges on internships that align with your interests.
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Expired Internships Toggle - Only show when viewing all internships */}
            {showAllInternships && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {showExpiredInternships ? 'Including Expired' : 'Active Only'}
                  </span>
                  <button
                    onClick={() => setShowExpiredInternships(!showExpiredInternships)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors w-32 ${
                      showExpiredInternships 
                        ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {showExpiredInternships ? 'Hide Expired' : 'Show Expired'}
                  </button>
                </div>
                {showExpiredInternships && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <p className="text-sm text-orange-800">
                      <strong>Note:</strong> Expired internships are shown for reference only. You cannot apply to internships past their deadline.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          
        </div>
      <div className="max-w-7xl   bg-white">
      <p className="text-text text-[20px] px-8">
            {(() => {
              const activeCount = filteredInternships.filter(internship => {
                if (!internship.firstRoundDate) return true;
                return new Date(internship.firstRoundDate) >= new Date();
              }).length;
              const expiredCount = filteredInternships.length - activeCount;
              
              let baseText = showAllInternships 
                ? 'All Internships'
                : userDepartment 
                  ? `${userDepartment} Internships`
                  : 'Internships';
              
              if (showExpiredInternships && expiredCount > 0) {
                return `${baseText} (${activeCount} Active, ${expiredCount} Expired)`;
              } else {
                return `${baseText} (${filteredInternships.length} Found)`;
              }
            })()}
          </p>
        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Internships Grid */}
        {loading ? (
          <div className="text-center py-8">
            <p>Loading internships...</p>
          </div>
        ) : (
          <>
            {filteredInternships.length === 0 && !loading && (
              <div className="text-center py-8 ">
                <p className="text-gray-600">No internships found matching your criteria.</p>
                {!showAllInternships && userDepartment && (
                  <button
                    onClick={() => setShowAllInternships(true)}
                    className="text-primary hover:underline mt-2"
                  >
                    Show all internships
                  </button>
                )}
              </div>
            )}
            <div className=" p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredInternships.map(internship => {
                // Check if student can apply to this internship (department-based only)
                const canApply = !showAllInternships || (() => {
                  if (!userDepartment) return true;
                  
                  // Use the departments field exclusively
                  if (internship.departments && internship.departments.length > 0) {
                    return internship.departments.includes(userDepartment);
                  }
                  
                  // If no departments field, don't allow application
                  return false;
                })();
                
                // Check if user's interests/domains match for informational purposes
                const hasMatchingDomains = (() => {
                  if (!userInterests || userInterests.length === 0 || !internship.domains || internship.domains.length === 0) {
                    return false;
                  }
                  
                  return userInterests.some(interest => {
                    const userInterest = interest?.toLowerCase().trim() || '';
                    return internship.domains.some(domain => {
                      const internshipDomain = domain?.toLowerCase().trim() || '';
                      return internshipDomain.includes(userInterest) || userInterest.includes(internshipDomain);
                    });
                  });
                })();
                
                return (
                  <div key={internship.id} className="relative">
                    <InternshipCard 
                      internship={internship} 
                      canApply={canApply}
                      showAllMode={showAllInternships}
                    />
                    {hasMatchingDomains && (
                      <div className="absolute top-2 right-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        Your domains match!
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Home; 