import React, { useState, useEffect } from 'react';
import { cleanupUnusedTables, getDatabaseStatus } from '../utils/cleanupDatabase';

// ===== إصلاحات التحديث المستمر =====
// تم إصلاح dependency arrays في useEffect لتجنب التحديث المستمر
// =====================================
import { 
  Database, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Info,
  Shield,
  FileText,
  Users,
  Settings
} from 'lucide-react';

const DatabaseCleanup: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<any>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []); // dependency array فارغ لتشغيل مرة واحدة فقط

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const result = await getDatabaseStatus();
      setStatus(result.status);
    } catch (error) {
      console.error('خطأ في جلب حالة قاعدة البيانات:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async () => {
    setShowConfirm(false);
    setLoading(true);
    try {
      const result = await cleanupUnusedTables();
      setCleanupResult(result);
      if (result.success) {
        // تحديث الحالة بعد التنظيف
        await fetchStatus();
      }
    } catch (error) {
      console.error('خطأ في تنظيف قاعدة البيانات:', error);
      setCleanupResult({
        success: false,
        message: 'حدث خطأ أثناء تنظيف قاعدة البيانات'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && !status) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">جاري فحص قاعدة البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <Database className="h-8 w-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">إدارة قاعدة البيانات</h1>
        </div>
        <p className="text-gray-600">
          إدارة الجداول في قاعدة البيانات وحذف الجداول غير المستخدمة لتحسين الأداء
        </p>
      </div>

      {/* Status Cards */}
      {status && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* الجداول المستخدمة */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">الجداول المستخدمة</h3>
            </div>
            <div className="space-y-2">
              {status.usedTables.map((table: string) => (
                <div key={table} className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-700">{table}</span>
                </div>
              ))}
              {status.usedTables.length === 0 && (
                <p className="text-gray-500 text-sm">لا توجد جداول مستخدمة</p>
              )}
            </div>
          </div>

          {/* الجداول المفقودة */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
              <h3 className="text-lg font-semibold text-gray-900">الجداول المفقودة</h3>
            </div>
            <div className="space-y-2">
              {status.missingTables.map((table: string) => (
                <div key={table} className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-gray-700">{table}</span>
                </div>
              ))}
              {status.missingTables.length === 0 && (
                <p className="text-green-600 text-sm">جميع الجداول المطلوبة موجودة</p>
              )}
            </div>
          </div>

          {/* الجداول غير المستخدمة */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <Trash2 className="h-6 w-6 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">الجداول غير المستخدمة</h3>
            </div>
            <div className="space-y-2">
              {status.unusedTables.map((table: string) => (
                <div key={table} className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-gray-700">{table}</span>
                </div>
              ))}
              {status.unusedTables.length === 0 && (
                <p className="text-green-600 text-sm">لا توجد جداول غير مستخدمة</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cleanup Result */}
      {cleanupResult && (
        <div className={`bg-white rounded-lg shadow-md p-6 ${
          cleanupResult.success ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            {cleanupResult.success ? (
              <CheckCircle className="h-6 w-6 text-green-600" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-red-600" />
            )}
            <h3 className="text-lg font-semibold text-gray-900">
              {cleanupResult.success ? 'تم التنظيف بنجاح' : 'فشل في التنظيف'}
            </h3>
          </div>
          <p className="text-gray-700 mb-4">{cleanupResult.message}</p>
          
          {cleanupResult.deletedTables && cleanupResult.deletedTables.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold text-gray-900 mb-2">الجداول المحذوفة:</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {cleanupResult.deletedTables.map((table: string) => (
                  <div key={table} className="bg-gray-100 px-3 py-1 rounded text-sm">
                    {table}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {cleanupResult.errors && cleanupResult.errors.length > 0 && (
            <div>
              <h4 className="font-semibold text-red-600 mb-2">الأخطاء:</h4>
              <div className="space-y-2">
                {cleanupResult.errors.map((error: any, index: number) => (
                  <div key={index} className="bg-red-50 p-3 rounded text-sm">
                    <strong>{error.table}:</strong> {error.error?.message || 'خطأ غير معروف'}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث الحالة
          </button>

          {status?.unusedTables && status.unusedTables.length > 0 && (
            <button
              onClick={() => setShowConfirm(true)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-4 w-4" />
              حذف الجداول غير المستخدمة ({status.unusedTables.length})
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">تأكيد الحذف</h3>
            </div>
            <p className="text-gray-700 mb-6">
              هل أنت متأكد من حذف الجداول غير المستخدمة؟ هذا الإجراء لا يمكن التراجع عنه.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                إلغاء
              </button>
              <button
                onClick={handleCleanup}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Info className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">معلومات مهمة</h3>
        </div>
        <div className="space-y-3 text-sm text-gray-700">
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
            <p>الجداول المستخدمة: هذه الجداول ضرورية لعمل النظام ولا يجب حذفها</p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
            <p>الجداول المفقودة: هذه الجداول مطلوبة ولكنها غير موجودة في قاعدة البيانات</p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
            <p>الجداول غير المستخدمة: يمكن حذف هذه الجداول بأمان لتحسين الأداء</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseCleanup; 