// Unit Tests for Review UI Component

describe('Unit: WebReview Class', function() {
    let webReview;
    
    beforeEach(function() {
        // Reset localStorage
        localStorage.clear();
        
        // Create fresh instance
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
        // Cleanup
        cleanupMockElements();
        localStorage.clear();
    });
    
    describe('Initialization', function() {
        it('should initialize with correct default config', function() {
            expect(webReview.config.mode).to.equal('review');
            expect(webReview.config.features.comments).to.be.true;
            expect(webReview.config.features.editing).to.be.true;
        });
        
        it('should create necessary UI elements', function() {
            expect(document.querySelector('.review-toolbar')).to.exist;
            expect(document.querySelector('.review-sidebar')).to.exist;
            expect(document.querySelector('.review-mode-indicator')).to.exist;
        });
        
        it('should initialize empty collections', function() {
            expect(webReview.comments.size).to.equal(0);
            expect(webReview.changes.size).to.equal(0);
        });
    });
    
    describe('Comment System', function() {
        it('should add comments correctly', function() {
            const mockRange = 'test-range-encoded';
            const commentText = 'Test comment';
            
            webReview.addComment(mockRange, commentText);
            
            expect(webReview.comments.size).to.equal(1);
            const comment = Array.from(webReview.comments.values())[0];
            expect(comment.text).to.equal(commentText);
            expect(comment.author).to.equal('Reviewer');
        });
        
        it('should handle comment replies', function() {
            // Add initial comment
            webReview.addComment('test-range', 'Initial comment');
            const commentId = Array.from(webReview.comments.keys())[0];
            
            // Create mock button structure
            const mockButton = document.createElement('button');
            const mockTextarea = document.createElement('textarea');
            mockTextarea.value = 'Reply text';
            const container = document.createElement('div');
            container.appendChild(mockTextarea);
            container.appendChild(mockButton);
            
            webReview.replyToComment(commentId, mockButton);
            
            const comment = webReview.comments.get(commentId);
            expect(comment.replies).to.have.length(1);
            expect(comment.replies[0].text).to.equal('Reply text');
        });
        
        it('should resolve comments', function() {
            webReview.addComment('test-range', 'Test comment');
            const commentId = Array.from(webReview.comments.keys())[0];
            
            webReview.resolveComment(commentId);
            
            const comment = webReview.comments.get(commentId);
            expect(comment.resolved).to.be.true;
        });
    });
    
    describe('Change Tracking', function() {
        it('should track text changes', function() {
            const elementId = 'test-element';
            const originalText = 'Original text';
            const modifiedText = 'Modified text';
            
            // Mock element
            const element = document.createElement('div');
            element.setAttribute('data-review-id', elementId);
            element.textContent = originalText;
            document.body.appendChild(element);
            
            // Simulate change
            const changeId = `change-${Date.now()}`;
            webReview.changes.set(changeId, {
                id: changeId,
                elementId: elementId,
                type: 'text-edit',
                original: originalText,
                modified: modifiedText,
                timestamp: new Date().toISOString(),
                status: 'pending'
            });
            
            expect(webReview.changes.size).to.equal(1);
            const change = webReview.changes.get(changeId);
            expect(change.original).to.equal(originalText);
            expect(change.modified).to.equal(modifiedText);
            
            element.remove();
        });
        
        it('should accept changes', function() {
            const elementId = 'test-element';
            const element = document.createElement('div');
            element.setAttribute('data-review-id', elementId);
            element.textContent = 'Original text';
            document.body.appendChild(element);
            
            const changeId = 'test-change';
            webReview.changes.set(changeId, {
                id: changeId,
                elementId: elementId,
                type: 'text-edit',
                original: 'Original text',
                modified: 'Modified text',
                status: 'pending'
            });
            
            webReview.acceptChange(changeId);
            
            const change = webReview.changes.get(changeId);
            expect(change.status).to.equal('accepted');
            expect(element.textContent).to.equal('Modified text');
            
            element.remove();
        });
        
        it('should reject changes', function() {
            const changeId = 'test-change';
            webReview.changes.set(changeId, {
                id: changeId,
                elementId: 'test-element',
                type: 'text-edit',
                original: 'Original text',
                modified: 'Modified text',
                status: 'pending'
            });
            
            webReview.rejectChange(changeId);
            
            const change = webReview.changes.get(changeId);
            expect(change.status).to.equal('rejected');
        });
    });
    
    describe('Mode Switching', function() {
        it('should switch between modes correctly', function() {
            webReview.switchMode('author');
            expect(webReview.config.mode).to.equal('author');
            expect(document.body.classList.contains('web-review-author')).to.be.true;
            
            webReview.switchMode('read-only');
            expect(webReview.config.mode).to.equal('read-only');
            expect(document.body.classList.contains('web-review-read-only')).to.be.true;
        });
        
        it('should reject invalid modes', function() {
            const originalMode = webReview.config.mode;
            webReview.switchMode('invalid-mode');
            expect(webReview.config.mode).to.equal(originalMode);
        });
        
        it('should update UI for different modes', function() {
            webReview.switchMode('read-only');
            
            const addCommentButton = document.getElementById('add-comment');
            if (addCommentButton) {
                expect(addCommentButton.style.display).to.equal('none');
            }
        });
    });
    
    describe('Batch Operations', function() {
        beforeEach(function() {
            webReview.switchMode('author');
            
            // Add test changes
            webReview.changes.set('change1', {
                id: 'change1',
                elementId: 'element1',
                status: 'pending'
            });
            webReview.changes.set('change2', {
                id: 'change2',
                elementId: 'element2',
                status: 'pending'
            });
            webReview.changes.set('change3', {
                id: 'change3',
                elementId: 'element3',
                status: 'accepted'
            });
        });
        
        it('should accept all pending changes', function() {
            webReview.acceptAllChanges();
            
            expect(webReview.changes.get('change1').status).to.equal('accepted');
            expect(webReview.changes.get('change2').status).to.equal('accepted');
            expect(webReview.changes.get('change3').status).to.equal('accepted'); // unchanged
        });
        
        it('should reject all pending changes', function() {
            webReview.rejectAllChanges();
            
            expect(webReview.changes.get('change1').status).to.equal('rejected');
            expect(webReview.changes.get('change2').status).to.equal('rejected');
            expect(webReview.changes.get('change3').status).to.equal('accepted'); // unchanged
        });
        
        it('should not operate in non-author mode', function() {
            webReview.switchMode('review');
            webReview.acceptAllChanges();
            
            // Changes should remain pending
            expect(webReview.changes.get('change1').status).to.equal('pending');
            expect(webReview.changes.get('change2').status).to.equal('pending');
        });
    });
    
    describe('Storage and Persistence', function() {
        it('should save to localStorage when autoSave is enabled', function() {
            webReview.config.storage.autoSave = true;
            webReview.addComment('test-range', 'Test comment');
            
            const stored = localStorage.getItem('web-review-data');
            expect(stored).to.not.be.null;
            
            const data = JSON.parse(stored);
            expect(data.comments).to.have.length(1);
        });
        
        it('should load from localStorage', function() {
            const testData = {
                comments: [['comment1', { id: 'comment1', text: 'Test comment' }]],
                changes: [],
                timestamp: new Date().toISOString()
            };
            
            localStorage.setItem('web-review-data', JSON.stringify(testData));
            
            webReview.loadStoredData();
            
            expect(webReview.comments.size).to.equal(1);
            expect(webReview.comments.get('comment1').text).to.equal('Test comment');
        });
        
        it('should handle corrupted storage gracefully', function() {
            localStorage.setItem('web-review-data', 'invalid-json');
            
            expect(() => webReview.loadStoredData()).to.not.throw();
            expect(webReview.comments.size).to.equal(0);
        });
    });
    
    describe('Export/Import', function() {
        it('should export review data correctly', async function() {
            webReview.addComment('test-range', 'Test comment');
            
            const exportData = await webReview.exportReview();
            
            expect(exportData.comments).to.have.length(1);
            expect(exportData.comments[0].text).to.equal('Test comment');
            expect(exportData.timestamp).to.be.a('string');
            expect(exportData.config).to.deep.equal(webReview.config);
        });
        
        it('should import review data correctly', async function() {
            const testFile = new Blob([JSON.stringify({
                comments: [{ id: 'test-comment', text: 'Imported comment' }],
                changes: [{ id: 'test-change', status: 'pending' }]
            })], { type: 'application/json' });
            
            const result = await webReview.importReview(testFile);
            
            expect(result.success).to.be.true;
            expect(webReview.comments.size).to.equal(1);
            expect(webReview.changes.size).to.equal(1);
        });
        
        it('should handle invalid import data', async function() {
            const invalidFile = new Blob(['invalid json'], { type: 'application/json' });
            
            const result = await webReview.importReview(invalidFile);
            
            expect(result.success).to.be.false;
            expect(result.error).to.be.a('string');
        });
    });
});