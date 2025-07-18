import React, { useEffect, useState } from 'react';
import { getSupabaseClient } from '../supabaseClient';

interface Permission {
  id: number;
  code: string;
  name: string;
  description: string;
}

const PermissionsTab: React.FC = () => {
  // الحصول على Supabase client
  const supabase = getSupabaseClient();
  
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPermission, setNewPermission] = useState({ name: '', code: '', description: '' });
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editPermission, setEditPermission] = useState<Permission | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePermission, setDeletePermission] = useState<Permission | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    setLoading(true);
    const { data } = await supabase.from('permissions').select('*').order('id');
    setPermissions(data || []);
    setLoading(false);
  };

  const handleAddPermission = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setError(null);
    if (!newPermission.name.trim() || !newPermission.code.trim()) {
      setError('اسم الصلاحية والكود مطلوبان');
      setAdding(false);
      return;
    }
    const { error } = await supabase.from('permissions').insert([{ name: newPermission.name, code: newPermission.code, description: newPermission.description }]);
    if (error) {
      setError('حدث خطأ أثناء إضافة الصلاحية');
    } else {
      setShowAddModal(false);
      setNewPermission({ name: '', code: '', description: '' });
      fetchPermissions();
    }
    setAdding(false);
  };

  const openEditModal = (perm: Permission) => {
    setEditPermission(perm);
    setShowEditModal(true);
    setError(null);
  };

  const handleEditPermission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPermission) return;
    setEditLoading(true);
    setError(null);
    if (!editPermission.name.trim() || !editPermission.code.trim()) {
      setError('اسم الصلاحية والكود مطلوبان');
      setEditLoading(false);
      return;
    }
    const { error } = await supabase.from('permissions').update({ name: editPermission.name, code: editPermission.code, description: editPermission.description }).eq('id', editPermission.id);
    if (error) {
      setError('حدث خطأ أثناء تعديل الصلاحية');
    } else {
      setShowEditModal(false);
      setEditPermission(null);
      fetchPermissions();
    }
    setEditLoading(false);
  };

  const openDeleteModal = (perm: Permission) => {
    setDeletePermission(perm);
    setShowDeleteModal(true);
    setError(null);
  };

  const handleDeletePermission = async () => {
    if (!deletePermission) return;
    setDeleteLoading(true);
    setError(null);
    const { error } = await supabase.from('permissions').delete().eq('id', deletePermission.id);
    if (error) {
      setError('حدث خطأ أثناء حذف الصلاحية');
    } else {
      setShowDeleteModal(false);
      setDeletePermission(null);
      fetchPermissions();
    }
    setDeleteLoading(false);
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">إدارة الصلاحيات</h2>
      <button className="mb-4 px-4 py-2 bg-green-600 text-white rounded" onClick={() => setShowAddModal(true)}>
        إضافة صلاحية جديدة
      </button>
      {loading ? (
        <div>جاري التحميل...</div>
      ) : (
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">اسم الصلاحية</th>
              <th className="p-2">الكود</th>
              <th className="p-2">الوصف</th>
              <th className="p-2">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {permissions.map((perm) => (
              <tr key={perm.id}>
                <td className="p-2">{perm.name}</td>
                <td className="p-2">{perm.code}</td>
                <td className="p-2">{perm.description}</td>
                <td className="p-2">
                  <button className="px-2 py-1 bg-blue-500 text-white rounded mx-1" onClick={() => openEditModal(perm)}>تعديل</button>
                  <button className="px-2 py-1 bg-red-500 text-white rounded mx-1" onClick={() => openDeleteModal(perm)}>حذف</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {/* Modal لإضافة صلاحية */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">إضافة صلاحية جديدة</h3>
            <form onSubmit={handleAddPermission}>
              <div className="mb-4">
                <label className="block mb-1">اسم الصلاحية<span className="text-red-500">*</span></label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={newPermission.name}
                  onChange={e => setNewPermission({ ...newPermission, name: e.target.value })}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block mb-1">الكود<span className="text-red-500">*</span></label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={newPermission.code}
                  onChange={e => setNewPermission({ ...newPermission, code: e.target.value })}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block mb-1">الوصف</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={newPermission.description}
                  onChange={e => setNewPermission({ ...newPermission, description: e.target.value })}
                />
              </div>
              {error && <div className="text-red-600 mb-2">{error}</div>}
              <div className="flex gap-2 justify-end">
                <button type="button" className="px-4 py-2 bg-gray-300 rounded" onClick={() => setShowAddModal(false)}>
                  إلغاء
                </button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded" disabled={adding}>
                  {adding ? 'جاري الإضافة...' : 'إضافة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal لتعديل صلاحية */}
      {showEditModal && editPermission && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">تعديل الصلاحية</h3>
            <form onSubmit={handleEditPermission}>
              <div className="mb-4">
                <label className="block mb-1">اسم الصلاحية<span className="text-red-500">*</span></label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={editPermission.name}
                  onChange={e => setEditPermission({ ...editPermission, name: e.target.value } as Permission)}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block mb-1">الكود<span className="text-red-500">*</span></label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={editPermission.code}
                  onChange={e => setEditPermission({ ...editPermission, code: e.target.value } as Permission)}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block mb-1">الوصف</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={editPermission.description}
                  onChange={e => setEditPermission({ ...editPermission, description: e.target.value } as Permission)}
                />
              </div>
              {error && <div className="text-red-600 mb-2">{error}</div>}
              <div className="flex gap-2 justify-end">
                <button type="button" className="px-4 py-2 bg-gray-300 rounded" onClick={() => setShowEditModal(false)}>
                  إلغاء
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded" disabled={editLoading}>
                  {editLoading ? 'جاري الحفظ...' : 'حفظ'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal لحذف صلاحية */}
      {showDeleteModal && deletePermission && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md text-center">
            <h3 className="text-lg font-bold mb-4">تأكيد حذف الصلاحية</h3>
            <p className="mb-4">هل أنت متأكد أنك تريد حذف الصلاحية <span className="font-bold">{deletePermission.name}</span>؟</p>
            {error && <div className="text-red-600 mb-2">{error}</div>}
            <div className="flex gap-2 justify-center">
              <button className="px-4 py-2 bg-gray-300 rounded" onClick={() => setShowDeleteModal(false)}>
                إلغاء
              </button>
              <button className="px-4 py-2 bg-red-600 text-white rounded" onClick={handleDeletePermission} disabled={deleteLoading}>
                {deleteLoading ? 'جاري الحذف...' : 'حذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermissionsTab; 