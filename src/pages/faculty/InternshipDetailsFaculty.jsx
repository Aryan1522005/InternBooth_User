import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import InternshipForm from '../../components/faculty/InternshipForm';

function InternshipDetailsFaculty() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [internship, setInternship] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    async function fetchInternship() {
      setLoading(true);
      setError('');
      try {
        const docRef = doc(db, 'internships', id);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          setError('Internship not found');
          setLoading(false);
          return;
        }
        setInternship({ id: docSnap.id, ...docSnap.data() });
      } catch (err) {
        setError('Failed to fetch internship details.');
      } finally {
        setLoading(false);
      }
    }
    fetchInternship();
  }, [id]);

  const handleEditSuccess = async (updatedData) => {
    // Update Firestore
    try {
      const docRef = doc(db, 'internships', id);
      await updateDoc(docRef, updatedData);
      setInternship(prev => ({ ...prev, ...updatedData }));
      setEditMode(false);
    } catch (err) {
      setError('Failed to update internship.');
    }
  };

  if (loading) {
    return <div className="w-11/12 md:w-3/4 mx-auto px-4 py-8"><p>Loading...</p></div>;
  }
  if (error) {
    return <div className="w-11/12 md:w-3/4 mx-auto px-4 py-8"><p className="text-red-600">{error}</p></div>;
  }
  if (!internship) {
    return <div className="w-11/12 md:w-3/4 mx-auto px-4 py-8"><p>Internship not found.</p></div>;
  }

  const handleEditClick = () => {
    navigate(`/faculty/internships/${internship.id}/edit`);
  };

  return (
    <div className="w-11/12 md:w-3/4 mx-auto px-4 py-8">
      <div className="mb-6">
        <Link to="/faculty/dashboard" className="text-primary hover:underline">&larr; Back to Dashboard</Link>
      </div>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">{internship.title}</h1>
          <button className="btn-primary" onClick={handleEditClick}>Edit</button>
        </div>
        <p className="text-gray-700 mb-2"><b>Company:</b> {internship.companyName}</p>
        <p className="text-gray-700 mb-2"><b>Job Role:</b> {internship.jobRole}</p>
        <p className="text-gray-700 mb-2"><b>Domains:</b> {Array.isArray(internship.domains) ? internship.domains.join(', ') : ''}</p>
        <p className="text-gray-700 mb-2"><b>Description:</b> {internship.description}</p>
        <p className="text-gray-700 mb-2"><b>Responsibilities:</b> {Array.isArray(internship.responsibilities) ? internship.responsibilities.join(', ') : internship.responsibilities}</p>
        <p className="text-gray-700 mb-2"><b>Skills:</b> {Array.isArray(internship.skills) ? internship.skills.join(', ') : ''}</p>
        <p className="text-gray-700 mb-2"><b>First Round Date:</b> {internship.firstRoundDate ? new Date(internship.firstRoundDate).toLocaleDateString('en-GB') + ' at ' + new Date(internship.firstRoundDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : ''}</p>
        <p className="text-gray-700 mb-2"><b>Test Date:</b> {internship.testDate ? new Date(internship.testDate).toLocaleDateString('en-GB') + ' at ' + new Date(internship.testDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : ''}</p>
        <p className="text-gray-700 mb-2"><b>Location:</b> {internship.location}</p>
        <p className="text-gray-700 mb-2"><b>Start Date:</b> {internship.startDate ? new Date(internship.startDate).toLocaleDateString('en-GB') : ''}</p>
        <p className="text-gray-700 mb-2"><b>Stipend:</b> {internship.stipend}</p>
      </div>
    </div>
  );
}

export default InternshipDetailsFaculty; 