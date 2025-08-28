import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { FileText, Clock, CheckCircle, XCircle, HelpCircle } from 'lucide-react';

function Applications() {
  const { currentUser } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchApplications = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);
        setError('');

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
        
        console.log('Final applications data:', allApplications);
        setApplications(allApplications);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching applications:', err);
        setError('Failed to load applications');
        setLoading(false);
      }
    };

    fetchApplications();
  }, [currentUser]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
      case 'upcoming':
      case 'test_assigned':
      case 'test_assign':
      case 'test_in_progress':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'selected':
      case 'shortlisted':
      case 'test_approved':
      case 'form_approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
      case 'rejected_round1':
      case 'rejected_round2':
      case 'test_rejected':
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'quiz_completed':
      case 'test_completed':
        return <FileText className="h-5 w-5 text-purple-500" />;
      case 'form_submitted':
        return <FileText className="h-5 w-5 text-blue-500" />;
      default:
        return <HelpCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Application Under Review';
      case 'form_submitted':
        return 'Round 1 Form Submitted - Awaiting Review';
      case 'form_approved':
        return 'Round 1 Form Approved - Proceed to Round 2';
      case 'test_assigned':
      case 'test_assign':
        return 'Test Assigned - Ready to Start';
      case 'test_in_progress':
        return 'Test In Progress';
      case 'test_completed':
      case 'quiz_completed':
        return 'Test Completed - Pending Review';
      case 'test_approved':
        return 'Test Approved - Congratulations!';
      case 'test_rejected':
        return 'Test Not Passed';
      case 'selected':
        return 'Congratulations! You are Selected';
      case 'rejected':
      case 'rejected_round1':
      case 'rejected_round2':
        return 'Application Not Selected';
      default:
        return 'Status Unknown';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Applications</h1>

      {applications.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">You haven't applied to any internships yet.</p>
          <Link
            to="/internships"
            className="btn-primary"
          >
            Browse Internships
          </Link>
        </div>
      ) : (
        <div className="grid gap-6">
          {applications.map((application) => (
            <div
              key={application.id}
              className="bg-white rounded-lg shadow-md p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-2">
                    {application.internship?.title || application.internshipDetails?.title || 'Unknown Position'}
                  </h2>
                  <p className="text-gray-600 mb-2">
                    {application.internship?.companyName || application.internship?.company || application.internshipDetails?.companyName || 'Unknown Company'}
                  </p>
                  {application.internship?.departments && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {application.internship.departments.map((dept, index) => (
                        <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                          {dept}
                        </span>
                      ))}
                    </div>
                  )}
                  {application.internship?.domains && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {application.internship.domains.map((domain, index) => (
                        <span key={index} className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                          {domain}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <span>Applied on: {application.appliedAt?.toDate ? new Date(application.appliedAt.toDate()).toLocaleDateString('en-GB') : 'Date not available'}</span>
                    {application.currentRound && (
                      <span>• Round {application.currentRound}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  {getStatusIcon(application.status)}
                  <span className="text-sm font-medium">
                    {getStatusText(application.status)}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex flex-wrap gap-4">
                  <Link
                    to={`/internships/${application.internship?.id || application.internshipId || 'details'}`}
                    className="btn-outline-info btn-sm"
                  >
                    View Internship
                  </Link>
                  
                  {/* Form access for Round 1 */}
                  {(application.status === 'pending' || application.status === 'form_pending') && 
                   !['rejected', 'rejected_round1', 'test_rejected'].includes(application.status) && (
                    <Link
                      to={`/internships/round1-form/${application.id}`}
                      className="btn-outline-success btn-sm"
                    >
                      Complete Round 1 Form
                    </Link>
                  )}
                  
                  {/* Test access when assigned */}
                  {application.hasAssignedTest && 
                   !['round2_pending_form', 'test_approved', 'test_rejected', 'rejected_round1', 'rejected', 'selected', 'quiz_completed', 'test_completed'].includes(application.status) && (
                    <Link
                      to={application.progress ? `/student/applications/${application.id}/resume-quiz` : `/student/quiz/${application.id}`}
                      className="btn-outline-info btn-sm"
                    >
                      {application.progress ? 'Resume Test' : 'Access Test'}
                    </Link>
                  )}
                  
                  {/* Round 2 form access */}
                  {application.status === 'test_approved' && (
                    <Link
                      to={`/internships/round2-form/${application.id}`}
                      className="btn-outline-success btn-sm"
                    >
                      Complete Round 2 Form
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Applications;
