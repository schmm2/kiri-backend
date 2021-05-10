const { JobTC } = require("../../models/job");

export const jobQuery = {
  jobByIds: JobTC.getResolver("findByIds"),
  jobById: JobTC.getResolver("findById"),
  jobMany: JobTC.getResolver('findMany'),
}

export const jobMutation = {
  jobCreateOne: JobTC.getResolver("createOne")
}
