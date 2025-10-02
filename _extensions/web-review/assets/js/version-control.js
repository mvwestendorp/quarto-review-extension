/**
 * Version Control Component
 * Handles simple versioning and source file management using isomorphic-git or fallback storage
 */

class VersionControl {
  constructor() {
    this.useGit = false;
    this.fs = null;
    this.git = null;
    this.repoPath = '/tmp/web-review-repo';
    this.embeddedSources = new Map();
    
    this.init();
  }
  
  async init() {
    // Check if isomorphic-git is available
    if (typeof git !== 'undefined' && typeof FS !== 'undefined') {
      try {
        this.git = git;
        this.fs = new FS();
        this.useGit = true;
        await this.initRepository();
        console.log('Version control initialized with isomorphic-git');
      } catch (error) {
        console.warn('Failed to initialize isomorphic-git, using fallback storage:', error);
        this.useGit = false;
      }
    } else {
      console.log('isomorphic-git not available, using fallback version control');
    }
    
    this.loadEmbeddedSources();
  }
  
  async initRepository() {
    if (!this.useGit) return;
    
    try {
      // Initialize a new repository
      await this.git.init({
        fs: this.fs,
        dir: this.repoPath,
        defaultBranch: 'main'
      });
      
      // Configure git
      await this.git.setConfig({
        fs: this.fs,
        dir: this.repoPath,
        path: 'user.name',
        value: 'Web Review Extension'
      });
      
      await this.git.setConfig({
        fs: this.fs,
        dir: this.repoPath,
        path: 'user.email',
        value: 'web-review@example.com'
      });
      
    } catch (error) {
      console.error('Failed to initialize git repository:', error);
      this.useGit = false;
    }
  }
  
  /**
   * Load embedded source files from the HTML document
   */
  loadEmbeddedSources() {
    const sourcesScript = document.getElementById('embedded-sources');
    if (sourcesScript) {
      try {
        const data = JSON.parse(sourcesScript.textContent);
        if (data.sources) {
          Object.entries(data.sources).forEach(([filename, content]) => {
            this.embeddedSources.set(filename, {
              content: content,
              originalContent: content,
              lastModified: data.timestamp || new Date().toISOString()
            });
          });
        }
        console.log('Loaded embedded sources:', this.embeddedSources.size, 'files');
      } catch (error) {
        console.error('Failed to load embedded sources:', error);
      }
    }
  }
  
  /**
   * Update embedded sources in the HTML document
   */
  updateEmbeddedSources() {
    const sourcesScript = document.getElementById('embedded-sources');
    if (sourcesScript) {
      const sources = {};
      this.embeddedSources.forEach((data, filename) => {
        sources[filename] = data.content;
      });
      
      const embeddedData = {
        timestamp: new Date().toISOString(),
        sources: sources,
        version: this.getCurrentVersion()
      };
      
      sourcesScript.textContent = JSON.stringify(embeddedData, null, 2);
    }
  }
  
  /**
   * Save a file to version control
   */
  async saveFile(filename, content, message = 'Update file') {
    if (this.useGit) {
      return await this.saveFileGit(filename, content, message);
    } else {
      return this.saveFileFallback(filename, content, message);
    }
  }
  
  async saveFileGit(filename, content, message) {
    try {
      // Write file to filesystem
      await this.fs.promises.writeFile(`${this.repoPath}/${filename}`, content, 'utf8');
      
      // Add file to git
      await this.git.add({
        fs: this.fs,
        dir: this.repoPath,
        filepath: filename
      });
      
      // Commit changes
      const commitSha = await this.git.commit({
        fs: this.fs,
        dir: this.repoPath,
        message: message,
        author: {
          name: 'Web Review Extension',
          email: 'web-review@example.com'
        }
      });
      
      console.log('File saved to git:', filename, commitSha);
      return { success: true, version: commitSha };
      
    } catch (error) {
      console.error('Failed to save file to git:', error);
      return { success: false, error: error.message };
    }
  }
  
