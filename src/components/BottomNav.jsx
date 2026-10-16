import React from 'react'
import { Home, Landmark, Plus, ReceiptText, User } from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate, useLocation } from "react-router-dom";


const BottomNav = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // A quick helper function to highlight the icon green if we are on that page
    const isActive = (path) => location.pathname === path ? "text-green-500" : "text-gray-400";

    const tabOrder = ['/dashboard', '/cashbook', '/expenses', '/profile'];

    const handleTabClick = (targetPath) => {
        if (location.pathname === targetPath) return; // Don't animate if clicking the same tab

        // Find where we are, and where we are going
        const currentIndex = tabOrder.findIndex(path => location.pathname.includes(path));
        const targetIndex = tabOrder.findIndex(path => targetPath.includes(path));

        // If target is to the right (higher index), slide from right. Otherwise, slide from left.
        const slideDirection = targetIndex > currentIndex ? 'right' : 'left';

        // Navigate and pass the direction invisibly in the state
        navigate(targetPath, { state: { slideDirection } });
    };

  return (
     <div className='fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg py-1 px-4 flex justify-around items-center z-50'>

        {/* 1. Home / Dashboard */}
        <button 
        onClick={() => handleTabClick('/dashboard')}
        className={`flex flex-col items-center hover:text-green-500 transition ${isActive('/dashboard')}`}>
            <Home size={20}/>
            <span className='text-[10px] mt-1 font-medium'>Home</span>
        </button>

        {/* 2. Boss Deposits */}
        <button 
        onClick={() => handleTabClick('/cashbook')}
        className={`flex flex-col items-center hover:text-blue-500 transition ${isActive('/cashbook')}`}>
            <Landmark size={20}/>
            <span className='text-[10px] mt-1 font-medium'>Cashbook</span>
        </button>

        {/* 3. Company Expenses */}
        <button 
        onClick={() => handleTabClick('/expenses')} 
        className={`flex flex-col items-center hover:text-red-600 transition ${isActive('/expenses')}`}>
            <ReceiptText size={20}/>
            <span className='text-[10px] mt-1 font-medium'>Expenses</span>
        </button>

        {/* 4. Profile & Settings */}
       <button onClick={() => handleTabClick('/profile')} className={`flex flex-col items-center hover:text-yellow-500 transition ${isActive('/profile')}`}>
         <User size={20} />
         <span className="text-[10px] mt-1 font-medium">Profile</span>
       </button>

    </div>
  )
}

export default BottomNav;