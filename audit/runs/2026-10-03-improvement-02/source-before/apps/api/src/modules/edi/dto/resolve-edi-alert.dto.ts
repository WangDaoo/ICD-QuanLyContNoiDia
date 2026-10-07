import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ResolveEdiAlertDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  resolutionNote!: string;
}
