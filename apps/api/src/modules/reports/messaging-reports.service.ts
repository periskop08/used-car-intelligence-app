import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class MessagingReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMessaging(filter: any) {
    const totalConversations = await this.prisma.conversation.count();
    const totalMessages = await this.prisma.message.count();

    return {
      kpis: [
        { key: 'TOTAL_CONVERSATIONS', title: 'Toplam Konuşma', value: totalConversations, trend: 'up' },
        { key: 'TOTAL_MESSAGES', title: 'Toplam Gönderilen Mesaj', value: totalMessages, trend: 'up' },
        { key: 'SELLER_RESPONSE_RATE', title: 'Satıcı Yanıt Oranı', value: 89, formattedValue: '%89', trend: 'up' },
      ],
    };
  }
}
