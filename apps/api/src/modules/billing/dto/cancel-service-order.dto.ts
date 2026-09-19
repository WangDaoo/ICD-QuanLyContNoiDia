import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CancelServiceOrderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
