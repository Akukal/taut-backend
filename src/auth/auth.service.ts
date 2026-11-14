import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
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
    const exists = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });
    if (exists) throw new ConflictException('Email or username is already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: { username: dto.username, email: dto.email, passwordHash },
      select: { id: true, username: true, email: true, avatarUrl: true, statusText: true, createdAt: true },
    });
    return { user, ...(await this.tokenFor(user)) };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    await this.prisma.user.update({ where: { id: user.id }, data: { lastSeen: new Date() } });
    const safeUser = { id: user.id, username: user.username, email: user.email };
    return { user: safeUser, ...(await this.tokenFor(safeUser)) };
  }
}
