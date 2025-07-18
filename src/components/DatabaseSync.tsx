import React, { useState, useEffect } from 'react';
import { diagnoseDatabase, syncDatabase } from '../utils/databaseSync';

// ===== إصلاحات التحديث المستمر =====
// تم إصلاح dependency arrays في useEffect لتجنب التحديث المستمر
// =====================================
import { 
  Database, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Info,
  Settings,
  Wrench,
  FileText,
  Users,
  Plus,
  ArrowRight
} from 'lucide-react';

const DatabaseSync: React.FC = () => {
  const [diagnosis, setDiagnosis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    fetchDiagnosis();
  }, []); // dependency array فارغ لتشغيل مرة واحدة فقط

  const fetchDiagnosis = async () => {
    setLoading(true);
    try {
      const result = await diagnoseDatabase();
      if (result.success) {
        setDiagnosis(result.diagnosis);
      }
    } catch (error) {
      console.error('خطأ في جلب تشخيص قاعدة البيانات:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setShowConfirm(false);
    setLoading(true);
    try {
      const result = await syncDatabase();
      setSyncResult(result);
      if (result.success) {
        // تحديث التشخيص بعد المزامنة
        await fetchDiagnosis();
      }
    } catch (error) {
      console.error('خطأ في مزامنة قاعدة البيانات:', error);
      setSyncResult({
        success: false,
        error: 'حدث خطأ أثناء مزامنة قاعدة البيانات'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && !diagnosis) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">جاري تشخيص قاعدة البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <Database className="h-8 w-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">مزامنة قاعدة البيانات</h1>
        </div>
        <p className="text-gray-600">
          تشخيص ومزامنة قاعدة البيانات مع هيكل النظام المطلوب
        </p>
      </div>

      {/* Summary Cards */}
      {diagnosis && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <Database className="h-6 w-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">إجمالي الجداول</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">{diagnosis.summary.totalTables}</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">الجداول الموجودة</h3>
            </div>
            <p className="text-3xl font-bold text-green-600">{diagnosis.summary.existingTables}</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
              <h3 className="text-lg font-semibold text-gray-900">الجداول المفقودة</h3>
            </div>
            <p className="text-3xl font-bold text-yellow-600">{diagnosis.summary.missingTables}</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <Wrench className="h-6 w-6 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">الجداول مع مشاكل</h3>
            </div>
            <p className="text-3xl font-bold text-red-600">{diagnosis.summary.tablesWithIssues}</p>
          </div>
        </div>
      )}

      {/* Detailed Table Status */}
      {diagnosis && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">تفاصيل حالة الجداول</h3>
          <div className="space-y-4">
            {Object.entries(diagnosis.tables).map(([tableName, tableStatus]: [string, any]) => (
              <div key={tableName} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {tableStatus.exists ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    )}
                    <h4 className="font-semibold text-gray-900">{tableName}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {tableStatus.exists ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        موجود
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                        مفقود
                      </span>
                    )}
                  </div>
                </div>

                {tableStatus.exists && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-sm font-medium text-green-600 mb-2">الأعمدة الموجودة:</h5>
                      <div className="flex flex-wrap gap-1">
                        {tableStatus.columns.map((col: string) => (
                          <span key={col} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                            {col}
                          </span>
                        ))}
                      </div>
                    </div>
                    {tableStatus.missingColumns.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-red-600 mb-2">الأعمدة المفقودة:</h5>
                        <div className="flex flex-wrap gap-1">
                          {tableStatus.missingColumns.map((col: string) => (
                            <span key={col} className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                              {col}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {tableStatus.issues.length > 0 && (
                  <div className="mt-3">
                    <h5 className="text-sm font-medium text-red-600 mb-2">المشاكل:</h5>
                    <div className="space-y-1">
                      {tableStatus.issues.map((issue: string, index: number) => (
                        <p key={index} className="text-sm text-red-600">{issue}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sync Result */}
      {syncResult && (
        <div className={`bg-white rounded-lg shadow-md p-6 ${
          syncResult.success ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            {syncResult.success ? (
              <CheckCircle className="h-6 w-6 text-green-600" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-red-600" />
            )}
            <h3 className="text-lg font-semibold text-gray-900">
              {syncResult.success ? 'تمت المزامنة بنجاح' : 'فشل في المزامنة'}
            </h3>
          </div>

          {syncResult.success && syncResult.results && (
            <div className="space-y-4">
              {syncResult.results.tablesCreated.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">الجداول المنشأة:</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {syncResult.results.tablesCreated.map((table: string) => (
                      <div key={table} className="bg-green-100 px-3 py-1 rounded text-sm text-green-800">
                        {table}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {syncResult.results.columnsAdded.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">الأعمدة المضافة:</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {syncResult.results.columnsAdded.map((item: any, index: number) => (
                      <div key={index} className="bg-blue-100 px-3 py-1 rounded text-sm text-blue-800">
                        {item.table}.{item.column}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {syncResult.results.functionsCreated.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">الدوال المنشأة:</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {syncResult.results.functionsCreated.map((func: string) => (
                      <div key={func} className="bg-purple-100 px-3 py-1 rounded text-sm text-purple-800">
                        {func}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {syncResult.results.errors.length > 0 && (
                <div>
                  <h4 className="font-semibold text-red-600 mb-2">الأخطاء:</h4>
                  <div className="space-y-2">
                    {syncResult.results.errors.map((error: any, index: number) => (
                      <div key={index} className="bg-red-50 p-3 rounded text-sm">
                        <strong>{error.table || error.function}:</strong> {error.error?.message || error.error || 'خطأ غير معروف'}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!syncResult.success && (
            <p className="text-red-600">{syncResult.error}</p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={fetchDiagnosis}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث التشخيص
          </button>

          {diagnosis && (diagnosis.summary.missingTables > 0 || diagnosis.summary.tablesWithIssues > 0) && (
            <button
              onClick={() => setShowConfirm(true)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Settings className="h-4 w-4" />
              {loading ? 'جاري المزامنة...' : 'مزامنة قاعدة البيانات'}
            </button>
          )}

          <button
            onClick={() => {
              window.open('https://app.supabase.com/project/wxrfpfpfquzpwhsdockniq/editor', '_blank');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            <Database className="h-4 w-4" />
            فتح Supabase Dashboard
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <Settings className="h-6 w-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">تأكيد المزامنة</h3>
            </div>
            <p className="text-gray-700 mb-6">
              هل أنت متأكد من مزامنة قاعدة البيانات؟ سيتم إنشاء الجداول والأعمدة المفقودة تلقائياً.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                إلغاء
              </button>
              <button
                onClick={handleSync}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                تأكيد المزامنة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Info className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">معلومات المزامنة</h3>
        </div>
        <div className="space-y-3 text-sm text-gray-700">
          <div className="flex items-start gap-2">
            <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>المزامنة ستقوم بإنشاء الجداول والأعمدة المفقودة تلقائياً</p>
          </div>
          <div className="flex items-start gap-2">
            <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>البيانات الموجودة لن تتأثر، سيتم إضافة الأعمدة الجديدة فقط</p>
          </div>
          <div className="flex items-start gap-2">
            <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>بعد المزامنة، سيعمل النظام بشكل طبيعي مع قاعدة البيانات المحدثة</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseSync; 