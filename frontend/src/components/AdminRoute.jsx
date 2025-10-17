import { useUser } from '@clerk/clerk-react';
import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'

export default function AdminRoute() {

    const { isSignedIn, user } = useUser();
    const [loading, setLoading] = useState(true);
    const [ allowed, setAllowed ] = useState(false);

    useEffect(() => {
        if (typeof isSignedIn === "boolean") {
            if (!isSignedIn) {
                setAllowed(false);
                setLoading(false);
                return;
            }

            const adminId = process.env.VITE_ADMIN_CLERK_ID;

            if (user && user.id === adminId) {
                setAllowed(true);
            }
            else {
                setAllowed(false);
            }
            setLoading(false);
        }

    }, [isSignedIn, user]);

    if (loading) return <div>Loading...</div>;
    if (!allowed) return <Navigate to="/" replace />;

  return (<>{children}</>);
}
