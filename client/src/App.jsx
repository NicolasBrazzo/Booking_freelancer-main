import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Login } from "./pages/Login.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import { PrivateRoute } from "./api/components/PrivateRoute.jsx";
import { Loader } from "./components/Loader.jsx";
import { Dashboard } from "./pages/Dashboard.jsx";
import { Services } from "./pages/Services.jsx";
import { Availability } from "./pages/Availability.jsx";
import { Bookings } from "./pages/Bookings.jsx";
import { BookingDetails } from "./pages/BookingDetails.jsx";
import { Settings } from "./pages/Settings.jsx";
import { Appearance } from "./pages/Appearance.jsx";
import { BookingPublic } from "./pages/publicBooking.jsx/BookingPublic.jsx";
import { BookingDateTime } from "./pages/publicBooking.jsx/BookingDateTime.jsx";
import { BookingDetails as PublicBookingDetails } from "./pages/publicBooking.jsx/BookingDetails.jsx";
import { BookingConfirmation } from "./pages/publicBooking.jsx/BookingConfirmation.jsx";
import { AppLayout } from "./layouts/AppLayout.jsx";
import { ToastContainer } from "react-toastify";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CreateFreelanceProfile } from "./pages/CreateFreelanceProfile.jsx";
import { HomePage } from "./pages/HomePage.jsx";
import { EarlyAccess } from "./pages/EarlyAccess.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";

const queryClient = new QueryClient();

const ProfileCompleteRoute = () => {
  const { firstAccess, loading } = useAuth();
  if (loading) return <Loader />;
  if (firstAccess === true) return <Navigate to="/first-access" replace />;
  return <Outlet />;
};

function App() {
  return (
    <>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider>
            <ErrorBoundary>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/early-access" element={<EarlyAccess />} />
                <Route path="/home-v1" element={<HomePage />} />
                <Route path="/book/:code" element={<BookingPublic />} />
                <Route path="/book/:code/date" element={<BookingDateTime />} />
                <Route path="/book/:code/details" element={<PublicBookingDetails />} />
                <Route path="/book/:code/confirmation" element={<BookingConfirmation />} />
                <Route element={<PrivateRoute />}>
                  <Route
                    path="/first-access"
                    element={<CreateFreelanceProfile />}
                  />
                  <Route element={<ProfileCompleteRoute />}>
                    <Route element={<AppLayout />}>
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/services" element={<Services />} />
                      <Route path="/availability" element={<Availability />} />
                      <Route path="/bookings" element={<Bookings />} />
                      <Route path="/bookings/:id" element={<BookingDetails />} />
                      {/* <Route path="/appearance" element={<Appearance />} /> */}
                      <Route path="/settings" element={<Settings />} />
                    </Route>
                  </Route>
                </Route>
              </Routes>
            </BrowserRouter>
            </ErrorBoundary>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
      <ToastContainer />
    </>
  );
}

export default App;
