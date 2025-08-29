import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, User, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { checkProfileCompletion, checkFacultyProfileCompletion, generateProfileNotificationMessage } from '../utils/profileUtils';
import { Link } from 'react-router-dom';

function NotificationDropdown() {
  const { currentUser, getUserData } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [profileNotification, setProfileNotification] = useState(null);
  const [userData, setUserData] = useState(null);
  const dropdownRef = useRef(null);

  // Fetch user data and check profile completion
  useEffect(() => {
    const fetchUserData = async () => {
      console.log('NotificationDropdown - useEffect triggered, currentUser:', currentUser);
      if (currentUser) {
        try {
          const data = await getUserData(currentUser.uid);
          console.log('NotificationDropdown - User data:', data);
          setUserData(data);
          
          // Check profile completion for both students and faculty
          if (data?.role === 'student') {
            console.log('NotificationDropdown - User is a student, checking profile completion');
            const { isComplete, missingFields } = checkProfileCompletion(data);
            console.log('NotificationDropdown - Profile check:', { isComplete, missingFields });
            
            if (!isComplete) {
              const message = generateProfileNotificationMessage(missingFields, 'student');
              console.log('NotificationDropdown - Setting student profile notification:', message);
              setProfileNotification({
                id: 'profile-incomplete',
                type: 'profile',
                message,
                createdAt: new Date(),
                priority: 'high'
              });
            } else {
              console.log('NotificationDropdown - Student profile is complete, clearing notification');
              setProfileNotification(null);
            }
          } else if (data?.role === 'faculty') {
            console.log('NotificationDropdown - User is faculty, checking profile completion');
            const { isComplete, missingFields } = checkFacultyProfileCompletion(data);
            console.log('NotificationDropdown - Faculty profile check:', { isComplete, missingFields });
            
            if (!isComplete) {
              const message = generateProfileNotificationMessage(missingFields, 'faculty');
              console.log('NotificationDropdown - Setting faculty profile notification:', message);
              setProfileNotification({
                id: 'profile-incomplete',
                type: 'profile',
                message,
                createdAt: new Date(),
                priority: 'high'
              });
            } else {
              console.log('NotificationDropdown - Faculty profile is complete, clearing notification');
              setProfileNotification(null);
            }
          } else {
            console.log('NotificationDropdown - Unknown user role:', data?.role);
          }
        } catch (error) {
          console.error('NotificationDropdown - Error fetching user data:', error);
        }
      } else {
        console.log('NotificationDropdown - No current user');
      }
    };

    fetchUserData();
  }, [currentUser, getUserData]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Combine profile notification with other notifications
  const allNotifications = profileNotification 
    ? [profileNotification, ...notifications]
    : notifications;

  const unreadCount = allNotifications.filter(n => !n.read).length;

  const handleNotificationClick = (notification) => {
    if (notification.type === 'profile') {
      // Navigate to appropriate profile page based on user role
      if (userData?.role === 'faculty') {
        window.location.href = '/faculty/profile';
      } else {
        window.location.href = '/student/profile';
      }
    }
  };

  const dismissProfileNotification = (e) => {
    e.stopPropagation();
    setProfileNotification(null);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative text-subtext hover:text-primary transition-colors p-2 rounded-lg hover:bg-gray-50"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-sm text-gray-500">{unreadCount} unread</span>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {allNotifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <Bell size={24} className="mx-auto mb-2 opacity-50" />
                <p>No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {allNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`flex-shrink-0 mt-1 ${
                        notification.type === 'profile' ? 'text-orange-500' : 'text-blue-500'
                      }`}>
                        {notification.type === 'profile' ? (
                          <AlertCircle size={16} />
                        ) : (
                          <Bell size={16} />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 leading-relaxed">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {notification.createdAt instanceof Date 
                            ? notification.createdAt.toLocaleDateString('en-GB')
                            : notification.createdAt?.toDate?.()?.toLocaleDateString('en-GB') || 'Just now'
                          }
                        </p>
                        {notification.type === 'profile' && (
                          <Link
                            to={userData?.role === 'faculty' ? '/faculty/profile' : '/student/profile'}
                            className="inline-block mt-2 text-xs text-primary hover:text-primary-dark font-medium"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Complete Profile →
                          </Link>
                        )}
                      </div>

                      {/* Dismiss button for profile notification */}
                      {notification.type === 'profile' && (
                        <button
                          onClick={dismissProfileNotification}
                          className="flex-shrink-0 text-gray-400 hover:text-gray-600 p-1"
                          title="Dismiss"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {allNotifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <button className="text-sm text-primary hover:text-primary-dark font-medium">
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationDropdown;
