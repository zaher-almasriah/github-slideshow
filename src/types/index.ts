export interface Customer {
  id: string;
  name: string;
  phoneNumber: string;
  mobileNumber: string;
  createdAt: Date;
}

export interface DeviceModel {
  id: string;
  type: string;
  model: string;
}

export interface Technician {
  id: string;
  name: string;
  specialization: string;
  active: boolean;
}

export interface MaintenanceAction {
  id: string;
  deviceId: string;
  technicianId?: string;
  actionType: 'screen-replacement' | 'battery-replacement' | 'software-repair' | 'hardware-repair' | 'water-damage' | 'charging-port' | 'speaker-repair' | 'camera-repair' | 'other';
  action_type?: 'screen-replacement' | 'battery-replacement' | 'software-repair' | 'hardware-repair' | 'water-damage' | 'charging-port' | 'speaker-repair' | 'camera-repair' | 'other';
  description: string;
  cost: number;
  partsCost?: number;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  notes?: string;
  // لا يوجد حقول تواريخ هنا لأن الجدول الفعلي لا يحتويها
}

export interface Device {
  id: string;
  receiptNumber: string;
  entryDate: Date;
  barcode: string;
  customerId: string;
  deviceType: string;
  model: string;
  imei: string;
  issueType: 'hardware' | 'software';
  issue: string;
  secretCode: string;
  estimatedCost: number;
  paperReceiptNumber: string;
  hasSim: boolean;
  hasBattery: boolean;
  hasMemory: boolean;
  notes: string;
  // القيم: قيد الانتظار | قيد الإصلاح | تم الإصلاح | غير قابل للإصلاح | بانتظار قطع غيار | تم الإلغاء من قبل العميل
  repairStatus: 'pending' | 'in-progress' | 'completed' | 'la-yuslih' | 'waiting-parts' | 'cancelled';
  delivered: boolean;
  paid: boolean;
  deliveryDate?: Date;
  technicianId?: string;
  maintenanceActions: MaintenanceAction[];
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'technician' | 'receptionist';
  active: boolean;
  avatar?: string;
}

export interface MaintenanceWork {
  id: string;
  deviceId: string;
  technicianId: string;
  description: string;
  startDate: Date;
  endDate?: Date;
  status: 'in-progress' | 'completed';
  cost: number;
}