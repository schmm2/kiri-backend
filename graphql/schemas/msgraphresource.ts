const { MsGraphResourceTC } = require("../../models/msgraphresource");

/*
MsGraphResourceTC.addRelation(
  'configurationTypes',
  {
    resolver: () => MsGraphResourceTC.getResolver("dataLoaderMany"),
    prepareArgs: { // resolver `findByIds` has `_ids` arg, let provide value to it
      _ids: (source) => source.configurationTypes,
    },
    projection: { configurationTypes: 1 }, // point fields in source object, which should be fetched from DB
  }
);*/

export const msGraphResourceQuery = {
  msGraphResourceByIds: MsGraphResourceTC.getResolver("findByIds"),
  msGraphResourceById: MsGraphResourceTC.getResolver("findById"),
  msGraphResourceMany: MsGraphResourceTC.getResolver('findMany'),
}

export const msGraphResourceMutation = {
  msGraphResourceCreateOne: MsGraphResourceTC.getResolver("createOne")
}
