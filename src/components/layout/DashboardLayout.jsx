import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Heart, User, Menu, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function DashboardLayout({ children, active, user }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const navItems = [
    { name: 'Home', icon: Home, page: 'Home' },
    { name: 'Saved', icon: Heart, page: 'Saved' },
    { name: 'Profile', icon: User, page: 'Profile' },
  ];

  const initials = user?.first_name?.charAt(0)?.toUpperCase() || 'U';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to={createPageUrl('Home')} className="flex items-center gap-1">
            <span className="text-xl font-bold">
              <span className="text-orange-500">at</span>
              <span className="text-blue-900">College</span>
            </span>
          </Link>
          
          {/* Mobile Navigation - Always visible */}
          <div className="flex items-center gap-2">
            <Link 
              to={createPageUrl('Home')} 
              className={`p-2 rounded-lg transition-colors ${active === 'Home' ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-100'}`}
              title="Home"
            >
              <Home className="w-5 h-5" />
            </Link>
            <Link 
              to={createPageUrl('Saved')} 
              className={`p-2 rounded-lg transition-colors ${active === 'Saved' ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-100'}`}
              title="Saved"
            >
              <Heart className="w-5 h-5" />
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-gray-600" />
              ) : (
                <Menu className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>
        </div>
        
        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="border-t border-gray-100 bg-white">
            {/* User Info */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={user?.avatar_url} />
                  <AvatarFallback className="bg-orange-100 text-orange-600">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-gray-900">{user?.first_name || 'Student'}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
              </div>
            </div>
            
            <nav className="p-4 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    active === item.name
                      ? 'bg-orange-50 text-orange-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen fixed left-0 top-0 hidden md:block">
          <div className="p-6 border-b border-gray-200">
            <Link to={createPageUrl('Home')} className="flex items-center gap-1">
              <span className="text-xl font-bold">
                <span className="text-orange-500">at</span>
                <span className="text-blue-900">College</span>
              </span>
            </Link>
          </div>

          {/* User Info */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={user?.avatar_url} />
                <AvatarFallback className="bg-orange-100 text-orange-600">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-gray-900">{user?.first_name || 'Student'}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            </div>
          </div>

          <nav className="p-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  active === item.name
                    ? 'bg-orange-50 text-orange-600'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 md:ml-64 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

