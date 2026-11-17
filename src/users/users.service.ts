import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async profile(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, email: true, avatarUrl: true, statusText: true, lastSeen: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  search(q: string, currentUserId: string) {
    return this.prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        OR: [{ username: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }],
      },
      select: { id: true, username: true, avatarUrl: true, statusText: true, lastSeen: true },
      take: 20,
    });
  }

  async updateProfile(id: string, data: { avatarUrl?: string; statusText?: string }) {
    return this.prisma.user.update({
      where: { id }, data,
      select: { id: true, username: true, email: true, avatarUrl: true, statusText: true },
    });
  }
}
