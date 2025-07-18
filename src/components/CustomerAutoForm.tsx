import React, { useState } from 'react';
import CustomerAutocomplete from './CustomerAutocomplete';

// Define the Customer type locally if not exported from CustomerAutocomplete
export interface Customer {
  id: string;
  name: string;
  mobileNumber?: string;
  phoneNumber?: string;
}

interface Props {
  onChange: (customer: Customer) => void;
  value?: Customer;
}

const CustomerAutoForm: React.FC<Props> = ({ onChange, value }) => {
  const [customer, setCustomer] = useState<Customer>(
    value || { id: '', name: '', mobileNumber: '', phoneNumber: '' }
  );
  const [manual, setManual] = useState(false);

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">اسم الزبون</label>
      {!manual && (
        <CustomerAutocomplete
          value={customer && customer.id ? customer : null}
          onSelect={c => {
            setCustomer(c);
            onChange(c);
          }}
        />
      )}
      {manual && (
        <input
          type="text"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={customer.name}
          onChange={e => {
            const c = { ...customer, name: e.target.value, id: '' };
            setCustomer(c);
            onChange(c);
          }}
        />
      )}
      <div className="flex gap-2 text-xs">
        <button
          type="button"
          className="text-blue-600 underline"
          onClick={() => setManual(m => !m)}
        >
          {manual ? 'بحث عن زبون موجود' : 'إدخال اسم جديد'}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">رقم الجوال</label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            value={customer.mobileNumber || ''}
            onChange={e => {
              const c = { ...customer, mobileNumber: e.target.value };
              setCustomer(c);
              onChange(c);
            }}
            placeholder="05xxxxxxxx"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">رقم الهاتف</label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            value={customer.phoneNumber || ''}
            onChange={e => {
              const c = { ...customer, phoneNumber: e.target.value };
              setCustomer(c);
              onChange(c);
            }}
            placeholder="مثلاً: 011xxxxxxx"
          />
        </div>
      </div>
    </div>
  );
};

export default CustomerAutoForm;
