import { createLeaderOsGateway, projectGatewayContext } from './gateway.js';
export const projectBrowserContext = (pack) => projectGatewayContext(pack);
/** @deprecated Compatibility facade. New application code should use LeaderOsGateway. */
export function createLeaderOsBrowserRuntime(config, transport = fetch, authStorage = null) { return createLeaderOsGateway(config, transport, authStorage); }
