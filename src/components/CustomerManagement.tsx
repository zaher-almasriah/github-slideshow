import React, { useState, useEffect } from 'react';
import { getSupabaseClient } from '../supabaseClient';
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  UserCheck,
  UserX,
  Search,
  Filter,
  RefreshCw,
  Phone,
  Mail,
  User,
  Calendar,
  DollarSign,
  Eye,
  EyeOff,
  CreditCard,
  Receipt,
  TrendingUp,
  TrendingDown,
  Calculator,
  FileText,
  Download,
  Printer,
  Wrench,
  Settings,
  Info
} from 'lucide-react';
// 1. استيراد Toastify
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface Customer {
  id: string;
  name: string;
  phone_number?: string;
  mobile_number?: string;
  email?: string;
  address?: string;
  created_at?: string;
  updated_at?: string;
  total_devices?: number;
  total_spent?: number;
  balance?: number; // رصيد الحساب
  credit_limit?: number; // حد الائتمان
  password?: string; // كلمة السر الجديدة (اختياري)
}

interface Transaction {
  id: string;
  customer_id: string;
  type: 'payment' | 'charge' | 'refund' | 'adjustment';
  amount: number;
  description: string;
  date: string;
  reference?: string;
  created_at: string;
}

interface Device {
  id: string;
  customer_id: string;
  device_type: string;
  model: string;
  problem?: string;
  issue?: string;
  estimated_cost?: number;
  receipt_number?: string;
  entry_date?: string;
  repair_status?: string;
  delivered?: boolean;
  paid?: boolean;
  delivery_date?: string;
  maintenanceActions?: MaintenanceAction[];
}

interface MaintenanceAction {
  id: string;
  device_id: string;
  action_type: string;
  cost: number;
  parts_cost?: number;
  status: string;
  created_at?: string;
}

