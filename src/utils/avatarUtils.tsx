import React from 'react';

// ملف مشترك للأفاتارات - لتوحيد عرض الأفاتارات في جميع أنحاء التطبيق

export interface AvatarOption {
  id: string;
  name: string;
  image?: string;
  icon?: string;
  type?: string;
  category?: string;
  bg?: string;
  size?: string;
}

// قائمة الأفاتارات المتاحة - موحدة لجميع المكونات
export const avatarOptions: AvatarOption[] = [
  // صور شخصية واقعية مناسبة للوثائق الرسمية
  { 
    id: 'real-person1', 
    name: 'شخصية واقعية 1', 
    image: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face',
    type: 'realistic',
    category: 'شخصية واقعية'
  },
  { 
    id: 'real-person2', 
    name: 'شخصية واقعية 2', 
    image: 'https://images.pexels.com/photos/3777943/pexels-photo-3777943.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face',
    type: 'realistic',
    category: 'شخصية واقعية'
  },
  { 
    id: 'real-person3', 
    name: 'شخصية واقعية 3', 
    image: 'https://images.pexels.com/photos/3777951/pexels-photo-3777951.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face',
    type: 'realistic',
    category: 'شخصية واقعية'
  },
  { 
    id: 'real-person4', 
    name: 'شخصية واقعية 4', 
    image: 'https://images.pexels.com/photos/3777953/pexels-photo-3777953.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face',
    type: 'realistic',
    category: 'شخصية واقعية'
  },
  { 
    id: 'real-person5', 
    name: 'شخصية واقعية 5', 
    image: 'https://images.pexels.com/photos/3777946/pexels-photo-3777946.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face',
    type: 'realistic',
    category: 'شخصية واقعية'
  },
  
  // صور مشاهير
  { 
    id: 'ronaldo', 
    name: 'كريستيانو رونالدو', 
    image: 'https://upload.wikimedia.org/wikipedia/commons/8/8c/Cristiano_Ronaldo_2018.jpg',
    type: 'celebrity',
    category: 'مشاهير'
  },
  { 
    id: 'messi', 
    name: 'ليونيل ميسي', 
    image: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Lionel_Messi_20180626.jpg',
    type: 'celebrity',
    category: 'مشاهير'
  },
  
  // إيموشن شخصية
  { 
    id: 'person1', 
    name: 'شخصية مهنية 1', 
    icon: '😊',
    type: 'professional',
    category: 'شخصية مهنية',
    bg: 'bg-blue-100',
    size: 'text-5xl'
  },
  { 
    id: 'person2', 
    name: 'شخصية مهنية 2', 
    icon: '😄',
    type: 'professional',
    category: 'شخصية مهنية',
    bg: 'bg-green-100',
    size: 'text-5xl'
  },
  { 
    id: 'person3', 
    name: 'شخصية مهنية 3', 
    icon: '😃',
    type: 'professional',
    category: 'شخصية مهنية',
    bg: 'bg-purple-100',
    size: 'text-5xl'
  },
  { 
    id: 'person4', 
    name: 'شخصية مهنية 4', 
    icon: '😁',
    type: 'professional',
    category: 'شخصية مهنية',
    bg: 'bg-pink-100',
    size: 'text-5xl'
  },
  { 
    id: 'person5', 
    name: 'شخصية مهنية 5', 
    icon: '😉',
    type: 'professional',
    category: 'شخصية مهنية',
    bg: 'bg-yellow-100',
    size: 'text-5xl'
  },
  { 
    id: 'person6', 
    name: 'شخصية مهنية 6', 
    icon: '😎',
    type: 'professional',
    category: 'شخصية مهنية',
    bg: 'bg-orange-100',
    size: 'text-5xl'
  },
  
  // معالم سياحية
  { 
    id: 'norias-hama', 
    name: 'نواعير حماة', 
    image: 'https://upload.wikimedia.org/wikipedia/commons/3/33/Noria_of_Hama_2%2C_Hama%2C_Syria.jpg',
    type: 'landmark',
    category: 'معالم سياحية'
  },
  { 
    id: 'norias-hama-2', 
    name: 'نواعير حماة - منظر آخر', 
    image: 'https://upload.wikimedia.org/wikipedia/commons/e/e9/Hama_wheels.jpg',
    type: 'landmark',
    category: 'معالم سياحية'
  },
  { 
    id: 'hama-clock', 
    name: 'ساعة حماة', 
    image: 'https://yaser-arwani.net/wp-content/uploads/2020/03/d8a8d8b1d8ac-d8a7d984d8b3d8a7d8b9d8a9-d981d98a-d8add985d8a7d987.jpg',
    type: 'landmark',
    category: 'معالم سياحية'
  },
  { 
    id: 'afamia-sham-hotel', 
    name: 'فندق أفاميا', 
    image: 'https://www.lovedamascus.com/fls/pp/24056/phts/n_fGFt_cd_dTak.jpg',
    type: 'landmark',
    category: 'معالم سياحية'
  },
  { 
    id: 'hama-garden', 
    name: 'حدائق حماة', 
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=150&h=150&fit=crop&crop=center',
    type: 'landmark',
    category: 'معالم سياحية'
  },
  
  // أيقونات صيانة الجوالات المحسنة
  { 
    id: 'phone-repair', 
    name: 'إصلاح الهاتف', 
    icon: '📱🔧',
    type: 'maintenance',
    category: 'صيانة الجوالات',
    bg: 'bg-blue-500',
    size: 'text-2xl'
  },
  { 
    id: 'screen-repair', 
    name: 'إصلاح الشاشة', 
    icon: '📱💥',
    type: 'maintenance',
    category: 'صيانة الجوالات',
    bg: 'bg-red-500',
    size: 'text-2xl'
  },
  { 
    id: 'battery-repair', 
    name: 'إصلاح البطارية', 
    icon: '🔋⚡',
    type: 'maintenance',
    category: 'صيانة الجوالات',
    bg: 'bg-yellow-500',
    size: 'text-2xl'
  },
  { 
    id: 'software-repair', 
    name: 'إصلاح البرمجيات', 
    icon: '💻🔧',
    type: 'maintenance',
    category: 'صيانة الجوالات',
    bg: 'bg-green-500',
    size: 'text-2xl'
  },
  { 
    id: 'data-recovery', 
    name: 'استعادة البيانات', 
    icon: '💾🔄',
    type: 'maintenance',
    category: 'صيانة الجوالات',
    bg: 'bg-purple-500',
    size: 'text-2xl'
  },
  { 
    id: 'water-damage', 
    name: 'إصلاح أضرار الماء', 
    icon: '💧🔧',
    type: 'maintenance',
    category: 'صيانة الجوالات',
    bg: 'bg-cyan-500',
    size: 'text-2xl'
  },
  
  // أيقونات أدوات إضافية
  { 
    id: 'screwdriver', 
    name: 'مفك', 
    icon: '🔧',
    type: 'tools',
    category: 'أدوات',
    bg: 'bg-gray-500',
    size: 'text-2xl'
  },
  { 
    id: 'circuit-board', 
    name: 'لوحة إلكترونية', 
    icon: '🔌',
    type: 'tools',
    category: 'أدوات',
    bg: 'bg-gray-500',
    size: 'text-2xl'
  },
  { 
    id: 'battery', 
    name: 'بطارية', 
    icon: '🔋',
    type: 'tools',
    category: 'أدوات',
    bg: 'bg-gray-500',
    size: 'text-2xl'
  },
  { 
    id: 'screen', 
    name: 'شاشة', 
    icon: '📺',
    type: 'tools',
    category: 'أدوات',
    bg: 'bg-gray-500',
    size: 'text-2xl'
  },
  { 
    id: 'tools', 
    name: 'أدوات', 
    icon: '🛠️',
    type: 'tools',
    category: 'أدوات',
    bg: 'bg-gray-500',
    size: 'text-2xl'
  },
  { 
    id: 'wrench', 
    name: 'مفتاح', 
    icon: '🔧',
    type: 'tools',
    category: 'أدوات',
    bg: 'bg-gray-500',
    size: 'text-2xl'
  },
  { 
    id: 'microchip', 
    name: 'معالج', 
    icon: '💻',
    type: 'tools',
    category: 'أدوات',
    bg: 'bg-gray-500',
    size: 'text-2xl'
  }
];

