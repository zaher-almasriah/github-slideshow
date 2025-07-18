import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import DeviceEntry from './components/DeviceEntry';
import DeviceInquiry from './components/DeviceInquiry';
import DeviceModels from './components/DeviceModels';
import TechniciansManagement from './components/TechniciansManagement';
import MaintenanceWork from './components/MaintenanceWork';
import CustomerManagement from './components/CustomerManagement';
import Reports from './components/Reports';
import { getSupabaseClient } from './supabaseClient';
import { CheckUnmatchedTechnicianDevices } from './CheckUnmatchedTechnicianDevices';
import UsersPage from './components/UsersPage';
import { hasCurrentUserPermission } from './hooks/usePermission';
import { useAppContext } from './contexts/AppContext';

// ===== إصلاحات التحديث المستمر =====
// تم إصلاح dependency arrays في useEffect لتجنب التحديث المستمر
// =====================================

import LoginPage from './components/LoginPage';

function App() {
  // الحصول على Supabase client
  const supabase = getSupabaseClient();
  
  const [currentView, setCurrentView] = useState('device-entry');
  const [loading, setLoading] = useState(true);
  // حفظ واسترجاع الثيم من localStorage
  const getInitialTheme = () => {
    const saved = localStorage.getItem('theme');
    if (saved === 'classic' || saved === 'blue-light' || saved === 'blue-dark' || saved === 'gray-light' || saved === 'green' || saved === 'purple' || saved === 'dark') {
      return saved;
    }
    return 'classic';
  };
  const [theme, setThemeState] = useState<'classic' | 'blue-light' | 'blue-dark' | 'gray-light' | 'green' | 'purple' | 'dark'>(getInitialTheme());
  const setTheme = (t: typeof theme) => {
    setThemeState(t);
    localStorage.setItem('theme', t);
  };
  // حفظ واسترجاع المستخدم من localStorage
  const [currentUser, setCurrentUserState] = useState<any>(null);
  // دالة لتحديث المستخدم وتخزينه
  const setCurrentUser = (user: any) => {
    setCurrentUserState(user);
    if (user) {
      localStorage.setItem('currentUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('currentUser');
    }
  };
  const { 
    devices, 
    setDevices, 
    customers, 
    setCustomers, 
    technicians, 
    setTechnicians 
  } = useAppContext();

  useEffect(() => {
    // Fetch all data from Supabase
    const fetchData = async () => {
      setLoading(true);
      const { data: devicesData } = await supabase.from('devices').select('*');
      const { data: customersData } = await supabase.from('customers').select('*');
      const { data: techniciansData } = await supabase.from('technicians').select('*');
      setDevices(devicesData || []);
      setCustomers(customersData || []);
      setTechnicians(techniciansData || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  // التحقق من الصلاحيات عند تحميل المستخدم
  useEffect(() => {
    if (currentUser) {
      console.log('App - تم تحميل المستخدم، التحقق من الصلاحيات...');
      
      // التحقق من أن الصفحة الحالية متاحة للمستخدم
      if (!hasPagePermission(currentView)) {
        console.log('App - الصفحة الحالية غير متاحة، البحث عن صفحة متاحة...');
        
        const availablePages = [
          'device-entry',
          'device-inquiry', 
          'device-models',
          'technicians',
          'maintenance',
          'customers',
          'users',
          'reports'
        ];
        
        for (const page of availablePages) {
          if (hasPagePermission(page)) {
            console.log('App - الانتقال إلى الصفحة المتاحة:', page);
            setCurrentView(page);
            break;
          }
        }
      }
    }
  }, [currentUser, currentView]); // إضافة currentView إلى dependency array

  // دالة تسجيل الخروج
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('userPermissions');
  };

  // دالة تغيير الصفحة مع التحقق من الصلاحيات
  const handleViewChange = (newView: string) => {
    console.log('App - محاولة تغيير الصفحة إلى:', newView);
    
    if (hasPagePermission(newView)) {
      console.log('App - تم السماح بالوصول إلى:', newView);
      setCurrentView(newView);
    } else {
      console.log('App - تم رفض الوصول إلى:', newView);
      // البحث عن أول صفحة متاحة
      const availablePages = [
        'device-entry',
        'device-inquiry', 
        'device-models',
        'technicians',
        'maintenance',
        'customers',
        'users',
        'reports'
      ];
      
      for (const page of availablePages) {
        if (hasPagePermission(page)) {
          console.log('App - الانتقال إلى الصفحة المتاحة:', page);
          setCurrentView(page);
          break;
        }
      }
    }
  };

  if (!currentUser) {
    return <LoginPage onLogin={setCurrentUser} />;
  }

  const currentUserId = currentUser.id;

  // دالة للتحقق من صلاحيات الصفحة
  const hasPagePermission = (pageId: string): boolean => {
    console.log('App - hasPagePermission called for:', pageId);
    console.log('App - currentUser:', currentUser);
    
    // للمستخدم admin، منح جميع الصلاحيات
    if (currentUser?.role === 'admin') {
      console.log('App - User is admin, granting all permissions');
      return true;
    }

    // جلب الصلاحيات من localStorage للفحص
    const userPermissionsStr = localStorage.getItem('userPermissions');
    const userPermissions = userPermissionsStr ? JSON.parse(userPermissionsStr) : [];
    console.log('App - userPermissions from localStorage:', userPermissions);

    // التحقق من الصلاحيات المطلوبة لكل صفحة
    let hasPermission = false;
    
    switch (pageId) {
      case 'device-entry':
        hasPermission = userPermissions.includes('DEVICE_ENTRY');
        console.log('App - DEVICE_ENTRY permission:', hasPermission);
        return hasPermission;
      case 'device-inquiry':
        hasPermission = userPermissions.includes('DEVICE_INQUIRY');
        console.log('App - DEVICE_INQUIRY permission:', hasPermission);
        return hasPermission;
      case 'device-models':
        hasPermission = userPermissions.includes('DEVICE_MODELS');
        console.log('App - DEVICE_MODELS permission:', hasPermission);
        return hasPermission;
      case 'technicians':
        hasPermission = userPermissions.includes('ACCESS_TECHNICIANS');
        console.log('App - ACCESS_TECHNICIANS permission:', hasPermission);
        return hasPermission;
      case 'maintenance':
        hasPermission = userPermissions.includes('ACCESS_MAINTENANCE');
        console.log('App - ACCESS_MAINTENANCE permission:', hasPermission);
        return hasPermission;
      case 'customers':
        hasPermission = userPermissions.includes('ACCESS_CUSTOMERS');
        console.log('App - ACCESS_CUSTOMERS permission:', hasPermission);
        return hasPermission;
      case 'users':
        hasPermission = userPermissions.includes('ACCESS_USERS') || userPermissions.includes('CAN_CREATE_USERS') || userPermissions.includes('CAN_EDIT_USERS') || userPermissions.includes('ADMIN_ACCESS');
        console.log('App - ACCESS_USERS or CAN_CREATE_USERS or CAN_EDIT_USERS or ADMIN_ACCESS permission:', hasPermission);
        return hasPermission;
      case 'reports':
        hasPermission = userPermissions.includes('ACCESS_REPORTS');
        console.log('App - ACCESS_REPORTS permission:', hasPermission);
        return hasPermission;

      default:
        return true;
    }
  };

  const renderCurrentView = () => {
    console.log('App - currentView:', currentView);
    console.log('App - currentUser:', currentUser);
    console.log('App - hasPagePermission:', hasPagePermission(currentView));

    // التحقق من الصلاحيات قبل عرض الصفحة
    if (!hasPagePermission(currentView)) {
      return (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h3 className="text-lg font-medium text-red-600 mb-2">غير مصرح لك بالوصول</h3>
          <p className="text-gray-500">ليس لديك صلاحية للوصول إلى هذه الصفحة</p>
          <p className="text-sm text-gray-400 mt-2">الصفحة المطلوبة: {currentView}</p>
        </div>
      );
    }

    const sharedProps = { devices, customers, technicians, loading };
    switch (currentView) {
      case 'device-entry':
        return <DeviceEntry {...sharedProps} />;
      case 'device-inquiry':
        return <DeviceInquiry {...sharedProps} />;
      case 'device-models':
        return <DeviceModels {...sharedProps} />;
      case 'technicians':
        return <TechniciansManagement {...sharedProps} />;
      case 'maintenance':
        return <MaintenanceWork {...sharedProps} />;
      case 'customers':
        return <CustomerManagement />;
      case 'users':
        return <UsersPage userId={currentUserId} />;
      case 'reports':
        return <Reports />;

      default:
        return <DeviceEntry {...sharedProps} />;
    }
  };

  return (
    <>
      <Layout currentView={currentView} onViewChange={handleViewChange} onLogout={handleLogout} theme={theme} setTheme={setTheme}>
        <CheckUnmatchedTechnicianDevices devices={devices} technicians={technicians} />
        {renderCurrentView()}
      </Layout>
    </>
  );
}

export default App;