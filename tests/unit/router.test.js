import { describe, expect, it } from 'vitest';
import { route, scopeCookie } from '../../deploy/router.mjs';

describe('router', () => {
  it('sends staging and prod to their fixed ports', () => {
    expect(route('staging.dev.example.com', '/api/version')).toEqual({ port: 4001, path: '/api/version' });
    expect(route('prod.dev.example.com:443', '/')).toEqual({ port: 4002, path: '/' });
  });

  it('strips the preview prefix and picks the PR port', () => {
    expect(route('preview.dev.example.com', '/pr-12/api/todos?x=1')).toEqual({
      port: 5012,
      path: '/api/todos?x=1',
      prefix: '/pr-12',
    });
  });

  it('adds the trailing slash so relative links resolve', () => {
    expect(route('preview.dev.example.com', '/pr-7')).toEqual({ redirect: '/pr-7/' });
  });

  it('refuses hosts and paths it does not know', () => {
    expect(route('www.dev.example.com', '/')).toBeNull();
    expect(route('preview.dev.example.com', '/')).toBeNull();
    expect(route('preview.dev.example.com', '/pr-1234/')).toBeNull();
    expect(route(undefined, '/')).toBeNull();
  });

  it('scopes the session cookie to the preview', () => {
    expect(scopeCookie('sid=abc; HttpOnly; Path=/; Max-Age=60', '/pr-3')).toBe(
      'sid=abc; HttpOnly; Path=/pr-3/; Max-Age=60',
    );
  });
});
