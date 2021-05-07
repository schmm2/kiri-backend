const { ConfigurationTC } = require("../../models/Configuration");

export const configurationQuery = {
    configurationByIds: ConfigurationTC.getResolver("findByIds"),
    configurationById: ConfigurationTC.getResolver("findById"),
    configurationMany: ConfigurationTC.getResolver('findMany'),
}

export const configurationMutation = {
    configurationCreateOne: ConfigurationTC.getResolver("createOne"),
    configurationRemoveById: ConfigurationTC.getResolver("removeById")
}
