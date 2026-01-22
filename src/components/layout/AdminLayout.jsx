import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { LayoutDashboard, Users, FileText, GraduationCap, Upload, ArrowLeft, Image } from 'lucide-react';

export default function AdminLayout({ children, active }) {
  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, page: 'AdminDashboard' },
    { name: 'Content', icon: FileText, page: 'AdminContent' },
    { name: 'Media', icon: Image, page: 'AdminMedia' },
    { name: 'Users', icon: Users, page: 'AdminUsers' },
    { name: 'Campuses', icon: GraduationCap, page: 'AdminCampuses' },
    { name: 'Batch Upload', icon: Upload, page: 'AdminBatchUpload' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen fixed left-0 top-0">
          <div className="p-6 border-b border-gray-200">
            <Link to={createPageUrl('Home')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
              <ArrowLeft className="w-4 h-4" />
              Back to App
            </Link>
            <h2 className="text-xl font-bold text-gray-900">Admin Panel</h2>
          </div>
          <nav className="p-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  active === item.name
                    ? 'bg-blue-50 text-blue-700'
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
        <main className="flex-1 ml-64 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

