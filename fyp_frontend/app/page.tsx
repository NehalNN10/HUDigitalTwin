"use client"; // Tells Next.js this component uses interactive client-side features (like state)

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import FormRow from "../components/FormRow";
import IntButton from "../components/IntButton";
import { Moon, Sun, User, Lock, Activity, Radar, Wind, Box } from "lucide-react";

export default function Login() {
  // React State to hold our form inputs and errors
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const router = useRouter();

  // Handle the form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevents the browser from refreshing the page
    setError(""); // Clear any previous errors

    try {
      // Send the login data to our backend API
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, password }),
      });

      if (response.ok) {
        const data = await response.json();

        document.cookie = `department=${data.department}; path=/`;
        
        // Next.js client-side routing based on department
        if (data.department === "Security") {
          router.push("/security_home");
        } else if (data.department === "Facilities") {
          router.push("/facility_home");
        } else {
          router.push("/dashboard");
        }
      } else {
        const errData = await response.json();
        setError(errData.error || "Login failed. Please check your credentials.");
      }
    } catch (err) {
      setError("An error occurred connecting to the server.");
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-mode');
      setIsDarkMode(true);
    }
  }, []);

  // ✨ ADD THIS: The function to handle the switch
  const toggleTheme = () => {
    const newIsDark = !isDarkMode;
    setIsDarkMode(newIsDark);
    
    if (newIsDark) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
      document.cookie = "department=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      window.location.href = '/'; 
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  };

  return (
    <>
      <div className="flex flex-row">
        {/* LEFT SIDE: Image + Hero Overlay */}
        <div className="relative bg-[var(--primary-color)] rounded-r-[1rem] rounded-l-0 h-screen w-3/5 overflow-hidden">
          
          {/* 1. Background Image */}
          <img 
            src="/media/login.jpeg" 
            alt="Login Background" 
            className="absolute inset-0 w-full h-full object-cover opacity-50" 
          />

          {/* 2. Gradient Overlay (Makes text readable against any image) */}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-color)]/50 via-[var(--bg-color)]/60 to-transparent"></div>

          {/* 3. Floating Content */}
          <div className="absolute inset-0 p-12 flex flex-col justify-between z-10">
            
            {/* Top Left: Faux Logo */}
            <div className="flex items-center gap-2 text-[var(--text-color)]/90">
              <Box className="text-[var(--primary-color)]" size={28} />
              <span className="text-xl font-bold tracking-widest uppercase">HU.Twin</span>
            </div>

            {/* Bottom Left: Hero Text & Badges */}
            <div className="max-w-xl mb-10">
              <h2 className="text-4xl! font-extrabold text-[var(--text-color)] mb-4 leading-tight">
                Habib University Digital Twin
              </h2>
              <p className="text-[var(--sub-text-color)] text-lg mb-8">
                Access live IoT telemetry, 3D spatial mapping, and predictive facility alerts from one centralized dashboard.
              </p>

              {/* Glassmorphism Feature Badges */}
              <div className="flex gap-3 flex-wrap">
                <span className="tracker-ui flex flex-row gap-3 py-3! items-center">
                  <Radar size={16} className="text-[var(--primary-color)]"/> Live Tracking
                </span>
                <span className="tracker-ui flex flex-row gap-3 py-3! items-center">
                  <Wind size={16} className="text-[var(--primary-color)]"/> HVAC Control
                </span>
                <span className="tracker-ui flex flex-row gap-3 py-3! items-center">
                  <Activity size={16} className="text-[var(--primary-color)]"/> System Alerts
                </span>
              </div>
            </div>

          </div>
        </div>
        <div className="w-2/5 h-screen flex flex-col items-center justify-center relative">
          <IntButton 
            icon={isDarkMode ? Moon : Sun} 
            label="Switch Theme" 
            onClick={toggleTheme} 
            classes={"btn-header btn-primary absolute top-8 right-8 z-200"} 
          />
          {/* Login Card */}
          <div className="w-full max-w-md p-10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] bg-[var(--surface-color)] border border-gray-200 dark:border-gray-800">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-14 h-14 bg-[var(--primary-color)]/20 text-[var(--primary-color)] rounded-xl flex items-center justify-center mb-4">
                <Activity size={32} />
              </div>
              <h1 className="text-3xl font-extrabold">Welcome Back</h1>
              <p className="text-[var(--sub-text-color)] mt-2 text-sm">
                Sign in with your staff credentials to access the HU Digital Twin.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-sm text-center font-semibold">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Username Input */}
              <div className="space-y-1">
                
                <label className="text-md font-semibold text-[var(--sub-text-color)] flex flex-row gap-2"> <User className="text-[var(--sub-text-color)]" size={20} /> Username / ID</label>
                <div className="relative flex items-center">
                  
                  <input 
                    type="text" 
                    value={userId} 
                    onChange={(e) => setUserId(e.target.value)} 
                    className="w-full text-[var(--sub-text-color)]"
                    placeholder="Enter your ID"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <label className="text-md font-semibold text-[var(--sub-text-color)] flex flex-row gap-2"> <Lock className="text-[var(--sub-text-color)]" size={20} /> Password</label>
                <div className="relative flex items-center">
                  <input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    className="w-full text-[var(--sub-text-color)]"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                className="btn-green btn-primary btn m-0! text-2xl"
              >
                Sign In
              </button>

            </form>
          </div>

          {/* Footer Area */}
          <div className="absolute bottom-6 text-xs text-[var(--sub-text-color)] font-medium tracking-wide">
            © 2026 HU Facilities • System v1.0.4
          </div>

        </div>
      </div>
    </>
  );
}