// دالة موحدة لعرض الأفاتار - تستخدم في جميع المكونات
export const renderAvatar = (
  avatar: string, 
  name: string, 
  size: 'sm' | 'md' | 'lg' = 'md',
  showBorder: boolean = true
): React.ReactElement => {
  // تحديد الأحجام بناءً على المعامل
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10', 
    lg: 'w-16 h-16'
  };
  
  const iconSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-3xl'
  };
  
  const borderClass = showBorder ? 'border-2 border-gray-200' : '';
  
  // إذا كان الأفاتار معرف (ID) من المعرض
  if (avatar && !avatar.startsWith('http') && !avatar.startsWith('data:')) {
    const avatarOption = avatarOptions.find(opt => opt.id === avatar);
    if (avatarOption) {
      if (avatarOption.image) {
        return (
          <img 
            src={avatarOption.image}
            alt={name}
            className={`rounded-full ${sizeClasses[size]} object-cover ${borderClass}`}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = generateDefaultAvatar(name, size);
            }}
          />
        );
      } else if (avatarOption.icon) {
        return (
          <div className={`rounded-full ${sizeClasses[size]} flex items-center justify-center ${avatarOption.bg || 'bg-gray-100'} ${iconSizes[size]} ${borderClass}`}>
            {avatarOption.icon}
          </div>
        );
      }
    }
  }
  
  // إذا كان الأفاتار رابط URL
  if (avatar && avatar.startsWith('http')) {
    return (
      <img 
        src={avatar} 
        alt={name}
        className={`rounded-full ${sizeClasses[size]} object-cover ${borderClass}`}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.src = generateDefaultAvatar(name, size);
        }}
      />
    );
  }
  
  // إذا كان الأفاتار بيانات base64
  if (avatar && avatar.startsWith('data:')) {
    return (
      <img 
        src={avatar} 
        alt={name}
        className={`rounded-full ${sizeClasses[size]} object-cover ${borderClass}`}
      />
    );
  }
  
  // إذا كان أفاتار من DiceBear
  if (avatar && avatar.includes('dicebear')) {
    return (
      <img 
        src={avatar} 
        alt={name}
        className={`rounded-full ${sizeClasses[size]} object-cover ${borderClass}`}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.src = generateDefaultAvatar(name, size);
        }}
      />
    );
  }

  // إذا كان أفاتار من الإيموشن
  if (avatar && (avatar.includes('😊') || avatar.includes('😄') || avatar.includes('😃') || 
      avatar.includes('😁') || avatar.includes('😉') || avatar.includes('😎') ||
      avatar.includes('📱') || avatar.includes('🔧') || avatar.includes('🔋') ||
      avatar.includes('💻') || avatar.includes('💾') || avatar.includes('🛠️'))) {
    return (
      <div className={`rounded-full ${sizeClasses[size]} flex items-center justify-center bg-gray-100 ${iconSizes[size]} ${borderClass}`}>
        {avatar}
      </div>
    );
  }

  // إذا لم يكن هناك أفاتار، استخدم الأفاتار الافتراضي
  return (
    <img
      src={generateDefaultAvatar(name, size)}
      alt={name}
      className={`rounded-full ${sizeClasses[size]} object-cover ${borderClass}`}
    />
  );
};

// دالة لإنشاء أفاتار افتراضي
export const generateDefaultAvatar = (name: string, size: 'sm' | 'md' | 'lg' = 'md'): string => {
  const seed = name || 'user';
  const sizeParam = size === 'sm' ? '80' : size === 'md' ? '100' : '150';
  return `https://api.dicebear.com/7.x/lorelei/svg?seed=${seed}&size=${sizeParam}`;
};

// دالة للبحث عن أفاتار بالID
export const findAvatarById = (avatarId: string): AvatarOption | undefined => {
  return avatarOptions.find(option => option.id === avatarId);
};

// دالة للبحث عن أفاتار بالقيمة (URL أو إيموشن)
export const findAvatarByValue = (avatarValue: string): AvatarOption | undefined => {
  return avatarOptions.find(option => 
    option.image === avatarValue || option.icon === avatarValue
  );
}; 