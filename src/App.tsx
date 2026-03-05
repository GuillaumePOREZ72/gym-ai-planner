import Auth from "./pages/Auth"
import Home from "./pages/Home"
import Profile from "./pages/Profile"
import Account from "./pages/Account"
import Onboarding from "./pages/Onboarding"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import Navbar from "./components/layout/Navbar"
import { NeonAuthUIProvider } from '@neondatabase/neon-js/auth/react';
import { authClient } from "./lib/auth"
import { AuthProvider } from "./context/AuthContext"


function App() {

  return (
    <NeonAuthUIProvider authClient={authClient} defaultTheme="dark">
      <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col">
          <Navbar/>
          <main className="flex-1">
            <Routes>
              <Route index element={<Home />} />
              <Route path="onboarding/:pathname" element={<Onboarding />} />
              <Route path="profile" element={<Profile />} />
              <Route path="auth/:pathname" element={<Auth />} />
              <Route path="account" element={<Account />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
      </AuthProvider>
    </NeonAuthUIProvider>
  )
}

export default App
