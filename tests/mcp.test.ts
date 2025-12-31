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

        // Should check for directory ensures
        expect(mockedFs.ensureDir).toHaveBeenCalled();
        // Should write empty first then updating
        expect(mockedFs.writeJSON).toHaveBeenCalledTimes(2);
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
