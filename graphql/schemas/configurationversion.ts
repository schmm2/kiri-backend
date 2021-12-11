const { ConfigurationVersionTC } = require("../../models/configurationversion");

export const configurationVersionQuery = {
    configurationVersionByIds: ConfigurationVersionTC.mongooseResolvers.findByIds(),
    configurationVersionById: ConfigurationVersionTC.mongooseResolvers.findById(),
    configurationVersionMany: ConfigurationVersionTC.mongooseResolvers.findMany(),
}

export const configurationVersionMutation = {
    configurationVersionCreateOne: ConfigurationVersionTC.mongooseResolvers.createOne(),
    configurationVersionRemoveById: ConfigurationVersionTC.mongooseResolvers.removeById()
}