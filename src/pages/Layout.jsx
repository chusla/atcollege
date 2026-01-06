import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/hooks/useAuth';
import { Home, Heart, User, Menu, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AddListingDialog from '../components/listings/AddListingDialog';
import AuthModal from '../components/auth/AuthModal';

export default function Layout({ children, currentPageName }) {
  const { isAuthenticated, getCurrentUser, signInWithGoogle, signInWithPassword, signUp, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAddListing, setShowAddListing] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  
  const user = getCurrentUser();

  // Pages that don't need the layout navigation
  const noNavPages = ['Landing', 'SelectCollege', 'Admin', 'Profile'];
  const showNav = !noNavPages.includes(currentPageName);

  const navItems = [
    { name: 'Home', icon: Home, page: 'Home' },
    { name: 'Saved', icon: Heart, page: 'Saved' },
    { name: 'Profile', icon: User, page: 'Profile' },
  ];

  const handleSignIn = () => {
    setAuthModalOpen(true);
  };

  // Public pages that don't need to wait for auth
  const publicPages = ['Landing', 'Events', 'Places', 'Opportunities', 'Groups'];
  const isPublicPage = publicPages.includes(currentPageName);

  // Only show loading spinner for protected pages, not public ones
  if (loading && !isPublicPage) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Auth Modal */}
      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        onGoogleSignIn={signInWithGoogle}
        onEmailSignIn={signInWithPassword}
        onEmailSignUp={signUp}
      />

      {/* Top Header */}
      {showNav && (
        <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link to={createPageUrl('Landing')} className="flex items-center gap-1">
                <span className="text-xl font-bold">
                  <span className="text-orange-500">at</span>
                  <span className="text-blue-900">College</span>
                </span>
                <span className="hidden sm:inline text-sm text-gray-500 ml-2">
                  Social Life in and Around Campus
                </span>
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      currentPageName === item.page
                        ? 'bg-orange-50 text-orange-600'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                ))}
              </nav>

              {/* Auth Button & Add Listing (Desktop) */}
              <div className="hidden md:flex items-center gap-3">
                {isAuthenticated() && (
                  <>
                    <Button
                      onClick={() => setShowAddListing(true)}
                      className="bg-black hover:bg-gray-800 text-white rounded-full px-6"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Listing
                    </Button>
                    {user?.role === 'admin' && (
                      <Link to={createPageUrl('Admin')}>
                        <Button
                          variant="outline"
                          className="rounded-full px-6"
                        >
                          Admin
                        </Button>
                      </Link>
                    )}
                  </>
                )}
                {!isAuthenticated() && (
                  <Button
                    onClick={handleSignIn}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6"
                  >
                    Sign up
                  </Button>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6 text-gray-600" />
                ) : (
                  <Menu className="w-6 h-6 text-gray-600" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-100 bg-white">
              <nav className="px-4 py-3 space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      currentPageName === item.page
                        ? 'bg-orange-50 text-orange-600'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                ))}
                {!isAuthenticated() && (
                  <Button
                    onClick={handleSignIn}
                    className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full"
                  >
                    Sign up
                  </Button>
                )}
              </nav>
            </div>
          )}
        </header>
      )}

      {/* Landing Page Header */}
      {currentPageName === 'Landing' && (
        <header className="absolute top-0 left-0 right-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-1">
                <span className="text-xl font-bold">
                  <span className="text-orange-500">at</span>
                  <span className="text-white">College</span>
                </span>
                <span className="hidden sm:inline text-sm text-white/80 ml-2">
                  Social Life in and Around Campus
                </span>
              </div>
              {isAuthenticated() ? (
                <div className="flex items-center gap-3">
                  <Link to={createPageUrl('Home')}>
                    <Button className="bg-white/20 hover:bg-white/30 text-white rounded-full px-6 backdrop-blur-sm">
                      Go to Home
                    </Button>
                  </Link>
                  <Link to={createPageUrl('Profile')}>
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      {user?.avatar_url ? (
                        <img src={user.avatar_url} alt="Profile" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-white" />
                      )}
                    </div>
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleSignIn}
                    variant="ghost"
                    className="text-white hover:bg-white/10 rounded-full px-6"
                  >
                    Sign in
                  </Button>
                  <Button
                    onClick={handleSignIn}
                    className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-6"
                  >
                    Sign up
                  </Button>
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main>{children}</main>

      {/* Add Listing Dialog */}
      <AddListingDialog 
        open={showAddListing} 
        onClose={() => setShowAddListing(false)}
        onSuccess={() => {
          setShowAddListing(false);
          window.location.reload();
        }}
      />

      {/* Mobile Bottom Navigation */}
      {showNav && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
          <div className="flex items-center justify-around py-2">
            {navItems.map((item) => (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                className={`flex flex-col items-center gap-1 px-4 py-2 ${
                  currentPageName === item.page
                    ? 'text-orange-500'
                    : 'text-gray-400'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.name}</span>
              </Link>
            ))}
          </div>
        </nav>
      )}

      {/* Bottom padding for mobile nav */}
      {showNav && <div className="md:hidden h-16"></div>}
    </div>
  );
}

