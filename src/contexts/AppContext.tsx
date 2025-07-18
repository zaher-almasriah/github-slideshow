import React, { createContext, useContext, ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Customer, Device, DeviceModel, Technician, User, MaintenanceWork, MaintenanceAction } from '../types';



interface AppContextType {
  customers: Customer[];
  setCustomers: (customers: Customer[] | ((prev: Customer[]) => Customer[])) => void;
  devices: Device[];
  setDevices: (devices: Device[] | ((prev: Device[]) => Device[])) => void;
  deviceModels: DeviceModel[];
  setDeviceModels: (models: DeviceModel[] | ((prev: DeviceModel[]) => DeviceModel[])) => void;
  technicians: Technician[];
  setTechnicians: (technicians: Technician[] | ((prev: Technician[]) => Technician[])) => void;
  users: User[];
  setUsers: (users: User[] | ((prev: User[]) => User[])) => void;
  maintenanceWorks: MaintenanceWork[];
  setMaintenanceWorks: (works: MaintenanceWork[] | ((prev: MaintenanceWork[]) => MaintenanceWork[])) => void;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  userPermissions: string[];
  setUserPermissions: (permissions: string[]) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

// Normalize device data to ensure all required properties exist
const normalizeDevices = (devices: any[]): Device[] => {
  return devices.map(device => ({
    ...device,
    maintenanceActions: device.maintenanceActions || [],
    entryDate: device.entryDate instanceof Date ? device.entryDate : new Date(device.entryDate),
    deliveryDate: device.deliveryDate ? (device.deliveryDate instanceof Date ? device.deliveryDate : new Date(device.deliveryDate)) : undefined,
  }));
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [customers, setCustomers] = useLocalStorage<Customer[]>('customers', []);
  const [rawDevices, setRawDevices] = useLocalStorage<any[]>('devices', []);
  const [deviceModels, setDeviceModels] = useLocalStorage<DeviceModel[]>('deviceModels', [
    { id: '1', type: 'iPhone', model: 'iPhone 14 Pro' },
    { id: '2', type: 'Samsung', model: 'Galaxy S23' },
    { id: '3', type: 'Huawei', model: 'P50 Pro' },
  ]);
  const [technicians, setTechnicians] = useLocalStorage<Technician[]>('technicians', [
    { id: '1', name: 'أحمد محمد', specialization: 'هاردوير', active: true },
    { id: '2', name: 'محمد علي', specialization: 'سوفتوير', active: true },
  ]);
  const [users, setUsers] = useLocalStorage<User[]>('users', []);
  const [maintenanceWorks, setMaintenanceWorks] = useLocalStorage<MaintenanceWork[]>('maintenanceWorks', []);
  const [currentUser, setCurrentUser] = useLocalStorage<User | null>('currentUser', null);
  const [userPermissions, setUserPermissions] = useLocalStorage<string[]>('userPermissions', []);

  // تحميل الصلاحيات من localStorage عند بدء التطبيق
  React.useEffect(() => {
    const loadUserData = () => {
      try {
        const currentUserStr = localStorage.getItem('currentUser');
        const userPermissionsStr = localStorage.getItem('userPermissions');
        
        if (currentUserStr) {
          const user = JSON.parse(currentUserStr);
          setCurrentUser(user);
          console.log('تم تحميل المستخدم من localStorage:', user);
        }
        
        if (userPermissionsStr) {
          const permissions = JSON.parse(userPermissionsStr);
          setUserPermissions(permissions);
          console.log('تم تحميل الصلاحيات من localStorage:', permissions);
        }
      } catch (error) {
        console.error('خطأ في تحميل بيانات المستخدم من localStorage:', error);
      }
    };

    loadUserData();
  }, []); // إزالة setCurrentUser و setUserPermissions من dependency array

  // Normalize devices data
  const devices = normalizeDevices(rawDevices);

  // Wrapper for setDevices to handle normalization
  const setDevices = (devicesOrUpdater: Device[] | ((prev: Device[]) => Device[])) => {
    if (typeof devicesOrUpdater === 'function') {
      setRawDevices(prev => {
        const normalizedPrev = normalizeDevices(prev);
        return devicesOrUpdater(normalizedPrev);
      });
    } else {
      setRawDevices(devicesOrUpdater);
    }
  };

  const value = {
    customers,
    setCustomers,
    devices,
    setDevices,
    deviceModels,
    setDeviceModels,
    technicians,
    setTechnicians,
    users,
    setUsers,
    maintenanceWorks,
    setMaintenanceWorks,
    currentUser,
    setCurrentUser,
    userPermissions,
    setUserPermissions,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};