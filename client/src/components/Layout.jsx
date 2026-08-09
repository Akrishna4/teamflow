import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, FolderKanban, LogOut, Bell } from 'lucide-react';
import axios from 'axios';
import { EVENTS } from '../constants/socketEvents';
import CommandPalette from "./CommandPalette";

export default function Layout({ children }) {
  const { user, token, logout } = useContext(AuthContext);
  const socket = useContext(SocketContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (!user || !token) return;

    // ── Fetch initial notifications ──────────────────────────
    const fetchNotifications = async () => {
      try {
        const res = await axios.get('/notifications');
        setNotifications(res.data.notifications);
      } catch (error) {
        console.error('Failed to fetch notifications', error);
      }
    };
    fetchNotifications();
  }, [user, token]);

  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification) => {
      setNotifications((prev) => [notification, ...prev]);
    };

    socket.on(EVENTS.NOTIFICATION_CREATED, handleNewNotification);

    return () => {
      socket.off(EVENTS.NOTIFICATION_CREATED, handleNewNotification);
    };
  }, [socket]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = async () => {
    try {
      await axios.put('/notifications/mark-all-read');
      setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Close notification dropdown when navigating
  useEffect(() => {
    setShowNotifications(false);
  }, [location.pathname]);

  const navLinks = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/projects', icon: FolderKanban, label: 'Projects' },
    { to: '/my-tasks', icon: CheckSquare, label: 'My Tasks' },
    ...(user?.role === 'Admin' ? [{ to: '/tasks', icon: CheckSquare, label: 'All Tasks' }] : []),
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex selection:bg-blue-500 selection:text-white relative">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-slate-200 hidden md:flex md:flex-col shadow-sm z-20">
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
            TeamFlow
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto py-6">
          <nav className="px-4 space-y-1">
            {navLinks.map(({ to, icon: Icon, label }) => {
              const isActive = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'
                  }`}
                >
                  <Icon
                    className={`mr-3 h-5 w-5 ${
                      isActive ? 'text-blue-600' : 'text-slate-400'
                    }`}
                  />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50/50">
          <div className="flex items-center mb-4">
            <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold shadow-sm">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {user?.name}
              </p>
              <p className="text-xs text-slate-500">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2.5 text-sm font-medium text-rose-600 rounded-xl hover:bg-rose-50 transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5 text-rose-500" />
            Logout
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col relative bg-slate-50 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-end px-8 border-b border-slate-200 bg-white z-10">
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
              aria-label="Toggle notifications"
            >
              <Bell className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-2 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full" />
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                  <h3 className="font-bold text-slate-800">
                    Notifications
                    {unreadCount > 0 && (
                      <span className="ml-2 text-xs font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-sm">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n._id}
                        className={`p-4 border-b border-slate-50 transition-colors ${
                          n.isRead ? 'opacity-60 bg-white' : 'bg-blue-50/50'
                        }`}
                      >
                        <p className="text-sm text-slate-800 font-medium">
                          {n.message}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(n.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 relative z-0">
          {children}
        </main>
      </div>

      <CommandPalette />
    </div>
  );
}
