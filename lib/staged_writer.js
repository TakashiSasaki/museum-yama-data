const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class StagedWriter {
    constructor(workspaceRoot = '.') {
        this.workspaceRoot = path.resolve(workspaceRoot);
        this.stagedFiles = [];
        this.stageDir = null;
    }

    /**
     * Pre-registers a file write. Checks if target path exists and throws if it does.
     */
    registerWrite(targetPath, content) {
        const absoluteTarget = path.isAbsolute(targetPath) ? targetPath : path.resolve(this.workspaceRoot, targetPath);
        
        if (fs.existsSync(absoluteTarget)) {
            throw new Error(`Target file already exists (non-overwrite policy): ${targetPath}`);
        }

        this.stagedFiles.push({
            targetPath: absoluteTarget,
            content
        });
    }

    /**
     * Writes all registered files to a temporary staging area under scratch/
     */
    async writeToStaging() {
        const scratchDir = path.join(this.workspaceRoot, 'scratch');
        if (!fs.existsSync(scratchDir)) {
            fs.mkdirSync(scratchDir, { recursive: true });
        }

        const runId = crypto.randomBytes(8).toString('hex');
        this.stageDir = path.join(scratchDir, `stage_${runId}`);
        fs.mkdirSync(this.stageDir, { recursive: true });

        for (const file of this.stagedFiles) {
            const tempFilename = crypto.createHash('sha256').update(file.targetPath).digest('hex') + '.tmp';
            const tempPath = path.join(this.stageDir, tempFilename);
            fs.writeFileSync(tempPath, file.content, 'utf8');
            file.tempPath = tempPath;
        }
    }

    /**
     * Executes the final atomic move to the target paths.
     */
    commit() {
        if (!this.stageDir) {
            throw new Error('Staging directory has not been prepared.');
        }

        // Verify again that none of the targets got created in the meantime
        for (const file of this.stagedFiles) {
            if (fs.existsSync(file.targetPath)) {
                throw new Error(`Race condition: Target file was created during staging: ${file.targetPath}`);
            }
        }

        // Create target parent directories if they don't exist
        for (const file of this.stagedFiles) {
            const parentDir = path.dirname(file.targetPath);
            if (!fs.existsSync(parentDir)) {
                fs.mkdirSync(parentDir, { recursive: true });
            }
        }

        // Move files from staging to final target paths
        for (const file of this.stagedFiles) {
            fs.renameSync(file.tempPath, file.targetPath);
        }

        this.cleanup();
    }

    /**
     * Cleans up the staging directory.
     */
    cleanup() {
        if (this.stageDir && fs.existsSync(this.stageDir)) {
            fs.rmSync(this.stageDir, { recursive: true, force: true });
        }
    }
}

module.exports = StagedWriter;
