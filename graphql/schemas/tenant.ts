import { TenantTC } from "../../models/tenant";

export const tenantQuery = {
    tenantById: TenantTC.mongooseResolvers.findById(),
    tenantMany: TenantTC.mongooseResolvers.findMany()
}

export const tenantMutation = {
    tenantCreateOne: TenantTC.mongooseResolvers.createOne(),
    tenantUpdateOne: TenantTC.mongooseResolvers.updateOne(),
    tenantRemoveById: TenantTC.mongooseResolvers.removeById()
}
