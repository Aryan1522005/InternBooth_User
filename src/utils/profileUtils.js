/**
 * Utility functions for profile completion checking
 */

/**
 * Check if a student's profile is complete based on required fields
 * @param {Object} userData - The student's data from Firestore
 * @returns {Object} - { isComplete: boolean, missingFields: string[] }
 */
export const checkProfileCompletion = (userData) => {
  console.log('checkProfileCompletion - Input userData:', userData);
  
  if (!userData) {
    return { isComplete: false, missingFields: ['All profile information'] };
  }

  // Note: We always check actual field completion regardless of profileCompleted flag
  // This ensures notifications show when required fields are actually missing

  // Only check fields that are marked with * (required) in the profile form
  const requiredFields = [
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'email', label: 'Email' },
    { key: 'phoneNumber', label: 'Phone Number' },
    { key: 'department', label: 'Department' },
    { key: 'currentYear', label: 'Current Year' },
    { key: 'tenthPercentage', label: '10th Percentage' },
    { key: 'twelfthPercentage', label: '12th Percentage' },
    { key: 'cgpa', label: 'CGPA' },
    { key: 'passingYear', label: 'Passing Year' },
    { key: 'previousProjects', label: 'Previous Projects' },
    { key: 'githubLink', label: 'GitHub Profile Link' },
    { key: 'linkedinLink', label: 'LinkedIn Profile Link' },
    { key: 'cocubesScore', label: 'CoCubes Score' },
    { key: 'leetcodeLink', label: 'LeetCode Profile Link' },
    { key: 'codechefLink', label: 'CodeChef Profile Link' }
  ];

  const missingFields = [];

  requiredFields.forEach(({ key, label }) => {
    const value = userData[key];
    console.log(`checkProfileCompletion - Checking ${key}:`, value);
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      console.log(`checkProfileCompletion - Missing field: ${label}`);
      missingFields.push(label);
    }
  });

  // Check for phone number format (only if phone number field is not empty)
  if (userData.phoneNumber && !/^[0-9]{10}$/.test(userData.phoneNumber)) {
    if (!missingFields.includes('Phone Number')) {
      missingFields.push('Valid Phone Number (10 digits)');
    }
  }

  console.log('checkProfileCompletion - Final result:', { 
    isComplete: missingFields.length === 0, 
    missingFields,
    totalMissing: missingFields.length 
  });

  return {
    isComplete: missingFields.length === 0,
    missingFields
  };
};

/**
 * Check if a faculty's profile is complete based on required fields
 * @param {Object} userData - The faculty's data from Firestore
 * @returns {Object} - { isComplete: boolean, missingFields: string[] }
 */
export const checkFacultyProfileCompletion = (userData) => {
  console.log('checkFacultyProfileCompletion - Input userData:', userData);
  
  if (!userData) {
    return { isComplete: false, missingFields: ['All profile information'] };
  }

  // Required fields for faculty (marked with * in faculty profile form)
  const requiredFields = [
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'department', label: 'Department' },
    { key: 'designation', label: 'Designation' },
    { key: 'specialization', label: 'Specialization' },
    { key: 'experience', label: 'Years of Experience' },
    { key: 'qualifications', label: 'Qualifications' },
    { key: 'contactEmail', label: 'Contact Email' }
  ];

  const missingFields = [];

  requiredFields.forEach(({ key, label }) => {
    const value = userData[key];
    console.log(`checkFacultyProfileCompletion - Checking ${key}:`, value);
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      console.log(`checkFacultyProfileCompletion - Missing field: ${label}`);
      missingFields.push(label);
    }
  });

  console.log('checkFacultyProfileCompletion - Final result:', { 
    isComplete: missingFields.length === 0, 
    missingFields,
    totalMissing: missingFields.length 
  });

  return {
    isComplete: missingFields.length === 0,
    missingFields
  };
};

/**
 * Generate a profile completion notification message
 * @param {string[]} missingFields - Array of missing field labels
 * @param {string} userRole - User role ('student' or 'faculty')
 * @returns {string} - Notification message
 */
export const generateProfileNotificationMessage = (missingFields, userRole = 'student') => {
  if (missingFields.length === 0) {
    return null;
  }

  if (userRole === 'faculty') {
    return "Your profile is incomplete. Please complete it.";
  }

  const baseMessage = "Your profile is not complete. Please complete it to find better opportunities and connect with other people.";
  
  if (missingFields.length <= 3) {
    return `${baseMessage} Missing: ${missingFields.join(', ')}.`;
  }
  
  return `${baseMessage} You have ${missingFields.length} fields to complete.`;
};
