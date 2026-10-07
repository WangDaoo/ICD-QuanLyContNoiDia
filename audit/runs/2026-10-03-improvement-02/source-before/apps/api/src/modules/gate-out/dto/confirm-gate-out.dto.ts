import { Transform } from 'class-transformer';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class ConfirmGateOutDto {
  @IsUUID()
  visitId!: string;

  /**
   * Mobile gửi lại chính QR token đã scan.
   *
   * Backend dùng QR token để lookup Gate Pass và cross-check visitId.
   */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(20)
  @MaxLength(512)
  qrToken!: string;
}
