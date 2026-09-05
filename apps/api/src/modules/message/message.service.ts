import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateConversationDto, CreateMessageDto } from './message.dto';

@Injectable()
export class MessageService {
  constructor(private prisma: PrismaService) {}

  async getConversations(userId: string) {
    return this.prisma.conversation.findMany({
      where: {
        OR: [
          { buyerId: userId },
          { sellerId: userId },
        ],
      },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            priceAmount: true,
            city: true,
          },
        },
        buyer: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
            displayNamePreference: true,
          },
        },
        seller: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
            displayNamePreference: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  async getConversationDetail(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            priceAmount: true,
            city: true,
            status: true,
          },
        },
        buyer: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
            displayNamePreference: true,
          },
        },
        seller: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
            displayNamePreference: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Sohbet bulunamadı.');
    }

    if (conversation.buyerId !== userId && conversation.sellerId !== userId) {
      throw new ForbiddenException('Bu sohbete erişim yetkiniz bulunmamaktadır.');
    }

    // Mark messages as read (where sender is NOT the current user)
    const unreadMessages = conversation.messages.filter(
      (m) => m.senderId !== userId && !m.readAt,
    );
    if (unreadMessages.length > 0) {
      await this.prisma.message.updateMany({
        where: {
          id: { in: unreadMessages.map((m) => m.id) },
        },
        data: {
          readAt: new Date(),
        },
      });
      // Update local object array for current response
      unreadMessages.forEach((m) => {
        m.readAt = new Date();
      });
    }

    return conversation;
  }

  async createConversation(buyerId: string, dto: CreateConversationDto) {
    const listing = await this.prisma.vehicleListing.findUnique({
      where: { id: dto.listingId },
    });

    if (!listing) {
      throw new NotFoundException('İlan bulunamadı.');
    }

    const sellerId = listing.sellerId;
    if (buyerId === sellerId) {
      throw new BadRequestException('Kendi ilanınız için mesajlaşma başlatamazsınız.');
    }

    // Check if conversation already exists
    let conversation = await this.prisma.conversation.findUnique({
      where: {
        listingId_buyerId_sellerId: {
          listingId: dto.listingId,
          buyerId,
          sellerId,
        },
      },
    });

    if (conversation) {
      if (dto.firstMessage && dto.firstMessage.trim()) {
        const sanitizedBody = this.sanitizeHtml(dto.firstMessage);
        await this.prisma.message.create({
          data: {
            conversationId: conversation.id,
            senderId: buyerId,
            body: sanitizedBody,
          },
        });

        await this.prisma.conversation.update({
          where: { id: conversation.id },
          data: { lastMessageAt: new Date() },
        });
      }
    } else {
      const hasFirstMessage = !!(dto.firstMessage && dto.firstMessage.trim());
      conversation = await this.prisma.conversation.create({
        data: {
          listingId: dto.listingId,
          buyerId,
          sellerId,
          lastMessageAt: new Date(),
          ...(hasFirstMessage
            ? {
                messages: {
                  create: {
                    senderId: buyerId,
                    body: this.sanitizeHtml(dto.firstMessage!),
                  },
                },
              }
            : {}),
        },
      });
    }

    return this.getConversationDetail(buyerId, conversation.id);
  }

  async createMessage(senderId: string, conversationId: string, dto: CreateMessageDto) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Sohbet bulunamadı.');
    }

    if (conversation.buyerId !== senderId && conversation.sellerId !== senderId) {
      throw new ForbiddenException('Bu sohbete mesaj gönderme yetkiniz bulunmamaktadır.');
    }

    const sanitizedBody = this.sanitizeHtml(dto.body);

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        body: sanitizedBody,
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    return message;
  }

  async getUnreadCount(userId: string) {
    const unreadCount = await this.prisma.message.count({
      where: {
        senderId: { not: userId },
        readAt: null,
        conversation: {
          OR: [
            { buyerId: userId },
            { sellerId: userId },
          ],
        },
      },
    });
    return { unreadCount };
  }

  private sanitizeHtml(text: string): string {
    if (!text) return '';
    // Strip tags and escape < and > to prevent XSS
    return text
      .replace(/<[^>]*>/g, '') // remove HTML tags
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .trim();
  }
}
