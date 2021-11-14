import { DeploymentReferenceTC } from "../../models/deploymentreference";

export const deploymentReferenceQuery = {
    deploymentReferenceById: DeploymentReferenceTC.mongooseResolvers.findById(),
    deploymentReferenceMany: DeploymentReferenceTC.mongooseResolvers.findMany()
}

export const deploymentReferenceMutation = {
    deploymentReferenceCreateOne: DeploymentReferenceTC.mongooseResolvers.createOne(),
    deploymentReferenceUpdateOne: DeploymentReferenceTC.mongooseResolvers.updateOne(),
    deploymentReferenceRemoveById: DeploymentReferenceTC.mongooseResolvers.removeById()
}
