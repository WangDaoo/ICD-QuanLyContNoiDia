import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ConfirmGateOutDto {
  /**
   * Mobile gửi lại chính QR token đã scan.
   *
   * Backend không tin gatePassId từ client.
   */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(20)
  @MaxLength(512)
  qrToken!: string;
}
