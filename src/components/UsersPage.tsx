import React, { useEffect } from 'react';
import UserManagement from './UserManagement';
import { usePermission, debugSpecificUser } from '../hooks/usePermission';
import { Shield, Users, UserCheck, UserX, Edit } from 'lucide-react';

interface UsersPageProps {
  userId: string;
}

const UsersPage: React.FC<UsersPageProps> = ({ userId }) => {
  const [canViewUsers, loadingViewUsers] = usePermission(userId, 'ACCESS_USERS');
  const [canEditUsers, loadingEditUsers] = usePermission(userId, 'CAN_EDIT_USERS');
  const [canDeleteUsers, loadingDeleteUsers] = usePermission(userId, 'CAN_DELETE_USERS');
  
  // التحقق من أي صلاحية إدارية
  const canManageUsers = canEditUsers || canDeleteUsers;
  const loadingManageUsers = loadingEditUsers || loadingDeleteUsers;

  // تشخيص شامل للمستخدم
  useEffect(() => {
    if (userId) {
      console.log('=== [UsersPage Debug] ===');
      console.log('userId:', userId);
      console.log('canViewUsers:', canViewUsers);
      console.log('canEditUsers:', canEditUsers);
      console.log('canDeleteUsers:', canDeleteUsers);
      console.log('canManageUsers (combined):', canManageUsers);
      console.log('loadingViewUsers:', loadingViewUsers);
      console.log('loadingEditUsers:', loadingEditUsers);
      console.log('loadingDeleteUsers:', loadingDeleteUsers);
      console.log('loadingManageUsers (combined):', loadingManageUsers);
      
      try {
        const userPermissions = localStorage.getItem('userPermissions');
        const currentUser = localStorage.getItem('currentUser');
        console.log('userPermissions (localStorage):', userPermissions);
        console.log('currentUser (localStorage):', currentUser);
      } catch (e) {
        console.log('localStorage not available');
      }
      
      // تشخيص قاعدة البيانات للمستخدم المحدد
      debugSpecificUser(userId);
    }
  }, [userId, canViewUsers, canEditUsers, canDeleteUsers, canManageUsers, loadingViewUsers, loadingEditUsers, loadingDeleteUsers, loadingManageUsers]);

  if (loadingViewUsers || loadingManageUsers) {
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

  // إذا كان لديه صلاحية عرض المستخدمين، اعرض قائمة المستخدمين
  // مع رسالة توضيحية إذا لم يكن لديه صلاحيات إدارية
  return (
    <div className="space-y-6">
      {/* رسالة توضيحية إذا لم يكن لديه صلاحيات إدارية */}
      {!canManageUsers && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-full">
              <Users size={24} className="text-yellow-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-yellow-800 mb-1">👀 عرض فقط</h3>
              <p className="text-yellow-700 mb-3">يمكنك عرض المستخدمين فقط، لا يمكنك تعديلهم أو إدارتهم</p>
              
              {/* عرض الصلاحيات المتاحة */}
              <div className="bg-white rounded-lg p-3 text-sm border border-yellow-200">
                <h4 className="font-medium text-yellow-800 mb-2">الصلاحيات المتاحة:</h4>
                <div className="space-y-1">
                  <div className={`flex items-center gap-2 ${canViewUsers ? 'text-green-600' : 'text-gray-400'}`}>
                    <span>{canViewUsers ? '✅' : '❌'}</span>
                    <span>عرض المستخدمين</span>
                  </div>
                  <div className={`flex items-center gap-2 ${canEditUsers ? 'text-green-600' : 'text-gray-400'}`}>
                    <span>{canEditUsers ? '✅' : '❌'}</span>
                    <span>تعديل المستخدمين</span>
                  </div>
                  <div className={`flex items-center gap-2 ${canDeleteUsers ? 'text-green-600' : 'text-gray-400'}`}>
                    <span>{canDeleteUsers ? '✅' : '❌'}</span>
                    <span>حذف المستخدمين</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* معلومات إضافية للمديرين */}
      {canManageUsers && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Shield size={24} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">إدارة المستخدمين والصلاحيات</h3>
              <p className="text-gray-600">إضافة وتعديل وحذف المستخدمين وإدارة صلاحياتهم</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <UserCheck size={16} className="text-green-600" />
              <span>يمكنك إضافة مستخدمين جدد</span>
            </div>
            <div className="flex items-center gap-2">
              <Edit size={16} className="text-blue-600" />
              <span>يمكنك تعديل بيانات المستخدمين</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-purple-600" />
              <span>يمكنك إدارة الصلاحيات</span>
            </div>
          </div>
        </div>
      )}

      {/* صفحة إدارة المستخدمين */}
      <UserManagement />
    </div>
  );


};

export default UsersPage;
