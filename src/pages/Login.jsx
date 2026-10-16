import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
// 🚨 Google Step 1: You will need to add Google imports to this line later!

export default function Login() {
    // 1. The States
    const [phoneNumber, setPhoneNumber] = useState("");
    const [otp, setOtp] = useState("");
    const [confirmationResult, setConfirmationResult] = useState(null);
    const [showOtpScreen, setShowOtpScreen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate(); 

    // 2. "LIFETIME LOGIN" CHECK
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth,async (currentUser) => {
            if(currentUser){
                console.log("Firebase remembered user! Redirecting to Cashbook...");
            try {
                const token = await currentUser.getIdToken();
                localStorage.setItem("authToken", token);
            } catch (error) {
                console.error("Error refreshing token on automated login:", error);
            }

            navigate('/cashbook', { replace: true});

            } else {
                setIsLoading(false);
            }
            
        });
        return () => unsubscribe();
    }, [navigate]);
    
    // 3. The reCAPTCHA Setup
    const setupRecaptcha = () => {
        if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible',
                'callback': (response) => {
                    // reCAPTCHA solved
                }
            });
        }
    };
    
    // 4. Send OTP Logic
    const handleSendOtp = async (e) => {
        e.preventDefault();
        const clearNumber = phoneNumber.replace(/\D/g, '');
        if(clearNumber.length !== 10){
            toast.error("Please enter a valid 10-digit phone number!");
            return;
        }
        setupRecaptcha();
        
        const appVerifier = window.recaptchaVerifier;
        const formatPhone = "+91" + phoneNumber; 
        
        try {
            const confirmation = await signInWithPhoneNumber(auth, formatPhone, appVerifier);
            setConfirmationResult(confirmation); 
            console.log("Otp Sent!");
            setShowOtpScreen(true);
        } catch (error) {
            console.log("Error sending OTP:" , error);
            toast.error("Failed to send OTP. Please try again.");
            
            if(window.recaptchaVerifier){
                window.recaptchaVerifier.clear();
                window.recaptchaVerifier = null;
            }
        }
    };
    
    // 5. Verify OTP Logic
    const handleVerifyotp = async (e) => {
        e.preventDefault();
        try {
            const result = await confirmationResult.confirm(otp);

            const token = await result.user.getIdToken();
            localStorage.setItem("authToken", token);

            try {
                await api.post("/users/sync");
                console.log("User synced to MongoDB successfully!");
            } catch (syncError) {
                console.error("Error syncing user to database:", syncError);
            }
            console.log("User Logged In Successfully!");
            navigate("/cashbook");
        } catch (error) {
            console.log("Invalid OTP:", error);
            alert("Incorrect 6-digit code. Please try again!");
        }
    };

    // 6. Google Login Logic
    const handleGoogleLogin = async () => {
        const provider = new GoogleAuthProvider();
        try {
            const googlelogin = await signInWithPopup(auth, provider);

            const token = await googlelogin.user.getIdToken();
            localStorage.setItem("authToken", token);

            try {
                await api.post("/users/sync");
                console.log("User synced to MongoDB successfully!");
            } catch (syncError) {
                console.error("Error syncing user to database:", syncError);
            }
            
            console.log("User Logged In Successfully!");
            navigate("/cashbook");
        } catch (error) {
           console.log("Error in handleGoogleLogin function", error); 
        }
    }

    // 🚨 NEW: Show a spinner while the initial onAuthStateChanged check runs
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
                <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-600 font-medium">Restoring session...</p>
            </div>
        );
    }


    // 7. THE UI
    return (
        <div className='min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4'>
            <div className='bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm'>
                
                {/* Header */}
                <div className='text-center mb-8'>
                    <h1 className='text-2xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-2'>
                        <span className="text-3xl">💸</span> ExpenseEngine
                    </h1>
                    <h2 className='text-xl font-bold text-gray-900 mt-6'>Welcome Back!</h2>
                    <p className='text-gray-500 text-sm mt-1'>Manage worker expenses smarter.</p>
                </div>

                {!showOtpScreen ? (
                    /* SCREEN 1: THE PHONE NUMBER FORM */
                    <form onSubmit={handleSendOtp} className='flex flex-col gap-4'>
                        <label className='text-sm font-medium text-gray-900'>Enter your mobile number to get a code.</label>
                        
                        {/* The Complex Input Box */}
                        <div className='flex items-center border border-gray-300 rounded-lg p-2 focus-within:border-green-600 transition-colors'>
                            
                            {/* Flag & Arrow */}
                            <div className="flex items-center px-2 cursor-pointer">
                                <span className="text-lg">🇮🇳</span>
                                <span className="text-xs ml-1 text-gray-500">▼</span>
                            </div>
                            
                            <div className="w-px h-6 bg-gray-300 mx-2"></div>
                            <span className='text-gray-700 font-medium flex items-center gap-1'>
                                +91 <span className="text-gray-400 text-lg">📞</span>
                            </span>
                            
                            <input 
                                type="tel"
                                placeholder='98765 43210'
                                className='p-2 w-full outline-none text-gray-800'
                                value={phoneNumber}
                                onChange={(e) => {
                                    const numberOnly = e.target.value.replace(/\D/g, '');
                                    if(numberOnly.length <= 10){
                                        setPhoneNumber(numberOnly);
                                    }
                                }}
                                required 
                            />
                            
                            {/* Verify Badge */}
                        
                        </div>


                        {/* The Gradient Button */}
                        <button type='submit' className='w-full bg-linear-to-b from-green-600 to-green-800 text-white font-bold py-3 rounded-lg hover:from-green-700 hover:to-green-900 transition shadow-md shadow-green-700/20 mt-2'>
                            Request OTP
                        </button>
                    </form>

                ) : (
                    /* SCREEN 2: THE OTP VERIFICATION FORM */
                    <form onSubmit={handleVerifyotp} className='flex flex-col gap-4'>
                        <button
                            type='button'
                            onClick={() => setShowOtpScreen(false)}
                            className='text-left text-sm text-green-700 font-semibold mb-2 hover:underline'>
                            &larr; Change Number
                        </button>
                        <label className='text-sm font-medium text-gray-900 text-center'>
                            Enter the 6-digit code sent to +91 {phoneNumber}
                        </label>
                        <input 
                            type="number"
                            placeholder='123456'
                            className='p-3 border border-gray-300 rounded-lg text-center tracking-widest text-2xl outline-none focus:border-green-600 transition-colors' 
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            required
                        />
                        <button type='submit' className='w-full bg-linear-to-b from-green-600 to-green-800 text-white font-bold py-3 rounded-lg hover:from-green-700 hover:to-green-900 transition shadow-md shadow-green-700/20'>
                            Verify & Secure Login
                        </button>
                    </form>
                )}

                <div id="recaptcha-container"></div>

                {/* The OR Divider */}
                <div className="flex items-center my-6">
                    <div className="grow border-t border-gray-200"></div>
                    <span className="px-4 text-xs text-gray-500 font-medium">OR</span>
                    <div className="grow border-t border-gray-200"></div>
                </div>

                {/*  Google Step 3: YOU WILL BUILD YOUR BUTTON HERE */}
                <button onClick={handleGoogleLogin} className='w-full bg-white border border-gray-300 py-3 rounded-lg flex justify-center items-center gap-2'>
                    <svg className="w-5 h-5" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    </svg>
                    Continue with Google
                </button>
                


                {/* Footer Links */}
                <div className="mt-8 text-center space-y-4">
                    <p className="text-sm text-gray-600 cursor-pointer hover:text-gray-900 transition">Problems signing in?</p>
                    <p className="text-sm text-gray-600">Don't have an account? <span className="text-green-700 font-bold cursor-pointer hover:underline">Sign up</span></p>
                </div>

            </div>
        </div>
    );
}