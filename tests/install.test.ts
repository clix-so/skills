import { installSkill } from '../src/bin/commands/install';
import fs from 'fs-extra';
import path from 'path';
import ora from 'ora';
import { configureMCP } from '../src/bin/utils/mcp';

// Mock dependencies
jest.mock('fs-extra');
jest.mock('ora');
jest.mock('../src/bin/utils/mcp');

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedOra = ora as jest.MockedFunction<typeof ora>;
const mockedConfigureMCP = configureMCP as jest.MockedFunction<typeof configureMCP>;

describe('installSkill', () => {
    const mockSpinner = {
        start: jest.fn().mockReturnThis(),
        fail: jest.fn().mockReturnThis(),
        succeed: jest.fn().mockReturnThis(),
        s: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockedOra.mockReturnValue(mockSpinner as any);
        // Mock existence of skill
        mockedFs.existsSync.mockReturnValue(true);
        mockedFs.ensureDir.mockImplementation(() => Promise.resolve());
        mockedFs.copy.mockImplementation(() => Promise.resolve());
    });

    it('should install to default .clix/skills when no client is specified', async () => {
        await installSkill('integration', {});

        const expectedDest = path.resolve(process.cwd(), '.clix/skills/integration');
        expect(mockedFs.copy).toHaveBeenCalledWith(
            expect.stringContaining('skills/integration'),
            expectedDest
        );
        expect(mockSpinner.succeed).toHaveBeenCalled();
    });

    it('should install to .claude/skills when client is claude', async () => {
        await installSkill('integration', { client: 'claude' });

        const expectedDest = path.resolve(process.cwd(), '.claude/skills/integration');
        expect(mockedFs.copy).toHaveBeenCalledWith(expect.any(String), expectedDest);
    });

    it('should install to .cursor/skills when client is cursor', async () => {
        await installSkill('integration', { client: 'cursor' });

        const expectedDest = path.resolve(process.cwd(), '.cursor/skills/integration');
        expect(mockedFs.copy).toHaveBeenCalledWith(expect.any(String), expectedDest);
    });

    it('should install to .opencode/skill when client is opencode', async () => {
        await installSkill('integration', { client: 'opencode' });

        const expectedDest = path.resolve(process.cwd(), '.opencode/skill/integration');
        expect(mockedFs.copy).toHaveBeenCalledWith(expect.any(String), expectedDest);
    });

    it('should install to .skills when client is letta', async () => {
        await installSkill('integration', { client: 'letta' });

        const expectedDest = path.resolve(process.cwd(), '.skills/integration');
        expect(mockedFs.copy).toHaveBeenCalledWith(expect.any(String), expectedDest);
    });

    it('should install to .github/skills when client is copilot', async () => {
        await installSkill('integration', { client: 'copilot' });

        const expectedDest = path.resolve(process.cwd(), '.github/skills/integration');
        expect(mockedFs.copy).toHaveBeenCalledWith(expect.any(String), expectedDest);
    });

    it('should install to .goose/skills when client is goose', async () => {
        await installSkill('integration', { client: 'goose' });

        const expectedDest = path.resolve(process.cwd(), '.goose/skills/integration');
        expect(mockedFs.copy).toHaveBeenCalledWith(expect.any(String), expectedDest);
    });

    it('should respect custom --path', async () => {
        await installSkill('integration', { path: './custom/folder' });

        const expectedDest = path.resolve(process.cwd(), './custom/folder/integration');
        expect(mockedFs.copy).toHaveBeenCalledWith(expect.any(String), expectedDest);
    });

    it('should handle missing skill gracefully', async () => {
        mockedFs.existsSync.mockReturnValue(false);
        mockedFs.readdirSync.mockReturnValue(['existing_skill'] as any);

        await installSkill('missing_skill', {});

        // We verify the fail method was called with an error message containing the skill name.
        // Note: Chalk may add color codes to the actual message.
        expect(mockSpinner.fail).toHaveBeenCalledWith(expect.stringMatching(/missing_skill/));
        expect(mockedFs.copy).not.toHaveBeenCalled();
    });

    it('should attempt to configure MCP', async () => {
        await installSkill('integration', { client: 'cursor' });
        expect(mockedConfigureMCP).toHaveBeenCalledWith('cursor');
    });
});
