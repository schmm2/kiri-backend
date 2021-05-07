const { ConfigurationVersionTC } = require("../../models/configurationversion");

export const configurationVersionQuery = {
    configurationVersionByIds: ConfigurationVersionTC.getResolver("findByIds"),
    configurationVersionById: ConfigurationVersionTC.getResolver("findById"),
    configurationVersionMany: ConfigurationVersionTC.getResolver('findMany'),
}

export const configurationVersionMutation = {
    configurationVersionCreateOne: ConfigurationVersionTC.getResolver("createOne"),
    configurationVersionRemoveById: ConfigurationVersionTC.getResolver("removeById")
}