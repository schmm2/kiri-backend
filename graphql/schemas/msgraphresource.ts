const { MsGraphResourceTC } = require("../../models/msgraphresource");

export const msGraphResourceQuery = {
  msGraphResourceByIds: MsGraphResourceTC.mongooseResolvers.findByIds(),
  msGraphResourceById: MsGraphResourceTC.mongooseResolvers.findById(),
  msGraphResourceMany: MsGraphResourceTC.mongooseResolvers.findMany(),
}

export const msGraphResourceMutation = {
  msGraphResourceCreateOne: MsGraphResourceTC.mongooseResolvers.createOne(),
  msGraphResourceRemoveById: MsGraphResourceTC.mongooseResolvers.removeById(),
}
