import React, { useEffect, useRef, useState } from 'react'
import { api, fetcher } from '../lib/api';
import toast from 'react-hot-toast';
import BottomNav from '../components/BottomNav';
import { ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Search,
  MoreVertical,
  FileText,
  X,
  ChevronDown,
  Calendar,
  IndianRupee,
  Package,
  Plus,
  FileSpreadsheet, 
  Balloon,
  Edit2} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import useSWR from 'swr';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveOrSharePdf, saveOrShareCsv } from '../lib/qrUtils';



  const CATEGORIES = ["Materials", "Transport", "Food", "Utilities", "Other"];
  const CHIPS = ["All","Materials", "Transport", "Food", "Utilities", "Other"];
  const EDIT_REASONS = ["Amount correction", "Category correction", "Date correction", "Payment method correction" ,"Duplicate entry", "Other"];

  function ReportDocIcon ({ className = "w-5 h-5"}) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="12" y2="17" />
      <line x1="8" y1="9" x2="10" y2="9" />
    </svg>
    );
  }


export default function Expenses () {
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const navigate = useNavigate();
  const location = useLocation();
  const slideClass = location.state?.slideDirection === 'left' ? 'animate-slide-in-left' : location.state?.slideDirection === 'right' ? 'animate-slide-in-right' : 'animate-fade-in-fast'
  // Data States
  const [isSaving, setIsSaving] = useState(false);
  
  // UI States
  const [uiState, setUiState] = useState("default");
  const [chip, setChip] = useState("All");
  const [searchQ, setSearchQ] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  // Form States
  const [fAmount, setFAmount] = useState("");
  const [fCat, setFCat] = useState("Materials");
  const [fPaymentMethod, setFPaymentMethod] = useState("Cash");
  const [fDate, setFDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [fTime, setFTime] = useState(dayjs().format('HH:mm'));
  const [fDesc, setFDesc] = useState("");

  const searchRef = useRef(null);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState(null); 
  const [fReason, setFReason] = useState(""); 
  const [isReasonDropdownOpen, setIsReasonDropdownOpen] = useState(false);
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);

  // ⚡ 1. SWR Instant Fetch (Grabs data and the mutate refresh tool)
  const { data: rawLedgerData = [], isLoading, mutate } = useSWR('/ledger', fetcher);

  // ⚡ 2. Instant Filtering (Sorts the cache instantly without states)
  const expenses = rawLedgerData.filter(entry => entry.entryType === 'Expense');
  const bossDeposits = rawLedgerData.filter(entry => entry.entryType === 'BossDeposit');
  const workerAdvances = rawLedgerData.filter(entry => entry.entryType === 'Advance');

  // Handle Saving New Expense to MongoDB
const handleSave = async () => {
    if(!fAmount || isNaN(Number(fAmount)) || Number(fAmount) <= 0) return;
    
    if(editId && !fReason) {
      toast.error("Reason for Edit is required!");
      return;
    }

    try {
      setIsSaving(true);
      const dateObj = new Date(`${fDate}T${fTime}:00`);

      const payload = {
        amount: Number(fAmount),
        category: fCat,
        paymentMethod: fPaymentMethod,
        description: fDesc,
        date: dateObj.toISOString()
      };

      if (editId) {
        payload.isEdited = true;
        payload.editReason = fReason;
        await api.put(`/ledger/${editId}`, payload);
        toast.success("Transaction updated!");
      } else {
        payload.entryType = "Expense";
        await api.post('/ledger', payload);
        toast.success("Expense logged!");
      }

      setFAmount(""); setFCat("Materials"); setFPaymentMethod("Cash"); setFDesc(""); setFReason(""); setEditId(null);
      setShowAdd(false);
      setIsEditMode(false);
      mutate();
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Failed to save transaction");
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Open Edit Modal Helper ────────────────────────────────
  const openEditModal = (row) => {
    setEditId(row._id);
    setFAmount(row.amount.toString());
    setFCat(row.category);
    setFPaymentMethod(row.paymentMethod || "Cash");
    setFDate(dayjs(row.date).format('YYYY-MM-DD'));
    setFTime(dayjs(row.date).format('HH:mm'));
    setFDesc(row.description || "");
    setFReason(row.editReason || ""); 
    setShowAdd(true); // Opens the main modal
  };

  // Dynamic Calculations
  const monthlyExpenses = expenses.filter(e => dayjs(e.date).isSame(currentMonth, 'month')).reduce((sum, e) => sum + e.amount, 0);
  const monthlyDeposits = bossDeposits.filter(e => dayjs(e.date).isSame(currentMonth, 'month')).reduce((sum, d) => sum + d.amount, 0);
  const monthlyAdvances = workerAdvances.filter(e => dayjs(e.date).isSame(currentMonth, 'month')).reduce((sum, a) => sum + a.amount, 0);

  const currentBalance = monthlyDeposits - (monthlyExpenses + monthlyAdvances);

  // 1. All expenses for the selected month
  const currentMonthExpenses = expenses.filter((e) => dayjs(e.date).isSame(currentMonth, 'month'));

  // 2. Filtered expenses for total display when searching/filtering
  const filteredExpenses = currentMonthExpenses.filter((e) => {
    if (uiState === 'search') {
      const matchesSearch = searchQ.trim() === "" || 
        (e.category && e.category.toLowerCase().includes(searchQ.toLowerCase())) ||
        (e.description && e.description.toLowerCase().includes(searchQ.toLowerCase()));
      const matchesChip = chip === "All" || e.category === chip;
      return matchesSearch && matchesChip;
    }
    return true;
  });

  // Calculate dynamic date string for the UI slider
  const dateDisplay = `${currentMonth.startOf('month').format('DD-MMM-YYYY')} to ${currentMonth.endOf('month').format('DD-MMM-YYYY')}`;
  
  // Calculate the total ONLY for the filtered items shown on screen
  const filteredTotal = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  
  // Build Chronological Ledger for UI (Compute true running balance on ALL month expenses first!)
  const buildLedger = () => {
    const sorted = [...currentMonthExpenses].sort((a, b) => new Date(a.date) - new Date(b.date));
    let running = monthlyDeposits - monthlyAdvances;
    
    const allRowsWithBalance = sorted.map((e) => {
      running -= e.amount;
      return { 
        ...e, 
        balance: running, 
        dateKey: dayjs(e.date).format('YYYY-MM-DD'),
        timeDisplay: new Date(e.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      };
    });

    // Now apply search/chip filter if in search mode so running balances stay 100% accurate
    const visibleRows = uiState === 'search'
      ? allRowsWithBalance.filter((e) => {
          const matchesSearch = searchQ.trim() === "" || 
            (e.category && e.category.toLowerCase().includes(searchQ.toLowerCase())) ||
            (e.description && e.description.toLowerCase().includes(searchQ.toLowerCase()));
          const matchesChip = chip === "All" || e.category === chip;
          return matchesSearch && matchesChip;
        })
      : allRowsWithBalance;

    const byDate = {};
    visibleRows.forEach((r) => (byDate[r.dateKey] = byDate[r.dateKey] || []).push(r));
    
    return Object.keys(byDate).sort().reverse().map((dk) => ({ dk, rows: byDate[dk].reverse() }));
  };

  const ledger = buildLedger();


  // ─── EXCEL (CSV) EXPORT ─────────────────────────────────────────────
  const handleExportExcel = async () => {
    let csvContent = "Date,Time,Category,Description,Amount (INR),Balance (INR)\n";

    [...ledger].reverse().forEach(({ dk, rows}) => {
      [...rows].reverse().forEach(row => {
        const method = row.paymentMethod || "Cash";
        let finalDesc = `${row.description || "-"} [${method}]`;
        if(row.isEdited){
          finalDesc += ` (EDITED: ${row.editReason})`;
        }
        const safeDesc = `"${finalDesc.replace(/"/g, '""')}"`;
        csvContent += `${dayjs(dk).format('DD-MMM-YYYY')},${row.timeDisplay},${row.category},${safeDesc},${row.amount},${row.balance}\n`;
      });
    });

    await saveOrShareCsv(csvContent, `Site_Expenses_${currentMonth.format('MMM_YYYY')}.csv`);
    setUiState("default");
    toast.success("Excel downloaded!");
  };


  // ─── PDF EXPORT ─────────────────────────────────────────────────────
  const handleExportPDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.setTextColor(157, 0, 82);
    doc.text("Site Expense Report", 14, 20);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Billing Period: ${dateDisplay}`, 14, 28);

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Total Spent: Rs. ${monthlyExpenses.toLocaleString("en-IN")}`, 14, 38);
    doc.text(`Final Balance: Rs. ${currentBalance.toLocaleString("en-IN")}`, pageWidth - 14, 38, { align: "right" });

    const tableRows = [];
    [...ledger].reverse().forEach(({ dk, rows}) => {
      [...rows].reverse().forEach(row => {
        const method = row.paymentMethod || "Cash";
        let finalDesc = `${row.description || "-"} [${method}]`;
        if (row.isEdited) {
          finalDesc += `\n(Edited: ${row.editReason})`;
        }

        tableRows.push([
          dayjs(dk).format('DD-MMM-YYYY'),
          row.category,
          finalDesc,
          `Rs. ${row.amount.toLocaleString("en-IN")}`,
          `Rs. ${row.balance.toLocaleString("en-IN")}`
        ]);
      });
    });

    autoTable(doc,{
      startY: 45,
      head: [['Date', 'Category', 'Description', 'Amount', 'Balance']],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [157, 0, 82] },
      styles: { fontSize: 9 },
      columnStyles: {
        3: { halign: 'right', textColor: [192, 57, 43] },
        4: { halign: 'right', fontStyle: 'bold' } 
      }
    });

    await saveOrSharePdf(doc, `Site_Expenses_${currentMonth.format('MMM_YYYY')}.pdf`);
    setUiState("default");
    toast.success("PDF downloaded!");
  };


  // ─── Floating Action Button ────────────────────────────────────────────────
  const FAB = () => (
    <button
      onClick={() => {
        setEditId(null); 
        setFAmount(""); setFCat("Materials"); setFPaymentMethod("Cash"); setFDesc(""); setFReason("");
        setFDate(dayjs().format('YYYY-MM-DD'));
        setFTime(dayjs().format('HH:mm'));
        setShowAdd(true);
      }}
      className="fixed z-20 flex items-center gap-1.5 font-bold text-white text-[13px] tracking-wide bg-[#9D0052]"
      style={{ bottom: 84, right: 16, borderRadius: 999, padding: "11px 18px", boxShadow: "0 3px 10px rgba(157,0,82,0.45)" }}
    >
      <Plus className="w-4 h-4" />
      LOG EXPENSE
    </button>
  );

// ─── Unified Add/Edit Expense Modal ───────────────────────────────────────
  const renderAddModal = () => (
    <div className="fixed inset-0 z-50 flex flex-col justify-end max-w-md mx-auto">
      <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={() => { setShowAdd(false); setEditId(null); }} />
      <div className="relative bg-white rounded-t-2xl px-5 pt-4 pb-8 animate-slide-up-bottom" style={{ boxShadow: "0 -4px 24px rgba(0,0,0,0.12)" }}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-4">
          
          {/* 1. DYNAMIC TITLE */}
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
            {editId ? "Edit Transaction" : "Log New Expense"}
          </h2>
          
          <button onClick={() => { setShowAdd(false); setEditId(null); }} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
            <X className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>

        <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Amount (₹)</label>
        <div className="border border-gray-200 rounded-lg px-3 py-2.5 flex items-center gap-2 mb-3 focus-within:border-[#9D0052]">
          <IndianRupee className="w-5 h-5 text-[#9D0052] shrink-0" />
          <input type="number" placeholder="0" value={fAmount} onChange={(e) => setFAmount(e.target.value)} className="flex-1 text-2xl font-extrabold text-gray-900 outline-none placeholder-gray-300 bg-transparent w-full" />
        </div>

        <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Payment Method</label>
        <div className="flex gap-2 mb-3">
          {['Cash', 'Online', 'Check', 'Other'].map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => setFPaymentMethod(method)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${fPaymentMethod === method ? 'bg-[#9D0052] border-[#9D0052] text-white' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}
            >
              {method}
            </button>
          ))}
        </div>

        <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Category</label>
        <div className="border border-gray-200 rounded-lg px-3 py-2.5 flex items-center gap-2 mb-3 focus-within:border-[#9D0052]">
          <Package className="w-4 h-4 text-gray-400 shrink-0" />
          <select value={fCat} onChange={(e) => setFCat(e.target.value)} className="flex-1 text-sm font-semibold text-gray-800 outline-none appearance-none bg-transparent">
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
        </div>

        <div className="flex gap-2 mb-3">
          <div className="flex-1">
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Date</label>
            <div className="border border-gray-200 rounded-lg px-3 py-2.5 flex items-center gap-2 focus-within:border-[#9D0052]">
              <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
              <input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} className="flex-1 text-sm font-semibold text-gray-800 outline-none bg-transparent min-w-0" />
            </div>
          </div>
          <div className="w-32">
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Time</label>
            <div className="border border-gray-200 rounded-lg px-3 py-2.5 focus-within:border-[#9D0052]">
              <input type="time" value={fTime} onChange={(e) => setFTime(e.target.value)} className="w-full text-sm font-semibold text-gray-800 outline-none bg-transparent" />
            </div>
          </div>
        </div>

        <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Description / Notes</label>
        <div className="border border-gray-200 rounded-lg px-3 py-2.5 flex items-start gap-2 mb-5 focus-within:border-[#9D0052]">
          <FileText className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
          <textarea placeholder="e.g. 50 bags of cement" value={fDesc} onChange={(e) => setFDesc(e.target.value)} rows={2} className="flex-1 text-sm text-gray-800 outline-none resize-none placeholder-gray-400 bg-transparent" />
        </div>

        {/* 2. DYNAMIC REASON DROPDOWN (ONLY SHOWS IF EDITING) */}
        {editId && (
          <div className="mb-5 relative">
            <label className="block text-[11px] font-bold text-[#9D0052] uppercase tracking-widest mb-1">Reason for Edit *</label>
            <button
              type="button"
              onClick={() => {
                setIsReasonDropdownOpen(!isReasonDropdownOpen);
                setIsCatDropdownOpen(false);
              }}
              className="w-full border-2 border-[#9D0052]/20 rounded-lg px-3 py-2.5 flex items-center justify-between bg-pink-50/30 focus:border-[#9D0052] text-sm font-semibold text-gray-900"
            >
              <span className={fReason ? "text-gray-900" : "text-gray-400"}>
                {fReason || "Select a reason..."}
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
                      setFReason(r);
                      setIsReasonDropdownOpen(false);
                    }}
                    className={`block w-full text-left px-3.5 py-2.5 text-sm font-medium transition-colors ${
                      fReason === r ? 'bg-pink-50 text-[#9D0052] font-bold' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. DYNAMIC SUBMIT BUTTON */}
        <button disabled={isSaving} onClick={handleSave} className="w-full bg-[#9D0052] hover:bg-[#800043] active:scale-[0.99] text-white text-sm font-bold rounded-xl py-3.5 tracking-wider uppercase transition-all disabled:opacity-70">
          {isSaving ? "SAVING..." : editId ? "SAVE CHANGES" : "SAVE EXPENSE"}
        </button>
        
      </div>
    </div>
  );


  // ─── Ledger Body (Shared List) ─────────────────────────────────────────────
  const renderLedgerBody = () => (
    <>
      <div className="flex items-center bg-gray-100 border-b border-gray-300 px-4 py-2 shrink-0">
        <span className="flex-1 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Date</span>
        <span className="text-[11px] font-bold text-[#C0392B] uppercase tracking-wider">Cash Out</span>
      </div>

      <div className="pb-10">
        {isLoading ? (
            <p className="p-8 text-center text-sm text-gray-400 font-medium">Loading ledger...</p>
        ) : ledger.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-400 font-medium">No expenses logged yet.</p>
        ) : ledger.map(({ dk, rows }) => (
          <div key={dk}>
            <div className="flex items-center justify-between bg-gray-50 border-b border-gray-200 px-4 py-1.5">
              <span className="text-[12px] font-bold text-gray-600">{dayjs(dk).format('ddd, DD MMM YYYY')}</span>
              <span className="text-[11px] font-semibold text-gray-400 tabular-nums">
                ₹{rows.reduce((s, r) => s + r.amount, 0).toLocaleString("en-IN")}
              </span>
            </div>
            {rows.map((row) => (
              <div key={row._id} className={`flex items-start px-4 py-2.5 border-b border-gray-100 ${row.isEdited ? 'bg-amber-50/30' : ''}`}>
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-semibold text-gray-900 leading-tight">{row.category}</p>
                    {row.isEdited && (
                      <span className="text-[8px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded uppercase tracking-wider">
                        Edited
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                    <p className="text-[11px] text-gray-400">
                      {row.timeDisplay} {row.description ? `· ${row.description}` : ''}
                    </p>
                    <span className="rounded bg-pink-50 border border-[#9D0052]/20 px-1.5 py-0.5 text-[8px] font-extrabold text-[#9D0052] uppercase leading-none">
                      {row.paymentMethod || 'Cash'}
                    </span>
                  </div>
                  {row.isEdited && (
                    <p className="text-[10px] text-amber-600 mt-0.5 italic">Reason: {row.editReason}</p>
                  )}
                </div>
                
                <div className="text-right shrink-0 flex items-center gap-3">
                  <div>
                    <p className="text-[14px] font-extrabold text-[#C0392B] leading-tight tabular-nums">
                      {row.amount.toLocaleString("en-IN")}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5 tabular-nums">
                      Bal {row.balance >= 0 ? "" : "-"}₹{Math.abs(row.balance).toLocaleString("en-IN")}
                    </p>
                  </div>
                  
                  {isEditMode && (
                    <button onClick={() => openEditModal(row)} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-600 transition">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}

        <div className="flex items-center justify-between px-4 py-3 border-t-2 border-gray-400 bg-gray-50">
          <span className="text-[12px] font-bold text-gray-700 uppercase tracking-wide">Total Expenses</span>
          <span className="text-[14px] font-extrabold text-[#C0392B] tabular-nums">
            ₹{filteredTotal.toLocaleString("en-IN")}
          </span>
        </div>
      </div>
    </>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // STATE 1: Default & Report Modal
  // ════════════════════════════════════════════════════════════════════════════
  if(uiState === "default" || uiState === "report") return (
    <div className={`fixed inset-0 flex flex-col bg-white overflow-hidden max-w-md mx-auto font-sans ${slideClass}`}>

      {/* ENTIRE SCROLLABLE PAGE CONTENT */}
      <div className="flex-1 overflow-y-auto pb-24" style={{ scrollbarWidth: 'none' }}>
          {/* Maroon App Bar */}
      <div className='bg-[#9D0052] pt-6 pb-0'>
        <div className='flex items-center gap-2 pb-3 px-4'>
          <button onClick={() => navigate('/cashbook')} className='text-white p-1'><ArrowLeft className='w-5 h-5'/></button>
          <span className="text-white text-[15px] font-bold tracking-tight flex-1">Site Expenses</span>
          <button className='text-white p-1.5'
          onClick={() => setUiState("report")}>
            <ReportDocIcon className="w-5 h-5"/>
          </button>
          {/* SEARCH BUTTON */}
          <button className='text-white p-1.5' onClick={() => { setUiState("search"); setTimeout(() => searchRef.current?.focus(), 50); }}>
            <Search className="w-5 h-5" />
          </button>
          <button 
          onClick={() => setIsEditMode(!isEditMode)}
          className= {`p-1.5 rounded-full transition-colors ${isEditMode ? 'bg-white text-[#9D0052]' : 'text-white'}`}><MoreVertical className='w-5 h-5'/></button>
        </div>

        {/* Summary Card */}
        <div className='bg-white overflow-hidden mx-4' style={{ borderRadius: 14 }}>
          <div className='flex'>
            <div className='flex-1 px-4 py-2.5 text-center'>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Total Spent</p>
              <p className="text-[20px] font-extrabold text-[#C0392B] tabular-nums leading-none">
                ₹{monthlyExpenses.toLocaleString("en-IN")}
              </p>
            </div>

            <div className='w-px bg-gray-200 my-2.5'/>
            <div className='flex-1 px-4 py-2.5 text-center'>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Balance</p>
              <p className={`text-[20px] font-extrabold tabular-nums leading-none ${currentBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                ₹{currentBalance.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </div>

        {/* Date nav strip */}
        <div className='flex items-center justify-between bg-[#7B0040] px-3 py-2 mt-4'>
          <button onClick ={() => setCurrentMonth(prev => prev.subtract(1, 'month'))}className="text-white/70 p-1"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-white text-[12px] font-semibold tracking-wide">{dateDisplay}</span>
          <button onClick={() => setCurrentMonth(prev => prev.add(1, 'month'))} className="text-white/70 p-1"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      {renderLedgerBody()}
      </div>
      <FAB/>
      <BottomNav/>
      {showAdd && renderAddModal()}


      {/* Report Modal */}
      {uiState === "report" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center max-w-md mx-auto">
          <div className="absolute inset-0 bg-black/50" onClick={() => setUiState("default")} />
          <div className="relative bg-white rounded-2xl w-64 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="text-[14px] font-bold text-gray-900">Report</span>
              <button onClick={() => setUiState("default")} className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100">
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
            <button onClick={handleExportPDF} className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors">
              <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center shrink-0">
                <ReportDocIcon className="w-5 h-5 text-red-600" />
              </div>
              <span className="text-[14px] font-semibold text-gray-800">PDF</span>
            </button>
            <div className="h-px bg-gray-100 mx-4" />
            <button onClick={handleExportExcel} className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors">
              <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-[14px] font-semibold text-gray-800">Excel</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // STATE 2: Search View
  // ════════════════════════════════════════════════════════════════════════════


  return (
    <div className={`fixed inset-0 flex flex-col bg-white overflow-hidden max-w-md mx-auto font-sans ${slideClass}`}>
      
      {/* ENTIRE SCROLLABLE PAGE CONTENT */}
      <div className="flex-1 overflow-y-auto pb-24" style={{ scrollbarWidth: 'none' }}>
          <div className="bg-white border-b border-gray-200 flex items-center gap-2 px-3 pt-6 pb-3">
        <button onClick={() => { setUiState("default"); setSearchQ(""); }} className="text-gray-600 p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          ref={searchRef}
          type="text"
          placeholder="Search categories or notes..."
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          className="flex-1 text-[15px] text-gray-900 outline-none placeholder-gray-400 bg-transparent"
        />
        <button className="text-gray-600 p-1" onClick={() => setUiState("report")}>
          <ReportDocIcon className="w-5 h-5" />
        </button>
        <button onClick={() => setIsEditMode(!isEditMode)} className="text-gray-600 p-1 "><MoreVertical className="w-5 h-5" /></button>
      </div>

      <div className="bg-[#9D0052] flex gap-2 px-4 py-2.5 overflow-x-auto shrink-0" style={{ scrollbarWidth: "none" }}>
        {CHIPS.map((c) => {
          const active = chip === c;
          return (
            <button
              key={c}
              onClick={() => setChip(c)}
              className="shrink-0 text-[12px] font-semibold px-4 py-1.5 transition-all"
              style={{
                borderRadius: 999,
                border: active ? "2px solid #ffffff" : "2px solid rgba(255,255,255,0.35)",
                background: active ? "rgba(255,255,255,0.18)" : "transparent",
                color: active ? "#ffffff" : "rgba(255,255,255,0.65)",
              }}
            >
              {c}
            </button>
          );
        })}
      </div>

      {renderLedgerBody()}
      </div>
      <FAB />
      <BottomNav />
      {showAdd && renderAddModal()}
    </div>
  )
}

