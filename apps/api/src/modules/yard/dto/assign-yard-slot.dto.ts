import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class AssignYardSlotDto {
  @IsUUID()
  yardSlotId!: string;

  /**
   * MANUAL: nhân viên tự chọn slot.
   * RULE: nhân viên chọn candidate từ thuật toán rule.
   * ML: nhân viên chọn candidate từ kết quả gợi ý ML.
   */
  @IsOptional()
  @IsIn(['MANUAL', 'RULE', 'ML'])
  source: 'MANUAL' | 'RULE' | 'ML' = 'MANUAL';

  @IsOptional()
  @IsUUID()
  recommendationId?: string;

  @IsOptional()
  @IsString()
  contextToken?: string;
}
