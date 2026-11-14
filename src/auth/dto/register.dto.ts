import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsString() @MinLength(3) @MaxLength(24)
  @Matches(/^[a-zA-Z0-9_.]+$/)
  username: string;

  @IsEmail()
  email: string;

  @IsString() @MinLength(8) @MaxLength(72)
  password: string;
}
