const { DeviceVersionTC } = require("../../models/Deviceversion");

export const deviceQuery = {
    deviceById: DeviceVersionTC.getResolver("findById"),
    deviceMany: DeviceVersionTC.getResolver('findMany'),
}

export const deviceMutation = {
    deviceCreateOne: DeviceVersionTC.getResolver("createOne"),
    deviceRemoveMany: DeviceVersionTC.getResolver("removeMany")
}
