import { DeploymentTC } from "../../models/deployment";

export const deploymentQuery = {
    deploymentById: DeploymentTC.mongooseResolvers.findById(),
    deploymentMany: DeploymentTC.mongooseResolvers.findMany()
}

export const deploymentMutation = {
    deploymentCreateOne: DeploymentTC.mongooseResolvers.createOne(),
    deploymentUpdateOne: DeploymentTC.mongooseResolvers.updateOne(),
    deploymentRemoveById: DeploymentTC.mongooseResolvers.removeById()
}
