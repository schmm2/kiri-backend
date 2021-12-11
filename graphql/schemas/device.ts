const { DeviceTC } = require("../../models/Device");

export const deviceQuery = {
    deviceById: DeviceTC.mongooseResolvers.findById(),
    deviceMany: DeviceTC.mongooseResolvers.findMany(),
}

export const deviceMutation = {
    deviceCreateOne: DeviceTC.mongooseResolvers.createOne(),
    deviceRemoveMany: DeviceTC.mongooseResolvers.removeMany()
}
