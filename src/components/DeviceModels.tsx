
import React, { useState, useEffect } from 'react';
import { DeviceModel } from '../types';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';

// ===== إصلاحات التحديث المستمر =====
// تم إصلاح dependency arrays في useEffect لتجنب التحديث المستمر
// =====================================
import { getSupabaseClient } from '../supabaseClient';

  const supabase = getSupabaseClient();

interface DeviceModelsProps {
  devices?: any[];
  customers?: any[];
  technicians?: any[];
  loading?: boolean;
}

const DeviceModels: React.FC<DeviceModelsProps> = (props) => {
  const [deviceModels, setDeviceModels] = useState<DeviceModel[]>([]);
  // جلب الموديلات من Supabase
  // دالة تطبيع لتحويل snake_case إلى camelCase (خارج useEffect)
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
  useEffect(() => {
    const fetchModels = async () => {
      const { data, error } = await supabase
        .from('models')
        .select('*')
        .order('id', { ascending: false })
        .limit(100);
      if (!error && data) {
        const normalized = normalizeKeys(data);
        setDeviceModels(normalized);
      } else if (error) {
        console.error('خطأ في جلب الموديلات:', error);
      }
    };
    fetchModels();
  }, []);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ type: '', model: '' });

  // إضافة موديل جديد إلى Supabase
  const handleAdd = async () => {
    if (formData.type.trim() && formData.model.trim()) {
      const { data, error } = await supabase.from('models').insert([
        { type: formData.type.trim(), model: formData.model.trim() }
      ]).select();
      if (!error && data) {
        // إعادة جلب الموديلات من Supabase بعد الإضافة
        const { data: allData, error: fetchError } = await supabase
          .from('models')
          .select('*')
          .order('id', { ascending: false })
          .limit(100);
        if (!fetchError && allData) {
          setDeviceModels(normalizeKeys(allData));
        }
        setFormData({ type: '', model: '' });
        setIsAddingNew(false);
      } else if (error) {
        alert('خطأ في إضافة الموديل: ' + error.message);
      }
    }
  };

  const handleEdit = (model: DeviceModel) => {
    setEditingId(model.id);
    setFormData({ type: model.type, model: model.model });
  };

  // تعديل موديل في Supabase
  const handleUpdate = async () => {
    if (formData.type.trim() && formData.model.trim() && editingId) {
      const { error } = await supabase.from('models')
        .update({ type: formData.type.trim(), model: formData.model.trim() })
        .eq('id', editingId);
      if (!error) {
        setDeviceModels(prev => prev.map(model =>
          model.id === editingId
            ? { ...model, type: formData.type.trim(), model: formData.model.trim() }
            : model
        ));
        setEditingId(null);
        setFormData({ type: '', model: '' });
      } else {
        alert('خطأ في تعديل الموديل: ' + error.message);
      }
    }
  };

  // حذف موديل من Supabase
  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الموديل؟')) {
      const { error } = await supabase.from('models').delete().eq('id', id);
      if (!error) {
        setDeviceModels(prev => prev.filter(model => model.id !== id));
      } else {
        alert('خطأ في حذف الموديل: ' + error.message);
      }
    }
  };

  const handleCancel = () => {
    setIsAddingNew(false);
    setEditingId(null);
    setFormData({ type: '', model: '' });
  };


  return (
    <div className="space-y-6">
      {/* Add New Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">إدارة موديلات الأجهزة</h2>
        {!isAddingNew && !editingId && (
          <button
            onClick={() => setIsAddingNew(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus size={16} />
            إضافة موديل جديد
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {(isAddingNew || editingId) && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {isAddingNew ? 'إضافة موديل جديد' : 'تعديل الموديل'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">نوع الجهاز</label>
              <input
                type="text"
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="مثل: iPhone, Samsung, Huawei"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الموديل</label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="مثل: iPhone 14 Pro, Galaxy S23"
                required
              />
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

      {/* Models Table */}
      <div className="mx-20">
        <div className="bg-white rounded-lg shadow-md overflow-x-auto">
          <table className="min-w-full border border-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-300 border-l" style={{minWidth:'70px',maxWidth:'110px',width:'90px'}}>نوع الجهاز</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-300 border-l" style={{minWidth:'70px',maxWidth:'110px',width:'90px'}}>الموديل</th>
                <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-300 border-l" style={{minWidth:'40px',maxWidth:'60px',width:'50px'}}>تعديل</th>
                <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-300" style={{minWidth:'40px',maxWidth:'60px',width:'50px'}}>حذف</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {deviceModels
                .slice()
                .sort((a, b) => a.type.localeCompare(b.type))
                .map(model => (
                  <tr key={model.id} className="hover:bg-gray-50">
                    <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-900 border-b border-gray-200 border-l" style={{minWidth:'70px',maxWidth:'110px',width:'90px'}}>{model.type}</td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-900 border-b border-gray-200 border-l" style={{minWidth:'70px',maxWidth:'110px',width:'90px'}}>{model.model}</td>
                    <td className="px-1 py-2 whitespace-nowrap text-sm border-b border-gray-200 border-l" style={{minWidth:'40px',maxWidth:'60px',width:'50px'}}>
                      <button
                        onClick={() => handleEdit(model)}
                        className="p-1 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title="تعديل"
                      >
                        <Edit size={16} />
                      </button>
                    </td>
                    <td className="px-1 py-2 whitespace-nowrap text-sm border-b border-gray-200" style={{minWidth:'40px',maxWidth:'60px',width:'50px'}}>
                      <button
                        onClick={() => handleDelete(model.id)}
                        className="p-1 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                        title="حذف"
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

      {deviceModels.length === 0 && !isAddingNew && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-gray-400 mb-4">
            <Plus size={48} className="mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد موديلات مضافة</h3>
          <p className="text-gray-500 mb-4">ابدأ بإضافة موديلات الأجهزة التي تتعامل معها</p>
          <button
            onClick={() => setIsAddingNew(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            إضافة أول موديل
          </button>
        </div>
      )}
    </div>
  );
};

export default DeviceModels;