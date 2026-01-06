import Layout from "./Layout.jsx";
import { AuthProvider } from "@/hooks/useAuth";
import GoogleMapsProvider from "@/components/maps/GoogleMapsProvider";
import Admin from "./Admin";
import AdminBatchUpload from "./AdminBatchUpload";
import AdminCampuses from "./AdminCampuses";
import AdminContent from "./AdminContent";
import AdminDashboard from "./AdminDashboard";
import AdminUsers from "./AdminUsers";
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
    AdminUsers: AdminUsers,
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
        <Layout currentPageName={currentPage}>
            <Routes>            
                <Route path="/" element={<Landing />} />
                <Route path="/Admin" element={<Admin />} />
                <Route path="/AdminBatchUpload" element={<AdminBatchUpload />} />
                <Route path="/AdminCampuses" element={<AdminCampuses />} />
                <Route path="/AdminContent" element={<AdminContent />} />
                <Route path="/AdminDashboard" element={<AdminDashboard />} />
                <Route path="/AdminUsers" element={<AdminUsers />} />
                <Route path="/Detail" element={<Detail />} />
                <Route path="/Events" element={<Events />} />
                <Route path="/Groups" element={<Groups />} />
                <Route path="/Home" element={<Home />} />
                <Route path="/Landing" element={<Landing />} />
                <Route path="/Opportunities" element={<Opportunities />} />
                <Route path="/Places" element={<Places />} />
                <Route path="/Profile" element={<Profile />} />
                <Route path="/Saved" element={<Saved />} />
                <Route path="/SelectCollege" element={<SelectCollege />} />
                <Route path="/Onboarding" element={<Onboarding />} />
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <AuthProvider>
            <GoogleMapsProvider>
                <Router>
                    <PagesContent />
                </Router>
            </GoogleMapsProvider>
        </AuthProvider>
    );
}

