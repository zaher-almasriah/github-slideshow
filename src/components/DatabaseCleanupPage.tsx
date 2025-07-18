import React from 'react';
import DatabaseCleanup from './DatabaseCleanup';

const DatabaseCleanupPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">تنظيف قاعدة البيانات</h1>
        <p className="text-gray-600 mt-2">إدارة الجداول وحذف الجداول غير المستخدمة</p>
      </div>
      <DatabaseCleanup />
    </div>
  );
};

export default DatabaseCleanupPage; 