const { MsGraphResourceTC } = require("../../models/msgraphresource");

export const msGraphResourceQuery = {
  msGraphResourceByIds: MsGraphResourceTC.getResolver("findByIds"),
  msGraphResourceById: MsGraphResourceTC.getResolver("findById"),
  msGraphResourceMany: MsGraphResourceTC.getResolver('findMany'),
}

export const msGraphResourceMutation = {
  msGraphResourceCreateOne: MsGraphResourceTC.getResolver("createOne"),
  msGraphResourceRemoveById: MsGraphResourceTC.getResolver("removeById")
}
