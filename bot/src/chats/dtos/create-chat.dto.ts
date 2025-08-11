import { IsNotEmpty, IsString, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateChatDto {
  @IsNotEmpty()
  @IsString()
  question: string;
}
