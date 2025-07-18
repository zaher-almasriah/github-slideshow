import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';



const supabaseUrl = 'https://wxrfpfquzpwhsdockniq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4cmZwZnF1enB3aHNkb2NrbmlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2Mjg0NjYsImV4cCI6MjA2NjIwNDQ2Nn0.yLGeIMXvsYinV4Fm1VI5nVpVeq9X8aOOyKkIKqcf18Y';
const supabase = createClient(supabaseUrl, supabaseKey);

// Cache للصلاحيات لتجنب الطلبات المتكررة
const permissionCache = new Map<string, boolean>();



// دالة للتحقق من الصلاحيات باستخدام معرف المستخدم
export async function hasPermission(userId: string, permissionCode: string): Promise<boolean> {
  console.log('[hasPermission CALLED]', { userId, permissionCode }); // سجل إضافي لتأكيد الاستدعاء
  if (!userId || !permissionCode) return false;
  
  // للمستخدم admin، منح جميع الصلاحيات
  if (userId === '1' || userId === 'admin') {
    return true;
  }
  
  // التحقق من الـ cache أولاً
  const cacheKey = `${userId}-${permissionCode}`;
  if (permissionCache.has(cacheKey)) {
    return permissionCache.get(cacheKey)!;
  }
  
  try {
    // التحقق من دور المستخدم أولاً
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    
    console.log('[hasPermission USER CHECK]', { user, userError });
    
    if (!userError && user?.role === 'admin') {
      permissionCache.set(cacheKey, true);
      return true;
    }
    
    // محاولة جلب الصلاحيات بطريقة مختلفة إذا فشلت الطريقة الأولى
    let userPerms = null;
    let permsError = null;
    let codes: string[] = [];
    
    // الطريقة الأولى: استعلام join
    const { data: userPermsJoin, error: permsJoinError } = await supabase
      .from('user_permissions')
      .select('permissions!inner (code)')
      .eq('user_id', userId);
    
    console.log('[hasPermission JOIN QUERY]', { userPermsJoin, permsJoinError });
    
    if (!permsJoinError && userPermsJoin) {
      userPerms = userPermsJoin;
      codes = userPerms.map(up => (up.permissions && typeof up.permissions === 'object' && up.permissions !== null && up.permissions.code)).filter(Boolean);
    } else {
      // الطريقة الثانية: جلب مباشر من user_permissions
      const { data: userPermsDirect, error: permsDirectError } = await supabase
        .from('user_permissions')
        .select('permission_id')
        .eq('user_id', userId);
      
      console.log('[hasPermission DIRECT QUERY]', { userPermsDirect, permsDirectError });
      
      if (!permsDirectError && userPermsDirect && userPermsDirect.length > 0) {
        // جلب تفاصيل الصلاحيات
        const permissionIds = userPermsDirect.map(up => up.permission_id);
        const { data: permissions, error: permError } = await supabase
          .from('permissions')
          .select('code')
          .in('id', permissionIds);
        
        console.log('[hasPermission PERMISSIONS DETAILS]', { permissions, permError });
        
                 if (!permError && permissions) {
           codes = (permissions as any[]).map(p => p.code).filter(Boolean);
         }
      }
    }
    
    console.log('[hasPermission DEBUG]', 'userId:', userId, 'permissionCode:', permissionCode, 'userPerms:', JSON.stringify(userPerms), 'codes:', codes, 'permsError:', permsError);
    
    // التحقق من ADMIN_ACCESS أولاً
    if (codes.includes('ADMIN_ACCESS')) {
      console.log('[hasPermission ADMIN_ACCESS GRANTED]', { userId, permissionCode });
      permissionCache.set(cacheKey, true);
      return true;
    }
    
    const hasPerm = codes.includes(permissionCode);
    permissionCache.set(cacheKey, hasPerm);
    console.log('[hasPermission RESULT]', { userId, permissionCode, hasPerm, codes });
    return hasPerm;
  } catch (error) {
    console.error('Permission check error:', error);
    permissionCache.set(cacheKey, false);
    return false;
  }
}

