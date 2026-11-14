import { ArrayMinSize, IsArray, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ConversationType } from '@prisma/client';

export class CreateConversationDto {
  @IsEnum(ConversationType) type: ConversationType;
  @IsOptional() @IsString() @MaxLength(80) name?: string;
  @IsArray() @ArrayMinSize(1) @IsUUID('4', { each: true }) participantIds: string[];
}
