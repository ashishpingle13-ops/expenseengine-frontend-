import React from 'react';
import { Edit } from 'lucide-react'; 

// const AVATAR_COLORS = [
//     'bg-red-100 text-red-600',
//     'bg-orange-100 text-orange-600',
//     'bg-amber-100 text-amber-600',
//     'bg-yellow-100 text-yellow-600',
//     'bg-lime-100 text-lime-600',
//     'bg-green-100 text-green-600',
//     'bg-emerald-100 text-emerald-600',
//     'bg-teal-100 text-teal-600',
//     'bg-cyan-100 text-cyan-600',
//     'bg-sky-100 text-sky-600',
//     'bg-blue-100 text-blue-600',
//     'bg-indigo-100 text-indigo-600',
//     'bg-violet-100 text-violet-600',
//     'bg-purple-100 text-purple-600',
//     'bg-fuchsia-100 text-fuchsia-600',
//     'bg-pink-100 text-pink-600',
//     'bg-rose-100 text-rose-600',
//     'bg-slate-100 text-slate-600',
//     'bg-stone-100 text-stone-600',
//     'bg-neutral-100 text-neutral-600'
// ];

// const getAvatarColor = (name) => {
//     if(!name) return AVATAR_COLORS[0];
//     let hash = 0;
//     for(let i = 0; i < name.length; i++){
//       hash = name.charCodeAt(i) + ((hash << 5) - hash);
//     }
//     return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
// };

const WorkerRow = ({worker, dayStatus, nightStatus, shift, onStatusChange, onEdit }) => {
    const workerId = worker._id || worker.id;
    // const avatarColorClass = getAvatarColor(worker.name);
    
    // Grabs the first letter of the worker's name for the profile photo
    const firstLetter = worker.name ? worker.name.charAt(0).toUpperCase() : 'W';

    const isNight = shift === 'Night';
    const currentStatus = isNight ? nightStatus : dayStatus;

    return (
        <div className='bg-white border-b border-gray-200 py-3 px-1.5 flex flex-row items-center justify-between min-h-13 w-full'>

            {/* Left Side: Worker Avatar & Name (Fixed min-width for 9 chars) */}
            <div className='flex items-center gap-2 w-32 shrink-0 overflow-hidden'>
                <div className="w-9 h-9 bg-gray-100 rounded-full flex shrink-0 items-center justify-center text-gray-600 font-bold text-sm">
                    {firstLetter}
                </div>
                
                <div className='flex items-center gap-1 overflow-hidden w-full'>
                    <span className='font-bold text-gray-900 text-[12px] truncate w-full'>{worker.name}</span>
                    <button 
                        onClick={onEdit} 
                        className='text-gray-400 hover:text-gray-700 transition p-0.5 shrink-0'
                    >
                        <Edit size={12} strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {/* Right Side: Shift Logic */}
            <div className='flex justify-end shrink-0'>
                {isNight ? (
                    /* NIGHT SHIFT TOGGLE UI */
                    <div className="flex items-center gap-2 justify-end w-full">
                        
                        {/* The Toggle Switch (On the LEFT) */}
                        <button 
                            onClick={() => currentStatus ? onStatusChange(workerId, "", "Night") : onStatusChange(workerId, "Veg", "Night")}
                            className={`w-8.5 h-5 rounded-full relative transition-colors shrink-0 ${currentStatus ? 'bg-[#0E793C]' : 'bg-gray-300'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform ${currentStatus ? 'translate-x-4' : 'translate-x-0.5'}`}></div>
                        </button>

                        {/* Meal Buttons or "Off Shift" Text */}
                        {currentStatus ? (
                            <div className='flex border border-gray-200 rounded-sm overflow-hidden bg-white shrink-0'>
                                <button onClick={() => onStatusChange(workerId, currentStatus === "Veg" ? "" : "Veg", "Night")} className={`text-[11px] px-2.5 py-2 border-r border-gray-200 transition-colors ${currentStatus === "Veg" ? "bg-green-600 text-white font-bold" : "text-gray-500 font-medium"}`}>Veg</button>
                                <button onClick={() => onStatusChange(workerId, currentStatus === "N-Veg" || currentStatus === "Non-Veg" ? "" : "N-Veg", "Night")} className={`text-[11px] px-2.5 py-2 border-r border-gray-200 transition-colors ${currentStatus === "N-Veg" || currentStatus === "Non-Veg" ? "bg-red-600 text-white font-bold" : "text-gray-500 font-medium"}`}>N-Veg</button>
                                <button onClick={() => onStatusChange(workerId, currentStatus === "Paise" ? "" : "Paise", "Night")} className={`text-[11px] px-2.5 py-2 transition-colors ${currentStatus === "Paise" ? "bg-yellow-500 text-white font-bold" : "text-gray-500 font-medium"}`}>Paise</button>
                            </div>
                        ) : (
                            <span className="text-[11px] font-medium text-gray-400 w-23.75 text-left pl-2">Off Shift</span>
                        )}
                        
                    </div>
                ) : (
                    /* DAY SHIFT SEGMENTED CONTROL (Added deselect logic) */
                    <div className='flex border border-gray-200 rounded-sm overflow-hidden bg-white shrink-0'>
                        <button onClick={() => onStatusChange(workerId, currentStatus === "Veg" ? "" : "Veg", "Day")} className={`text-[11px] px-2.5 py-2 border-r border-gray-200 transition-colors ${currentStatus === "Veg" ? "bg-green-600 text-white font-bold" : "text-gray-500 font-medium"}`}>Veg</button>
                        <button onClick={() => onStatusChange(workerId, currentStatus === "N-Veg" || currentStatus === "Non-Veg" ? "" : "N-Veg", "Day")} className={`text-[11px] px-2.5 py-2 border-r border-gray-200 transition-colors ${currentStatus === "Non-Veg" || currentStatus === "N-Veg" ? "bg-red-600 text-white font-bold" : "text-gray-500 font-medium"}`}>N-Veg</button>
                        <button onClick={() => onStatusChange(workerId, currentStatus === "Paise" ? "" : "Paise", "Day")} className={`text-[11px] px-2.5 py-2 border-r border-gray-200 transition-colors ${currentStatus === "Paise" ? "bg-yellow-600 text-white font-bold" : "text-gray-500 font-medium"}`}>Paise</button>
                        <button onClick={() => onStatusChange(workerId, currentStatus === "Absent" ? "" : "Absent", "Day")} className={`text-[11px] px-2.5 py-2 transition-colors ${currentStatus === "Absent" ? "bg-gray-600 text-white font-bold" : "text-gray-500 font-medium"}`}>Absent</button>
                    </div>
                )}
            </div>
            
        </div>
    );
}

export default WorkerRow;