export function usePermission(userId: string, permissionCode: string): [boolean, boolean] {
  const [hasPerm, setHasPerm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermission = async () => {
      try {
        const result = await hasPermission(userId, permissionCode);
        setHasPerm(result);
      } catch (error) {
        setHasPerm(false);
      } finally {
        setLoading(false);
      }
    };

    if (userId && permissionCode) {
      setLoading(true);
      checkPermission();
    } else {
      setHasPerm(false);
      setLoading(false);
    }
  }, [userId, permissionCode]);

  return [hasPerm, loading];
}

// Hook جديد للتحقق من الصلاحيات باستخدام اسم المستخدم
export function usePermissionByUsername(username: string, permissionCode: string): boolean {
  const [hasPerm, setHasPerm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermission = async () => {
      try {
        // جلب معرف المستخدم أولاً
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('username', username)
          .single();
        
        if (userError || !user) {
          setHasPerm(false);
          return;
        }
        
        // التحقق من الصلاحيات باستخدام معرف المستخدم
        const result = await hasPermission(user.id, permissionCode);
        setHasPerm(result);
      } catch (error) {
        console.error('Permission check error:', error);
        setHasPerm(false);
      } finally {
        setLoading(false);
      }
    };

    if (username && permissionCode) {
      checkPermission();
    } else {
      setHasPerm(false);
      setLoading(false);
    }
  }, [username, permissionCode]);

  return hasPerm;
}

// دالة لمسح الـ cache (مفيدة عند تحديث الصلاحيات)
export function clearPermissionCache() {
  permissionCache.clear();
  console.log('[PermissionCache] تم تفريغ الكاش');
}

// دالة تشخيص خاصة للمستخدم المحدد
export async function debugSpecificUser(userId: string) {
  console.log('=== DEBUG SPECIFIC USER ===');
  console.log('User ID:', userId);

  try {
    // 1. فحص المستخدم
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('User not found:', userError);
      return;
    }

    console.log('1. User found:', user);

    // 2. فحص الصلاحيات المرتبطة بالمستخدم - طريقة مباشرة
    const { data: userPermsDirect, error: userPermsDirectError } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', userId);

    console.log('2a. Direct user_permissions query:', userPermsDirect);
    console.log('2a. Direct query error:', userPermsDirectError);

    // 3. فحص الصلاحيات المرتبطة بالمستخدم - طريقة join
    const { data: userPermsJoin, error: userPermsJoinError } = await supabase
      .from('user_permissions')
      .select(`
        permission_id,
        permissions (
          id,
          code,
          name
        )
      `)
      .eq('user_id', userId);

    console.log('2b. Join user_permissions query:', userPermsJoin);
    console.log('2b. Join query error:', userPermsJoinError);

    // 4. فحص جميع الصلاحيات المتاحة
    const { data: allPermissions, error: allPermsError } = await supabase
      .from('permissions')
      .select('*');

    if (allPermsError) {
      console.error('Error fetching all permissions:', allPermsError);
      return;
    }

    console.log('3. All available permissions:', allPermissions);

    // 5. فحص RLS policies
    console.log('4. Checking RLS policies...');
    try {
      const { data: policies, error: policiesError } = await supabase
        .rpc('get_policies', { table_name: 'user_permissions' });
      console.log('RLS policies:', policies);
    } catch (error) {
      console.log('RLS policies check failed (function not available):', error);
    }

    // 6. محاولة استعلام SQL مباشر
    console.log('5. Trying direct SQL query...');
    try {
      const { data: sqlResult, error: sqlError } = await supabase
        .rpc('exec_sql', {
          sql: `
            SELECT u.id, u.username, p.code, p.name
            FROM users u
            JOIN user_permissions up ON up.user_id = u.id
            JOIN permissions p ON p.id = up.permission_id
            WHERE u.id = '${userId}'
          `
        });
      console.log('SQL query result:', sqlResult);
      console.log('SQL query error:', sqlError);
    } catch (error) {
      console.log('SQL query failed:', error);
    }

  } catch (error) {
    console.error('Debug error:', error);
  }

  console.log('=== END DEBUG ===');
}

