import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Trash2, UserCheck } from 'lucide-react';
import toast, { Toaster } from "react-hot-toast";
import { mutate } from 'swr';


const EditWorker = () => {

  const navigate = useNavigate();
  const location = useLocation();

  const workerToEdit = location.state?.worker;

  const workerId = workerToEdit?._id || workerToEdit?.id;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);


  useEffect(() => {
    if(workerToEdit){
      setName(workerToEdit.name || '');
      setPhone(workerToEdit.phoneNumber || "");
      setIsActive(workerToEdit.isActive !== false);
    }else{
      toast.error("No worker selected!");
      navigate('/dashboard');
    }
  }, [workerToEdit, navigate]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const workerId = workerToEdit._id || workerToEdit.id;

      await api.put(`/workers/${workerId}` , { name, phoneNumber: phone, isActive });
      mutate('/workers');
      mutate('/workers?includeInactive=true');
      toast.success("Worker updated successfully!");
      navigate('/dashboard');
    } catch (error) {
      console.error("Error updating worker:", error);
      toast.error("Failed to update worker.");
    } finally{
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    try {
      setDeleting(true);
      const newStatus = !isActive;
      
      await Promise.all([
        // Updates the database to flip the isActive flag without destroying the record
        api.put(`/workers/${workerId}`, { name, phoneNumber: phone, isActive: newStatus }),
        new Promise((resolve) => setTimeout(resolve, 800))
      ]);
      mutate('/workers');
      mutate('/workers?includeInactive=true');
      
      toast.success(`Worker successfully ${newStatus ? 'reactivated' : 'deactivated'}!`);
      setTimeout(() => {
        navigate('/dashboard'); 
      }, 800);
    } catch (error) {
      console.error('Error toggling worker status:', error);
      toast.error('Error updating worker status');
      setDeleting(false); // Reset button state if it fails
    }
  };



  return (
    <div className='min-h-screen bg-gray-100 flex flex-col justify-between'>
      <Toaster position="top-center" reverseOrder={false} />
      <div>

        {/* Green Header Bar matching your design */}
        <div className='bg-green-700 text-white px-4 py-3.5 flex items-center gap-3 shadow-md'>
          <button
          onClick={() => navigate('/dashboard')}
          className='text-white hover:opacity-80 transition text-lg font-bold'>
            ←
          </button>
          <h1 className='text-base font-bold'> Manage Worker Profile</h1>
        </div>

        {/* Main Content Card Container */}
        <div className='max-w-md mx-auto p-4 mt-6'>
          <div className='bg-white rounded-2xl shadow-sm border border-gray-200 p-6'>
            <h2 className='text-xl font-bold text-gray-800 mb-6'> Edit Worker Details</h2>

            <form onSubmit={handleUpdate} className='space-y-4'>
              <div>
                <label className='block text-sm font-semibold text-gray-700 mb-1'>Full Name</label>
                <input 
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className='w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600'
                required />

              </div>

              <div>
                <label className='block text-sm font-semibold text-gray-700 mb-1'>Phone Number</label>
                <input 
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className='w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600' />
              </div>

              <div className='flex gap-3 pt-4'>
                <button
                type='submit'
                disabled={loading}
                className='flex-1 bg-green-700 hover:bg-green-800 text-white font-bold py-3 rounded-xl shadow transition active:scale-[0.98] disabled:opacity-50'>
                  {loading ? "Saving..." : "Save Changes"}
                </button>

                <button
                type='button'
                onClick={() => navigate('/dashboard')}
                className='flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-xl transition active:scale-[0.98]'>
                  Cancel
                </button>
              </div>
              
              
              {/* Deactivate / Reactivate Worker Button */}
              <div className='pt-4 border-t border-gray-100 mt-4'>
                  <button
                    type='button'
                    disabled={deleting}
                    onClick={handleToggleStatus}
                    className={`w-full text-white font-bold py-3 rounded-xl shadow transition active:scale-[0.98] flex items-center justify-center gap-2 text-sm disabled:opacity-50 ${isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                  >
                    {deleting ? (
                      "Updating..."
                    ) : isActive ? (
                      <>
                        <Trash2 size={18} /> Deactivate Worker
                      </>
                    ) : (
                      <>
                        <UserCheck size={18} /> Reactivate Worker
                      </>
                    )}
                  </button>
              </div>
            </form>
          </div>
        </div>
      </div>

    </div>
  );
};

export default EditWorker;