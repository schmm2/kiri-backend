const { DeviceVersionTC } = require("../../models/Deviceversion");

export const deviceVersionQuery = {
    deviceVersionById: DeviceVersionTC.getResolver("findById"),
    deviceVersionMany: DeviceVersionTC.getResolver('findMany'),
}

export const deviceVersionMutation = {
    deviceVersionCreateOne: DeviceVersionTC.getResolver("createOne"),
    deviceVersionRemoveMany: DeviceVersionTC.getResolver("removeMany")
}
