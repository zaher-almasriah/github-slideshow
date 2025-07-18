import React, { useState, useEffect } from 'react';
import { Technician } from '../types';
import { Plus, Edit, Trash2, Save, X, UserCheck, UserX } from 'lucide-react';
import { getSupabaseClient } from '../supabaseClient';
import { hasCurrentUserPermission } from '../hooks/usePermission';

const supabase = getSupabaseClient();

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase());
}
function normalizeKeys<T = any>(obj: any): T {
  if (Array.isArray(obj)) return obj.map(normalizeKeys) as T;
  if (obj !== null && typeof obj === 'object') {
    const newObj: Record<string, any> = {};
    for (const key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
      newObj[toCamelCase(key)] = normalizeKeys(obj[key]);
    }
    return newObj as T;
  }
  return obj;
}

interface TechniciansManagementProps {
  devices?: any[];
  customers?: any[];
  technicians?: any[];
  loading?: boolean;
}

const TechniciansManagement: React.FC<TechniciansManagementProps> = (props) => {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', specialization: '', active: true });

  // التحقق من الصلاحيات
  const canEditTechnicians = hasCurrentUserPermission('EDIT_TECHNICIANS') || hasCurrentUserPermission('ADMIN_ACCESS');
  const canDeleteTechnicians = hasCurrentUserPermission('DELETE_TECHNICIANS') || hasCurrentUserPermission('ADMIN_ACCESS');

  // جلب الفنيين من Supabase عند التحميل
  useEffect(() => {
    const fetchTechnicians = async () => {
      const { data, error } = await supabase.from('technicians').select('*');
      if (!error && data) {
        setTechnicians(normalizeKeys(data));
      } else if (error) {
        console.error('خطأ في جلب الفنيين:', error);
      }
    };
    fetchTechnicians();
  }, []);

const specializations = ['هاردوير', 'سوفتوير', 'هاردوير وسوفتوير', 'تغيير شاشات', 'بطاريات', 'صيانة عامة'];

  // إضافة فني جديد إلى Supabase
  const handleAdd = async () => {
    if (formData.name.trim() && formData.specialization.trim()) {
      const { data, error } = await supabase.from('technicians').insert([
        {
          name: formData.name.trim(),
          specialization: formData.specialization.trim(),
          active: formData.active
        }
      ]).select();
      if (!error && data) {
        setTechnicians((prev: Technician[]) => [...prev, ...normalizeKeys<Technician[]>(data)]);
        setFormData({ name: '', specialization: '', active: true });
        setIsAddingNew(false);
      } else if (error) {
        alert('خطأ في إضافة الفني: ' + error.message);
      }
    }
  };

  const handleEdit = (technician: Technician) => {
    if (!canEditTechnicians) {
      alert('ليس لديك صلاحية لتعديل الفنيين');
      return;
    }
    setEditingId(technician.id);
    setFormData({
      name: technician.name,
      specialization: technician.specialization,
      active: technician.active
    });
  };

  // تعديل بيانات فني في Supabase
  const handleUpdate = async () => {
    if (formData.name.trim() && formData.specialization.trim() && editingId) {
      const { error } = await supabase.from('technicians')
        .update({
          name: formData.name.trim(),
          specialization: formData.specialization.trim(),
          active: formData.active
        })
        .eq('id', editingId);
      if (!error) {
        setTechnicians((prev: Technician[]) => prev.map((technician: Technician) =>
          technician.id === editingId
            ? { ...technician, name: formData.name.trim(), specialization: formData.specialization.trim(), active: formData.active }
            : technician
        ));
        setEditingId(null);
        setFormData({ name: '', specialization: '', active: true });
      } else {
        alert('خطأ في تعديل الفني: ' + error.message);
      }
    }
  };

  // حذف فني من Supabase
  const handleDelete = async (id: string) => {
    if (!canDeleteTechnicians) {
      alert('ليس لديك صلاحية لحذف الفنيين');
      return;
    }
    if (confirm('هل أنت متأكد من حذف هذا الفني؟')) {
      const { error } = await supabase.from('technicians').delete().eq('id', id);
      if (!error) {
        setTechnicians((prev: Technician[]) => prev.filter((technician: Technician) => technician.id !== id));
      } else {
        alert('خطأ في حذف الفني: ' + error.message);
      }
    }
  };

  // تفعيل/تعطيل فني في Supabase
  const toggleStatus = async (id: string) => {
    if (!canEditTechnicians) {
      alert('ليس لديك صلاحية لتعديل الفنيين');
      return;
    }
    const technician = technicians.find((t: Technician) => t.id === id);
    if (!technician) return;
    const { error } = await supabase.from('technicians')
      .update({ active: !technician.active })
      .eq('id', id);
    if (!error) {
      setTechnicians((prev: Technician[]) => prev.map((t: Technician) =>
        t.id === id ? { ...t, active: !t.active } : t
      ));
    } else {
      alert('خطأ في تحديث حالة الفني: ' + error.message);
    }
  };

  const handleCancel = () => {
    setIsAddingNew(false);
    setEditingId(null);
    setFormData({ name: '', specialization: '', active: true });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">إدارة الفنيين</h2>
        {!isAddingNew && !editingId && (
          <button
            onClick={() => setIsAddingNew(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus size={16} />
            إضافة فني جديد
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {(isAddingNew || editingId) && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {isAddingNew ? 'إضافة فني جديد' : 'تعديل بيانات الفني'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">اسم الفني</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="اسم الفني"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">التخصص</label>
              <select
                value={formData.specialization}
                onChange={(e) => setFormData(prev => ({ ...prev, specialization: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">اختر التخصص</option>
                {specializations.map(spec => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">فني نشط</span>
              </label>
            </div>
          </div>
          
          <div className="flex justify-end gap-4 mt-6">
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <X size={16} />
              إلغاء
            </button>
            <button
              onClick={isAddingNew ? handleAdd : handleUpdate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Save size={16} />
              {isAddingNew ? 'إضافة' : 'حفظ التغييرات'}
            </button>
          </div>
        </div>
      )}

      {/* Technicians List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  اسم الفني
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  التخصص
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الحالة
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {technicians.map((technician: Technician) => (
                <tr key={technician.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{technician.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{technician.specialization}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {technician.active ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <UserCheck size={12} />
                        نشط
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <UserX size={12} />
                        غير نشط
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-10 space-x-reverse text-center">
                    <button
                      onClick={() => handleEdit(technician)}
                      className={`mr-4 ${canEditTechnicians ? 'text-blue-600 hover:text-blue-900' : 'text-gray-400 cursor-not-allowed'}`}
                      title={canEditTechnicians ? "تعديل" : "ليس لديك صلاحية لتعديل الفنيين"}
                      disabled={!canEditTechnicians}
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => toggleStatus(technician.id)}
                      className={`mr-4 ${canEditTechnicians 
                        ? (technician.active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900')
                        : 'text-gray-400 cursor-not-allowed'
                      }`}
                      title={canEditTechnicians ? (technician.active ? 'إلغاء تفعيل' : 'تفعيل') : "ليس لديك صلاحية لتعديل الفنيين"}
                      disabled={!canEditTechnicians}
                    >
                      {technician.active ? <UserX size={16} /> : <UserCheck size={16} />}
                    </button>
                    <button
                      onClick={() => handleDelete(technician.id)}
                      className={`${canDeleteTechnicians ? 'text-red-600 hover:text-red-900' : 'text-gray-400 cursor-not-allowed'}`}
                      title={canDeleteTechnicians ? "حذف" : "ليس لديك صلاحية لحذف الفنيين"}
                      disabled={!canDeleteTechnicians}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty State */}
      {technicians.length === 0 && !isAddingNew && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-gray-400 mb-4">
            <Plus size={48} className="mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا يوجد فنيين مضافين</h3>
          <p className="text-gray-500 mb-4">ابدأ بإضافة الفنيين الذين يعملون في الورشة</p>
          <button
            onClick={() => setIsAddingNew(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            إضافة أول فني
          </button>
        </div>
      )}
    </div>
  );
};

export default TechniciansManagement;