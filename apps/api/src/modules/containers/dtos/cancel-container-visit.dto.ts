import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CancelContainerVisitDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  reason!: string;
}
