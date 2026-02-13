import { IRiskAgreementItem } from "../data/props";
import { DataSource } from "../data/ds";

export interface IDefaultApprovers {
  entityGMId?: number;
  OGPresidentId?: number;
  cooId?: number;
  CEOId?: number;
  SVPContractsId?: number;
}

export class ApproverResolver {

  static async resolve(item: IRiskAgreementItem): Promise<IDefaultApprovers> {

    //get Entity GM based on At-Risk entity
    const entityGMId = DataSource.Entities.find(e => e.abbr === item.entity)?.GM.Id

    //get contract info first > set OG
    //const contract = DataSource.Contracts.find(c => c.field_19 === item.contractId);
    //const OG = DataSource.OGs.find(og => og.Title === contract?.field_75);

    //set OG from form selection
    const OG = DataSource.OGs.find(og => og.Title === item.og);

    //set LOB from OG selection
    const LOB = DataSource.LOBs.find(lob => lob.Id === OG?.lob.Id)

    //set OG Pres & COO
    const OGPresidentId = OG?.president.Id;
    const cooId = LOB?.coo.Id;

    return {
      entityGMId,
      OGPresidentId,
      cooId,
      CEOId: DataSource.CEO?.Id,
      SVPContractsId: DataSource.SVPContracts?.Id
    };
  }
}
