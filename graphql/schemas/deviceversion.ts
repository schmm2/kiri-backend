const { DeviceVersionTC } = require("../../models/Deviceversion");

export const deviceVersionQuery = {
    deviceVersionById: DeviceVersionTC.mongooseResolvers.findById(),
    deviceVersionMany: DeviceVersionTC.mongooseResolvers.findMany(),
}

export const deviceVersionMutation = {
    deviceVersionCreateOne: DeviceVersionTC.mongooseResolvers.createOne(),
    deviceVersionRemoveMany: DeviceVersionTC.mongooseResolvers.removeMany()
}
