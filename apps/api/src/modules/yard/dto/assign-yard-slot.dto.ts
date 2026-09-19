import { IsIn, IsOptional, IsUUID } from 'class-validator';

export class AssignYardSlotDto {
  @IsUUID()
  yardSlotId!: string;

  /**
   * MANUAL: nhân viên tự chọn slot.
   * RULE: nhân viên chọn candidate từ endpoint recommendations.
   * ML/MOVEMENT chưa được nhận ở Batch 12.
   */
  @IsOptional()
  @IsIn(['MANUAL', 'RULE'])
  source: 'MANUAL' | 'RULE' = 'MANUAL';
}
