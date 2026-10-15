/**
 * Role → admin-access mapping. Guards the regressions behind "Super Admin sees
 * normal access": the role must come from the server profile, Super Admin must
 * get every section, and Manager / Editor must keep their baseline sections.
 */
import { describe, it, expect } from 'vitest';
import {
  buildUserFromProfile, userCanAccessAdmin, ALL_PERMISSIONS, ROLE_DEFAULT_PERMISSIONS,
} from '@/context/AuthContext';

const profile = (role, effectivePermissions) => ({ email: 'x@navgrow.org', fullName: 'X', role, effectivePermissions });

describe('buildUserFromProfile', () => {
  it('treats SUPER_ADMIN as staff with every permission', () => {
    const u = buildUserFromProfile({ roles: ['ROLE_USER'] }, profile('SUPER_ADMIN', []));
    expect(u.isSuperAdmin).toBe(true);
    expect(u.roles).toEqual(['ROLE_SUPER_ADMIN']);
    expect(new Set(u.permissions)).toEqual(new Set(ALL_PERMISSIONS));
    expect(userCanAccessAdmin(u)).toBe(true);
  });

  it('server role wins over a stale cached role', () => {
    const stale = { roles: ['ROLE_USER'], isSuperAdmin: false, permissions: [] };
    const u = buildUserFromProfile(stale, profile('SUPER_ADMIN'));
    expect(u.isSuperAdmin).toBe(true);
  });

  it('gives a MANAGER the role baseline even if the API sent no permissions', () => {
    const u = buildUserFromProfile(null, profile('MANAGER'));
    ROLE_DEFAULT_PERMISSIONS.MANAGER.forEach(p => expect(u.permissions).toContain(p));
    expect(u.permissions).not.toContain('USERS');
    expect(userCanAccessAdmin(u)).toBe(true);
  });

  it('adds custom grants on top of the EDITOR baseline', () => {
    const u = buildUserFromProfile(null, profile('EDITOR', ['PRODUCTS']));
    expect(u.permissions).toContain('PRODUCTS');
    expect(u.permissions).toContain('NEWS');
  });

  it('a plain customer has no admin access unless granted a section', () => {
    expect(userCanAccessAdmin(buildUserFromProfile(null, profile('USER', [])))).toBe(false);
    expect(userCanAccessAdmin(buildUserFromProfile(null, profile('USER', ['ORDERS'])))).toBe(true);
  });

  it('never stores the raw comma-string permissions from the entity', () => {
    const u = buildUserFromProfile(null, { ...profile('USER', ['NEWS']), permissions: 'NEWS' });
    expect(Array.isArray(u.permissions)).toBe(true);
  });
});
