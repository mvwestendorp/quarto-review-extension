// Unit Tests for Diff Viewer Component

describe('Unit: DiffViewer Class', function() {
    let diffViewer;
    
    beforeEach(function() {
        diffViewer = new DiffViewer('side-by-side');
    });
    
    describe('Initialization', function() {
        it('should initialize with correct style', function() {
            expect(diffViewer.getStyle()).to.equal('side-by-side');
        });
        
        it('should initialize with inline style', function() {
            const inlineDiffViewer = new DiffViewer('inline');
            expect(inlineDiffViewer.getStyle()).to.equal('inline');
        });
        
        it('should handle missing diff2html gracefully', function() {
            // Temporarily hide Diff2Html
            const originalDiff2Html = window.Diff2Html;
            delete window.Diff2Html;
            
            const fallbackViewer = new DiffViewer();
            expect(fallbackViewer.initialized).to.be.false;
            
            // Restore
            window.Diff2Html = originalDiff2Html;
        });
    });
    
    describe('Diff Algorithm', function() {
        it('should compute simple line differences', function() {
            const original = ['line 1', 'line 2', 'line 3'];
            const modified = ['line 1', 'modified line 2', 'line 3'];
            
            const diff = diffViewer.computeDiff(original, modified);
            
            expect(diff).to.have.length(4); // unchanged, removed, added, unchanged
            expect(diff[0].type).to.equal('unchanged');
            expect(diff[1].type).to.equal('removed');
            expect(diff[2].type).to.equal('added');
            expect(diff[3].type).to.equal('unchanged');
        });
        
        it('should handle additions', function() {
            const original = ['line 1', 'line 2'];
            const modified = ['line 1', 'line 2', 'new line 3'];
            
            const diff = diffViewer.computeDiff(original, modified);
            
            const addedLines = diff.filter(line => line.type === 'added');
            expect(addedLines).to.have.length(1);
            expect(addedLines[0].content).to.equal('new line 3');
        });
        
        it('should handle deletions', function() {
            const original = ['line 1', 'line 2', 'line 3'];
            const modified = ['line 1', 'line 3'];
            
            const diff = diffViewer.computeDiff(original, modified);
            
            const removedLines = diff.filter(line => line.type === 'removed');
            expect(removedLines).to.have.length(1);
            expect(removedLines[0].content).to.equal('line 2');
        });
        
        it('should handle completely different content', function() {
            const original = ['apple', 'banana'];
            const modified = ['cherry', 'date'];
            
            const diff = diffViewer.computeDiff(original, modified);
            
            const removedLines = diff.filter(line => line.type === 'removed');
            const addedLines = diff.filter(line => line.type === 'added');
            
            expect(removedLines).to.have.length(2);
            expect(addedLines).to.have.length(2);
        });
    });
    
    describe('Unified Diff Generation', function() {
        it('should create valid unified diff format', function() {
            const original = 'line 1\\nline 2\\nline 3';
            const modified = 'line 1\\nmodified line 2\\nline 3';
            
            const unifiedDiff = diffViewer.createUnifiedDiff(original, modified, 'test.txt');
            
            expect(unifiedDiff).to.include('--- a/test.txt');
            expect(unifiedDiff).to.include('+++ b/test.txt');
            expect(unifiedDiff).to.include('@@');
            expect(unifiedDiff).to.include('-line 2');
            expect(unifiedDiff).to.include('+modified line 2');
        });
        
        it('should handle empty differences', function() {
            const original = 'same content';
            const modified = 'same content';
            
            const unifiedDiff = diffViewer.createUnifiedDiff(original, modified);
            
            expect(unifiedDiff).to.include('--- a/text');
            expect(unifiedDiff).to.include('+++ b/text');
            expect(unifiedDiff).to.include(' same content');
        });
    });
    
    describe('HTML Diff Generation', function() {
        it('should create HTML diff when diff2html is available', function() {
            if (typeof Diff2Html !== 'undefined') {
                const original = 'original text';
                const modified = 'modified text';
                
                const htmlDiff = diffViewer.createHtmlDiff(original, modified);
                
                expect(htmlDiff).to.be.a('string');
                expect(htmlDiff).to.include('diff');
            } else {
                // Should fallback to custom implementation
                const original = 'original text';
                const modified = 'modified text';
                
                const htmlDiff = diffViewer.createHtmlDiff(original, modified);
                
                expect(htmlDiff).to.include('fallback-diff');
            }
        });
        
        it('should create inline diff correctly', function() {
            const original = 'line 1\\nline 2';
            const modified = 'line 1\\nmodified line 2';
            
            const inlineDiff = diffViewer.createInlineDiff(original, modified);
            
            expect(inlineDiff).to.be.a('string');
            expect(inlineDiff).to.include('diff');
        });
    });
    
    describe('Fallback Diff Implementation', function() {
        let fallbackViewer;
        
        beforeEach(function() {
            // Create viewer that will use fallback
            fallbackViewer = new DiffViewer();
            fallbackViewer.initialized = false;
        });
        
        it('should create fallback side-by-side diff', function() {
            const original = 'original text';
            const modified = 'modified text';
            
            const fallbackDiff = fallbackViewer.createFallbackDiff(original, modified);
            
            expect(fallbackDiff).to.include('fallback-diff');
            expect(fallbackDiff).to.include('side-by-side');
            expect(fallbackDiff).to.include('diff-side original');
            expect(fallbackDiff).to.include('diff-side modified');
        });
        
        it('should create fallback inline diff', function() {
            fallbackViewer.style = 'inline';
            const original = 'original text';
            const modified = 'modified text';
            
            const fallbackDiff = fallbackViewer.createFallbackDiff(original, modified);
            
            expect(fallbackDiff).to.include('inline');
            expect(fallbackDiff).to.include('diff-line');
        });
        
        it('should escape HTML in fallback diff', function() {
            const original = '<script>alert("xss")</script>';
            const modified = '<div>safe content</div>';
            
            const fallbackDiff = fallbackViewer.createFallbackDiff(original, modified);
            
            expect(fallbackDiff).to.not.include('<script>');
            expect(fallbackDiff).to.include('&lt;script&gt;');
        });
    });
    
    describe('Changes Overview', function() {
        it('should create changes overview with no changes', function() {
            const changes = new Map();
            
            const overview = diffViewer.createChangesOverviewContent(changes);
            
            expect(overview).to.include('No changes to display');
        });
        
        it('should create changes overview with multiple changes', function() {
            const changes = new Map([
                ['change1', {
                    id: 'change1',
                    type: 'text-edit',
                    elementId: 'element1',
                    original: 'original text',
                    modified: 'modified text',
                    status: 'pending'
                }],
                ['change2', {
                    id: 'change2',
                    type: 'text-edit',
                    elementId: 'element2',
                    original: 'old content',
                    modified: 'new content',
                    status: 'accepted'
                }]
            ]);
            
            const overview = diffViewer.createChangesOverviewContent(changes);
            
            expect(overview).to.include('change-overview-item');
            expect(overview).to.include('element1');
            expect(overview).to.include('element2');
            expect(overview).to.include('pending');
            expect(overview).to.include('accepted');
        });
        
        it('should show changes overview modal', function() {
            const changes = new Map([
                ['test-change', {
                    type: 'text-edit',
                    elementId: 'test-element',
                    original: 'original',
                    modified: 'modified',
                    status: 'pending'
                }]
            ]);
            
            diffViewer.showChangesOverview(changes);
            
            const modal = document.querySelector('.diff-modal-overlay');
            expect(modal).to.exist;
            expect(modal.style.position).to.equal('fixed');
            
            // Cleanup
            modal.remove();
        });
    });
    
    describe('Status Colors', function() {
        it('should return correct colors for different statuses', function() {
            expect(diffViewer.getStatusColor('pending')).to.equal('#fef3c7');
            expect(diffViewer.getStatusColor('accepted')).to.equal('#d1fae5');
            expect(diffViewer.getStatusColor('rejected')).to.equal('#fee2e2');
            expect(diffViewer.getStatusColor('unknown')).to.equal('#f3f4f6');
        });
    });
    
    describe('Style Management', function() {
        it('should change diff style', function() {
            diffViewer.setStyle('inline');
            expect(diffViewer.getStyle()).to.equal('inline');
            
            diffViewer.setStyle('side-by-side');
            expect(diffViewer.getStyle()).to.equal('side-by-side');
        });
    });
    
    describe('HTML Escaping', function() {
        it('should escape HTML characters correctly', function() {
            const maliciousText = '<script>alert("xss")</script>';
            const escaped = diffViewer.escapeHtml(maliciousText);
            
            expect(escaped).to.equal('&lt;script&gt;alert("xss")&lt;/script&gt;');
        });
        
        it('should handle special characters', function() {
            const specialText = 'Text with "quotes" and & ampersands';
            const escaped = diffViewer.escapeHtml(specialText);
            
            expect(escaped).to.include('&quot;');
            expect(escaped).to.include('&amp;');
        });
    });
});