import React, { useState, useEffect, useRef } from 'react';
import { 
  Smartphone, 
  Search, 
  Settings, 
  Users, 
  Wrench, 
  UserCircle, 
  FileText, 
  Calculator,
  Menu,
  X,
  LogOut,
  ChevronDown,
  UserCheck
} from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { renderAvatar } from '../utils/avatarUtils';

// ===== إصلاحات التحديث المستمر =====
// تم إصلاح dependency array في useEffect لتجنب التحديث المستمر
// تم إضافة onViewChange إلى dependency array
// =====================================

interface LayoutProps {
  children: React.ReactNode;
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout?: () => void;
  theme: 'classic' | 'blue-light' | 'blue-dark' | 'gray-light' | 'green' | 'purple' | 'dark';
  setTheme: (theme: 'classic' | 'blue-light' | 'blue-dark' | 'gray-light' | 'green' | 'purple' | 'dark') => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: any;
  permission?: string;
  adminOnly?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, currentView, onViewChange, onLogout, theme, setTheme }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { currentUser, setCurrentUser, userPermissions } = useAppContext();

  // تعريف جميع عناصر القائمة مع صلاحياتها
  const allMenuItems: MenuItem[] = [
    { 
      id: 'device-entry', 
      label: 'إدخال الأجهزة', 
      icon: Smartphone,
      permission: 'DEVICE_ENTRY'
    },
    { 
      id: 'device-inquiry', 
      label: 'الاستعلامات والمتابعة', 
      icon: Search,
      permission: 'DEVICE_INQUIRY'
    },
    { 
      id: 'device-models', 
      label: 'إضافة نماذج الأجهزة', 
      icon: Settings,
      permission: 'DEVICE_MODELS'
    },
    { 
      id: 'technicians', 
      label: 'إدارة الفنيين', 
      icon: Users,
      permission: 'ACCESS_TECHNICIANS'
    },
    { 
      id: 'maintenance', 
      label: 'أعمال الصيانة', 
      icon: Wrench,
      permission: 'ACCESS_MAINTENANCE'
    },
    { 
      id: 'customers', 
      label: 'حساب الزبائن', 
      icon: UserCheck,
      permission: 'ACCESS_CUSTOMERS'
    },
    { 
      id: 'users', 
      label: 'المستخدمين', 
      icon: UserCircle,
      permission: 'ACCESS_USERS'
    },
    { 
      id: 'reports', 
      label: 'التقارير', 
      icon: FileText,
      permission: 'ACCESS_REPORTS'
    },

  ];

  // تصفية عناصر القائمة بناءً على صلاحيات المستخدم
  const getFilteredMenuItems = (): MenuItem[] => {
    console.log('Layout - currentUser:', currentUser);
    console.log('Layout - userPermissions:', userPermissions);
    
    if (!currentUser) {
      console.log('Layout - لا يوجد مستخدم، إظهار جميع العناصر');
      return allMenuItems; // إظهار جميع العناصر إذا لم يكن هناك مستخدم
    }

    const isAdmin = currentUser.role === 'admin' || userPermissions.includes('ADMIN_ACCESS');
    console.log('Layout - isAdmin:', isAdmin);
    
    // التحقق من الصلاحيات الفعلية من localStorage أيضاً
    const userPermissionsStr = localStorage.getItem('userPermissions');
    const localStoragePermissions = userPermissionsStr ? JSON.parse(userPermissionsStr) : [];
    console.log('Layout - localStorage permissions:', localStoragePermissions);
    
    const filteredItems = allMenuItems.filter(item => {
      // إذا كان العنصر للمدير فقط
      if (item.adminOnly && !isAdmin) {
        console.log(`Layout - إخفاء ${item.label} (adminOnly)`);
        return false;
      }
      
      // إذا كان العنصر يحتاج صلاحية محددة
      if (item.permission) {
        const hasPermission = isAdmin || 
                             userPermissions.includes(item.permission) || 
                             localStoragePermissions.includes(item.permission);
        console.log(`Layout - ${item.label}: ${hasPermission ? 'متاح' : 'غير متاح'} (${item.permission})`);
        return hasPermission;
      }
      
      // إذا لم يكن هناك صلاحية محددة، إظهار العنصر
      return true;
    });
    
    console.log('Layout - العناصر المتاحة:', filteredItems.map(item => item.label));
    return filteredItems;
  };

  const menuItems = getFilteredMenuItems();

  const handleLogout = () => {
    // مسح بيانات المستخدم من localStorage
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userPermissions');
    
    // إعادة تعيين المستخدم الحالي في Context
    setCurrentUser(null);
    
    // إغلاق قائمة المستخدم
    setUserMenuOpen(false);
    
    // استدعاء دالة تسجيل الخروج إذا كانت موجودة
    if (onLogout) {
      onLogout();
    }
  };

  const getUserDisplayName = () => {
    if (!currentUser) return 'المدير العام';
    return currentUser.name || currentUser.username || 'المدير العام';
  };

  const getUserRole = () => {
    if (!currentUser) return 'مدير';
    return currentUser.role === 'admin' ? 'مدير' : 'مستخدم';
  };

  // دالة لاختبار الأفاتارات في Layout
  const testLayoutAvatar = () => {
    console.log('🧪 اختبار الأفاتار في Layout...');
    console.log('👤 المستخدم الحالي:', currentUser);
    
    if (currentUser) {
      const avatar = (currentUser as any).avatar;
      console.log('📷 الأفاتار الحالي:', avatar);
      console.log('📋 نوع الأفاتار:', avatar ? (avatar.startsWith('http') ? 'URL' : avatar.startsWith('data:') ? 'DataURL' : avatar.includes('😊') ? 'Emoji' : 'Other') : 'None');
      
      if (avatar) {
        // البحث في قائمة الأفاتارات (محدثة لتتطابق مع UserManagement)
        const avatarOptions = [
          // صور شخصية لرونالدو وميسي
          { id: 'ronaldo', image: 'https://upload.wikimedia.org/wikipedia/commons/8/8c/Cristiano_Ronaldo_2018.jpg' },
          { id: 'messi', image: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Lionel_Messi_20180626.jpg' },
          
          // صور شخصية متنوعة (إيموشن)
          { id: 'person1', icon: '😊' },
          { id: 'person2', icon: '😄' },
          { id: 'person3', icon: '😃' },
          { id: 'person4', icon: '😁' },
          { id: 'person5', icon: '😉' },
          { id: 'person6', icon: '😎' },
          
          // صور شخصية واقعية
          { id: 'real-person1', image: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face' },
          { id: 'real-person2', image: 'https://images.pexels.com/photos/3777943/pexels-photo-3777943.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face' },
          { id: 'real-person3', image: 'https://images.pexels.com/photos/3777951/pexels-photo-3777951.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face' },
          { id: 'real-person4', image: 'https://images.pexels.com/photos/3777953/pexels-photo-3777953.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face' },
          { id: 'real-person5', image: 'https://images.pexels.com/photos/3777946/pexels-photo-3777946.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face' },
          
          // معالم سياحية
          { id: 'norias-hama', image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=150&h=150&fit=crop&crop=center' },
          { id: 'hama-clock', image: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=150&h=150&fit=crop&crop=center' },
          { id: 'afamia-sham-hotel', image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=150&h=150&fit=crop&crop=center' },
          
          // أيقونات صيانة
          { id: 'phone-repair', icon: '📱🔧' },
          { id: 'screwdriver', icon: '🔧' },
          { id: 'circuit-board', icon: '🔌' },
          { id: 'battery', icon: '🔋' },
          { id: 'screen', icon: '📺' },
          { id: 'tools', icon: '🛠️' },
          { id: 'wrench', icon: '🔧' },
          { id: 'microchip', icon: '💻' }
        ];
        
        // البحث بالID
        const byId = avatarOptions.find(option => option.id === avatar);
        if (byId) {
          console.log('✅ تم العثور على الأفاتار بالID:', byId.id);
          console.log('📋 تفاصيل الأفاتار بالID:', byId);
        }
        
        // البحث بالقيمة
        const byValue = avatarOptions.find(option => 
          option.image === avatar || option.icon === avatar
        );
        if (byValue) {
          console.log('✅ تم العثور على الأفاتار بالقيمة:', byValue.id);
          console.log('📋 تفاصيل الأفاتار بالقيمة:', byValue);
        }
        
        if (!byId && !byValue) {
          console.log('❌ لم يتم العثور على الأفاتار في القائمة');
          console.log('🔍 البحث في جميع الخيارات:');
          avatarOptions.forEach(option => {
            console.log(`   - ${option.id}: ${option.image || option.icon}`);
          });
        }
        
        // اختبار عرض الأفاتار
        console.log('🎨 اختبار عرض الأفاتار:');
        if (avatar.startsWith('http')) {
          console.log('   📷 سيتم عرضه كصورة من URL');
        } else if (avatar.includes('😊') || avatar.includes('😄') || avatar.includes('😃') || avatar.includes('😁') || avatar.includes('😉') || avatar.includes('😎')) {
          console.log('   😊 سيتم عرضه كإيموشن');
        } else if (avatar.startsWith('data:')) {
          console.log('   📤 سيتم عرضه كصورة مرفوعة');
        } else {
          console.log('   ❓ نوع غير معروف، سيتم عرض الأفاتار الافتراضي');
        }
      } else {
        console.log('⚠️ المستخدم لا يملك أفاتار');
      }
    } else {
      console.log('⚠️ لا يوجد مستخدم حالي');
    }
  };

    // دالة لعرض أفاتار المستخدم - موحدة
  const renderUserAvatar = (size: 'sm' | 'md' | 'lg' = 'md') => {
    if (!currentUser) {
      console.log('Layout - لا يوجد مستخدم، عرض أفاتار افتراضي');
      return (
        <div className={`${size === 'sm' ? 'w-10 h-10' : size === 'md' ? 'w-14 h-14' : 'w-16 h-16'} bg-blue-100 rounded-full flex items-center justify-center`}>
          <UserCircle size={size === 'sm' ? 24 : size === 'md' ? 32 : 40} className="text-blue-600" />
        </div>
      );
    }

    const avatar = (currentUser as any).avatar;
    const userName = currentUser.name || currentUser.username || 'مستخدم';

    console.log('Layout - renderUserAvatar:', { 
      userName, 
      avatar, 
      hasAvatar: !!avatar
    });

    // استخدام الدالة الموحدة من avatarUtils
    return renderAvatar(avatar, userName, size, true);
  };

  // تعريف ألوان الثيمات للسلايد العمودي والأفقي
  // Color theme for vertical sidebar
  const sidebarThemes = {
    'classic': {
      bg: '#fff',
      text: '#1e293b',
      activeBg: '#e0e7ef',
      activeText: '#1e293b',
      activeBorder: '#3B82F6',
    },
    'blue-light': {
      bg: '#f1f5fa',
      text: '#1e3a8a',
      activeBg: '#3B82F6',
      activeText: '#fff',
      activeBorder: '#3B82F6',
    },
    'blue-dark': {
      bg: '#272e48',
      text: '#fff',
      activeBg: '#3B82F6',
      activeText: '#fff',
      activeBorder: '#3B82F6',
    },
    'gray-light': {
      bg: '#f3f4f6',
      text: '#374151',
      activeBg: '#e5e7eb',
      activeText: '#111827',
      activeBorder: '#6366f1',
    },
    'green': {
      bg: '#E6F3E6',
      text: '#14532D',
      activeBg: '#22C55E',
      activeText: '#fff',
      activeBorder: '#22C55E',
    },
    'purple': {
      bg: '#F3E8FF',
      text: '#5B21B6',
      activeBg: '#A855F7',
      activeText: '#fff',
      activeBorder: '#A855F7',
    },
    'dark': {
      bg: '#18181b',
      text: '#fff',
      activeBg: '#27272a',
      activeText: '#fff',
      activeBorder: '#6366f1',
    },
  };
  // Color theme for horizontal header
  const headerThemes = {
    'classic': {
      bg: '#fff',
      text: '#1e293b',
      active: '#e0e7ef',
    },
    'blue-light': {
      bg: '#f1f5fa',
      text: '#1e3a8a',
      active: '#3B82F6',
    },
    'blue-dark': {
      bg: '#e0e7ef', // أغمق قليلاً من لون جسم البرنامج
      text: '#1e3a8a',
      active: '#3B82F6',
    },
    'gray-light': {
      bg: '#f3f4f6',
      text: '#374151',
      active: '#6366f1',
    },
    'green': {
      bg: '#E6F3E6',
      text: '#14532D',
      active: '#22C55E',
    },
    'purple': {
      bg: '#F3E8FF',
      text: '#5B21B6',
      active: '#A855F7',
    },
    'dark': {
      bg: '#23272f',
      text: '#fff',
      active: '#6366f1',
    },
  };
  const sidebarTheme = sidebarThemes[theme];
  const headerTheme = headerThemes[theme];

  // التحقق من أن الصفحة الحالية متاحة للمستخدم
  const isCurrentViewAccessible = () => {
    const currentMenuItem = allMenuItems.find(item => item.id === currentView);
    if (!currentMenuItem) return true;
    
    const isAdmin = currentUser?.role === 'admin' || userPermissions.includes('ADMIN_ACCESS');
    
    if (currentMenuItem.adminOnly && !isAdmin) {
      return false;
    }
    
    if (currentMenuItem.permission) {
      return isAdmin || userPermissions.includes(currentMenuItem.permission);
    }
    
    return true;
  };

  // إذا كانت الصفحة الحالية غير متاحة، انتقل للصفحة الأولى المتاحة
  useEffect(() => {
    if (currentUser && !isCurrentViewAccessible() && menuItems.length > 0) {
      onViewChange(menuItems[0].id);
    }
  }, [currentUser, userPermissions, currentView, menuItems, onViewChange]); // إضافة onViewChange إلى dependency array

  // إغلاق قائمة المستخدم عند الضغط خارجها
  useEffect(() => {
    if (!userMenuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);

  return (
    <div className="min-h-screen flex" dir="rtl">
      {/* Mobile menu overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {/* Sidebar */}
      <div
        className={`
          fixed inset-y-0 right-0 z-50 w-60 shadow-lg transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
          lg:translate-x-0
        `}
        style={{
          height: '100vh',
          background: sidebarTheme.bg,
          // ظل تراكب على الحافة اليسرى للسلايد الجانبي
          boxShadow: theme === 'blue-dark'
            ? '-6px 0 24px -2px rgba(0,0,0,0.22)'
            : theme === 'dark'
              ? '-6px 0 24px -2px rgba(120,130,180,0.22)'
              : '-6px 0 24px -2px rgba(0,0,0,0.16)',
        }}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold mt-7" style={{color: sidebarTheme.text}}>إدارة صيانة الجوالات</h1>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="p-4">
          {menuItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>لا توجد صلاحيات متاحة</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        onViewChange(item.id);
                        setSidebarOpen(false);
                      }}
                      className={`
                        w-full flex items-center gap-3 px-4 py-3 rounded-lg text-right transition-colors
                      `}
                      style={isActive ? {
                        background: sidebarTheme.activeBg,
                        color: sidebarTheme.activeText,
                        borderRight: `4px solid ${sidebarTheme.activeBorder}`,
                      } : {
                        color: sidebarTheme.text,
                        background: undefined
                      }}
                      onMouseEnter={e => {
                        if (!isActive && (theme === 'blue-dark' || theme === 'dark')) {
                          e.currentTarget.style.background = '#23263a';
                          e.currentTarget.style.color = '#fff';
                        } else if (!isActive) {
                          e.currentTarget.style.background = '#f3f4f6';
                          e.currentTarget.style.color = sidebarTheme.text;
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isActive) {
                          e.currentTarget.style.background = '';
                          e.currentTarget.style.color = sidebarTheme.text;
                        }
                      }}
                    >
                      <Icon size={20} />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>
      </div>
      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0" style={{marginRight: '15rem'}}>
        {/* Header */}
        <header
          // Color theme for horizontal header
          className="border-b border-gray-200 px-6 py-2 sticky top-0 w-full z-40"
          style={{
            background: headerTheme.bg,
            marginTop: 0,
            // ظل أسفل الهيدر
            boxShadow: theme === 'blue-dark'
              ? '0 6px 24px -2px rgba(0,0,0,0.22)'
              : theme === 'dark'
                ? '0 6px 24px -2px rgba(120,130,180,0.22)'
                : theme === 'purple'
                  ? '0 6px 24px -2px rgba(168,85,247,0.10)'
                  : theme === 'green'
                    ? '0 6px 24px -2px rgba(34,197,94,0.10)'
                    : '0 6px 24px -2px rgba(0,0,0,0.10)',
          }}
        >
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md hover:bg-gray-100"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-base font-bold" style={{color: headerTheme.text}}>
              {menuItems.find(item => item.id === currentView)?.label || 'إدارة صيانة الجوالات'}
            </h2>
            <div className="flex items-center gap-4">
              {/* User Menu */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-4 p-3 rounded-lg transition-colors"
                  style={{background: userMenuOpen ? headerTheme.active : undefined}}
                >
                  <div className="text-right">
                    <p className="text-sm" style={{color: headerTheme.text}}>مرحباً</p>
                    <p className="font-semibold text-base" style={{color: headerTheme.text}}>{getUserDisplayName()}</p>
                    <p className="text-xs" style={{color: headerTheme.text}}>{getUserRole()}</p>
                  </div>
                  <div className="flex-shrink-0">
                    {renderUserAvatar('lg')}
                  </div>
                  <ChevronDown 
                    size={18} 
                    className={`transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
                    style={{color: headerTheme.text}}
                  />
                </button>
                {/* User Dropdown Menu */}
                {userMenuOpen && (
                  <div
                    className="absolute left-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
                  >
                    <div className="p-4 border-b border-gray-200 flex flex-col items-center">
                      {renderUserAvatar && (
                        <div className="mb-2">
                          {renderUserAvatar('lg')}
                        </div>
                      )}
                      <p className="font-bold text-lg text-gray-900">{getUserDisplayName()}</p>
                      <p className="text-base text-blue-900">{getUserRole()}</p>
                      {currentUser && (
                        <p className="text-xs text-gray-400 mt-1">@{currentUser.username}</p>
                      )}
                    </div>
                    <div className="p-2">
                      {/* خيارات اختيار الثيم */}
                      <div className="w-full flex items-center gap-2 px-3 py-2 mb-2">
                        <label className="text-sm text-gray-700">الثيم:</label>
                        <select
                          value={theme}
                          onChange={e => {
                            setTheme(e.target.value as any);
                            setUserMenuOpen(false); // إغلاق القائمة بعد التبديل
                          }}
                          className="border border-gray-300 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                        >
                          <option value="classic">أبيض كلاسيكي</option>
                          <option value="blue-light">أزرق فاتح</option>
                          <option value="blue-dark">أزرق داكن</option>
                          <option value="gray-light">رمادي فاتح</option>
                          <option value="green">أخضر</option>
                          <option value="purple">بنفسجي</option>
                          <option value="dark">داكن</option>
                        </select>
                      </div>
                      <button
                        onClick={handleLogout}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-right rounded-md transition-colors font-bold ${theme === 'blue-dark' || theme === 'dark' ? 'text-red-400 hover:text-white' : 'text-red-600 hover:text-white'} hover:bg-red-600/90`}
                        style={theme === 'blue-dark' || theme === 'dark'
                          ? { background: undefined }
                          : { color: undefined }}
                      >
                        <LogOut size={24} className={theme === 'blue-dark' || theme === 'dark' ? 'text-red-400 group-hover:text-white' : 'text-red-600 group-hover:text-white'} />
                        <span>تسجيل الخروج</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        {/* Main content area */}
        <main className="flex-1 p-6"
          style={{
            boxShadow: theme === 'blue-dark'
              ? '0 -6px 24px -2px rgba(0,0,0,0.22)'
              : theme === 'dark'
                ? '0 -6px 24px -2px rgba(120,130,180,0.22)'
                : theme === 'purple'
                  ? '0 -6px 24px -2px rgba(168,85,247,0.10)'
                  : theme === 'green'
                    ? '0 -6px 24px -2px rgba(34,197,94,0.10)'
                    : '0 -6px 24px -2px rgba(0,0,0,0.10)',
          }}
        >
          {children}
        </main>
      </div>
      {/* Overlay to close user menu when clicking outside */}
      {userMenuOpen && (
        <div 
          className="fixed inset-0 z-30"
          onClick={() => setUserMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;