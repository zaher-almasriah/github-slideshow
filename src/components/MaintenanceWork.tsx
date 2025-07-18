import React, { useEffect, useState } from 'react';
import { getSupabaseClient } from '../supabaseClient';
import { hasCurrentUserPermission } from '../hooks/usePermission';

// ===== إصلاحات التحديث المستمر =====
// تم إصلاح dependency arrays في useEffect لتجنب التحديث المستمر
// =====================================

// ربط مع قاعدة بيانات Supabase
const supabase = getSupabaseClient();

import { Wrench, Clock, CheckCircle, Edit, Trash2 } from 'lucide-react';
import Select from 'react-select';

interface MaintenanceWorkProps {
  devices: any[];
  customers: any[];
  technicians: any[];
  loading?: boolean;
}

const MaintenanceWork: React.FC<MaintenanceWorkProps> = ({ devices, customers, technicians, loading }) => {
  // متغيرات المودال (مؤقتة dummy لتجنب الكسر)
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [editAction, setEditAction] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // التحقق من الصلاحيات
  const canEditMaintenance = hasCurrentUserPermission('EDIT_MAINTENANCE') || hasCurrentUserPermission('ADMIN_ACCESS');
  const canDeleteMaintenance = hasCurrentUserPermission('DELETE_MAINTENANCE') || hasCurrentUserPermission('ADMIN_ACCESS');

  // دالة فتح المودال (مؤقتة)
  const handleEditClick = (actionOrDevice: any) => {
    if (!canEditMaintenance) {
      alert('ليس لديك صلاحية لتعديل أعمال الصيانة');
      return;
    }
    
    setEditForm({
      action_type: actionOrDevice.action_type || '',
      description: actionOrDevice.description || '',
      // دعم كل من partsCost و parts_cost
      partsCost: actionOrDevice.partsCost ?? actionOrDevice.parts_cost ?? 0,
      cost: actionOrDevice.cost ?? 0,
      technician_id: actionOrDevice.technician_id || '',
      notes: actionOrDevice.notes || '',
    });
    setEditAction(actionOrDevice);
    setShowEditModal(true);
  };

  // دالة حذف الإجراء من Supabase
  const handleDeleteAction = async (action: any) => {
    if (!canDeleteMaintenance) {
      alert('ليس لديك صلاحية لحذف أعمال الصيانة');
      return;
    }
    
    if (!action || !action.id) return;
    if (!window.confirm('هل أنت متأكد من حذف هذا الإجراء؟')) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('maintenance_actions')
        .delete()
        .eq('id', action.id);
      if (error) throw error;
      // إعادة تحميل بيانات الإجراءات
      const { data: actionsData } = await supabase.from('maintenance_actions').select('*');
      setActions(actionsData || []);
      // إعادة تحميل الأجهزة
      const { data: devicesData } = await supabase.from('devices').select('*');
      if (devicesData) setDevices(devicesData);
      setShowEditModal(false);
      setEditAction(null);
      setEditForm(null);
    } catch (err: any) {
      alert('حدث خطأ أثناء الحذف: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  // دالة حفظ التعديل (تحديث أو إضافة في Supabase)
  const handleEditSave = async () => {
    setSaving(true);
    try {
      if (editAction && editAction.id) {
        // تحديث سجل موجود
        const { error } = await supabase
          .from('maintenance_actions')
          .update({
            action_type: editForm.action_type,
            description: editForm.description,
            parts_cost: editForm.partsCost,
            cost: editForm.cost,
            technician_id: editForm.technician_id,
            notes: editForm.notes,
          })
          .eq('id', editAction.id);
        if (error) throw error;
      } else {
        // إضافة سجل جديد
        const { error } = await supabase
          .from('maintenance_actions')
          .insert({
            device_id: editAction.device_id,
            action_type: editForm.action_type,
            description: editForm.description,
            parts_cost: editForm.partsCost,
            cost: editForm.cost,
            technician_id: editForm.technician_id,
            notes: editForm.notes,
          });
        if (error) throw error;
      }
      // إعادة تحميل بيانات الإجراءات
      const { data: actionsData } = await supabase.from('maintenance_actions').select('*');
      setActions(actionsData || []);
      // إعادة تحميل الأجهزة
      const { data: devicesData } = await supabase.from('devices').select('*');
      if (devicesData) setDevices(devicesData);
      setShowEditModal(false);
      setEditAction(null);
      setEditForm(null);
    } catch (err: any) {
      alert('حدث خطأ أثناء الحفظ: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };
  // إضافة جلب بيانات maintenance_actions
  const [actions, setActions] = useState<any[]>([]);
  const [actionsLoading, setActionsLoading] = useState(true);
  // حالة الأجهزة المحلية لتحديث البطاقات
  const [devicesState, setDevices] = useState<any[]>(devices);

  useEffect(() => {
    const fetchActions = async () => {
      setActionsLoading(true);
      const { data: actionsData } = await supabase.from('maintenance_actions').select('*');
      setActions(actionsData || []);
      setActionsLoading(false);
    };
    fetchActions();
  }, []);
  // دالة جلب اسم الفني من technicians
  const getActionTechnicianName = (technicianId?: string) => {
    if (!technicianId) return 'غير محدد';
    const technician = technicians.find((t: any) => String(t.id) === String(technicianId));
    return technician ? technician.name : 'غير محدد';
  };


  const getCustomerName = (customerId: string) => {
    const customer = customers.find((c: any) => c.id === customerId);
    return customer ? customer.name : 'غير محدد';
  };

  const getTechnicianName = (technicianId?: string) => {
    if (!technicianId) return 'غير محدد';
    const technician = technicians.find((t: any) => t.id === technicianId);
    return technician ? technician.name : 'غير محدد';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} className="text-yellow-600" />;
      case 'in-progress':
        return <Wrench size={16} className="text-blue-600" />;
      case 'completed':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'la-yuslih':
        return <Clock size={16} className="text-red-600" />;
      default:
        return <Clock size={16} className="text-gray-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'قيد الانتظار';
      case 'in-progress':
        return 'قيد الإصلاح';
      case 'completed':
        return 'مكتمل';
      case 'la-yuslih':
        return 'لا يصلح';
      default:
        return 'غير محدد';
    }
  };


  // تصنيف الأجهزة بناءً على جدول maintenance_actions
  // الأجهزة المسندة: لديها سجل في maintenance_actions مع technician_id
  // الأجهزة غير المسندة: لا يوجد لها أي سجل في maintenance_actions مع technician_id

  // بناء خريطة: deviceId -> [actions]
  const actionsByDevice: Record<string, any[]> = {};
  actions.forEach(action => {
    if (!action.device_id) return;
    if (!actionsByDevice[action.device_id]) actionsByDevice[action.device_id] = [];
    actionsByDevice[action.device_id].push(action);
  });


  // عرض جميع الأجهزة بدون أي فلترة (إظهار الكل)
  const allDevices = devicesState;

  // الأجهزة غير المسندة: لا يوجد لها أي سجل في actions به technician_id
  const unassignedDevices = allDevices.filter(device => {
    const acts = actionsByDevice[device.id] || [];
    return acts.length === 0 || acts.every(a => !a.technician_id);
  });

  // جميع إجراءات الصيانة لكل فني (وليس فقط الأجهزة الفريدة)
  const worksByTechnician = technicians.map(technician => {
    // جميع الإجراءات التي نفذها هذا الفني
    const technicianActions = actions.filter(a => String(a.technician_id) === String(technician.id));
    return { technician, actions: technicianActions };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">أعمال الصيانة</h2>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Clock size={16} className="text-yellow-600" />
            <span>قيد الانتظار</span>
          </div>
          <div className="flex items-center gap-1">
            <Wrench size={16} className="text-blue-600" />
            <span>قيد الإصلاح</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle size={16} className="text-green-600" />
            <span>مكتمل</span>
          </div>
        </div>
      </div>



      {/* جداول منفصلة لكل فني مع أعمدة موحدة */}
      {worksByTechnician.map(({ technician, actions: technicianActions }) => (
        <div key={technician.id} className="bg-white rounded-lg shadow-md mb-6">
          <div className={`px-6 py-3 border-b ${technician.active ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <h3 className={`text-lg font-semibold flex items-center gap-2 ${technician.active ? 'text-blue-800' : 'text-gray-600'}`}>
                {technician.name} - {technician.specialization}
                {!technician.active && <span className="text-sm text-red-600">(غير نشط)</span>}
              </h3>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>عدد الإجراءات: {technicianActions.length}</span>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="border px-2 w-32">الموديل</th>
                  <th className="border px-2 w-32">نوع الإجراء</th>
                  <th className="border px-2 w-24">الكلفة</th>
                  <th className="border px-2 w-32">تاريخ الإجراء</th>
                  <th className="border px-2 w-20">تعديلات</th>
                  <th className="border px-2 w-20">حذف</th>
                </tr>
              </thead>
              <tbody>
                {technicianActions.length > 0 ? technicianActions.map((action) => {
                  const device = allDevices.find(d => d.id === action.device_id) || {};
                  const actionTypeValue = (() => {
                    switch (action.action_type) {
                      // 🟦 أعطال الشاشة
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

                      // 🔌 أعطال الشحن والطاقة
                      case 'charging-port-repair': return 'إصلاح منفذ الشحن';
                      case 'charging-board-original': return 'تبديل بورد شحن أصلي';
                      case 'charging-board-copy': return 'تبديل بورد شحن كوبي';
                      case 'charging-issue-repair': return 'صيانة مشاكل شحن';
                      case 'battery-replacement': return 'تغيير بطارية';
                      case 'power-ic-repair': return 'إصلاح IC الطاقة';

                      // 🔊 أعطال الصوت والكاميرا
                      case 'speaker-repair': return 'إصلاح السماعة';
                      case 'microphone-repair': return 'إصلاح المايكروفون';
                      case 'earpiece-repair': return 'إصلاح سماعة المكالمات';
                      case 'camera-repair': return 'إصلاح الكاميرا';
                      case 'camera-replacement': return 'تبديل الكاميرا';

                      // 💻 أعطال السوفتوير
                      case 'software-repair': return 'إصلاح نظام التشغيل';
                      case 'formatting': return 'تهيئة الجهاز (فورمات)';
                      case 'firmware-update': return 'تحديث النظام';
                      case 'frp-unlock': return 'فك حماية FRP';

                      // 🔧 أعطال الهاردوير العامة
                      case 'hardware-repair': return 'إصلاح هاردوير';
                      case 'motherboard-replacement': return 'تبديل بورد';
                      case 'ic-replacement': return 'تبديل IC';
                      case 'button-repair': return 'إصلاح أزرار (باور / فوليوم)';
                      case 'sensor-repair': return 'إصلاح الحساسات';
                      case 'back-cover-replacement': return 'تبديل غطاء خلفي';

                      // 🧪 أعطال متقدمة
                      case 'water-damage-repair': return 'إصلاح أضرار المياه';
                      case 'no-power-repair': return 'إصلاح عطل عدم التشغيل';
                      case 'network-issue-repair': return 'صيانة الشبكة / الإشارة';
                      case 'charging-ic-repair': return 'إصلاح IC شحن';

                      // ⚙️ الحالة العامة / الإدارية
                      case 'nothing-found': return 'لا يوجد عطل';
                      case 'all-fixed': return 'تم إصلاح جميع الأعطال';
                      case 'no-parts': return 'لا توجد قطع متوفرة';
                      case 'cancel-repair': return 'تم إلغاء الصيانة';
                      case 'fixed-free': return 'تم الإصلاح بدون تكلفة';
                      case 'other': return 'أخرى';
                      default: return action.action_type || '';
                    }
                  })();
                  const cost = action.cost != null && action.cost !== '' ? action.cost : device.estimatedCost;
                  let actionDate = '';
                  // محاولة عرض التاريخ من عدة حقول محتملة
                  if (action.created_at) {
                    actionDate = new Date(action.created_at).toLocaleDateString('ar-EG');
                  } else if (action.updated_at) {
                    actionDate = new Date(action.updated_at).toLocaleDateString('ar-EG');
                  } else if (action.delivered_at) {
                    actionDate = new Date(action.delivered_at).toLocaleDateString('ar-EG');
                  } else if (action.date) {
                    actionDate = new Date(action.date).toLocaleDateString('ar-EG');
                  } else {
                    actionDate = 'غير محدد';
                  }
                  return (
                    <tr key={action.id} className="hover:bg-gray-50">
                      <td className="border px-2 w-32">{device.model || device.device_model || device.deviceType || device.name || ''}</td>
                      <td className="border px-2 w-32">{actionTypeValue}</td>
                      <td className="border px-2 w-24">{cost ? `${cost} ر.س` : ''}</td>
                      <td className="border px-2 w-32">{actionDate}</td>
                      <td className="border px-2 w-20 text-center">
                                                <button
                          className={`${canEditMaintenance ? 'text-blue-600 hover:text-blue-800' : 'text-gray-400 cursor-not-allowed'}`} 
                          title={canEditMaintenance ? "تعديل" : "ليس لديك صلاحية لتعديل أعمال الصيانة"}
                          onClick={() => handleEditClick(action)}
                          disabled={!canEditMaintenance}
                        >
                          <Edit size={18} />
                        </button>
                      </td>
                      <td className="border px-2 w-20 text-center">
                        <button 
                          className={`${canDeleteMaintenance ? 'text-red-600 hover:text-red-800' : 'text-gray-400 cursor-not-allowed'}`} 
                          title={canDeleteMaintenance ? "حذف" : "ليس لديك صلاحية لحذف أعمال الصيانة"}
                          onClick={() => handleDeleteAction(action)} 
                          disabled={!canDeleteMaintenance || !action.id || saving}
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td className="border px-2 text-center" colSpan={6}>لا توجد إجراءات مسندة لهذا الفني</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* نافذة التعديل المستقلة لهذا القسم */}
      {showEditModal && editForm && (
        <div className="fixed inset-0 flex items-center justify-center z-[9999]">
          <div className="absolute inset-0 bg-black bg-opacity-60 z-0" onClick={() => { setShowEditModal(false); setEditAction(null); setEditForm(null); }} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 z-10">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">تعديل إجراء صيانة</h3>
              <div className="space-y-4">
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
                    value={
                      editForm.action_type !== undefined && editForm.action_type !== null && editForm.action_type !== ''
                        ? (() => {
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
                            const found = options.find(opt => opt.value === editForm.action_type);
                            if (found) return found;
                            // إذا كانت القيمة نصية فقط (كتابة يدوية أو قيمة غير معرفة)
                            return { value: editForm.action_type, label: editForm.action_type };
                          })()
                        : null
                    }
                    onChange={option => setEditForm((prev: any) => ({ ...prev, action_type: option && typeof option.value === 'string' ? option.value : '' }))}
                    onInputChange={(input, { action }) => {
                      if (action === 'input-change') {
                        setEditForm((prev: any) => ({ ...prev, action_type: input }));
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
                      value={editForm.partsCost === '' ? '' : Number(editForm.partsCost)}
                      onChange={e => setEditForm((prev: any) => ({ ...prev, partsCost: e.target.value === '' ? '' : Number(e.target.value) }))}
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
                      value={editForm.cost === '' ? '' : Number(editForm.cost)}
                      onChange={e => setEditForm((prev: any) => ({ ...prev, cost: e.target.value === '' ? '' : Number(e.target.value) }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <label className="block text-xs font-medium text-gray-500 mb-1">الربح الصافي (يحسب تلقائياً)</label>
                    <div className="px-3 py-2 rounded bg-green-50 text-green-800 font-bold text-sm">
                      {(Number(editForm.cost || 0) - Number(editForm.partsCost || 0)).toFixed(2)} ر.س
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الفني المسؤول</label>
                  <select
                    value={editForm.technician_id || ''}
                    onChange={e => setEditForm((prev: any) => ({ ...prev, technician_id: e.target.value }))}
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
                    setShowEditModal(false);
                    setEditAction(null);
                    setEditForm(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={saving}
                >
                  إلغاء
                </button>
                <button
                  onClick={handleEditSave}
                  disabled={!editForm.description || saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  حفظ التعديلات
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-4 justify-end items-stretch fixed bottom-0 left-0 w-full bg-white z-50 shadow-lg px-4 py-2" style={{ direction: 'rtl', width: 'calc(100% - 220px)' }}>
        {/* تم نقل البطاقات إلى DeviceInquiry */}
      </div>
    </div>
  );
};

export default MaintenanceWork;