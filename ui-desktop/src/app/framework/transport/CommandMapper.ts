/**
 * Command Mapper - 将CLI命令格式转换为UVC HTTP请求
 * 基于 cli/src/modules/control/service.js 的API映射
 */

export interface UvcRequest {
    url: string;
    method: 'GET' | 'POST';
    body?: Record<string, unknown>;
}

export class CommandMapper {
    /**
     * 将CLI命令参数转换为UVC HTTP请求
     * @param cliArgs CLI命令参数数组，例如: ["control", "zoom", "pos", "1000"]
     * @returns UVC HTTP请求对象
     */
    static toUvcRequest(cliArgs: string[]): UvcRequest {
        if (!cliArgs || cliArgs.length === 0) {
            throw new Error('CLI args are required');
        }

        const [command, ...rest] = cliArgs;

        switch (command) {
            case 'control':
                return this.mapControlCommand(rest);
            case 'uvc':
                return this.mapUvcCommand(rest);
            case 'image':
                return this.mapImageCommand(rest);
            default:
                throw new Error(`Unknown command: ${command}`);
        }
    }

    /**
     * 映射 control 命令
     * 基于 cli/src/modules/control/service.js
     */
    private static mapControlCommand(args: string[]): UvcRequest {
        if (args.length === 0) {
            throw new Error('Control command requires subcommand');
        }

        const [subcommand, action, ...params] = args;

        // PTZ方向映射
        const directionMap: Record<string, string> = {
            'up': 'up', 'down': 'down', 'left': 'left', 'right': 'right',
            'up-left': 'leftup', 'up-right': 'rightup',
            'down-left': 'leftdown', 'down-right': 'rightdown'
        };

        // 命令配置: [endpoint, hasSpeed, defaultSpeed]
        type CommandConfig = [string, boolean, string?];

        const commandMap: Record<string, Record<string, CommandConfig>> = {
            ptz: {
                // PTZ控制: /ctrl/pt
                'stop': ['/ctrl/pt?action=stop', false],
                'home': ['/ctrl/pt?action=home', false],
                // Lens控制: /ctrl/lens
                'zoomin': ['/ctrl/lens?action=zoomin', true, '0.5'],
                'zoomout': ['/ctrl/lens?action=zoomout', true, '0.5'],
                'zoomstop': ['/ctrl/lens?action=zoomstop', false],
                'focusnear': ['/ctrl/lens?action=focusnear', true, '0.5'],
                'focusfar': ['/ctrl/lens?action=focusfar', true, '0.5'],
                'focusstop': ['/ctrl/lens?action=focusstop', false],
            },
            zoom: {
                'in': ['/ctrl/lens?action=zoomin', true, '5'],
                'out': ['/ctrl/lens?action=zoomout', true, '5'],
                'stop': ['/ctrl/lens?action=zoomstop', false],
            },
            focus: {
                'near': ['/ctrl/lens?action=focusnear', true, '5'],
                'far': ['/ctrl/lens?action=focusfar', true, '5'],
                'stop': ['/ctrl/lens?action=focusstop', false],
            }
        };

        // 特殊处理: ptz move
        if (subcommand === 'ptz' && action === 'move') {
            const direction = params[0];
            const speed = params[1] || '0.5';
            const mappedDirection = directionMap[direction?.toLowerCase()];

            if (!mappedDirection) {
                throw new Error(`Invalid direction: ${direction}`);
            }

            return {
                url: `/ctrl/pt?action=${mappedDirection}&fspeed=${speed}`,
                method: 'GET',
            };
        }

        // 特殊处理: zoom/focus pos
        if (action === 'pos') {
            const value = params[0];
            if (subcommand === 'zoom') {
                return { url: `/ctrl/set?lens_zoom_pos=${value}`, method: 'GET' };
            }
            if (subcommand === 'focus') {
                return { url: `/ctrl/lens?action=lens_focus_pos=${value}`, method: 'GET' };
            }
        }

        // 通用处理: 从配置映射中查找
        const config = commandMap[subcommand]?.[action];
        if (config) {
            const [endpoint, hasSpeed, defaultSpeed] = config;
            const url = hasSpeed
                ? `${endpoint}&fspeed=${params[0] || defaultSpeed}`
                : endpoint;
            return { url, method: 'GET' };
        }

        throw new Error(`Unknown control command: ${subcommand} ${action}`);
    }

    /**
     * 映射 uvc 命令
     * 例如: uvc set brightness 50
     *       uvc get brightness
     */
    private static mapUvcCommand(args: string[]): UvcRequest {
        if (args.length === 0) {
            throw new Error('UVC command requires action');
        }

        const [action, key, ...params] = args;

        // uvc set <key> <value>
        // API: /ctrl/set?{key}={value}
        if (action === 'set') {
            const value = params[0];
            return {
                url: `/ctrl/set?${key}=${value}`,
                method: 'GET',
            };
        }

        // uvc get <key>
        // API: /ctrl/get?k={key}
        if (action === 'get') {
            return {
                url: `/ctrl/get?k=${key}`,
                method: 'GET',
            };
        }

        throw new Error(`Unknown uvc action: ${action}`);
    }

    /**
     * 映射 image 命令
     * 例如: image adjust brightness 50
     *       image whitebalance manual kelvin 5600
     */
    private static mapImageCommand(args: string[]): UvcRequest {
        if (args.length === 0) {
            throw new Error('Image command requires subcommand');
        }

        const [subcommand, ...params] = args;

        // image adjust <key> <value>
        // API: /ctrl/set?{key}={value}
        if (subcommand === 'adjust') {
            const [key, value] = params;
            return {
                url: `/ctrl/set?${key}=${value}`,
                method: 'GET',
            };
        }

        // image whitebalance manual kelvin <value>
        // API: /ctrl/set?whitebalance=manual&mwb={value}
        if (subcommand === 'whitebalance') {
            const [mode, type, value] = params;

            if (mode === 'manual' && type === 'kelvin') {
                return {
                    url: `/ctrl/set?mwb=${value}`,
                    method: 'GET',
                };
            }

            if (mode === 'auto') {
                return {
                    url: `/ctrl/set?whitebalance=auto`,
                    method: 'GET',
                };
            }
        }

        throw new Error(`Unknown image command: ${subcommand}`);
    }
}
