import React from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, DollarSign, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import NotificationBell from './NotificationBell';
import UserProfileDropdown from './UserProfileDropdown';
import FieldGoogleMap from './FieldGoogleMap';
import ProcessPaymentModal from './ProcessPaymentModal';
import ManagerPaymentsList from './ManagerPaymentsList';
import { useToast } from './Toast';
import { paymentService } from '../services/paymentService';
import { financeService } from '../services/financeService';
import { harvestService } from '../services/harvestService';
import { farmerService } from '../services/farmerService';
import { fieldService } from '../services/fieldService';
import { cropCycleService } from '../services/cropCycleService';
import { cropService } from '../services/cropService';
import { formatUGX } from '../utils/currency';

const ManagerDashboard: React.FC = () => {
  const { logout, user } = useAuth();
  const { showToast, ToastComponent } = useToast();
  const [pendingPayments, setPendingPayments] = React.useState<any[]>([]);
  const [ppLoading, setPpLoading] = React.useState(false);
  const [ppError, setPpError] = React.useState('');
  const [approvals, setApprovals] = React.useState<any[]>([]);
  const [approvalsLoading, setApprovalsLoading] = React.useState(false);
  const [approvalsError, setApprovalsError] = React.useState('');
  const [allPayments, setAllPayments] = React.useState<any[]>([]);
  const [approvedPayments, setApprovedPayments] = React.useState<any[]>([]);
  const [recentHarvests, setRecentHarvests] = React.useState<any[]>([]);
  const [ratesModalOpen, setRatesModalOpen] = React.useState(false);
  const [ratesLoading, setRatesLoading] = React.useState(false);
  const [ratesError, setRatesError] = React.useState('');
  const [ratesData, setRatesData] = React.useState<{ farmerId: string; totalQuantity: number; harvests: any[]; lastDate?: string } | null>(null);
  const [farmers, setFarmers] = React.useState<any[]>([]);
  const [allFarmsModalOpen, setAllFarmsModalOpen] = React.useState(false);
  const [processPaymentModalOpen, setProcessPaymentModalOpen] = React.useState(false);
  const [selectedPayment, setSelectedPayment] = React.useState<any>(null);
  const [showPaymentsList, setShowPaymentsList] = React.useState(false);
  const [cropCycles, setCropCycles] = React.useState<any[]>([]);
  const [crops, setCrops] = React.useState<any[]>([]);
  const [fieldOfficers, setFieldOfficers] = React.useState<any[]>([]);
  const [fields, setFields] = React.useState<any[]>([]);

  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setPpLoading(true);
        setPpError('');
        const [pendingRes, approvalsRes, approvedRes, allPaysRes, farmersRes, harvestsRes, cropsRes, cyclesRes, usersRes, fieldsRes] = await Promise.all([
          paymentService.getPaymentsByStatus('pending'),
          financeService.getApprovalRequests('pending'),
          paymentService.getPaymentsByStatus('approved'),
          paymentService.getAllPayments(),
          farmerService.getAllFarmers(),
          harvestService.getAllHarvests(),
          cropService.getAllCrops(),
          cropCycleService.getAllCropCycles({ status: 'active' }),
          farmerService.getAllFarmers().then((res: any) => {
            // Also fetch users to get field officers count
            return fetch('/api/users', {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            }).then(r => r.json());
          }).catch(() => ({ data: [] })),
          fieldService.getAllFields()
        ]);
        if (!mounted) return;
        console.log('📊 [Manager Dashboard] Approved payments response:', approvedRes);
        const approvedData = Array.isArray(approvedRes) ? approvedRes : (approvedRes?.data || approvedRes?.items || []);
        console.log('📊 [Manager Dashboard] Approved payments data:', approvedData);
        setPendingPayments(Array.isArray(pendingRes) ? pendingRes : (pendingRes?.data || pendingRes?.items || []));
        setApprovals(approvalsRes?.data || approvalsRes || []);
        setApprovedPayments(approvedData);
        setAllPayments(allPaysRes?.data || allPaysRes || []);
        setFarmers(farmersRes?.data || farmersRes || []);
        const hvArr = Array.isArray(harvestsRes) ? harvestsRes : (harvestsRes?.data || harvestsRes?.items || []);
        setRecentHarvests(hvArr
          .slice()
          .sort((a:any,b:any)=> new Date(b.harvest_date||b.created_at||0).getTime()-new Date(a.harvest_date||a.created_at||0).getTime())
          .slice(0,6)
        );
        setCrops(Array.isArray(cropsRes?.data) ? cropsRes.data : (cropsRes?.data || []));
        setCropCycles(Array.isArray(cyclesRes?.data) ? cyclesRes.data : (cyclesRes?.data || []));
        const users = Array.isArray(usersRes?.data) ? usersRes.data : (usersRes?.users || usersRes?.data || []);
        const officers = users.filter((u: any) => u.role === 'field_officer');
        setFieldOfficers(officers);
        const fieldsArr = Array.isArray(fieldsRes) ? fieldsRes : (fieldsRes?.data || fieldsRes?.items || []);
        setFields(fieldsArr);
      } catch (e) {
        if (!mounted) return;
        setPpError('Failed to load pending payments');
        setApprovalsError('Failed to load finance requests');
      } finally {
        if (mounted) setPpLoading(false);
        if (mounted) setApprovalsLoading(false);
      }
    };
    setApprovalsLoading(true);
    load();
    return () => { mounted = false; };
  }, []);

  const openProcessPaymentModal = (payment: any) => {
    setSelectedPayment(payment);
    setProcessPaymentModalOpen(true);
  };

  const handlePaymentProcessed = async () => {
    // Reload approved payments
    try {
      const approvedRes = await paymentService.getPaymentsByStatus('approved');
      setApprovedPayments(Array.isArray(approvedRes) ? approvedRes : (approvedRes?.data || approvedRes?.items || []));
      showToast('✅ Payment processed successfully! Farmer will receive mobile money/bank alert.', 'success');
    } catch (e) {
      setApprovalsError('Failed to reload payments');
      showToast('❌ Failed to reload payments', 'error');
    }
  };
  // Map markers come from farmers list; default layout used when coords are absent

  // Performance metrics data - REAL DATA
  const performanceData = React.useMemo(() => {
    // 1. Crop Yield Achievement - (Actual Yield / Expected Yield) × 100
    let cropYieldPercentage = 0;
    const completedCycles = cropCycles.filter((c: any) => c.status === 'completed' && c.actual_yield_kg && c.expected_yield_kg);
    if (completedCycles.length > 0) {
      const totalExpected = completedCycles.reduce((sum: number, c: any) => sum + (parseFloat(c.expected_yield_kg) || 0), 0);
      const totalActual = completedCycles.reduce((sum: number, c: any) => sum + (parseFloat(c.actual_yield_kg) || 0), 0);
      cropYieldPercentage = totalExpected > 0 ? Math.round((totalActual / totalExpected) * 100) : 0;
    }

    // 2. Quality Score - (Grade A harvests / Total harvests) × 100
    let qualityScore = 0;
    if (recentHarvests.length > 0) {
      const gradeACount = recentHarvests.filter((h: any) => h.quality_grade === 'Grade A' || h.quality_grade === 'A').length;
      qualityScore = Math.round((gradeACount / recentHarvests.length) * 100);
    }

    // 3. Payment Processing Rate - (Approved / Total Requests) × 100
    let paymentEfficiency = 0;
    const totalPayments = allPayments.length;
    if (totalPayments > 0) {
      const approvedCount = approvedPayments.length;
      paymentEfficiency = Math.round((approvedCount / totalPayments) * 100);
    }

    // 4. Crop Diversity Index - (Active Crop Types / 10) × 100
    let cropDiversity = 0;
    if (cropCycles.length > 0) {
      const uniqueCrops = new Set(cropCycles.map((c: any) => c.crop_type || c.cropType));
      cropDiversity = Math.min(Math.round((uniqueCrops.size / 10) * 100), 100);
    }

    return [
      { metric: 'Crop Yield Achievement', value: cropYieldPercentage, color: '#22c55e' },
      { metric: 'Quality Score', value: qualityScore, color: '#f59e0b' },
      { metric: 'Payment Processing', value: paymentEfficiency, color: '#3b82f6' },
      { metric: 'Crop Diversity', value: cropDiversity, color: '#10b981' }
    ];
  }, [cropCycles, recentHarvests, approvedPayments, allPayments]);

  // Revenue analytics data
  const revenueData = [
    { month: 'Jan', revenue: 45000, profit: 12000 },
    { month: 'Feb', revenue: 52000, profit: 15000 },
    { month: 'Mar', revenue: 48000, profit: 13500 },
    { month: 'Apr', revenue: 61000, profit: 18000 },
    { month: 'May', revenue: 55000, profit: 16500 },
    { month: 'Jun', revenue: 67000, profit: 20000 },
    { month: 'Jul', revenue: 58000, profit: 17500 },
    { month: 'Aug', revenue: 72000, profit: 22000 },
    { month: 'Sep', revenue: 65000, profit: 19500 },
    { month: 'Oct', revenue: 69000, profit: 21000 },
    { month: 'Nov', revenue: 63000, profit: 18500 },
    { month: 'Dec', revenue: 75000, profit: 23000 }
  ];

  // Crop distribution data - calculated from real crop cycles
  const cropDistributionData = React.useMemo(() => {
    if (cropCycles.length === 0) {
      return [];
    }

    // Define color palette for different crops
    const colorPalette = ['#f59e0b', '#22c55e', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

    // Group by crop type and sum up areas
    const cropTotals: { [key: string]: { name: string; acres: number; icon: string } } = {};
    
    cropCycles.forEach((cycle: any) => {
      const cropKey = cycle.crop_type || cycle.cropType || 'unknown';
      const cropName = cycle.crop_name || cycle.cropType || cropKey;
      const area = parseFloat(cycle.area_planted || 0);
      
      // Find crop icon from crops list
      const cropDef = crops.find(c => c.name.toLowerCase() === cropKey.toLowerCase());
      const icon = cropDef?.icon || '🌾';
      
      if (!cropTotals[cropKey]) {
        cropTotals[cropKey] = { name: cropName, acres: 0, icon };
      }
      cropTotals[cropKey].acres += area;
    });

    // Calculate total acres
    const totalAcres = Object.values(cropTotals).reduce((sum, crop) => sum + crop.acres, 0);
    
    if (totalAcres === 0) {
      return [];
    }

    // Convert to array and calculate percentages
    const distribution = Object.entries(cropTotals)
      .map(([key, data], index) => ({
        name: data.name,
        value: Math.round((data.acres / totalAcres) * 100),
        color: colorPalette[index % colorPalette.length],
        acres: Math.round(data.acres),
        icon: data.icon
      }))
      .sort((a, b) => b.acres - a.acres); // Sort by acres descending

    return distribution;
  }, [cropCycles, crops]);

  // Recent activities data - REAL DATA from various sources
  const recentActivities = React.useMemo(() => {
    const activities: any[] = [];
    
    // Helper function to format time ago
    const timeAgo = (date: Date) => {
      const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
      if (seconds < 60) return 'just now';
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
      const days = Math.floor(hours / 24);
      if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
      const weeks = Math.floor(days / 7);
      if (weeks < 4) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
      return date.toLocaleDateString();
    };

    // 1. Farmer Registrations
    farmers.forEach((farmer: any) => {
      if (farmer.registration_date || farmer.created_at) {
        const regDate = new Date(farmer.registration_date || farmer.created_at);
        activities.push({
          id: `farmer-${farmer._id}`,
          activity: `New farmer "${farmer.name}" registered`,
          time: timeAgo(regDate),
          timestamp: regDate.getTime(),
          type: 'registration'
        });
      }
    });

    // 2. Crop Cycle Activities (Planting, Monitoring, Harvest)
    cropCycles.forEach((cycle: any) => {
      const farmerName = farmers.find((f: any) => f._id === cycle.farmer_id)?.name || 'Unknown Farmer';
      const cropName = cycle.crop_name || cycle.crop_type || 'crop';
      
      // Check all visits
      if (cycle.visits && Array.isArray(cycle.visits)) {
        cycle.visits.forEach((visit: any) => {
          const visitDate = new Date(visit.visit_date || visit.recorded_at);
          const officerId = visit.recorded_by;
          const officer = fieldOfficers.find((fo: any) => fo._id === officerId);
          const officerName = officer ? `"${officer.name}"` : 'Field officer';
          
          if (visit.visit_type === 'planting') {
            activities.push({
              id: `visit-${cycle._id}-planting`,
              activity: `${officerName} recorded planting of ${cropName} for farmer "${farmerName}" (${cycle.area_planted || 0} acres)`,
              time: timeAgo(visitDate),
              timestamp: visitDate.getTime(),
              type: 'planting'
            });
          } else if (visit.visit_type === 'monitoring') {
            const pestInfo = visit.pest_detected ? ' ⚠️ Pest attack detected!' : '';
            activities.push({
              id: `visit-${cycle._id}-monitoring-${visitDate.getTime()}`,
              activity: `${officerName} made monitoring visit to "${farmerName}" farm - ${cropName} health: ${visit.health_status}${pestInfo}`,
              time: timeAgo(visitDate),
              timestamp: visitDate.getTime(),
              type: visit.pest_detected ? 'pest' : 'monitoring'
            });
          } else if (visit.visit_type === 'harvest') {
            const yieldKg = visit.actual_yield_kg || 0;
            activities.push({
              id: `visit-${cycle._id}-harvest`,
              activity: `${officerName} recorded harvest at "${farmerName}" farm - ${yieldKg}kg of ${cropName} (Grade ${visit.quality_grade})`,
              time: timeAgo(visitDate),
              timestamp: visitDate.getTime(),
              type: 'harvest'
            });
          }
        });
      }
    });

    // 3. Payment Approvals
    approvedPayments.forEach((payment: any) => {
      if (payment.updated_at || payment.approved_at) {
        const approvalDate = new Date(payment.updated_at || payment.approved_at || payment.created_at);
        const farmerName = farmers.find((f: any) => f._id === payment.farmer_id)?.name || 'Farmer';
        const amount = formatUGX(parseFloat(payment.amount) || 0);
        const paymentType = payment.payment_type || 'payment';
        
        activities.push({
          id: `payment-${payment._id}`,
          activity: `${paymentType === 'advance' ? 'Advance' : 'Final'} payment of ${amount} approved for "${farmerName}"`,
          time: timeAgo(approvalDate),
          timestamp: approvalDate.getTime(),
          type: 'payment'
        });
      }
    });

    // Sort by timestamp (most recent first) and take top 10
    return activities
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);
  }, [farmers, cropCycles, approvedPayments]);

  // Key metrics for cards - REAL DATA
  const keyMetrics = React.useMemo(() => {
    // Calculate total expenditure from ALL payments (not just approved)
    const totalExpenditure = allPayments.reduce((sum, payment) => {
      return sum + (parseFloat(payment.amount) || 0);
    }, 0);

    // Count all registered farmers
    const allFarmers = farmers.length;

    return [
      { 
        title: 'Total Expenditure', 
        value: formatUGX(totalExpenditure), 
        change: `${allPayments.length} payments`, 
        icon: DollarSign, 
        color: 'text-red-600' 
      },
      { 
        title: 'All Farmers', 
        value: allFarmers.toString(), 
        change: `${allFarmers} registered`, 
        icon: Users, 
        color: 'text-purple-600' 
      }
    ];
  }, [allPayments, farmers]);

  // Manager decisions on finance approval requests
  const decideApproval = async (id: string, decision: 'approved' | 'denied') => {
    try {
      await financeService.decideApproval(id, decision);
      setApprovals((prev) => prev.filter((r) => String(r._id || r.id) !== id));
    } catch (e) {
      setApprovalsError(`Failed to ${decision} request`);
    }
  };

  // Open farmer work rates (aggregated from recent harvests)
  const openWorkRates = async (farmerId: string) => {
    try {
      setRatesLoading(true);
      setRatesError('');
      const res = await harvestService.getHarvestsByFarmerId(farmerId);
      const list = (res && (res as any).data) ? (res as any).data : (Array.isArray(res) ? (res as any) : []);
      const totalQuantity = list.reduce((sum: number, h: any) => sum + Number(h.quantity || 0), 0);
      const last = list.length ? new Date(Math.max.apply(null, list.map((h: any) => new Date(h.harvest_date || h.date || Date.now()).getTime()))) : null;
      setRatesData({ farmerId, totalQuantity, harvests: list.slice(0, 10), lastDate: last ? last.toLocaleDateString() : undefined });
      setRatesModalOpen(true);
    } catch (e) {
      setRatesError('Failed to load work rates');
    } finally {
      setRatesLoading(false);
    }
  };

  return (
    <>
    <div className="min-h-screen bg-gray-50">
      {/* Premium Gradient Header - Matching Financial Manager & Field Officer Style */}
      <nav className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-[#6B2C91] via-[#9932CC] to-[#E85D75] shadow-lg">
        <div className="w-full px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Left Section - Logo and Title */}
            <div className="flex items-center space-x-4">
              {/* Logo */}
              <div className="flex-shrink-0">
                <div className="w-14 h-14 rounded-full border-2 border-white bg-white/10 flex items-center justify-center backdrop-blur-sm">
                  <span className="text-3xl">🌾</span>
                </div>
              </div>
              
              {/* Title */}
              <div className="flex flex-col">
                <h1 className="text-xl font-bold text-white leading-tight">Manager Portal</h1>
                <p className="text-xs text-white/80">Farm Management System</p>
              </div>
            </div>
            
            {/* Right Section - Utilities */}
            <div className="flex items-center space-x-1">
              {/* Payments */}
              <button
                onClick={() => setShowPaymentsList(!showPaymentsList)}
                className="flex flex-col items-center space-y-1 px-3 py-1 hover:bg-white/20 rounded-lg transition"
              >
                <FileText className="w-5 h-5 text-white" />
                <span className="text-xs font-medium text-white">Payments</span>
              </button>
              
              {/* Notifications */}
              <div className="flex flex-col items-center space-y-1">
                <NotificationBell />
                <span className="text-xs font-medium text-white">Notifications</span>
              </div>
              
              {/* User Profile Dropdown */}
              <UserProfileDropdown
                userName={user?.name || 'Manager'}
                onLogout={logout}
              />
            </div>
          </div>
        </div>
      </nav>

      {/* Add top padding to account for fixed header */}
      <div className="pt-20"></div>

      {/* Conditional Render: Dashboard or Payments List */}
      {showPaymentsList ? (
        <ManagerPaymentsList onBack={() => setShowPaymentsList(false)} />
      ) : (
      <>
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {/* Finance Requests (Notifications) */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Finance Requests</h2>
                {approvalsLoading && <span className="text-sm text-gray-500">Loading...</span>}
              </div>
              {approvalsError && <p className="text-sm text-red-600 mb-3">{approvalsError}</p>}
              {(!approvals || approvals.length === 0) ? (
                <p className="text-sm text-gray-600">No approval requests.</p>
              ) : (
                <div className="space-y-3">
                  {approvals.slice(0,6).map((req) => {
                    const payIds: string[] = (req.payment_ids || []).map((x: any) => String(x));
                    const pays = allPayments.filter((p) => payIds.includes(String(p._id || p.id)));
                    const farmerIds = Array.from(new Set(pays.map((p) => String(p.farmer_id))));
                    const total = req.total_amount || pays.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
                    return (
                      <div key={String(req._id || req.id)} className="p-3 bg-gray-50 rounded-lg border">
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-gray-800">
                            <div className="font-medium">Total: {formatUGX(Number(total))} · {farmerIds.length} farmer(s)</div>
                            <div className="text-gray-600 text-xs">Note: {req.note || '—'}</div>
                          </div>
                          <div className="space-x-2">
                            <button onClick={() => decideApproval(String(req._id || req.id), 'approved')} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm">Approve</button>
                            <button onClick={() => decideApproval(String(req._id || req.id), 'denied')} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm">Deny</button>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {farmerIds.slice(0,4).map((fid) => (
                            <button key={fid} onClick={() => openWorkRates(fid)} className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-200">
                              View Work Rates ({fid.substring(0,6)}…)
                            </button>
                          ))}
                          {farmerIds.length > 4 && <span className="text-xs text-gray-500">+{farmerIds.length - 4} more</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Approved Payments - Ready to Process */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-semibold">Approved Payments - Ready to Process</h2>
                  <p className="text-xs text-gray-500 mt-1">Payments approved by Financial Manager, awaiting final processing</p>
                </div>
                {approvalsLoading && <span className="text-sm text-gray-500">Loading...</span>}
              </div>
              {approvalsError && <p className="text-sm text-red-600 mb-3">{approvalsError}</p>}
              {approvedPayments.length === 0 && !approvalsLoading ? (
                <p className="text-sm text-gray-600">No approved payments waiting.</p>
              ) : (
                <div className="space-y-3">
                  {approvedPayments.slice(0,6).map((p) => (
                    <div key={(p._id || p.id) as string} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="text-sm text-gray-800">
                        <div className="font-medium">Farmer: {(p.farmer_id && p.farmer_id.toString) ? p.farmer_id.toString() : (p.farmer_id || '—')}</div>
                        <div className="text-gray-600">Amount: {formatUGX(Number(p.amount))}</div>
                        <div className="text-xs text-green-600 mt-1">✓ Approved by Financial Manager</div>
                      </div>
                      <button
                        onClick={() => openProcessPaymentModal(p)}
                        className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg text-sm font-medium shadow-md hover:shadow-lg transition-all"
                      >
                        💰 Process Payment
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Harvests */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Recent Harvests</h2>
              </div>
              {(!recentHarvests || recentHarvests.length===0) ? (
                <p className="text-sm text-gray-600">No recent harvests.</p>
              ) : (
                <div className="space-y-3">
                  {recentHarvests.map((h:any, idx:number)=>{
                    const farmerName = (farmers.find((f:any)=> String(f._id)===String(h.farmer_id))?.name) || String(h.farmer_id).substring(0,6)+"…";
                    return (
                      <div key={(h._id||idx) as any} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm text-gray-800">
                          <div className="font-medium">{farmerName}</div>
                          <div className="text-gray-600 text-xs">{h.crop_type || 'Crop'} · {Number(h.quantity_tons||0).toLocaleString()} tons</div>
                        </div>
                        <div className="text-xs text-gray-500">{h.harvest_date ? new Date(h.harvest_date).toLocaleDateString() : '—'}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {keyMetrics.map((metric, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{metric.title}</p>
                    <p className="text-3xl font-bold text-gray-900">{metric.value}</p>
                    <p className={`text-sm ${metric.color} mt-1`}>{metric.change}</p>
                  </div>
                  <div className={`p-3 rounded-lg bg-gray-100`}>
                    <metric.icon className={`w-6 h-6 ${metric.color}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Map and Charts */}
            <div className="lg:col-span-2 space-y-8">
              {/* Farm Locations Map */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold">Farm Locations</h2>
                  <span className="text-xs text-gray-500">Interactive map showing all registered farms</span>
                </div>
                
                <div className="relative z-0">
                  <FieldGoogleMap farmers={farmers} height="400px" />
                </div>
                <p className="mt-2 text-xs text-gray-500">Click on map markers to view farmer details and work rates.</p>
              </div>

              {/* Performance Metrics */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-6">Performance Metrics</h2>
                <div className="grid grid-cols-2 gap-6">
                  {performanceData.map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">{item.metric}</span>
                        <span className="text-sm font-bold text-gray-900">{item.value}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className="h-3 rounded-full transition-all duration-500 ease-out"
                          style={{
                            width: `${Math.min(item.value, 100)}%`,
                            backgroundColor: item.color
                          }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {item.metric === 'Crop Yield Achievement' && 'Actual vs expected harvest yields'}
                        {item.metric === 'Quality Score' && 'Percentage of Grade A harvests'}
                        {item.metric === 'Payment Processing' && 'Approved payment requests'}
                        {item.metric === 'Crop Diversity' && 'Variety of crops being grown'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Revenue Analytics */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Revenue Analytics</h2>
                  <select className="text-sm border border-gray-300 rounded px-3 py-1">
                    <option>Last 12 Months</option>
                    <option>Last 6 Months</option>
                    <option>Last 3 Months</option>
                  </select>
                </div>
                
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
                      <Bar dataKey="profit" fill="#22c55e" name="Profit" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Right Column - Crop Distribution & Activities */}
            <div className="space-y-8">
              {/* Crop Distribution */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-6">Crop Distribution</h2>
                
                {cropDistributionData.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🌾</div>
                    <p className="text-gray-500 text-sm">No crop data available</p>
                    <p className="text-gray-400 text-xs mt-2">Field Officers need to record crop planting data</p>
                  </div>
                ) : (
                  <>
                    <div className="h-64 mb-6">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={cropDistributionData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={80}
                            dataKey="value"
                          >
                            {cropDistributionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-3">
                      {cropDistributionData.map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: item.color }}
                            ></div>
                            <span className="text-sm">{item.icon}</span>
                            <span className="text-sm font-medium">{item.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-gray-900">{item.value}%</div>
                            <div className="text-xs text-gray-500">{item.acres} acres</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Recent Activities */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Recent Activities</h2>
                  <button className="text-sm text-blue-600 hover:text-blue-800">View All</button>
                </div>

                {recentActivities.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">No recent activities</p>
                    <p className="text-gray-400 text-xs mt-2">Activities will appear as Field Officers work</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentActivities.map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          activity.type === 'harvest' ? 'bg-green-500' :
                          activity.type === 'planting' ? 'bg-emerald-500' :
                          activity.type === 'monitoring' ? 'bg-blue-500' :
                          activity.type === 'pest' ? 'bg-red-500' :
                          activity.type === 'payment' ? 'bg-purple-500' :
                          activity.type === 'registration' ? 'bg-indigo-500' :
                          'bg-gray-500'
                        }`}></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{activity.activity}</p>
                          <p className="text-xs text-gray-500">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>

      </>
      )}

      {/* Work Rates Modal */}
      {(ratesModalOpen && ratesData) ? (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Farmer Work Rates</h3>
            {ratesLoading ? (
              <p className="text-sm text-gray-600">Loading...</p>
            ) : ratesError ? (
              <p className="text-sm text-red-600">{ratesError}</p>
            ) : (
              <div className="text-sm">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Farmer ID</span>
                  <span className="font-medium">{ratesData!.farmerId}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Total Harvest Quantity</span>
                  <span className="font-medium">{Number(ratesData!.totalQuantity).toLocaleString()}</span>
                </div>
                <div className="flex justify-between mb-4">
                  <span className="text-gray-600">Last Harvest Date</span>
                  <span className="font-medium">{ratesData!.lastDate || '—'}</span>
                </div>
                <div className="max-h-48 overflow-auto border rounded">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr className="text-left text-gray-600">
                        <th className="py-1 px-2">Date</th>
                        <th className="py-1 px-2">Crop</th>
                        <th className="py-1 px-2">Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ratesData!.harvests.map((h, i) => (
                        <tr key={i} className="border-t">
                          <td className="py-1 px-2">{h.harvest_date ? new Date(h.harvest_date).toLocaleDateString() : '—'}</td>
                          <td className="py-1 px-2">{h.crop_type || '—'}</td>
                          <td className="py-1 px-2">{Number(h.quantity || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className="flex justify-end mt-4">
              <button onClick={() => setRatesModalOpen(false)} className="px-4 py-2 rounded bg-gray-200 text-gray-800">Close</button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Process Payment Modal */}
      {selectedPayment && (
        <ProcessPaymentModal
          isOpen={processPaymentModalOpen}
          onClose={() => setProcessPaymentModalOpen(false)}
          payment={selectedPayment}
          onSuccess={handlePaymentProcessed}
        />
      )}

      {/* Toast Notifications */}
      {ToastComponent}
    </div>
    </>
  );
};

export default ManagerDashboard;
