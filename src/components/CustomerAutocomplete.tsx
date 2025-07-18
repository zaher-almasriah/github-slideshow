import React, { useState, useEffect } from 'react';
import { getSupabaseClient } from '../supabaseClient';

const supabase = getSupabaseClient();

interface Customer {
  id: string;
  name: string;
  mobileNumber?: string;
  phoneNumber?: string;
}

interface Props {
  onSelect: (customer: Customer) => void;
  value?: Customer | null;
}

const CustomerAutocomplete: React.FC<Props> = ({ onSelect, value }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    const fetchCustomers = async () => {
      const { data, error } = await supabase.from('customers').select('*');
      if (!error && data) setCustomers(data);
    };
    fetchCustomers();
  }, []);

  const filtered = search.trim()
    ? customers.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.mobileNumber && c.mobileNumber.includes(search)) ||
        (c.phoneNumber && c.phoneNumber.includes(search))
      )
    : [];

  return (
    <div className="relative">
      <input
        type="text"
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder="ابحث عن اسم الزبون أو رقم الجوال..."
        value={value ? value.name : search}
        onChange={e => {
          setSearch(e.target.value);
          setShowList(true);
        }}
        onFocus={() => setShowList(true)}
        autoComplete="off"
      />
      {showList && filtered.length > 0 && (
        <ul className="absolute z-10 bg-white border border-gray-200 rounded-lg mt-1 w-full max-h-56 overflow-y-auto shadow-lg">
          {filtered.map(c => (
            <li
              key={c.id}
              className="px-4 py-2 cursor-pointer hover:bg-blue-50"
              onClick={() => {
                setShowList(false);
                setSearch('');
                onSelect(c);
              }}
            >
              <div className="font-bold text-gray-900">{c.name}</div>
              <div className="text-xs text-gray-500">
                {c.mobileNumber && <span>جوال: {c.mobileNumber} </span>}
                {c.phoneNumber && <span>هاتف: {c.phoneNumber}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CustomerAutocomplete;
