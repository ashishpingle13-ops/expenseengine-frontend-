import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import WorkerRow from '../components/WorkerRow';
import toast, { Toaster } from "react-hot-toast";
import { api, fetcher } from '../lib/api';
import BottomNav from '../components/BottomNav';
import { UserPlus, X } from 'lucide-react';
import useSWR, { mutate } from 'swr';


const Dashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const slideClass = location.state?.slideDirection === 'left' ? 'animate-slide-in-left' : location.state?.slideDirection === 'right' ? 'animate-slide-in-right' : 'animate-fade-in-fast';

    // // Optional: A loading state just in case your backend takes a second
    // const [loading, setLoading] = useState(true);
    const [shift, setShift] = useState('Day');
    const [workerStatuses, setWorkersStatuses] = useState({});
    const [originalStatuses, setOriginalStatuses] = useState({});
    
    const initialDate = location.state?.targetDate
        ? new Date(location.state.targetDate)
        : new Date();
        
    const [currentDate, setCurrentDate] = useState(initialDate);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedWorkerId, setSelectedWorkerId] = useState("");
    const [advanceAmount, setAdvanceAmount] = useState("");
    const [advanceNotes, setAdvanceNotes] = useState("");
    const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const norm = (o) => JSON.stringify(Object.entries(o || {}).sort());
