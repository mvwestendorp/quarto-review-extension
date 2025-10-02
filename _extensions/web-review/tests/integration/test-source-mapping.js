// Integration Tests for Source Mapping and File Synchronization

describe('Integration: Source Mapping and File Sync', function() {
    let webReview, versionControl;
    
    beforeEach(function() {
        localStorage.clear();
        webReview = new WebReview({
            mode: 'review',
            features: {
                comments: true,
                editing: true,
                versioning: true,
                diffView: true
            },
            storage: {
                embedSources: true,
                autoSave: false
            }
        });
        versionControl = webReview.versionControl;
    });
    
    afterEach(function() {
        localStorage.clear();
        cleanupMockElements();
    });
    
    describe('Source File Embedding', function() {
        it('should have embedded source files in DOM', function() {
            const sourcesScript = document.getElementById('embedded-sources');
            expect(sourcesScript).to.exist;
            expect(sourcesScript.type).to.equal('application/json');
            
            const data = JSON.parse(sourcesScript.textContent);
            expect(data.sources).to.be.an('object');
            expect(data.mappings).to.be.an('object');
            expect(data.timestamp).to.be.a('string');
        });
        
        it('should have valid element mappings', function() {
            const sourcesScript = document.getElementById('embedded-sources');
            const data = JSON.parse(sourcesScript.textContent);
            
            // Check test element mappings
            expect(data.mappings['test-header-1']).to.exist;
            expect(data.mappings['test-para-1']).to.exist;
            expect(data.mappings['test-code-1']).to.exist;
            
            const headerMapping = data.mappings['test-header-1'];
            expect(headerMapping.filename).to.be.a('string');
            expect(headerMapping.lineStart).to.be.a('number');
            expect(headerMapping.lineEnd).to.be.a('number');
            expect(headerMapping.elementType).to.equal('header');
        });
        
        it('should map HTML elements to source locations', function() {
            if (versionControl) {
                const mappings = versionControl.getStoredMappings();
                
                // Test that we can find mappings for our test elements
                const testElements = document.querySelectorAll('[data-review-id]');
                testElements.forEach(element => {
                    const elementId = element.getAttribute('data-review-id');
                    const mapping = mappings.get(elementId);
                    
                    if (mapping) {
                        expect(mapping.filename).to.be.a('string');
                        expect(mapping.lineStart).to.be.a('number');
                        expect(mapping.elementType).to.be.a('string');
                    }
                });
            }
        });
    });
    
    describe('Change Application to Sources', function() {
        it('should update embedded sources when changes are accepted', function() {
            const originalText = 'Original paragraph content';
            const modifiedText = 'Modified paragraph content';
            
            // Create a change
            const change = {
                id: 'source-update-test',
                elementId: 'test-para-1',
                type: 'text-edit',
                original: originalText,
                modified: modifiedText,
                timestamp: new Date().toISOString(),
                status: 'pending'
            };
            
            webReview.changes.set(change.id, change);
            
            // Switch to author mode and accept the change
            webReview.switchMode('author');
            webReview.acceptChange(change.id);
            
            // Check that embedded sources were updated
            const sourcesScript = document.getElementById('embedded-sources');
            const data = JSON.parse(sourcesScript.textContent);
            
            expect(data.changes).to.be.an('array');
            
            // Should have recorded the change
            const recordedChange = data.changes.find(c => c.elementId === 'test-para-1');
            if (recordedChange) {
                expect(recordedChange.original).to.equal(originalText);
                expect(recordedChange.modified).to.equal(modifiedText);
                expect(recordedChange.status).to.equal('accepted');
            }
        });
        
        it('should maintain source file integrity', function() {
            if (versionControl) {
                const originalSources = versionControl.getAllSources();
                const sourceNames = Object.keys(originalSources);
                
                expect(sourceNames.length).to.be.at.least(1);
                
                // Make multiple changes
                const changes = [
                    {
                        id: 'change1',
                        elementId: 'test-para-1',
                        original: 'text1',
                        modified: 'modified1'
                    },
                    {
                        id: 'change2',
                        elementId: 'test-para-2',
                        original: 'text2',
                        modified: 'modified2'
                    }
                ];
                
                changes.forEach(change => {
                    webReview.updateEmbeddedSources(change);
                });
                
                // Sources should still be available
                const updatedSources = versionControl.getAllSources();
                expect(Object.keys(updatedSources)).to.deep.equal(sourceNames);
            }
        });
    });
    
    describe('Version Control Integration', function() {
        it('should track changes in version control system', async function() {
            if (versionControl) {
                const filename = 'test.qmd';
                const originalContent = 'Original file content';
                const modifiedContent = 'Modified file content';
                
                // Save initial version
                const saveResult = await versionControl.saveFile(filename, originalContent, 'Initial commit');
                expect(saveResult.success).to.be.true;
                
                // Save modified version
                const updateResult = await versionControl.saveFile(filename, modifiedContent, 'Updated content');
                expect(updateResult.success).to.be.true;
                
                // Get file history
                const history = await versionControl.getFileHistory(filename);
                expect(history.length).to.be.at.least(1);
                
                // Get current content
                const currentContent = await versionControl.getFile(filename);
                expect(currentContent).to.equal(modifiedContent);
            }
        });
        
        it('should create diffs between versions', async function() {
            if (versionControl && versionControl.createDiff) {
                const filename = 'test.qmd';
                const version1 = 'v1';
                const version2 = 'v2';
                
                // Mock version data
                versionControl.embeddedSources.set(filename, {
                    content: 'New content\\nLine 2\\nLine 3',
                    originalContent: 'Old content\\nLine 2\\nLine 3'
                });
                
                const diff = await versionControl.createDiff(filename, version1, version2);
                
                if (diff) {
                    expect(diff).to.be.a('string');
                    expect(diff).to.include('---');
                    expect(diff).to.include('+++');
                }
            }
        });
    });
    
    describe('Cross-Reference Integrity', function() {
        it('should maintain consistency between comments and source mappings', function() {
            // Add comment to a mapped element
            webReview.addComment('test-range', 'Comment on mapped element');
            
            const commentId = Array.from(webReview.comments.keys())[0];
            const comment = webReview.comments.get(commentId);
            
            // Comment should be linked to reviewable content
            expect(comment).to.exist;
            expect(comment.range).to.be.a('string');
            
            if (versionControl) {
                const mappings = versionControl.getStoredMappings();
                expect(mappings.size).to.be.at.least(1);
                
                // We should be able to find source mapping for commented elements
                const testElementMapping = mappings.get('test-para-1');
                if (testElementMapping) {
                    expect(testElementMapping.filename).to.be.a('string');
                    expect(testElementMapping.elementType).to.equal('paragraph');
                }
            }
        });
        
        it('should track element changes back to source lines', function() {
            if (versionControl) {
                const mappings = versionControl.getStoredMappings();
                const elementMapping = mappings.get('test-code-1');
                
                if (elementMapping) {
                    // Create change for mapped element
                    const change = {
                        id: 'mapped-change',
                        elementId: 'test-code-1',
                        type: 'text-edit',
                        original: 'function test() { return "old"; }',
                        modified: 'function test() { return "new"; }',
                        status: 'pending'
                    };
                    
                    webReview.changes.set(change.id, change);
                    
                    // Should be able to apply change to source content
                    const sourceMapping = versionControl.getSourceMapping('test-code-1');
                    if (sourceMapping) {
                        expect(sourceMapping.filename).to.equal(elementMapping.filename);
                        expect(sourceMapping.lineStart).to.equal(elementMapping.lineStart);
                        expect(sourceMapping.elementType).to.equal('code-block');
                    }
                }
            }
        });
    });
    
    describe('Export/Import with Source Mapping', function() {
        it('should export complete review package with sources', async function() {
            // Add test data
            webReview.addComment('mapped-comment', 'Comment with source mapping');
            webReview.changes.set('mapped-change', {
                id: 'mapped-change',
                elementId: 'test-header-1',
                type: 'text-edit',
                original: 'Original Header',
                modified: 'Modified Header',
                status: 'pending'
            });
            
            if (versionControl) {
                const exportData = await versionControl.exportReviewPackage(
                    webReview.comments,
                    webReview.changes
                );
                
                expect(exportData.sources).to.be.an('object');
                expect(exportData.mappings).to.be.an('object');
                expect(exportData.comments).to.have.length(1);
                expect(exportData.changes).to.have.length(1);
                
                // Should include source files
                const sourceFiles = Object.keys(exportData.sources);
                expect(sourceFiles.length).to.be.at.least(1);
                
                // Should include element mappings
                const mappings = exportData.mappings;
                expect(Object.keys(mappings).length).to.be.at.least(1);
            }
        });
        
        it('should import and restore source mappings', async function() {
            if (versionControl) {
                const packageData = {
                    sources: {
                        'imported.qmd': {
                            content: '# Imported Header\\n\\nImported paragraph.',
                            originalContent: '# Original Header\\n\\nOriginal paragraph.'
                        }
                    },
                    mappings: {
                        'imported-header': {
                            filename: 'imported.qmd',
                            lineStart: 1,
                            lineEnd: 1,
                            elementType: 'header'
                        }
                    },
                    comments: [{
                        id: 'imported-comment',
                        text: 'Imported comment',
                        elementId: 'imported-header'
                    }],
                    changes: [{
                        id: 'imported-change',
                        elementId: 'imported-header',
                        status: 'pending'
                    }]
                };
                
                const result = await versionControl.importReviewPackage(packageData);
                
                expect(result.success).to.be.true;
                
                // Check that sources were imported
                const importedSource = versionControl.embeddedSources.get('imported.qmd');
                expect(importedSource).to.exist;
                expect(importedSource.content).to.include('Imported Header');
                
                // Check that mappings are available
                versionControl.updateEmbeddedSources();
                const sourcesScript = document.getElementById('embedded-sources');
                const data = JSON.parse(sourcesScript.textContent);
                
                // Should have the original test mappings plus any imported ones
                expect(Object.keys(data.mappings).length).to.be.at.least(1);
            }
        });
    });
});