import React, { useState, useEffect, useMemo, useRef } from 'react';
declare global {
  interface Window {
    reportLogoUrl?: string;
  }
}
import { getSupabaseClient } from '../supabaseClient';

// ===== إصلاحات التحديث المستمر =====
// تم إصلاح dependency arrays في useEffect لتجنب التحديث المستمر
// =====================================
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  Users,
  Calendar,
  Download,
  Filter,
  Printer
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import '../../public/fonts/Amiri-Regular-normal.js';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useReactToPrint } from 'react-to-print';

// شعار افتراضي (يمكن تغييره عبر window.reportLogoUrl)
const DEFAULT_LOGO_URL = 'https://via.placeholder.com/150x50/3b82f6/ffffff?text=Repair+Shop';

const supabase = getSupabaseClient();

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-red-600 p-4">
          حدث خطأ: {this.state.error?.message || 'غير معروف'}
        </div>
      );
    }
    return this.props.children;
  }
}

const Reports = () => {
  const [devices, setDevices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [selectedTechnician, setSelectedTechnician] = useState('all');
  const [selectedDeviceType, setSelectedDeviceType] = useState('all');
  const [selectedExportType, setSelectedExportType] = useState('');
  const componentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: devicesData, error: devicesError } = await supabase
          .from('devices')
          .select('*')
          .gte('entry_date', dateRange.startDate)
          .lte('entry_date', dateRange.endDate);
        const { data: customersData, error: customersError } = await supabase.from('customers').select('*');
        const { data: techniciansData, error: techniciansError } = await supabase.from('technicians').select('*');
        const { data: actionsData, error: actionsError } = await supabase
          .from('maintenance_actions')
          .select('*, devices(entry_date, repair_status, delivered)');

        if (devicesError) throw new Error(`Error fetching devices: ${devicesError.message}`);
        if (customersError) throw new Error(`Error fetching customers: ${customersError.message}`);
        if (techniciansError) throw new Error(`Error fetching technicians: ${techniciansError.message}`);
        if (actionsError) throw new Error(`Error fetching maintenance_actions: ${actionsError.message}`);

        setDevices(devicesData || []);
        setCustomers(customersData || []);
        setTechnicians(techniciansData || []);
        setActions(actionsData || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('فشل في جلب البيانات من قاعدة البيانات');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dateRange]);

  const completedActions = (actions || []).filter(a => 
    a?.start_date && 
    a?.completed_date && 
    !isNaN(new Date(a.start_date).getTime()) && 
    !isNaN(new Date(a.completed_date).getTime())
  );
  const avgRepairDurationHours = completedActions.length > 0
    ? (completedActions.reduce((sum, a) => {
        const start = new Date(a.start_date).getTime();
        const end = new Date(a.completed_date).getTime();
        return sum + Math.max(0, end - start);
      }, 0) / completedActions.length) / (1000 * 60 * 60)
    : 0;

  const filteredDevices: any[] = useMemo(() => {
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);

    let filtered = ((devices as any[]) || []).filter(device => {
      if (!device) return false;
      const entryDate = device.entry_date || device.entryDate;
      if (!entryDate) return false;
      const deviceDate = new Date(entryDate);
      if (isNaN(deviceDate.getTime())) return false;
      const dateMatch = deviceDate >= startDate && deviceDate <= endDate;
      const typeMatch = selectedDeviceType === 'all' || device.device_type === selectedDeviceType;
      return dateMatch && typeMatch;
    });

    if (selectedTechnician !== 'all') {
      // جميع الأجهزة التي قام الفني بأي إجراء عليها ضمن الفترة
      const techActions = ((actions as any[]) || []).filter(action => {
        if (!action) return false;
        const techId = action?.technician_id ?? null;
        if (techId === null || String(techId) !== String(selectedTechnician)) return false;
        // تحقق من تاريخ الجهاز
        const device = ((devices as any[]) || []).find((d: any) => d?.id === action.device_id);
        if (!device) return false;
        const entryDate = device.entry_date || device.entryDate;
        if (!entryDate) return false;
        const deviceDate = new Date(entryDate);
        if (isNaN(deviceDate.getTime())) return false;
        return deviceDate >= startDate && deviceDate <= endDate;
      });
      const techDeviceIds = new Set(techActions.map((a: any) => a?.device_id).filter((id: any) => id));
      filtered = ((devices as any[]) || []).filter((device: any) => techDeviceIds.has(device?.id));
      // يمكن أيضًا تطبيق فلتر نوع الجهاز إذا كان محددًا
      if (selectedDeviceType !== 'all') {
        filtered = filtered.filter((device: any) => device.device_type === selectedDeviceType);
      }
    }

    return filtered || [];
  }, [devices, actions, dateRange, selectedTechnician, selectedDeviceType]);

  const totalDevices = filteredDevices.length;
  const deliveredDevices = (filteredDevices as any[]).filter(d => d?.delivered === true || d?.delivered === 1 || (typeof d?.delivered === 'string' && d?.delivered.toLowerCase() === 'true')).length;
  const completedDevices = (filteredDevices as any[]).filter(d => d?.repair_status?.toLowerCase() === 'completed').length;
  const inProgressDevices = (filteredDevices as any[]).filter(d => d?.repair_status?.toLowerCase() === 'in-progress').length;
  const pendingDevices = (filteredDevices as any[]).filter(d => d?.repair_status?.toLowerCase() === 'pending').length;
  const cannotRepairDevices = (filteredDevices as any[]).filter(d => d?.repair_status?.toLowerCase() === 'la-yuslih').length;
  const completionRate = totalDevices > 0 ? (completedDevices / totalDevices) * 100 : 0;

  const filteredActions = ((actions as any[]) || []).filter((a: any) => {
    if (!a || !a.device_id) return false;
    const device = ((devices as any[]) || []).find((d: any) => d?.id === a.device_id);
    if (!device) return false;
    const rawDate = device.entry_date || device.entryDate;
    if (!rawDate) return false;
    const deviceDate = new Date(rawDate);
    if (isNaN(deviceDate.getTime())) return false;
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    const dateMatch = deviceDate >= startDate && deviceDate <= endDate;
    const techId = a.technician_id ?? null;
    const technicianMatch = selectedTechnician === 'all' || (techId !== null && String(techId) === String(selectedTechnician));
    return dateMatch && technicianMatch;
  });

  let totalRevenue = filteredActions.reduce((sum, action) => {
    const cost = Number(action?.cost ?? 0);
    return sum + (isNaN(cost) ? 0 : cost);
  }, 0);
  let partsCost = filteredActions.reduce((sum, action) => {
    const part = Number(action?.parts_cost ?? 0);
    return sum + (isNaN(part) ? 0 : part);
  }, 0);
  let netProfit = filteredActions.reduce((sum, action) => {
    const cost = Number(action?.cost ?? 0);
    const part = Number(action?.parts_cost ?? 0);
    return sum + ((isNaN(cost) ? 0 : cost) - (isNaN(part) ? 0 : part));
  }, 0);
  let averageRepairCost = totalDevices > 0 ? totalRevenue / totalDevices : 0;

  const deviceTypesStats = filteredDevices.reduce((acc, device) => {
    const type = device?.device_type || 'غير محدد';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  const deviceTypes = [...new Set((devices || []).map(d => d?.device_type).filter(type => type))];

  const issueTypesStats = filteredDevices.reduce((acc, device) => {
    const type = device?.issue_type || 'غير محدد';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const technicianStats = (technicians || []).map(technician => {
    const techActions = (actions || []).filter(action => {
      const techId = action?.technician_id ?? null;
      if (techId === null || String(techId) !== String(technician?.id)) return false;
      const device = (devices || []).find(d => d?.id === action.device_id);
      if (!device) return false;
      const rawDate = device.entry_date || device.entryDate;
      if (!rawDate) return false;
      const actionDate = new Date(rawDate);
      if (isNaN(actionDate.getTime())) return false;
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      return actionDate >= startDate && actionDate <= endDate;
    });

    const techDeviceIds = new Set(techActions.map(a => a?.device_id).filter(id => id));
    const techDevices = (devices || []).filter(d => techDeviceIds.has(d?.id));
    const completed = techDevices.filter(d => d?.repair_status?.toLowerCase() === 'completed').length;
    const total = techDevices.length;

    const revenue = techActions.reduce((sum, action) => {
      const cost = Number(action?.cost ?? 0);
      return sum + (isNaN(cost) ? 0 : cost);
    }, 0);

    return {
      name: technician?.name || 'غير محدد',
      total,
      completed,
      rate: total > 0 ? (completed / total) * 100 : 0,
      revenue
    };
  }).filter(stat => stat.total > 0);

  const deviceTypeChartData = Object.entries(deviceTypesStats).map(([type, count]) => ({ name: type, count }));
  const issueTypeChartData = Object.entries(issueTypesStats).map(([type, count]) => ({
    name: type === 'hardware' ? 'هاردوير' : type === 'software' ? 'سوفتوير' : type,
    count
  }));

  const exportReport = async (format) => {
    const reportData = {
      period: `${dateRange.startDate} إلى ${dateRange.endDate}`,
      summary: {
        totalDevices,
        completedDevices,
        inProgressDevices,
        pendingDevices,
        cannotRepairDevices,
        totalRevenue,
        averageRepairCost,
        completionRate
      },
      deviceTypes: deviceTypesStats,
      issueTypes: issueTypesStats,
      technicians: technicianStats
    };

    try {
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `repair-report-${dateRange.startDate}-to-${dateRange.endDate}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === 'csv') {
        const csvContent = [
          ['الفترة', `${dateRange.startDate} إلى ${dateRange.endDate}`],
          [''],
          ['الملخص'],
          ['إجمالي الأجهزة', totalDevices],
          ['الأجهزة المكتملة', completedDevices],
          ['الأجهزة قيد الإصلاح', inProgressDevices],
          ['الأجهزة قيد الانتظار', pendingDevices],
          ['الأجهزة غير القابلة للإصلاح', cannotRepairDevices],
          ['إجمالي الإيرادات', totalRevenue.toFixed(2)],
          ['متوسط تكلفة الإصلاح', Number(averageRepairCost.toFixed(2)).toString().replace(/,/g, '')],
          ['معدل الإنجاز', completionRate.toFixed(1) + '%'],
          [''],
          ['أنواع الأجهزة'],
          ...Object.entries(deviceTypesStats).map(([type, count]) => [type, count]),
          [''],
          ['أنواع الأعطال'],
          ...Object.entries(issueTypesStats).map(([type, count]) => [type === 'hardware' ? 'هاردوير' : type === 'software' ? 'سوفتوير' : type, count]),
          [''],
          ['أداء الفنيين'],
          ['اسم الفني', 'إجمالي الأجهزة', 'مكتملة', 'معدل الإنجاز'],
          ...technicianStats.map(stat => [stat.name, stat.total, stat.completed, stat.rate.toFixed(1) + '%'])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `repair-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === 'pdf') {
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        doc.setFont('Amiri-Regular');
        
        // أبعاد الصفحة
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        const availableWidth = pageWidth - 2 * margin;
        
        // إضافة شعار التقرير
        const logoUrl = window.reportLogoUrl || DEFAULT_LOGO_URL;
        try {
          const logoData = await fetch(logoUrl).then(res => res.blob());
          const logoUrlObject = URL.createObjectURL(logoData);
          await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              const logoHeight = 20;
              const logoWidth = (logoHeight * img.width) / img.height;
              doc.addImage(logoUrlObject, 'PNG', pageWidth - margin - logoWidth, margin, logoWidth, logoHeight);
              resolve(true);
            };
            img.src = logoUrlObject;
          });
        } catch (e) {
          console.error('Error loading logo:', e);
        }

        // عنوان التقرير
        doc.setFontSize(18);
        doc.setTextColor(59, 130, 246);
        doc.text('تقرير إصلاح الأجهزة', margin, 30, { align: 'left' });
        
        // معلومات الفترة
        doc.setFontSize(12);
        doc.setTextColor(100, 116, 139);
        doc.text(`الفترة: ${dateRange.startDate} إلى ${dateRange.endDate}`, margin, 38);
        
        // خط فاصل
        doc.setDrawColor(59, 130, 246);
        doc.setLineWidth(0.5);
        doc.line(margin, 42, pageWidth - margin, 42);
        
        // إضافة الجداول مع تصميم محسن
        const addStyledTable = (title, head, body, startY) => {
          // عنوان القسم
          doc.setFontSize(14);
          doc.setTextColor(59, 130, 246);
          doc.text(title, margin, startY);
          
          // الجدول
          autoTable(doc, {
            startY: startY + 5,
            head: [head],
            body: body,
            styles: { 
              font: 'Amiri-Regular', 
              halign: 'right', 
              fontSize: 10,
              cellPadding: 3,
              textColor: [31, 41, 55]
            },
            alternateRowStyles: { 
              fillColor: [249, 250, 251]
            },
            headStyles: { 
              font: 'Amiri-Regular', 
              fontStyle: 'bold', 
              halign: 'right', 
              fontSize: 11, 
              fillColor: [59, 130, 246], 
              textColor: [255, 255, 255],
              cellPadding: 4
            },
            margin: { right: margin, left: margin },
            tableLineWidth: 0.2,
            tableLineColor: [229, 231, 235],
            useCss: true,
            direction: 'rtl',
          });
        };

        // ملخص التقرير
        addStyledTable(
          'الملخص',
          ['البند', 'القيمة'],
          [
            ['إجمالي الأجهزة', totalDevices],
            ['الأجهزة المكتملة', completedDevices],
            ['الأجهزة قيد الإصلاح', inProgressDevices],
            ['الأجهزة قيد الانتظار', pendingDevices],
            ['الأجهزة غير القابلة للإصلاح', cannotRepairDevices],
            ['إجمالي الإيرادات', `${totalRevenue.toFixed(2)} ر.س`],
            ['متوسط تكلفة الإصلاح', `${Number(averageRepairCost.toFixed(2)).toString().replace(/,/g, '')} ر.س`],
            ['معدل الإنجاز', `${completionRate.toFixed(1)}%`]
          ],
          45
        );

        // أنواع الأجهزة
        addStyledTable(
          'أنواع الأجهزة',
          ['النوع', 'العدد'],
          Object.entries(deviceTypesStats).map(([type, count]) => [type, count]),
          doc.lastAutoTable.finalY + 15
        );

        // أنواع الأعطال
        addStyledTable(
          'أنواع الأعطال',
          ['النوع', 'العدد'],
          Object.entries(issueTypesStats).map(([type, count]) => [
            type === 'hardware' ? 'هاردوير' : type === 'software' ? 'سوفتوير' : type, 
            count
          ]),
          doc.lastAutoTable.finalY + 15
        );

        // أداء الفنيين
        if (technicianStats.length > 0) {
          addStyledTable(
            'أداء الفنيين',
            ['اسم الفني', 'إجمالي الأجهزة', 'مكتملة', 'معدل الإنجاز'],
            technicianStats.map(stat => [
              stat.name, 
              stat.total, 
              stat.completed, 
              `${stat.rate.toFixed(1)}%`
            ]),
            doc.lastAutoTable.finalY + 15
          );
        }

        // تذييل الصفحة
        const footerY = doc.internal.pageSize.getHeight() - 10;
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text('تم إنشاء التقرير تلقائياً بواسطة نظام إدارة ورشة الإصلاح', pageWidth / 2, footerY, { align: 'center' });
        doc.text(`تاريخ الإنشاء: ${new Date().toLocaleDateString('ar-SA')}`, margin, footerY);
        doc.text(`الصفحة ${doc.internal.getNumberOfPages()}`, pageWidth - margin, footerY, { align: 'right' });

        doc.save(`repair-report-${dateRange.startDate}-to-${dateRange.endDate}.pdf`);
      } else if (format === 'xlsx') {
        // ExcelJS logic for styled export
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('تقرير الإصلاح', {
          properties: { tabColor: { argb: 'FF1E3A8A' }, rtl: true },
          pageSetup: { orientation: 'portrait', fitToPage: true }
        });

        // إعداد الأعمدة
        sheet.columns = [
          { header: '', key: 'col1', width: 22 },
          { header: '', key: 'col2', width: 22 },
          { header: '', key: 'col3', width: 22 },
          { header: '', key: 'col4', width: 22 },
        ];

        // ألوان
        const headerColor = '1E3A8A'; // أزرق غامق
        const altRowColor = 'DBEAFE'; // أزرق فاتح جداً
        const white = 'FFFFFF';

        // Helper to add a section with title, header, and rows (cell-level styling only)
        const addSection = (title, header, rows) => {
          // Title row (only first cell styled)
          const titleRow = sheet.addRow([title]);
          const titleCell = titleRow.getCell(1);
          titleCell.value = title;
          titleCell.font = { bold: true, size: 14, color: { argb: headerColor } };
          titleCell.alignment = { horizontal: 'right', vertical: 'middle', readingOrder: 'rtl' };
          sheet.mergeCells(`A${titleRow.number}:D${titleRow.number}`);

          // Header row (style only filled cells)
          const headerRow = sheet.addRow(header);
          for (let i = 1; i <= header.length; i++) {
            const cell = headerRow.getCell(i);
            cell.font = { bold: true, size: 12, color: { argb: white } };
            cell.fill = { type: 'gradient', gradient: 'angle', degree: 0, stops: [ { position: 0, color: { argb: headerColor } }, { position: 1, color: { argb: 'FF2563EB' } } ] };
            cell.alignment = { horizontal: 'center', vertical: 'middle', readingOrder: 'rtl' };
            cell.border = {
              top: { style: 'thin', color: { argb: headerColor } },
              left: { style: 'thin', color: { argb: headerColor } },
              bottom: { style: 'thin', color: { argb: headerColor } },
              right: { style: 'thin', color: { argb: headerColor } },
            };
          }

          // Data rows (style only filled cells)
          rows.forEach((row, idx) => {
            const dataRow = sheet.addRow(row);
            for (let i = 1; i <= row.length; i++) {
              const cell = dataRow.getCell(i);
              cell.font = { size: 12 };
              cell.alignment = { horizontal: 'center', vertical: 'middle', readingOrder: 'rtl' };
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? altRowColor : white } };
              cell.border = {
                top: { style: 'thin', color: { argb: headerColor } },
                left: { style: 'thin', color: { argb: headerColor } },
                bottom: { style: 'thin', color: { argb: headerColor } },
                right: { style: 'thin', color: { argb: headerColor } },
              };
            }
          });

          // Empty row after section
          sheet.addRow([]);
        };

        // الفترة
        const periodRow = sheet.addRow([`الفترة: ${dateRange.startDate} إلى ${dateRange.endDate}`]);
        periodRow.font = { bold: true, size: 13, color: { argb: headerColor } };
        periodRow.alignment = { horizontal: 'right', vertical: 'middle', readingOrder: 2 };
        sheet.mergeCells(`A${periodRow.number}:D${periodRow.number}`);
        sheet.addRow([]);

        // الملخص
        addSection('الملخص', ['البند', 'القيمة'], [
          ['إجمالي الأجهزة', totalDevices],
          ['الأجهزة المكتملة', completedDevices],
          ['الأجهزة قيد الإصلاح', inProgressDevices],
          ['الأجهزة قيد الانتظار', pendingDevices],
          ['الأجهزة غير القابلة للإصلاح', cannotRepairDevices],
          ['إجمالي الإيرادات', `${totalRevenue.toFixed(2)} ر.س`],
          ['متوسط تكلفة الإصلاح', `${Number(averageRepairCost.toFixed(2)).toString().replace(/,/g, '')} ر.س`],
          ['معدل الإنجاز', `${completionRate.toFixed(1)}%`],
        ]);

        // أنواع الأجهزة
        addSection('أنواع الأجهزة', ['النوع', 'العدد'], Object.entries(deviceTypesStats).map(([type, count]) => [type, count]));

        // أنواع الأعطال
        addSection('أنواع الأعطال', ['النوع', 'العدد'], Object.entries(issueTypesStats).map(([type, count]) => [type === 'hardware' ? 'هاردوير' : type === 'software' ? 'سوفتوير' : type, count]));

        // أداء الفنيين
        if (technicianStats.length > 0) {
          addSection('أداء الفنيين', ['اسم الفني', 'إجمالي الأجهزة', 'مكتملة', 'معدل الإنجاز'], technicianStats.map(stat => [stat.name, stat.total, stat.completed, `${stat.rate.toFixed(1)}%`]));
        }

        // ضبط اتجاه الورقة RTL
        sheet.views = [{ rightToLeft: true }];

        // حفظ الملف
        workbook.xlsx.writeBuffer().then((buffer) => {
          saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `repair-report-${dateRange.startDate}-to-${dateRange.endDate}.xlsx`);
        });
      }
    } catch (exportError) {
      console.error('Error exporting report:', exportError);
      alert('حدث خطأ أثناء تصدير التقرير. يرجى المحاولة مرة أخرى.');
    }
  };

  // @ts-ignore
  const handlePrint = useReactToPrint({
    // @ts-ignore
    content: () => componentRef.current || null,
    documentTitle: `repair-report-${dateRange.startDate}-to-${dateRange.endDate}`,
    // @ts-ignore
    onError: (error: any) => console.error('Print error:', error),
  });

  const exportTechnicianReport = async (type: string) => {
    // @ts-ignore
    const technician = technicians.find((t: any) => String(t.id) === String(selectedTechnician));
    if (!technician) return alert('لم يتم العثور على بيانات الفني');
    
    // @ts-ignore
    const techActions = (actions || []).filter((action: any) => {
      const techId = action?.technician_id ?? null;
      if (techId === null || String(techId) !== String(selectedTechnician)) return false;
      const device = (devices || []).find((d: any) => d?.id === action.device_id);
      if (!device) return false;
      const rawDate = device.entry_date || device.entryDate;
      if (!rawDate) return false;
      const actionDate = new Date(rawDate);
      if (isNaN(actionDate.getTime())) return false;
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      return actionDate >= startDate && actionDate <= endDate;
    });

    // @ts-ignore
    const techDeviceIds = new Set(techActions.map((a: any) => a?.device_id).filter((id: any) => id));
    // @ts-ignore
    const techDevices = (devices || []).filter((d: any) => techDeviceIds.has(d?.id));
    const totalDevices = techDevices.length;
    // @ts-ignore
    const totalPartsCost = techActions.reduce((sum: number, a: any) => sum + (Number(a?.parts_cost) || 0), 0);
    // @ts-ignore
    const totalCost = techActions.reduce((sum: number, a: any) => sum + (Number(a?.cost) || 0), 0);
    // @ts-ignore
    const netProfit = techActions.reduce((sum: number, a: any) => sum + ((Number(a?.cost) || 0) - (Number(a?.parts_cost) || 0)), 0);
    // @ts-ignore
    const detailRows = techActions.map((a: any) => {
      const device = (devices || []).find((d: any) => d?.id === a.device_id);
      return [
        device?.device_type || 'غير محدد',
        a?.action_type || 'غير محدد',
        (a?.parts_cost ?? 0) + ' ر.س',
        (a?.cost ?? 0) + ' ر.س',
        ((Number(a?.cost) || 0) - (Number(a?.parts_cost) || 0)) + ' ر.س'
      ];
    });

    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    doc.setFont('Amiri-Regular');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;

    // إضافة شعار التقرير
    const logoUrl = window.reportLogoUrl || DEFAULT_LOGO_URL;
    try {
      const logoData = await fetch(logoUrl).then(res => res.blob());
      const logoUrlObject = URL.createObjectURL(logoData);
      await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const logoHeight = 20;
          const logoWidth = (logoHeight * img.width) / img.height;
          doc.addImage(logoUrlObject, 'PNG', pageWidth - margin - logoWidth, margin, logoWidth, logoHeight);
          resolve(true);
        };
        img.src = logoUrlObject;
      });
    } catch (e) {
      console.error('Error loading logo:', e);
    }

    // عنوان التقرير
    doc.setFontSize(18);
    doc.setTextColor(59, 130, 246);
    doc.text(`تقرير فني (${type === 'summary' ? 'ملخص' : 'تفصيلي'})`, margin, 30, { align: 'left' });
    
    // معلومات الفني والفترة
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139);
    doc.text(`الفني: ${technician.name}`, margin, 38);
    doc.text(`الفترة: ${dateRange.startDate} إلى ${dateRange.endDate}`, margin, 45);
    
    // خط فاصل
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.5);
    doc.line(margin, 50, pageWidth - margin, 50);

    // جدول الملخص
    autoTable(doc, {
      startY: 55,
      head: [['عدد الأجهزة', 'كلفة القطع', 'التكلفة الكلية', 'الأرباح الصافية']],
      body: [[
        totalDevices,
        `${totalPartsCost} ر.س`,
        `${totalCost} ر.س`,
        `${netProfit} ر.س`
      ]],
      styles: { 
        font: 'Amiri-Regular', 
        halign: 'right', 
        fontSize: 11,
        textColor: [31, 41, 55]
      },
      headStyles: { 
        font: 'Amiri-Regular', 
        fontStyle: 'normal', 
        halign: 'right', 
        fontSize: 12, 
        fillColor: [59, 130, 246], 
        textColor: [255, 255, 255],
        cellPadding: 4
      },
      margin: { right: margin, left: margin },
      tableLineWidth: 0.2,
      tableLineColor: [229, 231, 235],
      useCss: true,
      direction: 'rtl',
    });

    // الجدول التفصيلي إذا كان المطلوب
    if (type === 'detail') {
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 15,
        head: [['الجهاز', 'الإجراء', 'كلفة القطع', 'التكلفة الكلية', 'الربح الصافي']],
        body: detailRows,
        styles: { 
          font: 'Amiri-Regular', 
          halign: 'right', 
          fontSize: 10,
          textColor: [31, 41, 55]
        },
        headStyles: { 
          font: 'Amiri-Regular', 
          fontStyle: 'normal', 
          halign: 'right', 
          fontSize: 11, 
          fillColor: [59, 130, 246], 
          textColor: [255, 255, 255],
          cellPadding: 4
        },
        margin: { right: margin, left: margin },
        tableLineWidth: 0.2,
        tableLineColor: [229, 231, 235],
        useCss: true,
        direction: 'rtl',
      });
    }

    // تذييل الصفحة
    const footerY = doc.internal.pageSize.getHeight() - 10;
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('تم إنشاء التقرير تلقائياً بواسطة نظام إدارة ورشة الإصلاح', pageWidth / 2, footerY, { align: 'center' });
    doc.text(`تاريخ الإنشاء: ${new Date().toLocaleDateString('ar-SA')}`, margin, footerY);
    doc.text(`الصفحة ${doc.internal.getNumberOfPages()}`, pageWidth - margin, footerY, { align: 'right' });

    doc.save(`technician-report-${technician.name}-${dateRange.startDate}-to-${dateRange.endDate}.pdf`);
  };

  if (loading) return <div>جاري التحميل...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 size={24} />
            التقارير والإحصائيات
          </h2>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-gray-400" />
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="تاريخ البداية"
              />
              <span className="text-gray-500">إلى</span>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="تاريخ النهاية"
              />
            </div>
            
            <select
              value={selectedTechnician}
              onChange={(e) => setSelectedTechnician(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="اختيار الفني"
            >
              <option value="all">جميع الفنيين</option>
              {technicians.map(technician => (
                <option key={technician.id} value={technician.id}>
                  {technician.name}
                </option>
              ))}
            </select>
            
            <select
              value={selectedDeviceType}
              onChange={(e) => setSelectedDeviceType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="اختيار نوع الجهاز"
            >
              <option value="all">جميع أنواع الأجهزة</option>
              {deviceTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            
            <select
              value={selectedExportType}
              onChange={(e) => setSelectedExportType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="اختيار تنسيق التصدير"
            >
              <option value="">اختر تنسيق التصدير</option>
              <option value="json">JSON (عام)</option>
              <option value="csv">CSV (عام)</option>
              <option value="pdf">PDF (عام)</option>
              {selectedTechnician !== 'all' ? (
                <>
                  <option value="tech-summary-xlsx">Excel تقرير (ملخص)</option>
                  <option value="xlsx">Excel (عام)</option>
                  <option value="tech-summary">PDF تقرير (ملخص)</option>
                  <option value="tech-detail">PDF تقرير (تفصيلي)</option>
                </>
              ) : (
                <option value="xlsx">Excel (عام)</option>
              )}
            </select>

            <button
              onClick={() => {
                if (!selectedExportType) {
                  alert('يرجى اختيار تنسيق التصدير أولاً');
                  return;
                }
                if (selectedExportType === 'json' || selectedExportType === 'csv' || selectedExportType === 'pdf' || selectedExportType === 'xlsx') {
                  exportReport(selectedExportType);
                } else if (selectedExportType === 'tech-summary' || selectedExportType === 'tech-detail') {
                  exportTechnicianReport(selectedExportType.replace('tech-', ''));
                } else if (selectedExportType === 'tech-summary-xlsx') {
                  try {
                    exportTechnicianSummaryExcel();
                  } catch (err) {
                    alert('حدث خطأ أثناء تصدير تقرير الفني الملخص.');
                    console.error('Excel technician summary export error:', err);
                  }
                } else if (selectedExportType === 'print') {
                  handlePrint();
                }
  // تصدير تقرير فني ملخص إلى Excel
  async function exportTechnicianSummaryExcel() {
    type Device = { id: string|number, entry_date?: string, entryDate?: string };
    type Technician = { id: string|number, name: string };
    const technician: Technician | undefined = (technicians as any[]).find((t: any) => String(t.id) === String(selectedTechnician));
    if (!technician) return alert('لم يتم العثور على بيانات الفني');
    const techActions = (actions as any[]).filter((action: any) => {
      const techId = action?.technician_id ?? null;
      if (techId === null || String(techId) !== String(selectedTechnician)) return false;
      const device: Device | undefined = (devices as any[]).find((d: any) => d?.id === action.device_id);
      if (!device) return false;
      const rawDate = (device.entry_date || device.entryDate) as string | undefined;
      if (!rawDate) return false;
      const actionDate = new Date(rawDate);
      if (isNaN(actionDate.getTime())) return false;
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      return actionDate >= startDate && actionDate <= endDate;
    });
    const techDeviceIds = new Set(techActions.map((a: any) => a?.device_id).filter((id: any) => id));
    const techDevices = (devices as any[]).filter((d: any) => techDeviceIds.has(d?.id));
    const totalDevices = techDevices.length;
    const totalPartsCost = techActions.reduce((sum: number, a: any) => sum + (Number(a?.parts_cost) || 0), 0);
    const totalCost = techActions.reduce((sum: number, a: any) => sum + (Number(a?.cost) || 0), 0);
    const netProfit = techActions.reduce((sum: number, a: any) => sum + ((Number(a?.cost) || 0) - (Number(a?.parts_cost) || 0)), 0);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('تقرير فني ملخص', {
      properties: { tabColor: { argb: 'FF1E3A8A' } },
      pageSetup: { orientation: 'portrait', fitToPage: true }
    });
    sheet.columns = [
      { header: '', key: 'col1', width: 22 },
      { header: '', key: 'col2', width: 22 },
      { header: '', key: 'col3', width: 22 },
      { header: '', key: 'col4', width: 22 },
    ];
    const headerColor = '1E3A8A';
    const white = 'FFFFFF';

    // عنوان التقرير
    const titleRow = sheet.addRow([`تقرير فني (ملخص)`]);
    const titleCell = titleRow.getCell(1);
    titleCell.value = `تقرير فني (ملخص)`;
    titleCell.font = { bold: true, size: 15, color: { argb: headerColor } };
    titleCell.alignment = { horizontal: 'right', vertical: 'middle', readingOrder: 'rtl' };
    sheet.mergeCells(`A${titleRow.number}:D${titleRow.number}`);

    // اسم الفني والفترة
    const techRow = sheet.addRow([`الفني: ${technician.name}`]);
    const techCell = techRow.getCell(1);
    techCell.value = `الفني: ${technician.name}`;
    techCell.font = { bold: true, size: 13, color: { argb: headerColor } };
    techCell.alignment = { horizontal: 'right', vertical: 'middle', readingOrder: 'rtl' };
    sheet.mergeCells(`A${techRow.number}:D${techRow.number}`);
    const periodRow = sheet.addRow([`الفترة: ${dateRange.startDate} إلى ${dateRange.endDate}`]);
    const periodCell = periodRow.getCell(1);
    periodCell.value = `الفترة: ${dateRange.startDate} إلى ${dateRange.endDate}`;
    periodCell.font = { bold: true, size: 13, color: { argb: headerColor } };
    periodCell.alignment = { horizontal: 'right', vertical: 'middle', readingOrder: 'rtl' };
    sheet.mergeCells(`A${periodRow.number}:D${periodRow.number}`);
    sheet.addRow([]);

    // رأس الجدول
    const headerRow = sheet.addRow(['عدد الأجهزة', 'كلفة القطع', 'التكلفة الكلية', 'الأرباح الصافية']);
    for (let i = 1; i <= 4; i++) {
      const cell = headerRow.getCell(i);
      cell.font = { bold: true, size: 12, color: { argb: white } };
      cell.fill = { type: 'gradient', gradient: 'angle', degree: 0, stops: [ { position: 0, color: { argb: headerColor } }, { position: 1, color: { argb: 'FF2563EB' } } ] };
      cell.alignment = { horizontal: 'center', vertical: 'middle', readingOrder: 'rtl' };
      cell.border = {
        top: { style: 'thin', color: { argb: headerColor } },
        left: { style: 'thin', color: { argb: headerColor } },
        bottom: { style: 'thin', color: { argb: headerColor } },
        right: { style: 'thin', color: { argb: headerColor } },
      };
    }

    // بيانات الملخص
    const dataRow = sheet.addRow([
      totalDevices,
      `${totalPartsCost} ر.س`,
      `${totalCost} ر.س`,
      `${netProfit} ر.س`
    ]);
    for (let i = 1; i <= 4; i++) {
      const cell = dataRow.getCell(i);
      cell.font = { size: 12 };
      cell.alignment = { horizontal: 'center', vertical: 'middle', readingOrder: 'rtl' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DBEAFE' } };
      cell.border = {
        top: { style: 'thin', color: { argb: headerColor } },
        left: { style: 'thin', color: { argb: headerColor } },
        bottom: { style: 'thin', color: { argb: headerColor } },
        right: { style: 'thin', color: { argb: headerColor } },
      };
    }

    // ضبط اتجاه الورقة RTL
    sheet.views = [{ rightToLeft: true }];

    // حفظ الملف
    try {
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `technician-summary-${technician.name}-${dateRange.startDate}-to-${dateRange.endDate}.xlsx`);
    } catch (err) {
      alert('حدث خطأ أثناء حفظ ملف الإكسل.');
      console.error('ExcelJS writeBuffer error:', err);
    }
                }
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              aria-label="تصدير أو طباعة التقرير"
            >
              <Printer size={16} />
              طباعة / تصدير التقرير
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6 w-full">
        {/* إجمالي الأجهزة المسلمة */}
        <div className="bg-white rounded-lg shadow-md p-6 w-full flex flex-col justify-between h-full">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <BarChart3 size={24} className="text-blue-600" />
            </div>
            <span className="text-sm font-semibold text-gray-600">إجمالي الأجهزة المسلمة</span>
            </div>
          <div className="flex-1 flex items-end">
            <span className="text-2xl font-bold text-gray-900 w-full text-center">{deliveredDevices.toString()}</span>
          </div>
        </div>
        {/* معدل الإنجاز */}
        <div className="bg-white rounded-lg shadow-md p-6 w-full flex flex-col justify-between h-full">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle size={24} className="text-green-600" />
            </div>
            <span className="text-sm font-semibold text-gray-600">معدل الإنجاز</span>
            </div>
          <div className="flex-1 flex items-end">
            <span className="text-2xl font-bold text-gray-900 w-full text-center">{Number(completionRate.toFixed(1)).toString()}%</span>
          </div>
        </div>
        {/* متوسط تكلفة الإصلاح */}
        <div className="bg-white rounded-lg shadow-md p-6 w-full flex flex-col justify-between h-full">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-3 bg-purple-100 rounded-full">
              <TrendingUp size={24} className="text-purple-600" />
            </div>
            <span className="text-sm font-semibold text-gray-600">متوسط تكلفة الإصلاح</span>
            </div>
          <div className="flex-1 flex items-end">
            <span className="text-2xl font-bold text-gray-900 w-full text-center">{Math.round(averageRepairCost).toString()}</span>
          </div>
        </div>
        {/* تكلفة قطع الغيار */}
        <div className="bg-white rounded-lg shadow-md p-6 w-full flex flex-col justify-between h-full">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-3 bg-yellow-100 rounded-full">
              <DollarSign size={24} className="text-yellow-600" />
            </div>
            <span className="text-sm font-semibold text-gray-600">تكلفة قطع الغيار</span>
            </div>
          <div className="flex-1 flex items-end">
            <span className="text-2xl font-bold text-gray-900 w-full text-center">{Number(partsCost.toFixed(2)).toString()}</span>
          </div>
        </div>
        {/* إجمالي الإيرادات */}
        <div className="bg-white rounded-lg shadow-md p-6 w-full flex flex-col justify-between h-full">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign size={24} className="text-green-600" />
            </div>
            <span className="text-sm font-semibold text-gray-600">إجمالي الإيرادات</span>
            </div>
          <div className="flex-1 flex items-end">
            <span className="text-2xl font-bold text-gray-900 w-full text-center">{Number(totalRevenue.toFixed(2)).toString()}</span>
          </div>
        </div>
        {/* صافي الربح */}
        <div className="bg-white rounded-lg shadow-md p-6 w-full flex flex-col justify-between h-full">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <TrendingUp size={24} className="text-blue-600" />
            </div>
            <span className="text-sm font-semibold text-gray-600">صافي الربح</span>
            </div>
          <div className="flex-1 flex items-end">
            <span className="text-2xl font-bold text-gray-900 w-full text-center">{Number(netProfit.toFixed(2)).toString()}</span>
          </div>
        </div>
      </div>

      {/* Status Breakdown + إجمالي الأجهزة (كل الأجهزة الداخلة) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mt-6">
        {/* إجمالي الأجهزة (كل الأجهزة الداخلة) */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-full">
              <BarChart3 size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">إجمالي الأجهزة</p>
              <p className="text-xl font-bold text-gray-900">{totalDevices}</p>
            </div>
          </div>
        </div>
        {/* قيد الانتظار */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 rounded-full">
              <Clock size={24} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">قيد الانتظار</p>
              <p className="text-xl font-bold text-gray-900">{pendingDevices}</p>
            </div>
          </div>
        </div>
        {/* قيد الإصلاح */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-full">
              <Filter size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">قيد الإصلاح</p>
              <p className="text-xl font-bold text-gray-900">{inProgressDevices}</p>
            </div>
          </div>
        </div>
        {/* مكتمل */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle size={24} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">مكتمل</p>
              <p className="text-xl font-bold text-gray-900">{completedDevices}</p>
            </div>
          </div>
        </div>
        {/* لا يصلح */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-full">
              <Clock size={24} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">لا يصلح</p>
              <p className="text-xl font-bold text-gray-900">{cannotRepairDevices}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">أنواع الأجهزة</h3>
          <BarChart width={500} height={300} data={deviceTypeChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#3b82f6" />
          </BarChart>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">أنواع الأعطال</h3>
          <BarChart width={500} height={300} data={issueTypeChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#22c55e" />
          </BarChart>
        </div>
      </div>

      {technicianStats.length > 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users size={20} />
            أداء الفنيين
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    اسم الفني
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    إجمالي الأجهزة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    مكتملة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    معدل الإنجاز
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {technicianStats.map((stat, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {stat.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {stat.total}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {stat.completed}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${stat.rate}%` }}
                          />
                        </div>
                        <span>{stat.rate.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : selectedTechnician !== 'all' ? (
        <div className="bg-yellow-100 text-yellow-800 p-4 rounded-lg">
          لا توجد بيانات متاحة لهذا الفني في النطاق الزمني المحدد.
        </div>
      ) : null}

      {/* Printable Report */}
      <div
        ref={componentRef}
        className="hidden print:block p-6"
        style={{ fontFamily: 'Amiri, sans-serif', direction: 'rtl', background: '#fff', borderRadius: 16, boxShadow: '0 2px 8px #0001', border: '1px solid #eee', margin: 0 }}
        dir="rtl"
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <img src={window.reportLogoUrl || DEFAULT_LOGO_URL} alt="شعار" style={{ maxWidth: 120, maxHeight: 120, margin: '0 auto', borderRadius: 16, boxShadow: '0 2px 8px #0001' }} />
        </div>
        <h1 className="text-2xl font-bold" style={{ textAlign: 'right', borderBottom: '1px solid #eee', paddingBottom: 8, marginBottom: 16 }}>تقرير إصلاح الأجهزة</h1>
        <p style={{ textAlign: 'right', color: '#555', marginBottom: 8 }}>الفترة: {dateRange.startDate} إلى {dateRange.endDate}</p>
        
        {selectedTechnician !== 'all' && (selectedExportType === 'tech-summary' || selectedExportType === 'tech-detail') ? (
          <>
            <h2 className="text-lg font-semibold mt-4" style={{ textAlign: 'right', color: '#2b6cb0', marginTop: 16, marginBottom: 8 }}>
              تقرير فني ({selectedExportType === 'tech-summary' ? 'ملخص' : 'تفصيلي'})
            </h2>
            <p style={{ textAlign: 'left', color: '#555', marginBottom: 8 }}>
              الفني: {technicians.find(t => String(t.id) === String(selectedTechnician))?.name || 'غير محدد'}
            </p>
            
            <table className="w-full border-collapse" dir="rtl" style={{ direction: 'rtl', textAlign: 'right', marginBottom: 16, background: '#fafbfc' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th className="border p-2">عدد الأجهزة</th>
                  <th className="border p-2">كلفة القطع</th>
                  <th className="border p-2">التكلفة الكلية</th>
                  <th className="border p-2">الأرباح الصافية</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border p-2">{technicianStats.find(t => String(t.id) === String(selectedTechnician))?.total || 0}</td>
                  <td className="border p-2">{partsCost.toFixed(2)} ر.س</td>
                  <td className="border p-2">{totalRevenue.toFixed(2)} ر.س</td>
                  <td className="border p-2">{netProfit.toFixed(2)} ر.س</td>
                </tr>
              </tbody>
            </table>

            {selectedExportType === 'tech-detail' && (
              <>
                <h3 className="text-base font-semibold mt-2 mb-2" style={{ textAlign: 'right', color: '#2b6cb0' }}>تفاصيل العمليات</h3>
                <table className="w-full border-collapse" dir="rtl" style={{ direction: 'rtl', textAlign: 'right', marginBottom: 16, background: '#fafbfc' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th className="border p-2">الجهاز</th>
                      <th className="border p-2">الإجراء</th>
                      <th className="border p-2">كلفة القطع</th>
                      <th className="border p-2">التكلفة الكلية</th>
                      <th className="border p-2">الربح الصافي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredActions
                      .filter(a => String(a.technician_id) === String(selectedTechnician))
                      .map((action, idx) => {
                        const device = devices.find(d => d.id === action.device_id);
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                            <td className="border p-2">{device?.device_type || 'غير محدد'}</td>
                            <td className="border p-2">{action.action_type || 'غير محدد'}</td>
                            <td className="border p-2">{Number(action.parts_cost || 0).toFixed(2)} ر.س</td>
                            <td className="border p-2">{Number(action.cost || 0).toFixed(2)} ر.س</td>
                            <td className="border p-2">{(Number(action.cost || 0) - Number(action.parts_cost || 0)).toFixed(2)} ر.س</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </>
            )}
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold mt-4" style={{ textAlign: 'right', color: '#2b6cb0', marginTop: 16, marginBottom: 8 }}>الملخص</h2>
            <table className="w-full border-collapse" dir="rtl" style={{ direction: 'rtl', textAlign: 'right', marginBottom: 16, background: '#fafbfc' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #eee' }}><td className="border p-2">إجمالي الأجهزة</td><td className="border p-2">{totalDevices}</td></tr>
                <tr style={{ borderBottom: '1px solid #eee' }}><td className="border p-2">الأجهزة المكتملة</td><td className="border p-2">{completedDevices}</td></tr>
                <tr style={{ borderBottom: '1px solid #eee' }}><td className="border p-2">الأجهزة قيد الإصلاح</td><td className="border p-2">{inProgressDevices}</td></tr>
                <tr style={{ borderBottom: '1px solid #eee' }}><td className="border p-2">الأجهزة قيد الانتظار</td><td className="border p-2">{pendingDevices}</td></tr>
                <tr style={{ borderBottom: '1px solid #eee' }}><td className="border p-2">الأجهزة غير القابلة للإصلاح</td><td className="border p-2">{cannotRepairDevices}</td></tr>
                <tr style={{ borderBottom: '1px solid #eee' }}><td className="border p-2">إجمالي الإيرادات</td><td className="border p-2">{totalRevenue.toFixed(2)} ر.س</td></tr>
                <tr style={{ borderBottom: '1px solid #eee' }}><td className="border p-2">متوسط تكلفة الإصلاح</td><td className="border p-2">{Number(averageRepairCost.toFixed(2)).toString().replace(/,/g, '')} ر.س</td></tr>
                <tr><td className="border p-2">معدل الإنجاز</td><td className="border p-2">{completionRate.toFixed(1)}%</td></tr>
              </tbody>
            </table>

            <h2 className="text-lg font-semibold mt-4" style={{ textAlign: 'right', color: '#2b6cb0', marginTop: 16, marginBottom: 8 }}>أنواع الأجهزة</h2>
            <table className="w-full border-collapse" dir="rtl" style={{ direction: 'rtl', textAlign: 'right', marginBottom: 16 }}>
              <thead><tr style={{ background: '#f1f5f9' }}><th className="border p-2">العدد</th><th className="border p-2">النوع</th></tr></thead>
              <tbody>
                {Object.entries(deviceTypesStats).map(([type, count]) => (
                  <tr key={String(type)} style={{ borderBottom: '1px solid #eee' }}><td className="border p-2">{String(count)}</td><td className="border p-2">{String(type)}</td></tr>
                ))}
              </tbody>
            </table>

            <h2 className="text-lg font-semibold mt-4" style={{ textAlign: 'right', color: '#2b6cb0', marginTop: 16, marginBottom: 8 }}>أنواع الأعطال</h2>
            <table className="w-full border-collapse" dir="rtl" style={{ direction: 'rtl', textAlign: 'right', marginBottom: 16 }}>
              <thead><tr style={{ background: '#f1f5f9' }}><th className="border p-2">العدد</th><th className="border p-2">النوع</th></tr></thead>
              <tbody>
                {Object.entries(issueTypesStats).map(([type, count]) => (
                  <tr key={String(type)} style={{ borderBottom: '1px solid #eee' }}><td className="border p-2">{String(count)}</td><td className="border p-2">{type === 'hardware' ? 'هاردوير' : type === 'software' ? 'سوفتوير' : String(type)}</td></tr>
                ))}
              </tbody>
            </table>

            {technicianStats.length > 0 && (
              <>
                <h2 className="text-lg font-semibold mt-4" style={{ textAlign: 'right', color: '#2b6cb0', marginTop: 16, marginBottom: 8 }}>أداء الفنيين</h2>
                <table className="w-full border-collapse" dir="rtl" style={{ direction: 'rtl', textAlign: 'right', marginBottom: 16 }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th className="border p-2">اسم الفني</th>
                      <th className="border p-2">إجمالي الأجهزة</th>
                      <th className="border p-2">مكتملة</th>
                      <th className="border p-2">معدل الإنجاز</th>
                    </tr>
                  </thead>
                  <tbody>
                    {technicianStats.map((stat, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                        <td className="border p-2">{stat.name}</td>
                        <td className="border p-2">{stat.total}</td>
                        <td className="border p-2">{stat.completed}</td>
                        <td className="border p-2">{stat.rate.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default () => (
  <ErrorBoundary>
    <Reports />
  </ErrorBoundary>
);