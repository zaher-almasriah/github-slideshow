import React from 'react';
import DatabaseSync from './DatabaseSync';

const DatabaseSyncPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">مزامنة قاعدة البيانات</h1>
        <p className="text-gray-600 mt-2">تشخيص ومزامنة قاعدة البيانات مع هيكل النظام</p>
      </div>
      <DatabaseSync />
    </div>
  );
};

export default DatabaseSyncPage; 