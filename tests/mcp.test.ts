import { configureMCP } from '../src/bin/utils/mcp';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import os from 'os';
import path from 'path';

jest.mock('fs-extra');
jest.mock('inquirer');
jest.mock('os');

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedInquirer = inquirer as jest.Mocked<typeof inquirer>;
const mockedOs = os as jest.Mocked<typeof os>;

describe('configureMCP', () => {
    const mockHome = '/mock/home';

    beforeEach(() => {
        jest.clearAllMocks();
        mockedOs.homedir.mockReturnValue(mockHome);
        mockedFs.existsSync.mockReturnValue(true);
        mockedFs.readJSON.mockResolvedValue({ mcpServers: {} });
        mockedFs.writeJSON.mockResolvedValue(undefined);
    });

    it('should prompt for client if not provided', async () => {
        mockedInquirer.prompt.mockResolvedValueOnce({ client: 'manual' });

        await configureMCP(undefined);

        expect(mockedInquirer.prompt).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({ name: 'client' })])
        );
    });

    it('should skip if client is manual', async () => {
        await configureMCP('manual');
        expect(mockedFs.readJSON).not.toHaveBeenCalled();
    });

    it('should inject config if confirmed', async () => {
        mockedInquirer.prompt.mockResolvedValueOnce({ inject: true });

        await configureMCP('claude');

        expect(mockedFs.writeJSON).toHaveBeenCalledWith(
            expect.stringContaining('claude_desktop_config.json'),
            expect.objectContaining({
                mcpServers: expect.objectContaining({
                    'clix-mcp-server': expect.anything()
                })
            }),
            expect.anything()
        );
    });

    it('should prompt to create file if missing', async () => {
        mockedFs.existsSync.mockReturnValue(false);
        mockedInquirer.prompt.mockResolvedValueOnce({ create: true }); // respond to create prompt
        mockedInquirer.prompt.mockResolvedValueOnce({ inject: true }); // respond to inject prompt

        await configureMCP('vscode');

        // Should ensure directory exists
        expect(mockedFs.ensureDir).toHaveBeenCalled();
        // Should write empty config first, then update it
        expect(mockedFs.writeJSON).toHaveBeenCalledTimes(2);
    });

    it('should prioritize project-level config for Cursor', async () => {
        const projectPath = path.join(process.cwd(), '.cursor/mcp.json');
        mockedFs.existsSync.mockImplementation((p) => {
            if (p === projectPath) return true;
            return false;
        });

        // Mock prompt response to avoid crash
        mockedInquirer.prompt.mockResolvedValueOnce({ inject: false });

        await configureMCP('cursor');

        // Should attempt to read from project path
        expect(mockedFs.readJSON).toHaveBeenCalledWith(projectPath);
    });

    it('should fallback to global config for Cursor if project-level missing', async () => {
        const globalPath = path.join(mockHome, '.cursor/mcp.json');
        mockedFs.existsSync.mockImplementation((p) => {
            if (p === path.join(process.cwd(), '.cursor/mcp.json')) return false; // Project missing
            if (p === globalPath) return true; // Global exists
            return false;
        });
        // We also need to mock readJSON success for the global file to proceed to existence check
        mockedFs.readJSON.mockResolvedValue({ mcpServers: {} });

        // Mock prompt response to avoid crash
        mockedInquirer.prompt.mockResolvedValueOnce({ inject: false });

        await configureMCP('cursor');

        expect(mockedFs.readJSON).toHaveBeenCalledWith(globalPath);
    });

    it('should not inject if already present', async () => {
        mockedFs.readJSON.mockResolvedValue({
            mcpServers: { 'clix-mcp-server': { command: 'test' } }
        });

        await configureMCP('cursor');

        expect(mockedInquirer.prompt).not.toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({ name: 'inject' })])
        );
        expect(mockedFs.writeJSON).not.toHaveBeenCalled();
    });
});
