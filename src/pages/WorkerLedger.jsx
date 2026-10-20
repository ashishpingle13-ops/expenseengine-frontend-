import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import useSWR, { mutate } from 'swr';
import { api, fetcher } from '../lib/api';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { ArrowLeft, Pencil, ChevronDown, Plus, X, Calendar, Clock3, IndianRupee, FileText } from 'lucide-react';

const WorkerLedger = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    
    // SWR Fetchers placed at the top
    const { data: workerData } = useSWR(`/workers/${id}`, fetcher);
    const { data: ledgerHistory = [], isLoading } = useSWR(`/ledger/worker/${id}`, fetcher);
    
    // Grab data safely after fetchers
    const workerName = workerData?.name || location.state?.workerName || "Worker";
    const isActive = workerData ? workerData.isActive !== false : location.state?.isActive !== false;

    // UI States
    const [profilePeriod, setProfilePeriod] = useState(dayjs().format('MMM YYYY'));
    const [isEditMode, setIsEditMode] = useState(false);
    
    // Edit Modal States
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState(null);
    const [formData, setFormData] = useState({ amount: '', notes: '', reason: '', paymentMethod: 'Cash' });
    const [isSaving, setIsSaving] = useState(false);
    const EDIT_REASONS = ["Amount correction", "Date correction", "Payment method correction" ,"Duplicate entry", "Other"];
    const [isReasonDropdownOpen, setIsReasonDropdownOpen] = useState(false);
    const [entryDate, setEntryDate] = useState(dayjs().format('YYYY-MM-DD'));
    const [entryTime, setEntryTime] = useState(dayjs().format('HH:mm'));
    // 🚨 BUG FIX 1: Ensure ledgerHistory is always treated as an array so .filter() doesn't crash
    const safeHistory = Array.isArray(ledgerHistory) ? ledgerHistory : [];

    // Filter math for the selected month
    // 🚨 BUG FIX: Safe Filter Math for the selected month
    const visibleEntries = safeHistory.filter(entry => {
        // Fallback to createdAt if date is missing
        const recordDate = entry.date || entry.createdAt; 
        if (!recordDate) return false;
        
        // Convert the database date to match the "MMM YYYY" dropdown exactly
        const entryMonthYear = dayjs(recordDate).format('MMM YYYY');
        return entryMonthYear === profilePeriod;
    });

    const periodTotal = visibleEntries.reduce((sum, e) => sum + e.amount, 0);
    const totalAdvance = safeHistory.reduce((sum, e) => sum + e.amount, 0);
    // 🚨 BUG FIX 2: Use dayjs to generate the dropdown options so they match the filter perfectly
    const monthOptions = useMemo(() => {
        return Array.from({ length: 12 }).map((_, i) => 
            dayjs().subtract(i, 'month').format('MMM YYYY')
        );
    }, []);

    const formatMoney = (amount) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount);

    // Unified Handle Save (Add & Edit)
    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.amount) return toast.error("Amount required!");
        if (editId && !formData.reason) return toast.error("Reason for Edit is required!");

        try {
            setIsSaving(true);
            const payload = {
                amount: Number(formData.amount),
                paymentMethod: formData.paymentMethod || "Cash",
                description: formData.notes,
                date: dayjs(`${entryDate}T${entryTime}`).toISOString()
            };

            if (editId) {
                payload.isEdited = true;
                payload.editReason = formData.reason;
                await api.put(`/ledger/${editId}`, payload);
                toast.success("Transaction updated!");
            } else {
                payload.entryType = "Advance";
                payload.workerId = id;
                await api.post('/ledger', payload);
                toast.success("Advance logged!");
            }

            setShowModal(false);
            setEditId(null);
            setFormData({ amount: '', notes: '', reason: '', paymentMethod: 'Cash' });
            
            // Instantly refresh this page AND the cashbook cache
            mutate(`/ledger/worker/${id}`);
            mutate('/ledger'); 
        } catch (error) {
            toast.error("Failed to save.");
        } finally {
            setIsSaving(false);
        }
    };

    const openEditModal = (entry) => {

        setEntryDate(dayjs(entry.date).format('YYYY-MM-DD'));
        setEntryTime(dayjs(entry.date).format('HH:mm'));
        setEditId(entry._id);
        setFormData({ 
            amount: entry.amount.toString(), 
            notes: entry.description || "", 
            reason: entry.editReason || "",
            paymentMethod: entry.paymentMethod || "Cash"
        });
        setShowModal(true);
    };

    return (
        <main className="fixed inset-0 flex flex-col bg-[#F9FAFB] max-w-md mx-auto overflow-hidden animate-slide-in-right font-sans">
            
            {/* 1. BLUE HEADER */}
            <header className="bg-[#1048A4] px-4 pb-12 pt-4 text-white">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="flex h-10 w-10 shrink-0 items-center justify-center active:scale-95 transition">
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                    
                    {/* 💡 Tapping the header area now opens the Edit Worker page! */}
                    <div 
                        onClick={() => workerData && navigate('/edit-worker', { state: { worker: workerData } })}
                        className="flex min-w-0 flex-1 items-center gap-3 cursor-pointer group active:opacity-90 transition"
                        title="Edit Worker Profile"
                    >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 text-lg font-bold shadow-sm">
                            {workerName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-[17px] font-semibold leading-tight group-hover:underline">{workerName} ✏️</p>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-200 mt-0.5">
                                {isActive ? "Active worker (Tap to edit)" : "Inactive worker (Tap to edit)"}
                            </p>
                        </div>
                    </div>
                    {/* Pencil Edit Button */}
                    {isActive && (
                      <button onClick={() => setIsEditMode(!isEditMode)} className={`flex h-10 w-10 items-center justify-center rounded-full transition active:scale-95 ${isEditMode ? "bg-white text-[#1048A4]" : "text-white bg-white/10"}`}>
                          <Pencil className="h-4 w-4" />
                      </button>
                  )}
                </div>
            </header>

          {/* 2. OVERLAPPING SUMMARY CARD (Fixed Balance Display) */}
            <section className="-mt-10 px-4 relative z-10">
                <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-xl">
                    <div className="flex items-end justify-between">
                        <div>
                            <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500">Advance this month</p>
                            {/* Make the active period total the large red number */}
                            <p className="mt-1 text-[26px] font-bold text-[#C0392B]">₹{formatMoney(periodTotal)}</p>
                        </div>
                        <div className="text-right border-l border-gray-200 pl-4">
                            <p className="text-[9px] font-bold uppercase text-gray-400 mb-0.5">LIFETIME</p>
                            {/* Show the lifetime total as the secondary metric */}
                            <p className={`text-sm font-extrabold ${totalAdvance > 0 ? 'text-[#C0392B]' : 'text-gray-800'}`}>₹{formatMoney(totalAdvance)}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. FILTER BAR */}
            <section className="flex items-center justify-between px-5 py-4 mt-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Transaction period</span>
                <div className="flex h-9 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 focus-within:border-[#1048A4] transition-colors">
                    <select value={profilePeriod} onChange={(e) => setProfilePeriod(e.target.value)} className="appearance-none bg-transparent text-[13px] font-bold outline-none text-[#1048A4] cursor-pointer">
                        {monthOptions.map(m => <option key={m}>{m}</option>)}
                    </select>
                    <ChevronDown className="h-3.5 w-3.5 text-[#1048A4] pointer-events-none" />
                </div>
            </section>

            <div className="flex border-y border-gray-200 bg-gray-100 px-5 py-2">
                <span className="flex-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">Entries</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Amount</span>
            </div>

            {/* 4. LEDGER LIST */}
            <section className="flex-1 overflow-y-auto bg-white pb-28">
                {isLoading ? (
                    <p className="text-center text-gray-500 py-8 text-sm font-medium">Loading history...</p>
                ) : visibleEntries.length > 0 ? (
                    visibleEntries.map((entry) => (
                        <div key={entry._id} className="border-b border-gray-100">
                            <div className="flex items-start px-5 py-4">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="text-[13px] font-bold text-gray-900">{dayjs(entry.date).format('DD MMM YY • hh:mm A')}</p>
                                        {entry.isEdited && (
                                            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[8px] font-extrabold text-amber-700">EDITED</span>
                                        )}
                                    </div>
                                    <div className="mt-2 rounded-md bg-gray-50 border border-gray-200 p-2 mr-4 flex items-center justify-between gap-2">
                                        <p className="text-[12px] text-gray-600 leading-snug font-medium wrap-break">
                                            {entry.description || "Advance"}
                                        </p>
                                        <span className="shrink-0 rounded bg-white border border-gray-200 px-1.5 py-0.5 text-[9px] font-extrabold text-[#9D0052] uppercase">
                                            {entry.paymentMethod || "Cash"}
                                        </span>
                                    </div>
                                    {entry.isEdited && entry.editReason && (
                                        <p className="mt-1.5 text-[10px] font-bold text-amber-700">Reason: {entry.editReason}</p>
                                    )}
                                </div>
                                <div className="ml-3 flex items-start gap-2">
                                    <div className="rounded bg-red-50 px-2.5 py-1.5 border border-red-100">
                                        <p className="text-[15px] font-bold tabular-nums text-[#C0392B]">₹{formatMoney(entry.amount)}</p>
                                    </div>
                                    {isEditMode && (
                                        <button onClick={() => openEditModal(entry)} className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white shadow-sm text-gray-500 active:scale-95 transition mt-0.5">
                                            <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="px-4 py-12 text-center">
                        <p className="text-gray-400 text-sm font-semibold">No transactions for {profilePeriod}</p>
                    </div>
                )}
            </section>

            {/* 5. FLOATING BOTTOM BUTTON */}
            {isActive && (
              <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 z-20 animate-slide-up-bottom">
                  <button 
                      onClick={() => { 
                          setEditId(null); 
                          setFormData({ amount: '', notes: '', reason: '', paymentMethod: 'Cash' }); 
                          setEntryDate(dayjs().format('YYYY-MM-DD'));
                          setEntryTime(dayjs().format('HH:mm'));
                          setShowModal(true);
                      }}
                      className="w-full bg-[#9D0052] text-white font-bold text-[15px] tracking-wide py-3.5 rounded-xl shadow-lg active:scale-[0.98] transition flex justify-center items-center gap-2"
                  >
                      <Plus className="w-5 h-5" /> LOG ADVANCE
                  </button>
              </div>
          )}

            {/* 6. UNIFIED ADD/EDIT MODAL (True Bottom Sheet) */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end max-w-md mx-auto">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setShowModal(false)} />
                    
                    <div className="relative bg-white rounded-t-2xl shadow-[0_-4px_24px_rgba(0,0,0,0.12)] flex flex-col animate-slide-up-bottom px-5 pt-4 pb-8">
                        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4 shrink-0" />
                        
                        <div className="flex items-center justify-between mb-4 shrink-0">
                            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                                {editId ? "Edit Advance" : "Log Advance"}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center transition hover:bg-gray-200">
                                <X className="w-3.5 h-3.5 text-gray-500" />
                            </button>
                        </div>

                        <div className="overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                            <form id="workerLedgerForm" onSubmit={handleSave}>
                                
                                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Amount (₹)</label>
                                <div className="border border-gray-200 rounded-lg px-3 py-2.5 flex items-center gap-2 mb-3 focus-within:border-[#9D0052] transition-colors bg-white">
                                    <IndianRupee className="w-5 h-5 text-[#9D0052] shrink-0" />
                                    <input type="number" required value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} placeholder="0" className="flex-1 text-2xl font-bold text-gray-900 outline-none placeholder-gray-300 bg-transparent w-full" />
                                </div>

                                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Payment Method</label>
                                <div className="flex gap-2 mb-3">
                                    {['Cash', 'Online', 'Check', 'Other'].map((method) => {
                                        const isSelected = (formData.paymentMethod || 'Cash') === method;
                                        return (
                                            <button
                                                key={method}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, paymentMethod: method })}
                                                className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${isSelected ? 'bg-[#9D0052] border-[#9D0052] text-white' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                                            >
                                                {method}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="flex gap-2 mb-3">
                                    <div className="flex-1">
                                        <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Date</label>
                                        <div className="border border-gray-200 rounded-lg px-3 py-2.5 flex items-center gap-2 focus-within:border-[#9D0052] bg-white">
                                            <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                                            <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="flex-1 text-[13px] font-semibold text-gray-800 outline-none bg-transparent min-w-0" />
                                        </div>
                                    </div>
                                    <div className="w-32">
                                        <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Time</label>
                                        <div className="border border-gray-200 rounded-lg px-3 py-2.5 focus-within:border-[#9D0052] bg-white flex items-center gap-1">
                                            <input type="time" value={entryTime} onChange={(e) => setEntryTime(e.target.value)} className="w-full text-[13px] font-semibold text-gray-800 outline-none bg-transparent" />
                                        </div>
                                    </div>
                                </div>

                                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Description / Notes</label>
                                <div className="border border-gray-200 rounded-lg px-3 py-2.5 flex items-start gap-2 mb-5 focus-within:border-[#9D0052] bg-white">
                                    <FileText className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                                    <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={2} placeholder="Add details..." className="flex-1 text-sm text-gray-800 font-medium outline-none resize-none placeholder-gray-400 placeholder:font-normal bg-transparent" />
                                </div>

                                {editId && (
                                    <div className="mb-4 relative">
                                        <label className="block text-[11px] font-bold text-[#9D0052] uppercase tracking-widest mb-1">Reason for Edit *</label>
                                        
                                        <button
                                            type="button"
                                            onClick={() => setIsReasonDropdownOpen(!isReasonDropdownOpen)}
                                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 flex items-center justify-between bg-pink-50/20 focus:border-[#9D0052] text-sm font-semibold text-gray-900"
                                        >
                                            <span className={formData.reason ? "text-gray-900" : "text-gray-400"}>
                                                {formData.reason || "Select reason..."}
                                            </span>
                                            <ChevronDown className={`w-4 h-4 text-[#9D0052] shrink-0 transition-transform ${isReasonDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {isReasonDropdownOpen && (
                                            <div className="absolute bottom-full left-0 mb-1.5 z-50 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto py-1">
                                                {EDIT_REASONS.map((r) => (
                                                    <button
                                                        key={r}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData({ ...formData, reason: r });
                                                            setIsReasonDropdownOpen(false);
                                                        }}
                                                        className={`block w-full text-left px-3.5 py-2.5 text-sm font-medium transition-colors ${
                                                            formData.reason === r ? 'bg-pink-50 text-[#9D0052] font-bold' : 'text-gray-700 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        {r}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </form>
                        </div>

                        <button type="submit" form="workerLedgerForm" disabled={isSaving} className="w-full bg-[#9D0052] text-white text-sm font-bold rounded-xl py-3.5 tracking-wider uppercase transition-all active:scale-[0.99] shrink-0 mt-1">
                            {isSaving ? "SAVING..." : editId ? "SAVE CHANGES" : "SAVE ADVANCE"}
                        </button>
                    </div>
                </div>
            )}
        </main>
    );
};

export default WorkerLedger;