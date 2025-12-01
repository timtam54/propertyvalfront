"use client";

import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication, EventType, EventMessage, AuthenticationResult } from "@azure/msal-browser";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { msalConfig } from "@/lib/msalConfig";
import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { API } from "@/lib/config";

const msalInstance = new PublicClientApplication(msalConfig);

// Google user type
interface GoogleUser {
  email: string;
  name: string;
  picture?: string;
  sub: string; // Google user ID
}

// Auth context for Google
interface AuthContextType {
  googleUser: GoogleUser | null;
  setGoogleUser: (user: GoogleUser | null) => void;
  isGoogleAuthenticated: boolean;
  googleLogout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  googleUser: null,
  setGoogleUser: () => {},
  isGoogleAuthenticated: false,
  googleLogout: () => {},
});

export const useGoogleAuth = () => useContext(AuthContext);

// Hook to get current user's email from either Google or Microsoft auth
export const useUserEmail = () => {
  const { googleUser } = useGoogleAuth();
  const accounts = msalInstance.getAllAccounts();
  const msalAccount = accounts.length > 0 ? accounts[0] : null;

  // Return Google email if logged in with Google, otherwise Microsoft email
  if (googleUser?.email) {
    return googleUser.email;
  }
  if (msalAccount?.username) {
    return msalAccount.username;
  }
  return null;
};

// Sync OAuth user to backend
const syncOAuthUser = async (email: string, name: string, provider: string) => {
  try {
    await fetch(`${API}/auth/oauth-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, provider })
    });
  } catch (error) {
    console.error('Failed to sync OAuth user:', error);
  }
};

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);
  const msalSyncedRef = useRef<string | null>(null);

  // Load Google user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("googleUser");
    if (storedUser) {
      try {
        setGoogleUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem("googleUser");
      }
    }
  }, []);

  // Save Google user to localStorage when it changes
  useEffect(() => {
    if (googleUser) {
      localStorage.setItem("googleUser", JSON.stringify(googleUser));
    }
  }, [googleUser]);

  const googleLogout = () => {
    setGoogleUser(null);
    localStorage.removeItem("googleUser");
  };

  useEffect(() => {
    const initializeMsal = async () => {
      await msalInstance.initialize();

      // Handle redirect promise
      msalInstance.handleRedirectPromise().then((response) => {
        if (response && response.account) {
          msalInstance.setActiveAccount(response.account);
          // Sync Microsoft user to backend on login
          const email = response.account.username;
          const name = response.account.name || email.split('@')[0];
          if (email && msalSyncedRef.current !== email) {
            msalSyncedRef.current = email;
            syncOAuthUser(email, name, 'microsoft');
          }
        }
      }).catch((error) => {
        console.error("Redirect error:", error);
      });

      // Set active account on login success
      msalInstance.addEventCallback((event: EventMessage) => {
        if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
          const payload = event.payload as AuthenticationResult;
          msalInstance.setActiveAccount(payload.account);
          // Sync Microsoft user to backend on login
          if (payload.account) {
            const email = payload.account.username;
            const name = payload.account.name || email.split('@')[0];
            if (email && msalSyncedRef.current !== email) {
              msalSyncedRef.current = email;
              syncOAuthUser(email, name, 'microsoft');
            }
          }
        }
      });

      // Check if there's already an active account
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        msalInstance.setActiveAccount(accounts[0]);
        // Sync existing Microsoft user (in case they're returning)
        const email = accounts[0].username;
        const name = accounts[0].name || email.split('@')[0];
        if (email && msalSyncedRef.current !== email) {
          msalSyncedRef.current = email;
          syncOAuthUser(email, name, 'microsoft');
        }
      }

      setIsInitialized(true);
    };

    initializeMsal();
  }, []);

  if (!isInitialized) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e2e8f0',
            borderTop: '3px solid #0ea5e9',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <p style={{ color: '#64748b' }}>Loading...</p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthContext.Provider value={{
        googleUser,
        setGoogleUser,
        isGoogleAuthenticated: !!googleUser,
        googleLogout,
      }}>
        <MsalProvider instance={msalInstance}>
          {children}
        </MsalProvider>
      </AuthContext.Provider>
    </GoogleOAuthProvider>
  );
}

export { msalInstance };
