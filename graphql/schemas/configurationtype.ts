const { ConfigurationTypeTC } = require("../../models/configurationtype");

export const configurationTypeQuery = {
    configurationTypeByIds: ConfigurationTypeTC.getResolver("findByIds"),
    configurationTypeById: ConfigurationTypeTC.getResolver("findById"),
    configurationTypeMany: ConfigurationTypeTC.getResolver('findMany'),
}

export const configurationTypeMutation = {
    configurationTypeCreateOne: ConfigurationTypeTC.getResolver("createOne"),
    configurationTypeRemoveById: ConfigurationTypeTC.getResolver("removeById")
}
