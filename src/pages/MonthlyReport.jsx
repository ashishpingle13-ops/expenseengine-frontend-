import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ArrowLeft, Download, FileSpreadsheet, X } from 'lucide-react';
import dayjs from 'dayjs';
import { api, fetcher } from '../lib/api';
import useSWR from 'swr';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import { saveOrSharePdf, saveOrShareCsv } from '../lib/qrUtils';


  function ReportDocIcon({ className = "w-5 h-5" }) {
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


const MonthlyReport = () => {
  const navigate = useNavigate();
  
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));
  // followinf is added due to custom design 
  const [dropOpen, setDropOpen] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Generate the last 6 months for the dropdown
  const recentMonths = Array.from({ length: 6 }).map((_, i) => 
    dayjs().subtract(i, 'month').format('YYYY-MM')
  );

  // ⚡ SWR Instant Fetch (Automatically refetches when selectedMonth changes!)
  const { data: reportData, isLoading: loading } = useSWR(`/reports/monthly-summary?month=${selectedMonth}`, fetcher);


  // This block is a safety net.
  //  reportData || {} means: "If reportData is empty, just pretend it's a blank object so you don't crash."
  // totalVeg = 0 means: "If the backend hasn't given us the Veg total yet, just put a 0 on the screen for now."
  // workerBreakdown = [] means: "If we don't have the worker list yet, treat it as an empty list so the .map() function doesn't explode."
  const {
    totalVeg = 0, totalNonVeg = 0, totalPaise = 0, totalAbsent = 0,
    workerBreakdown = []
  } = reportData || {};

  // ─── Mini Components ─── used to show 4 identical square boxes: Veg, Non-Veg, Paise, and Absent (and reduce over all writting of code)
  const StatTile = ({ icon, label, value, valueColor, borderColor }) => (
    <div className="flex-1 p-[14px_12px_12px] flex flex-col items-start gap-1.5 border-r border-b" style={{ borderColor }}>
      <div className="text-[22px] leading-none">{icon}</div>
      <span className="text-[10px] font-semibold text-gray-500 tracking-wider font-sans leading-snug">{label}</span>
      <span className="text-[26px] font-bold font-mono leading-none" style={{ color: valueColor }}>{value}</span>
    </div>
  );

  // ─── Mini Components ─── This is another cookie cutter for the tiny rounded badges next to each worker's name
  const Pill = ({ value, bg, label }) => (
    <span title={label} className="inline-flex items-center justify-center gap-0.75 px-1.75 py-0.5 rounded-full text-[11px] font-bold font-mono tracking-wide min-w-8" 
          style={{ background: value > 0 ? bg : '#f3f4f6', color: value > 0 ? '#fff' : '#9ca3af' }}>
      {value}
    </span>

  );

  // ─── EXCEL (CSV) EXPORT ─────────────────────────────────────────────
  const handleExportExcel = async () => {
    let csvContent = "Worker Name,Nights,Veg,Non-Veg,Paise,Absent\n";

    workerBreakdown.forEach(w => {
      csvContent += `"${w.name}",${w.nights},${w.veg},${w.nonveg},${w.paise},${w.absent}\n`;
    });

    csvContent += `\nGRAND TOTALS,-,${totalVeg},${totalNonVeg},${totalPaise},${totalAbsent}\n`;

    await saveOrShareCsv(csvContent, `Monthly_Report_${dayjs(selectedMonth).format('MMM_YYYY')}.csv`);
    setShowExportModal(false);
    toast.success("Excel downloaded!");
  };

  // ─── PDF EXPORT ─────────────────────────────────────────────────────
  const handleExportPDF = async () => {
    const doc = new jsPDF();
    const monthText = dayjs(selectedMonth).format('MMMM YYYY');

    doc.setFontSize(18);
    doc.setTextColor(14, 121, 60);
    doc.text("Monthly Summary Report", 14, 20);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Period: ${monthText}`, 14, 28);

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Total Veg: ${totalVeg}   |   Total Non-Veg: ${totalNonVeg}   |   Total Paise: ${totalPaise}   |   Total Absent: ${totalAbsent}`, 14, 38);

    const tableRows = workerBreakdown.map(w => [
      w.name, w.nights, w.veg, w.nonveg, w.paise, w.absent
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['Worker Name', 'Nights', 'Veg', 'N-Veg', 'Paise', 'Absent']],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [14, 121, 60] }, 
      styles: { fontSize: 9 },
      columnStyles: { 0: { fontStyle: 'bold' } } 
    });

    await saveOrSharePdf(doc, `Monthly_Report_${dayjs(selectedMonth).format('MMM_YYYY')}.pdf`);
    setShowExportModal(false);
    toast.success("PDF downloaded!");
  };


  return (
    <div className='fixed inset-0 z-50 bg-[#F9FAFB] flex flex-col max-w-107.5 mx-auto'>

      {/* ── Header bar */}
      <div className='bg-[#0E793C] p-[12px_14px] flex items-center gap-2.5 shrink-0'>
        <button 
        onClick={() => navigate(-1)}
        className='bg-transparent border-none cursor-pointer flex p-0.5'>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>
        <span className="text-[15px] font-bold text-white font-sans">Monthly Summary Report</span>
      </div>

      {/* ── Month filter dropdown */}
      <div className='p-[10px_14px] border-b border-gray-200 bg-white shrink-0 relative z-40'>
        <button
          onClick={() => setDropOpen(p => !p)}
          className='flex w-full justify-between items-center border border-gray-300 rounded-lg px-4 py-2.5 bg-white cursor-pointer active:scale-95 transition shadow-sm'
        >
          {/* We wrap the calendar icon and text in their own flex div so they stay together on the left */}
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span className="text-[14px] font-semibold text-gray-800 font-sans">
              {dayjs(selectedMonth).format('MMMM YYYY')}
            </span>
          </div>
          
          {/* Because of justify-between, this arrow is forced to the far right edge */}
          <ChevronDown className="text-gray-500" size={18} />
        </button>

        {dropOpen && (
          <div className='absolute top-13 left-3.5 right-3.5 bg-white border border-gray-200 rounded overflow-hidden shadow-lg'>
            {recentMonths.map(m => (
              <button key={m}
              onClick={() => {setSelectedMonth(m); setDropOpen(false)}}
              className={`block w-full px-3.5 py-2 text-left font-sans text-[13px] border-b border-gray-50 cursor-pointer ${m === selectedMonth ? 'bg-green-50 text-[#0E793C] font-semibold' : 'bg-white text-gray-700 font-normal'}`}
               >{dayjs(m).format('MMMM YYYY')}
               </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Scrollable body */}
      <div className="flex-1 overflow-y-auto pb-20">

        {/* Grand Summary Card */}
        <div className='mt-3.5 border border-gray-200 bg-white overflow-hidden'>
          <div className='px-3 py-1 bg-gray-50 border-b border-gray-200'>
            <span className="text-[10px] font-bold text-gray-600 tracking-widest font-mono uppercase">
              {dayjs(selectedMonth).format('MMMM YYYY')} — GRAND TOTALS
            </span>
          </div>
          <div className='grid grid-cols-2'>
            <StatTile icon="🥗" label="Total Veg Thalis" value={totalVeg} valueColor="#16a34a" borderColor="#e5e7eb" />
            <StatTile icon="🍗" label="Total Non-Veg Biryanis" value={totalNonVeg} valueColor="#dc2626" borderColor="#e5e7eb" />
            <StatTile icon="🪙" label="Total Daily Paise Owed" value={totalPaise} valueColor="#d97706" borderColor="#e5e7eb" />
            <StatTile icon="👤" label="Total Absent Days" value={totalAbsent} valueColor="#374151" borderColor="#e5e7eb" />
          </div>
        </div>

        {/* Per-worker breakdown list */}
        <div className="mt-3.5 border border-gray-200 bg-white overflow-hidden shadow-sm">
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <span className="text-[10px] font-bold text-gray-400 tracking-widest font-mono">WORKER</span>
            <div className="flex gap-1.5 items-center">
              {[ { label: 'VEG', bg: '#16a34a' }, { label: 'N-VEG', bg: '#dc2626' }, { label: 'PAISE', bg: '#d97706' }, { label: 'ABSENT', bg: '#6b7280' } ].map(col => (
                <span key={col.label} className="text-[9px] font-bold tracking-wider font-mono min-w-8 text-center" style={{ color: col.bg }}>{col.label}</span>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500 font-semibold text-[13px]">Loading Report Data... ⚙️</div>
          ) : workerBreakdown.length === 0 ? (
            <div className="p-8 text-center text-gray-500 font-semibold text-[13px]">No attendance records found for this month.</div>
          ) : (
            workerBreakdown.map((r, i) => (
              <div key={r.id} className={`flex items-center justify-between px-3 py-2.5 bg-white ${i < workerBreakdown.length - 1 ? 'border-b border-gray-200' : ''}`}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-700 shrink-0 border border-gray-300">
                    {r.initial}
                  </div>
                  <div>
                    <span className="text-[12px] font-semibold text-gray-900 font-sans block">{r.name}</span>
                    <div className="flex items-center gap-1 mt-px">
                      <span className="text-[10px]">🌙</span>
                      <span className="text-[10px] font-semibold text-gray-500 font-mono">{r.nights} nights</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-1.5 items-center">
                  <Pill value={r.veg} bg="#16a34a" label="Veg" />
                  <Pill value={r.nonveg} bg="#dc2626" label="Non-Veg" />
                  <Pill value={r.paise} bg="#d97706" label="Paise" />
                  <Pill value={r.absent} bg="#4b5563" label="Absent" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Sticky Export button */}
      <div className="absolute bottom-0 left-0 right-0 p-[10px_14px] bg-[#F9FAFB] border-t border-gray-200 z-40">
        <button onClick={() => setShowExportModal(true)} className="w-full bg-[#1D4ED8] hover:bg-blue-800 text-white border-none py-3.25 text-[13px] font-bold tracking-wide cursor-pointer flex items-center justify-center gap-2 rounded active:scale-[0.98] transition">
          <Download size={16} />
          Export to PDF / Excel
        </button>
      </div>


      {/* ── Export Options Modal ── */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center max-w-107.5 mx-auto">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowExportModal(false)} />
          <div className="relative bg-white rounded-2xl w-64 overflow-hidden shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="text-[14px] font-bold text-gray-900">Export Report</span>
              <button onClick={() => setShowExportModal(false)} className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition">
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
            
            <button onClick={handleExportPDF} className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors">
              <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center shrink-0">
                <ReportDocIcon className="w-5 h-5 text-[#0E793C]" />
              </div>
              <span className="text-[14px] font-semibold text-gray-800">Export as PDF</span>
            </button>
            
            <div className="h-px bg-gray-100 mx-4" />
            
            <button onClick={handleExportExcel} className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors">
              <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-[14px] font-semibold text-gray-800">Export as Excel</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default MonthlyReport