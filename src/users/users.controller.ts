import { Controller, Get, Patch, Query, Req, UseGuards, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, IsUrl } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';

class UpdateProfileDto {
  @IsOptional() @IsUrl() avatarUrl?: string;
  @IsOptional() @IsString() @MaxLength(120) statusText?: string;
}

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}
  @Get('me') me(@Req() req: any) { return this.users.profile(req.user.id); }
  @Get('search') search(@Query('q') q = '', @Req() req: any) { return this.users.search(q, req.user.id); }
  @Patch('me') update(@Req() req: any, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(req.user.id, dto);
  }
}
