"use client"; 

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import IntButton from "@/components/IntButton";
import { Moon, Sun, User, Lock, Activity } from "lucide-react";

export default function Login() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setError(""); 

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, password }),
      });

      if (response.ok) {
        const data = await response.json();
        document.cookie = `department=${data.department}; path=/`;
        
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

  return (
    <>
      <div className="flex flex-row">
        
        {/* LEFT SIDE: Image */}
        <div className="bg-[#121212] rounded-r-[1rem] rounded-l-0 h-screen w-3/5 overflow-hidden">
          <img 
            src="/media/login.jpeg" 
            alt="Login Background" 
            className="w-full h-full object-cover opacity-60" 
          />
        </div>

        {/* RIGHT SIDE: Login Panel */}
        <div className="w-2/5 h-screen flex flex-col items-center justify-center relative bg-[var(--bg-color)] text-[var(--text-color)]">
          
          {/* Theme Toggle */}
          <IntButton 
            icon={isDarkMode ? Moon : Sun} 
            label="Switch Theme" 
            onClick={toggleTheme} 
            classes={"btn-header btn-black absolute top-8 right-8 z-50"} 
          />

          {/* Login Card */}
          <div className="w-full max-w-md p-10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] bg-[var(--surface-color)] border border-gray-200 dark:border-gray-800">
            
            {/* Header / Logo Area */}
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-14 h-14 bg-[#00ff88]/20 text-[#00ff88] rounded-xl flex items-center justify-center mb-4">
                <Activity size={32} />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">Welcome Back</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
                Sign in with your staff credentials to access the HU Digital Twin.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-sm text-center font-semibold">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Username Input */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-500 dark:text-gray-400 pl-1">Username / ID</label>
                <div className="relative flex items-center">
                  <User className="absolute left-3 text-gray-400" size={20} />
                  <input 
                    type="text" 
                    value={userId} 
                    onChange={(e) => setUserId(e.target.value)} 
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-[#00ff88] focus:border-transparent transition-all"
                    placeholder="Enter your ID"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-500 dark:text-gray-400 pl-1">Password</label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3 text-gray-400" size={20} />
                  <input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-[#00ff88] focus:border-transparent transition-all"
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
          <div className="absolute bottom-6 text-xs text-gray-400 dark:text-gray-500 font-medium tracking-wide">
            © 2026 HU Facilities • System v1.0.4
          </div>

        </div>
      </div>
    </>
  );
}