import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { collection, getDocs, getDoc, doc, addDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import DomainTag from '../../components/DomainTag';
import InternshipCard from '../../components/InternshipCard';

function InternshipDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, getUserData, userRole } = useAuth();
  const [internship, setInternship] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [userData, setUserData] = useState(null);
  const [otherInternships, setOtherInternships] = useState([]);
  const [loadingOthers, setLoadingOthers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [appliedInternshipIds, setAppliedInternshipIds] = useState([]);
  const [departmentMismatch, setDepartmentMismatch] = useState(false);

  // Reset states when component unmounts or id changes
  useEffect(() => {
    return () => {
      setInternship(null);
      setLoading(true);
      setError('');
    };
  }, [id]);

  // Main internship data fetching
  useEffect(() => {
    async function fetchInternshipData() {
      if (!id) return;

      setLoading(true);
      setError('');
      
      try {
        const internshipDoc = await getDoc(doc(db, 'internships', id));
        if (!internshipDoc.exists()) {
          throw new Error('Internship not found');
        }

        const internshipData = { id: internshipDoc.id, ...internshipDoc.data() };
        
        // Check if application deadline has passed for students
        if (internshipData.firstRoundDate && userRole === 'student') {
          const deadline = new Date(internshipData.firstRoundDate);
          const now = new Date();
          if (deadline < now) {
            throw new Error('This internship application deadline has passed and is no longer available');
          }
        }
        
        setInternship(internshipData);
      } catch (error) {
        console.error('Error fetching internship:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    fetchInternshipData();
  }, [id, userRole]);

  // Fetch user data to evaluate eligibility
  useEffect(() => {
    async function fetchUser() {
      if (!currentUser || userRole !== 'student') {
        setUserData(null);
        return;
      }
      try {
        const data = await getUserData(currentUser.uid);
        setUserData(data || null);
      } catch (e) {
        console.error('Failed to load user data', e);
      }
    }
    fetchUser();
  }, [currentUser, userRole, getUserData]);

  // Fetch other internships
  useEffect(() => {
    async function fetchOtherInternships() {
      if (!id) return;
      
      try {
        const internshipsQuery = query(
          collection(db, 'internships'),
          orderBy('postedDate', 'desc'),
          limit(10) // Fetch more to have options after filtering
        );

        const querySnapshot = await getDocs(internshipsQuery);
        let internships = querySnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter(internship => internship.id !== id);

        // Filter out internships with expired deadlines
        internships = internships.filter(internship => {
          if (internship.firstRoundDate) {
            const deadline = new Date(internship.firstRoundDate);
            const now = new Date();
            return deadline >= now;
          }
          return true; // Keep internships without deadline specified
        });

        // Filter by student's department if user data is available
        if (userData && userData.department) {
          const userDepartment = userData.department;
          internships = internships.filter(internship => {
            // Use the departments field if available (primary method)
            if (internship.departments && internship.departments.length > 0) {
              return internship.departments.includes(userDepartment);
            }
            
            // Fallback to domain-based matching for older internships
            const internshipDomains = internship.domains || [];
            
            // If no domains specified, don't show in department-specific recommendations
            if (internshipDomains.length === 0) {
              return false;
            }
            
            const departmentDomains = DEPARTMENT_DOMAINS[userDepartment];
            if (!departmentDomains) return false;
            
            return internshipDomains.some(domain => {
              const domainLower = domain?.toLowerCase().trim() || '';
              return departmentDomains.some(deptDomain => {
                const deptDomainLower = deptDomain.toLowerCase().trim();
                
                // Exact match first
                if (domainLower === deptDomainLower) return true;
                
                // Specific AI/ML terms should only match AI department
                if (domainLower.includes('artificial intelligence') || domainLower === 'ai') {
                  return userDepartment === 'Artificial Intelligence';
                }
                if (domainLower.includes('machine learning') || domainLower === 'ml') {
                  return userDepartment === 'Artificial Intelligence';
                }
                if (domainLower.includes('deep learning')) {
                  return userDepartment === 'Artificial Intelligence';
                }
                if (domainLower.includes('neural network')) {
                  return userDepartment === 'Artificial Intelligence';
                }
                if (domainLower.includes('computer vision')) {
                  return userDepartment === 'Artificial Intelligence';
                }
                if (domainLower.includes('natural language processing') || domainLower.includes('nlp')) {
                  return userDepartment === 'Artificial Intelligence';
                }
                
                // For non-AI departments, exclude AI terms to avoid false matches
                if (userDepartment !== 'Artificial Intelligence') {
                  if (domainLower.includes('artificial intelligence') || domainLower === 'ai' ||
                      domainLower.includes('machine learning') || domainLower === 'ml' ||
                      domainLower.includes('deep learning') ||
                      domainLower.includes('neural network') ||
                      domainLower.includes('computer vision') ||
                      domainLower.includes('natural language processing') || domainLower.includes('nlp')) {
                    return false;
                  }
                }
                
                // General fuzzy matching for other cases
                return deptDomainLower.includes(domainLower) || domainLower.includes(deptDomainLower);
              });
            });
          });
        }

        // Take only the first 3 after filtering
        setOtherInternships(internships.slice(0, 3));
      } catch (error) {
        console.error('Error fetching other internships:', error);
      } finally {
        setLoadingOthers(false);
      }
    }

    fetchOtherInternships();
  }, [id, userData]); // Add userData as dependency

  useEffect(() => {
    async function fetchAppliedInternships() {
      if (currentUser && userRole === 'student') {
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
  }, [currentUser, userRole]);

  useEffect(() => {
    if (appliedInternshipIds.includes(id)) {
      setHasApplied(true);
    } else {
      setHasApplied(false);
    }
  }, [appliedInternshipIds, id]);

  // Department mapping for validation
  const DEPARTMENT_DOMAINS = {
    'Computer Science': [
      'Algorithms & Data Structures', 'Software Development', 'Database Systems',
      'Operating Systems', 'Computer Networks', 'Cybersecurity', 'Cloud Computing',
      'Data Science', 'Computer Graphics & AR/VR', 'Distributed Systems', 'Theory of Computation'
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

  // Check department compatibility
  useEffect(() => {
    if (internship && userData && userData.department) {
      const userDepartment = userData.department;
      
      // Use the departments field if available (primary method)
      if (internship.departments && internship.departments.length > 0) {
        const isCompatible = internship.departments.includes(userDepartment);
        setDepartmentMismatch(!isCompatible);
        return;
      }
      
      // Fallback to domain-based matching for older internships
      const internshipDomains = internship.domains || [];
      
      // If no domains specified in internship, allow all departments
      if (internshipDomains.length === 0) {
        setDepartmentMismatch(false);
        return;
      }
      
      const departmentDomains = DEPARTMENT_DOMAINS[userDepartment];
      const isCompatible = internshipDomains.some(domain => {
        const domainLower = domain?.toLowerCase().trim() || '';
        return departmentDomains.some(deptDomain => {
          const deptDomainLower = deptDomain.toLowerCase().trim();
          
          // Exact match first
          if (domainLower === deptDomainLower) return true;
          
          // Specific AI/ML terms should only match AI department
          if (domainLower.includes('artificial intelligence') || domainLower === 'ai') {
            return userDepartment === 'Artificial Intelligence';
          }
          if (domainLower.includes('machine learning') || domainLower === 'ml') {
            return userDepartment === 'Artificial Intelligence';
          }
          if (domainLower.includes('deep learning')) {
            return userDepartment === 'Artificial Intelligence';
          }
          if (domainLower.includes('neural network')) {
            return userDepartment === 'Artificial Intelligence';
          }
          if (domainLower.includes('computer vision')) {
            return userDepartment === 'Artificial Intelligence';
          }
          if (domainLower.includes('natural language processing') || domainLower.includes('nlp')) {
            return userDepartment === 'Artificial Intelligence';
          }
          
          // For non-AI departments, exclude AI terms to avoid false matches
          if (userDepartment !== 'Artificial Intelligence') {
            if (domainLower.includes('artificial intelligence') || domainLower === 'ai' ||
                domainLower.includes('machine learning') || domainLower === 'ml' ||
                domainLower.includes('deep learning') ||
                domainLower.includes('neural network') ||
                domainLower.includes('computer vision') ||
                domainLower.includes('natural language processing') || domainLower.includes('nlp')) {
              return false;
            }
          }
          
          // General fuzzy matching for other cases
          return deptDomainLower.includes(domainLower) || domainLower.includes(deptDomainLower);
        });
      });
      
      setDepartmentMismatch(!isCompatible);
    } else {
      setDepartmentMismatch(false);
    }
  }, [internship, userData]);

  const isEligible = (() => {
    if (!internship) return true; // default allow viewing
    const crit = internship.eligibilityCriteria || {};
    const type = crit.type || 'cgpa';
    const minCgpa = typeof crit.minCgpa === 'number' ? crit.minCgpa : null;
    const minPercentage = typeof crit.minPercentage === 'number' ? crit.minPercentage : null;
    const allowedYears = Array.isArray(crit.allowedYears) ? crit.allowedYears : [];

    if (!userData || userRole !== 'student') return true; // don't block non-students here

    const userCgpa = Number(userData.cgpa);
    const userYear = userData.currentYear;
    const tenth = Number(userData.tenthPercentage);
    const twelfth = Number(userData.twelfthPercentage);

    if (allowedYears.length > 0 && userYear && !allowedYears.includes(userYear)) return false;

    if (type === 'percentage') {
      // Require all three components to be present and >= minPercentage
      if (minPercentage === null) return true;
      if (Number.isNaN(tenth) || Number.isNaN(twelfth) || Number.isNaN(userCgpa)) return false;
      const cgpaPercent = userCgpa * 9.5;
      if (tenth < minPercentage) return false;
      if (twelfth < minPercentage) return false;
      if (cgpaPercent < minPercentage) return false;
      return true;
    }

    // default cgpa-based
    if (minCgpa !== null && !Number.isNaN(userCgpa) && userCgpa < minCgpa) return false;
    return true;
  })();

  const handleApply = async () => {
    if (submitting) return; // Prevent double submit
    setSubmitting(true);
    if (!currentUser) {
      navigate('/login', { state: { from: `/internships/${id}` } });
      setSubmitting(false);
      return;
    }
    
    if (userRole !== 'student') {
      setError('Only students can apply for internships');
      setSubmitting(false);
      return;
    }

    if (!isEligible) {
      setError('You are not eligible to apply for this internship based on the eligibility criteria.');
      setSubmitting(false);
      return;
    }

    if (departmentMismatch) {
      setError(`You cannot apply to this internship as it doesn't match your department (${userData?.department || 'Unknown'}). This internship is specifically for: ${internship?.domains?.join(', ') || 'Not specified'}.`);
      setSubmitting(false);
      return;
    }

    try {
      // Validate internship data
      if (!internship) {
        throw new Error('Internship data not available');
      }

      // Get user data if not already available
      let studentData = userData;
      if (!studentData) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          studentData = userDoc.data();
        }
      }

      // Create initial application with pending status
      const applicationData = {
        internshipId: id,
        studentId: currentUser.uid,
        studentName: studentData ? `${studentData.firstName || ''} ${studentData.lastName || ''}`.trim() : 'Student',
        studentEmail: currentUser.email,
        status: 'pending',
        appliedAt: new Date().toISOString(),
        internshipDetails: {
          title: internship.title || '',
          companyName: internship.companyName || '',
          domains: internship.domains || [],
          testDate: internship.testDate ? new Date(internship.testDate).toISOString() : null,
          firstRoundDate: internship.firstRoundDate ? new Date(internship.firstRoundDate).toISOString() : null
        }
      };

      // Debug log before Firestore write
      console.log('Application data to be saved:', applicationData);

      // Validate required fields
      if (!applicationData.internshipId || !applicationData.studentId || !applicationData.internshipDetails.testDate) {
        throw new Error('Missing required application data');
      }

      try {
        const docRef = await addDoc(collection(db, 'applications'), applicationData);
        console.log('Application document created with ID:', docRef.id);
        if (!docRef.id) {
          throw new Error('Failed to create application document');
        }
      } catch (firestoreError) {
        console.error('Error creating application:', firestoreError);
        throw firestoreError;
      }

      // Show success message
      setSuccess(true);
      setHasApplied(true);
      
      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        navigate('/student/dashboard');
      }, 3000);
    } catch (error) {
      console.error('Error applying:', error);
      setError(error.message || 'Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Render the More For You section with safety checks
  const renderMoreForYou = () => {
    if (loadingOthers) {
      return (
        <div className="space-y-4">
          <p className="text-subtext text-sm">Loading opportunities...</p>
        </div>
      );
    }

    // Filter out internships the student has already applied to
    const filteredOtherInternships = otherInternships.filter(
      internship => !appliedInternshipIds.includes(internship.id)
    );

    if (!Array.isArray(filteredOtherInternships) || filteredOtherInternships.length === 0) {
      return (
        <div className="space-y-4">
          <p className="text-subtext text-sm">No other opportunities available.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {filteredOtherInternships.map(internship => (
          internship && internship.id ? (
            <InternshipCard 
              key={internship.id} 
              internship={internship}
            />
          ) : null
        ))}
      </div>
    );
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded-lg shadow-md text-center">
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto bg-primary rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-2">APPLIED SUCCESSFULLY</h2>
        <p className="text-gray-600 mb-4">
          You'll be notified about the First Round Soon!
        </p>
        <p className="text-sm text-gray-500">
          Redirecting to dashboard...
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-lg text-gray-600">Loading internship details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <Link to="/home" className="text-secondary hover:underline">
          &larr; Back to internships
        </Link>
      </div>
    );
  }

  if (!internship) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-center">Internship not found</p>
        <div className="text-center mt-4">
          <Link to="/home" className="text-secondary hover:underline">
            &larr; Back to internships
          </Link>
        </div>
      </div>
    );
  }

  const isApplicationOpen = internship.firstRoundDate ? new Date(internship.firstRoundDate) > new Date() : false;
  const safeDomains = Array.isArray(internship.domains) ? internship.domains : [];
  const crit = internship.eligibilityCriteria || {};

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 rounded-lg shadow-lg overflow-hidden min-h-screen p-4 lg:p-12">
      {/* Left Sidebar - More For You */}
      <div className="w-full lg:w-1/4 bg-background rounded-lg p-4 lg:p-6">
        <h2 className="text-xl font-bold mb-6">More For You</h2>
        {renderMoreForYou()}
      </div>
      
      {/* Main Content Container */}
      <div className="flex-1">
        {/* Content Area */}
        <div className="w-full bg-white rounded-xl flex flex-col lg:flex-row gap-4">
          {/* Main Content Section */}
          <div className="w-full lg:w-2/3 flex flex-col gap-8 border-b lg:border-b-0 lg:border-r-4 border-gray-200 p-4 lg:p-12">
              <div className="pb-5 border-gray-200 flex flex-col lg:flex-row items-start lg:items-center gap-3 lg:gap-5">
                <h1 className="text-2xl font-bold">{internship.title}</h1>
                <div className="flex flex-wrap gap-2">
                  {safeDomains.map((domain, index) => (
                    domain ? <DomainTag key={index} domain={domain} /> : null
                  ))}
                </div>
              </div>
              <div className='h-[3px] w-full bg-subtext opacity-30'></div>
              {/* About This Role */}
              <div className="mb-8">
                <h2 className="text-lg font-bold mb-2">About This Role:</h2>
                <p className="text-gray-700 text-justify">{internship.description}</p>
              </div>
              
              {/* Responsibilities */}
              <div className="mb-8">
                <h2 className="text-lg font-bold mb-2">Responsibilities:</h2>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  {Array.isArray(internship?.responsibilities) && internship.responsibilities.length > 0 ? (
                    internship.responsibilities.map((responsibility, index) => (
                      <li key={index}>{responsibility}</li>
                    ))
                  ) : (
                    <li>No specific responsibilities listed</li>
                  )}
                </ul>
              </div>

              {/* Eligibility Criteria */}
              <div className="mb-8">
                <h2 className="text-lg font-bold mb-2">Eligibility Criteria:</h2>
                {(crit.minCgpa || crit.minPercentage || (crit.allowedYears && crit.allowedYears.length > 0) || crit.note) ? (
                  <ul className="list-disc list-inside space-y-2 text-gray-700">
                    {crit.type === 'percentage' && typeof crit.minPercentage === 'number' && (
                      <li>Minimum Percentage: {crit.minPercentage}% in each of 10th, 12th, and CGPA×9.5</li>
                    )}
                    {(crit.type !== 'percentage' && typeof crit.minCgpa === 'number') && (
                      <li>Minimum CGPA: {crit.minCgpa}</li>
                    )}
                    {Array.isArray(crit.allowedYears) && crit.allowedYears.length > 0 && (
                      <li>Allowed Years: {crit.allowedYears.join(', ')}</li>
                    )}
                    {crit.note && (
                      <li>{crit.note}</li>
                    )}
                  </ul>
                ) : (
                  <p className="text-gray-600">No specific eligibility criteria mentioned.</p>
                )}
              </div>

              {/* Target Departments */}
              <div className="mb-8">
                <h2 className="text-lg font-bold mb-2">Target Departments:</h2>
                <div className="bg-blue-50 p-4 rounded-lg">
                  {safeDomains.length > 0 ? (
                    <div>
                      <p className="text-sm text-gray-700 mb-2">This internship is suitable for students from departments with expertise in:</p>
                      <div className="flex flex-wrap gap-2">
                        {(() => {
                          // Use the departments field from internship data if available
                          const targetDepartments = internship.departments || [];
                          
                          if (targetDepartments.length > 0) {
                            return targetDepartments.map(dept => (
                              <span key={dept} className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full font-medium">
                                {dept}
                              </span>
                            ));
                          }
                          
                          // Fallback to domain-based detection if no departments field
                          const targetDepts = new Set();
                          
                          safeDomains.forEach(domain => {
                            const domainLower = domain.toLowerCase().trim();
                            
                            // Direct mapping for specific domains
                            if (domainLower.includes('machine learning') || domainLower === 'ml') {
                              targetDepts.add('Artificial Intelligence');
                            }
                            else if (domainLower.includes('artificial intelligence') || domainLower === 'ai') {
                              targetDepts.add('Artificial Intelligence');
                            }
                            else if (domainLower.includes('deep learning')) {
                              targetDepts.add('Artificial Intelligence');
                            }
                            else if (domainLower.includes('neural network')) {
                              targetDepts.add('Artificial Intelligence');
                            }
                            else if (domainLower.includes('computer vision')) {
                              targetDepts.add('Artificial Intelligence');
                            }
                            else if (domainLower.includes('natural language processing') || domainLower.includes('nlp')) {
                              targetDepts.add('Artificial Intelligence');
                            }
                            else {
                              // For non-AI domains, check all other departments
                              Object.entries(DEPARTMENT_DOMAINS).forEach(([dept, domains]) => {
                                if (dept === 'Artificial Intelligence') return;
                                
                                const hasMatch = domains.some(d => {
                                  const deptDomainLower = d.toLowerCase().trim();
                                  return domainLower === deptDomainLower ||
                                         deptDomainLower.includes(domainLower) ||
                                         domainLower.includes(deptDomainLower);
                                });
                                
                                if (hasMatch) {
                                  targetDepts.add(dept);
                                }
                              });
                            }
                          });
                          
                          return Array.from(targetDepts).map(dept => (
                            <span key={dept} className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full font-medium">
                              {dept}
                            </span>
                          ));
                        })()
                        }
                      </div>
                      {userData?.department && (
                        <p className="text-xs text-gray-600 mt-2">
                          Your department: <span className="font-medium">{userData.department}</span>
                          {departmentMismatch ? 
                            <span className="text-red-600 ml-1">(Not compatible)</span> : 
                            <span className="text-green-600 ml-1">(Compatible)</span>
                          }
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-600 text-sm">Open to all departments - no specific domain requirements.</p>
                  )}
                </div>
              </div>

              {/* Required Skills */}
              <div className="mb-8">
                <h2 className="text-lg font-bold mb-2">Required Skills:</h2>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(internship?.skills) && internship.skills.length > 0 ? (
                    internship.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="bg-primary bg-opacity-10 text-primary text-sm px-3 py-1 rounded-full"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-600">No specific skills listed</span>
                  )}
                </div>
              </div>
          </div>

          {/* Right Sidebar Section */}
          <div className="w-full lg:w-1/3 p-4 lg:p-6">
            <div className="sticky top-6">
              {/* Company Info */}
              <div className="mb-6 flex flex-col gap-2">
                <h2 className="text-[21px] font-bold mb-2">{internship.companyName}</h2>
                <p className="text-[15px] font-medium text-text">
                  Posted on: {new Date(internship.postedDate).toLocaleDateString('en-GB')}
                </p>
                <p className="text-sm text-subtext">
                  Posted by: {internship?.facultyName || 'Faculty'}
                  {internship?.facultyDesignation && (
                    <>
                      <br />
                      ({internship.facultyDesignation})
                    </>
                  )}
                </p>
              </div>
              
              {/* Other Information */}
              <div className="mb-6 flex flex-col gap-2">
                <h2 className="text-[21px] font-bold mb-2">Other Information</h2>
                <p className="text-sm text-subtext mb-1">
                  Duration: {internship.duration || 'Not specified'} {internship.duration ? 'months' : ''}
                </p>
                <p className="text-sm text-subtext mb-1">
                  Location: {internship.location || 'Remote'}
                </p>
                <p className="text-sm text-subtext mb-1">
                  Start Date: {internship.startDate ? new Date(internship.startDate).toLocaleDateString('en-GB') : 'Not specified'}
                </p>
                <p className="text-sm text-subtext">
                  Stipend: {internship.stipend ? `₹${internship.stipend}` : 'Not specified'}
                </p>
              </div>
              
              {/* Application Process */}
              <div className="mb-6 flex flex-col gap-2">
                <h2 className="text-lg font-bold mb-2">Application Process</h2>
                <div className="bg-red-100 border border-red-300 rounded-lg p-3 mb-1">
                  <p className="text-sm text-red-800 font-medium">
                    Application Deadline: {new Date(internship.firstRoundDate).toLocaleDateString('en-GB')} at {new Date(internship.firstRoundDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  </p>
                </div>
                <p className="text-sm text-subtext mb-1">
                  Test Date: {internship.testDate ? new Date(internship.testDate).toLocaleDateString('en-GB') + ' at ' + new Date(internship.testDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : 'To be announced'}
                </p>
                <p className="text-sm text-subtext mb-1">First Round: Application</p>
                <p className="text-sm text-subtext mb-1">Second Round: Test</p>
              </div>
              
              {/* Apply Button or Status */}
              {hasApplied ? (
                <div className="bg-green-100 text-green-700 p-4 rounded-2xl">
                  <p>You have already applied to this internship.</p>
                  <Link to="/student/dashboard" className="text-primary hover:underline">
                    View your application status
                  </Link>
                </div>
              ) : (
                <>
                  {departmentMismatch && (
                    <div className="bg-red-100 text-red-800 p-4 rounded-2xl mb-3">
                      <p className="font-semibold mb-1">Department Mismatch</p>
                      <p className="text-sm">
                        This internship is not available for your department ({userData?.department || 'Unknown'}). 
                        You can view the details but cannot apply.
                      </p>
                    </div>
                  )}
                  {!isEligible && !departmentMismatch && (
                    <div className="bg-yellow-100 text-yellow-800 p-4 rounded-2xl mb-3">
                      You are not eligible to apply for this internship based on the eligibility criteria.
                    </div>
                  )}
                  <button
                    onClick={handleApply}
                    className={`w-full font-bold py-3 px-4 rounded-2xl ${
                      isEligible && !departmentMismatch 
                        ? 'bg-primary hover:bg-primary-dark text-white' 
                        : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                    }`}
                    disabled={submitting || !isEligible || departmentMismatch}
                  >
                    {submitting ? 'Applying...' : departmentMismatch ? 'CANNOT APPLY - DEPARTMENT MISMATCH' : 'APPLY'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InternshipDetails;