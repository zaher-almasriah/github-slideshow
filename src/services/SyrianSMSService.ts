import { syrianConfig, syrianHelpers } from '../config/syrianConfig';

// واجهة لرسالة SMS
interface SMSMessage {
  to: string;
  message: string;
  customerName?: string;
  receiptNumber?: string;
  cost?: number;
  balance?: number;
}

// واجهة لاستجابة SMS
interface SMSResponse {
  success: boolean;
  messageId?: string;
  cost?: number;
  provider?: string;
  error?: string;
}

// واجهة لرصيد SMS
interface SMSBalance {
  provider: string;
  balance: number;
  currency: string;
}

class SyrianSMSService {
  private providers = syrianConfig.sms.providers;

  // إرسال SMS
  async sendSMS(smsData: SMSMessage): Promise<SMSResponse> {
    try {
      // تحديد شركة الاتصال من رقم الهاتف
      const provider = syrianHelpers.getMobileProvider(smsData.to);
      
      if (provider === 'unknown') {
        throw new Error('رقم الهاتف غير صحيح أو غير مدعوم');
      }

      const providerConfig = this.providers[provider as keyof typeof this.providers];
      
      if (!providerConfig) {
        throw new Error(`مزود SMS غير متاح: ${provider}`);
      }

      // إرسال SMS عبر المزود المحدد
      const response = await this.sendViaProvider(provider, smsData, providerConfig);
      
      return {
        success: true,
        messageId: response.messageId,
        cost: providerConfig.cost,
        provider: provider
      };

    } catch (error) {
      console.error('خطأ في إرسال SMS:', error);
      
      // محاولة إرسال عبر مزود بديل
      return await this.sendViaAlternativeProvider(smsData);
    }
  }

  // إرسال SMS عبر مزود محدد
  private async sendViaProvider(
    provider: string, 
    smsData: SMSMessage, 
    providerConfig: any
  ): Promise<any> {
    const url = providerConfig.apiUrl;
    const apiKey = providerConfig.apiKey;

    if (!apiKey) {
      throw new Error(`مفتاح API غير متوفر لـ ${provider}`);
    }

    const response = await fetch(`${url}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-Provider': provider
      },
      body: JSON.stringify({
        to: this.formatPhoneNumber(smsData.to),
        message: smsData.message,
        sender: syrianConfig.company.name,
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`خطأ في إرسال SMS: ${response.statusText}`);
    }

    return await response.json();
  }

  // إرسال عبر مزود بديل
  private async sendViaAlternativeProvider(smsData: SMSMessage): Promise<SMSResponse> {
    const alternativeProvider = this.getAlternativeProvider();
    
    if (!alternativeProvider) {
          // إذا لم يتوفر أي مزود، إرجاع خطأ
    return await this.sendAlternativeNotification(smsData);
    }

    try {
      const providerConfig = this.providers[alternativeProvider as keyof typeof this.providers];
      const response = await this.sendViaProvider(alternativeProvider, smsData, providerConfig);
      
      return {
        success: true,
        messageId: response.messageId,
        cost: providerConfig.cost,
        provider: alternativeProvider
      };
    } catch (error) {
      console.error('خطأ في المزود البديل:', error);
      return await this.sendAlternativeNotification(smsData);
    }
  }

  // الحصول على مزود بديل
  private getAlternativeProvider(): string | null {
    const currentProvider = syrianConfig.sms.defaultProvider;
    const providers = Object.keys(this.providers);
    
    return providers.find(p => p !== currentProvider) || null;
  }

  // إرسال إشعار بديل
  private async sendAlternativeNotification(smsData: SMSMessage): Promise<SMSResponse> {
    console.log('فشل في إرسال SMS');
    
    return {
      success: false,
      error: 'فشل في إرسال SMS، يرجى التواصل مع العميل مباشرة',
      provider: 'alternative'
    };
  }

  // تنسيق رقم الهاتف
  private formatPhoneNumber(phoneNumber: string): string {
    // إزالة المسافات والرموز
    let formatted = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    // إضافة رمز البلد إذا لم يكن موجود
    if (!formatted.startsWith('+963')) {
      if (formatted.startsWith('0')) {
        formatted = '+963' + formatted.substring(1);
      } else if (formatted.startsWith('93') || formatted.startsWith('94')) {
        formatted = '+963' + formatted;
      } else {
        formatted = '+963' + formatted;
      }
    }
    
    return formatted;
  }

  // إرسال SMS جاهز للاستلام
  async sendDeviceReadySMS(customerPhone: string, customerName: string, receiptNumber: string, cost: number): Promise<SMSResponse> {
    const template = syrianConfig.notifications.sms.templates.deviceReady;
    const message = template
      .replace('{customerName}', customerName)
      .replace('{receiptNumber}', receiptNumber)
      .replace('{cost}', syrianHelpers.formatCurrency(cost));

    return await this.sendSMS({
      to: customerPhone,
      message: message,
      customerName,
      receiptNumber,
      cost
    });
  }

  // إرسال SMS قيد الإصلاح
  async sendDeviceInProgressSMS(customerPhone: string, customerName: string, receiptNumber: string): Promise<SMSResponse> {
    const template = syrianConfig.notifications.sms.templates.deviceInProgress;
    const message = template
      .replace('{customerName}', customerName)
      .replace('{receiptNumber}', receiptNumber);

    return await this.sendSMS({
      to: customerPhone,
      message: message,
      customerName,
      receiptNumber
    });
  }

  // إرسال تذكير بالدفع
  async sendPaymentReminderSMS(customerPhone: string, customerName: string, balance: number): Promise<SMSResponse> {
    const template = syrianConfig.notifications.sms.templates.paymentReminder;
    const message = template
      .replace('{customerName}', customerName)
      .replace('{balance}', syrianHelpers.formatCurrency(balance));

    return await this.sendSMS({
      to: customerPhone,
      message: message,
      customerName,
      balance
    });
  }

  // فحص رصيد SMS
  async checkBalance(provider?: string): Promise<SMSBalance[]> {
    const balances: SMSBalance[] = [];
    
    if (provider) {
      const providerConfig = this.providers[provider as keyof typeof this.providers];
      if (providerConfig) {
        const balance = await this.getProviderBalance(provider, providerConfig);
        balances.push(balance);
      }
    } else {
      // فحص رصيد جميع المزودين
      for (const [providerName, providerConfig] of Object.entries(this.providers)) {
        try {
          const balance = await this.getProviderBalance(providerName, providerConfig);
          balances.push(balance);
        } catch (error) {
          console.error(`خطأ في فحص رصيد ${providerName}:`, error);
        }
      }
    }
    
    return balances;
  }

  // فحص رصيد مزود محدد
  private async getProviderBalance(provider: string, providerConfig: any): Promise<SMSBalance> {
    const url = providerConfig.apiUrl;
    const apiKey = providerConfig.apiKey;

    if (!apiKey) {
      throw new Error(`مفتاح API غير متوفر لـ ${provider}`);
    }

    const response = await fetch(`${url}/balance`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-Provider': provider
      }
    });

    if (!response.ok) {
      throw new Error(`خطأ في فحص الرصيد: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      provider: provider,
      balance: data.balance || 0,
      currency: 'SYP'
    };
  }

