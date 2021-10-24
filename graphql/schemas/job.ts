const { JobTC } = require("../../models/job");

export const jobQuery = {
  jobByIds: JobTC.mongooseResolvers.findByIds(),
  jobById: JobTC.mongooseResolvers.findById(),
  jobMany: JobTC.mongooseResolvers.findMany(),
}

export const jobMutation = {
  jobCreateOne: JobTC.mongooseResolvers.createOne(),
  jobRemoveMany: JobTC.mongooseResolvers.removeMany(),
}
