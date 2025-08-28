import { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, where, orderBy, getDocs, getDoc, doc as firestoreDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';

function InternshipForm({ onSuccess, onCancel, initialData, editMode }) {
  const { currentUser, getUserData } = useAuth();
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [facultyData, setFacultyData] = useState(null);
  const [internshipForm, setInternshipForm] = useState({
    title: '',
    companyName: '',
    jobRole: '',
    departments: [],
    domains: [],
    description: '',
    responsibilities: '',
    skills: [],
    firstRoundDate: '',
    firstRoundTime: '',
    testDate: '',
    testTime: '',
    postedDate: new Date().toISOString().split('T')[0],
    location: '',
    startDate: '',
    stipend: '',
    officeHours: '',
    duration: '',
    facultyName: '',
    facultyDesignation: '',
    eligibilityType: 'cgpa',
    eligibilityMinCgpa: '',
    eligibilityMinPercentage: '',
    eligibilityAllowedYears: [],
    eligibilityNote: ''
  });

  // Department selection states
  const [showDepartmentsDropdown, setShowDepartmentsDropdown] = useState(false);
  const [departmentSearch, setDepartmentSearch] = useState('');

  // Domain selection states
  const [showDomainsDropdown, setShowDomainsDropdown] = useState(false);
  const [domainSearch, setDomainSearch] = useState('');

  // Skills selection states
  const [showSkillsDropdown, setShowSkillsDropdown] = useState(false);
  const [skillSearch, setSkillSearch] = useState('');

  const AVAILABLE_YEARS = ['First Year', 'Second Year', 'Third Year', 'Fourth Year'];

  // Available departments
  const AVAILABLE_DEPARTMENTS = [
    'Computer Science',
    'Information Technology',
    'Electrical Engineering',
    'Electronics and Telecommunication',
    'Mechanical Engineering',
    'Civil Engineering',
    'Artificial Intelligence'
  ];

  // Department-wise domains mapping
  const DEPARTMENT_DOMAINS = {
    'Computer Science': [
      'Algorithms & Data Structures',
      'Software Development',
      'Database Systems',
      'Operating Systems',
      'Computer Networks',
      'Cybersecurity',
      'Cloud Computing',
      'Artificial Intelligence',
      'Machine Learning',
      'Data Science',
      'Computer Graphics & AR/VR',
      'Distributed Systems',
      'Theory of Computation'
    ],
    'Information Technology': [
      'Web Development',
      'Mobile App Development',
      'Software Engineering',
      'Information Security',
      'Cloud & DevOps',
      'Big Data Analytics',
      'Database Management',
      'IT Infrastructure & Networking',
      'E-commerce & ERP Systems',
      'Human-Computer Interaction'
    ],
    'Electrical Engineering': [
      'Power Systems',
      'Electrical Machines',
      'Control Systems',
      'Power Electronics & Drives',
      'Renewable Energy Systems',
      'High Voltage Engineering',
      'Smart Grid & Energy Management',
      'Microgrids & Distributed Generation',
      'Instrumentation & Measurement',
      'Electromagnetics'
    ],
    'Electronics and Telecommunication': [
      'VLSI Design',
      'Embedded Systems',
      'Digital Signal Processing (DSP)',
      'Control Systems',
      'Communication Systems (Wireless, Optical, Satellite)',
      'Antennas & Microwave Engineering',
      'Internet of Things (IoT)',
      'Robotics & Automation',
      'Nanoelectronics',
      'Power Electronics'
    ],
    'Mechanical Engineering': [
      'Design Engineering',
      'Thermal Engineering',
      'Manufacturing & Production',
      'Mechatronics',
      'CAD/CAM & Robotics',
      'Fluid Mechanics & Hydraulics',
      'Automotive Engineering',
      'Aerospace Engineering',
      'Energy Systems & Power Plants',
      'Industrial Engineering'
    ],
    'Civil Engineering': [
      'Structural Engineering',
      'Geotechnical Engineering',
      'Transportation Engineering',
      'Environmental Engineering',
      'Construction Management',
      'Water Resources Engineering',
      'Surveying & Geoinformatics',
      'Coastal & Offshore Engineering',
      'Urban Planning & Smart Cities',
      'Earthquake Engineering'
    ],
    'Artificial Intelligence': [
      'Machine Learning',
      'Deep Learning',
      'Natural Language Processing (NLP)',
      'Computer Vision',
      'Reinforcement Learning',
      'Neural Networks',
      'AI in Robotics',
      'Explainable AI',
      'AI in Healthcare / Finance / IoT',
      'Data Mining & Knowledge Discovery'
    ]
  };

  // Get all available domains from all departments
  const getAllDomains = () => {
    const allDomains = new Set();
    Object.values(DEPARTMENT_DOMAINS).forEach(domains => {
      domains.forEach(domain => allDomains.add(domain));
    });
    return Array.from(allDomains).sort();
  };

  const AVAILABLE_DOMAINS = getAllDomains();

  // Available skills
  const AVAILABLE_SKILLS = [
    'JavaScript',
    'Python',
    'Java',
    'C++',
    'React',
    'Node.js',
    'HTML',
    'CSS',
    'SQL',
    'MongoDB',
    'Git',
    'Docker',
    'AWS',
    'Azure',
    'Machine Learning',
    'Data Analysis',
    'UI/UX Design',
    'Project Management',
    'Agile',
    'Communication'
  ];

  // Pre-fill form when editing
  useEffect(() => {
    if (editMode && initialData) {
      setInternshipForm({
        title: initialData.title || '',
        companyName: initialData.companyName || '',
        jobRole: initialData.jobRole || '',
        departments: Array.isArray(initialData.departments) ? initialData.departments : [],
        domains: Array.isArray(initialData.domains) ? initialData.domains : [],
        description: initialData.description || '',
        responsibilities: Array.isArray(initialData.responsibilities)
          ? initialData.responsibilities.join('\n')
          : (initialData.responsibilities || ''),
        skills: Array.isArray(initialData.skills) ? initialData.skills : [],
        firstRoundDate: initialData.firstRoundDate ? new Date(initialData.firstRoundDate).toISOString().split('T')[0] : '',
        firstRoundTime: initialData.firstRoundDate ? new Date(initialData.firstRoundDate).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' }) : '',
        testDate: initialData.testDate ? new Date(initialData.testDate).toISOString().split('T')[0] : '',
        testTime: initialData.testDate ? new Date(initialData.testDate).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' }) : '',
        postedDate: initialData.postedDate ? new Date(initialData.postedDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        location: initialData.location || '',
        startDate: initialData.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : '',
        stipend: initialData.stipend || '',
        officeHours: initialData.officeHours || '',
        duration: initialData.duration || '',
        facultyName: initialData.facultyName || '',
        facultyDesignation: initialData.facultyDesignation || '',
        eligibilityType: initialData.eligibilityCriteria?.type || 'cgpa',
        eligibilityMinCgpa: initialData.eligibilityCriteria?.minCgpa?.toString() || '',
        eligibilityMinPercentage: initialData.eligibilityCriteria?.minPercentage?.toString() || '',
        eligibilityAllowedYears: initialData.eligibilityCriteria?.allowedYears || [],
        eligibilityNote: initialData.eligibilityCriteria?.note || ''
      });
    }
  }, [editMode, initialData]);

  // Fetch faculty data on component mount
  useEffect(() => {
    async function fetchFacultyData() {
      if (currentUser) {
        try {
          const userData = await getUserData(currentUser.uid);
          setFacultyData(userData);
          
          // Update form with faculty data
          if (userData) {
            const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
            setInternshipForm(prev => ({
              ...prev,
              facultyName: fullName,
              facultyDesignation: userData.designation || ''
            }));
          }
        } catch (error) {
          console.error('Error fetching faculty data:', error);
        }
      }
    }
    
    fetchFacultyData();
  }, [currentUser, getUserData]);

  // Handle department selection
  const handleDepartmentSelect = (department) => {
    if (!internshipForm.departments.includes(department)) {
      setInternshipForm(prev => ({
        ...prev,
        departments: [...prev.departments, department]
      }));
    }
    setDepartmentSearch('');
    setShowDepartmentsDropdown(false);
  };

  // Handle department removal
  const handleRemoveDepartment = (departmentToRemove) => {
    setInternshipForm(prev => ({
      ...prev,
      departments: prev.departments.filter(dept => dept !== departmentToRemove)
    }));
  };

  // Handle domain selection
  const handleDomainSelect = (domain) => {
    if (!internshipForm.domains.includes(domain)) {
      setInternshipForm(prev => ({
        ...prev,
        domains: [...prev.domains, domain]
      }));
    }
    setDomainSearch('');
    setShowDomainsDropdown(false);
  };

  // Handle domain removal
  const handleRemoveDomain = (domainToRemove) => {
    setInternshipForm(prev => ({
      ...prev,
      domains: prev.domains.filter(domain => domain !== domainToRemove)
    }));
  };

  // Handle skill selection
  const handleSkillSelect = (skill) => {
    if (!internshipForm.skills.includes(skill)) {
      setInternshipForm(prev => ({
        ...prev,
        skills: [...prev.skills, skill]
      }));
    }
    setSkillSearch('');
    setShowSkillsDropdown(false);
  };

  // Handle skill removal
  const handleRemoveSkill = (skillToRemove) => {
    setInternshipForm(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };

  // References for dropdowns to detect outside clicks
  const departmentsDropdownRef = useRef(null);
  const domainsDropdownRef = useRef(null);
  const skillsDropdownRef = useRef(null);

  // Handle clicks outside dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (departmentsDropdownRef.current && !departmentsDropdownRef.current.contains(event.target)) {
        setShowDepartmentsDropdown(false);
      }
      if (domainsDropdownRef.current && !domainsDropdownRef.current.contains(event.target)) {
        setShowDomainsDropdown(false);
      }
      if (skillsDropdownRef.current && !skillsDropdownRef.current.contains(event.target)) {
        setShowSkillsDropdown(false);
      }
    }

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      // Clean up event listener
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter departments based on search
  const filteredDepartments = AVAILABLE_DEPARTMENTS.filter(dept =>
    dept.toLowerCase().includes(departmentSearch.toLowerCase()) &&
    !internshipForm.departments.includes(dept)
  );

  // Get prioritized domains based on selected departments
  const getPrioritizedDomains = () => {
    if (internshipForm.departments.length === 0) {
      return AVAILABLE_DOMAINS;
    }
    
    const prioritizedDomains = new Set();
    const otherDomains = new Set();
    
    // Add domains from selected departments first
    internshipForm.departments.forEach(dept => {
      if (DEPARTMENT_DOMAINS[dept]) {
        DEPARTMENT_DOMAINS[dept].forEach(domain => {
          prioritizedDomains.add(domain);
        });
      }
    });
    
    // Add remaining domains
    AVAILABLE_DOMAINS.forEach(domain => {
      if (!prioritizedDomains.has(domain)) {
        otherDomains.add(domain);
      }
    });
    
    return [...Array.from(prioritizedDomains), ...Array.from(otherDomains)];
  };

  // Filter domains based on search and prioritize by selected departments
  const filteredDomains = getPrioritizedDomains().filter(domain =>
    domain.toLowerCase().includes(domainSearch.toLowerCase()) &&
    !internshipForm.domains.includes(domain)
  );

  // Filter skills based on search
  const filteredSkills = AVAILABLE_SKILLS.filter(skill =>
    skill.toLowerCase().includes(skillSearch.toLowerCase()) &&
    !internshipForm.skills.includes(skill)
  );

  // Check if we should show "Add this department" option
  const showAddDepartmentOption = departmentSearch.trim() !== '' && 
    filteredDepartments.length === 0 && 
    !internshipForm.departments.includes(departmentSearch.trim());

  // Check if we should show "Add this domain" option
  const showAddDomainOption = domainSearch.trim() !== '' && 
    filteredDomains.length === 0 && 
    !internshipForm.domains.includes(domainSearch.trim());

  // Check if we should show "Add this skill" option
  const showAddSkillOption = skillSearch.trim() !== '' && 
    filteredSkills.length === 0 && 
    !internshipForm.skills.includes(skillSearch.trim());

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setInternshipForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const toggleAllowedYear = (year) => {
    setInternshipForm(prev => ({
      ...prev,
      eligibilityAllowedYears: prev.eligibilityAllowedYears.includes(year)
        ? prev.eligibilityAllowedYears.filter(y => y !== year)
        : [...prev.eligibilityAllowedYears, year]
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      setFormError('');
      
      // Enhanced validation
      const requiredFields = [
        'title', 
        'companyName', 
        'jobRole', 
        'description', 
        'responsibilities', 
        'firstRoundDate',
        'firstRoundTime', 
        'testDate',
        'testTime', 
        'location', 
        'startDate', 
        'stipend',
        'duration'
      ];
      
      for (const field of requiredFields) {
        if (!internshipForm[field] || internshipForm[field].trim() === '') {
          setFormError(`Please fill in the ${field.replace(/([A-Z])/g, ' $1').toLowerCase()} field`);
          setSubmitting(false);
          return;
        }
      }

      // Validate at least one department is selected
      if (internshipForm.departments.length === 0) {
        setFormError('Please select at least one department');
        setSubmitting(false);
        return;
      }

      // Validate at least one domain is selected
      if (internshipForm.domains.length === 0) {
        setFormError('Please select at least one domain');
        setSubmitting(false);
        return;
      }

      // Validate at least one skill is selected
      if (internshipForm.skills.length === 0) {
        setFormError('Please select at least one skill');
        setSubmitting(false);
        return;
      }

      // Eligibility validation
      if (internshipForm.eligibilityType === 'cgpa') {
        if (internshipForm.eligibilityMinCgpa !== '' && (Number(internshipForm.eligibilityMinCgpa) < 0 || Number(internshipForm.eligibilityMinCgpa) > 10)) {
          setFormError('Minimum CGPA must be between 0 and 10');
          setSubmitting(false);
          return;
        }
      } else if (internshipForm.eligibilityType === 'percentage') {
        if (internshipForm.eligibilityMinPercentage !== '' && (Number(internshipForm.eligibilityMinPercentage) < 0 || Number(internshipForm.eligibilityMinPercentage) > 100)) {
          setFormError('Minimum percentage must be between 0 and 100');
          setSubmitting(false);
          return;
        }
      }
      // No validation needed for 'none' eligibility type

      // Combine date and time for validation
      const firstRoundDateTime = new Date(`${internshipForm.firstRoundDate}T${internshipForm.firstRoundTime}`);
      const testDateTime = new Date(`${internshipForm.testDate}T${internshipForm.testTime}`);
      
      // Only validate that test date is not before the application deadline
      if (testDateTime < firstRoundDateTime) {
        setFormError('Test date and time cannot be before the application deadline');
        setSubmitting(false);
        return;
      }
      
      // Format responsibilities as array
      const responsibilities = internshipForm.responsibilities
        .split('\n')
        .map(item => item.trim())
        .filter(item => item !== '');

      if (responsibilities.length === 0) {
        setFormError('Please add at least one responsibility');
        setSubmitting(false);
        return;
      }
      
      // Format the data for Firestore
      const formattedData = {
        title: internshipForm.title.trim(),
        companyName: internshipForm.companyName.trim(),
        jobRole: internshipForm.jobRole.trim(),
        departments: internshipForm.departments,
        domains: internshipForm.domains,
        description: internshipForm.description.trim(),
        responsibilities: internshipForm.responsibilities.split('\n').filter(item => item.trim() !== ''),
        skills: internshipForm.skills,
        firstRoundDate: new Date(`${internshipForm.firstRoundDate}T${internshipForm.firstRoundTime}`).toISOString(),
        testDate: new Date(`${internshipForm.testDate}T${internshipForm.testTime}`).toISOString(),
        facultyId: currentUser.uid,
        facultyName: internshipForm.facultyName,
        facultyDesignation: internshipForm.facultyDesignation,
        postedDate: new Date().toISOString(),
        status: 'active',
        location: internshipForm.location.trim(),
        startDate: new Date(internshipForm.startDate).toISOString(),
        stipend: internshipForm.stipend.trim(),
        duration: internshipForm.duration.trim(),
        eligibilityCriteria: {
          type: internshipForm.eligibilityType,
          minCgpa: internshipForm.eligibilityType === 'cgpa' && internshipForm.eligibilityMinCgpa !== '' ? Number(internshipForm.eligibilityMinCgpa) : null,
          minPercentage: internshipForm.eligibilityType === 'percentage' && internshipForm.eligibilityMinPercentage !== '' ? Number(internshipForm.eligibilityMinPercentage) : null,
          allowedYears: internshipForm.eligibilityAllowedYears || [],
          note: internshipForm.eligibilityNote?.trim() || ''
        }
      };
      
      if (editMode && initialData && initialData.id) {
        // Use previous postedDate in edit mode
        formattedData.postedDate = initialData.postedDate || new Date().toISOString();
        // Update existing internship
        const docRef = firestoreDoc(db, 'internships', initialData.id);
        await updateDoc(docRef, formattedData);
        if (onSuccess) onSuccess(formattedData);
      } else {
        // Add postedDate only for new internships
        formattedData.postedDate = new Date().toISOString();
        // Only include office hours if it's not empty
        if (internshipForm.officeHours.trim()) {
          formattedData.officeHours = internshipForm.officeHours.trim();
        }
        // Add to Firestore
        const docRef = await addDoc(collection(db, 'internships'), formattedData);
        if (!docRef.id) {
          throw new Error('Failed to create internship document');
        }
        // Reset form
        setInternshipForm({
          title: '',
          companyName: '',
          jobRole: '',
          departments: [],
          domains: [],
          description: '',
          responsibilities: '',
          skills: [],
          firstRoundDate: '',
          firstRoundTime: '',
          testDate: '',
          testTime: '',
          postedDate: new Date().toISOString().split('T')[0],
          location: '',
          startDate: '',
          stipend: '',
          officeHours: '',
          duration: '',
          facultyName: '',
          facultyDesignation: '',
          eligibilityType: 'cgpa',
          eligibilityMinCgpa: '',
          eligibilityMinPercentage: '',
          eligibilityAllowedYears: [],
          eligibilityNote: ''
        });
        if (onSuccess) onSuccess();
      }
      setSubmitting(false);
    } catch (error) {
      console.error('Error creating/updating internship:', error);
      setFormError(error.message || 'Failed to create/update internship. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold">Post a New Internship</h3>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
      
      {formError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {formError}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="title">
              Internship Title*
            </label>
            <input
              id="title"
              name="title"
              type="text"
              className="input-field"
              value={internshipForm.title}
              onChange={handleInputChange}
              placeholder="e.g., Frontend Developer Intern"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="companyName">
              Company Name*
            </label>
            <input
              id="companyName"
              name="companyName"
              type="text"
              className="input-field"
              value={internshipForm.companyName}
              onChange={handleInputChange}
              placeholder="e.g., Acme Inc."
              required
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="jobRole">
              Job Role*
            </label>
            <input
              id="jobRole"
              name="jobRole"
              type="text"
              className="input-field"
              value={internshipForm.jobRole}
              onChange={handleInputChange}
              placeholder="e.g., Frontend Developer"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="departments">
              Target Departments* (Students from these departments can view this internship)
            </label>
            <div className="relative" ref={departmentsDropdownRef}>
              <div className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded min-h-[42px]">
                {internshipForm.departments.map(department => (
                  <span 
                    key={department}
                    className="inline-flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm"
                  >
                    {department}
                    <button
                      type="button"
                      onClick={() => handleRemoveDepartment(department)}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={departmentSearch}
                  onChange={(e) => {
                    setDepartmentSearch(e.target.value);
                    setShowDepartmentsDropdown(true);
                  }}
                  onFocus={() => setShowDepartmentsDropdown(true)}
                  placeholder={internshipForm.departments.length === 0 ? "Select Departments" : ""}
                  className="border-0 outline-none flex-grow min-w-[100px]"
                />
              </div>
              {showDepartmentsDropdown && (filteredDepartments.length > 0 || showAddDepartmentOption) && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto">
                  {filteredDepartments.map(department => (
                    <button
                      key={department}
                      type="button"
                      onClick={() => handleDepartmentSelect(department)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100"
                    >
                      {department}
                    </button>
                  ))}
                  {showAddDepartmentOption && (
                    <button
                      type="button"
                      onClick={() => handleDepartmentSelect(departmentSearch.trim())}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 text-primary font-medium"
                    >
                      + Add "{departmentSearch.trim()}"
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="domains">
              Domains* {internshipForm.departments.length > 0 && <span className="text-sm text-gray-500">(Domains from selected departments appear first)</span>}
            </label>
            <div className="relative" ref={domainsDropdownRef}>
              <div className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded min-h-[42px]">
                {internshipForm.domains.map(domain => (
                  <span 
                    key={domain}
                    className="inline-flex items-center bg-primary bg-opacity-10 text-primary px-2 py-1 rounded"
                  >
                    {domain}
                    <button
                      type="button"
                      onClick={() => handleRemoveDomain(domain)}
                      className="ml-1 text-primary hover:text-primary-dark"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={domainSearch}
                  onChange={(e) => {
                    setDomainSearch(e.target.value);
                    setShowDomainsDropdown(true);
                  }}
                  onFocus={() => setShowDomainsDropdown(true)}
                  placeholder={internshipForm.domains.length === 0 ? "Select Domains" : ""}
                  className="border-0 outline-none flex-grow min-w-[100px]"
                />
              </div>
              {showDomainsDropdown && (filteredDomains.length > 0 || showAddDomainOption) && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto">
                  {filteredDomains.map(domain => (
                    <button
                      key={domain}
                      type="button"
                      onClick={() => handleDomainSelect(domain)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100"
                    >
                      {domain}
                    </button>
                  ))}
                  {showAddDomainOption && (
                    <button
                      type="button"
                      onClick={() => handleDomainSelect(domainSearch.trim())}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 text-primary font-medium"
                    >
                      + Add "{domainSearch.trim()}"
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
            Description*
          </label>
          <textarea
            id="description"
            name="description"
            rows="4"
            className="input-field"
            value={internshipForm.description}
            onChange={handleInputChange}
            placeholder="Provide a detailed description of the internship opportunity..."
            required
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="responsibilities">
            Responsibilities* (One per line)
          </label>
          <textarea
            id="responsibilities"
            name="responsibilities"
            rows="4"
            className="input-field"
            value={internshipForm.responsibilities}
            onChange={handleInputChange}
            placeholder={`Enter responsibilities, one per line:\nDevelop responsive web applications\nCollaborate with design team\nImplement UI components`}
            required
          />
        </div>

        {/* Eligibility Criteria */}
        <div className="mb-6 p-4 border rounded-md bg-gray-50">
          <h4 className="text-md font-bold mb-3">Eligibility Criteria</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="block text-gray-700 text-sm font-bold mb-2">Mode</span>
              <div className="flex flex-wrap items-center gap-4">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="eligibilityType"
                    value="cgpa"
                    checked={internshipForm.eligibilityType === 'cgpa'}
                    onChange={handleInputChange}
                  />
                  <span>Minimum CGPA</span>
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="eligibilityType"
                    value="percentage"
                    checked={internshipForm.eligibilityType === 'percentage'}
                    onChange={handleInputChange}
                  />
                  <span>Overall Percentage</span>
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="eligibilityType"
                    value="none"
                    checked={internshipForm.eligibilityType === 'none'}
                    onChange={handleInputChange}
                  />
                  <span>No Eligibility Criteria</span>
                </label>
              </div>
            </div>
            {internshipForm.eligibilityType === 'cgpa' ? (
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="eligibilityMinCgpa">
                  Minimum CGPA
                </label>
                <input
                  id="eligibilityMinCgpa"
                  name="eligibilityMinCgpa"
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  className="input-field no-number-wheel"
                  value={internshipForm.eligibilityMinCgpa}
                  onChange={handleInputChange}
                  placeholder="e.g., 7.0"
                  onWheel={(e) => e.currentTarget.blur()}
                />
              </div>
            ) : internshipForm.eligibilityType === 'percentage' ? (
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="eligibilityMinPercentage">
                  Minimum Percentage (required in each of 10th, 12th, and CGPA×9.5)
                </label>
                <input
                  id="eligibilityMinPercentage"
                  name="eligibilityMinPercentage"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  className="input-field no-number-wheel"
                  value={internshipForm.eligibilityMinPercentage}
                  onChange={handleInputChange}
                  placeholder="e.g., 60"
                  onWheel={(e) => e.currentTarget.blur()}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-16">
                <span className="text-gray-500 text-sm italic">
                  No specific academic requirements - all students can apply
                </span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <span className="block text-gray-700 text-sm font-bold mb-2">Allowed Years</span>
              <div className="flex flex-wrap gap-3">
                {AVAILABLE_YEARS.map((year) => (
                  <label key={year} className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={internshipForm.eligibilityAllowedYears.includes(year)}
                      onChange={() => toggleAllowedYear(year)}
                    />
                    <span>{year}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="eligibilityNote">
                Additional Notes (visible to students)
              </label>
              <textarea
                id="eligibilityNote"
                name="eligibilityNote"
                rows="3"
                className="input-field"
                value={internshipForm.eligibilityNote}
                onChange={handleInputChange}
                placeholder="E.g., Only students with a CGPA of 7.0 or higher or overall percentage above 70 may apply."
              />
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="skills">
            Required Skills*
          </label>
          <div className="relative" ref={skillsDropdownRef}>
            <div className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded min-h-[42px]">
              {internshipForm.skills.map(skill => (
                <span 
                  key={skill}
                  className="inline-flex items-center bg-primary bg-opacity-10 text-primary px-2 py-1 rounded"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="ml-1 text-primary hover:text-primary-dark"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={skillSearch}
                onChange={(e) => {
                  setSkillSearch(e.target.value);
                  setShowSkillsDropdown(true);
                }}
                onFocus={() => setShowSkillsDropdown(true)}
                placeholder={internshipForm.skills.length === 0 ? "Select Skills" : ""}
                className="border-0 outline-none flex-grow min-w-[100px]"
              />
            </div>
            {showSkillsDropdown && (filteredSkills.length > 0 || showAddSkillOption) && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto">
                {filteredSkills.map(skill => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => handleSkillSelect(skill)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100"
                  >
                    {skill}
                  </button>
                ))}
                {showAddSkillOption && (
                  <button
                    type="button"
                    onClick={() => handleSkillSelect(skillSearch.trim())}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 text-primary font-medium"
                  >
                    + Add "{skillSearch.trim()}"
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="location">
              Location*
            </label>
            <input
              id="location"
              name="location"
              type="text"
              className="input-field"
              value={internshipForm.location}
              onChange={handleInputChange}
              placeholder="e.g., Remote, Bangalore, Mumbai"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="startDate">
              Start Date Of the Internship
            </label>
            <div className="relative">
              <input
                id="startDate"
                name="startDate"
                type="date"
                className="input-field cursor-pointer"
                value={internshipForm.startDate}
                onChange={handleInputChange}
                onClick={(e) => {
                  // Force the date picker to open when clicking anywhere in the field
                  e.target.showPicker();
                }}
                required
              />
              
            </div>
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="stipend">
              Stipend*
            </label>
            <input
              id="stipend"
              name="stipend"
              type="text"
              className="input-field"
              value={internshipForm.stipend}
              onChange={handleInputChange}
              placeholder="e.g., 5000 per month, Unpaid"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="duration">
              Duration (months)*
            </label>
            <input
              id="duration"
              name="duration"
              type="number"
              min="1"
              max="24"
              className="input-field no-number-wheel"
              value={internshipForm.duration}
              onChange={handleInputChange}
              placeholder="e.g., 3"
              required
              onWheel={(e) => e.currentTarget.blur()}
            />
          </div>
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Application Deadline*
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-600 text-xs font-medium mb-1" htmlFor="firstRoundDate">
                Date
              </label>
              <input
                id="firstRoundDate"
                name="firstRoundDate"
                type="date"
                className="input-field cursor-pointer"
                value={internshipForm.firstRoundDate}
                onChange={handleInputChange}
                min={new Date().toISOString().split('T')[0]}
                onClick={(e) => {
                  e.target.showPicker();
                }}
                required
              />
            </div>
            <div>
              <label className="block text-gray-600 text-xs font-medium mb-1" htmlFor="firstRoundTime">
                Time (12-hour format)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <select
                  name="firstRoundHour"
                  className="input-field text-sm"
                  value={internshipForm.firstRoundTime ? new Date(`2000-01-01T${internshipForm.firstRoundTime}`).getHours() % 12 || 12 : ''}
                  onChange={(e) => {
                    const hour = parseInt(e.target.value);
                    const currentTime = internshipForm.firstRoundTime || '12:00';
                    const [, minute] = currentTime.split(':');
                    const currentHour24 = internshipForm.firstRoundTime ? new Date(`2000-01-01T${internshipForm.firstRoundTime}`).getHours() : 0;
                    const isPM = currentHour24 >= 12;
                    const newHour24 = isPM ? (hour === 12 ? 12 : hour + 12) : (hour === 12 ? 0 : hour);
                    const newTime = `${newHour24.toString().padStart(2, '0')}:${minute || '00'}`;
                    setInternshipForm(prev => ({ ...prev, firstRoundTime: newTime }));
                  }}
                  required
                >
                  <option value="">Hour</option>
                  {[...Array(12)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
                <select
                  name="firstRoundMinute"
                  className="input-field text-sm"
                  value={internshipForm.firstRoundTime ? internshipForm.firstRoundTime.split(':')[1] : ''}
                  onChange={(e) => {
                    const minute = e.target.value;
                    const currentTime = internshipForm.firstRoundTime || '12:00';
                    const currentHour24 = internshipForm.firstRoundTime ? new Date(`2000-01-01T${internshipForm.firstRoundTime}`).getHours() : 12;
                    const newTime = `${currentHour24.toString().padStart(2, '0')}:${minute}`;
                    setInternshipForm(prev => ({ ...prev, firstRoundTime: newTime }));
                  }}
                  required
                >
                  <option value="">Min</option>
                  {[...Array(60)].map((_, i) => (
                    <option key={i} value={i.toString().padStart(2, '0')}>{i.toString().padStart(2, '0')}</option>
                  ))}
                </select>
                <select
                  name="firstRoundPeriod"
                  className="input-field text-sm"
                  value={internshipForm.firstRoundTime ? (new Date(`2000-01-01T${internshipForm.firstRoundTime}`).getHours() >= 12 ? 'PM' : 'AM') : ''}
                  onChange={(e) => {
                    const period = e.target.value;
                    const currentTime = internshipForm.firstRoundTime || '12:00';
                    const [hourStr, minute] = currentTime.split(':');
                    const currentHour12 = new Date(`2000-01-01T${currentTime}`).getHours() % 12 || 12;
                    const newHour24 = period === 'PM' ? (currentHour12 === 12 ? 12 : currentHour12 + 12) : (currentHour12 === 12 ? 0 : currentHour12);
                    const newTime = `${newHour24.toString().padStart(2, '0')}:${minute}`;
                    setInternshipForm(prev => ({ ...prev, firstRoundTime: newTime }));
                  }}
                  required
                >
                  <option value="">AM/PM</option>
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Test Date*
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-600 text-xs font-medium mb-1" htmlFor="testDate">
                Date
              </label>
              <input
                id="testDate"
                name="testDate"
                type="date"
                className="input-field cursor-pointer"
                value={internshipForm.testDate}
                onChange={handleInputChange}
                min={internshipForm.firstRoundDate || new Date().toISOString().split('T')[0]}
                onClick={(e) => {
                  e.target.showPicker();
                }}
                required
              />
            </div>
            <div>
              <label className="block text-gray-600 text-xs font-medium mb-1" htmlFor="testTime">
                Time (12-hour format)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <select
                  name="testHour"
                  className="input-field text-sm"
                  value={internshipForm.testTime ? new Date(`2000-01-01T${internshipForm.testTime}`).getHours() % 12 || 12 : ''}
                  onChange={(e) => {
                    const hour = parseInt(e.target.value);
                    const currentTime = internshipForm.testTime || '12:00';
                    const [, minute] = currentTime.split(':');
                    const currentHour24 = internshipForm.testTime ? new Date(`2000-01-01T${internshipForm.testTime}`).getHours() : 0;
                    const isPM = currentHour24 >= 12;
                    const newHour24 = isPM ? (hour === 12 ? 12 : hour + 12) : (hour === 12 ? 0 : hour);
                    const newTime = `${newHour24.toString().padStart(2, '0')}:${minute || '00'}`;
                    setInternshipForm(prev => ({ ...prev, testTime: newTime }));
                  }}
                  required
                >
                  <option value="">Hour</option>
                  {[...Array(12)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
                <select
                  name="testMinute"
                  className="input-field text-sm"
                  value={internshipForm.testTime ? internshipForm.testTime.split(':')[1] : ''}
                  onChange={(e) => {
                    const minute = e.target.value;
                    const currentTime = internshipForm.testTime || '12:00';
                    const currentHour24 = internshipForm.testTime ? new Date(`2000-01-01T${internshipForm.testTime}`).getHours() : 12;
                    const newTime = `${currentHour24.toString().padStart(2, '0')}:${minute}`;
                    setInternshipForm(prev => ({ ...prev, testTime: newTime }));
                  }}
                  required
                >
                  <option value="">Min</option>
                  {[...Array(60)].map((_, i) => (
                    <option key={i} value={i.toString().padStart(2, '0')}>{i.toString().padStart(2, '0')}</option>
                  ))}
                </select>
                <select
                  name="testPeriod"
                  className="input-field text-sm"
                  value={internshipForm.testTime ? (new Date(`2000-01-01T${internshipForm.testTime}`).getHours() >= 12 ? 'PM' : 'AM') : ''}
                  onChange={(e) => {
                    const period = e.target.value;
                    const currentTime = internshipForm.testTime || '12:00';
                    const [hourStr, minute] = currentTime.split(':');
                    const currentHour12 = new Date(`2000-01-01T${currentTime}`).getHours() % 12 || 12;
                    const newHour24 = period === 'PM' ? (currentHour12 === 12 ? 12 : currentHour12 + 12) : (currentHour12 === 12 ? 0 : currentHour12);
                    const newTime = `${newHour24.toString().padStart(2, '0')}:${minute}`;
                    setInternshipForm(prev => ({ ...prev, testTime: newTime }));
                  }}
                  required
                >
                  <option value="">AM/PM</option>
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-1">Test will be conducted on or after the application deadline</p>
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="officeHours">
            Office Hours (Optional)
          </label>
          <input
            id="officeHours"
            name="officeHours"
            type="text"
            className="input-field"
            value={internshipForm.officeHours}
            onChange={handleInputChange}
            placeholder="e.g., 9:00 AM - 5:00 PM IST"
          />
          <p className="text-sm text-gray-500 mt-1">
            Specify the working hours for this internship (if applicable)
          </p>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`${editMode ? 'btn-warning' : 'btn-success'} ${submitting ? 'btn-disabled' : ''}`}
            disabled={submitting}
          >
            {submitting ? (editMode ? 'Updating...' : 'Posting...') : (editMode ? 'Update Internship' : 'Post Internship')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default InternshipForm; 