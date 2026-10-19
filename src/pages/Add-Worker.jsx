import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { ArrowLeft, User, Phone } from 'lucide-react';
import { mutate } from 'swr';

export default function AddWorker() {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Page transition animation helper
    const slideClass = location.state?.slideDirection === 'fade' ? 'animate-fade-in-fast' : 'animate-slide-in-right';

    const [name, setName] = useState(location.state?.initialName || '');
    const [phone, setPhone] = useState(location.state?.initialPhone || '');
    const [upiHandle, setUpiHandle] = useState("@ybl");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ─── Strict Validation Handlers ──────────────────────────────
    const handleNameChange = (e) => {
        // Only allow letters and spaces (strips numbers and special symbols)
        const filtered = e.target.value.replace(/[^a-zA-Z\s]/g, '');
        setName(filtered);
    };

    const handlePhoneChange = (e) => {
        // Only allow numbers and limit strictly to 10 digits
        const filtered = e.target.value.replace(/\D/g, '').slice(0, 10);
        setPhone(filtered);
    };

    const handlePickFromPhoneContacts = async () => {
        // Check if browser supports the native Contact Picker API (supported on Chrome Android & Mobile Safari)
        if ('contacts' in navigator && 'select' in navigator.contacts) {
            try {
                const props = ['name', 'tel'];
                const opts = { multiple: false };
                const selectedContacts = await navigator.contacts.select(props, opts);
                
                if (selectedContacts && selectedContacts.length > 0) {
                    const contact = selectedContacts[0];
                    const rawName = contact.name?.[0] || '';
                    const rawTel = contact.tel?.[0] || '';
                    
                    // Clean up phone number (remove spaces, dashes, and country codes like +91)
                    const cleanPhone = rawTel.replace(/\D/g, '').slice(-10); 
                    const cleanName = rawName.replace(/[^a-zA-Z\s]/g, '');

                    // Redirect to your AddWorker page with pre-filled state!
                    navigate('/add-worker', { 
                        state: { 
                            initialName: cleanName, 
                            initialPhone: cleanPhone,
                            slideDirection: 'left' 
                        } 
                    });
                }
            } catch (error) {
                console.log('Contact selection cancelled or not allowed:', error);
            }
        } else {
            // Fallback for laptops / unsupported browsers during development
            const mockName = prompt("Enter worker name (Dev Mode):", "Ramesh Kumar");
            const mockPhone = prompt("Enter 10-digit phone number (Dev Mode):", "9876543210");
            if (mockName && mockPhone) {
                navigate('/add-worker', { 
                    state: { 
                        initialName: mockName.replace(/[^a-zA-Z\s]/g, ''), 
                        initialPhone: mockPhone.replace(/\D/g, '').slice(-10),
                        slideDirection: 'left' 
                    } 
                });
            }
        }
    };

    // ─── Submit Handler ──────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!name.trim()) {
            toast.error("Please enter a valid worker name!");
            return;
        }
        if (phone.length !== 10) {
            toast.error("Phone number must be exactly 10 digits!");
            return;
        }

        try {
            setIsSubmitting(true);
            
            // 💡 Combine phone number + chosen handle suffix if phone is provided
            const finalUpiId = phone.length === 10 ? `${phone}${upiHandle}` : "";

            const payload = {
                name: name.trim(),
                phoneNumber: phone,
                upiId: finalUpiId, // 💡 Send optional UPI ID
                isActive: true
            };

            await api.post('/workers', payload);
            mutate('/workers');
            mutate('/workers?includeInactive=true');
            toast.success("Worker added successfully! 🎉");
            navigate('/cashbook', { replace: true, state: { slideDirection: 'fade' }});
        } catch (error) {
            console.error("Error adding worker:", error);
            toast.error(error.response?.data?.message || "Failed to add worker.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={`fixed inset-0 flex flex-col bg-gray-50 max-w-md mx-auto font-sans overflow-hidden ${slideClass}`}>
            
            {/* Top Blue App Bar */}
            <header className="bg-[#1048A4] text-white px-4 py-4 flex items-center gap-4 shrink-0 shadow-md">
                <button 
                    onClick={() => navigate(-1)} 
                    className="p-1 rounded-full active:scale-95 transition"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-[18px] font-semibold tracking-tight">Add Worker</h1>
            </header>

            {/* Form Content Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <form id="addWorkerForm" onSubmit={handleSubmit} className="space-y-4">
                    
                    {/* Worker Name Input (Placeholder inside) */}
                    <div className="bg-white border border-gray-300 rounded-xl px-3.5 py-3.5 flex items-center gap-3 focus-within:border-[#1048A4] transition-colors shadow-sm">
                        <User className="w-5 h-5 text-gray-400 shrink-0" />
                        <input 
                            type="text"
                            required
                            placeholder="Worker name"
                            value={name}
                            onChange={handleNameChange}
                            className="w-full text-base font-semibold text-gray-900 outline-none bg-transparent placeholder:text-gray-400 placeholder:font-normal"
                        />
                    </div>

                    {/* Separated +91 and Mobile Number Row */}
                    <div className="flex gap-2">
                        {/* Unclickable Default +91 Tile */}
                        <div className="bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-3.5 flex items-center gap-2 shrink-0 select-none cursor-default">
                            <span className="text-xl">🇮🇳</span>
                            <span className="text-sm font-bold text-gray-700">+91</span>
                        </div>

                        {/* Mobile Number Input Tile */}
                        <div className="flex-1 bg-white border border-gray-300 rounded-xl px-3.5 py-3.5 flex items-center gap-3 focus-within:border-[#1048A4] transition-colors shadow-sm">
                            <input 
                                type="tel"
                                required
                                placeholder="Mobile Number"
                                value={phone}
                                onChange={handlePhoneChange}
                                className="w-full text-base font-semibold text-gray-900 outline-none bg-transparent placeholder:text-gray-400 placeholder:font-normal tracking-wide"
                            />
                        </div>
                    </div>

                    {/* Optional UPI ID Builder Section */}
                    <div className="pt-2">
                        <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
                            Worker UPI ID <span className="normal-case tracking-normal font-normal text-gray-400">(Optional)</span>
                        </label>
                        <div className="flex gap-2 items-center">
                            {/* Auto-populated preview box */}
                            <div className="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-3 text-sm font-bold text-gray-700 truncate select-none">
                                {phone ? `${phone}${upiHandle}` : "Enter phone above..."}
                            </div>
                            
                            {/* Bank / App Handle Suffix Selector */}
                            <select 
                                value={upiHandle} 
                                onChange={(e) => setUpiHandle(e.target.value)}
                                className="bg-white border border-gray-300 rounded-xl px-3 py-3 text-sm font-bold text-[#1048A4] outline-none cursor-pointer shrink-0 shadow-sm"
                            >
                                <option value="@ybl">@ybl (PhonePe)</option>
                                <option value="@okaxis">@okaxis (GPay)</option>
                                <option value="@okicici">@okicici (GPay)</option>
                                <option value="@oksbi">@oksbi (GPay)</option>
                                <option value="@paytm">@paytm (Paytm)</option>
                                <option value="@ptaxis">@ptaxis (Paytm)</option>
                            </select>
                        </div>
                    </div>

                </form>
            </div>

            {/* Sticky Bottom Action Button */}
            <div className="p-4 bg-white border-t border-gray-200 shrink-0">
                <button 
                    type="submit"
                    form="addWorkerForm"
                    disabled={isSubmitting || !name.trim() || phone.length !== 10}
                    className="w-full bg-[#1048A4] hover:bg-[#0c367b] active:scale-[0.99] text-white font-bold text-[15px] py-3.5 rounded-xl shadow-lg transition-all uppercase tracking-wider disabled:opacity-50"
                >
                    {isSubmitting ? "Adding Worker..." : "Add Worker"}
                </button>
            </div>

        </div>
    );
}