  // إرسال SMS مخصص
  async sendCustomSMS(phoneNumber: string, message: string): Promise<SMSResponse> {
    return await this.sendSMS({
      to: phoneNumber,
      message: message
    });
  }

  // إرسال SMS جماعي
  async sendBulkSMS(phoneNumbers: string[], message: string): Promise<SMSResponse[]> {
    const results: SMSResponse[] = [];
    
    for (const phoneNumber of phoneNumbers) {
      try {
        const result = await this.sendSMS({
          to: phoneNumber,
          message: message
        });
        results.push(result);
        
        // تأخير بين الرسائل لتجنب الحظر
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        results.push({
          success: false,
          error: `خطأ في إرسال SMS إلى ${phoneNumber}: ${error}`,
          provider: 'unknown'
        });
      }
    }
    
    return results;
  }

  // التحقق من حالة رسالة SMS
  async checkMessageStatus(messageId: string, provider?: string): Promise<any> {
    const targetProvider = provider || syrianConfig.sms.defaultProvider;
    const providerConfig = this.providers[targetProvider as keyof typeof this.providers];
    
    if (!providerConfig) {
      throw new Error(`مزود SMS غير متاح: ${targetProvider}`);
    }

    const url = providerConfig.apiUrl;
    const apiKey = providerConfig.apiKey;

    const response = await fetch(`${url}/status/${messageId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-Provider': targetProvider
      }
    });

    if (!response.ok) {
      throw new Error(`خطأ في فحص حالة الرسالة: ${response.statusText}`);
    }

    return await response.json();
  }
}

// إنشاء نسخة واحدة من الخدمة
const syrianSMSService = new SyrianSMSService();

export default syrianSMSService;
export type { SMSMessage, SMSResponse, SMSBalance }; 