import { LeaderOsRuntimeClient } from './runtime.js';
import { createRuntimeRepositories } from './runtime-repositories.js';
export function createLeaderOsRuntimeSession(input) {
    const runtime = new LeaderOsRuntimeClient(input.config, input.transport);
    return {
        runtime,
        workspaceId: input.workspaceId,
        repositories: createRuntimeRepositories({
            runtime,
            workspaceId: input.workspaceId,
            idFactory: input.idFactory
        })
    };
}
