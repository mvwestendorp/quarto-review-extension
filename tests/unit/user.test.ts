import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UserModule } from '@modules/user';
import type { User } from '@/types';

describe('UserModule', () => {
  let userModule: UserModule;

  beforeEach(() => {
    localStorage.clear();
    userModule = new UserModule();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Authentication', () => {
    it('should start with no authenticated user', () => {
      expect(userModule.isAuthenticated()).toBe(false);
      expect(userModule.getCurrentUser()).toBeNull();
    });

    it('should login a user', () => {
      const user = UserModule.createEditor('1', 'John Doe', 'john@example.com');

      userModule.login(user);

      expect(userModule.isAuthenticated()).toBe(true);
      expect(userModule.getCurrentUser()).toEqual(user);
    });

    it('should logout a user', () => {
      const user = UserModule.createEditor('1', 'John Doe');
      userModule.login(user);

      userModule.logout();

      expect(userModule.isAuthenticated()).toBe(false);
      expect(userModule.getCurrentUser()).toBeNull();
    });

    it('should persist user to localStorage', () => {
      const user = UserModule.createEditor('1', 'John Doe');
      userModule.login(user);

      const stored = localStorage.getItem('quarto-review-user');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toEqual(user);
    });

    it('should load user from localStorage', () => {
      const user = UserModule.createEditor('1', 'John Doe');
      localStorage.setItem('quarto-review-user', JSON.stringify(user));

      const newUserModule = new UserModule();

      expect(newUserModule.isAuthenticated()).toBe(true);
      expect(newUserModule.getCurrentUser()).toEqual(user);
    });

    it('should clear localStorage on logout', () => {
      const user = UserModule.createEditor('1', 'John Doe');
      userModule.login(user);

      userModule.logout();

      expect(localStorage.getItem('quarto-review-user')).toBeNull();
    });
  });

  describe('Roles and permissions', () => {
    it('should check for specific role', () => {
      const editor = UserModule.createEditor('1', 'Editor');
      userModule.login(editor);

      expect(userModule.hasRole('editor')).toBe(true);
      expect(userModule.hasRole('admin')).toBe(false);
      expect(userModule.hasRole('viewer')).toBe(false);
    });

    it('should allow viewing for any authenticated user', () => {
      const viewer = UserModule.createGuest('Viewer');
      userModule.login(viewer);

      expect(userModule.canView()).toBe(true);
    });

    it('should not allow viewing for unauthenticated users', () => {
      expect(userModule.canView()).toBe(false);
    });

    it('should allow editing for editors', () => {
      const editor = UserModule.createEditor('1', 'Editor');
      userModule.login(editor);

      expect(userModule.canEdit()).toBe(true);
    });

    it('should allow editing for admins', () => {
      const admin = UserModule.createAdmin('1', 'Admin');
      userModule.login(admin);

      expect(userModule.canEdit()).toBe(true);
    });

    it('should not allow editing for viewers', () => {
      const viewer = UserModule.createGuest();
      userModule.login(viewer);

      expect(userModule.canEdit()).toBe(false);
    });

    it('should identify admins', () => {
      const admin = UserModule.createAdmin('1', 'Admin');
      userModule.login(admin);

      expect(userModule.isAdmin()).toBe(true);
    });

    it('should allow commenting for authenticated users', () => {
      const viewer = UserModule.createGuest();
      userModule.login(viewer);

      expect(userModule.canComment()).toBe(true);
    });

    it('should allow pushing for editors', () => {
      const editor = UserModule.createEditor('1', 'Editor');
      userModule.login(editor);

      expect(userModule.canPush()).toBe(true);
    });

    it('should not allow pushing for viewers', () => {
      const viewer = UserModule.createGuest();
      userModule.login(viewer);

      expect(userModule.canPush()).toBe(false);
    });

    it('should allow merging only for admins', () => {
      const editor = UserModule.createEditor('1', 'Editor');
      userModule.login(editor);

      expect(userModule.canMerge()).toBe(false);

      const admin = UserModule.createAdmin('2', 'Admin');
      userModule.login(admin);

      expect(userModule.canMerge()).toBe(true);
    });
  });

  describe('Comment permissions', () => {
    it('should allow users to delete their own comments', () => {
      const user = UserModule.createEditor('user-1', 'User');
      userModule.login(user);

      expect(userModule.canDeleteComment('user-1')).toBe(true);
      expect(userModule.canDeleteComment('user-2')).toBe(false);
    });

    it('should allow admins to delete any comment', () => {
      const admin = UserModule.createAdmin('admin-1', 'Admin');
      userModule.login(admin);

      expect(userModule.canDeleteComment('user-1')).toBe(true);
      expect(userModule.canDeleteComment('user-2')).toBe(true);
    });

    it('should allow editors to resolve comments', () => {
      const editor = UserModule.createEditor('1', 'Editor');
      userModule.login(editor);

      expect(userModule.canResolveComment()).toBe(true);
    });

    it('should not allow viewers to resolve comments', () => {
      const viewer = UserModule.createGuest();
      userModule.login(viewer);

      expect(userModule.canResolveComment()).toBe(false);
    });
  });

  describe('User updates', () => {
    it('should update user information', () => {
      const user = UserModule.createEditor('1', 'John');
      userModule.login(user);

      userModule.updateUser({ name: 'John Doe', email: 'john@example.com' });

      const updated = userModule.getCurrentUser();
      expect(updated?.name).toBe('John Doe');
      expect(updated?.email).toBe('john@example.com');
    });

    it('should persist updates to localStorage', () => {
      const user = UserModule.createEditor('1', 'John');
      userModule.login(user);

      userModule.updateUser({ name: 'John Doe' });

      const stored = JSON.parse(localStorage.getItem('quarto-review-user')!);
      expect(stored.name).toBe('John Doe');
    });
  });

  describe('Session management', () => {
    it('should logout after session timeout', () => {
      vi.useFakeTimers();

      const user = UserModule.createEditor('1', 'John');
      const shortTimeout = new UserModule({ sessionTimeout: 1000 });
      shortTimeout.login(user);

      expect(shortTimeout.isAuthenticated()).toBe(true);

      vi.advanceTimersByTime(1001);

      expect(shortTimeout.isAuthenticated()).toBe(false);

      vi.useRealTimers();
    });

    it('should refresh session', () => {
      vi.useFakeTimers();

      const user = UserModule.createEditor('1', 'John');
      const shortTimeout = new UserModule({ sessionTimeout: 1000 });
      shortTimeout.login(user);

      vi.advanceTimersByTime(500);
      shortTimeout.refreshSession();

      vi.advanceTimersByTime(600);
      expect(shortTimeout.isAuthenticated()).toBe(true);

      vi.advanceTimersByTime(500);
      expect(shortTimeout.isAuthenticated()).toBe(false);

      vi.useRealTimers();
    });
  });

  describe('User factory methods', () => {
    it('should create guest user', () => {
      const guest = UserModule.createGuest('Test Guest');

      expect(guest.name).toBe('Test Guest');
      expect(guest.role).toBe('viewer');
      expect(guest.id).toMatch(/^guest-/);
    });

    it('should create editor user', () => {
      const editor = UserModule.createEditor('1', 'Editor', 'editor@example.com');

      expect(editor.id).toBe('1');
      expect(editor.name).toBe('Editor');
      expect(editor.email).toBe('editor@example.com');
      expect(editor.role).toBe('editor');
    });

    it('should create admin user', () => {
      const admin = UserModule.createAdmin('1', 'Admin', 'admin@example.com');

      expect(admin.id).toBe('1');
      expect(admin.name).toBe('Admin');
      expect(admin.email).toBe('admin@example.com');
      expect(admin.role).toBe('admin');
    });
  });

  describe('Permission summary', () => {
    it('should get permission summary for editor', () => {
      const editor = UserModule.createEditor('1', 'Editor');
      userModule.login(editor);

      const permissions = userModule.getPermissions();

      expect(permissions).toEqual({
        canView: true,
        canEdit: true,
        canComment: true,
        canPush: true,
        canMerge: false,
        isAdmin: false,
      });
    });

    it('should get permission summary for admin', () => {
      const admin = UserModule.createAdmin('1', 'Admin');
      userModule.login(admin);

      const permissions = userModule.getPermissions();

      expect(permissions).toEqual({
        canView: true,
        canEdit: true,
        canComment: true,
        canPush: true,
        canMerge: true,
        isAdmin: true,
      });
    });

    it('should get permission summary for viewer', () => {
      const viewer = UserModule.createGuest();
      userModule.login(viewer);

      const permissions = userModule.getPermissions();

      expect(permissions).toEqual({
        canView: true,
        canEdit: false,
        canComment: true,
        canPush: false,
        canMerge: false,
        isAdmin: false,
      });
    });
  });
});
