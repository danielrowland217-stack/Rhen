"use client";

import { useState, useEffect, ElementType, useRef, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { User, Bell, Search, Wallet, ArrowRightCircle, LogOut, ArrowUpRight, ArrowDownLeft, X, Camera, Save, Trash2, ArrowLeft, ChevronDown, ChevronUp, Loader2, Calendar, Package, CreditCard } from "lucide-react";
import { BottomNav } from "./BottomNav";
import { Toaster, toast } from "react-hot-toast";
import { SearchModal } from "./SearchModal";
import { supabase, signOut } from "../../lib/supabaseClient";

// --- Type Definitions ---
type StatCard = {
  label: string;
  value: string;
  icon: ElementType;
  color: string;
};

type Transaction = {
  id: string;
  description: string;
  amount: string;
  date: string;
  rawDate?: string;
  type: 'credit' | 'debit';
  status?: string;
  originalData?: any;
};

export default function DashboardPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [userName, setUserName] = useState("Boss");
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawStep, setWithdrawStep] = useState<'input' | 'confirm'>('input');
  const [settingsStep, setSettingsStep] = useState<'edit' | 'confirm'>('edit');
  const [isSaving, setIsSaving] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [tempName, setTempName] = useState("");
  const [email, setEmail] = useState("boss@rhen.store");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [tempEmail, setTempEmail] = useState("");
  const [tempPhone, setTempPhone] = useState("");
  const [tempBio, setTempBio] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [tempBankName, setTempBankName] = useState("");
  const [tempAccountNumber, setTempAccountNumber] = useState("");
  const [tempAccountName, setTempAccountName] = useState("");
  const [saveBankDetails, setSaveBankDetails] = useState(true);
  const [isBankDetailsOpen, setIsBankDetailsOpen] = useState(false);
  const [greeting, setGreeting] = useState("Good morning");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stats, setStats] = useState<StatCard[]>([
    { label: "Total Balance", value: "₦0.00", icon: Wallet, color: "text-green-400" },
  ]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [isTransactionsModalOpen, setIsTransactionsModalOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const ITEMS_PER_PAGE = 15;
  const [banks, setBanks] = useState<{name: string, code: string}[]>([]);
  const [selectedBankCode, setSelectedBankCode] = useState("");
  const [isResolvingName, setIsResolvingName] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // ===== CRITICAL FIX: PROPER AUTHENTICATION CHECK =====
  useEffect(() => {
    let isCancelled = false;
    
    const checkAuth = async () => {
      console.log('[DASHBOARD] Checking authentication...');
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('[DASHBOARD] Session check result:', { 
          hasSession: !!session, 
          error: error?.message 
        });
        
        // CRITICAL: Check if component is still mounted
        if (isCancelled) {
          console.log('[DASHBOARD] Component unmounted, cancelling auth check');
          return;
        }
        
        if (error) {
          console.error('[DASHBOARD] Session error:', error);
          router.replace('/login');
          return;
        }
        
        if (!session) {
          console.log('[DASHBOARD] No session found, redirecting to login');
          router.replace('/login');
          return;
        }
        
        // Success!
        console.log('[DASHBOARD] Authentication successful:', session.user.email);
        setIsAuthChecking(false);

        // LOAD PROFILE FROM SUPABASE
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          if (profile.full_name) setUserName(profile.full_name);
          if (profile.email) setEmail(profile.email);
          if (profile.phone) setPhone(profile.phone);
          if (profile.bio) setBio(profile.bio);
          if (profile.avatar_url) setProfileImage(profile.avatar_url);
          if (profile.bank_name) setBankName(profile.bank_name);
          if (profile.account_number) setAccountNumber(profile.account_number);
          if (profile.account_name) setAccountName(profile.account_name);
        } else if (!profileError) {
          // If no profile exists, create a basic one
          await supabase.from('profiles').insert([{ 
            id: session.user.id, 
            email: session.user.email,
            full_name: "Boss"
          }]);
        }
        
      } catch (error) {
        console.error('[DASHBOARD] Auth check exception:', error);
        if (!isCancelled) {
          router.replace('/login');
        }
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[DASHBOARD] Auth state changed:', event, 'Has session:', !!session);
        
        if (isCancelled) return;
        
        if (event === 'SIGNED_OUT' || !session) {
          console.log('[DASHBOARD] User signed out, redirecting');
          router.replace('/login');
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          console.log('[DASHBOARD] User signed in/refreshed');
          setIsAuthChecking(false);
        }
      }
    );

    // Cleanup function
    return () => {
      console.log('[DASHBOARD] Cleaning up auth listener');
      isCancelled = true;
      subscription.unsubscribe();
    };
  }, [router]);

  const processTransactions = (orders: any[] | null, withdrawals: any[] | null): Transaction[] => {
    const txs: Transaction[] = [];
    if (orders) {
      txs.push(...orders.map((order: any) => ({
        id: order.id,
        description: `Sale: Order #${order.id.slice(0, 8)}`,
        amount: `+ ₦${Number(order.total).toLocaleString()}`,
        date: new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        rawDate: order.created_at,
        type: 'credit' as const,
        status: 'completed',
        originalData: order
      })));
    }
    if (withdrawals) {
      txs.push(...(withdrawals || []).map((w: any) => ({
        id: w.id,
        description: `Withdrawal to ${w.bank_name}`,
        amount: `- ₦${Number(w.amount).toLocaleString()}`,
        date: new Date(w.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        rawDate: w.created_at,
        type: 'debit' as const,
        status: w.status || 'pending',
        originalData: w
      })));
    }
    return txs;
  };

  const fetchTransactionsData = async (isLoadMore = false) => {
    if (isLoadMore) setIsLoadingMore(true);
    
    try {
      const targetPage = isLoadMore ? page + 1 : 0;
      const from = targetPage * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let ordersQuery = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

      let withdrawalsQuery = supabase
        .from('withdrawals')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        ordersQuery = ordersQuery.gte('created_at', start.toISOString());
        withdrawalsQuery = withdrawalsQuery.gte('created_at', start.toISOString());
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        ordersQuery = ordersQuery.lte('created_at', end.toISOString());
        withdrawalsQuery = withdrawalsQuery.lte('created_at', end.toISOString());
      }

      const { data: orders, error: ordersError } = await ordersQuery;
      const { data: withdrawals, error: withdrawalsError } = await withdrawalsQuery;

      if (ordersError) throw ordersError;
      if (withdrawalsError) throw withdrawalsError;

      const newTx = processTransactions(orders, withdrawals);
      
      const sortedTx = newTx.sort((a, b) => 
        new Date(b.rawDate || b.date).getTime() - new Date(a.rawDate || a.date).getTime()
      );
      
      if (isLoadMore) {
        setAllTransactions(prev => [...prev, ...sortedTx]);
        setPage(targetPage);
      } else {
        setAllTransactions(sortedTx);
        setPage(0);
      }
      
      setHasMore((orders?.length || 0) === ITEMS_PER_PAGE || (withdrawals?.length || 0) === ITEMS_PER_PAGE);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to load transactions");
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleLoadMore = () => fetchTransactionsData(true);

  useEffect(() => {
    if (isMounted) {
      fetchTransactionsData(false);
    }
  }, [startDate, endDate, isMounted]);

  // Separate useEffect for non-auth initialization
  useEffect(() => {
    // Don't run this until auth is confirmed
    if (isAuthChecking) return;

    // Check for success messages
    const successMessage = sessionStorage.getItem('auth-success');
    if (successMessage) {
      toast.success(successMessage);
      sessionStorage.removeItem('auth-success');
    }

    const profileMessage = sessionStorage.getItem('profile-complete');
    if (profileMessage) {
      toast.success(profileMessage);
      sessionStorage.removeItem('profile-complete');
    }

    const updateGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) setGreeting("Good morning");
      else if (hour < 18) setGreeting("Good afternoon");
      else setGreeting("Good evening");
    };

    const loadDashboardData = async () => {
      try {
        // 1. Fetch Balance Data (Lightweight)
        const { data: orderTotals, error: orderError } = await supabase
          .from('orders')
          .select('total');
        
        if (orderError) throw orderError;

        const { data: withdrawalAmounts } = await supabase
          .from('withdrawals')
          .select('amount');

        const totalRevenue = orderTotals?.reduce((acc, order) => acc + (Number(order.total) || 0), 0) || 0;
        const totalWithdrawals = withdrawalAmounts?.reduce((acc, w) => acc + (Number(w.amount) || 0), 0) || 0;
        const currentBalance = totalRevenue - totalWithdrawals;

        setStats([
          { label: "Total Balance", value: `₦${currentBalance.toLocaleString()}`, icon: Wallet, color: "text-green-400" },
        ]);

        // 2. Fetch Recent Transactions for Dashboard Widget (Top 5)
        const { data: orders } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).range(0, ITEMS_PER_PAGE - 1);
        const { data: withdrawals } = await supabase.from('withdrawals').select('*').order('created_at', { ascending: false }).range(0, ITEMS_PER_PAGE - 1);

        const newTx = processTransactions(orders, withdrawals).sort((a, b) => 
          new Date(b.rawDate || b.date).getTime() - new Date(a.rawDate || a.date).getTime()
        );

        setRecentTransactions(newTx.slice(0, 5));
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      }
    };

    const fetchBanks = async () => {
      try {
        const res = await fetch('/api/banks');
        const data = await res.json();
        if (data.status && Array.isArray(data.data)) {
          setBanks(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch banks", error);
      }
    };

    updateGreeting();
    loadDashboardData();
    fetchBanks();

    const interval = setInterval(updateGreeting, 60000);
    window.addEventListener('storage', loadDashboardData);
    window.addEventListener('order-update', loadDashboardData);

    setIsMounted(true);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', loadDashboardData);
      window.removeEventListener('order-update', loadDashboardData);
    };
  }, [isAuthChecking]);

  useEffect(() => {
    if (isWithdrawModalOpen) {
      setTempBankName(bankName);
      setTempAccountNumber(accountNumber);
      setTempAccountName(accountName);
      setSaveBankDetails(true);
      
      // Try to find code for existing bank name
      if (bankName && banks.length > 0) {
        const bank = banks.find(b => b.name === bankName);
        if (bank) setSelectedBankCode(bank.code);
      }
    }
  }, [isWithdrawModalOpen, bankName, accountNumber, accountName, banks]);

  const handleResolveAccount = async (accountNum: string, bankCode: string) => {
    if (accountNum.length === 10 && bankCode) {
      setIsResolvingName(true);
      try {
        const res = await fetch('/api/banks/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ account_number: accountNum, bank_code: bankCode })
        });
        const data = await res.json();
        if (data.status && data.data?.account_name) {
          setTempAccountName(data.data.account_name);
          toast.success("Account name resolved!");
        } else {
          toast.error("Could not resolve account name. Please check details.");
          setTempAccountName("");
        }
      } catch (error) {
        toast.error("Failed to resolve account");
      } finally {
        setIsResolvingName(false);
      }
    }
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setProfileImage(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogout = async () => {
    const { error } = await signOut();
    if (!error) {
      localStorage.clear();
      sessionStorage.clear();
      toast.success("Logged out successfully");
      router.push('/');
    } else {
      toast.error("Logout failed. Please try again.");
    }
  };

  const handleSaveSettings = async () => {
    if (settingsStep === 'edit') {
      setSettingsStep('confirm');
      return;
    }

    setIsSaving(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      let finalAvatarUrl = profileImage;

      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        finalAvatarUrl = publicUrl;
      }

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: tempName,
          email: tempEmail,
          phone: tempPhone,
          bio: tempBio,
          bank_name: tempBankName,
          account_number: tempAccountNumber,
          account_name: tempAccountName,
          avatar_url: finalAvatarUrl,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      // Update local state on success
      setUserName(tempName); setEmail(tempEmail); setPhone(tempPhone); setBio(tempBio);
      setBankName(tempBankName); setAccountNumber(tempAccountNumber); setAccountName(tempAccountName);
      if (finalAvatarUrl) setProfileImage(finalAvatarUrl);
      setAvatarFile(null);
      
      setIsSettingsModalOpen(false); setSettingsStep('edit'); toast.success("Profile updated successfully");
    } catch (error: any) {
      toast.error("Failed to save profile: " + error.message);
    } finally { setIsSaving(false); }
  };

  const handleWithdraw = async () => {
    const amount = Number(withdrawAmount);
    const currentBalance = Number(stats[0].value.replace(/[^0-9.-]+/g,""));

    if (!amount || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (amount > currentBalance) {
      toast.error("Insufficient balance");
      return;
    }

    let finalBankName = bankName;

    if (!finalBankName) {
      if (!tempBankName || !tempAccountNumber) {
        toast.error("Please provide bank details");
        return;
      }
      finalBankName = tempBankName;
    }

    if (withdrawStep === 'input') {
      setWithdrawStep('confirm');
      return;
    }

    setIsWithdrawing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (!bankName && saveBankDetails) {
      setBankName(tempBankName);
      setAccountNumber(tempAccountNumber);
      setAccountName(tempAccountName);
      
      // Save to Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({
          bank_name: tempBankName,
          account_number: tempAccountNumber,
          account_name: tempAccountName
        }).eq('id', user.id);
      }
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("User not authenticated");
      const user = session.user;

      const response = await fetch('/api/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          amount: amount,
          bank_name: finalBankName,
          account_number: accountNumber || tempAccountNumber,
          account_name: accountName || tempAccountName
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Withdrawal failed");

      // Send confirmation email
      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            type: 'withdrawal_request', 
            email: user.email, 
            amount: amount,
            bank_name: finalBankName,
            account_number: accountNumber || tempAccountNumber
          })
        });
      } catch (emailError) {
        console.error("Failed to send withdrawal email", emailError);
      }

      // UI Update (Optimistic)
      const newTransaction = {
        id: Date.now().toString(),
        description: `Withdrawal to ${finalBankName}`,
        amount: `- ₦${amount.toLocaleString()}`,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        rawDate: new Date().toISOString(),
        type: 'debit' as const,
        status: 'pending'
      };

      setRecentTransactions(prev => [newTransaction, ...prev]);
      setAllTransactions(prev => [newTransaction, ...prev]);
      
      setStats(prev => [{
        ...prev[0],
        value: `₦${(currentBalance - amount).toLocaleString()}`
      }]);

      setIsWithdrawModalOpen(false);
      setWithdrawAmount("");
      setWithdrawStep('input');
      toast.success(`Withdrawal of ₦${amount.toLocaleString()} initiated!`);
    } catch (error: any) {
      console.error("Withdrawal error:", error);
      toast.error("Failed to process withdrawal: " + error.message);
    } finally {
      setIsWithdrawing(false);
    }
  };

  const filteredTransactions = allTransactions;

  // Show loading screen while checking authentication
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-red-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-gray-900 relative overflow-hidden pb-24 sm:pb-0 bg-white">
      <Toaster position="top-center" toastOptions={{ style: { background: '#333', color: '#fff' } }} />

      <AnimatePresence>
        {isSearchOpen && <SearchModal onClose={() => setIsSearchOpen(false)} />}
      </AnimatePresence>

      <div className="absolute top-0 inset-x-0 h-96 bg-red-600 z-0 rounded-b-[2rem] sm:rounded-b-[3rem]" />

      <AnimatePresence>
        {isLogoutModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setIsLogoutModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl text-center"
            >
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogOut className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Log Out?</h3>
              <p className="text-gray-500 mb-6">Are you sure you want to log out? You will need to sign in again to access your account.</p>
              <div className="flex gap-3">
                <button onClick={() => setIsLogoutModalOpen(false)} className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={handleLogout} className="flex-1 py-3 px-4 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors">Log Out</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSettingsModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setIsSettingsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[85vh] overflow-y-auto mb-16"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">{settingsStep === 'edit' ? 'Edit Profile' : 'Confirm Changes'}</h3>
                <button onClick={() => setIsSettingsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              {settingsStep === 'edit' ? (
                <div className="space-y-4">
                  <div className="flex flex-col items-center mb-2">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-md">
                        {profileImage ? (
                          <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-12 h-12 text-gray-400" />
                        )}
                      </div>
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-0 right-0 p-2 bg-red-600 rounded-full text-white hover:bg-red-700 transition-colors shadow-sm"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input type="text" value={tempName} onChange={(e) => setTempName(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all" placeholder="Your Name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input type="email" value={tempEmail} onChange={(e) => setTempEmail(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all" placeholder="your@email.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input type="tel" value={tempPhone} onChange={(e) => setTempPhone(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all" placeholder="Phone Number" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                    <textarea value={tempBio} onChange={(e) => setTempBio(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all" rows={3} placeholder="Tell us about yourself" />
                  </div>
                  
                  <div className="pt-4 border-t border-gray-100">
                    <button 
                      onClick={() => setIsBankDetailsOpen(!isBankDetailsOpen)}
                      className="flex items-center justify-between w-full mb-4"
                    >
                      <h4 className="font-semibold text-gray-900">Bank Details</h4>
                      {isBankDetailsOpen ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                    </button>
                    
                    <AnimatePresence>
                      {isBankDetailsOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-4 pb-2">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                              <select 
                                value={selectedBankCode} 
                                onChange={(e) => {
                                  const code = e.target.value;
                                  setSelectedBankCode(code);
                                  const bank = banks.find(b => b.code === code);
                                  if (bank) setTempBankName(bank.name);
                                  if (tempAccountNumber.length === 10) handleResolveAccount(tempAccountNumber, code);
                                }} 
                                className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all bg-white"
                              >
                                <option value="">Select Bank</option>
                                {banks.map(bank => (
                                  <option key={bank.code} value={bank.code}>{bank.name}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                              <input 
                                type="text" 
                                value={tempAccountNumber} 
                                onChange={(e) => {
                                  setTempAccountNumber(e.target.value);
                                  if (e.target.value.length === 10 && selectedBankCode) handleResolveAccount(e.target.value, selectedBankCode);
                                }} 
                                className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all" placeholder="0123456789" maxLength={10} />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                              <div className="relative">
                                <input type="text" value={tempAccountName} readOnly className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none text-gray-600" placeholder="Account Name" />
                                {isResolvingName && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-red-600" />}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <button onClick={handleSaveSettings} className="w-full py-3 mt-4 bg-red-600 text-white rounded-xl font-bold text-lg hover:bg-red-700 transition-all shadow-lg shadow-red-200 active:scale-95">
                    Save Changes
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center space-y-6 py-6">
                  <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-2 shadow-sm">
                    <Save className="w-10 h-10 text-red-600" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-2xl font-bold text-gray-900">Save Changes?</h4>
                    <p className="text-gray-500 max-w-xs mx-auto">Are you sure you want to update your profile information?</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 w-full pt-4">
                    <button onClick={() => setSettingsStep('edit')} disabled={isSaving} className="w-full sm:flex-1 py-4 px-4 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">Back</button>
                    <button 
                      onClick={handleSaveSettings} 
                      disabled={isSaving}
                      className="w-full sm:flex-1 py-4 px-4 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        "Confirm Save"
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isWithdrawModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setIsWithdrawModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">{withdrawStep === 'input' ? 'Withdraw Funds' : 'Confirm Withdrawal'}</h3>
                <button onClick={() => setIsWithdrawModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {withdrawStep === 'input' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount to Withdraw</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">₦</span>
                      <input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} className="w-full pl-8 p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all" placeholder="0.00" />
                    </div>
                  </div>

                  {!bankName && (
                    <div className="space-y-3 pt-2">
                      <p className="text-sm text-red-600 font-medium">Please enter bank details for withdrawal:</p>
                      <select 
                        value={selectedBankCode} 
                        onChange={(e) => {
                          const code = e.target.value;
                          setSelectedBankCode(code);
                          const bank = banks.find(b => b.code === code);
                          if (bank) setTempBankName(bank.name);
                          if (tempAccountNumber.length === 10) handleResolveAccount(tempAccountNumber, code);
                        }} 
                        className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                      >
                        <option value="">Select Bank</option>
                        {banks.map(bank => (
                          <option key={bank.code} value={bank.code}>{bank.name}</option>
                        ))}
                      </select>
                      <input 
                        type="text" 
                        value={tempAccountNumber} 
                        onChange={(e) => {
                          setTempAccountNumber(e.target.value);
                          if (e.target.value.length === 10 && selectedBankCode) handleResolveAccount(e.target.value, selectedBankCode);
                        }} 
                        className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="Account Number" maxLength={10} />
                      <div className="relative">
                        <input type="text" value={tempAccountName} readOnly className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none text-gray-600" placeholder="Account Name" />
                        {isResolvingName && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-red-600" />}
                      </div>
                      <label className="flex items-center gap-3 cursor-pointer group select-none mt-2">
                        <div className="relative flex items-center justify-center w-5 h-5">
                          <input 
                            type="checkbox" 
                            checked={saveBankDetails} 
                            onChange={(e) => setSaveBankDetails(e.target.checked)} 
                            className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded-md checked:bg-red-600 checked:border-red-600 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500/30 hover:border-red-400"
                          />
                          <svg
                            className="absolute w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-all duration-200 transform scale-50 peer-checked:scale-100"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="3"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors font-medium">
                          Save these details for future
                        </span>
                      </label>
                    </div>
                  )}

                  <button onClick={handleWithdraw} className="w-full py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors shadow-lg shadow-red-200">
                    Proceed
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Wallet className="w-8 h-8 text-red-600" />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900">Confirm Withdrawal</h4>
                    <p className="text-sm text-gray-500 mt-1">Please review the transaction details below</p>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Amount</span>
                      <span className="font-bold text-gray-900">₦{Number(withdrawAmount).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Bank Name</span>
                      <span className="font-medium text-gray-900">{bankName || tempBankName}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Account Number</span>
                      <span className="font-medium text-gray-900">{accountNumber || tempAccountNumber}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Account Name</span>
                      <span className="font-medium text-gray-900 text-right">{accountName || tempAccountName}</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => setWithdrawStep('input')} className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors">Back</button>
                    <button 
                      onClick={handleWithdraw} 
                      disabled={isWithdrawing}
                      className="flex-1 py-3 px-4 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors shadow-lg shadow-red-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isWithdrawing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        "Confirm"
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedTransaction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setSelectedTransaction(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[85vh] overflow-y-auto"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {selectedTransaction.type === 'credit' ? 'Order Details' : 'Withdrawal Details'}
                  </h3>
                  <p className="text-sm text-gray-500">{selectedTransaction.date}</p>
                </div>
                <button onClick={() => setSelectedTransaction(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="flex flex-col items-center mb-8">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${selectedTransaction.type === 'credit' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  {selectedTransaction.type === 'credit' ? <ArrowUpRight className="w-8 h-8" /> : <ArrowDownLeft className="w-8 h-8" />}
                </div>
                <h2 className={`text-3xl font-bold ${selectedTransaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                  {selectedTransaction.amount}
                </h2>
                <span className={`mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                  ['completed', 'paid'].includes((selectedTransaction.status || '').toLowerCase()) ? 'bg-green-100 text-green-700' :
                  (selectedTransaction.status || '').toLowerCase() === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {selectedTransaction.status}
                </span>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                  <div className="flex items-center gap-3 text-gray-700">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-400 shadow-sm">
                      <Package className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 font-medium uppercase">Description</p>
                      <p className="font-semibold truncate">{selectedTransaction.description}</p>
                    </div>
                  </div>

                  {selectedTransaction.type === 'debit' && selectedTransaction.originalData && (
                    <>
                      <div className="flex items-center gap-3 text-gray-700">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-400 shadow-sm">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 font-medium uppercase">Bank Details</p>
                          <p className="font-semibold">{selectedTransaction.originalData.bank_name}</p>
                          <p className="text-sm text-gray-600">{selectedTransaction.originalData.account_number}</p>
                          <p className="text-sm text-gray-600">{selectedTransaction.originalData.account_name}</p>
                        </div>
                      </div>
                    </>
                  )}

                  {selectedTransaction.type === 'credit' && selectedTransaction.originalData && (
                    <div className="pt-2 border-t border-gray-200 mt-2">
                      <p className="text-xs text-center text-gray-400 italic">Additional order details can be fetched here</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isTransactionsModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
            onClick={() => setIsTransactionsModalOpen(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 500 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-lg rounded-t-[2rem] sm:rounded-3xl p-6 shadow-2xl max-h-[85vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Transactions</h3>
                  <p className="text-sm text-gray-500">All your recent activity</p>
                </div>
                <button 
                  onClick={() => setIsTransactionsModalOpen(false)}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100 shrink-0">
                <div className="flex-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">From</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="date" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">To</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="date" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20"
                    />
                  </div>
                </div>
                {(startDate || endDate) && (
                  <div className="flex items-end">
                    <button 
                      onClick={() => { setStartDate(""); setEndDate(""); }}
                      className="px-3 py-2 text-xs font-bold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors h-[38px]"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              <div className="overflow-y-auto -mx-2 px-2 space-y-3">
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((transaction) => (
                    <div 
                      key={transaction.id} 
                      onClick={() => setSelectedTransaction(transaction)}
                      className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-2xl border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 ${transaction.type === 'credit' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                          {transaction.type === 'credit' ? <ArrowUpRight className="w-5 h-5 sm:w-6 sm:h-6" /> : <ArrowDownLeft className="w-5 h-5 sm:w-6 sm:h-6" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-gray-900 truncate text-sm sm:text-base">{transaction.description}</p>
                            {transaction.status && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide ${
                                ['completed', 'paid'].includes(transaction.status.toLowerCase()) ? 'bg-green-100 text-green-700' :
                                transaction.status.toLowerCase() === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>{transaction.status}</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 font-medium">{transaction.date}</p>
                        </div>
                      </div>
                      <p className={`font-bold text-sm sm:text-lg whitespace-nowrap ml-2 ${transaction.type === 'credit' ? 'text-green-500' : 'text-red-600'}`}>
                        {transaction.amount}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <Wallet className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium">No transactions yet</p>
                  </div>
                )}
                
                {hasMore && filteredTransactions.length > 0 && !startDate && !endDate && (
                  <div className="pt-4 pb-2">
                    <button 
                      onClick={handleLoadMore} 
                      disabled={isLoadingMore}
                      className="w-full py-3 bg-white border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                    >
                      {isLoadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : "Load More"}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="p-4 sm:p-8 relative z-10 max-w-5xl mx-auto"
      >
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-4 mb-6 sm:mb-8">
            <div className="flex items-center gap-3 sm:gap-4">
              <div 
                onClick={() => {
                  setTempName(userName);
                  setTempEmail(email);
                  setTempPhone(phone);
                  setTempBio(bio);
                  setTempBankName(bankName);
                  setTempAccountNumber(accountNumber);
                  setTempAccountName(accountName);
                  setIsSettingsModalOpen(true);
                  setSettingsStep('edit');
                }}
                className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-white flex items-center justify-center border-2 border-red-200 overflow-hidden cursor-pointer"
              >
                {profileImage ? (
                  <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6 sm:w-7 sm:h-7 text-red-600" />
                )}
              </div>
              <div className="flex flex-col">
                <h1 className="text-base sm:text-lg font-bold text-white">{greeting}, {userName}</h1>
                <p className="text-xs text-red-100 font-light">Welcome back to Rhenstore</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <button className="p-2 sm:p-3 rounded-full transition-colors hover:bg-white/20 active:bg-white/30 relative">
                <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                <span className="absolute top-2 right-2 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full">
            <div className="w-full">
              {stats.map((stat) => (
                <div key={stat.label} className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-gray-100 text-center h-full flex flex-col justify-center">
                  <p className="text-gray-500 text-sm font-medium">{stat.label}</p>
                  <p className="text-4xl sm:text-5xl font-bold mt-2 text-gray-900 tracking-tight">{stat.value}</p>
                </div>
              ))}
            </div>
            <div className="w-full">
              <button
                onClick={() => {
                  setIsWithdrawModalOpen(true);
                  setWithdrawStep('input');
                }}
                className="w-full flex items-center justify-center gap-2 bg-white text-red-600 p-4 rounded-2xl shadow-lg transition-transform hover:scale-[1.02] active:scale-100 font-bold border border-red-50"
              >
                <ArrowRightCircle className="w-5 h-5" />
                <span>Withdraw</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      <div className={`relative z-10 p-4 sm:p-8 mt-2 transition-all duration-700 ease-out max-w-5xl mx-auto ${isMounted ? 'opacity-100' : 'opacity-0'}`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white p-4 sm:p-8 rounded-3xl shadow-lg border border-gray-100"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">Transactions</h2>
            <button onClick={() => setIsTransactionsModalOpen(true)} className="text-sm font-semibold text-red-600 hover:text-red-700 transition-colors">
              View All
            </button>
          </div>
          <div className="space-y-4">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((transaction) => (
                <div 
                  key={transaction.id} 
                  onClick={() => setSelectedTransaction(transaction)}
                  className="flex items-center justify-between p-3 -m-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${transaction.type === 'credit' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} shrink-0`}>
                      {transaction.type === 'credit' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-800 truncate text-sm sm:text-base">{transaction.description}</p>
                        {transaction.status && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide ${
                            ['completed', 'paid'].includes(transaction.status.toLowerCase()) ? 'bg-green-100 text-green-700' :
                            transaction.status.toLowerCase() === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{transaction.status}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">{transaction.date}</p>
                    </div>
                  </div>
                  <p className={`font-semibold text-sm sm:text-base whitespace-nowrap ml-2 ${transaction.type === 'credit' ? 'text-green-500' : 'text-red-600'}`}>
                    {transaction.amount}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">No recent transactions.</p>
            )}
          </div>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
}