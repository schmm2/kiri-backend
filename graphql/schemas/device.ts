const { DeviceTC } = require("../../models/Device");

export const deviceQuery = {
    deviceById: DeviceTC.getResolver("findById"),
    deviceMany: DeviceTC.getResolver('findMany'),
}

export const deviceMutation = {
    deviceCreateOne: DeviceTC.getResolver("createOne"),
    deviceRemoveMany: DeviceTC.getResolver("removeMany")
}
