import React , {  useState, useMemo } from 'react'
import { Search, FileText, User, UserPlus, ChevronDown, Plus, Pencil, X, Calendar, FileSpreadsheet, FileDown, Box, Clock3, NotebookText, IndianRupee, Hash } from 'lucide-react';
import { api, fetcher } from '../lib/api';
import toast from 'react-hot-toast';
import BottomNav from '../components/BottomNav'
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useNavigate, useLocation } from 'react-router-dom';
import useSWR, { mutate } from 'swr';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generateDynamicUpiQrDataUrl, shareQrImageToUpiApp } from '../lib/qrUtils';

// used to show the "Time ago" in the worker advance list
dayjs.extend(relativeTime);


const CashbookPage = () => {
    const navigate = useNavigate();
    const location = useLocation(); // Add this line
    const [activeTab, setActiveTab] = useState('workers');
    const [tabAnimClass, setTabAnimClass] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showBossModal, setShowBossModal] = useState(false);
    const [bossEditId, setBossEditId] = useState(null); // Tracks if we are editing
    const [bossFormData, setBossFormData] = useState({ amount: '', notes: '', transactionId: '', reason: '', paymentMethod: 'Cash'});
    const [isBossEditMode, setIsBossEditMode] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [pendingUpiData, setPendingUpiData] = useState(null);

    const [isUpiRedirecting, setIsUpiRedirecting] = useState(false);
    const [isWaitingForUpi, setIsWaitingForUpi] = useState(false);
    
    const [isWorkerDropdownOpen, setIsWorkerDropdownOpen] = useState(false);
    const [isReasonDropdownOpen, setIsReasonDropdownOpen] = useState(false);

    const EDIT_REASONS = ["Amount correction", "Date correction", "Payment method correction", "Duplicate entry", "Other"];
    const [entryDate, setEntryDate] = useState(dayjs().format('YYYY-MM-DD'));
    const [entryTime, setEntryTime] = useState(dayjs().format('HH:mm'));
    // worker advance logic
    const [showWorkerModal, setShowWorkerModal] = useState(false);
    const [selectedWorkerId, setSelectedWorkerId] = useState("");
    const [advanceAmount, setAdvanceAmount] = useState("");
    const [advanceNotes, setAdvanceNotes] = useState("");
    const [advancePaymentMethod, setAdvancePaymentMethod] = useState("Cash");
    const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);


    const monthOptions = useMemo(() => {
        const options = [];
        const d = new Date();
        d.setDate(1);
        for (let i = 0; i < 12; i++) {
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            const label = d.toLocaleString('default', { month: 'short', year: 'numeric' });
            options.push({ value: `${year}-${month}`, label });
            d.setMonth(d.getMonth() - 1); // Go back one month
        }
        return options;
    }, []);

    const [selectedDate, setSelectedDate] = useState(monthOptions[0].value);

    // ⚡ 1. SWR Instant Fetches
    const [year, month] = selectedDate.split('-');
    
    const { data: workers = [] } = useSWR('/workers?includeInactive=true', fetcher);
    const { data: ledgerData = [], isLoading } = useSWR('/ledger', fetcher);

    // ⚡ 2. Instant Math (Calculates perfectly the second the cache loads)
    const currentMonthLedger = ledgerData.filter(e => {
      const recordDate = e.date || e.createdAt;
      return recordDate && dayjs(recordDate).format('YYYY-MM') === selectedDate;
    });
    
    const monthlyExpenses = currentMonthLedger.filter(e => e.entryType === 'Expense').reduce((sum,e) => sum + e.amount,0);
    const monthlyAdvances = currentMonthLedger.filter(e => e.entryType === 'Advance').reduce((sum, e) => sum + e.amount, 0);
    const bossDeposits = currentMonthLedger.filter(e => e.entryType === 'BossDeposit');
   

    const mergedWorkers = workers.map(worker => {
        const workerEntries = currentMonthLedger.filter(
            e => e.entryType === 'Advance' && (e.workerId?._id || e.workerId) === worker._id
        );
        const totalAdvance = workerEntries.reduce((sum, e) => sum + e.amount, 0);
        const lastTransactionDate = workerEntries.length > 0
            ? workerEntries.reduce((latest, e) => new Date(e.date) > new Date(latest) ? e.date : latest, workerEntries[0].date)
            : null;
        return {
            ...worker,
            totalAdvance,
            lastTransactionDate
        };
    });

    // Live Search filter & Sort by highest advance
    const filteredWorkers = mergedWorkers
        .filter((worker) => worker.name?.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => b.totalAdvance - a.totalAdvance);

    const rawBossList = bossDeposits;
    
    // Live Search filter for Workers
    const filteredBossDeposits = rawBossList.filter(deposit => {
        const header = deposit.description || "Boss Deposit";
        return header.toLowerCase().includes((searchQuery || "").toLowerCase());
    })

    // Format currency helper
    const formatMoney = (amount) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0}).format(amount);
    };

    // Current balance logic
    const totalMonthlyDeposits = bossDeposits.reduce((sum, d) => sum + d.amount,0);
    const currentBalance = totalMonthlyDeposits - (monthlyAdvances + monthlyExpenses);
    let balanceStatus = { text: 'SURPLUS', color: 'text-green-700 bg-green-100', dot: 'bg-green-500', numColor: 'text-[#00C853]' };
    if (currentBalance < 0) {
        balanceStatus = { text: 'DEFICIT', color: 'text-red-700 bg-red-100', dot: 'bg-red-500', numColor: 'text-[#FF3B30]' };
    }

    // Handle Worker Advance Submission (Moved from Dashboard!)
   const handleSubmitAdvance = async (e) => {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        if(!selectedWorkerId){
            toast.error("Please select a worker!");
            return;
        }

        const amountNum = Number(advanceAmount);
        const workerObj = workers.find(w => (w._id || w.id) === selectedWorkerId);
        const workerName = workerObj?.name || 'Worker';
        const note = advanceNotes || `Advance for ${workerName}`;

        // If Online is selected and we aren't already waiting for confirmation
        if (advancePaymentMethod === 'Online' && !isWaitingForUpi && !isUpiRedirecting) {
            const finalUpiId = workerObj?.upiId || localStorage.getItem(`upi_${selectedWorkerId}`) || (workerObj?.phoneNumber ? `${workerObj.phoneNumber}@ybl` : '');
            
            if (!finalUpiId) {
                toast.error('Please add a phone number or UPI ID for this worker first!');
                return;
            }

            // 1. Save payload data temporarily
            setPendingUpiData({
                entryType: "Advance",
                workerId: selectedWorkerId,
                amount: amountNum,
                paymentMethod: "Online",
                description: advanceNotes,
                date: dayjs(`${entryDate}T${entryTime}`).toISOString(),
                workerName: workerName,
                upiId: finalUpiId
            });

            // 2. Close the Log Advance bottom sheet immediately so Cashbook is behind the blur
            setShowWorkerModal(false);

            // 3. Lock the entire screen so nothing can be tapped for 3.5 seconds
            setIsUpiRedirecting(true);

            // 4. Generate & Share QR Code with finalUpiId
            triggerUpiPayment(amountNum, note, finalUpiId, workerName);

            // 5. Wait 3.5 seconds, then unlock into the Yes/No confirmation modal
            setTimeout(() => {
                setIsUpiRedirecting(false);
                setIsWaitingForUpi(true);
            }, 3500);
            return;
        }

        // Standard save flow (for Cash, Check, or confirming Online)
        try {
            setIsSubmittingPayment(true);
            const payload = pendingUpiData ? {
                entryType: pendingUpiData.entryType,
                workerId: pendingUpiData.workerId,
                amount: pendingUpiData.amount,
                paymentMethod: pendingUpiData.paymentMethod,
                description: pendingUpiData.description,
                date: pendingUpiData.date
            } : {
                entryType: "Advance",
                workerId: selectedWorkerId,
                amount: amountNum,
                paymentMethod: advancePaymentMethod,
                description: advanceNotes,
                date: dayjs(`${entryDate}T${entryTime}`).toISOString()
            };

            await api.post("/ledger", payload);
            toast.success("Advance payment logged successfully! 🎉");

            // Reset form and close modal
            setSelectedWorkerId("");
            setAdvanceAmount("");
            setAdvanceNotes("");
            setAdvancePaymentMethod("Cash");
            setIsWaitingForUpi(false);
            setPendingUpiData(null);
            setShowWorkerModal(false);

            mutate('/ledger');
        } catch (error) {
            console.error("Error logging advance:", error);
            toast.error(error.response?.data?.message || "Failed to log advance payment.");
        } finally {
            setIsSubmittingPayment(false);
            // setIsWaitingForUpi(false);
        }
    };


       const triggerUpiPayment = async (amount, note, workerUpiId, workerName) => {
            try {
                // 1. Generate crisp QR image with the exact amount baked in
                const { dataUrl } = await generateDynamicUpiQrDataUrl({
                    upiId: workerUpiId,
                    workerName,
                    amount,
                    note
                });

                // Save QR image in state so the confirmation popup can also display it!
                setPendingUpiData(prev => prev ? { ...prev, qrDataUrl: dataUrl, upiId: workerUpiId } : prev);

                // 2. Open Android native Share Sheet -> Select "Google Pay" or "PhonePe" to scan immediately!
                await shareQrImageToUpiApp(dataUrl, workerName, amount);
            } catch (err) {
                console.error("QR Share error:", err);
            }
        };

    const handleBossSubmit = async (e) => {
        if(e) e.preventDefault();
        if(!bossFormData.amount) return toast.error("Please enter an amount!");
        
        if(bossEditId && !bossFormData.reason) {
            return toast.error("Reason for Edit is required!");
        }

        try {
            setIsSubmittingPayment(true);
            const cleanNotes = bossFormData.notes.trim();
            const cleanTxn = bossFormData.transactionId.trim();
            const finalDescryption = cleanTxn
                ? `${cleanNotes ? cleanNotes : 'Boss Deposit'} (Txn ID: ${cleanTxn})`
                : cleanNotes;

            const payload = {
                amount: Number(bossFormData.amount),
                paymentMethod: bossFormData.paymentMethod,
                description: finalDescryption,
                date: dayjs(`${entryDate}T${entryTime}`).toISOString()
            };

            if (bossEditId) {
                payload.isEdited = true;
                payload.editReason = bossFormData.reason;
                await api.put(`/ledger/${bossEditId}`, payload);
                toast.success("Deposit updated! 💰");
            } else {
                payload.entryType = "BossDeposit";
                await api.post('/ledger', payload);
                toast.success("Boss deposit logged! 💰");
            }

            setShowBossModal(false);
            setBossEditId(null);
            setBossFormData({ amount: '', notes: '', transactionId: '', reason: '', paymentMethod: 'Cash' });
            mutate('/ledger');
        } catch (error) {
            console.error("Error logging boss deposit:", error);
            toast.error("Failed to save deposit.");
        } finally {
            setIsSubmittingPayment(false);
        }
    }

    // Helper to open the edit modal and fill it with existing data
    const openBossEdit = (deposit) => {
        setBossEditId(deposit._id);
        const desc = deposit.description || "";
        const hasTxn = desc.includes("(Txn ID: ");
        
        setEntryDate(dayjs(deposit.date).format('YYYY-MM-DD'));
        setEntryTime(dayjs(deposit.date).format('HH:mm'));

        const rawNotes = hasTxn ? desc.split(" (Txn ID: ")[0].trim() : desc.trim();
        setBossFormData({
            amount: deposit.amount.toString(),
            notes: rawNotes === "Boss Deposit" ? "" : rawNotes,
            transactionId: hasTxn ? desc.split(" (Txn ID: ")[1]?.replace(")", "") || "" : "",
            reason: deposit.editReason || "",
            paymentMethod: deposit.paymentMethod || "Cash"
        });
        setShowBossModal(true);
    };

    // ─── Smart Tab Switcher for Animations ──────────────────────────────
    const handleTabSwitch = (newTab) => {
        if (newTab === activeTab) return; 
        
        // 1. Temporarily clear the animation class so the browser registers a change
        setTabAnimClass(''); 
        
        // 2. Use a tiny timeout to re-apply the animation class and switch the data
        setTimeout(() => {
            setTabAnimClass(newTab === 'boss' ? 'animate-slide-in-right' : 'animate-slide-in-left');
            setActiveTab(newTab);
            setSearchQuery('');
        }, 10); // 10ms is enough to trick the browser into re-triggering CSS animations
    };

    // ==========================================
    // 🖨️ EXPORT LOGIC (PDF & EXCEL)
    // ==========================================
    const handleExportExcel = () => {
        try {
            let csvContent = "Date,Type,Details,Amount (INR)\n";
            
            const rows = currentMonthLedger
                .filter(e => e.entryType === 'Advance' || e.entryType === 'BossDeposit')
                .sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt))
                .map(entry => {
                    const date = dayjs(entry.date || entry.createdAt).format('DD MMM YYYY hh:mm A');
                    const isDeposit = entry.entryType === 'BossDeposit';
                    const type = isDeposit ? 'FUNDS IN' : 'ADVANCE';
                    
                    let desc = entry.description ? entry.description.replace(/,/g, ' ') : '';
                    const method = entry.paymentMethod || 'Cash';
                    desc = desc ? `${desc} [${method}]` : `[${method}]`;
                    if (!isDeposit) {
                        const targetId = entry.workerId?._id || entry.workerId;
                        const w = workers.find(w => (w._id || w.id) === targetId);
                        const workerName = w ? w.name : "Unknown Worker";
                        desc = desc ? `${workerName} - ${desc}` : workerName;
                    }
                    
                    // Add + or - sign to the amount for Excel
                    const amountStr = isDeposit ? `+${entry.amount}` : `-${entry.amount}`;
                    
                    return `"${date}","${type}","${desc}","${amountStr}"`;
                });
                
            csvContent += rows.join("\n");
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `Cashbook_${selectedDate}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            setShowExportModal(false);
            toast.success("Excel downloaded successfully! 📊");
        } catch (error) {
            console.error("Export error:", error);
            toast.error("Failed to export Excel.");
        }
    };


   const handleExportPDF = () => {
        try {
            const doc = new jsPDF();
            
            // Header Info
            doc.setFontSize(16);
            doc.text(`Cashbook Ledger - ${dayjs(selectedDate).format('MMMM YYYY')}`, 14, 20);
            
            doc.setFontSize(11);
            doc.text(`Current Company Balance: Rs. ${formatMoney(currentBalance).replace('₹', '').trim()}`, 14, 30);
            doc.text(`Total Deposits (IN): Rs. ${formatMoney(totalMonthlyDeposits).replace('₹', '').trim()}`, 14, 36);
            doc.text(`Total Advances (OUT): Rs. ${formatMoney(monthlyAdvances).replace('₹', '').trim()}`, 14, 42);

            // Table Data
            const tableColumn = ["Date", "Type", "Details", "Amount"];
            const tableRows = [];

            // We need to keep track of which rows are deposits vs advances for styling later
            const rowTypes = [];

            currentMonthLedger
                .filter(e => e.entryType === 'Advance' || e.entryType === 'BossDeposit')
                .sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt))
                .forEach(entry => {
                    const date = dayjs(entry.date || entry.createdAt).format('DD MMM YY');
                    const isDeposit = entry.entryType === 'BossDeposit';
                    const type = isDeposit ? 'FUNDS IN' : 'ADVANCE';
                    
                    let desc = entry.description || '';
                    const method = entry.paymentMethod || 'Cash';
                    desc = desc ? `${desc} (${method})` : `(${method})`;
                    if (!isDeposit) {
                        const targetId = entry.workerId?._id || entry.workerId;
                        const w = workers.find(w => (w._id || w.id) === targetId);
                        const workerName = w ? w.name : "Unknown Worker";
                        desc = desc ? `${workerName} - ${desc}` : workerName;
                    }
                    
                    // Format Amount String
                    const amountStr = isDeposit ? `+ Rs. ${entry.amount}` : `- Rs. ${entry.amount}`;
                    
                    tableRows.push([date, type, desc, amountStr]);
                    rowTypes.push(isDeposit ? 'deposit' : 'advance'); // Store the type for styling
                });

            // Generate Table with Dynamic Colors
            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 50,
                theme: 'striped',
                headStyles: { fillColor: [16, 72, 164] },
                // Use a hook to style specific cells after they are drawn
                didParseCell: function(data) {
                    // Check if we are in the body of the table and formatting the "Amount" column (index 3)
                    if (data.section === 'body' && data.column.index === 3) {
                        const rowType = rowTypes[data.row.index];
                        if (rowType === 'deposit') {
                            data.cell.styles.textColor = [14, 121, 60]; // Green (#0E793C)
                            data.cell.styles.fontStyle = 'bold';
                        } else if (rowType === 'advance') {
                            data.cell.styles.textColor = [192, 57, 43]; // Red (#C0392B)
                            data.cell.styles.fontStyle = 'bold';
                        }
                    }
                }
            });

            doc.save(`Cashbook_${selectedDate}.pdf`);
            setShowExportModal(false);
            toast.success("PDF downloaded successfully! 📄");
        } catch (error) {
            console.error("PDF generation error:", error);
            toast.error("Failed to generate PDF. Make sure jspdf is installed.");
        }
    };
    
    // REUSABLE SEARCH AND DATE COMPONENT (Solves alignment issue & adds it to both tabs)
    const SearchAndDateFilter = (placeholder) => (
        <div className="flex gap-2 mb-4 mt-px px-0.5">
            {/* Search Input */}
            <div className="flex-1 flex items-center bg-white border border-gray-300 rounded-md px-3 py-2.5 focus-within:border-[#1048A4] transition-colors">
                <Search size={16} className="text-gray-400 mr-2 shrink-0 stroke-[2.5]" />
                <input 
                    type="text" 
                    placeholder={placeholder} 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full outline-none text-[14px] text-gray-700 bg-transparent placeholder:text-gray-400"
                />
            </div>
            
            {/* Month Dropdown */}
            <div className="bg-white border border-gray-300 rounded-md px-3 py-2.5 flex items-center shrink-0 focus-within:border-[#1048A4] transition-colors">
                <select 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="outline-none bg-transparent cursor-pointer text-[#1048A4] font-bold text-[13px] appearance-none pr-2"
                >
                    {monthOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
                <ChevronDown size={14} className="text-[#1048A4] pointer-events-none" />
            </div>

            {/* Export / Report Button */}
            {activeTab === 'workers' ? (
                <div className="flex gap-1.5 shrink-0">
                    <button 
                        onClick={() => navigate('/pick-contact', { state: { slideDirection: 'left' } })}
                        className="bg-[#1048A4] border border-[#1048A4] text-white rounded-md px-3 py-2.5 flex items-center justify-center active:scale-95 transition shadow-sm"
                        title="Add Worker"
                    >
                        <UserPlus size={18} />
                    </button>
                    <button 
                        onClick={() => setShowExportModal(true)}
                        className="bg-[#9D0052] border border-[#9D0052] text-white rounded-md px-3 py-2.5 flex items-center justify-center active:scale-95 transition shadow-sm"
                        title="Export Ledger"
                    >
                        <FileDown size={18} />
                    </button>
                </div>
            ) : (
                <button 
                    onClick={() => setIsBossEditMode(!isBossEditMode)}
                    className={`rounded-md px-3 py-2.5 flex items-center justify-center shrink-0 active:scale-95 transition border ${isBossEditMode ? 'bg-white border-green-800 text-green-700' : 'bg-green-700 border-green-700 text-white'}`}
                >
                    <Pencil size={18} />
                </button>
            )}
        </div>
    );

   const slideClass = location.state?.slideDirection === 'left' ? 'animate-slide-in-left' : location.state?.slideDirection === 'right' ? 'animate-slide-in-right' : 'animate-fade-in-fast';

return (
        <div className={`fixed inset-0 flex flex-col bg-gray-50 overflow-hidden ${slideClass}`}>
            
            {/* ENTIRE SCROLLABLE PAGE CONTENT */}
            <div className={`flex-1 overflow-y-auto pb-24 ${tabAnimClass}`} style={{ scrollbarWidth: 'none' }}>
                
                {/* TOP HEADER & TABS */}
                <div className="bg-[#1048A4] text-white pt-2 px-4 pb-20 shrink-0">
                <div className="flex justify-between">
                    <button 
                        onClick={() => handleTabSwitch('workers')}
                        className={`pb-2 font-bold text-[11px] tracking-wider w-1/2 transition-colors uppercase ${activeTab === 'workers' ? 'border-b-[3px] border-[#FFD700] text-white' : 'border-b-[3px] border-transparent text-blue-200'}`}
                    >
                        Workers Advance
                    </button>
                    <button 
                        onClick={() => handleTabSwitch('boss')}
                        className={`pb-2 font-bold text-[11px] tracking-wider w-1/2 uppercase transition-colors ${activeTab === 'boss' ? 'border-b-[3px] border-[#FFD700] text-white' : 'border-b-[3px] border-transparent text-blue-200'}`}
                    >
                        Boss Deposit
                    </button>
                </div>
            </div>

            {/* 1. Summary Card */}
            {/* MAIN CONTENT AREA */}
            <div className="-mt-16 px-2 max-w-md mx-auto w-full relative z-10 ">
                
                {/* 🌟 UNIFIED SUMMARY CARD (Always Visible) */}
                <div className="bg-white rounded-md border border-gray-200 shadow-xl overflow-hidden mb-4 mx-1">
                    {/* Top: Current Balance */}
                    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                        <div>
                            <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 ">
                                Current company balance
                            </p>
                            <p className={`mt-1 text-2xl font-extrabold leading-none tracking-tight text-gray-900 transition-colors duration-500 ${currentBalance >= 0 ? 'text-green-500' : 'text-red-700'}`}>
                                {formatMoney(currentBalance)}
                            </p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold tracking-widest ${balanceStatus.color}`}>
                            {balanceStatus.text}
                        </span>
                    </div>
                    {/* Bottom: You Got / You Gave */}
                    <div className="grid grid-cols-2 divide-x divide-gray-200">
                        <div className="px-4 py-2.5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">You got</p>
                            <p className="text-[15px] font-bold text-[#0E793C]">
                                {formatMoney(totalMonthlyDeposits)}
                            </p>
                        </div>
                        <div className="px-4 py-2.5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">You gave</p>
                            <p className="text-[15px] font-bold text-[#C0392B]">
                                {formatMoney(monthlyAdvances)}
                            </p>
                        </div>
                    </div>
                </div>

                {activeTab === 'workers' ? (
                    <div className="space-y-4">
                        
                        {/* 2. Search & Month Bar */}
                        {SearchAndDateFilter("Search workers...")}

                        {/* 3. Worker Advances List */}
                        <div className="mt-4 pb-4">
                            {isLoading ? (
                                <p className="text-center text-gray-500 py-8 text-sm font-medium">Loading records...</p>
                            ) : filteredWorkers.length > 0 ? (
                                /* We map twice: first for Active (true), then for Inactive (false) */
                                [true, false].map(isActiveGroup => {
                                    const groupWorkers = filteredWorkers.filter(w => {
                                      const matchesActive = (w.isActive !== false) === isActiveGroup;
                                      if (!isActiveGroup) return matchesActive && w.totalAdvance > 0; // Only show inactive if they still owe advance
                                      return matchesActive;
                                        });
                                    if (groupWorkers.length === 0) return null;

                                    return (
                                        <div key={isActiveGroup ? 'active' : 'inactive'}>
                                            {/* Group Header */}
                                            <div className={`flex items-center border-y border-gray-200 bg-gray-100 px-0.5 py-2 ${isActiveGroup ? 'mt-2' : 'mt-4'}`}>
                                                <span className="flex-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                                    {isActiveGroup ? "Active worker ledger" : "Inactive workers"}
                                                </span>
                                                {isActiveGroup && <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Outstanding</span>}
                                            </div>
                                            
                                            {/* Worker Rows */}
                                            <div className="space-y-0.5">
                                                {groupWorkers.map((worker) => (
                                                    <div 
                                                        key={worker._id} 
                                                        onClick={() => navigate(`/worker/${worker._id}`, { state: { workerName: worker.name, totalAdvance: worker.totalAdvance, isActive: worker.isActive !== false } })} 
                                                        className="bg-white border-b border-gray-100 py-2 flex justify-between items-center active:bg-gray-50 px-0.5 cursor-pointer transition-colors"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${isActiveGroup ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-400'}`}>
                                                                {worker.name ? worker.name.charAt(0).toUpperCase() : <User size={16}/>}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className={`font-bold text-[13px] leading-tight ${isActiveGroup ? 'text-gray-900' : 'text-gray-400'}`}>{worker.name}</p>
                                                                    {!isActiveGroup && <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[8px] font-extrabold text-white leading-none tracking-wide">INACTIVE</span>}
                                                                </div>
                                                                <p className="text-[10px] font-medium text-gray-400 mt-0.5">
                                                                    {worker.lastTransactionDate ? `Last payment · ${dayjs(worker.lastTransactionDate).format('DD MMM')}` : `No entries · ${monthOptions.find(o => o.value === selectedDate)?.label.split(' ')[0]}`}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <p className={`font-bold text-[15px] tabular-nums ${worker.totalAdvance === 0 ? 'text-gray-400' : 'text-[#C0392B]'}`}>
                                                                    {worker.totalAdvance > 0 ? '-' : ''}₹{formatMoney(worker.totalAdvance).replace('₹', '')}
                                                                </p>
                                                                {/* EDITED BADGE */}
                                                                {currentMonthLedger.some(e => e.entryType === 'Advance' && (e.workerId?._id || e.workerId) === worker._id && e.isEdited) && (
                                                                    <span className="rounded-full bg-amber-100 border border-amber-200 px-1.5 py-0.5 text-[8px] font-extrabold text-amber-700">EDITED</span>
                                                                )}
                                                            </div>
                                                            <p className={`text-[8px] font-bold tracking-widest mt-0.5 ${worker.totalAdvance === 0 ? 'text-gray-400' : 'text-[#C0392B]'}`}>ADVANCE</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center bg-white rounded-xl border border-dashed border-gray-300 py-10 mt-4">
                                    <p className="text-gray-500 text-sm font-medium">No workers found.</p>
                                </div>
                            )}
                        </div>
                            
                    </div>
                ) : (
                    
                    
                    
                    // BOSS DEPOSIT TAB 
                    <div className="flex flex-col pb-24 relative ">

                                {/* 1. Search & Month Selector */}
                                {SearchAndDateFilter("Search deposits...")}

                            {/* 2. Transaction List */}
                            <div className="space-y-0.5 flex-1 overflow-y-auto pb-4"> 
                                {filteredBossDeposits.length > 0 ? (
                                filteredBossDeposits.map((deposit) => (
                                   <div 
                                        key={deposit._id} 
                                        onClick={() => isBossEditMode && openBossEdit(deposit)} 
                                        className="bg-white border-b border-gray-100 py-3 px-4 flex justify-between items-center active:bg-gray-50 cursor-pointer transition-colors"
                                    >
                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                            <div className="w-10 h-10 bg-gray-200 rounded-full flex shrink-0 items-center justify-center text-gray-600 font-bold text">
                                                B
                                            </div>
                                            <div className="overflow-hidden w-full">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <p className="font-bold text-gray-900 text-[14px] truncate leading-tight">
                                                        {(deposit.description ? deposit.description.split(' (Txn ID:')[0].trim() : "") || "Boss Deposit"}
                                                    </p>
                                                    <span className="shrink-0 rounded bg-green-50 border border-green-200 px-1.5 py-0.5 text-[9px] font-bold text-[#0E793C] uppercase">
                                                        {deposit.paymentMethod || 'Cash'}
                                                    </span>
                                                    {deposit.isEdited && (
                                                        <span className="shrink-0 rounded-full bg-amber-100 border border-amber-200 px-1.5 py-0.5 text-[8px] font-extrabold text-amber-700">EDITED</span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-gray-400 font-medium mt-1">
                                                    {dayjs(deposit.date).format('DD MMM YY · hh:mm A')}
                                                    {deposit.description && deposit.description.includes('(Txn ID:') ? ` · Txn: ${deposit.description.split('(Txn ID: ')[1].replace(')', '')}` : ''}
                                                </p>
                                                {deposit.isEdited && deposit.editReason && (
                                                    <p className="mt-1 text-[10px] font-bold text-amber-700">Reason: {deposit.editReason}</p>
                                                )}
                                            </div>
                                        </div>
                                            <div className="ml-3 flex items-start gap-2 shrink-0">
                                                <div className="text-right">
                                                    <p className="font-bold text-[#0E793C] text-[15px] tabular-nums">+ {formatMoney(deposit.amount)}</p>
                                                    <p className="text-[9px] font-bold text-green-600 tracking-widest mt-0.5">FUNDS IN</p>
                                                </div>
                                                {isBossEditMode && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); openBossEdit(deposit); }} 
                                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white shadow-sm text-gray-500 active:scale-95 transition mt-0.5"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center bg-white rounded-xl border border-dashed border-gray-300 py-10">
                                    <p className="text-gray-500 text-sm font-medium">No boss deposits found for this month.</p>
                                </div>
                            )}
                        </div>

                                </div>
                        )}
                    </div>
                </div>


                            {/* 🌟 4. UNIFIED FLOATING ACTION BUTTON (Locked in place, never scrolls!) */}
                                {(!showWorkerModal && !showBossModal && !showExportModal) && (
                                    <button
                                        onClick={() => {
                                            setEntryDate(dayjs().format('YYYY-MM-DD'));
                                            setEntryTime(dayjs().format('HH:mm'));
                                            if (activeTab === 'workers') {
                                                setSelectedWorkerId("");
                                                setAdvanceAmount("");
                                                setAdvanceNotes("");
                                                setAdvancePaymentMethod('Cash');
                                                setIsWorkerDropdownOpen(false);
                                                setShowWorkerModal(true);
                                            } else {
                                                setBossEditId(null);
                                                setBossFormData({ amount: '', notes: '', transactionId: '', reason: '', paymentMethod: 'Cash' });
                                                setShowBossModal(true);
                                            }
                                        }}
                                        className={`fixed z-30 flex items-center gap-1.5 font-bold text-white text-[13px] tracking-wide transition-colors duration-200 active:scale-95 ${
                                            activeTab === 'workers' ? 'bg-[#9D0052]' : 'bg-[#0E793C]'
                                        }`}
                                        style={{
                                            bottom: 84,
                                            right: 16,
                                            borderRadius: 999,
                                            padding: "11px 18px",
                                            boxShadow: activeTab === 'workers'
                                                ? "0 3px 10px rgba(157,0,82,0.45)"
                                                : "0 3px 10px rgba(14,121,60,0.45)"
                                        }}
                                    >
                                        <Plus className="w-4 h-4" />
                                        {activeTab === 'workers' ? 'LOG ADVANCE' : 'LOG DEPOSIT'}
                                    </button>
                                )}

            
            {/* 🌟 UNIFIED UNIVERSAL BOTTOM SHEET (Advances & Deposits) */}
            {(showWorkerModal || showBossModal) && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end max-w-md mx-auto ">
                    <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={() => { setShowWorkerModal(false); setShowBossModal(false); setBossEditId(null); setIsWorkerDropdownOpen(false); setSelectedWorkerId(""); }} />
                    <div className="relative bg-white rounded-t-2xl px-5 pt-4 pb-8 animate-slide-up-bottom" style={{ boxShadow: "0 -4px 24px rgba(0,0,0,0.12)" }}>
                        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4 shrink-0" />
                        
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                                {showWorkerModal ? "Log Advance" : bossEditId ? "Edit Deposit" : "Log Deposit"}
                            </h2>
                            <button onClick={() => { setShowWorkerModal(false); setShowBossModal(false); setBossEditId(null); setIsWorkerDropdownOpen(false); setSelectedWorkerId(""); }} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                                <X className="w-3.5 h-3.5 text-gray-500" />
                            </button>
                        </div>

                        <div className="overflow-y-auto max-h-[75vh]" style={{ scrollbarWidth: 'none' }}>
                            <form id="unifiedForm" onSubmit={showWorkerModal ? handleSubmitAdvance : handleBossSubmit}>
                                
                                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Amount (₹)</label>
                                <div className={`border border-gray-200 rounded-lg px-3 py-2.5 flex items-center gap-2 mb-3 bg-white ${showWorkerModal ? 'focus-within:border-[#9D0052]' : 'focus-within:border-[#0E793C]'}`}>
                                    <IndianRupee className={`w-5 h-5 shrink-0 ${showWorkerModal ? 'text-[#9D0052]' : 'text-[#0E793C]'}`} />
                                    <input type="number" required value={showWorkerModal ? advanceAmount : bossFormData.amount} onChange={(e) => showWorkerModal ? setAdvanceAmount(e.target.value) : setBossFormData({...bossFormData, amount: e.target.value})} placeholder="0" className="flex-1 text-2xl font-extrabold text-gray-900 outline-none placeholder-gray-300 bg-transparent w-full" />
                                </div>

                                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Payment Method</label>
                                <div className="flex gap-2 mb-3">
                                    {['Cash', 'Online', 'Check', 'Other'].map((method) => {
                                        const isSelected = showWorkerModal ? advancePaymentMethod === method : bossFormData.paymentMethod === method;
                                        const activeBg = showWorkerModal ? 'bg-[#9D0052] border-[#9D0052]' : 'bg-[#0E793C] border-[#0E793C]';
                                        
                                        return (
                                            <button
                                                key={method}
                                                type="button"
                                                onClick={() => showWorkerModal ? setAdvancePaymentMethod(method) : setBossFormData({...bossFormData, paymentMethod: method})}
                                                className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${isSelected ? `${activeBg} text-white` : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                                            >
                                                {method}
                                            </button>
                                        );
                                    })}
                                </div>

                            
                                    {showWorkerModal && (
                                    <div className="mb-3 relative">
                                        <label className="block text-[11px] font-semibold text-gray-400 uppercase mb-1">
                                        Worker
                                        </label>

                                        <button
                                        type="button"
                                        onClick={() => setIsWorkerDropdownOpen(!isWorkerDropdownOpen)}
                                        className="w-full border border-gray-200 rounded-lg p-3 flex justify-between text-sm"
                                        >
                                        {workers.find(w => (w._id || w.id) === selectedWorkerId)?.name || "-- Select Active Worker --"}
                                        <ChevronDown size={16} className="text-[#9D0052]" />
                                        </button>

                                        {isWorkerDropdownOpen && (
                                        <div className="absolute z-50 w-full bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                            {workers.filter(w => w.isActive !== false).map(w => (
                                            <button
                                                key={w._id || w.id}
                                                type="button"
                                                onClick={() => {
                                                setSelectedWorkerId(w._id || w.id);
                                                setIsWorkerDropdownOpen(false);
                                                }}
                                                className="block w-full text-left p-2.5 text-sm hover:bg-pink-50"
                                            >
                                                {w.name}
                                            </button>
                                            ))}
                                        </div>
                                        )}
                                    </div>
                                    )}


                                <div className="flex gap-2 mb-3">
                                    <div className="flex-1">
                                        <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Date</label>
                                        <div className={`border border-gray-200 rounded-lg px-3 py-2.5 flex items-center gap-2 bg-white ${showWorkerModal ? 'focus-within:border-[#9D0052]' : 'focus-within:border-[#0E793C]'}`}>
                                            <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                                            <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="flex-1 text-sm font-semibold text-gray-800 outline-none bg-transparent min-w-0" />
                                        </div>
                                    </div>
                                    <div className="w-32">
                                        <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Time</label>
                                        <div className={`border border-gray-200 rounded-lg px-3 py-2.5 bg-white flex items-center ${showWorkerModal ? 'focus-within:border-[#9D0052]' : 'focus-within:border-[#0E793C]'}`}>
                                            <input type="time" value={entryTime} onChange={(e) => setEntryTime(e.target.value)} className="w-full text-sm font-semibold text-gray-800 outline-none bg-transparent" />
                                        </div>
                                    </div>
                                </div>

                                {!showWorkerModal && (
                                    <>
                                        <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Transaction ID <span className="normal-case tracking-normal font-medium">(Optional)</span></label>
                                        <div className="border border-gray-200 rounded-lg px-3 py-2.5 flex items-center gap-2 mb-3 bg-white focus-within:border-[#0E793C]">
                                            <Hash className="w-4 h-4 text-gray-400 shrink-0" />
                                            <input type="text" value={bossFormData.transactionId} onChange={(e) => setBossFormData({...bossFormData, transactionId: e.target.value})} placeholder="Bank or UPI reference" className="flex-1 text-sm font-semibold text-gray-800 outline-none placeholder-gray-400 bg-transparent w-full" />
                                        </div>
                                    </>
                                )}

                                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Description / Notes</label>
                                <div className={`border border-gray-200 rounded-lg px-3 py-2.5 flex items-start gap-2 mb-5 bg-white ${showWorkerModal ? 'focus-within:border-[#9D0052]' : 'focus-within:border-[#0E793C]'}`}>
                                    <FileText className={`w-4 h-4 shrink-0 mt-0.5 ${showWorkerModal ? 'text-[#9D0052]' : 'text-[#0E793C]'}`} />
                                    <textarea value={showWorkerModal ? advanceNotes : bossFormData.notes} onChange={(e) => showWorkerModal ? setAdvanceNotes(e.target.value) : setBossFormData({...bossFormData, notes: e.target.value})} rows={2} placeholder="Add details..." className="flex-1 text-sm text-gray-800 outline-none resize-none placeholder-gray-400 bg-transparent" />
                                </div>

                               {bossEditId && !showWorkerModal && (
                                    <div className="mb-5 relative">
                                        <label className="block text-[11px] font-bold text-[#0E793C] uppercase tracking-widest mb-1">Reason for Edit *</label>
                                        
                                        <button
                                            type="button"
                                            onClick={() => setIsReasonDropdownOpen(!isReasonDropdownOpen)}
                                            className="w-full border-2 border-[#0E793C]/20 rounded-lg px-3 py-2.5 flex items-center justify-between bg-green-50/30 focus:border-[#0E793C] text-sm font-semibold text-gray-900"
                                        >
                                            <span className={bossFormData.reason ? "text-gray-900" : "text-gray-400"}>
                                                {bossFormData.reason || "Select a reason..."}
                                            </span>
                                            <ChevronDown className={`w-4 h-4 text-[#0E793C] shrink-0 transition-transform ${isReasonDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {isReasonDropdownOpen && (
                                            <div className="absolute bottom-full left-0 mb-1.5 z-50 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto py-1">
                                                {EDIT_REASONS.map((r) => (
                                                    <button
                                                        key={r}
                                                        type="button"
                                                        onClick={() => {
                                                            setBossFormData({ ...bossFormData, reason: r });
                                                            setIsReasonDropdownOpen(false);
                                                        }}
                                                        className={`block w-full text-left px-3.5 py-2.5 text-sm font-medium transition-colors ${
                                                            bossFormData.reason === r ? 'bg-green-50 text-[#0E793C] font-bold' : 'text-gray-700 hover:bg-gray-50'
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

                    
                                <button 
                                    type="submit" 
                                    form="unifiedForm" 
                                    disabled={isSubmittingPayment} 
                                    className={`w-full text-white text-sm font-bold rounded-xl py-3.5 tracking-wider uppercase transition-all active:scale-[0.99] disabled:opacity-70 ${
                                        showWorkerModal && advancePaymentMethod === 'Online' 
                                            ? 'bg-[#1A73E8] hover:bg-[#1557B0]' 
                                            : showWorkerModal 
                                                ? 'bg-[#9D0052] hover:bg-[#800043]' 
                                                : 'bg-[#0E793C] hover:bg-[#0A5C2D]'
                                    }`}
                                >
                                    {isSubmittingPayment 
                                        ? "SAVING..." 
                                        : bossEditId 
                                            ? "SAVE CHANGES" 
                                            : showWorkerModal && advancePaymentMethod === 'Online' 
                                                ? `PAY ₹${advanceAmount || 0} ON GPAY` 
                                                : showWorkerModal 
                                                    ? "SAVE ADVANCE" 
                                                    : "SAVE DEPOSIT"}
                                </button>
                    </div>
                </div>
            )}
            
            {/* 6. EXPORT LEDGER MODAL (Centered Pop-in) */}
            {showExportModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative mt-[-10%] animate-pop-in">
                        
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                            <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">Export Ledger</h2>
                            <button onClick={() => setShowExportModal(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="p-5">
                            {/* Select Period Dropdown */}
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">Select Period</label>
                            <div className="mb-5 flex items-center border border-gray-300 rounded-lg px-3 py-3 focus-within:border-blue-600 transition-colors">
                                <Calendar className="h-4 w-4 text-gray-500 shrink-0" />
                                <select 
                                    value={selectedDate} 
                                    onChange={(e) => setSelectedDate(e.target.value)} 
                                    className="ml-2 flex-1 appearance-none bg-white text-sm font-bold outline-none text-gray-800"
                                >
                                    {monthOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                                <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" />
                            </div>

                            {/* Export as PDF Button */}
                            <button 
                                onClick={handleExportPDF} 
                                className="mb-3 flex w-full items-center border border-gray-200 rounded-xl p-3.5 text-left hover:bg-gray-50 transition active:scale-[0.98]"
                            >
                                <FileText className="mr-3 h-7 w-7 shrink-0 text-red-600" />
                                <div>
                                    <span className="block text-sm font-bold text-gray-900">Export as PDF</span>
                                    <span className="block text-[11px] font-semibold text-gray-400 mt-0.5">Print Ready</span>
                                </div>
                            </button>

                            {/* Export as Excel Button */}
                            <button 
                                onClick={handleExportExcel} 
                                className="flex w-full items-center border border-gray-200 rounded-xl p-3.5 text-left hover:bg-gray-50 transition active:scale-[0.98]"
                            >
                                <FileSpreadsheet className="mr-3 h-7 w-7 shrink-0 text-green-600" />
                                <div>
                                    <span className="block text-sm font-bold text-gray-900">Export as Excel</span>
                                    <span className="block text-[11px] font-semibold text-gray-400 mt-0.5">CSV Format</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}
           
            {/* Only show BottomNav if NO modals or locks are open */}
            {(!showWorkerModal && !showBossModal && !showExportModal && !isUpiRedirecting && !isWaitingForUpi) && <BottomNav />}

            {/* 🔒 1. 3.5-SECOND UNCLICKABLE SCREEN BLOCKER WHILE LAUNCHING GPAY */}
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

            {/* 🌟 2. FULL-SCREEN BLURRED UPI PAYMENT CONFIRMATION POPUP (Appears after 3.5s) */}
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
                            {/* NO / CANCELED BUTTON */}
                            <button 
                                type="button"
                                onClick={() => {
                                    setIsWaitingForUpi(false);
                                    setPendingUpiData(null);
                                    toast("Payment cancelled. Returned to Cashbook.");
                                }}
                                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold py-3.5 rounded-xl transition active:scale-[0.98]"
                            >
                                No (Cancel)
                            </button>
                            
                            {/* YES / CONFIRMED BUTTON */}
                            <button 
                                type="button"
                                disabled={isSubmittingPayment}
                                onClick={handleSubmitAdvance}
                                className="flex-1 bg-[#0E793C] hover:bg-[#0A5C2D] text-white text-sm font-bold py-3.5 rounded-xl transition active:scale-[0.98] shadow-lg"
                            >
                                {isSubmittingPayment ? "RECORDING..." : "Yes (Complete & Save)"}
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};

export default CashbookPage;