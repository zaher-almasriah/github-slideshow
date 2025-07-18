import React, { useState } from 'react';
import RolesTab from './RolesTab';
import PermissionsTab from './PermissionsTab';
import UsersTab from './UsersTab';

const PermissionsManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'roles' | 'permissions' | 'users'>('roles');

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">إدارة الأدوار والصلاحيات</h1>
      <div className="flex gap-4 mb-6">
        <button
          className={`px-4 py-2 rounded ${activeTab === 'roles' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          onClick={() => setActiveTab('roles')}
        >
          الأدوار
        </button>
        <button
          className={`px-4 py-2 rounded ${activeTab === 'permissions' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          onClick={() => setActiveTab('permissions')}
        >
          الصلاحيات
        </button>
        <button
          className={`px-4 py-2 rounded ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          onClick={() => setActiveTab('users')}
        >
          المستخدمون
        </button>
      </div>
      <div>
        {activeTab === 'roles' && <RolesTab />}
        {activeTab === 'permissions' && <PermissionsTab />}
        {activeTab === 'users' && <UsersTab />}
      </div>
    </div>
  );
};

export default PermissionsManagement; 