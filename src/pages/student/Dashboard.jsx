import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc, orderBy, limit, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { Bell, User, ClipboardList, ChevronRight, Trash2, GripVertical, Filter, CheckCircle, Award, XCircle, FileText, Clock, HelpCircle } from 'lucide-react';

function Dashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState(null);
  const [applications, setApplications] = useState([]);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [removedApplications, setRemovedApplications] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [recommendedCourses, setRecommendedCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAllApplications, setShowAllApplications] = useState(true);
  const [dragging, setDragging] = useState(null);
  const [draggedOver, setDraggedOver] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const applicationRefs = useRef({});

  const handleAcceptOffer = async (application) => {
    if (!currentUser || !application) return;

    try {
      // 1. Update the application status
      const appRef = doc(db, 'applications', application.id);
      await updateDoc(appRef, { status: 'offer_accepted' });

      // 2. Add the internship to the student's profile
      const studentDocRef = doc(db, 'students', currentUser.uid);
      const studentDoc = await getDoc(studentDocRef);

      if (studentDoc.exists()) {
        const studentData = studentDoc.data();
        const updatedInternships = studentData.internships || [];
        
        // Avoid adding duplicates
        if (!updatedInternships.some(intern => intern.internshipId === application.internshipId)) {
          updatedInternships.push({
            internshipId: application.internshipId,
            title: application.internshipDetails.title,
            companyName: application.internshipDetails.companyName,
            startDate: new Date(), // Or a more specific start date if available
            status: 'accepted'
          });

          await updateDoc(studentDocRef, { internships: updatedInternships });
        }
      }

      // Refresh dashboard data
      fetchDashboardData();

    } catch (error) {
      console.error("Error accepting offer:", error);
      setError("Failed to accept the offer. Please try again.");
    }
  };

  // Function to check if a test is assigned to an application and is valid to take
  const checkTestAssigned = async (applicationId, applicationStatus) => {
    try {
      console.log(`Checking test assignment for application ${applicationId} with status ${applicationStatus}`);
      
      // If application status is test_assigned, we know there's a test assigned
      if (applicationStatus === 'test_assigned' || applicationStatus === 'test_assign') {
        console.log('Application status indicates a test is assigned');
        return { hasTest: true, testId: null };
      }
      
      // If application is rejected or test was rejected, don't show the link
      if (applicationStatus === 'rejected' || applicationStatus === 'test_rejected') {
        console.log('Application is rejected, no test link needed');
        return { hasTest: false, testId: null };
      }
      
      // If test was already completed, don't show the link
      if (applicationStatus === 'test_completed' || applicationStatus === 'quiz_completed') {
        console.log('Test already completed, no test link needed');
        return { hasTest: false, testId: null };
      }
      
      // Query the testsAssigned collection for this application
      console.log(`Querying testsAssigned collection for application ${applicationId}`);
      const testsAssignedQuery = query(
        collection(db, 'testsAssigned'),
        where('applicationId', '==', applicationId)
      );
      
      const testsAssignedSnapshot = await getDocs(testsAssignedQuery);
      console.log(`Found ${testsAssignedSnapshot.size} test assignments`);
      
      // Log all test assignments for debugging
      testsAssignedSnapshot.forEach(doc => {
        console.log('Test assignment:', doc.id, doc.data());
      });
      
      // Check if any of the tests are in the 'assigned' status
      let hasAssignedTest = false;
      let assignedTestId = null;
      
      testsAssignedSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.status === 'assigned') {
          hasAssignedTest = true;
          assignedTestId = doc.id;
          console.log('Found an assigned test:', doc.id);
        }
      });
      
      return { hasTest: hasAssignedTest, testId: assignedTestId };
    } catch (error) {
      console.error('Error checking for assigned tests:', error);
      return { hasTest: false, testId: null };
    }
  };
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);
        setError('');

        // Load removed applications from localStorage
        const storedRemovedApplications = localStorage.getItem('removedApplications');
        if (storedRemovedApplications) {
          setRemovedApplications(JSON.parse(storedRemovedApplications));
        }

        // Fetch student data
        try {
          const studentDoc = await getDoc(doc(db, 'students', currentUser.uid));
          if (studentDoc.exists()) {
            setStudentData(studentDoc.data());
          }
        } catch (err) {
          console.error('Error fetching student data:', err);
          // Continue with other fetches
        }

        // Fetch student's applications from both top-level collection and subcollections
        try {
          console.log('Fetching applications for user ID:', currentUser.uid);
          
          // First, get all internships to check their subcollections
          const internshipsQuery = query(collection(db, 'internships'));
          const internshipsSnapshot = await getDocs(internshipsQuery);
          
          let allApplications = [];
          
          // For each internship, check if there are applications for this student in the subcollection
          const internshipPromises = internshipsSnapshot.docs.map(async (internshipDoc) => {
            const internshipId = internshipDoc.id;
            const internshipData = internshipDoc.data();
            
            // Query the subcollection for this student's applications
            const subCollectionQuery = query(
              collection(db, 'internships', internshipId, 'applications'),
              where('studentId', '==', currentUser.uid)
            );
            
            const subCollectionSnapshot = await getDocs(subCollectionQuery);
            
            // Process applications from subcollection
            const subCollectionApps = subCollectionSnapshot.docs.map(appDoc => {
              const appData = { id: appDoc.id, ...appDoc.data() };
              // Add internship data directly
              appData.internship = { id: internshipId, ...internshipData };
              // Flag that this came from subcollection
              appData.fromSubCollection = true;
              return appData;
            });
            
            return subCollectionApps;
          });
          
          // Wait for all internship subcollection queries to complete
          const internshipResults = await Promise.all(internshipPromises);
          
          // Flatten the array of arrays into a single array of applications
          const subCollectionApplications = internshipResults.flat();
          console.log('Applications from subcollections:', subCollectionApplications.length);
          
          // Also check the top-level applications collection for backward compatibility
          const topLevelQuery = query(
            collection(db, 'applications'),
            where('studentId', '==', currentUser.uid)
          );
          const topLevelSnapshot = await getDocs(topLevelQuery);
          
          // Process applications from top-level collection
          const topLevelPromises = topLevelSnapshot.docs.map(async (appDoc) => {
            const appData = { id: appDoc.id, ...appDoc.data() };
            
            // Fetch internship details for each application
            if (appData.internshipId) {
              try {
                const internshipDoc = await getDoc(doc(db, 'internships', appData.internshipId));
                if (internshipDoc.exists()) {
                  appData.internship = { id: internshipDoc.id, ...internshipDoc.data() };
                } else {
                  console.log('Internship document not found:', appData.internshipId);
                }
              } catch (err) {
                console.error('Error fetching internship details:', err);
                // Continue with partial data
              }
            }
            
            // Flag that this came from top-level collection
            appData.fromTopLevel = true;
            return appData;
          });
          
          const topLevelApplications = await Promise.all(topLevelPromises);
          console.log('Applications from top-level collection:', topLevelApplications.length);
          
          // Combine applications from both sources, prioritizing subcollection data
          // (in case the same application exists in both places)
          const subCollectionIds = new Set(subCollectionApplications.map(app => app.id));
          const uniqueTopLevelApps = topLevelApplications.filter(app => !subCollectionIds.has(app.id));
          
          allApplications = [...subCollectionApplications, ...uniqueTopLevelApps];
          
          // Process each application to check for assigned tests
          const processedApplicationsPromises = allApplications.map(async (appData) => {
            // Check if there's a test assigned to this application that can be taken
            try {
              const { hasTest, testId } = await checkTestAssigned(appData.id, appData.status);
              appData.hasAssignedTest = hasTest;
              appData.assignedTestId = testId;
              console.log(`Application ${appData.id} has valid test: ${hasTest}${testId ? `, Test ID: ${testId}` : ''}`);
            } catch (err) {
              console.error('Error checking for assigned test:', err);
              appData.hasAssignedTest = false;
              appData.assignedTestId = null;
            }
            
            return appData;
          });
          
          const processedApplications = await Promise.all(processedApplicationsPromises);
          console.log('Final applications data:', processedApplications);
          setApplications(processedApplications);
          setFilteredApplications(processedApplications);
        } catch (err) {
          console.error('Error fetching applications:', err);
          setApplications([]);
          setFilteredApplications([]);
        }

        // Fetch notifications - use try/catch to handle if collection doesn't exist
        try {
          // Check if 'notifications' collection exists
          const notificationsRef = collection(db, 'notifications');
          const notificationsQuery = query(
            notificationsRef,
            where('studentId', '==', currentUser.uid),
            orderBy('createdAt', 'desc'),
            limit(5)
          );
          const notificationsSnapshot = await getDocs(notificationsQuery);

          // Even if collection exists but is empty, this works
          setNotifications(
            notificationsSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }))
          );
        } catch (err) {
          console.error('Error fetching notifications:', err);
          // Provide fallback notifications if collection doesn't exist
          setNotifications([
            {
              id: 'welcome',
              message: "Welcome to Bridge Intern! Start exploring internship opportunities.",
              createdAt: { toDate: () => new Date() }
            }
          ]);
        }

        // Fetch recommended courses - use try/catch to handle if collection doesn't exist
        try {
          // Only try to fetch if we have student data with interests
          if (studentData?.interestedDomains?.length > 0) {
            const coursesRef = collection(db, 'courses');
            const coursesQuery = query(
              coursesRef,
              where('domains', 'array-contains-any', studentData.interestedDomains),
              limit(3)
            );
            const coursesSnapshot = await getDocs(coursesQuery);
            
            setRecommendedCourses(
              coursesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }))
            );
          } else {
            // If no interests or courses collection doesn't exist, use fallback data
            setRecommendedCourses([
              {
                id: 'course1',
                title: 'Web Development Bootcamp',
                platform: 'Udemy',
                level: 'Beginner',
                link: 'https://www.udemy.com/course/the-web-developer-bootcamp/'
              },
              {
                id: 'course2',
                title: 'Machine Learning Fundamentals',
                platform: 'Coursera',
                level: 'Intermediate',
                link: 'https://www.coursera.org/learn/machine-learning'
              },
              {
                id: 'course3',
                title: 'React for Beginners',
                platform: 'Udemy',
                level: 'Beginner',
                link: 'https://www.udemy.com/course/react-the-complete-guide-incl-redux/'
              }
            ]);
          }
        } catch (err) {
          console.error('Error fetching courses:', err);
          // Provide fallback courses if collection doesn't exist
          setRecommendedCourses([
            {
              id: 'course1',
              title: 'Web Development Bootcamp',
              platform: 'Udemy',
              level: 'Beginner',
              link: 'https://www.udemy.com/course/the-web-developer-bootcamp/'
            },
            {
              id: 'course2',
              title: 'Machine Learning Fundamentals',
              platform: 'Coursera',
              level: 'Intermediate',
              link: 'https://www.coursera.org/learn/machine-learning'
            },
            {
              id: 'course3',
              title: 'React for Beginners',
              platform: 'Udemy',
              level: 'Beginner',
              link: 'https://www.udemy.com/course/react-the-complete-guide-incl-redux/'
            }
          ]);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data');
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [currentUser, studentData?.interestedDomains]);

  // Save removed applications to localStorage whenever it changes
  useEffect(() => {
    if (removedApplications.length > 0) {
      localStorage.setItem('removedApplications', JSON.stringify(removedApplications));
    }
  }, [removedApplications]);

  // Filter applications based on status and removed applications
  useEffect(() => {
    if (applications.length > 0) {
      let filtered = [...applications];
      
      // Remove applications that are in the removedApplications list
      if (removedApplications.length > 0 && statusFilter !== 'all-including-hidden') {
        filtered = filtered.filter(app => 
          !removedApplications.some(removedApp => removedApp.id === app.id)
        );
      }
      
      // Filter by status
      if (statusFilter !== 'all' && statusFilter !== 'all-including-hidden') {
        filtered = filtered.filter(app => app.status === statusFilter);
      }
      
      setFilteredApplications(filtered);
    }
  }, [applications, removedApplications, statusFilter]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
      case 'upcoming':
      case 'test_assigned':
      case 'test_assign':
      case 'test_in_progress':
        return 'bg-blue-100 border-blue-200';
      case 'selected':
      case 'shortlisted':
      case 'test_approved':
      case 'form_approved':
        return 'bg-green-100 border-green-200';
      case 'rejected':
      case 'rejected_round1':
      case 'rejected_round2':
      case 'test_rejected':
      case 'failed':
        return 'bg-red-100 border-red-200';
      case 'quiz_completed':
      case 'test_completed':
        return 'bg-purple-100 border-purple-200';
      case 'form_submitted':
        return 'bg-blue-100 border-blue-200';
      default:
        return 'bg-gray-100 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'form_submitted':
        return <CheckCircle className="text-blue-500" />;
      case 'form_approved':
      case 'selected':
        return <CheckCircle className="text-green-500" />;
      case 'rejected':
      case 'form_rejected':
      case 'rejected_round1':
      case 'rejected_round2':
      case 'test_rejected':
        return <XCircle className="text-red-500" />;
      case 'test_assigned':
      case 'test_assign':
      case 'test_in_progress':
        return <FileText className="text-yellow-500" />;
      case 'quiz_completed':
      case 'test_completed':
        return <Clock className="text-purple-500" title="Quiz submitted and pending review" />;
      case 'pending':
      default:
        return <Clock className="text-yellow-500" />;
    }
  };

  const handleDragStart = (e, index) => {
    setDragging(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    setDraggedOver(index);
  };

  const handleDragEnd = () => {
    if (dragging !== null && draggedOver !== null) {
      const newApplications = [...applications];
      const draggedApplication = newApplications[dragging];
      newApplications.splice(dragging, 1);
      newApplications.splice(draggedOver, 0, draggedApplication);
      setApplications(newApplications);
      setFilteredApplications(newApplications);
    }
    setDragging(null);
    setDraggedOver(null);
  };

  const handleRemoveApplication = (e, applicationId) => {
    e.stopPropagation(); // Prevent event bubbling
    const removedApplication = applications.find(application => application.id === applicationId);
    setRemovedApplications(prev => [...prev, removedApplication]);
  };

  const handleRestoreAllApplications = () => {
    setRemovedApplications([]);
    localStorage.removeItem('removedApplications');
  };

  const handleStatusFilterChange = (e) => {
    const selectedStatus = e.target.value;
    setStatusFilter(selectedStatus);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-center">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-8">
          {error}
        </div>
      )}

      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gray-200 rounded-full overflow-hidden">
            {studentData?.photoURL ? (
              <img src={studentData.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary text-white text-2xl">
                {studentData?.firstName?.[0] || 'S'}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-semibold">
              Hello {studentData?.firstName} {studentData?.lastName}!
            </h1>
            <p className="text-gray-600">{studentData?.department}</p>
            <p className="text-gray-600">{studentData?.college}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* Round Status */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Round Status</h2>
            <p className="text-gray-600 mb-6">You're closer than you think. Drag to reorder applications.</p>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <Filter size={20} className="mr-2 text-gray-500" />
                <select 
                  value={statusFilter} 
                  onChange={handleStatusFilterChange} 
                  className="bg-white border border-gray-300 rounded-lg p-2"
                >
                  <option value="all">All</option>
                  <option value="all-including-hidden">All (including hidden)</option>
                  <option value="pending">Pending</option>
                  <option value="selected">Selected</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              {removedApplications.length > 0 && (
                <button 
                  onClick={handleRestoreAllApplications}
                  className="btn-outline-info btn-sm"
                  title="Restore all hidden applications"
                >
                  Show Hidden
                </button>
              )}
            </div>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {filteredApplications.length === 0 ? (
                <div className="border rounded-lg p-4 text-center text-gray-500">
                  No applications yet. Start applying to internships!
                </div>
              ) : (
                filteredApplications.map((application, index) => (
                  <div
                    key={application.id}
                    ref={(ref) => (applicationRefs.current[application.id] = ref)}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`border rounded-lg p-4 ${getStatusColor(application.status || 'pending')} transition-all duration-200 hover:shadow-md relative`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <div className="mr-2 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
                            <GripVertical size={20} />
                          </div>
                          <div>
                            <p className="font-medium">
                              {application.status === 'rejected' || application.status === 'rejected_round1' || application.status === 'rejected_round2' || application.status === 'test_rejected' ? 
                                `Did Not Qualify ${application.status.includes('round1') ? 'in Round 1' : 
                                                  application.status.includes('round2') ? 'in Round 2' : 
                                                  application.status === 'test_rejected' ? `in Round ${application.currentRound || 1} Test` : ''}` :
                               application.status === 'test_completed' || application.status === 'quiz_completed' ? 
                                `Round ${application.currentRound || 1} Test Submitted - Pending Review` :
                               !application.internship && !application.internshipDetails ? 'Internship Details Not Available' :
                               application.status === 'pending' ? 
                                `Test Date: ${new Date(application.internship?.testDate || application.internshipDetails?.testDate || new Date()).toLocaleDateString('en-GB')} at ${new Date(application.internship?.testDate || application.internshipDetails?.testDate || new Date()).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}` :
                               application.status === 'selected' ? 'Congratulations! You are Selected' :
                               application.status === 'test_approved' ? 
                                 `Round 2 (Quiz) Passed - Congratulations!` :
                               application.status === 'form_approved' ? 
                                 `Round 1 (Form) Passed - Proceed to Round 2 (Quiz)` :
                               application.status === 'form_submitted' ? 
                                 `Round 1 Form Submitted - Awaiting Review` :
                               application.status === 'form_pending' ? 
                                 `Please Complete Round 1 Form` :
                               application.status === 'test_assigned' || application.status === 'test_assign' || application.status === 'test_in_progress' ? 
                                <>
                                  Round {application.currentRound || 1} Test {' '}
                                  {application.status === 'test_in_progress' ? (
                                    <>
                                      In Progress - {' '}
                                      <Link 
                                        to={`/student/quiz/${application.id}`} 
                                        className="text-blue-600 hover:underline inline-flex items-center gap-1"
                                      >
                                        Resume Test
                                        <FileText className="h-4 w-4" />
                                      </Link>
                                      <p className="text-sm text-gray-500 mt-1">
                                        Last saved: {application.quizProgress?.lastUpdated ? new Date(application.quizProgress.lastUpdated.toDate()).toLocaleString() : 'N/A'}
                                      </p>
                                    </>
                                  ) : (
                                    <>
                                      Assigned - {' '}
                                      <Link 
                                        to={`/student/quiz/${application.id}`} 
                                        className="text-blue-600 hover:underline inline-flex items-center gap-1"
                                      >
                                        Start Test
                                        <FileText className="h-4 w-4" />
                                      </Link>
                                    </>
                                  )}
                                </> :
                               `Round ${application.currentRound || 1} Status: ${(application.status || 'pending').charAt(0).toUpperCase() + (application.status || 'pending').slice(1)}`}
                            </p>
                            
                            {/* Display feedback from rounds if available */}
                            {application.rounds && application.rounds.length > 0 && (
                              <div className="mt-3 space-y-3">
                                {application.rounds.map((round, idx) => (
                                  round.feedback && (
                                    <div key={idx} className={`p-3 rounded-md border ${
                                      round.status === 'passed' ? 'bg-green-50 border-green-200' : 
                                      round.status === 'failed' ? 'bg-red-50 border-red-200' : 
                                      'bg-gray-50 border-gray-200'
                                    }`}>
                                      <div className="flex items-center gap-2 mb-1">
                                        {round.status === 'passed' ? 
                                          <CheckCircle className="h-4 w-4 text-green-500" /> : 
                                          round.status === 'failed' ? 
                                          <XCircle className="h-4 w-4 text-red-500" /> : 
                                          <HelpCircle className="h-4 w-4 text-gray-500" />
                                        }
                                        <p className="font-medium text-sm">Round {round.roundNumber} {
                                          round.status === 'passed' ? 'Passed' : 
                                          round.status === 'failed' ? 'Not Passed' : 'Feedback'
                                        }</p>
                                      </div>
                                      <p className="whitespace-pre-wrap text-sm pl-6">{round.feedback}</p>
                                      {round.evaluatedAt && (
                                        <p className="text-xs text-gray-500 mt-2 pl-6">
                                          Evaluated on: {new Date(round.evaluatedAt.toDate ? round.evaluatedAt.toDate() : round.evaluatedAt).toLocaleString()}
                                        </p>
                                      )}
                                    </div>
                                  )
                                ))}
                              </div>
                            )}
                            <h3 className="text-lg font-semibold">{application.internship?.title || application.internshipDetails?.title || application.internshipDetails?.jobRole || 'Unknown Position'}</h3>
                            <p className="text-gray-600">{application.internship?.companyName || application.internshipDetails?.companyName || 'Unknown Company'}</p>
                            {application.status !== 'rejected' && !application.internship && !application.internshipDetails && (
                              <p className="text-yellow-600 text-sm mt-1">
                                (Internship details unavailable)
                              </p>
                            )}
                            {/* Test access button only when a test is assigned AND the application is not in a state where the test is no longer relevant */}
                            {application.hasAssignedTest && 
                             !['round2_pending_form', 'test_approved', 'test_rejected', 'rejected_round1', 'rejected', 'selected', 'quiz_completed', 'test_completed'].includes(application.status) ? (
                              <p className="text-blue-600 text-sm mt-1">
                                <Link to={application.progress ? `/student/applications/${application.id}/resume-quiz` : `/student/quiz/${application.id}`} className="hover:underline flex items-center">
                                  <FileText className="h-4 w-4 mr-1" />
                                  {application.progress ? 'Resume Test' : 'Access Test'}
                                </Link>
                              </p>
                            ) : null}
                            
                            {/* Form access for Round 1 */}
                            {(application.status === 'pending' || application.status === 'form_pending') && 
                             !['rejected', 'rejected_round1', 'test_rejected'].includes(application.status) ? (
                              <p className="text-green-600 text-sm mt-1 flex items-center">
                                <FileText className="h-4 w-4 mr-1" />
                                <Link to={`/internships/round1-form/${application.id}`} className="hover:underline">
                                  Complete Round 1 Form
                                </Link>
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span 
                          className="text-2xl mr-2 cursor-pointer" 
                          onClick={() => navigate(`/internships/${application.internshipId || 'details'}`)}
                        >
                          {getStatusIcon(application.status || 'pending')}
                        </span>
                        {application.status === 'selected' ? (
                          <button
                            onClick={() => handleAcceptOffer(application)}
                            className="btn-success btn-sm"
                          >
                            Accept Offer
                          </button>
                        ) : (
                          <button
                            onClick={(e) => handleRemoveApplication(e, application.id)}
                            className="btn-outline-danger btn-sm"
                            title="Remove from list"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div 
              onClick={() => navigate('/student/profile')}
              className="bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg p-6 cursor-pointer hover:from-primary-dark hover:to-primary transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg flex flex-col"
            >
              <User size={32} className="mb-4" />
              <h3 className="text-xl font-semibold mb-2">Edit Profile</h3>
              <p className="mb-4">Add your wins, big or small.</p>
              <div className="mt-auto">
                <ChevronRight size={24} />
              </div>
            </div>
            <div 
              onClick={() => navigate('/student/applications')}
              className="bg-gradient-to-r from-success to-success-dark text-white rounded-lg p-6 cursor-pointer hover:from-success-dark hover:to-success transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg flex flex-col"
            >
              <ClipboardList size={32} className="mb-4" />
              <h3 className="text-xl font-semibold mb-2">My Applications</h3>
              <p className="mb-4">Every application counts.</p>
              <div className="mt-auto">
                <ChevronRight size={24} />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          {/* Notifications */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Notification's</h2>
              <Bell size={20} />
            </div>
            <div className="space-y-4">
              {notifications.length === 0 ? (
                <p className="text-gray-500">No notifications yet.</p>
              ) : (
                notifications.map((notification) => (
                  <div key={notification.id} className="border-b pb-4 last:border-b-0 last:pb-0">
                    <p>{notification.message}</p>
                    <span className="text-sm text-gray-500">
                      {notification.createdAt?.toDate().toLocaleDateString('en-GB')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recommended Courses */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-2">Recommended Course's</h2>
            <p className="text-gray-600 mb-6">Grow Smarter, Not Harder</p>
            <div className="space-y-4">
              {recommendedCourses.length === 0 ? (
                <p className="text-gray-500">No course recommendations yet.</p>
              ) : (
                recommendedCourses.map((course) => (
                  <div key={course.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">{course.title}</h3>
                      <a 
                        href={course.link} 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#6366F1] hover:text-[#5558E6] text-sm"
                      >
                        View Course
                      </a>
                    </div>
                    {course.platform && (
                      <p className="text-sm text-gray-500 mt-1">
                        {course.platform} • {course.level}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;