  saveFileFallback(filename, content, message) {
    try {
      const timestamp = new Date().toISOString();
      const version = this.generateVersion();
      
      // Update embedded sources
      this.embeddedSources.set(filename, {
        content: content,
        originalContent: this.embeddedSources.get(filename)?.originalContent || content,
        lastModified: timestamp,
        version: version,
        commitMessage: message
      });
      
      this.updateEmbeddedSources();
      
      // Save to localStorage as backup
      this.saveToLocalStorage();
      
      console.log('File saved (fallback):', filename, version);
      return { success: true, version: version };
      
    } catch (error) {
      console.error('Failed to save file (fallback):', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get file content from version control
   */
  async getFile(filename, version = null) {
    if (this.useGit && version) {
      return await this.getFileGit(filename, version);
    } else {
      return this.getFileFallback(filename);
    }
  }
  
  async getFileGit(filename, version) {
    try {
      const { blob } = await this.git.readBlob({
        fs: this.fs,
        dir: this.repoPath,
        oid: version,
        filepath: filename
      });
      
      return new TextDecoder().decode(blob);
    } catch (error) {
      console.error('Failed to get file from git:', error);
      return null;
    }
  }
  
  getFileFallback(filename) {
    const fileData = this.embeddedSources.get(filename);
    return fileData ? fileData.content : null;
  }
  
  /**
   * Get file history/versions
   */
  async getFileHistory(filename) {
    if (this.useGit) {
      return await this.getFileHistoryGit(filename);
    } else {
      return this.getFileHistoryFallback(filename);
    }
  }
  
  async getFileHistoryGit(filename) {
    try {
      const commits = await this.git.log({
        fs: this.fs,
        dir: this.repoPath,
        filepath: filename
      });
      
      return commits.map(commit => ({
        version: commit.oid,
        message: commit.commit.message,
        author: commit.commit.author.name,
        timestamp: new Date(commit.commit.author.timestamp * 1000).toISOString()
      }));
    } catch (error) {
      console.error('Failed to get file history from git:', error);
      return [];
    }
  }
  
  getFileHistoryFallback(filename) {
    const fileData = this.embeddedSources.get(filename);
    if (!fileData) return [];
    
    return [{
      version: fileData.version || 'current',
      message: fileData.commitMessage || 'Current version',
      author: 'Web Review Extension',
      timestamp: fileData.lastModified
    }];
  }
  
  /**
   * Create a diff between two versions
   */
  async createDiff(filename, oldVersion, newVersion) {
    const oldContent = await this.getFile(filename, oldVersion);
    const newContent = await this.getFile(filename, newVersion);
    
    if (!oldContent || !newContent) {
      return null;
    }
    
    // Use DiffViewer if available
    if (typeof DiffViewer !== 'undefined') {
      const diffViewer = new DiffViewer();
      return diffViewer.createUnifiedDiff(oldContent, newContent, filename);
    } else {
      // Simple diff fallback
      return this.createSimpleDiff(oldContent, newContent);
    }
  }
  
  createSimpleDiff(oldContent, newContent) {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    
    let diff = `--- original\n+++ modified\n`;
    
    const maxLines = Math.max(oldLines.length, newLines.length);
    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];
      
      if (oldLine !== newLine) {
        if (oldLine !== undefined) {
          diff += `-${oldLine}\n`;
        }
        if (newLine !== undefined) {
          diff += `+${newLine}\n`;
        }
      } else if (oldLine !== undefined) {
        diff += ` ${oldLine}\n`;
      }
    }
    
    return diff;
  }
  
  /**
   * Apply changes from review data to source files
   */
  async applyChanges(changes) {
    const results = [];
    
    for (const change of changes) {
      if (change.status === 'accepted') {
        const result = await this.applyChange(change);
        results.push(result);
      }
    }
    
    return results;
  }
  
  async applyChange(change) {
    try {
      // Map HTML element changes back to source files
      const sourceMapping = this.getSourceMapping(change.elementId);
      
      if (!sourceMapping) {
        return { 
          success: false, 
          error: 'No source mapping found for element',
          change: change
        };
      }
      
      const { filename, lineStart, lineEnd } = sourceMapping;
      const currentContent = await this.getFile(filename);
      
      if (!currentContent) {
        return {
          success: false,
          error: 'Source file not found',
          change: change
        };
      }
      
      // Apply the change to the source content
      const updatedContent = this.applyChangeToContent(
        currentContent, 
        change, 
        lineStart, 
        lineEnd
      );
      
      // Save the updated file
      const saveResult = await this.saveFile(
        filename, 
        updatedContent, 
        `Apply change: ${change.type} in ${change.elementId}`
      );
      
      return {
        success: saveResult.success,
        filename: filename,
        version: saveResult.version,
        change: change
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        change: change
      };
    }
  }
  
  /**
   * Get source mapping for an HTML element ID
   * This would need to be populated during document rendering
   */
  getSourceMapping(elementId) {
    // This is a simplified implementation
    // In practice, this mapping would be created during Quarto processing
    const mappings = this.getStoredMappings();
    return mappings.get(elementId);
  }
  
  getStoredMappings() {
    // Try to get mappings from embedded data
    const sourcesScript = document.getElementById('embedded-sources');
    if (sourcesScript) {
      try {
        const data = JSON.parse(sourcesScript.textContent);
        if (data.mappings) {
          return new Map(Object.entries(data.mappings));
        }
      } catch (error) {
        console.error('Failed to load source mappings:', error);
      }
    }
    
    return new Map();
  }
  
  /**
   * Apply a change to file content
   */
  applyChangeToContent(content, change, lineStart, lineEnd) {
    const lines = content.split('\n');
    
    // Replace lines with the modified content
    if (change.type === 'text-edit') {
      const newLines = change.modified.split('\n');
      lines.splice(lineStart - 1, lineEnd - lineStart + 1, ...newLines);
    }
    
    return lines.join('\n');
  }
  
  /**
   * Export review package with all sources and changes
   */
  async exportReviewPackage(comments, changes) {
    const exportData = {
      timestamp: new Date().toISOString(),
      version: this.getCurrentVersion(),
      sources: {},
      comments: Array.from(comments.values()),
      changes: Array.from(changes.values()),
      mappings: Object.fromEntries(this.getStoredMappings())
    };
    
    // Include all source files
    this.embeddedSources.forEach((data, filename) => {
      exportData.sources[filename] = {
        content: data.content,
        originalContent: data.originalContent,
        lastModified: data.lastModified
      };
    });
    
    return exportData;
  }
  
  /**
   * Import review package
   */
  async importReviewPackage(packageData) {
    try {
      // Restore sources
      if (packageData.sources) {
        Object.entries(packageData.sources).forEach(([filename, data]) => {
          this.embeddedSources.set(filename, data);
        });
        this.updateEmbeddedSources();
      }
      
      return {
        success: true,
        comments: packageData.comments || [],
        changes: packageData.changes || []
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Utility methods
   */
  getCurrentVersion() {
    return Date.now().toString();
  }
  
  generateVersion() {
    return `v${Date.now()}`;
  }
  
  saveToLocalStorage() {
    try {
      const data = {
        sources: Object.fromEntries(this.embeddedSources),
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('web-review-sources', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }
  
  loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem('web-review-sources');
      if (stored) {
        const data = JSON.parse(stored);
        if (data.sources) {
          Object.entries(data.sources).forEach(([filename, fileData]) => {
            this.embeddedSources.set(filename, fileData);
          });
        }
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
    }
  }
  
  /**
   * Get all source files
   */
  getAllSources() {
    return Object.fromEntries(this.embeddedSources);
  }
  
  /**
   * Check if version control is available
   */
  isGitAvailable() {
    return this.useGit;
  }
}

// Export for use in other modules
window.VersionControl = VersionControl;