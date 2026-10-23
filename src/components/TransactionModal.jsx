import React from 'react';
import { X, Calendar, IndianRupee, Hash, FileText, ChevronDown } from 'lucide-react';

export default function TransactionModal({
    isOpen,
    onClose,
    onSubmit,
    type = "Advance", // "Advance" or "BossDeposit"
    editId = null,
    formData,
    setFormData,
    workers = [],
    isWorkerDropdownOpen,
    setIsWorkerDropdownOpen,
    isReasonDropdownOpen,
    setIsReasonDropdownOpen,
    EDIT_REASONS = [],
    isSubmitting = false,
    isWaitingForUpi = false,
    pendingUpiData = null,
    onCancelUpi = null,
    onPayOnline = null
}) {
    if (!isOpen) return null;

    const isAdvance = type === "Advance";
    const primaryColor = isAdvance ? "#9D0052" : "#0E793C";
    const selectedWorker = workers.find(w => (w._id || w.id) === formData.selectedWorkerId);

    return (
        <div className="fixed inset-0 z-50 flex flex-col justify-end max-w-md mx-auto">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={onClose} />
            
            {/* Bottom Sheet Card */}
            <div className="relative bg-white rounded-t-2xl px-5 pt-4 pb-8 animate-slide-up-bottom shadow-[0_-4px_24px_rgba(0,0,0,0.12)]">
                <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4 shrink-0" />
                
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                        {isAdvance ? (editId ? "Edit Advance" : "Log Advance") : (editId ? "Edit Deposit" : "Log Deposit")}
                    </h2>
                    <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center transition hover:bg-gray-200">
                        <X className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                </div>

                <div className="overflow-y-auto max-h-[75vh]" style={{ scrollbarWidth: 'none' }}>
                    <form id="universalTransactionForm" onSubmit={onSubmit}>
                        
                        {/* Amount Field */}
                        <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Amount (₹)</label>
                        <div className="border border-gray-200 rounded-lg px-3 py-2.5 flex items-center gap-2 mb-3 bg-white focus-within:border-[var(--theme-color)]" style={{ '--theme-color': primaryColor }}>
                            <IndianRupee className="w-5 h-5 shrink-0" style={{ color: primaryColor }} />
                            <input 
                                type="number" 
                                required 
                                value={formData.amount} 
                                onChange={(e) => setFormData({...formData, amount: e.target.value})} 
                                placeholder="0" 
                                className="flex-1 text-2xl font-extrabold text-gray-900 outline-none placeholder-gray-300 bg-transparent w-full" 
                            />
                        </div>

                        {/* Payment Method Tabs */}
                        <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Payment Method</label>
                        <div className="flex gap-2 mb-3">
                            {['Cash', 'Online', 'Check', 'Other'].map((method) => {
                                const isSelected = formData.paymentMethod === method;
                                return (
                                    <button
                                        key={method}
                                        type="button"
                                        onClick={() => setFormData({...formData, paymentMethod: method})}
                                        className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${
                                            isSelected ? 'text-white' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                                        }`}
                                        style={{ backgroundColor: isSelected ? primaryColor : undefined, borderColor: isSelected ? primaryColor : undefined }}
                                    >
                                        {method}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Worker Selector (Only for Advances) */}
                        {isAdvance && workers.length > 0 && (
                            <div className="mb-3 relative">
                                <label className="block text-[11px] font-semibold text-gray-400 uppercase mb-1">Worker</label>
                                <button
                                    type="button"
                                    onClick={() => setIsWorkerDropdownOpen(!isWorkerDropdownOpen)}
                                    className="w-full border border-gray-200 rounded-lg p-3 flex justify-between text-sm bg-white"
                                >
                                    <span className={selectedWorker ? "text-gray-900 font-semibold" : "text-gray-400"}>
                                        {selectedWorker?.name || "-- Select Active Worker --"}
                                    </span>
                                    <ChevronDown size={16} style={{ color: primaryColor }} />
                                </button>

                                {isWorkerDropdownOpen && (
                                    <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-40 overflow-y-auto mt-1">
                                        {workers.filter(w => w.isActive !== false).map(w => (
                                            <button
                                                key={w._id || w.id}
                                                type="button"
                                                onClick={() => {
                                                    setFormData({...formData, selectedWorkerId: w._id || w.id});
                                                    setIsWorkerDropdownOpen(false);
                                                }}
                                                className="block w-full text-left p-3 text-sm hover:bg-gray-50 font-medium"
                                            >
                                                {w.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Date & Time Row */}
                        <div className="flex gap-2 mb-3">
                            <div className="flex-1">
                                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Date</label>
                                <div className="border border-gray-200 rounded-lg px-3 py-2.5 flex items-center gap-2 bg-white">
                                    <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                                    <input 
                                        type="date" 
                                        value={formData.entryDate} 
                                        onChange={(e) => setFormData({...formData, entryDate: e.target.value})} 
                                        className="flex-1 text-sm font-semibold text-gray-800 outline-none bg-transparent min-w-0" 
                                    />
                                </div>
                            </div>
                            <div className="w-32">
                                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Time</label>
                                <div className="border border-gray-200 rounded-lg px-3 py-2.5 bg-white flex items-center">
                                    <input 
                                        type="time" 
                                        value={formData.entryTime} 
                                        onChange={(e) => setFormData({...formData, entryTime: e.target.value})} 
                                        className="w-full text-sm font-semibold text-gray-800 outline-none bg-transparent" 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Transaction ID (Only for Boss Deposits) */}
                        {!isAdvance && (
                            <>
                                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
                                    Transaction ID <span className="normal-case tracking-normal font-medium">(Optional)</span>
                                </label>
                                <div className="border border-gray-200 rounded-lg px-3 py-2.5 flex items-center gap-2 mb-3 bg-white">
                                    <Hash className="w-4 h-4 text-gray-400 shrink-0" />
                                    <input 
                                        type="text" 
                                        value={formData.transactionId} 
                                        onChange={(e) => setFormData({...formData, transactionId: e.target.value})} 
                                        placeholder="Bank or UPI reference" 
                                        className="flex-1 text-sm font-semibold text-gray-800 outline-none placeholder-gray-400 bg-transparent w-full" 
                                    />
                                </div>
                            </>
                        )}

                        {/* Description / Notes */}
                        <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Description / Notes</label>
                        <div className="border border-gray-200 rounded-lg px-3 py-2.5 flex items-start gap-2 mb-4 bg-white">
                            <FileText className="w-4 h-4 shrink-0 mt-0.5" style={{ color: primaryColor }} />
                            <textarea 
                                value={formData.notes} 
                                onChange={(e) => setFormData({...formData, notes: e.target.value})} 
                                rows={2} 
                                placeholder="Add details..." 
                                className="flex-1 text-sm text-gray-800 outline-none resize-none placeholder-gray-400 bg-transparent" 
                            />
                        </div>

                        {/* Reason for Edit (Only when editing) */}
                        {editId && (
                            <div className="mb-4 relative">
                                <label className="block text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: primaryColor }}>
                                    Reason for Edit *
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setIsReasonDropdownOpen(!isReasonDropdownOpen)}
                                    className="w-full border-2 rounded-lg px-3 py-2.5 flex items-center justify-between text-sm font-semibold text-gray-900 bg-white"
                                    style={{ borderColor: `${primaryColor}33` }}
                                >
                                    <span className={formData.reason ? "text-gray-900" : "text-gray-400"}>
                                        {formData.reason || "Select a reason..."}
                                    </span>
                                    <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isReasonDropdownOpen ? 'rotate-180' : ''}`} style={{ color: primaryColor }} />
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
                                                    formData.reason === r ? 'font-bold' : 'text-gray-700 hover:bg-gray-50'
                                                }`}
                                                style={{ color: formData.reason === r ? primaryColor : undefined, backgroundColor: formData.reason === r ? `${primaryColor}10` : undefined }}
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

                {/* Submit / Action Button */}
                {isWaitingForUpi && pendingUpiData ? (
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 text-center space-y-3 mt-2 animate-fade-in">
                        <p className="text-sm font-bold text-gray-900 leading-snug">
                            Confirm transfer of <span className="text-[#C0392B]">₹{pendingUpiData.amount}</span> to <span className="text-[#1048A4]">{pendingUpiData.workerName}</span>?
                        </p>
                        <div className="flex gap-2">
                            <button 
                                type="button"
                                onClick={onCancelUpi}
                                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-bold py-3 rounded-xl transition"
                            >
                                No (Cancel)
                            </button>
                            <button 
                                type="button"
                                disabled={isSubmitting}
                                onClick={onSubmit}
                                className="flex-1 text-white text-sm font-bold py-3 rounded-xl transition shadow-md bg-[#0E793C] hover:bg-[#0A5C2D]"
                            >
                                {isSubmitting ? "RECORDING..." : "Yes (Complete & Save)"}
                            </button>
                        </div>
                    </div>
                ) : isAdvance && formData.paymentMethod === 'Online' && !editId ? (
                    <div className="flex gap-2.5">
                        {/* Button 1: Save directly to database without opening GPay/QR */}
                        <button
                            type="submit"
                            form="universalTransactionForm"
                            disabled={isSubmitting}
                            className="flex-1 text-white text-xs font-extrabold rounded-xl py-3.5 tracking-wider uppercase transition-all active:scale-[0.99] disabled:opacity-70 shadow-md"
                            style={{ backgroundColor: primaryColor }}
                        >
                            {isSubmitting ? "SAVING..." : "SAVE ONLY"}
                        </button>

                        {/* Button 2: Generate QR and trigger GPay */}
                        <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={onPayOnline}
                            className="flex-[1.4] bg-[#1A73E8] hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl py-3.5 px-2 tracking-wider uppercase transition-all active:scale-[0.99] disabled:opacity-70 shadow-md"
                        >
                            {`PAY ₹${formData.amount || 0} ON GPAY`}
                        </button>
                    </div>
                ) : (
                    <button 
                        type="submit" 
                        form="universalTransactionForm" 
                        disabled={isSubmitting} 
                        className="w-full text-white text-sm font-bold rounded-xl py-3.5 tracking-wider uppercase transition-all active:scale-[0.99] disabled:opacity-70 shadow-md"
                        style={{ backgroundColor: primaryColor }}
                    >
                        {isSubmitting 
                            ? "SAVING..." 
                            : editId 
                                ? "SAVE CHANGES" 
                                : isAdvance 
                                    ? "SAVE ADVANCE" 
                                    : "SAVE DEPOSIT"}
                    </button>
                )}
            </div>
        </div>
    );
}