import { ForbiddenException, Injectable } from '@nestjs/common';
import { ReceiptStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReceiptsService {
  constructor(private prisma: PrismaService) {}

  async markDelivered(messageId: string, userId: string) {
    const receipt = await this.prisma.messageReceipt.findUnique({
      where: { messageId_userId: { messageId, userId } },
    });
    if (!receipt) throw new ForbiddenException('Receipt not found for this user');
    return this.prisma.messageReceipt.update({
      where: { messageId_userId: { messageId, userId } },
      data: { status: ReceiptStatus.DELIVERED },
    });
  }

  async markRead(conversationId: string, userId: string, lastMessageId: string) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant) throw new ForbiddenException('Not a conversation participant');

    const target = await this.prisma.message.findFirst({
      where: { id: lastMessageId, conversationId },
    });
    if (!target) throw new ForbiddenException('Message is not in this conversation');

    await this.prisma.$transaction([
      this.prisma.messageReceipt.updateMany({
        where: { userId, status: { not: ReceiptStatus.READ }, message: { conversationId, createdAt: { lte: target.createdAt } } },
        data: { status: ReceiptStatus.READ },
      }),
      this.prisma.conversationParticipant.update({
        where: { conversationId_userId: { conversationId, userId } },
        data: { lastReadMessageId: lastMessageId },
      }),
    ]);
    return { conversationId, userId, lastReadMessageId, status: ReceiptStatus.READ };
  }
}
