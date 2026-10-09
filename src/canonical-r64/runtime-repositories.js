import { allContextItems } from './runtime.js';
import { isOpickerEvidence, validateOpickerAnalyzeInput } from './addon-runtime.js';
const defaultIdFactory = () => crypto.randomUUID();
function recordsOf(pack, objectType) {
    return allContextItems(pack).filter((item) => item.objectType === objectType);
}
class BaseRepository {
    runtime;
    workspaceId;
    idFactory;
    constructor(runtime, workspaceId, idFactory = defaultIdFactory) {
        this.runtime = runtime;
        this.workspaceId = workspaceId;
        this.idFactory = idFactory;
    }
    async context() {
        const result = await this.runtime.getContext(this.workspaceId);
        if (!result.contextPack)
            throw new Error('CONTEXT_PACK_REQUIRED');
        return result.contextPack;
    }
    async writeObject(input) {
        return this.runtime.write({
            workspaceId: this.workspaceId,
            eventId: `evt-${this.idFactory()}`,
            objectType: input.objectType,
            objectId: input.objectId,
            eventType: input.eventType,
            expectedVersion: input.expectedVersion,
            source: 'APP',
            patch: input.data,
            confirmed: input.confirmed ?? false,
            // null means preserve the existing scope on updates. Never widen RESTRICTED/PRIVATE to WORKSPACE implicitly.
            accessScope: input.accessScope ?? null,
            granteeUserIds: input.granteeUserIds ?? null
        });
    }
}
export class TeamRuntimeRepository extends BaseRepository {
    async listPeople() {
        return recordsOf(await this.context(), 'PERSON');
    }
    async listTeams() {
        return recordsOf(await this.context(), 'TEAM');
    }
    async savePerson(input) {
        return this.writeObject({
            objectType: 'PERSON',
            objectId: input.personId,
            eventType: input.expectedVersion === 0 ? 'PERSON_CREATED' : 'PERSON_UPDATED',
            expectedVersion: input.expectedVersion,
            data: input.data,
            confirmed: true,
            accessScope: input.accessScope,
            granteeUserIds: input.granteeUserIds
        });
    }
}
export class ProjectRuntimeRepository extends BaseRepository {
    async list() {
        return recordsOf(await this.context(), 'PROJECT');
    }
    async save(input) {
        return this.writeObject({
            objectType: 'PROJECT',
            objectId: input.projectId,
            eventType: input.expectedVersion === 0 ? 'PROJECT_CREATED' : 'PROJECT_UPDATED',
            expectedVersion: input.expectedVersion,
            data: input.data,
            confirmed: input.confirmed ?? true
        });
    }
}
export class DecisionRuntimeRepository extends BaseRepository {
    async list() {
        return recordsOf(await this.context(), 'DECISION');
    }
    async saveDraft(input) {
        return this.writeObject({
            objectType: 'DECISION',
            objectId: input.decisionId,
            eventType: input.expectedVersion === 0 ? 'DECISION_DRAFTED' : 'DECISION_DRAFT_UPDATED',
            expectedVersion: input.expectedVersion,
            data: input.data,
            confirmed: false
        });
    }
    async confirm(input) {
        if (input.humanConfirmed !== true)
            throw new Error('HUMAN_CONFIRMATION_REQUIRED');
        return this.writeObject({
            objectType: 'DECISION',
            objectId: input.decisionId,
            eventType: 'DECISION_CONFIRMED',
            expectedVersion: input.expectedVersion,
            data: input.data,
            confirmed: true
        });
    }
}
export class ActionRuntimeRepository extends BaseRepository {
    async list() {
        return recordsOf(await this.context(), 'ACTION');
    }
    async save(input) {
        return this.writeObject({
            objectType: 'ACTION',
            objectId: input.actionId,
            eventType: input.expectedVersion === 0 ? 'ACTION_CREATED' : 'ACTION_UPDATED',
            expectedVersion: input.expectedVersion,
            data: input.data,
            confirmed: input.confirmed ?? true,
            accessScope: input.accessScope,
            granteeUserIds: input.granteeUserIds
        });
    }
}
export class AddonEvidenceRuntimeRepository extends BaseRepository {
    async list() {
        return (await this.context()).evidence.filter(isOpickerEvidence);
    }
    async health() {
        return this.runtime.addonHealth(this.workspaceId);
    }
    async startTrial() {
        return this.runtime.startAddonTrial(this.workspaceId);
    }
    async analyze(input) {
        const normalized = validateOpickerAnalyzeInput(input);
        return this.runtime.analyzeAddon({
            workspaceId: this.workspaceId,
            ...normalized
        });
    }
    async review(input) {
        return this.runtime.reviewAddonEvidence({
            workspaceId: this.workspaceId,
            eventId: `evt-${this.idFactory()}`,
            evidenceId: input.evidenceId,
            expectedVersion: input.expectedVersion,
            disposition: input.disposition,
            notes: input.notes ?? null
        });
    }
}
export function createRuntimeRepositories(input) {
    return {
        team: new TeamRuntimeRepository(input.runtime, input.workspaceId, input.idFactory),
        projects: new ProjectRuntimeRepository(input.runtime, input.workspaceId, input.idFactory),
        decisions: new DecisionRuntimeRepository(input.runtime, input.workspaceId, input.idFactory),
        actions: new ActionRuntimeRepository(input.runtime, input.workspaceId, input.idFactory),
        addonEvidence: new AddonEvidenceRuntimeRepository(input.runtime, input.workspaceId, input.idFactory)
    };
}
