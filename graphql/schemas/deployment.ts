import { DeploymentTC } from "../../models/deployment";

export const deploymentQuery = {
    deploymentById: DeploymentTC.getResolver("findById"),
    deploymentMany: DeploymentTC.getResolver('findMany')
}

export const deploymentMutation = {
    deploymentCreateOne: DeploymentTC.getResolver("createOne"),
    deploymentUpdateOne: DeploymentTC.getResolver("updateOne"),
    deploymentRemoveById: DeploymentTC.getResolver("removeById")
}
