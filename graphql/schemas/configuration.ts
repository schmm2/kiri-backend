import { ConfigurationTC } from "../../models/Configuration";

export const configurationQuery = {
    configurationByIds: ConfigurationTC.mongooseResolvers.findByIds(),
    configurationById: ConfigurationTC.mongooseResolvers.findById(),
    configurationMany: ConfigurationTC.mongooseResolvers.findMany(),
    configurationManyLean: ConfigurationTC.mongooseResolvers.findMany({ lean: true })
}

export const configurationMutation = {
    configurationCreateOne: ConfigurationTC.mongooseResolvers.createOne(),
    configurationRemoveById: ConfigurationTC.mongooseResolvers.removeById(),
    configurationRemoveMany: ConfigurationTC.mongooseResolvers.removeMany()
}
