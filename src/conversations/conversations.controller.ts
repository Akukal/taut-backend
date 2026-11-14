import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { IsArray, IsUUID, ArrayMinSize } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ConversationsService } from './conversations.service.js';
import { CreateConversationDto } from './dto/create-conversation.dto.js';

class AddParticipantsDto {
  @IsArray() @ArrayMinSize(1) @IsUUID('4', { each: true }) userIds: string[];
}

@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private conversations: ConversationsService) {}
  @Post() create(@Req() req: any, @Body() dto: CreateConversationDto) {
    return this.conversations.create(req.user.id, dto);
  }
  @Get() list(@Req() req: any) { return this.conversations.list(req.user.id); }
  @Get(':id') getOne(@Param('id') id: string, @Req() req: any) {
    return this.conversations.getOne(id, req.user.id);
  }
  @Post(':id/participants') add(@Param('id') id: string, @Req() req: any, @Body() dto: AddParticipantsDto) {
    return this.conversations.addParticipants(id, req.user.id, dto.userIds);
  }
}