// دالة تشخيص لفحص قاعدة البيانات مباشرة
export async function debugUserPermissions(username: string) {
  console.log('=== DEBUG USER PERMISSIONS ===');
  console.log('Username:', username);

  try {
    // 1. فحص المستخدم
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (userError) {
      console.error('User not found:', userError);
      return;
    }

    console.log('1. User found:', user);

    // 2. فحص الصلاحيات المرتبطة بالمستخدم - طريقة مباشرة
    const { data: userPermsDirect, error: userPermsDirectError } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', user.id);

    console.log('2a. Direct user_permissions query:', userPermsDirect);
    console.log('2a. Direct query error:', userPermsDirectError);

    // 3. فحص الصلاحيات المرتبطة بالمستخدم - طريقة join
    const { data: userPermsJoin, error: userPermsJoinError } = await supabase
      .from('user_permissions')
      .select(`
        permission_id,
        permissions (
          id,
          code,
          name
        )
      `)
      .eq('user_id', user.id);

    console.log('2b. Join user_permissions query:', userPermsJoin);
    console.log('2b. Join query error:', userPermsJoinError);

    // 4. فحص جميع الصلاحيات المتاحة
    const { data: allPermissions, error: allPermsError } = await supabase
      .from('permissions')
      .select('*');

    if (allPermsError) {
      console.error('Error fetching all permissions:', allPermsError);
      return;
    }

    console.log('3. All available permissions:', allPermissions);

    // 5. فحص RLS policies
    console.log('4. Checking RLS policies...');
    try {
      const { data: policies, error: policiesError } = await supabase
        .rpc('get_policies', { table_name: 'user_permissions' });
      console.log('RLS policies:', policies);
    } catch (error) {
      console.log('RLS policies check failed (function not available):', error);
    }

    // 6. محاولة استعلام SQL مباشر
    console.log('5. Trying direct SQL query...');
    try {
      const { data: sqlResult, error: sqlError } = await supabase
        .rpc('exec_sql', {
          sql: `
            SELECT u.id, u.username, p.code, p.name
            FROM users u
            JOIN user_permissions up ON up.user_id = u.id
            JOIN permissions p ON p.id = up.permission_id
            WHERE u.username = '${username}'
          `
        });
      console.log('SQL query result:', sqlResult);
      console.log('SQL query error:', sqlError);
    } catch (error) {
      console.log('SQL query failed:', error);
    }

  } catch (error) {
    console.error('Debug error:', error);
  }

  console.log('=== END DEBUG ===');
}

