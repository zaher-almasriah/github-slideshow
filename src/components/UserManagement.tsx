import React, { useEffect, useState } from 'react';
import { getSupabaseClient } from '../supabaseClient';
import { usePermission } from '../hooks/usePermission';
import { useAppContext } from '../contexts/AppContext';
import { renderAvatar, avatarOptions as globalAvatarOptions, generateDefaultAvatar } from '../utils/avatarUtils';

import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  UserCheck,
  UserX,
  Shield,
  Users,
  Search,
  Filter,
  RefreshCw,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Database,
  Settings,
  User,
  Camera,
  Upload,
  Check
} from 'lucide-react';

// استخدام الأفاتارات من الملف المشترك
const avatarOptions = globalAvatarOptions;

const UserManagement: React.FC = () => {
  const { currentUser } = useAppContext();
  
  // الحصول على Supabase client
  const supabase = getSupabaseClient();
  const [users, setUsers] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [userPermissions, setUserPermissions] = useState<{ [userId: string]: string[] }>({});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showDatabaseCleanup, setShowDatabaseCleanup] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string>('');
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [newUser, setNewUser] = useState({
    name: '',
    username: '',
    password: '',
    email: '',
            role: 'user',
    active: true,
    avatar: ''
  });
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [rolePermissions, setRolePermissions] = useState<{ [roleName: string]: string[] }>({});

  // التحقق من الصلاحيات للمستخدم الحالي
  const [canViewUsers, loadingViewUsers] = usePermission(currentUser?.id || '', 'ACCESS_USERS');
  const [canEditUsers, loadingEditUsers] = usePermission(currentUser?.id || '', 'CAN_EDIT_USERS');
  const [canDeleteUsers, loadingDeleteUsers] = usePermission(currentUser?.id || '', 'CAN_DELETE_USERS');
  const [canCreateUsers, loadingCreateUsers] = usePermission(currentUser?.id || '', 'CAN_CREATE_USERS');

  // حساب الصلاحيات المركبة
  const canManageUsers = canEditUsers || canDeleteUsers;
  const loadingPermissions = loadingViewUsers || loadingEditUsers || loadingDeleteUsers || loadingCreateUsers;

  // دالة لتحديث الصلاحيات عند تغيير الدور
  const handleRoleChange = (newRole: string, isEditMode: boolean = false) => {
    const rolePerms = rolePermissions[newRole] || [];
    setSelectedPermissions(rolePerms);
    
    if (isEditMode && editingUser) {
      setEditingUser({ ...editingUser, role: newRole });
    } else {
      setNewUser({ ...newUser, role: newRole });
    }
  };

  // دالة لتفعيل جميع صلاحيات الدور الحالي
  const applyRolePermissions = (roleName: string) => {
    const rolePerms = rolePermissions[roleName] || [];
    setSelectedPermissions(rolePerms);
  };

  // دالة لإلغاء تفعيل جميع الصلاحيات
  const clearAllPermissions = () => {
    setSelectedPermissions([]);
  };

  // جلب المستخدمين من قاعدة البيانات
  const fetchUsers = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, username, email, role, active, avatar')
        .order('id', { ascending: true });
      if (error) setErrorMsg(error.message);
      else setUsers(data || []);
    } catch (err) {
      setErrorMsg('حدث خطأ أثناء جلب المستخدمين');
    } finally {
        setLoading(false);
      }
  };

      // جلب الصلاحيات
  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('permissions')
        .select('id, code, name, description')
        .order('name');
      if (!error) {
        setPermissions(data || []);
      }
    } catch (err) {
      console.error('خطأ في جلب الصلاحيات:', err);
    }
  };

  // جلب الأدوار من قاعدة البيانات
  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name');

      if (error) {
        console.error('خطأ في جلب الأدوار:', error);
        return;
      }

      setRoles(data || []);
    } catch (err) {
      console.error('خطأ في جلب الأدوار:', err);
    }
  };

  // جلب صلاحيات الأدوار
  const fetchRolePermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select(`
          role_id,
          permission_id,
          roles!inner(name),
          permissions!inner(code)
        `);

      if (error) {
        console.error('خطأ في جلب صلاحيات الأدوار:', error);
        return;
      }

      if (data) {
        const rolePermsMap: { [roleName: string]: string[] } = {};
        data.forEach((rp: any) => {
          const roleName = rp.roles.name;
          const permCode = rp.permissions.code;
          if (!rolePermsMap[roleName]) {
            rolePermsMap[roleName] = [];
          }
          rolePermsMap[roleName].push(permCode);
        });
        setRolePermissions(rolePermsMap);
        console.log('صلاحيات الأدوار:', rolePermsMap);
      }
    } catch (err) {
      console.error('خطأ في جلب صلاحيات الأدوار:', err);
    }
  };

  // جلب صلاحيات المستخدمين
  const fetchUserPermissions = async () => {
    try {
      console.log('بدء جلب صلاحيات المستخدمين...');
      
      const { data, error } = await supabase
        .from('user_permissions')
        .select('user_id, permission_id');

      if (error) {
        console.error('خطأ في جلب user_permissions:', error);
        return;
      }

      console.log('user_permissions data:', data);

      if (data && data.length > 0) {
        const permsMap: { [userId: string]: string[] } = {};
        const permissionIds = [...new Set(data.map((up: any) => up.permission_id))];
        
        console.log('permission IDs:', permissionIds);
        
        if (permissionIds.length > 0) {
          const { data: permissionsForUsers, error: permError } = await supabase
            .from('permissions')
            .select('id, code')
            .in('id', permissionIds);

          if (permError) {
            console.error('خطأ في جلب permissions:', permError);
            return;
          }

          console.log('permissions data:', permissionsForUsers);

          if (permissionsForUsers) {
            const permIdToCode: { [id: string]: string } = {};
            permissionsForUsers.forEach((perm: any) => {
              permIdToCode[perm.id] = perm.code;
            });

            console.log('permIdToCode mapping:', permIdToCode);

            data.forEach((up: any) => {
              if (!permsMap[up.user_id]) permsMap[up.user_id] = [];
              const permCode = permIdToCode[up.permission_id];
              if (permCode) {
                permsMap[up.user_id].push(permCode);
              }
            });
          }
        }
        
        console.log('Final permsMap:', permsMap);
        setUserPermissions(permsMap);
      } else {
        console.log('لا توجد بيانات في user_permissions');
        setUserPermissions({});
      }
    } catch (err) {
      console.error('خطأ في جلب صلاحيات المستخدمين:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchPermissions();
    fetchRoles();
    fetchRolePermissions(); // Add this line to fetch role permissions
    fetchUserPermissions();
  }, []); // تشغيل مرة واحدة فقط - لا يوجد تحديث تلقائي

  // سجلات تصحيح للصلاحيات
  useEffect(() => {
    console.log('=== [UserManagement Permissions Debug] ===');
    console.log('currentUser:', currentUser);
    console.log('canViewUsers:', canViewUsers);
    console.log('canEditUsers:', canEditUsers);
    console.log('canDeleteUsers:', canDeleteUsers);
    console.log('canCreateUsers:', canCreateUsers);
    console.log('canManageUsers (combined):', canManageUsers);
    console.log('loadingPermissions:', loadingPermissions);
  }, [currentUser, canViewUsers, canEditUsers, canDeleteUsers, canCreateUsers, canManageUsers, loadingPermissions]);

  // إضافة مستخدم جديد
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      // --- منطق تغيير الدور تلقائياً ---
      let userToAdd = { ...newUser };
      if (hasAllPermissions(selectedPermissions, permissions)) {
        userToAdd.role = 'admin';
      } else if (newUser.role === 'admin') {
        userToAdd.role = 'user';
      }
      // إضافة المستخدم
      const { data: newUserData, error: userError } = await supabase
        .from('users')
        .insert(userToAdd)
        .select();

      if (userError) {
        setErrorMsg(userError.message);
        return;
      }

      // إضافة الصلاحيات إذا تم اختيارها
      if (selectedPermissions.length > 0 && newUserData && newUserData[0]) {
        const userId = newUserData[0].id;

          // جلب معرفات الصلاحيات
        const { data: permissionsData } = await supabase
            .from('permissions')
            .select('id, code')
          .in('code', selectedPermissions);
        
        if (permissionsData) {
          const userPermissionsToInsert = permissionsData.map(perm => ({
            user_id: userId,
            permission_id: perm.id
          }));
          
          const { error: permError } = await supabase
                .from('user_permissions')
            .insert(userPermissionsToInsert);
          
          if (permError) {
          console.error('خطأ في إضافة الصلاحيات:', permError);
          }
        }
      }

      setNewUser({ name: '', username: '', password: '', email: '', role: 'user', active: true, avatar: '' });
      setSelectedPermissions([]);
      setShowAddModal(false);
      fetchUsers();
      fetchUserPermissions();
      setSuccessMsg('تم إضافة المستخدم بنجاح');
    } catch (err) {
      setErrorMsg('حدث خطأ أثناء إضافة المستخدم');
    } finally {
    setLoading(false);
  }
  };

  // حذف مستخدم
  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف المستخدم؟')) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);
      if (error) setErrorMsg(error.message);
      else {
        fetchUsers();
        setSuccessMsg('تم حذف المستخدم بنجاح');
      }
    } catch (err) {
      setErrorMsg('حدث خطأ أثناء حذف المستخدم');
    } finally {
      setLoading(false);
    }
  };

  // بدء تعديل مستخدم
  const startEditUser = (user: any) => {
    setEditingUser({ ...user });
    setSelectedPermissions(userPermissions[user.id] || []);
    setShowEditModal(true);
  };

  // حفظ التعديل
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      // --- منطق تغيير الدور تلقائياً ---
      let updateData = { ...editingUser };
      if (hasAllPermissions(selectedPermissions, permissions)) {
        updateData.role = 'admin';
      } else if (editingUser.role === 'admin') {
        updateData.role = 'user';
      }
      const { id, newPassword, ...rest } = updateData;
      let finalUpdateData = { ...rest };
      if (newPassword && newPassword.trim() !== '') {
        finalUpdateData = { ...finalUpdateData, password: newPassword };
      }
      // تحديث بيانات المستخدم
      const { error } = await supabase
        .from('users')
        .update(finalUpdateData)
        .eq('id', id);

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      // تحديث الصلاحيات
      // حذف الصلاحيات الحالية
      await supabase
          .from('user_permissions')
          .delete()
        .eq('user_id', id);

      // إضافة الصلاحيات الجديدة
      if (selectedPermissions.length > 0) {
        const { data: permissionsData } = await supabase
            .from('permissions')
          .select('id, code')
          .in('code', selectedPermissions);
        
        if (permissionsData) {
          const userPermissionsToInsert = permissionsData.map(perm => ({
            user_id: id,
            permission_id: perm.id
          }));
          
          const { error: permError } = await supabase
              .from('user_permissions')
            .insert(userPermissionsToInsert);
          
          if (permError) {
            console.error('خطأ في تحديث الصلاحيات:', permError);
          }
        }
      }

      setEditingUser(null);
      setSelectedPermissions([]);
      setShowEditModal(false);
      fetchUsers();
      fetchUserPermissions();
      setSuccessMsg('تم تعديل المستخدم بنجاح');
    } catch (err) {
      setErrorMsg('حدث خطأ أثناء تعديل المستخدم');
    } finally {
      setLoading(false);
    }
  };

  // فلترة المستخدمين
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && user.active !== false) ||
      (filterStatus === 'inactive' && user.active === false);
    return matchesSearch && matchesRole && matchesStatus;
  });

  // عرض الصلاحيات
  const getPermissionNames = (userPerms: string[]) => {
    if (!userPerms || userPerms.length === 0) {
      return (
        <div>
          <div className="text-gray-500">لا توجد صلاحيات</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded text-xs font-medium bg-gray-400 border border-gray-500">
              <X className="w-2.5 h-2.5 text-white" />
            </span>
            <span className="text-xs text-gray-500">
              0 صلاحية
            </span>
          </div>
        </div>
      );
    }

    const permissionNames = userPerms.map(permCode => {
      const permission = permissions.find(p => p.code === permCode);
      return permission ? permission.name : permCode;
    });

    // دالة مساعدة لعرض الصلاحيات بفاصل | ملون
    const renderWithPipe = (arr: string[]) => (
      <span>
        {arr.map((perm, idx) => (
          <span key={perm}>
            <span style={{ color: '#222' }}>{perm}</span>
            {idx < arr.length - 1 && (
              <span style={{ color: '#2563eb', margin: '0 6px', fontWeight: 'bold' }}>|</span>
            )}
          </span>
        ))}
      </span>
    );

    if (permissionNames.length <= 3) {
      return (
        <div>
          <div className="text-gray-900">{renderWithPipe(permissionNames)}</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded text-xs font-medium bg-green-600 border border-green-700">
              <Check className="w-2.5 h-2.5 text-white" />
            </span>
            <span className="text-xs text-gray-600">
              {permissionNames.length} صلاحية
            </span>
          </div>
        </div>
      );
    } else {
      const firstThree = permissionNames.slice(0, 3);
      const remaining = permissionNames.length - 3;
      return (
        <div>
          <div className="text-gray-900">
            {renderWithPipe(firstThree)}
            <span style={{ color: '#888', marginRight: 8, fontWeight: 'bold' }}>
              + <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{remaining} أخرى</span>
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded text-xs font-medium bg-green-600 border border-green-700">
              <Check className="w-2.5 h-2.5 text-white" />
            </span>
            <span className="text-xs text-gray-600">
              {permissionNames.length} صلاحية
            </span>
          </div>
        </div>
      );
    }
  };

  // إنشاء أفاتار
  const generateAvatar = (name: string, size: 'sm' | 'md' | 'lg' = 'md') => {
    return generateDefaultAvatar(name, size);
  };

  // عرض الأفاتار - موحد
  const renderUserAvatar = (avatar: string, name: string, size: 'sm' | 'md' | 'lg' = 'md') => {
    return renderAvatar(avatar, name, size, true);
  };

  // شارة الدور
  const getRoleBadge = (role: string) => {
    // البحث عن الدور في قائمة الأدوار المحملة
    const roleData = roles.find(r => r.name === role);
    if (roleData) {
      const roleConfig = {
        admin: { bg: 'bg-red-100 text-red-800' },
        user: { bg: 'bg-blue-100 text-blue-800' },
        technician: { bg: 'bg-green-100 text-green-800' }
      };
      const config = roleConfig[role as keyof typeof roleConfig] || { bg: 'bg-gray-100 text-gray-800' };
      return <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg}`}>{roleData.description || roleData.name}</span>;
    }
    
    // إذا لم يتم العثور على الدور، استخدم القيم الافتراضية
    const roleConfig = {
      admin: { text: 'مدير', bg: 'bg-red-100 text-red-800' },
      user: { text: 'مستخدم', bg: 'bg-blue-100 text-blue-800' },
      technician: { text: 'فني', bg: 'bg-green-100 text-green-800' }
    };
    const config = roleConfig[role as keyof typeof roleConfig] || { text: role, bg: 'bg-gray-100 text-gray-800' };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg}`}>{config.text}</span>;
  };

  // دالة ترجمة اسم الدور إذا لم يوجد وصف
  const getRoleDisplayName = (role: any) => {
    if (role.description && role.description.trim() !== '') return role.description;
    switch (role.name) {
      case 'admin': return 'مدير';
      case 'technician': return 'فني';
      case 'user': return 'مستخدم عادي';
      case 'receptionist': return 'موظف استقبال';
      case 'accountant': return 'محاسب';
      default: return role.name;
    }
  };

  // اختيار الأفاتار
  const AvatarSelector = ({ onSelect, currentAvatar = '' }: { onSelect: (avatar: string) => void, currentAvatar?: string }) => {
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
            onSelect(result);
        };
        reader.readAsDataURL(file);
      }
    };

    const handleAvatarSelect = (avatarId: string) => {
      const avatar = avatarOptions.find(opt => opt.id === avatarId);
      if (avatar) {
        // حفظ معرف الأفاتار بدلاً من الصورة أو الأيقونة
        onSelect(avatarId);
      }
    };

    return (
      <div className="space-y-4">
              <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            رفع صورة شخصية
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          </div>

          <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            اختيار من المعرض
          </label>
                     <div className="grid grid-cols-4 gap-3 max-h-60 overflow-y-auto">
            {avatarOptions.map((avatar) => (
                             <button
                  key={avatar.id}
                  onClick={() => handleAvatarSelect(avatar.id)}
                 className={`p-3 rounded-lg border-2 hover:border-blue-500 transition-colors ${
                   currentAvatar === avatar.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                 }`}
                  title={avatar.name}
                >
                                 {avatar.image ? (
                  <img 
                    src={avatar.image} 
                    alt={avatar.name}
                     className="w-12 h-12 rounded-full object-cover"
                   />
                 ) : (
                   <div className={`w-12 h-12 rounded-full flex items-center justify-center ${avatar.bg || 'bg-gray-100'} ${avatar.size || 'text-lg'}`}>
                  {avatar.icon}
                </div>
                 )}
            </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // خريطة ربط الصلاحيات بالأقسام الرئيسية
  const permissionSectionMap: { [code: string]: string } = {
    // إدارة الزبائن
    'ACCESS_CUSTOMERS': 'CUSTOMERS',
    'EDIT_CUSTOMERS': 'CUSTOMERS',
    'DELETE_CUSTOMERS': 'CUSTOMERS',
    // الاستعلامات والمتابعة
    'DEVICE_INQUIRY': 'DEVICE_INQUIRY',
    'ACCESS_DEVICES': 'DEVICE_INQUIRY',
    'EDIT_DEVICES': 'DEVICE_INQUIRY',
    'DELETE_DEVICES': 'DEVICE_INQUIRY',
    'DEVICE_ENTRY': 'DEVICE_ENTRY',
    'DEVICE_MODELS': 'DEVICE_MODELS',
    // إدارة الصيانة
    'ACCESS_MAINTENANCE': 'MAINTENANCE',
    'CREATE_MAINTENANCE_RECORDS': 'MAINTENANCE',
    'EDIT_MAINTENANCE': 'MAINTENANCE',
    'EDIT_MAINTENANCE_RECORDS': 'MAINTENANCE',
    'DELETE_MAINTENANCE': 'MAINTENANCE',
    'DELETE_MAINTENANCE_RECORDS': 'MAINTENANCE',
    'VIEW_MAINTENANCE_RECORDS': 'MAINTENANCE',
    // إدارة الفنيين
    'ACCESS_TECHNICIANS': 'TECHNICIANS',
    'EDIT_TECHNICIANS': 'TECHNICIANS',
    'DELETE_TECHNICIANS': 'TECHNICIANS',
    // إدارة المستخدمين
    'ACCESS_USERS': 'USERS',
    'CAN_CREATE_USERS': 'USERS',
    'CAN_EDIT_USERS': 'USERS',
    'CAN_DELETE_USERS': 'USERS',
    // التقارير
    'ACCESS_REPORTS': 'REPORTS',
    // السجلات المالية
    'CREATE_FINANCIAL_RECORDS': 'FINANCIAL',
    'EDIT_FINANCIAL_RECORDS': 'FINANCIAL',
    'DELETE_FINANCIAL_RECORDS': 'FINANCIAL',
    'VIEW_FINANCIAL_RECORDS': 'FINANCIAL',
    // صلاحيات عامة أو إدارية
    'ADMIN_ACCESS': 'USERS',
  };

  // --- تعديل طريقة تصنيف الصلاحيات الأساسية ---
  // في جدول الصلاحيات، اعتبر DEVICE_ENTRY و DEVICE_INQUIRY و DEVICE_MODELS صلاحيات أساسية فقط
  function isMainPermission(permission: any) {
    // صلاحيات إدارة الفنيين الأساسية فقط ACCESS_TECHNICIANS
    if (permission.code === 'EDIT_TECHNICIANS' || permission.code === 'DELETE_TECHNICIANS') {
      return false;
    }
    // لا تعتبر ACCESS_DEVICES صلاحية أساسية في قسم الاستعلامات والمتابعة
    if (permission.code === 'ACCESS_DEVICES') {
      return false;
    }
    return permission.code.startsWith('ACCESS_') ||
      permission.code === 'DEVICE_ENTRY' ||
      permission.code === 'DEVICE_INQUIRY' ||
      permission.code === 'DEVICE_MODELS';
  }

  function groupPermissions(permissions: any[]) {
    const groups: { [section: string]: any[] } = {};
    permissions.forEach((perm) => {
      const section = permissionSectionMap[perm.code] || 'أخرى';
      if (!groups[section]) groups[section] = [];
      groups[section].push(perm);
    });
    return groups;
  }

  // دالة مساعدة لعرض اسم القسم بالعربية
  function getSectionName(section: string) {
    switch (section) {
      case 'DEVICES': return 'الأجهزة';
      case 'CUSTOMERS': return 'العملاء';
      case 'MAINTENANCE': return 'الصيانة';
      case 'USERS': return 'المستخدمين';
      case 'REPORTS': return 'التقارير';
      case 'FINANCIAL': return 'السجلات المالية';
      case 'TECHNICIANS': return 'الفنيين';
      case 'DATABASE': return 'قاعدة البيانات';
      case 'SYNC': return 'مزامنة البيانات';
      default: return 'أخرى';
    }
  }

  // ترتيب الأقسام حسب القوائم المطلوبة
  const sectionOrder = [
    'DEVICE_ENTRY',         // إدخال الأجهزة
    'DEVICE_INQUIRY',       // الاستعلامات والمتابعة
    'DEVICE_MODELS',        // إضافة نماذج الأجهزة
    'TECHNICIANS',          // إدارة الفنيين
    'MAINTENANCE',          // أعمال الصيانة
    'CUSTOMERS',            // حساب الزبائن
    'USERS',                // المستخدمين
    'REPORTS',              // التقارير
    'FINANCIAL',            // السجلات المالية
    'DATABASE',             // قاعدة البيانات
    'SYNC',                 // مزامنة البيانات
    'أخرى'                  // أي قسم آخر
  ];

  // مصفوفة القوائم الرئيسية بالعربية
  const mainMenus = [
    { key: 'DEVICE_ENTRY', label: 'إدخال الأجهزة' },
    { key: 'DEVICE_INQUIRY', label: 'الاستعلامات والمتابعة' },
    { key: 'DEVICE_MODELS', label: 'إضافة نماذج الأجهزة' },
    { key: 'TECHNICIANS', label: 'إدارة الفنيين' },
    { key: 'MAINTENANCE', label: 'أعمال الصيانة' },
    { key: 'CUSTOMERS', label: 'حساب الزبائن' },
    { key: 'USERS', label: 'المستخدمين' },
    { key: 'REPORTS', label: 'التقارير' }
  ];

  // عند بناء جدول الصلاحيات:
  const grouped = groupPermissions(permissions);
  const orderedSections = mainMenus.map(m => m.key).concat(
    Object.keys(grouped).filter(section => !mainMenus.map(m => m.key).includes(section))
  );

  // ترتيب مخصص لصلاحيات قسم الاستعلامات والمتابعة
  const deviceInquirySubPermissionOrder = [
    'ACCESS_DEVICES', // عرض الأجهزة
    'EDIT_DEVICES',   // تعديل الأجهزة
    'DELETE_DEVICES'  // حذف الأجهزة
  ];

  // التحقق من الصلاحيات قبل عرض المحتوى
  if (loadingPermissions) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <h3 className="text-lg font-medium text-blue-600 mb-2">جاري التحقق من الصلاحيات...</h3>
      </div>
    );
  }

  if (!canViewUsers) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 bg-red-100 rounded-full">
            <Users size={48} className="text-red-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">❌ غير مصرح لك بالوصول</h3>
            <p className="text-gray-600">ليس لديك صلاحية لعرض المستخدمين</p>
          </div>
        </div>
      </div>
    );
  }

  // دالة مساعدة للتحقق هل المستخدم يملك كل الصلاحيات
  function hasAllPermissions(selected: string[], all: any[]): boolean {
    const allCodes = all.map(p => p.code).filter(Boolean);
    return allCodes.every(code => selected.includes(code));
  }

  return (
    <div className="p-6">
      {/* كود اختبار: عرض جميع الأدوار */}
      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded text-sm text-yellow-900">
        <b>الأدوار من قاعدة البيانات:</b>
        <ul>
          {roles.map(role => (
            <li key={role.id}>
              <b>{role.name}</b> — {role.description || <span className="text-gray-400">بدون وصف</span>}
            </li>
          ))}
        </ul>
      </div>
      {/* حذف العنوان */}
      {/* نقل زر إضافة مستخدم جديد إلى جانب إعادة تعيين */}
      {/* فلاتر البحث */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">البحث</label>
            <input
              type="text"
              placeholder="البحث بالاسم أو اسم المستخدم..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الدور</label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">جميع الأدوار</option>
              {roles.map((role) => (
                <option key={role.id} value={role.name}>
                  {getRoleDisplayName(role)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">جميع الحالات</option>
              <option value="active">نشط</option>
              <option value="inactive">معطل</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterRole('all');
                setFilterStatus('all');
              }}
              className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} />
              إعادة تعيين
            </button>
            {canCreateUsers && (
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus size={20} />
                إضافة مستخدم جديد
              </button>
            )}
          </div>
        </div>
      </div>

      {/* جدول المستخدمين */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    المستخدم
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  معلومات الاتصال
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الدور والحالة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الصلاحيات
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {renderUserAvatar(user.avatar, user.name, 'md')}
                        </div>
                      <div className="mr-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">@{user.username}</div>
                        </div>
                      </div>
                    </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.email}</div>
                    </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-2">
                      {getRoleBadge(user.role)}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.active ? 'نشط' : 'معطل'}
                          </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs">
                      {getPermissionNames(userPermissions[user.id] || [])}
                      </div>
                    </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        {canEditUsers && (
                          <button
                            onClick={() => startEditUser(user)}
                            className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1"
                          >
                            <Edit size={16} />
                            تعديل
                          </button>
                        )}
                        {canDeleteUsers && (
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-900 flex items-center gap-1"
                          >
                            <Trash2 size={16} />
                            حذف
                          </button>
                        )}
                        {!canEditUsers && !canDeleteUsers && (
                          <span className="text-gray-400 text-xs">لا توجد صلاحيات إدارية</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      </div>

      {/* نموذج إضافة مستخدم جديد */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
            {/* زر إغلاق من الأعلى */}
            <button
              type="button"
              onClick={() => {
                setShowAddModal(false);
                setSelectedPermissions([]);
                setNewUser({ name: '', username: '', password: '', email: '', role: 'user', active: true, avatar: '' });
              }}
              className="absolute top-3 left-3 text-gray-400 hover:text-gray-700 focus:outline-none"
              title="إغلاق"
            >
              <X size={28} />
            </button>
            <div className="mt-3">
              <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">إضافة مستخدم جديد</h3>
              <form onSubmit={handleAddUser} className="space-y-6">
                {/* معلومات المستخدم الأساسية - عمودين */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الاسم</label>
                    <input
                      type="text"
                      required
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">اسم المستخدم</label>
                    <input
                      type="text"
                      required
                      value={newUser.username}
                      onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
                      <input
                      type="password"
                        required
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الدور</label>
                    <select
                      value={newUser.role}
                      onChange={(e) => handleRoleChange(e.target.value, false)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {roles.map((role) => (
                        <option key={role.id} value={role.name}>
                          {getRoleDisplayName(role)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center">
                      <input
                      type="checkbox"
                      checked={newUser.active}
                      onChange={(e) => setNewUser({ ...newUser, active: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="mr-2 block text-sm text-gray-900">نشط</label>
                      </div>
                    </div>

                {/* اختيار الصلاحيات - 4 أعمدة */}
                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الصلاحيات</label>
                  
                  {/* أزرار التحكم في الصلاحيات */}
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => applyRolePermissions(newUser.role)}
                      className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 border border-blue-300"
                    >
                      تفعيل صلاحيات الدور الحالي
                    </button>
                    <button
                      type="button"
                      onClick={clearAllPermissions}
                      className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 border border-gray-300"
                    >
                      إلغاء جميع الصلاحيات
                    </button>
                    <span className="text-xs text-gray-500 flex items-center">
                      {selectedPermissions.length} صلاحية مختارة
                      {selectedPermissions.length > 0 && (
                        <span className="mr-2 text-blue-600">
                          ({selectedPermissions.map(code => {
                            const perm = permissions.find(p => p.code === code);
                            return perm ? perm.name : code;
                          }).join(', ')})
                        </span>
                      )}
                    </span>
                  </div>
                  
                  {/* استبدل جدول الصلاحيات ليعود للوضع الأفقي: */}
                  <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-md p-4">
                    <table className="w-full text-sm border">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="p-2 border">القسم</th>
                          <th className="p-2 border">الصلاحية الأساسية</th>
                          <th className="p-2 border">الصلاحيات الفرعية</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orderedSections.map(section => (
                          <tr key={section} className="align-top">
                            <td className="p-2 border font-bold text-blue-700 whitespace-nowrap">
                              {mainMenus.find(m => m.key === section)?.label || getSectionName(section)}
                            </td>
                            <td className="p-2 border">
                              {grouped[section]?.filter(isMainPermission).map((permission: any) => (
                                <label key={permission.code} className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={selectedPermissions.includes(permission.code)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedPermissions([...selectedPermissions, permission.code]);
                                      } else {
                                        setSelectedPermissions(selectedPermissions.filter(p => p !== permission.code));
                                      }
                                    }}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                  />
                                  <span>{permission.name}</span>
                                </label>
                              ))}
                            </td>
                            <td className="p-2 border">
                              <div className="flex flex-wrap gap-3">
                                {(section === 'DEVICE_INQUIRY'
                                  ? deviceInquirySubPermissionOrder
                                      .map(code => grouped[section]?.find((p: any) => p.code === code))
                                      .filter(Boolean)
                                  : grouped[section]?.filter((p: any) => !isMainPermission(p))
                                ).map((permission: any) => (
                                  <label key={permission.code} className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={selectedPermissions.includes(permission.code)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedPermissions([...selectedPermissions, permission.code]);
                                        } else {
                                          setSelectedPermissions(selectedPermissions.filter(p => p !== permission.code));
                                        }
                                      }}
                                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <span>{permission.name}</span>
                                </label>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </div>

                {/* اختيار الأفاتار */}
                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الصورة الشخصية</label>
                                      {newUser.avatar && (
                      <div className="mb-2">
                        {renderUserAvatar(newUser.avatar, newUser.name || 'مستخدم جديد', 'lg')}
                    </div>
                    )}
                  <AvatarSelector 
                    onSelect={(avatar) => setNewUser({ ...newUser, avatar })}
                    currentAvatar={newUser.avatar}
                  />
                  </div>

                <div className="flex gap-4 justify-center">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 text-white py-3 px-8 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Plus size={20} />
                    {loading ? 'جاري الإضافة...' : 'إضافة المستخدم'}
                  </button>
                  <button
                    type="button"
                  onClick={() => {
                      setShowAddModal(false);
                      setSelectedPermissions([]);
                      setNewUser({ name: '', username: '', password: '', email: '', role: 'user', active: true, avatar: '' });
                  }}
                    className="bg-gray-300 text-gray-700 py-3 px-8 rounded-md hover:bg-gray-400 flex items-center gap-2"
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

      {/* نموذج تعديل المستخدم */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
            {/* زر إغلاق من الأعلى */}
            <button
              type="button"
              onClick={() => {
                setShowEditModal(false);
                setSelectedPermissions([]);
              }}
              className="absolute top-3 left-3 text-gray-400 hover:text-gray-700 focus:outline-none"
              title="إغلاق"
            >
              <X size={28} />
            </button>
            <div className="mt-3">
              <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">تعديل المستخدم</h3>
              <form onSubmit={handleEditUser} className="space-y-6">
                {/* معلومات المستخدم الأساسية - عمودين */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الاسم</label>
                    <input
                      type="text"
                      required
                      value={editingUser.name}
                      onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">اسم المستخدم</label>
                    <input
                      type="text"
                      required
                      value={editingUser.username}
                      onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
                    <input
                      type="email"
                      value={editingUser.email}
                      onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور الجديدة (اختياري)</label>
                    <input
                      type="password"
                      value={editingUser.newPassword || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, newPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="اتركها فارغة إذا لا تريد تغيير كلمة المرور"
                      autoComplete="new-password"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الدور</label>
                    <select
                      value={editingUser.role}
                      onChange={(e) => handleRoleChange(e.target.value, true)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {roles.map((role) => (
                        <option key={role.id} value={role.name}>
                          {getRoleDisplayName(role)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingUser.active}
                      onChange={(e) => setEditingUser({ ...editingUser, active: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="mr-2 block text-sm text-gray-900">نشط</label>
                  </div>
                </div>
                {/* اختيار الصلاحيات - 4 أعمدة */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الصلاحيات</label>
                  
                  {/* أزرار التحكم في الصلاحيات */}
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => applyRolePermissions(editingUser.role)}
                      className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 border border-blue-300"
                    >
                      تفعيل صلاحيات الدور الحالي
                    </button>
                    <button
                      type="button"
                      onClick={clearAllPermissions}
                      className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 border border-gray-300"
                    >
                      إلغاء جميع الصلاحيات
                    </button>
                    <span className="text-xs text-gray-500 flex items-center">
                      {selectedPermissions.length} صلاحية مختارة
                      {selectedPermissions.length > 0 && (
                        <span className="mr-2 text-blue-600">
                          ({selectedPermissions.map(code => {
                            const perm = permissions.find(p => p.code === code);
                            return perm ? perm.name : code;
                          }).join(', ')})
                        </span>
                      )}
                    </span>
                  </div>
                  
                  {/* استبدل جدول الصلاحيات ليعود للوضع الأفقي: */}
                  <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-md p-4">
                    <table className="w-full text-sm border">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="p-2 border">القسم</th>
                          <th className="p-2 border">الصلاحية الأساسية</th>
                          <th className="p-2 border">الصلاحيات الفرعية</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orderedSections.map(section => (
                          <tr key={section} className="align-top">
                            <td className="p-2 border font-bold text-blue-700 whitespace-nowrap">
                              {mainMenus.find(m => m.key === section)?.label || getSectionName(section)}
                            </td>
                            <td className="p-2 border">
                              {grouped[section]?.filter(isMainPermission).map((permission: any) => (
                                <label key={permission.code} className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={selectedPermissions.includes(permission.code)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedPermissions([...selectedPermissions, permission.code]);
                                      } else {
                                        setSelectedPermissions(selectedPermissions.filter(p => p !== permission.code));
                                      }
                                    }}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                  />
                                  <span>{permission.name}</span>
                                </label>
                              ))}
                            </td>
                            <td className="p-2 border">
                              <div className="flex flex-wrap gap-3">
                                {(section === 'DEVICE_INQUIRY'
                                  ? deviceInquirySubPermissionOrder
                                      .map(code => grouped[section]?.find((p: any) => p.code === code))
                                      .filter(Boolean)
                                  : grouped[section]?.filter((p: any) => !isMainPermission(p))
                                ).map((permission: any) => (
                                  <label key={permission.code} className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={selectedPermissions.includes(permission.code)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedPermissions([...selectedPermissions, permission.code]);
                                        } else {
                                          setSelectedPermissions(selectedPermissions.filter(p => p !== permission.code));
                                        }
                                      }}
                                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <span>{permission.name}</span>
                                </label>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </div>
                {/* اختيار الأفاتار */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الصورة الشخصية</label>
                  {editingUser.avatar && (
                    <div className="mb-2">
                      {renderUserAvatar(editingUser.avatar, editingUser.name, 'lg')}
                    </div>
                  )}
                  <AvatarSelector 
                    onSelect={(avatar) => setEditingUser({ ...editingUser, avatar })}
                    currentAvatar={editingUser.avatar}
                  />
                </div>
                <div className="flex gap-4 justify-center">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-green-600 text-white py-3 px-8 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Save size={20} />
                    {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedPermissions([]);
                    }}
                    className="bg-gray-300 text-gray-700 py-3 px-8 rounded-md hover:bg-gray-400 flex items-center gap-2"
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
    </div>
  );
};

export default UserManagement;

