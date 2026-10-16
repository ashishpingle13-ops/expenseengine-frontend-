import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

export default function ProtectedRoute({ children }) {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    useEffect(() => {
        // Listen for real-time Firebase authentication state changes
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if(currentUser){
                // Refresh token in localStorage to ensure requests never fail
                const token = await currentUser.getIdToken();
                localStorage.setItem("authToken", token);
                setUser(currentUser);
            }else{
                localStorage.removeItem("authToken");
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if(loading){
        return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
            <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600 font-medium">Securing session...</p>
        </div>
        );
    }

    if(!user){
        return <Navigate to="/" replace />;
    }

    return children;
}