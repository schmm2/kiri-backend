const { ConfigurationTypeTC } = require("../../models/configurationtype");

export const configurationTypeQuery = {
    configurationTypeByIds: ConfigurationTypeTC.mongooseResolvers.findByIds(),
    configurationTypeById: ConfigurationTypeTC.mongooseResolvers.findById(),
    configurationTypeMany: ConfigurationTypeTC.mongooseResolvers.findMany()
}

export const configurationTypeMutation = {
    configurationTypeCreateOne: ConfigurationTypeTC.mongooseResolvers.createOne(),
    configurationTypeRemoveById: ConfigurationTypeTC.mongooseResolvers.removeById()
}
