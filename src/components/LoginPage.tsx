import React, { useState, useEffect } from 'react';
import { getSupabaseClient } from '../supabaseClient';
import { useAppContext } from '../contexts/AppContext';
import { getUserAllPermissionsByUsername } from '../hooks/usePermission';
import { FaUser, FaLock } from 'react-icons/fa';

const LoginPage: React.FC<{ onLogin: (user: any) => void }> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setCurrentUser, setUserPermissions } = useAppContext();
  
  // الحصول على Supabase client
  const supabase = getSupabaseClient();

  // قراءة اسم المستخدم المحفوظ عند تحميل الصفحة
  useEffect(() => {
    const savedUsername = localStorage.getItem('savedUsername');
    if (savedUsername) {
      setUsername(savedUsername);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log('بدء عملية تسجيل الدخول...');
      console.log('اسم المستخدم:', username);
      console.log('كلمة المرور:', password);

      console.log('محاولة تسجيل الدخول من قاعدة البيانات...');

      // البحث عن المستخدم في قاعدة البيانات
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, username, name, role, active, avatar')
        .eq('username', username)
        .eq('password', password)
        .single();
      
      console.log('نتيجة البحث عن المستخدم:', { user, userError });
      
      if (userError) {
        console.error('خطأ في تسجيل الدخول:', userError);
        setError('اسم المستخدم أو كلمة المرور غير صحيحة');
        return;
      }
      
      if (!user) {
        console.log('لم يتم العثور على المستخدم');
        setError('اسم المستخدم أو كلمة المرور غير صحيحة');
        return;
      }
      
      if (!user.active) {
        console.log('المستخدم معطل');
        setError('هذا الحساب معطل');
        return;
      }
      
      console.log('تم العثور على المستخدم:', user);
      
      // إنشاء صورة افتراضية إذا لم تكن موجودة
      let avatarUrl = user.avatar;
      if (!avatarUrl) {
        // استخدام DiceBear لإنشاء صورة افتراضية
        const seed = user.username || user.id;
        avatarUrl = `https://api.dicebear.com/7.x/lorelei/svg?seed=${seed}`;
      }

      const userData = {
        ...user,
        avatar: avatarUrl
      };

      // جلب صلاحيات المستخدم من قاعدة البيانات
      console.log('جلب صلاحيات المستخدم:', user.username);
      const permissions = await getUserAllPermissionsByUsername(user.username);
      console.log('صلاحيات المستخدم المحملة:', permissions);
      
      // حفظ المستخدم وصلاحياته في localStorage
      localStorage.setItem('currentUser', JSON.stringify(userData));
      localStorage.setItem('userPermissions', JSON.stringify(permissions));
      // حفظ اسم المستخدم منفردًا
      localStorage.setItem('savedUsername', userData.username);
      
      // تحديث السياق
      setCurrentUser(userData);
      setUserPermissions(permissions);
      
      console.log('تم حفظ المستخدم والصلاحيات في localStorage و AppContext');
      console.log('localStorage currentUser:', localStorage.getItem('currentUser'));
      console.log('localStorage userPermissions:', localStorage.getItem('userPermissions'));
      
      // استدعاء onLogin
      onLogin(userData);
      
    } catch (err) {
      console.error('خطأ في تسجيل الدخول:', err);
      setError('حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    // Enhanced login form design
    <div className="min-h-screen flex justify-start items-center relative bg-contain bg-center bg-no-repeat" style={{backgroundImage: 'url("/images/login-background.jpg")'}}>
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-black bg-opacity-20"></div>
      
      {/* Login form card */}
      <div className="relative z-10 ml-96 mt-0 p-6 rounded-xl shadow-2xl w-full max-w-sm md:w-80 lg:w-80 backdrop-blur-md bg-transparent">
        <div className="flex flex-col items-center mb-6">
          {/* يمكنك وضع لوقو هنا */}
          {/* <img src="/logo.png" alt="Logo" className="w-20 mb-2" /> */}
          <h2 className="text-xl font-bold text-white mb-2">تسجيل الدخول</h2>
          <div className="border-t border-gray-200 w-16 my-2"></div>
        </div>
        {error && <div className="mb-4 text-red-600 text-center text-sm">{error}</div>}
        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <label className="text-white text-xs font-medium block mb-1">اسم المستخدم</label>
            <div className="relative flex items-center">
              <FaUser className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
              <input
                className="w-full p-2 pl-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoFocus
                placeholder="أدخل اسم المستخدم"
              />
            </div>
          </div>
          <div>
            <label className="text-white text-xs font-medium block mb-1">كلمة المرور</label>
            <div className="relative flex items-center">
              <FaLock className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
              <input
                className="w-full p-2 pl-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="أدخل كلمة المرور"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-300 mt-4 text-sm"
            disabled={loading}
          >
            {loading ? 'جاري التحقق...' : 'دخول'}
          </button>
          <a href="#" className="text-blue-500 hover:underline text-xs block text-center mt-2">
            هل نسيت كلمة المرور؟
          </a>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;

