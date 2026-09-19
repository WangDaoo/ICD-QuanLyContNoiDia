import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '../../../generated/prisma/client';
import { TokenCipherService } from '../crypto/token-cipher.service';
import { RegisterDeviceDto } from '../dto/register-device.dto';
import { UnregisterDeviceDto } from '../dto/unregister-device.dto';
import { NotificationHistoryQueryDto } from '../dto/notification-history-query.dto';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenCipherService: TokenCipherService,
  ) {}

  async registerDevice(userId: string, dto: RegisterDeviceDto) {
    const encrypted = this.tokenCipherService.encryptToken(dto.token);

    const device = await this.prisma.notificationDevice.upsert({
      where: {
        tokenHash: encrypted.tokenHash,
      },
      create: {
        userId,
        platform: dto.platform,
        tokenHash: encrypted.tokenHash,
        tokenCiphertext: encrypted.tokenCiphertext,
        tokenIv: encrypted.tokenIv,
        tokenAuthTag: encrypted.tokenAuthTag,
        active: true,
        lastSeenAt: new Date(),
      },
      update: {
        userId,
        platform: dto.platform,
        tokenCiphertext: encrypted.tokenCiphertext,
        tokenIv: encrypted.tokenIv,
        tokenAuthTag: encrypted.tokenAuthTag,
        active: true,
        lastSeenAt: new Date(),
      },
    });

    this.logger.log(`Device registered for user ${userId}, platform: ${dto.platform}`);

    return {
      success: true,
      deviceId: device.id,
      platform: device.platform,
      active: device.active,
    };
  }

  async unregisterDevice(userId: string, dto: UnregisterDeviceDto) {
    const tokenHash = this.tokenCipherService.hashToken(dto.token);

    const device = await this.prisma.notificationDevice.findFirst({
      where: {
        userId,
        tokenHash,
      },
    });

    if (device) {
      await this.prisma.notificationDevice.update({
        where: { id: device.id },
        data: { active: false },
      });
      this.logger.log(`Device deactivated for user ${userId}`);
    }

    return { success: true };
  }

  async getHistory(userId: string, query: NotificationHistoryQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      recipientUserId: userId,
    };

    if (query.type) {
      where.type = query.type;
    }

    if (query.unreadOnly) {
      where.readAt = null;
    }

    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          deepLink: true,
          sourceType: true,
          sourceId: true,
          dataJson: true,
          readAt: true,
          createdAt: true,
        },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: {
          recipientUserId: userId,
          readAt: null,
        },
      }),
    ]);

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        unreadCount,
      },
    };
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        recipientUserId: userId,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });

    return {
      success: true,
      notificationId: updated.id,
      readAt: updated.readAt,
    };
  }

  async markAllAsRead(userId: string) {
    const now = new Date();
    const result = await this.prisma.notification.updateMany({
      where: {
        recipientUserId: userId,
        readAt: null,
      },
      data: {
        readAt: now,
      },
    });

    return {
      success: true,
      markedCount: result.count,
    };
  }
}
