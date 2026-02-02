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

    //get Entity GM based on ARA entity
    const entityGM = DataSource.Entities.find(e => e.abbr === item.entity)?.GM.Id

    //get contract info first > set OG
    const contract = DataSource.Contracts.find(c => c.field_19 === item.contractId);
    const OG = DataSource.OGs.find(og => og.Title === contract?.field_75);

    //set OG Pres & COO
    const OGPres = OG?.president.Id;
    const COO = OG?.coo.Id;

    return {
      entityGMId: entityGM,
      OGPresidentId: OGPres,
      cooId: COO,
      CEOId: DataSource.CEO?.Id,
      SVPContractsId: DataSource.SVPContracts?.Id
    };
  }
}
