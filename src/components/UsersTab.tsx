import React, { useEffect, useState } from 'react';
import { getSupabaseClient } from '../supabaseClient';

interface User {
  id: number;
  username: string;
  name: string;
}
interface Role {
  id: number;
  name: string;
}
interface Permission {
  id: number;
  name: string;
}

const UsersTab: React.FC = () => {
  // الحصول على Supabase client
  const supabase = getSupabaseClient();
  
  const [users, setUsers] = useState<User[]>([]);
  const [userRoles, setUserRoles] = useState<Record<number, Role>>({});
  const [userPermissions, setUserPermissions] = useState<Record<number, Permission[]>>({});
  const [loading, setLoading] = useState(true);
  const [showPermModal, setShowPermModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [customPerms, setCustomPerms] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [permError, setPermError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsersAndRoles();
  }, []);

  const fetchUsersAndRoles = async () => {
    setLoading(true);
    const { data: usersData } = await supabase.from('users').select('id, username, name');
    setUsers(usersData || []);
    const { data: userRolesData } = await supabase.from('user_roles').select('user_id, role_id');
    const { data: rolesData } = await supabase.from('roles').select('id, name');
    const { data: userPermsData } = await supabase.from('user_permissions').select('user_id, permission_id');
    const { data: rolePermsData } = await supabase.from('role_permissions').select('role_id, permission_id');
    const { data: permissionsData } = await supabase.from('permissions').select('id, name');

    const rolesMap: Record<number, Role> = {};
    if (userRolesData && rolesData) {
      userRolesData.forEach((ur: any) => {
        const role = rolesData.find((r: Role) => r.id === ur.role_id);
        if (role) rolesMap[ur.user_id] = role;
      });
    }
    setUserRoles(rolesMap);

    const permsMap: Record<number, Permission[]> = {};
    if (usersData && userPermsData && rolePermsData && permissionsData) {
      usersData.forEach((user: User) => {
        const role = rolesMap[user.id];
        let permIds: number[] = [];
        if (role) {
          permIds = rolePermsData.filter((rp: any) => rp.role_id === role.id).map((rp: any) => rp.permission_id);
        }
        const userPermIds = userPermsData.filter((up: any) => up.user_id === user.id).map((up: any) => up.permission_id);
        const allPermIds = Array.from(new Set([...permIds, ...userPermIds]));
        permsMap[user.id] = permissionsData.filter((p: Permission) => allPermIds.includes(p.id));
      });
    }
    setUserPermissions(permsMap);
    setLoading(false);
  };

  const openPermModal = async (user: User) => {
    setSelectedUser(user);
    setPermError(null);
    setSaving(false);
    // جلب جميع الصلاحيات
    const { data: permissionsData } = await supabase.from('permissions').select('id, name');
    setAllPermissions(permissionsData || []);
    // جلب صلاحيات الدور وصلاحيات المستخدم المخصصة
    const { data: userRolesData } = await supabase.from('user_roles').select('user_id, role_id');
    const { data: rolePermsData } = await supabase.from('role_permissions').select('role_id, permission_id');
    const { data: userPermsData } = await supabase.from('user_permissions').select('user_id, permission_id');
    const userRole = userRolesData?.find((ur: any) => ur.user_id === user.id)?.role_id;
    let rolePermIds: number[] = [];
    if (userRole) {
      rolePermIds = rolePermsData?.filter((rp: any) => rp.role_id === userRole).map((rp: any) => rp.permission_id) || [];
    }
    const userPermIds = userPermsData?.filter((up: any) => up.user_id === user.id).map((up: any) => up.permission_id) || [];
    // customPerms = صلاحيات المستخدم المخصصة فقط (بدون صلاحيات الدور)
    setCustomPerms(userPermIds);
    setShowPermModal(true);
  };

  const handlePermChange = (permId: number) => {
    setCustomPerms((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId]
    );
  };

  const saveUserPermissions = async () => {
    if (!selectedUser) return;
    setSaving(true);
    setPermError(null);
    // حذف جميع صلاحيات المستخدم المخصصة ثم إعادة إدراج المحدد
    const { error: delError } = await supabase.from('user_permissions').delete().eq('user_id', selectedUser.id);
    if (delError) {
      setPermError('خطأ أثناء حذف الصلاحيات القديمة');
      setSaving(false);
      return;
    }
    if (customPerms.length > 0) {
      const inserts = customPerms.map(pid => ({ user_id: selectedUser.id, permission_id: pid }));
      const { error: insError } = await supabase.from('user_permissions').insert(inserts);
      if (insError) {
        setPermError('خطأ أثناء حفظ الصلاحيات');
        setSaving(false);
        return;
      }
    }
    setShowPermModal(false);
    setSelectedUser(null);
    fetchUsersAndRoles();
    setSaving(false);
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">إدارة المستخدمين</h2>
      {loading ? (
        <div>جاري التحميل...</div>
      ) : (
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">اسم المستخدم</th>
              <th className="p-2">الاسم</th>
              <th className="p-2">الدور</th>
              <th className="p-2">الصلاحيات الفعلية</th>
              <th className="p-2">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td className="p-2">{user.username}</td>
                <td className="p-2">{user.name}</td>
                <td className="p-2">{userRoles[user.id]?.name || '—'}</td>
                <td className="p-2">{userPermissions[user.id]?.map(p => p.name).join('، ') || '—'}</td>
                <td className="p-2">
                  <button className="px-2 py-1 bg-blue-500 text-white rounded mx-1" onClick={() => openPermModal(user)}>
                    تعديل الصلاحيات
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {/* Modal لتعديل صلاحيات المستخدم */}
      {showPermModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-bold mb-4">تعديل صلاحيات المستخدم: {selectedUser.username}</h3>
            <div className="mb-4">
              <div className="font-semibold mb-2">الصلاحيات المخصصة:</div>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {allPermissions.map((perm) => (
                  <label key={perm.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={customPerms.includes(perm.id)}
                      onChange={() => handlePermChange(perm.id)}
                    />
                    {perm.name}
                  </label>
                ))}
              </div>
            </div>
            {permError && <div className="text-red-600 mb-2">{permError}</div>}
            <div className="flex gap-2 justify-end">
              <button className="px-4 py-2 bg-gray-300 rounded" onClick={() => setShowPermModal(false)}>
                إلغاء
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={saveUserPermissions} disabled={saving}>
                {saving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersTab; 