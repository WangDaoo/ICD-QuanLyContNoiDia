import { Transform, Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';

export class CreateContainerReceptionDto {
  /**
   * Batch 11 primary workflow bắt buộc
   * Container phải thuộc Truck Visit đã ARRIVED.
   */
  @IsUUID()
  truckVisitId!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  actualSeal!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({
    maxDecimalPlaces: 3,
  })
  @Min(0.001)
  actualWeight?: number;

  /**
   * Đặc tả chưa chốt catalog condition_code,
   * vì vậy chưa tự tạo enum.
   */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @MaxLength(80)
  conditionCode?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(2000)
  conditionNotes?: string;

  /**
   * Reference ảnh do upload layer sinh.
   *
   * Không gửi binary/base64 vào JSON này.
   */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  photoRef?: string;
}
