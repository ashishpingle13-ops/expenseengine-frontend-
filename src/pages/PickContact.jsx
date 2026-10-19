import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Search, Plus, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { Contacts } from '@capacitor-community/contacts';
import { Capacitor } from '@capacitor/core';

export default function PickContact() {
    const navigate = useNavigate();
    const location = useLocation();
    const slideClass = location.state?.slideDirection === 'left' ? 'animate-slide-in-left' : 'animate-slide-in-right';

    const [searchQuery, setSearchQuery] = useState('');
    const [deviceContacts, setDeviceContacts] = useState(() => {
    const saved = localStorage.getItem('cachedDeviceContacts');
    return saved ? JSON.parse(saved) : [];
    });
    const [isLoading, setIsLoading] = useState(false);

    

    // Automatically load all contacts when opening the page on Android APK!
    useEffect(() => {
        if (Capacitor.isNativePlatform()) {
            loadAllNativeContacts();
        }
    }, []);

    // 1. NATIVE ANDROID APK: Grabs EVERY contact in the phone automatically!
    const loadAllNativeContacts = async () => {
        if (!Capacitor.isNativePlatform()) return;
        try {
            setIsLoading(true);
            const permission = await Contacts.requestPermissions();
            if (permission.contacts !== 'granted') {
                toast.error("Please allow contact permission to see your contacts");
                return;
            }

            const result = await Contacts.getContacts({
                projection: { name: true, phones: true }
            });

            const allContacts = [];
            result.contacts.forEach((c, idx) => {
                const displayName = c.name?.display || '';
                const rawPhone = c.phones?.[0]?.number || '';
                const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10);

                if (cleanPhone.length === 10) {
                    allContacts.push({
                        id: c.contactId || idx,
                        name: displayName || `+91 ${cleanPhone}`,
                        phone: cleanPhone
                    });
                }
            });

            // Sort alphabetically just like Khatabook
            allContacts.sort((a, b) => a.name.localeCompare(b.name));
            setDeviceContacts(allContacts);
        } catch (error) {
            console.error("Error loading native contacts:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // 2. WEB BROWSER FALLBACK (When testing in Chrome before building APK)
    const loadContacts = async () => {

        if (Capacitor.isNativePlatform()) {
            return loadAllNativeContacts();
        }

        if ('contacts' in navigator && 'select' in navigator.contacts) {
            try {
                setIsLoading(true);
                const contacts = await navigator.contacts.select(['name', 'tel'], { multiple: true });
                const formatted = contacts.map((c, idx) => ({
                    id: idx,
                    name: c.name?.[0] || 'Unknown',
                    phone: (c.tel?.[0] || '').replace(/\D/g, '').slice(-10)
                })).filter(c => c.phone.length === 10);
                setDeviceContacts(formatted);
            } catch (error) {
                console.log("Contact picker closed or denied:", error);
            } finally {
                setIsLoading(false);
            }
        } else {
            toast("Full automatic contact list works inside the Android APK!");
        }
    };

    // Filter contacts based on search query
    const filteredContacts = deviceContacts.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone.includes(searchQuery)
    );

    const handleSelectContact = (name, phone) => {
        navigate('/add-worker', {
            state: { initialName: name, initialPhone: phone, slideDirection: 'fade' }
        });
    };

    return (
        <div className="fixed inset-0 flex flex-col bg-gray-50 max-w-md mx-auto font-sans overflow-hidden animate-slide-up-bottom z-50">
            
            {/* Top Blue Header with Search Bar */}
            <header className="bg-[#1048A4] text-white px-4 pt-4 pb-3 flex flex-col gap-3 shrink-0 shadow-md">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-1 rounded-full active:scale-95 transition">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div className="flex-1 bg-white rounded-lg px-3 py-2 flex items-center gap-2">
                        <input 
                            type="text"
                            placeholder="Customer name"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full text-sm font-semibold text-gray-900 outline-none bg-transparent placeholder:text-gray-400"
                            autoFocus
                        />
                        <Search className="w-4 h-4 text-gray-400 shrink-0" />
                    </div>
                </div>
            </header>

            {/* Contact List Area */}
            <div className="flex-1 overflow-y-auto bg-white divide-y divide-gray-100">
                
                {/* Add Worker / Customer Row at Top (matches image_cbd30a.png)[cite: 35] */}
                <div 
                    onClick={() => navigate('/add-worker', { state: { slideDirection: 'fade' } })}
                    className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 cursor-pointer transition"
                >
                    <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-full border-2 border-dashed border-[#1048A4] flex items-center justify-center text-[#1048A4] bg-blue-50/50">
                            <Plus className="w-5 h-5 stroke-[2.5]" />
                        </div>
                        <span className="text-[15px] font-bold text-[#1048A4]">Add Worker</span>
                    </div>
                    <span className="text-gray-400 text-lg font-bold">&gt;</span>
                </div>

                {/* Native Device Contacts or Fallback List */}
                {isLoading ? (
                    <p className="text-center text-gray-400 py-10 text-sm">Loading device contacts...</p>
                ) : filteredContacts.length > 0 ? (
                    filteredContacts.map((c) => (
                        <div 
                            key={c.id}
                            onClick={() => handleSelectContact(c.name, c.phone)}
                            className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer transition"
                        >
                            <div className="flex items-center gap-3.5">
                                <div className="w-11 h-11 rounded-full bg-[#1048A4] text-white flex items-center justify-center font-bold text-sm shadow-sm">
                                    {c.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-[14px] font-bold text-gray-900 leading-tight">{c.name}</p>
                                    <p className="text-[12px] text-gray-400 font-medium mt-0.5">+91 {c.phone}</p>
                                </div>
                            </div>
                            <div className="w-7 h-7 rounded-full bg-blue-50 text-[#1048A4] flex items-center justify-center font-bold text-xs">
                                +
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-8 px-4">
                        <p className="text-gray-500 text-sm font-semibold mb-3">Want to import phone contacts?</p>
                        <button 
                            onClick={loadAllNativeContacts}
                            className="w-full bg-[#1048A4] text-white text-sm font-bold py-3 rounded-xl shadow-md active:scale-98 transition flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> Load All Phone Contacts
                        </button>
                    </div>
                )}
            </div>

        </div>
    );
}