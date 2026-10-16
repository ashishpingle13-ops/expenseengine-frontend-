import React , { useState } from 'react'
import{ useNavigate } from "react-router-dom";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { ArrowLeft } from "lucide-react";


export const DateSelectorPage = () => {
    const navigate = useNavigate();
    const [selectedDate, setSelectedDate] = useState(new Date());

    const handleDayClick = (day) => {
        if(!day) return;
        setSelectedDate(day);

        navigate("/dashboard", { state: { targetDate: day.toISOString() }});
    }

  return (
    <div className='min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans'>
            <div className='w-full max-w-md bg-white rounded-[40px] shadow-2xl relative pb-24 overflow-hidden border-4 border-gray-800'>

                {/* 📅 The Calendar Module */}
                <div className='p-6 flex justify-center'>
                    <DayPicker
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDayClick}
                        disabled={[{ after: new Date() }]} // Automatically blocks future dates!
                        modifiersClassNames={{
                            // This is where i inject Tailwind directly into the calendar!
                            selected: 'bg-green-800 text-white rounded-full font-bold hover:bg-green-900',
                            today: 'text-green-800 font-extrabold'
                        }}
                    />
                </div>


                {/* 🔙 The Footer Button */}
                <div className='absolute bottom-0 w-full p-6 bg-linear-to-t from-white via-white to-transparent'>
                    <button
                        onClick={() => navigate("/dashboard")}
                        className='w-full flex items-center justify-center gap-3 bg-green-800 hover:bg-green-900 text-white font-bold py-4 rounded-2xl transition active:scale-95 text-lg'
                    >
                        <ArrowLeft className="text-blue-400" size={24} strokeWidth={3} />
                        Return to Dashboard
                    </button>
                </div>
            </div>
        </div>
  );

};

export default DateSelectorPage; 



