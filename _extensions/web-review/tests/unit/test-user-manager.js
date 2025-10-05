/**
 * Unit Tests for User Manager Module
 */

describe('Unit: UserManager', function() {
  let userManager;

  beforeEach(function() {
    // Clear localStorage before each test
    localStorage.removeItem('webReviewUserColors');
    userManager = new UserManager();
  });

  describe('constructor', function() {
    it('should initialize with empty user colors', function() {
      expect(userManager.userColors).to.be.an('object');
      expect(Object.keys(userManager.userColors)).to.have.lengthOf(0);
    });

    it('should have predefined colors', function() {
      expect(userManager.predefinedColors).to.be.an('array');
      expect(userManager.predefinedColors).to.have.lengthOf(10);
      expect(userManager.predefinedColors[0]).to.equal('#007acc');
    });

    it('should load existing colors from localStorage', function() {
      localStorage.setItem('webReviewUserColors', JSON.stringify({ 'Alice': '#007acc' }));
      const manager = new UserManager();
      expect(manager.userColors['Alice']).to.equal('#007acc');
    });
  });

  describe('getCurrentUser', function() {
    it('should return Anonymous when no git provider', function() {
      window.gitProvider = null;
      expect(userManager.getCurrentUser()).to.equal('Anonymous');
    });

    it('should return Anonymous when git provider not authenticated', function() {
      window.gitProvider = { isAuthenticated: () => false };
      expect(userManager.getCurrentUser()).to.equal('Anonymous');
    });

    it('should return username from git provider when authenticated', function() {
      window.gitProvider = {
        isAuthenticated: () => true,
        currentUser: 'TestUser'
      };
      expect(userManager.getCurrentUser()).to.equal('TestUser');
    });

    it('should return Anonymous when git provider has no user', function() {
      window.gitProvider = {
        isAuthenticated: () => true,
        currentUser: null
      };
      expect(userManager.getCurrentUser()).to.equal('Anonymous');
    });
  });

  describe('getUserColor', function() {
    it('should return default color for null username', function() {
      expect(userManager.getUserColor(null)).to.equal('#666');
    });

    it('should return default color for empty username', function() {
      expect(userManager.getUserColor('')).to.equal('#666');
    });

    it('should assign first predefined color to new user', function() {
      const color = userManager.getUserColor('Alice');
      expect(color).to.equal('#007acc'); // First color
    });

    it('should assign different colors to different users', function() {
      const color1 = userManager.getUserColor('Alice');
      const color2 = userManager.getUserColor('Bob');
      expect(color1).to.not.equal(color2);
    });

    it('should return same color for same user', function() {
      const color1 = userManager.getUserColor('Alice');
      const color2 = userManager.getUserColor('Alice');
      expect(color1).to.equal(color2);
    });

    it('should persist colors to localStorage', function() {
      userManager.getUserColor('Alice');
      const stored = JSON.parse(localStorage.getItem('webReviewUserColors'));
      expect(stored).to.have.property('Alice');
    });

    it('should cycle through colors when all are used', function() {
      // Assign all 10 predefined colors
      for (let i = 0; i < 10; i++) {
        userManager.getUserColor(`User${i}`);
      }

      // 11th user should get first color again (modulo)
      const color11 = userManager.getUserColor('User10');
      expect(color11).to.be.oneOf(userManager.predefinedColors);
    });
  });

  describe('getUserInitials', function() {
    it('should return ? for null username', function() {
      expect(userManager.getUserInitials(null)).to.equal('?');
    });

    it('should return ? for empty username', function() {
      expect(userManager.getUserInitials('')).to.equal('?');
    });

    it('should return first two letters for single word', function() {
      expect(userManager.getUserInitials('Alice')).to.equal('AL');
    });

    it('should return first letter of each word for two words', function() {
      expect(userManager.getUserInitials('John Doe')).to.equal('JD');
    });

    it('should return first and last letters for multiple words', function() {
      expect(userManager.getUserInitials('John Q Public')).to.equal('JP');
    });

    it('should return uppercase initials', function() {
      expect(userManager.getUserInitials('alice')).to.equal('AL');
      expect(userManager.getUserInitials('john doe')).to.equal('JD');
    });
  });

  afterEach(function() {
    // Clean up
    delete window.gitProvider;
    localStorage.removeItem('webReviewUserColors');
  });
});
