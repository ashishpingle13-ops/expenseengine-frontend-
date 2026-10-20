import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { ArrowLeft, User, Phone, AtSign, Camera, Trash2, UserCheck, ChevronRight } from 'lucide-react';
import toast, { Toaster } from "react-hot-toast";
import { mutate } from 'swr';

const EditWorker = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);

  const workerToEdit = location.state?.worker;
  const workerId = workerToEdit?._id || workerToEdit?.id;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [upiId, setUpiId] = useState("");
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (workerToEdit) {
      setName(workerToEdit.name || '');
      setPhone(workerToEdit.phoneNumber || "");
      setUpiId(workerToEdit.upiId || "");
      setIsActive(workerToEdit.isActive !== false);
    } else {
      toast.error("No worker selected!");
      navigate('/dashboard');
    }
  }, [workerToEdit, navigate]);

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Create a local preview URL for the selected image
      const previewUrl = URL.createObjectURL(file);
      setPhotoPreview(previewUrl);
      toast.success("Photo attached! (Save to upload)");
      // Note: To fully save to MongoDB, you'd upload this file to Firebase Storage/AWS S3 and save the URL.
    }
  };

  const handleUpdate = async () => {
    try {
      setIsSaving(true);
      
      // Pass upiId along with name and phone
      await api.put(`/workers/${workerId}`, { 
          name, 
          phoneNumber: phone, 
          upiId, 
          isActive 
      });
      
      mutate('/workers');
      mutate('/workers?includeInactive=true');
      toast.success("Profile saved!");
      navigate(-1);
    } catch (error) {
      console.error("Error updating worker:", error);
      toast.error("Failed to save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    try {
      setIsDeleting(true);
      const newStatus = !isActive;
      
      await api.put(`/workers/${workerId}`, { name, phoneNumber: phone, upiId, isActive: newStatus });
      
      mutate('/workers');
      mutate('/workers?includeInactive=true');
      toast.success(`Worker ${newStatus ? 'reactivated' : 'deactivated'}!`);
      setTimeout(() => navigate('/dashboard'), 500);
    } catch (error) {
      toast.error('Error updating worker status');
      setIsDeleting(false);
    }
  };

  return (
    <div className='fixed inset-0 flex flex-col bg-gray-50 overflow-hidden font-sans z-50 animate-slide-in-right'>
      <Toaster position="top-center" />

      {/* 1. Khatabook Style Blue Header */}
      <header className='bg-[#1048A4] text-white px-4 py-4 flex items-center justify-between shrink-0 shadow-sm z-10'>
        <div className='flex items-center gap-4'>
          <button onClick={() => navigate(-1)} className='active:scale-95 transition p-1'>
            <ArrowLeft size={24} />
          </button>
          <h1 className='text-[18px] font-semibold tracking-wide'>Worker Profile</h1>
        </div>
        <button 
            onClick={handleUpdate}
            disabled={isSaving}
            className='text-sm font-bold uppercase tracking-wider bg-white/20 px-3 py-1.5 rounded active:bg-white/30 transition disabled:opacity-50'
        >
            {isSaving ? "Saving..." : "Save"}
        </button>
      </header>

      <div className='flex-1 overflow-y-auto pb-24'>
        
        {/* 2. Photo Upload Section */}
        <div className='bg-gray-50 flex flex-col items-center py-8 border-b border-gray-200'>
          <div className='relative'>
            {/* Avatar Circle */}
            <div className='w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center text-gray-400 overflow-hidden border-2 border-white shadow-sm'>
              {photoPreview ? (
                <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User size={48} className="text-gray-400" />
              )}
            </div>
            
            {/* Camera Icon Badge */}
            <button 
                onClick={() => fileInputRef.current?.click()}
                className='absolute bottom-0 right-0 bg-[#1048A4] p-2 rounded-full text-white border-2 border-white shadow-md active:scale-95 transition'
            >
              <Camera size={14} />
            </button>
          </div>
          
          {/* Hidden File Input (Opens Camera/Gallery natively on mobile) */}
          <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              onChange={handlePhotoUpload} 
              className="hidden" 
          />
          
          <button 
              onClick={() => fileInputRef.current?.click()}
              className='text-[#1048A4] text-sm font-semibold mt-3'
          >
              Add photo
          </button>
        </div>

        {/* 3. Editable Fields List */}
        <div className='bg-white border-b border-gray-200'>
          
          {/* Name Row */}
          <div className='flex items-center px-4 py-3 border-b border-gray-100 group'>
            <User className='w-5 h-5 text-gray-400 shrink-0 mr-4' />
            <div className='flex-1 min-w-0'>
              <label className='text-[11px] text-gray-500 font-medium'>Name</label>
              <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  className='w-full text-[15px] font-semibold text-gray-900 outline-none bg-transparent pb-1 placeholder-gray-300' 
              />
            </div>
            <ChevronRight className='w-4 h-4 text-gray-300' />
          </div>

          {/* Phone Row */}
          <div className='flex items-center px-4 py-3 border-b border-gray-100'>
            <Phone className='w-5 h-5 text-gray-400 shrink-0 mr-4' />
            <div className='flex-1 min-w-0'>
              <label className='text-[11px] text-gray-500 font-medium'>Mobile Number</label>
              <input 
                  type="tel" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} 
                  className='w-full text-[15px] font-semibold text-gray-900 outline-none bg-transparent pb-1 placeholder-gray-300' 
              />
            </div>
            <ChevronRight className='w-4 h-4 text-gray-300' />
          </div>

          {/* UPI ID Row */}
          <div className='flex items-center px-4 py-3'>
            <AtSign className='w-5 h-5 text-gray-400 shrink-0 mr-4' />
            <div className='flex-1 min-w-0'>
              <label className='text-[11px] text-gray-500 font-medium'>UPI ID (Optional)</label>
              <input 
                  type="text" 
                  value={upiId} 
                  placeholder="e.g. 9876543210@ybl"
                  onChange={(e) => setUpiId(e.target.value.trim().toLowerCase())} 
                  className='w-full text-[15px] font-semibold text-gray-900 outline-none bg-transparent pb-1 placeholder-gray-300' 
              />
            </div>
            <ChevronRight className='w-4 h-4 text-gray-300' />
          </div>

        </div>

        {/* 4. Deactivate Button (Matches Khatabook red outline style) */}
        <div className='mt-8 px-4'>
            <p className="text-[11px] text-gray-400 font-semibold mb-2 ml-1 uppercase tracking-wider">Worker Settings</p>
            <button
                type='button'
                disabled={isDeleting}
                onClick={handleToggleStatus}
                className={`w-full py-3.5 rounded-lg border flex items-center justify-center gap-2 text-sm font-bold transition active:scale-[0.98] disabled:opacity-50 ${
                    isActive 
                        ? 'border-red-500 text-red-600 bg-white hover:bg-red-50' 
                        : 'border-green-600 text-green-700 bg-white hover:bg-green-50'
                }`}
            >
                {isDeleting ? "Updating..." : isActive ? (
                    <>
                        <Trash2 size={18} /> DEACTIVATE WORKER
                    </>
                ) : (
                    <>
                        <UserCheck size={18} /> REACTIVATE WORKER
                    </>
                )}
            </button>
        </div>

      </div>
    </div>
  );
};

export default EditWorker;