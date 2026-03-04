import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "../types";
import { authClient } from "../lib/auth";

interface AuthContextType {
    user: User | null;    
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [neonUser, setNeonUser] = useState<any>(null)

    useEffect(() => {
      async function loadUser() {
        try {
          const result = await authClient.getSession()
          if (result && result.data?.user) {
            setNeonUser(result.data.user)
          } else {
            setNeonUser(null)
          }
        } catch (error) {
          setNeonUser(null)
        }
      }
      loadUser()
    
    }, [])
    
    return (
        <AuthContext.Provider value={{user: neonUser}}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider")
    }
    return context
}