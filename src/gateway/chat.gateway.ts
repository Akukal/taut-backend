import {
  ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect,
  SubscribeMessage, WebSocketGateway, WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MessagesService } from '../messages/messages.service';
import { ReceiptsService } from '../receipts/receipts.service';
import { SendMessageDto } from '../messages/dto/send-message.dto';

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: process.env.CLIENT_ORIGIN?.split(',') ?? true, credentials: true },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private jwt: JwtService,
    private config: ConfigService,
    private prisma: PrismaService,
    private messages: MessagesService,
    private receipts: ReceiptsService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token
        ?? client.handshake.headers.authorization?.replace(/^Bearer\s+/i, '');
      if (!token) throw new Error('Missing token');
      const payload = await this.jwt.verifyAsync(token, { secret: this.config.get('JWT_SECRET') });
      client.data.user = { id: payload.sub, username: payload.username };
      const memberships = await this.prisma.conversationParticipant.findMany({
        where: { userId: payload.sub }, select: { conversationId: true },
      });
      memberships.forEach(item => client.join(`conversation:${item.conversationId}`));
      await this.prisma.user.update({ where: { id: payload.sub }, data: { lastSeen: new Date() } });
      client.emit('connected', { userId: payload.sub });
    } catch {
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.user?.id;
    if (userId) await this.prisma.user.updateMany({ where: { id: userId }, data: { lastSeen: new Date() } });
  }

  @SubscribeMessage('message:send')
  async sendMessage(@ConnectedSocket() client: Socket, @MessageBody() body: {
    conversationId: string; message: SendMessageDto;
  }) {
    const message = await this.messages.send(body.conversationId, client.data.user.id, body.message);
    this.server.to(`conversation:${body.conversationId}`).emit('message:new', message);
    return { ok: true, message };
  }

  @SubscribeMessage('message:read')
  async markRead(@ConnectedSocket() client: Socket, @MessageBody() body: {
    conversationId: string; lastMessageId: string;
  }) {
    const result = await this.receipts.markRead(body.conversationId, client.data.user.id, body.lastMessageId);
    this.server.to(`conversation:${body.conversationId}`).emit('message:read', result);
    return { ok: true, result };
  }

  @SubscribeMessage('conversation:join')
  async joinConversation(@ConnectedSocket() client: Socket, @MessageBody() body: { conversationId: string }) {
    const membership = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: body.conversationId, userId: client.data.user.id } },
    });
    if (!membership) return { ok: false, error: 'Forbidden' };
    await client.join(`conversation:${body.conversationId}`);
    return { ok: true };
  }

  emitToConversation(conversationId: string, event: string, payload: unknown) {
    this.server.to(`conversation:${conversationId}`).emit(event, payload);
  }
}
