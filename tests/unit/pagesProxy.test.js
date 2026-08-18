import assert from 'node:assert';
import {
  rewriteGithubPages,
  pagesUpstreamPath,
  shouldProxyToPages
} from '../../server/src/pagesProxy.js';

export function runPagesProxyTests() {
  console.log('🧪 Прокси GitHub Pages через Railway для VK iframe...');

  assert.strictEqual(pagesUpstreamPath('/'), '/index.html');
  assert.strictEqual(pagesUpstreamPath('/index.html'), '/index.html');
  assert.strictEqual(pagesUpstreamPath('/assets/index-abc.js'), '/assets/index-abc.js');

  const html = '<script src="https://no1zilla.github.io/cat-empire/assets/index-x.js"></script>';
  assert.strictEqual(
    rewriteGithubPages(html, 'text/html'),
    '<script src="/assets/index-x.js"></script>'
  );

  assert.strictEqual(shouldProxyToPages({ method: 'GET', path: '/' }), true);
  assert.strictEqual(shouldProxyToPages({ method: 'GET', path: '/index.html' }), true);
  assert.strictEqual(shouldProxyToPages({ method: 'GET', path: '/api/health' }), false);
  assert.strictEqual(shouldProxyToPages({ method: 'POST', path: '/' }), false);

  console.log('  ✅ HTML с GitHub переписывается на тот же домен Railway');
}
