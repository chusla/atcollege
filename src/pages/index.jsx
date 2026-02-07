import Layout from "./Layout.jsx";
import { AuthProvider } from "@/hooks/useAuth";
import { SearchProvider } from "@/contexts/SearchContext";
import GoogleMapsProvider from "@/components/maps/GoogleMapsProvider";
import ScrollToTop from "@/components/ScrollToTop";
import Admin from "./Admin";
import AdminBatchUpload from "./AdminBatchUpload";
import AdminCampuses from "./AdminCampuses";
import AdminContent from "./AdminContent";
import AdminDashboard from "./AdminDashboard";
import AdminMedia from "./AdminMedia";
import AdminSettings from "./AdminSettings";
import AdminUsers from "./AdminUsers";
import AdminPlacesImport from "./AdminPlacesImport";
import Detail from "./Detail";
import Events from "./Events";
import Groups from "./Groups";
import Home from "./Home";
import Landing from "./Landing";
import Opportunities from "./Opportunities";
import Places from "./Places";
import Profile from "./Profile";
import Saved from "./Saved";
import SelectCollege from "./SelectCollege";
import Onboarding from "./Onboarding";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    Admin: Admin,
    AdminBatchUpload: AdminBatchUpload,
    AdminCampuses: AdminCampuses,
    AdminContent: AdminContent,
    AdminDashboard: AdminDashboard,
    AdminMedia: AdminMedia,
    AdminSettings: AdminSettings,
    AdminUsers: AdminUsers,
    AdminPlacesImport: AdminPlacesImport,
    Detail: Detail,
    Events: Events,
    Groups: Groups,
    Home: Home,
    Landing: Landing,
    Opportunities: Opportunities,
    Places: Places,
    Profile: Profile,
    Saved: Saved,
    SelectCollege: SelectCollege,
    Onboarding: Onboarding,
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || 'Landing';
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <>
            <ScrollToTop />
            <Layout currentPageName={currentPage}>
                <Routes>            
                <Route path="/" element={<Landing />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/adminbatchupload" element={<AdminBatchUpload />} />
                <Route path="/admincampuses" element={<AdminCampuses />} />
                <Route path="/admincontent" element={<AdminContent />} />
                <Route path="/admindashboard" element={<AdminDashboard />} />
                <Route path="/adminmedia" element={<AdminMedia />} />
                <Route path="/adminsettings" element={<AdminSettings />} />
                <Route path="/adminusers" element={<AdminUsers />} />
                <Route path="/adminplacesimport" element={<AdminPlacesImport />} />
                <Route path="/detail" element={<Detail />} />
                <Route path="/events" element={<Events />} />
                <Route path="/groups" element={<Groups />} />
                <Route path="/home" element={<Home />} />
                <Route path="/landing" element={<Landing />} />
                <Route path="/opportunities" element={<Opportunities />} />
                <Route path="/places" element={<Places />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/saved" element={<Saved />} />
                <Route path="/selectcollege" element={<SelectCollege />} />
                <Route path="/onboarding" element={<Onboarding />} />
                </Routes>
            </Layout>
        </>
    );
}

export default function Pages() {
    return (
        <AuthProvider>
            <SearchProvider>
                <GoogleMapsProvider>
                    <Router>
                        <PagesContent />
                    </Router>
                </GoogleMapsProvider>
            </SearchProvider>
        </AuthProvider>
    );
}

