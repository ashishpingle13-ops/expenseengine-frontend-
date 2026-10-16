import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { api } from '../lib/api'; // Import your custom api instance
import toast, { Toaster } from "react-hot-toast";
import { mutate } from 'swr';

const AddWorker = () => {
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!name || !phoneNumber) {
            toast.error("Please fill in all required fields.");
            return;
        }

        try {
            setLoading(true);
            
            // Super clean Axios request! No fetch, no headers, no JSON.stringify
            await api.post("/workers", {
                name,
                phoneNumber
            });
            mutate('/workers');
            mutate('/workers?includeInactive=true');

            toast.success("Worker added successfully!");
            setTimeout(() => {
                navigate("/dashboard");
            }, 800);

        } catch (error) {
            console.error("Error adding worker:", error);
            toast.error(error.response?.data?.message || "Failed to add worker.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className='min-h-screen bg-gray-100'>
            <Toaster position="top-right" reverseOrder={false} />
            <Navbar />

            <div className='max-w-xl mx-auto p-4 mt-10'>
                <div className='bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden p-6 sm:p-8'>
                    
                    <div className='flex items-center justify-between mb-6 border-b pb-4'>
                        <h2 className='text-xl font-bold text-gray-800'>Create New Worker Profile</h2>
                        <button 
                            onClick={() => navigate('/dashboard')}
                            className='text-gray-400 hover:text-gray-600 font-bold text-lg'
                        >
                            ✕
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className='space-y-5'>
                        <div>
                            <label className='block text-sm font-semibold text-gray-700 mb-1'>Full Name</label>
                            <input 
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter Worker's Name (e.g., Ramesh Kumar)"
                                className='w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-600 focus:outline-none text-sm'
                                required
                            />
                        </div>

                        <div>
                            <label className='block text-sm font-semibold text-gray-700 mb-1'>Phone Number</label>
                            <input 
                                type="text"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="Enter 10-Digit Mobile Number"
                                className='w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-600 focus:outline-none text-sm'
                                required
                            />
                        </div>

                        <div className='flex items-center gap-4 pt-4'>
                            <button 
                                type="submit"
                                disabled={loading}
                                className='flex-1 bg-green-700 hover:bg-green-800 text-white font-bold py-3 rounded-xl shadow transition active:scale-95 text-center'
                            >
                                {loading ? "Saving..." : "Save Worker"}
                            </button>

                            <button 
                                type="button"
                                onClick={() => navigate('/dashboard')}
                                className='flex-1 bg-red-500 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition active:scale-95 text-center border border-gray-300'
                            >
                                Cancel
                            </button>
                        </div>
                    </form>

                </div>
            </div>
        </div>
    );
};

export default AddWorker;