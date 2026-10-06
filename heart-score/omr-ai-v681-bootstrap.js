/*
 * Ulmoa AI OMR bootstrap v6.81
 *
 * v6.80 referenced onnxruntime-web@1.28.0, but that stable CDN package was
 * never published. Load the nearest stable browser release (1.27.0) first,
 * pin its WASM assets to the same version, then load the existing adapter.
 */

const ORT_VERSION = '1.27.0';
const ORT_BASE = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = [...document.scripts].find(s => s.src === src);
    if (existing) {
      if (window.ort) return resolve();
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', () => reject(new Error('AI 실행 엔진 다운로드 실패')), { once: true });
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error('AI 실행 엔진 다운로드 실패'));
    document.head.appendChild(s);
  });
}

async function boot() {
  if (!window.ort) await loadScript(`${ORT_BASE}ort.min.js`);
  if (!window.ort) throw new Error('AI 실행 엔진을 불러오지 못했습니다.');

  // v6.80 sets wasmPaths again when the first score is imported. Keep that
  // assignment pinned to the actually published 1.27.0 asset directory.
  const wasm = window.ort.env?.wasm;
  if (wasm) {
    let pinned = ORT_BASE;
    try {
      Object.defineProperty(wasm, 'wasmPaths', {
        configurable: true,
        enumerable: true,
        get() { return pinned; },
        set(value) {
          const next = String(value || '');
          pinned = next.includes('onnxruntime-web@1.28.0') ? ORT_BASE : (next || ORT_BASE);
        }
      });
    } catch (_) {
      wasm.wasmPaths = ORT_BASE;
    }
    wasm.wasmPaths = ORT_BASE;
    wasm.numThreads = 1;
  }

  await import('./omr-ai-v680.js?v=681');
  console.info('[Ulmoa] AI OMR bootstrap v6.81 ready', { ort: ORT_VERSION });
}

boot().catch(err => {
  console.error('[Ulmoa] AI OMR bootstrap failed', err);
  const st = document.getElementById('imageStatus');
  if (st) {
    st.className = 'status warn';
    st.textContent = '분석 실패: ' + (err?.message || String(err));
  }
  const pages = document.getElementById('pages');
  if (pages) {
    pages.innerHTML = `<div style="margin:24px auto;max-width:650px;padding:26px 22px;border:1px solid #f2c9c9;border-radius:22px;background:#fffafa;color:#7b2f36"><div style="font-size:18px;font-weight:900">AI 악보인식 준비에 실패했어요</div><div style="margin-top:9px;line-height:1.6;font-weight:650">${String(err?.message || err).replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))}</div></div>`;
  }
});
