import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Integratsiya shartnomasi testi.
 *
 * Uch panel (mijoz, admin, zal egasi) bitta backendga tayanadi. Frontend
 * chaqirayotgan endpoint serverda ro'yxatdan o'tmagan bo'lsa, bu faqat ishga
 * tushirilganda 404 bo'lib bilinadi. Bu test shunday uzilishlarni build
 * paytida ushlaydi.
 */

const ROOT = join(import.meta.dirname, '..', '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(p)) out.push(p);
  }
  return out;
}

/** Serverda ro'yxatdan o'tgan barcha yo'llar */
function registeredRoutes(): string[] {
  const files = [
    'server/routes.ts', 'server/scheduleRoutes.ts',
    'server/mobileRoutes.ts', 'server/telegram.ts',
    'server/replit_integrations/object_storage/routes.ts',
  ];
  const routes: string[] = [];
  for (const rel of files) {
    let src: string;
    try { src = readFileSync(join(ROOT, rel), 'utf8'); } catch { continue; }
    // app.get('/api/x', ...) va router.get('/x', ...)
    for (const m of src.matchAll(/\bapp\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]/g)) {
      routes.push(m[2]);
    }
    for (const m of src.matchAll(/\brouter\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]/g)) {
      routes.push('/api/mobile/v1' + m[2]);
    }
  }
  return routes;
}

/** Frontend chaqirayotgan barcha /api yo'llari */
function clientCalls(): Array<{ file: string; path: string }> {
  const calls: Array<{ file: string; path: string }> = [];
  for (const file of walk(join(ROOT, 'client', 'src'))) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/['"`](\/api\/[^'"`\s]*)['"`]/g)) {
      calls.push({ file: file.replace(ROOT + '/', ''), path: m[1] });
    }
    // Shablonli yo'llar: `/api/gyms/${id}/schedule`
    for (const m of src.matchAll(/`(\/api\/[^`]*)`/g)) {
      calls.push({ file: file.replace(ROOT + '/', ''), path: m[1] });
    }
  }
  return calls;
}

/** `/api/gyms/:id/rate` shaklini `/api/gyms/${x}/rate` bilan solishtirish */
function matches(routePattern: string, callPath: string): boolean {
  const routeParts = routePattern.split('/');
  // Shablon o'rniga bo'sh joy: ${...} -> bitta segment
  const callParts = callPath.replace(/\$\{[^}]*\}/g, ':param').split('/');
  if (routeParts.length !== callParts.length) return false;
  return routeParts.every((rp, i) => {
    const cp = callParts[i];
    if (rp.startsWith(':')) return true;      // server parametri
    if (cp === ':param') return rp.startsWith(':'); // client parametri faqat server parametriga mos
    return rp === cp;
  });
}

const routes = registeredRoutes();

describe('API shartnomasi: frontend <-> backend', () => {
  it('server kamida asosiy endpointlarni ro\'yxatdan o\'tkazgan', () => {
    expect(routes.length).toBeGreaterThan(40);
    expect(routes).toContain('/api/gyms');
    expect(routes).toContain('/api/bookings');
    expect(routes).toContain('/api/gyms/:gymId/schedule');
  });

  it('frontend chaqirayotgan har bir endpoint serverda mavjud', () => {
    const calls = clientCalls();
    const unknown: string[] = [];

    for (const call of calls) {
      const p = call.path.split('?')[0].replace(/\/$/, '');
      if (!p.startsWith('/api/')) continue;
      // Faqat yo'l bo'lagi bo'lgan qatorlarni tekshiramiz (queryKey prefikslari ham shu shaklda)
      if (routes.some((r) => matches(r, p))) continue;
      // queryKey prefikslari (masalan ['/api/gyms', id, 'schedule']) — ular
      // alohida segmentlar sifatida yoziladi, ularni o'tkazib yuboramiz
      if (routes.some((r) => r.startsWith(p + '/') || p.startsWith(r + '/'))) continue;
      unknown.push(`${call.file}: ${call.path}`);
    }

    expect(unknown, `Serverda topilmagan endpointlar:\n${unknown.join('\n')}`).toEqual([]);
  });
});