// دالة لجلب جميع صلاحيات المستخدم
export async function getUserAllPermissions(userId: string) {
  if (!userId) return [];

  try {
    const { data: userPerms, error } = await supabase
      .from('user_permissions')
      .select(`
        permissions (
          id,
          code,
          name
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user permissions:', error);
      return [];
    }

    return userPerms?.map(up => up.permissions).filter(Boolean) || [];
  } catch (error) {
    console.error('Error in getUserAllPermissions:', error);
    return [];
  }
}

// دالة لجلب جميع صلاحيات المستخدم باستخدام اسم المستخدم
export async function getUserAllPermissionsByUsername(username: string) {
  if (!username) return [];

  try {
    console.log('getUserAllPermissionsByUsername - searching for username:', username);

    // أولاً، جلب معرف المستخدم من اسم المستخدم
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, username, name, role')
      .eq('username', username)
      .single();

    if (userError || !user) {
      console.error('Error fetching user by username:', userError);
      return [];
    }

    console.log('getUserAllPermissionsByUsername - found user:', user);

    // محاولة جلب الصلاحيات بطريقة مختلفة
    console.log('Attempting to fetch permissions for user ID:', user.id);

    // الطريقة الأولى: جلب مباشر من user_permissions
    const { data: userPermsDirect, error: directError } = await supabase
      .from('user_permissions')
      .select('permission_id')
      .eq('user_id', user.id);

    console.log('Direct user_permissions query result:', userPermsDirect);
    console.log('Direct query error:', directError);

    if (directError) {
      console.error('Direct query failed, trying alternative method...');

      // الطريقة الثانية: استخدام استعلام SQL مباشر
      let userPermsSQL = null;
      let sqlError = null;
      try {
        const result = await supabase.rpc('get_user_permissions', { user_username: username });
        userPermsSQL = result.data;
        sqlError = result.error;
      } catch (error) {
        sqlError = 'Function not available';
      }

      console.log('SQL query result:', userPermsSQL);
      console.log('SQL query error:', sqlError);

      if (sqlError || !userPermsSQL) {
        // الطريقة الثالثة: جلب جميع الصلاحيات ثم فلترة
        console.log('Trying to fetch all permissions and filter...');
        const { data: allPermissions, error: allPermsError } = await supabase
          .from('permissions')
          .select('*');

        if (allPermsError) {
          console.error('Error fetching all permissions:', allPermsError);
          return [];
        }

        console.log('All permissions:', allPermissions);

        // محاولة جلب user_permissions بدون join
        const { data: userPermsSimple, error: simpleError } = await supabase
          .from('user_permissions')
          .select('*')
          .eq('user_id', user.id);

        console.log('Simple user_permissions query:', userPermsSimple);
        console.log('Simple query error:', simpleError);

        if (simpleError) {
          console.error('All methods failed, returning empty array');
          return [];
        }

        // فلترة الصلاحيات
        const permissionCodes: string[] = [];
        userPermsSimple?.forEach(up => {
          const permission = allPermissions?.find(p => p.id === up.permission_id);
          if (permission) {
            permissionCodes.push(permission.code);
          }
        });

        console.log(`صلاحيات المستخدم ${username} (method 3):`, permissionCodes);
        return permissionCodes;
      }

      return userPermsSQL || [];
    }

    // إذا نجح الاستعلام المباشر، جلب تفاصيل الصلاحيات
    if (userPermsDirect && userPermsDirect.length > 0) {
      const permissionIds = userPermsDirect.map(up => up.permission_id);
      console.log('Permission IDs found:', permissionIds);

      const { data: permissions, error: permError } = await supabase
        .from('permissions')
        .select('code')
        .in('id', permissionIds);

      if (permError) {
        console.error('Error fetching permission details:', permError);
        return [];
      }

      const permissionCodes = permissions?.map(p => p.code) || [];
      console.log(`صلاحيات المستخدم ${username} (method 1):`, permissionCodes);
      return permissionCodes;
    }

    console.log(`لا توجد صلاحيات للمستخدم ${username}`);
    return [];

  } catch (error) {
    console.error('Error in getUserAllPermissionsByUsername:', error);
    return [];
  }
}

// دالة لإضافة صلاحية للمستخدم
export async function addUserPermission(userId: string, permissionCode: string) {
  try {
    // جلب معرف الصلاحية
    const { data: permission, error: permError } = await supabase
      .from('permissions')
      .select('id')
      .eq('code', permissionCode)
      .single();

    if (permError || !permission) {
      throw new Error(`Permission not found: ${permissionCode}`);
    }

    // إضافة الصلاحية للمستخدم
    const { error: userPermError } = await supabase
      .from('user_permissions')
      .insert({
        user_id: userId,
        permission_id: permission.id
      });

    if (userPermError) {
      throw userPermError;
    }

    // مسح الـ cache
    clearPermissionCache();

    return { success: true };
  } catch (error) {
    console.error('Error adding user permission:', error);
    return { success: false, error };
  }
}

// دالة لإزالة صلاحية من المستخدم
export async function removeUserPermission(userId: string, permissionCode: string) {
  try {
    // جلب معرف الصلاحية
    const { data: permission, error: permError } = await supabase
      .from('permissions')
      .select('id')
      .eq('code', permissionCode)
      .single();

    if (permError || !permission) {
      throw new Error(`Permission not found: ${permissionCode}`);
    }

    // إزالة الصلاحية من المستخدم
    const { error: userPermError } = await supabase
      .from('user_permissions')
      .delete()
      .eq('user_id', userId)
      .eq('permission_id', permission.id);

    if (userPermError) {
      throw userPermError;
    }

    // مسح الـ cache
    clearPermissionCache();

    return { success: true };
  } catch (error) {
    console.error('Error removing user permission:', error);
    return { success: false, error };
  }
}

// دالة للتحقق من دور المستخدم
export async function getUserRole(username: string): Promise<string | null> {
  if (!username) return null;

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('role')
      .eq('username', username)
      .single();

    if (error) {
      console.error('Error fetching user role:', error);
      return null;
    }

    return user?.role || null;
  } catch (error) {
    console.error('Error in getUserRole:', error);
    return null;
  }
}

// دالة للتحقق من صلاحيات المستخدم العادية
export async function hasBasicPermissions(username: string): Promise<boolean> {
  if (!username) return false;

  // المستخدم admin لديه جميع الصلاحيات
  if (username === 'admin') return true;

  // المستخدم العادي لديه صلاحيات محدودة
  const basicPermissions = [

    'ACCESS_DEVICES',
    'ACCESS_MAINTENANCE',
    'ACCESS_TECHNICIANS'
  ];

  for (const permission of basicPermissions) {
    // جلب معرف المستخدم أولاً
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();
    
    if (userError || !user) {
      continue;
    }
    
    const hasPerm = await hasPermission(user.id, permission);
    if (hasPerm) return true;
  }

  return false;
}

// Hook للتحقق من الصلاحيات من السياق الحالي
export function useCurrentUserPermission(permissionCode: string): boolean {
  const [hasPerm, setHasPerm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermission = async () => {
      try {
        // جلب المستخدم الحالي من localStorage
        const currentUserStr = localStorage.getItem('currentUser');
        if (!currentUserStr) {
          setHasPerm(false);
          setLoading(false);
          return;
        }

        const currentUser = JSON.parse(currentUserStr);

        // للمستخدم admin، منح جميع الصلاحيات
        if (currentUser?.username === 'admin' || currentUser?.role === 'admin') {
          setHasPerm(true);
          setLoading(false);
          return;
        }

        // جلب الصلاحيات من localStorage
        const userPermissionsStr = localStorage.getItem('userPermissions');
        if (userPermissionsStr) {
          const userPermissions = JSON.parse(userPermissionsStr);
          const hasPermission = userPermissions.includes(permissionCode);
          setHasPerm(hasPermission);
        } else {
          setHasPerm(false);
        }
      } catch (error) {
        console.error('Permission check error:', error);
        setHasPerm(false);
      } finally {
        setLoading(false);
      }
    };

    checkPermission();
  }, [permissionCode]); // إزالة setHasPerm و setLoading من dependency array

  return hasPerm;
}

// دالة للتحقق من الصلاحيات من السياق الحالي (بدون hook)
export function hasCurrentUserPermission(permissionCode: string): boolean {
  try {
    console.log('hasCurrentUserPermission called for:', permissionCode);

    // جلب المستخدم الحالي من localStorage
    const currentUserStr = localStorage.getItem('currentUser');
    if (!currentUserStr) {
      console.log('hasCurrentUserPermission - no currentUser in localStorage');
      return false;
    }

    const currentUser = JSON.parse(currentUserStr);
    console.log('hasCurrentUserPermission - currentUser:', currentUser);

    // للمستخدم admin، منح جميع الصلاحيات
    if (currentUser?.username === 'admin' || currentUser?.role === 'admin') {
      console.log('hasCurrentUserPermission - user is admin, granting permission');
      return true;
    }

    // جلب الصلاحيات من localStorage
    const userPermissionsStr = localStorage.getItem('userPermissions');
    if (userPermissionsStr) {
      const userPermissions = JSON.parse(userPermissionsStr);
      // إذا كان لديه ADMIN_ACCESS اعتبره يملك كل الصلاحيات الإدارية
      if (userPermissions.includes('ADMIN_ACCESS')) {
        return true;
      }
      const hasPermission = userPermissions.includes(permissionCode);
      console.log(`hasCurrentUserPermission - ${permissionCode}: ${hasPermission}`);
      return hasPermission;
    }

    console.log('hasCurrentUserPermission - no userPermissions in localStorage');
    return false;
  } catch (error) {
    console.error('Permission check error:', error);
    return false;
  }
}
