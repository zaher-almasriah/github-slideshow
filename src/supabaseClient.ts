import { createClient } from '@supabase/supabase-js';

// قراءة متغيرات البيئة من Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

// فحص وجود المتغيرات المطلوبة
if (!supabaseUrl) {
  console.error('❌ VITE_SUPABASE_URL is required. Please create a .env file with your Supabase configuration.');
  console.log('📝 Example .env file:');
  console.log('VITE_SUPABASE_URL=https://your-project.supabase.co');
  console.log('VITE_SUPABASE_KEY=your-anon-key');
  console.log('🔍 Current env value:', import.meta.env.VITE_SUPABASE_URL);
}

if (!supabaseKey) {
  console.error('❌ VITE_SUPABASE_KEY is required. Please create a .env file with your Supabase configuration.');
  console.log('🔍 Current env value:', import.meta.env.VITE_SUPABASE_KEY);
}

// إنشاء Supabase client فقط إذا كانت المتغيرات متوفرة
export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// دالة مساعدة للتحقق من توفر Supabase
export const isSupabaseAvailable = (): boolean => {
  return supabase !== null;
};

// دالة مساعدة للحصول على Supabase client مع فحص الأمان
export const getSupabaseClient = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Please check your .env file.');
  }
  return supabase;
};
