import {
  type Manifest,
  type MasterBl,
  type HouseBl,
  type ShippingLine,
  type Consignee,
  type ClearingAgent,
  type User,
} from '../../../generated/prisma/client';

export class ManifestMapper {
  static toManifestResponse(
    manifest: Manifest & {
      shippingLine?: ShippingLine;
      createdByUser?: Pick<User, 'id' | 'name' | 'email'>;
      _count?: {
        masterBls: number;
      };
    },
  ) {
    return {
      id: manifest.id,
      icdId: manifest.icdId,
      manifestNo: manifest.manifestNo,
      shippingLineId: manifest.shippingLineId,
      shippingLine: manifest.shippingLine
        ? {
            id: manifest.shippingLine.id,
            name: manifest.shippingLine.name,
            scacCode: manifest.shippingLine.scacCode,
          }
        : undefined,
      vesselName: manifest.vesselName,
      voyageNo: manifest.voyageNo,
      eta: manifest.eta.toISOString(),
      portOfLoading: manifest.portOfLoading,
      portOfDischarge: manifest.portOfDischarge,
      status: manifest.status,
      createdById: manifest.createdById,
      createdByUser: manifest.createdByUser
        ? {
            id: manifest.createdByUser.id,
            name: manifest.createdByUser.name,
            email: manifest.createdByUser.email,
          }
        : undefined,
      masterBlCount: manifest._count?.masterBls,
      createdAt: manifest.createdAt.toISOString(),
      updatedAt: manifest.updatedAt.toISOString(),
    };
  }

  static toMasterBlResponse(
    mbl: MasterBl & {
      shippingLine?: ShippingLine;
      _count?: {
        houseBls: number;
      };
    },
  ) {
    return {
      id: mbl.id,
      manifestId: mbl.manifestId,
      mblNumber: mbl.mblNumber,
      shippingLineId: mbl.shippingLineId,
      shippingLine: mbl.shippingLine
        ? {
            id: mbl.shippingLine.id,
            name: mbl.shippingLine.name,
            scacCode: mbl.shippingLine.scacCode,
          }
        : undefined,
      houseBlCount: mbl._count?.houseBls,
      createdAt: mbl.createdAt.toISOString(),
      updatedAt: mbl.updatedAt.toISOString(),
    };
  }

  static toHouseBlResponse(
    hbl: HouseBl & {
      consignee?: Consignee;
      clearingAgent?: ClearingAgent;
    },
  ) {
    return {
      id: hbl.id,
      masterBlId: hbl.masterBlId,
      hblNumber: hbl.hblNumber,
      consigneeId: hbl.consigneeId,
      consignee: hbl.consignee
        ? {
            id: hbl.consignee.id,
            name: hbl.consignee.name,
            taxCode: hbl.consignee.taxCode,
            phone: hbl.consignee.phone,
            email: hbl.consignee.email,
          }
        : undefined,
      clearingAgentId: hbl.clearingAgentId,
      clearingAgent: hbl.clearingAgent
        ? {
            id: hbl.clearingAgent.id,
            name: hbl.clearingAgent.name,
            licenseNo: hbl.clearingAgent.licenseNo,
          }
        : undefined,
      cargoDescription: hbl.cargoDescription,
      grossWeight: Number(hbl.grossWeight),
      packageCount: hbl.packageCount,
      createdAt: hbl.createdAt.toISOString(),
      updatedAt: hbl.updatedAt.toISOString(),
    };
  }
}
