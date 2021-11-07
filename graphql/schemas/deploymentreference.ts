import { DeploymentReferenceTC } from "../../models/deploymentreference";

export const deploymentReferenceQuery = {
    deploymentById: DeploymentReferenceTC.mongooseResolvers.findById(),
    deploymentMany: DeploymentReferenceTC.mongooseResolvers.findMany()
}

export const deploymentReferenceMutation = {
    deploymentCreateOne: DeploymentReferenceTC.mongooseResolvers.createOne(),
    deploymentUpdateOne: DeploymentReferenceTC.mongooseResolvers.updateOne(),
    deploymentRemoveById: DeploymentReferenceTC.mongooseResolvers.removeById()
}
