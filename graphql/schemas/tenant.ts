import { TenantTC } from "../../models/tenant";

export const tenantQuery = {
    tenantById: TenantTC.getResolver("findById"),
    tenantMany: TenantTC.getResolver('findMany')
}

export const tenantMutation = {
    tenantCreateOne: TenantTC.getResolver("createOne"),
    tenantUpdateOne: TenantTC.getResolver("updateOne"),
    tenantRemoveById: TenantTC.getResolver("removeById")
}
