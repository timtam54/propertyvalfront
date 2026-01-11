"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { Building2, Home } from "lucide-react";
import { loginRequest } from "@/lib/msalConfig";
import { useMsalSafe, useIsAuthenticatedSafe, useGoogleAuth } from "@/components/AuthProvider";
import { toast } from "sonner";
import { API } from "@/lib/config";
import Link from "next/link";

// Decode JWT token to get user info
function decodeJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Error decoding JWT:', e);
    return null;
  }
}

export default function Login() {
  const router = useRouter();
  const { instance } = useMsalSafe();
  const isMsalAuthenticated = useIsAuthenticatedSafe();
  const { isGoogleAuthenticated, setGoogleUser } = useGoogleAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [attemptingSilentLogin, setAttemptingSilentLogin] = useState(false);
  const [isReturningGoogleUser, setIsReturningGoogleUser] = useState(false);
  const silentLoginAttemptedRef = useRef(false);

  // Check if returning Google user on mount
  useEffect(() => {
    const provider = localStorage.getItem("PropertyEvalAuthProvider");
    if (provider === "google") {
      setIsReturningGoogleUser(true);
    }
  }, []);

  useEffect(() => {
    if (isMsalAuthenticated || isGoogleAuthenticated) {
      router.push("/properties");
    }
  }, [isMsalAuthenticated, isGoogleAuthenticated, router]);

  // Attempt silent login for returning users
  useEffect(() => {
    if (silentLoginAttemptedRef.current) return;

    const hasSignedIn = localStorage.getItem("HasSigninToPropertyEval");
    const provider = localStorage.getItem("PropertyEvalAuthProvider");
    const email = localStorage.getItem("PropertyEvalUserEmail");

    if (hasSignedIn === "true" && provider && email) {
      silentLoginAttemptedRef.current = true;

      if (provider === "microsoft" && instance) {
        // Attempt silent Microsoft login
        setAttemptingSilentLogin(true);
        instance.ssoSilent({
          scopes: ["User.Read"],
          loginHint: email
        }).then((response) => {
          if (response && response.account) {
            instance.setActiveAccount(response.account);
            toast.success(`Welcome back, ${response.account.name || email}!`);
            router.push("/properties");
          }
        }).catch((error) => {
          console.log("Silent Microsoft login failed, showing login options:", error);
          setAttemptingSilentLogin(false);
        });
      } else if (provider === "google") {
        // For Google, we rely on One Tap which handles this automatically
        // The useOneTap prop on GoogleLogin will handle returning users
        setAttemptingSilentLogin(false);
      }
    }
  }, [instance, router]);

  const handleMicrosoftLogin = async () => {
    try {
      if (!instance) {
        toast.error("Microsoft login is not available. Please refresh the page.");
        return;
      }
      await instance.loginRedirect(loginRequest);
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Microsoft login failed");
    }
  };

  // Sync OAuth user to backend users table
  const syncOAuthUser = async (email: string, name: string, provider: string, picture?: string) => {
    try {
      await fetch(`${API}/auth/oauth-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, provider, picture })
      });
    } catch (error) {
      console.error('Failed to sync OAuth user:', error);
      // Don't block login if sync fails
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    console.log("Google login success");
    setIsLoading(true);

    try {
      if (credentialResponse.credential) {
        const decoded = decodeJwt(credentialResponse.credential);

        if (decoded) {
          // Sync user to backend
          await syncOAuthUser(decoded.email, decoded.name, 'google', decoded.picture);

          // Set localStorage flags for returning user silent login
          localStorage.setItem("HasSigninToPropertyEval", "true");
          localStorage.setItem("PropertyEvalAuthProvider", "google");
          localStorage.setItem("PropertyEvalUserEmail", decoded.email);

          setGoogleUser({
            email: decoded.email,
            name: decoded.name,
            picture: decoded.picture,
            sub: decoded.sub,
          });

          toast.success(`Welcome, ${decoded.name}!`);
          router.push("/properties");
        } else {
          toast.error("Failed to decode Google credentials");
        }
      } else {
        toast.error("No credentials received from Google");
      }
    } catch (error) {
      console.error("Error processing Google login:", error);
      toast.error("Failed to complete Google sign in");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    console.error("Google login failed");
    toast.error("Google login failed. Please try again.");
  };

  // Show loading screen while attempting silent login
  if (attemptingSilentLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <header className="bg-gradient-to-r from-blue-700 to-blue-900 dark:from-gray-800 dark:to-gray-900 border-b border-blue-800 dark:border-gray-700">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Home className="w-10 h-10 text-white" />
              <span className="text-2xl font-bold"><span className="text-white">Property</span><span className="text-cyan-300">Eval</span></span>
            </Link>
          </div>
        </header>
        <div style={{
          minHeight: "calc(100vh - 73px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "1rem"
        }}>
          <div style={{
            width: "48px",
            height: "48px",
            border: "4px solid rgba(255,255,255,0.2)",
            borderTop: "4px solid #0ea5e9",
            borderRadius: "50%",
            animation: "spin 1s linear infinite"
          }} />
          <p style={{ color: "#94a3b8", fontSize: "1rem" }}>Signing you in...</p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-700 to-blue-900 dark:from-gray-800 dark:to-gray-900 border-b border-blue-800 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Home className="w-10 h-10 text-white" />
            <span className="text-2xl font-bold"><span className="text-white">Property</span><span className="text-cyan-300">Eval</span></span>
          </Link>
        </div>
      </header>

      <div style={{
        minHeight: "calc(100vh - 73px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem"
      }}>
      <div style={{
        background: "white",
        borderRadius: "24px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        maxWidth: "450px",
        width: "100%",
        padding: "3rem"
      }}>
        {/* Logo/Header */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{
            width: "80px",
            height: "80px",
            background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
            borderRadius: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1rem"
          }}>
            <Building2 size={40} color="white" />
          </div>
          <h1 style={{
            fontSize: "2rem",
            fontWeight: "800",
            color: "#0f172a",
            marginBottom: "0.5rem"
          }}>
            PropertyEval
          </h1>
          <p style={{ color: "#64748b", fontSize: "1rem" }}>
            Sign in to access your property dashboard
          </p>
        </div>

        {/* Microsoft Sign In Button */}
        <button
          onClick={handleMicrosoftLogin}
          disabled={isLoading}
          style={{
            width: "100%",
            padding: "1rem",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "12px",
            fontSize: "1rem",
            fontWeight: "600",
            cursor: isLoading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.75rem",
            transition: "all 0.2s",
            marginBottom: "1rem",
            opacity: isLoading ? 0.7 : 1
          }}
          onMouseOver={(e) => {
            if (!isLoading) {
              e.currentTarget.style.background = "#1d4ed8";
              e.currentTarget.style.transform = "translateY(-2px)";
            }
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = "#2563eb";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <svg width="20" height="20" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
            <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
            <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
          </svg>
          Sign in with Microsoft
        </button>

        {/* Divider */}
        <div style={{
          display: "flex",
          alignItems: "center",
          margin: "1rem 0",
          gap: "1rem"
        }}>
          <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }} />
          <span style={{ color: "#94a3b8", fontSize: "0.875rem" }}>or</span>
          <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }} />
        </div>

        {/* Google Sign In Button - Using Google's official button */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          opacity: isLoading ? 0.7 : 1,
          pointerEvents: isLoading ? "none" : "auto"
        }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            useOneTap={isReturningGoogleUser}
            auto_select={isReturningGoogleUser}
            theme="outline"
            size="large"
            width="350"
            text="signin_with"
            shape="rectangular"
          />
        </div>

        {/* Footer text */}
        <p style={{
          textAlign: "center",
          color: "#94a3b8",
          fontSize: "0.8rem",
          marginTop: "2rem"
        }}>
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
      </div>
    </div>
  );
}
