// Integration Tests for Complete Review Workflow

describe('Integration: Complete Review Workflow', function() {
    let webReview;
    
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
                autoSave: false
            }
        });
    });
    
    afterEach(function() {
        cleanupMockElements();
        localStorage.clear();
        
        // Cleanup any modals or overlays
        document.querySelectorAll('.edit-overlay, .diff-modal-overlay, .change-preview-modal').forEach(el => {
            el.remove();
        });
    });
    
    describe('End-to-End Review Process', function() {
        it('should complete a full review workflow', function(done) {
            // Step 1: Add a comment
            const testElement = document.querySelector('[data-review-id="test-para-1"]');
            expect(testElement).to.exist;
            
            webReview.addComment('test-range-1', 'This paragraph needs clarification.');
            expect(webReview.comments.size).to.equal(1);
            
            // Step 2: Make a text edit
            const originalText = testElement.textContent;
            const newText = 'This is an updated paragraph with clearer information.';
            
            const changeId = `change-${Date.now()}`;
            webReview.changes.set(changeId, {
                id: changeId,
                elementId: 'test-para-1',
                type: 'text-edit',
                original: originalText,
                modified: newText,
                timestamp: new Date().toISOString(),
                status: 'pending'
            });
            
            expect(webReview.changes.size).to.equal(1);
            
            // Step 3: Switch to author mode
            webReview.switchMode('author');
            expect(webReview.config.mode).to.equal('author');
            
            // Step 4: Review and accept the change
            webReview.acceptChange(changeId);
            const change = webReview.changes.get(changeId);
            expect(change.status).to.equal('accepted');
            
            // Step 5: Reply to the comment
            const commentId = Array.from(webReview.comments.keys())[0];
            const comment = webReview.comments.get(commentId);
            
            // Simulate reply
            if (!comment.replies) comment.replies = [];
            comment.replies.push({
                text: 'Thanks for the feedback. Updated the text.',
                author: 'Author',
                timestamp: new Date().toISOString()
            });
            
            expect(comment.replies).to.have.length(1);
            
            // Step 6: Resolve the comment
            webReview.resolveComment(commentId);
            expect(comment.resolved).to.be.true;
            
            done();
        });
        
        it('should handle batch operations correctly', function() {
            // Add multiple changes
            const changes = [
                {
                    id: 'change1',
                    elementId: 'test-para-1',
                    type: 'text-edit',
                    original: 'Original text 1',
                    modified: 'Modified text 1',
                    status: 'pending'
                },
                {
                    id: 'change2',
                    elementId: 'test-para-2',
                    type: 'text-edit',
                    original: 'Original text 2',
                    modified: 'Modified text 2',
                    status: 'pending'
                },
                {
                    id: 'change3',
                    elementId: 'test-header-1',
                    type: 'text-edit',
                    original: 'Original header',
                    modified: 'Modified header',
                    status: 'accepted'
                }
            ];
            
            changes.forEach(change => {
                webReview.changes.set(change.id, change);
            });
            
            // Switch to author mode and accept all pending changes
            webReview.switchMode('author');
            webReview.acceptAllChanges();
            
            // Verify all pending changes are now accepted
            expect(webReview.changes.get('change1').status).to.equal('accepted');
            expect(webReview.changes.get('change2').status).to.equal('accepted');
            expect(webReview.changes.get('change3').status).to.equal('accepted'); // was already accepted
        });
    });
    
    describe('Cross-Component Integration', function() {
        it('should integrate diff viewer with change tracking', function() {
            const originalText = 'Original paragraph content.';
            const modifiedText = 'Modified paragraph content with changes.';
            
            // Create change
            const changeId = 'test-change-diff';
            webReview.changes.set(changeId, {
                id: changeId,
                elementId: 'test-para-1',
                type: 'text-edit',
                original: originalText,
                modified: modifiedText,
                status: 'pending'
            });
            
            // Test diff generation
            if (webReview.diffViewer) {
                const diff = webReview.diffViewer.createInlineDiff(originalText, modifiedText);
                expect(diff).to.be.a('string');
                expect(diff).to.include('diff');
            }
            
            // Test change preview
            webReview.previewChange(changeId);
            
            const modal = document.querySelector('.change-preview-modal');
            expect(modal).to.exist;
            
            // Cleanup
            modal.remove();
        });
        
        it('should integrate version control with changes', function() {
            if (webReview.versionControl) {
                // Create a change that affects source files
                const change = {
                    id: 'source-change',
                    elementId: 'test-para-1',
                    type: 'text-edit',
                    original: 'Original content',
                    modified: 'Updated content',
                    status: 'accepted'
                };
                
                webReview.changes.set(change.id, change);
                
                // Update embedded sources should reflect the change
                webReview.updateEmbeddedSources(change);
                
                const sourcesScript = document.getElementById('embedded-sources');
                const data = JSON.parse(sourcesScript.textContent);
                
                expect(data.changes).to.be.an('array');
                expect(data.changes.some(c => c.elementId === 'test-para-1')).to.be.true;
            }
        });
    });
    
    describe('UI State Management', function() {
        it('should maintain UI consistency across mode changes', function() {
            // Start in review mode
            expect(webReview.config.mode).to.equal('review');
            expect(document.body.classList.contains('web-review-review')).to.be.true;
            
            // Add some data
            webReview.addComment('test-range', 'Test comment');
            webReview.changes.set('test-change', {
                id: 'test-change',
                status: 'pending'
            });
            
            // Switch to author mode
            webReview.switchMode('author');
            expect(document.body.classList.contains('web-review-author')).to.be.true;
            expect(document.body.classList.contains('web-review-review')).to.be.false;
            
            // UI should still show the data
            expect(webReview.comments.size).to.equal(1);
            expect(webReview.changes.size).to.equal(1);
            
            // Switch to read-only mode
            webReview.switchMode('read-only');
            expect(document.body.classList.contains('web-review-read-only')).to.be.true;
            
            // Data should still be there
            expect(webReview.comments.size).to.equal(1);
            expect(webReview.changes.size).to.equal(1);
        });
        
        it('should handle sidebar toggle correctly', function() {
            const sidebar = document.querySelector('.review-sidebar');
            expect(sidebar).to.exist;
            
            // Initially closed
            expect(sidebar.classList.contains('open')).to.be.false;
            
            // Toggle open
            webReview.toggleSidebar();
            expect(sidebar.classList.contains('open')).to.be.true;
            
            // Toggle closed
            webReview.toggleSidebar();
            expect(sidebar.classList.contains('open')).to.be.false;
        });
    });
    
    describe('Data Persistence', function() {
        it('should persist data across page reload simulation', function() {
            // Add test data
            webReview.addComment('test-range', 'Persistent comment');
            webReview.changes.set('persistent-change', {
                id: 'persistent-change',
                status: 'pending'
            });
            
            // Enable auto-save and save
            webReview.config.storage.autoSave = true;
            webReview.saveToStorage();
            
            // Create new instance (simulating page reload)
            const newWebReview = new WebReview(webReview.config);
            newWebReview.loadStoredData();
            
            // Data should be restored
            expect(newWebReview.comments.size).to.equal(1);
            expect(newWebReview.changes.size).to.equal(1);
            
            const restoredComment = Array.from(newWebReview.comments.values())[0];
            expect(restoredComment.text).to.equal('Persistent comment');
        });
        
        it('should export and import complete review data', async function() {
            // Prepare test data
            webReview.addComment('export-test', 'Export test comment');
            webReview.changes.set('export-change', {
                id: 'export-change',
                elementId: 'test-element',
                type: 'text-edit',
                original: 'original',
                modified: 'modified',
                status: 'pending'
            });
            
            // Export data
            const exportData = await webReview.exportReview();
            
            expect(exportData.comments).to.have.length(1);
            expect(exportData.changes).to.have.length(1);
            expect(exportData.config).to.exist;
            
            // Clear current data
            webReview.comments.clear();
            webReview.changes.clear();
            
            // Create file blob and import
            const blob = new Blob([JSON.stringify(exportData)], { type: 'application/json' });
            const result = await webReview.importReview(blob);
            
            expect(result.success).to.be.true;
            expect(webReview.comments.size).to.equal(1);
            expect(webReview.changes.size).to.equal(1);
            
            // Verify data integrity
            const importedComment = Array.from(webReview.comments.values())[0];
            expect(importedComment.text).to.equal('Export test comment');
        });
    });
    
    describe('Error Handling', function() {
        it('should handle missing DOM elements gracefully', function() {
            // Try to work with non-existent element
            expect(() => {
                webReview.editElement(null);
            }).to.not.throw();
            
            expect(() => {
                webReview.selectElement(null);
            }).to.not.throw();
        });
        
        it('should handle invalid change operations', function() {
            // Try to accept non-existent change
            expect(() => {
                webReview.acceptChange('non-existent-change');
            }).to.not.throw();
            
            // Try to reject non-existent change
            expect(() => {
                webReview.rejectChange('non-existent-change');
            }).to.not.throw();
        });
        
        it('should handle invalid comment operations', function() {
            // Try to reply to non-existent comment
            const mockButton = document.createElement('button');
            const container = document.createElement('div');
            const textarea = document.createElement('textarea');
            textarea.value = 'test reply';
            container.appendChild(textarea);
            container.appendChild(mockButton);
            
            expect(() => {
                webReview.replyToComment('non-existent-comment', mockButton);
            }).to.not.throw();
            
            // Try to resolve non-existent comment
            expect(() => {
                webReview.resolveComment('non-existent-comment');
            }).to.not.throw();
        });
    });
});