import React, { useState, useEffect } from 'react';
import { 
  Droplets, Truck, MapPin, Clock, CheckCircle, 
  Phone, Calendar, User, ChevronRight, AlertCircle,
  Navigation, Check, Search, Menu, X, Users, Shield, LogOut,
  Waves, ArrowLeft, MessageSquare, Star, Lightbulb, Activity,
  Mail, Smartphone, Lock, Key, CreditCard, Wallet, IndianRupee, Bell,
  Database, Download, Filter, Server, Cpu, HardDrive, History as HistoryIcon, Thermometer,
  ArrowUpDown, ArrowUp, ArrowDown, Sun, Moon, Share2, TrendingUp, Zap, RefreshCcw, Eye, EyeOff,
  Settings, HelpCircle, Info, ChevronDown, Gift, Globe, Radio
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import ChatBot from './components/ChatBot';
import FleetTrackingMap from './components/maps/FleetTrackingMap';
import ResidentTrackingMap from './components/maps/ResidentTrackingMap';
import DriverNavigationMap from './components/maps/DriverNavigationMap';
import { initializeApp } from 'firebase/app';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc,
  orderBy,
  limit
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType, browserPopupRedirectResolver } from './lib/firebase';

type BookingStatus = 'Pending' | 'Confirmed' | 'En Route' | 'Delivered';

interface Complaint {
  id: string;
  residentName: string;
  phone: string;
  issueType: string;
  description: string;
  status: 'Open' | 'Resolved';
  createdAt: number;
  userId: string;
  reply?: string;
}

const MOCK_COMPLAINTS: Complaint[] = [
  {
    id: 'CMP-2001',
    residentName: 'Rahul Sharma',
    phone: '+91 98765 43210',
    issueType: 'Delay in Delivery',
    description: 'The tanker was supposed to arrive in the morning but is delayed by 2 hours.',
    status: 'Open',
    createdAt: Date.now() - 7200000,
    userId: 'USR-101'
  },
  {
    id: 'CMP-2002',
    residentName: 'Priya Patel',
    phone: '+91 98765 43211',
    issueType: 'Water Quality Issue',
    description: 'The water appears slightly yellowish and has a faint odor. Please check.',
    status: 'Open',
    createdAt: Date.now() - 86400000,
    userId: 'USR-102'
  },
  {
    id: 'CMP-2003',
    residentName: 'Amit Kumar',
    phone: '+91 98765 43212',
    issueType: 'Driver Behavior',
    description: 'Driver MH-04-WT-8821 was very professional and helped with the pipe connection! Just wanted to share positive feedback.',
    status: 'Resolved',
    createdAt: Date.now() - 172800000,
    userId: 'USR-103',
    reply: 'Thank you for your feedback, Amit! We have shared this with Vijay.'
  },
  {
    id: 'CMP-2004',
    residentName: 'Vikram Singh',
    phone: '+91 98765 43214',
    issueType: 'Other',
    description: 'I need to change my primary phone number on the profile. How do I do it?',
    status: 'Open',
    createdAt: Date.now() - 43200000,
    userId: 'USR-104'
  }
];

interface Booking {
  id: string;
  userId: string;
  userRole?: string;
  residentName: string;
  phone: string;
  address: string;
  volume: string;
  status: BookingStatus;
  requestedDate: string;
  requestedTime: string;
  createdAt: number;
  eta?: string;
  tankerId?: string;
  driverName?: string;
  driverPhone?: string;
  paymentStatus: 'Paid' | 'Pending';
  paymentMethod: 'UPI' | 'Card' | 'Cash';
  priority?: boolean;
  isDeletedForUser?: boolean;
  deliveredAt?: number;
}

const HELPLINE_NUMBER = "1800-123-4567";

// Pre-load audio for better performance and reliability
const clickSound = typeof Audio !== 'undefined' ? new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3') : null;
if (clickSound) {
  clickSound.volume = 0.3;
  clickSound.preload = 'auto';
}

const playClick = () => {
  if (clickSound) {
    // Reset sound to start if it's already playing
    clickSound.currentTime = 0;
    clickSound.play().catch(err => {
      if (err.name !== 'NotAllowedError') {
        console.warn("Audio play failed:", err);
      }
    });
  }
};

const MOCK_USAGE_DATA = [
  { day: 'Mon', usage: 1200 },
  { day: 'Tue', usage: 1500 },
  { day: 'Wed', usage: 1100 },
  { day: 'Thu', usage: 1800 },
  { day: 'Fri', usage: 2200 },
  { day: 'Sat', usage: 2500 },
  { day: 'Sun', usage: 1900 },
];

const MOCK_MONTHLY_USAGE_DATA = [
  { month: 'Jan', usage: 45000 },
  { month: 'Feb', usage: 42000 },
  { month: 'Mar', usage: 55000 },
  { month: 'Apr', usage: 60000 },
  { month: 'May', usage: 65000 },
  { month: 'Jun', usage: 48000 },
  { month: 'Jul', usage: 40000 },
  { month: 'Aug', usage: 38000 },
  { month: 'Sep', usage: 42000 },
  { month: 'Oct', usage: 50000 },
  { month: 'Nov', usage: 52000 },
  { month: 'Dec', usage: 58000 },
];

const MOCK_BOOKINGS: Booking[] = [
  {
    id: 'BKG-1001',
    userId: 'USR-101',
    residentName: 'Rahul Sharma',
    phone: '+91 98765 43210',
    address: 'B-402, Shanti Nagar, Mira Road East',
    volume: '1000L',
    status: 'En Route',
    requestedDate: new Date().toISOString().split('T')[0],
    requestedTime: 'Morning (8 AM - 12 PM)',
    createdAt: Date.now() - 3600000,
    eta: '15 mins',
    tankerId: 'MH-04-AB-1234',
    driverName: 'Suresh Kumar',
    driverPhone: '9820012345',
    paymentStatus: 'Paid',
    paymentMethod: 'UPI'
  },
  {
    id: 'BKG-1002',
    userId: 'USR-103',
    residentName: 'Priya Patel',
    phone: '+91 98765 43211',
    address: 'Sector 4, Shrishti Complex, Mira Road',
    volume: '5000L',
    status: 'Pending',
    requestedDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    requestedTime: 'Afternoon (12 PM - 4 PM)',
    createdAt: Date.now() - 1800000,
    paymentStatus: 'Pending',
    paymentMethod: 'Cash'
  },
  {
    id: 'BKG-1003',
    userId: 'USR-105',
    residentName: 'Amit Kumar',
    phone: '+91 98765 43212',
    address: 'A-101, Poonam Sagar, Mira Road',
    volume: '2000L',
    status: 'Delivered',
    requestedDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    requestedTime: 'Morning (8 AM - 12 PM)',
    createdAt: Date.now() - 90000000,
    tankerId: 'MH-04-WT-8821',
    driverName: 'Vijay Singh',
    paymentStatus: 'Paid',
    paymentMethod: 'Card'
  },
  {
    id: 'BKG-1004',
    userId: 'USR-106',
    residentName: 'Sneha Desai',
    phone: '+91 98765 43213',
    address: 'C-205, Silver Park, Mira Road',
    volume: '1000L',
    status: 'Delivered',
    requestedDate: new Date(Date.now() - 172800000).toISOString().split('T')[0],
    requestedTime: 'Evening (4 PM - 8 PM)',
    createdAt: Date.now() - 180000000,
    tankerId: 'MH-04-WT-9900',
    driverName: 'Rajesh Yadav',
    paymentStatus: 'Paid',
    paymentMethod: 'UPI'
  },
  {
    id: 'BKG-1005',
    userId: 'USR-107',
    residentName: 'Vikram Singh',
    phone: '+91 98765 43214',
    address: 'D-304, Naya Nagar, Mira Road',
    volume: '10000L',
    status: 'Delivered',
    requestedDate: new Date(Date.now() - 259200000).toISOString().split('T')[0],
    requestedTime: 'Afternoon (12 PM - 4 PM)',
    createdAt: Date.now() - 265000000,
    tankerId: 'MH-04-AB-5566',
    driverName: 'Suresh Kumar',
    paymentStatus: 'Paid',
    paymentMethod: 'Card'
  },
  {
    id: 'BKG-1006',
    userId: 'USR-108',
    residentName: 'Neha Gupta',
    phone: '+91 98765 43215',
    address: 'E-501, Beverly Park, Mira Road',
    volume: '5000L',
    status: 'Confirmed',
    requestedDate: new Date(Date.now() + 172800000).toISOString().split('T')[0],
    requestedTime: 'Morning (8 AM - 12 PM)',
    createdAt: Date.now() - 500000,
    tankerId: 'MH-04-XY-7788',
    driverName: 'Vijay Singh',
    paymentStatus: 'Paid',
    paymentMethod: 'UPI'
  },
  {
    id: 'BKG-1007',
    userId: 'USR-109',
    residentName: 'Karan Malhotra',
    phone: '+91 98765 43216',
    address: 'F-602, Lodha Aqua, Mira Road',
    volume: '2000L',
    status: 'Pending',
    requestedDate: new Date().toISOString().split('T')[0],
    requestedTime: 'Evening (4 PM - 8 PM)',
    createdAt: Date.now() - 1200000,
    paymentStatus: 'Pending',
    paymentMethod: 'UPI'
  },
  {
    id: 'BKG-1008',
    userId: 'USR-110',
    residentName: 'Anjali Verma',
    phone: '+91 98765 43217',
    address: 'G-703, Kalpataru Srishti, Mira Road',
    volume: '1000L',
    status: 'Confirmed',
    requestedDate: new Date().toISOString().split('T')[0],
    requestedTime: 'Morning (8 AM - 12 PM)',
    createdAt: Date.now() - 300000,
    tankerId: 'MH-04-WT-1122',
    driverName: 'Rajesh Yadav',
    paymentStatus: 'Paid',
    paymentMethod: 'UPI'
  },
  {
    id: 'BKG-1009',
    userId: 'USR-111',
    residentName: 'Sanjay Rawat',
    phone: '+91 98765 43218',
    address: 'H-804, RNA Heights, Mira Road',
    volume: '5000L',
    status: 'Pending',
    requestedDate: new Date().toISOString().split('T')[0],
    requestedTime: 'Afternoon (12 PM - 4 PM)',
    createdAt: Date.now() - 600000,
    paymentStatus: 'Pending',
    paymentMethod: 'Cash'
  },
  {
    id: 'BKG-1010',
    userId: 'USR-112',
    residentName: 'Meera Nair',
    phone: '+91 98765 43219',
    address: 'I-905, Unique Greens, Mira Road',
    volume: '2000L',
    status: 'En Route',
    requestedDate: new Date().toISOString().split('T')[0],
    requestedTime: 'Evening (4 PM - 8 PM)',
    createdAt: Date.now() - 2400000,
    eta: '10 mins',
    tankerId: 'MH-04-AB-9988',
    driverName: 'Vijay Singh',
    paymentStatus: 'Paid',
    paymentMethod: 'UPI'
  },
  {
    id: 'BKG-1011',
    userId: 'USR-113',
    residentName: 'Arjun Kapoor',
    phone: '+91 98765 43220',
    address: 'K-102, Shanti Nagar, Mira Road East',
    volume: '5000L',
    status: 'Delivered',
    requestedDate: new Date(Date.now() - 345600000).toISOString().split('T')[0],
    requestedTime: 'Afternoon (12 PM - 4 PM)',
    createdAt: Date.now() - 350000000,
    tankerId: 'MH-04-WT-1234',
    driverName: 'Suresh Raina',
    paymentStatus: 'Paid',
    paymentMethod: 'UPI'
  },
  {
    id: 'BKG-1012',
    userId: 'USR-114',
    residentName: 'Deepika Rao',
    phone: '+91 98765 43221',
    address: 'L-305, Beverly Park, Mira Road',
    volume: '1000L',
    status: 'Delivered',
    requestedDate: new Date(Date.now() - 432000000).toISOString().split('T')[0],
    requestedTime: 'Morning (8 AM - 12 PM)',
    createdAt: Date.now() - 440000000,
    tankerId: 'MH-04-AB-5678',
    driverName: 'MS Dhoni',
    paymentStatus: 'Paid',
    paymentMethod: 'Card'
  }
];

function sanitizeBookings(bookingsList: Booking[]): Booking[] {
  const now = Date.now();
  const todayStr = new Date(now).toISOString().split('T')[0];
  const tomorrowStr = new Date(now + 86400000).toISOString().split('T')[0];

  return bookingsList.map((b, index) => {
    // Determine ordered timestamp (must be in the past)
    let bCreatedAt = b.createdAt;
    if (!bCreatedAt || bCreatedAt >= now) {
      // Set to some hours in the past based on index to distribute
      bCreatedAt = now - (3600000 * (index + 2)); 
    }

    if (b.status === 'Delivered') {
      // 1. Delivery date and deliveredAt must be in the past
      let bDeliveredAt = b.deliveredAt || (bCreatedAt + 3600000 * 2);
      if (bDeliveredAt >= now) {
        bDeliveredAt = now - 3600000; // 1 hour ago
      }
      
      const delDateStr = new Date(bDeliveredAt).toISOString().split('T')[0];
      // Deliver date must be <= todayStr (past/current)
      const bRequestedDate = delDateStr <= todayStr ? delDateStr : new Date(now - 86400000).toISOString().split('T')[0];

      return {
        ...b,
        createdAt: bCreatedAt,
        deliveredAt: bDeliveredAt,
        requestedDate: bRequestedDate,
      };
    } else {
      // Pending / Confirmed / En Route (Active)
      // 2. Delivery date (requestedDate) must be in the future
      let bRequestedDate = b.requestedDate;
      if (!bRequestedDate || bRequestedDate <= todayStr) {
        // Schedule in the future (tomorrow or later)
        const daysAhead = 1 + (index % 3); // distribute tomorrow, day after, etc.
        bRequestedDate = new Date(now + 86400000 * daysAhead).toISOString().split('T')[0];
      }
      
      // Make sure ordered date (createdAt) is in the past!
      if (bCreatedAt >= now) {
        bCreatedAt = now - 3600000;
      }

      const cleanB = {
        ...b,
        createdAt: bCreatedAt,
        requestedDate: bRequestedDate,
      };
      delete cleanB.deliveredAt;
      return cleanB;
    }
  });
}

const STATUS_COLORS = {
  'Pending': 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 shadow-sm shadow-amber-100 dark:shadow-none',
  'Confirmed': 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 shadow-sm shadow-blue-100 dark:shadow-none',
  'En Route': 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 shadow-sm shadow-indigo-100 dark:shadow-none',
  'Delivered': 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 shadow-sm shadow-emerald-100 dark:shadow-none',
};

const STATUS_STEPS = ['Pending', 'Confirmed', 'En Route', 'Delivered'];

