export interface SystemAction {
    id: string;
    label: string;
    command: string;
    terminalName: string;
    icon: string;
}

export const SYSTEM_ACTIONS: SystemAction[] = [
    {
        id: 'startRemote',
        label: 'Start Remote (Tailscale)',
        command: 'npx superintent-remote',
        terminalName: 'Superintent Remote',
        icon: 'device-mobile',
    },
    {
        id: 'startLocal',
        label: 'Start Remote (Local)',
        command: 'npx superintent-remote --local',
        terminalName: 'Superintent Local',
        icon: 'device-mobile',
    },
    {
        id: 'startDashboard',
        label: 'Start Dashboard',
        command: 'npx superintent dashboard',
        terminalName: 'Superintent Dashboard',
        icon: 'dashboard',
    },
];
