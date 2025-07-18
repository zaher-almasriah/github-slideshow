import React, { useState, useEffect } from 'react';
import { Customer, Device } from '../types';
import { Search, Plus, Save, RefreshCw } from 'lucide-react';
import { getSupabaseClient } from '../supabaseClient';

// ===== إصلاحات التحديث المستمر =====
// تم إصلاح dependency array في useEffect لتوليد رقم الإيصال
// تم إزالة devices.length من dependency array لتجنب التحديث المستمر
// =====================================

const supabaseUrl = 'https://wxrfpfquzpwhsdockniq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4cmZwZnF1enB3aHNkb2NrbmlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2Mjg0NjYsImV4cCI6MjA2NjIwNDQ2Nn0.yLGeIMXvsYinV4Fm1VI5nVpVeq9X8aOOyKkIKqcf18Y';
const supabase = getSupabaseClient();

interface DeviceEntryProps {
  devices?: any[];
  customers?: any[];
  technicians?: any[];
  loading?: boolean;
}

const DeviceEntry: React.FC<DeviceEntryProps> = (props) => {
  // خيارات الأعطال الافتراضية
  const hardwareIssuesDefault = [
    "لا يشحن","ساكت","تفريغ شحن","تاتش لايعمل","تاتش","شاشة + تاتش","تغطية","كبسة بور","بلورة شاشة","تغيير بطارية","بلورة كميرا","كميرا خلفية","كميرا أمامية","شاشة سيرفس","شاشة اوليد","حرارة مرتفعة","ساكت لايشحن","بيانات شاشة","لصق شاشة","تاتش+USB","USB"
  ];
  const softwareIssuesDefault = [
    "سوفت وير","تفليش سيرفر","تحديث اصدار","لايكمل اقلاع","فك حساب FRP","تخطي حساب ايكلاود","فك حساب GMAIL","تخطي Mi account"
  ];
  const [hardwareIssues, setHardwareIssues] = useState<string[]>(hardwareIssuesDefault);
  const [softwareIssues, setSoftwareIssues] = useState<string[]>(softwareIssuesDefault);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceModels, setDeviceModels] = useState<any[]>([]);

  // جلب بيانات الموديلات من Supabase
  useEffect(() => {
    const fetchDeviceModels = async () => {
      // تم تعديل اسم الجدول إلى 'models'
      const { data, error } = await supabase.from('models').select('*');
      if (!error && data) setDeviceModels(data);
    };
    fetchDeviceModels();
  }, []);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerList, setShowCustomerList] = useState(false);

  const [formData, setFormData] = useState({
    customerName: '',
    phoneNumber: '',
    mobileNumber: '',
    receiptNumber: '',
    entryDate: new Date().toISOString().split('T')[0],
    barcode: '',
    deviceType: '',
    model: '',
    imei: '',
    issueType: 'hardware' as 'hardware' | 'software',
    issue: '',
    secretCode: '',
    estimatedCost: 0,
    paperReceiptNumber: '',
    hasSim: false,
    hasBattery: false,
    hasMemory: false,
    notes: '',
  });

  useEffect(() => {
    const fetchCustomers = async () => {
      const { data, error } = await supabase.from('customers').select('id, name, phone_number, mobile_number');
      if (!error && data) {
        // تطبيع الحقول من snake_case إلى camelCase للواجهة فقط
        const normalized = data.map((c: any) => ({
          id: c.id,
          name: c.name,
          phoneNumber: c.phone_number,
          mobileNumber: c.mobile_number,
          createdAt: c.id // استخدام ID كبديل مؤقت
        }));
        setCustomers(normalized);
      }
    };
    fetchCustomers();
  }, []);

  useEffect(() => {
    const fetchDevices = async () => {
      const { data, error } = await supabase.from('devices').select('*');
      if (!error && data) setDevices(data);
    };
    fetchDevices();
  }, []);

  // توليد رقم الإيصال بناءً على آخر رقم في قاعدة البيانات
  useEffect(() => {
    const fetchLastReceiptNumber = async () => {
      const { data, error } = await supabase
        .from('devices')
        .select('receipt_number')
        .order('receipt_number', { ascending: false })
        .limit(1);
      let nextReceipt = '0001';
      if (!error && data && data.length > 0) {
        // محاولة تحويل آخر رقم إلى عدد صحيح وزيادته
        const last = data[0].receipt_number;
        const lastNum = parseInt(last, 10);
        if (!isNaN(lastNum)) {
          nextReceipt = (lastNum + 1).toString().padStart(4, '0');
        }
      }
      setFormData(prev => ({ ...prev, receiptNumber: nextReceipt }));
    };
    fetchLastReceiptNumber();
  }, []); // إزالة devices.length من dependency array لتجنب التحديث المستمر

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.phoneNumber?.includes(customerSearch) ||
    customer.mobileNumber?.includes(customerSearch)
  );
  const exactCustomer = customers.find(
    c => c.name.trim().toLowerCase() === customerSearch.trim().toLowerCase()
  );

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData(prev => ({
      ...prev,
      customerName: customer.name,
      phoneNumber: customer.phoneNumber,
      mobileNumber: customer.mobileNumber,
    }));
    setCustomerSearch(customer.name);
    setShowCustomerList(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
      if (name === 'customerName') {
        setSelectedCustomer(null);
        setCustomerSearch(value);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let customerId = selectedCustomer?.id;
    if (!selectedCustomer) {
      const { data: inserted, error } = await supabase.from('customers').insert([
        {
          name: formData.customerName,
          phone_number: formData.phoneNumber,
          mobile_number: formData.mobileNumber,
        }
      ]).select('id, name, phone_number, mobile_number');
      if (error) {
        alert('خطأ في إضافة الزبون: ' + error.message);
        return;
      }
      if (inserted && inserted[0]) {
        customerId = inserted[0].id;
        // تطبيع الحقول للواجهة فقط
        setCustomers(prev => [
          ...prev,
          {
            id: inserted[0].id,
            name: inserted[0].name,
            phoneNumber: inserted[0].phone_number,
            mobileNumber: inserted[0].mobile_number,
            createdAt: inserted[0].id // استخدام ID كبديل مؤقت
          }
        ]);
      } else {
        alert('لم يتم الحصول على رقم الزبون الجديد. لم يتم الحفظ.');
        return;
      }
    }
    if (!customerId) {
      alert('لم يتم تحديد الزبون بشكل صحيح. لم يتم الحفظ.');
      return;
    }
    // إذا كان الجهاز مسلّمًا (مستقبلاً)، احفظ تاريخ التسليم تلقائياً
    let delivered = false;
    let delivery_date = null;
    if (delivered) {
      delivery_date = new Date().toISOString();
    }
    const { data: deviceInserted, error: deviceError } = await supabase.from('devices').insert([
      {
        receipt_number: formData.receiptNumber,
        entry_date: formData.entryDate,
        barcode: formData.barcode,
        customer_id: customerId,
        device_type: formData.deviceType,
        model: formData.model,
        imei: formData.imei,
        issue_type: formData.issueType,
        issue: formData.issue,
        secret_code: formData.secretCode,
        estimated_cost: formData.estimatedCost,
        paper_receipt_number: formData.paperReceiptNumber,
        has_sim: formData.hasSim,
        has_battery: formData.hasBattery,
        has_memory: formData.hasMemory,
        notes: formData.notes,
        repair_status: 'pending',
        delivered: delivered,
        paid: false,
        maintenance_actions: '[]',
        delivery_date: delivery_date,
      }
    ]).select();
    if (deviceError) {
      alert('خطأ في إضافة الجهاز: ' + deviceError.message);
      return;
    }
    if (!deviceInserted || !deviceInserted[0]) {
      alert('لم يتم حفظ الجهاز في قاعدة البيانات!');
      return;
    }
    // إعادة جلب الأجهزة من Supabase بعد الحفظ
    const { data: newDevices } = await supabase.from('devices').select('*');
    if (newDevices) setDevices(newDevices);
    setFormData(prev => ({
      customerName: '',
      phoneNumber: '',
      mobileNumber: '',
      receiptNumber: prev.receiptNumber,
      entryDate: new Date().toISOString().split('T')[0],
      barcode: '',
      deviceType: '',
      model: '',
      imei: '',
      issueType: 'hardware',
      issue: '',
      secretCode: '',
      estimatedCost: 0,
      paperReceiptNumber: '',
      hasSim: false,
      hasBattery: false,
      hasMemory: false,
      notes: '',
    }));
    setSelectedCustomer(null);
    setCustomerSearch('');
    alert('تم حفظ بيانات الجهاز بنجاح');
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-2 md:px-6">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Customer Information */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Search size={20} />
            معلومات الزبون
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Customer Search/Select */}
<div className="relative">
  <label className="block text-sm font-medium text-gray-700 mb-2">
    البحث عن الزبون أو إدخال اسم جديد
  </label>
  <div className="relative">
    <input
      type="text"
      value={customerSearch}
      onChange={(e) => {
        const value = e.target.value;
        setCustomerSearch(value);
        setShowCustomerList(true);

        // ابحث عن تطابق تام مع اسم الزبون
        const matchedCustomer = customers.find(c => c.name === value);

        // تحديث اسم الزبون في formData
        handleInputChange({
          ...e,
          target: {
            ...e.target,
            name: "customerName",
            value: value
          }
        });

        if (matchedCustomer) {
          // إذا وجد تطابق تام، عبئ الهاتف والموبايل
          setFormData((prev) => ({
            ...prev,
            phoneNumber: matchedCustomer.phoneNumber || "",
            mobileNumber: matchedCustomer.mobileNumber || ""
          }));
        } else {
          // إذا لا يوجد تطابق، فرغ الهاتف والموبايل
          setFormData((prev) => ({
            ...prev,
            phoneNumber: "",
            mobileNumber: ""
          }));
        }
      }}
      onFocus={() => setShowCustomerList(true)}
      name="customerName"
      autoComplete="off"
      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      placeholder="اكتب اسم الزبون..."
      required
    />
    <Search size={20} className="absolute left-3 top-2.5 text-gray-400" />
  </div>

  {/* القائمة المنسدلة للزبائن */}
  {showCustomerList && customerSearch && (
    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
      {exactCustomer ? (
        <button
          key={exactCustomer.id}
          type="button"
          onClick={() => handleCustomerSelect(exactCustomer)}
          className="w-full px-4 py-3 text-right hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
        >
          <div className="font-medium">{exactCustomer.name}</div>
          <div className="text-sm text-gray-600">
            {exactCustomer.phoneNumber} - {exactCustomer.mobileNumber}
          </div>
        </button>
      ) : (
        <>
          {filteredCustomers.map((customer) => (
            <button
              key={customer.id}
              type="button"
              onClick={() => handleCustomerSelect(customer)}
              className="w-full px-4 py-3 text-right hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
            >
              <div className="font-medium">{customer.name}</div>
              <div className="text-sm text-gray-600">
                {customer.phoneNumber} - {customer.mobileNumber}
              </div>
            </button>
          ))}
          {filteredCustomers.length === 0 && (
            <div className="w-full px-4 py-3 text-right text-blue-700 bg-blue-50 border-b border-gray-100 last:border-b-0 cursor-pointer">
              إضافة زبون جديد باسم: <span className="font-bold">{customerSearch}</span>
            </div>
          )}
        </>
      )}
    </div>
  )}
</div>


            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">رقم الهاتف</label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                autoComplete="off"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="رقم الهاتف الثابت"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">رقم الجوال</label>
              <input
                type="tel"
                name="mobileNumber"
                value={formData.mobileNumber}
                onChange={handleInputChange}
                autoComplete="off"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="رقم الجوال"
                required
              />
            </div>
          </div>
        </div>

        {/* Device Information */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Plus size={20} />
            معلومات الجهاز
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">رقم الإيصال</label>
              <input
                type="text"
                name="receiptNumber"
                value={formData.receiptNumber}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                readOnly
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ الدخول</label>
              <input
                type="date"
                name="entryDate"
                value={formData.entryDate}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">باركود</label>
              <input
                type="text"
                name="barcode"
                value={formData.barcode}
                onChange={handleInputChange}
                autoComplete="off"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="باركود الجهاز"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">رقم IMEI</label>
              <input
                type="text"
                name="imei"
                value={formData.imei}
                onChange={handleInputChange}
                autoComplete="off"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="رقم IMEI"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">نوع الجهاز</label>
              <select
                name="deviceType"
                value={formData.deviceType}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">اختر نوع الجهاز</option>
                {Array.from(new Set(deviceModels.map(model => model.type))).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الموديل</label>
              <select
                name="model"
                value={formData.model}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">اختر الموديل</option>
                {deviceModels
                  .filter(model => !formData.deviceType || model.type === formData.deviceType)
                  .map(model => (
                    <option key={model.id} value={model.model}>{model.model}</option>
                  ))
                }
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الرقم السري</label>
              <input
                type="text"
                name="secretCode"
                value={formData.secretCode}
                onChange={handleInputChange}
                autoComplete="off"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="الرقم السري للجهاز"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">القيمة التقديرية للصيانة</label>
              <input
                type="number"
                name="estimatedCost"
                value={formData.estimatedCost}
                onChange={handleInputChange}
                autoComplete="off"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">نوع العطل</label>
              <select
                name="issueType"
                value={formData.issueType}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="hardware">هاردوير</option>
                <option value="software">سوفتوير</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">العطل</label>
              <input
                type="text"
                name="issue"
                value={formData.issue}
                list="issue-options"
                onChange={e => {
                  handleInputChange(e);
                }}
                onBlur={e => {
                  const val = e.target.value.trim();
                  let options = formData.issueType === 'hardware' ? hardwareIssues : softwareIssues;
                  let setOptions = formData.issueType === 'hardware' ? setHardwareIssues : setSoftwareIssues;
                  if (val && !options.includes(val)) {
                    setOptions([...options, val]);
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="اكتب أو اختر العطل..."
                required
              />
              <datalist id="issue-options">
                {(formData.issueType === 'hardware' ? hardwareIssues : softwareIssues).map(opt => (
                  <option key={opt} value={opt} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">رقم إيصال ورقي</label>
              <input
                type="text"
                name="paperReceiptNumber"
                value={formData.paperReceiptNumber}
                onChange={handleInputChange}
                autoComplete="off"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="رقم الإيصال الورقي"
              />
            </div>
          </div>

          {/* Notes & Accessories Side by Side */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
            {/* Notes */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={2}
                className="w-full px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="ملاحظات إضافية..."
              />
            </div>
            {/* Accessories */}
            <div className="flex flex-col items-start">
              <h4 className="text-sm font-medium text-gray-700 mb-2">ملحقات الجهاز</h4>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="hasSim"
                    checked={formData.hasSim}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">سيم</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="hasBattery"
                    checked={formData.hasBattery}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">بطارية</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="hasMemory"
                    checked={formData.hasMemory}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">ذاكرة</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => {
              setFormData(prev => ({
                ...prev,
                customerName: '',
                phoneNumber: '',
                mobileNumber: '',
                barcode: '',
                deviceType: '',
                model: '',
                imei: '',
                issue: '',
                secretCode: '',
                estimatedCost: 0,
                paperReceiptNumber: '',
                hasSim: false,
                hasBattery: false,
                hasMemory: false,
                notes: '',
              }));
              setSelectedCustomer(null);
              setCustomerSearch('');
            }}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <RefreshCw size={16} />
            إعادة تعيين
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Save size={16} />
            حفظ البيانات
          </button>
        </div>
      </form>
    </div>
  );
};

export default DeviceEntry;