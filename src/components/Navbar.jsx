import React from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { Calendar, FileText } from 'lucide-react';

const Navbar = ({ selectedDate }) => {
    const navigate = useNavigate();
    const displayDate = dayjs(selectedDate || new Date()).format('DD MMM YYYY, ddd');

    return (
        <nav className='bg-green-700 text-white px-1.5 py-1.5 flex justify-between items-center gap-3 relative z-20'>
            
            {/* LEFT/CENTER: The Date */}
            <button 
                onClick={() => navigate('/select-date')}
                className='flex-1 flex items-center justify-center gap-2 font-semibold bg-white/10 hover:bg-white/20 border border-white/20 px-2 py-1.5 transition cursor-pointer active:scale-95 shadow-sm'
            >
                <Calendar size={16} />
                <span className="text-[13px] truncate">{displayDate}</span>
            </button>

            {/* RIGHT: The Monthly Report Button */}
            <button 
                onClick={() => navigate('/report')}
                className='flex-1 flex items-center justify-center gap-2 bg-transparent border border-white/20 text-white px-2 py-1.5 font-semibold text-[13px] shadow-sm hover:bg-white/10 transition active:scale-95'
            >
                <FileText size={16} />
                <span className="text-[13px] truncate">View Report</span>
            </button>
            
        </nav>
    );
}

export default Navbar;