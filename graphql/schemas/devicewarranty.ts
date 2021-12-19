const { DeviceWarrantyTC } = require("../../models/DeviceWarranty");

export const deviceWarrantyQuery = {
    deviceWarrantyById: DeviceWarrantyTC.mongooseResolvers.findById(),
    deviceWarrantyMany: DeviceWarrantyTC.mongooseResolvers.findMany(),
}

export const deviceWarrantyMutation = {
    deviceWarrantyCreateOne: DeviceWarrantyTC.mongooseResolvers.createOne(),
    deviceWarrantyRemoveMany: DeviceWarrantyTC.mongooseResolvers.removeMany()
}
