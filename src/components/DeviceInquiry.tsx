import Select from 'react-select';
import React, { useState } from 'react';
import { Device, Customer, MaintenanceAction } from '../types';
import { getSupabaseClient } from '../supabaseClient';
import { Search, Edit, Truck, DollarSign, CheckCircle, XCircle, Clock, Plus, Wrench, Trash2 } from 'lucide-react';
import { User, Smartphone } from 'lucide-react';
import { FileText } from 'lucide-react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { hasCurrentUserPermission } from '../hooks/usePermission';

// ===== إصلاحات التحديث المستمر =====
// تم إصلاح dependency arrays في useEffect لتجنب التحديث المستمر
// =====================================

interface DeviceInquiryProps {
  devices?: any[];
  customers?: any[];
  technicians?: any[];
  loading?: boolean;
}

const DeviceInquiry: React.FC<DeviceInquiryProps> = (props) => {
  const [statusFilter, setStatusFilter] = React.useState<string>("in-shop");
  const supabase = getSupabaseClient();

  // التحقق من الصلاحيات
  const canEditDevices = hasCurrentUserPermission('EDIT_DEVICES') || hasCurrentUserPermission('ACCESS_DEVICES') || hasCurrentUserPermission('ADMIN_ACCESS');
  const canDeleteDevices = hasCurrentUserPermission('DELETE_DEVICES') || hasCurrentUserPermission('ADMIN_ACCESS');
  const canEditMaintenance = hasCurrentUserPermission('EDIT_DEVICES') || hasCurrentUserPermission('ADMIN_ACCESS');
  const canDeleteMaintenance = hasCurrentUserPermission('EDIT_DEVICES') || hasCurrentUserPermission('ADMIN_ACCESS');

  // تشخيص الصلاحيات
  console.log('DeviceInquiry - Permissions Debug:', {
    EDIT_DEVICES: hasCurrentUserPermission('EDIT_DEVICES'),
    DELETE_DEVICES: hasCurrentUserPermission('DELETE_DEVICES'),
    ACCESS_DEVICES: hasCurrentUserPermission('ACCESS_DEVICES'),
    ADMIN_ACCESS: hasCurrentUserPermission('ADMIN_ACCESS'),
    canEditDevices,
    canDeleteDevices,
    canEditMaintenance,
    canDeleteMaintenance
  });

  const [devices, setDevices] = useState<Device[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  // دالة لتصفير جميع إجراءات الصيانة من Supabase
  const clearAllMaintenanceActions = async () => {
    if (!window.confirm('سيتم حذف جميع إجراءات الصيانة من قاعدة البيانات. هل أنت متأكد؟')) return;
    try {
      // Supabase/Postgres API يتطلب شرط WHERE عند الحذف الجماعي
      const { error } = await supabase.from('maintenance_actions').delete().not('id', 'is', null);
      if (error) {
        alert('حدث خطأ أثناء تصفير جدول إجراءات الصيانة: ' + error.message);
        console.error('clearAllMaintenanceActions error:', error);
      } else {
        alert('تم حذف جميع إجراءات الصيانة بنجاح.');
        // تصفير الإجراءات محلياً فوراً
        setDevices(prevDevices => prevDevices.map(device => ({
          ...device,
          maintenanceActions: []
        })));
        // إعادة جلب الأجهزة لتحديث الواجهة من السيرفر (اختياري)
        fetchDevices();
      }
    } catch (e) {
      alert('حدث خطأ غير متوقع أثناء تصفير الجدول.');
      console.error('clearAllMaintenanceActions exception:', e);
    }
  };

  // جلب الأجهزة من Supabase
  // جعل fetchDevices متاحة للاستخدام في أماكن أخرى
  const fetchDevices = async () => {
    // جلب الأجهزة
    const { data: devicesData, error: devicesError } = await supabase.from('devices').select('*');
    if (devicesError || !devicesData) {
      alert('خطأ في جلب الأجهزة: ' + (devicesError?.message || ''));
      console.error('خطأ في جلب الأجهزة:', devicesError);
      return;
    }

    // جلب جميع إجراءات الصيانة
    const { data: actionsData, error: actionsError } = await supabase.from('maintenance_actions').select('*');
    if (actionsError) {
      alert('خطأ في جلب إجراءات الصيانة: ' + actionsError.message);
      console.error('خطأ في جلب إجراءات الصيانة:', actionsError);
    }

    // تطبيع snake_case إلى camelCase
    function toCamelCase(str: string) {
      return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    }
    function normalizeKeys(obj: any): any {
      if (Array.isArray(obj)) return obj.map(normalizeKeys);
      if (obj !== null && typeof obj === 'object') {
        const newObj: any = {};
        for (const key in obj) {
          if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
          let camelKey = toCamelCase(key);
          if (key === 'customer_id') camelKey = 'customerId';
          newObj[camelKey] = normalizeKeys(obj[key]);
        }
        return newObj;
      }
      return obj;
    }

    // تطبيع إجراءات الصيانة
    const normalizedActions = (actionsData || []).map(normalizeKeys);

    // ربط الإجراءات مع الأجهزة حسب device_id
    const normalizedDevices = devicesData.map((device: any) => {
      const deviceId = device.id;
      const deviceActions = normalizedActions.filter((action: any) => action.deviceId === deviceId);
      return {
        ...normalizeKeys(device),
        maintenanceActions: deviceActions
      };
    });
    setDevices(normalizedDevices);
    console.log('devices from supabase:', normalizedDevices);
  };
  React.useEffect(() => {
    fetchDevices();
  }, []);

  // جلب الزبائن من Supabase
  React.useEffect(() => {
    const fetchCustomers = async () => {
      const { data, error } = await supabase.from('customers').select('*');
      if (!error && data) {
        // تطبيع الحقول من snake_case إلى camelCase
        const normalized = data.map((c: any) => ({
          ...c,
          phoneNumber: c.phone_number,
          mobileNumber: c.mobile_number,
        }));
        setCustomers(normalized);
        console.log('customers from supabase:', normalized);
      } else if (error) {
        alert('خطأ في جلب الزبائن: ' + error.message);
        console.error('خطأ في جلب الزبائن:', error);
      }
    };
    fetchCustomers();
  }, []);

  // جلب الفنيين من Supabase
  React.useEffect(() => {

    const fetchTechnicians = async () => {
      const { data, error } = await supabase.from('technicians').select('*');
      if (!error && data) setTechnicians(data);
      else if (error) console.error('خطأ في جلب الفنيين:', error);
    };
    fetchTechnicians();
  }, []);

  // جلب المعاملات المالية من Supabase
  React.useEffect(() => {
    const fetchTransactions = async () => {
      const { data, error } = await supabase.from('customer_transactions').select('*');
      if (!error && data) {
        setTransactions(data);
        console.log('transactions from supabase:', data);
      } else if (error) {
        console.error('خطأ في جلب المعاملات المالية:', error);
      }
    };
    fetchTransactions();
  }, []);


  const [searchTerm, setSearchTerm] = useState('');
  // حالة لتعديل إجراء الصيانة
  const [editAction, setEditAction] = useState<import('../types').Maintenance_Action | null>(null);
  // تم نقل تعريف statusFilter للأعلى بقيمة افتراضية 'in-shop'، لا تكرر التعريف هنا
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [deviceForAction, setDeviceForAction] = useState<Device | null>(null);
  const [newMaintenanceAction, setNewMaintenanceAction] = useState<Partial<MaintenanceAction>>({
    //action_type: 'screen-replacement',
    //description: '',
    cost: 0,
    status: 'pending',
    notes: ''
  });
  const [showExtraDeviceInfo, setShowExtraDeviceInfo] = useState(false);

  // ترتيب الأجهزة حسب رقم الإيصال تصاعدياً بعد الفلترة النهائية
  // فلترة ثم ترتيب حسب رقم الإيصال
  const filteredDevices = devices
    .filter(device => {
      const customer = customers.find(c => c.id === device.customerId);
      const matchesSearch =
        (device.receiptNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        (device.imei?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        (device.model?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        (customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false);

      let matchesStatus = true;
      switch (statusFilter) {
        case 'waiting-maintenance':
          matchesStatus = device.repairStatus === 'pending';
          break;
        case 'in-progress':
          matchesStatus = device.repairStatus === 'in-progress';
          break;
        case 'ready':
          matchesStatus = device.repairStatus === 'completed' && device.delivered === false;
          break;
        case 'la-yuslih':
          matchesStatus = device.repairStatus === 'la-yuslih';
          break;
        case 'in-shop':
          matchesStatus = device.delivered === false;
          break;
        case 'delivered-not-paid':
          matchesStatus = device.delivered && !device.paid;
          break;
        case 'waiting-parts':
          matchesStatus = device.repairStatus === 'waiting-parts';
          break;
        case 'cancelled':
          matchesStatus = device.repairStatus === 'cancelled';
          break;
        case 'un-delivered':
          matchesStatus = (device.delivered !== true) && !device.deliveryDate;
          break;
        case 'all':
        default:
          matchesStatus = true;
      }
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const aNum = parseInt(a.receiptNumber.replace(/\D/g, ''));
      const bNum = parseInt(b.receiptNumber.replace(/\D/g, ''));
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }
      return a.receiptNumber.localeCompare(b.receiptNumber, 'ar', { numeric: true });
    });


  const getStatusBadge = (status: Device['repairStatus']) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Clock size={12} />قيد الانتظار</span>;
      case 'in-progress':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><Edit size={12} />قيد الإصلاح</span>;
      case 'completed':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle size={12} />تم الإصلاح</span>;
      case 'la-yuslih':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle size={12} />لا يصلح</span>;
      case 'waiting-parts':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-900"><Clock size={12} />بانتظار قطع غيار</span>;
      case 'cancelled':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-red-700"><XCircle size={12} />تم الإلغاء من قبل العميل</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">غير محدد</span>;
    }
  };


  const getActionTypeLabel = (actionType: MaintenanceAction['actionType']) => {
    const labels = {
        // 🟦 أعطال الشاشة
  'screen-replacement': 'تغيير شاشة',
  'touch-replacement': 'تبديل تاتش',
  'screen-touch-replacement': 'تبديل شاشة + تاتش',
  'oled-screen-replacement': 'تبديل شاشة أوليد',
  'glass-replacement': 'تبديل زجاج (بلورة)',
  'service-screen': 'شاشة سيرفس',
  'screen-calibration': 'صيانة بيانات شاشة',
  'screen-class-b': 'شاشة شنج كلاس',
  'device-screen-swap': 'شاشة سحب جهاز',
  'screen-flex-replacement': 'تبديل فلاتة شاشة',

  // 🔌 أعطال الشحن والطاقة
  'charging-port-repair': 'إصلاح منفذ الشحن',
  'charging-board-original': 'تبديل بورد شحن أصلي',
  'charging-board-copy': 'تبديل بورد شحن كوبي',
  'charging-issue-repair': 'صيانة مشاكل شحن',
  'battery-replacement': 'تغيير بطارية',
  'power-ic-repair': 'إصلاح IC الطاقة',

  // 🔊 أعطال الصوت والكاميرا
  'speaker-repair': 'إصلاح السماعة',
  'microphone-repair': 'إصلاح المايكروفون',
  'earpiece-repair': 'إصلاح سماعة المكالمات',
  'camera-repair': 'إصلاح الكاميرا',
  'camera-replacement': 'تبديل الكاميرا',

  // 💻 أعطال السوفتوير
  'software-repair': 'إصلاح نظام التشغيل',
  'formatting': 'تهيئة الجهاز (فورمات)',
  'firmware-update': 'تحديث النظام',
  'frp-unlock': 'فك حماية FRP',

  // 🔧 أعطال الهاردوير العامة
  'hardware-repair': 'إصلاح هاردوير',
  'motherboard-replacement': 'تبديل بورد',
  'ic-replacement': 'تبديل IC',
  'button-repair': 'إصلاح أزرار (باور / فوليوم)',
  'sensor-repair': 'إصلاح الحساسات',
  'back-cover-replacement': 'تبديل غطاء خلفي',

  // 🧪 أعطال متقدمة
  'water-damage-repair': 'إصلاح أضرار المياه',
  'no-power-repair': 'إصلاح عطل عدم التشغيل',
  'network-issue-repair': 'صيانة الشبكة / الإشارة',
  'charging-ic-repair': 'إصلاح IC شحن',

  // ⚙️ الحالة العامة / الإدارية
  'nothing-found': 'لا يوجد عطل',
  'all-fixed': 'تم إصلاح جميع الأعطال',
  'no-parts': 'لا توجد قطع متوفرة',
  'cancel-repair': 'تم إلغاء الصيانة',
  'fixed-free': 'تم الإصلاح بدون تكلفة',
  'other': 'عطل آخر',
    };
    return labels[actionType] || actionType;
  };

  // تحديث حالة الجهاز في Supabase
  const updateDeviceStatus = async (deviceId: string, updates: Partial<Device>) => {
    // تحويل جميع الحقول إلى snake_case وعدم إرسال أي حقل غير موجود في قاعدة البيانات
    const allowedFields = [
      'receipt_number', 'entry_date', 'barcode', 'customer_id', 'device_type', 'model', 'imei', 'issue_type', 'issue', 'secret_code',
      'estimated_cost', 'paper_receipt_number', 'has_sim', 'has_battery', 'has_memory', 'notes', 'repair_status', 'delivered', 'paid',
      'delivery_date', 'technician_id', 'maintenance_actions'
    ];
    function toSnakeCase(str: string) {
      return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }
    const dbUpdates: any = {};
    for (const key in updates) {
      let snakeKey = toSnakeCase(key);
      if (key === 'customerId') snakeKey = 'customer_id';
      if (key === 'deviceType') snakeKey = 'device_type';
      if (key === 'entryDate') snakeKey = 'entry_date';
      if (key === 'issueType') snakeKey = 'issue_type';
      if (key === 'paperReceiptNumber') snakeKey = 'paper_receipt_number';
      if (key === 'hasSim') snakeKey = 'has_sim';
      if (key === 'hasBattery') snakeKey = 'has_battery';
      if (key === 'hasMemory') snakeKey = 'has_memory';
      if (key === 'repairStatus') snakeKey = 'repair_status';
      if (key === 'deliveryDate') snakeKey = 'delivery_date';
      if (key === 'technicianId') snakeKey = 'technician_id';
      if (key === 'estimatedCost') snakeKey = 'estimated_cost';
      if (key === 'maintenanceActions') snakeKey = 'maintenance_actions';
      if (allowedFields.includes(snakeKey)) {
        let value = (updates as any)[key];
        // تحويل التواريخ إلى نصوص ISO
        if (value instanceof Date) value = value.toISOString();
        dbUpdates[snakeKey] = value;
      }
    }
    const { error } = await supabase.from('devices').update(dbUpdates).eq('id', deviceId);
    if (error) alert('خطأ في تحديث حالة الجهاز: ' + error.message);
    // إعادة جلب الأجهزة
    const { data } = await supabase.from('devices').select('*');
    if (data) {
      // تطبيع كما في الأعلى
      function toCamelCase(str: string) {
        return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      }
      function normalizeKeys(obj: any): any {
        if (Array.isArray(obj)) return obj.map(normalizeKeys);
        if (obj !== null && typeof obj === 'object') {
          const newObj: any = {};
          for (const key in obj) {
            if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
            let camelKey = toCamelCase(key);
            if (key === 'customer_id') camelKey = 'customerId';
            if (camelKey === 'maintenanceActions') {
              newObj[camelKey] = Array.isArray(obj[key]) ? obj[key] : (obj[key] ? JSON.parse(obj[key]) : []);
            } else {
              newObj[camelKey] = normalizeKeys(obj[key]);
            }
          }
          return newObj;
        }
        return obj;
      }
      setDevices(data.map(normalizeKeys));
    }
  };


  // إضافة إجراء صيانة إلى جدول maintenance_actions في قاعدة البيانات السحابية
  const addMaintenanceAction = async () => {
    if (!deviceForAction) return;

    // إذا كان هذا أول إجراء صيانة للجهاز وحالته 'pending'، غيّرها إلى 'in-progress'
    if (deviceForAction.maintenanceActions.length === 0 && deviceForAction.repairStatus === 'pending') {
      setDevices(prevDevices => prevDevices.map(device =>
        device.id === deviceForAction.id
          ? { ...device, repairStatus: 'in-progress' }
          : device
      ));
      setSelectedDevice(prev =>
        prev && prev.id === deviceForAction.id
          ? { ...prev, repairStatus: 'in-progress' }
          : prev
      );
    }
    const { data, error } = await supabase.from('maintenance_actions').insert([
      {
        device_id: deviceForAction.id,
        action_type: newMaintenanceAction.action_type,
        cost: newMaintenanceAction.cost || 0,
        parts_cost: typeof newMaintenanceAction.partsCost === 'number' ? newMaintenanceAction.partsCost : 0,
        status: newMaintenanceAction.status,
        technician_id: newMaintenanceAction.technicianId
      }
    ]).select();
    if (error) {
      alert('خطأ في إضافة إجراء الصيانة: ' + error.message);
      return;
    }
    if (data && data[0]) {
      // تطبيع بيانات الإجراء الجديد
      const toCamelCase = (str: string) => str.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase());
      const normalizeKeys = (obj: any): any => {
        if (Array.isArray(obj)) return obj.map(normalizeKeys);
        if (obj !== null && typeof obj === 'object') {
          const newObj: any = {};
          for (const key in obj) {
            if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
            let camelKey = toCamelCase(key);
            if (key === 'customer_id') camelKey = 'customerId';
            if (key === 'device_id') camelKey = 'deviceId';
            newObj[camelKey] = normalizeKeys(obj[key]);
          }
          return newObj;
        }
        return obj;
      };
      const normalizedAction = normalizeKeys(data[0]);
      setDevices(prevDevices => prevDevices.map(device =>
        device.id === deviceForAction.id
          ? { ...device, maintenanceActions: [...(device.maintenanceActions || []), normalizedAction] }
          : device
      ));
      setSelectedDevice(prev =>
        prev && prev.id === deviceForAction.id
          ? { ...prev, maintenanceActions: [...(prev.maintenanceActions || []), normalizedAction] }
          : prev
      );
      setNewMaintenanceAction({
        action_type: 'screen-replacement',
        description: '',
        cost: 0,
        partsCost: 0,
        status: 'pending',
        notes: '',
        technicianId: undefined
      });
      setShowMaintenanceModal(false);
      setEditAction(null);
      setDeviceForAction(null);
    }
  };


  // تعديل إجراء صيانة في جدول maintenance_actions في قاعدة البيانات السحابية
  const updateMaintenanceAction = async (actionId: string, updates: Partial<MaintenanceAction>) => {
    if (!actionId) return;
    // فقط الحقول المسموحة في جدول maintenance_actions
    const allowedFields = [
      'action_type', 'cost', 'parts_cost', 'status', 'technician_id', 'device_id'
    ];
    // تحويل camelCase إلى snake_case وتصفية الحقول
    const dbUpdates: any = {};
    for (const key in updates) {
      let snakeKey = key;
      if (key === 'actionType') snakeKey = 'action_type';
      else if (key === 'technicianId') snakeKey = 'technician_id';
      else if (key === 'partsCost') snakeKey = 'parts_cost';
      else if (key === 'deviceId') snakeKey = 'device_id';
      else if (key === 'completedDate' || key === 'description' || key === 'notes') continue; // تجاهل الحقول غير الموجودة أو المحذوفة
      if (allowedFields.includes(snakeKey)) {
        dbUpdates[snakeKey] = (updates as any)[key];
      }
    }
    const { data, error } = await supabase
      .from('maintenance_actions')
      .update(dbUpdates)
      .eq('id', actionId)
      .select();
    if (error) {
      alert('خطأ في تعديل إجراء الصيانة: ' + error.message);
      return;
    }
    if (data && data[0]) {
      // تطبيع بيانات الإجراء المعدل
      const toCamelCase = (str: string) => str.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase());
      const normalizeKeys = (obj: any): any => {
        if (Array.isArray(obj)) return obj.map(normalizeKeys);
        if (obj !== null && typeof obj === 'object') {
          const newObj: any = {};
          for (const key in obj) {
            if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
            let camelKey = toCamelCase(key);
            if (key === 'customer_id') camelKey = 'customerId';
            if (key === 'device_id') camelKey = 'deviceId';
            newObj[camelKey] = normalizeKeys(obj[key]);
          }
          return newObj;
        }
        return obj;
      };
      const normalizedAction = normalizeKeys(data[0]);
      setDevices(prevDevices => prevDevices.map(device =>
        device.id === normalizedAction.deviceId
          ? {
            ...device,
            maintenanceActions: device.maintenanceActions.map((action: any) =>
              action.id === normalizedAction.id ? normalizedAction : action
            )
          }
          : device
      ));
      setSelectedDevice(prev =>
        prev && prev.id === normalizedAction.deviceId
          ? {
            ...prev,
            maintenanceActions: prev.maintenanceActions.map((action: any) =>
              action.id === normalizedAction.id ? normalizedAction : action
            )
          }
          : prev
      );
      setNewMaintenanceAction({
        action_type: 'screen-replacement',
        cost: 0,
        partsCost: 0,
        status: 'pending',
        technicianId: undefined
      });
      setShowMaintenanceModal(false);
      setEditAction(null);
      setDeviceForAction(null);
    }
  };


  // حذف إجراء صيانة من جدول maintenance_actions في قاعدة البيانات السحابية
  const deleteMaintenanceAction = async (actionId: string) => {
    if (!canDeleteMaintenance) {
      alert('ليس لديك صلاحية لتعديل الأجهزة');
      return;
    }
    
    if (!actionId || !window.confirm('هل أنت متأكد من حذف هذا الإجراء؟')) return;
    // الحصول على device_id للإجراء المحذوف
    let deviceIdOfAction: string | undefined;
    devices.forEach(device => {
      if (device.maintenanceActions.some((action: any) => action.id === actionId)) {
        deviceIdOfAction = device.id;
      }
    });
    const { error } = await supabase
      .from('maintenance_actions')
      .delete()
      .eq('id', actionId);
    if (error) {
      alert('خطأ في حذف إجراء الصيانة: ' + error.message);
      return;
    }
    if (deviceIdOfAction) {
      setDevices(prevDevices => prevDevices.map(device =>
        device.id === deviceIdOfAction
          ? { ...device, maintenanceActions: device.maintenanceActions.filter((action: any) => action.id !== actionId) }
          : device
      ));
      setSelectedDevice(prev =>
        prev && prev.id === deviceIdOfAction
          ? { ...prev, maintenanceActions: prev.maintenanceActions.filter((action: any) => action.id !== actionId) }
          : prev
      );
    }
  };

  const getCustomerInfo = (customerId: string): Customer | undefined => {
    return customers.find(c => c.id === customerId);
  };

  const getTechnicianName = (technicianId?: string): string => {
    if (!technicianId) return 'غير محدد';
    const technician = technicians.find(t => t.id === technicianId);
    return technician ? technician.name : 'غير محدد';
  };

  const getTotalMaintenanceCost = (device: Device): number => {
    return device.maintenanceActions.reduce((total, action) => total + action.cost, 0);
  };

  // دالة حساب التكلفة الفعلية للجهاز (مثل CustomerManagement)
  const getActualDeviceCost = (device: Device): number => {
    const maintenanceCost = device.maintenanceActions?.reduce((total, action) => total + (action.cost || 0), 0) || 0;
    return maintenanceCost;
  };

  // دالة حساب الرصيد الصحيح للزبون (مثل CustomerManagement)
  const calculateCustomerBalanceUpdated = (customerId: string) => {
    // حساب من المعاملات المالية (الدفعات اليدوية فقط)
    const transactionPayments = transactions
      .filter(t => t.customer_id === customerId && t.type === 'payment')
      .reduce((sum, t) => sum + t.amount, 0);
    
    // حساب من الأجهزة غير المسددة (استخدام التكلفة الفعلية)
    const unpaidDevicesCost = getCustomerDevices(customerId)
      .filter(device => !device.paid && device.delivered)
      .reduce((sum, device) => sum + getActualDeviceCost(device), 0);
    
    // حساب من الأجهزة المسددة (كدفعات)
    const paidDevicesCost = getCustomerDevices(customerId)
      .filter(device => device.paid)
      .reduce((sum, device) => sum + getActualDeviceCost(device), 0);
    
    // الرصيد النهائي = تكاليف الأجهزة غير المسددة - الدفعات اليدوية
    const finalBalance = unpaidDevicesCost - transactionPayments;
    
    return finalBalance;
  };

  // دالة حساب إجمالي الدفعات المحدثة
  const calculateTotalPaymentsUpdated = (customerId: string) => {
    // الدفعات من المعاملات المالية (اليدوية فقط)
    const transactionPayments = transactions
      .filter(t => t.customer_id === customerId && t.type === 'payment')
      .reduce((sum, t) => sum + t.amount, 0);
    
    // الدفعات من الأجهزة المسددة (استخدام التكلفة الفعلية)
    const devicePayments = getCustomerDevices(customerId)
      .filter(device => device.paid)
      .reduce((sum, device) => sum + getActualDeviceCost(device), 0);
    
    // إجمالي الدفعات = الدفعات اليدوية + الدفعات من الأجهزة المسددة
    const totalPayments = transactionPayments + devicePayments;
    
    return totalPayments;
  };

  // كشف حساب الزبون
  const [showCustomerStatement, setShowCustomerStatement] = React.useState(false);
  const [statementCustomer, setStatementCustomer] = React.useState<any>(null);
  const getCustomerDevices = (customerId: string) =>
    devices.filter((d) => d.customerId === customerId);



  // أضف الدالة بعد تعريف الدوال الأخرى:
  const deleteDevice = async (deviceId: string) => {
    if (!canDeleteDevices) {
      alert('ليس لديك صلاحية لحذف الأجهزة');
      return;
    }
    if (!deviceId || !window.confirm('هل أنت متأكد من حذف هذا الجهاز؟')) return;
    const { error } = await supabase.from('devices').delete().eq('id', deviceId);
    if (error) {
      alert('حدث خطأ أثناء حذف الجهاز: ' + error.message);
      return;
    }
    setDevices(prev => prev.filter(d => d.id !== deviceId));
    setSelectedDevice(null);
  };

  return (
    <div className="space-y-6">
      {/* بطاقات ملخص الحالات */}
      <div className="grid grid-cols-5 gap-4 w-full bg-white z-50 shadow-lg px-4 py-2 mb-6" style={{ direction: 'rtl' }}>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-full">
              <Smartphone size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">إجمالي الأجهزة</p>
              <p className="text-2xl font-bold text-gray-900">{devices.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 rounded-full">
              <Clock size={24} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">قيد الانتظار</p>
              <p className="text-2xl font-bold text-gray-900">{devices.filter(d => d.repairStatus === 'pending').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-full">
              <Wrench size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">قيد الإصلاح</p>
              <p className="text-2xl font-bold text-gray-900">{devices.filter(d => d.repairStatus === 'in-progress').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle size={24} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">مكتمل</p>
              <p className="text-2xl font-bold text-gray-900">{devices.filter(d => d.repairStatus === 'completed').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-full">
              <Wrench size={24} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">لا يصلح</p>
              <p className="text-2xl font-bold text-gray-900">{devices.filter(d => d.repairStatus === 'la-yuslih').length}</p>
            </div>
          </div>
        </div>
      </div>
      {/* Search and Filter + زر تصفير الإجراءات */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="البحث برقم الإيصال، IMEI، الموديل، أو اسم الزبون..."
              className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Search size={20} className="absolute right-3 top-2.5 text-gray-400" />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">جميع الأجهزة</option>
            <option value="waiting-maintenance">بانتظار بدء الصيانة</option>
            <option value="in-progress">قيد الإصلاح</option>
            <option value="ready">تم الإصلاح – جاهز للتسليم</option>
            <option value="la-yuslih">لا يصلح</option>
            <option value="in-shop">أجهزة في المحل – لم تُسلّم</option>
            <option value="delivered-not-paid">أجهزة مسلّمة – لم تُسدد</option>
            <option value="waiting-parts">بانتظار قطع غيار</option>
            <option value="cancelled">تم الإلغاء من قبل العميل</option>
          </select>
        </div>
      </div>

      {/* Devices Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-1 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[60px] min-w-[50px] max-w-[70px] whitespace-nowrap">رقم الإيصال</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الزبون</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الجهاز</th>
                <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-1 min-w-[90px] max-w-[120px] whitespace-nowrap">رقم الإيمي</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">العطل</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-1 whitespace-nowrap">الحالة</th>
                <th className="px-10 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px]">إجراءات الصيانة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التكلفة الإجمالية</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDevices.map((device) => {
                const customer = getCustomerInfo(device.customerId);
                const maintenanceTotal = getTotalMaintenanceCost(device);
                return (
                  <tr key={device.id} className="hover:bg-gray-50">
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 w-1">
                      {device.receiptNumber ? (device.receiptNumber.includes('-') ? device.receiptNumber.split('-').pop() : device.receiptNumber) : '---'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-medium">{customer?.name}</div>
                      <div className="text-sm text-gray-500 mb-1">{customer?.mobileNumber}</div>
                      {customer && (
                        <div className="mt-1">
                          <button
                            className="text-xs text-blue-700 border border-blue-200 rounded px-2 py-0.5 hover:bg-blue-50 transition"
                            onClick={() => {
                              setStatementCustomer(customer);
                              setShowCustomerStatement(true);
                            }}
                          >
                            كشف حساب
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{device.deviceType}</div>
                      <div className="text-sm text-gray-500">{device.model}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {device.imei}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{device.issue}</div>
                      <div className="text-sm text-gray-500">
                        {device.issueType === 'hardware' ? 'هاردوير' : 'سوفتوير'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {/* عرض حالة الجهاز بناءً على repairStatus */}
                      <div className="w-20 truncate">{getStatusBadge(device.repairStatus)}</div>
                    </td>
                    <td className="px-10 py-4 whitespace-nowrap align-top text-sm text-gray-900 min-w-[180px]">
                      <div className="text-sm text-gray-900">
                        {device.maintenanceActions.length} إجراء
                      </div>
                      {device.maintenanceActions.length > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          {device.maintenanceActions.slice(0, 2).map(action => (
                            <div key={action.id} className="flex items-center gap-1">
                              <span>{getActionTypeLabel(action.action_type ?? 'other')}</span>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {/* القيمة التقديرية */}
                      <div className="text-xs text-gray-500">القيمة التقديرية : {device.estimatedCost ? `${device.estimatedCost} $` : <span className="text-gray-300">---</span>}</div>
                      {/* التكلفة الإجمالية */}
                      <div className="font-bold text-blue-900 mt-1">{getActualDeviceCost(device) > 0 ? `${getActualDeviceCost(device)} $` : <span className="text-gray-300">---</span>}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center flex gap-2 justify-center">
                      <button
                        onClick={() => setSelectedDevice(device)}
                        className={`${canEditDevices ? 'text-blue-600 hover:text-blue-900 bg-blue-50' : 'text-gray-400 cursor-not-allowed bg-gray-50'} rounded p-1`}
                        title={canEditDevices ? "إدارة الجهاز" : "ليس لديك صلاحية لتعديل الأجهزة"}
                        disabled={!canEditDevices}
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => deleteDevice(device.id)}
                        className={`${canDeleteDevices ? 'text-red-600 hover:text-red-800 bg-red-50' : 'text-gray-400 cursor-not-allowed bg-gray-50'} rounded p-1`}
                        title={canDeleteDevices ? "حذف الجهاز" : "ليس لديك صلاحية لحذف الأجهزة"}
                        disabled={!canDeleteDevices}
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Statement Modal */}
      {showCustomerStatement && statementCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-end z-60 pl-4 md:pl-24">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full mx-1 md:mx-6 border-2 border-blue-100">
            <div className="px-10 py-12 md:px-16 md:py-14">
              <div className="flex justify-between items-center mb-8 border-b pb-4">
                <div>
                  <div className="text-lg font-bold text-blue-900 flex items-center gap-2">
                    <User size={20} className="text-blue-400" /> كشف حساب الزبون
                  </div>
                  <div className="text-base text-gray-700 mt-1">{statementCustomer.name} <span className="text-xs text-gray-400">({statementCustomer.mobileNumber})</span></div>
                </div>
                <button
                  onClick={() => setShowCustomerStatement(false)}
                  className="text-gray-400 hover:text-red-500 transition-colors rounded-full p-1 border border-transparent hover:border-red-200"
                  title="إغلاق"
                >
                  <XCircle size={28} />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 border text-right min-w-[110px]">رقم الإيصال</th>
                      <th className="px-8 py-3 border text-right min-w-[170px]">الجهاز</th>
                      <th className="px-8 py-3 border text-right min-w-[170px]">العطل</th>
                      <th className="px-6 py-3 border text-right min-w-[120px]">التكلفة الإجمالية</th>
                      <th className="px-6 py-3 border text-right min-w-[110px]">الحالة</th>
                      <th className="px-5 py-3 border text-right min-w-[100px]">تم التسليم</th>
                      <th className="px-5 py-3 border text-right min-w-[100px]">تم التسديد</th>
                      <th className="px-6 py-3 border text-right min-w-[110px]">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getCustomerDevices(statementCustomer.id).map((d) => (
                      <tr key={d.id} className="hover:bg-blue-50">
                        <td className="px-6 py-3 border min-w-[110px]">{d.receiptNumber ? (d.receiptNumber.includes('-') ? d.receiptNumber.split('-').pop() : d.receiptNumber) : '---'}</td>
                        <td className="px-8 py-3 border min-w-[170px]">{d.deviceType}{d.model ? ` - ${d.model}` : ''}</td>
                        <td className="px-8 py-3 border min-w-[170px]">{d.issue}</td>
                        <td className="px-6 py-3 border min-w-[120px]">{getActualDeviceCost(d).toFixed(2)}</td>
                        <td className="px-6 py-3 border min-w-[110px]">{getStatusBadge(d.repairStatus)}</td>
                        <td className="px-5 py-3 border min-w-[100px]">
                          {d.delivered ? (
                            <span className="inline-block px-2 py-0.5 rounded bg-green-100 text-green-800 text-xs font-bold">نعم</span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs font-bold">لا</span>
                          )}
                        </td>
                        <td className="px-5 py-3 border min-w-[100px]">
                          {d.paid ? (
                            <span className="inline-block px-2 py-0.5 rounded bg-green-100 text-green-800 text-xs font-bold">نعم</span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs font-bold">لا</span>
                          )}
                        </td>
                        <td className="px-6 py-3 border min-w-[110px] text-center">
                          <button
                            className="text-xs text-blue-700 border border-blue-200 rounded px-2 py-0.5 hover:bg-blue-50 transition"
                            onClick={() => {
                              setSelectedDevice(d);
                              setShowCustomerStatement(false);
                            }}
                          >
                            إدارة
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {getCustomerDevices(statementCustomer.id).length === 0 && (
                  <div className="text-center text-gray-400 py-8">لا توجد أجهزة لهذا الزبون</div>
                )}
                {/* إجمالي القيمة */}
                {getCustomerDevices(statementCustomer.id).length > 0 && (
                  <div className="flex flex-col md:flex-row justify-end items-end md:items-center gap-3 mt-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg px-6 py-3 text-lg font-bold text-green-900 shadow">
                      تم التسديد: {' '}
                      {Math.round(calculateTotalPaymentsUpdated(statementCustomer.id))} $
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-6 py-3 text-lg font-bold text-yellow-900 shadow">
                      غير المسددة: {' '}
                      {Math.round(getCustomerDevices(statementCustomer.id)
                        .filter(d => !d.paid)
                        .reduce((sum, d) => sum + getActualDeviceCost(d), 0))} $
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg px-6 py-3 text-lg font-bold text-blue-900 shadow">
                      الإجمالي: {' '}
                      {Math.round(getCustomerDevices(statementCustomer.id).reduce((sum, d) => sum + getActualDeviceCost(d), 0))} $
                    </div>
                    <div className={`border rounded-lg px-6 py-3 text-lg font-bold shadow ${calculateCustomerBalanceUpdated(statementCustomer.id) > 0 ? 'bg-red-50 border-red-200 text-red-900' : 'bg-green-50 border-green-200 text-green-900'}`}>
                      الرصيد الحالي: {' '}
                      {Math.round(calculateCustomerBalanceUpdated(statementCustomer.id))} $
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Device Management Modal */}
      {selectedDevice && (
        <div className={`fixed inset-0 flex items-center justify-center z-40${showMaintenanceModal && deviceForAction ? ' pointer-events-none' : ''}`} style={{ zIndex: 1049 }}>
          {/* طبقة التعتيم للخلفية فقط */}
          <div className="absolute inset-0 bg-black bg-opacity-50 z-0" />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-7xl w-full mx-1 md:mx-10 max-h-[97vh] overflow-y-auto border-2 border-blue-100 z-30">
            <div className="px-0 md:px-16 py-0 md:py-8 text-[1.15rem] md:text-[1.18rem]">
              {/* Header */}
              <div className="flex justify-between items-center px-8 pt-8 pb-4 border-b border-gray-200 bg-gradient-to-l from-blue-50 to-white rounded-t-2xl text-[1.25rem] md:text-[1.35rem]">
                <h3 className="text-xl font-bold text-blue-900 flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
                  <span className="flex items-center gap-2">
                    <Wrench size={22} className="text-blue-400" />
                    إدارة الجهاز
                  </span>
                  <span className="flex flex-wrap items-center gap-2 text-base font-normal mt-1 md:mt-0">
                    <span className="bg-blue-50 text-blue-800 rounded px-2 py-0.5 font-semibold flex items-center gap-1">
                      <User size={16} className="text-blue-400" />
                      {getCustomerInfo(selectedDevice.customerId)?.name || '---'}
                    </span>
                    <span className="bg-blue-50 text-blue-700 rounded px-2 py-0.5 font-semibold flex items-center gap-1">
                      <Smartphone size={15} className="text-blue-400" />
                      {selectedDevice.deviceType}{selectedDevice.model ? ` - ${selectedDevice.model}` : ''}
                    </span>
                  </span>
                </h3>
                <button
                  onClick={() => setSelectedDevice(null)}
                  className="text-gray-400 hover:text-red-500 transition-colors rounded-full p-1 border border-transparent hover:border-red-200"
                  title="إغلاق"
                >
                  <XCircle size={28} />
                </button>
              </div>

              {/* معلومات أساسية ثابتة */}
              <div className="bg-gradient-to-l from-blue-50 to-white rounded-xl mx-4 mt-6 mb-6 p-4 md:p-7 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 text-base shadow-sm border border-blue-100">
                {/* الحقول الدائمة */}
                <div className="relative col-span-full">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
                    <div>
                      <span className="text-gray-500">رقم الإيصال</span>
                      <div className="font-semibold text-blue-900 mt-1">{selectedDevice.receiptNumber ? (selectedDevice.receiptNumber.includes('-') ? selectedDevice.receiptNumber.split('-').pop() : selectedDevice.receiptNumber) : '---'}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">نوع الجهاز</span>
                      <div className="font-semibold text-blue-900 mt-1">{selectedDevice.deviceType}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">الموديل</span>
                      <div className="font-semibold text-blue-900 mt-1">{selectedDevice.model}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">العطل</span>
                      <div className="font-semibold text-blue-900 mt-1">{selectedDevice.issue}</div>
                    </div>
                    {/* استغلال المساحة الخالية: عرض القيمة التقديرية */}
                    <div>
                      <span className="text-gray-500">القيمة التقديرية</span>
                      <div className="font-semibold text-blue-900 mt-1">{selectedDevice.estimatedCost ? `${selectedDevice.estimatedCost} $` : <span className="text-gray-400">غير متوفرة</span>}</div>
                    </div>
                  </div>
                  {/* زر إظهار/إخفاء التفاصيل الإضافية */}
                  <button
                    type="button"
                    onClick={() => setShowExtraDeviceInfo(v => !v)}
                    className="absolute left-2 top-2 flex items-center text-blue-600 hover:text-blue-800 p-1 rounded transition-colors border border-blue-100 bg-blue-50 z-20"
                    title={showExtraDeviceInfo ? 'إخفاء التفاصيل' : 'عرض كل التفاصيل'}
                    style={{ boxShadow: '0 1px 4px 0 #0001' }}
                  >
                    {showExtraDeviceInfo ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>
                {/* الحقول الإضافية */}
                {showExtraDeviceInfo && <>
                  {/* الحقول الإضافية */}
                  <div>
                    <span className="text-gray-500 flex items-center gap-1"><FileText size={15} className="text-blue-400" /> رقم الإيصال الورقي</span>
                    <div className="font-semibold text-blue-900 mt-1">{selectedDevice.paperReceiptNumber || '---'}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">اسم الزبون</span>
                    <div className="font-semibold text-blue-900 mt-1">{getCustomerInfo(selectedDevice.customerId)?.name || '---'}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">أرقام التواصل</span>
                    <div className="flex flex-col gap-1 mt-1">
                      <span className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm0 12a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2zm12-12a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zm0 12a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                        <span className="font-semibold text-blue-900">{getCustomerInfo(selectedDevice.customerId)?.mobileNumber || '---'}</span>
                        <span className="text-xs text-gray-400">جوال</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h18M3 10h18M3 15h18M3 20h18" /></svg>
                        <span className="font-semibold text-blue-900">{getCustomerInfo(selectedDevice.customerId)?.phoneNumber || '---'}</span>
                        <span className="text-xs text-gray-400">هاتف</span>
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">رقم الإيمي</span>
                    <div className="font-semibold text-blue-900 mt-1">{selectedDevice.imei}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">نوع العطل</span>
                    <div className="font-semibold text-blue-900 mt-1">{selectedDevice.issueType === 'hardware' ? 'هاردوير' : 'سوفتوير'}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">تاريخ الإدخال</span>
                    <div className="font-semibold text-blue-900 mt-1">{selectedDevice.entryDate ? new Date(selectedDevice.entryDate).toLocaleDateString('ar-EG') : '---'}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">الملحقات</span>
                    <div className="font-semibold text-blue-900 mt-1">
                      {(() => {
                        const acc: string[] = [];
                        if (selectedDevice.hasSim) acc.push('شريحة');
                        if (selectedDevice.hasBattery) acc.push('بطارية');
                        if (selectedDevice.hasMemory) acc.push('ذاكرة');
                        return acc.length > 0 ? acc.join('، ') : '---';
                      })()}
                    </div>
                  </div>
                  {selectedDevice.notes && selectedDevice.notes.trim() !== '' && (
                    <div className="md:col-span-2 lg:col-span-4">
                      <span className="text-gray-500">ملاحظات</span>
                      <div className="font-semibold text-blue-900 mt-1">{selectedDevice.notes}</div>
                    </div>
                  )}
                </>}
              </div>

              {/* جدول إجراءات الصيانة */}
              <div className="grid grid-cols-1 gap-8 px-4 pb-4">
                <div className="bg-white rounded-xl shadow border border-gray-100 p-6 text-[1.08rem] md:text-[1.13rem] mb-4">
                  <div className="flex justify-between items-center mb-4 border-b border-blue-50 pb-2">
                    <h4 className="font-semibold text-blue-800 flex items-center gap-2">
                      <Wrench size={18} className="text-blue-400" /> إجراءات الصيانة
                    </h4>
                    <button
                      onClick={() => {
                        setDeviceForAction(selectedDevice);
                        setShowMaintenanceModal(true);
                      }}
                      className="bg-gradient-to-l from-blue-500 to-blue-700 text-white px-4 py-1.5 rounded-lg shadow hover:from-blue-600 hover:to-blue-800 transition-colors flex items-center gap-1 text-sm font-semibold"
                    >
                      <Plus size={15} />
                      إضافة إجراء
                    </button>
                  </div>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {selectedDevice.maintenanceActions.length > 0 ? (
                      <table className="w-full text-base border rounded-lg overflow-hidden">
                        <thead className="bg-blue-50">
                          <tr>
                            <th className="px-2 py-2 border text-right">نوع الإجراء</th>
                            <th className="px-2 py-2 border text-right">الفني المسؤول</th>
                            <th className="px-2 py-2 border text-right">التكلفة الكلية</th>
                            <th className="px-2 py-2 border text-right">تعديلات</th>
                            <th className="px-2 py-2 border text-right">حذف</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedDevice.maintenanceActions.map((action) => (
                            <tr key={action.id} className="hover:bg-blue-50">
                              <td className="px-2 py-2 border font-medium text-blue-900">{getActionTypeLabel(action.action_type ?? action.actionType ?? 'other')}</td>
                              <td className="px-2 py-2 border text-blue-700">{typeof getTechnicianName === 'function' && action.technicianId ? getTechnicianName(action.technicianId) : <span className="text-gray-300">---</span>}</td> 
                              <td className="px-2 py-2 border text-green-700 font-bold">{action.cost ? `${action.cost} ر.س` : <span className="text-gray-300">---</span>}</td>
                              <td className="px-2 py-2 border text-center">
                                <button
                                  className={`${canEditMaintenance ? 'text-blue-600 hover:text-blue-900 bg-blue-50' : 'text-gray-400 cursor-not-allowed bg-gray-50'} rounded p-1`}
                                  title={canEditMaintenance ? "تعديل" : "ليس لديك صلاحية لتعديل الأجهزة"}
                                  onClick={() => {
                                    setDeviceForAction(selectedDevice);
                                    setShowMaintenanceModal(true);
                                    setEditAction(action); // حالة جديدة
                                    // لا تضع قيمة افتراضية عند التعديل، فقط استخدم القيمة كما هي (قد تكون undefined أو '')
                                    setNewMaintenanceAction({
                                      ...action,
                                      action_type: (action.action_type ?? action.actionType ?? ''),
                                    });
                                  }}
                                  disabled={!canEditMaintenance}
                                >
                                  <Edit size={14} />
                                </button>
                              </td>
                              <td className="px-2 py-2 border text-center">
                                <button
                                  onClick={() => deleteMaintenanceAction(action.id)}
                                  className={`${canDeleteMaintenance ? 'text-red-600 hover:text-red-800 bg-red-50' : 'text-gray-400 cursor-not-allowed bg-gray-50'} rounded p-1`}
                                  title={canDeleteMaintenance ? "حذف" : "ليس لديك صلاحية لتعديل الأجهزة"}
                                  disabled={!canDeleteMaintenance}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <Wrench size={32} className="mx-auto mb-2 text-blue-200" />
                        <p>لا توجد إجراءات صيانة مضافة</p>
                      </div>
                    )}
                  </div>
                </div>
                {/* ملخص القيم وحالة الجهاز العامة جنبًا إلى جنب */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* ملخص القيم */}
                  {selectedDevice.maintenanceActions.length > 0 && (
                    <div className="bg-white rounded-xl shadow border border-gray-100 p-6 text-[1.08rem] md:text-[1.13rem] mb-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center text-sm mb-2">
                          <span className="text-gray-600">القيمة التقديرية</span>
                          <span className="font-semibold text-blue-900">{selectedDevice.estimatedCost} ر.س</span>
                        </div>
                        <div className="flex justify-between items-center text-base font-bold border-t border-blue-50 pt-2 mt-2">
                          <span className="text-blue-800">القيمة الإجمالية</span>
                          <span className="text-blue-800">{getTotalMaintenanceCost(selectedDevice).toFixed(2)} ر.س</span>
                        </div>
                      </div>
                      {getTotalMaintenanceCost(selectedDevice) > Number(selectedDevice.estimatedCost) && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-300 text-yellow-900 rounded-lg text-sm flex items-center gap-2 animate-pulse">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" /></svg>
                          <span>تنبيه: القيمة الإجمالية تجاوزت القيمة التقديرية للجهاز!</span>
                        </div>
                      )}
                    </div>
                  )}
                  {/* حالة الجهاز العامة */}
                  <div className="bg-white rounded-xl shadow border border-gray-100 p-6 text-[1.08rem] md:text-[1.13rem] mb-4">
                    <h4 className="font-semibold text-blue-800 mb-6 border-b border-blue-50 pb-2 flex items-center gap-2">
                      <Edit size={18} className="text-blue-400" /> حالة الجهاز العامة
                    </h4>
                    <div className="flex flex-col gap-4 w-full">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                        {/* حالة الإصلاح */}
                        <div className="flex flex-col gap-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            حالة الإصلاح
                          </label>
                          <select
                            value={selectedDevice.repairStatus}
                            onChange={(e) => setSelectedDevice({
                              ...selectedDevice,
                              repairStatus: e.target.value as Device['repairStatus']
                            })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50"
                          >
                            <option value="pending">قيد الانتظار</option>
                            <option value="in-progress">قيد الاصلاح</option>
                            <option value="completed">تم الاصلاح</option>
                            <option value="la-yuslih">لا يصلح</option>
                            <option value="waiting-parts">بانتظار قطع غيار</option>
                            <option value="cancelled">تم الإلغاء من قبل العميل</option>
                          </select>
                        </div>
                        {/* تاريخ التسليم */}
                        <div className="flex flex-col gap-4">
                          {selectedDevice.delivered && (
                            <>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                تاريخ التسليم
                              </label>
                              <input
                                type="date"
                                value={selectedDevice.deliveryDate ?
                                  new Date(selectedDevice.deliveryDate).toISOString().split('T')[0] :
                                  new Date().toISOString().split('T')[0]
                                }
                                onChange={(e) => setSelectedDevice({
                                  ...selectedDevice,
                                  deliveryDate: new Date(e.target.value)
                                })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50"
                              />
                            </>
                          )}
                        </div>
                        {/* تم التسليم وتم التسديد */}
                        <div className="flex flex-col gap-2 justify-end md:items-end">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedDevice.delivered}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  // إذا تم التسليم ويوجد إجراءات صيانة والحالة ليست 'لا يصلح'، حدث الحالة مباشرة
                                  setSelectedDevice(prev => {
                                    if (!prev) return prev;
                                    let newStatus = prev.repairStatus;
                                    if (
                                      Array.isArray(prev.maintenanceActions) &&
                                      prev.maintenanceActions.length > 0 &&
                                      prev.repairStatus !== 'la-yuslih'
                                    ) {
                                      newStatus = 'completed';
                                    }
                                    return {
                                      ...prev,
                                      delivered: true,
                                      deliveryDate: prev.deliveryDate || new Date(),
                                      repairStatus: newStatus
                                    };
                                  });
                                } else {
                                  setSelectedDevice(prev => prev ? {
                                    ...prev,
                                    delivered: false,
                                    deliveryDate: undefined
                                  } : prev);
                                }
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 flex items-center gap-1">
                              <Truck size={16} />
                              تم التسليم
                            </span>
                          </label>
                          {/* إظهار خيار تم التسديد فقط إذا كان تم التسليم مفعلاً */}
                          {selectedDevice.delivered && selectedDevice.repairStatus !== 'la-yuslih' && selectedDevice.repairStatus !== 'cancelled' && (
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedDevice.paid}
                                onChange={(e) => setSelectedDevice({
                                  ...selectedDevice,
                                  paid: e.target.checked
                                })}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700 flex items-center gap-1">
                                <DollarSign size={16} />
                                تم التسديد
                              </span>
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* أزرار الحفظ والإلغاء */}
              <div className="flex justify-end gap-4 mt-8 px-4 pb-6 text-lg">
                <button
                  onClick={() => setSelectedDevice(null)}
                  className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-semibold shadow-sm"
                >
                  إلغاء
                </button>
                <button
                  onClick={async () => {
                    let deviceToSave = { ...selectedDevice };
                    // إذا كان الجهاز مسلّمًا وليس لديه تاريخ تسليم، عيّن تاريخ اليوم
                    if (deviceToSave.delivered && !deviceToSave.deliveryDate) {
                      deviceToSave.deliveryDate = new Date();
                    }
                    // إذا لم يكن الجهاز مسلّمًا، أزل تاريخ التسليم
                    if (!deviceToSave.delivered) {
                      deviceToSave.deliveryDate = undefined;
                    }
                    // منطق تحديث حالة الإصلاح عند التسليم
                    if (
                      deviceToSave.delivered &&
                      Array.isArray(deviceToSave.maintenanceActions) &&
                      deviceToSave.maintenanceActions.length > 0 &&
                      deviceToSave.repairStatus !== 'la-yuslih'
                    ) {
                      deviceToSave.repairStatus = 'completed';
                    }
                    await updateDeviceStatus(deviceToSave.id, deviceToSave);
                    await fetchDevices();
                    setSelectedDevice(null);
                  }}
                  className="px-6 py-2 bg-gradient-to-l from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-colors font-bold shadow"
                >
                  حفظ التغييرات
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Maintenance Action Modal */}
      {showMaintenanceModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[9999]">
          {/* طبقة التعتيم لفورم الصيانة فقط */}
          <div className="absolute inset-0 bg-black bg-opacity-60 z-0" />
          <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 z-10">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                {editAction ? 'تعديل إجراء صيانة' : 'إضافة إجراء صيانة جديد'}
              </h3>
              <div className="space-y-4">
                {/* ...نفس الحقول بدون الملاحظات... */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">نوع الإجراء</label>
                  <Select
                    options={[
                      // 🟦 أعطال الشاشة
                      { value: 'screen-replacement', label: 'تغيير شاشة' },
                      { value: 'touch-replacement', label: 'تبديل تاتش' },
                      { value: 'screen-touch-replacement', label: 'تبديل شاشة + تاتش' },
                      { value: 'oled-screen-replacement', label: 'تبديل شاشة أوليد' },
                      { value: 'glass-replacement', label: 'تبديل زجاج (بلورة)' },
                      { value: 'service-screen', label: 'شاشة سيرفس' },
                      { value: 'screen-calibration', label: 'صيانة بيانات شاشة' },
                      { value: 'screen-class-b', label: 'شاشة شنج كلاس' },
                      { value: 'device-screen-swap', label: 'شاشة سحب جهاز' },
                      { value: 'screen-flex-replacement', label: 'تبديل فلاتة شاشة' },

                      // 🔌 أعطال الشحن والطاقة
                      { value: 'charging-port-repair', label: 'إصلاح منفذ الشحن' },
                      { value: 'charging-board-original', label: 'تبديل بورد شحن أصلي' },
                      { value: 'charging-board-copy', label: 'تبديل بورد شحن كوبي' },
                      { value: 'charging-issue-repair', label: 'صيانة مشاكل شحن' },
                      { value: 'battery-replacement', label: 'تغيير بطارية' },
                      { value: 'power-ic-repair', label: 'إصلاح IC الطاقة' },

                      // 🔊 أعطال الصوت والكاميرا
                      { value: 'speaker-repair', label: 'إصلاح السماعة' },
                      { value: 'microphone-repair', label: 'إصلاح المايكروفون' },
                      { value: 'earpiece-repair', label: 'إصلاح سماعة المكالمات' },
                      { value: 'camera-repair', label: 'إصلاح الكاميرا' },
                      { value: 'camera-replacement', label: 'تبديل الكاميرا' },

                      // 💻 أعطال السوفتوير
                      { value: 'software-repair', label: 'إصلاح نظام التشغيل' },
                      { value: 'formatting', label: 'تهيئة الجهاز (فورمات)' },
                      { value: 'firmware-update', label: 'تحديث النظام' },
                      { value: 'frp-unlock', label: 'فك حماية FRP' },

                      // 🔧 أعطال الهاردوير العامة
                      { value: 'hardware-repair', label: 'إصلاح هاردوير' },
                      { value: 'motherboard-replacement', label: 'تبديل بورد' },
                      { value: 'ic-replacement', label: 'تبديل IC' },
                      { value: 'button-repair', label: 'إصلاح أزرار (باور / فوليوم)' },
                      { value: 'sensor-repair', label: 'إصلاح الحساسات' },
                      { value: 'back-cover-replacement', label: 'تبديل غطاء خلفي' },

                      // 🧪 أعطال متقدمة
                      { value: 'water-damage-repair', label: 'إصلاح أضرار المياه' },
                      { value: 'no-power-repair', label: 'إصلاح عطل عدم التشغيل' },
                      { value: 'network-issue-repair', label: 'صيانة الشبكة / الإشارة' },
                      { value: 'charging-ic-repair', label: 'إصلاح IC شحن' },

                      // ⚙️ الحالة العامة / الإدارية
                      { value: 'nothing-found', label: 'لا يوجد عطل' },
                      { value: 'all-fixed', label: 'تم إصلاح جميع الأعطال' },
                      { value: 'no-parts', label: 'لا توجد قطع متوفرة' },
                      { value: 'cancel-repair', label: 'تم إلغاء الصيانة' },
                      { value: 'fixed-free', label: 'تم الإصلاح بدون تكلفة' },
                      { value: 'other', label: 'عطل آخر' }
                    ]}
                    value={(() => {
                      const options = [
                        { value: 'screen-replacement', label: 'تغيير شاشة' },
                        { value: 'touch-replacement', label: 'تبديل تاتش' },
                        { value: 'screen-touch-replacement', label: 'تبديل شاشة + تاتش' },
                        { value: 'oled-screen-replacement', label: 'تبديل شاشة أوليد' },
                        { value: 'glass-replacement', label: 'تبديل زجاج (بلورة)' },
                        { value: 'service-screen', label: 'شاشة سيرفس' },
                        { value: 'screen-calibration', label: 'صيانة بيانات شاشة' },
                        { value: 'screen-class-b', label: 'شاشة شنج كلاس' },
                        { value: 'device-screen-swap', label: 'شاشة سحب جهاز' },
                        { value: 'screen-flex-replacement', label: 'تبديل فلاتة شاشة' },
                        { value: 'charging-port-repair', label: 'إصلاح منفذ الشحن' },
                        { value: 'charging-board-original', label: 'تبديل بورد شحن أصلي' },
                        { value: 'charging-board-copy', label: 'تبديل بورد شحن كوبي' },
                        { value: 'charging-issue-repair', label: 'صيانة مشاكل شحن' },
                        { value: 'battery-replacement', label: 'تغيير بطارية' },
                        { value: 'power-ic-repair', label: 'إصلاح IC الطاقة' },
                        { value: 'speaker-repair', label: 'إصلاح السماعة' },
                        { value: 'microphone-repair', label: 'إصلاح المايكروفون' },
                        { value: 'earpiece-repair', label: 'إصلاح سماعة المكالمات' },
                        { value: 'camera-repair', label: 'إصلاح الكاميرا' },
                        { value: 'camera-replacement', label: 'تبديل الكاميرا' },
                        { value: 'software-repair', label: 'إصلاح نظام التشغيل' },
                        { value: 'formatting', label: 'تهيئة الجهاز (فورمات)' },
                        { value: 'firmware-update', label: 'تحديث النظام' },
                        { value: 'frp-unlock', label: 'فك حماية FRP' },
                        { value: 'hardware-repair', label: 'إصلاح هاردوير' },
                        { value: 'motherboard-replacement', label: 'تبديل بورد' },
                        { value: 'ic-replacement', label: 'تبديل IC' },
                        { value: 'button-repair', label: 'إصلاح أزرار (باور / فوليوم)' },
                        { value: 'sensor-repair', label: 'إصلاح الحساسات' },
                        { value: 'back-cover-replacement', label: 'تبديل غطاء خلفي' },
                        { value: 'water-damage-repair', label: 'إصلاح أضرار المياه' },
                        { value: 'no-power-repair', label: 'إصلاح عطل عدم التشغيل' },
                        { value: 'network-issue-repair', label: 'صيانة الشبكة / الإشارة' },
                        { value: 'charging-ic-repair', label: 'إصلاح IC شحن' },
                        { value: 'nothing-found', label: 'لا يوجد عطل' },
                        { value: 'all-fixed', label: 'تم إصلاح جميع الأعطال' },
                        { value: 'no-parts', label: 'لا توجد قطع متوفرة' },
                        { value: 'cancel-repair', label: 'تم إلغاء الصيانة' },
                        { value: 'fixed-free', label: 'تم الإصلاح بدون تكلفة' },
                        { value: 'other', label: 'عطل آخر' }
                      ];
                      const val = newMaintenanceAction.action_type;
                      if (val === undefined || val === null || val === '') return null;
                      const found = options.find(opt => opt.value === val);
                      if (found) return found;
                      // إذا كانت القيمة نصية فقط (كتابة يدوية أو قيمة غير معرفة)
                      return { value: val, label: val };
                    })()}
                    onChange={option => setNewMaintenanceAction((prev: any) => ({ ...prev, action_type: option && typeof option.value === 'string' ? option.value : '' }))}
                    onInputChange={(input, { action }) => {
                      if (action === 'input-change') {
                        setNewMaintenanceAction((prev: any) => ({ ...prev, action_type: input }));
                      }
                    }}
                    isClearable
                    isSearchable
                    placeholder="اكتب أو اختر نوع الإجراء"
                    classNamePrefix="react-select"
                    styles={{
                      control: (base) => ({ ...base, minHeight: '42px', borderColor: '#d1d5db', boxShadow: 'none' }),
                      menu: (base) => ({ ...base, zIndex: 9999 }),
                    }}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">كلفة القطع</label>
                    <input
                      type="number"
                      value={typeof newMaintenanceAction.partsCost === 'number' ? newMaintenanceAction.partsCost : ''}
                      onChange={(e) => setNewMaintenanceAction(prev => ({
                        ...prev,
                        partsCost: Number(e.target.value)
                      }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">التكلفة الكلية</label>
                    <input
                      type="number"
                      value={newMaintenanceAction.cost}
                      onChange={(e) => setNewMaintenanceAction(prev => ({
                        ...prev,
                        cost: Number(e.target.value)
                      }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <label className="block text-xs font-medium text-gray-500 mb-1">الربح الصافي (يحسب تلقائياً)</label>
                    <div className="px-3 py-2 rounded bg-green-50 text-green-800 font-bold text-sm">
                      {(Number(newMaintenanceAction.cost || 0) - Number(typeof newMaintenanceAction.partsCost === 'number' ? newMaintenanceAction.partsCost : 0)).toFixed(2)} ر.س
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الفني المسؤول</label>
                  <select
                    value={newMaintenanceAction.technicianId || ''}
                    onChange={(e) => setNewMaintenanceAction(prev => ({
                      ...prev,
                      technicianId: e.target.value || undefined
                    }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">غير محدد</option>
                    {technicians.filter(t => t.active).map(technician => (
                      <option key={technician.id} value={technician.id}>
                        {technician.name} - {technician.specialization}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={() => {
                    setShowMaintenanceModal(false);
                    setNewMaintenanceAction({
                      action_type: 'screen-replacement',
                      description: '',
                      cost: 0,
                      status: 'pending',
                      notes: ''
                    });
                    setEditAction(null);
                    if (deviceForAction) setSelectedDevice(deviceForAction);
                    setDeviceForAction(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  إلغاء
                </button>
                {editAction ? (
                  <button
                    onClick={async () => {
                      try {
                        // حفظ التعديلات على الإجراء
                        await updateMaintenanceAction(editAction.id, newMaintenanceAction);
                        setShowMaintenanceModal(false);
                        setEditAction(null);
                        setNewMaintenanceAction({
                          action_type: 'screen-replacement',
                          description: '',
                          cost: 0,
                          status: 'pending',
                          notes: ''
                        });
                        setDeviceForAction(null);
                      } catch (error) {
                        console.error('خطأ في حفظ التعديلات:', error);
                        alert('حدث خطأ في حفظ التعديلات');
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    حفظ التعديلات
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      try {
                        // أضف الإجراء الجديد
                        await addMaintenanceAction();
                        setShowMaintenanceModal(false);
                        setDeviceForAction(null);
                      } catch (error) {
                        console.error('خطأ في إضافة الإجراء:', error);
                        alert('حدث خطأ في إضافة الإجراء');
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    إضافة الإجراء
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DeviceInquiry;