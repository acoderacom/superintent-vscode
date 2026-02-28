import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { CommandResult } from '../types';

const execAsync = promisify(exec);

export interface CommandExecutor {
    execute(command: string): Promise<CommandResult>;
    dispose(): void;
}

export class LocalExecutor implements CommandExecutor {
    async execute(command: string): Promise<CommandResult> {
        try {
            const { stdout, stderr } = await execAsync(command);
            return {
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                exitCode: 0,
            };
        } catch (error: unknown) {
            const err = error as {
                stdout?: string;
                stderr?: string;
                code?: number;
            };
            return {
                stdout: err.stdout?.trim() || '',
                stderr: err.stderr?.trim() || String(error),
                exitCode: err.code || 1,
            };
        }
    }

    dispose(): void {}
}

/**
 * Connection manager - manages local command execution
 */
export class ConnectionManager {
    private executor: LocalExecutor;

    constructor() {
        this.executor = new LocalExecutor();
    }

    async execute(
        _connectionId: string,
        command: string,
    ): Promise<CommandResult> {
        return this.executor.execute(command);
    }

    dispose(): void {
        this.executor.dispose();
    }
}
