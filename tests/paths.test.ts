import {afterEach,describe,expect,it,vi} from 'vitest';
import {routePath,sitePath} from '../src/lib/paths';

afterEach(()=>vi.unstubAllEnvs());

describe('deployment paths',()=>{
  it.each(['/', '/silkML/'])('keeps design edits and recovery fragments inside %s',base=>{
    vi.stubEnv('BASE_URL',base);
    expect(sitePath('/ko/designs/dress/?edit=selection-1')).toBe(`${base}ko/designs/dress/?edit=selection-1`);
    expect(sitePath('/en/restore/#saved-choices')).toBe(`${base}en/restore/#saved-choices`);
    expect(sitePath('/brand/michelle-logo.png')).toBe(`${base}brand/michelle-logo.png`);
    const path=routePath(`${base}ko/designs/dress/`).replace(/^\/(ko|en)(?=\/|$)/,'');
    expect(sitePath(`/en${path}`)).toBe(`${base}en/designs/dress/`);
  });

  it('does not strip a different repository with a similar prefix',()=>{
    vi.stubEnv('BASE_URL','/silkML/');
    expect(routePath('/silkML-other/ko/')).toBe('/silkML-other/ko/');
    expect(routePath('/silkML')).toBe('/');
  });
});
