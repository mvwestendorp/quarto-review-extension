// Unit Tests for Version Control Component

describe('Unit: VersionControl Class', function() {
    let versionControl;
    
    beforeEach(function() {
        versionControl = new VersionControl();
        // Clear localStorage for clean tests
        localStorage.clear();
    });
    
    afterEach(function() {
        localStorage.clear();
    });
    
    describe('Initialization', function() {
        it('should initialize without git by default', function() {
            expect(versionControl.useGit).to.be.false;
        });
        
        it('should initialize embedded sources map', function() {
            expect(versionControl.embeddedSources).to.be.instanceOf(Map);
        });
        
        it('should load embedded sources from DOM', function() {
            const sourcesScript = document.getElementById('embedded-sources');
            expect(sourcesScript).to.exist;
            
            // Should have loaded test sources
            expect(versionControl.embeddedSources.size).to.be.at.least(1);
        });
    });
    
    describe('Source File Management', function() {
        it('should update embedded sources in DOM', function() {
            versionControl.embeddedSources.set('test.qmd', {
                content: 'Updated content',
                originalContent: 'Original content',
                lastModified: new Date().toISOString()
            });
            
            versionControl.updateEmbeddedSources();
            
            const sourcesScript = document.getElementById('embedded-sources');
            const data = JSON.parse(sourcesScript.textContent);
            
            expect(data.sources['test.qmd']).to.equal('Updated content');
        });
        
        it('should get file content', function() {
            versionControl.embeddedSources.set('test.qmd', {
                content: 'Test content',
                originalContent: 'Original content'
            });
            
            const content = versionControl.getFileFallback('test.qmd');
            expect(content).to.equal('Test content');
        });
        
        it('should return null for non-existent files', function() {
            const content = versionControl.getFileFallback('nonexistent.qmd');
            expect(content).to.be.null;
        });
    });
    
    describe('Fallback Version Control', function() {
        it('should save files using fallback method', function() {
            const result = versionControl.saveFileFallback('test.qmd', 'New content', 'Test commit');
            
            expect(result.success).to.be.true;
            expect(result.version).to.be.a('string');
            
            const fileData = versionControl.embeddedSources.get('test.qmd');
            expect(fileData.content).to.equal('New content');
            expect(fileData.commitMessage).to.equal('Test commit');
        });
        
        it('should get file history using fallback', function() {
            versionControl.embeddedSources.set('test.qmd', {
                content: 'Content',
                version: 'v123',
                commitMessage: 'Test commit',
                lastModified: '2023-01-01T00:00:00Z'
            });
            
            const history = versionControl.getFileHistoryFallback('test.qmd');
            
            expect(history).to.have.length(1);
            expect(history[0].version).to.equal('v123');
            expect(history[0].message).to.equal('Test commit');
        });
        
        it('should return empty history for non-existent files', function() {
            const history = versionControl.getFileHistoryFallback('nonexistent.qmd');
            expect(history).to.have.length(0);
        });
    });
    
    describe('Diff Creation', function() {
        it('should create simple diff', function() {
            const oldContent = 'line 1\\nline 2\\nline 3';
            const newContent = 'line 1\\nmodified line 2\\nline 3';
            
            const diff = versionControl.createSimpleDiff(oldContent, newContent);
            
            expect(diff).to.include('--- original');
            expect(diff).to.include('+++ modified');
            expect(diff).to.include('-line 2');
            expect(diff).to.include('+modified line 2');
        });
        
        it('should handle identical content', function() {
            const content = 'same content';
            const diff = versionControl.createSimpleDiff(content, content);
            
            expect(diff).to.include(' same content');
            expect(diff).to.not.include('-');
            expect(diff).to.not.include('+');
        });
    });
    
    describe('Source Mapping', function() {
        it('should get stored mappings from DOM', function() {
            const mappings = versionControl.getStoredMappings();
            
            expect(mappings).to.be.instanceOf(Map);
            expect(mappings.size).to.be.at.least(1);
            
            // Check for test mappings
            const testMapping = mappings.get('test-header-1');
            if (testMapping) {
                expect(testMapping.filename).to.equal('test.qmd');
                expect(testMapping.elementType).to.equal('header');
            }
        });
        
        it('should handle missing mappings gracefully', function() {
            // Temporarily remove the embedded sources script
            const sourcesScript = document.getElementById('embedded-sources');
            const originalContent = sourcesScript.textContent;
            sourcesScript.textContent = '{}';
            
            const mappings = versionControl.getStoredMappings();
            expect(mappings.size).to.equal(0);
            
            // Restore
            sourcesScript.textContent = originalContent;
        });
    });
    
    describe('Change Application', function() {
        it('should apply text edit changes to content', function() {
            const content = 'line 1\\nline 2\\nline 3';
            const change = {
                type: 'text-edit',
                modified: 'modified line 2'
            };
            
            const result = versionControl.applyChangeToContent(content, change, 2, 2);
            
            expect(result).to.equal('line 1\\nmodified line 2\\nline 3');
        });
        
        it('should handle multiline changes', function() {
            const content = 'line 1\\nline 2\\nline 3\\nline 4';
            const change = {
                type: 'text-edit',
                modified: 'new line 2\\nnew line 3'
            };
            
            const result = versionControl.applyChangeToContent(content, change, 2, 3);
            
            expect(result).to.equal('line 1\\nnew line 2\\nnew line 3\\nline 4');
        });
    });
    
    describe('Export/Import', function() {
        it('should export review package', async function() {
            const comments = new Map([
                ['comment1', { id: 'comment1', text: 'Test comment' }]
            ]);
            const changes = new Map([
                ['change1', { id: 'change1', status: 'pending' }]
            ]);
            
            versionControl.embeddedSources.set('test.qmd', {
                content: 'Test content',
                originalContent: 'Original content'
            });
            
            const exportData = await versionControl.exportReviewPackage(comments, changes);
            
            expect(exportData.comments).to.have.length(1);
            expect(exportData.changes).to.have.length(1);
            expect(exportData.sources['test.qmd']).to.exist;
            expect(exportData.timestamp).to.be.a('string');
        });
        
        it('should import review package', async function() {
            const packageData = {
                sources: {
                    'imported.qmd': {
                        content: 'Imported content',
                        originalContent: 'Original imported content'
                    }
                },
                comments: [{ id: 'imported-comment', text: 'Imported comment' }],
                changes: [{ id: 'imported-change', status: 'pending' }]
            };
            
            const result = await versionControl.importReviewPackage(packageData);
            
            expect(result.success).to.be.true;
            expect(result.comments).to.have.length(1);
            expect(result.changes).to.have.length(1);
            expect(versionControl.embeddedSources.get('imported.qmd')).to.exist;
        });
        
        it('should handle import errors gracefully', async function() {
            const invalidPackageData = null;
            
            const result = await versionControl.importReviewPackage(invalidPackageData);
            
            expect(result.success).to.be.false;
            expect(result.error).to.be.a('string');
        });
    });
    
    describe('Storage Management', function() {
        it('should save to localStorage', function() {
            versionControl.embeddedSources.set('test.qmd', {
                content: 'Test content'
            });
            
            versionControl.saveToLocalStorage();
            
            const stored = localStorage.getItem('web-review-sources');
            expect(stored).to.not.be.null;
            
            const data = JSON.parse(stored);
            expect(data.sources['test.qmd']).to.exist;
        });
        
        it('should load from localStorage', function() {
            const testData = {
                sources: {
                    'loaded.qmd': {
                        content: 'Loaded content'
                    }
                }
            };
            
            localStorage.setItem('web-review-sources', JSON.stringify(testData));
            
            versionControl.loadFromLocalStorage();
            
            expect(versionControl.embeddedSources.get('loaded.qmd')).to.exist;
            expect(versionControl.embeddedSources.get('loaded.qmd').content).to.equal('Loaded content');
        });
        
        it('should handle localStorage errors gracefully', function() {
            localStorage.setItem('web-review-sources', 'invalid-json');
            
            expect(() => versionControl.loadFromLocalStorage()).to.not.throw();
        });
    });
    
    describe('Utility Methods', function() {
        it('should generate version strings', function() {
            const version = versionControl.generateVersion();
            expect(version).to.match(/^v\\d+$/);
        });
        
        it('should get current version', function() {
            const version = versionControl.getCurrentVersion();
            expect(version).to.be.a('string');
            expect(parseInt(version)).to.be.a('number');
        });
        
        it('should get all sources', function() {
            versionControl.embeddedSources.set('test1.qmd', { content: 'Content 1' });
            versionControl.embeddedSources.set('test2.qmd', { content: 'Content 2' });
            
            const allSources = versionControl.getAllSources();
            
            expect(Object.keys(allSources)).to.include('test1.qmd');
            expect(Object.keys(allSources)).to.include('test2.qmd');
        });
        
        it('should report git availability', function() {
            expect(versionControl.isGitAvailable()).to.be.a('boolean');
        });
    });
});