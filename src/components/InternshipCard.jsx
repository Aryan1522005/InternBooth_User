import { Link } from 'react-router-dom';
import { FaBuilding, FaCalendarAlt, FaClock, FaGraduationCap } from 'react-icons/fa';
import DomainTag from './DomainTag';
import { useAuth } from '../context/AuthContext';

const InternshipCard = ({ internship }) => {
  console.log('InternshipCard data:', internship);

  if (!internship) return null;

  const {
    id,
    title = '',
    companyName = '',
    description = '',
    domains = [],
    stipend = 0,
    duration = 0,
    applicationDeadline = new Date(),
    testDate = new Date(),
    firstRoundDate = new Date(),
    facultyName = '',
    facultyDepartment = '',
    facultyEmail = '',
    faculty = {}
  } = internship;

  const { photoURL, firstName, lastName } = faculty;
  const fullName = firstName && lastName ? `${firstName} ${lastName}` : facultyName;
  const initials = fullName
    ? fullName.split(' ').map(n => n[0]).join('').toUpperCase()
    : 'F';

  const safeDomains = Array.isArray(domains) ? domains : [];

  const { currentUser, getUserData, userRole } = useAuth();

  return (
    <div className="bg-white min-h-[300px] flex flex-col gap-3 sm:gap-4 rounded-lg border hover:border-primary transition-all duration-300 shadow-sm hover:shadow-md overflow-hidden">
      <div className="p-3 sm:p-4 flex flex-col gap-2 flex-grow">
        {/* Faculty name and company name*/}
        <div className="flex items-center gap-2 sm:gap-3">
          {photoURL ? (
            <img
              src={photoURL}
              alt={`${fullName}'s profile`}
              className="h-8 w-8 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <span className="text-gray-600 font-medium text-sm">{initials}</span>
            </div>
          )}
          <div className='flex flex-col flex-grow min-w-0'>
            <p className='text-text text-[16px] sm:text-[21px] font-regular truncate'>{title}</p>
            <p className='text-subtext text-[14px] sm:text-[18px] font-regular truncate'>{companyName}</p>
          </div>
        </div>

        {/*Posted By*/}
        <div className="flex-grow">
          <p className='text-subtext text-[14px] sm:text-[16px] font-regular truncate'>Posted By : {facultyName}</p>
        </div>

        <p className="text-gray-600 text-sm sm:text-base mb-2 sm:mb-4 line-clamp-2">{description}</p>

        {safeDomains.length > 0 && (
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-4">
            {safeDomains.map((domain, index) => (
              domain ? <DomainTag key={index} domain={domain} /> : null
            ))}
          </div>
        )}

        <div className='flex flex-row items-center justify-between gap-2 mt-auto'>
          <div className="flex items-center text-gray-600">
            <FaCalendarAlt className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">
              Deadline: {new Date(applicationDeadline).toLocaleDateString()}
            </span>
          </div>
          <div>
            <Link
              to={`/internships/${id}`}
              className="btn-primary block text-center text-sm sm:text-base px-3 py-1 sm:px-4 sm:py-2"
            >
              View Details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InternshipCard; 