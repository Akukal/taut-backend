import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  private async tokenFor(user: { id: string; email: string; username: string }) {
    return {
      accessToken: await this.jwt.signAsync({
        sub: user.id, email: user.email, username: user.username,
      }),
      tokenType: 'Bearer',
    };
  }

  async register(dto: RegisterDto) {
    const userModel = (this.prisma as any).user;
    const exists = await userModel.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });
    if (exists) throw new ConflictException('Email or username is already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await userModel.create({
      data: { username: dto.username, email: dto.email, passwordHash },
      select: { id: true, username: true, email: true, avatarUrl: true, statusText: true, createdAt: true },
    });
    return { user, ...(await this.tokenFor(user)) };
  }

  async login(dto: LoginDto) {
    const userModel = (this.prisma as any).user;
    const user = await userModel.findUnique({ where: { email: dto.email } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    await userModel.update({ where: { id: user.id }, data: { lastSeen: new Date() } });
    const safeUser = { id: user.id, username: user.username, email: user.email };
    return { user: safeUser, ...(await this.tokenFor(safeUser)) };
  }
}
