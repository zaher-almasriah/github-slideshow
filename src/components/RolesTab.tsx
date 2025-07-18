import React, { useEffect, useState } from 'react';
import { getSupabaseClient } from '../supabaseClient';

interface Role {
  id: number;
  name: string;
  description: string;
}

interface Permission {
  id: number;
  code: string;
  name: string;
  description: string;
}

const RolesTab: React.FC = () => {
  // الحصول على Supabase client
  const supabase = getSupabaseClient();
  
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<number, Permission[]>>({});
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', description: '' });
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteRole, setDeleteRole] = useState<Role | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchRolesAndPermissions();
  }, []);

  const fetchRolesAndPermissions = async () => {
    setLoading(true);
    // جلب الأدوار
    const { data: rolesData } = await supabase.from('roles').select('*').order('id');
    setRoles(rolesData || []);
    // جلب جميع ربط الأدوار بالصلاحيات
    const { data: rolePerms } = await supabase.from('role_permissions').select('role_id, permission_id');
    // جلب جميع الصلاحيات
    const { data: permissionsData } = await supabase.from('permissions').select('*');
    // بناء خريطة الصلاحيات لكل دور
    const permsMap: Record<number, Permission[]> = {};
    if (rolesData && rolePerms && permissionsData) {
      rolesData.forEach((role: Role) => {
        const permIds = rolePerms.filter(rp => rp.role_id === role.id).map(rp => rp.permission_id);
        permsMap[role.id] = permissionsData.filter((p: Permission) => permIds.includes(p.id));
      });
    }
    setRolePermissions(permsMap);
    setLoading(false);
  };

  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setError(null);
    if (!newRole.name.trim()) {
      setError('اسم الدور مطلوب');
      setAdding(false);
      return;
    }
    const { error } = await supabase.from('roles').insert([{ name: newRole.name, description: newRole.description }]);
    if (error) {
      setError('حدث خطأ أثناء إضافة الدور');
    } else {
      setShowAddModal(false);
      setNewRole({ name: '', description: '' });
      fetchRolesAndPermissions();
    }
    setAdding(false);
  };

  const openEditModal = (role: Role) => {
    setEditRole(role);
    setShowEditModal(true);
    setError(null);
  };

  const handleEditRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRole) return;
    setEditLoading(true);
    setError(null);
    if (!editRole.name.trim()) {
      setError('اسم الدور مطلوب');
      setEditLoading(false);
      return;
    }
    const { error } = await supabase.from('roles').update({ name: editRole.name, description: editRole.description }).eq('id', editRole.id);
    if (error) {
      setError('حدث خطأ أثناء تعديل الدور');
    } else {
      setShowEditModal(false);
      setEditRole(null);
      fetchRolesAndPermissions();
    }
    setEditLoading(false);
  };

  const openDeleteModal = (role: Role) => {
    setDeleteRole(role);
    setShowDeleteModal(true);
    setError(null);
  };

  const handleDeleteRole = async () => {
    if (!deleteRole) return;
    setDeleteLoading(true);
    setError(null);
    const { error } = await supabase.from('roles').delete().eq('id', deleteRole.id);
    if (error) {
      setError('حدث خطأ أثناء حذف الدور');
    } else {
      setShowDeleteModal(false);
      setDeleteRole(null);
      fetchRolesAndPermissions();
    }
    setDeleteLoading(false);
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">إدارة الأدوار</h2>
      <button className="mb-4 px-4 py-2 bg-green-600 text-white rounded" onClick={() => setShowAddModal(true)}>
        إضافة دور جديد
      </button>
      {loading ? (
        <div>جاري التحميل...</div>
      ) : (
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">اسم الدور</th>
              <th className="p-2">الوصف</th>
              <th className="p-2">الصلاحيات</th>
              <th className="p-2">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {roles.map(role => (
              <tr key={role.id}>
                <td className="p-2">{role.name}</td>
                <td className="p-2">{role.description}</td>
                <td className="p-2">
                  {rolePermissions[role.id]?.map(p => p.name).join('، ') || '—'}
                </td>
                <td className="p-2">
                  <button className="px-2 py-1 bg-blue-500 text-white rounded mx-1" onClick={() => openEditModal(role)}>تعديل</button>
                  <button className="px-2 py-1 bg-red-500 text-white rounded mx-1" onClick={() => openDeleteModal(role)}>حذف</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {/* Modal لإضافة دور جديد */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">إضافة دور جديد</h3>
            <form onSubmit={handleAddRole}>
              <div className="mb-4">
                <label className="block mb-1">اسم الدور<span className="text-red-500">*</span></label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={newRole.name}
                  onChange={e => setNewRole({ ...newRole, name: e.target.value })}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block mb-1">الوصف</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={newRole.description}
                  onChange={e => setNewRole({ ...newRole, description: e.target.value })}
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
      {/* Modal لتعديل دور */}
      {showEditModal && editRole && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">تعديل الدور</h3>
            <form onSubmit={handleEditRole}>
              <div className="mb-4">
                <label className="block mb-1">اسم الدور<span className="text-red-500">*</span></label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={editRole.name}
                  onChange={e => setEditRole({ ...editRole, name: e.target.value } as Role)}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block mb-1">الوصف</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={editRole.description}
                  onChange={e => setEditRole({ ...editRole, description: e.target.value } as Role)}
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
      {/* Modal لحذف دور */}
      {showDeleteModal && deleteRole && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md text-center">
            <h3 className="text-lg font-bold mb-4">تأكيد حذف الدور</h3>
            <p className="mb-4">هل أنت متأكد أنك تريد حذف الدور <span className="font-bold">{deleteRole.name}</span>؟</p>
            {error && <div className="text-red-600 mb-2">{error}</div>}
            <div className="flex gap-2 justify-center">
              <button className="px-4 py-2 bg-gray-300 rounded" onClick={() => setShowDeleteModal(false)}>
                إلغاء
              </button>
              <button className="px-4 py-2 bg-red-600 text-white rounded" onClick={handleDeleteRole} disabled={deleteLoading}>
                {deleteLoading ? 'جاري الحذف...' : 'حذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RolesTab; 