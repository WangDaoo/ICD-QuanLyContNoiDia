import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateCustomerWarehouseDto } from '../dto/create-customer-warehouse.dto';
import { QueryCustomerWarehouseDto } from '../dto/query-customer-warehouse.dto';
import { UpdateCustomerWarehouseDto } from '../dto/update-customer-warehouse.dto';

@Injectable()
export class CustomerWarehouseService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCustomerWarehouseDto, icdId: string) {
    const existing = await this.prisma.customerWarehouse.findUnique({
      where: {
        icdId_code: {
          icdId,
          code: dto.code,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Kho khách hàng mã "${dto.code}" đã tồn tại trong ICD này.`,
      );
    }

    if (dto.consigneeId) {
      const consignee = await this.prisma.consignee.findUnique({
        where: { id: dto.consigneeId },
      });
      if (!consignee) {
        throw new NotFoundException(
          `Không tìm thấy khách hàng (Consignee) với ID ${dto.consigneeId}.`,
        );
      }
    }

    return this.prisma.customerWarehouse.create({
      data: {
        icdId,
        code: dto.code,
        name: dto.name,
        consigneeId: dto.consigneeId || null,
        address: dto.address || null,
        latitude: dto.latitude !== undefined ? dto.latitude : null,
        longitude: dto.longitude !== undefined ? dto.longitude : null,
        contactName: dto.contactName || null,
        contactPhone: dto.contactPhone || null,
      },
      include: {
        consignee: {
          select: { id: true, name: true, taxCode: true },
        },
      },
    });
  }

  async findMany(icdId: string, query: QueryCustomerWarehouseDto) {
    const { page = 1, limit = 20, search, consigneeId, active } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { icdId };
    if (active !== undefined) where.active = active;
    if (consigneeId) where.consigneeId = consigneeId;
    if (search) {
      where.OR = [
        { code: { contains: search } },
        { name: { contains: search } },
        { contactName: { contains: search } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.customerWarehouse.count({ where }),
      this.prisma.customerWarehouse.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          consignee: {
            select: { id: true, name: true, taxCode: true },
          },
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
      },
    };
  }

  async findById(id: string, icdId: string) {
    const warehouse = await this.prisma.customerWarehouse.findFirst({
      where: { id, icdId },
      include: {
        consignee: {
          select: { id: true, name: true, taxCode: true, phone: true, email: true },
        },
        _count: {
          select: { handovers: true },
        },
      },
    });

    if (!warehouse) {
      throw new NotFoundException(`Không tìm thấy kho khách hàng với ID ${id}.`);
    }

    return warehouse;
  }

  async update(id: string, dto: UpdateCustomerWarehouseDto, icdId: string) {
    const existing = await this.prisma.customerWarehouse.findFirst({
      where: { id, icdId },
    });

    if (!existing) {
      throw new NotFoundException(`Không tìm thấy kho khách hàng với ID ${id}.`);
    }

    if (dto.consigneeId) {
      const consignee = await this.prisma.consignee.findUnique({
        where: { id: dto.consigneeId },
      });
      if (!consignee) {
        throw new NotFoundException(
          `Không tìm thấy khách hàng (Consignee) với ID ${dto.consigneeId}.`,
        );
      }
    }

    return this.prisma.customerWarehouse.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.consigneeId !== undefined && { consigneeId: dto.consigneeId }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.latitude !== undefined && { latitude: dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
        ...(dto.contactName !== undefined && { contactName: dto.contactName }),
        ...(dto.contactPhone !== undefined && { contactPhone: dto.contactPhone }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
      include: {
        consignee: {
          select: { id: true, name: true, taxCode: true },
        },
      },
    });
  }
}
