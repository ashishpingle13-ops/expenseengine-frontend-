import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import useSWR, { mutate } from 'swr';
import { api, fetcher } from '../lib/api';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { ArrowLeft, Pencil, ChevronDown, Plus, X, Calendar, Clock3, IndianRupee, FileText } from 'lucide-react';
import TransactionModal from '../components/TransactionModal';
import { generateDynamicUpiQrDataUrl, shareQrImageToUpiApp } from '../lib/qrUtils';


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
    
    const [isUpiRedirecting, setIsUpiRedirecting] = useState(false);
    const [isWaitingForUpi, setIsWaitingForUpi] = useState(false);
    const [pendingUpiData, setPendingUpiData] = useState(null);

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

    // Triggered when clicking "PAY ₹X ON GPAY"
    const handlePayOnline = async () => {
        const amountNum = Number(formData.amount);
        if (!amountNum || amountNum <= 0) return toast.error("Valid positive amount required!");

        const note = formData.notes || `Advance for ${workerName}`;
        const finalUpiId = workerData?.upiId || localStorage.getItem(`upi_${id}`) || (workerData?.phoneNumber ? `${workerData.phoneNumber}@ybl` : '');

        if (!finalUpiId) {
            toast.error('Please add a phone number or UPI ID for this worker first!');
            return;
        }

        try {
            const { dataUrl } = await generateDynamicUpiQrDataUrl({
                upiId: finalUpiId,
                workerName,
                amount: amountNum,
                note
            });

            setPendingUpiData({
                entryType: "Advance",
                workerId: id,
                amount: amountNum,
                paymentMethod: "Online",
                description: formData.notes,
                date: dayjs(`${entryDate}T${entryTime}`).toISOString(),
                workerName,
                upiId: finalUpiId,
                qrDataUrl: dataUrl
            });

            setShowModal(false);
            await shareQrImageToUpiApp(dataUrl, workerName, amountNum);
            setIsWaitingForUpi(true);
        } catch (err) {
            console.error("QR Share error:", err);
            setIsWaitingForUpi(true);
        }
    };
    
    
    // Unified Handle Save (Add & Edit)
    const handleSave = async (e) => {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        if (!formData.amount) return toast.error("Amount required!");
        if (editId && !formData.reason) return toast.error("Reason for Edit is required!");

        const amountNum = Number(formData.amount);

        try {
            setIsSaving(true);
            const payload = pendingUpiData ? {
                entryType: pendingUpiData.entryType,
                workerId: pendingUpiData.workerId,
                amount: pendingUpiData.amount,
                paymentMethod: pendingUpiData.paymentMethod,
                description: pendingUpiData.description,
                date: pendingUpiData.date
            } : {
                amount: amountNum,
                paymentMethod: formData.paymentMethod || "Cash",
                description: formData.notes,
                date: dayjs(`${entryDate}T${entryTime}`).toISOString(),
                entryType: "Advance",
                workerId: id
            };

            if (editId) {
                payload.isEdited = true;
                payload.editReason = formData.reason;
                await api.put(`/ledger/${editId}`, payload);
                toast.success("Transaction updated!");
            } else {
                await api.post('/ledger', payload);
                toast.success("Advance logged successfully! 🎉");
            }

            setShowModal(false);
            setEditId(null);
            setIsWaitingForUpi(false);
            setPendingUpiData(null);
            setFormData({ amount: '', notes: '', reason: '', paymentMethod: 'Cash' });
            
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
                       <TransactionModal
                            isOpen={showModal}
                            onClose={() => { setShowModal(false); setIsWaitingForUpi(false); setPendingUpiData(null); }}
                            onSubmit={handleSave}
                            type="Advance"
                            editId={editId}
                            formData={{
                                amount: formData.amount,
                                paymentMethod: formData.paymentMethod,
                                selectedWorkerId: id,
                                entryDate: entryDate,
                                entryTime: entryTime,
                                transactionId: "",
                                notes: formData.notes,
                                reason: formData.reason
                            }}
                            setFormData={(updated) => {
                                setFormData(prev => ({
                                    ...prev,
                                    ...(updated.amount !== undefined ? { amount: updated.amount } : {}),
                                    ...(updated.paymentMethod !== undefined ? { paymentMethod: updated.paymentMethod } : {}),
                                    ...(updated.notes !== undefined ? { notes: updated.notes } : {}),
                                    ...(updated.reason !== undefined ? { reason: updated.reason } : {})
                                }));
                                if (updated.entryDate !== undefined) setEntryDate(updated.entryDate);
                                if (updated.entryTime !== undefined) setEntryTime(updated.entryTime);
                            }}
                            workers={[]}
                            isWorkerDropdownOpen={false}
                            setIsWorkerDropdownOpen={() => {}}
                            isReasonDropdownOpen={isReasonDropdownOpen}
                            setIsReasonDropdownOpen={setIsReasonDropdownOpen}
                            EDIT_REASONS={EDIT_REASONS}
                            isSubmitting={isSaving}
                            isWaitingForUpi={isWaitingForUpi}
                            pendingUpiData={pendingUpiData}
                            onCancelUpi={() => { setIsWaitingForUpi(false); setPendingUpiData(null); }}
                            onPayOnline={handlePayOnline}
                        />

                        {!isUpiRedirecting && isWaitingForUpi && pendingUpiData && (
                        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in select-none">
                            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 relative animate-pop-in text-center space-y-4">
                                <div className="w-12 h-12 bg-blue-50 text-[#1048A4] rounded-full flex items-center justify-center mx-auto text-xl font-bold shadow-inner">
                                    ₹
                                </div>
                                <div>
                                    <h2 className="text-base font-extrabold text-gray-900 tracking-tight">Payment Confirmation</h2>
                                    <p className="text-sm font-medium text-gray-600 mt-2 leading-relaxed">
                                        Please confirm if the transfer of <span className="font-bold text-[#C0392B]">₹{pendingUpiData.amount}</span> to <span className="font-bold text-[#1048A4]">{pendingUpiData.workerName}</span> was completed successfully via GPay.
                                    </p>
                                </div>
                                {pendingUpiData.qrDataUrl && (
                                    <div className="flex flex-col items-center bg-gray-50 p-3 rounded-xl border border-gray-200">
                                        <img src={pendingUpiData.qrDataUrl} alt="Payment QR" className="w-36 h-36 rounded-lg shadow-sm" />
                                        <button
                                            type="button"
                                            onClick={() => shareQrImageToUpiApp(pendingUpiData.qrDataUrl, pendingUpiData.workerName, pendingUpiData.amount)}
                                            className="mt-2 bg-[#1A73E8] text-white px-4 py-2 rounded-lg text-xs font-bold shadow active:scale-95 transition"
                                        >
                                            Open QR in GPay / PhonePe Scanner
                                        </button>
                                    </div>
                                )}
                                <div className="flex gap-3 pt-2">
                                    <button 
                                        type="button"
                                        onClick={() => { setIsWaitingForUpi(false); setPendingUpiData(null); }}
                                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold py-3.5 rounded-xl transition active:scale-[0.98]"
                                    >
                                        No (Cancel)
                                    </button>
                                    <button 
                                        type="button"
                                        disabled={isSaving}
                                        onClick={handleSave}
                                        className="flex-1 bg-[#0E793C] hover:bg-[#0A5C2D] text-white text-sm font-bold py-3.5 rounded-xl transition active:scale-[0.98] shadow-lg"
                                    >
                                        {isSaving ? "RECORDING..." : "Yes (Complete & Save)"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                        {/* 🔒 3.5-SECOND LOCK SCREEN OVERLAY */}
                        {isUpiRedirecting && (
                            <div className="fixed inset-0 bg-black/60 z-[9999] flex flex-col items-center justify-center p-6 backdrop-blur-md select-none touch-none">
                                <div className="bg-white rounded-2xl p-6 max-w-xs w-full text-center shadow-2xl space-y-3 animate-pop-in">
                                    <div className="w-10 h-10 border-4 border-[#1048A4] border-t-transparent rounded-full animate-spin mx-auto" />
                                    <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">
                                        Opening UPI App...
                                    </h3>
                                    <p className="text-xs font-medium text-gray-500 leading-relaxed">
                                        Please complete the payment of <span className="font-bold text-gray-800">₹{pendingUpiData?.amount}</span> to <span className="font-bold text-[#1048A4]">{pendingUpiData?.workerName}</span>. Do not close or navigate away.
                                    </p>
                                </div>
                            </div>
                        )}
        </main>
    );
};

export default WorkerLedger;