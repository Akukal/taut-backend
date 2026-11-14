import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateConversationDto } from './dto/create-conversation.dto.js';

const ConversationType = { PRIVATE: 'PRIVATE' } as const;
const ParticipantRole = { ADMIN: 'ADMIN', MEMBER: 'MEMBER' } as const;

@Injectable()
export class ConversationsService {
  constructor(private prisma: PrismaService) {}

  private get db(): any {
    return this.prisma as any;
  }

  async create(userId: string, dto: CreateConversationDto) {
    const participantIds = [...new Set([...dto.participantIds, userId])];
    const isPrivate = (dto.type as string) === ConversationType.PRIVATE;
    if (isPrivate && participantIds.length !== 2) {
      throw new BadRequestException('Private conversations must have exactly two participants');
    }
    const users = await this.db.user.count({ where: { id: { in: participantIds } } });
    if (users !== participantIds.length) {
      throw new BadRequestException('One or more users do not exist');
    }

    if (isPrivate) {
      const existing = await this.db.conversation.findFirst({
        where: {
          type: ConversationType.PRIVATE,
          AND: participantIds.map(id => ({ participants: { some: { userId: id } } })),
        },
        include: { participants: true },
      });
      if (existing && existing.participants.length === 2) return existing;
    }

    return this.db.conversation.create({
      data: {
        type: dto.type, name: dto.name, createdBy: userId,
        participants: {
          create: participantIds.map(id => ({
            userId: id,
            role: id === userId ? ParticipantRole.ADMIN : ParticipantRole.MEMBER,
          })),
        },
      },
      include: { participants: { include: { user: { select: { id: true, username: true, avatarUrl: true } } } } },
    });
  }

  list(userId: string) {
    return this.db.conversation.findMany({
      where: { participants: { some: { userId } } },
      include: {
        participants: { include: { user: { select: { id: true, username: true, avatarUrl: true, lastSeen: true } } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async assertParticipant(conversationId: string, userId: string) {
    const participant = await this.db.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant) throw new ForbiddenException('You are not a participant of this conversation');
    return participant;
  }

  async getOne(conversationId: string, userId: string) {
    await this.assertParticipant(conversationId, userId);
    const conversation = await this.db.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: { include: { user: { select: { id: true, username: true, avatarUrl: true } } } } },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }

  async addParticipants(conversationId: string, actorId: string, userIds: string[]) {
    const actor = await this.assertParticipant(conversationId, actorId);
    if (actor.role !== ParticipantRole.ADMIN) throw new ForbiddenException('Only admins can add participants');
    const uniqueIds = [...new Set(userIds)].filter(id => id !== actorId);
    return this.db.conversationParticipant.createMany({
      data: uniqueIds.map(userId => ({ conversationId, userId })),
      skipDuplicates: true,
    });
  }
}