const hasUnsavedChanges = norm(originalStatuses) !== norm(workerStatuses);

    // 2. NOW WE CAN SAFELY DO MATH WITH currentDate
    const dateString = currentDate.toLocaleDateString('en-CA'); 
    const monthString = dateString.slice(0, 7);

    // 3. SWR INSTANT FETCHES
    const { data: workers = [], isLoading: loading } = useSWR("/workers", fetcher);
    const { data: reportRes } = useSWR(`/reports/monthly-summary?month=${monthString}`, fetcher);
    
    const monthlyStats = {
        veg: reportRes?.totalVeg || 0,
        nveg: reportRes?.totalNonVeg || 0,
        paise: reportRes?.totalPaise || 0,
        absent: reportRes?.totalAbsent || 0
    };

    // 4. DAILY ATTENDANCE FETCH
   useEffect(() => {
    let cancelled = false;
    setWorkersStatuses({});
    setOriginalStatuses({});
    setLoadError(false);

    const fetchDailyAttendance = async () => {
        try { 
            const response = await api.get(`/attendance/${dateString}`);
            if (cancelled) return;
            if (response.data && response.data.statuses) {
                setWorkersStatuses(response.data.statuses);
                setOriginalStatuses(response.data.statuses);
            }
        } catch (error) {
            if (cancelled) return;
            if (error.response && error.response.status !== 404) {
                console.error("Error fetching attendance:", error);
                setLoadError(true);
                toast.error("Network error loading attendance. Please refresh.");
            }
        }
    };
    fetchDailyAttendance();
    return () => { cancelled = true; };
}, [dateString]);


    const handleStatusChange = (workerId, newStatus , shiftType) => {
        // Separate Day and Night data using a namespace
        const key = shiftType === 'Night' ? `${workerId}_night` : workerId;

        setWorkersStatuses(prev => {
            const next = {...prev};
            if(newStatus === ""){
                delete next[key]; // Erase from memory if toggled off
            } else {
                next[key] = newStatus;
            }
            return next;
        });
    }

    const handleSaveAll = async () => {
    try {
        const snapshot = { ...workerStatuses };
        const dateString = currentDate.toLocaleDateString('en-CA');
        const payload = {
            date: dateString,
            statuses: snapshot
        };

        console.log("Sending payload to backend:", payload);

        await api.post("/attendance", payload);
        mutate(`/reports/monthly-summary?month=${monthString}`);

        setOriginalStatuses(snapshot);
        toast.success("Attendance saved to Database Successfully!");
        } catch (error) {
            console.error("Error saving attendance:", error);
            
            if (error.response) {
                console.error("Backend said:", JSON.stringify(error.response.data));
            }
            
            toast.error("Failed to save entries to database.");
        }
    }

    const handleSubmitAdvance = async (e) => {
        e.preventDefault();

        if(!selectedWorkerId){
            toast.error("Please select a worker!");
            return;
        }

        try {
            setIsSubmittingPayment(true);

            const payload = {
                entryType: "Advance",
                workerId: selectedWorkerId,
                amount: Number(advanceAmount),
                description: advanceNotes,
                date: currentDate.toISOString()
            };

            await Promise.all([
                api.post("/ledger", payload),
                new Promise((resolve) => setTimeout(resolve, 800))
            ]);

            toast.success("Advance payment logged successfully!");

            // 1. Reset the from back to blank
            setSelectedWorkerId("");
            setAdvanceAmount("");
            setAdvanceNotes("");

            // 2. Close the modal
            setIsPaymentModalOpen(false);



        } catch (error) {
            console.error("Error logging advance:", error);
            toast.error(error.response?.data?.message || "Failed to log advance payment.");
        } finally{
            setIsSubmittingPayment(false);
        }
        
    }

  return (
    <div className={`fixed inset-0 flex flex-col bg-[#F9FAFB] overflow-hidden ${slideClass}`}>
        <Toaster position="top-center" reverseOrder={false} />

        <div className="flex-1 overflow-y-auto pb-35" style={{ scrollbarWidth: 'none' }}>
            <Navbar selectedDate={currentDate}/>
            <div className='w-full'>

            {/* 1. Smaller Auto-Scrolling Ticker */}
            <div className="bg-white border-b border-gray-200 py-1 overflow-hidden text-[12px] font-bold tracking-wider whitespace-nowrap shadow-sm w-full relative">
                <div className="absolute left-0 top-0 bottom-0 w-10 bg-linear-to-r from-white to-transparent z-10 pointer-events-none"></div>
                <div className="absolute right-0 top-0 bottom-0 w-10 bg-linear-to-l from-white to-transparent z-10 pointer-events-none"></div>
                <marquee scrollamount="5" className="w-full">
                    <span className="text-gray-400">TOTAL VEG:</span> <span className="text-[#0E793C] mr-8">{monthlyStats.veg}</span>
                    <span className="text-gray-400">TOTAL NON-VEG:</span> <span className="text-red-600 mr-8">{monthlyStats.nveg}</span>
                    <span className="text-gray-400">TOTAL PAISE:</span> <span className="text-yellow-500 mr-8">{monthlyStats.paise}</span>
                    <span className="text-gray-400">TOTAL ABSENT:</span> <span className="text-gray-800 mr-8">{monthlyStats.absent}</span>

                    {/* Repeated for seamless loop */}
                    <span className="text-gray-400">TOTAL VEG:</span> <span className="text-[#0E793C] mr-8">{monthlyStats.veg}</span>
                    <span className="text-gray-400">TOTAL NON-VEG:</span> <span className="text-red-600 mr-8">{monthlyStats.nveg}</span>
                    <span className="text-gray-400">TOTAL PAISE:</span> <span className="text-yellow-500 mr-8">{monthlyStats.paise}</span>
                    <span className="text-gray-400">TOTAL ABSENT:</span> <span className="text-gray-800 mr-8">{monthlyStats.absent}</span>
                </marquee>
            </div>

            {/* 2. Edge-to-Edge Global Shift Toggle (No rounded corners) */}
            <div className="flex bg-white border-b border-gray-200 text-[14px] font-semibold w-full">
                <button onClick={() => setShift('Day')} className={`flex-1 py-1.5 transition-colors ${shift === 'Day' ? 'bg-[#0E793C] text-white border-b-2 border-[#0E793C]' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>☀️ Day Shift</button>
                <button onClick={() => setShift('Night')} className={`flex-1 py-1.5 transition-colors ${shift === 'Night' ? 'bg-[#0E793C] text-white border-b-2 border-[#0E793C]' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>🌙 Night Shift</button>
            </div>

            {/* 3. Edge-to-Edge Master Save Banner (Small, no extreme rounded edges) */}
            {hasUnsavedChanges && !loadError && (
                <div className='flex justify-between items-center bg-[#FEF9C3] border-b border-yellow-300 px-3 py-2 w-full animate-fade-in'>
                  <span className='text-[12px] font-bold text-yellow-800'>⚠️ You have unsaved changes.</span>
                  <button 
                  onClick={handleSaveAll}
                  className='bg-[#2563EB] text-white px-3 py-1.5 rounded-sm font-bold text-[11px] shadow-sm hover:bg-blue-700 transition active:scale-95'>
                    Save All Changes</button>  
                </div>
            )}

            {/* 4. Column Headers (Edge-to-Edge) */}
            <div className="bg-gray-100 border-b border-gray-200 px-4 py-2 flex justify-between items-center w-full">
                <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">WORKER NAME</span>
                <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase pl-4">{shift === 'Day' ? 'VEG / N-VEG / PAISE / ABSENT' : 'SHIFT / MEAL'}</span>
            </div>

            {/* 5. Seamless Worker List */}
            <div className='bg-white w-full'>
                {loading ? (
                    <div className='p-8 text-center text-gray-500 font-semibold'>
                        Loading workers from database... ⚙️
                    </div>
                ) : (
                   workers.map((worker, index) => {
                    const workerId = worker._id || worker.id;
                    return (
                        <div key={workerId}  style={{ animationDelay: `${index * 40}ms` }}>
                            <WorkerRow
                                worker={worker}
                                shift={shift}
                                dayStatus={workerStatuses[workerId] || ""}
                                nightStatus={workerStatuses[`${workerId}_night`] || ""}
                                onStatusChange={handleStatusChange}
                                onEdit={() => navigate('/edit-worker', {state: { worker }})}
                            />
                        </div>
                        );
                    })
                )}
            </div>
        </div>  
                
                {/* 🚨 SCROLL FADE GRADIENT */}
                <div className='fixed bottom-10 left-0 right-0 h-32 bg-linear-to-t from-gray-100 via-gray-100/90 to-transparent pointer-events-none z-30'></div>
                {/* 🚨 ADD NEW WORKER button */}
                <div className="fixed bottom-15 left-1 right-1 z-40 max-w-3xl mx-auto">
                <button 
                    onClick={() => navigate('/add-worker')}
                    className="w-full bg-green-700 hover:bg-green-800 text-white font-extrabold text-[15px] py-3 rounded-xl shadow-lg active:scale-[0.98] transition tracking-wide flex justify-center items-center gap-2"
                >
                    <UserPlus size={20} /> ADD NEW WORKER
                </button>
            </div>


        {/* Advance Payment Modal Overlay */}
        {isPaymentModalOpen && (
            <div className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4'>

                {/* The White Popup Card */}
                <div className='bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 relative'>


                    {/* Header & Close Button */}
                    <div className='flex justify-between items-center mb-6'>
                        <h2 className='text-lg font-bold text-gray-800'> Log Advance Payment</h2>
                        <button
                        onClick={() => setIsPaymentModalOpen(false)}
                        className='text-gray-500 hover:text-black transition text-xl font-bold'>
                            ✕
                        </button>
                    </div>

                    {/* The Form */}
                    <form onSubmit={handleSubmitAdvance} className='space-y-4'>

                        <div>
                            <label className='block text-sm font-semibold text-gray-700 mb-1'>Select Worker</label>
                            <select 
                            value={selectedWorkerId}
                            onChange={(e) => setSelectedWorkerId(e.target.value)}
                            className='w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-600 outline-none appearance-none bg-white'>
                                <option value="">-- Select Worker --</option>
                                {workers.map((worker) => (
                                    <option key={worker._id || worker.id} value={worker._id || worker.id}>
                                        {worker.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className='block text-sm font-semibold text-gray-700 mb-1"'>Amount (₹)</label>
                            <div className='relative'>
                                <input 
                                type="number"
                                required
                                value={advanceAmount}
                                onChange={(e) => setAdvanceAmount(e.target.value)}
                                placeholder='Enter amount'
                                className='w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-600 outline-none pr-8' />
                                <span className="absolute right-4 top-2.5 text-gray-500 font-bold">₹</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Transaction ID / Notes (Optional)</label>
                            <textarea 
                            value={advanceNotes}
                            onChange={(e) => setAdvanceNotes(e.target.value)}
                            placeholder='Enter UPI ID, Transaction ID or any notes...'
                            rows="6"
                            className='w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-600 outline-none resize-none'></textarea>
                        </div>

                        <button
                        type='submit'
                        disabled= {isSubmittingPayment}
                        className='w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3 rounded-xl mt-2 transition active:scale-[0.98]'>
                            {isSubmittingPayment ? "Submitting..." : "Submit"}
                        </button>
                    </form>
                </div>
            </div>
        )}

        </div>
        <BottomNav/>
    </div>
  );
}

export default Dashboard;