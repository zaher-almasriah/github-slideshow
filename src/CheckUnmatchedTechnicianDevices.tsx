// كود لفحص الأجهزة التي لديها technicianId غير مطابق لأي فني في قاعدة البيانات
// ضع هذا الكود مؤقتاً في أي ملف React أو استخدمه في console داخل التطبيق

import { useEffect } from 'react';

// ===== إصلاحات التحديث المستمر =====
// تم إصلاح dependency arrays في useEffect لتجنب التحديث المستمر
// =====================================

export function CheckUnmatchedTechnicianDevices({ devices, technicians }: { devices: any[]; technicians: any[] }) {
  useEffect(() => {
    if (!devices.length || !technicians.length) return;
    const technicianIds = new Set(technicians.map(t => String(t.id)));
    const unmatchedDevices = devices.filter(device =>
      device.technicianId && !technicianIds.has(String(device.technicianId))
    );
    if (unmatchedDevices.length > 0) {
      // اطبع النتائج في الكونسول
      console.log('الأجهزة التي لديها technicianId غير مطابق لأي فني:', unmatchedDevices);
      alert(`عدد الأجهزة غير المطابقة: ${unmatchedDevices.length}. التفاصيل في الكونسول.`);
    } else {
      // alert('كل الأجهزة مرتبطة بفنيين موجودين.');
    }
  }, [devices, technicians]); // dependency array صحيح
  return null;
}