export default function App() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userRole, setUserRole] = useState<'society' | 'resident' | 'driver' | 'admin' | null>(null);
  const [userProfileData, setUserProfileData] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>(() => {
    return localStorage.getItem('activeTab') || 'dashboard';
  });

  // Handle Auth State Changes and validate session state on back navigation / unload
  useEffect(() => {
    const validateAuthState = () => {
      const isAuthenticated = !!auth.currentUser || !!currentUser;
      const savedRole = localStorage.getItem('userRole');
      if (!isAuthenticated || !savedRole) {
        return false;
      }
      return true;
    };

    const handlePopState = (event: PopStateEvent) => {
      const isValidAuth = validateAuthState();
      // If user returns via back button with an invalid or dangling session state, redirect to login
      if (!isValidAuth || (event.state && event.state.loginStep)) {
        if (!isValidAuth) {
          setUserRole(null);
          setCurrentUser(null);
          setUserProfileData(null);
          localStorage.removeItem('userRole');
          localStorage.removeItem('sandboxProfile');
          window.history.replaceState({ loginStep: 'role' }, '', '');
          return;
        }
      }

      if (event.state && event.state.userRole) {
        setUserRole(event.state.userRole);
      } else if (currentUser) {
        const savedRole = localStorage.getItem('userRole') || userProfileData?.role || 'resident';
        if (savedRole) {
          setUserRole(savedRole as any);
        } else {
          // Dangling session without valid role
          setUserRole(null);
          setCurrentUser(null);
          setUserProfileData(null);
          localStorage.removeItem('userRole');
          window.history.replaceState({ loginStep: 'role' }, '', '');
        }
      }
    };

    const handleBeforeUnload = () => {
      // Validate authentication state before unload and clean dangling local state if unauthenticated
      const isAuthenticated = !!auth.currentUser || !!currentUser;
      if (!isAuthenticated) {
        localStorage.removeItem('userRole');
        localStorage.removeItem('sandboxProfile');
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser, userProfileData]);

  // Ensure logged-in user always has a valid role
  useEffect(() => {
    if (currentUser && !userRole) {
      const savedRole = localStorage.getItem('userRole') || userProfileData?.role || 'resident';
      setUserRole(savedRole as any);
    }
  }, [currentUser, userRole, userProfileData]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        
        // Handle offline state immediately
        if (!navigator.onLine) {
          console.warn('User is offline, attempting to load role from cache/localStorage');
          const cachedRole = localStorage.getItem('userRole');
          if (cachedRole) {
            setUserRole(cachedRole as any);
          } else {
            setUserRole('resident');
          }
          setAuthLoading(false);
          toast.warning("Limited Connectivity", { description: "You're offline. Some features may not work as expected." });
          return;
        }

        try {
          // Increase timeout to 15 seconds to be more resilient to slow networks
          const rolePromise = getDoc(doc(db, 'users', user.uid));
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 15000)
          );
          
          const userDoc = await Promise.race([rolePromise, timeoutPromise]) as any;
          if (userDoc && userDoc.exists()) {
            const role = userDoc.data().role;
            setUserRole(role);
            setUserProfileData(userDoc.data());
            // Sync history state on refresh/load
            if (window.history.state?.userRole !== role) {
              window.history.replaceState({ ...window.history.state, userRole: role }, '', '');
            }
          } else {
            const storedRole = localStorage.getItem('userRole');
            if (storedRole) {
              try {
                // Ensure the doc is created BEFORE setting state to avoid race condition with rules
                const initialProfile = { 
                  uid: user.uid, 
                  email: user.email, 
                  name: user.displayName || '', 
                  role: storedRole, 
                  phone: user.phoneNumber || '' 
                };
                await setDoc(doc(db, 'users', user.uid), initialProfile, { merge: true });
                setUserRole(storedRole as any);
                setUserProfileData(initialProfile);
              } catch (e) { 
                console.warn('Initial role sync failed:', e);
                // Fallback to state even if sync fails, though queries might fail
                setUserRole(storedRole as any);
                setUserProfileData({
                  uid: user.uid,
                  email: user.email,
                  name: user.displayName || '',
                  role: storedRole,
                  phone: user.phoneNumber || ''
                });
              }
            } else {
              // If no role in local storage either, default to resident or ask user
              // For now, let's just set as resident if we're stuck
              setUserRole('resident');
              setUserProfileData({
                uid: user.uid,
                email: user.email,
                name: user.displayName || '',
                role: 'resident',
                phone: user.phoneNumber || ''
              });
            }
          }
        } catch (error: any) {
          console.error('Role fetch error:', error);
          const fallbackRole = localStorage.getItem('userRole');
          if (fallbackRole) {
            setUserRole(fallbackRole as any);
          } else {
            // Default fallback if everything fails
            setUserRole('resident');
          }
          
          if (error.message === 'Timeout') {
            toast.error("Slow Connection", { description: "It's taking longer than usual to load your profile. Some features might be limited." });
          }
        } finally {
          setAuthLoading(false);
        }
      } else {
        setCurrentUser(null);
        setUserRole(null);
        setUserProfileData(null);
        setAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      if (currentUser?.uid === 'sandbox_user') {
        setCurrentUser(null);
        setUserRole(null);
        setUserProfileData(null);
        localStorage.removeItem('userRole');
        localStorage.removeItem('activeTab');
        window.history.replaceState({ loginStep: 'role' }, '', '');
        toast.success("Successfully logged out");
        return;
      }
      await signOut(auth);
      setCurrentUser(null);
      setUserRole(null);
      setUserProfileData(null);
      localStorage.removeItem('userRole');
      localStorage.removeItem('activeTab');
      window.history.replaceState({ loginStep: 'role' }, '', '');
      toast.success("Successfully logged out");
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  const handleSandboxLogin = (role: 'society' | 'resident' | 'driver' | 'admin') => {
    localStorage.setItem('userRole', role);
    setCurrentUser({
      uid: 'sandbox_user',
      email: 'sandbox@gmail.com',
      displayName: 'Demo User',
      emailVerified: true
    } as any);
    setUserRole(role);
    
    const cachedCustom = localStorage.getItem('sandboxProfile');
    if (cachedCustom) {
      try {
        const parsed = JSON.parse(cachedCustom);
        if (parsed.role === role) {
          setUserProfileData(parsed);
          if (window.history.state?.userRole !== role) {
            window.history.replaceState({ userRole: role }, '', '');
          }
          return;
        }
      } catch (_) {}
    }

    setUserProfileData({
      uid: 'sandbox_user',
      email: 'sandbox@gmail.com',
      name: 'Demo User',
      role: role,
      phone: '9876543210',
      societyName: role === 'resident' || role === 'society' ? 'Shanti Nagar C.H.S.' : '',
      flatNumber: role === 'resident' || role === 'society' ? 'A-101' : '',
      address: role === 'resident' || role === 'society' ? 'Flat A-101, Shanti Nagar C.H.S., Mira Road East' : '',
    });
    
    if (window.history.state?.userRole !== role) {
      window.history.replaceState({ userRole: role }, '', '');
    }
  };

  const handleSetUserRole = async (role: 'society' | 'resident' | 'driver' | 'admin' | null) => {
    if (currentUser) {
      if (currentUser.uid === 'sandbox_user') {
        if (role) {
          setUserRole(role);
          localStorage.setItem('userRole', role);
          if (window.history.state?.userRole !== role) {
            window.history.replaceState({ userRole: role }, '', '');
          }
        } else {
          setUserRole(null);
          localStorage.removeItem('userRole');
          if (window.history.state?.userRole !== null) {
            window.history.replaceState({ userRole: null }, '', '');
          }
        }
        return;
      }

      if (role) {
        try {
          await setDoc(doc(db, 'users', currentUser.uid), { 
            role,
            uid: currentUser.uid,
            email: currentUser.email,
            name: currentUser.displayName || ''
          }, { merge: true });
          
          setUserRole(role);
          localStorage.setItem('userRole', role);
          
          if (window.history.state?.userRole !== role) {
            window.history.replaceState({ userRole: role }, '', '');
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
        }
      } else {
        setUserRole(null);
        localStorage.removeItem('userRole');
        if (window.history.state?.userRole !== null) {
          window.history.replaceState({ userRole: null }, '', '');
        }
      }
    }
  };

  useEffect(() => {
    if (userRole) {
      localStorage.setItem('activeTab', activeTab);
    }
  }, [activeTab, userRole]);

  const [showProfile, setShowProfile] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  
  // Firestore Real-time Listeners
  useEffect(() => {
    if (!currentUser || !userRole) {
      setBookings([]);
      setComplaints([]);
      return;
    }

    if (currentUser.uid === 'sandbox_user') {
      const cachedB = localStorage.getItem('bookings');
      const cachedC = localStorage.getItem('complaints');
      
      const initialB = cachedB ? JSON.parse(cachedB) : [];
      const initialC = cachedC ? JSON.parse(cachedC) : [];
      
      if (initialB.length === 0) {
        const seededB = [
          {
            id: 'BK-demo-1',
            residentName: 'Nilesh Yadav',
            phone: '9876543210',
            volume: '10,000 Litres',
            address: 'Flat 101, Shanti Nagar, Mira Road East',
            instructions: 'Ring bell on arrival',
            status: 'Delivered' as BookingStatus,
            createdAt: Date.now() - 36000000,
            userId: 'sandbox_user',
            userRole: 'resident',
            tankerId: 'MH-04-WT-1234',
            driverName: 'Suresh Kumar',
            deliveredAt: Date.now() - 32000000,
            requestedDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
            requestedTime: '10:00 AM',
            paymentStatus: 'Paid' as const,
            paymentMethod: 'UPI' as const
          },
          {
            id: 'BK-demo-2',
            residentName: 'Nilesh Yadav',
            phone: '9876543210',
            volume: '5,000 Litres',
            address: 'Flat 101, Shanti Nagar, Mira Road East',
            instructions: 'Leave near gate',
            status: 'Pending' as BookingStatus,
            createdAt: Date.now(),
            userId: 'sandbox_user',
            userRole: 'resident',
            requestedDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
            requestedTime: '04:30 PM',
            paymentStatus: 'Pending' as const,
            paymentMethod: 'Cash' as const
          }
        ];
        setBookings(sanitizeBookings(seededB));
      } else {
        const repairedB = initialB.map((b: any) => {
          const todayStr = new Date().toISOString().split('T')[0];
          // If the booking is Pending/Confirmed/En Route but its date is in the past, move it to tomorrow
          if (b.status !== 'Delivered' && b.requestedDate <= todayStr) {
            b.requestedDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];
          }
          // If the booking is Delivered, ensure requestedDate is synchronized with deliveredAt
          if (b.status === 'Delivered' && b.deliveredAt) {
            b.requestedDate = new Date(b.deliveredAt).toISOString().split('T')[0];
          }
          return b;
        });
        setBookings(sanitizeBookings(repairedB));
      }

      if (initialC.length === 0) {
        const seededC = [
          {
            id: 'CP-demo-1',
            residentName: 'Nilesh Yadav',
            phone: '9876543210',
            issueType: 'Dirty Water Quality',
            description: 'The delivered water has a slight yellowish tint today. Please check.',
            status: 'Open' as 'Open' | 'Resolved',
            createdAt: Date.now() - 4000000,
            userId: 'sandbox_user'
          }
        ];
        setComplaints(seededC);
      } else {
        setComplaints(initialC);
      }
      return;
    }

    let bookingsQuery;
    let complaintsQuery;

    if (userRole === 'admin') {
      bookingsQuery = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'), limit(100));
      complaintsQuery = query(collection(db, 'complaints'), orderBy('createdAt', 'desc'), limit(50));
    } else if (userRole === 'driver') {
      bookingsQuery = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'), limit(50));
      complaintsQuery = query(collection(db, 'complaints'), where('userId', '==', currentUser.uid), orderBy('createdAt', 'desc'));
    } else {
      bookingsQuery = query(collection(db, 'bookings'), where('userId', '==', currentUser.uid), orderBy('createdAt', 'desc'));
      complaintsQuery = query(collection(db, 'complaints'), where('userId', '==', currentUser.uid), orderBy('createdAt', 'desc'));
    }

    const unsubBookings = onSnapshot(bookingsQuery, (snapshot) => {
      const bData = snapshot.docs.map(doc => doc.data() as Booking);
      setBookings(sanitizeBookings(bData));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'bookings'));

    const unsubComplaints = onSnapshot(complaintsQuery, (snapshot) => {
      const cData = snapshot.docs.map(doc => doc.data() as Complaint);
      setComplaints(cData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'complaints'));

    return () => {
      unsubBookings();
      unsubComplaints();
    };
  }, [currentUser, userRole]);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('bookings', JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    localStorage.setItem('complaints', JSON.stringify(complaints));
  }, [complaints]);

  // Live Update Simulation: Catch data and update itself
  useEffect(() => {
    const interval = setInterval(() => {
      // 10% chance to simulate a live update every 15 seconds
      if (Math.random() > 0.9) {
        setBookings(prev => {
          const pending = prev.filter(b => b.status === 'Pending');
          if (pending.length > 0) {
            const randomIndex = Math.floor(Math.random() * pending.length);
            const target = pending[randomIndex];
            const isPriority = target.priority;
            const eta = isPriority ? [10, 15, 20][Math.floor(Math.random() * 3)] : [30, 45, 60][Math.floor(Math.random() * 3)];
            
            const updated = prev.map(b => 
              b.id === target.id 
                ? { 
                    ...b, 
                    status: 'Delivered' as BookingStatus, 
                    tankerId: 'MH-04-WT-' + Math.floor(1000 + Math.random() * 9000), 
                    driverName: 'Auto System',
                    deliveredAt: Date.now()
                  } 
                : b
            );
            toast.info(isPriority ? `[URGENT] Priority Order ${target.id} Confirmed` : `Live Update: Order ${target.id} Confirmed`, {
              description: (
                <div className="flex flex-col items-center gap-3 pt-2">
                  <div className={`${isPriority ? 'bg-red-100 shadow-red-200' : 'bg-blue-100 shadow-blue-200'} p-4 rounded-3xl shadow-lg`}>
                    <Zap className={`w-8 h-8 ${isPriority ? 'text-red-600 animate-bounce' : 'text-blue-600 animate-pulse'}`} />
                  </div>
                  <div className="text-center">
                    <p className={`text-sm font-black text-slate-900 transition-colors uppercase tracking-tight ${isPriority ? 'text-red-600' : 'group-hover:text-blue-600'}`}>
                      {isPriority ? 'Priority Dispatch Active' : 'System Assignment'}
                    </p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                      Order {target.id} confirmed • ETA: {eta} mins
                    </p>
                  </div>
                </div>
              ),
              icon: <Zap className={`w-4 h-4 ${isPriority ? 'text-red-500' : 'text-blue-500'}`} />
            });
            return updated;
          }
          
          // If no pending, maybe simulate a new order?
          if (Math.random() > 0.5) {
            const newId = `BKG-${1000 + prev.length + Math.floor(Math.random() * 100)}`;
            const isPriority = Math.random() > 0.7; // 30% chance for priority orders
            const newOrder: Booking = {
              id: newId,
              userId: `USR-${100 + prev.length}`,
              residentName: ['Suresh Raina', 'MS Dhoni', 'Virat Kohli', 'Rohit Sharma', 'Hardik Pandya', 'Jasprit Bumrah'][Math.floor(Math.random() * 6)],
              phone: '+91 90000 ' + Math.floor(10000 + Math.random() * 90000),
              address: ['New Colony, Mira Road West', 'Shanti Nagar', 'Beverly Park', 'Silver Park'][Math.floor(Math.random() * 4)],
              volume: ['1000L', '2000L', '5000L'][Math.floor(Math.random() * 3)],
              status: 'Pending',
              priority: isPriority,
              requestedDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
              requestedTime: isPriority ? 'Instant (Priority)' : 'Morning (8 AM - 12 PM)',
              createdAt: Date.now(),
              paymentStatus: 'Paid',
              paymentMethod: 'UPI'
            };
            const randomMsgs = [
              isPriority ? `[PRIORITY] Urgent request from ${newOrder.residentName}!` : `Urgent request from ${newOrder.residentName} at ${newOrder.address.split(',')[0]}`,
              `New ${newOrder.volume} booking received! Verifying payment for ${newOrder.residentName}...`,
              isPriority ? `Incoming Priority order: ${newOrder.residentName} needs a tanker ASAP. Dispatching system alert.` : `Incoming live order: ${newOrder.residentName} needs a tanker.`
            ];
            toast.success(isPriority ? "Priority Request Received" : `New Live Order: ${newId}`, {
              description: randomMsgs[Math.floor(Math.random() * randomMsgs.length)],
              icon: isPriority ? <Zap className="w-4 h-4 text-red-500 animate-pulse" /> : <Activity className="w-4 h-4 text-emerald-500" />
            });
            return [newOrder, ...prev];
          }
          
          return prev;
        });
      }
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  // Real-time Simulation: Auto-confirm pending bookings (legacy, keeping for compatibility)
  useEffect(() => {
    const interval = setInterval(() => {
      const pendingIndex = bookings.findIndex(b => b.status === 'Pending');
      if (pendingIndex !== -1 && Math.random() > 0.9) {
        updateBookingStatus(bookings[pendingIndex].id, 'Confirmed');
      }
    }, 60000); 
    return () => clearInterval(interval);
  }, [bookings]);

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Notification Permission Request
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Global Click Sound
  useEffect(() => {
    let audioUnlocked = false;

    const unlockAudio = () => {
      if (audioUnlocked || !clickSound) return;
      // Play a silent sound to unlock audio context
      clickSound.play().then(() => {
        clickSound.pause();
        clickSound.currentTime = 0;
        audioUnlocked = true;
      }).catch(() => {});
    };

    const handleGlobalClick = (e: MouseEvent) => {
      unlockAudio();
      const target = e.target as HTMLElement;
      // Check if the click is on or inside a clickable element
      const clickable = target.closest('button, a, [role="button"], input[type="submit"], input[type="button"]');
      if (clickable) {
        playClick();
      }
    };
    // Use capture phase to ensure we catch the click before other listeners might stop propagation
    window.addEventListener('click', handleGlobalClick, true);
    return () => window.removeEventListener('click', handleGlobalClick, true);
  }, []);

  const sendNotification = (title: string, body: string, type: 'info' | 'success' | 'warning' = 'info') => {
    // 1. In-app Toast
    const toastId = `${title}-${body}-${Date.now()}`; // Unique ID to help prevent some repetition logic if needed
    
    if (type === 'success') toast.success(title, { description: body });
    else if (type === 'warning') toast.error(title, { description: body });
    else toast.info(title, { description: body });

    // 2. Browser Push Notification
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`AquaLink: ${title}`, {
          body,
          icon: 'https://cdn-icons-png.flaticon.com/512/3105/3105807.png',
          tag: 'aqualink-notification' // Replaces previous notification with same tag
        });
      } catch (e) {
        console.warn("Notification error:", e);
      }
    }
  };

  const handleBookTanker = async (newBooking: Booking) => {
    if (!currentUser) return;
    try {
      // Ensure the booking has the current user's ID and role
      const bookingData = { 
        ...newBooking, 
        userId: currentUser.uid, 
        userRole: userRole || 'resident',
        createdAt: Date.now() 
      };

      if (currentUser.uid === 'sandbox_user') {
        setBookings(prev => {
          const updated = [bookingData, ...prev];
          localStorage.setItem('bookings', JSON.stringify(updated));
          return updated;
        });
        toast.success("Demo Booking Placed", { description: "Your order was created in local sandbox." });
        return;
      }

      await setDoc(doc(db, 'bookings', newBooking.id), bookingData);
      
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const variants = [
        `New order from ${newBooking.residentName} for ${newBooking.volume} water.`,
        `Incoming request! ${newBooking.residentName} needs ${newBooking.volume} at ${newBooking.address.split(',')[0]}...`,
        `Notification: ${newBooking.residentName} placed a booking for ${newBooking.volume} at ${time}.`
      ];
      sendNotification(
        "Booking Received", 
        variants[Math.floor(Math.random() * variants.length)],
        'success'
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `bookings/${newBooking.id}`);
    }
  };

  const handleFileComplaint = async (newComplaint: Complaint) => {
    if (!currentUser) return;
    try {
      const complaintData = { ...newComplaint, userId: currentUser.uid, createdAt: Date.now() };

      if (currentUser.uid === 'sandbox_user') {
        setComplaints(prev => {
          const updated = [complaintData, ...prev];
          localStorage.setItem('complaints', JSON.stringify(updated));
          return updated;
        });
        toast.success("Demo Complaint Filed", { description: "Your ticket was created in local sandbox." });
        return;
      }

      await setDoc(doc(db, 'complaints', newComplaint.id), complaintData);
      
      const variants = [
        `${newComplaint.residentName} reported: ${newComplaint.issueType}. Review details in 'Complaints'.`,
        `Attention: New complaint from ${newComplaint.residentName} (${newComplaint.issueType}).`,
        `Support Ticket Created: ${newComplaint.residentName} is facing ${newComplaint.issueType.toLowerCase()} issues.`
      ];
      sendNotification(
        "Support Ticket", 
        variants[Math.floor(Math.random() * variants.length)],
        'warning'
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `complaints/${newComplaint.id}`);
    }
  };

  const handleResolveComplaint = async (id: string, reply: string) => {
    try {
      if (currentUser?.uid === 'sandbox_user') {
        setComplaints(prev => {
          const updated = prev.map(c => c.id === id ? { ...c, status: 'Resolved' as const, reply } : c);
          localStorage.setItem('complaints', JSON.stringify(updated));
          return updated;
        });
        toast.success("Complaint resolved in sandbox");
        return;
      }

      await updateDoc(doc(db, 'complaints', id), { status: 'Resolved', reply });
      sendNotification(
        "Complaint Resolved", 
        `Issue ${id} has been addressed.`,
        'success'
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `complaints/${id}`);
    }
  };

  const updateBookingStatus = async (id: string, newStatus: BookingStatus) => {
    try {
      const updates: any = { status: newStatus };
      
      if (newStatus === 'Confirmed') {
        const tankerId = `MH-04-WT-${Math.floor(1000 + Math.random() * 9000)}`;
        const baseEtas = [30, 45, 60, 90]; 
        
        let isPriority = false;
        if (currentUser?.uid === 'sandbox_user') {
          const bookingObj = bookings.find(b => b.id === id);
          isPriority = bookingObj?.priority || false;
        } else {
          const bookingDoc = await getDoc(doc(db, 'bookings', id));
          if (bookingDoc.exists()) {
            isPriority = bookingDoc.data().priority;
          }
        }
        
        const randomEta = isPriority ? [10, 15, 20][Math.floor(Math.random() * 3)] : baseEtas[Math.floor(Math.random() * baseEtas.length)];
        updates.tankerId = tankerId;
        updates.eta = `${randomEta} mins`;
        updates.driverName = ['Suresh Kumar', 'MS Dhoni', 'Virat Kohli'][Math.floor(Math.random() * 3)];
        updates.driverPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
      }

      if (newStatus === 'Delivered') {
        updates.deliveredAt = Date.now();
        updates.requestedDate = new Date().toISOString().split('T')[0];
      }
      
      if (currentUser?.uid === 'sandbox_user') {
        setBookings(prev => {
          const updated = prev.map(b => b.id === id ? { ...b, ...updates } : b);
          localStorage.setItem('bookings', JSON.stringify(updated));
          return updated;
        });
        toast.success(`Demo Status Updated: ${newStatus}`);
        return;
      }

      await updateDoc(doc(db, 'bookings', id), updates);
      
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      if (newStatus === 'Confirmed') {
        sendNotification(
          "Order Confirmed!", 
          `Booking #${id.slice(-4)} is officially assigned. ETA: ${updates.eta || 'Calculating...'}`,
          'success'
        );
      }
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, `bookings/${id}`);
    }
  };

  const deleteBooking = async (id: string) => {
    try {
      const choice = window.confirm("Are you sure you want to delete this record from your history?");
      if (choice) {
        if (currentUser?.uid === 'sandbox_user') {
          setBookings(prev => {
            const updated = prev.map(b => b.id === id ? { ...b, isDeletedForUser: true } : b);
            localStorage.setItem('bookings', JSON.stringify(updated));
            return updated;
          });
          toast.success("Order deleted from history");
          return;
        }

        const bookingRef = doc(db, 'bookings', id);
        await setDoc(bookingRef, { ...bookings.find(b => b.id === id), isDeletedForUser: true }, { merge: true });
        toast.success("Order deleted from history");
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${id}`);
    }
  };

  const deleteAllHistory = async () => {
    try {
      const deliveredBookings = bookings.filter(b => b.status === 'Delivered' && !b.isDeletedForUser);
      if (deliveredBookings.length === 0) return;

      const choice = window.confirm(`Are you sure you want to delete all ${deliveredBookings.length} records from your history?`);
      if (choice) {
        if (currentUser?.uid === 'sandbox_user') {
          setBookings(prev => {
            const updated = prev.map(b => b.status === 'Delivered' ? { ...b, isDeletedForUser: true } : b);
            localStorage.setItem('bookings', JSON.stringify(updated));
            return updated;
          });
          toast.success("History cleared successfully");
          return;
        }

        // Firebase Batch
        const { writeBatch } = await import('firebase/firestore');
        const batch = writeBatch(db);
        deliveredBookings.forEach(b => {
          const ref = doc(db, 'bookings', b.id);
          batch.update(ref, { isDeletedForUser: true });
        });
        await batch.commit();
        toast.success("History cleared successfully");
      }
    } catch (error) {
      toast.error("Failed to clear history");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Waves className="w-12 h-12 text-blue-600 animate-bounce" />
          <p className="text-slate-500 font-bold uppercase tracking-widest animate-pulse">Initializing AquaLink...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="bg-white dark:bg-slate-950 transition-colors duration-300">
        <Toaster position="top-right" richColors closeButton />
        <LoginView onLogin={handleSetUserRole} onSandboxLogin={handleSandboxLogin} onProfileLoaded={setUserProfileData} />
        <ChatBot userRole={null} bookings={[]} complaints={[]} />
      </div>
    );
  }

  // If logged in but role selection is needed
  if (!userRole) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 transition-colors duration-300">
        <Toaster position="top-right" richColors closeButton />
        <div className="max-w-md mx-auto min-h-screen flex items-center justify-center p-6">
           <div className="w-full space-y-8 animate-in fade-in zoom-in duration-500">
              <div className="text-center">
                <div className="vibrant-gradient w-16 h-16 rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-6">
                   <Waves className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-3xl font-display font-black text-slate-900 dark:text-white">Choose Your Portal</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-2">Select how you want to use AquaLink today.</p>
              </div>
              
              <div className="space-y-4">
                {[
                  { id: 'resident', name: 'Resident', icon: User, desc: 'Individual water booking', color: 'blue' },
                  { id: 'society', name: 'Society', icon: Users, desc: 'Bulk water management', color: 'indigo' },
                  { id: 'driver', name: 'Driver', icon: Truck, desc: 'Delivery dashboard', color: 'emerald' },
                  { id: 'admin', name: 'Admin', icon: Shield, desc: 'System control center', color: 'slate' }
                ].map((role) => (
                  <button 
                    key={role.id}
                    onClick={() => handleSetUserRole(role.id as any)}
                    className="w-full flex items-center p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-blue-600 transition-all group"
                  >
                    <div className={`p-3 rounded-xl bg-${role.color}-50 dark:bg-${role.color}-900/30 text-${role.color}-600 mr-4`}>
                      <role.icon className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-slate-900 dark:text-white">{role.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{role.desc}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 ml-auto text-slate-300" />
                  </button>
                ))}
              </div>
              
              <button 
                onClick={handleLogout}
                className="w-full py-4 text-sm font-bold text-slate-400 hover:text-red-500 transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" /> Sign out from {currentUser.email}
              </button>
           </div>
        </div>
        <ChatBot userRole={null} bookings={[]} complaints={[]} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-300">
      <Toaster position="top-right" richColors closeButton />
      {/* Header */}
      <header className="glass-card border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => handleSetUserRole(null)}
                className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all group"
              >
                <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg group-hover:bg-blue-600 transition-colors">
                  <ArrowLeft className="h-4 w-4 group-hover:text-white" />
                </div>
                <span className="text-sm font-bold hidden sm:inline">Back</span>
              </button>
              <div className="flex items-center gap-2">
                <motion.div 
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="vibrant-gradient p-2 rounded-lg flex items-center justify-center shadow-lg shadow-blue-200 dark:shadow-none"
                >
                  <Waves className="h-6 w-6 text-white" />
                </motion.div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-display font-black text-slate-900 dark:text-white leading-tight">AquaLink</h1>
                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-md border border-emerald-100 dark:border-emerald-800">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                      <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter">Live</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest">Pure Water, Delivered Smart.</p>
                </div>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <div className="flex items-center gap-4 px-4 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 pr-4 border-r border-slate-200 dark:border-slate-800">
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-mono font-bold text-slate-700 dark:text-slate-300">
                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {currentTime.getHours() >= 6 && currentTime.getHours() < 18 ? (
                    <>
                      <div className="bg-amber-100 dark:bg-amber-900/30 p-1 rounded-lg">
                        <Sun className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 fill-amber-600 dark:fill-amber-400" />
                      </div>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">32°C <span className="text-slate-400 dark:text-slate-500 font-medium">Sunny</span></span>
                    </>
                  ) : (
                    <>
                      <div className="bg-indigo-100 dark:bg-indigo-900/30 p-1 rounded-lg">
                        <Moon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 fill-indigo-600 dark:fill-indigo-400" />
                      </div>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">24°C <span className="text-slate-400 dark:text-slate-500 font-medium">Clear</span></span>
                    </>
                  )}
                </div>
              </div>

              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-sm"
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDarkMode ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-slate-600" />}
              </button>

              <a href={`tel:${HELPLINE_NUMBER}`} className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 px-4 py-2 rounded-xl border border-slate-200 transition-all group">
                <div className="bg-blue-100 p-1.5 rounded-lg group-hover:bg-blue-600 transition-colors">
                  <Phone className="w-3.5 h-3.5 text-blue-600 group-hover:text-white" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Helpline</p>
                  <p className="text-xs font-bold text-slate-700">{HELPLINE_NUMBER}</p>
                </div>
              </a>
              <div className="flex items-center gap-2 relative">
                <button 
                  onClick={() => setShowProfile(!showProfile)}
                  className="flex items-center gap-2 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                >
                  <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center border border-blue-700 shadow-sm">
                    <span className="text-white text-xs font-bold">NY</span>
                  </div>
                  <div className="hidden lg:block text-left">
                    <p className="text-xs font-bold text-slate-900 dark:text-white leading-none">Nilesh Yadav</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 capitalize">{userRole} Portal</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showProfile ? 'rotate-180' : ''}`} />
                </button>

                {showProfile && (
                  <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">Nilesh Yadav</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">nileshyadav.2081@gmail.com</p>
                    </div>
                    <div className="py-2">
                      <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <User className="w-4 h-4 text-slate-400" /> My Profile
                      </button>
                      <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <Settings className="w-4 h-4 text-slate-400" /> Account Settings
                      </button>
                      <button 
                        onClick={() => {
                          if (navigator.share) {
                            navigator.share({
                              title: 'AquaLink',
                              text: 'Join AquaLink - Smart Water Delivery in Mira-Bhayandar',
                              url: window.location.href
                            }).catch(() => {});
                          } else {
                            navigator.clipboard.writeText(window.location.href);
                            toast.success("Link copied!");
                          }
                          setShowProfile(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Share2 className="w-4 h-4 text-slate-400" /> Share App
                      </button>
                      <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <HelpCircle className="w-4 h-4 text-slate-400" /> Help Center
                      </button>
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => { handleLogout(); setShowProfile(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-bold"
                      >
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-slate-500 hover:text-slate-700 focus:outline-none"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="md:hidden bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 py-4 space-y-2 overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-2 mb-2">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Theme</span>
                <button 
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-all"
                >
                  {isDarkMode ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-slate-600" />}
                </button>
              </div>
              <a href={`tel:${HELPLINE_NUMBER}`} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 mb-2">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <Phone className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest leading-none">24/7 Helpline</p>
                  <p className="text-sm font-bold text-blue-900 dark:text-blue-100">{HELPLINE_NUMBER}</p>
                </div>
              </a>
              <div className="flex items-center gap-2 px-4 py-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                <User className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 capitalize">{userRole} Portal</span>
              </div>
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: 'AquaLink',
                      text: 'Join AquaLink - Smart Water Delivery in Mira-Bhayandar',
                      url: window.location.href
                    }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success("Link copied!");
                  }
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 text-left px-4 py-3 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30"
              >
                <Share2 className="w-4 h-4" /> Share App
              </button>
              <button
                onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-2 text-left px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-100 dark:border-red-900/30 mt-2"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {(userRole === 'resident' || userRole === 'society') && (
          <ResidentView 
            bookings={bookings.filter(b => !b.isDeletedForUser)} 
            onBook={handleBookTanker} 
            complaints={complaints} 
            onFileComplaint={handleFileComplaint}
            onDeleteBooking={deleteBooking}
            onDeleteAllHistory={deleteAllHistory}
            userRole={userRole}
            userProfile={userProfileData}
          />
        )}
        {userRole === 'admin' && (
          <VendorView bookings={bookings} onUpdateStatus={updateBookingStatus} complaints={complaints} onResolveComplaint={handleResolveComplaint} />
        )}
        {userRole === 'driver' && (
          <DriverView bookings={bookings} onUpdateStatus={updateBookingStatus} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="vibrant-gradient p-1.5 rounded-lg">
                <Waves className="h-4 w-4 text-white" />
              </div>
              <p className="text-sm font-display font-black text-slate-900 dark:text-white">AquaLink</p>
            </div>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500">© 2026 AquaLink Technologies. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-xs font-bold text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Privacy</a>
              <a href="#" className="text-xs font-bold text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>

      <ChatBot userRole={userRole} bookings={bookings} complaints={complaints} />
    </div>
  );
}

function LoginView({ onLogin, onSandboxLogin, onProfileLoaded }: { 
  onLogin: (role: 'society' | 'resident' | 'driver' | 'admin') => void; 
  onSandboxLogin?: (role: 'society' | 'resident' | 'driver' | 'admin') => void;
  onProfileLoaded?: (profile: any) => void;
}) {
  const [step, setStep] = useState<'role' | 'login' | 'otp' | 'forgot'>(() => {
     return (window.history.state?.loginStep as any) || 'role';
   });
   const [selectedRole, setSelectedRole] = useState<'society' | 'resident' | 'driver' | 'admin' | null>(null);
   const [isAvailabilityLoading, setIsAvailabilityLoading] = useState(false);
   const [isLoginPending, setIsLoginPending] = useState(false);

  // Sync step with history
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.loginStep) {
        setStep(event.state.loginStep);
      } else {
        setStep('role');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const changeStep = (newStep: typeof step) => {
    setStep(newStep);
    window.history.replaceState({ loginStep: newStep }, '', '');
  };

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const [availabilityArea, setAvailabilityArea] = useState('shanti_nagar');
  const [availabilityStatus, setAvailabilityStatus] = useState<string | null>(null);
  const [availabilityCache, setAvailabilityCache] = useState<Record<string, { status: string, timestamp: number }>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshRotation, setRefreshRotation] = useState(0);

  const [otpSent, setOtpSent] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [fullName, setFullName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [societyName, setSocietyName] = useState('');
  const [flatNumber, setFlatNumber] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');

  const handleSendOTP = () => {
    if (phoneNumber.length === 10) {
      setOtpSent(true);
      toast.success("OTP Sent!", { description: `A 6-digit code has been sent to +91 ${phoneNumber}` });
    } else {
      toast.error("Invalid Number", { description: "Please enter a valid 10-digit phone number." });
    }
  };

  const handleRoleSelect = (role: 'society' | 'resident' | 'driver' | 'admin') => {
    setSelectedRole(role);
    changeStep('login');
  };

  const handleGoogleSignIn = async () => {
    if (isLoginPending) return;
    setIsLoginPending(true);
    try {
      if (selectedRole) {
        localStorage.setItem('userRole', selectedRole);
      }
      const provider = new GoogleAuthProvider();
      // Use browserPopupRedirectResolver to fix assertion errors in some browser environments
      await signInWithPopup(auth, provider, browserPopupRedirectResolver);
    } catch (error: any) {
       console.error('Google Sign In Error:', error);
       if (error.code === 'auth/popup-closed-by-user') {
         toast.info("Login Cancelled", { description: "The login popup was closed before completion." });
       } else if (error.code === 'auth/popup-blocked') {
         toast.error("Popup Blocked", { description: "Please allow popups for this site to sign in with Google." });
       } else if (error.message?.includes('INTERNAL ASSERTION FAILED')) {
         toast.error("Auth Issue", { description: "A system error occurred. Please refresh the page and try again." });
       } else {
         toast.error("Login Failed", { description: "Please try again or check your browser settings." });
       }
    } finally {
      setIsLoginPending(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoginPending) return;
    setIsLoginPending(true);
    
    try {
      if (selectedRole) {
        localStorage.setItem('userRole', selectedRole);
      }

      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const profileData: any = {
          uid: user.uid,
          email: email,
          role: selectedRole || 'resident',
          name: fullName || email.split('@')[0],
          phone: regPhone || '',
          createdAt: Date.now()
        };

        if (selectedRole === 'resident' || selectedRole === 'society') {
          profileData.societyName = societyName || '';
          profileData.flatNumber = flatNumber || '';
          profileData.address = `Flat ${flatNumber || 'A-101'}, ${societyName || 'Shanti Nagar C.H.S.'}, Mira Road East`;
        } else if (selectedRole === 'driver') {
          profileData.vehicleNumber = vehicleNumber || '';
        }

        await setDoc(doc(db, 'users', user.uid), profileData);
        onProfileLoaded?.(profileData);

        try {
          await updateProfile(user, { displayName: fullName || email.split('@')[0] });
        } catch (err) {
          console.warn('Could not update display name:', err);
        }

        toast.success("Account Created!", { description: "Your account has been successfully registered." });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      if (error.code === 'auth/operation-not-allowed') {
        const fallbackRole = selectedRole || 'resident';
        localStorage.setItem('userRole', fallbackRole);

        const customProfile = {
          uid: 'sandbox_user',
          name: fullName || 'Demo User',
          phone: regPhone || '9876543210',
          email: email || 'sandbox@gmail.com',
          role: fallbackRole,
          societyName: (fallbackRole === 'resident' || fallbackRole === 'society') ? (societyName || 'Shanti Nagar C.H.S.') : '',
          flatNumber: (fallbackRole === 'resident' || fallbackRole === 'society') ? (flatNumber || 'A-101') : '',
          vehicleNumber: fallbackRole === 'driver' ? (vehicleNumber || 'MH-04-EL-1234') : '',
          address: (fallbackRole === 'resident' || fallbackRole === 'society') ? `Flat ${flatNumber || 'A-101'}, ${societyName || 'Shanti Nagar C.H.S.'}, Mira Road East` : ''
        };
        localStorage.setItem('sandboxProfile', JSON.stringify(customProfile));

        onSandboxLogin?.(fallbackRole);
        toast.info("Sandbox Mode Activated", { 
          description: "Firebase Email/Password provider is disabled. Signed in with your custom profile in Sandbox Mode.",
          duration: 10000 
        });
        return;
      }

      console.error('Email Auth Error:', error);
      let message = "An error occurred during authentication.";
      if (error.code === 'auth/user-not-found') message = "No account found with this email.";
      if (error.code === 'auth/wrong-password') message = "Incorrect password.";
      if (error.code === 'auth/email-already-in-use') message = "This email is already registered.";
      if (error.code === 'auth/invalid-email') message = "Please enter a valid email address.";
      if (error.code === 'auth/weak-password') message = "Password should be at least 6 characters.";
      
      toast.error(isRegistering ? "Registration Failed" : "Login Failed", { 
        description: message,
        duration: 8000 
      });
    } finally {
      setIsLoginPending(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Email required", { description: "Please enter your email address." });
      return;
    }
    setIsLoginPending(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("Reset link sent!", { description: `A password reset link has been sent to ${email}` });
      setStep('login');
    } catch (error: any) {
      console.error('Reset Error:', error);
      let message = "Could not send reset link. Please check the email address.";
      if (error.code === 'auth/user-not-found') message = "No account found with this email.";
      toast.error("Reset Failed", { description: message });
    } finally {
      setIsLoginPending(false);
    }
  };

  const checkAvailability = (forceRefresh = false) => {
    const now = Date.now();
    const cached = availabilityCache[availabilityArea];
    
    // If cached and less than 1 minute old, and not forcing refresh, use it
    if (!forceRefresh && cached && (now - cached.timestamp < 1 * 60 * 1000)) {
      setAvailabilityStatus(cached.status);
      return;
    }

    // If forcing refresh but it's been less than 1 minute since last update, don't change the number
    if (forceRefresh && cached && (now - cached.timestamp < 1 * 60 * 1000)) {
      setIsAvailabilityLoading(true);
      setTimeout(() => {
        setAvailabilityStatus(cached.status);
        setIsAvailabilityLoading(false);
        toast.info("Data up to date", { description: "Availability was checked less than a minute ago." });
      }, 2000);
      return;
    }

    // Otherwise generate new versatile count after 2s loading
    setIsAvailabilityLoading(true);
    setTimeout(() => {
      const count = Math.floor(Math.random() * 15) + 3; // 3 to 17 tankers
      let status = '';
      if (count > 10) {
        status = `🟢 High Availability (${count} tankers nearby)`;
      } else if (count > 5) {
        status = `🟡 Moderate Availability (${count} tankers nearby)`;
      } else {
        status = `🔴 Low Availability (${count} tankers nearby)`;
      }

      setAvailabilityStatus(status);
      setAvailabilityCache(prev => ({
        ...prev,
        [availabilityArea]: { status, timestamp: Date.now() }
      }));
      setIsAvailabilityLoading(false);

      if (forceRefresh) {
        toast.success("Availability Updated", { description: `Refreshed data for ${availabilityArea.replace('_', ' ')}` });
      }
    }, 2000);
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpValue === '123456') {
       handleGoogleSignIn();
    } else {
      toast.error("Invalid OTP", { description: "The code you entered is incorrect. Try matching the test code (123456)." });
    }
  };

  const handleRefreshAvailability = () => {
    if (isRefreshing) return;
    
    playClick();
    setIsRefreshing(true);
    setRefreshRotation(prev => prev + 360);
    
    // checkAvailability handles the 1-minute logic and loading
    checkAvailability(true);
    
    setTimeout(() => setIsRefreshing(false), 2000);
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Side - Image/Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative vibrant-gradient overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
        <img 
          src="https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&q=80" 
          alt="Water background" 
          className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-overlay scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-transparent to-indigo-900/60"></div>
        <div className="relative z-10 flex flex-col justify-between p-16 w-full">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md border border-white/30 shadow-2xl">
              <Waves className="h-10 w-10 text-white" />
            </div>
            <span className="text-4xl font-display font-black text-white tracking-tight drop-shadow-lg">AquaLink</span>
          </div>
          <div className="max-w-lg">
            <div className="bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/20 shadow-2xl">
              <h2 className="text-5xl font-display font-extrabold text-white mb-2 leading-tight">Smart Water Management</h2>
              <p className="text-blue-300 text-sm font-black uppercase tracking-[0.3em] mb-6">Pure Water, Delivered Smart.</p>
              <p className="text-blue-50 text-xl font-medium leading-relaxed opacity-90">Connecting residents, societies, and drivers for seamless, timely, and transparent water delivery in Mira-Bhayandar.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Options */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-slate-50 dark:bg-slate-950 transition-colors duration-300 relative overflow-hidden">
        {/* Background Pattern Refinement */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        </div>
        
        {/* Dark Mode Toggle for Login Screen */}
        <div className="absolute top-6 right-6 z-50">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-xl shadow-slate-200/50 dark:shadow-none"
          >
            {isDarkMode ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-slate-600" />}
          </button>
        </div>

        <div className="max-w-md w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          {step === 'role' && (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="vibrant-gradient p-4 rounded-2xl shadow-xl animate-bounce-slow">
                    <Waves className="h-10 w-10 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-display font-black text-slate-900 dark:text-white tracking-tight">AquaLink</h1>
                  <p className="text-blue-600 dark:text-blue-400 font-bold uppercase tracking-[0.2em] text-[10px]">Pure Water, Delivered Smart.</p>
                </div>
                <h2 className="text-2xl font-display font-black text-slate-900 dark:text-white tracking-tight">Welcome to AquaLink</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Select your portal to continue.</p>
              </div>

              {/* Availability Widget */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-900 p-6 rounded-3xl border border-blue-100 dark:border-slate-800 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/40 dark:bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <h3 className="font-display font-bold text-slate-900 dark:text-white mb-4 flex items-center justify-between relative z-10 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-600" /> Tanker Availability
                  </div>
                  {availabilityStatus && (
                    <button 
                      onClick={handleRefreshAvailability}
                      disabled={isRefreshing}
                      className="p-1.5 hover:bg-blue-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-blue-600 disabled:opacity-50"
                    >
                      <motion.div animate={{ rotate: refreshRotation }} transition={{ duration: 2, ease: "easeInOut" }}>
                        <RefreshCcw className="w-3 h-3" />
                      </motion.div>
                    </button>
                  )}
                </h3>
                <div className="flex flex-col sm:flex-row gap-2 relative z-10">
                  <select 
                    className="w-full sm:flex-1 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-900 dark:text-white transition-all"
                    value={availabilityArea}
                    onChange={e => { setAvailabilityArea(e.target.value); setAvailabilityStatus(null); }}
                  >
                    <option value="shanti_nagar">Shanti Nagar</option>
                    <option value="naya_nagar">Naya Nagar</option>
                    <option value="srishti_complex">Srishti Complex</option>
                    <option value="poonam_sagar">Poonam Sagar</option>
                    <option value="beverly_park">Beverly Park</option>
                    <option value="silver_park">Silver Park</option>
                  </select>
                  <button onClick={() => checkAvailability(false)} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95">
                    Check
                  </button>
                </div>
                {isAvailabilityLoading ? (
                  <div className="mt-3 text-[10px] font-bold text-blue-700 bg-blue-100/50 p-2 rounded-lg flex items-center gap-2 animate-pulse">
                    <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    Checking...
                  </div>
                ) : availabilityStatus && (
                  <div className="mt-3 text-[10px] font-bold text-emerald-700 bg-emerald-100/50 p-2 rounded-lg flex items-center gap-2">
                    {availabilityStatus}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3">
                <motion.button 
                  whileHover={{ scale: 1.01, y: -2 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleRoleSelect('resident')} 
                  className="w-full flex items-center p-3 sm:p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-blue-600 hover:shadow-xl hover:shadow-blue-100 dark:hover:shadow-none transition-all group overflow-hidden relative cursor-pointer"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-full -mr-12 -mt-12 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors"></div>
                  <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-xl group-hover:bg-blue-600 transition-colors mr-4 relative z-10">
                    <User className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 group-hover:text-white" />
                  </div>
                  <div className="text-left flex-1 relative z-10">
                    <p className="font-display font-bold text-slate-900 dark:text-white text-sm sm:text-base">Resident</p>
                    <p className="text-[10px] sm:text-sm text-slate-500 dark:text-slate-400">Individual homes</p>
                  </div>
                  <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs sm:text-sm font-bold rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors relative z-10 flex-shrink-0">
                    Login
                  </div>
                </motion.button>
                
                <motion.button 
                  whileHover={{ scale: 1.01, y: -2 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleRoleSelect('society')} 
                  className="w-full flex items-center p-3 sm:p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-indigo-600 hover:shadow-xl hover:shadow-indigo-100 dark:hover:shadow-none transition-all group overflow-hidden relative cursor-pointer"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 dark:bg-indigo-900/20 rounded-full -mr-12 -mt-12 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 transition-colors"></div>
                  <div className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-xl group-hover:bg-indigo-600 transition-colors mr-4 relative z-10">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 group-hover:text-white" />
                  </div>
                  <div className="text-left flex-1 relative z-10">
                    <p className="font-display font-bold text-slate-900 dark:text-white text-sm sm:text-base">Society</p>
                    <p className="text-[10px] sm:text-sm text-slate-500 dark:text-slate-400">Bulk booking</p>
                  </div>
                  <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs sm:text-sm font-bold rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors relative z-10 flex-shrink-0">
                    Login
                  </div>
                </motion.button>

                <motion.button 
                  whileHover={{ scale: 1.01, y: -2 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleRoleSelect('driver')} 
                  className="w-full flex items-center p-3 sm:p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-emerald-600 hover:shadow-xl hover:shadow-emerald-100 dark:hover:shadow-none transition-all group overflow-hidden relative cursor-pointer"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 dark:bg-emerald-900/20 rounded-full -mr-12 -mt-12 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40 transition-colors"></div>
                  <div className="bg-emerald-50 dark:bg-emerald-900/30 p-3 rounded-xl group-hover:bg-emerald-600 transition-colors mr-4 relative z-10">
                    <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 group-hover:text-white" />
                  </div>
                  <div className="text-left flex-1 relative z-10">
                    <p className="font-display font-bold text-slate-900 dark:text-white text-sm sm:text-base">Driver</p>
                    <p className="text-[10px] sm:text-sm text-slate-500 dark:text-slate-400">Manage deliveries</p>
                  </div>
                  <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm font-bold rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors relative z-10 flex-shrink-0">
                    Login
                  </div>
                </motion.button>

                <motion.button 
                  whileHover={{ scale: 1.01, y: -2 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleRoleSelect('admin')} 
                  className="w-full flex items-center p-3 sm:p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-slate-800 dark:hover:border-slate-400 hover:shadow-xl hover:shadow-slate-200 dark:hover:shadow-none transition-all group overflow-hidden relative cursor-pointer"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full -mr-12 -mt-12 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors"></div>
                  <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl group-hover:bg-slate-800 dark:group-hover:bg-slate-700 transition-colors mr-4 relative z-10">
                    <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700 dark:text-slate-300 group-hover:text-white" />
                  </div>
                  <div className="text-left flex-1 relative z-10">
                    <p className="font-display font-bold text-slate-900 dark:text-white text-sm sm:text-base">Admin</p>
                    <p className="text-[10px] sm:text-sm text-slate-500 dark:text-slate-400">System management</p>
                  </div>
                  <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-bold rounded-lg group-hover:bg-slate-800 dark:group-hover:bg-slate-700 group-hover:text-white transition-colors relative z-10 flex-shrink-0">
                    Login
                  </div>
                </motion.button>
              </div>
            </div>
          )}

          {step === 'login' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <button onClick={() => window.history.back()} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium mb-6">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <div>
                <h2 className="text-3xl font-bold text-slate-900 capitalize">{selectedRole} Login</h2>
                <p className="text-slate-500 mt-2">Sign in to access your portal</p>
              </div>

              <button 
                onClick={handleGoogleSignIn} 
                disabled={isLoginPending}
                className="w-full flex items-center justify-center gap-3 p-3.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-medium text-slate-700 shadow-sm disabled:opacity-50"
              >
                {isLoginPending ? (
                  <div className="w-5 h-5 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                )}
                {isLoginPending ? 'Connecting...' : 'Continue with Google'}
              </button>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink-0 mx-4 text-slate-400 text-sm">or</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5 flex justify-between font-bold">
                    Email Address
                    {isRegistering && (
                      <span className="text-[10px] text-blue-600 font-extrabold uppercase tracking-widest">New Account</span>
                    )}
                  </label>
                  <div className="relative">
                    <Mail className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="email" 
                      required 
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-white" 
                      placeholder="you@gmail.com" 
                    />
                  </div>
                </div>

                {isRegistering && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5 font-bold">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input 
                          type="text" 
                          required={isRegistering} 
                          value={fullName}
                          onChange={e => setFullName(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-white" 
                          placeholder="Nilesh Yadav" 
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5 font-bold">
                        Phone Number
                      </label>
                      <div className="relative flex">
                        <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 text-slate-500 text-sm font-semibold">+91</span>
                        <input 
                          type="tel" 
                          required={isRegistering} 
                          pattern="[0-9]{10}"
                          maxLength={10}
                          value={regPhone}
                          onChange={e => setRegPhone(e.target.value.replace(/\D/g, ''))}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-r-xl focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-white" 
                          placeholder="9876543210" 
                        />
                      </div>
                    </div>

                    {(selectedRole === 'resident' || selectedRole === 'society') && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5 font-bold">
                            Society Name
                          </label>
                          <div className="relative">
                            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input 
                              type="text" 
                              required={isRegistering} 
                              value={societyName}
                              onChange={e => setSocietyName(e.target.value)}
                              className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-white text-xs font-semibold" 
                              placeholder="Shanti Nagar C.H.S." 
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5 font-bold">
                            Flat & Wing
                          </label>
                          <div className="relative">
                            <span className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-extrabold uppercase">Unit</span>
                            <input 
                              type="text" 
                              required={isRegistering} 
                              value={flatNumber}
                              onChange={e => setFlatNumber(e.target.value)}
                              className="w-full pl-11 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-white text-xs font-semibold" 
                              placeholder="A-101" 
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedRole === 'driver' && (
                      <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5 font-bold">
                          Vehicle Tanker No (License Plate)
                        </label>
                        <div className="relative">
                          <Truck className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input 
                            type="text" 
                            required={isRegistering} 
                            value={vehicleNumber}
                            onChange={e => setVehicleNumber(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-white" 
                            placeholder="MH-04-EL-1234" 
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                    {!isRegistering && (
                      <button type="button" onClick={() => setStep('forgot')} className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium">Forgot password?</button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="password" 
                      required 
                      minLength={6} 
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-900 dark:text-white" 
                      placeholder="At least 6 digits" 
                    />
                  </div>
                </div>
                <button 
                  type="submit" 
                  disabled={isLoginPending}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3.5 rounded-xl font-medium transition-colors shadow-sm disabled:bg-blue-400 flex items-center justify-center gap-2"
                >
                  {isLoginPending && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                  {isRegistering ? 'Create Account' : 'Sign In'}
                </button>
              </form>

              <div className="text-center">
                <button 
                  onClick={() => setIsRegistering(!isRegistering)}
                  className="text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors"
                >
                  {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                </button>
              </div>

              <div className="text-center pt-4 space-y-3">
                <button onClick={() => setStep('otp')} className="text-slate-600 hover:text-blue-600 text-sm font-bold flex items-center justify-center gap-2 w-full p-4 border-2 border-dashed border-slate-200 rounded-2xl hover:border-blue-400 hover:bg-blue-50 transition-all">
                  <Smartphone className="w-5 h-5" /> Login with Phone Number (OTP)
                </button>

                <button 
                  onClick={() => {
                    localStorage.setItem('userRole', selectedRole || 'resident');
                    onSandboxLogin?.(selectedRole || 'resident');
                    toast.success("Demo/Sandbox Mode Active", { description: "Logged in securely via local offline session." });
                  }}
                  className="w-full flex items-center justify-center gap-2 p-4 bg-indigo-50 border border-indigo-200 rounded-2xl hover:bg-indigo-100 transition-all text-sm font-bold text-slate-700"
                >
                  <Shield className="w-5 h-5 text-indigo-500" /> Enter Sandbox / Demo Mode
                </button>
              </div>
            </div>
          )}

          {step === 'otp' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <button onClick={() => { setStep('login'); setOtpSent(false); }} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium mb-6">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <div>
                <h2 className="text-3xl font-bold text-slate-900">Phone Login</h2>
                <p className="text-slate-500 mt-2">
                  {otpSent ? `Enter the code sent to +91 ${phoneNumber}` : "We'll send you a one-time password"}
                </p>
              </div>
              <form onSubmit={handleVerifyOTP} className="space-y-5">
                {!otpSent ? (
                  <>
                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-1.5">Phone Number</label>
                      <div className="flex gap-2">
                        <span className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-medium flex items-center">+91</span>
                        <input 
                          type="tel" 
                          required 
                          minLength={10} 
                          maxLength={10} 
                          pattern="[0-9]{10}" 
                          title="Please enter exactly 10 digits" 
                          className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                          placeholder="9876543210"
                          value={phoneNumber}
                          onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                        />
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={handleSendOTP} 
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3.5 rounded-xl font-medium transition-colors shadow-sm"
                    >
                      Send OTP
                    </button>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-1.5">Enter OTP</label>
                      <div className="relative">
                        <Key className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input 
                          type="text" 
                          required 
                          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none tracking-widest text-lg font-bold" 
                          placeholder="••••••" 
                          maxLength={6}
                          value={otpValue}
                          onChange={e => setOtpValue(e.target.value.replace(/\D/g, ''))}
                        />
                      </div>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3.5 rounded-xl font-medium transition-colors shadow-sm">
                      Verify & Login
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setOtpSent(false)} 
                      className="w-full text-sm text-blue-600 font-bold hover:underline"
                    >
                      Resend OTP
                    </button>
                  </>
                )}
              </form>
            </div>
          )}

          {step === 'forgot' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <button onClick={() => setStep('login')} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium mb-6">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <div>
                <h2 className="text-3xl font-bold text-slate-900">Reset Password</h2>
                <p className="text-slate-500 mt-2">Enter your email to receive a reset link</p>
              </div>
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div>
                   <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Email Address</label>
                   <div className="relative">
                     <Mail className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                     <input 
                       type="email" 
                       required 
                       value={email}
                       onChange={e => setEmail(e.target.value)}
                       className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white" 
                       placeholder="Enter your registered email" 
                     />
                   </div>
                 </div>
                 <button 
                   type="submit" 
                   disabled={isLoginPending}
                   className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3.5 rounded-xl font-bold transition-all shadow-sm active:scale-[0.98] disabled:opacity-50"
                 >
                   {isLoginPending ? "Sending..." : "Send Reset Link"}
                 </button>
               </form>
            </div>
          )}

        </div>
      </div>

      {/* Footer Credit */}
      <div className="fixed bottom-4 left-0 w-full overflow-hidden z-20 pointer-events-none">
        <div className="animate-marquee-left whitespace-nowrap">
          <span className="inline-block font-semibold text-xs text-blue-700 bg-blue-100/80 px-3 py-1.5 rounded-md border border-blue-200 shadow-sm pointer-events-auto uppercase">
            DESIGNED AND PREPARED BY NITESH HORILAL YADAV
          </span>
        </div>
      </div>
    </div>
  );
}

// --- MOBILE NAVIGATION BAR FOR SMARTPHONES ---

function MobileNav({ 
  activeTab, 
  setActiveTab 
}: { 
  activeTab: 'dashboard' | 'bookings' | 'history' | 'support' | 'profile';
  setActiveTab: (tab: 'dashboard' | 'bookings' | 'history' | 'support' | 'profile') => void;
}) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Droplets },
    { id: 'bookings', label: 'Bookings', icon: Calendar },
    { id: 'history', label: 'History', icon: HistoryIcon },
    { id: 'support', label: 'Support', icon: HelpCircle },
    { id: 'profile', label: 'Profile', icon: User },
  ] as const;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 px-2 py-1.5 shadow-2xl flex justify-around items-center">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <motion.button
            key={tab.id}
            whileTap={{ scale: 0.82 }}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all cursor-pointer ${
              isActive ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="mobileNavActivePill"
                className="absolute inset-0 bg-blue-50 dark:bg-blue-900/30 rounded-2xl -z-10"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.8px]'}`} />
            <span className="text-[10px] mt-0.5 tracking-tight">{tab.label}</span>
          </motion.button>
        );
      })}
    </nav>
  );
}

// --- RESIDENT VIEW ---

function ResidentView({ bookings, onBook, complaints, onFileComplaint, onDeleteBooking, onDeleteAllHistory, userRole, userProfile }: { 
  bookings: Booking[], 
  onBook: (b: Booking) => void, 
  complaints: Complaint[], 
  onFileComplaint: (c: Complaint) => void,
  onDeleteBooking: (id: string) => void,
  onDeleteAllHistory: () => void,
  userRole: string,
  userProfile?: any
}) {
  const [showForm, setShowForm] = useState(false);
  const [formIsEmergency, setFormIsEmergency] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bookings' | 'history' | 'support' | 'profile'>(() => {
    return localStorage.getItem('residentActiveTab') as any || 'dashboard';
  });
  const [usageView, setUsageView] = useState<'weekly' | 'monthly'>('weekly');

  const portalName = userRole === 'society' ? 'Society Portal' : 'Resident Portal';
  const roleDescription = userRole === 'society' ? 'Manage your society\'s water supply.' : 'Quickly manage your water supply and requests.';

  useEffect(() => {
    localStorage.setItem('residentActiveTab', activeTab);
  }, [activeTab]);

  const activeBookings = bookings.filter(b => b.status !== 'Delivered');
  const pastBookings = bookings.filter(b => b.status === 'Delivered');

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      {/* Mobile Sticky Navigation Bar */}
      <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Tabs */}
      <div className="flex space-x-2 sm:space-x-4 border-b border-slate-200 dark:border-slate-800 mb-8 overflow-x-auto pb-2 no-scrollbar">
        <motion.button 
          whileTap={{ scale: 0.94 }}
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 sm:px-6 py-3 font-display font-bold text-xs sm:text-sm border-b-4 transition-all whitespace-nowrap rounded-t-xl cursor-pointer ${activeTab === 'dashboard' ? 'border-blue-600 text-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
        >
          My Dashboard
        </motion.button>
        <motion.button 
          whileTap={{ scale: 0.94 }}
          onClick={() => setActiveTab('bookings')}
          className={`px-4 sm:px-6 py-3 font-display font-bold text-xs sm:text-sm border-b-4 transition-all whitespace-nowrap rounded-t-xl cursor-pointer ${activeTab === 'bookings' ? 'border-blue-600 text-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
        >
          Active Bookings
        </motion.button>
        <motion.button 
          whileTap={{ scale: 0.94 }}
          onClick={() => setActiveTab('history')}
          className={`px-4 sm:px-6 py-3 font-display font-bold text-xs sm:text-sm border-b-4 transition-all whitespace-nowrap rounded-t-xl cursor-pointer ${activeTab === 'history' ? 'border-blue-600 text-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
        >
          Booking History
        </motion.button>
        <motion.button 
          whileTap={{ scale: 0.94 }}
          onClick={() => setActiveTab('support')}
          className={`px-4 sm:px-6 py-3 font-display font-bold text-xs sm:text-sm border-b-4 transition-all whitespace-nowrap rounded-t-xl cursor-pointer ${activeTab === 'support' ? 'border-blue-600 text-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
        >
          Help & Complaints
        </motion.button>
        <motion.button 
          whileTap={{ scale: 0.94 }}
          onClick={() => setActiveTab('profile')}
          className={`px-4 sm:px-6 py-3 font-display font-bold text-xs sm:text-sm border-b-4 transition-all whitespace-nowrap rounded-t-xl cursor-pointer ${activeTab === 'profile' ? 'border-blue-600 text-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
        >
          My Profile
        </motion.button>
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <h2 className="text-3xl font-display font-black text-slate-900 dark:text-white">{userRole === 'society' ? 'Society Dashboard' : 'Resident Dashboard'}</h2>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-slate-500 font-medium">{roleDescription}</p>
                {('Notification' in window && Notification.permission !== 'granted') && (
                  <button 
                    onClick={() => Notification.requestPermission().then(() => window.location.reload())}
                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-amber-100 text-amber-700 px-2 py-1 rounded-lg border border-amber-200 hover:bg-amber-200 transition-colors"
                  >
                    <Bell className="w-3 h-3" /> Enable Alerts
                  </button>
                )}
                {('Notification' in window && Notification.permission === 'granted') && (
                  <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg border border-emerald-200">
                    <Bell className="w-3 h-3" /> Alerts Active
                  </span>
                )}
              </div>
            </div>
            <button 
              onClick={() => {
                setFormIsEmergency(false);
                setActiveTab('bookings');
                setShowForm(true);
              }}
              className="vibrant-gradient text-white px-6 sm:px-8 py-3 sm:py-4 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-widest shadow-xl shadow-blue-200 dark:shadow-none hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <Droplets className="w-5 h-5" /> Book Tanker Now
            </button>
          </div>

          {/* Emergency & Quick Actions */}
          <div className="bg-gradient-to-r from-red-600 to-rose-600 p-6 rounded-3xl text-white shadow-xl shadow-red-200 dark:shadow-none flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-display font-black">Emergency Request</h3>
                <p className="text-red-100 text-sm font-medium">Need water within 2 hours? Use priority dispatch.</p>
                <p className="text-[10px] font-black uppercase tracking-widest mt-1 text-white/80 flex items-center gap-1.5 bg-white/10 w-fit px-2 py-0.5 rounded-md border border-white/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                  Extra Cost will be applied
                </p>
              </div>
            </div>
            <button 
              onClick={() => {
                setFormIsEmergency(true);
                setActiveTab('bookings');
                setShowForm(true);
              }}
              className="bg-white text-red-600 px-6 sm:px-8 py-3 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest hover:bg-red-50 transition-all shadow-lg active:scale-95 w-full md:w-auto"
            >
              Request Priority Dispatch
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-xl shadow-blue-100/50 dark:shadow-none border border-blue-50 dark:border-slate-700">
              <div className="bg-blue-100 dark:bg-blue-900/30 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Requests</p>
              <p className="text-3xl font-display font-black text-slate-900 dark:text-white">{activeBookings.length}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-xl shadow-emerald-100/50 dark:shadow-none border border-emerald-50 dark:border-slate-700">
              <div className="bg-emerald-100 dark:bg-emerald-900/30 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Delivered</p>
              <p className="text-3xl font-display font-black text-slate-900 dark:text-white">{pastBookings.length}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-xl shadow-amber-100/50 dark:shadow-none border border-amber-50 dark:border-slate-700">
              <div className="bg-amber-100 dark:bg-amber-900/30 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Open Issues</p>
              <p className="text-3xl font-display font-black text-slate-900 dark:text-white">{complaints.filter(c => c.status === 'Open').length}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Usage Analytics */}
              <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-50 dark:border-slate-700">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-display font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" /> Consumption Trends
                  </h3>
                  <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                    <button 
                      onClick={() => setUsageView('weekly')}
                      className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${usageView === 'weekly' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-400'}`}
                    >
                      Weekly
                    </button>
                    <button 
                      onClick={() => setUsageView('monthly')}
                      className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${usageView === 'monthly' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-400'}`}
                    >
                      Monthly
                    </button>
                  </div>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={(usageView === 'weekly' ? MOCK_USAGE_DATA : MOCK_MONTHLY_USAGE_DATA) as any}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey={usageView === 'weekly' ? 'day' : 'month'} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                      <Tooltip 
                        cursor={{fill: '#f8fafc', opacity: 0.4}}
                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                        formatter={(value: any) => [`${value}L`, 'Usage']}
                      />
                      <Bar dataKey="usage" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Water Quality Report */}
              <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-50 dark:border-slate-700">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-display font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-emerald-600" /> Water Quality Report
                  </h3>
                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-full uppercase tracking-widest">Certified Safe</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'TDS Level', value: '120 ppm', status: 'Excellent' },
                    { label: 'pH Level', value: '7.2', status: 'Neutral' },
                    { label: 'Chlorine', value: '0.2 mg/L', status: 'Safe' },
                    { label: 'Turbidity', value: '0.5 NTU', status: 'Clear' },
                  ].map((stat, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                      <p className="text-lg font-display font-black text-slate-900 dark:text-white">{stat.value}</p>
                      <p className="text-[10px] font-bold text-emerald-600 mt-1">{stat.status}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Area Fleet Tracking for Residents */}
              <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-50 dark:border-slate-700">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-xl font-display font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-blue-600" /> Live Tanker Fleet Tracking
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Explore active water tankers and municipal storage reservoirs across your sector</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-800">
                      <Radio className="w-3 h-3 text-blue-500 animate-pulse" /> Live Telemetry
                    </span>
                  </div>
                </div>
                <FleetTrackingMap heightClass="h-80 sm:h-96" />
              </div>
            </div>

            <div className="space-y-8">
              <CommunityPulse bookings={bookings} />
              
              <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-3xl text-white shadow-xl shadow-indigo-100 dark:shadow-none relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-white/20 transition-all"></div>
                <div className="relative z-10">
                  <div className="bg-white/20 w-10 h-10 rounded-xl flex items-center justify-center mb-4 backdrop-blur-md">
                    <Gift className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-display font-black mb-1">Refer a Neighbor</h3>
                  <p className="text-indigo-100 text-[11px] mb-4">Invite a friend and you both get <span className="font-black text-white underline">₹100 OFF</span>!</p>
                  
                  <button 
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: 'AquaLink Water Supply',
                          text: 'Get clean water delivered to your doorstep. Use my referral to get ₹100 off!',
                          url: window.location.href,
                        }).catch(() => {});
                      } else {
                        navigator.clipboard.writeText(window.location.href);
                        toast.success("Link copied!", { description: "Share it with your neighbors." });
                      }
                    }}
                    className="w-full py-2.5 bg-white text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-4 h-4" /> Invite Now
                  </button>
                </div>
              </div>

              <div className="bg-slate-900 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
                <h3 className="text-lg font-display font-black mb-2">Need Help?</h3>
                <p className="text-slate-400 text-xs mb-4">24/7 Support available.</p>
                <div className="flex flex-col gap-2">
                  <a href={`tel:${HELPLINE_NUMBER}`} className="bg-white text-slate-900 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2">
                    <Phone className="w-3.5 h-3.5" /> Call Support
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'bookings' && (
        <>
      {/* Hero / Action Section */}
      <div className="vibrant-gradient rounded-3xl p-8 sm:p-12 text-white shadow-2xl shadow-blue-200 relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-20 transform translate-x-1/4 -translate-y-1/4">
          <Droplets className="w-80 h-80" />
        </div>
        <div className="absolute bottom-0 left-0 opacity-10 transform -translate-x-1/4 translate-y-1/4">
          <Waves className="w-64 h-64" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-6 border border-white/30">
            <Activity className="w-3 h-3" /> Live in Mira-Bhayandar
          </div>
          <h2 className="text-4xl sm:text-5xl font-display font-extrabold mb-6 leading-tight">Need a water tanker?</h2>
          <p className="text-blue-50 text-xl mb-10 max-w-xl font-medium leading-relaxed">
            Book a tanker instantly, track its arrival in real-time, and ensure timely water delivery for your society or home.
          </p>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="bg-white text-blue-600 hover:scale-105 active:scale-95 px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-blue-900/20 flex items-center gap-3"
          >
            {showForm ? 'Cancel Booking' : 'Book Tanker Now'}
            {!showForm && <ChevronRight className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 sm:relative sm:z-auto bg-slate-900/60 sm:bg-transparent backdrop-blur-sm sm:backdrop-blur-none flex items-end sm:block p-0 sm:p-0 my-0 sm:my-6 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowForm(false);
            }}
          >
            <motion.div 
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="w-full bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 max-h-[88vh] sm:max-h-none overflow-y-auto"
            >
              {/* Mobile Drag Indicator */}
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4 sm:hidden"></div>
              
              <button 
                onClick={() => setShowForm(false)}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors text-sm font-medium mb-6"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Dashboard
              </button>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                New Booking Request
              </h3>
              <BookingForm 
                initialEmergency={formIsEmergency}
                userProfile={userProfile}
                onSubmit={(b) => { 
                  onBook(b); 
                  setShowForm(false); 
                  toast.success("Order Placed Successfully", {
                    description: b.priority ? "Priority dispatch activated. ETA reduced by 50%." : "Your request is being processed.",
                    icon: b.priority ? <Zap className="w-4 h-4 text-red-500" /> : <Check className="w-4 h-4 text-emerald-500" />
                  });
                }} 
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Tracking Section */}
      {activeBookings.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Navigation className="w-5 h-5 text-blue-600" />
            Active Tracking
          </h3>
          <div className="grid gap-6 md:grid-cols-2">
            {activeBookings.map(booking => (
              <TrackingCard 
                key={booking.id} 
                booking={booking} 
                onRate={() => setActiveTab('support')}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center mt-6">
          <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No active bookings right now.</p>
        </div>
      )}
        </>
      )}

      {activeTab === 'profile' && (
        <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-4 border-4 border-blue-50 dark:border-slate-700 shadow-lg">
                NY
              </div>
              <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white">Nilesh Yadav</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium">nileshyadav.2081@gmail.com</p>
              <div className="mt-4 px-4 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-widest rounded-full border border-blue-100 dark:border-blue-800">
                Verified Resident
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone Number</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">+91 98765 43210</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Language</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">English / Hindi / Marathi</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aadhaar Verified</p>
                  <p className="text-sm font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Yes
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Member Since</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">January 2024</p>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Default Address</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">B-402, Shanti Nagar, Mira Road East, Thane - 401107</p>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-slate-700">
                <button className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3 rounded-xl font-bold hover:opacity-90 transition-all active:scale-95">
                  Edit Profile Details
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700">
            <h4 className="text-lg font-display font-black text-slate-900 dark:text-white mb-6">Security & Preferences</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                    <Bell className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Push Notifications</span>
                </div>
                <div className="w-10 h-5 bg-blue-600 rounded-full relative">
                  <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-lg">
                    <Lock className="w-4 h-4 text-indigo-600" />
                  </div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Two-Factor Auth</span>
                </div>
                <div className="w-10 h-5 bg-slate-200 dark:bg-slate-700 rounded-full relative">
                  <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-display font-black text-slate-900">Booking History</h3>
            {pastBookings.length > 0 && (
              <button 
                onClick={onDeleteAllHistory}
                className="text-xs font-black uppercase tracking-widest text-red-600 hover:text-red-700 flex items-center gap-2 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl transition-all"
              >
                <X className="w-4 h-4" /> Clear All History
              </button>
            )}
          </div>
          {pastBookings.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-100 p-12 text-center border border-slate-50">
              <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-10 h-10 text-slate-300" />
              </div>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">No past deliveries found.</p>
              <button 
                onClick={() => setActiveTab('bookings')}
                className="mt-6 text-blue-600 font-black text-xs uppercase tracking-widest border-b-2 border-blue-600 pb-1"
              >
                Make your first booking
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-100/50 border border-slate-50 overflow-hidden">
              <div className="divide-y divide-slate-100">
                {pastBookings.map(booking => (
                  <div key={booking.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:bg-slate-50 transition-colors group">
                    <div className="flex items-start gap-5">
                      <div className="bg-emerald-50 p-4 rounded-2xl mt-1 sm:mt-0 transition-transform group-hover:scale-110">
                        <CheckCircle className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-black text-slate-900">{booking.requestedDate}</p>
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-full">
                            {booking.status}
                          </span>
                        </div>
                        {booking.deliveredAt && (
                          <p className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded w-fit border border-emerald-100 mt-1">
                            Delivered at: {new Date(booking.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-tight mt-1">Booking ID: <span className="font-mono text-slate-900">{booking.id}</span></p>
                        <div className="flex flex-wrap gap-4 pt-2">
                          <span className="flex items-center gap-1.5 text-xs text-slate-600">
                            <span className="font-extrabold text-slate-500 uppercase tracking-widest text-[9px]">Ordered:</span>
                            <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{new Date(booking.createdAt).toISOString().split('T')[0]}</span>
                          </span>
                          <span className="flex items-center gap-1.5 text-xs text-slate-600">
                            <span className="font-extrabold text-slate-500 uppercase tracking-widest text-[9px]">Delivered:</span>
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-250">{booking.requestedDate}</span>
                          </span>
                          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600"><Waves className="w-4 h-4 text-blue-500" /> {booking.volume}</span>
                          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600"><Clock className="w-4 h-4 text-amber-500" /> Requested Slot: {booking.requestedTime}</span>
                          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600"><CreditCard className="w-4 h-4 text-indigo-500" /> {booking.paymentMethod} • {booking.paymentStatus === 'Paid' ? 'Verified' : 'Pending'}</span>
                          {booking.driverName && (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600"><Truck className="w-4 h-4 text-emerald-500" /> Delivered by {booking.driverName}</span>
                          )}
                          {booking.tankerId && (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600"><Activity className="w-4 h-4 text-indigo-500" /> Vehicle: {booking.tankerId}</span>
                          )}
                          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600 w-full"><MapPin className="w-4 h-4 text-rose-500" /> <span className="line-clamp-1">{booking.address}</span></span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => {
                          setActiveTab('bookings');
                          setShowForm(true);
                        }}
                        className="flex-1 sm:flex-none text-blue-600 hover:text-white font-black text-[10px] uppercase tracking-widest bg-blue-50 hover:bg-blue-600 px-6 py-3 rounded-xl transition-all shadow-sm"
                      >
                        Rebook
                      </button>
                      <button 
                        onClick={() => onDeleteBooking(booking.id)}
                        className="p-3 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-xl transition-all border border-slate-100"
                        title="Delete from history"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'support' && (
        <SupportView complaints={complaints} onFileComplaint={onFileComplaint} />
      )}
    </div>
  );
}

function SupportView({ complaints, onFileComplaint }: { complaints: Complaint[], onFileComplaint: (c: Complaint) => void }) {
  const [activeSupportTab, setActiveSupportTab] = useState<'complaints' | 'suggestions' | 'reviews'>('complaints');
  const [showComplaintForm, setShowComplaintForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', issueType: 'Delay in Delivery', description: '' });

  const [suggestionText, setSuggestionText] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState(5);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFileComplaint({
      id: `CMP-${Math.floor(1000 + Math.random() * 9000)}`,
      residentName: formData.name,
      phone: formData.phone,
      issueType: formData.issueType,
      description: formData.description,
      status: 'Open',
      createdAt: Date.now(),
      userId: '' // Set by handler
    });
    setShowComplaintForm(false);
    setFormData({ name: '', phone: '', issueType: 'Delay in Delivery', description: '' });
  };

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveSupportTab('complaints')}
            className={`flex-1 min-w-[120px] py-4 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${activeSupportTab === 'complaints' ? 'bg-white dark:bg-slate-800 text-blue-600 border-b-2 border-blue-600' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'}`}
          >
            <AlertCircle className="w-4 h-4" /> Complaints
          </button>
          <button 
            onClick={() => setActiveSupportTab('suggestions')}
            className={`flex-1 min-w-[120px] py-4 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${activeSupportTab === 'suggestions' ? 'bg-white dark:bg-slate-800 text-blue-600 border-b-2 border-blue-600' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'}`}
          >
            <Lightbulb className="w-4 h-4" /> Suggestions
          </button>
          <button 
            onClick={() => setActiveSupportTab('reviews')}
            className={`flex-1 min-w-[120px] py-4 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${activeSupportTab === 'reviews' ? 'bg-white dark:bg-slate-800 text-blue-600 border-b-2 border-blue-600' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'}`}
          >
            <Star className="w-4 h-4" /> Reviews
          </button>
        </div>

        <div className="p-6 sm:p-8">
          {activeSupportTab === 'complaints' && (
            <>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Help & Support</h3>
                  <p className="text-slate-500 text-sm">File a complaint or view your previous support tickets.</p>
                </div>
                <button 
                  onClick={() => setShowComplaintForm(!showComplaintForm)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  {showComplaintForm ? 'Cancel' : 'File a Complaint'}
                </button>
              </div>

              {showComplaintForm && (
                <div className="mb-8 bg-slate-50 p-6 rounded-xl border border-slate-200 animate-in slide-in-from-top-2">
                  <button 
                    onClick={() => setShowComplaintForm(false)}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium mb-6"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Support
                  </button>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Name</label>
                        <input required type="text" className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Phone</label>
                        <input required type="tel" minLength={10} maxLength={10} pattern="[0-9]{10}" title="Please enter exactly 10 digits" className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})} />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium text-slate-700">Issue Type</label>
                        <select className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.issueType} onChange={e => setFormData({...formData, issueType: e.target.value})}>
                          <option>Delay in Delivery</option>
                          <option>Water Quality Issue</option>
                          <option>Driver Behavior</option>
                          <option>Other</option>
                        </select>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium text-slate-700">Description</label>
                        <textarea required rows={3} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">Submit Complaint</button>
                    </div>
                  </form>
                </div>
              )}

              <div className="space-y-4">
                <h4 className="font-bold text-slate-900">Your Complaints</h4>
                {complaints.length === 0 ? (
                  <p className="text-slate-500 text-sm">No complaints filed yet.</p>
                ) : (
                  <div className="space-y-3">
                    {complaints.map(c => (
                      <div key={c.id} className="p-4 border border-slate-200 rounded-xl bg-white">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-bold text-slate-900">{c.id}</span>
                            <span className="ml-2 text-sm text-slate-500">{c.issueType}</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.status === 'Open' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'}`}>
                            {c.status}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 mb-2">{c.description}</p>
                        {c.reply && (
                          <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <p className="text-xs font-bold text-slate-900 mb-1">Vendor Reply:</p>
                            <p className="text-sm text-slate-700">{c.reply}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeSupportTab === 'suggestions' && (
            <div className="space-y-6 animate-in fade-in">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Share a Suggestion</h3>
                <p className="text-slate-500 text-sm">Help us improve AquaLink by sharing your ideas.</p>
              </div>
              <div className="space-y-4">
                <textarea 
                  rows={4} 
                  placeholder="I think it would be great if..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  value={suggestionText}
                  onChange={e => setSuggestionText(e.target.value)}
                ></textarea>
                <button 
                  onClick={() => { alert('Suggestion submitted! Thank you.'); setSuggestionText(''); }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Submit Suggestion
                </button>
              </div>
            </div>
          )}

          {activeSupportTab === 'reviews' && (
            <div className="space-y-6 animate-in fade-in">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Rate Your Experience</h3>
                <p className="text-slate-500 text-sm">Let us know how we did on your recent deliveries.</p>
              </div>
              <div className="space-y-6">
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button key={star} onClick={() => setRating(star)}>
                      <Star className={`w-8 h-8 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                    </button>
                  ))}
                </div>
                <textarea 
                  rows={4} 
                  placeholder="Tell us about your experience..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  value={reviewText}
                  onChange={e => setReviewText(e.target.value)}
                ></textarea>
                <button 
                  onClick={() => { alert('Review submitted! Thank you.'); setReviewText(''); setRating(5); }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Submit Review
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CommunityPulse({ bookings }: { bookings: Booking[] }) {
  const recentBookings = [...bookings]
    .filter(b => b.status === 'Pending' || b.status === 'Confirmed' || b.status === 'En Route')
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 3);

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-50 dark:border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-display font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-600" /> Community Pulse
        </h3>
        <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-lg border border-blue-100 dark:border-blue-900/30">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div> Live
        </span>
      </div>
      
      <div className="space-y-4">
        {recentBookings.length > 0 ? (
          recentBookings.map((b, idx) => (
            <div key={idx} className="flex items-start gap-3 animate-in fade-in slide-in-from-right-2 duration-500" style={{ animationDelay: `${idx * 150}ms` }}>
              <div className="mt-1 w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-slate-400" />
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-bold text-slate-900 dark:text-white">A {b.userRole || 'resident'}</span> in Mira Road just booked a tanker.
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-4">
            <p className="text-xs text-slate-400">No recent activity. Be the first to book!</p>
          </div>
        )}
      </div>
      
      <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-700 flex items-center justify-between">
        <div className="flex -space-x-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
              <User className="w-3 h-3 text-slate-400" />
            </div>
          ))}
          <div className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 bg-blue-600 flex items-center justify-center text-[8px] font-black text-white">
            +12
          </div>
        </div>
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Users Nearby</p>
      </div>
    </div>
  );
}

function BookingForm({ onSubmit, initialEmergency = false, userProfile }: { onSubmit: (b: Booking) => void, initialEmergency?: boolean, userProfile?: any }) {
  const today = new Date();
  const maxDate = new Date();
  maxDate.setDate(today.getDate() + 7);
  
  const formatDateLocal = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = formatDateLocal(today);
  const maxDateStr = formatDateLocal(maxDate);

  const [step, setStep] = useState<'details' | 'payment'>('details');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'cash'>('upi');
  const [isProcessing, setIsProcessing] = useState(false);

  const [isEmergency, setIsEmergency] = useState(initialEmergency);

  const getTodayTimeSlot = () => {
    const now = new Date();
    const start = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    
    const formatTime = (d: Date) => {
      let hours = d.getHours();
      let minutes = d.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const mins = minutes < 10 ? '0' + minutes : minutes;
      return `${hours}:${mins} ${ampm}`;
    };
    return `Instant Order (Min. 2 Hours - ETA: ${formatTime(start)})`;
  };

  const standardSlots = ['Morning (8-12)', 'Afternoon (12-4)', 'Evening (4-8)', 'Night (8-12)'];

  const [formData, setFormData] = useState({
    name: userProfile?.name || '',
    phone: userProfile?.phone || '',
    address: userProfile?.address || '',
    volume: '1000L',
    date: todayStr,
    time: getTodayTimeSlot()
  });

  useEffect(() => {
    if (userProfile) {
      setFormData(prev => ({
        ...prev,
        name: userProfile.name || prev.name,
        phone: userProfile.phone || prev.phone,
        address: userProfile.address || prev.address
      }));
    }
  }, [userProfile]);

  useEffect(() => {
    if (formData.date === todayStr) {
      setFormData(prev => ({ ...prev, time: getTodayTimeSlot() }));
    } else {
      if (!standardSlots.includes(formData.time)) {
        setFormData(prev => ({ ...prev, time: standardSlots[0] }));
      }
    }
  }, [formData.date]);

  const getPrice = () => {
    let basePrice = 500;
    switch(formData.volume) {
      case '1000L': basePrice = 500; break;
      case '2000L': basePrice = 900; break;
      case '5000L': basePrice = 2000; break;
      case '10000L': basePrice = 3800; break;
    }
    const surcharge = isEmergency ? Math.round(basePrice * 0.25) : 0;
    return { base: basePrice, surcharge, total: basePrice + surcharge };
  };

  const pricing = getPrice();

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('payment');
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    
    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);
      onSubmit({
        id: `BKG-${Math.floor(1000 + Math.random() * 9000)}`,
        userId: '', // Will be set by handleBookTanker
        residentName: formData.name,
        phone: formData.phone,
        address: formData.address,
        volume: formData.volume,
        status: 'Pending',
        priority: isEmergency,
        requestedDate: formData.date,
        requestedTime: formData.time,
        createdAt: Date.now(),
        paymentStatus: paymentMethod === 'cash' ? 'Pending' : 'Paid',
        paymentMethod: (paymentMethod === 'upi' ? 'UPI' : paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)) as any
      });
    }, 1500);
  };

  if (step === 'payment') {
    return (
      <div className="space-y-6 animate-in slide-in-from-right-4">
        <button 
          type="button" 
          onClick={() => setStep('details')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Details
        </button>
        
        <div>
          <h3 className="text-xl font-bold text-slate-900">Complete Payment</h3>
          <p className="text-slate-500 text-sm mt-1">Select a payment method to confirm your booking.</p>
        </div>

        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-xs text-blue-600 font-black uppercase tracking-widest">Order Summary</p>
              <h4 className="text-sm font-bold text-slate-900 mt-1">{formData.volume} Water Tanker</h4>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 font-bold uppercase">{formData.date}</p>
            </div>
          </div>
          
          <div className="space-y-2 border-t border-blue-100 pt-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Base Fare</span>
              <span className="font-bold text-slate-900">₹{pricing.base}</span>
            </div>
            {isEmergency && (
              <div className="flex justify-between text-sm">
                <span className="text-red-600 font-medium flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 fill-red-600" /> Priority Dispatch Surcharge (25%)
                </span>
                <span className="font-bold text-red-600">+₹{pricing.surcharge}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-blue-200">
              <span className="font-black text-blue-900 uppercase tracking-tighter">Total Payable</span>
              <span className="text-xl font-black text-blue-600">₹{pricing.total}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handlePaymentSubmit} className="space-y-5">
          <div className="space-y-3">
            <label className="flex items-center p-4 border rounded-xl cursor-pointer transition-colors hover:bg-slate-50 relative">
              <input type="radio" name="payment" value="upi" checked={paymentMethod === 'upi'} onChange={() => setPaymentMethod('upi')} className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500" />
              <div className="ml-3 flex items-center gap-3">
                <div className="bg-emerald-100 p-2 rounded-lg text-emerald-700">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">UPI (GPay, PhonePe, Paytm)</p>
                  <p className="text-xs text-slate-500">Instant payment</p>
                </div>
              </div>
            </label>

            <label className="flex items-center p-4 border rounded-xl cursor-pointer transition-colors hover:bg-slate-50 relative">
              <input type="radio" name="payment" value="card" checked={paymentMethod === 'card'} onChange={() => setPaymentMethod('card')} className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500" />
              <div className="ml-3 flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-lg text-indigo-700">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">Credit / Debit Card</p>
                  <p className="text-xs text-slate-500">Visa, Mastercard, RuPay</p>
                </div>
              </div>
            </label>

            <label className="flex items-center p-4 border rounded-xl cursor-pointer transition-colors hover:bg-slate-50 relative">
              <input type="radio" name="payment" value="cash" checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500" />
              <div className="ml-3 flex items-center gap-3">
                <div className="bg-amber-100 p-2 rounded-lg text-amber-700">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">Cash on Delivery</p>
                  <p className="text-xs text-slate-500">Pay when the tanker arrives</p>
                </div>
              </div>
            </label>
          </div>

          <button 
            type="submit"
            disabled={isProcessing}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl font-semibold transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Processing Payment...
              </>
            ) : (
              <>
                {paymentMethod === 'cash' ? 'Confirm Booking' : `Pay ₹${pricing.total}`}
              </>
            )}
          </button>
        </form>
      </div>
    );
  }

  return (
    <form onSubmit={handleDetailsSubmit} className="space-y-6 animate-in fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Full Name</label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
            <input 
              required
              type="text" 
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="e.g. Rahul Sharma"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Phone Number</label>
          <div className="relative">
            <Phone className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
            <input 
              required
              type="tel" 
              minLength={10}
              maxLength={10}
              pattern="[0-9]{10}"
              title="Please enter exactly 10 digits"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="9876543210"
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})}
            />
          </div>
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-slate-700">Delivery Address</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
            <input 
              required
              type="text" 
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="Building name, Sector, Landmark"
              value={formData.address}
              onChange={e => setFormData({...formData, address: e.target.value})}
            />
          </div>
        </div>

        <div className="space-y-2 md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex flex-col">
              <label className="text-sm font-medium text-slate-700">Tanker Capacity</label>
              {isEmergency && (
                <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mt-0.5 flex items-center gap-1.5 animate-pulse">
                   <AlertCircle className="w-3 h-3" /> Extra cost will be applied
                </p>
              )}
            </div>
            <button 
              type="button"
              onClick={() => setIsEmergency(!isEmergency)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${isEmergency ? 'bg-red-600 text-white shadow-lg shadow-red-200 ring-2 ring-red-100' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}
            >
              <Zap className={`w-3.5 h-3.5 ${isEmergency ? 'animate-pulse' : ''}`} />
              {isEmergency ? 'Priority Express Active' : 'Activate Priority Dispatch'}
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {['1000L', '2000L', '5000L', '10000L'].map(vol => (
              <button
                key={vol}
                type="button"
                onClick={() => setFormData({...formData, volume: vol})}
                className={`p-3 rounded-xl border text-left transition-all ${
                  formData.volume === vol 
                    ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' 
                    : 'border-slate-200 hover:border-blue-300 bg-white'
                }`}
              >
                <div className="font-bold text-slate-900">{vol}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {vol === '1000L' ? 'Small' : vol === '2000L' ? 'Medium' : vol === '5000L' ? 'Large' : 'Extra Large'}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Preferred Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
            <input 
              required
              type="date" 
              min={todayStr}
              max={maxDateStr}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              value={formData.date}
              onChange={e => setFormData({...formData, date: e.target.value})}
            />
          </div>
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-slate-700">Preferred Time Slot</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {formData.date === todayStr ? (
              <button
                type="button"
                className="col-span-2 sm:col-span-4 py-3 px-4 rounded-xl text-sm font-bold border border-blue-600 bg-blue-50 text-blue-700 text-left flex items-center gap-2"
              >
                <Clock className="w-5 h-5" />
                {getTodayTimeSlot()}
              </button>
            ) : (
              standardSlots.map(slot => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setFormData({...formData, time: slot})}
                  className={`py-2 px-3 rounded-xl text-sm font-medium border transition-all ${
                    formData.time === slot 
                      ? 'bg-blue-50 border-blue-600 text-blue-700' 
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {slot}
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">Estimated Total:</span>
          <span className="text-2xl font-black text-blue-600 tracking-tighter">₹{pricing.total}</span>
          {isEmergency && <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-1 rounded-md uppercase tracking-widest border border-red-100 animate-pulse">Priority Activated</span>}
        </div>
        <button 
          type="submit"
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-200 hover:shadow-blue-300 flex items-center justify-center gap-2 active:scale-95"
        >
          Continue to Payment
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </form>
  );
}

function TrackingCard({ booking, onRate }: { booking: Booking; onRate?: () => void }) {
  const currentStepIndex = STATUS_STEPS.indexOf(booking.status);

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col transition-all hover:shadow-2xl hover:shadow-blue-100/50">
      <div className="p-6 border-b border-slate-50 flex justify-between items-start bg-gradient-to-r from-slate-50 to-white relative overflow-hidden">
        {booking.priority && (
          <div className="absolute top-0 right-0 bg-red-600 text-white px-4 py-1 rounded-bl-2xl text-[8px] font-black uppercase tracking-widest flex items-center gap-1 shadow-lg z-10 animate-pulse">
            <Zap className="w-2.5 h-2.5 fill-white" /> Priority
          </div>
        )}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold text-slate-900 tracking-tight">{booking.id}</span>
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${STATUS_COLORS[booking.status]}`}>
              {booking.status}
            </span>
          </div>
          <div className="mt-1.5 space-y-1">
            <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Ordered:</span>
              <span className="text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{new Date(booking.createdAt).toISOString().split('T')[0]}</span>
            </p>
                      <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Established Delivery:</span>
              <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 font-bold">{booking.requestedDate}</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-600 font-medium">{booking.requestedTime}</span>
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-display font-extrabold text-blue-600 leading-none">{booking.volume}</div>
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Capacity</div>
        </div>
      </div>

      <div className="p-6 flex-1">
        {/* Progress Stepper */}
        <div className="relative mb-10 mt-2">
          <div className="absolute top-1/2 left-0 w-full h-1.5 bg-slate-100 -translate-y-1/2 rounded-full"></div>
          <div 
            className="absolute top-1/2 left-0 h-1.5 vibrant-gradient -translate-y-1/2 rounded-full transition-all duration-700 ease-out shadow-sm"
            style={{ width: `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%` }}
          ></div>
          
          <div className="relative flex justify-between">
            {STATUS_STEPS.map((step, index) => {
              const isCompleted = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;
              return (
                <div key={step} className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-4 z-10 bg-white transition-all duration-500 ${
                    isCompleted ? 'border-blue-600 scale-110 shadow-lg shadow-blue-100' : 'border-slate-100'
                  }`}>
                    {isCompleted ? (
                      <Check className={`w-4 h-4 ${isCurrent ? 'text-blue-600 animate-pulse' : 'text-blue-600'}`} />
                    ) : (
                      <div className="w-2 h-2 bg-slate-200 rounded-full"></div>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider mt-3 absolute top-8 whitespace-nowrap transition-colors duration-500 ${
                    isCurrent ? 'text-blue-700' : isCompleted ? 'text-slate-600' : 'text-slate-300'
                  }`}>
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Status Info */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 mt-10 flex items-start gap-4 border border-blue-100/50 shadow-inner">
          {booking.status === 'Pending' && (
            <>
              <div className="bg-white p-2 rounded-xl shadow-sm">
                <Clock className="w-6 h-6 text-amber-500 animate-spin-slow" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Finding a tanker...</p>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">We are assigning the nearest available water tanker to your request.</p>
              </div>
            </>
          )}
          {booking.status === 'Confirmed' && (
            <>
              <div className="bg-white p-2 rounded-xl shadow-sm">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-900">Tanker Assigned: {booking.tankerId}</p>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">Estimated time to dispatch: <span className="font-bold text-blue-600">{booking.eta}</span></p>
                {booking.driverPhone && (
                  <div className="mt-3 pt-3 border-t border-blue-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-xs font-bold text-slate-700">{booking.driverPhone}</span>
                    </div>
                    <a href={`tel:${booking.driverPhone}`} className="text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white px-3 py-1.5 rounded-lg shadow-md shadow-blue-200 hover:bg-blue-700 transition-colors">
                      Call Driver
                    </a>
                  </div>
                )}
              </div>
            </>
          )}
          {booking.status === 'En Route' && (
            <>
              <div className="bg-white p-2 rounded-xl shadow-sm">
                <Navigation className="w-6 h-6 text-indigo-600 animate-pulse" />
              </div>
              <div className="w-full">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm font-bold text-slate-900">Tanker is on the way!</p>
                  <span className="text-sm font-black text-indigo-600 bg-white px-2 py-0.5 rounded-lg shadow-sm">{booking.eta}</span>
                </div>
                <p className="text-xs text-slate-600 mb-4">Vehicle <span className="font-bold">{booking.tankerId}</span> is approaching your location.</p>
                
                {booking.driverPhone && (
                  <div className="mb-4 p-3 bg-white/50 rounded-xl border border-indigo-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="bg-indigo-100 p-1.5 rounded-lg">
                        <User className="w-3.5 h-3.5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Driver Contact</p>
                        <p className="text-xs font-bold text-slate-900">{booking.driverPhone}</p>
                      </div>
                    </div>
                    <a href={`tel:${booking.driverPhone}`} className="bg-indigo-600 text-white p-2 rounded-lg shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors">
                      <Phone className="w-4 h-4" />
                    </a>
                  </div>
                )}
                
                {/* Real-time Map with Leaflet */}
                <div className="w-full my-3">
                  <ResidentTrackingMap
                    tankerId={booking.tankerId}
                    driverName={booking.driverName}
                    driverPhone={booking.driverPhone}
                    destinationAddress={booking.address}
                    initialEta={booking.eta}
                    heightClass="h-56"
                  />
                </div>

                <div className="mt-4">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`Track my AquaLink tanker ${booking.tankerId} at: ${window.location.href}`);
                      toast.success("Tracking link copied to clipboard!");
                    }}
                    className="w-full flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-wider bg-white border border-indigo-200 text-indigo-600 px-3 py-2.5 rounded-xl hover:bg-indigo-50 transition-all shadow-sm active:scale-95"
                  >
                    <Share2 className="w-3.5 h-3.5" /> Share Live Tracking
                  </button>
                </div>
              </div>
            </>
          )}
          {booking.status === 'Delivered' && (
            <>
              <div className="bg-white p-2 rounded-xl shadow-sm">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-900">Delivery Successful!</p>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">Your water was delivered on <span className="font-bold">{booking.requestedDate}</span>. Thank you for choosing AquaLink!</p>
                <div className="mt-4 flex gap-2">
                  <button 
                    onClick={onRate}
                    className="flex-1 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-wider bg-white border border-slate-200 text-slate-700 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                  >
                    <Star className="w-3.5 h-3.5 text-amber-500" /> Rate Delivery
                  </button>
                  <button 
                    onClick={() => toast.info("Invoice downloading...")}
                    className="flex-1 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-wider bg-white border border-slate-200 text-slate-700 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-500" /> Invoice
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


// --- VENDOR VIEW ---

import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
  BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';

const CHART_DATA_WEEKLY = [
  { name: 'Mon', deliveries: 12, requests: 15 },
  { name: 'Tue', deliveries: 19, requests: 22 },
  { name: 'Wed', deliveries: 15, requests: 18 },
  { name: 'Thu', deliveries: 22, requests: 25 },
  { name: 'Fri', deliveries: 30, requests: 35 },
  { name: 'Sat', deliveries: 25, requests: 28 },
  { name: 'Sun', deliveries: 18, requests: 20 },
];

const CHART_DATA_MONTHLY = [
  { name: 'Jan', deliveries: 450, requests: 500 },
  { name: 'Feb', deliveries: 420, requests: 480 },
  { name: 'Mar', deliveries: 550, requests: 610 },
  { name: 'Apr', deliveries: 600, requests: 680 },
  { name: 'May', deliveries: 720, requests: 800 },
  { name: 'Jun', deliveries: 580, requests: 640 },
  { name: 'Jul', deliveries: 490, requests: 550 },
  { name: 'Aug', deliveries: 450, requests: 510 },
  { name: 'Sep', deliveries: 520, requests: 590 },
  { name: 'Oct', deliveries: 610, requests: 700 },
  { name: 'Nov', deliveries: 650, requests: 730 },
  { name: 'Dec', deliveries: 700, requests: 790 },
];

function SystemHealth() {
  return (
    <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-50">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-display font-black text-slate-900 flex items-center gap-2">
          <Server className="w-5 h-5 text-blue-600" /> System Infrastructure
        </h3>
        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest">All Systems Operational</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <Cpu className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">CPU Load</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600 w-[24%] rounded-full"></div>
          </div>
          <p className="text-right text-[10px] font-black text-indigo-600 mt-2">24% Utilization</p>
        </div>
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <HardDrive className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Storage</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 w-[68%] rounded-full"></div>
          </div>
          <p className="text-right text-[10px] font-black text-blue-600 mt-2">68% Capacity (1.2TB Free)</p>
        </div>
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <Activity className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Network Latency</span>
          </div>
          <div className="flex items-end gap-1 h-8">
            {[40, 35, 45, 30, 50, 40, 35, 45, 30, 50].map((h, i) => (
              <div key={i} className="flex-1 bg-emerald-200 rounded-t-sm" style={{ height: `${h}%` }}></div>
            ))}
          </div>
          <p className="text-right text-[10px] font-black text-emerald-600 mt-2">12ms Response Time</p>
        </div>
      </div>
    </div>
  );
}

function UserManagementView() {
  const [users, setUsers] = useState([
    { id: 'USR-101', name: 'Amit Patel', role: 'Resident', status: 'Active', joined: '2024-01-15' },
    { id: 'USR-102', name: 'Suresh Kumar', role: 'Driver', status: 'Active', joined: '2024-02-10' },
    { id: 'USR-103', name: 'Meera Deshmukh', role: 'Resident', status: 'Inactive', joined: '2024-03-05' },
    { id: 'USR-104', name: 'Vijay Singh', role: 'Driver', status: 'Active', joined: '2024-03-20' },
    { id: 'USR-105', name: 'Rahul Sharma', role: 'Resident', status: 'Active', joined: '2024-04-01' },
    { id: 'USR-106', name: 'Priya Patel', role: 'Resident', status: 'Active', joined: '2024-04-05' },
    { id: 'USR-107', name: 'Vikram Singh', role: 'Resident', status: 'Active', joined: '2024-04-10' },
    { id: 'USR-108', name: 'Neha Gupta', role: 'Resident', status: 'Active', joined: '2024-04-12' },
    { id: 'USR-109', name: 'Rajesh Yadav', role: 'Driver', status: 'Active', joined: '2024-04-14' },
    { id: 'USR-110', name: 'Sneha Desai', role: 'Resident', status: 'Active', joined: '2024-04-14' }
  ]);

  const toggleUserStatus = (id: string) => {
    setUsers(users.map(u => {
      if (u.id === id) {
        const newStatus = u.status === 'Active' ? 'Inactive' : 'Active';
        toast.info(`User ${id} is now ${newStatus}`);
        return { ...u, status: newStatus };
      }
      return u;
    }));
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
              <th className="p-4 font-bold">User ID</th>
              <th className="p-4 font-bold">Name</th>
              <th className="p-4 font-bold">Role</th>
              <th className="p-4 font-bold">Status</th>
              <th className="p-4 font-bold">Joined Date</th>
              <th className="p-4 font-bold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-slate-50/50 transition-colors text-sm">
                <td className="p-4 font-mono font-bold text-slate-900">{user.id}</td>
                <td className="p-4 font-bold text-slate-900">{user.name}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${user.role === 'Resident' ? 'bg-purple-50 text-purple-700 border border-purple-100' : 'bg-orange-50 text-orange-700 border border-orange-100'}`}>
                    {user.role}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${user.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {user.status}
                  </span>
                </td>
                <td className="p-4 text-slate-500">{user.joined}</td>
                <td className="p-4 text-right">
                  <button 
                    onClick={() => toggleUserStatus(user.id)}
                    className="text-blue-600 hover:text-blue-700 font-bold text-xs uppercase tracking-widest"
                  >
                    {user.status === 'Active' ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AnalyticsDashboard({ bookings, complaints }: { bookings: Booking[], complaints: Complaint[] }) {
  // 1. Tanker Utilization
  const tankerDataMap: Record<string, number> = {};
  bookings.forEach(b => {
    if (b.tankerId) {
      tankerDataMap[b.tankerId] = (tankerDataMap[b.tankerId] || 0) + 1;
    }
  });
  const tankerUtilizationData = Object.entries(tankerDataMap).map(([name, count]) => ({ name, count }));

  // 2. Peak Booking Times (Group by Hour)
  const hourDataMap: Record<number, number> = {};
  for (let i = 0; i < 24; i++) hourDataMap[i] = 0;
  bookings.forEach(b => {
    const hour = new Date(b.createdAt).getHours();
    hourDataMap[hour]++;
  });
  const peakTimesData = Object.entries(hourDataMap).map(([hour, count]) => ({ 
    time: `${hour}:00`, 
    count 
  }));

  // 3. Common Complaint Types
  const complaintTypeMap: Record<string, number> = {};
  complaints.forEach(c => {
    complaintTypeMap[c.issueType] = (complaintTypeMap[c.issueType] || 0) + 1;
  });
  const complaintData = Object.entries(complaintTypeMap).map(([name, value]) => ({ name, value }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Tanker Utilization */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Truck className="w-4 h-4 text-blue-500" /> Tanker Utilization
          </h3>
          <span className="text-xs text-slate-400 font-medium">Total Deliveries</span>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tankerUtilizationData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                cursor={{ fill: '#f8fafc' }}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Peak Booking Times */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" /> Peak Booking Times
          </h3>
          <span className="text-xs text-slate-400 font-medium">24h Distribution</span>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={peakTimesData}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} interval={3} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Area type="monotone" dataKey="count" stroke="#f59e0b" fillOpacity={1} fill="url(#colorCount)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Common Complaint Types */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500" /> Common Complaint Types
          </h3>
          <span className="text-xs text-slate-400 font-medium">Issue Distribution</span>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="h-[300px] w-full md:w-1/2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={complaintData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {complaintData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="middle" align="right" layout="vertical" />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full md:w-1/2 space-y-4">
            <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Top Issues</h4>
            {complaintData.sort((a, b) => b.value - a.value).slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <span className="text-sm font-medium text-slate-600">{item.name}</span>
                <span className="text-sm font-bold text-slate-900">{item.value} Reports</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MasterRecordsView({ bookings, complaints }: { bookings: Booking[], complaints: Complaint[] }) {
  const [activeSubTab, setActiveSubTab] = useState<'activity' | 'users' | 'analytics'>('activity');
  const [searchTerm, setSearchTerm] = useState('');
  const [recordType, setRecordType] = useState<'all' | 'bookings' | 'complaints'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'createdAt', direction: 'desc' });

  const uniqueVehicles = Array.from(new Set(bookings.map(b => b.tankerId).filter(Boolean)));

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />;
  };

  const filteredRecords = [
    ...bookings.map(b => ({ ...b, type: 'Booking' as const })),
    ...complaints.map(c => ({ ...c, type: 'Complaint' as const }))
  ].filter(r => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      r.id.toLowerCase().includes(searchLower) || 
      r.residentName.toLowerCase().includes(searchLower) ||
      (r.type === 'Booking' && (
        (r as Booking).driverName?.toLowerCase().includes(searchLower) ||
        (r as Booking).tankerId?.toLowerCase().includes(searchLower) ||
        (r as Booking).userId.toLowerCase().includes(searchLower)
      ))
    );
    const matchesType = recordType === 'all' || r.type.toLowerCase() === recordType;
    
    const recordDate = new Date(r.createdAt);
    const matchesStartDate = !startDate || recordDate >= new Date(startDate);
    const matchesEndDate = !endDate || recordDate <= new Date(new Date(endDate).setHours(23, 59, 59, 999));
    
    const matchesVehicle = vehicleFilter === 'all' || (r.type === 'Booking' && (r as Booking).tankerId === vehicleFilter);

    return matchesSearch && matchesType && matchesStartDate && matchesEndDate && matchesVehicle;
  }).sort((a, b) => {
    let aValue: any = a[sortConfig.key as keyof typeof a];
    let bValue: any = b[sortConfig.key as keyof typeof b];

    if (sortConfig.key === 'driver') {
      aValue = (a as any).driverName || '';
      bValue = (b as any).driverName || '';
    } else if (sortConfig.key === 'vehicle') {
      aValue = (a as any).tankerId || '';
      bValue = (b as any).tankerId || '';
    }

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Master Activity Database</h2>
          <p className="text-slate-500 text-sm">Comprehensive logs of all platform activities and user interactions.</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
            <Download className="w-4 h-4 text-slate-500" /> Export CSV
          </button>
        </div>
      </div>

      <div className="flex gap-4 border-b border-slate-200">
        <button 
          onClick={() => setActiveSubTab('activity')}
          className={`pb-2 text-sm font-bold transition-all ${activeSubTab === 'activity' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Activity Logs
        </button>
        <button 
          onClick={() => setActiveSubTab('users')}
          className={`pb-2 text-sm font-bold transition-all ${activeSubTab === 'users' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          User Management
        </button>
        <button 
          onClick={() => setActiveSubTab('analytics')}
          className={`pb-2 text-sm font-bold transition-all ${activeSubTab === 'analytics' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Analytics
        </button>
      </div>

      {activeSubTab === 'analytics' ? (
        <AnalyticsDashboard bookings={bookings} complaints={complaints} />
      ) : activeSubTab === 'activity' ? (
        <>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search by ID, Name, Driver, Vehicle, or User ID..." 
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <select 
                  className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                  value={recordType}
                  onChange={e => setRecordType(e.target.value as any)}
                >
                  <option value="all">All Activities</option>
                  <option value="bookings">Bookings Only</option>
                  <option value="complaints">Complaints Only</option>
                </select>
                <select 
                  className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                  value={vehicleFilter}
                  onChange={e => setVehicleFilter(e.target.value)}
                >
                  <option value="all">All Vehicles</option>
                  {uniqueVehicles.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
                <button className="p-2 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">
                  <Filter className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-4 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date Range:</span>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <input 
                  type="date" 
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
                <span className="text-slate-400">to</span>
                <input 
                  type="date" 
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
                {(startDate || endDate) && (
                  <button 
                    onClick={() => { setStartDate(''); setEndDate(''); }}
                    className="text-[10px] font-black text-rose-600 uppercase tracking-widest hover:underline ml-2"
                  >
                    Clear Dates
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                    <th className="p-4 font-bold cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('createdAt')}>
                      <div className="flex items-center gap-2">Timestamp {getSortIcon('createdAt')}</div>
                    </th>
                    <th className="p-4 font-bold cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('id')}>
                      <div className="flex items-center gap-2">Reference ID {getSortIcon('id')}</div>
                    </th>
                    <th className="p-4 font-bold cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('residentName')}>
                      <div className="flex items-center gap-2">Customer (ID) {getSortIcon('residentName')}</div>
                    </th>
                    <th className="p-4 font-bold cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('driver')}>
                      <div className="flex items-center gap-2">Driver & Vehicle {getSortIcon('driver')}</div>
                    </th>
                    <th className="p-4 font-bold cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('volume')}>
                      <div className="flex items-center gap-2">Volume & Payment {getSortIcon('volume')}</div>
                    </th>
                    <th className="p-4 font-bold cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('status')}>
                      <div className="flex items-center gap-2">Status {getSortIcon('status')}</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map((record, idx) => (
                    <tr key={`${record.id}-${idx}`} className="hover:bg-slate-50/50 transition-colors text-sm">
                      <td className="p-4 whitespace-nowrap text-slate-500">
                        {new Date(record.createdAt).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="font-mono font-bold text-slate-900">{record.id}</div>
                          {record.type === 'Booking' && (record as any).priority && (
                             <Zap className="w-3.5 h-3.5 text-red-500 fill-red-500 animate-pulse" />
                          )}
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${record.type === 'Booking' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                          {record.type}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-900">{record.residentName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{(record as any).userId || 'N/A'}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[120px]" title={(record as any).address || ''}>{(record as any).address || record.phone}</div>
                      </td>
                      <td className="p-4">
                        {record.type === 'Booking' ? (
                          <>
                            <div className="font-bold text-slate-900">{(record as any).driverName || 'Unassigned'}</div>
                            <div className="text-[10px] text-blue-600 font-bold">{(record as any).tankerId || 'No Vehicle'}</div>
                          </>
                        ) : (
                          <span className="text-slate-400 text-xs italic">N/A</span>
                        )}
                      </td>
                      <td className="p-4">
                        {record.type === 'Booking' ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-slate-700 font-bold">{(record as any).volume}</span>
                            <div className="flex gap-1">
                              <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full w-fit ${(record as any).paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                {(record as any).paymentStatus}
                              </span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase">{(record as any).paymentMethod}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span className="text-slate-700 font-medium">{record.issueType}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                          record.status === 'Delivered' || record.status === 'Resolved' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : record.status === 'Pending' || record.status === 'Open'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <UserManagementView />
      )}
    </div>
  );
}

function LiveFeed({ bookings }: { bookings: Booking[] }) {
  const recentUpdates = [...bookings]
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 5);

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-50 dark:border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-display font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" /> Live Activity Feed
        </h3>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
          <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Real-time</span>
        </div>
      </div>
      <div className="space-y-4">
        {recentUpdates.map((booking, idx) => (
          <div key={booking.id} className={`flex items-start gap-3 pb-4 ${idx !== recentUpdates.length - 1 ? 'border-b border-slate-50 dark:border-slate-700/50' : ''}`}>
            <div className={`mt-1 p-2 rounded-lg ${
              booking.status === 'Pending' ? 'bg-amber-100 text-amber-600' :
              booking.status === 'Confirmed' ? 'bg-blue-100 text-blue-600' :
              booking.status === 'En Route' ? 'bg-indigo-100 text-indigo-600' :
              'bg-emerald-100 text-emerald-600'
            }`}>
              {booking.status === 'Pending' ? <Clock className="w-3.5 h-3.5" /> :
               booking.status === 'Confirmed' ? <CheckCircle className="w-3.5 h-3.5" /> :
               booking.status === 'En Route' ? <Truck className="w-3.5 h-3.5" /> :
               <Check className="w-3.5 h-3.5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{booking.residentName}</p>
                <span className="text-[9px] font-medium text-slate-400 whitespace-nowrap">
                  {new Date(booking.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                {booking.status === 'Pending' ? 'New booking request received' :
                 booking.status === 'Confirmed' ? `Tanker ${booking.tankerId} assigned` :
                 booking.status === 'En Route' ? 'Tanker is on the way' :
                 'Water delivery completed'}
              </p>
            </div>
          </div>
        ))}
      </div>
      <button className="w-full mt-4 py-2 text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors">
        View All Activity
      </button>
    </div>
  );
}

function VendorView({ bookings, onUpdateStatus, complaints, onResolveComplaint }: { bookings: Booking[], onUpdateStatus: (id: string, s: BookingStatus) => void, complaints: Complaint[], onResolveComplaint: (id: string, reply: string) => void }) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'dispatch' | 'complaints' | 'feedback' | 'records'>(() => {
    return localStorage.getItem('vendorActiveTab') as any || 'dashboard';
  });
  const [analyticsView, setAnalyticsView] = useState<'weekly' | 'monthly'>('weekly');

  useEffect(() => {
    localStorage.setItem('vendorActiveTab', activeTab);
  }, [activeTab]);
  const [filter, setFilter] = useState<BookingStatus | 'All'>('All');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredBookings = bookings.filter(b => 
    (filter === 'All' || b.status === filter) &&
    (b.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
     b.residentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
     b.address.toLowerCase().includes(searchTerm.toLowerCase()))
  ).sort((a, b) => {
    if (a.priority && !b.priority) return -1;
    if (!a.priority && b.priority) return 1;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  // Stats
  const pendingCount = bookings.filter(b => b.status === 'Pending').length;
  const priorityPending = bookings.filter(b => b.status === 'Pending' && b.priority).length;
  const activeCount = bookings.filter(b => b.status === 'Confirmed' || b.status === 'En Route').length;
  const deliveredCount = bookings.filter(b => b.status === 'Delivered').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-3xl font-display font-black text-slate-900 dark:text-white">Vendor Administration</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Real-time monitoring and control of water distribution.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search bookings..." 
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 sm:space-x-4 border-b border-slate-200 dark:border-slate-800 mb-8 overflow-x-auto pb-2 no-scrollbar">
        <button 
          onClick={() => setActiveTab('dashboard')} 
          className={`px-4 sm:px-6 py-3 font-display font-bold text-xs sm:text-sm border-b-4 transition-all whitespace-nowrap rounded-t-xl ${activeTab === 'dashboard' ? 'border-blue-600 text-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
        >
          Overview Dashboard
        </button>
        <button 
          onClick={() => setActiveTab('dispatch')} 
          className={`px-4 sm:px-6 py-3 font-display font-bold text-xs sm:text-sm border-b-4 transition-all whitespace-nowrap rounded-t-xl ${activeTab === 'dispatch' ? 'border-blue-600 text-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
        >
          Dispatch Management
        </button>
        <button 
          onClick={() => setActiveTab('complaints')} 
          className={`px-4 sm:px-6 py-3 font-display font-bold text-xs sm:text-sm border-b-4 transition-all whitespace-nowrap rounded-t-xl ${activeTab === 'complaints' ? 'border-blue-600 text-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
        >
          Complaints {complaints.filter(c => c.status === 'Open').length > 0 && <span className="ml-2 bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px] font-black">{complaints.filter(c => c.status === 'Open').length}</span>}
        </button>
        <button 
          onClick={() => setActiveTab('feedback')} 
          className={`px-4 sm:px-6 py-3 font-display font-bold text-xs sm:text-sm border-b-4 transition-all whitespace-nowrap rounded-t-xl ${activeTab === 'feedback' ? 'border-blue-600 text-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
        >
          Suggestions & Reviews
        </button>
        <button 
          onClick={() => setActiveTab('records')} 
          className={`px-4 sm:px-6 py-3 font-display font-bold text-xs sm:text-sm border-b-4 transition-all whitespace-nowrap rounded-t-xl ${activeTab === 'records' ? 'border-blue-600 text-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
        >
          Master Records
        </button>
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-display font-black text-slate-900">System Overview</h2>
              <p className="text-slate-500 font-medium">Real-time performance metrics for Mira-Bhayandar.</p>
            </div>
            <div className="bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-sm font-bold text-slate-700 uppercase tracking-wider">System Live</span>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-xl shadow-amber-100/50 dark:shadow-none border border-amber-50 dark:border-slate-700 flex items-center gap-5 transition-transform hover:scale-[1.02]">
              <div className="vibrant-gradient-amber p-4 rounded-2xl shadow-lg shadow-amber-200 dark:shadow-none">
                <AlertCircle className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pending</p>
                <p className="text-3xl font-display font-black text-slate-900 dark:text-white">{pendingCount}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-xl shadow-blue-100/50 dark:shadow-none border border-blue-50 dark:border-slate-700 flex items-center gap-5 transition-transform hover:scale-[1.02]">
              <div className="vibrant-gradient p-4 rounded-2xl shadow-lg shadow-blue-200 dark:shadow-none">
                <Truck className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active</p>
                <p className="text-3xl font-display font-black text-slate-900 dark:text-white">{activeCount}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-xl shadow-emerald-100/50 dark:shadow-none border border-emerald-50 dark:border-slate-700 flex items-center gap-5 transition-transform hover:scale-[1.02]">
              <div className="vibrant-gradient-emerald p-4 rounded-2xl shadow-lg shadow-emerald-200 dark:shadow-none">
                <CheckCircle className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Completed</p>
                <p className="text-3xl font-display font-black text-slate-900 dark:text-white">{deliveredCount}</p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-6 rounded-3xl shadow-xl shadow-indigo-200 dark:shadow-none flex items-center gap-5 transition-transform hover:scale-[1.02] text-white">
              <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest">Demand Forecast</p>
                <p className="text-2xl font-display font-black">+15% High</p>
                <p className="text-[9px] text-indigo-200 font-medium mt-1">Due to Heatwave</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-50 dark:border-slate-700">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-display font-black text-slate-900 dark:text-white">Delivery Trends</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                      <button 
                        onClick={() => setAnalyticsView('weekly')}
                        className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${analyticsView === 'weekly' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-400'}`}
                      >
                        Weekly
                      </button>
                      <button 
                        onClick={() => setAnalyticsView('monthly')}
                        className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${analyticsView === 'monthly' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-400'}`}
                      >
                        Monthly
                      </button>
                    </div>
                    <div className="hidden sm:flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Deliveries</span>
                    </div>
                  </div>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsView === 'weekly' ? CHART_DATA_WEEKLY : CHART_DATA_MONTHLY}>
                      <defs>
                        <linearGradient id="colorDel" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                      <Tooltip 
                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                      />
                      <Area type="monotone" dataKey="deliveries" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorDel)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Live Fleet Map */}
              <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-50 dark:border-slate-700">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-xl font-display font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-blue-600" /> Live Fleet Tracking
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Real-time GPS telemetry for water tankers across Mira-Bhayandar</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                      <span>6 Active Tankers</span>
                    </div>
                  </div>
                </div>
                <FleetTrackingMap heightClass="h-96" />
              </div>
            </div>

            <div className="space-y-8">
              <LiveFeed bookings={bookings} />
              <SystemHealth />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-50">
              <h3 className="text-xl font-display font-black text-slate-900 mb-6">Request Volume</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analyticsView === 'weekly' ? CHART_DATA_WEEKLY : CHART_DATA_MONTHLY}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                    <Tooltip 
                      contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    />
                    <Line type="monotone" dataKey="requests" stroke="#6366f1" strokeWidth={3} dot={{fill: '#6366f1', strokeWidth: 2, r: 4}} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <SystemHealth />
          </div>

          {/* Driver Performance Section */}
          <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-50">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-display font-black text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" /> Driver Performance
              </h3>
              <span className="text-xs text-slate-400 font-medium">Monthly Stats</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { name: 'Suresh Kumar', deliveries: 45, rating: 4.9, status: 'On Duty' },
                { name: 'Vijay Singh', deliveries: 38, rating: 4.8, status: 'On Duty' },
                { name: 'Rajesh Yadav', deliveries: 42, rating: 4.7, status: 'Break' },
                { name: 'Amit Patel', deliveries: 31, rating: 4.9, status: 'On Duty' },
              ].map((driver, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center border border-blue-200">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${driver.status === 'On Duty' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {driver.status}
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{driver.name}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      <span className="text-xs font-bold text-slate-600">{driver.rating}</span>
                      <span className="text-slate-300 mx-1">•</span>
                      <span className="text-xs font-medium text-slate-500">{driver.deliveries} Deliveries</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${(driver.deliveries / 50) * 100}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'dispatch' && (
        <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dispatch Management</h2>
          <p className="text-slate-500 text-sm">Manage incoming requests and active deliveries.</p>
        </div>
        
        <div className="flex bg-white rounded-lg shadow-sm border border-slate-200 p-1">
          {['All', 'Pending', 'Confirmed', 'En Route'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === f ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-xl shadow-amber-100/50 border border-amber-50 flex items-center gap-5 transition-transform hover:scale-[1.02] relative overflow-hidden">
          {priorityPending > 0 && (
            <div className="absolute top-0 right-0 bg-red-600 text-white px-3 py-1 rounded-bl-xl text-[8px] font-black uppercase tracking-widest animate-pulse">
              {priorityPending} Priority
            </div>
          )}
          <div className="vibrant-gradient-amber p-4 rounded-2xl shadow-lg shadow-amber-200">
            <AlertCircle className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pending</p>
            <p className="text-3xl font-display font-black text-slate-900">{pendingCount}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-xl shadow-blue-100/50 border border-blue-50 flex items-center gap-5 transition-transform hover:scale-[1.02]">
          <div className="vibrant-gradient p-4 rounded-2xl shadow-lg shadow-blue-200">
            <Truck className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active</p>
            <p className="text-3xl font-display font-black text-slate-900">{activeCount}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-xl shadow-emerald-100/50 border border-emerald-50 flex items-center gap-5 transition-transform hover:scale-[1.02]">
          <div className="vibrant-gradient-emerald p-4 rounded-2xl shadow-lg shadow-emerald-200">
            <CheckCircle className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Completed</p>
            <p className="text-3xl font-display font-black text-slate-900">{deliveredCount}</p>
          </div>
        </div>
      </div>

      {/* Booking List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-500">
                <th className="p-4 font-semibold text-slate-600">ID & Status</th>
                <th className="p-4 font-semibold text-slate-600">Resident Details</th>
                <th className="p-4 font-semibold text-slate-600">Location</th>
                <th className="p-4 font-semibold text-slate-600">Schedule & Volume</th>
                <th className="p-4 font-semibold text-slate-600 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No bookings found matching the current filter.
                  </td>
                </tr>
              ) : (
                filteredBookings.map(booking => (
                  <tr key={booking.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 align-top">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="font-bold text-slate-900">{booking.id}</div>
                        {booking.priority && (
                          <div className="flex items-center gap-1 bg-red-600 text-white px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tight animate-pulse">
                            <Zap className="w-2.5 h-2.5 fill-white" /> Priority
                          </div>
                        )}
                      </div>
                      <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${STATUS_COLORS[booking.status]}`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="p-4 align-top">
                      <div className="font-semibold text-slate-900">{booking.residentName}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${booking.userRole === 'society' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}>
                          {booking.userRole || 'resident'}
                        </span>
                      </div>
                      <div className="text-sm text-slate-500 flex items-center gap-1.5 mt-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" /> {booking.phone}
                      </div>
                    </td>
                    <td className="p-4 align-top max-w-[200px]">
                      <div className="text-sm text-slate-700 flex items-start gap-1.5">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2 leading-relaxed">{booking.address}</span>
                      </div>
                    </td>
                    <td className="p-4 align-top">
                      <div className="text-sm font-bold text-slate-900 bg-slate-100 inline-block px-2 py-1 rounded-md mb-1.5">{booking.volume}</div>
                      <div className="space-y-1 text-[11px] text-slate-600 font-medium">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Ordered:</span>
                          <span className="bg-slate-50 px-1 py-0.2 rounded border border-slate-100 text-slate-700">{new Date(booking.createdAt).toISOString().split('T')[0]}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">{booking.status === 'Delivered' ? 'Delivered:' : 'Established Delivery:'}</span>
                          <span className={`px-1 py-0.2 rounded border font-bold ${booking.status === 'Delivered' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{booking.requestedDate}</span>
                        </div>
                        <div className="flex items-center gap-1 pt-0.5 text-slate-500">
                          <Clock className="w-3.5 h-3.5 text-slate-450 shrink-0" /> {booking.requestedTime}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 align-top text-right">
                      {booking.status === 'Pending' && (
                        <button 
                          onClick={() => onUpdateStatus(booking.id, 'Confirmed')}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm w-full sm:w-auto"
                        >
                          Accept & Assign
                        </button>
                      )}
                      {booking.status === 'Confirmed' && (
                        <button 
                          onClick={() => onUpdateStatus(booking.id, 'En Route')}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm w-full sm:w-auto flex items-center justify-center gap-1"
                        >
                          <Navigation className="w-4 h-4" /> Start Journey
                        </button>
                      )}
                      {booking.status === 'En Route' && (
                        <button 
                          onClick={() => onUpdateStatus(booking.id, 'Delivered')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm w-full sm:w-auto flex items-center justify-center gap-1"
                        >
                          <Check className="w-4 h-4" /> Mark Delivered
                        </button>
                      )}
                      {booking.status === 'Delivered' && (
                        <span className="text-sm font-medium text-slate-400 flex items-center justify-end gap-1">
                          <CheckCircle className="w-4 h-4" /> Completed
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}
      
      {activeTab === 'complaints' && (
        <VendorComplaintsView complaints={complaints} onResolve={onResolveComplaint} />
      )}

      {activeTab === 'feedback' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Suggestions & Reviews</h2>
            <p className="text-slate-500 text-sm">Feedback from residents and societies.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Star className="w-5 h-5 text-amber-400 fill-amber-400" /> Recent Reviews</h3>
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium text-sm">Priya Patel</span>
                    <div className="flex"><Star className="w-4 h-4 text-amber-400 fill-amber-400"/><Star className="w-4 h-4 text-amber-400 fill-amber-400"/><Star className="w-4 h-4 text-amber-400 fill-amber-400"/><Star className="w-4 h-4 text-amber-400 fill-amber-400"/><Star className="w-4 h-4 text-amber-400 fill-amber-400"/></div>
                  </div>
                  <p className="text-sm text-slate-600">"Driver was very polite and arrived exactly on time. Great service!"</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Lightbulb className="w-5 h-5 text-blue-500" /> Suggestions</h3>
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium text-sm">Rahul Sharma</span>
                    <span className="text-xs text-slate-400">2 days ago</span>
                  </div>
                  <p className="text-sm text-slate-600">"It would be helpful to get an SMS notification 10 minutes before arrival."</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'records' && (
        <MasterRecordsView bookings={bookings} complaints={complaints} />
      )}
    </div>
  );
}

function VendorComplaintsView({ complaints, onResolve }: { complaints: Complaint[], onResolve: (id: string, reply: string) => void }) {
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'Resolved'>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');

  const issueTypes = ['All', ...Array.from(new Set(complaints.map(c => c.issueType)))];

  const filteredComplaints = complaints.filter(c => {
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
    const matchesType = typeFilter === 'All' || c.issueType === typeFilter;
    return matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Customer Complaints</h2>
          <p className="text-slate-500 text-sm">Address resident issues and provide resolutions.</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status</label>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Status</option>
              <option value="Open">Open</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Type</label>
            <select 
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              {issueTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredComplaints.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center text-slate-500">No complaints found matching your filters.</div>
        ) : (
          filteredComplaints.map(c => (
            <div key={c.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-slate-900">{c.id}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.status === 'Open' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'}`}>
                      {c.status}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-900">{c.residentName} • {c.phone}</p>
                  <p className="text-sm text-slate-500">{c.issueType}</p>
                </div>
              </div>
              <p className="text-sm text-slate-700 mb-4 p-3 bg-slate-50 rounded-lg">{c.description}</p>
              
              {c.status === 'Open' ? (
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Type your resolution reply..." 
                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    value={replyText[c.id] || ''}
                    onChange={e => setReplyText({...replyText, [c.id]: e.target.value})}
                  />
                  <button 
                    onClick={() => {
                      if (replyText[c.id]) {
                        onResolve(c.id, replyText[c.id]);
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Resolve
                  </button>
                </div>
              ) : (
                <div className="mt-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                  <p className="text-xs font-bold text-emerald-900 mb-1">Resolution Provided:</p>
                  <p className="text-sm text-emerald-800">{c.reply}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// --- DRIVER VIEW ---

function DriverView({ bookings, onUpdateStatus }: { bookings: Booking[], onUpdateStatus: (id: string, s: BookingStatus) => void }) {
  const [isOnline, setIsOnline] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [searchTerm, setSearchTerm] = useState('');

  const assignedBookings = bookings.filter(b => 
    (b.status === 'Confirmed' || b.status === 'En Route') &&
    (b.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
     b.residentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
     b.address.toLowerCase().includes(searchTerm.toLowerCase()))
  ).sort((a, b) => {
    if (a.priority && !b.priority) return -1;
    if (!a.priority && b.priority) return 1;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });
  
  const completedDeliveries = bookings.filter(b => 
    b.status === 'Delivered' &&
    (b.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
     b.residentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
     b.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const completedToday = bookings.filter(b => b.status === 'Delivered').length;
  const recentDeliveries = bookings.filter(b => b.status === 'Delivered').slice(0, 3);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-2 border-white dark:border-slate-700 shadow-lg overflow-hidden">
              <User className="w-8 h-8 text-slate-400" />
            </div>
            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white dark:border-slate-700 shadow-sm ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
          </div>
          <div>
            <h2 className="text-2xl font-display font-black text-slate-900 dark:text-white leading-tight">Driver Dashboard</h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsOnline(!isOnline)}
                className={`text-xs font-bold px-2 py-0.5 rounded-full transition-all ${isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
              >
                {isOnline ? '● ONLINE' : '○ OFFLINE'}
              </button>
              <span className="text-slate-400 text-xs font-medium">• Vehicle: MH-04-WT-8821</span>
            </div>
          </div>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search deliveries..." 
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm text-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800">
        <button 
          onClick={() => setActiveTab('active')}
          className={`pb-2 text-sm font-bold transition-all ${activeTab === 'active' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Active Deliveries ({assignedBookings.length})
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`pb-2 text-sm font-bold transition-all ${activeTab === 'history' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Completed Today ({completedToday})
        </button>
      </div>

      {activeTab === 'active' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <DriverNavigationMap
                vehicleId="MH-04-WT-8821"
                activeOrders={assignedBookings}
                onOrderDelivered={(orderId) => onUpdateStatus(orderId, 'Delivered')}
                heightClass="h-80 sm:h-96"
              />
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-50 dark:border-slate-700 flex flex-col">
              <h3 className="text-lg font-display font-black text-slate-900 dark:text-white mb-6">Vehicle Status</h3>
              
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Water Level</span>
                    <span className="text-xs font-black text-blue-600">85%</span>
                  </div>
                  <div className="h-3 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Fuel Level</span>
                    <span className="text-xs font-black text-amber-600">42%</span>
                  </div>
                  <div className="h-3 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: '42%' }}></div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-50 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Thermometer className="w-4 h-4 text-rose-500" />
                      <span className="text-xs font-bold text-slate-500">Engine Temp</span>
                    </div>
                    <span className="text-xs font-black text-slate-900 dark:text-white">82°C</span>
                  </div>
                </div>
              </div>

              <button className="mt-auto w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold text-sm hover:opacity-90 transition-all shadow-lg">
                Vehicle Health Report
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-3xl text-white shadow-xl shadow-blue-200 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                <AlertCircle className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-display font-bold">Need Emergency Help?</h3>
                <p className="text-blue-100 text-sm">Contact our 24/7 support for any issues on road.</p>
              </div>
            </div>
            <a 
              href={`tel:${HELPLINE_NUMBER}`}
              className="bg-white text-blue-600 px-6 sm:px-8 py-3 rounded-2xl font-bold hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Phone className="w-5 h-5" /> Call Helpline
            </a>
          </div>

          {assignedBookings.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 p-12 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-50 dark:border-slate-700 text-center">
              <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
              </div>
              <p className="text-xl font-display font-black text-slate-900 dark:text-white">All Caught Up!</p>
              <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">No active trips assigned. Take a break or wait for new requests.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {assignedBookings.map(booking => (
                <div key={booking.id} className={`bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border flex flex-col transition-all hover:shadow-2xl relative overflow-hidden ${booking.priority ? 'ring-2 ring-red-500 border-red-500' : 'border-slate-50 dark:border-slate-700'}`}>
                  {booking.priority && (
                    <div className="absolute top-0 right-0 bg-red-600 text-white px-4 py-1 rounded-bl-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-lg z-10">
                      <Zap className="w-3 h-3 fill-white" /> Priority Delivery
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{booking.id}</span>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${STATUS_COLORS[booking.status]}`}>
                          {booking.status}
                        </span>
                      </div>
                      <p className="text-lg font-display font-bold text-slate-900 dark:text-white">{booking.residentName}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-display font-black text-blue-600 leading-none">{booking.volume}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Capacity</div>
                    </div>
                  </div>

                  <div className="space-y-4 mb-8 flex-1">
                    <div className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                      <div className="bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm">
                        <MapPin className="w-5 h-5 text-blue-600" />
                      </div>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed">{booking.address}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <div className="bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm">
                          <Phone className="w-4 h-4 text-slate-400" />
                        </div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{booking.phone}</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <div className="bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm">
                          <Clock className="w-4 h-4 text-slate-400" />
                        </div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{booking.requestedTime}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700/50 flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 font-black">Ordered:</span>
                        <span className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-850">{new Date(booking.createdAt).toISOString().split('T')[0]}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 font-black">Established Delivery:</span>
                        <span className="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900 px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-900/40 font-black">{booking.requestedDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 dark:border-slate-700 mt-auto space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <a 
                        href={`tel:${booking.phone}`}
                        className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-3 sm:py-4 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all"
                      >
                        <Phone className="w-4 h-4" /> Call
                      </a>
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 sm:py-4 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-100 dark:shadow-none hover:bg-blue-700"
                      >
                        <MapPin className="w-4 h-4" /> Navigate
                      </a>
                    </div>

                    {booking.status === 'Confirmed' && (
                      <button 
                        onClick={() => onUpdateStatus(booking.id, 'En Route')}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-4 sm:py-5 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-widest transition-all shadow-xl shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-3"
                      >
                        <Navigation className="w-5 h-5 sm:w-6 sm:h-6" /> Start Journey
                      </button>
                    )}
                    {booking.status === 'En Route' && (
                      <button 
                        onClick={() => onUpdateStatus(booking.id, 'Delivered')}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-4 sm:py-5 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-widest transition-all shadow-xl shadow-emerald-100 dark:shadow-none flex items-center justify-center gap-3"
                      >
                        <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6" /> Mark as Delivered
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4 animate-in fade-in">
          {completedDeliveries.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 p-12 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-50 dark:border-slate-700 text-center">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <HistoryIcon className="w-10 h-10 text-slate-300" />
              </div>
              <p className="text-xl font-display font-black text-slate-900 dark:text-white">No history found</p>
              <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Try a different search or complete some deliveries.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {completedDeliveries.map(delivery => (
                <div key={delivery.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-xl w-fit">
                      <CheckCircle className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{delivery.residentName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{delivery.address}</p>
                      <div className="flex flex-wrap gap-3 mt-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-900/50 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-800">{delivery.id}</span>
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-900/30">{delivery.volume}</span>
                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded border border-amber-100 dark:border-amber-900/30">{delivery.requestedDate}</span>
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/30">{delivery.paymentMethod}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 pt-4 sm:pt-0">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-100 dark:border-emerald-800 text-[10px] font-black uppercase tracking-widest mb-1">
                      <Check className="w-3 h-3" /> Completed
                    </div>
                    <p className="text-xs font-bold text-slate-400 mt-1">{new Date(delivery.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

