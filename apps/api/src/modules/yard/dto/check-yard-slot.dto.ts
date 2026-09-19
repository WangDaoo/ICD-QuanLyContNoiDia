import { IsUUID } from 'class-validator';

export class CheckYardSlotDto {
  @IsUUID()
  yardSlotId!: string;
}
