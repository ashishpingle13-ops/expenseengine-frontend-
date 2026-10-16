import React from 'react'
import { useEffect } from 'react';
import { ArrowLeft, User, Mail, Phone, Edit3, LogOut, Check, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'
import { api } from '../lib/api';
import toast, {Toaster} from 'react-hot-toast';
import BottomNav from '../components/BottomNav';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { mutate } from 'swr';


export const Profile = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const slideClass = location.state?.slideDirection === 'left' ? 'animate-slide-in-left' : location.state?.slideDirection === 'right' ? 'animate-slide-in-right' : 'animate-fade-in-fast';

    const [user, setUser] = useState({
        name: '',
        email:'',
        phoneNumber:''
    });

    const [loading, setLodaing] = useState(true);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editName, setEditName] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [isSaving, setIsSaving] = useState(false);


    // 1. Fetch User Profile from MongoDB on load
    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                setLodaing(true);
                const response = await api.get('/users/profile');
                setUser(response.data);
                setEditName(response.data.name || '');
                setEditPhone(response.data.phoneNumber || '');
            } catch (error) {
                console.error("Failed to fetch user profile:", error);
                toast.error("Failed to load profile data.");
            }finally{
                setLodaing(false);
            }
        };
        fetchUserProfile();
    }, []);

    // 2. Handle Profile Update Submission
    const handleUpdateProfile = async (e) => {
       e.preventDefault();
       try {
        setIsSaving(true);
        const response = await api.put('/users/profile', {
            name: editName,
            phoneNumber: editPhone
        });

        setUser(response.data);
        toast.success("Profile updated successfully!");
        setIsEditModalOpen(false);
       } catch (error) {
        console.error("Failed to update profile:", error);
        toast.error("Failed to update profile.");
       }finally{
        setIsSaving(false);
       }
    };

    // 3. Handle Logout
    const handleLogout = async () => {
        try {
            await signOut(auth);
            localStorage.clear();
            await mutate(() => true, undefined, { revalidate: false });
            toast.success("Logged out successfully");
            navigate('/');
        } catch (error) {
            console.error("Error logging out:", error);
            toast.error("Failed to log out properly.");
        }
    };

    // Helper to get initials for the avatar (e.g., "Ashish Pingle" -> "AP")
    const getInitials = (name) => {
        if(!name) return "C";
        const parts = name.trim().split(" ");
        if(parts.length >= 2){
            return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        }
        return name.substring(0,2).toUpperCase();
    }

return (
        <div className={`fixed inset-0 flex flex-col bg-[#F9FAFB] overflow-hidden ${slideClass}`}>

            <div className="flex-1 overflow-y-auto pb-24" style={{ scrollbarWidth: 'none' }}>
                {/* Top Bar (No Home Icon as requested) */}
                <div className='bg-white px-4 py-4 flex items-center gap-4 border-b border-gray-200'>
                    <button onClick={() => navigate(-1)} className='text-gray-800 hover:opacity-80 transition'>
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className='text-xl font-bold text-gray-900 tracking-wide'>Contractor Profile</h1>
                </div>

                <div className='max-w-md mx-auto w-full p-5 space-y-6'>
                
                {loading ? (
                    <div className='text-center py-12 text-gray-500 font-medium'>Loading profile...</div>
                ) : (
                    <>
                        {/* Profile Header Card */}
                        <div className='bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col items-center text-center relative'>
                            
                            {/* Avatar */}
                            <div className='relative mb-4'>
                                <div className='w-24 h-24 bg-[#1048A4] text-white rounded-full flex items-center justify-center text-3xl font-bold shadow-md'>
                                    {getInitials(user.name)}
                                </div>
                            </div>

                            <h2 className='text-xl font-bold text-gray-900'>
                                {user.name || "Contractor User"}
                            </h2>
                            <p className='text-sm text-gray-500 font-medium mt-0.5'>Contractor</p>

                            {/* Info Rows */}
                            <div className='w-full mt-6 space-y-3 text-left border-t border-gray-100 pt-4'>
                                
                                <div className='flex items-center gap-3 p-3 bg-gray-50 rounded-xl'>
                                    <div className='text-blue-600 bg-blue-50 p-2 rounded-lg'><User size={20} /></div>
                                    <div>
                                        <p className='text-xs text-gray-400 font-semibold'>Name</p>
                                        <p className='text-sm font-bold text-gray-800'>{user.name || "Not set"}</p>
                                    </div>
                                </div>

                                <div className='flex items-center gap-3 p-3 bg-gray-50 rounded-xl'>
                                    <div className='text-blue-600 bg-blue-50 p-2 rounded-lg'><Mail size={20} /></div>
                                    <div>
                                        <p className='text-xs text-gray-400 font-semibold'>Email</p>
                                        <p className='text-sm font-bold text-gray-800'>{user.email || "Not linked via Gmail"}</p>
                                    </div>
                                </div>

                                <div className='flex items-center gap-3 p-3 bg-gray-50 rounded-xl'>
                                    <div className='text-blue-600 bg-blue-50 p-2 rounded-lg'><Phone size={20} /></div>
                                    <div>
                                        <p className='text-xs text-gray-400 font-semibold'>Phone Number</p>
                                        <p className='text-sm font-bold text-gray-800'>{user.phoneNumber || "Not linked via Phone"}</p>
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* Edit Profile Button */}
                        <button 
                            onClick={() => setIsEditModalOpen(true)}
                            className='w-full bg-white border border-blue-600 text-blue-600 hover:bg-blue-50 font-bold py-3.5 rounded-xl shadow-sm transition active:scale-[0.98] flex items-center justify-center gap-2'>
                            <Edit3 size={20} />
                            Edit Profile
                        </button>

                        {/* Log Out Section (Secure & Verified Box completely removed as requested) */}
                        <div className='pt-2'>
                            <button 
                                onClick={handleLogout}
                                className='w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold py-3.5 rounded-xl transition active:scale-[0.98] flex items-center justify-center gap-2'>
                                <LogOut size={20} />
                                Log Out
                            </button>
                            <p className='text-xs text-center text-gray-400 mt-2 px-4'>
                                Logging out will clear your session and remove authentication tokens from this device.
                            </p>
                        </div>
                    </>
                )}
            </div>

            {/* Edit Profile Modal */}
            {isEditModalOpen && (
                <div className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4'>
                    <div className='bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 relative'>
                        
                        <div className='flex justify-between items-center mb-4'>
                            <h2 className='text-lg font-bold text-gray-800'>Edit Profile</h2>
                            <button onClick={() => setIsEditModalOpen(false)} className='text-gray-400 hover:text-black'>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateProfile} className='space-y-4'>
                            <div>
                                <label className='block text-xs font-bold text-gray-500 mb-1'>Full Name</label>
                                <input 
                                    type="text" 
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder='Enter your full name'
                                    className='w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-600'
                                    required
                                />
                            </div>

                            <div>
                                <label className='block text-xs font-bold text-gray-500 mb-1'>Phone Number</label>
                                <input 
                                    type="text" 
                                    value={editPhone}
                                    onChange={(e) => setEditPhone(e.target.value)}
                                    placeholder='Enter phone number'
                                    className='w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-600'
                                />
                            </div>

                            <button 
                                type='submit' 
                                disabled={isSaving}
                                className='w-full bg-[#1048A4] hover:bg-blue-800 text-white font-bold py-3 rounded-xl mt-2 transition active:scale-[0.98]'>
                                {isSaving ? "Saving..." : "Save Changes"}
                            </button>
                        </form>

                    </div>
                </div>
            )}
            </div>

            <BottomNav />
        </div>
    );
};

export default Profile;
