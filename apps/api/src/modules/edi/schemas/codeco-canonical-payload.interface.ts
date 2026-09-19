export interface CodecoCanonicalPayloadV1 {
  schemaVersion: 'CODECO_CANONICAL_JSON_V1';

  messageType: 'CODECO_GATE_IN' | 'CODECO_GATE_OUT';

  eventAt: string;

  requestId: string | null;

  containerVisit: {
    id: string;

    state: string;
  };

  container: {
    number: string;

    containerType: string;

    isoTypeCode: string | null;

    fullEmptyStatus: string;
  };

  shippingLine: {
    id: string;

    name: string;

    scacCode: string | null;
  };

  documents: {
    manifestNo: string | null;

    masterBlNo: string | null;

    houseBlNo: string | null;

    vesselName: string | null;

    voyageNo: string | null;

    portOfLoading: string | null;

    portOfDischarge: string | null;
  };

  gate: {
    receptionId: string | null;

    gateInAt: string | null;

    gateOutAt: string | null;

    actualSeal: string | null;

    actualWeight: string | null;

    vehiclePlate: string | null;
  };

  yard: {
    slotCode: string | null;

    blockCode: string | null;
  };
}
