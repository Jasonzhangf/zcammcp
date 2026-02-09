
import type { OperationDefinition } from '../../framework/state/PageStore.js';

export const deviceOperations: OperationDefinition[] = [
    {
        id: 'device.switch',
        cliCommand: 'device switch',
        handler: async (_ctx, payload) => {
            const deviceId = payload.value as string;
            if (!deviceId) throw new Error('deviceId required in payload.value');

            return {
                newStatePartial: {},
                cliRequest: {
                    id: `device-switch-${Date.now()}`,
                    command: `device switch ${deviceId}`,
                    args: ['device', 'switch', deviceId],
                },
            };
        },
    },
];