const CustomerManagement: React.FC = () => {
  // الحصول على Supabase client
  const supabase = getSupabaseClient();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeTab, setActiveTab] = useState<'customers' | 'accounts' | 'transactions' | 'devices' | 'credit_exceedances'>('customers');
  
  // حالات تعديل المعاملات المالية
  const [showEditTransactionModal, setShowEditTransactionModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editTransactionForm, setEditTransactionForm] = useState({
    amount: 0,
    description: '',
    reference: '',
    date: ''
  });

  // حالات تعديل الأجهزة
  const [showEditDeviceModal, setShowEditDeviceModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [editDeviceForm, setEditDeviceForm] = useState({
    device_type: '',
    model: '',
    issue: '',
    estimated_cost: 0,
    repair_status: '',
    delivered: false,
    paid: false,
    delivery_date: ''
  });

  // نموذج إضافة زبون جديد
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone_number: '',
    mobile_number: '',
    email: '',
    address: '',
    credit_limit: 0
  });

  // نموذج إضافة دفعة
  const [newPayment, setNewPayment] = useState({
    amount: 0,
    description: '',
    reference: ''
  });

  // دالة لحساب الرصيد الحالي من المعاملات المالية
  const calculateCustomerBalance = (customerId: string, transactions: Transaction[], devices: Device[]) => {
    console.log('🧮 حساب الرصيد للزبون:', customerId);
    console.log('📋 جميع المعاملات:', transactions);
    
    const customerTransactions = transactions.filter(t => t.customer_id === customerId);
    console.log('👤 معاملات الزبون:', customerTransactions);
    
    const balance = customerTransactions.reduce((balance, transaction) => {
      console.log(`💳 معاملة: ${transaction.type} - ${transaction.amount} ل.س`);
      switch (transaction.type) {
        case 'payment':
          return balance - transaction.amount; // الدفعات تقلل الرصيد
        case 'charge':
        case 'adjustment':
          return balance + transaction.amount; // المشتريات والتعديلات تزيد الرصيد
        case 'refund':
          return balance - transaction.amount; // الاسترداد يقلل الرصيد
        default:
          return balance;
      }
    }, 0);
    
    console.log('💰 الرصيد النهائي:', balance);
    return balance;
  };

  // جلب الزبائن
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select(`*, devices:devices(count)`)
        .order('created_at', { ascending: false });
      if (customersError) throw customersError;
      const processedCustomers = customersData?.map(customer => ({
        ...customer,
        total_devices: customer.devices?.[0]?.count || 0,
        balance: calculateCustomerBalanceUpdated(customer.id, transactions, devices),
        credit_limit: customer.credit_limit || 0
      })) || [];
      setCustomers(processedCustomers);
    } catch (error: any) {
      handleSupabaseError(error, 'جلب بيانات الزبائن');
      // لا تحدث setCustomers في حال الخطأ
    } finally {
      setLoading(false);
    }
  };

  // جلب المعاملات المالية للزبون
  const fetchCustomerTransactions = async (customerId: string) => {
    try {
      console.log('🔍 جلب المعاملات للزبون:', customerId);
      const { data, error } = await supabase
        .from('customer_transactions')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      console.log('📊 عدد معاملات الزبون:', data?.length || 0);
      setSelectedCustomerTransactions(data || []);
      // تحديث رصيد الزبون المحدد
      if (selectedCustomer && selectedCustomer.id === customerId) {
        const currentBalance = calculateCustomerBalanceUpdated(customerId, data || [], selectedCustomerDevices);
        setSelectedCustomer({
          ...selectedCustomer,
          balance: currentBalance
        });
      }
    } catch (error: any) {
      console.error('خطأ في جلب المعاملات:', error);
      setErrorMsg('خطأ في جلب المعاملات المالية: ' + error.message);
    }
  };

  // جلب جميع المعاملات المالية
  const fetchAllTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_transactions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTransactions(data || []);
    } catch (error: any) {
      handleSupabaseError(error, 'جلب جميع المعاملات');
      // لا تحدث setTransactions في حال الخطأ
    }
  };

  // جلب أجهزة الزبون مع إجراءات الصيانة
  const fetchCustomerDevices = async (customerId: string) => {
    try {
      const { data: devicesData, error: devicesError } = await supabase
        .from('devices')
        .select('*')
        .eq('customer_id', customerId)
        .order('entry_date', { ascending: false });
      if (devicesError) throw devicesError;
      // جلب إجراءات الصيانة لجميع الأجهزة
      const deviceIds = devicesData?.map(d => d.id) || [];
      let maintenanceActions: any[] = [];
      if (deviceIds.length > 0) {
        const { data: actionsData, error: actionsError } = await supabase
          .from('maintenance_actions')
          .select('*')
          .in('device_id', deviceIds);
        if (!actionsError && actionsData) {
          maintenanceActions = actionsData;
        }
      }
      // دمج الأجهزة مع إجراءات الصيانة
      const devicesWithActions = devicesData?.map(device => ({
        ...device,
        maintenanceActions: maintenanceActions.filter(action => action.device_id === device.id)
      })) || [];
      setSelectedCustomerDevices(devicesWithActions);
      console.log('📱 عدد أجهزة الزبون:', devicesWithActions.length);
    } catch (error: any) {
      console.error('خطأ في جلب الأجهزة:', error);
      setErrorMsg('خطأ في جلب أجهزة الزبون: ' + error.message);
    }
  };

  // فتح كشف حساب الزبون
  const openAccountStatement = async (customer: Customer) => {
    setSelectedCustomer(customer);
    await fetchCustomerTransactions(customer.id);
    await fetchCustomerDevices(customer.id);
    
    setShowAccountModal(true);
  };



  // إضافة دفعة جديدة
  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      setErrorMsg('يرجى اختيار زبون');
      return;
    }

    if (!newPayment.amount || newPayment.amount <= 0) {
      setErrorMsg('يرجى إدخال مبلغ صحيح');
      return;
    }

    try {
      setLoading(true);
      console.log('إضافة دفعة للزبون:', selectedCustomer.name, 'المبلغ:', newPayment.amount);
      
      // إضافة المعاملة
      const { data: transactionData, error: transactionError } = await supabase
        .from('customer_transactions')
        .insert([{
          customer_id: selectedCustomer.id,
          type: 'payment',
          amount: newPayment.amount,
          description: newPayment.description || `دفعة للزبون ${selectedCustomer.name}`,
          reference: newPayment.reference || `PAY-${Date.now()}`,
          date: new Date().toISOString()
        }])
        .select();

      if (transactionError) {
        console.error('خطأ في إضافة المعاملة:', transactionError);
        throw transactionError;
      }

      console.log('تم إضافة المعاملة:', transactionData);

      // تحديث رصيد الزبون
      const currentBalance = selectedCustomer.balance || 0;
      const newBalance = Math.max(0, currentBalance - newPayment.amount);
      
      const { error: updateError } = await supabase
        .from('customers')
        .update({ 
          balance: newBalance
        })
        .eq('id', selectedCustomer.id);

      if (updateError) {
        console.error('خطأ في تحديث رصيد الزبون:', updateError);
        throw updateError;
      }

      console.log('تم تحديث رصيد الزبون من', currentBalance, 'إلى', newBalance);

      setSuccessMsg(`تم إضافة الدفعة بنجاح: ${newPayment.amount.toLocaleString()} ل.س`);
      setShowPaymentModal(false);
      setNewPayment({ amount: 0, description: '', reference: '' });
      
      // تحديث البيانات
      await Promise.all([
        fetchCustomers(),
        fetchAllTransactions(),
        fetchCustomerTransactions(selectedCustomer.id) // تحديث المعاملات في كشف الحساب
      ]);
      
    } catch (error: any) {
      console.error('خطأ في إضافة الدفعة:', error);
      setErrorMsg('خطأ في إضافة الدفعة: ' + (error.message || 'حدث خطأ غير متوقع'));
    } finally {
      setLoading(false);
    }
  };

  // إضافة معاملة مالية جديدة
  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      setErrorMsg('يرجى اختيار زبون');
      return;
    }

    if (!newPayment.amount || newPayment.amount <= 0) {
      setErrorMsg('يرجى إدخال مبلغ صحيح');
      return;
    }

    try {
      setLoading(true);
      console.log('إضافة معاملة للزبون:', selectedCustomer.name, 'المبلغ:', newPayment.amount);
      
      // إضافة المعاملة
      const { data: transactionData, error: transactionError } = await supabase
        .from('customer_transactions')
        .insert([{
          customer_id: selectedCustomer.id,
          type: 'charge',
          amount: newPayment.amount,
          description: newPayment.description || `مشتريات للزبون ${selectedCustomer.name}`,
          reference: newPayment.reference || `CHG-${Date.now()}`,
          date: new Date().toISOString()
        }])
        .select();

      if (transactionError) {
        console.error('خطأ في إضافة المعاملة:', transactionError);
        throw transactionError;
      }

      console.log('تم إضافة المعاملة:', transactionData);

      // تحديث رصيد الزبون
      const currentBalance = selectedCustomer.balance || 0;
      const newBalance = currentBalance + newPayment.amount;
      
      const { error: updateError } = await supabase
        .from('customers')
        .update({ 
          balance: newBalance
        })
        .eq('id', selectedCustomer.id);

      if (updateError) {
        console.error('خطأ في تحديث رصيد الزبون:', updateError);
        throw updateError;
      }

      console.log('تم تحديث رصيد الزبون من', currentBalance, 'إلى', newBalance);

      setSuccessMsg(`تم إضافة المعاملة بنجاح: ${newPayment.amount.toLocaleString()} ل.س`);
      setShowPaymentModal(false);
      setNewPayment({ amount: 0, description: '', reference: '' });
      
      // تحديث البيانات
      await Promise.all([
        fetchCustomers(),
        fetchAllTransactions(),
        fetchCustomerTransactions(selectedCustomer.id) // تحديث المعاملات في كشف الحساب
      ]);
      
    } catch (error: any) {
      console.error('خطأ في إضافة المعاملة:', error);
      setErrorMsg('خطأ في إضافة المعاملة: ' + (error.message || 'حدث خطأ غير متوقع'));
    } finally {
      setLoading(false);
    }
  };

  // حساب إجمالي الدين المحدث (يشمل الأجهزة غير المسددة)
  const calculateTotalDebt = () => {
    return customers.reduce((total, customer) => {
      const customerDebt = calculateCustomerBalanceUpdated(customer.id, transactions, devices);
      return total + (customerDebt > 0 ? customerDebt : 0);
    }, 0);
  };

  // حساب إجمالي المدفوعات اليوم المحدث (يشمل الأجهزة المسددة اليوم)
  const calculateTodayPayments = () => {
    const today = new Date().toISOString().split('T')[0];
    
    // الدفعات من المعاملات المالية اليوم
    const transactionPayments = transactions
      .filter(t => t.type === 'payment' && t.date.startsWith(today))
      .reduce((total, t) => total + t.amount, 0);
    
    // الدفعات من الأجهزة المسددة اليوم
    const devicePayments = devices
      .filter(device => device.paid && device.delivery_date?.startsWith(today))
      .reduce((total, device) => total + getActualDeviceCost(device), 0);
    
    const totalTodayPayments = transactionPayments + devicePayments;
    
    console.log(`📅 دفعات اليوم:`, {
      transactionPayments,
      devicePayments,
      totalTodayPayments
    });
    
    return totalTodayPayments;
  };

  // دالة حساب التكلفة الإجمالية للجهاز (مثل DeviceInquiry)
  const getTotalMaintenanceCost = (device: Device): number => {
    const estimatedCost = device.estimated_cost || 0;
    const maintenanceCost = device.maintenanceActions?.reduce((total, action) => total + (action.cost || 0), 0) || 0;
    
    // إذا كانت هناك إجراءات صيانة فعلية، استخدم مجموعها
    // وإلا استخدم التكلفة المقدرة
    if (maintenanceCost > 0) {
      return maintenanceCost;
    }
    return estimatedCost;
  };

  // دالة حساب التكلفة الفعلية للجهاز (للعرض في كشف الحساب)
  const getActualDeviceCost = (device: Device): number => {
    const maintenanceCost = device.maintenanceActions?.reduce((total, action) => total + (action.cost || 0), 0) || 0;
    
    // استخدم التكلفة الفعلية من إجراءات الصيانة فقط
    return maintenanceCost;
  };

  // دالة لتحويل حالة الإصلاح إلى نص عربي
  const getRepairStatusText = (status: string | undefined): string => {
    if (!status) return 'غير محدد';
    switch (status) {
      case 'completed': return 'مكتمل';
      case 'in-progress': return 'قيد التنفيذ';
      case 'pending': return 'قيد الانتظار';
      case 'la-yuslih': return 'لا يصلح';
      case 'waiting-parts': return 'بانتظار قطع غيار';
      case 'cancelled': return 'تم الإلغاء';
      default: return status;
    }
  };

  // دالة للحصول على لون حالة الإصلاح
  const getRepairStatusColor = (status: string | undefined): string => {
    if (!status) return 'bg-gray-100 text-gray-800';
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-blue-100 text-blue-800';
      case 'la-yuslih': return 'bg-red-100 text-red-800';
      case 'waiting-parts': return 'bg-orange-100 text-orange-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // دالة لتحويل نوع إجراء الصيانة إلى نص عربي
  const getMaintenanceActionText = (actionType: string): string => {
    switch (actionType) {
      // أعطال الشاشة
      case 'screen-replacement': return 'تغيير شاشة';
      case 'touch-replacement': return 'تبديل تاتش';
      case 'screen-touch-replacement': return 'تبديل شاشة + تاتش';
      case 'oled-screen-replacement': return 'تبديل شاشة أوليد';
      case 'glass-replacement': return 'تبديل زجاج (بلورة)';
      case 'service-screen': return 'شاشة سيرفس';
      case 'screen-calibration': return 'صيانة بيانات شاشة';
      case 'screen-class-b': return 'شاشة شنج كلاس';
      case 'device-screen-swap': return 'شاشة سحب جهاز';
      case 'screen-flex-replacement': return 'تبديل فلاتة شاشة';

      // أعطال الشحن والطاقة
      case 'charging-port-repair': return 'إصلاح منفذ الشحن';
      case 'charging-board-original': return 'تبديل بورد شحن أصلي';
      case 'charging-board-copy': return 'تبديل بورد شحن كوبي';
      case 'charging-issue-repair': return 'صيانة مشاكل شحن';
      case 'battery-replacement': return 'تغيير بطارية';
      case 'power-ic-repair': return 'إصلاح IC الطاقة';

      // أعطال الصوت والكاميرا
      case 'speaker-repair': return 'إصلاح السماعة';
      case 'microphone-repair': return 'إصلاح المايكروفون';
      case 'earpiece-repair': return 'إصلاح سماعة المكالمات';
      case 'camera-repair': return 'إصلاح الكاميرا';
      case 'camera-replacement': return 'تبديل الكاميرا';

      // أعطال السوفتوير
      case 'software-repair': return 'إصلاح نظام التشغيل';
      case 'formatting': return 'تهيئة الجهاز (فورمات)';
      case 'firmware-update': return 'تحديث النظام';
      case 'frp-unlock': return 'فك حماية FRP';

      // أعطال الهاردوير العامة
      case 'hardware-repair': return 'إصلاح هاردوير';
      case 'motherboard-replacement': return 'تبديل بورد';
      case 'ic-replacement': return 'تبديل IC';
      case 'button-repair': return 'إصلاح أزرار (باور / فوليوم)';
      case 'sensor-repair': return 'إصلاح الحساسات';
      case 'back-cover-replacement': return 'تبديل غطاء خلفي';

      // أعطال متقدمة
      case 'water-damage-repair': return 'إصلاح أضرار المياه';
      case 'no-power-repair': return 'إصلاح عطل عدم التشغيل';
      case 'network-issue-repair': return 'صيانة الشبكة / الإشارة';
      case 'charging-ic-repair': return 'إصلاح IC شحن';

      // الحالة العامة / الإدارية
      case 'nothing-found': return 'لا يوجد عطل';
      case 'all-fixed': return 'تم إصلاح جميع الأعطال';
      case 'no-parts': return 'لا توجد قطع متوفرة';
      case 'cancel-repair': return 'تم إلغاء الصيانة';
      case 'fixed-free': return 'تم الإصلاح بدون تكلفة';
      case 'other': return 'عطل آخر';

      default: return actionType;
    }
  };

  // دالة جلب أجهزة الزبون (مثل DeviceInquiry)
  const getCustomerDevices = (customerId: string) => {
    return devices.filter(device => device.customer_id === customerId);
  };

  // حساب إجمالي تكاليف الأجهزة للزبون
  const calculateDeviceCosts = (customerId: string) => {
    const customerDevices = getCustomerDevices(customerId);
    return customerDevices.reduce((total, device) => {
      return total + getActualDeviceCost(device);
    }, 0);
  };

  // حساب إجمالي تكلفة قطع الغيار للزبون
  const calculatePartsCosts = (customerId: string) => {
    const customerDevices = devices.filter(d => d.customer_id === customerId);
    return customerDevices.reduce((total, device) => {
      const partsCost = (device.maintenanceActions || []).reduce((sum, action) => {
        return sum + (action.parts_cost || 0);
      }, 0);
      return total + partsCost;
    }, 0);
  };

  // حساب الربح الصافي من الزبون
  const calculateNetProfit = (customerId: string) => {
    const totalRevenue = calculateDeviceCosts(customerId);
    const totalPartsCost = calculatePartsCosts(customerId);
    const totalPayments = calculateTotalPaymentsUpdated(customerId);
    
    // الربح الصافي = إجمالي الدفعات - تكلفة قطع الغيار
    return totalPayments - totalPartsCost;
  };

  // إضافة معاملة تلقائياً عند إضافة جهاز
  const addDeviceTransaction = async (device: any) => {
    try {
      const totalCost = (device.estimated_cost || 0) + 
        (device.maintenanceActions || []).reduce((sum: number, action: any) => sum + (action.cost || 0), 0);
      
      if (totalCost > 0) {
        await supabase.from('customer_transactions').insert([{
          customer_id: device.customer_id,
          type: 'charge',
          amount: totalCost,
          description: `جهاز: ${device.device_type} ${device.model} - ${device.issue}`,
          reference: device.receipt_number,
          date: new Date().toISOString()
        }]);
      }
    } catch (error: any) {
      console.error('خطأ في إضافة معاملة الجهاز:', error);
    }
  };

  // إضافة معاملة تلقائياً عند إضافة إجراء صيانة
  const addMaintenanceTransaction = async (action: any, device: any) => {
    try {
      if (action.cost > 0) {
        await supabase.from('customer_transactions').insert([{
          customer_id: device.customer_id,
          type: 'charge',
          amount: action.cost,
          description: `إجراء صيانة: ${action.action_type} - ${device.device_type} ${device.model}`,
          reference: device.receipt_number,
          date: new Date().toISOString()
        }]);
      }
    } catch (error: any) {
      console.error('خطأ في إضافة معاملة الصيانة:', error);
    }
  };

  // إضافة زبون جديد
  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('customers')
        .insert([newCustomer])
        .select();

      if (error) throw error;

      setSuccessMsg('تم إضافة الزبون بنجاح');
      setShowAddModal(false);
              setNewCustomer({ name: '', phone_number: '', mobile_number: '', email: '', address: '', credit_limit: 0 });
      fetchCustomers();
    } catch (error: any) {
      console.error('خطأ في إضافة الزبون:', error);
      setErrorMsg('خطأ في إضافة الزبون: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // حذف زبون
  const handleDeleteCustomer = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الزبون؟')) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSuccessMsg('تم حذف الزبون بنجاح');
      fetchCustomers();
    } catch (error: any) {
      console.error('خطأ في حذف الزبون:', error);
      setErrorMsg('خطأ في حذف الزبون: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // بدء تعديل زبون
  const startEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowEditModal(true);
  };

  // حفظ تعديل الزبون
  const handleEditCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    try {
      setLoading(true);
      
      const updateData: any = {
          name: editingCustomer.name,
          phone_number: editingCustomer.phone_number,
          mobile_number: editingCustomer.mobile_number,
          email: editingCustomer.email,
          credit_limit: editingCustomer.credit_limit,
          updated_at: new Date().toISOString()
      };
      
      if (editingCustomer.password) {
        updateData.password = editingCustomer.password;
      }
      
      const { error } = await supabase
        .from('customers')
        .update(updateData)
        .eq('id', editingCustomer.id);

      if (error) throw error;

      setSuccessMsg('تم تحديث بيانات الزبون بنجاح');
      setShowEditModal(false);
      setEditingCustomer(null);
      fetchCustomers();
    } catch (error: any) {
      console.error('خطأ في تحديث الزبون:', error);
      setErrorMsg('خطأ في تحديث الزبون: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // تصفية الزبائن
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.phone_number?.includes(searchTerm) ||
                         customer.mobile_number?.includes(searchTerm) ||
                         customer.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  // فحص وإنشاء جدول المعاملات إذا لم يكن موجوداً
  const checkAndCreateTransactionsTable = async () => {
    try {
      // محاولة جلب البيانات من الجدول
      const { error } = await supabase
        .from('customer_transactions')
        .select('id')
        .limit(1);
      
      if (error && error.code === '42P01') { // جدول غير موجود
        console.log('جدول المعاملات غير موجود، جاري إنشاؤه...');
        setErrorMsg('يرجى تشغيل ملف SQL لإنشاء جدول المعاملات المالية');
      }
    } catch (error) {
      console.error('خطأ في فحص جدول المعاملات:', error);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
      await checkAndCreateTransactionsTable();
        // جلب جميع البيانات دفعة واحدة
        const [customersRes, transactionsRes, devicesRes] = await Promise.all([
          supabase
            .from('customers')
            .select(`*, devices:devices(count)`)
            .order('created_at', { ascending: false }),
          supabase
            .from('customer_transactions')
            .select('*')
            .order('created_at', { ascending: false }),
          supabase
            .from('devices')
            .select('*')
            .order('entry_date', { ascending: false }),
        ]);
        if (customersRes.error) throw customersRes.error;
        if (transactionsRes.error) throw transactionsRes.error;
        if (devicesRes.error) throw devicesRes.error;
        // جلب إجراءات الصيانة
        const deviceIds = devicesRes.data?.map(d => d.id) || [];
        let maintenanceActions: any[] = [];
        if (deviceIds.length > 0) {
          const { data: actionsData, error: actionsError } = await supabase
            .from('maintenance_actions')
            .select('*')
            .in('device_id', deviceIds);
          if (actionsError) throw actionsError;
          maintenanceActions = actionsData || [];
        }
        // دمج الأجهزة مع إجراءات الصيانة
        const devicesWithActions = devicesRes.data?.map(device => ({
          ...device,
          maintenanceActions: maintenanceActions.filter(action => action.device_id === device.id)
        })) || [];
        // معالجة بيانات الزبائن مع حساب الرصيد
        const processedCustomers = customersRes.data?.map(customer => ({
          ...customer,
          total_devices: customer.devices?.[0]?.count || 0,
          balance: calculateCustomerBalanceUpdated(
            customer.id,
            transactionsRes.data || [],
            devicesWithActions
          ),
          credit_limit: customer.credit_limit || 0
        })) || [];
        setCustomers(processedCustomers);
        setTransactions(transactionsRes.data || []);
        setDevices(devicesWithActions);
        setSuccessMsg('تم تحميل البيانات وحساب الأرصدة بنجاح');
      } catch (error: any) {
        setErrorMsg('خطأ في تهيئة البيانات: ' + error.message);
      } finally {
        setLoading(false);
      }
    };
    initializeData();
  }, []);

  // إعادة حساب الرصيد عند تغيير الأجهزة أو المعاملات (كأمر أخير عند الدخول)
  useEffect(() => {
    if (devices.length > 0 && transactions.length > 0 && customers.length > 0) {
      console.log('🔄 إعادة حساب الرصيد كأمر أخير عند الدخول إلى قسم حساب الزبائن...');
      console.log('📊 عدد الأجهزة:', devices.length);
      console.log('📊 عدد المعاملات:', transactions.length);
      console.log('📊 عدد الزبائن:', customers.length);
      
      // تأخير إضافي لضمان اكتمال تحميل الجدول والصفحة بشكل كامل
      setTimeout(() => {
        console.log('⏳ تأخير إضافي لضمان اكتمال تحميل الجدول والصفحة...');
        
        const updatedCustomers = customers.map(customer => {
          const balance = calculateCustomerBalanceUpdated(customer.id, transactions, devices);
          console.log(`💰 رصيد ${customer.name}: ${balance}`);
          return {
            ...customer,
            balance: balance
          };
        });
        
        setCustomers(updatedCustomers);
        console.log('✅ تم إعادة حساب الرصيد كأمر أخير عند الدخول إلى قسم حساب الزبائن');
        setSuccessMsg('تم إعادة حساب الرصيد لجميع الزبائن');
      }, 1000); // تأخير 1 ثانية لضمان اكتمال تحميل الجدول والصفحة
    }
  }, [devices, transactions, customers.length]);



  // جلب جميع الأجهزة مع إجراءات الصيانة
  const fetchAllDevices = async () => {
    try {
      const { data: devicesData, error: devicesError } = await supabase
        .from('devices')
        .select('*')
        .order('entry_date', { ascending: false });
      if (devicesError) throw devicesError;
      const { data: actionsData, error: actionsError } = await supabase
        .from('maintenance_actions')
        .select('*');
      if (actionsError) throw actionsError;
      const devicesWithActions = devicesData?.map(device => ({
        ...device,
        maintenanceActions: actionsData?.filter(action => action.device_id === device.id) || []
      })) || [];
      setDevices(devicesWithActions);
    } catch (error: any) {
      handleSupabaseError(error, 'جلب الأجهزة');
      // لا تحدث setDevices في حال الخطأ
    }
  };

  // إخفاء الرسائل بعد 5 ثوان
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  // === الدوال المالية الجديدة والمعدلة ===
  // الرصيد الحالي للزبون
  const getCustomerCurrentBalance = (customerId: string) => {
    const payments = transactions.filter(t => t.customer_id === customerId && t.type === 'payment')
      .reduce((sum, t) => sum + t.amount, 0);
    const costs = getCustomerDevices(customerId)
      .reduce((sum, d) => sum + getTotalMaintenanceCost(d), 0);
    return payments - costs;
  };

  // الربح الصافي للزبون
  const getCustomerNetProfit = (customerId: string) => {
    const payments = transactions.filter(t => t.customer_id === customerId && t.type === 'payment')
      .reduce((sum, t) => sum + t.amount, 0);
    const partsCost = calculatePartsCosts(customerId);
    const laborCost = getCustomerDevices(customerId)
      .reduce((sum, d) => sum + getTotalMaintenanceCost(d), 0);
    return payments - (partsCost + laborCost);
  };

  // متوسط الدين
  const calculateAverageDebt = () => {
    const debts = customers.map(customer => calculateCustomerBalanceUpdated(customer.id, transactions, devices))
      .filter(debt => debt > 0);
    return debts.length > 0 ? (debts.reduce((a, b) => a + b, 0) / debts.length) : 0;
  };

  // توحيد عدد إجراءات الصيانة
  const totalMaintenanceActions = devices.reduce((total, device) => total + (device.maintenanceActions?.length || 0), 0);
  // ... existing code ...
  // استخدم الدوال الجديدة في الإحصائيات:
  // في قسم الإحصائيات المالية:
  // إجمالي الدين: {calculateTotalDebt().toLocaleString()}
  // متوسط الدين: {calculateAverageDebt().toLocaleString()}
  // إجراءات الصيانة: {totalMaintenanceActions} إجراء
  // ...
  // في كشف حساب الزبون:
  // الرصيد الحالي: getCustomerCurrentBalance(selectedCustomer.id)
  // الربح الصافي: getCustomerNetProfit(selectedCustomer.id)
  // ...

  // دالة مزامنة المعاملات المالية مع حالة تسديد الأجهزة
  const syncTransactionsWithDevices = async () => {
    try {
      console.log('🔄 بدء مزامنة المعاملات مع الأجهزة...');
      
      // جلب جميع الأجهزة
      const { data: allDevices, error: devicesError } = await supabase
        .from('devices')
        .select('*');

      if (devicesError) throw devicesError;

      // جلب جميع المعاملات المالية
      const { data: existingTransactions, error: transactionsError } = await supabase
        .from('customer_transactions')
        .select('*');

      if (transactionsError) throw transactionsError;

      let createdCount = 0;

      // إنشاء معاملات للأجهزة المسددة فقط (لحفظ سجل الدفعات)
      for (const device of allDevices || []) {
        if (device.paid) {
          const deviceCost = getActualDeviceCost(device);
          if (deviceCost <= 0) continue;

          // فحص إذا كانت هناك معاملة دفع لهذا الجهاز
          const existingPayment = existingTransactions?.find(t => 
            t.customer_id === device.customer_id && 
            t.reference === `PAY-DEVICE-${device.id}` &&
            t.type === 'payment'
          );

          if (!existingPayment) {
            // إنشاء معاملة دفع جديدة للأجهزة المسددة فقط
            await supabase.from('customer_transactions').insert([{
              customer_id: device.customer_id,
              type: 'payment',
              amount: deviceCost,
              description: `دفعة جهاز: ${device.device_type} ${device.model} - ${device.receipt_number}`,
              reference: `PAY-DEVICE-${device.id}`,
              date: device.delivery_date || new Date().toISOString()
            }]);
            
            console.log(`✅ تم إنشاء معاملة دفع للجهاز المسدد: ${device.receipt_number}`);
            createdCount++;
          }
        }
      }

      console.log(`✅ تمت المزامنة بنجاح. تم إنشاء ${createdCount} معاملة دفع للأجهزة المسددة.`);
      
      // إعادة جلب البيانات
      await Promise.all([
        fetchCustomers(),
        fetchAllTransactions(),
        fetchAllDevices()
      ]);

      // إعادة حساب الرصيد بعد المزامنة
      setTimeout(() => {
        recalculateAllBalances();
      }, 100);

      setSuccessMsg(`تمت المزامنة بنجاح. تم إنشاء ${createdCount} معاملة دفع للأجهزة المسددة.`);

    } catch (error: any) {
      console.error('❌ خطأ في مزامنة المعاملات:', error);
      setErrorMsg('خطأ في مزامنة المعاملات المالية: ' + error.message);
    }
  };

  // دالة إعادة حساب الرصيد لجميع الزبائن
  const recalculateAllBalances = () => {
    console.log('🔄 إعادة حساب الرصيد يدوياً...');
    if (customers.length > 0 && transactions.length > 0 && devices.length > 0) {
      const updatedCustomers = customers.map(customer => {
        const balance = calculateCustomerBalanceUpdated(customer.id, transactions, devices);
        return {
          ...customer,
          balance: balance
        };
      });
      setCustomers(updatedCustomers);
      setSuccessMsg('تم إعادة حساب الرصيد لجميع الزبائن');
    } else {
      setErrorMsg('البيانات غير مكتملة لحساب الرصيد');
    }
  };

  // دالة تنظيف المعاملات المكررة
  const cleanupDuplicateTransactions = async () => {
    try {
      console.log('🧹 بدء تنظيف المعاملات المكررة...');
      
      // جلب جميع المعاملات
      const { data: allTransactions, error: transactionsError } = await supabase
        .from('customer_transactions')
        .select('*')
        .order('created_at', { ascending: true });

      if (transactionsError) throw transactionsError;

      // تجميع المعاملات حسب المرجع
      const transactionsByReference: { [key: string]: any[] } = {};
      
      allTransactions?.forEach(transaction => {
        if (transaction.reference) {
          if (!transactionsByReference[transaction.reference]) {
            transactionsByReference[transaction.reference] = [];
          }
          transactionsByReference[transaction.reference].push(transaction);
        }
      });

      // حذف المعاملات المكررة (الاحتفاظ بالأحدث)
      let deletedCount = 0;
      
      for (const [reference, transactionList] of Object.entries(transactionsByReference)) {
        if (transactionList.length > 1) {
          // ترتيب حسب تاريخ الإنشاء (الأحدث أولاً)
          const sortedTransactions = transactionList.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          
          // حذف جميع المعاملات ما عدا الأحدث
          const transactionsToDelete = sortedTransactions.slice(1);
          
          for (const transaction of transactionsToDelete) {
            await supabase
              .from('customer_transactions')
              .delete()
              .eq('id', transaction.id);
            
            console.log(`🗑️ تم حذف معاملة مكررة: ${transaction.description}`);
            deletedCount++;
          }
        }
      }

      console.log(`✅ تم تنظيف المعاملات المكررة. تم حذف ${deletedCount} معاملة.`);
      
      // إعادة جلب البيانات
      await Promise.all([
        fetchAllTransactions(),
        fetchCustomers()
      ]);
      
      // إعادة حساب الرصيد بعد التنظيف
      setTimeout(() => {
        recalculateAllBalances();
      }, 100);
      
      setSuccessMsg(`تم تنظيف المعاملات المكررة بنجاح. تم حذف ${deletedCount} معاملة.`);
    } catch (error: any) {
      console.error('خطأ في تنظيف المعاملات المكررة:', error);
      setErrorMsg('خطأ في تنظيف المعاملات المكررة: ' + error.message);
    }
  };

  // دالة حساب الرصيد الحالي المحدثة (تشمل الأجهزة والمعاملات)
  const calculateCustomerBalanceUpdated = (
    customerId: string,
    transactionsList: Transaction[],
    devicesList: Device[]
  ) => {
    const transactionPayments = transactionsList
      .filter(t => t.customer_id === customerId && t.type === 'payment')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    
    const unpaidDevicesCost = devicesList
      .filter(device => device.customer_id === customerId && !device.paid && device.delivered)
      .reduce((sum, device) => sum + (getActualDeviceCost(device) || 0), 0);
    
    const finalBalance = unpaidDevicesCost - transactionPayments;
    return finalBalance;
  };

  // دالة حساب إجمالي الدفعات المحدثة
  const calculateTotalPaymentsUpdated = (customerId: string) => {
    // الدفعات من المعاملات المالية (اليدوية فقط)
    const transactionPayments = transactions
      .filter(t => t.customer_id === customerId && t.type === 'payment')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    
    // الدفعات من الأجهزة المسددة (استخدام التكلفة الفعلية)
    const devicePayments = getCustomerDevices(customerId)
      .filter(device => device.paid)
      .reduce((sum, device) => sum + getActualDeviceCost(device), 0);
    
    // إجمالي الدفعات = الدفعات اليدوية + الدفعات من الأجهزة المسددة
    const totalPayments = transactionPayments + devicePayments;
    
    console.log(`💵 إجمالي الدفعات للزبون ${customerId}:`, {
      transactionPayments,
      devicePayments,
      totalPayments
    });
    
    return totalPayments;
  };

  // بدء تعديل معاملة مالية
  const startEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditTransactionForm({
      amount: transaction.amount,
      description: transaction.description,
      reference: transaction.reference || '',
      date: transaction.date.split('T')[0] // تحويل التاريخ إلى YYYY-MM-DD
    });
    setShowEditTransactionModal(true);
  };

  // حفظ تعديل المعاملة المالية
  const handleEditTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('customer_transactions')
        .update({
          amount: editTransactionForm.amount,
          description: editTransactionForm.description,
          reference: editTransactionForm.reference,
          date: new Date(editTransactionForm.date).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', editingTransaction.id);

      if (error) throw error;

      setSuccessMsg('تم تحديث المعاملة المالية بنجاح');
      setShowEditTransactionModal(false);
      setEditingTransaction(null);
      
      // إعادة جلب البيانات
      if (selectedCustomer) {
        await Promise.all([
          fetchCustomerTransactions(selectedCustomer.id),
          fetchCustomers(),
          fetchAllTransactions()
        ]);
      }
      
    } catch (error: any) {
      console.error('خطأ في تحديث المعاملة:', error);
      setErrorMsg('خطأ في تحديث المعاملة المالية: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // حذف معاملة مالية
  const handleDeleteTransaction = async (transactionId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه المعاملة المالية؟')) return;
    try {
      setLoading(true);
      // حذف المعاملة
      const { error } = await supabase
        .from('customer_transactions')
        .delete()
        .eq('id', transactionId);
      if (error) throw error;
      // إعادة جلب البيانات الكاملة
      const [transactionsRes, customersRes] = await Promise.all([
        supabase
          .from('customer_transactions')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('customers')
          .select(`*, devices:devices(count)`)
          .order('created_at', { ascending: false }),
      ]);
      if (transactionsRes.error) throw transactionsRes.error;
      if (customersRes.error) throw customersRes.error;
      setTransactions(transactionsRes.data || []);
      // إعادة حساب الأرصدة لجميع الزبائن
      const updatedCustomers = customersRes.data?.map(customer => ({
        ...customer,
        total_devices: customer.devices?.[0]?.count || 0,
        balance: calculateCustomerBalanceUpdated(customer.id, transactionsRes.data || [], devices),
        credit_limit: customer.credit_limit || 0
      })) || [];
      setCustomers(updatedCustomers);
      // إذا كان هناك زبون محدد، تحديث معاملاته وأجهزته
      if (selectedCustomer) {
        const customerTransactions = transactionsRes.data?.filter(t => t.customer_id === selectedCustomer.id) || [];
        setSelectedCustomerTransactions(customerTransactions);
        setSelectedCustomer({
          ...selectedCustomer,
          balance: calculateCustomerBalanceUpdated(selectedCustomer.id, customerTransactions, selectedCustomerDevices)
        });
      }
      setSuccessMsg('تم حذف المعاملة المالية بنجاح');
    } catch (error: any) {
      handleSupabaseError(error, 'حذف المعاملة المالية');
    } finally {
      setLoading(false);
    }
  };

  // بدء تعديل جهاز
  const startEditDevice = (device: Device) => {
    setEditingDevice(device);
    setEditDeviceForm({
      device_type: device.device_type || '',
      model: device.model || '',
      issue: device.issue || device.problem || '',
      estimated_cost: device.estimated_cost || 0,
      repair_status: device.repair_status || '',
      delivered: device.delivered || false,
      paid: device.paid || false,
      delivery_date: device.delivery_date ? device.delivery_date.split('T')[0] : ''
    });
    setShowEditDeviceModal(true);
  };

  // حفظ تعديل الجهاز - محسن بناءً على DeviceInquiry
  const handleEditDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDevice) return;

    try {
      setLoading(true);
      
      // تحويل الحقول إلى snake_case كما في DeviceInquiry
      const allowedFields = [
        'receipt_number', 'entry_date', 'barcode', 'customer_id', 'device_type', 'model', 'imei', 'issue_type', 'issue', 'secret_code',
        'estimated_cost', 'paper_receipt_number', 'has_sim', 'has_battery', 'has_memory', 'notes', 'repair_status', 'delivered', 'paid',
        'delivery_date', 'technician_id'
      ];
      
      function toSnakeCase(str: string) {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      }
      
      const dbUpdates: any = {};
      
      // تحويل الحقول المحدثة
      const updates = {
        device_type: editDeviceForm.device_type,
        model: editDeviceForm.model,
        issue: editDeviceForm.issue,
        estimated_cost: editDeviceForm.estimated_cost,
        repair_status: editDeviceForm.repair_status,
        delivered: editDeviceForm.delivered,
        paid: editDeviceForm.paid,
        delivery_date: editDeviceForm.delivery_date ? new Date(editDeviceForm.delivery_date).toISOString() : null,
        updated_at: new Date().toISOString()
      };
      
      for (const key in updates) {
        let snakeKey = toSnakeCase(key);
        if (key === 'device_type') snakeKey = 'device_type';
        if (key === 'estimated_cost') snakeKey = 'estimated_cost';
        if (key === 'repair_status') snakeKey = 'repair_status';
        if (key === 'delivery_date') snakeKey = 'delivery_date';
        if (key === 'updated_at') snakeKey = 'updated_at';
        
        if (allowedFields.includes(snakeKey)) {
          let value = (updates as any)[key];
          // تحويل التواريخ إلى نصوص ISO
          if (value instanceof Date) value = value.toISOString();
          dbUpdates[snakeKey] = value;
        }
      }
      
      const { error } = await supabase
        .from('devices')
        .update(dbUpdates)
        .eq('id', editingDevice.id);

      if (error) throw error;

      setSuccessMsg('تم تحديث بيانات الجهاز بنجاح');
      setShowEditDeviceModal(false);
      setEditingDevice(null);
      
      // إعادة جلب البيانات
      if (selectedCustomer) {
        await Promise.all([
          fetchCustomerDevices(selectedCustomer.id),
          fetchAllDevices(),
          fetchCustomers(),
          fetchAllTransactions()
        ]);
      }
      
    } catch (error: any) {
      console.error('خطأ في تحديث الجهاز:', error);
      setErrorMsg('خطأ في تحديث بيانات الجهاز: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // حذف جهاز
  const handleDeleteDevice = async (deviceId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الجهاز؟ سيتم حذف جميع إجراءات الصيانة المرتبطة به.')) return;

    try {
      setLoading(true);
      
      // حذف إجراءات الصيانة أولاً
      const { error: actionsError } = await supabase
        .from('maintenance_actions')
        .delete()
        .eq('device_id', deviceId);

      if (actionsError) throw actionsError;

      // حذف الجهاز
      const { error: deviceError } = await supabase
        .from('devices')
        .delete()
        .eq('id', deviceId);

      if (deviceError) throw deviceError;

      setSuccessMsg('تم حذف الجهاز وجميع إجراءات الصيانة المرتبطة به بنجاح');
      
      // إعادة جلب البيانات
      if (selectedCustomer) {
        await Promise.all([
          fetchCustomerDevices(selectedCustomer.id),
          fetchAllDevices(),
          fetchCustomers(),
          fetchAllTransactions()
        ]);
      }
      
    } catch (error: any) {
      console.error('خطأ في حذف الجهاز:', error);
      setErrorMsg('خطأ في حذف الجهاز: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // دالة إغلاق النافذة
  const closeAccountModal = async () => {
    try {
      setLoading(true);
      setShowAccountModal(false);
      setSelectedCustomer(null);
      setSelectedCustomerTransactions([]);
      setSelectedCustomerDevices([]);
      // إعادة جلب البيانات الكاملة
      const [customersRes, transactionsRes, devicesRes] = await Promise.all([
        supabase
          .from('customers')
          .select(`*, devices:devices(count)`)
          .order('created_at', { ascending: false }),
        supabase
          .from('customer_transactions')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('devices')
          .select('*')
          .order('entry_date', { ascending: false }),
      ]);
      if (customersRes.error) throw customersRes.error;
      if (transactionsRes.error) throw transactionsRes.error;
      if (devicesRes.error) throw devicesRes.error;
      // جلب إجراءات الصيانة
      const deviceIds = devicesRes.data?.map(d => d.id) || [];
      let maintenanceActions: any[] = [];
      if (deviceIds.length > 0) {
        const { data: actionsData, error: actionsError } = await supabase
          .from('maintenance_actions')
          .select('*')
          .in('device_id', deviceIds);
        if (actionsError) throw actionsError;
        maintenanceActions = actionsData || [];
      }
      // دمج الأجهزة مع إجراءات الصيانة
      const devicesWithActions = devicesRes.data?.map(device => ({
        ...device,
        maintenanceActions: maintenanceActions.filter(action => action.device_id === device.id)
      })) || [];
      // معالجة بيانات الزبائن مع حساب الرصيد
      const processedCustomers = customersRes.data?.map(customer => ({
        ...customer,
        total_devices: customer.devices?.[0]?.count || 0,
        balance: calculateCustomerBalanceUpdated(customer.id, transactionsRes.data || [], devicesWithActions),
        credit_limit: customer.credit_limit || 0
      })) || [];
      setCustomers(processedCustomers);
      setTransactions(transactionsRes.data || []);
      setDevices(devicesWithActions);
      setSuccessMsg('تم تحديث البيانات بنجاح بعد إغلاق كشف الحساب');
    } catch (error: any) {
      handleSupabaseError(error, 'تحديث البيانات بعد إغلاق كشف الحساب');
    } finally {
      setLoading(false);
    }
  };

  const [selectedCustomerTransactions, setSelectedCustomerTransactions] = useState<Transaction[]>([]);
  const [selectedCustomerDevices, setSelectedCustomerDevices] = useState<Device[]>([]);

  // حالة تحميل محلية للرصيد
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);

  // تحسين دالة جلب البيانات
  const handleSupabaseError = (error: any, operation: string) => {
    const errorMessage = `خطأ في ${operation}: ${error.message || 'حدث خطأ غير متوقع'}`;
    console.error(errorMessage, error);
    setErrorMsg(errorMessage);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">إدارة الزبائن والحسابات</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={20} />
          إضافة زبون جديد
        </button>
      </div>

      {/* الإحصائيات المالية */}
      <div className="grid grid-cols-6 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserCheck className="h-6 w-6 text-blue-600" />
            </div>
            <div className="mr-3">
              <p className="text-sm text-gray-500">إجمالي الزبائن</p>
              <p className="text-lg font-semibold text-gray-900">{customers.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
            <div className="mr-3">
              <p className="text-sm text-gray-500">إجمالي الدين</p>
              <p className="text-lg font-semibold text-red-600">{calculateTotalDebt().toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div className="mr-3">
              <p className="text-sm text-gray-500">دفعات اليوم</p>
              <p className="text-lg font-semibold text-green-600">{calculateTodayPayments().toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calculator className="h-6 w-6 text-purple-600" />
            </div>
            <div className="mr-3">
              <p className="text-sm text-gray-500">متوسط الدين</p>
              <p className="text-lg font-semibold text-purple-600">
                {customers.length > 0 ? (calculateTotalDebt() / customers.length).toLocaleString() : 0}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Wrench className="h-6 w-6 text-orange-600" />
            </div>
            <div className="mr-3">
              <p className="text-sm text-gray-500">إجمالي الأجهزة</p>
              <p className="text-lg font-semibold text-orange-600">
                {devices.length} جهاز
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Settings className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="mr-3">
              <p className="text-sm text-gray-500">إجراءات الصيانة</p>
              <p className="text-lg font-semibold text-indigo-600">
                {devices.reduce((total, device) => total + (device.maintenanceActions?.length || 0), 0)} إجراء
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* التبويبات */}
      <div className="mb-6">
        <div className="flex justify-between items-center border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('customers')}
              className={`py-2 px-3 border-b-2 font-medium text-sm ${
                activeTab === 'customers'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              قائمة الزبائن
            </button>
            <span className="border-l border-gray-300 mx-2 h-8 self-center"></span>
            <button
              onClick={() => setActiveTab('accounts')}
              className={`py-2 px-3 border-b-2 font-medium text-sm ${
                activeTab === 'accounts'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              الحسابات المدينة
            </button>
            <span className="border-l border-gray-300 mx-2 h-8 self-center"></span>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`py-2 px-3 border-b-2 font-medium text-sm ${
                activeTab === 'transactions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              المعاملات المالية
            </button>
            <span className="border-l border-gray-300 mx-2 h-8 self-center"></span>
            <button
              onClick={() => setActiveTab('devices')}
              className={`py-2 px-3 border-b-2 font-medium text-sm ${
                activeTab === 'devices'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              الأجهزة والصيانة
            </button>
            <span className="border-l border-gray-300 mx-2 h-8 self-center"></span>
            <button
              onClick={() => setActiveTab('credit_exceedances')}
              className={`py-2 px-3 border-b-2 font-medium text-sm ${
                activeTab === 'credit_exceedances'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              تجاوزات حد الائتمان
            </button>
          </nav>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <X className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{errorMsg}</p>
            </div>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <UserCheck className="h-5 w-5 text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-800">{successMsg}</p>
            </div>
          </div>
        </div>
      )}



      {/* محتوى التبويبات */}
      {activeTab === 'customers' && (
        <>


          {/* فلاتر البحث */}
          <div className="mb-6 bg-white p-4 rounded-lg shadow">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">البحث</label>
                <input
                  type="text"
                  placeholder="البحث بالاسم أو رقم الهاتف..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">جميع الزبائن</option>
                  <option value="active">زبائن نشطون</option>
                  <option value="inactive">زبائن غير نشطين</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterStatus('all');
                  }}
                  className="w-full bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 flex items-center justify-center gap-2"
                >
                  <RefreshCw size={16} />
                  إعادة تعيين
                </button>
              </div>
            </div>
          </div>

          {/* جدول الزبائن */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الزبون
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      معلومات الاتصال
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الإحصائيات
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الرصيد
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCustomers.map((customer) => {
                    const isOverCredit = (customer.balance || 0) > (customer.credit_limit || 0);
                    return (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <User className="h-6 w-6 text-blue-600" />
                            </div>
                          </div>
                          <div className="mr-4">
                            <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {customer.phone_number && (
                            <div className="flex items-center gap-1 mb-1">
                              <Phone size={14} className="text-gray-400" />
                              {customer.phone_number}
                            </div>
                          )}
                          {customer.mobile_number && (
                            <div className="flex items-center gap-1 mb-1">
                              <Phone size={14} className="text-gray-400" />
                              {customer.mobile_number}
                            </div>
                          )}
                          {customer.email && (
                            <div className="flex items-center gap-1">
                              <Mail size={14} className="text-gray-400" />
                              {customer.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center gap-1 mb-1">
                            <User size={14} className="text-gray-400" />
                            {customer.total_devices || 0} جهاز
                          </div>
                          {customer.address && (
                            <div className="text-xs text-gray-500 truncate max-w-32" title={customer.address}>
                              {customer.address}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-medium ${isOverCredit ? 'text-red-600' : 'text-green-600'}`}>
                            {isOverCredit && <span className="mr-1">⚠</span>}
                          {(customer.balance || 0).toLocaleString()} ل.س
                        </div>
                        <div className="text-xs text-gray-500">
                          حد الائتمان: {(customer.credit_limit || 0).toLocaleString()} ل.س
                        </div>
                        {(customer.balance || 0) === 0 && (
                          <div className="text-xs text-blue-500 mt-1">
                            لا يوجد دين حالياً
                          </div>
                        )}
                          {isOverCredit && (
                            <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
                              <span>⚠</span>
                              <span>تجاوز حد الائتمان!</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openAccountStatement(customer)}
                            className="text-green-600 hover:text-green-900"
                            title="كشف حساب"
                          >
                            <FileText size={16} />
                          </button>
                          <button
                            onClick={() => startEditCustomer(customer)}
                            className="text-blue-600 hover:text-blue-900"
                            title="تعديل"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteCustomer(customer.id)}
                            className="text-red-600 hover:text-red-900"
                            title="حذف"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'accounts' && (
        <>
          {/* رسالة توضيحية للحسابات المدينة */}
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <TrendingDown className="h-5 w-5 text-red-400 mt-0.5" />
              </div>
              <div className="mr-3">
                <p className="text-sm text-red-800">
                  <strong>الحسابات المدينة:</strong> يتم عرض الزبائن الذين لديهم دين حالياً، مرتبين حسب قيمة الدين (الأكبر أولاً).
                  الرصيد محسوب ديناميكياً من الأجهزة غير المسددة مطروحاً منها الدفعات اليدوية فقط.
                </p>
                <p className="text-sm text-red-800 mt-2">
                  <strong>ملاحظة:</strong> في النظام الجديد، لا يتم إنشاء معاملات مالية تلقائية. الرصيد يعتمد على حالة الأجهزة والدفعات اليدوية.
                </p>
              </div>
            </div>
          </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">الحسابات المدينة</h3>
            <p className="text-sm text-gray-500">الزبائن الذين لديهم دين</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الزبون
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الرصيد المدين
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    حد الائتمان
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    آخر معاملة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customers
                  .filter(customer => (customer.balance || 0) > 0)
                  .sort((a, b) => (b.balance || 0) - (a.balance || 0))
                  .map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                              <User className="h-6 w-6 text-red-600" />
                            </div>
                          </div>
                          <div className="mr-4">
                            <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                            <div className="text-sm text-gray-500">{customer.phone_number || customer.mobile_number}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-lg font-bold text-red-600">
                          {(customer.balance || 0).toLocaleString()} ل.س
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {(customer.credit_limit || 0).toLocaleString()} ل.س
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {customer.updated_at ? new Date(customer.updated_at).toLocaleDateString('ar-SA') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openAccountStatement(customer)}
                            className="text-green-600 hover:text-green-900"
                            title="كشف حساب"
                          >
                            <FileText size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setShowPaymentModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                            title="إضافة دفعة"
                          >
                            <CreditCard size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      {activeTab === 'transactions' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <div>
            <h3 className="text-lg font-medium text-gray-900">المعاملات المالية</h3>
            <p className="text-sm text-gray-500">جميع المعاملات المالية للزبائن</p>
          </div>
            <button
              onClick={() => {
                setSelectedCustomer(null);
                setShowPaymentModal(true);
              }}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Plus size={16} />
              إضافة معاملة جديدة
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الزبون
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    نوع المعاملة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    المبلغ
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الوصف
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    التاريخ
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    المرجع
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      لا توجد معاملات مالية لعرضها
                    </td>
                  </tr>
                ) : (
                  transactions.map((transaction) => {
                    const customer = customers.find(c => c.id === transaction.customer_id);
                    return (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{customer?.name || 'غير محدد'}</div>
                          <div className="text-sm text-gray-500">{customer?.phone_number || customer?.mobile_number}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            transaction.type === 'payment' 
                              ? 'bg-green-100 text-green-800' 
                              : transaction.type === 'charge'
                              ? 'bg-red-100 text-red-800'
                              : transaction.type === 'refund'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {transaction.type === 'payment' ? 'دفعة' : 
                             transaction.type === 'charge' ? 'شحنة' : 
                             transaction.type === 'refund' ? 'استرداد' : 
                             transaction.type === 'adjustment' ? 'تعديل' : transaction.type}
                          </span>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                          transaction.type === 'payment' || transaction.type === 'refund'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}>
                          {transaction.type === 'payment' || transaction.type === 'refund' ? '+' : '-'}
                          {transaction.amount.toLocaleString()} ل.س
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{transaction.description}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(transaction.date || transaction.created_at).toLocaleDateString('ar-SA')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {transaction.reference || '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'devices' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">الأجهزة وإجراءات الصيانة</h3>
            <p className="text-sm text-gray-500">عرض جميع الأجهزة وإجراءات الصيانة مع التكاليف</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الزبون
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الجهاز
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    العطل
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    التكلفة الأساسية
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    إجراءات الصيانة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    تكلفة القطع
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    التكلفة الإجمالية
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الربح الصافي
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الحالة
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {devices.map((device) => {
                  const customer = customers.find(c => c.id === device.customer_id);
                  const totalMaintenanceCost = (device.maintenanceActions || []).reduce((sum, action) => sum + (action.cost || 0), 0);
                  const totalPartsCost = (device.maintenanceActions || []).reduce((sum, action) => sum + (action.parts_cost || 0), 0);
                  const totalCost = (device.estimated_cost || 0) + totalMaintenanceCost;
                  const netProfit = totalCost - totalPartsCost;
                  
                  return (
                    <tr key={device.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{customer?.name || 'غير محدد'}</div>
                        <div className="text-sm text-gray-500">{customer?.phone_number || customer?.mobile_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{device.device_type}</div>
                        <div className="text-sm text-gray-500">{device.model}</div>
                        <div className="text-xs text-gray-400">رقم: {device.receipt_number}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{device.issue || device.problem}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(device.estimated_cost || 0).toLocaleString()} ل.س
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {device.maintenanceActions?.length || 0} إجراء
                        </div>
                        {device.maintenanceActions && device.maintenanceActions.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            {device.maintenanceActions.slice(0, 2).map(action => (
                              <div key={action.id} className="flex items-center gap-1">
                                <span>{getMaintenanceActionText(action.action_type)}</span>
                                <span className="text-blue-600">{(action.cost || 0).toLocaleString()} ل.س</span>
                              </div>
                            ))}
                            {device.maintenanceActions.length > 2 && (
                              <div className="text-xs text-gray-400">
                                +{device.maintenanceActions.length - 2} المزيد
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                        {totalPartsCost.toLocaleString()} ل.س
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                        {totalCost.toLocaleString()} ل.س
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        {netProfit.toLocaleString()} ل.س
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${getRepairStatusColor(device.repair_status || '')}`}>
                          {getRepairStatusText(device.repair_status || '')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'credit_exceedances' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">تجاوزات حد الائتمان</h3>
            <p className="text-sm text-gray-500">عرض الزبائن الذين تجاوزوا حد الائتمان</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الزبون
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الرصيد الحالي
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    حد الائتمان
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    التجاوز
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customers.filter(c => (c.balance || 0) > (c.credit_limit || 0)).map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                            <User className="h-6 w-6 text-red-600" />
                          </div>
                        </div>
                        <div className="mr-4">
                          <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-lg font-bold text-red-600">
                        {(customer.balance || 0).toLocaleString()} ل.س
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(customer.credit_limit || 0).toLocaleString()} ل.س
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                      {(customer.balance || 0) - (customer.credit_limit || 0)} ل.س
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openAccountStatement(customer)}
                          className="text-green-600 hover:text-green-900"
                          title="كشف حساب"
                        >
                          <FileText size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setShowPaymentModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="إضافة دفعة"
                        >
                          <CreditCard size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* نموذج إضافة زبون جديد */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">إضافة زبون جديد</h3>
              <form onSubmit={handleAddCustomer} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اسم الزبون *</label>
                  <input
                    type="text"
                    required
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                  <input
                    type="tel"
                    value={newCustomer.phone_number}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">رقم الجوال</label>
                  <input
                    type="tel"
                    value={newCustomer.mobile_number}
                    onChange={(e) => setNewCustomer({ ...newCustomer, mobile_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
                  <textarea
                    value={newCustomer.address}
                    onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">حد الائتمان (ل.س)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newCustomer.credit_limit}
                    onChange={(e) => setNewCustomer({ ...newCustomer, credit_limit: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-4 justify-center">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Plus size={20} />
                    {loading ? 'جاري الإضافة...' : 'إضافة الزبون'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setNewCustomer({ name: '', phone_number: '', mobile_number: '', email: '', address: '', credit_limit: 0 });
                    }}
                    className="bg-gray-300 text-gray-700 py-2 px-6 rounded-md hover:bg-gray-400 flex items-center gap-2"
                  >
                    <X size={20} />
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* نموذج تعديل الزبون */}
      {showEditModal && editingCustomer && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">تعديل بيانات الزبون</h3>
              <form onSubmit={handleEditCustomer} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اسم الزبون *</label>
                  <input
                    type="text"
                    required
                    value={editingCustomer.name}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                  <input
                    type="tel"
                    value={editingCustomer.phone_number || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, phone_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">رقم الجوال</label>
                  <input
                    type="tel"
                    value={editingCustomer.mobile_number || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, mobile_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={editingCustomer.email || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
                  <textarea
                    value={editingCustomer.address || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">حد الائتمان (ل.س)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingCustomer.credit_limit || 0}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, credit_limit: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">كلمة السر الجديدة (اختياري)</label>
                  <input
                    type="password"
                    value={editingCustomer.password || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="اتركها فارغة إذا لا تريد تغيير كلمة السر"
                  />
                </div>
                <div className="flex gap-4 justify-center">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-green-600 text-white py-2 px-6 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Save size={20} />
                    {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingCustomer(null);
                    }}
                    className="bg-gray-300 text-gray-700 py-2 px-6 rounded-md hover:bg-gray-400 flex items-center gap-2"
                  >
                    <X size={20} />
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* نافذة كشف الحساب */}
      {showAccountModal && selectedCustomer && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">كشف حساب الزبون: {selectedCustomer.name}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedCustomer(selectedCustomer);
                      setShowPaymentModal(true);
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
                  >
                    <CreditCard size={16} />
                    إضافة دفعة
                  </button>
                  <button
                    onClick={() => closeAccountModal()}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-blue-600">الرصيد الحالي</div>
                  <div className={`text-xl font-bold ${calculateCustomerBalanceUpdated(selectedCustomer.id, transactions, devices) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {(() => {
                      const balance = calculateCustomerBalanceUpdated(selectedCustomer.id, transactions, devices);
                      console.log('🏦 عرض الرصيد الحالي المحدث:', balance);
                      return balance.toLocaleString();
                    })()} ل.س
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-green-600">إجمالي الدفعات</div>
                  <div className="text-xl font-bold text-green-600">
                    {(() => {
                      const totalPayments = calculateTotalPaymentsUpdated(selectedCustomer.id);
                      console.log('💵 عرض إجمالي الدفعات المحدث:', totalPayments);
                      return totalPayments.toLocaleString();
                    })()} ل.س
                  </div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-sm text-red-600">إجمالي التكاليف</div>
                  <div className="text-xl font-bold text-red-600">
                    {Math.round(getCustomerDevices(selectedCustomer.id).reduce((sum, d) => sum + getActualDeviceCost(d), 0)).toLocaleString()} ل.س
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm text-purple-600">عدد الأجهزة</div>
                  <div className="text-xl font-bold text-purple-600">{getCustomerDevices(selectedCustomer.id).length}</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="text-sm text-orange-600">تكلفة قطع الغيار</div>
                  <div className="text-xl font-bold text-orange-600">
                    {calculatePartsCosts(selectedCustomer.id).toLocaleString()} ل.س
                  </div>
                </div>
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <div className="text-sm text-indigo-600">الربح الصافي</div>
                  <div className="text-xl font-bold text-indigo-600">
                    {calculateNetProfit(selectedCustomer.id).toLocaleString()} ل.س
                  </div>
                </div>
                <div className="bg-teal-50 p-4 rounded-lg">
                  <div className="text-sm text-teal-600">إجراءات الصيانة</div>
                  <div className="text-xl font-bold text-teal-600">
                    {getCustomerDevices(selectedCustomer.id).reduce((total, device) => total + (device.maintenanceActions?.length || 0), 0)} إجراء
                  </div>
                </div>
              </div>

              {/* المعاملات المالية */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-medium text-gray-900">المعاملات المالية</h4>
                  <div className="text-sm text-gray-600">
                    💡 يمكنك تعديل أو حذف المعاملات باستخدام الأزرار في العمود الأخير
                  </div>
                </div>
                <div className="bg-white border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">النوع</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المبلغ</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الوصف</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المرجع</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {transactions.map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(transaction.date).toLocaleDateString('ar-SA')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              transaction.type === 'payment' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {transaction.type === 'payment' ? 'دفعة' : 'مشتريات'}
                            </span>
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                            transaction.type === 'payment' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.amount.toLocaleString()} ل.س
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{transaction.description}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{transaction.reference || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => startEditTransaction(transaction)}
                                className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                                title="تعديل المعاملة"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteTransaction(transaction.id)}
                                className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                                title="حذف المعاملة"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* الأجهزة */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-medium text-gray-900">الأجهزة</h4>
                  <div className="text-sm text-gray-600">
                    💡 يمكنك تعديل أو حذف الأجهزة باستخدام الأزرار في العمود الأخير
                  </div>
                </div>
                <div className="bg-white border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">رقم الإيصال</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الجهاز</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">العطل</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التكلفة الإجمالية</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تم التسليم</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تم التسديد</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getCustomerDevices(selectedCustomer.id).map((device) => (
                        <tr key={device.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {device.receipt_number?.includes('-') ? device.receipt_number.split('-').pop() : device.receipt_number || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {device.device_type}{device.model ? ` - ${device.model}` : ''}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{device.issue || device.problem || '-'}</td>
                          <td className="px-6 py-4 text-sm font-medium text-red-600">
                            {getActualDeviceCost(device).toFixed(2)} ل.س
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${getRepairStatusColor(device.repair_status || '')}`}>
                              {getRepairStatusText(device.repair_status || '')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {device.delivered ? (
                              <span className="inline-block px-2 py-0.5 rounded bg-green-100 text-green-800 text-xs font-bold">نعم</span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs font-bold">لا</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {device.paid ? (
                              <span className="inline-block px-2 py-0.5 rounded bg-green-100 text-green-800 text-xs font-bold">نعم</span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs font-bold">لا</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => startEditDevice(device)}
                                className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                                title="تعديل الجهاز"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteDevice(device.id)}
                                className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                                title="حذف الجهاز"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {getCustomerDevices(selectedCustomer.id).length === 0 && (
                    <div className="text-center text-gray-400 py-8">لا توجد أجهزة لهذا الزبون</div>
                  )}
                  {/* إجمالي القيمة */}
                  {getCustomerDevices(selectedCustomer.id).length > 0 && (
                    <div className="flex flex-col md:flex-row justify-end items-end md:items-center gap-3 mt-6">
                      <div className="bg-green-50 border border-green-200 rounded-lg px-6 py-3 text-lg font-bold text-green-900 shadow">
                        تم التسديد: {' '}
                        {Math.round(getCustomerDevices(selectedCustomer.id)
                          .filter(d => d.paid)
                          .reduce((sum, d) => sum + getActualDeviceCost(d), 0))} ل.س
                      </div>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-6 py-3 text-lg font-bold text-yellow-900 shadow">
                        غير المسددة: {' '}
                        {Math.round(getCustomerDevices(selectedCustomer.id)
                          .filter(d => !d.paid)
                          .reduce((sum, d) => sum + getActualDeviceCost(d), 0))} ل.س
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg px-6 py-3 text-lg font-bold text-blue-900 shadow">
                        الإجمالي: {' '}
                        {Math.round(getCustomerDevices(selectedCustomer.id).reduce((sum, d) => sum + getActualDeviceCost(d), 0))} ل.س
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

            {/* نافذة تعديل الجهاز - محسنة بناءً على DeviceInquiry */}
      {showEditDeviceModal && editingDevice && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-5 mx-auto p-6 border w-11/12 max-w-5xl shadow-xl rounded-lg bg-white">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h3 className="text-2xl font-bold text-gray-900">
                إدارة الجهاز - {editingDevice.receipt_number}
              </h3>
              <button
                onClick={() => {
                  setShowEditDeviceModal(false);
                  setEditingDevice(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleEditDevice}>
              {/* معلومات الجهاز الأساسية */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* العمود الأول - معلومات الجهاز */}
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-3">معلومات الجهاز</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">رقم الإيصال</label>
                        <div className="px-3 py-2 bg-white border border-gray-200 rounded text-gray-700 font-medium text-sm">
                          {editingDevice.receipt_number}
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">نوع الجهاز *</label>
                        <input
                          type="text"
                          required
                          value={editDeviceForm.device_type}
                          onChange={(e) => setEditDeviceForm({
                            ...editDeviceForm,
                            device_type: e.target.value
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="مثال: هاتف، لابتوب..."
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">الموديل</label>
                        <input
                          type="text"
                          value={editDeviceForm.model}
                          onChange={(e) => setEditDeviceForm({
                            ...editDeviceForm,
                            model: e.target.value
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="مثال: iPhone 12..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* العمود الثاني - العطل والتكلفة */}
                <div className="space-y-4">
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="font-medium text-yellow-900 mb-3">العطل والتكلفة</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">العطل *</label>
                        <textarea
                          required
                          value={editDeviceForm.issue}
                          onChange={(e) => setEditDeviceForm({
                            ...editDeviceForm,
                            issue: e.target.value
                          })}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="وصف العطل أو المشكلة..."
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">التكلفة التقديرية (ل.س)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editDeviceForm.estimated_cost}
                          onChange={(e) => setEditDeviceForm({
                            ...editDeviceForm,
                            estimated_cost: parseFloat(e.target.value) || 0
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0"
                        />
                        <p className="text-xs text-gray-500 mt-1">💡 للتقدير فقط</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">التكلفة الإجمالية (ل.س)</label>
                        <div className="px-3 py-2 bg-green-100 border border-green-200 rounded text-green-800 font-medium text-sm">
                          {getTotalMaintenanceCost(editingDevice).toFixed(2)} ل.س
                        </div>
                        <p className="text-xs text-green-600 mt-1">💰 القيمة المعتمدة للتسديد</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* العمود الثالث - الحالة */}
                <div className="space-y-4">
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-medium text-purple-900 mb-3">حالة الجهاز</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">حالة الإصلاح</label>
                        <select
                          value={editDeviceForm.repair_status}
                          onChange={(e) => setEditDeviceForm({
                            ...editDeviceForm,
                            repair_status: e.target.value
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">اختر الحالة...</option>
                          <option value="pending">قيد الانتظار</option>
                          <option value="in-progress">قيد التنفيذ</option>
                          <option value="completed">مكتمل</option>
                          <option value="la-yuslih">لا يصلح</option>
                          <option value="waiting-parts">بانتظار قطع غيار</option>
                          <option value="cancelled">تم الإلغاء</option>
                        </select>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editDeviceForm.delivered}
                            onChange={(e) => setEditDeviceForm({
                              ...editDeviceForm,
                              delivered: e.target.checked
                            })}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">تم التسليم</span>
                        </label>
                        
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editDeviceForm.paid}
                            onChange={(e) => setEditDeviceForm({
                              ...editDeviceForm,
                              paid: e.target.checked
                            })}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">تم التسديد</span>
                        </label>
                      </div>
                      
                      {editDeviceForm.delivered && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ التسليم</label>
                          <input
                            type="date"
                            value={editDeviceForm.delivery_date}
                            onChange={(e) => setEditDeviceForm({
                              ...editDeviceForm,
                              delivery_date: e.target.value
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* إجراءات الصيانة */}
              <div className="bg-green-50 p-4 rounded-lg mb-6">
                <h4 className="font-medium text-green-900 mb-3">إجراءات الصيانة</h4>
                {editingDevice.maintenanceActions && editingDevice.maintenanceActions.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                         {editingDevice.maintenanceActions.map((action, index) => (
                       <div key={action.id} className="bg-white p-3 rounded border border-green-200">
                         <div className="flex justify-between items-start mb-2">
                           <span className="font-medium text-gray-900 text-sm">{getMaintenanceActionText(action.action_type)}</span>
                           <span className={`px-2 py-1 text-xs rounded ${getRepairStatusColor(action.status)}`}>
                             {getRepairStatusText(action.status)}
                           </span>
                         </div>
                         <div className="text-right">
                           <div className="font-medium text-green-700">{action.cost.toFixed(2)} ل.س</div>
                           {action.parts_cost && action.parts_cost > 0 && (
                             <div className="text-xs text-gray-500">قطع غيار: {action.parts_cost.toFixed(2)} ل.س</div>
                           )}
                         </div>
                       </div>
                     ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="text-gray-500">لا توجد إجراءات صيانة لهذا الجهاز</div>
                  </div>
                )}
                
                <div className="mt-4 pt-3 border-t border-green-200">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-900">المجموع:</span>
                    <span className="font-bold text-green-700 text-lg">
                      {getTotalMaintenanceCost(editingDevice).toFixed(2)} ل.س
                    </span>
                  </div>
                </div>
              </div>
              
              {/* أزرار الإجراءات */}
              <div className="flex justify-end gap-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditDeviceModal(false);
                    setEditingDevice(null);
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-gradient-to-l from-blue-600 to-blue-700 text-white rounded hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                >
                  {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة تعديل المعاملة المالية */}
      {showEditTransactionModal && editingTransaction && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
                تعديل المعاملة المالية
              </h3>
              <form onSubmit={handleEditTransaction} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">نوع المعاملة</label>
                  <div className="px-3 py-2 bg-gray-100 rounded-md text-gray-700">
                    {editingTransaction.type === 'payment' ? 'دفعة' : 'مشتريات'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={editTransactionForm.amount}
                    onChange={(e) => setEditTransactionForm({
                      ...editTransactionForm,
                      amount: parseFloat(e.target.value) || 0
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الوصف *</label>
                  <textarea
                    required
                    value={editTransactionForm.description}
                    onChange={(e) => setEditTransactionForm({
                      ...editTransactionForm,
                      description: e.target.value
                    })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">المرجع</label>
                  <input
                    type="text"
                    value={editTransactionForm.reference}
                    onChange={(e) => setEditTransactionForm({
                      ...editTransactionForm,
                      reference: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ *</label>
                  <input
                    type="date"
                    required
                    value={editTransactionForm.date}
                    onChange={(e) => setEditTransactionForm({
                      ...editTransactionForm,
                      date: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-4 justify-center">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-green-600 text-white py-2 px-6 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Save size={20} />
                    {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditTransactionModal(false);
                      setEditingTransaction(null);
                    }}
                    className="bg-gray-300 text-gray-700 py-2 px-6 rounded-md hover:bg-gray-400 flex items-center gap-2"
                  >
                    <X size={20} />
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* نافذة إضافة دفعة أو معاملة */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
                {selectedCustomer ? `إضافة دفعة للزبون: ${selectedCustomer.name}` : 'إضافة معاملة مالية جديدة'}
              </h3>
              <form onSubmit={selectedCustomer ? handleAddPayment : handleAddTransaction} className="space-y-4">
                {!selectedCustomer && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">اختر الزبون *</label>
                    <select
                      required
                      onChange={(e) => {
                        const customer = customers.find(c => c.id === e.target.value);
                        setSelectedCustomer(customer || null);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">اختر زبون...</option>
                      {customers.map(customer => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name} - {customer.phone_number || customer.mobile_number}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment({ ...newPayment, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
                  <input
                    type="text"
                    value={newPayment.description}
                    onChange={(e) => setNewPayment({ ...newPayment, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">المرجع</label>
                  <input
                    type="text"
                    value={newPayment.reference}
                    onChange={(e) => setNewPayment({ ...newPayment, reference: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-4 justify-center">
                  <button
                    type="submit"
                    disabled={loading || (!selectedCustomer && activeTab === 'transactions')}
                    className="bg-green-600 text-white py-2 px-6 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <CreditCard size={20} />
                    {loading ? 'جاري الإضافة...' : (selectedCustomer ? 'إضافة الدفعة' : 'إضافة المعاملة')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPaymentModal(false);
                      setNewPayment({ amount: 0, description: '', reference: '' });
                      setSelectedCustomer(null);
                    }}
                    className="bg-gray-300 text-gray-700 py-2 px-6 rounded-md hover:bg-gray-400 flex items-center gap-2"
                  >
                    <X size={20} />
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* في return JSX الرئيسي أضف: */}
      <ToastContainer position="top-right" autoClose={5000} />
    </div>
  );
};

export default CustomerManagement; 